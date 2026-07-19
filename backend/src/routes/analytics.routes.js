const router = require('express').Router();
const User = require('../models/User.model');
const Note = require('../models/Note.model');
const { UserProblem, SkillpathResult, Discussion, Company, AptitudeQuestion, AptitudeAttempt } = require('../models/index');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { getDecayedStreak } = require('../utils/streakHelper');

// GET /api/analytics/dashboard — student personal stats
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const [problemStats, latestAnalysis, doubtStats, freshUser] = await Promise.all([
      UserProblem.aggregate([{ $match: { userId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      SkillpathResult.findOne({ userId }).sort({ analyzedAt: -1 }),
      Discussion.countDocuments({ createdBy: userId }),
      User.findById(userId).select('atsScore skillLevel streak totalProblemsSolved resumeUrl name resumeParsedSkills department year')
    ]);
    const problems = { solved: 0, assigned: 0, attempted: 0 };
    problemStats.forEach(s => { problems[s._id] = s.count; });
    if (freshUser && freshUser.streak > 0 && freshUser.lastSolvedDate) {
      freshUser.streak = getDecayedStreak(freshUser);
    }
    res.json({ user: freshUser || {}, problems, doubtsPosted: doubtStats, latestAnalysis: latestAnalysis || null });
  } catch (err) {
    console.error('Dashboard Error:', err);
    res.status(500).json({ error: 'Dashboard failed' });
  }
});

// GET /api/analytics/batch-percentile — student batch ranking (safe for all roles)
router.get('/batch-percentile', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const filter = { role: 'student' };
    if (user.department) filter.department = user.department;
    // Exclude the year filter to calculate rank department-wide
    const students = await User.find(filter).select('atsScore skillLevel _id');
    const atsList = students.map(s => s.atsScore || 0);
    const myAts = user.atsScore || 0;

    if (atsList.length < 2) {
      return res.json({ batchSize: atsList.length, percentile: 0, topPct: 0, insufficient: true,
        byLevel: { Beginner: 0, Intermediate: 0, Expert: 0 } });
    }

    const others = students.filter(s => s._id.toString() !== user._id.toString());
    const below = others.filter(s => (s.atsScore || 0) < myAts).length;
    const percentile = others.length > 0 ? Math.round((below / others.length) * 100) : 0;
    const topPct = Math.max(1, 100 - percentile);

    const byLevel = { Beginner: 0, Intermediate: 0, Expert: 0 };
    students.forEach(s => { byLevel[s.skillLevel || 'Beginner']++; });

    res.json({ batchSize: students.length, percentile, topPct, insufficient: false, byLevel });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/analytics/company-readiness — per-company match scores
router.get('/company-readiness', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('atsScore skillLevel resumeParsedSkills department year');
    const companies = await Company.find({}).select('name sector difficulty eligibilityCriteria jdText roles ctc');

    // Normalise student's parsed skills
    const studentSkills = new Set((user.resumeParsedSkills || []).map(s => s.toLowerCase().trim()));
    const ats = user.atsScore || 0;

    // Broader keyword list for JD matching
    const TECH_KEYWORDS = [
      'python','java','javascript','typescript','react','angular','vue','node','node.js','express',
      'sql','mysql','postgresql','mongodb','redis','firebase','nosql','sql server','oracle',
      'machine learning','deep learning','tensorflow','pytorch','keras','scikit-learn','numpy','pandas',
      'c++','c#','golang','rust','kotlin','swift','php','ruby','scala',
      'docker','kubernetes','aws','azure','gcp','devops','ci/cd','git','linux','nginx',
      'data structures','algorithms','system design','microservices','rest api','graphql',
      'spring','spring boot','django','flask','fastapi','laravel',
      'statistics','data analysis','data science','tableau','power bi','excel',
      'html','css','tailwind','bootstrap','flutter','android','ios','react native',
    ];

    const results = companies.map(c => {
      const branches = c.eligibilityCriteria?.allowedBranches || [];
      const branchOk = !branches.length || branches.includes(user.department);
      const minCgpa = c.eligibilityCriteria?.minCGPA || 6;
      const jdText = (c.jdText || '').toLowerCase();

      // Find which tech keywords appear in JD
      const demandedSkills = TECH_KEYWORDS.filter(k =>
        new RegExp('\\b' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(jdText)
      );
      const matchedSkills = demandedSkills.filter(k => studentSkills.has(k));
      const missingSkills = demandedSkills.filter(k => !studentSkills.has(k));

      let skillPct, skillLabel;
      if (demandedSkills.length === 0) {
        skillPct = 50; // neutral when no JD skills found
        skillLabel = 'No required skills defined in JD';
      } else {
        skillPct = Math.round((matchedSkills.length / demandedSkills.length) * 100);
        skillLabel = `${matchedSkills.length}/${demandedSkills.length} skills matched (${skillPct}%)`;
      }

      // Weighted score
      const skillWeight   = skillPct * 0.55;
      const atsWeight     = Math.min(100, ats) * 0.30;
      const branchBonus   = branchOk ? 10 : 0;
      const diffAdj       = { Easy: 5, Medium: 0, Hard: -5 }[c.difficulty] || 0;
      const score = Math.min(97, Math.max(10, Math.round(skillWeight + atsWeight + branchBonus + diffAdj)));

      return {
        companyId: c._id, name: c.name, sector: c.sector, difficulty: c.difficulty,
        matchScore: score, matchedSkills, missingSkills: missingSkills.slice(0, 6),
        totalDemanded: demandedSkills.length, eligible: branchOk, minCgpa, ctc: c.ctc,
        breakdown: {
          skillMatch: demandedSkills.length === 0 ? 'No required skills defined in JD' : `${matchedSkills.length}/${demandedSkills.length} JD skills matched → ${skillPct}%`,
          atsContrib: `Your ATS ${ats}/100 contributes ${Math.round(atsWeight)}pts`,
          branchStatus: branchOk ? '✅ Branch eligible' : '⚠️ Branch not in eligible list',
          difficulty: `${c.difficulty || 'Unknown'} company`,
          finalScore: `${Math.round(skillWeight)}(skill) + ${Math.round(atsWeight)}(ATS) + ${branchBonus}(branch) + ${diffAdj}(difficulty) = ${score}%`,
        }
      };
    });

    results.sort((a, b) => b.matchScore - a.matchScore);
    res.json({ results, studentAts: ats, studentSkillCount: studentSkills.size });
  } catch (err) {
    console.error('Company readiness error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/faculty — faculty dashboard stats
router.get('/faculty', authenticate, authorize('faculty'), async (req, res) => {
  try {
    const facultyId = req.user._id;
    const [notesCount, pendingDoubts, companiesCount, totalStudents] = await Promise.all([
      Note.countDocuments({ uploadedBy: facultyId }),
      Discussion.countDocuments({ isResolved: false }),
      Company.countDocuments({}),
      User.countDocuments({ role: 'student' })
    ]);
    const recentNotes = await Note.find({ uploadedBy: facultyId })
      .sort({ createdAt: -1 }).limit(5).select('title subject status createdAt');
    res.json({ notesCount: notesCount || 0, pendingDoubts: pendingDoubts || 0, companiesCount: companiesCount || 0, recentNotes: recentNotes || [], totalStudents });
  } catch (err) {
    res.status(500).json({ notesCount: 0, pendingDoubts: 0, companiesCount: 0, recentNotes: [], totalStudents: 0 });
  }
});

// GET /api/analytics/weak-topics — FIXED: per-student deduplication, capped at 100%
router.get('/weak-topics', authenticate, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const { department, year } = req.query;
    const studentFilter = { role: 'student' };
    if (department) studentFilter.department = department;
    if (year) studentFilter.year = Number(year);
    const students = await User.find(studentFilter).select('_id');
    const userIds = students.map(s => s._id);
    const totalStudents = students.length;

    if (totalStudents === 0) {
      return res.json({ weakTopics: [], problemWeakAreas: [], studentsAnalyzed: 0, totalStudents: 0 });
    }

    // Get LATEST SkillpathResult per student (deduplicate multiple analyses)
    const latestPerStudent = await SkillpathResult.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $sort: { analyzedAt: -1 } },
      { $group: { _id: '$userId', missingSkills: { $first: '$skillGapAnalysis.missingSkills' } } }
    ]);

    const studentsAnalyzed = latestPerStudent.length;
    const skillStudentCount = {}; // how many UNIQUE students are weak in each skill

    latestPerStudent.forEach(r => {
      const missing = r.missingSkills || [];
      const uniqueSkills = [...new Set(missing.map(s => s.toLowerCase().trim()))];
      uniqueSkills.forEach(skill => {
        if (skill && skill.length > 1) { // skip single chars
          skillStudentCount[skill] = (skillStudentCount[skill] || 0) + 1;
        }
      });
    });

    // pct = % of ANALYZED students who have this gap — capped at 100
    const weakTopics = Object.entries(skillStudentCount)
      .map(([skill, count]) => ({
        skill,
        count,
        pct: Math.min(100, Math.round((count / Math.max(studentsAnalyzed, 1)) * 100))
      }))
      .filter(t => t.pct > 0 && t.pct <= 100)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 12);

    // Problem-solving weak areas
    const upStats = await UserProblem.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $lookup: { from: 'problems', localField: 'problemId', foreignField: '_id', as: 'prob' } },
      { $unwind: '$prob' },
      { $group: { _id: '$prob.topic', solved: { $sum: { $cond: [{ $eq: ['$status', 'solved'] }, 1, 0] } }, total: { $sum: 1 } } },
      { $project: { topic: '$_id', solved: 1, total: 1, solveRate: { $divide: ['$solved', { $max: ['$total', 1] }] } } },
      { $sort: { solveRate: 1 } }, { $limit: 8 }
    ]);

    res.json({ weakTopics, problemWeakAreas: upStats, studentsAnalyzed, totalStudents });
  } catch (err) {
    console.error('Weak topics error:', err);
    res.status(500).json({ weakTopics: [], problemWeakAreas: [], studentsAnalyzed: 0, totalStudents: 0 });
  }
});

