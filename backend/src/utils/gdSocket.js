/**
 * GD WebSocket — Upgraded with:
 *  • Groq AI (llama-3.3-70b) for all AI decisions
 *  • Groq TTS (playai-tts) for AI voice responses
 *  • WebRTC signaling for Google Meet-style video
 *  • Session persistence (rejoin after refresh)
 *  • 2-minute wait timer → AI auto-joins as moderator
 *  • Real-time topic monitoring & off-topic alerts
 *  • AI opens, guides, monitors, and concludes the GD
 *  • Notification broadcast on room creation
 *  • Per-participant 7-dimension AI evaluation
 */

const Groq = require('groq-sdk');
const { VOICE_CONFIG } = require('../config/voiceConfig');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── AI Moderator identity ──────────────────────────────────────────────────
const AI_MODERATOR = { id: 'ai-moderator', name: 'PRAGATI AI Moderator' };

// ── AI Participant personas with avatars ───────────────────────────────────
const AI_PERSONAS = [
  { name: 'Arjun AI', avatarUrl: '/arjun_sharma.png' },
  { name: 'Priya AI', avatarUrl: '/priya_mehta.png' },
  { name: 'Vikram AI', avatarUrl: '/vikram_nair.png' },
  { name: 'Neha AI',   avatarUrl: '/priya_mehta.png' },
  { name: 'Rohan AI',  avatarUrl: '/arjun_sharma.png' },
];

function getAIParticipant(usedNames = []) {
  const available = AI_PERSONAS.filter(p => !usedNames.includes(p.name));
  const picked = available.length > 0
    ? available[Math.floor(Math.random() * available.length)]
    : AI_PERSONAS[0];
  return {
    userId: `ai-${picked.name.split(' ')[0].toLowerCase()}`,
    name: picked.name,
    isAI: true,
    isParticipant: true,
    avatarUrl: picked.avatarUrl,
    speakingTime: 0, wordCount: 0, fillerWords: 0, interruptions: 0,
  };
}

// ── Groq text generation with multi-model rate-limit fallback ───────────────
async function groqChat(systemPrompt, userMessage, maxTokens = 300) {
  const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'];
  for (const model of models) {
    try {
      const res = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userMessage },
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      });
      const text = res.choices[0]?.message?.content?.trim();
      if (text) return text;
    } catch (err) {
      console.warn(`[groqChat] Model ${model} failed (${err.message}). Trying fallback model...`);
    }
  }
  return '';
}


// ── Voice config selector mapping names to roles ───────────────────────────
function getVoiceConfigForSpeaker(name, isParticipant) {
  const lower = (name || '').toLowerCase();
  if (!isParticipant) {
    return VOICE_CONFIG.moderator_female;
  }
  if (lower.includes('priya')) {
    return VOICE_CONFIG.candidate_female_1;
  }
  if (lower.includes('neha')) {
    return VOICE_CONFIG.candidate_female_2;
  }
  if (lower.includes('arjun') || lower.includes('rohan')) {
    return VOICE_CONFIG.candidate_male_1;
  }
  if (lower.includes('vikram')) {
    return VOICE_CONFIG.candidate_male_2;
  }
  return VOICE_CONFIG.candidate_female_1;
}

