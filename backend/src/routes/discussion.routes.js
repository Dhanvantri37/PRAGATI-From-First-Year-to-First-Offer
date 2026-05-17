// discussion.routes.js
const router = require('express').Router();
const { Discussion } = require('../models/index');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/', authenticate, async (req, res) => {
  try {
    const { department, year, type } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (year) filter.year = Number(year);
    if (type) filter.type = type;
    const discussions = await Discussion.find(filter)
      .populate('createdBy', 'name role department')
      .sort({ createdAt: -1 });
    res.json({ discussions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const discussion = await Discussion.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ discussion });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/reply', authenticate, async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id);
    if (!discussion) return res.status(404).json({ error: 'Discussion not found' });
    discussion.replies.push({ content: req.body.content, author: req.user._id });
    // If faculty or admin replies, mark as answered
    if (req.user.role === 'faculty' || req.user.role === 'admin') {
      discussion.isResolved = true;
    }
    await discussion.save();
    const populated = await discussion.populate('replies.author', 'name role');
    res.json({ discussion: populated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/:id/resolve', authenticate, async (req, res) => {
  try {
    const discussion = await Discussion.findByIdAndUpdate(
      req.params.id,
      { isResolved: true },
      { new: true }
    );
    res.json({ discussion });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
