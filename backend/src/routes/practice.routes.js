const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { PracticeResponse, HRQuestion, GDTopic, TechnicalQuestion, CaseStudy, Puzzle, DebuggingProblem } = require('../models/practice.model');
const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── GET /api/practice/questions/:roundType — Fetch DB / RAG Questions ────────
router.get('/questions/:roundType', authenticate, async (req, res) => {
  try {
    const roundType = (req.params.roundType || '').toUpperCase();
    const { company, subject } = req.query;

    let filter = {};
    if (company) filter.company = new RegExp(company, 'i');
    if (subject) filter.subject = new RegExp(subject, 'i');

    let questions = [];

    if (roundType === 'TECHNICAL') {
      questions = await TechnicalQuestion.find(filter).sort({ createdAt: -1 }).limit(30);
    } else if (roundType === 'HR') {
      questions = await HRQuestion.find(filter).sort({ createdAt: -1 }).limit(30);
    } else if (roundType === 'GD') {
      questions = await GDTopic.find(filter).sort({ createdAt: -1 }).limit(30);
    } else if (roundType === 'CASE_STUDY') {
      questions = await CaseStudy.find(filter).sort({ createdAt: -1 }).limit(30);
    } else if (roundType === 'PUZZLE') {
      questions = await Puzzle.find(filter).sort({ createdAt: -1 }).limit(30);
    } else if (roundType === 'DEBUGGING') {
      questions = await DebuggingProblem.find(filter).sort({ createdAt: -1 }).limit(30);
    }

    res.json({ questions, count: questions.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/practice/rag-generate-questions — Dynamic RAG Question Generator ──
router.post('/rag-generate-questions', authenticate, async (req, res) => {
  try {
    const { roundType = 'TECHNICAL', company = 'General Tech', subject = 'DBMS', difficulty = 'Medium', domain = 'CSE' } = req.body;

    const prompt = `You are a Lead Campus Placement Evaluator and Technical Recruiter for top Indian and global tech companies (TCS, Infosys, Wipro, Capgemini, Accenture, Amazon, Google, Microsoft, Cognizant, Tech Mahindra, LTI Mindtree).

Generate 5 authentic, recent, and highly relevant campus placement questions asked in actual hiring drives.

Round Type: ${roundType}
Target Company: ${company}
Subject / Focus Area: ${subject}
Difficulty Level: ${difficulty}
Student Branch / Domain: ${domain}

Requirements for Round Type "${roundType}":
- If TECHNICAL: Provide clear question, model answer, step-by-step code snippet or architecture explanation, difficulty, tags, and company label.
- If HR: Provide behavioral question, category (STAR format), sample answer, key traits/keywords.
- If GD: Provide topic name, category, key points (pro/con), and model closing summary.
- If CASE_STUDY: Provide business scenario title, problem context, 4 structured sections (Problem, Analysis, Solution, Impact), and sample answer.
- If SYSTEM_DESIGN / PROJECT: Provide system title, scale requirements, architecture components, database design, trade-offs, and sample answer.
- If PUZZLE: Provide puzzle title, riddle/problem statement, hint, exact answer, and logical step-by-step explanation.
- If DEBUGGING: Provide buggy code snippet, 4 multiple choice options, correct option index (0-3), fixed code, and explanation.

Return ONLY a valid JSON array of 5 objects without any Markdown wrappers:
[
  {
    "id": "rag-q1",
    "title": "Question or Topic Title",
    "question": "Full detailed question text",
    "subject": "${subject}",
    "company": "${company}",
    "difficulty": "${difficulty}",
    "answer": "Comprehensive answer or solution code",
    "sampleAnswer": "Comprehensive answer or solution code",
    "codeSnippet": "Code snippet if applicable",
    "keyPoints": ["Point 1", "Point 2", "Point 3"],
    "keywords": ["tag1", "tag2"],
    "tags": ["tag1", "tag2"],
    "buggy": "Buggy code snippet if debugging",
    "options": ["Opt A", "Opt B", "Opt C", "Opt D"],
    "correct": 0,
    "fixed": "Fixed code",
    "explanation": "Detailed explanation"
  }
]`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
      max_tokens: 2500,
    });

    let raw = chatCompletion.choices[0]?.message?.content || '[]';
    raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();

    const questions = JSON.parse(raw);

    // Persist into database dynamically
    for (const q of questions) {
      try {
        if (roundType === 'TECHNICAL') {
          await TechnicalQuestion.findOneAndUpdate({ question: q.question }, { $set: { subject: q.subject || subject, company: q.company || company, answer: q.answer || q.sampleAnswer, difficulty: q.difficulty || difficulty, tags: q.tags || [] } }, { upsert: true });
        } else if (roundType === 'HR') {
          await HRQuestion.findOneAndUpdate({ question: q.question }, { $set: { category: q.category || 'General', company: q.company || company, sampleAnswer: q.sampleAnswer || q.answer, difficulty: q.difficulty || difficulty, keywords: q.keywords || [] } }, { upsert: true });
        } else if (roundType === 'GD') {
          await GDTopic.findOneAndUpdate({ topic: q.title || q.question }, { $set: { category: q.category || 'Technology', company: q.company || company, difficulty: q.difficulty || difficulty, keyPoints: q.keyPoints || [], modelAnswer: q.modelAnswer || q.answer } }, { upsert: true });
        } else if (roundType === 'CASE_STUDY') {
          await CaseStudy.findOneAndUpdate({ title: q.title || q.question }, { $set: { company: q.company || company, difficulty: q.difficulty || difficulty, context: q.question, domain: q.domain || domain, keywords: q.keywords || [] } }, { upsert: true });
        } else if (roundType === 'PUZZLE') {
          await Puzzle.findOneAndUpdate({ title: q.title || q.question }, { $set: { company: q.company || company, puzzle: q.question, hint: q.hint || '', answer: q.answer || '', explanation: q.explanation || '', difficulty: q.difficulty || difficulty } }, { upsert: true });
        } else if (roundType === 'DEBUGGING') {
          await DebuggingProblem.findOneAndUpdate({ title: q.title || q.question }, { $set: { company: q.company || company, lang: q.lang || 'JavaScript', difficulty: q.difficulty || difficulty, buggy: q.buggy || q.question, options: q.options || [], correct: q.correct || 0, fixed: q.fixed || '', explanation: q.explanation || '' } }, { upsert: true });
        }
      } catch (dbErr) {
        console.warn('[RAG Practice] DB save warning:', dbErr.message);
      }
    }

    res.json({ questions, count: questions.length, roundType, company });
  } catch (err) {
    res.status(500).json({ error: 'RAG question generation failed: ' + err.message });
  }
});

// POST /api/practice/submit-response
router.post('/submit-response', authenticate, async (req, res) => {
  try {
    const { roundType, questionId, answer, timeTaken } = req.body;
    const response = await PracticeResponse.create({
      userId: req.user._id,
      roundType,
      questionId,
      answer,
      timeTaken,
    });
    res.status(201).json({ response });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/practice/responses/me — get user's responses
router.get('/responses/me', authenticate, async (req, res) => {
  try {
    const responses = await PracticeResponse.find({ userId: req.user._id })
      .sort({ createdAt: -1 }).limit(100);
    res.json({ responses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
