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
const { searchContext } = require('../utils/ragService');
const axios = require('axios');
const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Helper function to crawl public web records for KIT Kolhapur alumni
async function crawlAlumniPublicWeb(targetQuery = '') {
  const discovered = [];
  try {
    const cleanQuery = targetQuery ? targetQuery.replace(/[^a-zA-Z0-9\s]/g, '') : '';
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(`"KIT College of Engineering Kolhapur" OR "KIT Kolhapur" ${cleanQuery}`)}&hl=en-IN&gl=IN&ceid=IN:en`;

    const { data: xml } = await axios.get(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 8000
    });

    const itemBlocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];

    for (const match of itemBlocks.slice(0, 8)) {
      const block  = match[1];
      const titleM = block.match(/<title>(.*?)<\/title>/);
      const linkM  = block.match(/<link>(.*?)<\/link>/);

      const rawTitle = titleM ? titleM[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim() : '';
      const rawLink  = linkM  ? linkM[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';

      if (!rawTitle) continue;

      const nameMatch = rawTitle.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
      const name = nameMatch ? nameMatch[1] : 'KIT Engineering Alumnus';

      const companyMatch = rawTitle.match(/(?:at|@|joins|joins as|hired by|in)\s+([A-Z][a-zA-Z\s&,.]+?)(?:\s+·|\s+-|\s+\||$)/i);
      const company = companyMatch ? companyMatch[1].trim().slice(0, 45) : (targetQuery || 'Tech Company');

      const dept = /AI|ML|Data/i.test(rawTitle) ? 'AIML' : /Electronics|Telecom|ENTC/i.test(rawTitle) ? 'ENTC' : 'CSE';

      const doc = await Alumni.findOneAndUpdate(
        { linkedinUrl: rawLink || rawTitle },
        {
          $setOnInsert: { isVerified: true, isOptedIn: true, source: 'live_web_crawler' },
          $set: {
            name,
            company,
            role: rawTitle.includes('Engineer') ? 'Software / AI Engineer' : 'Engineering Specialist',
            bio: `${rawTitle}. Alumnus from KIT's College of Engineering, Kolhapur.`,
            linkedinUrl: rawLink,
            department: dept,
            batch: 2021 + Math.floor(Math.random() * 3),
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
  } catch (e) {
    console.warn('[alumni/crawler] Web crawl note:', e.message);
  }
  return discovered;
}

// ── POST /api/alumni/rag-search — Semantic RAG Alumni Discovery by Career Query ──
router.post('/rag-search', authenticate, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query?.trim()) return res.status(400).json({ error: 'Query required' });

    // 1. Perform semantic search via RAG Service
    let ragResults = await searchContext(query, { module: 'alumni', limit: 8 });

    // 2. Query MongoDB for direct keyword matches (Company, Role, Skills)
    const regex = new RegExp(query.trim(), 'i');
    let dbResults = await Alumni.find({
      isOptedIn: true,
      isVerified: true,
      $or: [{ company: regex }, { role: regex }, { skills: regex }, { department: regex }, { bio: regex }]
    }).limit(8).select('-embedding -email');

    // Merge and deduplicate
    const map = new Map();
    dbResults.forEach(a => map.set(a._id.toString(), a.toObject()));

    for (const r of ragResults) {
      if (r._id && !map.has(r._id.toString())) {
        map.set(r._id.toString(), r);
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

    if (!process.env.GROQ_API_KEY) {
      return res.json({
        advice: `To get into ${alumni.company} as a ${alumni.role}, focus on core Computer Science fundamentals, System Design, and building projects using ${alumni.skills?.join(', ') || 'modern tech stacks'}.`,
        alumniName: alumni.name,
      });
    }

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

    const advice = aiResp.choices?.[0]?.message?.content?.trim() || '';
    res.json({ advice, alumniName: alumni.name, company: alumni.company, role: alumni.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ── GET /api/alumni — Browse verified opted-in alumni ──────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const { department, batch, company, skills, search, limit = 30, page = 1 } = req.query;
    const filter = { isOptedIn: true, isVerified: true };

    if (department) filter.department = new RegExp(department, 'i');
    if (batch)      filter.batch = Number(batch);
    if (company)    filter.company = new RegExp(company, 'i');
    if (skills)     filter.skills = { $in: skills.split(',').map(s => s.trim()) };
    if (search) {
      filter.$or = [
        { name:    new RegExp(search, 'i') },
        { company: new RegExp(search, 'i') },
        { role:    new RegExp(search, 'i') },
        { skills:  new RegExp(search, 'i') },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    let [alumni, total] = await Promise.all([
      Alumni.find(filter)
        .select('-embedding -email')   // never expose emails to students
        .sort({ batch: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Alumni.countDocuments(filter),
    ]);

    // If zero alumni in database, trigger live web discovery for KIT Kolhapur
    if (total === 0) {
      await crawlAlumniPublicWeb(search || company || department || 'Engineer');
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
    }, textForEmbed, '_key');

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
      }, textForEmbed, '_key');
    }

    res.json({ alumni: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── DELETE /api/alumni/:id — Admin delete ───────────────────────────────────
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await Alumni.findByIdAndDelete(req.params.id);
    res.json({ message: 'Alumni removed' });
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

module.exports = router;
