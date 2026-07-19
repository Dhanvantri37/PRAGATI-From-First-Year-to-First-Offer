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
    label: 'Pragati (Female)',
  },

  /**
   * system_male — Pragati AI Assistant(M)
   * Warm, professional Indian male voice
   */
  system_male: {
    elevenlabs: 'nwj0s2LU9bDWRKND5yzA', // Pragati AI Assistant(M)
    edge: 'en-IN-PrabhatNeural',
    label: 'Pragati (Male)',
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

/**
 * ElevenLabs model — multilingual-v2 supports Indian English naturally
 */
const ELEVENLABS_MODEL = 'eleven_multilingual_v2';

/**
 * Default voice settings optimized for Indian English clarity
 */
const ELEVENLABS_VOICE_SETTINGS = {
  stability: 0.55,  // Natural variation
  similarity_boost: 0.80,  // Voice identity fidelity
  style: 0.20,  // Style emphasis
  use_speaker_boost: true,
};

module.exports = { VOICE_CONFIG, ELEVENLABS_MODEL, ELEVENLABS_VOICE_SETTINGS };
