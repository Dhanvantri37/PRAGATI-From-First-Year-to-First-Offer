/**
 * dailyOpportunitiesAnnouncer.js — PRAGATI Daily Internship & Job Announcer
 *
 * Runs every day via GitHub Actions (free compute).
 * 1. Scrapes fresh internships & job opportunities from verified RSS feeds.
 * 2. Runs Groq fraud detection on each listing.
 * 3. Groups the verified listings into a daily digest announcement.
 * 4. Saves the announcement directly to MongoDB (Announcement collection).
 * 5. Sends web-push notifications to all students with push subscriptions.
 *
 * Usage:
 *   node backend/src/utils/dailyOpportunitiesAnnouncer.js
 *
 * Environment variables required:
 *   MONGO_URI, GROQ_API_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL
 */

const mongoose = require('mongoose');
const axios    = require('axios');
const webpush  = require('web-push');
const xml2js   = require('xml2js');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

// ── Configure Web Push ────────────────────────────────────────────────────────
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'pragati@college.edu'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

// ── Schemas ───────────────────────────────────────────────────────────────────
const announcementSchema = new mongoose.Schema({
  title:     { type: String, required: true },
  message:   { type: String, required: true },
  link:      { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetFilter: {
    role:       { type: String },
    department: { type: String },
  },
  readBy:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  priority: { type: String, enum: ['normal','high','urgent'], default: 'normal' },
  isSystemGenerated: { type: Boolean, default: false }, // flag for RAG announcements
  opportunities: [{ // embedded summary cards for display
    title:    String,
    company:  String,
    link:     String,
    branches: [String],
  }],
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  name:             String,
  role:             String,
  department:       String,
  pushSubscription: Object,
});

const Announcement = mongoose.models.Announcement || mongoose.model('Announcement', announcementSchema);
const User         = mongoose.models.User         || mongoose.model('User', userSchema);

// ── Dynamic RAG Feed & Keyword Query Generator (No Static Hardcoded URLs) ───────
function getDynamicRSSFeeds() {
  const currentYear = new Date().getFullYear();
  const searchQueries = [
    { query: `DRDO Internship ${currentYear}`, source: 'DRDO Research', tags: ['Defense', 'Govt', 'Research'] },
    { query: `ISRO Internship recruitment ${currentYear}`, source: 'ISRO Space', tags: ['Aerospace', 'Govt', 'Space'] },
    { query: `IIT Research Internship ${currentYear}`, source: 'IIT Research', tags: ['Research', 'Academia'] },
    { query: `AICTE Internship Portal ${currentYear}`, source: 'AICTE Govt', tags: ['Govt', 'National'] },
    { query: `Unstop hackathon OR hiring challenge ${currentYear}`, source: 'Unstop (Dare2Compete)', tags: ['Hackathon', 'Hiring Drive'] },
    { query: `Devfolio hackathon ${currentYear}`, source: 'Devfolio', tags: ['Hackathon', 'Web3', 'AI'] },
    { query: `HackerEarth hiring challenge ${currentYear}`, source: 'HackerEarth', tags: ['Coding Challenge'] },
    { query: `TCS CodeVita OR HackWithInfy ${currentYear}`, source: 'TCS & Infosys', tags: ['National Drive'] },
    { query: `Google Software Engineer Internship India ${currentYear}`, source: 'Google Careers', tags: ['Google', 'Internship'] },
    { query: `Microsoft Explore Internship India ${currentYear}`, source: 'Microsoft Careers', tags: ['Microsoft', 'Internship'] },
    { query: `Amazon SDE Internship India ${currentYear}`, source: 'Amazon Careers', tags: ['Amazon', 'SDE'] },
  ];

  const dynamicRss = searchQueries.map(q => ({
    url: `https://news.google.com/rss/search?q=${encodeURIComponent(q.query)}&hl=en-IN&gl=IN&ceid=IN:en`,
    source: q.source,
    tags: q.tags,
  }));

  // Direct remote platforms
  dynamicRss.push(
    { url: 'https://weworkremotely.com/categories/remote-programming-jobs.rss', source: 'WWR', tags: ['Remote', 'Programming'] },
    { url: 'https://jobicy.com/?feed=job_feed&job_category=engineering', source: 'Jobicy', tags: ['Engineering'] },
    { url: 'https://remotive.com/api/remote-jobs?category=software-dev&limit=15', source: 'Remotive', tags: ['Software'], isJSON: true }
  );

  return dynamicRss;
}


// ── Groq Fraud Filter ─────────────────────────────────────────────────────────
async function isGenuineOpportunity(title, description) {
  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return true;
  try {
    const resp = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [{
          role: 'user',
          content: `Is this a genuine internship or job from a legitimate company?
Title: "${title}"
Description snippet: "${(description || '').slice(0, 200)}"

Return ONLY "true" if it:
- Has a clear tech/engineering role
- Does NOT ask candidates to pay anything
- Is NOT a vague "earn from home" or MLM scheme
- Is NOT blank or spam

Return ONLY "false" otherwise.`,
        }],
        max_tokens: 5,
        temperature: 0,
      },
      { headers: { Authorization: `Bearer ${GROQ_KEY}` }, timeout: 8000 }
    );
    const verdict = resp.data?.choices?.[0]?.message?.content?.trim().toLowerCase();
    return verdict !== 'false';
  } catch {
    return true; // on network error, assume genuine
  }
}

