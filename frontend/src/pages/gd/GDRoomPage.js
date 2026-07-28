/* eslint-disable */
/**
 * GDRoomPage — Fixed & Enhanced v3.0
 *
 * Fixes:
 *  1. Audio/video mesh: all participants hear & see each other (was STUN-only P2P)
 *  2. socketId→userId map built via onPeerIdentified callback from useWebRTC
 *  3. AI Moderator and AI Participant use distinct voices (via useAIVoice role prop)
 *  4. Voice-activated "Hey PRAGATI" companion works in GD room
 *  5. Mobile-responsive layout (flex-wrap, bottom nav adapts)
 *  6. webrtc-peer-joined also fires for users who joined before us (re-emit on join)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate }   from 'react-router-dom';
import { useAuth }                  from '../../context/AuthContext';
import { useGDSocket }              from '../../hooks/useGDSocket';
import { useWebRTC }                from '../../hooks/useWebRTC';
import { useAIVoice }               from '../../hooks/useAIVoice';
import MediaPermissionGate          from './MediaPermissionGate';
import VideoTile                    from './VideoTile';

const API  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tk   = () => ({ Authorization: `Bearer ${localStorage.getItem('pragati_token')}` });
const GRAD = 'linear-gradient(135deg,#531697,#13a1a5)';
const DARK = 'var(--text)';

const FILLER_WORDS = ['um','uh','like','you know','basically','actually','literally','so yeah','right','okay so'];
function countFillers(text) {
  const lower = text.toLowerCase();
  return FILLER_WORDS.reduce((n, w) => n + (lower.split(w).length - 1), 0);
}
function formatTime(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

// ── Read saved accent from user preferences ──────────────────────────────────
function getSavedAccent() {
  return localStorage.getItem('pragati_accent') || 'indian';
}

export default function GDRoomPage() {
  const { code } = useParams();
  const nav      = useNavigate();
  const { user } = useAuth();

  // Gate state
  const [gateState, setGateState] = useState('gate');

  // Room / session state
  const [room, setRoom]               = useState(null);
  const [sessionState, setSessionState] = useState('loading');
  const [participants, setParticipants] = useState([]);
  const [captions, setCaptions]       = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [topic, setTopic]             = useState('');
  const [prepTimer, setPrepTimer]     = useState(0);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [waitTimer, setWaitTimer]     = useState(null);
  const [lockedMsg, setLockedMsg]     = useState('');
  const [systemMsg, setSystemMsg]     = useState('');
  const [evalData, setEvalData]       = useState(null);

  // Media state
  const [isMuted, setIsMuted]       = useState(false);
  const [isCamOff, setIsCamOff]     = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interimSpeech, setInterimSpeech] = useState('');
  const [manualSpeech, setManualSpeech]   = useState('');
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [voiceEnabled, setVoiceEnabled]   = useState(true);
  const [showChat, setShowChat]           = useState(true);

  // Stats
  const [myStats, setMyStats] = useState({ speakingTime: 0, wordCount: 0, fillerWords: 0, interruptions: 0 });

  // Remote streams: socketId → MediaStream
  const [remoteStreams, setRemoteStreams]   = useState({});
  // socketId → userId  (built when webrtc-peer-joined fires)
  const [socketUserMap, setSocketUserMap]  = useState({});

  // Refs
  const localStreamRef   = useRef(null);
  const recognitionRef   = useRef(null);
  const speakStartRef    = useRef(null);
  const captionsRef      = useRef(null);
  const chatRef          = useRef(null);
  const chatInputRef     = useRef('');
  const mySocketIdRef    = useRef(null);

  // ── AI Voice — two instances: one for moderator, one for AI participants ──
  const accent = getSavedAccent();

  const moderatorVoice = useAIVoice({ enabled: voiceEnabled, accent, role: 'moderator' });
  const participantVoice = useAIVoice({ enabled: voiceEnabled, accent, role: 'participant' });

  // Keep refs current so socket callbacks (stale closure) always have latest
  const moderatorVoiceRef   = useRef(moderatorVoice);
  const participantVoiceRef = useRef(participantVoice);
  useEffect(() => { moderatorVoiceRef.current   = moderatorVoice;   }, [moderatorVoice]);
  useEffect(() => { participantVoiceRef.current = participantVoice; }, [participantVoice]);

  const stopAllVoice = useCallback(() => {
    moderatorVoice.stopAll();
    participantVoice.stopAll();
  }, [moderatorVoice, participantVoice]);

  // ── WebRTC ────────────────────────────────────────────────────────────────
  const {
    announceReady, handleWebRTCEvent, setLocalStream,
    setMuted: setRTCMuted, setCameraOff: setRTCCamOff,
    localStreamRef: rtcLocalRef,
  } = useWebRTC({
    emit: (ev, data) => socketEmit(ev, data),
    roomCode: code,
    userId:   user?._id,
    onStream: (socketId, stream) => {
      setRemoteStreams(prev => ({ ...prev, [socketId]: stream }));
    },
    onStreamRemoved: (socketId) => {
      setRemoteStreams(prev => { const n = { ...prev }; delete n[socketId]; return n; });
    },
    // Called when a peer announces itself — lets us build socketId→userId map
    onPeerIdentified: (socketId, peerUserId) => {
      setSocketUserMap(prev => ({ ...prev, [socketId]: peerUserId }));
    },
  });

  // ── Keep socketUserMap in sync with server-provided participant list ────────
  // This ensures late-joining users can immediately see everyone's video
  useEffect(() => {
    setSocketUserMap(prev => {
      const next = { ...prev };
      participants.forEach(p => {
        if (p.socketId && p.userId) {
          next[p.socketId] = p.userId;
        }
      });
      return next;
    });
  }, [participants]);

  // ── Socket ────────────────────────────────────────────────────────────────
  let socketEmit = () => {};
  const { emit, getSocketId } = useGDSocket({
    onEvent: useCallback((ev, data) => {
      // Route WebRTC events straight to the handler
      if (['webrtc-offer','webrtc-answer','webrtc-ice','webrtc-peer-joined'].includes(ev)) {
        handleWebRTCEvent(ev, data);
        return;
      }
      switch (ev) {
        case 'joined':
          setParticipants(data.participants || []);
          setSessionState(data.state || 'waiting');
          if (data.topic) setTopic(data.topic);
          if (data.durationSeconds) setSessionTimer(data.durationSeconds);
          // Announce WebRTC presence with short delay for socket to stabilise
          setTimeout(() => {
            const sid = getSocketId();
            if (sid) { mySocketIdRef.current = sid; announceReady(sid); }
          }, 600);
          break;

        case 'participant-update':
          setParticipants(data.participants || []);
          if (data.state) setSessionState(data.state);
          break;

        case 'participant-left':
        case 'participant-disconnected':
          setParticipants(p => p.map(x =>
            x.userId === data.userId ? { ...x, disconnected: true } : x
          ));
          break;

        case 'room-locked':
          setSessionState('error'); setLockedMsg(data.message); break;
        case 'room-full':
          setSessionState('error'); setLockedMsg(data.message); break;

        case 'wait-timer-started':
          setWaitTimer(data.waitSeconds || 120);
          setSystemMsg(data.message);
          break;

        case 'ai-joined':
          setParticipants(data.participants || []);
          setSystemMsg(data.message);
          break;

        case 'room-locked-announce':
          setSessionState('locked');
          setSystemMsg(data.message);
          setParticipants(data.participants || []);
          break;

        case 'prep-phase':
          setSessionState('prep');
          setPrepTimer(data.duration || 45);
          if (data.topic) setTopic(data.topic);
          setSystemMsg(data.message);
          break;

        case 'discussion-start':
          setSessionState('active');
          setTopic(data.topic || '');
          setSessionTimer(data.duration || 600);
          setSystemMsg(`🎤 ${data.message}`);
          break;

        case 'ai-message': {
          const msg = { ...data, ts: Date.now() };
          setCaptions(c => [...c.slice(-80), msg]);
          setTimeout(() => captionsRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          // DO NOT call playText() here — let 'ai-voice' handle audio exclusively
          // This prevents the double-speaking bug (robotic Web Speech + Groq TTS overlap)
          break;
        }

        case 'ai-voice': {
          if (data.text) {
            const isPart = data.isParticipant || (data.ttsVoice && data.ttsVoice !== 'Celeste-PlayAI');
            const voiceHook = isPart ? participantVoiceRef.current : moderatorVoiceRef.current;
            voiceHook?.playAudio(data.audioBase64 || null, data.text, data.speakerName);
          }
          break;
        }

        case 'ai-interrupted': {
          moderatorVoiceRef.current?.stopAll();
          participantVoiceRef.current?.stopAll();
          break;
        }

        case 'caption':
          setCaptions(c => [...c.slice(-80), { ...data, ts: Date.now() }]);
          setTimeout(() => captionsRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          break;

        case 'chat-message':
          setChatMessages(c => [...c.slice(-100), { ...data, ts: Date.now() }]);
          setTimeout(() => chatRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          break;

        case 'time-warning':
          setSystemMsg(`⏰ ${data.secondsLeft}s remaining! Start wrapping up.`);
          break;

        case 'session-ended':
          setSessionState('completed');
          setSystemMsg(data.message);
          stopRecognition();
          stopAllVoice();
          break;

        case 'forward-speech': {
          const text = data.text;
          if (!text) break;
          const words  = text.split(/\s+/).length;
          const filler = countFillers(text);
          const secs = 4; // approx chunk length
          setMyStats(s => ({ ...s, wordCount: s.wordCount + words, fillerWords: s.fillerWords + filler, speakingTime: s.speakingTime + secs }));
          emit('speech-update', { roomCode: code, userId: user._id, text, delta: { wordCount: words, fillerWords: filler, speakingTime: secs } });
          setCaptions(c => [...c.slice(-80), { userId: user._id, userName: user.name, text, isAI: false, ts: Date.now() }]);
          setTimeout(() => captionsRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          break;
        }

        case 'evaluation-ready':
          setEvalData(data);
          break;

        case 'participant-media-update':
          setParticipants(p => p.map(x =>
            x.userId === data.userId ? { ...x, isMuted: data.isMuted, isCameraOff: data.isCameraOff } : x
          ));
          break;

        case 'active-speaker-update':
          setActiveSpeaker(data.speaking ? data.userId : null);
          break;

        case 'error':
          setSessionState('error');
          setLockedMsg(typeof data === 'string' ? data : data?.message || 'Unknown error');
          break;

        default: break;
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [handleWebRTCEvent, announceReady, stopAllVoice])
  });
  socketEmit = emit;

  // ── Wait timer countdown ──────────────────────────────────────────────────
  useEffect(() => {
    if (waitTimer === null || waitTimer <= 0) return;
    const t = setInterval(() => setWaitTimer(n => {
      if (n <= 1) { clearInterval(t); return 0; }
      return n - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [waitTimer]);

  // ── Join room on gate pass ────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !code || gateState !== 'room') return;
    fetch(`${API}/gd/rooms/${code}`, { headers: tk() })
      .then(r => r.json()).then(d => { if (d.room) setRoom(d.room); })
      .catch(() => {});
    emit('join-room', { roomCode: code, userId: user._id, userName: user.name });

    // Timeout: if no 'joined' event within 10s, show error instead of blank screen
    const timeout = setTimeout(() => {
      setSessionState(prev => {
        if (prev === 'loading') {
          setLockedMsg('Could not connect to the room. The server may be unreachable. Please go back and try again.');
          return 'error';
        }
        return prev;
      });
    }, 10000);
    return () => clearTimeout(timeout);
  }, [code, user, gateState]); // eslint-disable-line

  // ── Countdown timers ──────────────────────────────────────────────────────
  useEffect(() => {
    if (sessionState === 'prep' && prepTimer > 0) {
      const t = setInterval(() => setPrepTimer(n => { if (n <= 1) { clearInterval(t); return 0; } return n - 1; }), 1000);
      return () => clearInterval(t);
    }
  }, [sessionState, prepTimer]);

  useEffect(() => {
    if (sessionState === 'active' && sessionTimer > 0) {
      const t = setInterval(() => setSessionTimer(n => { if (n <= 1) { clearInterval(t); return 0; } return n - 1; }), 1000);
      return () => clearInterval(t);
    }
  }, [sessionState, sessionTimer]);

  const shouldSpeakRef = useRef(false);
  const mediaRecorderRef = useRef(null);

  function _startRecSession() {
    if (!shouldSpeakRef.current) return;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      if (!localStreamRef.current) return;
      try {
        const mr = new MediaRecorder(localStreamRef.current);
        mediaRecorderRef.current = mr;
        mr.ondataavailable = (e) => {
          if (e.data.size > 0 && shouldSpeakRef.current) {
            e.data.arrayBuffer().then(buf => {
              emit('audio-chunk', { roomCode: code, userId: user._id, audioBuffer: buf, language: room?.language === 'Hindi' ? 'hi' : 'en' });
            });
          }
        };
        mr.onstop = () => { if (shouldSpeakRef.current) setTimeout(_startRecSession, 200); };
        mr.start(4000);
      } catch (err) { console.error('MediaRecorder failed', err); }
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        return;
      } catch (e) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
      }
    }

    const rec     = new SR();
    rec.lang      = (room?.language === 'Hindi') ? 'hi-IN' : 'en-IN';
    rec.continuous     = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    recognitionRef.current = rec;

    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0]?.transcript?.trim();
        if (!text) continue;

        if (e.results[i].isFinal) {
          setInterimSpeech('');
          const words  = text.split(/\s+/).length;
          const filler = countFillers(text);
          const secs   = Math.max(1, Math.round((Date.now() - (speakStartRef.current || Date.now())) / 1000));
          speakStartRef.current = Date.now();
          setMyStats(s => ({ ...s, wordCount: s.wordCount + words, fillerWords: s.fillerWords + filler, speakingTime: s.speakingTime + secs }));
          emit('speech-update', { roomCode: code, userId: user._id, text, delta: { wordCount: words, fillerWords: filler, speakingTime: secs } });
          setCaptions(c => [...c.slice(-80), { userId: user._id, userName: user.name, text, isAI: false, ts: Date.now() }]);
          setTimeout(() => captionsRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          emit('active-speaker', { roomCode: code, userId: user._id, speaking: true });
          setTimeout(() => emit('active-speaker', { roomCode: code, userId: user._id, speaking: false }), 2500);
        } else {
          setInterimSpeech(text);
        }
      }
    };

    rec.onerror = (e) => {
      if (e.error === 'not-allowed') {
        shouldSpeakRef.current = false;
        setIsSpeaking(false);
        alert('Microphone permission denied for Speech Recognition.');
      } else if (e.error !== 'no-speech') {
        console.warn('[SpeechRec error]', e.error);
      }
    };

    rec.onend = () => {
      if (shouldSpeakRef.current) {
        setTimeout(() => {
          try { rec.start(); } catch {
            recognitionRef.current = null;
            if (shouldSpeakRef.current) _startRecSession();
          }
        }, 150);
      } else {
        setIsSpeaking(false);
        recognitionRef.current = null;
      }
    };

    try {
      rec.start();
    } catch (err) {
      console.warn('[SpeechRec start error]', err.message);
    }
  }

  function startSpeaking() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile && !('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition needs Chrome or Edge browser.'); return;
    }
    if (isMuted) {
      setIsMuted(false);
      setRTCMuted(false);
      emit('media-status', { roomCode: code, userId: user._id, isMuted: false });
    }
    shouldSpeakRef.current = true;
    speakStartRef.current  = Date.now();
    setIsSpeaking(true);
    emit('interrupt', { roomCode: code, userId: user._id });
    _startRecSession();
  }

  function stopSpeaking() {
    shouldSpeakRef.current = false;
    try { recognitionRef.current?.stop(); } catch {}
    try { mediaRecorderRef.current?.stop(); } catch {}
    recognitionRef.current = null;
    mediaRecorderRef.current = null;
    setIsSpeaking(false);
    emit('active-speaker', { roomCode: code, userId: user._id, speaking: false });
  }

  function toggleSpeaking() { if (isSpeaking) stopSpeaking(); else startSpeaking(); }
  function stopRecognition() { shouldSpeakRef.current = false; try { recognitionRef.current?.stop(); } catch {}; setIsSpeaking(false); }

  // ── Mic / Camera toggles ──────────────────────────────────────────────────
  function toggleMic() {
    const next = !isMuted;
    setIsMuted(next); setRTCMuted(next);
    emit('media-status', { roomCode: code, userId: user._id, isMuted: next });
    if (next) stopSpeaking();
  }
  function toggleCam() {
    const next = !isCamOff;
    setIsCamOff(next); setRTCCamOff(next);
    emit('media-status', { roomCode: code, userId: user._id, isCameraOff: next });
  }

  function sendChat() {
    const text = chatInputRef.current?.trim();
    if (!text) return;
    emit('chat-message', { roomCode: code, userId: user._id, userName: user.name, text });
    chatInputRef.current = '';
    const el = document.getElementById('gd-chat-input');
    if (el) el.value = '';
  }

  // ── Gate callbacks ────────────────────────────────────────────────────────
  async function handleMediaReady(stream, { isMuted: muted, isCamOff: camOff } = {}) {
    localStreamRef.current = stream;
    rtcLocalRef.current    = stream;
    setLocalStream(stream);
    setIsMuted(muted || false);
    setIsCamOff(camOff || false);
    setGateState('room');
  }
  function handleSkipMedia() { setGateState('room'); }

  // ── GATE ──────────────────────────────────────────────────────────────────
  if (gateState === 'gate') {
    return (
      <MediaPermissionGate
        roomCode={code}
        userName={user?.name || ''}
        onReady={handleMediaReady}
        onSkip={handleSkipMedia}
      />
    );
  }

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (sessionState === 'loading') return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'60vh', flexDirection:'column', gap:12 }}>
      <div style={{ width:40, height:40, border:'3px solid #e8edf5', borderTopColor:'#531697', borderRadius:'50%', animation:'_s .7s linear infinite' }} />
      <style>{`@keyframes _s{to{transform:rotate(360deg)}}`}</style>
      <div style={{ color:'#b0bec9' }}>Connecting to room {code}…</div>
    </div>
  );

  // ── ERROR / LOCKED ────────────────────────────────────────────────────────
  if (sessionState === 'error') return (
    <div style={{ maxWidth:480, margin:'80px auto', textAlign:'center', fontFamily:"'Nunito',sans-serif" }}>
      <div style={{ fontSize:'3rem', marginBottom:16 }}>🔒</div>
      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.3rem', color:DARK, marginBottom:8 }}>Session Locked</div>
      <div style={{ color:'var(--text-3)', marginBottom:24, lineHeight:1.6 }}>{lockedMsg || 'Group Discussion has already started.'}</div>
      <button onClick={() => nav('/dashboard/gd')} style={{ padding:'11px 28px', borderRadius:10, border:'none', background:GRAD, color:'#fff', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif" }}>← Back to Lobby</button>
    </div>
  );

  // ── COMPLETED ─────────────────────────────────────────────────────────────
  if (sessionState === 'completed' && evalData) return (
    <div style={{ maxWidth:540, margin:'60px auto', textAlign:'center', fontFamily:"'Nunito',sans-serif" }}>
      <div style={{ fontSize:'3rem', marginBottom:14 }}>🎉</div>
      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.4rem', color:DARK, marginBottom:8 }}>Session Complete!</div>
      <div style={{ color:'var(--text-3)', marginBottom:20 }}>Your AI evaluation report is ready.</div>
      <button
        onClick={() => nav(`/dashboard/gd/report/${code}/${user._id}`, { state: { evalData, topic, myStats } })}
        style={{ padding:'12px 32px', borderRadius:12, border:'none', background:GRAD, color:'#fff', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'1rem' }}>
        📊 View My Report →
      </button>
      <div style={{ marginTop:12 }}>
        <button onClick={() => nav('/dashboard/gd')} style={{ padding:'9px 20px', borderRadius:10, border:'1px solid #d0d7e8', background:'transparent', color:'var(--text-3)', fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif" }}>Back to Lobby</button>
      </div>
    </div>
  );

  // ── MAIN ROOM ─────────────────────────────────────────────────────────────
  const myParticipant = participants.find(p => p.userId === user?._id) || { name: user?.name, userId: user?._id };
  const othersCount   = participants.filter(p => p.userId !== user?._id).length;
  const totalTiles    = 1 + othersCount;

  return (
    <div style={{
      fontFamily: "'Nunito',sans-serif",
      background: DARK,
      position: 'fixed', top:0, left:0, right:0, bottom:0,
      display: 'flex', flexDirection: 'column',
      color: '#fff', zIndex: 100,
    }}>

      {/* TOP BAR */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px', background:'#1a2640', borderBottom:'1px solid #2a3a5a', flexShrink:0, height:50, flexWrap:'wrap', gap:6 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <div style={{ fontFamily:'monospace', fontWeight:800, fontSize:'.82rem', color:'#13a1a5', background:'rgba(19,161,165,0.12)', padding:'2px 9px', borderRadius:6 }}>{code}</div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:'.8rem', color:'#9ab0c8' }}>
            {sessionState === 'waiting'   && '⏳ Waiting'}
            {sessionState === 'locked'    && '🔒 Starting soon'}
            {sessionState === 'prep'      && `🧠 Prep — ${formatTime(prepTimer)}`}
            {sessionState === 'active'    && '🔴 LIVE'}
            {sessionState === 'completed' && '✅ Ended'}
          </div>
          {waitTimer > 0 && sessionState === 'waiting' && (
            <div style={{ fontSize:'.7rem', color:'#f59e0b', fontWeight:700, background:'rgba(245,158,11,0.1)', padding:'2px 8px', borderRadius:6 }}>
              AI joins in {formatTime(waitTimer)}
            </div>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {sessionState === 'active' && (
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.05rem', color:sessionTimer < 60 ? '#ef4444' : '#47d372' }}>
              ⏰ {formatTime(sessionTimer)}
            </div>
          )}
          <button
            onClick={() => { setVoiceEnabled(v => !v); stopAllVoice(); }}
            style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #2a3a5a', background:voiceEnabled ? 'rgba(19,161,165,0.15)' : 'rgba(255,255,255,0.05)', color:voiceEnabled ? '#13a1a5' : '#4a5a7a', fontWeight:700, cursor:'pointer', fontSize:'.7rem' }}>
            {voiceEnabled ? '🔊 Voice ON' : '🔇 Voice OFF'}
          </button>
        </div>
      </div>

      {/* TOPIC BANNER */}
      {topic && (
        <div style={{ background:'linear-gradient(90deg,#531697,#13a1a5)', padding:'6px 14px', textAlign:'center', flexShrink:0 }}>
          <span style={{ fontSize:'.65rem', fontWeight:700, opacity:.8, marginRight:6 }}>TOPIC</span>
          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.84rem' }}>"{topic}"</span>
        </div>
      )}

      {/* AI MODERATOR BANNER */}
      {systemMsg && (
        <div style={{ padding:'5px 14px', background:'rgba(83,22,151,0.15)', borderBottom:'1px solid rgba(83,22,151,0.3)', fontSize:'.74rem', fontWeight:700, color:'#c4a0f5', flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          🤖 <span style={{ color:'#9ab0c8', fontWeight:400 }}>{systemMsg}</span>
        </div>
      )}

      <style>{`
        .gd-main-body { flex: 1; display: flex; overflow: hidden; min-height: 0; flex-direction: row; position: relative; }
        .gd-side-panel { width: 290px; flex-shrink: 0; display: flex; flex-direction: column; background: #13203a; border-left: 1px solid #2a3a5a; overflow: hidden; }
        @media (max-width: 768px) {
          .gd-side-panel {
            width: 50% !important; /* Exactly half screen on mobile to split side-by-side */
            min-width: 0 !important;
          }
          .gd-video-grid { grid-template-columns: 1fr !important; grid-template-rows: auto !important; }
        }
      `}</style>
      {/* BODY */}
      <div className="gd-main-body">

        {/* VIDEO GRID + CONTROLS */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

          {/* Video grid */}
          <div style={{ flex:1, overflow:'auto', minHeight:0, padding:'8px 8px 0' }}>
            <div className="gd-video-grid" style={{
              display: 'grid',
              gap: 12,
              width: '100%',
              height: '100%',
              gridTemplateColumns: totalTiles === 1 ? '1fr' : totalTiles <= 4 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
              gridTemplateRows: totalTiles <= 2 ? '1fr' : totalTiles <= 6 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
              padding: 12,
              boxSizing: 'border-box'
            }}>
              {/* Local tile */}
              <VideoTile
                stream={localStreamRef.current}
                participant={{ ...myParticipant, isMuted, isCameraOff: isCamOff }}
                isActiveSpeaker={activeSpeaker === user?._id}
                isLocal
                size={totalTiles <= 2 ? 'large' : 'small'}
                style={{ aspectRatio: 'auto', width: '100%', height: '100%' }}
              />

              {/* Remote tiles — match socketId from socketUserMap */}
              {participants.filter(p => p.userId !== user?._id).map((p, i) => {
                // Find the socketId that belongs to this userId
                const sid = Object.entries(socketUserMap).find(([, uid]) => uid === p.userId)?.[0];
                return (
                  <VideoTile
                    key={p.userId || i}
                    stream={p.isAI ? null : (sid ? remoteStreams[sid] : null)}
                    participant={p}
                    isActiveSpeaker={activeSpeaker === p.userId}
                    size={totalTiles <= 2 ? 'large' : 'small'}
                    style={{ aspectRatio: 'auto', width: '100%', height: '100%' }}
                  />
                );
              })}
            </div>
          </div>

          <style>{`@keyframes gdpulse{0%,100%{opacity:1}50%{opacity:.55}}`}</style>
        </div>

        {/* SIDE PANEL */}
        {showChat && (
          <div className="gd-side-panel">
            <SidePanel
              captions={captions}
              chatMessages={chatMessages}
              myUserId={user?._id}
              sessionState={sessionState}
              myStats={myStats}
              captionsEndRef={captionsRef}
              chatEndRef={chatRef}
              onSendChat={sendChat}
              chatInputRef={chatInputRef}
              participants={participants}
              topic={topic}
              interimSpeech={interimSpeech}
              manualSpeech={manualSpeech}
              setManualSpeech={setManualSpeech}
              emit={socketEmit}
              code={code}
              user={user}
              setMyStats={setMyStats}
              setCaptions={setCaptions}
            />
          </div>
        )}
      </div>

      {/* Controls bar (Full Width Bottom) */}
      <div style={{
        flexShrink:0, height:68, width: '100%',
        display:'flex', justifyContent:'flex-start', alignItems:'center', gap:8,
        background:'#131f35', borderTop:'1px solid #2a3a5a', padding:'0 10px',
        overflowX: 'auto', flexWrap: 'nowrap'
      }}>
        <ControlButton icon={isMuted   ? '🔇' : '🎙️'} label={isMuted  ? 'Unmute'      : 'Mute'}       active={isMuted}  color="#ef4444" onClick={toggleMic} />
        <ControlButton icon={isCamOff  ? '📷' : '📹'} label={isCamOff ? 'Start Video' : 'Stop Video'} active={isCamOff} color="#ef4444" onClick={toggleCam} />

        {sessionState === 'active' && (
          <button
            onClick={toggleSpeaking}
            style={{
              padding:'8px 18px', borderRadius:22, border:'none',
              background: isSpeaking ? '#ef4444' : 'rgba(83,22,151,0.75)',
              color:'#fff', fontWeight:800, cursor:'pointer',
              fontFamily:"'Nunito',sans-serif", fontSize:'.8rem',
              animation: isSpeaking ? 'gdpulse 1s ease-in-out infinite' : 'none',
              display:'flex', alignItems:'center', gap:6,
              boxShadow: isSpeaking ? '0 0 0 6px rgba(239,68,68,0.25)' : '0 3px 12px rgba(83,22,151,0.35)',
              userSelect:'none', WebkitUserSelect:'none',
              whiteSpace: 'nowrap',
            }}>
            {isSpeaking ? '⏹ Stop Mic (Transcribing)' : '🎤 Click to Speak'}
          </button>
        )}

        {sessionState === 'active' && (moderatorVoice.isPlaying || participantVoice.isPlaying) && !isSpeaking && (
          <button
            onClick={() => {
              stopAllVoice();
              emit('interrupt-ai', { roomCode: code, userId: user?._id });
              startSpeaking();
            }}
            style={{
              padding:'8px 18px', borderRadius:22, border:'none',
              background: '#ef4444',
              color:'#fff', fontWeight:800, cursor:'pointer',
              fontFamily:"'Nunito',sans-serif", fontSize:'.8rem',
              animation: 'gdpulse 1s ease-in-out infinite',
              display:'flex', alignItems:'center', gap:6,
              boxShadow: '0 0 0 6px rgba(239,68,68,0.35)',
              userSelect:'none', WebkitUserSelect:'none',
              whiteSpace: 'nowrap',
            }}>
            🛑 Interrupt AI & Speak
          </button>
        )}

        <ControlButton icon="💬" label={showChat ? 'Hide Chat' : 'Chat'} active={showChat} color="#13a1a5" onClick={() => setShowChat(s => !s)} />
        <ControlButton icon="📴" label="Leave" active danger color="#ef4444" onClick={() => { stopAllVoice(); nav('/dashboard/gd'); }} />
      </div>
    </div>
  );
}

// ── CONTROL BUTTON ────────────────────────────────────────────────────────────
function ControlButton({ icon, label, active, color = '#ef4444', onClick, danger }) {
  return (
    <button onClick={onClick} style={{
      display:'flex', flexDirection:'column', alignItems:'center', gap:3,
      padding:'6px 12px', borderRadius:10, border:'none',
      background: (active || danger) ? `${color}22` : 'rgba(255,255,255,0.07)',
      cursor:'pointer', minWidth:52, flexShrink:0,
    }}>
      <span style={{ fontSize:18 }}>{icon}</span>
      <span style={{ fontSize:'.6rem', color:(active || danger) ? color : '#9ab0c8', fontWeight:700, fontFamily:"'Nunito',sans-serif" }}>{label}</span>
    </button>
  );
}

// ── SIDE PANEL ────────────────────────────────────────────────────────────────
function SidePanel({ captions, chatMessages, myUserId, sessionState, myStats,
                     captionsEndRef, chatEndRef, onSendChat, chatInputRef, participants, topic,
                     interimSpeech = '', manualSpeech = '', setManualSpeech, emit, code, user, setMyStats, setCaptions }) {
  const [tab, setTab] = React.useState('captions');

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', minWidth: 0 }}>
      {/* Tabs */}
      <div className="gd-tabs-container" style={{ display:'flex', borderBottom:'1px solid #2a3a5a', flexShrink:0, overflowX:'auto', minWidth:0 }}>

        {[['captions','📝 Live'],['chat','💬 Chat'],['people','👥 People'],['stats','📈 Stats']].map(([id, lbl]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: '1 0 auto', padding:'9px 8px', border:'none', background:'transparent',
            color: tab === id ? '#13a1a5' : '#4a5a7a',
            fontWeight:700, cursor:'pointer', fontSize:'.65rem',
            borderBottom: tab === id ? '2px solid #13a1a5' : '2px solid transparent',
            fontFamily:"'Nunito',sans-serif", transition:'color .15s', whiteSpace: 'nowrap'
          }}>{lbl}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', minHeight:0 }}>

        {tab === 'captions' && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>
            <div style={{ flex:1, overflowY:'auto', padding:'10px 10px 0', minHeight:0 }}>
              {captions.length === 0 && !interimSpeech && (
                <div style={{ textAlign:'center', padding:'30px 0', color:'#4a5a7a', fontSize:'.75rem' }}>
                  {sessionState === 'active' ? 'Speak via Mic or type your speech below' : 'Transcripts will appear during discussion'}
                </div>
              )}
              {captions.map((c, i) => (
                <div key={i} style={{
                  marginBottom:8, padding:'7px 9px', borderRadius:8,
                  background: c.isAI
                    ? (c.isParticipant ? 'rgba(83,22,151,0.12)' : 'rgba(19,161,165,0.1)')
                    : c.userId === myUserId ? 'rgba(83,22,151,0.12)' : 'rgba(255,255,255,0.04)',
                  border: c.isAI
                    ? (c.isParticipant ? '1px solid rgba(83,22,151,0.2)' : '1px solid rgba(19,161,165,0.2)')
                    : '1px solid transparent',
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                    <span style={{ fontWeight:800, fontSize:'.7rem', color:
                      c.isAI ? (c.isParticipant ? '#c4a0f5' : '#13a1a5') :
                      c.userId === myUserId ? '#c4a0f5' : '#9ab0c8' }}>
                      {c.isAI ? (c.isParticipant ? '🤖 ' : '⚖️ ') : ''}{c.userName}
                      {c.isParticipant && <span style={{ fontSize:'.58rem', marginLeft:4, opacity:.7 }}>(AI)</span>}
                      {c.isAI && !c.isParticipant && <span style={{ fontSize:'.58rem', marginLeft:4, opacity:.7 }}>(Moderator)</span>}
                    </span>
                    <span style={{ fontSize:'.6rem', color:'#3a4a6a' }}>{new Date(c.ts).toLocaleTimeString('en-IN',{ hour:'2-digit', minute:'2-digit' })}</span>
                  </div>
                  <div style={{ fontSize:'.76rem', color:'#c8d8ea', lineHeight:1.5 }}>{c.text}</div>
                </div>
              ))}

              {interimSpeech && (
                <div style={{
                  marginBottom:8, padding:'7px 9px', borderRadius:8,
                  background: 'rgba(83,22,151,0.25)',
                  border: '1px dashed #c4a0f5',
                  animation: 'gdpulse 1s ease-in-out infinite'
                }}>
                  <div style={{ fontWeight:800, fontSize:'.7rem', color: '#c4a0f5', marginBottom:2 }}>
                    🎤 You (speaking live...):
                  </div>
                  <div style={{ fontSize:'.76rem', color:'#fff', fontStyle:'italic', lineHeight:1.5 }}>
                    {interimSpeech}
                  </div>
                </div>
              )}
              <div ref={captionsEndRef} style={{ height:4 }} />
            </div>

            {sessionState === 'active' && (
              <div style={{ flexShrink:0, padding:'8px 10px', borderTop:'1px solid #1e2e4a', display:'flex', gap:6, background:'#0e1726' }}>
                <input
                  placeholder="Type speech & press Enter…"
                  value={manualSpeech}
                  onChange={e => setManualSpeech(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const text = manualSpeech.trim();
                      if (!text) return;
                      setManualSpeech('');
                      const words = text.split(/\s+/).length;
                      setMyStats(s => ({ ...s, wordCount: s.wordCount + words, speakingTime: s.speakingTime + 3 }));
                      emit('speech-update', { roomCode: code, userId: user._id, text, delta: { wordCount: words, fillerWords: 0, speakingTime: 3 } });
                      setCaptions(c => [...c.slice(-80), { userId: user._id, userName: user.name, text, isAI: false, ts: Date.now() }]);
                      setTimeout(() => captionsRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
                      emit('active-speaker', { roomCode: code, userId: user._id, speaking: true });
                      setTimeout(() => emit('active-speaker', { roomCode: code, userId: user._id, speaking: false }), 2000);
                    }
                  }}
                  style={{ flex:1, padding:'7px 10px', borderRadius:7, border:'1px solid #2a3a5a', background:'var(--surface-2)', color:'#fff', fontFamily:"'Nunito',sans-serif", fontSize:'.78rem', outline:'none' }}
                />
                <button
                  onClick={() => {
                    const text = manualSpeech.trim();
                    if (!text) return;
                    setManualSpeech('');
                    const words = text.split(/\s+/).length;
                    setMyStats(s => ({ ...s, wordCount: s.wordCount + words, speakingTime: s.speakingTime + 3 }));
                    emit('speech-update', { roomCode: code, userId: user._id, text, delta: { wordCount: words, fillerWords: 0, speakingTime: 3 } });
                    setCaptions(c => [...c.slice(-80), { userId: user._id, userName: user.name, text, isAI: false, ts: Date.now() }]);
                    setTimeout(() => captionsRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
                    emit('active-speaker', { roomCode: code, userId: user._id, speaking: true });
                    setTimeout(() => emit('active-speaker', { roomCode: code, userId: user._id, speaking: false }), 2000);
                  }}
                  style={{ padding:'7px 12px', borderRadius:7, border:'none', background:GRAD, color:'#fff', fontWeight:800, cursor:'pointer', fontSize:'.78rem' }}>
                  🗣️ Speak
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'chat' && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>
            <div style={{ flex:1, overflowY:'auto', padding:'10px 10px 0', minHeight:0 }}>
              {chatMessages.length === 0 && (
                <div style={{ textAlign:'center', padding:'30px 0', color:'#4a5a7a', fontSize:'.75rem' }}>No messages yet</div>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} style={{ marginBottom:7, padding:'6px 9px', borderRadius:8, background: m.userId === myUserId ? 'rgba(83,22,151,0.15)' : 'rgba(255,255,255,0.04)' }}>
                  <span style={{ fontWeight:800, fontSize:'.68rem', color: m.userId === myUserId ? '#c4a0f5' : '#9ab0c8' }}>{m.userName}: </span>
                  <span style={{ fontSize:'.76rem', color:'#c8d8ea' }}>{m.text}</span>
                </div>
              ))}
              <div ref={chatEndRef} style={{ height:4 }} />
            </div>
            <div style={{ flexShrink:0, padding:'8px 10px', borderTop:'1px solid #1e2e4a', display:'flex', gap:6 }}>
              <input
                id="gd-chat-input"
                placeholder="Type a message…"
                onChange={e => { chatInputRef.current = e.target.value; }}
                onKeyDown={e => { if (e.key === 'Enter') onSendChat(); }}
                style={{ flex:1, padding:'7px 10px', borderRadius:7, border:'1px solid #2a3a5a', background:'var(--surface-2)', color:'#fff', fontFamily:"'Nunito',sans-serif", fontSize:'.78rem', outline:'none' }}
              />
              <button onClick={onSendChat} style={{ padding:'7px 12px', borderRadius:7, border:'none', background:GRAD, color:'#fff', fontWeight:800, cursor:'pointer', fontSize:'.82rem' }}>→</button>
            </div>
          </div>
        )}

        {tab === 'people' && (
          <div style={{ flex:1, overflowY:'auto', padding:'8px 10px', minHeight:0 }}>
            {participants.map((p, i) => (
              <div key={p.userId || i} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 4px', borderBottom:'1px solid #1e2e4a' }}>
                <div style={{ width:32, height:32, borderRadius:'50%', background: p.isAI ? 'rgba(19,161,165,0.2)' : GRAD, display:'flex', alignItems:'center', justifyContent:'center', fontSize: p.isAI ? '.9rem' : '.82rem', fontWeight:800, color: p.isAI ? '#13a1a5' : '#fff', flexShrink:0 }}>
                  {p.isAI ? '🤖' : (p.name?.[0] || '?').toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:'.78rem', color:'#e0eaf8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {p.name}{p.userId === myUserId && <span style={{ color:'#13a1a5', fontSize:'.65rem' }}> (you)</span>}
                  </div>
                  <div style={{ fontSize:'.63rem', color:'#4a5a7a' }}>
                    {p.isAI ? (p.isModerator ? '⚖️ AI Moderator' : '🤖 AI Participant') : p.disconnected ? '⚠️ Reconnecting' : '🎓 Student'}
                  </div>
                </div>
                <div style={{ fontSize:'.65rem', display:'flex', gap:3 }}>
                  {p.isMuted && '🔇'}{p.isCameraOff && '📷'}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'stats' && (
          <div style={{ flex:1, overflowY:'auto', padding:'10px 12px', minHeight:0 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.8rem', color:'#9ab0c8', marginBottom:10 }}>My Live Metrics</div>
            {[
              ['🗣️','Speaking Time', `${myStats.speakingTime}s`, '#531697'],
              ['💬','Words Spoken',  myStats.wordCount,          '#13a1a5'],
              ['⚠️','Filler Words',  myStats.fillerWords,        '#f59e0b'],
              ['🔔','Interruptions', myStats.interruptions,      '#ef4444'],
            ].map(([ic, label, value, color]) => (
              <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #1e2e4a' }}>
                <span style={{ fontSize:'.75rem', color:'var(--text-3)' }}>{ic} {label}</span>
                <span style={{ fontWeight:800, color, fontSize:'.9rem' }}>{value}</span>
              </div>
            ))}
            {topic && (
              <div style={{ marginTop:14, padding:'9px 10px', borderRadius:8, background:'rgba(83,22,151,0.1)', fontSize:'.72rem', color:'#9ab0c8', lineHeight:1.5 }}>
                <div style={{ fontWeight:700, marginBottom:3, color:'#c4a0f5' }}>📌 Topic</div>{topic}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
