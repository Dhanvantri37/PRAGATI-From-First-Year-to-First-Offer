const router = require('express').Router();
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const User = require('../models/User.model');
const { generateTokens, authenticate } = require('../middleware/auth.middleware');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
const resumeStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'pragati/resumes', resource_type: 'raw', allowed_formats: ['pdf', 'docx'] }
});
const uploadResume = multer({ storage: resumeStorage, limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/auth/register — accepts optional resume file
router.post('/register', uploadResume.single('resume'), async (req, res) => {
  try {
    const { name, email, password, role, department, year, rollNumber, prn, division, linkedinUrl, githubUrl, portfolioUrl } = req.body;
    const cleanEmail = email?.trim()?.toLowerCase();
    if (!cleanEmail || !password) return res.status(400).json({ error: 'Email and password required' });

    const existing = await User.findOne({ email: cleanEmail });
    if (existing) return res.status(400).json({ error: 'An account with this email is already registered. Please log in.' });

    const userData = { name: name?.trim(), email: cleanEmail, password, role: role || 'student', department: department || 'CSE' };
    if (year) userData.year = Number(year);
    if (rollNumber) userData.rollNumber = rollNumber;
    if (prn) userData.prn = prn;
    if (division) userData.division = division;
    if (req.file) userData.resumeUrl = req.file.path;
    if (linkedinUrl) userData.linkedinUrl = linkedinUrl;
    if (githubUrl) userData.githubUrl = githubUrl;
    if (portfolioUrl) userData.portfolioUrl = portfolioUrl;

    const user = await User.create(userData);
    const tokens = generateTokens(user._id, user.role);
    res.status(201).json({ message: 'Registered successfully', user, ...tokens });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(401).json({ error: 'No account found with this email address. Please register first.' });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect password. Please verify your password.' });
    }

    if (!user.isActive) return res.status(403).json({ error: 'Account has been deactivated. Please contact your college administrator.' });

    const tokens = generateTokens(user._id, user.role);
    res.json({ message: 'Login successful', user, token: tokens.accessToken, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const { sendEmail } = require('../utils/mailer');
const crypto = require('crypto');

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    
    const user = await User.findOne({ email });
    if (!user) {
      // Return 200 even if not found to prevent email enumeration
      return res.json({ message: 'If an account exists, a temporary password has been sent.' });
    }

    // Generate secure 8-character temporary password
    const tempPassword = crypto.randomBytes(4).toString('hex');
    user.password = tempPassword;
    await user.save();

    const subject = 'Your Temporary PRAGATI Password';
    const text = `Hello ${user.name},\n\nYour temporary password is: ${tempPassword}\n\nPlease log in and change this password immediately in your Profile section.\n\nBest Regards,\nPRAGATI Team`;
    const html = `<div style="font-family: sans-serif;">
      <h2>Password Reset</h2>
      <p>Hello ${user.name},</p>
      <p>Your temporary password is: <strong style="font-size: 1.2rem; color: #531697;">${tempPassword}</strong></p>
      <p>Please log in and change this password immediately via your Edit Profile menu.</p>
      <br/><p>Best Regards,<br/>PRAGATI Team</p>
    </div>`;

    await sendEmail(user.email, subject, text, html);
    console.log('✅ Forgot‑password email dispatched to', user.email);
    res.json({ message: 'If an account exists, a temporary password has been sent.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    if (!process.env.JWT_REFRESH_SECRET) {
      return res.status(500).json({ error: 'JWT_REFRESH_SECRET missing in env' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const tokens = generateTokens(user._id, user.role);

    res.json(tokens);
  } catch (err) {
    console.log("REFRESH ERROR:", err.message); 
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));

module.exports = router;
