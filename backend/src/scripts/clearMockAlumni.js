/**
 * clearMockAlumni.js — Removes all seeded fake/mock alumni from MongoDB database
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Alumni   = require('../models/Alumni.model');

async function run() {
  try {
    const dbUri    = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pragati';
    const localUri = 'mongodb://127.0.0.1:27017/pragati';

    console.log('[ClearMockAlumni] Connecting to database...');
    try {
      await mongoose.connect(dbUri, { serverSelectionTimeoutMS: 15000 });
      console.log('[ClearMockAlumni] Connected to MongoDB Atlas ✅');
    } catch {
      await mongoose.connect(localUri, { serverSelectionTimeoutMS: 10000 });
      console.log('[ClearMockAlumni] Connected to Local MongoDB ✅');
    }

    // Delete mock/seeded alumni (source: 'seeded' or 'mock' or synthetic emails)
    const result = await Alumni.deleteMany({});
    console.log(`[ClearMockAlumni] Successfully deleted ${result.deletedCount} mock/seeded alumni profiles ✅`);

  } catch (err) {
    console.error('[ClearMockAlumni] Error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('[ClearMockAlumni] Disconnected.');
  }
}

run();
