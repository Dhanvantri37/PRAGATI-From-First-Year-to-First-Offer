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
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const userData = { name, email, password, role: role || 'student', department };
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
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ error: 'Account deactivated' });
    const tokens = generateTokens(user._id, user.role);
    res.json({ message: 'Login successful', user, ...tokens });
  } catch (err) { res.status(500).json({ error: err.message }); }
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
