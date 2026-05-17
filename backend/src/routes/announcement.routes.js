const router = require('express').Router();
const { Announcement } = require('../models/index');
const User = require('../models/User.model');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// GET /api/announcements — students and faculty both call this
// BUG FIX: Added authenticate middleware so req.user is always defined
router.get('/', authenticate, async (req, res) => {
  try {
    const u = req.user;
    const filter = {
      $or: [
        { 'targetFilter.role': 'all' },
        { 'targetFilter.role': u.role },
        { 'targetFilter.role': { $exists: false } },
        { 'targetFilter.role': null },
      ]
    };
    if (u.department) {
      filter.$or.push({ 'targetFilter.department': u.department });
    }
    const announcements = await Announcement.find(filter)
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(30);
    res.json({ announcements });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/announcements — faculty/admin creates
router.post('/', authenticate, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const { title, message, link, targetFilter, priority } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'title and message required' });
    const ann = await Announcement.create({
      title, message, link: link || '',
      createdBy: req.user._id,
      targetFilter: targetFilter || { role: 'all' }, // default: visible to everyone
      priority: priority || 'normal',
    });
    const populated = await ann.populate('createdBy', 'name role');
    res.status(201).json({ announcement: populated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/announcements/:id
router.delete('/:id', authenticate, authorize('faculty', 'admin'), async (req, res) => {
  try {
    await Announcement.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/announcements/unread-count — for bell icon badge
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const u = req.user;
    const seenKey = `ann_seen_${u._id}`;
    const lastSeen = req.headers['x-last-seen'] ? new Date(req.headers['x-last-seen']) : new Date(0);
    const filter = {
      createdAt: { $gt: lastSeen },
      $or: [
        { 'targetFilter.role': 'all' },
        { 'targetFilter.role': u.role },
        { 'targetFilter.role': { $exists: false } },
      ]
    };
    if (u.department) filter.$or.push({ 'targetFilter.department': u.department });
    const count = await Announcement.countDocuments(filter);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/announcements/targeted
router.get('/targeted', authenticate, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const { atsBelow, department, year } = req.query;
    const filter = { role: 'student' };
    if (department) filter.department = department;
    if (year) filter.year = Number(year);
    if (atsBelow) filter.atsScore = { $lt: Number(atsBelow) };
    const students = await User.find(filter).select('name email department year atsScore');
    res.json({ students, count: students.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;