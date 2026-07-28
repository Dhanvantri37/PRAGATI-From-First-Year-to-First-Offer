/**
 * tts.routes.js — PRAGATI Dual-Provider Text-to-Speech API
 * 
 * POST /api/tts
 *   Body: { text: string, role?: string }
 *   Returns: audio/mpeg stream
 * 
 * Priority chain:
 *   1. ElevenLabs (Custom premium neural voices)
 *   2. Edge-TTS (Free Microsoft Edge Neural voices, zero keys/cards required)
 *   3. 503 → frontend falls back to browser speechSynthesis
 */

const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { authenticate } = require('../middleware/auth.middleware');
const { VOICE_CONFIG, ELEVENLABS_MODEL, ELEVENLABS_VOICE_SETTINGS } = require('../config/voiceConfig');

// ── Helper: strip markdown for clean speech ───────────────────────────────
function cleanForTTS(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')   // bold
    .replace(/\*(.*?)\*/g,    '$1')    // italic
    .replace(/#{1,6} /g,      '')      // headings
    .replace(/`{1,3}[^`]*`{1,3}/g, '') // code blocks
    .replace(/\n{2,}/g, '. ')          // double newlines to pauses
    .replace(/\n/g,      ' ')          // single newlines
    .replace(/[^\x00-\x7F]/g, '')      // remove non-ASCII emojis (TTS doesn't need them)
    .trim()
    .substring(0, 500);                // limit text length to avoid timeouts
}

// ── ElevenLabs TTS ────────────────────────────────────────────────────────
async function speakElevenLabs(text, voiceId) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || apiKey === 'your_elevenlabs_api_key_here' || voiceId.startsWith('PASTE_')) {
    throw new Error('ElevenLabs API key or Voice ID not configured');
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key':   apiKey,
      'Content-Type': 'application/json',
      'Accept':       'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: ELEVENLABS_MODEL,
      voice_settings: ELEVENLABS_VOICE_SETTINGS,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`ElevenLabs error ${response.status}: ${errBody.substring(0, 200)}`);
  }

  return response;
}

// ── Edge-TTS via Python CLI ──────────────────────────────────────────────
function speakEdge(text, voiceName) {
  return new Promise((resolve, reject) => {
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempFile = path.join(tempDir, `tts_${Date.now()}_${Math.floor(Math.random() * 1000)}.mp3`);

    // Escape text characters for command line safety
    const escapedText = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    // --rate=-5%   → slightly slower than default for clarity and gravitas
    // --pitch=+10Hz → warmer, more confident and motivational tone
    const cmd = `python -m edge_tts --text "${escapedText}" --voice "${voiceName}" --rate=-5% --pitch=+10Hz --write-media "${tempFile}"`;

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('[edge-tts-error]', stderr || error.message);
        if (fs.existsSync(tempFile)) {
          try { fs.unlinkSync(tempFile); } catch (e) {}
        }
        return reject(new Error(stderr || error.message));
      }

      if (!fs.existsSync(tempFile)) {
        return reject(new Error('Edge-TTS executed but output file was not generated.'));
      }

      resolve(tempFile);
    });
  });
}

// ── POST /api/tts ─────────────────────────────────────────────────────────
router.post('/', authenticate, async (req, res) => {
  try {
    let { text, role = 'system_female', gender, accent, toneAlt } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'text is required' });

    // Dynamic Role Resolution based on gender & accent preferences
    if (gender || accent || toneAlt) {
      const g = (gender || 'female').toLowerCase();
      const a = (accent || 'indian').toLowerCase();

      if (toneAlt) {
        role = g === 'male' ? 'system_male_alt' : 'system_female_alt';
      } else if (a === 'foreign' || a === 'american' || a === 'uk') {
        role = g === 'male' ? 'system_male_foreign' : 'system_female_foreign';
      } else {
        role = g === 'male' ? 'system_male' : 'system_female';
      }
    }

    const cleanText = cleanForTTS(text);
    const voiceCfg  = VOICE_CONFIG[role] || VOICE_CONFIG['system_female'];

    let provider = 'none';
    let audioResponse = null;

    const tryElevenLabs = async () => {
      try {
        audioResponse = await speakElevenLabs(cleanText, voiceCfg.elevenlabs);
        provider = 'elevenlabs';
        console.log(`[TTS] ElevenLabs Primary ✅ role=${role} chars=${cleanText.length}`);
      } catch (primaryErr) {
        console.warn(`[TTS] ElevenLabs primary voice failed (${primaryErr.message}) → trying ElevenLabs Free Voice fallback...`);
        const fallbackVoiceId = (role.includes('male') || role === 'arjun' || role === 'vikram')
          ? 'ErXwobaYiN019PkySvjV' // Antoni (Male)
          : '21m00Tcm4TlvDq8ikWAM'; // Rachel (Female)
        audioResponse = await speakElevenLabs(cleanText, fallbackVoiceId);
        provider = 'elevenlabs';
        console.log(`[TTS] ElevenLabs Free Voice ✅ role=${role} fallbackId=${fallbackVoiceId}`);
      }
    };

    const tryEdge = async () => {
      audioResponse = await speakEdge(cleanText, voiceCfg.edge);
      provider = 'edge';
      console.log(`[TTS] Edge-TTS ✅ role=${role} voice=${voiceCfg.edge}`);
    };

    // ── Universal Provider Priority: ElevenLabs → Edge-TTS → Browser ──────
    // ElevenLabs first for ALL roles — best quality for interview, GD, and chat
    // Edge-TTS (NeerjaNeural / PrabhatNeural) as automatic fallback if ElevenLabs
    // fails (quota exhausted, network error, etc.)
    try {
      await tryElevenLabs();
    } catch (elErr) {
      console.warn(`[TTS] ElevenLabs failed for "${role}" (${elErr.message}) → trying Edge-TTS...`);
      try {
        await tryEdge();
      } catch (edgeErr) {
        console.warn(`[TTS] Edge-TTS fallback also failed (${edgeErr.message}) → browser TTS`);
        return res.status(503).json({
          error: 'All TTS providers unavailable',
          fallback: 'browser',
          message: 'Use browser speechSynthesis as fallback',
        });
      }
    }


    // ── Stream audio back to client ──────────────────────────────────────
    res.setHeader('Content-Type',  'audio/mpeg');
    res.setHeader('X-TTS-Provider', provider);
    res.setHeader('Cache-Control', 'no-cache');

    if (provider === 'elevenlabs') {
      const reader = audioResponse.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) { res.end(); break; }
          res.write(value);
        }
      };
      await pump();
    } else if (provider === 'edge') {
      const stream = fs.createReadStream(audioResponse);
      stream.pipe(res);
      stream.on('end', () => {
        try { fs.unlinkSync(audioResponse); } catch (e) {}
      });
      stream.on('error', (err) => {
        console.error('[TTS Stream Error]', err.message);
        try { fs.unlinkSync(audioResponse); } catch (e) {}
      });
    }

  } catch (err) {
    console.error('[TTS] Unexpected error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/tts/voices — list available configured voices ────────────────
router.get('/voices', authenticate, (req, res) => {
  const voices = Object.entries(VOICE_CONFIG).map(([role, cfg]) => ({
    role,
    label:      cfg.label,
    elevenlabs: cfg.elevenlabs,
    edge:       cfg.edge,
  }));
  const hasElevenLabs = !!(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_API_KEY !== 'your_elevenlabs_api_key_here');
  const hasEdge       = true;
  res.json({ voices, hasElevenLabs, hasEdge });
});

module.exports = router;
