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

  // Order languages by priority based on selected accent
  let targetLangs = [];
  if (targetAcc === 'indian') {
    targetLangs = ['en-IN', 'en-GB', 'en-US'];
  } else if (targetAcc === 'foreign') {
    targetLangs = ['en-US', 'en-GB', 'en-IN'];
  } else {
    targetLangs = ['en-US', 'en-GB', 'en-IN', 'en'];
  }

  // Name tokens to detect gendered voices
  const femaleNames = ['neerja', 'aria', 'heera', 'raveena', 'sonia', 'zira', 'samantha', 'karen', 'hazel', 'female'];
  const maleNames = ['prabhat', 'guy', 'ravi', 'ryan', 'david', 'troy', 'andrew', 'google us english male', 'google uk english male', 'male'];

  // Step 1: Filter by target languages
  let filtered = [];
  for (const lang of targetLangs) {
    const matched = voices.filter(v => v.lang.toLowerCase().replace('_', '-').startsWith(lang.toLowerCase()));
    if (matched.length > 0) {
      filtered = matched;
      break;
    }
  }
  if (filtered.length === 0) {
    filtered = voices.filter(v => v.lang.toLowerCase().startsWith('en'));
  }
  if (filtered.length === 0) {
    filtered = voices;
  }

  // Step 2: Sort matching voices to prioritize "Natural", "Online", "Neural", "Google", "Siri"
  const sorted = [...filtered].sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();

    const aIsNatural = aName.includes('natural') || aName.includes('online') || aName.includes('google') || aName.includes('siri') || aName.includes('neural');
    const bIsNatural = bName.includes('natural') || bName.includes('online') || bName.includes('google') || bName.includes('siri') || bName.includes('neural');

    let aMatchesGender = false;
    let bMatchesGender = false;
    if (isMale) {
      aMatchesGender = maleNames.some(n => aName.includes(n)) && !femaleNames.some(n => aName.includes(n));
      bMatchesGender = maleNames.some(n => bName.includes(n)) && !femaleNames.some(n => bName.includes(n));
    } else {
      aMatchesGender = femaleNames.some(n => aName.includes(n)) && !maleNames.some(n => aName.includes(n));
      bMatchesGender = femaleNames.some(n => bName.includes(n)) && !maleNames.some(n => bName.includes(n));
    }

    if (aIsNatural && aMatchesGender && !(bIsNatural && bMatchesGender)) return -1;
    if (bIsNatural && bMatchesGender && !(aIsNatural && aMatchesGender)) return 1;

    if (aIsNatural && !bIsNatural) return -1;
    if (bIsNatural && !aIsNatural) return 1;

    if (aMatchesGender && !bMatchesGender) return -1;
    if (bMatchesGender && !aMatchesGender) return 1;

    return 0;
  });

  return sorted[0] || null;
}
