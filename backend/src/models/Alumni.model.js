/**
 * Alumni.model.js — KIT's College of Engineering, Kolhapur — Alumni Profiles
 *
 * Sources:
 *   - Crawler-discovered from public web (LinkedIn, company pages)
 *   - Self-registered by alumni themselves
 *   - Migrated from graduating student records (PRAGATI users who pass out)
 *
 * Privacy: Only isOptedIn=true alumni are visible to students.
 * Admin reviews crawler-found profiles before setting isVerified=true.
 */

const mongoose = require('mongoose');

const alumniSchema = new mongoose.Schema({
  // ── Identity ─────────────────────────────────────────────────────────────
  name:         { type: String, required: true, trim: true },
  email:        { type: String, trim: true, lowercase: true },
  photoUrl:     { type: String, default: '' },

  // ── Academic ──────────────────────────────────────────────────────────────
  batch:        { type: Number },          // graduation year e.g. 2022
  department:   { type: String, trim: true },  // 'CSE', 'ENTC', 'ME', 'CE', 'AIML'
  rollNo:       { type: String, trim: true },  // optional, links to student record

  // ── Professional ─────────────────────────────────────────────────────────
  company:      { type: String, trim: true },  // current employer
  role:         { type: String, trim: true },  // current designation
  location:     { type: String, trim: true },  // city, country
  skills:       [{ type: String }],            // tech skills
  linkedinUrl:  { type: String, trim: true },
  bio:          { type: String },              // AI-enriched professional summary

  // ── Mentorship ────────────────────────────────────────────────────────────
  isOptedIn:       { type: Boolean, default: true },   // visible to students?
  mentorshipAreas: [{ type: String }],                 // e.g. ['Resume Review', 'Mock Interview', 'Job Referrals']
  availableFor:    { type: String, enum: ['chat', 'call', 'email', 'none'], default: 'chat' },

  // ── System ────────────────────────────────────────────────────────────────
  isVerified:  { type: Boolean, default: false },  // admin-verified before students see it
  source:      { type: String, enum: ['manual', 'crawler', 'self', 'faculty_excel', 'excel'], default: 'manual' },
  linkedUserId:{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // links to PRAGATI User

  // ── RAG ───────────────────────────────────────────────────────────────────
  embedding:   [{ type: Number }],  // 384-dim vector (all-MiniLM-L6-v2)

}, { timestamps: true });

// Index for fast browsing
alumniSchema.index({ batch: -1 });
alumniSchema.index({ department: 1 });
alumniSchema.index({ company: 1 });
alumniSchema.index({ isOptedIn: 1, isVerified: 1 });

module.exports = mongoose.model('Alumni', alumniSchema);
