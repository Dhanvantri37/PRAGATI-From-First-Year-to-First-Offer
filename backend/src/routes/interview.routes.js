const router   = require('express').Router();
const axios    = require('axios');
const mongoose = require('mongoose');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { InterviewSession } = require('../models/index');
const { vectorSearch } = require('../utils/ragService');

// ─── InterviewQuestion schema (inline, light) ─────────────────────────────────
const interviewQuestionSchema = new mongoose.Schema({
  question:   { type: String, required: true },
  answer:     { type: String },
  role:       { type: String },
  subject:    { type: String },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  tags:       [String],
  // RAG field — 384-dim vector for semantic search
  embedding:  { type: [Number] },
}, { timestamps: true });

const InterviewQuestion = mongoose.models.InterviewQuestion ||
  mongoose.model('InterviewQuestion', interviewQuestionSchema);

// ─── Groq helper ─────────────────────────────────────────────────────────────
async function callGroq(prompt, maxTokens = 600) {
  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return null;
  try {
    const resp = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.5,
      },
      { headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' }, timeout: 25000 }
    );
    return resp.data?.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.warn('[Interview] Groq error:', err.response?.data?.error?.message || err.message);
    return null;
  }
}

// ─── GET /api/interview — with role/subject filters ──────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const { role, subject, difficulty, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role && role !== 'All') filter.role = role;
    if (subject && subject !== 'All') filter.subject = subject;
    if (difficulty && difficulty !== 'All') filter.difficulty = difficulty;
    if (search) filter.question = { $regex: search, $options: 'i' };
    const skip  = (Number(page) - 1) * Number(limit);
    const total = await InterviewQuestion.countDocuments(filter);
    const questions = await InterviewQuestion.find(filter)
      .sort({ role: 1, subject: 1 })
      .skip(skip)
      .limit(Number(limit))
      .select('-embedding'); // exclude vector from response
    res.json({ questions, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /api/interview/ai-answer — RAG-powered real model answer ────────────
router.post('/ai-answer', authenticate, async (req, res) => {
  try {
    const { question, role, subject } = req.body;
    if (!question) return res.status(400).json({ error: 'question required' });

    // 1. RAG: retrieve verified real interview answers from the knowledge base
    const ragQuery   = `${subject || ''} ${question}`.trim();
    const contexts   = await vectorSearch(ragQuery, 'interviewknowledge', 3);
    const contextBlock = contexts.length
      ? contexts.map(c => `Q: ${c.question || ''}\nA: ${c.answer || c.content || ''}`).join('\n\n---\n\n')
      : '';

    // 2. Also retrieve relevant alumni context (who cracked similar roles)
    const alumniCtx  = await vectorSearch(`${role || 'Software Engineer'} ${subject || ''}`, 'discoveredalumni', 2);
    const alumniNote = alumniCtx.length
      ? `KITCOEK alumni working in this domain: ${alumniCtx.map(a => `${a.name} at ${a.currentCompany}`).join(', ')}.`
      : '';

    // 3. Build RAG-enriched prompt
    const prompt = `You are an expert senior technical interviewer preparing a student for real placements.
${contextBlock ? `\nReal interview context retrieved from verified sources:\n${contextBlock}\n` : ''}
${alumniNote ? `\nRelevant alumni insight: ${alumniNote}\n` : ''}
Question: "${question}"
Role: ${role || 'Software Engineer'}  |  Subject: ${subject || 'General'}

Write a clear, factual model answer in 5–7 sentences:
1. Define the core concept precisely.
2. Give a concrete code example or real-world analogy.
3. Mention trade-offs, edge cases, or common mistakes.
4. Connect to why this is asked in ${role || 'software engineering'} interviews.
Be direct, technical, and accurate. Do NOT hallucinate.`;

    const answer = await callGroq(prompt, 600);

    // 4. Fallback if Groq is down
    if (!answer) {
      return res.json({
        answer: `To answer "${question}" effectively in a ${role || 'technical'} interview: (1) Define the core concept clearly, (2) Support with a real-world example or code snippet, (3) Mention trade-offs or limitations, (4) Relate it to your past experience or projects.`,
        source: 'fallback',
      });
    }

    res.json({ answer, source: contexts.length ? 'rag' : 'groq' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /api/interview/generate-questions — RAG-powered question set ─────────
// Generates a fresh set of real interview questions for a given role using RAG + Groq
router.post('/generate-questions', authenticate, async (req, res) => {
  try {
    const { role = 'Software Engineer', subject = 'General', difficulty = 'Medium', count = 5 } = req.body;

    // RAG: pull similar questions from verified bank
    const ragCtx  = await vectorSearch(`${role} ${subject} interview questions`, 'interviewknowledge', 5);
    const ragBlock = ragCtx.length
      ? `Reference real questions from our verified bank:\n${ragCtx.map(q => `- ${q.question}`).join('\n')}`
      : '';

    // Pull alumni context for that role
    const alumniCtx  = await vectorSearch(role, 'discoveredalumni', 2);
    const alumniNote = alumniCtx.length
      ? `Alumni from KITCOEK working in this role: ${alumniCtx.map(a => `${a.name} at ${a.currentCompany}`).join(', ')}.`
      : '';

    const prompt = `You are a senior technical interviewer at a top product company.
${ragBlock}
${alumniNote}

Generate exactly ${count} interview questions for:
Role: ${role} | Subject: ${subject} | Difficulty: ${difficulty}

Requirements:
- Include a mix of conceptual, coding, and scenario-based questions
- Questions must be real, specific, and actually asked in ${difficulty} interviews
- Include a one-line "expected answer hint" after each question

Return ONLY a JSON array:
[{"question": "...", "hint": "..."}, ...]
No markdown, no explanation.`;

    const raw = await callGroq(prompt, 800);
    let questions = [];

    try {
      const cleaned = (raw || '').replace(/```json|```/g, '').trim();
      questions = JSON.parse(cleaned);
    } catch {
      questions = [{ question: `Explain the key concepts of ${subject} for a ${role} role.`, hint: 'Cover fundamentals and real-world application.' }];
    }

    res.json({ questions, role, subject, difficulty, source: ragCtx.length ? 'rag' : 'groq' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /api/interview — admin adds question ────────────────────────────────
router.post('/', authenticate, authorize('admin', 'faculty'), async (req, res) => {
  try {
    const q = await InterviewQuestion.create(req.body);
    res.status(201).json({ question: q });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ─── POST /api/interview/bulk — admin bulk upload ─────────────────────────────
router.post('/bulk', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || !questions.length)
      return res.status(400).json({ error: 'questions array required' });
    const result = await InterviewQuestion.insertMany(questions, { ordered: false });
    res.status(201).json({ message: `${result.length} questions added`, inserted: result.length });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ─── POST /api/interview/session ─────────────────────────────────────────────
router.post('/session', authenticate, async (req, res) => {
  try {
    const { targetRole, interviewType, durationLabel, overallScore, scoresList, conversation, proctoringViolations } = req.body;
    if (!targetRole || !interviewType)
      return res.status(400).json({ error: 'targetRole and interviewType are required' });

    const session = await InterviewSession.create({
      userId: req.user.id,
      targetRole,
      interviewType,
      durationLabel,
      overallScore,
      scoresList,
      conversation,
      proctoringViolations,
    });
    res.status(201).json({ session });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ─── GET /api/interview/sessions ─────────────────────────────────────────────
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const sessions = await InterviewSession.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .select('targetRole interviewType durationLabel overallScore createdAt');
    res.json({ sessions });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/interview/session/:id ──────────────────────────────────────────
router.get('/session/:id', authenticate, async (req, res) => {
  try {
    const session = await InterviewSession.findOne({ _id: req.params.id, userId: req.user.id });
    if (!session) return res.status(404).json({ error: 'Interview report not found' });
    res.json({ session });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
