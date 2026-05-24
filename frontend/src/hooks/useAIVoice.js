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

    if (item.audioBase64 && audioCtxRef.current) {
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

// ── Web Speech — Natural/Neural voice picker integration ─────────────────────
export function speakWebSpeech(text, accent = 'indian', role = 'companion', onDone, speakerName) {
  if (!window.speechSynthesis || !text?.trim()) { onDone?.(); return; }
  window.speechSynthesis.cancel();

  const chunks = chunkText(text, 200);
  let idx = 0;

  // Determine speaker gender
  let gender = 'female';
  if (role === 'participant') {
    const name = (speakerName || '').toLowerCase();
    const isMale = name.includes('arjun') || name.includes('vikram') || name.includes('rahul') || name.includes('fritz') || name.includes('angelo') || name.includes('atlas') || name.includes('briggs');
    gender = isMale ? 'male' : 'female';
  } else {
    // Moderators and companions are female by default
    gender = 'female';
  }

  function speakChunk() {
    if (idx >= chunks.length) { onDone?.(); return; }
    const utt = new SpeechSynthesisUtterance(chunks[idx++]);
    
    // Pick the best natural browser voice matching preferences
    const voice = getNaturalVoice(accent, gender);
    
    // Fine-tune rates/pitches based on gender for maximum quality
    if (gender === 'male') {
      utt.pitch = 0.85;
      utt.rate  = 0.90;
    } else {
      utt.pitch = 1.12;
      utt.rate  = 0.93;
    }
    utt.volume = 1.0;

    if (voice) {
      utt.voice = voice;
      utt.lang  = voice.lang;
    } else {
      utt.lang  = accent === 'foreign' ? 'en-US' : 'en-IN';
    }

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
