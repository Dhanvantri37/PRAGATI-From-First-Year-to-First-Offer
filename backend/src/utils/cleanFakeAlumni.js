const mongoose = require('mongoose');
require('dotenv').config();

async function cleanFakeAlumni() {
  try {
    const dbUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pragati';
    console.log('[Cleaner] Connecting to DB...');
    await mongoose.connect(dbUri, { serverSelectionTimeoutMS: 8000 }).catch(async () => {
      await mongoose.connect('mongodb://127.0.0.1:27017/pragati');
    });

    const col = mongoose.connection.collection('alumnis');
    const result = await col.deleteMany({
      $or: [
        { source: { $in: ['seed', 'mock', 'demo', 'fake'] } },
        { email: { $regex: '@example\\.com|@test\\.com', $options: 'i' } },
        { isVerified: false }
      ]
    });

    console.log(`[Cleaner] ✅ Purged ${result.deletedCount} fake seed alumni entries!`);
  } catch (err) {
    console.error('[Cleaner] Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

cleanFakeAlumni();
