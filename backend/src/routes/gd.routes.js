/**
 * GD Routes — REST API for Group Discussion rooms
 * AI powered by Groq (llama-3.3-70b)
 * WebSocket logic → utils/gdSocket.js
 */
const router  = require('express').Router();
const GDRoom  = require('../models/GDRoom.model');
const User    = require('../models/User.model');
const { authenticate } = require('../middleware/auth.middleware');
const Groq    = require('groq-sdk');
const { v4: uuidv4 } = require('uuid');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Groq helper ───────────────────────────────────────────────────────────
async function groqChat(system, user, maxTokens = 500) {
  const res = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    max_tokens: maxTokens,
    temperature: 0.6,
  });
  return res.choices[0]?.message?.content?.trim() || '';
}

// ── Generate topic ─────────────────────────────────────────────────────────
async function generateTopic(company, difficulty, category) {
  const cats = {
    TCS: ['Digital India','AI Automation','Cybersecurity','Cloud Ethics'],
    Infosys: ['AI in Finance','Blockchain','Digital Transformation'],
    Wipro: ['Climate Tech','EdTech','Healthcare AI'],
    Cognizant: ['Remote Work','Diversity in Tech','Open Source'],
    Capgemini: ['Smart Cities','EV Revolution','Data Privacy'],
    Accenture: ['ESG Business','Future of Work','Digital Health'],
    default: ['AI & Society','Startup Culture','India@2047','Education Reform','Mental Health'],
  };
  const list = cats[company] || cats.default;
  const cat  = category || list[Math.floor(Math.random() * list.length)];
  try {
    const text = await groqChat(
      'You generate GD topics. Return ONLY the topic text, no quotes or explanation.',
      `Generate ONE debatable GD topic for ${company || 'top IT'} company placement.\nCategory: ${cat}\nDifficulty: ${difficulty}\nRules: 8-14 words, no question marks, must be a proposition.`
    );
    if (text?.length > 8) return text.replace(/['"]/g, '');
  } catch {}
  const fallback = ['AI will eliminate more jobs than it creates','India needs Universal Basic Income now','Social media regulation harms free speech','Remote work permanently changes urban economies'];
  return fallback[Math.floor(Math.random() * fallback.length)];
}

// ── Full 7-dimension evaluation ────────────────────────────────────────────
async function evaluateParticipant(participant, topic, allParticipants) {
  const speech = (participant.transcript || []).map(t => t.text).join(' ').slice(0, 1000);
  const totalDuration = (allParticipants || []).reduce((s, p) => s + (p.speakingTime || 0), 0) || 1;
  const ratio = Math.round((participant.speakingTime / totalDuration) * 100);

  try {
    const text = await groqChat(
      'You are a senior HR evaluator. Return ONLY valid JSON, no markdown, no extra text.',
      `GD Topic: "${topic}"
Participant: ${participant.name}
Speaking Time: ${participant.speakingTime}s (${ratio}% of total)
Words: ${participant.wordCount} | Fillers: ${participant.fillerWords} | Interruptions: ${participant.interruptions}
Off-topic remarks: ${participant.offTopicCount || 0}
Transcript: "${speech}"

Score 0-100 each: communication, confidence, leadership, participation, fluency, relevance, teamwork.
Provide: 3 strengths (short phrases), 3 improvements (actionable), summary (3 sentences), detailedFeedback (4 sentences), placementReadiness ("Ready"|"Near Ready"|"Needs Practice").
JSON format: {"communication":N,"confidence":N,"leadership":N,"participation":N,"fluency":N,"relevance":N,"teamwork":N,"overall":N,"strengths":["","",""],"improvements":["","",""],"summary":"","detailedFeedback":"","placementReadiness":""}`,
      700
    );
    const scores = JSON.parse(text.replace(/```json|```/g, '').trim());
    scores.overall = Math.round(
      (scores.communication + scores.confidence + scores.leadership +
       scores.participation + scores.fluency + scores.relevance + scores.teamwork) / 7
    );
    return scores;
  } catch {
    const base = 50 + Math.floor(Math.random() * 25);
    return {
      communication: base, confidence: base - 5, leadership: base - 10,
      participation: base + 5, fluency: base, relevance: base + 3, teamwork: base,
      overall: base,
      strengths: ['Active participant', 'Relevant contributions', 'Clear examples'],
      improvements: ['Reduce filler words', 'Speak more assertively', 'Engage others\' points'],
      summary: 'Showed decent participation. With focused practice, can become a strong GD performer.',
      detailedFeedback: 'The participant engaged with the discussion and made relevant points. Communication was clear with room for improvement in confidence and leadership.',
      placementReadiness: 'Needs Practice',
    };
  }
}

// ── POST /api/gd/rooms — create room ──────────────────────────────────────
router.post('/rooms', authenticate, async (req, res) => {
  try {
    const { company, difficulty, minParticipants, maxParticipants, durationSeconds, language, isPrivate } = req.body;
    const roomCode = uuidv4().slice(0, 8).toUpperCase();
    const room = await GDRoom.create({
      roomCode,
      companyContext:  company || '',
      difficulty:      difficulty || 'Medium',
      language:        language || 'English',
      minParticipants: Math.max(2, Math.min(8, minParticipants || 3)),
      maxParticipants: Math.max(2, Math.min(8, maxParticipants || 5)),
      durationSeconds: durationSeconds || 600,
      isPrivate:       isPrivate || false,
      createdBy:       req.user._id,
    });

    // Broadcast real-time notification via main Socket.IO namespace
    // The app's main io instance should be attached to req.app
    const io = req.app.get('io');
    if (io) {
      io.emit('gd-room-created', {
        roomCode: room.roomCode,
        company:  room.companyContext,
        difficulty: room.difficulty,
        language: room.language,
        minParticipants: room.minParticipants,
        maxParticipants: room.maxParticipants,
        durationSeconds: room.durationSeconds,
        createdBy: req.user.name,
        message: `🎤 New GD session created by ${req.user.name}! Join with code: ${room.roomCode}`,
      });
    }

    res.status(201).json({ room });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ── GET /api/gd/rooms — list open rooms ───────────────────────────────────
router.get('/rooms', authenticate, async (req, res) => {
  try {
    const rooms = await GDRoom.find({
      state:     { $in: ['waiting'] },
      isPrivate: false,
      createdAt: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    })
      .select('roomCode companyContext difficulty language minParticipants maxParticipants participants state createdAt waitTimerStarted')
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ rooms });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/gd/rooms/:code — get room details ────────────────────────────
router.get('/rooms/:code', authenticate, async (req, res) => {
  try {
    const room = await GDRoom.findOne({ roomCode: req.params.code });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    const safeRoom = room.toObject();
    if (!['locked','prep','active','completed'].includes(safeRoom.state)) delete safeRoom.topic;
    res.json({ room: safeRoom });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/gd/rooms/:code/evaluate ─────────────────────────────────────
router.post('/rooms/:code/evaluate', authenticate, async (req, res) => {
  try {
    const room = await GDRoom.findOne({ roomCode: req.params.code });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.state !== 'completed') return res.status(400).json({ error: 'Room not yet completed' });
    for (let i = 0; i < room.participants.length; i++) {
      if (!room.participants[i].isAI) {
        room.participants[i].aiScore = await evaluateParticipant(room.participants[i], room.topic, room.participants);
      }
    }
    await room.save();
    res.json({ room });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/gd/rooms/:code/report/:userId ────────────────────────────────
router.get('/rooms/:code/report/:userId', authenticate, async (req, res) => {
  try {
    const room = await GDRoom.findOne({ roomCode: req.params.code });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    const participant = room.participants.find(p => p.userId?.toString() === req.params.userId);
    if (!participant) return res.status(404).json({ error: 'Participant not found' });
    res.json({ participant, topic: room.topic, roomCode: room.roomCode, duration: room.durationSeconds });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
module.exports.generateTopic = generateTopic;
module.exports.evaluateParticipant = evaluateParticipant;
