const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { PracticeRound, PracticeResponse } = require('../models/practice.model');

// GET /api/practice/:roundType — get content for a round
router.get('/:roundType', authenticate, async (req, res) => {
  try {
    const { roundType } = req.params;
    const data = await PracticeRound.findOne({ type: roundType.toUpperCase() });
    res.json({ data: data || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