// GET /api/analytics/at-risk — students at risk of poor placement
router.get('/at-risk', authenticate, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const { department, year } = req.query;
    const filter = { role: 'student' };
    if (department) filter.department = department;
    if (year) filter.year = Number(year);
    const students = await User.find(filter).select('name rollNumber department year atsScore skillLevel streak totalProblemsSolved resumeUrl');
    const atRisk = students.map(s => {
      const risks = [];
      if (!s.resumeUrl) risks.push('No resume uploaded');
      if ((s.atsScore || 0) < 40) risks.push(`ATS score low (${s.atsScore || 0}/100)`);
      if ((s.streak || 0) === 0) risks.push('Zero streak — inactive');
      if ((s.totalProblemsSolved || 0) < 3) risks.push('Fewer than 3 problems solved');
      if (s.skillLevel === 'Beginner' && !s.atsScore) risks.push('No skill assessment done');
      const riskLevel = risks.length >= 3 ? 'high' : risks.length === 2 ? 'medium' : risks.length === 1 ? 'low' : 'none';
      return { ...s.toObject(), risks, riskLevel };
    }).filter(s => s.risks.length > 0).sort((a, b) => b.risks.length - a.risks.length);
    const summary = { high: atRisk.filter(s => s.riskLevel === 'high').length, medium: atRisk.filter(s => s.riskLevel === 'medium').length, low: atRisk.filter(s => s.riskLevel === 'low').length };
    res.json({ atRisk, summary, total: atRisk.length });
  } catch (err) { res.status(500).json({ atRisk: [], summary: {}, total: 0 }); }
});

