/**
 * AlumniConnection.model.js — Student ↔ Alumni connection requests
 */

const mongoose = require('mongoose');

const alumniConnectionSchema = new mongoose.Schema({
  student:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
  alumni:      { type: mongoose.Schema.Types.ObjectId, ref: 'Alumni', required: true },
  status:      { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },

  // Student's intro message
  message:     { type: String, trim: true, maxlength: 500 },
  // What kind of help they're seeking
  helpType:    { type: String, enum: ['mentorship', 'referral', 'resume-review', 'mock-interview', 'general'], default: 'general' },

  // Alumni's response message (optional)
  responseMessage: { type: String, trim: true },
  respondedAt:     { type: Date },

}, { timestamps: true });

// Ensure one request per student-alumni pair
alumniConnectionSchema.index({ student: 1, alumni: 1 }, { unique: true });

module.exports = mongoose.model('AlumniConnection', alumniConnectionSchema);