// ── ElevenLabs TTS ──────────────────────────────────────────────────────────
async function speakElevenLabs(text, voiceId) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || apiKey === 'your_elevenlabs_api_key_here' || voiceId.startsWith('PASTE_')) {
    throw new Error('ElevenLabs not configured');
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.80,
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`ElevenLabs error: ${errBody}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer.toString('base64');
}

// ── Edge-TTS ───────────────────────────────────────────────────────────────
function speakEdge(text, voiceName) {
  return new Promise((resolve, reject) => {
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempFile = path.join(tempDir, `tts_gd_${Date.now()}_${Math.floor(Math.random() * 1000)}.mp3`);
    const escapedText = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const cmd = `python -m edge_tts --text "${escapedText}" --voice "${voiceName}" --write-media "${tempFile}"`;

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        if (fs.existsSync(tempFile)) {
          try { fs.unlinkSync(tempFile); } catch (e) {}
        }
        return reject(new Error(stderr || error.message));
      }
      if (!fs.existsSync(tempFile)) {
        return reject(new Error('Edge-TTS output not found'));
      }
      try {
        const buffer = fs.readFileSync(tempFile);
        fs.unlinkSync(tempFile);
        resolve(buffer.toString('base64'));
      } catch (err) {
        reject(err);
      }
    });
  });
}

// ── Groq TTS — returns base64 audio ───────────────────────────────────────
// Moderator voice: Celeste (clear, authoritative female — en-IN friendly)
// Participant voices: pool of 4 distinct voices so each AI sounds different
const AI_PARTICIPANT_VOICES = ['Fritz-PlayAI','Angelo-PlayAI','Atlas-PlayAI','Briggs-PlayAI'];

async function groqTTS(text, voice = 'Celeste-PlayAI') {
  try {
    const res = await groq.audio.speech.create({
      model: 'playai-tts',
      voice,
      input: text,
      response_format: 'mp3',
    });
    const buffer = Buffer.from(await res.arrayBuffer());
    return buffer.toString('base64');
  } catch (err) {
    console.error('[groqTTS]', err.message);
    return null;
  }
}

// Pick a stable voice for a given AI participant name so voice is consistent per AI
function voiceForAI(name) {
  const idx = name.charCodeAt(0) % AI_PARTICIPANT_VOICES.length;
  return AI_PARTICIPANT_VOICES[idx];
}

function mapParticipants(participants) {
  return participants.map(p => ({
    userId: p.userId,
    name: p.name,
    isAI: p.isAI || false,
    isMuted: p.isMuted || false,
    isCameraOff: p.isCameraOff || false,
    socketId: p.socketId || null,
    avatarUrl: p.avatarUrl || null,
  }));
}

// ── Groq STT — transcribe audio chunk ─────────────────────────────────────
async function groqSTT(audioBuffer, language = 'en') {
  try {
    const { File } = await import('node:buffer');
    const file = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });
    const res = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3-turbo',
      language,
      response_format: 'json',
    });
    return res.text || '';
  } catch (err) {
    console.error('[groqSTT]', err.message);
    return '';
  }
}

// ── Generate GD topic via Groq ─────────────────────────────────────────────
async function generateTopic(room) {
  const cats = {
    TCS:       ['Digital India','AI Automation','Cybersecurity','Cloud Ethics'],
    Infosys:   ['AI in Finance','Blockchain','Digital Transformation'],
    Wipro:     ['Climate Tech','EdTech','Healthcare AI'],
    Cognizant: ['Remote Work','Diversity in Tech','Open Source'],
    Capgemini: ['Smart Cities','EV Revolution','Data Privacy'],
    Accenture: ['ESG Business','Future of Work','Digital Health'],
  };
  const list = cats[room.companyContext] || ['AI & Society','Startup Culture','India@2047','Education Reform','Mental Health'];
  const cat  = list[Math.floor(Math.random() * list.length)];

  const text = await groqChat(
    'You are a placement GD topic generator. Return ONLY the topic, no quotes, no explanation.',
    `Generate ONE debatable Group Discussion topic for ${room.companyContext || 'a top IT'} company placement.\nCategory: ${cat}\nDifficulty: ${room.difficulty}\nRules: 8-14 words, no question marks, must be a statement/proposition.`
  );

  if (text && text.length > 10) return text.replace(/['"]/g, '');
  const fallback = ['AI will eliminate more jobs than it creates','India needs Universal Basic Income now','Social media regulation harms free speech','Remote work permanently changes urban economies'];
  return fallback[Math.floor(Math.random() * fallback.length)];
}

// ── Broadcast AI voice message ─────────────────────────────────────────────
// speaker: { id, name, isAI, isParticipant } — determines voice used
async function broadcastAIVoice(namespace, roomCode, text, type = 'moderation', speaker = null) {
  const sp = speaker || AI_MODERATOR;
  // Always emit text immediately
  namespace.to(roomCode).emit('ai-message', {
    userId:   sp.id,
    userName: sp.name,
    text,
    type,       // 'opening' | 'moderation' | 'warning' | 'conclusion' | 'guide' | 'participant'
    isAI: true,
    isParticipant: sp.isParticipant || false,
    ts: Date.now(),
  });

  const voiceCfg = getVoiceConfigForSpeaker(sp.name, sp.isParticipant || false);
  const ttsModel = sp.isParticipant ? voiceForAI(sp.name) : 'Celeste-PlayAI';

  // Cascading TTS: ElevenLabs → Edge-TTS → Browser WebSpeech
  let ttsPromise = speakElevenLabs(text, voiceCfg.elevenlabs)
    .catch(err => {
      return speakEdge(text, voiceCfg.edge);
    })
    .catch(() => null);

  ttsPromise.then(audioBase64 => {
    namespace.to(roomCode).emit('ai-voice', {
      audioBase64: audioBase64 || null,
      text,
      type,
      speakerId: sp.id,
      speakerName: sp.name,
      ttsVoice: voiceCfg.elevenlabs,
      isParticipant: sp.isParticipant || false
    });
  }).catch(() => {
    namespace.to(roomCode).emit('ai-voice', {
      audioBase64: null,
      text,
      type,
      speakerId: sp.id,
      speakerName: sp.name,
      ttsVoice: ttsModel,
      isParticipant: sp.isParticipant || false
    });
  });
}
// ── Check if a speech is off-topic ────────────────────────────────────────
async function checkTopicRelevance(topic, speech) {
  if (!speech || speech.length < 20) return { relevant: true, score: 80 };
  const reply = await groqChat(
    'You are a GD moderator. Respond ONLY with JSON.',
    `GD Topic: "${topic}"\nParticipant said: "${speech.slice(0, 300)}"\nRespond: {"relevant": true/false, "score": 0-100, "reason": "one short sentence"}`
  );
  try {
    return JSON.parse(reply.replace(/```json|```/g, ''));
  } catch {
    return { relevant: true, score: 70 };
  }
}

// ── Generate contextual AI moderator interjection ─────────────────────────
async function generateModeratorInterjection(topic, recentCaptions, type, roomParticipants = []) {
  const context = recentCaptions.slice(-5).map(c => `${c.userName}: ${c.text}`).join('\n');
  const humanNames = roomParticipants.filter(p => !p.isAI).map(p => p.name).join(', ') || 'participants';
  const allNames = roomParticipants.map(p => p.name).join(', ') || 'everyone';
  const firstName = roomParticipants.find(p => !p.isAI)?.name || 'everyone';

  const prompts = {
    opening:    `You are PRAGATI AI Moderator. Give a warm, professional GD opening (3-4 sentences). Welcome candidate(s) (${humanNames}) and AI participants, introduce the topic "${topic}", and invite ${firstName} to share initial thoughts. CRITICAL: Never use bracket placeholders like [Name]. Always use actual names: ${allNames}.`,
    off_topic:  `You are PRAGATI AI Moderator. The discussion has drifted. Recent exchanges:\n${context}\n\nPolitely redirect ${allNames} to topic "${topic}" in 1-2 sentences. Never use placeholders like [Name].`,
    guide:      `You are PRAGATI AI Moderator. The discussion is going well on topic "${topic}".\nRecent:\n${context}\n\nAdd a thought-provoking angle or question for ${allNames} (1-2 sentences). Never use placeholders like [Name].`,
    silence:    `You are PRAGATI AI Moderator. There's been silence in the GD on topic "${topic}". Gently prompt ${firstName} or other participants to contribute with a question (1 sentence). Never use placeholders like [Name].`,
    time_warn:  `You are PRAGATI AI Moderator. 90 seconds remain in the GD on "${topic}". Ask ${allNames} to start summarizing key points (1-2 sentences). Never use placeholders like [Name].`,
    conclusion: `You are PRAGATI AI Moderator. The GD on "${topic}" is ending. Deliver a warm conclusion (3-4 sentences): thank ${allNames}, summarize key themes, announce reports are generating. Never use placeholders like [Name].`,
  };

  let resText = await groqChat(
    'You are a professional, encouraging GD moderator. Speak directly using participants\' real names. Never output placeholders like [Name] or [Participant].',
    prompts[type] || prompts.guide,
    200
  );

  // Sanitizer cleanup: strip any rogue brackets or placeholders
  resText = resText
    .replace(/\[Name\]|\[Participant Name\]|\[Participant\]|\[Your Name\]|\[Candidate Name\]|\[Speaker Name\]/gi, firstName)
    .replace(/\[.*?\]/g, '');

  return resText;
}