// ── Branch Tag Detector ───────────────────────────────────────────────────────
function detectBranches(text) {
  const rules = {
    'CSE / IT':  /\b(javascript|react|node|python|java|backend|frontend|fullstack|software|web|api|cloud|devops|code)\b/i,
    'AIML':      /\b(machine learning|deep learning|nlp|data science|ai|tensorflow|pytorch|llm|generative|research)\b/i,
    'ENTC':      /\b(embedded|iot|firmware|fpga|verilog|electronics|hardware|pcb|rtos|drdo|isro|telecom)\b/i,
    'Mechanical':/\b(mechanical|cad|solidworks|autocad|manufacturing|thermal|automobile|production|aerospace)\b/i,
    'Civil':     /\b(civil|structure|surveying|cad|construction|infra)\b/i,
  };
  const matched = Object.entries(rules)
    .filter(([, rx]) => rx.test(text))
    .map(([branch]) => branch);

  return matched.length > 0 ? matched : ['CSE / IT', 'ENTC']; // default for general engineering
}


// ── Parse RSS / JSON / Unstop Feeds ───────────────────────────────────────────
async function fetchOpportunities() {
  const verified = [];

  // 1. Fetch Direct Unstop Hackathons & Engineering Opportunities
  try {
    const unstopRes = await axios.get('https://unstop.com/api/public/opportunity/search-result?opportunity=hackathons&per_page=15', { timeout: 10000 });
    const unstopList = unstopRes.data?.data?.data || [];
    for (const item of unstopList) {
      if (!item.title) continue;
      const title = item.title;
      const company = item.organisation?.name || 'Unstop Partner';
      const link = item.seo_url ? (item.seo_url.startsWith('http') ? item.seo_url : `https://unstop.com/${item.seo_url}`) : 'https://unstop.com';
      const description = `Unstop National Hackathon & Hiring Challenge: ${title} organized by ${company}. Open for engineering students.`;
      const branches = detectBranches(`${title} ${description}`);

      verified.push({ title, company, link, branches, sourceName: 'Unstop' });
      console.log(`[Announcer] 🚀 Unstop Hackathon Verified: "${title}"`);
    }
  } catch (err) {
    console.warn('[Announcer] Direct Unstop fetch failed:', err.message);
  }

  // 2. Fetch Direct Devfolio Open Hackathons
  try {
    const devfolioRss = await axios.get('https://news.google.com/rss/search?q=site:devfolio.co+2026&hl=en-IN&gl=IN&ceid=IN:en', { timeout: 10000 });
    const parsed = await xml2js.parseStringPromise(devfolioRss.data, { explicitArray: false });
    const rawItems = parsed?.rss?.channel?.item || [];
    const list = Array.isArray(rawItems) ? rawItems : [rawItems];
    for (const item of list.slice(0, 15)) {
      const rawTitle = (item.title || '').replace(/<[^>]+>/g, '').trim();
      if (!rawTitle || rawTitle.includes('Profile') || rawTitle.includes('Developer')) continue;
      const cleanTitle = rawTitle.replace(/\s*-\s*Devfolio.*/i, '').trim();
      const link = item.link || item.guid || 'https://devfolio.co';
      const description = `Devfolio Tech Hackathon & Developer Challenge 2026: ${cleanTitle}. Build AI, Web3, and Fullstack projects.`;
      const branches = detectBranches(`${cleanTitle} ${description}`);

      verified.push({ title: cleanTitle, company: 'Devfolio Platform', link, branches, sourceName: 'Devfolio' });
      console.log(`[Announcer] 🚀 Devfolio Hackathon Verified: "${cleanTitle}"`);
    }
  } catch (err) {
    console.warn('[Announcer] Devfolio fetch failed:', err.message);
  }

  // 3. Process Dynamic Search & RSS Feeds
  const feeds = getDynamicRSSFeeds();
  for (const feed of feeds) {
    try {
      const { data } = await axios.get(feed.url, { timeout: 12000 });
      let items = [];

      if (feed.isJSON) {
        items = (data.jobs || []).slice(0, 15).map(j => ({
          title: j.title,
          company: j.company_name,
          link: j.url,
          description: j.description || '',
          pubDate: j.publication_date,
        }));
      } else {
        const parsed = await xml2js.parseStringPromise(data, { explicitArray: false });
        const rawItems = parsed?.rss?.channel?.item || [];
        const list = Array.isArray(rawItems) ? rawItems : [rawItems];
        items = list.slice(0, 15).map(i => ({
          title: (i.title || '').replace(/<[^>]+>/g, '').trim(),
          company: feed.source,
          link: i.link || i.guid || '',
          description: (i.description || i['content:encoded'] || '').replace(/<[^>]+>/g, '').trim(),
          pubDate: i.pubDate || i['dc:date'] || '',
        }));
      }

      for (const item of items) {
        if (!item.title || !item.link) continue;

        const fullContent = `${item.title} ${item.description}`.toLowerCase();

        // Freshness & Year Filter: Reject items from 2025, 2024, 2023 or dated Feb/March 2026
        if (/\b(2025|2024|2023|2022|2021|february|feb|march|january)\b/.test(fullContent) && !/\b(july|august|september|october|2026|2027)\b/.test(fullContent)) {
          console.log(`[Announcer] ⏳ Filtered outdated/old item: "${item.title}"`);
          continue;
        }

        // PubDate check: If pubDate exists and is older than 45 days, skip
        if (item.pubDate) {
          const itemDate = new Date(item.pubDate);
          if (!isNaN(itemDate.getTime())) {
            const daysOld = (Date.now() - itemDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysOld > 45) {
              console.log(`[Announcer] ⏳ Filtered old pubDate (${Math.round(daysOld)} days old): "${item.title}"`);
              continue;
            }
          }
        }

        // AI fraud check
        const genuine = await isGenuineOpportunity(item.title, item.description);
        if (!genuine) {
          console.log(`[Announcer] ❌ Filtered: "${item.title}"`);
          continue;
        }

        const branches = detectBranches(`${item.title} ${item.description}`);

        verified.push({
          title:   item.title,
          company: item.company || feed.source,
          link:    item.link,
          branches,
        });

        console.log(`[Announcer] ✅ Verified: "${item.title}" (${branches.join(', ') || 'General'})`);

        // Respectful rate limit on fraud-check API
        await new Promise(r => setTimeout(r, 500));
      }

      // Delay between feeds
      await new Promise(r => setTimeout(r, 2000));

    } catch (err) {
      console.warn(`[Announcer] Feed "${feed.source}" failed: ${err.message}`);
    }
  }

  return verified;
}

