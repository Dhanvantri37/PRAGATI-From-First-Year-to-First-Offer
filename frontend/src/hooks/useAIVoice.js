import { useState, useRef, useCallback, useEffect } from 'react';
import { getNaturalVoice } from '../utils/voiceHelper';

/**
 * useAIVoice — Upgraded
 * Features:
 *  1. accent prop ('indian' | 'foreign' | 'default')
 *  2. voiceRole prop ('moderator' | 'participant' | 'companion')
 *  3. Dynamically selects male/female natural browser voices
 *  4. Exposes isPlaying state so UI can render the Interrupt option
 *  5. Chrome autoplay-safe AudioContext unlock
 */

export function useAIVoice({ enabled = true, accent = 'indian', role = 'companion' } = {}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const queueRef    = useRef([]);
  const playingRef  = useRef(false);
  const audioCtxRef = useRef(null);
  const enabledRef  = useRef(enabled);
  const accentRef   = useRef(accent);
  const roleRef     = useRef(role);

  useEffect(() => { enabledRef.current  = enabled; },  [enabled]);
  useEffect(() => { accentRef.current   = accent;  },  [accent]);
  useEffect(() => { roleRef.current     = role;    },  [role]);

  // ── Unlock AudioContext on first user gesture (autoplay policy) ──────────
  useEffect(() => {
    function unlock() {
      if (audioCtxRef.current) return;
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf; src.connect(ctx.destination); src.start(0);
        audioCtxRef.current = ctx;
      } catch {}
    }
    ['click','keydown','touchstart'].forEach(e =>
      document.addEventListener(e, unlock, { once: true })
    );
    return () => ['click','keydown','touchstart'].forEach(e =>
      document.removeEventListener(e, unlock)
    );
  }, []);

  // ── Queue processor ──────────────────────────────────────────────────────
  const processQueue = useRef(null);
  processQueue.current = () => {
    if (playingRef.current || queueRef.current.length === 0) return;
    if (!enabledRef.current) { queueRef.current = []; setIsPlaying(false); return; }

    const item = queueRef.current.shift();
    playingRef.current = true;
    setIsPlaying(true);

    const onDone = () => {
      playingRef.current = false;
      setIsPlaying(false);
      setTimeout(() => processQueue.current?.(), 180);
    };

    if (item.audioBase64) {
      tryPlayBase64(item.audioBase64, item.text, accentRef.current, roleRef.current, onDone, item.speakerName);
    } else {
      speakWebSpeech(item.text, accentRef.current, roleRef.current, onDone, item.speakerName);
    }
  };

  const enqueue = useCallback((audioBase64, text, speakerName) => {
    if (!text?.trim()) return;
    queueRef.current.push({ audioBase64: audioBase64 || null, text, speakerName: speakerName || null });
    processQueue.current?.();
  }, []);

  const playAudio = useCallback((audioBase64, text, speakerName) => enqueue(audioBase64, text, speakerName), [enqueue]);
  const playText  = useCallback((text, speakerName)              => enqueue(null, text, speakerName),         [enqueue]);

  const stopAll = useCallback(() => {
    queueRef.current  = [];
    playingRef.current = false;
    setIsPlaying(false);
    window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  return { playAudio, playText, stopAll, isPlaying };
}

// ── Play base64 mp3 via AudioContext ─────────────────────────────────────────
function tryPlayBase64(base64, text, accent, role, onDone, speakerName) {
  try {
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const blob  = new Blob([bytes], { type: 'audio/mp3' });
    const url   = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => { URL.revokeObjectURL(url); onDone(); };
    audio.onerror = () => { URL.revokeObjectURL(url); speakWebSpeech(text, accent, role, onDone, speakerName); };
    const p = audio.play();
    if (p?.catch) p.catch(() => { URL.revokeObjectURL(url); speakWebSpeech(text, accent, role, onDone, speakerName); });
  } catch {
    speakWebSpeech(text, accent, role, onDone, speakerName);
  }
}

// ── Voice role mapping helper ───────────────────────────────────────────────
function getVoiceRole(role, speakerName) {
  let gender = localStorage.getItem('pragati_voice_gender') || 'female';
  const name = (speakerName || '').toLowerCase();

  const maleNames = ['arjun', 'vikram', 'rahul', 'amit', 'ravi', 'karan', 'rohit', 'siddharth', 'aditya', 'deepak', 'rajesh', 'manish', 'saurabh', 'anuj', 'prabhat', 'madhur', 'fritz', 'angelo', 'atlas', 'briggs', 'guru'];
  const femaleNames = ['priya', 'ananya', 'sneha', 'pooja', 'shreya', 'neha', 'divya', 'sapana', 'megha', 'radhika', 'swati', 'tanvi', 'neerja', 'heera', 'sonia', 'celeste', 'aria', 'diya'];

  if (maleNames.some(m => name.includes(m))) {
    gender = 'male';
  } else if (femaleNames.some(f => name.includes(f))) {
    gender = 'female';
  }

  if (role === 'moderator') {
    return gender === 'male' ? 'moderator_male' : 'moderator_female';
  }

  if (role === 'participant') {
    if (gender === 'female') {
      if (name.includes('diya') || name.includes('ananya') || name.includes('celeste')) {
        return 'candidate_female_2';
      }
      return 'candidate_female_1';
    } else {
      if (name.includes('guru') || name.includes('vikram') || name.includes('rahul')) {
        return 'candidate_male_2';
      }
      return 'candidate_male_1';
    }
  }

  return gender === 'male' ? 'system_male' : 'system_female';
}

// ── Web Speech — Natural/Neural voice picker integration ─────────────────────
const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export async function speakWebSpeech(text, accent = 'indian', role = 'companion', onDone, speakerName) {
  if (!text?.trim()) { onDone?.(); return; }

  // Clean the text
  const cleanText = text
    .replace(/\*\*(.*?)\*\"/g, '$1')
    .replace(/\*(.*?)\*/g,    '$1')
    .replace(/#{1,6} /g,      '')
    .replace(/[\[\]()]/g,     '')
    .substring(0, 500);

  // 1. Try Backend premium neural TTS (ElevenLabs / Edge-TTS)
  try {
    const backendRole = getVoiceRole(role, speakerName);
    const token = localStorage.getItem('pragati_token') || localStorage.getItem('token');
    const response = await fetch(`${API}/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({ text: cleanText, role: backendRole })
    });

    if (response.ok) {
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      window.pragatiAudioPlayer = audio;
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        onDone?.();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        speakLocalBrowserFallback(cleanText, accent, role, onDone, speakerName);
      };
      await audio.play();
      return;
    }
  } catch (err) {
    console.warn('[useAIVoice] Backend TTS failed, using local browser fallback:', err.message);
  }

  speakLocalBrowserFallback(cleanText, accent, role, onDone, speakerName);
}

// ── Local browser speech synthesis fallback ──────────────────────────────────
function speakLocalBrowserFallback(text, accent, role, onDone, speakerName) {
  if (!window.speechSynthesis) { onDone?.(); return; }
  // Do NOT cancel active speech synthesis here — queue processes items sequentially.

  const chunks = chunkText(text, 200);
  let idx = 0;

  // Determine speaker gender, pitch, and rate per persona
  let gender = localStorage.getItem('pragati_voice_gender') || 'female';
  let pitch = 1.0;
  let rate  = 1.0;

  const name = (speakerName || '').toLowerCase();

  if (name.includes('arjun')) {
    gender = 'male';
    pitch  = 0.90; // Deeper male voice
  } else if (name.includes('vikram') || name.includes('rohan')) {
    gender = 'male';
    pitch  = 0.80; // Resonant male voice
  } else if (name.includes('priya')) {
    gender = 'female';
    pitch  = 1.20; // Clear higher female voice
  } else if (name.includes('neha') || name.includes('ananya')) {
    gender = 'female';
    pitch  = 1.30; // Bright female voice
  } else if (role === 'moderator' || name.includes('moderator')) {
    gender = 'female';
    pitch  = 1.05; // Authoritative moderator voice
    rate   = 0.95;  // Slightly measured pace
  }

  function speakChunk() {
    if (idx >= chunks.length) { onDone?.(); return; }
    const utt = new SpeechSynthesisUtterance(chunks[idx++]);
    const voice = getNaturalVoice(accent, gender);
    utt.pitch  = pitch;
    utt.rate   = rate;
    utt.volume = 1.0;

    if (voice) { utt.voice = voice; utt.lang = voice.lang; }
    else { utt.lang = accent === 'foreign' ? 'en-US' : 'en-IN'; }

    const keepAlive = setInterval(() => {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    }, 5000);

    utt.onend = () => { clearInterval(keepAlive); speakChunk(); };
    utt.onerror = () => { clearInterval(keepAlive); speakChunk(); };

    window.speechSynthesis.speak(utt);
  }

  if (window.speechSynthesis.getVoices().length === 0) {
    let fired = false;
    window.speechSynthesis.onvoiceschanged = () => {
      if (fired) return; fired = true;
      window.speechSynthesis.onvoiceschanged = null;
      speakChunk();
    };
  } else {
    speakChunk();
  }
}

function chunkText(text, max) {
  if (text.length <= max) return [text];
  const chunks = [], sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let cur = '';
  for (const s of sentences) {
    if ((cur + s).length > max) {
      if (cur) { chunks.push(cur.trim()); cur = ''; }
      if (s.length > max) { for (let i = 0; i < s.length; i += max) chunks.push(s.slice(i, i + max)); }
      else cur = s;
    } else cur += s;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.filter(Boolean);
}
