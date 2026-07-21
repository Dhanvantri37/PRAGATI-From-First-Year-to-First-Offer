const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { AptitudeQuestion, AptitudeAttempt, AptitudeBookmark, AptitudeNote } = require('../models/index');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ── Rate limiter: AI quiz endpoint — 10 req / 15 min per user ──────────────
const aiQuizLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: { error: 'Too many AI quiz requests. Please wait 15 minutes.' },
  standardHeaders: true, legacyHeaders: false,
});

// ── Sanitize text input (strip HTML, trim) ──────────────────────────────────
function sanitize(str, max = 2000) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim().slice(0, max);
}

// ── Strip answer from quiz questions (security) ─────────────────────────────
function stripAnswer(q) {
  const obj = q.toObject ? q.toObject() : { ...q };
  delete obj.answer;
  delete obj.explanation;
  return obj;
}

// ── GET /api/aptitude/topics ────────────────────────────────────────────────
router.get('/topics', authenticate, async (req, res) => {
  try {
    const agg = await AptitudeQuestion.aggregate([
      { $group: { _id: { topic: '$topic', subtopic: '$subtopic' }, count: { $sum: 1 } } },
      { $sort: { '_id.topic': 1, '_id.subtopic': 1 } },
    ]);
    const topicMap = {};
    const subtopicMap = {};
    const questionCounts = {};
    agg.forEach(({ _id: { topic, subtopic }, count }) => {
      if (!topicMap[topic]) topicMap[topic] = [];
      if (subtopic && !topicMap[topic].includes(subtopic)) topicMap[topic].push(subtopic);
      questionCounts[subtopic || topic] = (questionCounts[subtopic || topic] || 0) + count;
      questionCounts[topic] = (questionCounts[topic] || 0) + count;
      if (!subtopicMap[subtopic]) subtopicMap[subtopic] = topic;
    });
    res.json({
      topics: Object.keys(topicMap),
      subtopicMap: topicMap,
      questionCounts,
      userLevel: 'Easy',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/aptitude/companies ─────────────────────────────────────────────
router.get('/companies', authenticate, async (req, res) => {
  try {
    const result = await AptitudeQuestion.aggregate([
      { $unwind: '$companies' },
      { $group: { _id: '$companies', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const companies = result.map(r => r._id).filter(Boolean);
    res.json({ companies });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/aptitude/company-stats ─────────────────────────────────────────
router.get('/company-stats', authenticate, async (req, res) => {
  try {
    const result = await AptitudeQuestion.aggregate([
      { $unwind: '$companies' },
      { $group: { _id: '$companies', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);
    res.json({ stats: result.map(r => ({ company: r._id, count: r.count })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/aptitude — browse/paginated ────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const { topic, subtopic, company, difficulty, search, page = 1, limit = 15 } = req.query;
    const filter = {};
    if (topic && topic !== 'All')      filter.topic = new RegExp(topic, 'i');
    if (subtopic && subtopic !== 'All') filter.subtopic = new RegExp(subtopic, 'i');
    if (difficulty && difficulty !== 'All') filter.difficulty = difficulty;
    if (company && company !== 'All')   filter.companies = company;
    if (search)     filter.question = { $regex: search, $options: 'i' };
    const total = await AptitudeQuestion.countDocuments(filter);
    const skip  = (Number(page) - 1) * Number(limit);
    const questions = await AptitudeQuestion.find(filter)
      .sort({ topic: 1, difficulty: 1 }).skip(skip).limit(Number(limit));
    res.json({ questions, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/aptitude/set — practice/quiz set (answers HIDDEN in quiz mode) ─
router.get('/set', authenticate, async (req, res) => {
  try {
    const { topic, subtopic, difficulty, topics, company, limit, quizMode } = req.query;
    const requestedSize = Math.min(Math.max(parseInt(limit) || 10, 1), 50);
    const hideAnswers = quizMode === 'true';

    const filter = {};
    if (difficulty && difficulty !== 'All') filter.difficulty = difficulty;
    if (company && company !== 'All') filter.companies = company;

    if (topics) {
      const topicArr = topics.split(',').map(t => t.trim()).filter(Boolean);
      if (topicArr.length > 0) filter.topic = { $in: topicArr.map(t => new RegExp(t, 'i')) };
    } else if (topic) {
      filter.topic = new RegExp(topic, 'i');
    }
    if (subtopic) filter.subtopic = new RegExp(subtopic, 'i');

    const available = await AptitudeQuestion.countDocuments(filter);
    const sampleSize = Math.min(requestedSize, available);

    if (sampleSize === 0) {
      return res.json({ questions: [], difficulty: difficulty || 'Easy', topic: topic || 'All', available: 0 });
    }

    let questions = await AptitudeQuestion.aggregate([
      { $match: filter },
      { $sample: { size: sampleSize } },
    ]);

    // Security: strip ANSWER only in quiz mode (keep explanation for post-answer review)
    if (hideAnswers) {
      questions = questions.map(q => {
        const obj = { ...q };
        delete obj.answer; // answer hidden until submit
        return obj;        // explanation kept for post-reveal
      });
    }

    res.json({ questions, difficulty: difficulty || 'Easy', topic: topic || 'All', available });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Helper: Robust Answer Comparison ──────────────────────────────────────
function isAnswerCorrect(selected, correctAns, options = []) {
  if (!selected || !correctAns) return false;
  const s = selected.toString().trim();
  const c = correctAns.toString().trim();

  if (s === c) return true;

  // Clean prefixes: "A) 60" -> "60", "A. 60" -> "60"
  const cleanS = s.replace(/^[A-D][)\.-]\s*/i, '').trim();
  const cleanC = c.replace(/^[A-D][)\.-]\s*/i, '').trim();

  if (cleanS.toLowerCase() === cleanC.toLowerCase()) return true;

  // Compare letter prefixes if both exist
  const letterS = s.match(/^([A-D])[)\.-]/i)?.[1]?.toUpperCase();
  const letterC = c.match(/^([A-D])[)\.-]/i)?.[1]?.toUpperCase();

  if (letterS && letterC && letterS === letterC) return true;

  // If correct is single letter like "A", "B", "C", "D"
  if (/^[A-D]$/i.test(cleanC)) {
    const letter = cleanC.toUpperCase();
    if (letterS && letterS === letter) return true;
    const idx = letter.charCodeAt(0) - 65;
    if (options && options[idx]) {
      const optVal = options[idx].replace(/^[A-D][)\.-]\s*/i, '').trim();
      if (cleanS.toLowerCase() === optVal.toLowerCase() || s.toLowerCase() === options[idx].toLowerCase()) return true;
    }
  }

  // If selected is single letter like "C"
  if (/^[A-D]$/i.test(cleanS)) {
    if (letterC && letterC === cleanS.toUpperCase()) return true;
    const letter = cleanS.toUpperCase();
    const idx = letter.charCodeAt(0) - 65;
    if (options && options[idx]) {
      const optVal = options[idx].replace(/^[A-D][)\.-]\s*/i, '').trim();
      if (cleanC.toLowerCase() === optVal.toLowerCase() || c.toLowerCase() === options[idx].toLowerCase()) return true;
    }
  }

  return false;
}

// ── POST /api/aptitude/submit — verify answers server-side ──────────────────
router.post('/submit', authenticate, async (req, res) => {
  try {
    const { answers } = req.body;
    if (!Array.isArray(answers) || !answers.length)
      return res.status(400).json({ error: 'answers required' });

    // Server-side verification: look up real answers from DB
    const questionIds = answers.map(a => a.questionId).filter(Boolean);
    const dbQuestions = await AptitudeQuestion.find({ _id: { $in: questionIds } }).select('answer options topic subtopic');
    const answerMap = {};
    dbQuestions.forEach(q => { answerMap[q._id.toString()] = q; });

    const verified = answers.map(a => {
      const dbQ = answerMap[a.questionId];
      const correct = dbQ ? isAnswerCorrect(a.selectedAnswer, dbQ.answer, dbQ.options) : false;
      return {
        userId: req.user._id,
        questionId: a.questionId,
        topic: dbQ?.topic || a.topic,
        subtopic: dbQ?.subtopic || a.subtopic,
        selectedAnswer: a.selectedAnswer,
        correct,
        timeSpent: a.timeSpent || 0,
      };
    });

    await AptitudeAttempt.insertMany(verified, { ordered: false });

    const correct = verified.filter(a => a.correct).length;
    // Batch fetch explanations + correct answers for full review
    const qIds = verified.map(v => v.questionId).filter(Boolean);
    const explanations = await AptitudeQuestion.find({ _id: { $in: qIds } }).select('explanation answer').lean();
    const expMap = {};
    explanations.forEach(q => { expMap[q._id.toString()] = { explanation: q.explanation, answer: q.answer }; });
    const finalResults = verified.map(v => ({
      ...v,
      correctAnswer: expMap[v.questionId?.toString()]?.answer,
      explanation:   expMap[v.questionId?.toString()]?.explanation || '',
    }));
    res.json({
      score: Math.round((correct / verified.length) * 100),
      correct,
      total: verified.length,
      results: finalResults,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/aptitude/history ────────────────────────────────────────────────
router.get('/history', authenticate, async (req, res) => {
  try {
    const history = await AptitudeAttempt.find({ userId: req.user._id })
      .populate('questionId').sort({ attemptedAt: -1 }).limit(100);
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/aptitude/stats ──────────────────────────────────────────────────
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const attempts = await AptitudeAttempt.find({ userId });
    const totalAttempted = attempts.length;
    const totalCorrect   = attempts.filter(a => a.correct).length;
    const accuracy = totalAttempted ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

    const byTopic = {};
    attempts.forEach(a => {
      if (!byTopic[a.topic]) byTopic[a.topic] = { attempted: 0, correct: 0 };
      byTopic[a.topic].attempted++;
      if (a.correct) byTopic[a.topic].correct++;
    });
    const stats = Object.entries(byTopic).map(([topic, d]) => ({
      topic, attempted: d.attempted, correct: d.correct, total: d.attempted,
      accuracy: Math.round((d.correct / d.attempted) * 100),
    }));

    res.json({ stats, totalAttempted, totalCorrect, accuracy });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/aptitude/bookmark/:id ─────────────────────────────────────────
router.post('/bookmark/:id', authenticate, async (req, res) => {
  try {
    const existing = await AptitudeBookmark.findOne({ userId: req.user._id, questionId: req.params.id });
    if (existing) {
      await existing.deleteOne();
      return res.json({ bookmarked: false });
    }
    await AptitudeBookmark.create({ userId: req.user._id, questionId: req.params.id });
    res.json({ bookmarked: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/aptitude/bookmarks ──────────────────────────────────────────────
router.get('/bookmarks', authenticate, async (req, res) => {
  try {
    const bookmarks = await AptitudeBookmark.find({ userId: req.user._id })
      .populate('questionId').sort({ createdAt: -1 });
    const ids = bookmarks.map(b => b.questionId?._id?.toString()).filter(Boolean);
    res.json({ bookmarks, ids });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/aptitude/note/:id — save/update note for a question ────────────
router.post('/note/:id', authenticate, async (req, res) => {
  try {
    const rawNote = sanitize(req.body.note || '', 2000);
    const result = await AptitudeNote.findOneAndUpdate(
      { userId: req.user._id, questionId: req.params.id },
      { note: rawNote },
      { upsert: true, new: true }
    );
    res.json({ note: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/aptitude/notes — get all notes for current user ─────────────────
router.get('/notes', authenticate, async (req, res) => {
  try {
    const notes = await AptitudeNote.find({ userId: req.user._id })
      .populate('questionId').sort({ updatedAt: -1 });
    res.json({ notes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/aptitude/ai-quiz — AI-generated company quiz ──────────────────
router.post('/ai-quiz', authenticate, aiQuizLimiter, async (req, res) => {
  try {
    const { company, count = 10, difficulty = 'Mixed', topic = 'Quantitative' } = req.body;
    if (!company) return res.status(400).json({ error: 'company is required' });

    const safeCompany = sanitize(company, 100);
    const safeCount   = Math.min(Math.max(parseInt(count) || 10, 5), 20);
    const diffLabel   = ['Easy', 'Medium', 'Hard', 'Mixed'].includes(difficulty) ? difficulty : 'Mixed';

    const prompt = buildAIPrompt(safeCompany, safeCount, diffLabel, topic);
    let questions = null;

    // ── Try Groq first ────────────────────────────────────────────────────
    try {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      });
      const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
      if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        questions = parsed.questions;
      }
    } catch (groqErr) {
      console.warn('[AI-Quiz] Groq failed:', groqErr.message);
    }

    // ── Fallback: Gemini ──────────────────────────────────────────────────
    if (!questions) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
            questions = parsed.questions;
          }
        }
      } catch (geminiErr) {
        console.warn('[AI-Quiz] Gemini failed:', geminiErr.message);
      }
    }

    // ── Fallback: DB questions (COMPANY-SPECIFIC only) ───────────────────────
    if (!questions) {
      const companyFilter = { companies: safeCompany };
      if (diffLabel !== 'Mixed') companyFilter.difficulty = diffLabel;
      const companyAvailable = await AptitudeQuestion.countDocuments(companyFilter);

      // Use company-specific filter if we have at least 3 questions, else use all
      const useFilter = companyAvailable >= 3 ? companyFilter : {};
      const fallbackSize = Math.min(safeCount, companyAvailable >= 3 ? companyAvailable : 50);

      const dbQs = await AptitudeQuestion.aggregate([
        { $match: useFilter },
        { $sample: { size: Math.min(fallbackSize, 50) } },
      ]);

      return res.json({
        questions: dbQs.map(q => {
          const obj = { ...q };
          delete obj.answer; // strip answer only (explanation kept)
          return obj;
        }),
        source: 'database',
        fallback: true,
        companySpecific: companyAvailable >= 3,
        message: companyAvailable >= 3
          ? `Using ${safeCompany} saved questions (AI unavailable).`
          : 'AI unavailable — showing general questions.',
      });
    }

    // ── Save unique AI questions to DB ────────────────────────────────────
    const safeQuestions = [];
    for (const q of questions) {
      try {
        let doc = await AptitudeQuestion.findOne({
          question: { $regex: new RegExp(q.question.slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
        });
        if (!doc) {
          doc = await AptitudeQuestion.create({
            topic: q.topic || topic || 'Quantitative',
            subtopic: q.subtopic || 'General',
            question: q.question,
            options: q.options,
            answer: q.answer,
            explanation: q.explanation || '',
            difficulty: q.difficulty || (diffLabel === 'Mixed' ? ['Easy','Medium','Hard'][Math.floor(Math.random()*3)] : diffLabel),
            companies: [safeCompany],
            year: new Date().getFullYear().toString(),
            source: `AI-${safeCompany}-${new Date().getFullYear()}`,
          });
        }
        safeQuestions.push({
          _id: doc._id.toString(),
          topic: doc.topic,
          subtopic: doc.subtopic,
          question: doc.question,
          options: doc.options,
          difficulty: doc.difficulty,
          companies: doc.companies,
        });
      } catch (saveErr) {
        console.warn('[AI-Quiz] Save question error:', saveErr.message);
      }
    }

    if (!safeQuestions.length) {
      return res.status(500).json({ error: 'Failed to process AI questions' });
    }

    res.json({ questions: safeQuestions, source: 'ai', savedCount: safeQuestions.length });
  } catch (err) {
    console.error('[AI-Quiz] Error:', err);
    res.status(500).json({ error: 'AI quiz generation failed. Please try again.' });
  }
});

// ── Helper: build AI prompt ──────────────────────────────────────────────────
function buildAIPrompt(company, count, difficulty, topic) {
  const diffText = difficulty === 'Mixed'
    ? `a mix of Easy (${Math.ceil(count*0.3)}), Medium (${Math.ceil(count*0.4)}), and Hard (${Math.floor(count*0.3)}) difficulty levels`
    : `${difficulty} difficulty`;

  return `You are an expert aptitude trainer for top Indian IT companies. Generate exactly ${count} genuine aptitude questions that are specifically asked by ${company} in campus recruitment drives (2024-2026).

Requirements:
- Questions must be REALISTIC and match ${company}'s actual exam pattern
- Include ${diffText}
- Topics from: ${topic} (Number System, Percentages, Profit & Loss, Time & Work, Speed & Distance, Ratios, SI/CI, Probability, Data Interpretation, Logical Reasoning, Coding)
- Each question must have EXACTLY 4 options labeled as full answer strings (not A/B/C/D)
- Answer must be the EXACT string matching one of the options
- Explanation must show the full step-by-step solution
- Questions must be UNIQUE and not trivially simple

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "topic": "Quantitative",
      "subtopic": "Time & Work",
      "question": "Full question text here",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "answer": "Option 1",
      "explanation": "Step-by-step solution...",
      "difficulty": "Medium"
    }
  ]
}`;
}

// ── POST /api/aptitude/sync — seed/resync all questions ─────────────────────
router.post('/sync', authenticate, async (req, res) => {
  try {
    const count = await AptitudeQuestion.countDocuments();
    // Run DOCX seed in background to add any missing questions
    (async () => {
      try {
        const { seedAptitudeQuestions } = require('../utils/aptitude-docx-seed');
        await seedAptitudeQuestions();
      } catch (e) { console.warn('[Sync] seed warning:', e.message); }
    })();
    res.json({ message: `Sync started. Currently have ${count} questions — new ones will be added shortly.`, currentCount: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: POST /api/aptitude — add question ────────────────────────────────
router.post('/', authenticate, authorize('admin', 'faculty'), async (req, res) => {
  try {
    const q = await AptitudeQuestion.create(req.body);
    res.status(201).json({ question: q });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Admin: POST /api/aptitude/bulk — bulk upload ────────────────────────────
router.post('/bulk', authenticate, authorize('admin', 'faculty'), async (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions)) return res.status(400).json({ error: 'Expected an array of questions' });
    const inserted = await AptitudeQuestion.insertMany(questions, { ordered: false });
    res.status(201).json({ message: 'Questions added', inserted: inserted.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;