// ── Generate contextual AI participant reply (turn-taking) ────────────────
async function generateAIParticipantReply(aiName, topic, conversationHistory, lastHumanSpeech, roomParticipants = []) {
  const context = conversationHistory
    .slice(-8)
    .map(c => `${c.userName}: ${c.text}`)
    .join('\n');

  const namesList = (roomParticipants || []).map(p => p.name).join(', ') || 'fellow candidates';
  const humanName = (roomParticipants || []).find(p => !p.isAI)?.name || 'my colleague';

  const prompt = `You are ${aiName}, a student participant in a campus placement GD.
GD Topic: "${topic}"
Other participants in the room: ${namesList}

Recent conversation:
${context}

Last speech by participant: "${lastHumanSpeech}"

Rules:
- Respond in 2-3 natural sentences building on what ${humanName} or others said.
- Use natural conversational language.
- CRITICAL: Never output bracket placeholders like [Name]. Address participants directly by name (${namesList}).
- Stay on topic: "${topic}".`;

  let resText = await groqChat(
    `You are ${aiName}, a student in a GD. Speak naturally using actual names. Never use bracket placeholders.`,
    prompt,
    150
  );

  resText = resText
    .replace(/\[Name\]|\[Participant Name\]|\[Participant\]|\[Your Name\]|\[Candidate Name\]|\[Speaker Name\]/gi, humanName)
    .replace(/\[.*?\]/g, '');

  return resText;
}

// ── AI participant reply cooldown tracker ─────────────────────────────────
const aiReplyCooldown = {}; // roomCode → timestamp of last AI reply

