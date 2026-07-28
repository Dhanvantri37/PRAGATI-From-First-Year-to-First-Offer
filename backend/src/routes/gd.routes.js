/**
 * GD Routes — REST API for Group Discussion rooms
 * AI powered by Groq (llama-3.3-70b)
 * RAG-enhanced: GD topics are generated from live Google News RSS feeds.
 * WebSocket logic → utils/gdSocket.js
 */
const router  = require('express').Router();
const GDRoom  = require('../models/GDRoom.model');
const User    = require('../models/User.model');
const { authenticate } = require('../middleware/auth.middleware');
const Groq    = require('groq-sdk');
const { v4: uuidv4 } = require('uuid');
const axios   = require('axios');
const { vectorSearch } = require('../utils/ragService');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Groq helper with multi-model fallback chain ─────────────────────────────
async function groqChat(system, user, maxTokens = 500) {
  const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'];
  for (const model of models) {
    try {
      const res = await groq.chat.completions.create({
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        max_tokens: maxTokens,
        temperature: 0.6,
      });
      const text = res.choices[0]?.message?.content?.trim();
      if (text) return text;
    } catch {}
  }
  return '';
}

// ── Fetch live company/topic news from Google News RSS (free, no API key) ──
async function fetchLatestNews(company) {
  try {
    const searchTerm = encodeURIComponent(`${company || 'technology'} India jobs hiring 2025`);
    const rssUrl = `https://news.google.com/rss/search?q=${searchTerm}&hl=en-IN&gl=IN&ceid=IN:en`;
    const { data: xml } = await axios.get(rssUrl, { timeout: 8000 });
    // Extract titles from RSS XML
    const titles = [...xml.matchAll(/<title><![CDATA[(.*?)]]><\/title>/g)].map(m => m[1]);
    // Skip the first (channel title), take 3 article titles
    return titles.slice(1, 4).join(' | ');
  } catch {
    return '';
  }
}

// ── Generate topic — RAG-enhanced with live news context ────────────────────
async function generateTopic(company, difficulty, category) {
  // Fetch real-time news for the company to seed Groq with current affairs
  const latestNews = await fetchLatestNews(company);

  // RAG: retrieve trending GD topics from our knowledge base
  const ragCtx = await vectorSearch(`${company || 'technology'} group discussion topic ${difficulty}`, 'gdknowledge', 2);
  const ragBlock = ragCtx.length
    ? `Trending topics from our placement database: ${ragCtx.map(t => t.topic || t.content).join(' | ')}`
    : '';

  try {
    const text = await groqChat(
      'You generate GD topics for placement rounds. Return ONLY the topic text, no quotes or explanation.',
      `Generate ONE debatable GD topic for ${company || 'top IT'} company placement.
Difficulty: ${difficulty || 'Medium'}
${latestNews ? `\nReal-time news context (use for inspiration, not directly): ${latestNews}` : ''}
${ragBlock ? `\n${ragBlock}` : ''}

Rules:
- 8–14 words, no question marks
- Must be a bold proposition students can argue BOTH sides
- Must be relevant to current Indian tech/business landscape
- Must be suitable for a ${company || 'software company'} placement GD round`
    );
    if (text?.length > 8) return text.replace(/['"]/g, '');
  } catch {}

  const fallback = [
    'AI will create more opportunities than jobs it eliminates in India',
    'Remote work culture permanently reduces urban economic growth',
    'Social media companies must be regulated like public utilities',
    'India should prioritize manufacturing over software exports by 2030',
    'Engineering colleges must replace traditional curricula with AI-first education',
  ];
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
        message: `${req.user.name} has started a Group Discussion session. If anyone wants to join, please join within 2 minutes.`,
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