// GET /api/analytics/cohort — admin + faculty cohort view
router.get('/cohort', authenticate, authorize('admin', 'faculty'), async (req, res) => {
  try {
    const { department, year } = req.query;
    const filter = { role: 'student' };
    if (department) filter.department = department;
    if (year) filter.year = Number(year);
    const [students, faculty] = await Promise.all([
      User.find(filter).select('name department year skillLevel streak atsScore rollNumber'),
      User.find({ role: 'faculty' }).select('name department createdAt')
    ]);
    const avgAts = students.length ? Math.round(students.reduce((s, u) => s + (u.atsScore || 0), 0) / students.length) : 0;
    const byLevel = { Beginner: 0, Intermediate: 0, Expert: 0 };
    students.forEach(s => { byLevel[s.skillLevel || 'Beginner']++; });
    res.json({ students, faculty, total: students.length, totalFaculty: faculty.length, avgAts, byLevel });
  } catch (err) { res.status(500).json({ students: [], faculty: [], total: 0, totalFaculty: 0, avgAts: 0, byLevel: {} }); }
});

// GET /api/analytics/placement-index — admin only
router.get('/placement-index', authenticate, authorize('admin'), async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('atsScore skillLevel streak totalProblemsSolved resumeUrl department');
    const deptStats = {};
    students.forEach(s => {
      if (!deptStats[s.department]) deptStats[s.department] = { count:0, atsSum:0, withResume:0, expert:0, intermediate:0, activeStreaks:0 };
      const d = deptStats[s.department];
      d.count++; d.atsSum += s.atsScore || 0;
      if (s.resumeUrl) d.withResume++;
      if (s.skillLevel === 'Expert') d.expert++;
      if (s.skillLevel === 'Intermediate') d.intermediate++;
      if ((s.streak || 0) >= 3) d.activeStreaks++;
    });
    const deptLeaderboard = Object.entries(deptStats).map(([dept, d]) => {
      const avgAts = d.count ? Math.round(d.atsSum / d.count) : 0;
      const resumePct = d.count ? Math.round((d.withResume / d.count) * 100) : 0;
      const readiness = Math.round(avgAts * 0.4 + resumePct * 0.3 + ((d.expert + d.intermediate) / Math.max(d.count,1) * 100) * 0.3);
      return { dept, count: d.count, avgAts, resumePct, readiness, expert: d.expert, intermediate: d.intermediate, activeStreaks: d.activeStreaks };
    }).sort((a, b) => b.readiness - a.readiness);
    const overall = { avgAts: students.length ? Math.round(students.reduce((s,u)=>s+(u.atsScore||0),0)/students.length) : 0,
      withResume: students.filter(s=>s.resumeUrl).length, expert: students.filter(s=>s.skillLevel==='Expert').length,
      intermediate: students.filter(s=>s.skillLevel==='Intermediate').length, activeStreaks: students.filter(s=>(s.streak||0)>=3).length, total: students.length };
    const readinessScore = overall.total ? Math.round(
      (overall.avgAts||0)*0.40 + ((overall.withResume/Math.max(overall.total,1))*100)*0.30 + ((overall.expert+overall.intermediate)/Math.max(overall.total,1)*100)*0.30
    ) : 0;
    res.json({ overall, readinessScore, deptLeaderboard });
  } catch (err) { res.status(500).json({ overall:{}, readinessScore:0, deptLeaderboard:[] }); }
});

