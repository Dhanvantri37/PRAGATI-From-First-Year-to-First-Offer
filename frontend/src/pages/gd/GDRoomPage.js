import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useGDSocket } from '../../hooks/useGDSocket';
import { useWebRTC } from '../../hooks/useWebRTC';
import { useAIVoice } from '../../hooks/useAIVoice';
import MediaPermissionGate from './MediaPermissionGate';
import VideoTile from './VideoTile';

const API  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tk   = () => ({ Authorization: `Bearer ${localStorage.getItem('pragati_token')}` });
const GRAD = 'linear-gradient(135deg,#531697,#13a1a5)';
const DARK = '#0f1a2e';

const FILLER_WORDS = ['um','uh','like','you know','basically','actually','literally','so yeah','right','okay so'];
function countFillers(text) {
  const lower = text.toLowerCase();
  return FILLER_WORDS.reduce((n, w) => n + (lower.split(w).length - 1), 0);
}
function formatTime(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function GDRoomPage() {
  const { code }   = useParams();
  const nav        = useNavigate();
  const { user }   = useAuth();

  // Gate state
  const [gateState, setGateState] = useState('gate');  // gate | room

  // Room state
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
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [voiceEnabled, setVoiceEnabled]   = useState(true);
  const [showChat, setShowChat]           = useState(true);

  // Stats
  const [myStats, setMyStats] = useState({ speakingTime: 0, wordCount: 0, fillerWords: 0, interruptions: 0 });

  // Remote video streams: socketId → MediaStream
  const [remoteStreams, setRemoteStreams] = useState({});
  // Map userId → socketId (needed to match stream to participant)
  const [socketUserMap, setSocketUserMap] = useState({});

  // Refs
  const localStreamRef   = useRef(null);
  const recognitionRef   = useRef(null);
  const speakStartRef    = useRef(null);
  const timerRef         = useRef(null);
  const captionsRef      = useRef(null);
  const chatRef          = useRef(null);
  const chatInputRef     = useRef('');
  const mySocketIdRef    = useRef(null);

  // ── AI Voice ──────────────────────────────────────────────────────────────
  const { playAudio, playText, stopAll } = useAIVoice({ enabled: voiceEnabled });
  // Expose playText via ref so it's accessible inside the socket callback without stale closure
  const playTextRef = useRef(playText);
  useEffect(() => { playTextRef.current = playText; }, [playText]);

  // ── WebRTC ────────────────────────────────────────────────────────────────
  const { getLocalStream, announceReady, handleWebRTCEvent, setMuted: setRTCMuted, setCameraOff: setRTCCamOff, localStreamRef: rtcLocalRef } = useWebRTC({
    emit: (ev, data) => socketEmit(ev, data),
    roomCode: code,
    userId: user?._id,
    onStream: (socketId, stream) => {
      setRemoteStreams(prev => ({ ...prev, [socketId]: stream }));
    },
    onStreamRemoved: (socketId) => {
      setRemoteStreams(prev => { const n = { ...prev }; delete n[socketId]; return n; });
    },
  });

  // ── Socket ────────────────────────────────────────────────────────────────
  let socketEmit = () => {};
  const { emit, socket, getSocketId } = useGDSocket({
    onEvent: useCallback((ev, data) => {
      // WebRTC events
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
          // Announce WebRTC presence
          setTimeout(() => {
            mySocketIdRef.current = getSocketId();
            announceReady(getSocketId());
          }, 500);
          break;
        case 'participant-update':
          setParticipants(data.participants || []);
          if (data.state) setSessionState(data.state);
          break;
        case 'participant-left':
        case 'participant-disconnected':
          setParticipants(p => p.map(x => x.userId === data.userId ? { ...x, disconnected: true } : x));
          break;
        case 'room-locked':
          setSessionState('error'); setLockedMsg(data.message);
          break;
        case 'room-full':
          setSessionState('error'); setLockedMsg(data.message);
          break;
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
        case 'ai-message':
          setCaptions(c => [...c.slice(-80), { ...data, ts: Date.now() }]);
          setTimeout(() => captionsRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          // Speak text immediately — don't wait for ai-voice (which needs Groq TTS round-trip)
          if (data.text) playTextRef.current?.(data.text);
          break;
        case 'ai-voice':
          // Groq TTS audio — already speaking via playText above, skip duplicate
          // Only use if you want higher-quality audio over Web Speech
          // if (data.audioBase64) playAudio(data.audioBase64, data.text);
          break;
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
          stopAll();
          break;
        case 'evaluation-ready':
          setEvalData(data);
          break;
        case 'participant-media-update':
          setParticipants(p => p.map(x => x.userId === data.userId ? { ...x, isMuted: data.isMuted, isCameraOff: data.isCameraOff } : x));
          break;
        case 'active-speaker-update':
          setActiveSpeaker(data.speaking ? data.userId : null);
          break;
        case 'error':
          setSessionState('error'); setLockedMsg(typeof data === 'string' ? data : data?.message || 'Unknown error');
          break;
        default: break;
      }
    }, [handleWebRTCEvent, playAudio, stopAll, announceReady])
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

  // ── Join room on mount ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !code || gateState !== 'room') return;
    fetch(`${API}/gd/rooms/${code}`, { headers: tk() })
      .then(r => r.json()).then(d => { if (d.room) setRoom(d.room); });
    emit('join-room', { roomCode: code, userId: user._id, userName: user.name });
  }, [code, user, emit, gateState]);

  // ── Countdown timers ──────────────────────────────────────────────────────
  useEffect(() => {
    if (sessionState === 'prep' && prepTimer > 0) {
      const t = setInterval(() => setPrepTimer(n => { if (n <= 1) { clearInterval(t); return 0; } return n - 1; }), 1000);
      return () => clearInterval(t);
    }
  }, [sessionState, prepTimer]);

  useEffect(() => {
    if (sessionState === 'active' && sessionTimer > 0) {
      timerRef.current = setInterval(() => setSessionTimer(n => { if (n <= 1) { clearInterval(timerRef.current); return 0; } return n - 1; }), 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [sessionState, sessionTimer]);

  // ── STT — FIXED: click-to-toggle continuous recognition (no hold required) ──
  const shouldSpeakRef = useRef(false);

  function _startRecSession() {
    if (!shouldSpeakRef.current) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    try { recognitionRef.current?.abort(); } catch {}
    const rec = new SR();
    rec.lang = room?.language === 'Hindi' ? 'hi-IN' : 'en-IN';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    recognitionRef.current = rec;
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (!e.results[i].isFinal) continue;
        const text = e.results[i][0].transcript.trim();
        if (!text) continue;
        const words  = text.split(/\s+/).length;
        const filler = countFillers(text);
        const secs   = Math.round((Date.now() - (speakStartRef.current || Date.now())) / 1000);
        speakStartRef.current = Date.now();
        setMyStats(s => ({ ...s, wordCount: s.wordCount + words, fillerWords: s.fillerWords + filler, speakingTime: s.speakingTime + secs }));
        emit('speech-update', { roomCode: code, userId: user._id, text, delta: { wordCount: words, fillerWords: filler, speakingTime: secs } });
        emit('active-speaker', { roomCode: code, userId: user._id, speaking: true });
        setTimeout(() => emit('active-speaker', { roomCode: code, userId: user._id, speaking: false }), 2500);
      }
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed') { shouldSpeakRef.current = false; setIsSpeaking(false); alert('Microphone permission denied.'); }
    };
    rec.onend = () => { if (shouldSpeakRef.current) setTimeout(_startRecSession, 200); else setIsSpeaking(false); };
    try { rec.start(); } catch {}
  }

  function startSpeaking() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition not supported. Use Chrome or Edge.'); return;
    }
    shouldSpeakRef.current = true;
    speakStartRef.current = Date.now();
    setIsSpeaking(true);
    emit('interrupt', { roomCode: code, userId: user._id });
    _startRecSession();
  }

  function stopSpeaking() {
    shouldSpeakRef.current = false;
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
    setIsSpeaking(false);
    emit('active-speaker', { roomCode: code, userId: user._id, speaking: false });
  }

  function toggleSpeaking() { if (isSpeaking) stopSpeaking(); else startSpeaking(); }

  function stopRecognition() { shouldSpeakRef.current = false; try { recognitionRef.current?.stop(); } catch {} setIsSpeaking(false); }

  // ── Toggle mic/camera ─────────────────────────────────────────────────────
  function toggleMic() {
    const next = !isMuted;
    setIsMuted(next);
    setRTCMuted(next);
    emit('media-status', { roomCode: code, userId: user._id, isMuted: next });
    if (next) stopSpeaking();
  }

  function toggleCam() {
    const next = !isCamOff;
    setIsCamOff(next);
    setRTCCamOff(next);
    emit('media-status', { roomCode: code, userId: user._id, isCameraOff: next });
  }

  function sendChat() {
    const text = chatInputRef.current?.trim();
    if (!text) return;
    emit('chat-message', { roomCode: code, userId: user._id, userName: user.name, text });
    chatInputRef.current = '';
    // force re-render
    if (document.getElementById('gd-chat-input')) document.getElementById('gd-chat-input').value = '';
  }

  // ── MediaPermissionGate callback ─────────────────────────────────────────
  async function handleMediaReady(stream, { isMuted: muted, isCamOff: camOff } = {}) {
    localStreamRef.current  = stream;
    rtcLocalRef.current     = stream;
    setIsMuted(muted || false);
    setIsCamOff(camOff || false);
    setGateState('room');
  }

  function handleSkipMedia() {
    setGateState('room');
  }

  // ── MEDIA GATE ────────────────────────────────────────────────────────────
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
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 40, height: 40, border: '3px solid #e8edf5', borderTopColor: '#531697', borderRadius: '50%', animation: '_s .7s linear infinite' }} />
      <style>{`@keyframes _s{to{transform:rotate(360deg)}}`}</style>
      <div style={{ color: '#b0bec9' }}>Connecting to room {code}…</div>
    </div>
  );

  // ── LOCKED OUT / ERROR ────────────────────────────────────────────────────
  if (sessionState === 'error') return (
    <div style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center', fontFamily: "'Nunito',sans-serif" }}>
      <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔒</div>
      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.3rem', color: DARK, marginBottom: 8 }}>Session Locked</div>
      <div style={{ color: '#7a8ba8', marginBottom: 24, lineHeight: 1.6 }}>{lockedMsg || 'Group Discussion has already started. Please wait for the next session.'}</div>
      <button onClick={() => nav('/dashboard/gd')} style={{ padding: '11px 28px', borderRadius: 10, border: 'none', background: GRAD, color: '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif" }}>← Back to Lobby</button>
    </div>
  );

  // ── COMPLETED ─────────────────────────────────────────────────────────────
  if (sessionState === 'completed' && evalData) return (
    <div style={{ maxWidth: 540, margin: '60px auto', textAlign: 'center', fontFamily: "'Nunito',sans-serif" }}>
      <div style={{ fontSize: '3rem', marginBottom: 14 }}>🎉</div>
      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.4rem', color: DARK, marginBottom: 8 }}>Session Complete!</div>
      <div style={{ color: '#7a8ba8', marginBottom: 20 }}>Your AI evaluation report is ready.</div>
      <button onClick={() => nav(`/dashboard/gd/report/${code}/${user._id}`, { state: { evalData, topic, myStats } })}
        style={{ padding: '12px 32px', borderRadius: 12, border: 'none', background: GRAD, color: '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '1rem' }}>
        📊 View My Report →
      </button>
      <div style={{ marginTop: 12 }}>
        <button onClick={() => nav('/dashboard/gd')} style={{ padding: '9px 20px', borderRadius: 10, border: '1px solid #d0d7e8', background: 'transparent', color: '#7a8ba8', fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito',sans-serif" }}>Back to Lobby</button>
      </div>
    </div>
  );

  // ── MAIN ROOM — Google Meet style ─────────────────────────────────────────
  const myParticipant = participants.find(p => p.userId === user?._id) || { name: user?.name, userId: user?._id };

  return (
    <div style={{
      fontFamily: "'Nunito',sans-serif",
      background: DARK,
      // Lock to full viewport — no page scroll inside GD room
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex', flexDirection: 'column',
      color: '#fff', zIndex: 100,
    }}>

      {/* ── TOP BAR ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px', background:'#1a2640', borderBottom:'1px solid #2a3a5a', flexShrink:0, height:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
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
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {sessionState === 'active' && (
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.05rem', color:sessionTimer < 60 ? '#ef4444' : '#47d372' }}>
              ⏰ {formatTime(sessionTimer)}
            </div>
          )}
          <button onClick={() => { setVoiceEnabled(v => !v); stopAll(); }}
            style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #2a3a5a', background:voiceEnabled ? 'rgba(19,161,165,0.15)' : 'rgba(255,255,255,0.05)', color:voiceEnabled ? '#13a1a5' : '#4a5a7a', fontWeight:700, cursor:'pointer', fontSize:'.7rem' }}>
            {voiceEnabled ? '🔊 Voice ON' : '🔇 Voice OFF'}
          </button>
        </div>
      </div>

      {/* ── TOPIC BANNER ── */}
      {topic && (
        <div style={{ background:'linear-gradient(90deg,#531697,#13a1a5)', padding:'6px 14px', textAlign:'center', flexShrink:0 }}>
          <span style={{ fontSize:'.65rem', fontWeight:700, opacity:.8, marginRight:6 }}>TOPIC</span>
          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.84rem' }}>"{topic}"</span>
        </div>
      )}

      {/* ── AI MODERATOR BANNER ── */}
      {systemMsg && (
        <div style={{ padding:'5px 14px', background:'rgba(83,22,151,0.15)', borderBottom:'1px solid rgba(83,22,151,0.3)', fontSize:'.74rem', fontWeight:700, color:'#c4a0f5', flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          🤖 <span style={{ color:'#9ab0c8', fontWeight:400 }}>{systemMsg}</span>
        </div>
      )}

      {/* ── BODY: video + side panel, fills exact remaining height ── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0 }}>

        {/* LEFT: video grid + controls */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

          {/* Video grid — grows to fill all space above controls bar */}
          <div style={{ flex:1, overflow:'hidden', minHeight:0, padding:'8px 8px 0' }}>
            <div style={{
              display:'grid', gap:6, width:'100%', height:'100%',
              gridTemplateColumns: participants.length <= 2 ? '1fr 1fr' : participants.length <= 4 ? '1fr 1fr' : 'repeat(3,1fr)',
              gridTemplateRows:    participants.length <= 2 ? '1fr' : '1fr 1fr',
            }}>
              <VideoTile
                stream={localStreamRef.current}
                participant={{ ...myParticipant, isMuted, isCameraOff: isCamOff }}
                isActiveSpeaker={activeSpeaker === user?._id}
                isLocal size={participants.length <= 2 ? 'large' : 'small'}
              />
              {participants.filter(p => p.userId !== user?._id).map((p, i) => {
                const sid    = Object.entries(socketUserMap).find(([, uid]) => uid === p.userId)?.[0];
                return (
                  <VideoTile key={p.userId || i}
                    stream={p.isAI ? null : remoteStreams[sid]}
                    participant={p}
                    isActiveSpeaker={activeSpeaker === p.userId}
                    size={participants.length <= 2 ? 'large' : 'small'}
                  />
                );
              })}
            </div>
          </div>

          {/* Controls bar — fixed 68px, never moves */}
          <div style={{
            flexShrink:0, height:68,
            display:'flex', justifyContent:'center', alignItems:'center', gap:8,
            background:'#131f35', borderTop:'1px solid #2a3a5a', padding:'0 10px',
          }}>
            <ControlButton icon={isMuted   ? '🔇' : '🎙️'} label={isMuted   ? 'Unmute'       : 'Mute'}       active={isMuted}  color="#ef4444" onClick={toggleMic} />
            <ControlButton icon={isCamOff  ? '📷' : '📹'} label={isCamOff  ? 'Start Video'  : 'Stop Video'} active={isCamOff} color="#ef4444" onClick={toggleCam} />

            {sessionState === 'active' && (
              <button
                onClick={toggleSpeaking}
                title={isSpeaking ? 'Click to stop mic' : 'Click once — speaks continuously — no holding required'}
                style={{
                  padding:'8px 18px', borderRadius:22, border:'none',
                  background: isSpeaking ? '#ef4444' : 'rgba(83,22,151,0.75)',
                  color:'#fff', fontWeight:800, cursor:'pointer',
                  fontFamily:"'Nunito',sans-serif", fontSize:'.8rem',
                  animation: isSpeaking ? 'gdpulse 1s ease-in-out infinite' : 'none',
                  userSelect:'none', WebkitUserSelect:'none',
                  display:'flex', alignItems:'center', gap:6,
                  boxShadow: isSpeaking ? '0 0 0 6px rgba(239,68,68,0.25)' : '0 3px 12px rgba(83,22,151,0.35)',
                }}>
                {isSpeaking ? '⏹ Stop Mic' : '🎤 Click to Speak'}
              </button>
            )}

            <ControlButton icon="💬" label={showChat ? 'Hide Chat' : 'Chat'} active={showChat} color="#13a1a5" onClick={() => setShowChat(s => !s)} />
            <ControlButton icon="📴" label="Leave" active danger color="#ef4444" onClick={() => { stopAll(); nav('/dashboard/gd'); }} />
          </div>
          <style>{`@keyframes gdpulse{0%,100%{opacity:1}50%{opacity:.55}}`}</style>
        </div>

        {/* RIGHT: side panel — fixed 290px, self-contained scroll */}
        {showChat && (
          <div style={{
            width:290, flexShrink:0,
            display:'flex', flexDirection:'column',
            background:'#13203a', borderLeft:'1px solid #2a3a5a',
            overflow:'hidden',
          }}>
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
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── CONTROL BUTTON ─────────────────────────────────────────────────────────
function ControlButton({ icon, label, active, color = '#ef4444', onClick, danger }) {
  return (
    <button onClick={onClick} style={{
      display:'flex', flexDirection:'column', alignItems:'center', gap:3,
      padding:'6px 12px', borderRadius:10, border:'none',
      background: (active || danger) ? `${color}22` : 'rgba(255,255,255,0.07)',
      cursor:'pointer', minWidth:52,
    }}>
      <span style={{ fontSize:18 }}>{icon}</span>
      <span style={{ fontSize:'.6rem', color:(active || danger) ? color : '#9ab0c8', fontWeight:700, fontFamily:"'Nunito',sans-serif" }}>{label}</span>
    </button>
  );
}

// ── SIDE PANEL — strict height containment with internal scroll ────────────
function SidePanel({ captions, chatMessages, myUserId, sessionState, myStats,
                     captionsEndRef, chatEndRef, onSendChat, chatInputRef, participants, topic }) {
  const [tab, setTab] = React.useState('captions');

  return (
    // Outer: fills parent's fixed height entirely — no overflow
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* Tab bar — fixed height */}
      <div style={{ display:'flex', borderBottom:'1px solid #2a3a5a', flexShrink:0 }}>
        {[['captions','📝 Live'],['chat','💬 Chat'],['people','👥 People'],['stats','📈 Stats']].map(([id, lbl]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex:1, padding:'9px 2px', border:'none', background:'transparent',
            color: tab === id ? '#13a1a5' : '#4a5a7a',
            fontWeight:700, cursor:'pointer', fontSize:'.65rem',
            borderBottom: tab === id ? '2px solid #13a1a5' : '2px solid transparent',
            fontFamily:"'Nunito',sans-serif", transition:'color .15s',
          }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Content area — fills remaining height, scrolls internally */}
      <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', minHeight:0 }}>

        {/* ── TRANSCRIPT ── */}
        {tab === 'captions' && (
          <div style={{ flex:1, overflowY:'auto', padding:'10px 10px 0', minHeight:0 }}>
            {captions.length === 0 && (
              <div style={{ textAlign:'center', padding:'30px 0', color:'#4a5a7a', fontSize:'.75rem' }}>
                {sessionState === 'active' ? 'Hold to speak — transcripts appear here' : 'Transcripts will appear during discussion'}
              </div>
            )}
            {captions.map((c, i) => (
              <div key={i} style={{
                marginBottom:8, padding:'7px 9px', borderRadius:8,
                background: c.isAI
                  ? 'rgba(19,161,165,0.1)'
                  : c.userId === myUserId
                    ? 'rgba(83,22,151,0.12)'
                    : 'rgba(255,255,255,0.04)',
                border: c.isAI ? '1px solid rgba(19,161,165,0.2)' : '1px solid transparent',
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                  <span style={{ fontWeight:800, fontSize:'.7rem', color: c.isAI ? '#13a1a5' : c.userId === myUserId ? '#c4a0f5' : '#9ab0c8' }}>
                    {c.isAI ? '🤖 ' : ''}{c.userName}
                    {c.type === 'participant' && c.isAI && <span style={{ fontSize:'.58rem', marginLeft:4, opacity:.7 }}>(AI participant)</span>}
                  </span>
                  <span style={{ fontSize:'.6rem', color:'#3a4a6a' }}>{new Date(c.ts).toLocaleTimeString('en-IN',{ hour:'2-digit', minute:'2-digit' })}</span>
                </div>
                <div style={{ fontSize:'.76rem', color:'#c8d8ea', lineHeight:1.5 }}>{c.text}</div>
              </div>
            ))}
            {/* Scroll anchor */}
            <div ref={captionsEndRef} style={{ height:4 }} />
          </div>
        )}

        {/* ── CHAT ── */}
        {tab === 'chat' && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>
            {/* Scrollable messages */}
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
            {/* Input — fixed at bottom, never scrolls away */}
            <div style={{ flexShrink:0, padding:'8px 10px', borderTop:'1px solid #1e2e4a', display:'flex', gap:6 }}>
              <input
                id="gd-chat-input"
                placeholder="Type a message…"
                onChange={e => { chatInputRef.current = e.target.value; }}
                onKeyDown={e => { if (e.key === 'Enter') onSendChat(); }}
                style={{ flex:1, padding:'7px 10px', borderRadius:7, border:'1px solid #2a3a5a', background:'#0f1a2e', color:'#fff', fontFamily:"'Nunito',sans-serif", fontSize:'.78rem', outline:'none' }}
              />
              <button onClick={onSendChat} style={{ padding:'7px 12px', borderRadius:7, border:'none', background:GRAD, color:'#fff', fontWeight:800, cursor:'pointer', fontSize:'.82rem' }}>→</button>
            </div>
          </div>
        )}

        {/* ── PEOPLE ── */}
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
                    {p.isAI ? '🤖 AI Participant' : p.disconnected ? '⚠️ Reconnecting' : '🎓 Student'}
                  </div>
                </div>
                <div style={{ fontSize:'.65rem', display:'flex', gap:3 }}>
                  {p.isMuted && '🔇'}{p.isCameraOff && '📷'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── STATS ── */}
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
                <span style={{ fontSize:'.75rem', color:'#7a8ba8' }}>{ic} {label}</span>
                <span style={{ fontWeight:800, color, fontSize:'.9rem' }}>{value}</span>
              </div>
            ))}
            {topic && (
              <div style={{ marginTop:14, padding:'9px 10px', borderRadius:8, background:'rgba(83,22,151,0.1)', fontSize:'.72rem', color:'#9ab0c8', lineHeight:1.5 }}>
                <div style={{ fontWeight:700, marginBottom:3, color:'#c4a0f5' }}>📌 Topic</div>
                {topic}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


