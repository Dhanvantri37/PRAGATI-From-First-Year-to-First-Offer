/**
 * crawlerWorker.js — PRAGATI Background Ingestor
 *
 * Run via GitHub Actions (free compute) on a weekly cron schedule.
 * Discovers: KITCOEK alumni from DuckDuckGo + live job openings from RSS feeds.
 * Vectorizes each entry using ragService.getEmbedding() and upserts to MongoDB.
 *
 * Usage:
 *   node backend/src/utils/crawlerWorker.js
 *
 * Environment variables required (same as backend .env):
 *   MONGO_URI, GROQ_API_KEY
 */

const mongoose = require('mongoose');
const axios    = require('axios');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

// ── Schemas (standalone — does not import from models/index.js to stay lightweight) ──

const alumniSchema = new mongoose.Schema({
  name:           { type: String },
  linkedinUrl:    { type: String, unique: true, required: true },
  currentCompany: { type: String },
  role:           { type: String },
  branch:         { type: String },
  snippet:        { type: String },
  embedding:      { type: [Number] },
  discoveredAt:   { type: Date, default: Date.now },
}, { timestamps: true });

const openingSchema = new mongoose.Schema({
  title:           { type: String, required: true },
  companyName:     { type: String },
  description:     { type: String },
  applyLink:       { type: String, unique: true, required: true },
  allowedBranches: [String],
  source:          { type: String, default: 'RSS' },
  isVerified:      { type: Boolean, default: false },
  embedding:       { type: [Number] },
  scrapedAt:       { type: Date, default: Date.now },
}, { timestamps: true });

// ── Load Models ────────────────────────────────────────────────────────────────
const Alumni  = mongoose.models.DiscoveredAlumni  || mongoose.model('DiscoveredAlumni',  alumniSchema);
const Opening = mongoose.models.ScrapedOpening    || mongoose.model('ScrapedOpening',    openingSchema);

// ── RAG Service (local CPU embeddings) ────────────────────────────────────────
const { getEmbedding } = require('./ragService');

// ── Groq Fraud Detection Helper ───────────────────────────────────────────────
async function isGenuineOpening(title, description) {
  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return true; // skip check if no key

  try {
    const resp = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [{
          role: 'user',
          content: `Is this a genuine job/internship listing from a real company?
Title: "${title}"
Description: "${(description || '').slice(0, 300)}"

Return ONLY "true" if genuine (has real company, tech skills, clear responsibilities).
Return ONLY "false" if it looks like: a scam, pay-to-work, MLM, no-skill vague role, or survey job.`,
        }],
        max_tokens: 5,
        temperature: 0,
      },
      { headers: { Authorization: `Bearer ${GROQ_KEY}` }, timeout: 10000 }
    );
    const verdict = resp.data?.choices?.[0]?.message?.content?.trim().toLowerCase();
    return verdict !== 'false';
  } catch {
    return true; // on error, assume genuine
  }
}