// GET /api/analytics/company-demand — admin
router.get('/company-demand', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [companies, students] = await Promise.all([
      Company.find({}).select('name jdText roles sector'),
      User.find({ role:'student' }).select('resumeParsedSkills')
    ]);
    const skillKeywords = ['python','java','javascript','react','node.js','sql','machine learning','deep learning','c++','docker','kubernetes','aws','tensorflow','pytorch','data structures','algorithms','system design','git','linux','statistics','mongodb','postgresql','spring','django','flutter','kotlin','swift'];
    const demandMap = {};
    companies.forEach(c => {
      const jd = (c.jdText||'').toLowerCase();
      skillKeywords.forEach(skill => { if (jd.includes(skill)) demandMap[skill] = (demandMap[skill]||0)+1; });
    });
    const studentSkillCount = {};
    students.forEach(s => (s.resumeParsedSkills||[]).forEach(sk => {
      studentSkillCount[sk.toLowerCase()] = (studentSkillCount[sk.toLowerCase()]||0)+1;
    }));
    const totalCompanies = companies.length||1, totalStudents = students.length||1;
    const demandGap = Object.entries(demandMap).map(([skill,cnt])=>({
      skill, demand: Math.round((cnt/totalCompanies)*100),
      supply: Math.round(((studentSkillCount[skill]||0)/totalStudents)*100),
      gap: Math.round((cnt/totalCompanies)*100) - Math.round(((studentSkillCount[skill]||0)/totalStudents)*100)
    })).filter(s=>s.demand>10).sort((a,b)=>b.gap-a.gap).slice(0,10);
    res.json({ demandGap, totalCompanies, totalStudents });
  } catch (err) { res.status(500).json({ demandGap:[], totalCompanies:0, totalStudents:0 }); }
});

// GET /api/analytics/dept-placement-index — faculty sees their dept
router.get('/dept-placement-index', authenticate, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const dept = req.query.department || req.user.department;
    const students = await User.find({ role:'student', department:dept }).select('atsScore skillLevel streak totalProblemsSolved resumeUrl year');
    const total = students.length || 1;
    const avgAts = Math.round(students.reduce((s,u)=>s+(u.atsScore||0),0)/total);
    const withResume = students.filter(s=>s.resumeUrl).length;
    const expert = students.filter(s=>s.skillLevel==='Expert').length;
    const intermediate = students.filter(s=>s.skillLevel==='Intermediate').length;
    const activeStreaks = students.filter(s=>(s.streak||0)>=3).length;
    const readiness = Math.round((avgAts||0)*0.40+((withResume/total)*100)*0.30+(((expert+intermediate)/total)*100)*0.30);
    const byYear = {};
    students.forEach(s=>{ const y=s.year||0; if(!byYear[y]) byYear[y]={count:0,atsSum:0}; byYear[y].count++; byYear[y].atsSum+=s.atsScore||0; });
    const yearBreakdown = Object.entries(byYear).map(([year,d])=>({ year:Number(year), count:d.count, avgAts:Math.round(d.atsSum/d.count) })).sort((a,b)=>a.year-b.year);
    res.json({ department:dept, total:students.length, avgAts, withResume, expert, intermediate, activeStreaks, readiness, yearBreakdown });
  } catch (err) { res.status(500).json({ error:err.message }); }
});


