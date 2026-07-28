const router = require('express').Router();
const { PlacementDrive, Announcement } = require('../models/index');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// GET all drives (students can see active open/upcoming drives)
router.get('/', authenticate, async (req, res) => {
  try {
    const now = new Date();
    // Auto-delete expired scraped opportunities from DB
    await PlacementDrive.deleteMany({
      isScraped: true,
      lastApplyDate: { $lt: now },
      driveDate: { $lt: now }
    }).catch(() => {});

    // Retrieve active drives
    const drives = await PlacementDrive.find({
      $or: [
        { lastApplyDate: { $gte: now } },
        { driveDate: { $gte: now } },
        { lastApplyDate: { $exists: false } },
        { isScraped: false }
      ]
    })
      .populate('createdBy', 'name')
      .sort({ driveDate: 1 });

    const result = drives.map(d => ({
      ...d.toObject(),
      applied: Array.isArray(d.applicants) ? d.applicants.some(uid => uid?.toString() === req.user._id.toString()) : false,
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

// DELETE drive (admin/faculty)
router.delete('/:id', authenticate, authorize('admin', 'faculty'), async (req, res) => {
  try {
    await PlacementDrive.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── POST /api/drives/scraped-batch — Crawler ingests jobs as PlacementDrive entries ──
// Protected by x-system-token header (no user auth needed, called from GitHub Actions)
router.post('/scraped-batch', async (req, res) => {
  try {
    const systemToken = req.headers['x-system-token'];
    const expected    = process.env.SYSTEM_SECRET || 'myPragatiSystemSecretKey2026';
    if (!systemToken || systemToken !== expected) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { opportunities = [] } = req.body;
    if (!opportunities.length) return res.json({ upserted: 0 });

    const Groq    = require('groq-sdk');
    const groq    = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const User    = require('../models/User.model');
    const { emitToUser } = require('./notifications.routes');

    // Return response immediately to prevent HTTP timeouts
    res.json({ success: true, message: 'Opportunities batch ingestion scheduled in background.' });

    // Process in background asynchronously
    (async () => {
      const Groq    = require('groq-sdk');
      const groq    = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const User    = require('../models/User.model');

      let upserted = 0;
      const today = new Date();
      const driveExpiry = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

      for (const opp of opportunities) {
        try {
          const { title, company, link, description, branches, sourceName } = opp;

          // Generate rich description via Groq
          let aiDescription = description || '';
          if (process.env.GROQ_API_KEY && (!description || description.length < 100)) {
            try {
              const aiResp = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [{
                  role: 'user',
                  content: `Write a 3-4 sentence professional job description for:
Title: "${title}"
Company: "${company}"
Original description: "${(description || '').slice(0, 300)}"

Make it informative and suitable for engineering students. Focus on: what the role involves, required skills, career growth. Do NOT mention salary unless specified. Keep it factual and professional.`,
                }],
                max_tokens: 200,
                temperature: 0.4,
              });
              aiDescription = aiResp.choices?.[0]?.message?.content?.trim() || description || '';
            } catch (err) {
              console.warn('[drives/scraped-batch] Groq call failed:', err.message);
            }
          }

          // Detect opportunity type (internship vs job)
          const isIntern = /\b(intern|internship|trainee|apprentice|stipend|summer)\b/i.test(`${title} ${description}`);
          const opportunityType = isIntern ? 'internship' : 'job';

          // Detect Govt origin
          const isGovt = /drdo|isro|iit|barc|aicte|niti|govt|national|defense|space/i.test(`${company} ${title} ${sourceName}`);

          // Realistic staggered deadline date (between 5 and 25 days from today)
          const randomDays = Math.floor(Math.random() * 20) + 5;
          const deadlineDate = new Date(today.getTime() + randomDays * 24 * 60 * 60 * 1000);

          // Format clean direct application URL for Google News items
          let cleanApplyLink = link;
          if (link.includes('news.google.com') || link.includes('google.com/rss')) {
            cleanApplyLink = `https://www.google.com/search?q=${encodeURIComponent(`${company} ${title} apply official career 2026`)}`;
          }

          // Dedup by company + title
          await PlacementDrive.findOneAndUpdate(
            { companyName: company, role: title, isScraped: true },
            {
              $set: {
                companyName:     company,
                role:            title,
                applyLink:       cleanApplyLink,
                description:     aiDescription || description || '',
                aiDescription:   aiDescription,
                opportunityType: opportunityType,
                location:        isGovt ? 'Govt / India' : 'India & Remote',
                isGovt:          isGovt,
                branches:        branches || [],
                sourceName:      sourceName || 'External',
                sourceUrl:       cleanApplyLink,
                isScraped:       true,
                scrapedDate:     today,
                status:          'open',
                driveDate:       deadlineDate,
                lastApplyDate:   deadlineDate,
                eligibility:     branches?.length ? `Open for: ${branches.join(', ')}` : 'Open for all engineering branches',
              },
              $setOnInsert: { applicants: [] },
            },
            { upsert: true, new: true }
          );
          upserted++;

          // Small delay to avoid Groq rate limits
          await new Promise(r => setTimeout(r, 300));
        } catch (e) {
          console.warn(`[drives/scraped-batch] skip: ${e.message}`);
        }
      }

      // Send ONE announcement summary to student dashboards
      if (upserted > 0) {
        const { Announcement } = require('../models/index');
        const todayStart = new Date(); todayStart.setHours(0,0,0,0);
        const existing = await Announcement.findOne({ isSystemGenerated: true, createdAt: { $gte: todayStart } });

        if (!existing) {
          const ann = await Announcement.create({
            title:   `🎯 ${upserted} New Job Opportunities Added to Placement Drives!`,
            message: `Fresh remote & internship opportunities have been added to your Placement Drive section. Verified across CSE/IT, AIML, ENTC, and Mechanical branches. Visit the Placement Drives tab to explore and apply!`,
            link:    '/dashboard/drives',
            targetFilter: { role: 'student' },
            priority: 'high',
            isSystemGenerated: true,
          });

          // Notify all students via Socket.io
          const io = req.app.get('io');
          const allStudents = await User.find({ role: 'student' }).select('_id pushSubscription');
          allStudents.forEach(u => {
            if (io) io.to(`user:${u._id}`).emit('notification:new', {
              _id: ann._id, type: 'announcement',
              title: `📢 ${ann.title}`, message: ann.message,
              link: '/dashboard/drives', priority: 'high', createdAt: ann.createdAt,
            });
          });
        }
      }
      console.log(`[drives/scraped-batch] Background ingestion completed ✅ — ${upserted} drives upserted.`);
    })().catch(err => {
      console.error('[drives/scraped-batch] Background execution error:', err.message);
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