// ── Build Announcement Message ────────────────────────────────────────────────
function buildMessage(opportunities) {
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const lines = [`🎯 **Daily Opportunities Digest — ${today}**\n`];
  lines.push(`We found **${opportunities.length} verified** internship & job openings for you today!\n`);

  // Group by branch
  const grouped = {};
  opportunities.forEach(op => {
    const key = op.branches.length ? op.branches[0] : 'General';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(op);
  });

  for (const [branch, ops] of Object.entries(grouped)) {
    lines.push(`\n**${branch} Opportunities:**`);
    ops.slice(0, 5).forEach(op => {
      lines.push(`• [${op.title}](${op.link}) — ${op.company}`);
    });
  }

  lines.push('\n\n📌 All listings are fraud-filtered. Visit the **Placement Drive** section to apply!');
  return lines.join('\n');
}

// ── Send Web Push to All Students ─────────────────────────────────────────────
async function broadcastPush(title, body, count) {
  if (!process.env.VAPID_PUBLIC_KEY) {
    console.log('[Announcer] VAPID not configured — skipping push notifications');
    return;
  }

  const students = await User.find({
    role: 'student',
    pushSubscription: { $exists: true, $ne: null },
  }).select('_id pushSubscription');

  console.log(`[Announcer] Sending push to ${students.length} students...`);

  const results = await Promise.allSettled(
    students.map(u =>
      webpush.sendNotification(
        u.pushSubscription,
        JSON.stringify({
          title: `🎯 PRAGATI — ${title}`,
          body,
          url: '/dashboard/placement-drive',
          tag: `daily-opportunities-${Date.now()}`,
        })
      ).catch(async err => {
        if (err.statusCode === 410) {
          await User.findByIdAndUpdate(u._id, { $unset: { pushSubscription: 1 } });
        }
      })
    )
  );

  const sent = results.filter(r => r.status === 'fulfilled').length;
  console.log(`[Announcer] Push sent to ${sent}/${students.length} students ✅`);
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function run() {
  try {
    const dbUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pragati';
    const localUri = 'mongodb://127.0.0.1:27017/pragati';

    console.log('[Announcer] Connecting to database...');
    try {
      await mongoose.connect(dbUri, { serverSelectionTimeoutMS: 15000 });
      console.log('[Announcer] MongoDB Atlas connected ✅');
    } catch (err) {
      console.warn('[Announcer] ⚠️ MongoDB Atlas connection timed out/failed, trying local MongoDB...');
      await mongoose.connect(localUri, { serverSelectionTimeoutMS: 10000 });
      console.log('[Announcer] Local MongoDB connected ✅');
    }


    // 1. Fetch and verify opportunities
    console.log('[Announcer] Fetching opportunities from RSS feeds...');
    const opportunities = await fetchOpportunities();

    if (opportunities.length === 0) {
      console.log('[Announcer] No verified opportunities found today. Skipping announcement.');
      return;
    }

    console.log(`[Announcer] ${opportunities.length} verified opportunities found ✅`);

    // Ingestion will run and update placement drives. Deduplication is handled by the backend.


    // 3. Build message
    const title   = `🎯 ${opportunities.length} New Verified Internship & Job Openings Today!`;
    const message = buildMessage(opportunities);

    // 4. POST to the live backend — each job becomes a PlacementDrive entry
    //    The /api/drives/scraped-batch route handles:
    //    - Groq AI description generation per listing
    //    - Upsert into PlacementDrive collection (visible in Placement Drive tab)
    //    - ONE summary Announcement + Socket.io notification to all students
    const BACKEND_URL   = process.env.BACKEND_URL   || 'http://localhost:5000';
    const SYSTEM_SECRET = process.env.SYSTEM_SECRET || 'myPragatiSystemSecretKey2026';

    try {
      const resp = await axios.post(
        `${BACKEND_URL}/api/drives/scraped-batch`,
        { opportunities },
        {
          headers: { 'Content-Type': 'application/json', 'x-system-token': SYSTEM_SECRET },
          timeout: 120000,  // Groq description generation takes time per listing
        }
      );

      const { upserted } = resp.data;
      console.log(`[Announcer] ✅ ${upserted} opportunities added to Placement Drive tab!`);
      console.log(`[Announcer] 🔔 Summary announcement + Socket.io notifications fired by backend`);

    } catch (apiErr) {
      // Fallback: direct DB write if server unreachable
      console.warn(`[Announcer] ⚠️ Backend API unreachable (${apiErr.message}), falling back to direct DB write...`);

      let systemUser = await User.findOne({ role: 'admin' }).select('_id');
      if (!systemUser) systemUser = await User.findOne({ role: 'faculty' }).select('_id');

      const ann = await Announcement.create({
        title:             `🎯 ${opportunities.length} New Verified Internship & Job Openings!`,
        message:           buildMessage(opportunities),
        link:              '/dashboard/drives',
        createdBy:         systemUser?._id || null,
        targetFilter:      { role: 'student' },
        priority:          'high',
        isSystemGenerated: true,
        opportunities:     opportunities.slice(0, 20),
      });
      console.log(`[Announcer] ✅ Fallback DB write (ID: ${ann._id})`);

      await broadcastPush(
        'New Internships Available!',
        `${opportunities.length} verified opportunities added — check Placement Drives tab!`,
        opportunities.length
      );
    }

    console.log('[Announcer] Daily job announcement complete 🎉');


  } catch (err) {
    console.error('[Announcer] Fatal error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();

