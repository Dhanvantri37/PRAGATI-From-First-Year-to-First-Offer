import { useRef, useCallback, useEffect } from 'react';

/**
 * useAIVoice — Enhanced
 *
 * New features:
 *  1. accent prop ('indian' | 'foreign' | 'default') — persisted in localStorage
 *  2. voiceRole prop ('moderator' | 'participant' | 'companion') — different pitch/rate per role
 *     so GD moderator vs AI participants sound distinct
 *  3. Groq TTS base64 primary (when AudioContext unlocked), Web Speech fallback
 *  4. Chrome autoplay-safe AudioContext unlock on first gesture
 */

// ── Voice profiles for Web Speech API ────────────────────────────────────────
const VOICE_PROFILES = {
  // role → { lang hint, rate, pitch, preferredNames[] }
  moderator: {
    indian:  { lang: 'en-IN', rate: 0.90, pitch: 1.10, preferred: ['Google हिन्दी','Raveena','Google IN'] },
    foreign: { lang: 'en-US', rate: 0.88, pitch: 0.95, preferred: ['Google US English','Samantha','Alex'] },
    default: { lang: 'en-IN', rate: 0.92, pitch: 1.00, preferred: ['Google','en-IN','en-US'] },
  },
  participant: {
    indian:  { lang: 'en-IN', rate: 1.00, pitch: 0.90, preferred: ['Raveena','Google IN','hi-IN'] },
    foreign: { lang: 'en-AU', rate: 0.95, pitch: 1.05, preferred: ['Karen','Google AU','en-AU'] },
    default: { lang: 'en-GB', rate: 0.97, pitch: 0.85, preferred: ['Google UK','Daniel','en-GB'] },
  },
  companion: {
    indian:  { lang: 'en-IN', rate: 0.93, pitch: 1.08, preferred: ['Google हिन्दी','Raveena','Google IN'] },
    foreign: { lang: 'en-US', rate: 0.91, pitch: 1.10, preferred: ['Samantha','Google US English'] },
    default: { lang: 'en-IN', rate: 0.93, pitch: 1.05, preferred: ['Google','en-IN'] },
  },
};

function pickVoice(accent, role) {
  const profile = (VOICE_PROFILES[role] || VOICE_PROFILES.companion)[accent] || VOICE_PROFILES.companion.default;
  const voices  = window.speechSynthesis?.getVoices() || [];

  for (const name of profile.preferred) {
    const v = voices.find(v => v.name.includes(name) || v.lang.includes(name));
    if (v) return { voice: v, rate: profile.rate, pitch: profile.pitch };
  }
  // Fallback: any voice matching lang
  const byLang = voices.find(v => v.lang.startsWith(profile.lang.substring(0, 2)));
  return { voice: byLang || voices[0] || null, rate: profile.rate, pitch: profile.pitch };
}

export function useAIVoice({ enabled = true, accent = 'indian', role = 'companion' } = {}) {
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
    if (!enabledRef.current) { queueRef.current = []; return; }

    const item = queueRef.current.shift();
    playingRef.current = true;

    const onDone = () => {
      playingRef.current = false;
      setTimeout(() => processQueue.current?.(), 180);
    };

    if (item.audioBase64 && audioCtxRef.current) {
      tryPlayBase64(item.audioBase64, item.text, accentRef.current, roleRef.current, onDone);
    } else {
      speakWebSpeech(item.text, accentRef.current, roleRef.current, onDone);
    }
  };

  const enqueue = useCallback((audioBase64, text) => {
    if (!text?.trim()) return;
    queueRef.current.push({ audioBase64: audioBase64 || null, text });
    processQueue.current?.();
  }, []);

  const playAudio = useCallback((audioBase64, text) => enqueue(audioBase64, text), [enqueue]);
  const playText  = useCallback((text)              => enqueue(null, text),         [enqueue]);

  const stopAll = useCallback(() => {
    queueRef.current  = [];
    playingRef.current = false;
    window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  return { playAudio, playText, stopAll };
}

// ── Play base64 mp3 via AudioContext ─────────────────────────────────────────
function tryPlayBase64(base64, text, accent, role, onDone) {
  try {
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const blob  = new Blob([bytes], { type: 'audio/mp3' });
    const url   = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => { URL.revokeObjectURL(url); onDone(); };
    audio.onerror = () => { URL.revokeObjectURL(url); speakWebSpeech(text, accent, role, onDone); };
    const p = audio.play();
    if (p?.catch) p.catch(() => { URL.revokeObjectURL(url); speakWebSpeech(text, accent, role, onDone); });
  } catch {
    speakWebSpeech(text, accent, role, onDone);
  }
}

// ── Web Speech — accent + role aware ─────────────────────────────────────────
export function speakWebSpeech(text, accent = 'indian', role = 'companion', onDone) {
  if (!window.speechSynthesis || !text?.trim()) { onDone?.(); return; }
  window.speechSynthesis.cancel();

  const chunks = chunkText(text, 200);
  let idx = 0;

  function speakChunk() {
    if (idx >= chunks.length) { onDone?.(); return; }
    const utt = new SpeechSynthesisUtterance(chunks[idx++]);
    const { voice, rate, pitch } = pickVoice(accent, role);

    utt.rate   = rate;
    utt.pitch  = pitch;
    utt.volume = 1.0;
    if (voice) { utt.voice = voice; utt.lang = voice.lang; }

    const keepAlive = setInterval(() => {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    }, 5000);

    utt.onend   = () => { clearInterval(keepAlive); speakChunk(); };
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
    let poll = 0;
    const t = setInterval(() => {
      if (fired || ++poll > 20) { clearInterval(t); return; }
      if (window.speechSynthesis.getVoices().length > 0) {
        fired = true; window.speechSynthesis.onvoiceschanged = null;
        clearInterval(t); speakChunk();
      }
    }, 100);
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
