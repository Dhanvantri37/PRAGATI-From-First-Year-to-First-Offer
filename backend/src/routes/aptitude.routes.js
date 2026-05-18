const router = require('express').Router();
const { AptitudeQuestion, AptitudeAttempt, AptitudeBookmark } = require('../models/index');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const LEVEL_MAP = { Beginner: 'Easy', Intermediate: 'Medium', Expert: 'Hard' };

// GET /api/aptitude/topics
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
      if (!subtopicMap[subtopic]) subtopicMap[subtopic] = topic;
    });
    res.json({
      topics: Object.keys(topicMap),
      subtopicMap: topicMap,
      questionCounts,
      userLevel: LEVEL_MAP[req.user?.skillLevel] || 'Easy',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/aptitude — browse/paginated
router.get('/', authenticate, async (req, res) => {
  try {
    const { topic, subtopic, company, difficulty, search, page = 1, limit = 15 } = req.query;
    const filter = {};
    if (topic)      filter.topic = new RegExp(topic, 'i');
    if (subtopic)   filter.subtopic = new RegExp(subtopic, 'i');
    if (difficulty) filter.difficulty = difficulty;
    if (company)    filter.company = company;
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

// GET /api/aptitude/set — quiz or practice set
// BUG FIX: Now respects `limit` query param instead of hardcoding 10
router.get('/set', authenticate, async (req, res) => {
  try {
    const { topic, subtopic, difficulty, topics, limit } = req.query;
    const requestedSize = Math.min(Math.max(parseInt(limit) || 10, 1), 50); // clamp 1–50

    const filter = {};
    if (difficulty && difficulty !== 'All') filter.difficulty = difficulty;

    // Support multi-topic quiz
    if (topics) {
      const topicArr = topics.split(',').map(t => t.trim()).filter(Boolean);
      if (topicArr.length > 0) filter.topic = { $in: topicArr.map(t => new RegExp(t, 'i')) };
    } else if (topic) {
      filter.topic = new RegExp(topic, 'i');
    }
    if (subtopic) filter.subtopic = new RegExp(subtopic, 'i');

    // Check available count
    const available = await AptitudeQuestion.countDocuments(filter);
    const sampleSize = Math.min(requestedSize, available);

    if (sampleSize === 0) {
      return res.json({ questions: [], difficulty: difficulty || 'Easy', topic: topic || 'All', available: 0 });
    }

    const questions = await AptitudeQuestion.aggregate([
      { $match: filter },
      { $sample: { size: sampleSize } },
    ]);

    res.json({ questions, difficulty: difficulty || 'Easy', topic: topic || 'All', available });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/aptitude/submit
router.post('/submit', authenticate, async (req, res) => {
  try {
    const { answers } = req.body;
    if (!Array.isArray(answers) || !answers.length)
      return res.status(400).json({ error: 'answers required' });
    await AptitudeAttempt.insertMany(
      answers.map(a => ({
        userId: req.user._id, questionId: a.questionId, topic: a.topic,
        subtopic: a.subtopic, selectedAnswer: a.selectedAnswer,
        correct: a.correct, timeSpent: a.timeSpent || 0,
      }))
    );
    const correct = answers.filter(a => a.correct).length;
    res.json({ score: Math.round((correct / answers.length) * 100), correct, total: answers.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/aptitude/history
router.get('/history', authenticate, async (req, res) => {
  try {
    const history = await AptitudeAttempt.find({ userId: req.user._id })
      .populate('questionId').sort({ attemptedAt: -1 }).limit(100);
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/aptitude/stats
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
      topic, attempted: d.attempted, correct: d.correct,
      accuracy: Math.round((d.correct / d.attempted) * 100),
    }));

    res.json({ stats, totalAttempted, totalCorrect, accuracy });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/aptitude/bookmark/:id
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

// GET /api/aptitude/bookmarks
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

// Admin: POST /api/aptitude — add question
router.post('/', authenticate, authorize('admin', 'faculty'), async (req, res) => {
  try {
    const q = await AptitudeQuestion.create(req.body);
    res.status(201).json({ question: q });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;