// ── Full AI evaluation per participant ────────────────────────────────────
async function evaluateParticipant(participant, topic, allParticipants) {
  const speech = (participant.transcript || []).map(t => t.text).join(' ').slice(0, 1000);
  const totalDuration = allParticipants.reduce((s, p) => s + (p.speakingTime || 0), 0) || 1;
  const participationRatio = Math.round((participant.speakingTime / totalDuration) * 100);

  const prompt = `You are a senior corporate HR evaluator assessing a GD participant for placement.

GD Topic: "${topic}"
Participant: ${participant.name}
Speaking Time: ${participant.speakingTime}s out of ${totalDuration}s total (${participationRatio}% of discussion)
Word Count: ${participant.wordCount}
Filler Words: ${participant.fillerWords}
Interruptions: ${participant.interruptions}
Off-topic remarks: ${participant.offTopicCount || 0}
Full Transcript: "${speech}"

Score each dimension 0-100:
- communication: clarity, vocabulary, sentence structure
- confidence: assertiveness, pace, conviction
- leadership: taking initiative, guiding discussion, summarizing
- participation: engagement level, relevance, unique ideas
- fluency: smoothness, minimal fillers, natural flow
- relevance: how on-topic their contributions were
- teamwork: listening, building on others' points, not dominating

Also provide:
- 3 specific strengths (short phrases, be specific to their speech)
- 3 specific improvements (actionable, short)
- 3-sentence behavioral summary (professional HR tone)
- detailed feedback paragraph (4-5 sentences, very specific)
- placement readiness: "Ready" | "Near Ready" | "Needs Practice"

Respond ONLY in this exact JSON (no markdown):
{"communication":N,"confidence":N,"leadership":N,"participation":N,"fluency":N,"relevance":N,"teamwork":N,"overall":N,"strengths":["s1","s2","s3"],"improvements":["i1","i2","i3"],"summary":"...","detailedFeedback":"...","placementReadiness":"..."}`;

  try {
    const text = await groqChat('You are an expert HR evaluator. Return ONLY valid JSON, no markdown.', prompt, 600);
    const scores = JSON.parse(text.replace(/```json|```/g, '').trim());
    scores.overall = Math.round(
      (scores.communication + scores.confidence + scores.leadership +
       scores.participation + scores.fluency + scores.relevance + scores.teamwork) / 7
    );
    return scores;
  } catch (err) {
    console.error('[evaluateParticipant]', err.message);
    const base = 45 + Math.floor(Math.random() * 30);
    return {
      communication: base, confidence: base - 5, leadership: base - 10,
      participation: base + 5, fluency: base, relevance: base + 3, teamwork: base - 3,
      overall: base,
      strengths: ['Active participant', 'Relevant contributions', 'Clear examples'],
      improvements: ['Reduce filler words', 'Speak more assertively', 'Engage with others\' points'],
      summary: 'Showed decent participation with relevant contributions. With focused practice, can become a strong GD performer. Leadership and confidence are areas for further development.',
      detailedFeedback: 'The participant engaged with the discussion topic and made several relevant points. Communication was generally clear though filler words reduced impact. More assertive participation would strengthen overall performance.',
      placementReadiness: 'Needs Practice',
    };
  }
}

// ── Evaluate all participants ──────────────────────────────────────────────
async function evaluateAll(GDRoom, roomCode) {
  try {
    const room = await GDRoom.findOne({ roomCode });
    if (!room) return;
    for (let i = 0; i < room.participants.length; i++) {
      const p = room.participants[i];
      if (p.isAI) continue;
      room.participants[i].aiScore = await evaluateParticipant(p, room.topic, room.participants);
    }
    await room.save();
    return room;
  } catch (err) {
    console.error('[evaluateAll]', err.message);
  }
}

