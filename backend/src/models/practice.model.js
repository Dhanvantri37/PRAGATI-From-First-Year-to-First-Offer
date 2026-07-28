const mongoose = require('mongoose');

// ─── Round Specific Question Schemas ──────────────────────────────────────────
const HRQuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  category: String,
  company: { type: String, default: 'General Tech' },
  sampleAnswer: String,
  keywords: [String],
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
}, { timestamps: true });

const GDTopicSchema = new mongoose.Schema({
  topic: { type: String, required: true },
  category: String,
  company: { type: String, default: 'General Corporate' },
  difficulty: { type: String, default: 'Medium' },
  keyPoints: [String],
  modelAnswer: String,
}, { timestamps: true });

const TechnicalQuestionSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  question: { type: String, required: true },
  company: { type: String, default: 'General Tech' },
  answer: String,
  codeSnippet: String,
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  tags: [String],
}, { timestamps: true });

const CaseStudySchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, default: 'General Tech' },
  difficulty: String,
  context: String,
  sections: [String],
  sampleAnswer: { type: Map, of: String },
  keywords: [String],
  domain: String,
}, { timestamps: true });

const PuzzleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, default: 'General Tech' },
  puzzle: String,
  hint: String,
  answer: String,
  explanation: String,
  category: String,
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
}, { timestamps: true });

const DebuggingProblemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, default: 'General Tech' },
  lang: String,
  difficulty: String,
  buggy: String,
  options: [String],
  correct: Number,
  fixed: String,
  explanation: String,
}, { timestamps: true });

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

const practiceResponseSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roundType:  { type: String, required: true },
  questionId: { type: String },
  answer:     { type: String },
  score:      { type: Number },
  timeTaken:  { type: Number },
}, { timestamps: true });

// Prevent overwrite errors if models were already registered by seeders
const HRQuestion        = mongoose.models.HRQuestion        || mongoose.model('HRQuestion', HRQuestionSchema);
const GDTopic           = mongoose.models.GDTopic           || mongoose.model('GDTopic', GDTopicSchema);
const TechnicalQuestion = mongoose.models.TechnicalQuestion || mongoose.model('TechnicalQuestion', TechnicalQuestionSchema);
const CaseStudy         = mongoose.models.CaseStudy         || mongoose.model('CaseStudy', CaseStudySchema);
const Puzzle            = mongoose.models.Puzzle            || mongoose.model('Puzzle', PuzzleSchema);
const DebuggingProblem  = mongoose.models.DebuggingProblem  || mongoose.model('DebuggingProblem', DebuggingProblemSchema);

module.exports = {
  PracticeRound:    mongoose.models.PracticeRound    || mongoose.model('PracticeRound', practiceRoundSchema),
  PracticeResponse: mongoose.models.PracticeResponse || mongoose.model('PracticeResponse', practiceResponseSchema),
  HRQuestion,
  GDTopic,
  TechnicalQuestion,
  CaseStudy,
  Puzzle,
  DebuggingProblem,
};
