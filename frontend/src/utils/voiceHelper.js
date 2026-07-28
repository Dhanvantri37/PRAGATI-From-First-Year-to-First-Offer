/**
 * voiceHelper.js — PRAGATI Unified Neural TTS Voice Helper
 * 
 * Supports browser Web Speech API (speechSynthesis) and backend-streamed
 * neural voices (ElevenLabs / Edge-TTS) by specific roles.
 */

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Streams and plays audio from the backend /api/tts endpoint for a specific role.
 * Falls back to browser Web Speech synthesis if the backend service is unavailable.
 */
export async function speakText(text, role = 'system_female', options = {}) {
  if (!text?.trim()) return;

  // Cancel any active speech synthesis
  if (window.speechSynthesis) {
    try { window.speechSynthesis.cancel(); } catch (e) {}
  }

  // Stop any active audio player
  if (window.pragatiAudioPlayer) {
    try { window.pragatiAudioPlayer.pause(); } catch (e) {}
    window.pragatiAudioPlayer = null;
  }

  const cleanText = text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g,    '$1')
    .replace(/#{1,6} /g,      '')
    .substring(0, 400);

  // ── 1. Try Backend Neural TTS (ElevenLabs / Edge-TTS) ──────────────────
  try {
    const token = localStorage.getItem('pragati_token') || localStorage.getItem('token');
    const response = await fetch(`${API}/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({ text: cleanText, role })
    });

    if (!response.ok) {
      throw new Error('Backend TTS error');
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    window.pragatiAudioPlayer = audio;

    return new Promise((resolve) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve(true);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        resolve(false);
      };
      audio.play().catch(() => {
        URL.revokeObjectURL(audioUrl);
        // Fallback to browser if play fails (e.g. user interaction required)
        speakBrowser(cleanText, role, options).then(resolve);
      });
    });
  } catch (err) {
    console.warn('[speakText] Backend TTS failed, using browser fallback:', err.message);
  }

  // ── 2. Fallback: Browser Web Speech API ───────────────────────────────
  return speakBrowser(cleanText, role, options);
}

/**
 * Fallback browser-based text-to-speech
 */
function speakBrowser(text, role, options = {}) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      return resolve(false);
    }

    const utt = new SpeechSynthesisUtterance(text);
    
    // Map roles to gender/accent styles
    let gender = 'female';
    if (role.includes('male') || role === 'arjun' || role === 'vikram') {
      gender = 'male';
    }

    const voice = getNaturalVoice('indian', gender);
    utt.pitch = gender === 'male' ? 0.90 : 1.10;
    utt.rate  = gender === 'male' ? 0.95 : 1.0;
    utt.volume = 1.0;

    if (voice) {
      utt.voice = voice;
      utt.lang  = voice.lang;
    } else {
      utt.lang  = 'en-IN';
    }

    const keepAlive = setInterval(() => {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    }, 4000);

    utt.onend = () => {
      clearInterval(keepAlive);
      resolve(true);
    };
    utt.onerror = () => {
      clearInterval(keepAlive);
      resolve(false);
    };

    if (!window.speechSynthesis.getVoices().length) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        window.speechSynthesis.speak(utt);
      };
    } else {
      window.speechSynthesis.speak(utt);
    }
  });
}

/**
 * Utility to pick the highest quality neural/natural browser speech synthesis voice.
 */
export function getNaturalVoice(accent = 'indian', gender = 'female') {
  if (!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const isMale = gender.toLowerCase() === 'male';
  const targetAcc = accent || 'indian';

  // Name tokens to detect gendered voices
  const femaleNames = ['neerja', 'aria', 'heera', 'raveena', 'sonia', 'zira', 'samantha', 'karen', 'hazel', 'female', 'priya', 'shreya', 'ziya', 'prerna', 'pallavi', 'heera'];
  const maleNames = ['prabhat', 'guy', 'ravi', 'ryan', 'david', 'troy', 'andrew', 'male', 'arjun', 'vikram', 'anuj', 'karan', 'madhur', 'dilip'];

  // Quality markers for natural/neural voices
  const naturalMarkers = ['natural', 'online', 'google', 'siri', 'neural', 'wavenet', 'neural2', 'aurora'];

  let bestVoice = null;
  let maxScore = -9999;

  for (const voice of voices) {
    const vName = (voice.name || '').toLowerCase();
    const vLang = (voice.lang || '').toLowerCase().replace('_', '-');
    let score = 0;

    // 1. Neural/Natural quality priority
    const isNatural = naturalMarkers.some(m => vName.includes(m));
    if (isNatural) {
      score += 100;
    }

    // 2. Language/Accent scoring
    if (targetAcc === 'indian') {
      if (vLang.startsWith('en-in') || vLang.startsWith('hi-in')) {
        score += 500; // Massive weight to guarantee Indian voices
      } else if (vLang.startsWith('en-gb')) {
        score += 25;
      } else if (vLang.startsWith('en-us') || vLang.startsWith('en-ca')) {
        score += 15;
      } else if (vLang.startsWith('en')) {
        score += 10;
      } else {
        score -= 500;
      }
    } else if (targetAcc === 'foreign') {
      if (vLang.startsWith('en-us') || vLang.startsWith('en-ca') || vLang.startsWith('en-gb')) {
        score += 500; // Massive weight to guarantee foreign English voices
      } else if (vLang.startsWith('en-in') || vLang.startsWith('hi-in')) {
        score += 15;
      } else if (vLang.startsWith('en')) {
        score += 10;
      } else {
        score -= 500;
      }
    } else {
      if (vLang.startsWith('en-in') || vLang.startsWith('hi-in')) {
        score += 100;
      } else if (vLang.startsWith('en-us')) {
        score += 80;
      } else if (vLang.startsWith('en-gb')) {
        score += 60;
      } else if (vLang.startsWith('en')) {
        score += 40;
      } else {
        score -= 500;
      }
    }

    // 3. Gender & Name exact matching
    let genderMatch = false;
    let genderMismatch = false;

    if (isMale) {
      if (vName.includes('prabhat') || vName.includes('ravi') || vName.includes('arjun') || vName.includes('vikram')) {
        score += 1000;
        genderMatch = true;
      } else if (maleNames.some(m => vName.includes(m)) && !femaleNames.some(f => vName.includes(f))) {
        genderMatch = true;
      } else if (femaleNames.some(f => vName.includes(f))) {
        genderMismatch = true;
      }
    } else {
      if (vName.includes('neerja') || vName.includes('heera') || vName.includes('priya') || vName.includes('shreya')) {
        score += 1000;
        genderMatch = true;
      } else if (femaleNames.some(f => vName.includes(f)) && !maleNames.some(m => vName.includes(m))) {
        genderMatch = true;
      } else if (maleNames.some(m => vName.includes(m))) {
        genderMismatch = true;
      }
    }

    if (genderMatch) {
      score += 200;
    } else if (genderMismatch) {
      score -= 300;
    }

    if (voice.localService) {
      score += 2;
    }

    if (score > maxScore) {
      maxScore = score;
      bestVoice = voice;
    }
  }

  return bestVoice || voices[0];
}
