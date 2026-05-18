const router = require('express').Router();
const mongoose = require('mongoose');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Simple interview question schema inline
const interviewQuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer:   { type: String },
  role:     { type: String },     // Frontend Developer, Backend Developer, etc.
  subject:  { type: String },     // DBMS, OS, DSA, etc.
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  tags:     [String],
}, { timestamps: true });

const InterviewQuestion = mongoose.models.InterviewQuestion ||
  mongoose.model('InterviewQuestion', interviewQuestionSchema);

// GET /api/interview — with role/subject filters
router.get('/', authenticate, async (req, res) => {
  try {
    const { role, subject, difficulty, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role && role !== 'All') filter.role = role;
    if (subject && subject !== 'All') filter.subject = subject;
    if (difficulty && difficulty !== 'All') filter.difficulty = difficulty;
    if (search) filter.question = { $regex: search, $options: 'i' };
    const skip = (Number(page) - 1) * Number(limit);
    const total = await InterviewQuestion.countDocuments(filter);
    const questions = await InterviewQuestion.find(filter).sort({ role: 1, subject: 1 }).skip(skip).limit(Number(limit));
    res.json({ questions, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// POST /api/interview/ai-answer — AI answer for any question
router.post('/ai-answer', authenticate, async (req, res) => {
  try {
    const { question, role, subject } = req.body;
    if (!question) return res.status(400).json({ error: 'question required' });

    // Try ML service first, fall back to canned response
    let answer = null;
    try {
      const mlRes = await fetch(`${process.env.ML_SERVICE_URL || 'http://ml-service:8000'}/interview-answer`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, role, subject }),
        signal: AbortSignal.timeout(8000)
      });
      if (mlRes.ok) {
        const d = await mlRes.json();
        answer = d.answer;
      }
    } catch(e) { /* ML service unavailable, use fallback */ }

    if (!answer) {
      // Fallback: structured answer template
      answer = `This is a common ${subject || 'technical'} interview question${role ? ` for ${role} roles` : ''}. ` +
        `To answer effectively: (1) Define the core concept clearly, (2) Give a real-world example or use case, ` +
        `(3) Mention trade-offs or limitations if applicable, (4) Relate to your experience. ` +
        `Make sure you understand the fundamentals deeply before your interview.`;
    }

    res.json({ answer });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// POST /api/interview — admin adds question
router.post('/', authenticate, authorize('admin', 'faculty'), async (req, res) => {
  try {
    const q = await InterviewQuestion.create(req.body);
    res.status(201).json({ question: q });
  } catch(err) { res.status(400).json({ error: err.message }); }
});

// POST /api/interview/bulk — admin bulk upload
router.post('/bulk', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || !questions.length) return res.status(400).json({ error: 'questions array required' });
    const result = await InterviewQuestion.insertMany(questions, { ordered: false });
    res.status(201).json({ message: `${result.length} questions added`, inserted: result.length });
  } catch(err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;