// ── Main socket registration ───────────────────────────────────────────────
function registerGDSocket(io, GDRoom) {
  const gdIO   = io.of('/gd');
  const mainIO = io;           // for cross-namespace notifications
  const timers = {};           // roomCode → various timer ids
  const recentCaptions = {};   // roomCode → last N captions array
  const silenceTimers = {};    // roomCode → silence detection timer

  gdIO.on('connection', socket => {
    console.log('[GD] socket connected:', socket.id);

    // ── JOIN ROOM ──────────────────────────────────────────────────────────
    socket.on('join-room', async ({ roomCode, userId, userName }) => {
      try {
        const room = await GDRoom.findOne({ roomCode });
        if (!room) { socket.emit('error', 'Room not found'); return; }

        // Session persistence — if room is active/locked and user was a prior participant, let them back in
        const wasParticipant = room.sessionParticipants?.some(sp => sp.userId?.toString() === userId);
        const isActiveSession = ['locked','prep','active'].includes(room.state);

        if (isActiveSession && !wasParticipant) {
          socket.emit('room-locked', { message: 'Group Discussion has already started. Please wait for the next session.' });
          return;
        }
        if (room.state === 'completed') {
          socket.emit('room-locked', { message: 'This session has ended. Please join a new room.' });
          return;
        }
        if (!isActiveSession && room.participants.length >= room.maxParticipants) {
          socket.emit('room-full', { message: 'Room is full.' }); return;
        }

        // Upsert participant
        const existing = room.participants.find(p => p.userId?.toString() === userId);
        if (!existing) {
          room.participants.push({ userId, name: userName, socketId: socket.id, isAI: false });
          // Track in session persistence list
          if (!room.sessionParticipants) room.sessionParticipants = [];
          if (!wasParticipant) room.sessionParticipants.push({ userId, name: userName, joinedAt: new Date() });
        } else {
          existing.socketId = socket.id;
        }
        await room.save();

        socket.join(roomCode);
        socket.data = { roomCode, userId, userName };

        // Init caption cache
        if (!recentCaptions[roomCode]) recentCaptions[roomCode] = [];

        const parts = mapParticipants(room.participants);

        // Emit joined state — includes current topic/state so rejoin works
        socket.emit('joined', {
          roomCode, state: room.state, participants: parts,
          topic: ['locked','prep','active'].includes(room.state) ? room.topic : undefined,
          prepSecondsLeft: room.state === 'prep' ? room.prepSeconds : undefined,
          durationSeconds: room.durationSeconds,
        });

        gdIO.to(roomCode).emit('participant-update', {
          participants: parts, count: room.participants.length,
          required: room.minParticipants, max: room.maxParticipants, state: room.state,
        });

        // Check if we've hit minimum — start 2-minute wait timer or lock
        const humanCount = room.participants.filter(p => !p.isAI).length;
        if (room.state === 'waiting') {
          if (humanCount >= room.minParticipants) {
            // Enough humans — lock immediately
            clearTimeout(timers[`wait_${roomCode}`]);
            await doLock(room, roomCode, gdIO, GDRoom, timers, silenceTimers, recentCaptions);
          } else if (humanCount === 1 && !room.waitTimerStarted) {
            // First human joined — start 2-min timer
            room.waitTimerStarted = new Date();
            await room.save();
            const waitMs = 2 * 60 * 1000; // 2 minutes
            gdIO.to(roomCode).emit('wait-timer-started', {
              message: `Waiting for more participants. AI will join in 2 minutes if minimum not reached.`,
              waitSeconds: 120,
            });
            timers[`wait_${roomCode}`] = setTimeout(async () => {
              const freshRoom = await GDRoom.findOne({ roomCode });
              if (!freshRoom || freshRoom.state !== 'waiting') return;
              // AI auto-joins as participant/moderator
              const aiNeeded = freshRoom.minParticipants - freshRoom.participants.filter(p => !p.isAI).length;
              const AI_PERSONAS = [
                { name: 'Arjun AI', avatarUrl: '/arjun_sharma.png' },
                { name: 'Priya AI', avatarUrl: '/priya_mehta.png' },
                { name: 'Vikram AI', avatarUrl: '/vikram_nair.png' }
              ];
              for (let i = 0; i < Math.max(aiNeeded, 1); i++) {
                const persona = AI_PERSONAS[i % AI_PERSONAS.length];
                freshRoom.participants.push({
                  name: persona.name, isAI: true,
                  avatarUrl: persona.avatarUrl,
                  speakingTime: 0, wordCount: 0,
                });
              }
              await freshRoom.save();
              gdIO.to(roomCode).emit('ai-joined', {
                message: 'Minimum participants not reached. AI participants have joined to start the discussion.',
                participants: mapParticipants(freshRoom.participants),
              });
              await doLock(freshRoom, roomCode, gdIO, GDRoom, timers, silenceTimers, recentCaptions);
            }, waitMs);
          }
        }
      } catch (err) { console.error('[join-room]', err.message); socket.emit('error', err.message); }
    });

    // ── WebRTC SIGNALING ───────────────────────────────────────────────────
    socket.on('webrtc-offer', ({ roomCode, toSocketId, offer, fromSocketId }) => {
      gdIO.to(toSocketId).emit('webrtc-offer', { offer, fromSocketId });
    });
    socket.on('webrtc-answer', ({ roomCode, toSocketId, answer, fromSocketId }) => {
      gdIO.to(toSocketId).emit('webrtc-answer', { answer, fromSocketId });
    });
    socket.on('webrtc-ice', ({ roomCode, toSocketId, candidate, fromSocketId }) => {
      gdIO.to(toSocketId).emit('webrtc-ice', { candidate, fromSocketId });
    });
    // Announce peer presence to room (for P2P mesh)
    socket.on('webrtc-ready', async ({ roomCode, userId }) => {
      socket.to(roomCode).emit('webrtc-peer-joined', { socketId: socket.id, userId });
    });

    // ── MEDIA STATUS ───────────────────────────────────────────────────────
    socket.on('media-status', async ({ roomCode, userId, isMuted, isCameraOff }) => {
      try {
        const room = await GDRoom.findOne({ roomCode });
        if (!room) return;
        const p = room.participants.find(p => p.userId?.toString() === userId);
        if (p) {
          if (isMuted !== undefined) p.isMuted = isMuted;
          if (isCameraOff !== undefined) p.isCameraOff = isCameraOff;
          await room.save();
        }
        gdIO.to(roomCode).emit('participant-media-update', { userId, isMuted, isCameraOff });
      } catch {}
    });

    // ── ACTIVE SPEAKER ─────────────────────────────────────────────────────
    socket.on('active-speaker', ({ roomCode, userId, speaking }) => {
      gdIO.to(roomCode).emit('active-speaker-update', { userId, speaking });
    });

    // ── SPEECH UPDATE (STT text from browser or server Whisper) ───────────
    socket.on('speech-update', async ({ roomCode, userId, text, delta }) => {
      try {
        const room = await GDRoom.findOne({ roomCode });
        if (!room || room.state !== 'active') return;
        const p = room.participants.find(p => p.userId?.toString() === userId);
        if (!p || !text) return;

        p.speakingTime += (delta?.speakingTime || 0);
        p.wordCount    += (delta?.wordCount || 0);
        p.fillerWords  += (delta?.fillerWords || 0);

        // Topic relevance check (async, non-blocking)
        checkTopicRelevance(room.topic, text).then(async rel => {
          if (!rel.relevant && rel.score < 40) {
            const freshRoom = await GDRoom.findOne({ roomCode });
            if (!freshRoom) return;
            const fp = freshRoom.participants.find(p => p.userId?.toString() === userId);
            if (fp) { fp.offTopicCount = (fp.offTopicCount || 0) + 1; }
            fp?.transcript?.push({ time: Date.now(), text, isOffTopic: true });
            await freshRoom.save();
          } else {
            const fp = (await GDRoom.findOne({ roomCode }))?.participants.find(p => p.userId?.toString() === userId);
            if (fp) {
              fp.topicRelevanceScore = Math.round(((fp.topicRelevanceScore || 70) + rel.score) / 2);
              fp.transcript.push({ time: Date.now(), text, isOffTopic: false });
              await (await GDRoom.findOne({ roomCode }))?.save().catch(() => {});
            }
          }
        });

        await room.save();

        // Broadcast caption
        const caption = { userId, userName: p.name, text, isAI: false, ts: Date.now() };
        gdIO.to(roomCode).emit('caption', caption);
        recentCaptions[roomCode] = [...(recentCaptions[roomCode] || []).slice(-20), caption];

        // ── AI Participant contextual reply ────────────────────────────────
        // Trigger after human speaks — AI participant responds naturally
        // Cooldown: only 5 seconds between AI replies to keep discussion lively
        const now = Date.now();
        const lastReply = aiReplyCooldown[roomCode] || 0;
        const cooldownMs = 5000;

        if (now - lastReply > cooldownMs) {
          const aiParticipants = room.participants.filter(p => p.isAI && !p.name.includes('Moderator'));
          if (aiParticipants.length > 0) {
            aiReplyCooldown[roomCode] = now;
            // Pick a random AI participant to reply
            const aiPart = aiParticipants[Math.floor(Math.random() * aiParticipants.length)];
            // Natural thinking delay: 1-2.5 seconds
            const thinkDelay = 1000 + Math.floor(Math.random() * 1500);
            setTimeout(async () => {
              try {
                const freshRoom = await GDRoom.findOne({ roomCode });
                if (!freshRoom || freshRoom.state !== 'active') return;
                const reply = await generateAIParticipantReply(
                  aiPart.name,
                  freshRoom.topic,
                  recentCaptions[roomCode] || [],
                  text,
                  freshRoom.participants
                );
                if (reply && reply.trim().length > 10) {
                  const aiCaption = {
                    userId: `ai-${aiPart.name}`,
                    userName: aiPart.name,
                    text: reply.trim(),
                    isAI: true,
                    type: 'participant',
                    ts: Date.now(),
                  };
                  gdIO.to(roomCode).emit('caption', aiCaption);
                  gdIO.to(roomCode).emit('ai-message', { ...aiCaption });
                  recentCaptions[roomCode] = [...(recentCaptions[roomCode] || []).slice(-20), aiCaption];
                  // Speak the reply
                  broadcastAIVoice(gdIO, roomCode, reply.trim(), 'participant', { id: `ai-${aiPart.name}`, name: aiPart.name, isAI: true, isParticipant: true });
                }
              } catch (err) { console.error('[aiParticipantReply]', err.message); }
            }, thinkDelay);
          }
        }

        // Reset silence timer
        resetSilenceTimer(roomCode, room.topic, gdIO, GDRoom, timers, silenceTimers, recentCaptions);

      } catch (err) { console.error('[speech-update]', err.message); }
    });

    // ── AUDIO CHUNK → server-side Whisper STT ─────────────────────────────
    socket.on('audio-chunk', async ({ roomCode, userId, audioBuffer, language }) => {
      try {
        const room = await GDRoom.findOne({ roomCode });
        if (!room || room.state !== 'active') return;
        const text = await groqSTT(Buffer.from(audioBuffer), language || 'en');
        if (text && text.trim().length > 3) {
          socket.emit('stt-result', { text, userId });
          // Re-emit as speech-update so same pipeline handles it
          socket.emit('forward-speech', { roomCode, userId, text });
        }
      } catch {}
    });

    // ── INTERRUPT ──────────────────────────────────────────────────────────
    socket.on('interrupt', async ({ roomCode, userId }) => {
      try {
        const room = await GDRoom.findOne({ roomCode });
        if (!room) return;
        const p = room.participants.find(p => p.userId?.toString() === userId);
        if (p) { p.interruptions += 1; await room.save(); }
      } catch {}
    });

    // ── INTERRUPT AI ───────────────────────────────────────────────────────
    socket.on('interrupt-ai', ({ roomCode, userId }) => {
      gdIO.to(roomCode).emit('ai-interrupted', { userId });
    });

    // ── CHAT MESSAGE (text fallback) ───────────────────────────────────────
    socket.on('chat-message', ({ roomCode, userId, userName, text }) => {
      gdIO.to(roomCode).emit('chat-message', { userId, userName, text, ts: Date.now() });
    });

    // ── MANUAL END ─────────────────────────────────────────────────────────
    socket.on('end-session', async ({ roomCode }) => {
      await doEnd(roomCode, gdIO, GDRoom, timers, silenceTimers);
    });

    // ── DISCONNECT ─────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      const { roomCode, userId } = socket.data || {};
      if (!roomCode) return;
      try {
        const room = await GDRoom.findOne({ roomCode });
        if (!room) return;
        const p = room.participants.find(p => p.userId?.toString() === userId);
        if (p) p.socketId = null;
        await room.save();
        // Don't remove from participants — session persistence
        gdIO.to(roomCode).emit('participant-disconnected', {
          userId, userName: p?.name,
          message: `${p?.name || 'A participant'} temporarily disconnected.`,
        });
      } catch {}
    });
  });

  return gdIO;
}

