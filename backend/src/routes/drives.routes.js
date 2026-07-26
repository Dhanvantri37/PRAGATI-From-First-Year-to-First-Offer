const router = require('express').Router();
const { PlacementDrive, Announcement } = require('../models/index');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// GET all drives (students can see open/upcoming)
router.get('/', authenticate, async (req, res) => {
  try {
    const drives = await PlacementDrive.find()
      .populate('createdBy', 'name')
      .sort({ driveDate: 1 });
    const result = drives.map(d => ({
      ...d.toObject(),
      applied: d.applicants.some(uid => uid.toString() === req.user._id.toString()),
    }));
    res.json({ drives: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create drive (admin/faculty only)
router.post('/', authenticate, authorize('admin', 'faculty'), async (req, res) => {
  try {
    const drive = await PlacementDrive.create({ ...req.body, createdBy: req.user._id });
    // Auto-create announcement
    await Announcement.create({
      title: `📢 New Placement Drive: ${drive.companyName}`,
      message: `${drive.companyName} is visiting on ${new Date(drive.driveDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}. Role: ${drive.role || 'N/A'}. Apply before ${drive.lastApplyDate ? new Date(drive.lastApplyDate).toLocaleDateString('en-IN') : 'drive date'}.`,
      link: `/dashboard/drives`,
      createdBy: req.user._id,
      targetFilter: { role: 'all' },
      priority: 'high',
    });

    // Asynchronously send bell + push notifications to all users
    const User = require('../models/User.model');
    const { emitToUser } = require('./notifications.routes');
    const notifPayload = {
      _id: drive._id,
      type: 'drive',
      title: `🗓️ New Placement Drive: ${drive.companyName}`,
      message: `${drive.companyName} is visiting for ${drive.role || 'N/A'}. CTC: ${drive.ctc || 'N/A'}.`,
      link: `/dashboard/drives`,
      priority: 'high',
      createdAt: drive.createdAt,
    };
    User.find().select('_id pushSubscription').then(allUsers => {
      allUsers.forEach(u => {
        const hasPush = !!u.pushSubscription?.endpoint;
        emitToUser(req.app, u._id, notifPayload, { push: hasPush }).catch(() => {});
      });
    }).catch(err => console.error('[Drive notify error]', err.message));

    res.status(201).json({ drive });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST apply to drive
router.post('/:id/apply', authenticate, async (req, res) => {
  try {
    const drive = await PlacementDrive.findById(req.params.id);
    if (!drive) return res.status(404).json({ error: 'Drive not found' });
    if (drive.applicants.some(uid => uid.toString() === req.user._id.toString()))
      return res.status(400).json({ error: 'Already applied' });
    drive.applicants.push(req.user._id);
    await drive.save();
    res.json({ message: 'Applied successfully', applicantsCount: drive.applicants.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── GET /api/drives/external-openings (RAG Scraped Listings) ───────────────
router.get('/external-openings', authenticate, async (req, res) => {
  try {
    const { query = '', branch, limit = 10 } = req.query;
    const userBranch = branch || req.user.department || req.user.branch || 'CSE';
    const ragService = require('../utils/ragService');
    const openings = await ragService.searchScrapedOpenings(query, userBranch, Number(limit));
    res.json({ openings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/drives/alumni (Discovered KIT Alumni Matching) ────────────────
router.get('/alumni', authenticate, async (req, res) => {
  try {
    const { company, branch, search } = req.query;
    const userBranch = branch || req.user.department || req.user.branch || 'CSE';
    const ragService = require('../utils/ragService');
    const alumni = await ragService.searchDiscoveredAlumni(search || '', company, userBranch);
    res.json({ alumni });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/drives/linkedin-draft (AI Outreach & Referral Generator) ──
router.post('/linkedin-draft', authenticate, async (req, res) => {
  try {
    const { alumniName, alumniCompany, alumniRole, userBranch, goal = 'referral' } = req.body;
    const name = alumniName || 'Alumnus';
    const company = alumniCompany || 'Target Tech Company';
    const studentName = req.user.name || 'KIT Student';
    const branch = userBranch || req.user.department || 'Computer Science';
    const role = alumniRole || 'Software Engineer';

    let linkedinNote = '';
    let directMsg = '';
    let emailSubject = '';
    let coldEmail = '';

    if (goal === 'referral') {
      linkedinNote = `Hi ${name}! 👋 I'm ${studentName}, CSE student at KIT. I saw your SDE journey at ${company} & admire your work. As I prepare for ${company} openings, could I connect for a quick referral or guidance? Best, ${studentName}`;
      
      directMsg = `Hello ${name}! 👋\n\nI hope you're doing well! My name is ${studentName}, pursuing engineering in ${branch} at KIT's College of Engineering.\n\nI've been following ${company}'s tech innovations and noticed your position as ${role}. I'm actively preparing for upcoming software engineering roles at ${company}.\n\nGiven our shared KIT alumni background, I would be deeply grateful if you could consider referring me for entry-level / intern SDE openings at ${company}, or share any guidance on your preparation path.\n\nThank you so much for your time!\n\nWarm regards,\n${studentName}\nKIT College of Engineering`;

      emailSubject = `KIT Student Referral Inquiry - ${company} (${studentName})`;
      coldEmail = `Dear ${name},\n\nI hope this email finds you well.\n\nMy name is ${studentName}, studying ${branch} Engineering at KIT College of Engineering. I am reaching out as a fellow KIT student aspiring to join ${company} as a ${role}.\n\nI have attached my resume and would be extremely thankful if you could refer me for suitable software engineering roles at ${company}.\n\nThank you for your guidance and support!\n\nBest regards,\n${studentName}`;
    } else if (goal === 'mentorship') {
      linkedinNote = `Hi ${name}! 👋 I'm ${studentName} from KIT (${branch}). I really admire your journey to ${company} as ${role}. Would love to connect and learn 1-2 tips about cracking interviews at ${company}!`;
      
      directMsg = `Hello ${name}! 👋\n\nI hope you are having a great week! I am ${studentName}, studying ${branch} at KIT College of Engineering.\n\nYour career trajectory from KIT to ${company} as ${role} is truly inspiring. As I prepare for technical placement rounds, I would love to connect and get your advice on interview prep strategy, key tech stacks, or mock interview tips.\n\nLooking forward to connecting with you!\n\nBest regards,\n${studentName}`;

      emailSubject = `Mentorship & Interview Guidance Request - KIT Alumni Connection`;
      coldEmail = `Dear ${name},\n\nHope you are doing well!\n\nI am ${studentName}, currently pursuing engineering in ${branch} at KIT. I noticed your career growth at ${company} as ${role}.\n\nAs a student at KIT preparing for placement rounds, I would be grateful if you could spare 10 minutes to share your prep roadmap or review my resume.\n\nThank you so much!\n\nSincerely,\n${studentName}`;
    } else {
      linkedinNote = `Hello ${name}! 👋 I'm ${studentName}, engineering student at KIT. Noticed your great work as ${role} at ${company}. Would love to connect with a fellow KIT alumnus!`;
      
      directMsg = `Hello ${name}! 👋\n\nI am ${studentName}, an engineering student studying ${branch} at KIT College of Engineering. I noticed your work as ${role} at ${company} and wanted to reach out.\n\nIt's always great to connect with KIT alumni excelling in the industry. I look forward to staying connected and following your journey!\n\nBest,\n${studentName}`;

      emailSubject = `KIT Alumni Connection - ${studentName}`;
      coldEmail = `Dear ${name},\n\nMy name is ${studentName} from KIT College of Engineering (${branch}). I wanted to connect with fellow KIT alumni working at top engineering firms like ${company}.\n\nWish you continued success and hope to stay connected!\n\nBest regards,\n${studentName}`;
    }

    res.json({ draft: directMsg, linkedinNote, directMsg, emailSubject, coldEmail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/drives/run-crawler (Admin Trigger Background Ingestor) ───────
router.post('/run-crawler', authenticate, authorize('admin', 'faculty'), async (req, res) => {
  try {
    const { runCrawlerWorker } = require('../utils/crawlerWorker');
    const results = await runCrawlerWorker();
    res.json({ message: 'Crawler worker completed successfully', results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE drive (admin/faculty)
router.delete('/:id', authenticate, authorize('admin', 'faculty'), async (req, res) => {
  try {
    await PlacementDrive.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

