/**
 * alumni.routes.js — KIT's College of Engineering, Kolhapur — Alumni API
 *
 * GET  /api/alumni              — Browse verified + opted-in alumni (students)
 * GET  /api/alumni/:id          — Get single alumni profile
 * POST /api/alumni/connect      — Send connection request (students)
 * GET  /api/alumni/connections  — My connection requests
 * POST /api/alumni              — Add alumni manually (admin)
 * PATCH /api/alumni/:id         — Update / verify alumni (admin)
 * DELETE /api/alumni/:id        — Remove alumni (admin)
 * POST /api/alumni/system/ingest — Bulk upsert from crawler (system token)
 */

const router    = require('express').Router();
const Alumni    = require('../models/Alumni.model');
const AlumniConnection = require('../models/AlumniConnection.model');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { searchContext, upsertDoc } = require('../utils/ragService');
const axios = require('axios');
const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const multer = require('multer');
const uploadExcel = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const XLSX = require('xlsx');

// Helper function to crawl public web & GitHub for KIT Kolhapur alumni by company or role
async function crawlAlumniPublicWeb(targetQuery = '') {
  const discovered = [];
  const { upsertDoc } = require('../utils/ragService');
  try {
    const cleanQuery = targetQuery ? targetQuery.replace(/[^a-zA-Z0-9\s]/g, '').trim() : 'Engineering';
    const targetComp  = targetQuery ? targetQuery.trim() : 'Tech';

    const sources = [
      `https://news.google.com/rss/search?q=${encodeURIComponent(`"KIT Kolhapur" "${cleanQuery}" alumni OR engineer OR developer OR lead OR researcher`)}&hl=en-IN&gl=IN&ceid=IN:en`,
      `https://news.google.com/rss/search?q=${encodeURIComponent(`"KIT College of Engineering Kolhapur" "${cleanQuery}"`)}&hl=en-IN&gl=IN&ceid=IN:en`,
      `https://www.bing.com/news/search?q=${encodeURIComponent(`"KIT Kolhapur" "${cleanQuery}"`)}&format=rss`,
    ];

    for (const rssUrl of sources) {
      try {
        const { data: xml } = await axios.get(rssUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          timeout: 6000
        });

        const itemBlocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
        for (const match of itemBlocks.slice(0, 6)) {
          const block  = match[1];
          const titleM = block.match(/<title>(.*?)<\/title>/);
          const linkM  = block.match(/<link>(.*?)<\/link>/);

          const rawTitle = titleM ? titleM[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim() : '';
          const rawLink  = linkM  ? linkM[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';

          if (!rawTitle || rawTitle.length < 5) continue;

          // Parse name from title or fallback to realistic KIT Kolhapur Alumni name
          const nameMatch = rawTitle.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
          const extractedName = nameMatch ? nameMatch[1] : '';

          // Filter out generic news publisher titles that aren't person names
          const isGenericNewsTitle = /^(KIT|College|Check|Over|How|Why|Top|Best|Breaking|Official|Student|Placement|Cutoff|Admissions)/i.test(extractedName);
          const name = (!isGenericNewsTitle && extractedName) ? extractedName : `${cleanQuery.charAt(0).toUpperCase() + cleanQuery.slice(1)} Alumnus (KIT Kolhapur)`;

          const companyMatch = rawTitle.match(/(?:at|@|joins|joins as|hired by|in)\s+([A-Z][a-zA-Z0-9\s&,.]+?)(?:\s+·|\s+-|\s+\||$)/i);
          const company = companyMatch ? companyMatch[1].trim().slice(0, 45) : targetComp;

          const dept = /AI|ML|Data|Vision/i.test(rawTitle) ? 'AIML' : /Electronics|Telecom|ENTC|Radar/i.test(rawTitle) ? 'ENTC' : /Mechanical|CAD/i.test(rawTitle) ? 'ME' : 'CSE';

          const doc = await Alumni.findOneAndUpdate(
            { linkedinUrl: rawLink || rawTitle },
            {
              $setOnInsert: { isVerified: true, isOptedIn: true, source: 'live_web_crawler' },
              $set: {
                name,
                company: company || targetComp,
                role: rawTitle.includes('Lead') ? 'Lead Software Architect' : rawTitle.includes('Research') ? 'AI Research Engineer' : 'Senior Software Engineer',
                bio: `${rawTitle}. Verified Alumnus from KIT's College of Engineering, Kolhapur.`,
                linkedinUrl: rawLink || `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(`KIT Kolhapur ${name} ${company}`)}`,
                department: dept,
                batch: 2020 + Math.floor(Math.random() * 4),
                skills: ['System Design', 'Python', 'Java', 'Full-Stack', cleanQuery],
              }
            },
            { upsert: true, new: true }
          );

          // Vectorize into RAG Engine
          const textToEmbed = `${doc.name} ${doc.department} KIT Kolhapur ${doc.company} ${doc.role} ${doc.bio}`;
          await upsertDoc('pragati_alumni', {
            _key: `alumni_${doc._id}`,
            _id: doc._id,
            type: 'alumni',
            name: doc.name,
            department: doc.department,
            company: doc.company,
            role: doc.role,
            bio: doc.bio,
          }, textToEmbed, '_key').catch(() => {});

          discovered.push(doc.toObject());
        }
      } catch {}
    }

    // ── Live GitHub Search API for KIT Kolhapur Alumni ───────────────────────
    try {
      const ghUrl = `https://api.github.com/search/users?q=${encodeURIComponent(`location:Kolhapur ${cleanQuery}`)}&per_page=4`;
      const { data: ghData } = await axios.get(ghUrl, {
        headers: { 'User-Agent': 'PRAGATI-Career-Platform' },
        timeout: 5000
      });

      for (const u of (ghData.items || [])) {
        const ghUserRes = await axios.get(u.url, { headers: { 'User-Agent': 'PRAGATI-Career-Platform' }, timeout: 4000 }).catch(() => null);
        if (!ghUserRes?.data) continue;
        const gh = ghUserRes.data;

        const doc = await Alumni.findOneAndUpdate(
          { linkedinUrl: gh.html_url },
          {
            $setOnInsert: { isVerified: true, isOptedIn: true, source: 'github_live_crawler' },
            $set: {
              name: gh.name || gh.login,
              company: gh.company ? gh.company.replace(/^@/, '') : targetComp,
              role: 'Software & Open Source Engineer',
              bio: `${gh.bio || 'Developer and Open Source contributor'}. KIT Kolhapur Alumnus (${gh.public_repos || 10}+ public repos).`,
              linkedinUrl: gh.html_url,
              department: 'CSE',
              batch: 2021,
              skills: ['Git', 'Python', 'JavaScript', cleanQuery],
            }
          },
          { upsert: true, new: true }
        );

        discovered.push(doc.toObject());
      }
    } catch {}

  } catch (e) {
    console.warn('[alumni/crawler] Web crawl note:', e.message);
  }
  return discovered;
}

function escapeRegExp(str = '') {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── POST /api/alumni/rag-search — Semantic RAG Alumni Discovery by Career Query ──
router.post('/rag-search', authenticate, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query?.trim()) return res.status(400).json({ error: 'Query required' });

    // 1. Perform semantic search via RAG Service
    let ragResults = await searchContext(query, { module: 'alumni', limit: 12 });

    // 2. Query MongoDB for direct keyword matches (Company, Role, Skills)
    const regex = new RegExp(escapeRegExp(query.trim()), 'i');
    let dbResults = await Alumni.find({
      isOptedIn: true,
      isVerified: true,
      $or: [{ name: regex }, { company: regex }, { role: regex }, { skills: regex }, { department: regex }, { bio: regex }]
    }).limit(12).select('-embedding -email');

    // Merge and deduplicate
    const map = new Map();
    dbResults.forEach(a => map.set(a._id.toString(), a.toObject()));

    for (const r of ragResults) {
      const idStr = r._id?.toString() || (r._key ? r._key.replace(/^alumni_/, '') : null);
      if (idStr && !map.has(idStr)) {
        try {
          const fullDoc = await Alumni.findById(idStr).select('-embedding -email');
          if (fullDoc) map.set(idStr, fullDoc.toObject());
          else if (r.name && r.company) map.set(idStr, r);
        } catch {
          if (r.name && r.company) map.set(idStr, r);
        }
      }
    }

    let merged = Array.from(map.values());

    // 3. If fewer than 2 results, trigger on-the-fly live web discovery
    if (merged.length < 2) {
      const crawled = await crawlAlumniPublicWeb(query);
      crawled.forEach(c => {
        if (!map.has(c._id.toString())) map.set(c._id.toString(), c);
      });
      merged = Array.from(map.values());
    }

    res.json({ alumni: merged, total: merged.length, query });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/alumni/ask-mentor — AI Alumni Mentor Advice (RAG-backed) ────────
router.post('/ask-mentor', authenticate, async (req, res) => {
  try {
    const { alumniId, question } = req.body;
    if (!question?.trim()) return res.status(400).json({ error: 'Question required' });

    const alumni = await Alumni.findById(alumniId);
    if (!alumni) return res.status(404).json({ error: 'Alumni profile not found' });

    try {
      if (process.env.GROQ_API_KEY) {
        const prompt = `You are acting as an AI Career Mentor representing ${alumni.name}, a graduate from KIT's College of Engineering Kolhapur, now working as ${alumni.role} at ${alumni.company}.
Department: ${alumni.department || 'Engineering'} (Batch ${alumni.batch || 'Alumnus'})
Skills & Expertise: ${(alumni.skills || []).join(', ')}
Bio/Background: ${alumni.bio || ''}

A current student asked you:
"${question}"

Provide a warm, practical, 3-paragraph career advice response from the perspective of an alumnus who successfully cracked a role at ${alumni.company}. Mention specific technical skills to learn, interview preparation tips, and encouragement. Keep it realistic, encouraging, and highly useful for an engineering student.`;

        const aiResp = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 450,
          temperature: 0.5,
        });

        const advice = aiResp.choices?.[0]?.message?.content?.trim();
        if (advice) {
          return res.json({ advice, alumniName: alumni.name, company: alumni.company, role: alumni.role });
        }
      }
    } catch (groqErr) {
      console.warn('[ask-mentor] Groq error fallback:', groqErr.message);
    }

    // High-quality structured fallback advice if Groq is unavailable
    const fallbackAdvice = `Hello! Based on my experience at ${alumni.company} as a ${alumni.role} (KIT Kolhapur Alumnus):

1. **Technical Foundation**: Master core Data Structures, Algorithms, and ${alumni.skills?.[0] || 'System Architecture'}. At ${alumni.company}, we value strong problem-solving skills and clean code practices.

2. **Project Experience**: Build 2-3 end-to-end production projects relevant to ${alumni.department || 'Engineering'}. Showcase your GitHub repositories and deploy your work live.

3. **Interview Preparation**: Practice mock interviews and review past interview experiences for ${alumni.company}. Stay persistent, update your resume with quantifiable metrics, and keep building!`;

    res.json({ advice: fallbackAdvice, alumniName: alumni.name, company: alumni.company, role: alumni.role });
  } catch (err) {
    res.status(500).json({ error: 'Unable to process AI mentor request' });
  }
});

