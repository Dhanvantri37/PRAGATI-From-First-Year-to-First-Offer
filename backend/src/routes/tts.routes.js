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
    const cmd = `python -m edge_tts --text "${escapedText}" --voice "${voiceName}" --write-media "${tempFile}"`;

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
    const { text, role = 'system_female' } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'text is required' });

    const cleanText = cleanForTTS(text);
    const voiceCfg  = VOICE_CONFIG[role] || VOICE_CONFIG['system_female'];

    let provider = 'none';
    let audioResponse = null;

    // ── Try ElevenLabs first ─────────────────────────────────────────────
    try {
      audioResponse = await speakElevenLabs(cleanText, voiceCfg.elevenlabs);
      provider = 'elevenlabs';
      console.log(`[TTS] ElevenLabs ✅ role=${role} chars=${cleanText.length}`);
    } catch (elErr) {
      console.warn(`[TTS] ElevenLabs failed (${elErr.message}), trying Edge-TTS...`);

      // ── Try Edge-TTS fallback ───────────────────────────────────────────
      try {
        audioResponse = await speakEdge(cleanText, voiceCfg.edge);
        provider = 'edge';
        console.log(`[TTS] Edge-TTS ✅ role=${role} voice=${voiceCfg.edge}`);
      } catch (edgeErr) {
        console.warn(`[TTS] Edge-TTS failed (${edgeErr.message}), falling back to browser TTS`);
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
