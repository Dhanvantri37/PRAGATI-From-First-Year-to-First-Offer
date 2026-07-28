const mongoose = require('mongoose');
require('dotenv').config();

async function purgeAlumni() {
  try {
    const dbUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pragati';
    console.log('[Purging Alumni] Connecting to MongoDB...');
    await mongoose.connect(dbUri, { serverSelectionTimeoutMS: 8000 }).catch(async () => {
      await mongoose.connect('mongodb://127.0.0.1:27017/pragati');
    });

    const alumniCol = mongoose.connection.collection('alumnis');
    const res = await alumniCol.deleteMany({});
    console.log(`[Purging Alumni] Deleted ${res.deletedCount} alumni records from MongoDB.`);

    const connCol = mongoose.connection.collection('alumniconnections');
    const connRes = await connCol.deleteMany({});
    console.log(`[Purging Alumni] Deleted ${connRes.deletedCount} alumni connection records from MongoDB.`);

    console.log('[Purging Alumni] Complete!');
  } catch (err) {
    console.error('[Purging Alumni] Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

purgeAlumni();
