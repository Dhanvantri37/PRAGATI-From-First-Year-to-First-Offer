const router = require('express').Router();
const User = require('../models/User.model');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// GET /api/users/profile
router.get('/profile', authenticate, (req, res) => res.json({ user: req.user }));

// PUT /api/users/profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const allowed = ['name', 'department', 'year', 'profilePhoto', 'linkedinUrl', 'githubUrl', 'portfolioUrl', 'bio', 'phone', 'rollNumber', 'prn', 'division'];
    const updates = {};
    allowed.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/users/change-password
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    const valid = await user.comparePassword(currentPassword);
    if (!valid) return res.status(401).json({ error: 'Current password incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/users — admin: list all users; students/faculty: can fetch role=faculty only
router.get('/', authenticate, async (req, res) => {
  try {
    const { role, department } = req.query;
    // Non-admin users may only fetch the faculty list (for direct chat)
    if (req.user.role !== 'admin') {
      if (role !== 'faculty') return res.status(403).json({ error: 'Forbidden' });
      const faculty = await User.find({ role: 'faculty', isActive: { $ne: false } })
        .select('name department email').sort({ name: 1 });
      return res.json({ users: faculty });
    }
    const filter = {};
    if (role) filter.role = role;
    if (department) filter.department = department;
    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/users/:id/deactivate — admin only
router.patch('/:id/deactivate', authenticate, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    res.json({ user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

// DELETE /api/users/profile — student deletes own account
router.delete('/profile', authenticate, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