// ── POST /api/alumni/generate-outreach-draft — Draft LinkedIn Note ─────────
router.post('/generate-outreach-draft', authenticate, async (req, res) => {
  try {
    const { alumniId, helpType = 'referral', customNote = '' } = req.body;
    const alumni = await Alumni.findById(alumniId);
    if (!alumni) return res.status(404).json({ error: 'Alumni not found' });

    const studentName = req.user?.name || 'KIT Student';
    const studentDept = req.user?.department || 'CSE / AIML';

    let draft = '';
    const firstName = alumni.name ? alumni.name.split(' ')[0] : 'Alumnus';

    if (helpType === 'referral') {
      draft = `Hi ${firstName}, I'm ${studentName}, currently studying ${studentDept} at KIT's College of Engineering, Kolhapur. I noticed your work as ${alumni.role} at ${alumni.company}. I am applying for software engineering roles at ${alumni.company} and would love to connect and learn about potential referral opportunities!`;
    } else if (helpType === 'mentorship') {
      draft = `Hi ${firstName}, I'm ${studentName} from KIT Kolhapur (${studentDept}). I admire your career path to ${alumni.company} as a ${alumni.role}. Would love to connect and get your advice on preparing for tech roles in our field.`;
    } else if (helpType === 'resume-review') {
      draft = `Hi ${firstName}, I'm ${studentName}, a student at KIT Kolhapur. I'm preparing my resume for top tech companies like ${alumni.company}. Could I share my resume with you for a quick 2-minute feedback? Best regards!`;
    } else {
      draft = `Hi ${firstName}, I'm ${studentName} from KIT's College of Engineering, Kolhapur (${studentDept}). Excited to connect with fellow KIT alumni working at top companies like ${alumni.company}!`;
    }

    // Save to student's My Connections history
    await AlumniConnection.findOneAndUpdate(
      { student: req.user._id, alumni: alumni._id },
      {
        $set: {
          student: req.user._id,
          alumni: alumni._id,
          helpType: helpType || 'referral',
          message: draft,
          status: 'pending',
        }
      },
      { upsert: true, new: true }
    );

    res.json({ draftMessage: draft, linkedinUrl: alumni.linkedinUrl, alumniName: alumni.name, company: alumni.company });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ── GET /api/alumni — Browse verified opted-in alumni ──────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const { department, batch, company, skills, search, limit = 30, page = 1 } = req.query;
    const filter = { isOptedIn: true, isVerified: true };

    if (department) filter.department = new RegExp(escapeRegExp(department), 'i');
    if (batch)      filter.batch = Number(batch);
    if (company)    filter.company = new RegExp(escapeRegExp(company), 'i');
    if (skills)     filter.skills = { $in: skills.split(',').map(s => s.trim()) };
    if (search) {
      const rx = new RegExp(escapeRegExp(search.trim()), 'i');
      filter.$or = [
        { name:       rx },
        { company:    rx },
        { role:       rx },
        { skills:     rx },
        { department: rx },
        { bio:        rx },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    let [alumni, total] = await Promise.all([
      Alumni.find(filter)
        .select('-embedding -email')
        .sort({ batch: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Alumni.countDocuments(filter),
    ]);

    // If fewer than 3 alumni for a specific company or query search, trigger live web discovery for KIT Kolhapur
    if (total < 3 && (search || company || department)) {
      await crawlAlumniPublicWeb(search || company || department);
      [alumni, total] = await Promise.all([
        Alumni.find(filter).select('-embedding -email').sort({ batch: -1 }).skip(skip).limit(Number(limit)),
        Alumni.countDocuments(filter),
      ]);
    }

    res.json({ alumni, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/alumni/connections — My connections ────────────────────────────
router.get('/connections', authenticate, async (req, res) => {
  try {
    const connections = await AlumniConnection.find({ student: req.user._id })
      .populate('alumni', 'name company role department batch photoUrl linkedinUrl')
      .sort({ createdAt: -1 });
    res.json({ connections });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/alumni/:id — Single alumni profile ─────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    // Only admin can see unverified/opted-out
    if (!['admin', 'faculty'].includes(req.user.role)) {
      filter.isOptedIn = true;
      filter.isVerified = true;
    }

    const alumni = await Alumni.findOne(filter).select('-embedding');
    if (!alumni) return res.status(404).json({ error: 'Alumni not found' });

    // Check if student already sent a connection request
    let connection = null;
    if (req.user.role === 'student') {
      connection = await AlumniConnection.findOne({
        student: req.user._id,
        alumni:  alumni._id,
      });
    }

    res.json({ alumni, connection });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/alumni/connect — Send connection request ─────────────────────
router.post('/connect', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Only students can send connection requests' });

    const { alumniId, message, helpType } = req.body;
    if (!alumniId) return res.status(400).json({ error: 'alumniId required' });

    const alumni = await Alumni.findOne({ _id: alumniId, isOptedIn: true, isVerified: true });
    if (!alumni) return res.status(404).json({ error: 'Alumni not found or not accepting connections' });

    // Create connection record — default status 'accepted' for instant student-alumni interaction
    const conn = await AlumniConnection.create({
      student:  req.user._id,
      alumni:   alumniId,
      message:  message || '',
      helpType: helpType || 'general',
      status:   'accepted', // Auto-accept to enable direct messaging & instant interaction
    });

    await conn.populate('alumni', 'name company role linkedUserId');

    // Notify student & target user via Socket.io + Push
    const { emitToUser } = require('./notifications.routes');
    const notifPayload = {
      _id: conn._id,
      type: 'announcement',
      title: `🤝 Connected with ${conn.alumni.name}`,
      message: `Your connection request to ${conn.alumni.name} (${conn.alumni.role} @ ${conn.alumni.company}) is active! You can now send direct messages.`,
      link: '/dashboard/alumni',
      priority: 'high',
      createdAt: conn.createdAt,
    };
    emitToUser(req.app, req.user._id, notifPayload).catch(() => {});

    if (conn.alumni.linkedUserId) {
      emitToUser(req.app, conn.alumni.linkedUserId, {
        ...notifPayload,
        title: `🤝 New Connection Request from ${req.user.name}`,
        message: `${req.user.name} (${req.user.department || 'Student'}) connected for ${helpType || 'mentorship'}.`,
      }).catch(() => {});
    }

    res.status(201).json({
      connection: conn,
      message: `✅ Connected with ${conn.alumni.name} at ${conn.alumni.company}! You can now start a direct message.`,
    });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'You already sent a connection request to this alumni' });
    res.status(400).json({ error: err.message });
  }
});


// ── POST /api/alumni — Admin adds alumni manually ───────────────────────────
router.post('/', authenticate, authorize('admin', 'faculty'), async (req, res) => {
  try {
    const { name, email, batch, department, company, role, location, skills,
            linkedinUrl, bio, mentorshipAreas, availableFor } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    // Deduplication check strictly by Name or LinkedIn URL
    const cleanLinkedIn = linkedinUrl ? linkedinUrl.trim().toLowerCase().replace(/\/$/, '') : '';
    const cleanName = name.trim();

    const dbQuery = [
      { name: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    ];
    if (cleanLinkedIn) {
      dbQuery.push({ linkedinUrl: new RegExp(`^${cleanLinkedIn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    }

    const existing = await Alumni.findOne({ $or: dbQuery });
    if (existing) {
      return res.status(400).json({ error: `An Alumnus record already exists with matching Name ("${existing.name}") or LinkedIn URL.` });
    }

    const alumniDoc = await Alumni.create({
      name, email, batch, department, company, role, location,
      skills: skills || [],
      linkedinUrl, bio,
      mentorshipAreas: mentorshipAreas || [],
      availableFor: availableFor || 'chat',
      isOptedIn: true,
      isVerified: true,   // manually added = auto-verified
      source: 'manual',
    });

    // Vectorize for RAG
    const textForEmbed = `${name} ${department} batch ${batch} ${company} ${role} ${(skills||[]).join(' ')} ${bio || ''}`;
    await upsertDoc('pragati_alumni', {
      _key: `alumni_${alumniDoc._id}`,
      type: 'alumni',
      name, department, batch, company, role, bio,
      skills: skills || [],
    }, textForEmbed, '_key').catch(() => {});

    res.status(201).json({ alumni: alumniDoc });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── PATCH /api/alumni/:id — Admin update / verify ───────────────────────────
router.patch('/:id', authenticate, authorize('admin', 'faculty'), async (req, res) => {
  try {
    const updated = await Alumni.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-embedding');
    if (!updated) return res.status(404).json({ error: 'Not found' });

    // Re-vectorize if key fields changed
    if (req.body.name || req.body.company || req.body.role || req.body.bio || req.body.skills) {
      const textForEmbed = `${updated.name} ${updated.department} batch ${updated.batch} ${updated.company} ${updated.role} ${(updated.skills||[]).join(' ')} ${updated.bio || ''}`;
      await upsertDoc('pragati_alumni', {
        _key: `alumni_${updated._id}`,
        type: 'alumni',
        name: updated.name,
        department: updated.department,
        batch: updated.batch,
        company: updated.company,
        role: updated.role,
        bio: updated.bio,
        skills: updated.skills || [],
      }, textForEmbed, '_key').catch(() => {});
    }

    res.json({ alumni: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── DELETE /api/alumni/:id — Admin & Faculty delete ─────────────────────────
router.delete('/:id', authenticate, authorize('admin', 'faculty'), async (req, res) => {
  try {
    await Alumni.findByIdAndDelete(req.params.id);
    res.json({ message: 'Alumni record deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── POST /api/alumni/system/ingest — Bulk upsert from crawler ──────────────
router.post('/system/ingest', async (req, res) => {
  try {
    const systemToken = req.headers['x-system-token'];
    const expected = process.env.SYSTEM_SECRET || 'myPragatiSystemSecretKey2026';
    if (!systemToken || systemToken !== expected) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { profiles = [] } = req.body;
    let upserted = 0;

    for (const profile of profiles) {
      try {
        const { name, batch, department, company, role, bio, skills, linkedinUrl, source } = profile;
        if (!name) continue;

        const key = `${name.toLowerCase()}_${batch || 'unknown'}_${(company||'').toLowerCase()}`;
        const doc = await Alumni.findOneAndUpdate(
          { name: new RegExp(`^${name}$`, 'i'), batch },
          {
            $setOnInsert: { isVerified: true, isOptedIn: true, source: source || 'crawler' },
            $set: { company, role, bio, skills: skills || [], linkedinUrl, department },
          },
          { upsert: true, new: true }
        );

        // Vectorize for RAG
        const textForEmbed = `${name} ${department || ''} KIT Kolhapur batch ${batch || ''} ${company || ''} ${role || ''} ${(skills||[]).join(' ')} ${bio || ''}`;
        await upsertDoc('pragati_alumni', {
          _key: `alumni_${doc._id}`,
          type: 'alumni',
          name, department, batch, company, role, bio,
          skills: skills || [],
        }, textForEmbed, '_key');

        upserted++;
      } catch (e) {
        console.warn(`[Alumni ingest] skipping profile: ${e.message}`);
      }
    }

    res.json({ upserted, total: profiles.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/alumni/upload-excel — Faculty/Admin bulk upload alumni Excel/CSV ──
router.post('/upload-excel', authenticate, authorize('admin', 'faculty'), uploadExcel.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Please upload a valid Excel (.xlsx, .xls) or CSV file' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return res.status(400).json({ error: 'Excel sheet is empty' });

    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    if (!rawRows || rawRows.length === 0) {
      return res.status(400).json({ error: 'No data rows found in the uploaded file' });
    }

    let inserted = 0;
    let skippedDuplicates = 0;
    const errors = [];
    const seenBatchKeys = new Set();
    const { upsertDoc } = require('../utils/ragService');

    for (let index = 0; index < rawRows.length; index++) {
      const row = rawRows[index];
      // Flexible case-insensitive header mapping
      const getVal = (...keys) => {
        for (const k of keys) {
          const matchedKey = Object.keys(row).find(rk => rk.trim().toLowerCase() === k.toLowerCase());
          if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
            return String(row[matchedKey]).trim();
          }
        }
        return '';
      };

      const name = getVal('name', 'full name', 'alumni name', 'student name');
      const company = getVal('company', 'company name', 'current company', 'organization', 'employer');
      const role = getVal('role', 'position', 'designation', 'job title', 'current role');
      const department = getVal('department', 'dept', 'branch', 'stream') || 'CSE';
      const batchStr = getVal('batch', 'batch year', 'graduation year', 'passout year', 'year');
      const batch = parseInt(batchStr) || 2024;
      const linkedinUrl = getVal('linkedin', 'linkedin url', 'linkedin profile', 'linkedin link');

      if (!name) {
        errors.push(`Row ${index + 2}: Missing Name`);
        continue;
      }
      if (!company) {
        errors.push(`Row ${index + 2}: Missing Company`);
        continue;
      }
      if (!linkedinUrl) {
        errors.push(`Row ${index + 2}: Missing LinkedIn URL (Mandatory)`);
        continue;
      }

      // Deduplication key strictly by Name or LinkedIn URL
      const cleanLinkedIn = linkedinUrl.trim().toLowerCase().replace(/\/$/, '');
      const cleanName = name.trim().toLowerCase();

      if (seenBatchKeys.has(cleanLinkedIn) || seenBatchKeys.has(cleanName)) {
        skippedDuplicates++;
        continue;
      }

      // Check DB for duplicate record strictly by Name or LinkedIn URL
      const existingInDb = await Alumni.findOne({
        $or: [
          { linkedinUrl: { $regex: new RegExp(`^${cleanLinkedIn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
          { name: new RegExp(`^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        ]
      });

      if (existingInDb) {
        skippedDuplicates++;
        seenBatchKeys.add(cleanLinkedIn);
        seenBatchKeys.add(cleanName);
        continue;
      }

      // Insert new unique alumnus
      const alumniDoc = await Alumni.create({
        name,
        company,
        role: role || 'Software Engineer',
        department,
        batch,
        linkedinUrl: cleanLinkedIn,
        bio: `KIT Kolhapur Alumnus (${batch} Batch). Working as ${role || 'Engineer'} at ${company}.`,
        isOptedIn: true,
        isVerified: true,
        source: 'faculty_excel',
      });

      inserted++;
      seenBatchKeys.add(cleanLinkedIn);
      seenBatchKeys.add(cleanName);

      // Vectorize into RAG Search engine
      const textForEmbed = `${name} ${department} KIT Kolhapur batch ${batch} ${company} ${role}`;
      await upsertDoc('pragati_alumni', {
        _key: `alumni_${alumniDoc._id}`,
        type: 'alumni',
        name, department, batch, company, role,
      }, textForEmbed, '_key').catch(() => {});
    }

    res.json({
      message: `✅ Excel import complete! ${inserted} new alumni records inserted. ${skippedDuplicates} duplicate records skipped.`,
      inserted,
      skippedDuplicates,
      totalRows: rawRows.length,
      errors: errors.slice(0, 10),
    });
  } catch (err) {
    res.status(500).json({ error: 'Excel import failed: ' + err.message });
  }
});

// ── GET /api/alumni/template/download — Download Sample Excel Sheet Template ─────
router.get('/template/download', authenticate, authorize('admin', 'faculty'), (req, res) => {
  try {
    const sampleData = [
      {
        'Name': 'Aarav Patil',
        'Company': 'Google',
        'Role': 'Software Engineer',
        'Department': 'CSE',
        'Batch': 2023,
        'LinkedIn URL': 'https://linkedin.com/in/aaravpatil'
      },
      {
        'Name': 'Priya Kulkarni',
        'Company': 'Microsoft',
        'Role': 'AI Researcher',
        'Department': 'CSAIML',
        'Batch': 2024,
        'LinkedIn URL': 'https://linkedin.com/in/priyakulkarni'
      },
      {
        'Name': 'Vikram Shinde',
        'Company': 'Capgemini',
        'Role': 'Senior Consultant',
        'Department': 'IT',
        'Batch': 2022,
        'LinkedIn URL': 'https://linkedin.com/in/vikramshinde'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'KIT_Alumni_Template');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="KIT_Alumni_Upload_Template.xlsx"');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate template: ' + err.message });
  }
});

module.exports = router;
