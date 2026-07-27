/**
 * voiceConfig.js — PRAGATI Dual-Provider TTS Voice Configuration (ElevenLabs & Edge-TTS)
 * 
 * Provider priority: ElevenLabs → Microsoft Edge Neural TTS → Browser speechSynthesis
 * 
 * Microsoft Edge TTS does not require Azure credentials or credit cards, making it fully free.
 * Edge-TTS voices are neural, high-quality, and mapped here for Indian English and regional clarity.
 */

const VOICE_CONFIG = {
  /**
   * system_female — Pragati AI Assistant F
   * Warm, professional Indian female voice
   */
  system_female: {
    elevenlabs: 'dveobG1rlBV3LOoiDZTD', // Pragati AI Assistant F
    edge: 'en-IN-NeerjaNeural',
    label: 'Pragati (Female - Indian)',
  },
  system_male: {
    elevenlabs: 'nwj0s2LU9bDWRKND5yzA', // Pragati AI Assistant(M)
    edge: 'en-IN-PrabhatNeural',
    label: 'Pragati (Male - Indian)',
  },
  system_female_foreign: {
    elevenlabs: 'EXAVITQu4vr4xnSDxMaL', // Bella (Female)
    edge: 'en-US-AvaNeural',
    label: 'Pragati (Female - Foreign)',
  },
  system_male_foreign: {
    elevenlabs: 'ErXwobaYiN019PkySvjV', // Antoni (Male)
    edge: 'en-US-AndrewNeural',
    label: 'Pragati (Male - Foreign)',
  },
  system_female_alt: {
    elevenlabs: '21m00Tcm4TlvDq8ikWAM', // Rachel (Female)
    edge: 'en-IN-AnanyaNeural',
    label: 'Pragati (Female - Alt)',
  },
  system_male_alt: {
    elevenlabs: 'SOYHLrjzK2t1IabR4W68', // Harry (Male)
    edge: 'en-IN-RahulNeural',
    label: 'Pragati (Male - Alt)',
  },

  /**
   * interviewer — Interviewer in Mock Interviews
   */
  interviewer: {
    elevenlabs: 'hNFsKV3JEEO7zQXkzCsV', // Pragati AI Assistant F
    edge: 'en-IN-NeerjaNeural',
    label: 'Interviewer',
  },

  /**
   * moderator_female — Pragati GD Moderator(F)
   */
  moderator_female: {
    elevenlabs: 'OUBnvvuqEKdDWtapoJFn', // Pragati GD Moderator(F)
    edge: 'en-IN-NeerjaNeural',
    label: 'GD Moderator (Female)',
  },

  /**
   * moderator_male — Pragati GD Moderator(M)
   */
  moderator_male: {
    elevenlabs: 'h061KGyOtpLYDxcoi8E3', // Pragati GD Moderator(M)
    edge: 'en-IN-PrabhatNeural',
    label: 'GD Moderator (Male)',
  },

  /**
   * candidate_female_1 — Priya AI
   */
  candidate_female_1: {
    elevenlabs: 'tzoR7arDwmW2nN2tuFJy', // Priya AI
    edge: 'en-IN-NeerjaNeural',
    label: 'Priya AI',
  },

  /**
   * candidate_female_2 — Diya AI
   */
  candidate_female_2: {
    elevenlabs: 'NaKPQmdr7mMxXuXrNeFC', // Diya AI
    edge: 'en-IN-AnanyaNeural',
    label: 'Diya AI',
  },

  /**
   * candidate_male_1 — Arjun AI
   */
  candidate_male_1: {
    elevenlabs: 'bajNon13EdhNMndG3z05', // Arjun AI
    edge: 'en-IN-PrabhatNeural',
    label: 'Arjun AI',
  },

  /**
   * candidate_male_2 — Guru AI
   */
  candidate_male_2: {
    elevenlabs: 'hNFsKV3JEEO7zQXkzCsV', // Guru AI
    edge: 'en-IN-RahulNeural',
    label: 'Guru AI',
  },
};

// ── Free Tier ElevenLabs Voice Mapping ─────────────────────────────────────────
// Free ElevenLabs accounts are restricted from using Voice Library / Cloned voices.
// We map high-fidelity built-in system voices for the free plan.
if (process.env.USE_ELEVENLABS_FREE_VOICES === 'true') {
  const FREE_MAPPINGS = {
    system_female:      'EXAVITQu4vr4xnSDxMaL', // Bella (Female)
    system_male:        'ErXwobaYiN019PkySvjV', // Antoni (Male)
    interviewer:        'EXAVITQu4vr4xnSDxMaL', // Bella (Female)
    moderator_female:   '21m00Tcm4TlvDq8ikWAM', // Rachel (Female)
    moderator_male:     'IKne3meq5aC2b9Dtkkyr', // Charlie (Male)
    candidate_female_1: 'N2lVS1w7qc9y9D9wZ19i', // Gigi (Female - Priya AI)
    candidate_female_2: 'XB0fDUnUDzGvR5S3vPvL', // Nicole (Female - Diya AI)
    candidate_male_1:   'Lcfc5A4pTvTkyEb6oZ2W', // Clyde (Male - Arjun AI)
    candidate_male_2:   'SOYHLrjzK2t1IabR4W68', // Harry (Male - Guru AI)
  };
  Object.keys(FREE_MAPPINGS).forEach(key => {
    if (VOICE_CONFIG[key]) {
      VOICE_CONFIG[key].elevenlabs = FREE_MAPPINGS[key];
    }
  });
}

/**
 * ElevenLabs model — multilingual-v2 supports Indian English naturally
 */
const ELEVENLABS_MODEL = 'eleven_multilingual_v2';

/**
 * Default voice settings — optimized for warm, human-sounding Indian English.
 * 
 * stability: 0.45       — allows natural prosody variation (less robotic)
 * similarity_boost: 0.85 — preserves strong voice identity
 * style: 0.35           — motivational, confident expressive delivery
 * use_speaker_boost     — enhances clarity in Indian accent
 */
const ELEVENLABS_VOICE_SETTINGS = {
  stability:         0.45,
  similarity_boost:  0.85,
  style:             0.35,
  use_speaker_boost: true,
};

module.exports = { VOICE_CONFIG, ELEVENLABS_MODEL, ELEVENLABS_VOICE_SETTINGS };