// GET /api/analytics/leaderboard — fully dynamic, based on all activity
router.get('/leaderboard', authenticate, async (req, res) => {
  try {
    const { AptitudeAttempt, UserProblem, Discussion, SkillpathResult } = require('../models/index');
    const limit = Math.min(Number(req.query.limit) || 200, 500);

    const students = await User.find({ role:'student', isActive:true })
      .select('name department year skillLevel streak lastSolvedDate atsScore totalProblemsSolved linkedinUrl githubUrl portfolioUrl rollNumber createdAt lastLoginAt');

    // Fetch all activity in parallel
    const [aptStats, problemStats, discussionStats, skillpathStats, attemptDates, problemDates] = await Promise.all([
      // Aptitude: total attempts, correct per user
      AptitudeAttempt.aggregate([
        { $group:{ _id:'$userId', total:{$sum:1}, correct:{$sum:{$cond:['$correct',1,0]}},
            topicsAttempted:{ $addToSet:'$topic' },
            lastAttempt:{ $max:'$attemptedAt' }
        }}
      ]),
      // Coding: solved vs total per user
      UserProblem.aggregate([
        { $group:{ _id:'$userId',
            solved:{ $sum:{$cond:[{$eq:['$status','solved']},1,0]} },
            attempted:{ $sum:1 },
            lastSolved:{ $max:'$updatedAt' }
        }}
      ]),
      // Discussions: posts made
      Discussion.aggregate([
        { $group:{ _id:'$createdBy', count:{$sum:1} } }
      ]),
      // SkillPath: latest ATS score from analysis
      SkillpathResult.aggregate([
        { $sort:{ analyzedAt:-1 } },
        { $group:{ _id:'$userId', atsScore:{ $first:'$atsScore' }, analyzedAt:{ $first:'$analyzedAt' } }}
      ]),
      // Submission dates for heatmap (Aptitude)
      AptitudeAttempt.aggregate([
        { $match: { attemptedAt: { $type: 'date' } } },
        { $project:{ userId: 1, date:{ $dateToString:{ format:'%Y-%m-%d', date:'$attemptedAt' } } } },
        { $group:{ _id:'$userId', dates:{ $push:'$date' } } }
      ]),
      // Submission dates for heatmap (Coding)
      UserProblem.aggregate([
        { $match: { status: 'solved', updatedAt: { $type: 'date' } } },
        { $project:{ userId: 1, date:{ $dateToString:{ format:'%Y-%m-%d', date:'$updatedAt' } } } },
        { $group:{ _id:'$userId', dates:{ $push:'$date' } } }
      ])
    ]);

    // Build lookup maps
    const aptMap   = {}; aptStats.forEach(a   => { if (a && a._id) aptMap[a._id.toString()]   = a; });
    const probMap  = {}; problemStats.forEach(p => { if (p && p._id) probMap[p._id.toString()] = p; });
    const discMap  = {}; discussionStats.forEach(d => { if (d && d._id) discMap[d._id.toString()] = d; });
    const spMap    = {}; skillpathStats.forEach(s => { if (s && s._id) spMap[s._id.toString()]   = s; });
    const dateMap  = {}; 
    attemptDates.forEach(d => { if (d && d._id) dateMap[d._id.toString()] = [...(dateMap[d._id.toString()] || []), ...d.dates]; });
    problemDates.forEach(d => { if (d && d._id) dateMap[d._id.toString()] = [...(dateMap[d._id.toString()] || []), ...d.dates]; });

    const scored = students.map(s => {
      const id  = s._id.toString();
      const apt = aptMap[id]  || { total:0, correct:0, topicsAttempted:[] };
      const prb = probMap[id] || { solved:0, attempted:0 };
      const dsc = discMap[id] || { count:0 };
      const sp  = spMap[id];

      // --- Score components (all 0-100) ---
      // 1. Aptitude accuracy (40%)
      const aptAccuracy  = apt.total > 0 ? (apt.correct / apt.total) * 100 : 0;
      // Bonus for volume: up to +20 points for 100+ attempts
      const aptVolBonus  = Math.min(20, (apt.total / 100) * 20);
      // Bonus for breadth: attempting multiple topics
      const aptBreadth   = Math.min(10, (apt.topicsAttempted?.length || 0) * 2);
      const aptScore     = Math.min(100, Math.round(aptAccuracy * 0.7 + aptVolBonus + aptBreadth));

      // 2. Coding score (35%)
      const codingScore  = Math.min(100, Math.round((prb.solved || 0) * 5));

      // 3. Activity score (25%) — streak + ats + discussions + skillpath
      const actualStreak = getDecayedStreak(s);
      const streakScore  = Math.min(40, actualStreak * 2);
      const atsFromSP    = sp?.atsScore || s.atsScore || 0;
      const atsScore     = Math.min(40, atsFromSP * 0.4);
      const discScore    = Math.min(10, (dsc.count || 0) * 2);
      const spScore      = sp ? 10 : 0;
      const actScore     = Math.min(100, Math.round(streakScore + atsScore + discScore + spScore));

      const totalScore   = Math.round(aptScore * 0.40 + codingScore * 0.35 + actScore * 0.25);

      return {
        _id: s._id, name: s.name, department: s.department, year: s.year,
        rollNumber: s.rollNumber, skillLevel: s.skillLevel,
        aptScore, codingProblems: prb.solved || 0,
        streak: actualStreak, atsScore: atsFromSP,
        totalAptAttempts: apt.total, aptTopics: apt.topicsAttempted?.length || 0,
        discussions: dsc.count || 0, hasSkillPath: !!sp,
        linkedinUrl: s.linkedinUrl, githubUrl: s.githubUrl, portfolioUrl: s.portfolioUrl,
        submissionDates: dateMap[id] || [],
        totalScore,
        // Breakdown for transparency
        scoreBreakdown: {
          aptitude:  `${aptScore}/100 (${apt.total} attempts, ${Math.round(aptAccuracy)}% accuracy)`,
          coding:    `${codingScore}/100 (${prb.solved} problems solved)`,
          activity:  `${actScore}/100 (streak:${actualStreak}, ATS:${atsFromSP}, discussions:${dsc.count||0})`,
          total:     `${totalScore} = apt(${Math.round(aptScore*0.4)}) + code(${Math.round(codingScore*0.35)}) + activity(${Math.round(actScore*0.25)})`
        }
      };
    });

    scored.sort((a, b) => b.totalScore - a.totalScore);
    const ranked = scored.slice(0, limit).map((s, i) => ({ ...s, rank: i + 1 }));
    res.json({ leaderboard: ranked, total: students.length, lastUpdated: new Date() });
  } catch(err) { console.error(err); res.status(500).json({ error:err.message }); }
});

