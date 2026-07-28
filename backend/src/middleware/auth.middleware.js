const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

// Generate access + refresh token pair
const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' } // Increased to 24 hours to prevent frequent active session expirations
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '30d' } // Increased to 30 days
  );
  return { accessToken, refreshToken };
};

const { getDecayedStreak } = require('../utils/streakHelper');

// Middleware: verify access token
const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or deactivated' });
    }

    // Auto-decay streak if needed
    if (user.role === 'student' && user.streak > 0 && user.lastSolvedDate) {
      const decayed = getDecayedStreak(user);
      if (decayed !== user.streak) {
        user.streak = decayed;
        await User.findByIdAndUpdate(user._id, { streak: decayed });
      }
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Middleware: restrict to specific roles
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const userRole = (req.user.role || '').toLowerCase().trim();
  const allowed = roles.map(r => r.toLowerCase().trim());

  if (allowed.includes('admin')) {
    allowed.push('superadmin', 'pragati-admin', 'administrator');
  }
  if (allowed.includes('faculty')) {
    allowed.push('professor', 'teacher', 'placement_officer', 'tnp', 'staff', 'faculty_member');
  }

  if (!allowed.includes(userRole)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

module.exports = { generateTokens, authenticate, authorize };