// ── SILENCE DETECTION ─────────────────────────────────────────────────────
function resetSilenceTimer(roomCode, topic, namespace, GDRoom, timers, silenceTimers, recentCaptions) {
  clearTimeout(silenceTimers[roomCode]);
  silenceTimers[roomCode] = setTimeout(async () => {
    const room = await GDRoom.findOne({ roomCode });
    if (!room || room.state !== 'active') return;
    
    // Have an AI participant speak instead of the moderator
    const aiParticipants = room.participants.filter(p => p.isAI && !p.name.includes('Moderator'));
    if (aiParticipants.length > 0) {
      const aiPart = aiParticipants[Math.floor(Math.random() * aiParticipants.length)];
      try {
        const reply = await generateAIParticipantReply(
          aiPart.name,
          room.topic,
          recentCaptions[roomCode] || [],
          "[Silence in the room. Introduce a new strong point or question to restart the discussion.]",
          room.participants
        );
        if (reply && reply.trim().length > 10) {
          const aiCaption = {
            userId: `ai-${aiPart.name}`,
            userName: aiPart.name,
            text: reply.trim(),
            isAI: true,
            type: 'participant',
            ts: Date.now(),
          };
          namespace.to(roomCode).emit('caption', aiCaption);
          namespace.to(roomCode).emit('ai-message', { ...aiCaption });
          recentCaptions[roomCode] = [...(recentCaptions[roomCode] || []).slice(-20), aiCaption];
          broadcastAIVoice(namespace, roomCode, reply.trim(), 'participant', { id: `ai-${aiPart.name}`, name: aiPart.name, isAI: true, isParticipant: true });
        }
      } catch (err) { console.error('[aiParticipantSilenceReply]', err.message); }
    } else {
      try {
        const reply = await generateModeratorInterjection(room.topic, recentCaptions[roomCode] || [], 'interjection');
        if (reply && reply.trim().length > 10) {
          const aiCaption = {
            userId: 'moderator',
            userName: AI_MODERATOR.name,
            text: reply.trim(),
            isAI: true,
            type: 'moderator',
            ts: Date.now(),
          };
          namespace.to(roomCode).emit('caption', aiCaption);
          recentCaptions[roomCode] = [...(recentCaptions[roomCode] || []).slice(-20), aiCaption];
          broadcastAIVoice(namespace, roomCode, reply.trim(), 'moderator', { id: 'moderator', name: AI_MODERATOR.name, isAI: true });
        }
      } catch (err) { console.error('[moderatorSilenceReply]', err.message); }
    }
  }, 6000); // 6 seconds of silence triggers an AI or Moderator to speak
}