// ── 1. Alumni Discovery via DuckDuckGo ────────────────────────────────────────
async function crawlAlumni() {

  console.log('[Crawler] Starting KIT\'s Kolhapur alumni discovery...');

  // Targeted queries for KIT's College of Engineering Kolhapur
  const queries = [
    '"KIT\'s College of Engineering" Kolhapur alumni site:linkedin.com',
    '"KIT College of Engineering Kolhapur" engineer',
    '"Kolhapur Institute of Technology" alumni software engineer',
    '"KITCOEK" engineer developer',
    '"KIT Kolhapur" graduate engineer 2020 OR 2021 OR 2022 OR 2023',
    '"KIT\'s COE Kolhapur" site:linkedin.com',
  ];

  const profiles = [];
  const seenUrls = new Set();

  for (const query of queries) {
    try {
      const { data: html } = await axios.get(
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
        { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PragatiCrawler/2.0; KIT Kolhapur)' }, timeout: 15000 }
      );

      const urlPattern     = /linkedin\.com\/in\/([\w-]+)/g;
      const snippetPattern = /class="result__snippet"[^>]*>(.*?)<\/a>/g;
      const namePattern    = /class="result__a"[^>]*>(.*?)<\/a>/g;

      const urls     = [...new Set([...html.matchAll(urlPattern)].map(m => `https://www.linkedin.com/in/${m[1]}`))];
      const snippets = [...html.matchAll(snippetPattern)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
      const names    = [...html.matchAll(namePattern)].map(m => m[1].replace(/<[^>]+>/g, '').trim());

      for (let i = 0; i < urls.length; i++) {
        const linkedinUrl = urls[i];
        if (seenUrls.has(linkedinUrl)) continue;
        seenUrls.add(linkedinUrl);

        const snippet = snippets[i] || '';
        const name    = names[i]    || 'KIT Alumnus';

        // Extract company from snippet
        const companyMatch = snippet.match(/(?:at|@)\s+([A-Z][a-zA-Z\s&,.]+?)(?:\s+·|\s+-|\s+\||$)/);
        const company = companyMatch ? companyMatch[1].trim().slice(0, 80) : '';

        // Extract role from snippet
        const roleMatch = snippet.match(/^([A-Z][a-zA-Z\s]+(?:Engineer|Developer|Manager|Analyst|Designer|Architect|Lead|Intern))/);
        const role = roleMatch ? roleMatch[1].trim() : '';

        // Extract branch from snippet
        const branchMatch = snippet.match(/\b(CSE|IT|AIML|AI.ML|Computer Science|Electronics|ENTC|Mechanical|Civil|E&TC)\b/i);
        const department = branchMatch ? branchMatch[1].replace('Computer Science', 'CSE').replace('AI.ML', 'AIML').toUpperCase() : '';

        // Extract batch year (2018-2025)
        const batchMatch = snippet.match(/\b(201[6-9]|202[0-5])\b/);
        const batch = batchMatch ? parseInt(batchMatch[1]) : null;

        profiles.push({ name, linkedinUrl, company, role, department, batch, bio: snippet, source: 'crawler' });
      }

      // Respectful delay between queries
      await new Promise(r => setTimeout(r, 4000));

    } catch (err) {
      console.warn(`[Crawler] Alumni query failed: ${err.message}`);
    }
  }

  if (profiles.length === 0) {
    console.log('[Crawler] No alumni discovered this run');
    return;
  }

  // POST to alumni ingest API
  const BACKEND_URL   = process.env.BACKEND_URL   || 'http://localhost:5000';
  const SYSTEM_SECRET = process.env.SYSTEM_SECRET || 'myPragatiSystemSecretKey2026';

  try {
    const resp = await axios.post(
      `${BACKEND_URL}/api/alumni/system/ingest`,
      { profiles },
      { headers: { 'Content-Type': 'application/json', 'x-system-token': SYSTEM_SECRET }, timeout: 60000 }
    );
    console.log(`[Crawler] ✅ Alumni: ${resp.data.upserted}/${profiles.length} profiles ingested into Alumni collection`);
  } catch (err) {
    console.warn(`[Crawler] Alumni ingest API failed (${err.message}) — alumni saved to RAG only`);
    // Fallback: vectorize and store in RAG collection directly
    const { upsertDoc } = require('./ragService');
    for (const p of profiles) {
      const text = `${p.name} ${p.department || ''} KIT Kolhapur batch ${p.batch || ''} ${p.company || ''} ${p.role || ''} ${p.bio || ''}`;
      await upsertDoc('pragati_alumni', { _key: p.linkedinUrl, type: 'alumni', ...p }, text, '_key').catch(() => {});
    }
  }

  console.log(`[Crawler] Alumni discovery done — ${profiles.length} profiles found ✅`);
}

// ── 2. Job/Internship RSS Ingestion ───────────────────────────────────────────
async function crawlJobs() {
  console.log('[Crawler] Starting job RSS ingestion...');

  // Free, reliable RSS job feeds (no API key required)
  const RSS_FEEDS = [
    { url: 'https://remoteok.com/remote-jobs.rss',                          source: 'RemoteOK' },
    { url: 'https://weworkremotely.com/categories/remote-programming-jobs.rss', source: 'WWR' },
    { url: 'https://jobicy.com/?feed=job_feed&job_category=engineering',    source: 'Jobicy' },
  ];

  // Dynamic import xml2js for RSS XML parsing
  const { parseStringPromise } = require('xml2js');

  let saved = 0;

  for (const feed of RSS_FEEDS) {
    try {
      const { data: xml } = await axios.get(feed.url, { timeout: 15000 });
      const parsed = await parseStringPromise(xml, { explicitArray: false });
      const items  = parsed?.rss?.channel?.item || [];
      const list   = Array.isArray(items) ? items : [items];

      for (const item of list.slice(0, 20)) { // max 20 per feed per run
        const title       = (item.title || '').replace(/<[^>]+>/g, '').trim();
        const description = (item.description || item['content:encoded'] || '').replace(/<[^>]+>/g, '').trim();
        const applyLink   = item.link || item.guid || '';

        if (!title || !applyLink) continue;

        // AI fraud filter
        const genuine = await isGenuineOpening(title, description);
        if (!genuine) {
          console.log(`[Crawler] ❌ Filtered fraudulent: "${title}"`);
          continue;
        }

        // Branch tagging (keyword match)
        const branchMap = {
          CSE:        /\b(javascript|react|node|python|java|backend|frontend|fullstack|software|web)\b/i,
          AIML:       /\b(machine learning|deep learning|ai|nlp|data science|tensorflow|pytorch)\b/i,
          ENTC:       /\b(embedded|firmware|iot|verilog|fpga|electronics|hardware)\b/i,
          Mechanical: /\b(mechanical|cad|solidworks|autocad|manufacturing)\b/i,
        };
        const allowedBranches = Object.entries(branchMap)
          .filter(([, rx]) => rx.test(title) || rx.test(description))
          .map(([branch]) => branch);

        const textToEmbed = `${title} ${description.slice(0, 300)}`;

        try {
          const embedding = await getEmbedding(textToEmbed);
          await Opening.findOneAndUpdate(
            { applyLink },
            { title, companyName: feed.source, description: description.slice(0, 500), applyLink, allowedBranches, source: feed.source, isVerified: true, embedding, scrapedAt: new Date() },
            { upsert: true, new: true }
          );
          saved++;
        } catch (e) {
          // Duplicate applyLink — skip
        }
      }

      await new Promise(r => setTimeout(r, 2000));

    } catch (err) {
      console.warn(`[Crawler] Feed ${feed.source} failed: ${err.message}`);
    }
  }

  console.log(`[Crawler] Job ingestion done — ${saved} openings upserted ✅`);
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function run() {
  try {
    const dbUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pragati';
    const localUri = 'mongodb://127.0.0.1:27017/pragati';

    console.log('[Crawler] Connecting to database...');
    try {
      await mongoose.connect(dbUri, { serverSelectionTimeoutMS: 5000 });
      console.log('[Crawler] MongoDB Atlas connected ✅');
    } catch (err) {
      console.warn('[Crawler] ⚠️ MongoDB Atlas connection timed out/failed, trying local MongoDB...');
      await mongoose.connect(localUri, { serverSelectionTimeoutMS: 5000 });
      console.log('[Crawler] Local MongoDB connected ✅');
    }


    await crawlAlumni();
    await crawlJobs();

    console.log('[Crawler] All done 🎉');
  } catch (err) {
    console.error('[Crawler] Fatal error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();
