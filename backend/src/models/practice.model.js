const mongoose = require('mongoose');

// ─── Practice Round (seed data container) ────────────────────────────────────
const practiceRoundSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['HR', 'GD', 'TECHNICAL', 'CASE_STUDY', 'SYSTEM_DESIGN', 'PROJECT', 'GAMING', 'PUZZLE', 'DEBUGGING'],
    required: true,
    unique: true,
  },
  description: String,
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
}, { timestamps: true });

// ─── Practice Response (user submissions) ────────────────────────────────────
const practiceResponseSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roundType:  { type: String, required: true },
  questionId: { type: String },
  answer:     { type: String },
  score:      { type: Number },
  timeTaken:  { type: Number },
}, { timestamps: true });

module.exports = {
  PracticeRound:    mongoose.model('PracticeRound', practiceRoundSchema),
  PracticeResponse: mongoose.model('PracticeResponse', practiceResponseSchema),
};