// GET /api/analytics/my-profile — any authenticated user can get their own full profile
router.get('/my-profile', authenticate, async (req, res) => {
  try {
    const { AptitudeAttempt, UserProblem, Discussion, SkillpathResult } = require('../models/index');
    const student = await User.findById(req.user._id).select('-password');
    if (!student) return res.status(404).json({ error:'User not found' });
    if (student && student.streak > 0 && student.lastSolvedDate) {
      student.streak = getDecayedStreak(student);
    }

    const [aptStats, recentActivity, discussionCount, skillpathResults, aptDateGroups, problemDateGroups, solvedUPs] = await Promise.all([
      AptitudeAttempt.aggregate([
        { $match:{ userId: student._id } },
        { $group:{ _id:'$topic', total:{$sum:1}, correct:{$sum:{$cond:['$correct',1,0]}},
            lastAttempt:{ $max:'$attemptedAt' } }},
        { $project:{ topic:'$_id', total:1, correct:1, lastAttempt:1,
            accuracy:{ $round:[{ $multiply:[{ $divide:['$correct',{ $cond:[{$eq:['$total',0]},1,'$total'] }] },100] },1] } }},
        { $sort:{ total:-1 } }
      ]),
      AptitudeAttempt.find({ userId: student._id }).sort({ attemptedAt:-1 }).limit(20)
        .populate('questionId','question topic difficulty'),
      Discussion.countDocuments({ createdBy: student._id }),
      SkillpathResult.find({ userId: student._id }).sort({ analyzedAt:-1 }).limit(5),
      AptitudeAttempt.aggregate([
        { $match:{ userId: student._id, attemptedAt: { $type: 'date' } } },
        { $group:{ _id:{ $dateToString:{ format:'%Y-%m-%d', date:'$attemptedAt' } }, count:{ $sum:1 } } },
        { $sort:{ _id:1 } }
      ]),
      UserProblem.aggregate([
        { $match:{ userId: student._id, status: 'solved', updatedAt: { $type: 'date' } } },
        { $group:{ _id:{ $dateToString:{ format:'%Y-%m-%d', date:'$updatedAt' } }, count:{ $sum:1 } } },
        { $sort:{ _id:1 } }
      ]),
      // Fetch solved problem IDs directly — no $lookup so no CastError for Mixed IDs
      UserProblem.find({ userId: student._id, status: 'solved' }).select('problemId').lean()
    ]);

    // Cast-safe difficulty lookup: separate ObjectIds from string IDs (like "nc-101")
    const mongoose = require('mongoose');
    const solvedObjIds = [], solvedStrIds = [];
    solvedUPs.forEach(up => {
      const id = up.problemId;
      if (!id) return;
      const s = String(id);
      if (mongoose.Types.ObjectId.isValid(s) && s.length === 24) solvedObjIds.push(id);
      else solvedStrIds.push(s);
    });
    const { Problem: ProbModel } = require('../models/index');
    const [diffByObj, diffByStr] = await Promise.all([
      solvedObjIds.length ? ProbModel.find({ _id: { $in: solvedObjIds } }).select('difficulty topic').lean() : [],
      solvedStrIds.length ? ProbModel.find({ problemId: { $in: solvedStrIds } }).select('difficulty topic').lean() : [],
    ]);
    const allSolvedProbs = [...diffByObj, ...diffByStr];
    const easyS  = allSolvedProbs.filter(p => p.difficulty === 'Easy').length;
    const medS   = allSolvedProbs.filter(p => p.difficulty === 'Medium').length;
    const hardS  = allSolvedProbs.filter(p => p.difficulty === 'Hard').length;
    const totalSolved = solvedUPs.length;
    // Build codingStats by topic (backward compat)
    const topicMap = {};
    allSolvedProbs.forEach(p => {
      const t = p.topic || 'General';
      if (!topicMap[t]) topicMap[t] = { topic:t, total:0, solved:0, easy:0, medium:0, hard:0 };
      topicMap[t].solved++; topicMap[t].total++;
      if (p.difficulty==='Easy') topicMap[t].easy++;
      else if (p.difficulty==='Medium') topicMap[t].medium++;
      else if (p.difficulty==='Hard') topicMap[t].hard++;
    });
    const codingStats = Object.values(topicMap);



    const totalApt   = aptStats.reduce((a,c)=>a+(c.total||0),0);
    const correctApt = aptStats.reduce((a,c)=>a+(c.correct||0),0);
    const contestRatings = skillpathResults.map(r=>({
      rating: Math.max(1200, Math.round((r.atsScore||0)*8+1200)), date: r.analyzedAt
    })).reverse();

    res.json({
      student, aptStats, codingStats, recentActivity, skillpathResults,
      submissionDates: [
        ...aptDateGroups.flatMap(d => Array(d.count).fill(d._id)),
        ...problemDateGroups.flatMap(d => Array(d.count).fill(d._id))
      ].sort(),
      problemStats:{ easy:easyS, medium:medS, hard:hardS },
      contestRatings,
      summary:{ totalApt, correctApt, totalSolved, discussionCount,
        accuracy: totalApt ? Math.round((correctApt/totalApt)*100):0,
        topicsAttempted: aptStats.length, hasSkillPath: skillpathResults.length>0 }
    });
  } catch(err) { console.error(err); res.status(500).json({ error:err.message }); }
});

