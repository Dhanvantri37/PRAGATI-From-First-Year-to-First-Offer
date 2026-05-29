const router = require('express').Router();
const User = require('../models/User.model');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { sendEmail } = require('../utils/mailer');
// GET /api/users/profile
router.get('/profile', authenticate, (req, res) => res.json({ user: req.user }));

// PUT /api/users/profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const allowed = ['name', 'department', 'year', 'profilePhoto', 'linkedinUrl', 'githubUrl', 'portfolioUrl', 'bio', 'phone', 'rollNumber', 'prn', 'division', 'isProfileComplete'];
    const updates = {};
    allowed.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });
    updates.isProfileComplete = true;
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

// DELETE /api/users/profile — student deletes own account
router.delete('/profile', authenticate, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/admin-create — admin only
router.post('/admin-create', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, email, role, department } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });
    
    const password = Math.random().toString(36).slice(-8); // Generate 8 char password
    const user = new User({ name, email, password, role, department, isProfileComplete: false });
    await user.save();
    
    // Send email
    const subject = 'Welcome to PRAGATI - Your Account Credentials';
    const text = `Hello ${name},\n\nYour account has been created on the PRAGATI platform.\n\nEmail: ${email}\nPassword: ${password}\n\nPlease login and complete your profile.`;
    await sendEmail(email, subject, text);
    
    res.status(201).json({ message: 'User created', user, password });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/users/admin-create-bulk — admin only
router.post('/admin-create-bulk', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { users } = req.body; // Array of { name, email, role, department }
    if (!Array.isArray(users)) return res.status(400).json({ error: 'Expected an array of users' });

    const createdUsers = [];
    const errors = [];

    for (const u of users) {
      try {
        const existingUser = await User.findOne({ email: u.email });
        if (existingUser) {
          errors.push({ email: u.email, error: 'Email already exists' });
          continue;
        }
        
        const password = Math.random().toString(36).slice(-8);
        const user = new User({ name: u.name, email: u.email, password, role: u.role || 'student', department: u.department, isProfileComplete: false });
        await user.save();
        
        const subject = 'Welcome to PRAGATI - Your Account Credentials';
        const text = `Hello ${u.name || 'User'},\n\nYour account has been created on the PRAGATI platform.\n\nEmail: ${u.email}\nPassword: ${password}\n\nPlease login and complete your profile.`;
        await sendEmail(u.email, subject, text);
        
        createdUsers.push({ email: u.email, password });
      } catch (err) {
        errors.push({ email: u.email, error: err.message });
      }
    }

    res.status(201).json({ message: 'Bulk creation completed', created: createdUsers, errors });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/users/:id — admin only
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted completely' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