// ── LOCK & START ───────────────────────────────────────────────────────────
async function doLock(room, roomCode, namespace, GDRoom, timers, silenceTimers, recentCaptions) {
  try {
    // Ensure AI participants are added so single-user rooms immediately have AI conversation partners
    const aiCount = room.participants.filter(p => p.isAI).length;
    if (aiCount < 2) {
      const AI_PERSONAS = [
        { name: 'Arjun AI', avatarUrl: '/arjun_sharma.png' },
        { name: 'Priya AI', avatarUrl: '/priya_mehta.png' },
        { name: 'Vikram AI', avatarUrl: '/vikram_nair.png' }
      ];
      const usedNames = room.participants.map(p => p.name);
      const available = AI_PERSONAS.filter(p => !usedNames.includes(p.name));
      for (let i = 0; i < Math.min(2, available.length); i++) {
        const persona = available[i];
        room.participants.push({
          name: persona.name, isAI: true,
          avatarUrl: persona.avatarUrl,
          speakingTime: 0, wordCount: 0,
        });
      }
    }

    const topic = await generateTopic(room);
    room.topic    = topic;
    room.state    = 'locked';
    room.lockedAt = new Date();
    await room.save();

    namespace.to(roomCode).emit('room-locked-announce', {
      message: 'The Group Discussion session is now locked.',
      participants: mapParticipants(room.participants),
    });

    // PREP phase
    room.state = 'prep';
    await room.save();

    const prepMsg = await generateModeratorInterjection(topic, [], 'opening', room.participants);
    namespace.to(roomCode).emit('prep-phase', {
      duration: room.prepSeconds, topic,
      message: `You have ${room.prepSeconds} seconds to prepare your thoughts.`,
    });

    // AI reads the opening during prep
    if (prepMsg) {
      setTimeout(() => broadcastAIVoice(namespace, roomCode, prepMsg, 'opening'), 2000);
    }

    const prepTimer = setTimeout(async () => {
      const r = await GDRoom.findOne({ roomCode });
      if (!r || r.state === 'completed') return;
      r.state     = 'active';
      r.startedAt = new Date();
      r.aiModerator.hasOpened = true;
      await r.save();

      namespace.to(roomCode).emit('discussion-start', {
        topic, duration: r.durationSeconds,
        message: `The topic is: "${topic}". You have ${Math.round(r.durationSeconds / 60)} minutes. Begin now.`,
      });

      // AI starts the discussion
      setTimeout(async () => {
        const openMsg = await generateModeratorInterjection(topic, [], 'opening', r.participants);
        if (openMsg) {
          await broadcastAIVoice(namespace, roomCode, openMsg, 'opening');
          if (!recentCaptions[roomCode]) recentCaptions[roomCode] = [];
          recentCaptions[roomCode].push({ userName: AI_MODERATOR.name, text: openMsg, isAI: true, ts: Date.now() });
        }
      }, 4000);

      // Moderator does not speak in the middle anymore, only at start and end.
      
      // Reset silence timer to allow AI participants to initiate if nobody speaks at the start
      resetSilenceTimer(roomCode, topic, namespace, GDRoom, timers, silenceTimers, recentCaptions);

      // 60-second warning
      const warnDelay = Math.max((r.durationSeconds - 60) * 1000, 0);
      setTimeout(async () => {
        const fr = await GDRoom.findOne({ roomCode });
        if (!fr || fr.state !== 'active') return;
        const warnMsg = await generateModeratorInterjection(topic, recentCaptions[roomCode] || [], 'time_warn', fr.participants);
        if (warnMsg) {
          await broadcastAIVoice(namespace, roomCode, warnMsg, 'warning');
          recentCaptions[roomCode] = [...(recentCaptions[roomCode] || []).slice(-10),
            { userName: AI_MODERATOR.name, text: warnMsg, isAI: true, ts: Date.now() }];
        }
        namespace.to(roomCode).emit('time-warning', { secondsLeft: 60 });
      }, warnDelay);

      // Auto-end
      const endTimer = setTimeout(() => doEnd(roomCode, namespace, GDRoom, timers, {}), r.durationSeconds * 1000);
      timers[roomCode] = endTimer;

    }, room.prepSeconds * 1000);
    timers[`prep_${roomCode}`] = prepTimer;

  } catch (err) { console.error('[doLock]', err.message); }
}

