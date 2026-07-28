const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
require('dotenv').config();



const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose  = require('mongoose');
const http      = require('http');
const { Server } = require('socket.io');

const authRoutes         = require('./routes/auth.routes');
const userRoutes         = require('./routes/user.routes');
const noteRoutes         = require('./routes/note.routes');
const problemRoutes      = require('./routes/problem.routes');
const aptitudeRoutes     = require('./routes/aptitude.routes');
const companyRoutes      = require('./routes/company.routes');
const skillpathRoutes    = require('./routes/skillpath.routes');
const discussionRoutes   = require('./routes/discussion.routes');
const analyticsRoutes    = require('./routes/analytics.routes');
const applicationRoutes  = require('./routes/application.routes');
const announcementRoutes = require('./routes/announcement.routes');
const interviewRoutes    = require('./routes/interview.routes');
const debugRoutes        = require('./routes/debug.routes');
const directMsgRoutes    = require('./routes/directmessage.routes');
const practiceRoutes     = require('./routes/practice.routes');
const compileRoutes      = require('./routes/compile.routes');
const ttsRoutes          = require('./routes/tts.routes');
const drivesRoutes       = require('./routes/drives.routes');
const gdRoutes           = require('./routes/gd.routes');
const alumniRoutes       = require('./routes/alumni.routes');
const GDRoom             = require('./models/GDRoom.model');

const { registerGDSocket } = require('./utils/gdSocket');
const { registerCompileSocket } = require('./utils/compileSocket');

const app = express();

// Security config
app.use(helmet());

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a few minutes and try again.' },
  skip: (req) => req.path === '/health',
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' },
});
app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

// Health
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'PRAGATI Backend', timestamp: new Date() }));

// Routes
app.use('/api/auth',           authRoutes);
app.use('/api/users',          userRoutes);
app.use('/api/notes',          noteRoutes);
app.use('/api/problems',       problemRoutes);
app.use('/api/aptitude',       aptitudeRoutes);
app.use('/api/companies',      companyRoutes);
app.use('/api/skillpath',      skillpathRoutes);
app.use('/api/discussions',    discussionRoutes);
app.use('/api/analytics',      analyticsRoutes);
app.use('/api/applications',   applicationRoutes);
app.use('/api/announcements',  announcementRoutes);
app.use('/api/interview',      interviewRoutes);
app.use('/api/debug',          debugRoutes);
app.use('/api/direct-messages',directMsgRoutes);
app.use('/api/practice',       practiceRoutes);
app.use('/api/compile',        compileRoutes);
app.use('/api/tts',            ttsRoutes);
app.use('/api/drives',         drivesRoutes);
app.use('/api/gd',             gdRoutes);
app.use('/api/alumni',         alumniRoutes);
app.use('/api/settings',       require('./routes/settings.routes'));

app.use('/api/notifications', require('./routes/notifications.routes'));

// Error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});
app.use('*', (req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN || '*', methods: ['GET','POST'] },
  // Increase for audio chunks
  maxHttpBufferSize: 5e6,
});

// Attach io to app so routes can emit notifications
app.set('io', io);

// ── Personal user rooms for targeted bell notifications ────────────────────────
// Each user joins a room named `user:<userId>` so routes can push to a specific user.
io.on('connection', (socket) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // JWT is signed with { userId, role } — use decoded.userId (NOT decoded.id)
      const uid = decoded.userId || decoded.id || decoded._id;
      if (uid) {
        socket.join(`user:${uid}`);
        console.log(`[socket] user:${uid} joined notification room`);
      }
    } catch { /* invalid token – ignore */ }
  }
});

// GD WebSocket namespace
registerGDSocket(io, GDRoom);
registerCompileSocket(io);

const dbUri = process.env.MONGODB_URI || process.env.MONGO_URI;
const localUri = 'mongodb://127.0.0.1:27017/pragati';

console.log('[DB] Connecting to database...');
mongoose.connect(dbUri, {
  serverSelectionTimeoutMS: 2500, // 2.5s fast timeout to prevent server startup delay
})
  .then(() => {
    console.log('✅ MongoDB Atlas connected');
    startApp();
  })
  .catch(err => {
    console.warn('⚠️ MongoDB Atlas connection failed/timed out:', err.message);
    console.log('[DB] Falling back to local MongoDB at:', localUri);
    return mongoose.connect(localUri, { serverSelectionTimeoutMS: 2500 })
      .then(() => {
        console.log('✅ Local MongoDB connected');
        startApp();
      })
      .catch(localErr => {
        console.error('❌ Both local and Atlas MongoDB connections failed:', localErr.message);
        process.exit(1);
      });
  });

function startApp() {
  // ── Start server immediately — don't block on seeding ─────────────────
  httpServer.listen(PORT, () => {
    console.log(`🚀 PRAGATI Backend running on port ${PORT}`);
    console.log(`   GD WebSocket /gd namespace active`);
    console.log(`   Groq AI integration active`);
  });

  // ── Seed LeetCode problems in background (only if DB is empty) ─────────
  const { Problem } = require('./models/index');
  Problem.countDocuments().then(count => {
    if (count < 10) {
      console.log('📦 Problem DB empty — running background seed...');
      try {
        const { seedProblems } = require('./utils/leetcode-problems-seed');
        seedProblems({ shouldDisconnect: false }).catch(e => console.warn('⚠️ Problem seed warning:', e.message));
      } catch (e) {
        console.warn('⚠️ Problem seed warning:', e.message);
      }
    } else {
      console.log(`📊 Problem DB ready (${count} problems loaded)`);
    }
  }).catch(() => {});

  // ── Seed Aptitude questions in background ───────────────────────────────
  try {
    const { seedAptitudeQuestions } = require('./utils/aptitude-docx-seed');
    seedAptitudeQuestions().catch(e => console.warn('⚠️ Aptitude DOCX seed warning:', e.message));
  } catch (e) {
    console.warn('⚠️ Aptitude DOCX seed warning:', e.message);
  }
}

module.exports = app;
