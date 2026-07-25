const router = require('express').Router();
const mongoose = require('mongoose');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { InterviewSession } = require('../models/index');

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

// POST /api/interview/ai-answer — RAG Context Injected AI answer for any question
router.post('/ai-answer', authenticate, async (req, res) => {
  try {
    const { question, role, subject, company } = req.body;
    if (!question) return res.status(400).json({ error: 'question required' });

    const ragService = require('../utils/ragService');
    
    // RAG Retrieval: fetch live matching job listings & KIT alumni
    const [openings, alumni] = await Promise.all([
      ragService.searchScrapedOpenings(role || subject || question, req.user.department || 'CSE', 1),
      ragService.searchDiscoveredAlumni(question, company || '', req.user.department || 'CSE', 1)
    ]);

    let ragContext = '';
    if (openings.length > 0) {
      ragContext += `\n[Live Industry Reference: ${openings[0].title} at ${openings[0].companyName} - Package: ${openings[0].ctc} LPA]`;
    }
    if (alumni.length > 0) {
      ragContext += `\n[KIT Alumni Insight: ${alumni[0].name} is working at ${alumni[0].currentCompany} as ${alumni[0].role || 'Software Engineer'}]`;
    }

    // Try ML service first
    let answer = null;
    try {
      const mlRes = await fetch(`${process.env.ML_SERVICE_URL || 'http://ml-service:8000'}/interview-answer`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, role, subject, ragContext }),
        signal: AbortSignal.timeout(8000)
      });
      if (mlRes.ok) {
        const d = await mlRes.json();
        answer = d.answer;
      }
    } catch(e) { /* ML service unavailable, use fallback */ }

    if (!answer) {
      // Structured RAG enriched answer template
      const liveRef = openings[0] ? ` (Matching live hiring for ${openings[0].title} at ${openings[0].companyName})` : '';
      const alumRef = alumni[0] ? ` KIT Alumnus ${alumni[0].name} (${alumni[0].role} at ${alumni[0].currentCompany}) cracked interviews on this topic.` : '';
      
      answer = `Here is how to answer "${question}" effectively for ${role || 'Software Engineering'} roles${liveRef}:\n\n` +
        `1. Core Technical Concept: Define the underlying mechanisms clearly.\n` +
        `2. Implementation & Trade-offs: Highlight efficiency, time/space complexity, and practical edge cases.\n` +
        `3. Real-world Industry Application: Relate your approach to production systems used by top hiring companies.${alumRef}\n\n` +
        `Pro Tip: Focus on clear problem-solving rationale rather than just memorized syntax!`;
    }

    res.json({ answer, ragContext: ragContext.trim() });
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

// ─── POST /api/interview/session ───
// Saves a completed mock interview session
router.post('/session', authenticate, async (req, res) => {
  try {
    const { targetRole, interviewType, durationLabel, overallScore, scoresList, conversation, proctoringViolations } = req.body;
    
    if (!targetRole || !interviewType) {
      return res.status(400).json({ error: 'targetRole and interviewType are required' });
    }

    const session = await InterviewSession.create({
      userId: req.user.id,
      targetRole,
      interviewType,
      durationLabel,
      overallScore,
      scoresList,
      conversation,
      proctoringViolations
    });

    res.status(201).json({ session });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── GET /api/interview/sessions ───
// Gets a list of past mock interview sessions for the logged in student
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const sessions = await InterviewSession.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .select('targetRole interviewType durationLabel overallScore createdAt');
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/interview/session/:id ───
// Fetches the full detailed report for a specific session
router.get('/session/:id', authenticate, async (req, res) => {
  try {
    const session = await InterviewSession.findOne({ _id: req.params.id, userId: req.user.id });
    if (!session) {
      return res.status(404).json({ error: 'Interview report not found' });
    }
    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
