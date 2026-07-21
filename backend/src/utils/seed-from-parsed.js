/**
 * PRAGATI — Full Aptitude Question Seeder
 * Reads parsed-questions.json (generated from Aptitude Sheet docx)
 * and upserts all questions into MongoDB AptitudeQuestion collection.
 *
 * Usage:  node src/utils/seed-from-parsed.js [--force]
 *   --force  : wipe all existing questions before seeding
 */
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
try { dns.setServers(['8.8.8.8','1.1.1.1']); } catch {}
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const path     = require('path');
const fs       = require('fs');
const { AptitudeQuestion } = require('../models');

const PARSED_JSON = path.join(__dirname, 'parsed-questions.json');
const FORCE_WIPE  = process.argv.includes('--force');

// Difficulty heuristics based on subtopic/solution length
function inferDifficulty(q) {
  const sol = (q.explanation || '').length;
  const hardTopics = ['Number System','SI/CI','Simple & Compound Interest','Time & Work',
    'Seating Arrangement','Syllogism','Blood Relations','Para Jumbles','Cloze Test'];
  const easyTopics = ['Synonyms','Antonyms','Fill in the Blanks','Idioms','Spotting Errors',
    'Direction Sense','Coding-Decoding'];
  if (hardTopics.some(t => q.subtopic && q.subtopic.toLowerCase().includes(t.toLowerCase()))) return 'Hard';
  if (easyTopics.some(t => q.subtopic && q.subtopic.toLowerCase().includes(t.toLowerCase()))) return 'Easy';
  if (sol > 400) return 'Hard';
  if (sol < 100) return 'Easy';
  return 'Medium';
}

async function seed() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) { console.error('❌ MONGO_URI not set in .env'); process.exit(1); }

  if (!fs.existsSync(PARSED_JSON)) {
    console.error('❌ parsed-questions.json not found. Run comprehensiveParser.py first.');
    process.exit(1);
  }

  const questions = JSON.parse(fs.readFileSync(PARSED_JSON, 'utf-8'));
  console.log(`📄 Loaded ${questions.length} questions from JSON`);

  await mongoose.connect(uri);
  console.log('✅ MongoDB connected');

  if (FORCE_WIPE) {
    const deleted = await AptitudeQuestion.deleteMany({});
    console.log(`🗑️  Wiped ${deleted.deletedCount} existing questions`);
  }

  let inserted = 0, skipped = 0, errors = 0;

  for (const q of questions) {
    try {
      // Skip if question text is empty or options are incomplete
      if (!q.question || !q.options || q.options.length !== 4 || !q.answer) {
        skipped++; continue;
      }

      // Dedup by first 100 chars of question text
      const key = q.question.slice(0, 100);
      const existing = await AptitudeQuestion.findOne({
        question: { $regex: new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0,60), 'i') }
      });

      if (existing) {
        // Merge new companies if any
        const merged = [...new Set([...(existing.companies || []), ...(q.companies || [])])];
        await AptitudeQuestion.findByIdAndUpdate(existing._id, {
          companies: merged,
          year: existing.year || q.year,
          explanation: existing.explanation || q.explanation,
          source: 'DOCX',
        });
        skipped++;
      } else {
        await AptitudeQuestion.create({
          topic:       q.topic       || 'Quantitative',
          subtopic:    q.subtopic    || 'General',
          difficulty:  inferDifficulty(q),
          companies:   q.companies   || [],
          year:        q.year        || '2025',
          question:    q.question,
          options:     q.options,
          answer:      q.answer,
          explanation: q.explanation || '',
          source:      'DOCX',
        });
        inserted++;
      }
    } catch (err) {
      if (err.code !== 11000) errors++;
    }
  }

  const total = await AptitudeQuestion.countDocuments();
  console.log(`\n✅ Seeding complete:`);
  console.log(`   Inserted : ${inserted}`);
  console.log(`   Skipped  : ${skipped} (already existed)`);
  console.log(`   Errors   : ${errors}`);
  console.log(`   DB Total : ${total} questions`);
  await mongoose.disconnect();
}

seed().catch(err => { console.error('❌ Fatal:', err.message); process.exit(1); });
