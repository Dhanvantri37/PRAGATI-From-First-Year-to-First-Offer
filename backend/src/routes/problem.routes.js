const router = require('express').Router();
const { Problem, UserProblem } = require('../models/index');
const User = require('../models/User.model');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const DIFFICULTY_MAP = { Beginner:'Easy', Intermediate:'Medium', Expert:'Hard' };
const LOWER_DIFF     = { Hard:'Medium', Medium:'Easy', Easy:'Easy' };

// Local-midnight "today" — same as original, avoids UTC-offset mismatch with existing DB records
function todayLocal() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

function isSameLocalDay(d1, d2) {
  if (!d1 || !d2) return false;
  const a = new Date(d1), b = new Date(d2);
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}

// ─── GET /api/problems/daily ──────────────────────────────────────────────────
// Assigns exactly ONE problem per user per calendar day.
// Returns the same problem on every subsequent visit that day.
router.get('/daily', authenticate, async (req, res) => {
  try {
    const user       = req.user;
    const difficulty = DIFFICULTY_MAP[user.skillLevel] || 'Easy';
    const today      = todayLocal();

    // ── Already assigned today? Return it immediately (same problem every visit) ──
    const existing = await UserProblem.findOne({
      userId:    user._id,
      createdAt: { $gte: today },
    }).populate('problemId');

    if (existing?.problemId) {
      // Calculate hours remaining until tomorrow midnight
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const hoursLeft = Math.max(0, Math.floor((tomorrow - Date.now()) / 3600000));

      return res.json({
        userProblem:          existing,
        problem:              existing.problemId,
        hoursUntilNext:       hoursLeft,
        alreadyAssignedToday: true,
      });
    }

    // ── Pick a new problem (exclude last 14 days for variety) ─────────────────
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const recentIds = (await UserProblem
      .find({ userId: user._id, createdAt: { $gte: twoWeeksAgo } })
      .select('problemId')).map(u => u.problemId);

    // Try matched difficulty → any unseen → any
    let problems = await Problem.aggregate([
      { $match: { difficulty, _id: { $nin: recentIds } } },
      { $sample: { size: 1 } },
    ]);
    if (!problems.length) {
      problems = await Problem.aggregate([
        { $match: { _id: { $nin: recentIds } } },
        { $sample: { size: 1 } },
      ]);
    }
    if (!problems.length) {
      problems = await Problem.aggregate([{ $sample: { size: 1 } }]);
    }
    if (!problems.length) {
      return res.status(404).json({
        message: 'No problems in database. Run: node src/utils/leetcode-problems-seed.js',
      });
    }

    const up = await UserProblem.create({
      userId:    user._id,
      problemId: problems[0]._id,
      status:    'assigned',
    });

    res.json({
      userProblem:          up,
      problem:              problems[0],
      hoursUntilNext:       24,
      alreadyAssignedToday: false,
      message:              '🎯 New daily problem! Solve it before midnight to keep your streak.',
    });
  } catch (err) {
    console.error('[/daily]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/problems/shuffle ───────────────────────────────────────────────
router.post('/shuffle', authenticate, async (req, res) => {
  try {
    const user    = req.user;
    const today   = todayLocal();

    const existing = await UserProblem.findOne({ userId: user._id, createdAt: { $gte: today } });
    if (!existing)                    return res.status(404).json({ error: 'No problem assigned today' });
    if (existing.status === 'solved') return res.status(400).json({ error: 'Problem already solved!' });
    if (existing.shuffled)            return res.status(400).json({ error: 'Already shuffled today — one shuffle per day allowed.' });

    const lowerDiff  = LOWER_DIFF[DIFFICULTY_MAP[user.skillLevel] || 'Easy'];
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const recentIds = (await UserProblem
      .find({ userId: user._id, createdAt: { $gte: twoWeeksAgo } })
      .select('problemId')).map(u => u.problemId);
    recentIds.push(existing.problemId);

    let problems = await Problem.aggregate([
      { $match: { difficulty: lowerDiff, _id: { $nin: recentIds } } },
      { $sample: { size: 1 } },
    ]);
    if (!problems.length) {
      problems = await Problem.aggregate([
        { $match: { difficulty: lowerDiff } },
        { $sample: { size: 1 } },
      ]);
    }
    if (!problems.length) return res.status(404).json({ error: 'No replacement problem available' });

    await UserProblem.findByIdAndDelete(existing._id);
    const newUP = await UserProblem.create({
      userId:    user._id,
      problemId: problems[0]._id,
      status:    'assigned',
      shuffled:  true,
    });

    res.json({
      userProblem: newUP,
      problem:     problems[0],
      message:     `🔀 Shuffled to a ${lowerDiff} problem. Good luck!`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/problems/:id/solve ─────────────────────────────────────────────
router.post('/:id/solve', authenticate, async (req, res) => {
  try {
    const { approachNotes, solutionCode, selfRating, timeTakenMinutes } = req.body;

    if (!solutionCode || solutionCode.trim().length < 10) {
      return res.status(400).json({
        error: 'Please paste your solution code (min 10 chars) before submitting.',
      });
    }

    const up = await UserProblem.findOneAndUpdate(
      { userId: req.user._id, problemId: req.params.id },
      {
        status:           'solved',
        solvedAt:         new Date(),
        approachNotes,
        solutionCode,
        selfRating,
        timeTakenMinutes: timeTakenMinutes || null,
      },
      { new: true }
    );
    if (!up) return res.status(404).json({ error: 'Problem assignment not found' });

    // ── Streak logic (original, local-day based) ──────────────────────────────
    const user      = await User.findById(req.user._id);
    const today     = todayLocal();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastSolved = user.lastSolvedDate ? new Date(user.lastSolvedDate) : null;
    let newStreak = 1;
    if (lastSolved) {
      if (isSameLocalDay(lastSolved, today))     newStreak = user.streak;           // already solved today
      else if (isSameLocalDay(lastSolved, yesterday)) newStreak = (user.streak || 0) + 1; // consecutive day
      // else: gap > 1 day → reset to 1
    }

    await User.findByIdAndUpdate(req.user._id, {
      streak:         newStreak,
      lastSolvedDate: new Date(),
      $inc:           { totalProblemsSolved: 1 },
    });

    const badges = [];
    if (newStreak === 7)   badges.push('🔥 7-Day Streak!');
    if (newStreak === 30)  badges.push('⚡ 30-Day Streak Legend!');
    if (newStreak === 100) badges.push('🏆 100-Day Champion!');

    res.json({
      message:     '🎉 Solved! Great work!',
      streak:      newStreak,
      userProblem: up,
      badges,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── POST /api/problems/:id/attempt ──────────────────────────────────────────
router.post('/:id/attempt', authenticate, async (req, res) => {
  try {
    await UserProblem.findOneAndUpdate(
      { userId: req.user._id, problemId: req.params.id, status: 'assigned' },
      { status: 'attempted' }
    );
    res.json({ message: 'Marked as attempted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── GET /api/problems/history ────────────────────────────────────────────────
router.get('/history', authenticate, async (req, res) => {
  try {
    const history = await UserProblem.find({ userId: req.user._id })
      .populate('problemId')
      .sort({ createdAt: -1 })
      .limit(60);
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/problems/stats ──────────────────────────────────────────────────
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const [total, solved, attempted] = await Promise.all([
      UserProblem.countDocuments({ userId }),
      UserProblem.countDocuments({ userId, status: 'solved' }),
      UserProblem.countDocuments({ userId, status: 'attempted' }),
    ]);
    const byTopic = await UserProblem.aggregate([
      { $match: { userId, status: 'solved' } },
      { $lookup: { from: 'problems', localField: 'problemId', foreignField: '_id', as: 'prob' } },
      { $unwind: '$prob' },
      { $group: { _id: '$prob.topic', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const byDifficulty = await UserProblem.aggregate([
      { $match: { userId, status: 'solved' } },
      { $lookup: { from: 'problems', localField: 'problemId', foreignField: '_id', as: 'prob' } },
      { $unwind: '$prob' },
      { $group: { _id: '$prob.difficulty', count: { $sum: 1 } } },
    ]);
    res.json({ total, solved, attempted, byTopic, byDifficulty });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/problems ────────────────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const filter = {};
    if (req.query.difficulty) filter.difficulty = req.query.difficulty;
    if (req.query.topic)      filter.topic = req.query.topic;
    if (req.query.source)     filter.source = req.query.source;
    if (req.query.search)     filter.title = { $regex: req.query.search, $options: 'i' };
    if (req.query.company)    filter.companies = { $in: [req.query.company] };

    const problems = await Problem.find(filter)
      .select('title source problemId url difficulty topic tags companies description constraints')
      .sort({ difficulty: 1, topic: 1 });

    res.json({ problems });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/problems — admin/faculty ──────────────────────────────────────
router.post('/', authenticate, authorize('admin', 'faculty'), async (req, res) => {
  try {
    const p = await Problem.create(req.body);
    res.status(201).json({ message: 'Problem added', problem: p });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── DELETE /api/problems/:id — admin ────────────────────────────────────────
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await Problem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Problem removed' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;