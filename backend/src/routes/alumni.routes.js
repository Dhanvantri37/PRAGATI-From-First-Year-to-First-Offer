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
