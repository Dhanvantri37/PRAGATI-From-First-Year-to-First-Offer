import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getNaturalVoice } from '../utils/voiceHelper';
import { io } from 'socket.io-client';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tk  = () => ({ Authorization: `Bearer ${localStorage.getItem('pragati_token')}` });

const NAV_STUDENT = [
  { to:'/dashboard',               icon:'🏠', label:'Dashboard' },
  { to:'/dashboard/notes',         icon:'📚', label:'Notes' },
  { to:'/dashboard/problems',      icon:'💻', label:'Daily Practice' },
  { to:'/dashboard/aptitude',      icon:'🎯', label:'Aptitude' },
  { to:'/dashboard/interview-prep',icon:'🏅', label:'Placement Prep Hub' },
  { to:'/dashboard/ai-interview',  icon:'🤖', label:'AI Interviewer'},
  { to:'/dashboard/companies',     icon:'🏢', label:'Companies' },
  { to:'/dashboard/drives',        icon:'🗓️', label:'Placement Drives' },
  { to:'/dashboard/alumni',        icon:'🎓', label:'Alumni Network' },
  { to:'/dashboard/skillpath',     icon:'🧠', label:'SkillPath AI' },
  { to:'/dashboard/gd',            icon:'🎤', label:'Group Discussion' },
  { to:'/dashboard/discussions',   icon:'💬', label:'Doubt Resolution' },
];

const NAV_FACULTY = [
  { to:'/dashboard',                  icon:'🏠', label:'Dashboard' },
  { to:'/dashboard/students',         icon:'👥', label:'Students' },
  { to:'/dashboard/leaderboard-view', icon:'🏆', label:'Leaderboard' },
  { to:'/dashboard/announcements',    icon:'📢', label:'Announcements' },
  { to:'/dashboard/drives',           icon:'🗓️', label:'Placement Drives' },
  { to:'/dashboard/companies',        icon:'🏢', label:'Companies' },
  { to:'/dashboard/alumni',           icon:'🎓', label:'Alumni Network' },
  { to:'/dashboard/notes',            icon:'📚', label:'Notes' },
  { to:'/dashboard/gd',               icon:'🎤', label:'Group Discussion' },
  { to:'/dashboard/discussions',      icon:'💬', label:'Discussions' },
];
const NAV_ADMIN = [
  { to:'/dashboard',          icon:'📊', label:'Overview' },
  { to:'/dashboard/admin',    icon:'⚙️', label:'Admin Panel' },
  { to:'/dashboard/alumni',   icon:'🎓', label:'Alumni Network' },
  { to:'/dashboard/notes',    icon:'📚', label:'Notes' },
  { to:'/dashboard/companies',icon:'🏢', label:'Companies' },
  { to:'/dashboard/drives',   icon:'🗓️', label:'Placement Drives' },
];

