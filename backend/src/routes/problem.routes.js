const router = require('express').Router();
const axios = require('axios');
const mongoose = require('mongoose');
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
// Assigns exactly THREE problems per user per calendar day (1 Easy, 1 Medium, 1 Hard).
// Returns the same problems on every subsequent visit that day.
router.get('/daily', authenticate, async (req, res) => {
  try {
    const user       = req.user;
    const today      = todayLocal();

    // ── Already assigned today? Return them immediately ──
    const existing = await UserProblem.find({
      userId:    user._id,
      isDaily:   true,
      createdAt: { $gte: today },
    }).populate('problemId');

    if (existing.length === 3) {
      // Calculate hours remaining until tomorrow midnight
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const hoursLeft = Math.max(0, Math.floor((tomorrow - Date.now()) / 3600000));

      const dailyProblems = existing.map(up => ({
        userProblem: up,
        problem: up.problemId
      }));

      return res.json({
        dailyProblems,
        hoursUntilNext:       hoursLeft,
        alreadyAssignedToday: true,
      });
    }

    // Clean up any incomplete daily assignments for today (if any exist)
    await UserProblem.deleteMany({
      userId:  user._id,
      isDaily: true,
      createdAt: { $gte: today }
    });

    // ── Pick new problems (exclude last 14 days for variety) ─────────────────
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const recentIds = (await UserProblem
      .find({ userId: user._id, createdAt: { $gte: twoWeeksAgo } })
      .select('problemId')).map(u => u.problemId);

    // Helper to pick a problem of specific difficulty
    async function pickProblem(difficulty) {
      let problem = await Problem.aggregate([
        { $match: { source: 'LeetCode', difficulty, _id: { $nin: recentIds } } },
        { $sample: { size: 1 } },
      ]);
      if (!problem.length) {
        problem = await Problem.aggregate([
          { $match: { source: 'LeetCode', difficulty } },
          { $sample: { size: 1 } },
        ]);
      }
      if (!problem.length) {
        problem = await Problem.aggregate([
          { $match: { difficulty } },
          { $sample: { size: 1 } },
        ]);
      }
      return problem[0];
    }

    const easyProb = await pickProblem('Easy');
    const medProb  = await pickProblem('Medium');
    const hardProb = await pickProblem('Hard');

    if (!easyProb || !medProb || !hardProb) {
      return res.status(404).json({
        message: 'Problems database empty. Please wait a few seconds for LeetCode background sync to complete, then refresh!',
      });
    }

    // Create UserProblem records
    const upEasy = await UserProblem.create({ userId: user._id, problemId: easyProb._id, status: 'assigned', isDaily: true });
    const upMed  = await UserProblem.create({ userId: user._id, problemId: medProb._id, status: 'assigned', isDaily: true });
    const upHard = await UserProblem.create({ userId: user._id, problemId: hardProb._id, status: 'assigned', isDaily: true });

    const dailyProblems = [
      { userProblem: upEasy, problem: easyProb },
      { userProblem: upMed, problem: medProb },
      { userProblem: upHard, problem: hardProb }
    ];

    res.json({
      dailyProblems,
      hoursUntilNext:       24,
      alreadyAssignedToday: false,
      message:              '🎯 New daily targets! Solve at least 1 to advance your streak, solve all 3 for maximum heatmap purple shading!',
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

    let up = await UserProblem.findOneAndUpdate(
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

    if (!up) {
      // Create new solved record if not pre-assigned
      up = await UserProblem.create({
        userId:           req.user._id,
        problemId:        req.params.id,
        status:           'solved',
        solvedAt:         new Date(),
        approachNotes,
        solutionCode,
        selfRating,
        timeTakenMinutes: timeTakenMinutes || null,
        isDaily:          false
      });
    }

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

// ─── GET /api/problems/:idOrTitle — get problem details (with live LeetCode fetching) ──
router.get('/:idOrTitle', authenticate, async (req, res) => {
  try {
    const { idOrTitle } = req.params;
    let problem;

    if (mongoose.Types.ObjectId.isValid(idOrTitle)) {
      problem = await Problem.findById(idOrTitle);
    } else {
      // Find by title (case-insensitive regex)
      problem = await Problem.findOne({ title: { $regex: new RegExp(`^${idOrTitle.trim()}$`, 'i') } });
    }

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Lazily fetch description & hints from LeetCode if not present or generic
    const isGeneric = !problem.description || 
                      problem.description.trim().length === 0 || 
                      problem.description.includes('Given the input parameters representing');

    let updated = false;

    if (isGeneric) {
      console.log(`[LeetCode Scrape] Fetching live description for: ${problem.title}`);
      
      // Extract titleSlug from url, or generate it
      let titleSlug = '';
      if (problem.url) {
        const parts = problem.url.split('/').filter(Boolean);
        // LeetCode URLs are typically https://leetcode.com/problems/title-slug/
        titleSlug = parts[parts.length - 1]; 
      }
      if (!titleSlug || titleSlug === 'problems') {
        titleSlug = problem.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }

      const details = await fetchLeetCodeProblemDetails(titleSlug);
      if (details) {
        if (details.content) {
          problem.description = details.content;
          updated = true;
        }
        if (details.hints && details.hints.length > 0) {
          problem.hints = details.hints;
          updated = true;
        }
      }
    }

    // Lazy-load dynamic editorial if missing and we have description
    if (problem.description && !problem.editorial) {
      console.log(`[Dynamic Editorial] Generating live editorial for: ${problem.title}`);
      try {
        const editorial = await generateEditorial(
          problem.title,
          problem.description,
          problem.difficulty,
          problem.topic || 'Algorithms'
        );
        if (editorial) {
          problem.editorial = editorial;
          updated = true;
        }
      } catch (err) {
        console.error('[Dynamic Editorial Error]', err.message);
      }
    }

    if (updated) {
      await problem.save();
      console.log(`[LeetCode Scrape] Saved dynamic data (description, hints, editorial) for: ${problem.title}`);
    }

    res.json({ problem });
  } catch (err) {
    console.error('[/problems/:idOrTitle]', err);
    res.status(500).json({ error: err.message });
  }
});

// Helper to generate a detailed Editorial solution using Gemini
async function generateEditorial(problemTitle, description, difficulty, topic) {
  const key = process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY;
  if (!key) {
    console.warn('[Dynamic Editorial] No GEMINI_API_KEY found, skipping AI editorial generation.');
    return '';
  }

  // Remove HTML tags for prompt cleanliness
  const cleanDescription = (description || '').replace(/<[^>]*>/g, '').trim();

  const prompt = `Write an exceptional, detailed, and highly comprehensive software engineering interview Editorial Solution in Markdown for the LeetCode problem "${problemTitle}".
Difficulty: ${difficulty}
Topic: ${topic}

Problem Description:
${cleanDescription}

Requirements:
1. Intuition & High-level Approach (Explain the optimal way to think about the problem).
2. Step-by-step Algorithm breakdown.
3. Optimal Implementation (Provide a clean JavaScript solution and a clean Python solution with descriptive comments).
4. Time & Space Complexity analysis (Analyze and justify the bounds, e.g., O(N) time and O(1) space, explaining why).

Return ONLY the Markdown content. Do not wrap in extra introductory or trailing text. Start directly with "### Editorial Solution".`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2548
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000
      }
    );
    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text.trim();
  } catch (err) {
    console.error(`[Dynamic Editorial Generator Error] Failed for ${problemTitle}:`, err.message);
    return '';
  }
}

// Helper to fetch details from LeetCode GraphQL
async function fetchLeetCodeProblemDetails(titleSlug) {
  try {
    const response = await axios.post('https://leetcode.com/graphql', {
      query: `
        query questionData($titleSlug: String!) {
          question(titleSlug: $titleSlug) {
            content
            hints
          }
        }
      `,
      variables: { titleSlug }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });
    return response.data?.data?.question;
  } catch (err) {
    console.error(`[GraphQL Fetch Error] Failed for ${titleSlug}:`, err.message);
    return null;
  }
}

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

// ─── POST /api/problems/sync — admin/faculty manual sync ───────────────────
router.post('/sync', authenticate, authorize('admin', 'faculty'), async (req, res) => {
  try {
    syncLeetCodeProblems()
      .then(cnt => console.log(`[Manual Sync] Upserted ${cnt} LeetCode problems.`))
      .catch(err => console.error('[Manual Sync Error]', err));
    res.json({ message: '🔄 LeetCode problems synchronization started in background.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── LeetCode GraphQL Fetcher / Synchronizer ─────────────────────────────────
async function syncLeetCodeProblems() {
  try {
    console.log('🔄 Starting LeetCode problems synchronization...');
    let totalCount = 1000;
    let skip = 0;
    let limit = 1000;
    let allQuestions = [];

    // Fetch in chunks of 1000 to avoid payload size limit / timeout
    while (skip < totalCount) {
      const response = await axios.post('https://leetcode.com/graphql', {
        query: `
          query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
            problemsetQuestionList: questionList(
              categorySlug: $categorySlug
              limit: $limit
              skip: $skip
              filters: $filters
            ) {
              total: totalNum
              questions: data {
                acRate
                difficulty
                questionFrontendId
                isPaidOnly
                title
                titleSlug
                topicTags {
                  name
                  id
                  slug
                }
              }
            }
          }
        `,
        variables: {
          categorySlug: "all-code-questions",
          skip: skip,
          limit: limit,
          filters: {}
        }
      }, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 25000
      });

      const data = response.data?.data?.problemsetQuestionList;
      if (!data) {
        console.error('❌ Failed to fetch chunk from LeetCode GraphQL API');
        break;
      }

      totalCount = data.total;
      allQuestions = allQuestions.concat(data.questions);
      skip += limit;
      console.log(`Fetched ${allQuestions.length} of ${totalCount} problems...`);
    }

    if (allQuestions.length > 0) {
      console.log(`💾 Syncing ${allQuestions.length} LeetCode problems to MongoDB...`);
      const operations = allQuestions.map(q => {
        const titleSlug = q.titleSlug;
        const topic = q.topicTags?.[0]?.name || 'Algorithms';
        const tags = q.topicTags?.map(t => t.name) || [];
        return {
          updateOne: {
            filter: { source: 'LeetCode', problemId: String(q.questionFrontendId) },
            update: {
              $set: {
                title: q.title,
                url: `https://leetcode.com/problems/${titleSlug}/`,
                difficulty: q.difficulty,
                topic: topic,
                tags: tags,
                acceptanceRate: q.acRate,
                source: 'LeetCode'
              }
            },
            upsert: true
          }
        };
      });

      await Problem.bulkWrite(operations);
      console.log('✅ LeetCode problems synchronized successfully!');
      return allQuestions.length;
    }
    return 0;
  } catch (err) {
    console.error('❌ LeetCode problems synchronization error:', err.message);
    throw err;
  }
}

module.exports = router;
module.exports.syncLeetCodeProblems = syncLeetCodeProblems;