// GET /api/analytics/student-profile/:id — students can view basic profile of peers; full data for faculty/admin
router.get('/student-profile/:id', authenticate, async (req, res) => {
  try {
    const { AptitudeAttempt, UserProblem, Discussion, SkillpathResult } = require('../models/index');
    const isFacultyOrAdmin = req.user.role === 'faculty' || req.user.role === 'admin';
    const isOwnProfile = req.user._id.toString() === req.params.id;

    const student = await User.findById(req.params.id).select('-password');
    if (!student) return res.status(404).json({ error:'Student not found' });
    if (student && student.streak > 0 && student.lastSolvedDate) {
      student.streak = getDecayedStreak(student);
    }

    const [aptStats, recentActivity, discussionCount, skillpathResults, aptDateGroups, problemDateGroups, solvedUPs] = await Promise.all([
      AptitudeAttempt.aggregate([
        { $match:{ userId: student._id } },
        { $group:{ _id:'$topic', total:{$sum:1}, correct:{$sum:{$cond:['$correct',1,0]}},
            lastAttempt:{ $max:'$attemptedAt' } }},
        { $project:{ topic:'$_id', total:1, correct:1, lastAttempt:1,
            accuracy:{ $round:[{ $multiply:[{ $divide:['$correct',{ $cond:[{$eq:['$total',0]},1,'$total'] }] },100] },1] } }},
        { $sort:{ total:-1 } }
      ]),
      (isFacultyOrAdmin || isOwnProfile)
        ? AptitudeAttempt.find({ userId: student._id }).sort({ attemptedAt:-1 }).limit(20).populate('questionId','question topic difficulty')
        : Promise.resolve([]),
      Discussion.countDocuments({ createdBy: student._id }),
      SkillpathResult.find({ userId: student._id }).sort({ analyzedAt:-1 }).limit(5),
      AptitudeAttempt.aggregate([
        { $match:{ userId: student._id, attemptedAt: { $type: 'date' } } },
        { $group:{ _id:{ $dateToString:{ format:'%Y-%m-%d', date:'$attemptedAt' } }, count:{ $sum:1 } } },
        { $sort:{ _id:1 } }
      ]),
      UserProblem.aggregate([
        { $match:{ userId: student._id, status: 'solved', updatedAt: { $type: 'date' } } },
        { $group:{ _id:{ $dateToString:{ format:'%Y-%m-%d', date:'$updatedAt' } }, count:{ $sum:1 } } },
        { $sort:{ _id:1 } }
      ]),
      UserProblem.find({ userId: student._id, status: 'solved' }).select('problemId').lean()
    ]);

    // Cast-safe difficulty lookup: separate ObjectIds from string IDs (like "nc-101")
    const mongoose = require('mongoose');
    const solvedObjIds = [], solvedStrIds = [];
    solvedUPs.forEach(up => {
      const id = up.problemId;
      if (!id) return;
      const s = String(id);
      if (mongoose.Types.ObjectId.isValid(s) && s.length === 24) solvedObjIds.push(id);
      else solvedStrIds.push(s);
    });
    const { Problem: ProbModel } = require('../models/index');
    const [diffByObj, diffByStr] = await Promise.all([
      solvedObjIds.length ? ProbModel.find({ _id: { $in: solvedObjIds } }).select('difficulty topic').lean() : [],
      solvedStrIds.length ? ProbModel.find({ problemId: { $in: solvedStrIds } }).select('difficulty topic').lean() : [],
    ]);
    const allSolvedProbs = [...diffByObj, ...diffByStr];
    const easyS  = allSolvedProbs.filter(p => p.difficulty === 'Easy').length;
    const medS   = allSolvedProbs.filter(p => p.difficulty === 'Medium').length;
    const hardS  = allSolvedProbs.filter(p => p.difficulty === 'Hard').length;

    // Build codingStats by topic (backward compat)
    const topicMap = {};
    allSolvedProbs.forEach(p => {
      const t = p.topic || 'General';
      if (!topicMap[t]) topicMap[t] = { topic:t, total:0, solved:0, easy:0, medium:0, hard:0 };
      topicMap[t].solved++; topicMap[t].total++;
      if (p.difficulty==='Easy') topicMap[t].easy++;
      else if (p.difficulty==='Medium') topicMap[t].medium++;
      else if (p.difficulty==='Hard') topicMap[t].hard++;
    });
    const codingStats = Object.values(topicMap);

    const totalApt   = await AptitudeAttempt.countDocuments({ userId: student._id });
    const correctApt = await AptitudeAttempt.countDocuments({ userId: student._id, correct:true });

    const contestRatings = skillpathResults.map(r=>({
      rating: Math.max(1200, Math.round((r.atsScore||0)*8+1200)), date: r.analyzedAt
    })).reverse();

    res.json({
      student, aptStats, codingStats,
      recentActivity: isFacultyOrAdmin||isOwnProfile ? recentActivity : [],
      skillpathResults, submissionDates: [
        ...aptDateGroups.flatMap(d => Array(d.count).fill(d._id)),
        ...problemDateGroups.flatMap(d => Array(d.count).fill(d._id))
      ].sort(),
      problemStats:{ easy:easyS, medium:medS, hard:hardS },
      contestRatings,
      summary:{ totalApt, correctApt, accuracy: totalApt?Math.round((correctApt/totalApt)*100):0,
        topicsAttempted: aptStats.length, discussionCount, hasSkillPath: skillpathResults.length>0 }
    });
  } catch(err) { console.error(err); res.status(500).json({ error:err.message }); }
});
module.exports = router;