// ── VAPID key helper for push subscription ───────────────────────────────────
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export default function DashboardLayout() {
  const notifRef = useRef(null);
  const { user, setUser, logout } = useAuth();
  const nav      = useNavigate();
  const location = useLocation();                                          // ✅ hook at top level

  // GD Room/Report pages need full-screen — no sidebar padding/maxWidth
  const isGDRoom = /\/dashboard\/gd\/.+/.test(location.pathname);         // ✅ derived from hook

  const [open, setOpen]             = useState(true);
  const [darkMode, setDarkMode]     = useState(() => localStorage.getItem('pragati_dark') === '1');

  // Sync dark mode class with document body
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  // Group Discussion real-time broadcast toast notifications
  const [gdNotifications, setGdNotifications] = useState([]);
  const gdNotifTimers = useRef({});
  const gdSocketRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('pragati_token');
    const base = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');
    const socket = io(base, { auth: { token }, transports: ['websocket'], reconnection: true });
    gdSocketRef.current = socket;

    socket.on('gd-room-created', (data) => {
      const isCurrentlyInGDRoom = /\/dashboard\/gd\/.+/.test(window.location.pathname);
      if (isCurrentlyInGDRoom) return;

      const id = Date.now();
      setGdNotifications(n => [...n.slice(-2), { id, ...data }]);
      gdNotifTimers.current[id] = setTimeout(() => {
        setGdNotifications(n => n.filter(x => x.id !== id));
        delete gdNotifTimers.current[id];
      }, 12000);
    });

    // ── Real-time bell: new notification pushed from backend ────────────────
    socket.on('notification:new', (notif) => {
      setNotifList(prev => {
        // avoid duplicates
        const exists = prev.some(n => String(n._id) === String(notif._id));
        if (exists) return prev;
        return [notif, ...prev];
      });
      // Only count it as unread if we haven't read it yet
      const readSet = new Set(JSON.parse(localStorage.getItem('pragati_read_ids') || '[]'));
      if (!readSet.has(String(notif._id))) {
        setNotifCount(c => c + 1);
      }
    });

    return () => {
      socket.disconnect();
      Object.values(gdNotifTimers.current).forEach(clearTimeout);
    };
  }, [user]);
  const [showNotif, setShowNotif]   = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifList, setNotifList]   = useState([]);

  // ── Read notification IDs (persisted so bell auto-clears after read) ────
  const [readIds, setReadIds] = React.useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('pragati_read_ids') || '[]')); }
    catch { return new Set(); }
  });

  function markNotifRead(id) {
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(String(id));
      localStorage.setItem('pragati_read_ids', JSON.stringify([...next]));
      return next;
    });
    setNotifCount(c => Math.max(0, c - 1));
  }

  function markAllRead() {
    setReadIds(prev => {
      const next = new Set(prev);
      notifList.forEach(n => next.add(String(n._id)));
      localStorage.setItem('pragati_read_ids', JSON.stringify([...next]));
      return next;
    });
    setNotifCount(0);
    // Update lastSeen timestamp too
    localStorage.setItem('pragati_notif_seen', Date.now().toString());
  }

  // Fetch announcements, drives, and discussions for bell icon
  React.useEffect(() => {
    const base  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('pragati_token');
    Promise.all([
      fetch(`${base}/announcements`, { headers: { Authorization: `Bearer ${token}` } }).then(r=>r.json()).catch(()=>({announcements:[]})),
      fetch(`${base}/drives`,        { headers: { Authorization: `Bearer ${token}` } }).then(r=>r.json()).catch(()=>({drives:[]})),
      fetch(`${base}/discussions`,   { headers: { Authorization: `Bearer ${token}` } }).then(r=>r.json()).catch(()=>({discussions:[]})),
    ]).then(([annData, driveData, discData]) => {
      const anns   = (annData.announcements || []).map(a => ({ ...a, type: a.type || 'announcement' }));
      const drives = (driveData.drives || []).map(d => ({
        _id: d._id, type: 'drive',
        title: `🗓️ Drive: ${d.companyName}`,
        message: `${d.role ? d.role + ' — ' : ''}${d.status === 'open' ? 'Applications Open!' : 'Upcoming drive'}`,
        link: '/dashboard/drives',
        createdAt: d.createdAt, priority: d.status === 'open' ? 'high' : 'normal',
      }));
      // Only include discussions from last 7 days (keep bell clean)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const discs = (discData.discussions || [])
        .filter(d => new Date(d.createdAt) > sevenDaysAgo)
        .slice(0, 10)
        .map(d => ({
          _id: d._id, type: 'discussion',
          title: `💬 ${d.createdBy?.name || 'Someone'}: ${(d.title || '').substring(0, 50)}`,
          message: (d.content || '').substring(0, 80),
          link: '/dashboard/discussions',
          createdAt: d.createdAt,
          priority: ['faculty','admin'].includes(d.createdBy?.role) ? 'high' : 'normal',
          createdBy: d.createdBy,
        }));
      const all = [...anns, ...drives, ...discs].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotifList(all);
      // Unread = not in our read set
      const readSet = new Set(JSON.parse(localStorage.getItem('pragati_read_ids') || '[]'));
      const unread  = all.filter(a => !readSet.has(String(a._id)));
      setNotifCount(unread.length);
    });

    // Listen for SW "NOTIF_READ" messages
    const handler = (e) => {
      if (e.data?.type === 'NOTIF_READ' && e.data?.id) markNotifRead(e.data.id);
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, []); // eslint-disable-line

  // ── Push notification subscription on load ────────────────────────────────
  React.useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission === 'denied') return;
    navigator.serviceWorker.ready.then(async reg => {
      try {
        const existing = await reg.pushManager.getSubscription();
        if (existing) return; // already subscribed
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') return;
        // Use VAPID key from env (add REACT_APP_VAPID_PUBLIC_KEY to .env)
        const vapidKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
        if (!vapidKey) return; // skip if not configured
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
        const base  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const token = localStorage.getItem('pragati_token');
        await fetch(`${base}/notifications/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ subscription: sub }),
        }).catch(() => {});
      } catch {}
    });
  }, []); // eslint-disable-line

  // ── Voice accent preference (indian / foreign / default) ────────────────
  const [voiceAccent, setVoiceAccent] = React.useState(() =>
    localStorage.getItem('pragati_accent') || 'indian'
  );
  function saveAccent(v) {
    setVoiceAccent(v);
    localStorage.setItem('pragati_accent', v);
  }
  const [voiceGender, setVoiceGender] = React.useState(() =>
    localStorage.getItem('pragati_voice_gender') || 'female'
  );
  
  const voiceGenderRef = React.useRef(voiceGender);
  const voiceAccentRef = React.useRef(voiceAccent);
  
  React.useEffect(() => { voiceGenderRef.current = voiceGender; }, [voiceGender]);
  React.useEffect(() => { voiceAccentRef.current = voiceAccent; }, [voiceAccent]);

  const [showEditProfile,   setShowEditProfile]   = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef();

  // ── Hey Pragati Assistant ────────────────────────────────────────────────
  const [pragatiOpen,    setPragatiOpen]    = useState(false);
  const [pragatiMsgs,   setPragatiMsgs]    = useState([{ role:'ai', text:"🙏 Namaste! I'm PRAGATI, your AI placement companion. I'm here to help you ace interviews, master DSA, and land your dream job. Ask me anything, or say \"Hey PRAGATI\" anytime!", ts: Date.now() }]);
  const [pragatiInput,  setPragatiInput]   = useState('');
  const [pragatiLoading,setPragatiLoading] = useState(false);
  const [wakePulse,     setWakePulse]      = useState(false);
  const [wakeListening, setWakeListening]  = useState(false);
  const [pragatiVoice,  setPragatiVoice]   = useState(true);  // voice on/off toggle
  const [pragatiMicOn,  setPragatiMicOn]   = useState(false); // in-chat mic
  const [ttsLoading,    setTtsLoading]     = useState(false); // voice generation loading
  const [ttsSpeaking,   setTtsSpeaking]    = useState(false); // voice speaking
  const pragatiEndRef   = useRef(null);
  const wakeSRRef       = useRef(null);
  const pragatiSRRef    = useRef(null); // in-chat speech recognition
  const welcomeSpokenRef = useRef(false); // guard: speak welcome only once per session
  const pragatiInputRef = useRef(null);
  const wakeRestartRef  = useRef(null); // callback to restart wake SR after mic releases
  const wakePausedRef   = useRef(false); // true while in-chat mic is active — stops wake SR from restarting
  const [micBlocked,   setMicBlocked]   = useState(false); // true if user denied mic permission
  const wakeBlockedRef  = useRef(false);
  
  const pragatiVoiceRef = React.useRef(pragatiVoice);
  React.useEffect(() => { pragatiVoiceRef.current = pragatiVoice; }, [pragatiVoice]);

  // Navigation command map
  const NAV_COMMANDS = [
    { phrases:['dashboard','home','main'],                    path:'/dashboard' },
    { phrases:['notes'],                                      path:'/dashboard/notes' },
    { phrases:['problem','daily practice','coding practice'], path:'/dashboard/problems' },
    { phrases:['aptitude'],                                   path:'/dashboard/aptitude' },
    { phrases:['interview prep'],                             path:'/dashboard/interview-prep' },
    { phrases:['ai interview','ai interviewer'],              path:'/dashboard/ai-interview' },
    { phrases:['compan'],                                     path:'/dashboard/companies' },
    { phrases:['drive','placement drive'],                    path:'/dashboard/drives' },
    { phrases:['skill','skillpath'],                          path:'/dashboard/skillpath' },
    { phrases:['group discussion','gd'],                      path:'/dashboard/gd' },
    { phrases:['discussion','forum'],                         path:'/dashboard/discussions' },
  ];

  function checkNavCommand(text) {
    const lower = text.toLowerCase();
    // Detect navigation intent
    if (!/take me|open|go to|navigate|show me/.test(lower)) return null;
    for (const cmd of NAV_COMMANDS) {
      if (cmd.phrases.some(p => lower.includes(p))) return cmd.path;
    }
    return null;
  }

  // PRAGATI TTS — Browser-first/Backend Dual-Provider (ElevenLabs/Edge-TTS)
  async function pragatiSpeak(text, forceGender = null, forceAccent = null, forceToneAlt = false) {
    if (!pragatiVoiceRef.current || !text?.trim()) return;

    // Pause wake word detection while speaking
    wakePausedRef.current = true;
    try { wakeSRRef.current?.abort(); } catch {}
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (window.pragatiAudioPlayer) {
      try { window.pragatiAudioPlayer.pause(); } catch (e) {}
      window.pragatiAudioPlayer = null;
    }

    // Strip markdown & code blocks for clean speech
    const clean = text
      .replace(/```[\s\S]*?```/g, '')  // strip code blocks
      .replace(/`[^`]*`/g, '')        // strip inline code
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g,    '$1')
      .replace(/#{1,6} /g,      '')
      .replace(/[\[\]()]/g,     '')
      .substring(0, 500);

    const resumeWake = () => {
      setTtsSpeaking(false);
      setTtsLoading(false);
      // Safe 500ms delay to allow Chrome to release mic completely before restart
      setTimeout(() => {
        wakePausedRef.current = false;
        if (wakeRestartRef.current) wakeRestartRef.current();
      }, 500);
    };

    // ── 1. Try Backend Neural TTS (ElevenLabs / Edge-TTS) ──────────────────
    setTtsLoading(true);
    try {
      const activeGender = forceGender || voiceGenderRef.current;
      const activeAccent = forceAccent || voiceAccentRef.current;

      const response = await axios.post(`${API}/tts`, {
        text: clean,
        gender: activeGender,
        accent: activeAccent,
        toneAlt: forceToneAlt,
        role: activeGender === 'male' ? 'system_male' : 'system_female'
      }, {
        responseType: 'blob'
      });

      const audioBlob = response.data;
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      window.pragatiAudioPlayer = audio;

      setTtsLoading(false);
      setTtsSpeaking(true);

      audio.onended = () => {
        resumeWake();
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        resumeWake();
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
      return; // Played successfully!
    } catch (err) {
      console.warn('Backend TTS failed, falling back to local speech:', err.message);
    }

    // ── 2. Fallback: Browser Web Speech API SpeechSynthesis ────────────────
    setTtsLoading(false);
    if (!window.speechSynthesis) {
      resumeWake();
      return;
    }

    setTtsSpeaking(true);
    const utt = new SpeechSynthesisUtterance(clean);
    const activeGender = forceGender || voiceGenderRef.current;
    const activeAccent = forceAccent || voiceAccentRef.current;
    const voice = getNaturalVoice(activeAccent, activeGender);
    utt.pitch = 1.05;
    utt.rate  = 1.0;
    utt.volume = 1.0;

    if (voice) { utt.voice = voice; utt.lang = voice.lang; }
    else { utt.lang = activeAccent === 'foreign' ? 'en-US' : 'en-IN'; }

    const ka = setInterval(() => { if (window.speechSynthesis.paused) window.speechSynthesis.resume(); }, 3000);
    utt.onend = () => { clearInterval(ka); resumeWake(); };
    utt.onerror = () => { clearInterval(ka); resumeWake(); };

    const speak = () => window.speechSynthesis.speak(utt);
    if (!window.speechSynthesis.getVoices().length) {
      window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.onvoiceschanged = null; speak(); };
    } else {
      speak();
    }
  }

  // Wake word detection — "Hey PRAGATI" — continuous mode, always listening
  React.useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || !pragatiVoice) return; // only run when voice is enabled

    // ── Block on Android / mobile browsers ────────────────────────────────────
    // Android Chrome plays an audible "ding" on every SpeechRecognition start.
    // Because wake word restarts continuously, this causes non-stop ding-dong.
    // Mobile users can still use the in-chat microphone button manually.
    const ua = navigator.userAgent || '';
    const isAndroid = /Android/i.test(ua);
    const isMobile  = /iPhone|iPad|iPod|Android|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    if (isAndroid || isMobile) return; // ← restore original mobile block
    // ──────────────────────────────────────────────────────────────────────────

    let active = true;
    let retryTimer = null;
    let silenceTimer = null;
    let wakeSRRunning = false;

    // Request mic permission upfront — keeps Chrome from playing "ding" on SR restart
    navigator.mediaDevices?.getUserMedia({ audio: true })
      .then(stream => { 
        window._dummyAudioStream = stream; 
        wakeBlockedRef.current = false;
        setMicBlocked(false);
        startWake();
      })
      .catch(() => {
        wakeBlockedRef.current = true;
        setMicBlocked(true);
      });

    function startWake() {
      if (!active || wakeBlockedRef.current || wakePausedRef.current || wakeSRRunning) return;
      try {
        const sr = new SR();
        wakeSRRef.current = sr;
        sr.continuous      = true;
        sr.interimResults  = true;  // catch partials for faster response
        sr.lang            = 'en-IN';
        sr.maxAlternatives = 3;

        const wakeWords = [
          'hey pragati', 'hey pragatee', 'hey pragathy', 'hey progati',
          'hey prakati', 'ey pragati', 'hi pragati', 'hi pragatee'
        ];

        sr.onstart = () => {
          wakeSRRunning = true;
        };

        sr.onresult = e => {
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const isFinal = e.results[i].isFinal;
            for (let j = 0; j < e.results[i].length; j++) {
              const heard = e.results[i][j].transcript;
              const lowerHeard = heard.toLowerCase().trim();
              
              // Check if any wake word is mentioned
              let matched = null;
              for (const w of wakeWords) {
                if (lowerHeard.includes(w)) {
                  matched = w;
                  break;
                }
              }
              
              if (matched) {
                setPragatiOpen(true);
                const startIndex = lowerHeard.indexOf(matched) + matched.length;
                const command = heard.substring(startIndex).trim();
                
                if (command) {
                  setPragatiInput(command);

                  // Setup silence timer to submit command after user stops speaking (2.2s for natural pace)
                  if (silenceTimer) clearTimeout(silenceTimer);
                  silenceTimer = setTimeout(() => {
                    if (active) {
                      try { wakeSRRef.current?.stop(); } catch {}
                      sendPragati(command);
                    }
                  }, 2200);
                  
                  if (isFinal) {
                    if (silenceTimer) clearTimeout(silenceTimer);
                    setWakePulse(true);
                    setWakeListening(true);
                    setTimeout(() => { setWakePulse(false); setWakeListening(false); }, 1800);
                    
                    try { wakeSRRef.current?.stop(); } catch {}
                    sendPragati(command);
                    return;
                  }
                } else {
                  // Wake word only - trigger only when isFinal is true (meaning user paused after saying wake word)
                  if (isFinal) {
                    try { wakeSRRef.current?.stop(); } catch {}
                    
                    setWakePulse(true);
                    setWakeListening(true);
                    setTimeout(() => { setWakePulse(false); setWakeListening(false); }, 1800);
                    
                    pragatiSpeak("Hey! I'm here. What can I help you with?");
                    pragatiInputRef.current?.focus();
                    return;
                  }
                }
              }
            }
          }
        };

        sr.onend = () => {
          wakeSRRunning = false;
          if (active && !wakeBlockedRef.current && !wakePausedRef.current) {
            retryTimer = setTimeout(startWake, 300);
          }
        };

        sr.onerror = e => {
          wakeSRRunning = false;
          if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
            wakeBlockedRef.current = true;
            active = false;
            setMicBlocked(true);
            return;
          }
          if (active && !wakePausedRef.current) {
            clearTimeout(retryTimer);
            retryTimer = setTimeout(startWake, 1000);
          }
        };

        sr.start();
      } catch (err) {
        wakeSRRunning = false;
        if (active) {
          clearTimeout(retryTimer);
          retryTimer = setTimeout(startWake, 2000);
        }
      }
    }

    // Global custom event listeners to pause/resume wake word cleanly during other page activities (e.g. AI Interview prep)
    const handlePauseWake = () => {
      wakePausedRef.current = true;
      try { wakeSRRef.current?.abort(); } catch {}
    };
    const handleResumeWake = () => {
      wakeBlockedRef.current = false;
      setMicBlocked(false);
      wakePausedRef.current = false;
      startWake();
    };

    window.addEventListener('pragati-pause-wake-word', handlePauseWake);
    window.addEventListener('pragati-resume-wake-word', handleResumeWake);

    wakeRestartRef.current = () => { if (active && !wakeBlockedRef.current) startWake(); };
    return () => {
      active = false;
      clearTimeout(retryTimer);
      if (silenceTimer) clearTimeout(silenceTimer);
      try { wakeSRRef.current?.abort(); } catch {}
      window.removeEventListener('pragati-pause-wake-word', handlePauseWake);
      window.removeEventListener('pragati-resume-wake-word', handleResumeWake);
      wakeRestartRef.current = null;
    };
  // eslint-disable-next-line
  }, [pragatiVoice]);

  React.useEffect(() => {
    if (pragatiOpen) pragatiEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [pragatiMsgs, pragatiOpen]);

  // ── Dashboard Load Welcome Greeting — fires once per browser session ─────
  React.useEffect(() => {
    if (!user || window.pragatiWelcomeGreetingSpoken) return;
    
    const sessionKey = 'pragati_welcomed_session';
    if (sessionStorage.getItem(sessionKey)) {
      window.pragatiWelcomeGreetingSpoken = true;
      return;
    }
    
    window.pragatiWelcomeGreetingSpoken = true;
    sessionStorage.setItem(sessionKey, '1');
    
    const firstName = (user?.name || 'friend').split(' ')[0];
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const welcomeMsg = `${greeting}, ${firstName}! I'm Pragati, your AI placement companion. I'm here to help you ace your interviews, master DSA, and land your dream job. Just say Hey Pragati anytime, and I'll be right here!`;
    // Delay slightly to let browser voices load fully
    const timer = setTimeout(() => { pragatiSpeak(welcomeMsg); }, 2000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line
  }, [user]);

  async function sendPragati(textOverride) {
    const text = (textOverride !== undefined ? textOverride : pragatiInput).trim();
    if (!text || pragatiLoading) return;
    setPragatiInput('');
    const userMsg = { role:'user', text, ts: Date.now() };
    setPragatiMsgs(m => [...m, userMsg]);

    // ── Navigation command? ───────────────────────────────────────────────
    const navPath = checkNavCommand(text);
    if (navPath) {
      const label = navPath.split('/').pop() || 'dashboard';
      const reply = `Sure! Taking you to ${label.charAt(0).toUpperCase()+label.slice(1).replace(/-/g,' ')} now 🚀`;
      setPragatiMsgs(m => [...m, { role:'ai', text: reply, ts: Date.now() }]);
      pragatiSpeak(reply);
      // Keep panel open after navigation — user can dismiss it manually
      setTimeout(() => { nav(navPath); }, 800);
      return;
    }

    setPragatiLoading(true);
    setPragatiMsgs(m => [...m, { role:'ai', text:'', loading: true, ts: Date.now() }]);
    try {
      const userData = {
        name: user?.name, role: user?.role, email: user?.email,
        department: user?.department, year: user?.year,
        rollNumber: user?.rollNumber, streak: user?.streak,
        bio: user?.bio, linkedinUrl: user?.linkedinUrl, githubUrl: user?.githubUrl,
      };
      const chatHistory = pragatiMsgs.slice(-6).filter(m=>!m.loading).map(m=>`${m.role==='user'?'Student':'Pragati'}: ${m.text}`).join('\n');
      const response = await axios.post(`${API}/skillpath/pragati-assistant`, {
        message: text, userData, conversationHistory: chatHistory
      });
      const d = response.data;
      const reply = d.reply || 'I had a hiccup! Try again.';
      setPragatiMsgs(m => m.map((msg, i) => i === m.length-1 ? { role:'ai', text: reply, ts: Date.now() } : msg));

      // Process and execute Assistant Action
      let forceGender = null;
      let forceAccent = null;
      let forceToneAlt = false;

      if (d.action) {
        if (d.action.type === 'CHANGE_VOICE') {
          if (d.action.gender) {
            forceGender = d.action.gender;
            setVoiceGender(d.action.gender);
            localStorage.setItem('pragati_voice_gender', d.action.gender);
          }
          if (d.action.accent) {
            forceAccent = d.action.accent;
            saveAccent(d.action.accent);
          }
          if (d.action.cycle) {
            forceToneAlt = true;
            const nextG = voiceGender === 'male' ? 'female' : 'male';
            setVoiceGender(nextG);
            localStorage.setItem('pragati_voice_gender', nextG);
          }
        } else if (d.action.type === 'UPDATE_LEVEL') {
          if (user) user.skillLevel = d.action.level;
        } else if (d.action.type === 'NAVIGATE') {
          setTimeout(() => { nav(d.action.path); }, 1000);
        }
      }

      pragatiSpeak(reply, forceGender, forceAccent, forceToneAlt);
    } catch {
      const errMsg = 'Connection error. Check your network and try again.';
      setPragatiMsgs(m => m.map((msg,i) => i===m.length-1 ? { role:'ai', text: errMsg, ts: Date.now() } : msg));
    } finally { setPragatiLoading(false); }
  }

  function resetPragatiChat() {
    window.speechSynthesis?.cancel();
    setPragatiMsgs([{ role:'ai', text:"🔄 Chat reset! Fresh start. Ask me anything about placements, interviews, or DSA!", ts: Date.now() }]);
    setPragatiInput('');
    setPragatiLoading(false);
    setPragatiMicOn(false);
  }

  // In-chat mic toggle — with permission request + interim live preview
  async function togglePragatiMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setPragatiMsgs(m => [...m, { role: 'ai', text: '⚠️ Voice input is not supported in this browser. Please use Chrome or Edge, or type your question.', ts: Date.now() }]);
      return;
    }
    if (pragatiMicOn) {
      setPragatiMicOn(false);
      try { pragatiSRRef.current?.stop(); } catch {}
      return;
    }

    // Request mic permission explicitly so browser shows a clear prompt
    // We keep the stream briefly — releasing it immediately before SR starts can cause failure on some OS/browsers
    let permStream = null;
    try {
      permStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      wakeBlockedRef.current = false;
      setMicBlocked(false);
    } catch {
      setPragatiMsgs(m => [...m, { role: 'ai', text: '🎙️ Microphone access was denied. Please click the 🔒 icon in your browser address bar and allow microphone access, then try again.', ts: Date.now() }]);
      return;
    }

    // ── Pause wake word SR before starting in-chat SR ──────────────────
    // Set wakePausedRef BEFORE calling abort() so the wake SR's onend handler
    // sees the flag and does NOT schedule a startWake() restart.
    wakePausedRef.current = true;
    try { wakeSRRef.current?.abort(); } catch {}

    // Small delay to let the wake SR fully shut down before we start the new one
    await new Promise(r => setTimeout(r, 250));

    setPragatiMicOn(true);
    try {
      const sr = new SR();
      pragatiSRRef.current = sr;
      sr.continuous     = false;
      sr.interimResults = true;   // show live preview as user speaks
      sr.lang           = 'en-IN';
      sr.maxAlternatives = 1;

      sr.onresult = e => {
        let interim = '', final = '';
        for (let i = 0; i < e.results.length; i++) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript;
          else interim += e.results[i][0].transcript;
        }
        if (interim) setPragatiInput(interim);  // live preview
        if (final) {
          setPragatiInput(final);
          setPragatiMicOn(false);
          setTimeout(() => sendPragati(final), 300);
        }
      };
      sr.onerror = e => {
        setPragatiMicOn(false);
        wakePausedRef.current = false;
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          setMicBlocked(true);
          setPragatiMsgs(m => [...m, { role: 'ai', text: '🎙️ Microphone access was denied. Please click the 🔒 icon in your browser address bar → allow Microphone → then reload the page.', ts: Date.now() }]);
        } else if (e.error === 'network') {
          setPragatiMsgs(m => [...m, { role: 'ai', text: '🌐 Voice recognition needs an internet connection. Please check your network and try again.', ts: Date.now() }]);
        }
        // 'no-speech' is silently ignored — user just didn't speak
        setTimeout(() => wakeRestartRef.current?.(), 400);
      };
      sr.onend = () => {
        setPragatiMicOn(false);
        // Clear the pause flag and hand control back to the wake word listener
        wakePausedRef.current = false;
        setTimeout(() => wakeRestartRef.current?.(), 400);
      };
      sr.start();
      // Release the permission stream now that SR has taken over
      if (permStream) { permStream.getTracks().forEach(t => t.stop()); permStream = null; }
    } catch {
      setPragatiMicOn(false);
      wakePausedRef.current = false;
      if (permStream) { permStream.getTracks().forEach(t => t.stop()); }
      setTimeout(() => wakeRestartRef.current?.(), 400);
    }
  }

  const navItems = user?.role === 'admin' ? NAV_ADMIN : user?.role === 'faculty' ? NAV_FACULTY : NAV_STUDENT;

  function handleLogout() { logout(); nav('/'); }

  function toggleDark() {
    setDarkMode(d => {
      const next = !d;
      localStorage.setItem('pragati_dark', next ? '1' : '0');
      return next;
    });
  }

  async function handleDeleteAccount() {
    try { await fetch(`${API}/users/profile`, { method:'DELETE', headers:tk() }); } catch {}
    localStorage.removeItem('pragati_token');
    localStorage.removeItem('pragati_refresh');
    window.location.href = '/login';
  }

  useEffect(() => {
    function handle(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
      // Close notification dropdown when clicking outside
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const roleColor = {
    student: 'linear-gradient(135deg,#531697,#13a1a5)',
    faculty: 'linear-gradient(135deg,#042c5d,#531697)',
    admin:   'linear-gradient(135deg,#13a1a5,#47d372)',
  };
  const roleLabel = { student:'Student', faculty:'Faculty', admin:'Administrator' };

  const dm         = darkMode;
  const pageBg     = dm ? '#0f1623' : '#f4f6fb';
  const sidebarBg  = dm ? '#161d2e' : '#fff';
  const sidebarBrd = dm ? '#1e2d42' : '#e8edf5';
  const headerBg   = dm ? '#161d2e' : '#fff';
  const headerBrd  = dm ? '#1e2d42' : '#e8edf5';
  const dropBg     = dm ? '#1a2235' : '#fff';
  const dropBrd    = dm ? '#2d3a52' : '#e8edf5';
  const txt        = dm ? '#e2e8f0' : 'var(--text)';
  const sub        = dm ? '#94a3b8' : 'var(--text-3)';
  const hover      = dm ? '#2d3748' : '#f8f9fc';
  const inpBg      = dm ? '#2d3748' : '#fafbff';
  const inpBrd     = dm ? '#334155' : '#d0d7e8';

  // ── Edit Profile Modal ────────────────────────────────────────────────────
  function EditProfileModal({ enforce }) {
    const [form, setForm] = useState({
      name: user?.name||'', department: user?.department||'', year: user?.year||'',
      rollNumber: user?.rollNumber||'', phone: user?.phone||'', bio: user?.bio||'',
      linkedinUrl: user?.linkedinUrl||'', githubUrl: user?.githubUrl||'', portfolioUrl: user?.portfolioUrl||'',
    });
    const [pwdForm, setPwdForm] = useState({ currentPassword:'', newPassword:'' });
    const [photoFile, setPhotoFile]     = useState(null);
    const [photoPreview, setPhotoPreview] = useState(user?.profilePhoto||null);
    const [loading, setLoading]         = useState(false);
    const [pwdLoading, setPwdLoading]   = useState(false);
    const [msg, setMsg]                 = useState('');
    const [pwdMsg, setPwdMsg]           = useState('');
    const fileRef = useRef();

    const set = k => e => setForm(f=>({...f,[k]:e.target.value}));
    const setPwd = k => e => setPwdForm(f=>({...f,[k]:e.target.value}));
    const INP = { style:{ width:'100%', padding:'9px 12px', borderRadius:8, border:`1.5px solid ${inpBrd}`, fontFamily:"'Nunito',sans-serif", fontSize:'.875rem', outline:'none', background:inpBg, color:txt, boxSizing:'border-box' } };
    const LBL = ({ children, req }) => <label style={{ display:'block', fontSize:'.73rem', fontWeight:700, color:sub, marginBottom:4, fontFamily:"'Syne',sans-serif" }}>{children}{req && <span style={{ color:'#ef4444' }}> *</span>}</label>;

    function handlePhoto(e) {
      const f = e.target.files[0]; if(!f) return;
      setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f));
    }

    async function changePassword(e) {
      e.preventDefault(); setPwdLoading(true); setPwdMsg('');
      try {
        const r = await fetch(`${API}/users/change-password`, { method:'PUT', headers:{...tk(),'Content-Type':'application/json'}, body:JSON.stringify(pwdForm) });
        const d = await r.json();
        if(!r.ok) throw new Error(d.error||'Failed');
        setPwdMsg('✅ Password updated!');
        setPwdForm({ currentPassword:'', newPassword:'' });
      } catch(err){ setPwdMsg(`❌ ${err.message}`); }
      finally { setPwdLoading(false); }
    }

    async function save(e) {
      e.preventDefault(); setLoading(true); setMsg('');
      try {
        let profilePhoto;
        if (photoFile) {
          profilePhoto = await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(photoFile); });
        }
        const payload = { ...form, isProfileComplete: true, ...(profilePhoto?{profilePhoto}:{}) };
        const r = await fetch(`${API}/users/profile`, { method:'PUT', headers:{...tk(),'Content-Type':'application/json'}, body:JSON.stringify(payload) });
        const d = await r.json();
        if(!r.ok) throw new Error(d.error||'Failed');
        setMsg('✅ Profile updated!');
        if(setUser) setUser(d.user);
        if (!enforce) setTimeout(()=>setShowEditProfile(false), 1200);
      } catch(err){ setMsg(`❌ ${err.message}`); }
      finally { setLoading(false); }
    }

    return (
      <div className="modal-backdrop" onClick={()=>!enforce && setShowEditProfile(false)}>
        <div className="modal-content-responsive" style={{ maxWidth:560, maxHeight:'90vh', overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.1rem', color:txt }}>
              {enforce ? '🚨 Complete Your Profile' : '✏️ Edit Profile'}
            </div>
            {!enforce && <button onClick={()=>setShowEditProfile(false)} style={{ width:32, height:32, borderRadius:'50%', border:`1px solid ${inpBrd}`, background:inpBg, cursor:'pointer', fontWeight:800, color:sub, fontSize:'1rem' }}>×</button>}
          </div>
          <div style={{ textAlign:'center', marginBottom:18 }}>
            <div style={{ position:'relative', display:'inline-block' }}>
              {photoPreview
                ? <img src={photoPreview} alt="av" style={{ width:80, height:80, borderRadius:'50%', objectFit:'cover', border:'3px solid #531697' }} />
                : <div style={{ width:80, height:80, borderRadius:'50%', background:'linear-gradient(135deg,#531697,#13a1a5)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'2rem', color:'#fff', fontWeight:800 }}>{user?.name?.[0]?.toUpperCase()||'U'}</div>
              }
              <button onClick={()=>fileRef.current?.click()} style={{ position:'absolute', bottom:-4, right:-4, width:26, height:26, borderRadius:'50%', border:'2px solid #fff', background:'#531697', color:'#fff', fontSize:'.75rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>📷</button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display:'none' }} />
            <div style={{ marginTop:7, fontSize:'.72rem', color:sub }}>Click 📷 to upload profile photo</div>
            <div style={{ marginTop:2, fontSize:'.7rem', color:sub }}>{user?.email}</div>
            <span style={{ padding:'2px 10px', borderRadius:999, background:'rgba(83,22,151,.1)', color:'#531697', fontSize:'.7rem', fontWeight:700 }}>{user?.role?.toUpperCase()}</span>
          </div>
          <form onSubmit={save} style={{ marginBottom:24 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div style={{ gridColumn:'1/-1' }}><LBL req={enforce}>Full Name</LBL><input {...INP} value={form.name} onChange={set('name')} placeholder="Your full name" required={enforce} /></div>
              <div><LBL req={enforce}>Department</LBL><select {...INP} value={form.department} onChange={set('department')} required={enforce}><option value="">Select Dept</option>{['CSE','CSAIML','IT','ECE','Mechanical','Civil','Other'].map(d=><option key={d}>{d}</option>)}</select></div>
              {user?.role==='student'&&<div><LBL req={enforce}>Year</LBL><select {...INP} value={form.year} onChange={set('year')} required={enforce}><option value="">Select Year</option>{[1,2,3,4].map(y=><option key={y} value={y}>Year {y}</option>)}</select></div>}
              {user?.role==='student'&&<div><LBL req={enforce}>Roll Number</LBL><input {...INP} value={form.rollNumber} onChange={set('rollNumber')} placeholder="e.g. 22CS101" required={enforce} /></div>}
              <div><LBL req={enforce}>Phone</LBL><input {...INP} value={form.phone} onChange={set('phone')} placeholder="+91 XXXXXXXXXX" required={enforce} /></div>
              <div style={{ gridColumn:'1/-1' }}><LBL>Bio</LBL><textarea {...INP} style={{...INP.style,resize:'vertical',height:64}} value={form.bio} onChange={set('bio')} placeholder="A short bio…" /></div>
              <div style={{ gridColumn:'1/-1' }}><LBL>LinkedIn URL</LBL><input {...INP} type="url" value={form.linkedinUrl} onChange={set('linkedinUrl')} placeholder="https://linkedin.com/in/username" /></div>
              <div><LBL>GitHub URL</LBL><input {...INP} type="url" value={form.githubUrl} onChange={set('githubUrl')} placeholder="https://github.com/username" /></div>
              <div><LBL>Portfolio URL</LBL><input {...INP} type="url" value={form.portfolioUrl} onChange={set('portfolioUrl')} placeholder="https://yourportfolio.com" /></div>
            </div>
            {msg&&<div style={{ marginBottom:12, padding:'9px 14px', borderRadius:8, fontSize:'.83rem', fontWeight:600, background:msg.startsWith('✅')?'#dcfce7':'#fee2e2', color:msg.startsWith('✅')?'#166534':'#991b1b' }}>{msg}</div>}
            <button type="submit" disabled={loading} style={{ width:'100%', padding:'11px', borderRadius:10, border:'none', background:loading?'#d0d7e8':'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontWeight:800, fontSize:'.9rem', cursor:loading?'not-allowed':'pointer', fontFamily:"'Nunito',sans-serif" }}>
              {loading?'Saving…':'💾 Save Profile'}
            </button>
          </form>

          {!enforce && (
            <div style={{ paddingTop:20, borderTop:`1px solid ${inpBrd}` }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:'1rem', color:txt, marginBottom:12 }}>🔒 Change Password</div>
              <form onSubmit={changePassword}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:12, marginBottom:12 }}>
                  <div><LBL>Current Password</LBL><input {...INP} type="password" value={pwdForm.currentPassword} onChange={setPwd('currentPassword')} required /></div>
                  <div><LBL>New Password</LBL><input {...INP} type="password" value={pwdForm.newPassword} onChange={setPwd('newPassword')} required minLength={6} /></div>
                </div>
                {pwdMsg&&<div style={{ marginBottom:12, padding:'9px 14px', borderRadius:8, fontSize:'.83rem', fontWeight:600, background:pwdMsg.startsWith('✅')?'#dcfce7':'#fee2e2', color:pwdMsg.startsWith('✅')?'#166534':'#991b1b' }}>{pwdMsg}</div>}
                <button type="submit" disabled={pwdLoading} style={{ width:'100%', padding:'11px', borderRadius:10, border:'none', background:pwdLoading?'#d0d7e8':'#042c5d', color:'#fff', fontWeight:800, fontSize:'.9rem', cursor:pwdLoading?'not-allowed':'pointer', fontFamily:"'Nunito',sans-serif" }}>
                  {pwdLoading?'Updating...':'Update Password'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Delete Confirm Modal ──────────────────────────────────────────────────
  function DeleteModal() {
    const [confirmText, setConfirmText] = useState('');
    return (
      <div className="modal-backdrop" onClick={()=>setShowDeleteConfirm(false)}>
        <div className="modal-content-responsive" style={{ maxWidth:420 }} onClick={e=>e.stopPropagation()}>
          <div style={{ textAlign:'center', marginBottom:16 }}>
            <div style={{ fontSize:'3rem', marginBottom:8 }}>⚠️</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.2rem', color:'#ef4444' }}>Delete Account</div>
            <div style={{ fontSize:'.84rem', color:sub, marginTop:8, lineHeight:1.6 }}>This action is <strong style={{ color:txt }}>permanent</strong>. All your data, progress, and history will be erased. Type <strong style={{ color:'#ef4444' }}>DELETE</strong> to confirm.</div>
          </div>
          <input value={confirmText} onChange={e=>setConfirmText(e.target.value)} placeholder="Type DELETE to confirm"
            style={{ width:'100%', padding:'10px 14px', borderRadius:9, border:`1.5px solid ${inpBrd}`, fontFamily:"'Nunito',sans-serif", fontSize:'.9rem', outline:'none', background:inpBg, color:txt, boxSizing:'border-box', marginBottom:14, textAlign:'center' }} />
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={()=>setShowDeleteConfirm(false)} style={{ flex:1, padding:'11px', borderRadius:10, border:`1.5px solid ${inpBrd}`, background:'transparent', color:sub, fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif" }}>Cancel</button>
            <button onClick={()=>confirmText==='DELETE'&&handleDeleteAccount()} disabled={confirmText!=='DELETE'}
              style={{ flex:1, padding:'11px', borderRadius:10, border:'none', background:confirmText==='DELETE'?'#ef4444':'#d0d7e8', color:'#fff', fontWeight:800, cursor:confirmText==='DELETE'?'pointer':'not-allowed', fontFamily:"'Nunito',sans-serif" }}>
              🗑️ Delete Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const enforceProfile = user && user.isProfileComplete === false;

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:pageBg, fontFamily:"'Nunito',sans-serif" }}>
      <style>{`
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
        ${dm?`
          :root { --text: #f1f5f9; --text-2: #cbd5e1; --text-3: #94a3b8; --surface: #1a2235; --surface-2: #2d3748; }
          .card{background:#1a2235!important;border-color:#2d3a52!important;}
          body{background:#0f1623;color:#e2e8f0;}
        `:``}
      `}</style>

      {(showEditProfile || enforceProfile) && <EditProfileModal enforce={enforceProfile} />}
      {showDeleteConfirm && <DeleteModal />}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="pragati-sidebar" style={{
        width: open ? 256 : 64, transition:'width .22s cubic-bezier(.4,0,.2,1)',
        background:sidebarBg, borderRight:`1px solid ${sidebarBrd}`,
        display:'flex', flexDirection:'column',
        position:'sticky', top:0, height:'100vh',
        overflow:'hidden', flexShrink:0,
        boxShadow:'2px 0 12px rgba(4,44,93,0.06)',
      }}>
        <div style={{ padding:'16px 14px', borderBottom:`1px solid ${sidebarBrd}`, display:'flex', alignItems:'center', gap:10 }}>
          <img src="/logo.png" alt="PRAGATI" style={{ height:34, width:'auto', objectFit:'contain', flexShrink:0, maxWidth:120 }} />
          {open && (
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', background:'linear-gradient(135deg,#042c5d,#531697,#13a1a5)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', whiteSpace:'nowrap' }}>PRAGATI</div>
          )}
        </div>

        {open && user && (
          <div style={{ margin:'12px 12px 0', padding:'10px 12px', borderRadius:10, background:roleColor[user.role]||roleColor.student, color:'#fff' }}>
            <div style={{ fontSize:'.72rem', opacity:.8, fontWeight:700, letterSpacing:'.05em' }}>SIGNED IN AS</div>
            <div style={{ fontWeight:800, fontSize:'.82rem', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:170 }}>{user.name}</div>
            <div style={{ fontSize:'.72rem', opacity:.8 }}>{roleLabel[user.role]}</div>
          </div>
        )}

        <nav style={{ flex:1, padding:'12px 8px', overflowY:'auto' }}>
          {navItems.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to==='/dashboard'}
              style={({ isActive }) => ({
                display:'flex', alignItems:'center', gap:10,
                padding:'9px 12px', borderRadius:10, marginBottom:2,
                textDecoration:'none', fontWeight: isActive ? 700 : 600,
                fontSize:'.875rem', transition:'all .15s',
                background: n.badge && !open
                  ? 'linear-gradient(135deg,rgba(83,22,151,0.15),rgba(19,161,165,0.15))'
                  : isActive ? (dm?'rgba(83,22,151,0.2)':'linear-gradient(135deg,rgba(83,22,151,0.08),rgba(19,161,165,0.08))') : 'transparent',
                color: isActive ? '#531697' : (dm?'#94a3b8':'var(--text-2)'),
                borderLeft: isActive ? '3px solid #531697' : n.badge ? '3px solid #13a1a5' : '3px solid transparent',
              })}>
              <span style={{ fontSize:'1rem', flexShrink:0 }}>{n.icon}</span>
              {open && <><span style={{ flex:1 }}>{n.label}</span>{n.badge && <span style={{ padding:'1px 6px', borderRadius:999, background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontSize:'.55rem', fontWeight:800, letterSpacing:'.04em' }}>{n.badge}</span>}</>}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding:'10px 8px', borderTop:`1px solid ${sidebarBrd}` }}>
          <button onClick={handleLogout}
            style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10, border:'none', background:'transparent', cursor:'pointer', width:'100%', color:'#ef4444', fontSize:'.875rem', fontWeight:700, transition:'background .15s' }}
            onMouseOver={e=>e.currentTarget.style.background='rgba(239,68,68,0.1)'}
            onMouseOut={e=>e.currentTarget.style.background='transparent'}>
            <span style={{ flexShrink:0 }}>🚪</span>
            {open && 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>

        {/* Header — hidden on GD room so the call gets full screen */}
        {!isGDRoom && (
          <header className="pragati-header" style={{ height:58, background:headerBg, borderBottom:`1px solid ${headerBrd}`, display:'flex', alignItems:'center', padding:'0 24px', gap:12, position:'sticky', top:0, zIndex:10, boxShadow:'0 2px 8px rgba(4,44,93,0.05)', flexShrink:0 }}>
            <button onClick={()=>setOpen(o=>!o)} style={{ background:'none', border:'none', fontSize:'1.2rem', cursor:'pointer', color:dm?'#94a3b8':'var(--text-3)', padding:4, borderRadius:6 }}>☰</button>
            <div style={{ flex:1 }} />

            {/* Bell */}
            <div ref={notifRef} style={{ position:'relative' }}>
              <button onClick={()=>setShowNotif(n=>!n)}
                style={{ width:36, height:36, borderRadius:10, border:`1px solid ${headerBrd}`, background:dm?'rgba(255,255,255,0.06)':'rgba(4,44,93,0.04)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', position:'relative' }}
                title="Notifications">
                🔔
                {notifCount>0&&<span style={{ position:'absolute', top:-4, right:-4, width:18, height:18, borderRadius:'50%', background:'#ef4444', color:'#fff', fontSize:'.6rem', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid #fff' }}>{notifCount>9?'9+':notifCount}</span>}
              </button>
              {showNotif && (
                <div
                  className="notification-dropdown"
                  style={{
                    position: 'fixed', top: 62, right: 12,
                    width: 340,
                    background: dm ? '#0f1e30' : '#fff',
                    border: `1.5px solid ${dm ? '#1e3a5a' : '#e8edf5'}`,
                    borderRadius: 18,
                    boxShadow: dm
                      ? '0 16px 48px rgba(0,0,0,0.6), 0 2px 8px rgba(83,22,151,0.2)'
                      : '0 16px 48px rgba(4,44,93,0.18), 0 2px 8px rgba(83,22,151,0.1)',
                    zIndex: 9999,
                    overflow: 'hidden',
                    animation: 'notifSlideIn .2s cubic-bezier(.16,1,.3,1)',
                  }}
                >
                  <style>{`@keyframes notifSlideIn{from{opacity:0;transform:translateY(-12px) scale(.97)}to{opacity:1;transform:none}}`}</style>
                  {/* Header */}
                  <div style={{ padding:'14px 18px 10px', borderBottom:`1px solid ${dm?'#1e3a5a':'#f0f2f8'}`, display:'flex', justifyContent:'space-between', alignItems:'center', background: dm?'rgba(83,22,151,0.08)':'rgba(83,22,151,0.04)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:'1.1rem' }}>🔔</span>
                      <span style={{ fontWeight:800, fontSize:'.9rem', color:dm?'#f1f5f9':'#042c5d', fontFamily:"'Syne',sans-serif" }}>Notifications</span>
                      {notifCount > 0 && <span style={{ padding:'1px 7px', borderRadius:999, background:'#531697', color:'#fff', fontSize:'.6rem', fontWeight:800 }}>{notifCount}</span>}
                    </div>
                    <button onClick={()=>{ markAllRead(); setShowNotif(false); }}
                      style={{ fontSize:'.68rem', color:'#531697', fontWeight:700, background:'none', border:'none', cursor:'pointer', padding:'4px 8px', borderRadius:6, transition:'background .12s' }}
                      onMouseOver={e=>e.currentTarget.style.background='rgba(83,22,151,0.08)'}
                      onMouseOut={e=>e.currentTarget.style.background='none'}
                    >✓ Mark all read</button>
                  </div>
                  {/* List */}
                  <div style={{ maxHeight:380, overflowY:'auto' }}>
                    {notifList.filter(a => !readIds.has(String(a._id))).length > 0
                      ? notifList.filter(a => !readIds.has(String(a._id))).map((a,i)=>{
                          // Type-aware icon and nav link
                          const typeIcon = a.type === 'drive' ? '🗓️'
                            : a.type === 'discussion' ? '💬'
                            : a.type === 'message' ? '💌'
                            : '📢';
                          const typeColor = a.type === 'drive' ? 'linear-gradient(135deg,#0ea5e9,#0369a1)'
                            : a.type === 'discussion' ? 'linear-gradient(135deg,#10b981,#059669)'
                            : a.type === 'message' ? 'linear-gradient(135deg,#f59e0b,#d97706)'
                            : 'linear-gradient(135deg,#531697,#13a1a5)';
                          const navUrl = a.link || (a.type === 'drive' ? '/dashboard/drives' : a.type === 'discussion' || a.type === 'message' ? '/dashboard/discussions' : '/dashboard/announcements');
                          const isFacultyPost = ['faculty','admin'].includes(a.createdBy?.role);
                          return (
                          <div key={i}
                            onClick={() => { markNotifRead(a._id); nav(navUrl); setShowNotif(false); }}
                            style={{ padding:'12px 18px', borderBottom:`1px solid ${dm?'rgba(255,255,255,0.05)':'#f5f6fa'}`, display:'flex', gap:12, alignItems:'flex-start', cursor:'pointer', transition:'background .15s', position:'relative' }}
                            onMouseOver={e=>e.currentTarget.style.background=dm?'rgba(83,22,151,0.12)':'rgba(83,22,151,0.04)'}
                            onMouseOut={e=>e.currentTarget.style.background='transparent'}
                          >
                            <div style={{ width:36, height:36, borderRadius:'50%', background:typeColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.9rem', flexShrink:0 }}>
                              {typeIcon}
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:2, flexWrap:'wrap' }}>
                                <span style={{ fontWeight:700, fontSize:'.82rem', color:dm?'#f1f5f9':'#0f1a2e', lineHeight:1.3, flex:1 }}>{a.title}</span>
                                {a.priority === 'high' && <span style={{ padding:'1px 5px', borderRadius:4, background:'rgba(239,68,68,0.1)', color:'#ef4444', fontSize:'.55rem', fontWeight:800, flexShrink:0 }}>HIGH</span>}
                                {a.priority === 'urgent' && <span style={{ padding:'1px 5px', borderRadius:4, background:'rgba(239,68,68,0.2)', color:'#dc2626', fontSize:'.55rem', fontWeight:800, flexShrink:0 }}>URGENT</span>}
                              </div>
                              {a.message && <div style={{ fontSize:'.73rem', color:dm?'#94a3b8':'#7a8ba8', lineHeight:1.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.message}</div>}
                              <div style={{ fontSize:'.63rem', color:dm?'#4a5a72':'#b0bec9', marginTop:3, display:'flex', gap:6, alignItems:'center' }}>
                                <span>{new Date(a.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
                                {isFacultyPost && <span style={{ color:'#531697', fontWeight:700 }}>· {a.createdBy?.role}</span>}
                              </div>
                            </div>
                            <button onClick={(e)=>{ e.stopPropagation(); markNotifRead(a._id); }}
                              style={{ background:'none', border:'none', color:dm?'#4a5a72':'#c0cad8', cursor:'pointer', fontSize:'.85rem', flexShrink:0, padding:'2px 4px', borderRadius:4, transition:'color .12s' }}
                              onMouseOver={e=>e.currentTarget.style.color='#ef4444'}
                              onMouseOut={e=>e.currentTarget.style.color=dm?'#4a5a72':'#c0cad8'}
                            >✕</button>
                          </div>);
                        })
                      : (
                        <div style={{ padding:'32px 16px', textAlign:'center' }}>
                          <div style={{ fontSize:'2rem', marginBottom:8 }}>✅</div>
                          <div style={{ color:dm?'#64748b':'#b0bec9', fontSize:'.84rem', fontWeight:600 }}>All caught up!</div>
                          <div style={{ color:dm?'#4a5a72':'#c8d0dc', fontSize:'.74rem', marginTop:4 }}>No new notifications</div>
                        </div>
                      )
                    }
                  </div>
                </div>
              )}
            </div>

            {/* Dark mode */}
            <button className="pragati-header-darkmode" onClick={toggleDark} title={dm?'Light Mode':'Dark Mode'}
              style={{ background:dm?'rgba(255,255,255,0.08)':'rgba(4,44,93,0.06)', border:`1px solid ${headerBrd}`, borderRadius:8, padding:'5px 10px', cursor:'pointer', fontSize:'.85rem', display:'flex', alignItems:'center', gap:5 }}>
              <span>{dm?'☀️':'🌙'}</span>
              <span style={{ fontSize:'.72rem', fontWeight:700, color:dm?'#f8d76b':'#531697' }}>{dm?'Light':'Dark'}</span>
            </button>

            {/* Streak */}
            {user?.role === 'student' && (
              <div className="pragati-header-streak" style={{ display:'flex', alignItems:'center', gap:6, background:'linear-gradient(135deg,rgba(245,158,11,0.1),rgba(71,211,114,0.1))', padding:'5px 14px', borderRadius:999, border:'1px solid rgba(245,158,11,0.2)' }}>
                <span style={{ animation:'pulse 1.5s ease-in-out infinite', display:'inline-block' }}>🔥</span>
                <span style={{ fontSize:'.82rem', fontWeight:800, color:'#d97706' }}>{user.streak || 0}</span>
                <span style={{ fontSize:'.72rem', color:'#92400e', fontWeight:600 }}>day streak</span>
              </div>
            )}

            {/* Profile dropdown */}
            <div ref={dropRef} style={{ position:'relative' }}>
              <button onClick={()=>setDropOpen(o=>!o)} style={{
                width:38, height:38, borderRadius:'50%',
                background: user?.profilePhoto?'transparent':(roleColor[user?.role]||roleColor.student),
                display:'flex', alignItems:'center', justifyContent:'center',
                border: dropOpen ? '2.5px solid #531697' : `2px solid ${headerBrd}`,
                cursor:'pointer', boxShadow:'0 2px 10px rgba(83,22,151,0.2)',
                overflow:'hidden', padding:0, transition:'border .15s',
              }}>
                {user?.profilePhoto
                  ? <img src={user.profilePhoto} alt="av" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : <span style={{ color:'#fff', fontWeight:800, fontSize:'.95rem' }}>{user?.name?.[0]?.toUpperCase()}</span>
                }
              </button>

              {dropOpen && (
                <div style={{ position:'absolute', top:'calc(100% + 10px)', right:0, width:248, background:dropBg, borderRadius:14, boxShadow:'0 8px 40px rgba(4,44,93,0.18)', border:`1px solid ${dropBrd}`, zIndex:1000, overflow:'hidden' }}>
                  <div style={{ padding:'13px 16px', borderBottom:`1px solid ${dropBrd}`, display:'flex', gap:10, alignItems:'center' }}>
                    <div style={{ width:40, height:40, borderRadius:'50%', background:roleColor[user?.role]||roleColor.student, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.95rem', color:'#fff', fontWeight:800, overflow:'hidden', flexShrink:0 }}>
                      {user?.profilePhoto ? <img src={user.profilePhoto} alt="av" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : user?.name?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontWeight:800, fontSize:'.85rem', color:txt, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.name}</div>
                      <div style={{ fontSize:'.68rem', color:sub, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.email}</div>
                      {user?.department && <div style={{ fontSize:'.65rem', color:sub }}>{user.department}{user.year?` · Year ${user.year}`:''}{user.rollNumber?` · ${user.rollNumber}`:''}</div>}
                    </div>
                  </div>

                  <button onClick={()=>{setShowEditProfile(true);setDropOpen(false);}}
                    style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', fontFamily:"'Nunito',sans-serif", transition:'background .12s' }}
                    onMouseOver={e=>e.currentTarget.style.background=hover} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                    <span style={{ fontSize:'1rem', width:22, textAlign:'center' }}>✏️</span>
                    <span style={{ fontSize:'.83rem', fontWeight:600, color:txt }}>Edit Profile</span>
                  </button>

                  <button onClick={()=>{setShowEditProfile(true);setDropOpen(false);}}
                    style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', fontFamily:"'Nunito',sans-serif", transition:'background .12s' }}
                    onMouseOver={e=>e.currentTarget.style.background=hover} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                    <span style={{ fontSize:'1rem', width:22, textAlign:'center' }}>📷</span>
                    <span style={{ fontSize:'.83rem', fontWeight:600, color:txt }}>Upload Photo</span>
                  </button>

                  <button onClick={toggleDark}
                    style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', fontFamily:"'Nunito',sans-serif", transition:'background .12s' }}
                    onMouseOver={e=>e.currentTarget.style.background=hover} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                    <span style={{ fontSize:'1rem', width:22, textAlign:'center' }}>{dm?'☀️':'🌙'}</span>
                    <span style={{ flex:1, fontSize:'.83rem', fontWeight:600, color:txt }}>{dm?'Light Mode':'Dark Mode'}</span>
                    <div style={{ width:34, height:18, borderRadius:999, background:dm?'#531697':'#d0d7e8', position:'relative', flexShrink:0 }}>
                      <div style={{ position:'absolute', top:2, left:dm?18:2, width:14, height:14, borderRadius:'50%', background:'#fff', transition:'left .2s' }} />
                    </div>
                  </button>

                  {/* Voice Accent Selector */}
                  <div style={{ borderTop: `1px solid ${dropBrd}`, padding: '11px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: '1rem', width: 22, textAlign: 'center' }}>🗣️</span>
                      <span style={{ fontSize: '.83rem', fontWeight: 600, color: txt }}>Voice Accent</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {['indian', 'foreign', 'default'].map(acc => (
                        <button
                          key={acc}
                          onClick={() => saveAccent(acc)}
                          style={{
                            flex: 1,
                            padding: '6px 0',
                            borderRadius: 6,
                            border: voiceAccent === acc ? '1.5px solid #531697' : `1.5px solid ${inpBrd}`,
                            background: voiceAccent === acc ? 'rgba(83,22,151,0.08)' : 'transparent',
                            color: voiceAccent === acc ? '#531697' : sub,
                            fontSize: '.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                            fontFamily: "'Nunito',sans-serif",
                            transition: 'all .12s',
                          }}>
                          {acc}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Voice Gender Selector */}
                  <div style={{ borderTop: `1px solid ${dropBrd}`, padding: '11px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: '1rem', width: 22, textAlign: 'center' }}>👥</span>
                      <span style={{ fontSize: '.83rem', fontWeight: 600, color: txt }}>Voice Gender</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {['female', 'male'].map(g => (
                        <button
                          key={g}
                          onClick={() => {
                            setVoiceGender(g);
                            localStorage.setItem('pragati_voice_gender', g);
                          }}
                          style={{
                            flex: 1,
                            padding: '6px 0',
                            borderRadius: 6,
                            border: voiceGender === g ? '1.5px solid #531697' : `1.5px solid ${inpBrd}`,
                            background: voiceGender === g ? 'rgba(83,22,151,0.08)' : 'transparent',
                            color: voiceGender === g ? '#531697' : sub,
                            fontSize: '.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                            fontFamily: "'Nunito',sans-serif",
                            transition: 'all .12s',
                          }}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ borderTop:`1px solid ${dropBrd}` }}>
                    <button onClick={()=>{setShowDeleteConfirm(true);setDropOpen(false);}}
                      style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', fontFamily:"'Nunito',sans-serif", transition:'background .12s' }}
                      onMouseOver={e=>e.currentTarget.style.background='rgba(239,68,68,0.07)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                      <span style={{ fontSize:'1rem', width:22, textAlign:'center' }}>🗑️</span>
                      <span style={{ fontSize:'.83rem', fontWeight:600, color:'#ef4444' }}>Delete Account</span>
                    </button>
                    <button onClick={handleLogout}
                      style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', fontFamily:"'Nunito',sans-serif", transition:'background .12s' }}
                      onMouseOver={e=>e.currentTarget.style.background='rgba(239,68,68,0.07)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                      <span style={{ fontSize:'1rem', width:22, textAlign:'center' }}>🚪</span>
                      <span style={{ fontSize:'.83rem', fontWeight:600, color:'#ef4444' }}>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </header>
        )}

        {/*
          ── Page content ─────────────────────────────────────────────────
          GD Room/Report: zero padding, full height, no maxWidth constraint
          Everything else: normal dashboard padding + maxWidth
        */}
        <main className={`pragati-main-content ${isGDRoom ? 'gd-room' : ''}`} style={{
          flex: 1,
          ...(isGDRoom
            ? { padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }
            : { padding: '24px 28px 100px', overflowY: 'auto', maxWidth: '100%', width: '100%' }
          ),
        }}>
          <Outlet context={{ darkMode: dm }} />
        </main>

      </div>
      {/* ── Hey Pragati Floating Assistant ─────────────────────────── */}
      <>
        {/* Wake word indicator ring */}
        {wakePulse && (
          <div style={{ position:'fixed', bottom:92, right:28, width:56, height:56, borderRadius:'50%', border:'3px solid #531697', animation:'pragatiWake .6s ease-out forwards', pointerEvents:'none', zIndex:9999 }} />
        )}

        {/* Floating button */}
        <button
          className="pragati-fab"
          onClick={() => setPragatiOpen(o => !o)}
          title={micBlocked ? 'Mic permission blocked — click to open and see instructions' : 'Hey PRAGATI — your AI companion (say "Hey PRAGATI" to wake)'}
          style={{
            position:'fixed', bottom:28, right:28, width:58, height:58,
            borderRadius:'50%', border:'none', zIndex:9998, cursor:'pointer',
            background: micBlocked
              ? 'linear-gradient(135deg,#b91c1c,#ef4444)'
              : 'linear-gradient(135deg,#042c5d,#531697,#13a1a5)',
            boxShadow: pragatiOpen
              ? '0 0 0 4px rgba(83,22,151,0.3), 0 8px 32px rgba(83,22,151,0.5)'
              : '0 4px 20px rgba(83,22,151,0.4)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'1.5rem', transition:'all .25s',
            animation: !pragatiOpen ? 'pragatiFloat 3s ease-in-out infinite' : 'none',
          }}>
          {pragatiOpen ? '✕' : micBlocked ? '🚫' : '✨'}
        </button>

        {/* Assistant Panel */}
        {pragatiOpen && (
          <div className="pragati-panel" style={{
            position:'fixed', bottom:96, right:24, width:380, height:520,
            background: dm ? '#161d2e' : '#fff',
            borderRadius:20, zIndex:9997, display:'flex', flexDirection:'column',
            boxShadow:'0 20px 80px rgba(4,44,93,0.25)',
            border: dm ? '1px solid #2d3a52' : '1px solid #e8edf5',
            overflow:'hidden', fontFamily:"'Nunito',sans-serif",
          }}>
            {/* Header */}
            <div style={{ background:'linear-gradient(135deg,#042c5d,#531697,#13a1a5)', padding:'14px 18px', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
              <div style={{ width:40, height:40, borderRadius:'50%', background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.3rem', flexShrink:0, border:'2px solid rgba(255,255,255,0.3)' }}>✨</div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'.95rem', color:'#fff' }}>Hey PRAGATI!</div>
                <div style={{ fontSize:'.68rem', color:'#fff', marginTop:1, display:'flex', alignItems:'center', gap:5 }}>
                  {micBlocked ? (
                    <span style={{ color:'rgba(255,255,255,0.7)' }}>🚫 Mic blocked — see instructions below</span>
                  ) : ttsLoading ? (
                    <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontWeight:700, animation:'pulse 1.2s infinite' }}>
                      ⏳ Generating ElevenLabs voice...
                    </span>
                  ) : ttsSpeaking ? (
                    <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontWeight:700, color:'#47d372' }}>
                      🔊 Speaking...
                      <span style={{ width:6, height:6, borderRadius:'50%', background:'#47d372', display:'inline-block', animation:'pragatiPing 1s infinite' }} />
                    </span>
                  ) : (
                    <span style={{ color:'rgba(255,255,255,0.7)' }}>Your AI placement companion</span>
                  )}
                </div>
              </div>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                {/* Voice On/Off toggle */}
                <button
                  onClick={() => { const next=!pragatiVoice; setPragatiVoice(next); if(!next)window.speechSynthesis?.cancel(); }}
                  title={pragatiVoice?'Voice ON — click to mute':'Voice OFF — click to enable'}
                  style={{ padding:'4px 8px', borderRadius:7, border:'1px solid rgba(255,255,255,0.25)', background: pragatiVoice?'rgba(71,211,114,0.25)':'rgba(255,255,255,0.08)', color:'#fff', cursor:'pointer', fontSize:'.7rem', fontWeight:700, fontFamily:"'Nunito',sans-serif" }}>
                  {pragatiVoice ? '🔊' : '🔇'}
                </button>
                {/* Voice Gender selector */}
                {pragatiVoice && (
                  <button
                    onClick={() => {
                      const next = voiceGender === 'female' ? 'male' : 'female';
                      setVoiceGender(next);
                      localStorage.setItem('pragati_voice_gender', next);
                    }}
                    title={`Current voice: ${voiceGender === 'female' ? 'Female' : 'Male'} — click to switch`}
                    style={{ padding:'4px 8px', borderRadius:7, border:'1px solid rgba(255,255,255,0.25)', background:'rgba(255,255,255,0.08)', color:'#fff', cursor:'pointer', fontSize:'.7rem', fontWeight:700, fontFamily:"'Nunito',sans-serif" }}>
                    {voiceGender === 'female' ? '👩' : '👨'}
                  </button>
                )}
                {/* Refresh / Restart */}
                <button
                  onClick={resetPragatiChat}
                  title='Restart chat'
                  style={{ padding:'4px 8px', borderRadius:7, border:'1px solid rgba(255,255,255,0.25)', background:'rgba(255,255,255,0.08)', color:'#fff', cursor:'pointer', fontSize:'.7rem', fontWeight:700, fontFamily:"'Nunito',sans-serif" }}>
                  🔄
                </button>
                <div style={{ width:6, height:6, borderRadius:'50%', background: micBlocked ? '#ef4444' : '#47d372', animation:'pragatiPing 1.5s ease-in-out infinite' }} />
              </div>
            </div>

            {/* Mic blocked warning banner */}
            {micBlocked && (
              <div style={{ background:'rgba(239,68,68,0.1)', borderBottom:'1px solid rgba(239,68,68,0.2)', padding:'8px 14px', fontSize:'.72rem', color:'#ef4444', fontWeight:700, flexShrink:0, display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:'1rem' }}>🚫</span>
                <span>
                  Mic blocked by browser.
                  <strong> Click the 🔒 icon</strong> in the address bar → <strong>Allow Microphone</strong> → reload.
                </span>
                <button onClick={() => setMicBlocked(false)} style={{ marginLeft:'auto', background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:'.8rem', fontWeight:900 }}>✕</button>
              </div>
            )}

            {/* Quick suggestions */}
            <div style={{ padding:'8px 12px', borderBottom: dm ? '1px solid #2d3a52' : '1px solid #f0f3fa', background: dm ? '#1a2235' : '#f8f9fc', display:'flex', gap:6, overflowX:'auto', flexShrink:0 }}>
              {['Resume tips', 'Interview prep', 'Open AI Interview', 'Take me to Aptitude', 'TCS placement tips'].map(s => (
                <button key={s} onClick={() => sendPragati(s)} style={{ padding:'4px 10px', borderRadius:999, border:'1px solid rgba(83,22,151,0.2)', background:'rgba(83,22,151,0.07)', color:'#531697', fontSize:'.65rem', fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0, fontFamily:"'Nunito',sans-serif" }}>
                  {s}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div style={{ flex:1, overflowY:'auto', padding:'14px 14px 4px' }}>
              {pragatiMsgs.map((m, i) => (
                <div key={i} style={{ display:'flex', justifyContent: m.role==='user' ? 'flex-end' : 'flex-start', marginBottom:10 }}>
                  {m.role==='ai' && (
                    <div style={{ width:26, height:26, borderRadius:'50%', background:'linear-gradient(135deg,#531697,#13a1a5)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.75rem', flexShrink:0, marginRight:8, alignSelf:'flex-end' }}>✨</div>
                  )}
                  <div style={{
                    maxWidth:'80%', padding:'9px 13px', fontSize:'.82rem', lineHeight:1.65,
                    borderRadius: m.role==='user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: m.role==='user'
                      ? 'linear-gradient(135deg,#531697,#13a1a5)'
                      : (dm ? '#1a2235' : '#f0f3fa'),
                    color: m.role==='user' ? '#fff' : (dm ? '#e2e8f0' : 'var(--text)'),
                    border: m.role==='ai' ? (dm ? '1px solid #2d3a52' : '1px solid #e8edf5') : 'none',
                    whiteSpace:'pre-wrap', fontFamily:"'Nunito',sans-serif",
                  }}>
                    {m.loading ? <span style={{ opacity:.4, animation:'blink .8s ease-in-out infinite' }}>▋</span> : m.text}
                  </div>
                </div>
              ))}
              <div ref={pragatiEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding:'10px 12px', borderTop: dm ? '1px solid #2d3a52' : '1px solid #e8edf5', background: dm ? '#161d2e' : '#fff', flexShrink:0 }}>
              <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
                <input
                  ref={pragatiInputRef}
                  value={pragatiInput}
                  onChange={e => setPragatiInput(e.target.value)}
                  onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendPragati(); } }}
                  placeholder={pragatiMicOn ? '🔴 Listening…' : 'Ask anything or say "Take me to…"'}
                  disabled={pragatiLoading}
                  style={{ flex:1, padding:'9px 13px', borderRadius:10, border: dm ? '1.5px solid #2d3a52' : `1.5px solid ${pragatiMicOn?'#ef4444':'#d0d7e8'}`, fontFamily:"'Nunito',sans-serif", fontSize:'.84rem', outline:'none', background: dm ? '#1a2235' : '#f8f9fc', color: dm ? '#e2e8f0' : 'var(--text)', transition:'border-color .2s' }}
                />
                {/* Mic button — only shown when voice is enabled */}
                {pragatiVoice && (window.SpeechRecognition||window.webkitSpeechRecognition) && (
                  <button
                    onClick={togglePragatiMic}
                    title={pragatiMicOn ? 'Stop listening' : 'Speak to PRAGATI'}
                    style={{ width:36, height:36, borderRadius:'50%', border:'none', background: pragatiMicOn ? 'linear-gradient(135deg,#ef4444,#b91c1c)' : 'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.95rem', flexShrink:0, boxShadow: pragatiMicOn?'0 0 0 5px rgba(239,68,68,0.2)':'none', animation: pragatiMicOn?'blink .7s ease-in-out infinite':'none' }}>
                    {pragatiMicOn ? '⏹' : '🎙️'}
                  </button>
                )}
                <button
                  onClick={() => sendPragati()}
                  disabled={!pragatiInput.trim() || pragatiLoading}
                  style={{ width:38, height:38, borderRadius:10, border:'none', background: !pragatiInput.trim() || pragatiLoading ? '#e8edf5' : 'linear-gradient(135deg,#531697,#13a1a5)', color: !pragatiInput.trim() ? '#b0bec9' : '#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem', flexShrink:0 }}>
                  {pragatiLoading ? '…' : '↑'}
                </button>
              </div>
              <div style={{ marginTop:5, fontSize:'.6rem', color: dm ? '#475569' : '#b0bec9', textAlign:'center' }}>
                Say <strong>"Hey PRAGATI"</strong> to wake · <strong>"Take me to [page]"</strong> to navigate · Powered by Groq AI
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes pragatiFloat { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-6px) scale(1.04)} }
          @keyframes pragatiWake  { 0%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(2.5)} }
          @keyframes pragatiPing  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.3)} }
          @keyframes blink        { 0%,100%{opacity:1} 50%{opacity:.2} }
        `}</style>

      {/* ── Mobile Bottom Navigation ── */}
      <MobileBottomNav role={user?.role} dm={dm} />

      {/* Real-time Group Discussion Toast Notifications */}
      <div style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'none'
      }}>
        {gdNotifications.map(n => (
          <div key={n.id} style={{
            background: dm ? '#1e293b' : '#ffffff',
            borderRadius: 14,
            padding: '16px 20px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
            border: dm ? '1.5px solid rgba(255,255,255,0.08)' : '1.5px solid rgba(83,22,151,0.12)',
            maxWidth: 340,
            pointerEvents: 'auto',
            animation: 'gdToastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            fontFamily: "'Nunito', sans-serif"
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontWeight: 800, fontSize: '.88rem', color: '#13a1a5', display: 'flex', alignItems: 'center', gap: 6 }}>
                🎤 Live GD Session
              </span>
              <button
                onClick={() => setGdNotifications(x => x.filter(i => i.id !== n.id))}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem', padding: 0 }}
              >
                ✕
              </button>
            </div>
            <div style={{ fontSize: '.82rem', color: dm ? '#cbd5e1' : '#334155', lineHeight: 1.4, marginBottom: 12 }}>
              {n.message}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => {
                  setGdNotifications(x => x.filter(i => i.id !== n.id));
                  nav(`/dashboard/gd/${n.roomCode}`);
                }}
                style={{
                  flex: 1,
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg,#531697,#13a1a5)',
                  color: '#fff',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontSize: '.78rem',
                  fontFamily: "'Nunito', sans-serif",
                  boxShadow: '0 4px 12px rgba(19, 161, 165, 0.25)'
                }}
              >
                Join Discussion →
              </button>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes gdToastSlideIn {
          from { transform: translateX(50px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
    </div>
  );
}

// ── Mobile bottom navigation bar ─────────────────────────────────────────────
function MobileBottomNav({ role, dm }) {
  const location = useLocation();
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const links = role === 'admin' ? NAV_ADMIN : role === 'faculty' ? NAV_FACULTY : NAV_STUDENT;

  // Tripled links array to enable infinite looping buffer sets (0 = left, 1 = middle, 2 = right)
  const tripledLinks = React.useMemo(() => {
    return [
      ...links.map(l => ({ ...l, set: 0 })),
      ...links.map(l => ({ ...l, set: 1 })),
      ...links.map(l => ({ ...l, set: 2 }))
    ];
  }, [links]);

  // Center the active menu item perfectly upon path change
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const timer = setTimeout(() => {
      // Find the active element in the middle set (set 1)
      const activeEls = el.querySelectorAll('.pragati-bottom-nav-item.active-center');
      let targetEl = null;
      
      activeEls.forEach(el => {
        if (el.getAttribute('data-set') === '1') targetEl = el;
      });
      
      if (!targetEl && activeEls.length > 0) targetEl = activeEls[0];

      if (targetEl) {
        const targetScrollLeft = targetEl.offsetLeft - (el.clientWidth / 2) + (targetEl.clientWidth / 2);
        el.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [location.pathname, links]);

  // Handle loop boundaries for infinite scroll feel
  const handleScroll = (e) => {
    const el = e.target;
    const singleSetWidth = el.scrollWidth / 3;
    const buffer = el.clientWidth / 2;

    if (el.scrollLeft >= (singleSetWidth * 2) - buffer) {
      el.style.scrollBehavior = 'auto';
      el.scrollLeft -= singleSetWidth;
      el.style.scrollBehavior = 'smooth';
    } else if (el.scrollLeft < singleSetWidth - buffer) {
      el.style.scrollBehavior = 'auto';
      el.scrollLeft += singleSetWidth;
      el.style.scrollBehavior = 'smooth';
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const initialTimer = setTimeout(() => {
      const singleSetWidth = el.scrollWidth / 3;
      el.style.scrollBehavior = 'auto';
      el.scrollLeft = singleSetWidth;
      el.style.scrollBehavior = 'smooth';
    }, 50);
    return () => clearTimeout(initialTimer);
  }, [links]);

  return (
    <div className={`pragati-bottom-nav-wrapper${dm ? ' dark' : ''}`}>
      <div className="bottom-nav-curve-bg">
        <div className="bottom-nav-cutout" />
      </div>

      <nav
        ref={containerRef}
        className="pragati-bottom-nav-scroll"
        onScroll={handleScroll}
      >
        {tripledLinks.map((l, idx) => {
          const isHomeActive = l.to === '/dashboard' && (location.pathname === '/dashboard' || location.pathname === '/dashboard/');
          const isProblemsActive = l.to === '/dashboard/problems' && location.pathname.startsWith('/dashboard/practice');
          const isPathActive = isHomeActive || isProblemsActive || (l.to !== '/dashboard' && location.pathname.startsWith(l.to));
          
          return (
            <NavLink
              key={`${l.to}-${l.set}-${idx}`}
              to={l.to}
              end={l.to === '/dashboard'}
              data-set={l.set}
              onClick={(e) => {
                e.preventDefault();
                navigate(l.to);
              }}
              className={`pragati-bottom-nav-item${isPathActive ? ' active-center' : ''}`}
            >
              <div className="nav-item-icon-wrapper">
                <span className="nav-item-icon">{l.icon}</span>
              </div>
              <span className="nav-item-label">{l.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}