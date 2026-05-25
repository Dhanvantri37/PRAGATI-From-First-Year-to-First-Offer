/**
 * voiceHelper.js
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
        score += 50;
      } else if (vLang.startsWith('en-gb')) {
        score += 25;
      } else if (vLang.startsWith('en-us') || vLang.startsWith('en-ca')) {
        score += 15;
      } else if (vLang.startsWith('en')) {
        score += 10;
      } else {
        score -= 50; // Deprioritize non-English
      }
    } else if (targetAcc === 'foreign') {
      if (vLang.startsWith('en-us')) {
        score += 50;
      } else if (vLang.startsWith('en-gb')) {
        score += 40;
      } else if (vLang.startsWith('en-in') || vLang.startsWith('hi-in')) {
        score += 15;
      } else if (vLang.startsWith('en')) {
        score += 10;
      } else {
        score -= 50;
      }
    } else { // Default or general English
      if (vLang.startsWith('en-in') || vLang.startsWith('hi-in')) {
        score += 50; // Still default to Indian accent
      } else if (vLang.startsWith('en-us')) {
        score += 40;
      } else if (vLang.startsWith('en-gb')) {
        score += 30;
      } else if (vLang.startsWith('en')) {
        score += 20;
      } else {
        score -= 50;
      }
    }

    // 3. Gender matching
    let genderMatch = false;
    let genderMismatch = false;

    if (isMale) {
      if (maleNames.some(m => vName.includes(m)) && !femaleNames.some(f => vName.includes(f))) {
        genderMatch = true;
      } else if (femaleNames.some(f => vName.includes(f))) {
        genderMismatch = true;
      }
    } else {
      if (femaleNames.some(f => vName.includes(f)) && !maleNames.some(m => vName.includes(m))) {
        genderMatch = true;
      } else if (maleNames.some(m => vName.includes(m))) {
        genderMismatch = true;
      }
    }

    if (genderMatch) {
      score += 40;
    } else if (genderMismatch) {
      score -= 30;
    }

    // 4. Prefer local service slightly if scores are tied (for offline reliability)
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
