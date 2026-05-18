import { useRef, useCallback, useEffect } from 'react';

/**
 * AI Voice Engine — FIXED
 *
 * Root cause of silence: audio.play() called from socket events has no
 * user-gesture context → browsers silently block autoplay.
 *
 * Fix strategy:
 *  1. Web Speech API (SpeechSynthesis) as PRIMARY — works reliably once the
 *     page has had any user interaction (the Join Now click qualifies).
 *  2. Groq TTS base64 audio as SECONDARY enhancement when AudioContext is
 *     already unlocked via the explicit unlock() call on first user gesture.
 *  3. AudioContext is unlocked on component mount via a one-time gesture
 *     listener so all subsequent audio.play() calls succeed.
 */
export function useAIVoice({ enabled = true } = {}) {
  const queueRef      = useRef([]);
  const playingRef    = useRef(false);
  const audioCtxRef   = useRef(null);
  const audioElRef    = useRef(null);
  const enabledRef    = useRef(enabled);

  // Keep enabledRef in sync without re-creating callbacks
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  // ── Unlock AudioContext on first user gesture ────────────────────────────
  useEffect(() => {
    function unlock() {
      if (audioCtxRef.current) return;
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        // Play a silent buffer to unlock
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
        audioCtxRef.current = ctx;
      } catch {}
      // Once unlocked, remove listener
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('touchstart', unlock);
    }
    document.addEventListener('click',      unlock, { once: true });
    document.addEventListener('keydown',    unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
    return () => {
      document.removeEventListener('click',      unlock);
      document.removeEventListener('keydown',    unlock);
      document.removeEventListener('touchstart', unlock);
    };
  }, []);

  // ── Core queue processor (ref-based to avoid stale closures) ────────────
  const processQueue = useRef(null);
  processQueue.current = () => {
    if (playingRef.current || queueRef.current.length === 0) return;
    if (!enabledRef.current) { queueRef.current = []; return; }

    const item = queueRef.current.shift();
    playingRef.current = true;

    const onDone = () => {
      playingRef.current = false;
      // Small gap between utterances feels natural
      setTimeout(() => processQueue.current?.(), 150);
    };

    // Try Groq TTS base64 first — only if AudioContext is unlocked
    if (item.audioBase64 && audioCtxRef.current) {
      tryPlayBase64(item.audioBase64, item.text, onDone);
    } else {
      // Web Speech API — always works after user interaction
      speakWebSpeech(item.text, onDone);
    }
  };

  // ── Public API ────────────────────────────────────────────────────────────
  const enqueue = useCallback((audioBase64, text) => {
    if (!text?.trim()) return;
    queueRef.current.push({ audioBase64: audioBase64 || null, text });
    processQueue.current?.();
  }, []);

  /** Play Groq TTS base64 audio */
  const playAudio = useCallback((audioBase64, text) => {
    enqueue(audioBase64, text);
  }, [enqueue]);

  /** Play text using Web Speech API only (instant, no Groq needed) */
  const playText = useCallback((text) => {
    enqueue(null, text);
  }, [enqueue]);

  const stopAll = useCallback(() => {
    queueRef.current = [];
    playingRef.current = false;
    window.speechSynthesis?.cancel();
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current = null;
    }
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  return { playAudio, playText, stopAll };
}

// ── Play base64 mp3 via AudioContext (autoplay-safe) ─────────────────────
function tryPlayBase64(base64, text, onDone) {
  try {
    const binary = atob(base64);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob   = new Blob([bytes], { type: 'audio/mp3' });
    const url    = URL.createObjectURL(blob);
    const audio  = new Audio(url);
    audio.onended = () => { URL.revokeObjectURL(url); onDone(); };
    audio.onerror = () => { URL.revokeObjectURL(url); speakWebSpeech(text, onDone); };
    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        URL.revokeObjectURL(url);
        speakWebSpeech(text, onDone);
      });
    }
  } catch {
    speakWebSpeech(text, onDone);
  }
}

// ── Web Speech API — primary voice engine ────────────────────────────────
function speakWebSpeech(text, onDone) {
  if (!window.speechSynthesis || !text?.trim()) { onDone?.(); return; }

  // Cancel any current speech
  window.speechSynthesis.cancel();

  const MAX_CHUNK = 200; // SpeechSynthesis has ~200-char limit on some browsers
  const chunks = chunkText(text, MAX_CHUNK);
  let idx = 0;

  function speakChunk() {
    if (idx >= chunks.length) { onDone?.(); return; }
    const utt    = new SpeechSynthesisUtterance(chunks[idx++]);
    utt.rate     = 0.92;
    utt.pitch    = 1.0;
    utt.volume   = 1.0;
    utt.lang     = 'en-IN';

    // Pick best available voice — prefer Google en-IN or en-US
    const voices = window.speechSynthesis.getVoices();
    const voice  = voices.find(v => v.name.includes('Google') && v.lang === 'en-IN')
                || voices.find(v => v.name.includes('Google') && v.lang.startsWith('en'))
                || voices.find(v => v.lang.startsWith('en') && !v.localService)
                || voices.find(v => v.lang.startsWith('en'))
                || voices[0];
    if (voice) utt.voice = voice;

    utt.onend   = speakChunk;
    utt.onerror = speakChunk; // skip failed chunk, continue

    // Chrome bug: speechSynthesis pauses if tab is hidden — resume it
    const keepAlive = setInterval(() => {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    }, 5000);
    utt.onend = () => { clearInterval(keepAlive); speakChunk(); };

    window.speechSynthesis.speak(utt);
  }

  // Voices load async on first call — wait if needed
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null;
      speakChunk();
    };
  } else {
    speakChunk();
  }
}

function chunkText(text, max) {
  if (text.length <= max) return [text];
  const chunks = [];
  // Split on sentence boundaries when possible
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let current = '';
  for (const s of sentences) {
    if ((current + s).length > max) {
      if (current) { chunks.push(current.trim()); current = ''; }
      if (s.length > max) {
        for (let i = 0; i < s.length; i += max) chunks.push(s.slice(i, i + max));
      } else { current = s; }
    } else { current += s; }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(Boolean);
}
