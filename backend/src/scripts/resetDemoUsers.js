/**
 * resetDemoUsers.js — Force-resets password hashes for all PRAGATI demo accounts
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('../models/User.model');

const DEMO_USERS = [
  { name: 'Admin PRAGATI', email: 'admin@pragati.edu', password: 'Admin@123', role: 'admin', department: 'CSE' },
  { name: 'Sapana Patil', email: 'sapana@pragati.edu', password: 'Faculty@123', role: 'faculty', department: 'CSE' },
  { name: 'Rajesh Kumar', email: 'rajesh@pragati.edu', password: 'Faculty@123', role: 'faculty', department: 'CSAIML' },
  { name: 'Guruprasad Shinde', email: 'student@pragati.edu', password: 'Student@123', role: 'student', department: 'CSAIML', year: 2, rollNumber: '58', skillLevel: 'Expert', atsScore: 46, streak: 1 },
  { name: 'Ravi Sharma', email: 'ravi@pragati.edu', password: 'Student@123', role: 'student', department: 'CSAIML', year: 2, rollNumber: '42', skillLevel: 'Intermediate' },
  { name: 'Priya Desai', email: 'priya@pragati.edu', password: 'Student@123', role: 'student', department: 'CSE', year: 3, rollNumber: '15', skillLevel: 'Beginner' },
  { name: 'Amit Kulkarni', email: 'amit@pragati.edu', password: 'Student@123', role: 'student', department: 'CSE', year: 2, rollNumber: '23', skillLevel: 'Intermediate' },
];

async function run() {
  const dbUri    = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pragati';
  const localUri = 'mongodb://127.0.0.1:27017/pragati';

  console.log('[ResetDemoUsers] Connecting to MongoDB...');
  try {
    await mongoose.connect(dbUri, { serverSelectionTimeoutMS: 15000 });
    console.log('[ResetDemoUsers] Connected to Atlas MongoDB ✅');
  } catch {
    await mongoose.connect(localUri, { serverSelectionTimeoutMS: 10000 });
    console.log('[ResetDemoUsers] Connected to Local MongoDB ✅');
  }

  for (const u of DEMO_USERS) {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(u.password, saltRounds);

    await User.findOneAndUpdate(
      { email: u.email.toLowerCase() },
      {
        $set: {
          name: u.name,
          email: u.email.toLowerCase(),
          password: hashedPassword,
          role: u.role,
          department: u.department,
          year: u.year,
          rollNumber: u.rollNumber,
          skillLevel: u.skillLevel || 'Intermediate',
          isActive: true,
          isProfileComplete: true,
        }
      },
      { upsert: true, new: true }
    );

    console.log(` ✅ Password Reset: ${u.email} -> ${u.password}`);
  }

  console.log('[ResetDemoUsers] Done resetting all passwords 🎉');
  await mongoose.disconnect();
}

run();
