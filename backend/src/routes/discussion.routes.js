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
    const populated = await Discussion.findById(discussion._id).populate('createdBy', 'name role department');
    res.status(201).json({ discussion: populated });

    // Notify relevant users about the new discussion
    // Bell: always | Push: only faculty/admin posts
    const User = require('../models/User.model');
    const { emitToUser } = require('./notifications.routes');
    const isFacultyOrAdmin = ['faculty', 'admin'].includes(req.user.role);
    const notifPayload = {
      _id: discussion._id,
      type: 'discussion',
      title: isFacultyOrAdmin
        ? `💬 ${req.user.name} (${req.user.role}): ${req.body.title || 'New Discussion'}`
        : `💬 New Question: ${req.body.title || 'New Discussion'}`,
      message: (req.body.content || '').substring(0, 100),
      link: `/dashboard/discussions`,
      priority: isFacultyOrAdmin ? 'high' : 'normal',
      createdAt: discussion.createdAt,
      createdBy: { name: req.user.name, role: req.user.role },
    };

    // Target users in same dept/year if discussion is scoped, otherwise all students
    const query = { role: 'student' };
    if (req.body.department) query.department = req.body.department;
    if (req.body.year) query.year = Number(req.body.year);
    User.find(query).select('_id pushSubscription').then(students => {
      students.forEach(u => {
        // Bell for everyone; push only if faculty/admin posted
        const hasPush = isFacultyOrAdmin && !!u.pushSubscription?.endpoint;
        emitToUser(req.app, u._id, notifPayload, { push: hasPush }).catch(() => {});
      });
    }).catch(err => console.error('[Discussion notify error]', err.message));
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
