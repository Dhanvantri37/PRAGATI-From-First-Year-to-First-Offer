const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('Error: MONGO_URI environment variable is not defined.');
  process.exit(1);
}

async function purgeNotes() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected successfully!');

    // Since we renamed variables in the schema, we can drop the notes collection or clear it
    console.log('Deleting all documents in "notes" collection...');
    const result = await mongoose.connection.collection('notes').deleteMany({});
    console.log(`Deleted ${result.deletedCount} notes successfully.`);

    process.exit(0);
  } catch (err) {
    console.error('Error purging notes:', err);
    process.exit(1);
  }
}

purgeNotes();