// ── END SESSION ────────────────────────────────────────────────────────────
async function doEnd(roomCode, namespace, GDRoom, timers, silenceTimers) {
  try {
    if (timers[roomCode]) { clearTimeout(timers[roomCode]); delete timers[roomCode]; }
    if (silenceTimers[roomCode]) { clearTimeout(silenceTimers[roomCode]); delete silenceTimers[roomCode]; }

    const room = await GDRoom.findOne({ roomCode });
    if (!room || room.state === 'completed') return;
    room.state   = 'completed';
    room.endedAt = new Date();
    room.aiModerator.hasConcluded = true;
    await room.save();

    // AI conclusion
    const conclusionMsg = await generateModeratorInterjection(room.topic, [], 'conclusion');
    if (conclusionMsg) {
      await broadcastAIVoice(namespace, roomCode, conclusionMsg, 'conclusion');
    }

    namespace.to(roomCode).emit('session-ended', {
      message: 'Session ended. Generating personalised AI evaluation reports…', roomCode,
    });

    // Evaluate all — takes a few seconds
    setTimeout(async () => {
      const evaluated = await evaluateAll(GDRoom, roomCode);
      if (evaluated) {
        namespace.to(roomCode).emit('evaluation-ready', {
          roomCode,
          participants: evaluated.participants.map(p => ({
            userId: p.userId, name: p.name, isAI: p.isAI, aiScore: p.aiScore,
            speakingTime: p.speakingTime, wordCount: p.wordCount,
            fillerWords: p.fillerWords, interruptions: p.interruptions,
            offTopicCount: p.offTopicCount,
          })),
        });
      }
    }, 3000);

  } catch (err) { console.error('[doEnd]', err.message); }
}

module.exports = { registerGDSocket, evaluateParticipant };
