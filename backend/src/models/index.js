const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: { type: String, required: true },
  sector: { type: String },
  logo: { type: String },
  website: { type: String },
  status: { type: String, default: '-' },
  campusVisitDate: { type: String, default: '-' },
  recruitmentRounds: [String],
  aptitudePatterns: { type: String },
  interviewPatterns: { type: String },
  difficulty: { type: String }, // relaxed from enum to support range strings
  eligibilityCriteria: {
    minCGPA: { type: Number },
    allowedBranches: [String],
    backlogs: { type: Boolean, default: false }
  },
  ctc: { type: String },
  roles: [String],
  jdText: { type: String },
  prepTips: { type: String },
  tags: [String],
  logoUrl: { type: String }, // direct logo URL
  glassdoorUrl: { type: String }, // optional Glassdoor link
  pinnedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // bookmarked users
  companyOverview: { type: String },
  techStack: [String],
  workCulture: { type: String },
  growthPath: { type: String },
  interviewDifficulty: { type: String },
  bondDetails: { type: String },
  hiringMode: { type: String },
  testPlatform: { type: String },
  bond: { type: String },
  packageBreakdown: { type: String },
  resources: [String],
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// ─── Problem ─────────────────────────────────────────────────────────────────
const problemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  source: { type: String, enum: ['LeetCode', 'HackerRank', 'CodeChef', 'GFG', 'Custom'], required: true },
  problemId: { type: String },           // LeetCode problem number (e.g. "1", "121")
  url: { type: String },                 // Direct link to the problem
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
  topic: { type: String },               // Arrays, DP, Trees, etc.
  tags: [String],                        // Two Pointers, Sliding Window, etc.
  description: { type: String },         // Problem statement summary
  constraints: { type: String },         // Input constraints
  companies: [String],                   // Companies that asked this problem
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  hints: [String],                       // Approach hints without spoiling
  acceptanceRate: { type: Number },      // e.g. 49.5 (%)
  editorial: { type: String },           // Premium detailed Markdown editorial solution
  testCases: [{ input: { type: String }, output: { type: String } }],
  assignedDate: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for fast daily problem lookup
problemSchema.index({ difficulty: 1, topic: 1 });
problemSchema.index({ source: 1, problemId: 1 }, { unique: true, sparse: true });

// ─── User Problem Progress ────────────────────────────────────────────────────
const userProblemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  problemId: { type: mongoose.Schema.Types.Mixed, ref: 'Problem', required: true },
  status: { type: String, enum: ['assigned', 'attempted', 'solved'], default: 'assigned' },
  solvedAt: { type: Date },
  approachNotes: { type: String },
  solutionCode: { type: String },
  timeTakenMinutes: { type: Number },
  selfRating: { type: Number, min: 1, max: 5 },
  shuffled: { type: Boolean, default: false },
  isDaily: { type: Boolean, default: false }
}, { timestamps: true });

// Performance indexes for fast analytics aggregation
userProblemSchema.index({ userId: 1, status: 1 });           // solved problems count
userProblemSchema.index({ userId: 1, isDaily: 1, createdAt: -1 }); // daily problem lookup
userProblemSchema.index({ userId: 1, updatedAt: -1 });       // heatmap date grouping

// ─── Aptitude Question ────────────────────────────────────────────────────────
const aptitudeQuestionSchema = new mongoose.Schema({
  topic:      { type: String, required: true },   // Quantitative, Logical Reasoning, etc.
  subtopic:   { type: String },                   // Profit & Loss, Puzzles, etc.
  question:   { type: String, required: true },
  options:    [String],
  answer:     { type: String, required: true },
  explanation:{ type: String },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'] },
  companies:  [String],                           // ['TCS', 'Infosys', 'Amazon']
  year:       { type: String },                   // '2025', '2025/2026'
  source:     { type: String },                   // 'manual', 'AI-Generated', 'DOCX'
  createdAt:  { type: Date, default: Date.now }
}, { timestamps: true });
aptitudeQuestionSchema.index({ topic: 1, subtopic: 1 });
aptitudeQuestionSchema.index({ companies: 1 });
aptitudeQuestionSchema.index({ question: 1 }, { unique: true, sparse: true });

// ─── Aptitude Bookmark ────────────────────────────────────────────────────────
const aptitudeBookmarkSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AptitudeQuestion', required: true },
  createdAt:  { type: Date, default: Date.now }
}, { timestamps: true });
aptitudeBookmarkSchema.index({ userId: 1, questionId: 1 }, { unique: true });

// ─── Discussion / Doubt ───────────────────────────────────────────────────────
const discussionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['student-student', 'student-faculty'], default: 'student-student' },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  department: { type: String },
  year: { type: Number },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  problemLink: { type: String },
  approach: { type: String },
  difficulty: { type: String },
  replies: [{
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    upvotes: { type: Number, default: 0 },
    isAccepted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  isResolved: { type: Boolean, default: false },
  upvotes: { type: Number, default: 0 },
  tags: [String]
}, { timestamps: true });

// ─── SkillPath Analysis Result ────────────────────────────────────────────────
const skillpathResultSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  resumeUrl: { type: String },
  jobTitle: { type: String },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  jdText: { type: String },
  atsScore: { type: Number },
  atsBreakdown: { type: mongoose.Schema.Types.Mixed, default: {} }, // stores full ML breakdown
  eligibilityPercent: { type: Number },
  eligibilityReason: { type: String },
  skillGapAnalysis: {
    matchedSkills: [String],
    missingSkills: [String],
    weakAreas: [String]
  },
  proficiencyLevel: { type: String, enum: ['Beginner', 'Intermediate', 'Expert'] },
  recommendations: [{ skill: String, resource: String, priority: String }],
  parsedSkills: [String],
  analyzedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// ─── Application ──────────────────────────────────────────────────────────────
const applicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  role: { type: String },
  platform: { type: String, enum: ['LinkedIn', 'Unstop', 'Campus', 'Other'] },
  status: { type: String, enum: ['applied', 'shortlisted', 'rejected', 'selected', 'withdrawn'], default: 'applied' },
  appliedDate: { type: Date, default: Date.now },
  notes: { type: String }
}, { timestamps: true });

// ─── Announcement ─────────────────────────────────────────────────────────────
const announcementSchema = new mongoose.Schema({
  title:   { type: String, required: true },
  message: { type: String, required: true },
  link:    { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional for system-generated
  targetFilter: {
    role:       { type: String },
    department: { type: String },
    year:       { type: Number },
    atsBelow:   { type: Number },
  },
  readBy:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  priority: { type: String, enum: ['normal','high','urgent'], default: 'normal' },
  // RAG / System-generated fields
  isSystemGenerated: { type: Boolean, default: false },  // true = created by daily announcer
  opportunities: [{                                       // embedded verified job cards
    title:    { type: String },
    company:  { type: String },
    link:     { type: String },
    branches: [String],
  }],
}, { timestamps: true });

// ─── AptitudeNote ──────────────────────────────────────────────────────────
const aptitudeNoteSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AptitudeQuestion', required: true },
  note:       { type: String, maxlength: 2000 },
}, { timestamps: true });
aptitudeNoteSchema.index({ userId: 1, questionId: 1 }, { unique: true });

// ─── AptitudeAttempt ──────────────────────────────────────────────────────────
const aptitudeAttemptSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AptitudeQuestion', required: true },
  topic:      { type: String, required: true },
  subtopic:   { type: String },
  selectedAnswer: { type: String },
  correct:    { type: Boolean },
  timeSpent:  { type: Number },
  attemptedAt:{ type: Date, default: Date.now },
}, { timestamps: true });

// ─── DirectMessage ────────────────────────────────────────────────────────────
const directMessageSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  messages: [{
    from:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text:      { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });
directMessageSchema.index({ participants: 1 });

// ─── DepartmentSettings ───────────────────────────────────────────────────────
const departmentSettingsSchema = new mongoose.Schema({
  department: { type: String, required: true, unique: true },
  disablePasteInEditor: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = {
  Company:           mongoose.model('Company', companySchema),
  Problem:           mongoose.model('Problem', problemSchema),
  UserProblem:       mongoose.model('UserProblem', userProblemSchema),
  AptitudeQuestion:  mongoose.model('AptitudeQuestion', aptitudeQuestionSchema),
  AptitudeBookmark:  mongoose.model('AptitudeBookmark', aptitudeBookmarkSchema),
  AptitudeNote:      mongoose.model('AptitudeNote', aptitudeNoteSchema),
  Discussion:        mongoose.model('Discussion', discussionSchema),
  SkillpathResult:   mongoose.model('SkillpathResult', skillpathResultSchema),
  Application:       mongoose.model('Application', applicationSchema),
  Announcement:      mongoose.model('Announcement', announcementSchema),
  AptitudeAttempt:   mongoose.model('AptitudeAttempt', aptitudeAttemptSchema),
  DirectMessage:     mongoose.model('DirectMessage', directMessageSchema),
  DepartmentSettings:mongoose.model('DepartmentSettings', departmentSettingsSchema),
};

// ─── Placement Drive (separate from Company for admin-managed drives) ─────────
const placementDriveSchema = new mongoose.Schema({
  companyName:  { type: String, required: true },
  logoUrl:      { type: String },
  role:         { type: String },
  ctc:          { type: String },
  driveDate:    { type: Date, required: true },
  lastApplyDate:{ type: Date },
  eligibility:  { type: String },
  description:  { type: String },
  applyLink:    { type: String },
  status:       { type: String, enum: ['open', 'closed', 'upcoming'], default: 'upcoming' },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  applicants:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // ── Scraped / External opportunity fields ────────────────────────────────
  isScraped:       { type: Boolean, default: false },    // true = from RSS/job board crawler
  opportunityType: { type: String, enum: ['internship', 'job'], default: 'internship' }, // 'internship' vs 'job'
  location:        { type: String, default: 'India' },   // 'India', 'Remote', 'Govt / India'
  isGovt:          { type: Boolean, default: false },    // DRDO, ISRO, IIT, BARC, AICTE
  branches:        [{ type: String }],                   // ['CSE / IT', 'AIML', 'ENTC', 'Mechanical']
  aiDescription:   { type: String },                     // Groq-generated rich description
  sourceName:      { type: String },                     // 'DRDO', 'ISRO', 'IIT', 'Jobicy', etc.
  sourceUrl:       { type: String },                     // original job posting URL
  scrapedDate:     { type: Date },                       // when this was scraped

}, { timestamps: true });

module.exports.PlacementDrive = mongoose.model('PlacementDrive', placementDriveSchema);



// ─── InterviewSession (records past AI mock interviews for students) ──────────
const interviewSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetRole: { type: String, required: true },
  interviewType: { type: String, required: true }, // Technical, HR, Managerial
  durationLabel: { type: String }, // e.g. "10 min"
  overallScore: { type: Number },
  scoresList: [Number],
  conversation: [{
    role: { type: String, enum: ['ai', 'user'] },
    content: { type: String },
    feedback: { type: String },
    score: { type: Number },
    wordsCount: { type: Number },
    fillerWordsCount: { type: Number },
    wpm: { type: Number }
  }],
  proctoringViolations: {
    gazeAwayWarningCount: { type: Number, default: 0 },
    backgroundNoiseWarningCount: { type: Number, default: 0 }
  }
}, { timestamps: true });


// ─── DiscoveredAlumni (auto-crawled from DuckDuckGo weekly) ────────────────────
const discoveredAlumniSchema = new mongoose.Schema({
  name:           { type: String },
  linkedinUrl:    { type: String, unique: true, required: true },
  currentCompany: { type: String },
  role:           { type: String },
  branch:         { type: String },   // e.g. CSE, AIML, ENTC, Mechanical
  snippet:        { type: String },   // raw DDG search snippet
  embedding:      { type: [Number] }, // 384-dim Xenova/all-MiniLM-L6-v2 vector
  discoveredAt:   { type: Date, default: Date.now },
}, { timestamps: true });

module.exports.DiscoveredAlumni = mongoose.models.DiscoveredAlumni ||
  mongoose.model('DiscoveredAlumni', discoveredAlumniSchema);

// ─── ScrapedOpening (verified external internships/jobs from RSS) ────────────
const scrapedOpeningSchema = new mongoose.Schema({
  title:           { type: String, required: true },
  companyName:     { type: String },
  description:     { type: String },
  applyLink:       { type: String, unique: true, required: true },
  allowedBranches: [String],           // e.g. ["CSE", "AIML"]
  source:          { type: String, default: 'RSS' },
  isVerified:      { type: Boolean, default: false }, // Groq fraud-check passed
  embedding:       { type: [Number] }, // 384-dim vector
  scrapedAt:       { type: Date, default: Date.now },
}, { timestamps: true });

module.exports.ScrapedOpening = mongoose.models.ScrapedOpening ||
  mongoose.model('ScrapedOpening', scrapedOpeningSchema);

// ─── InterviewKnowledge (curated Q&A bank with vector embeddings) ──────────
const interviewKnowledgeSchema = new mongoose.Schema({
  question:   { type: String, required: true },
  answer:     { type: String, required: true },
  role:       { type: String },          // e.g. Frontend Developer
  subject:    { type: String },          // e.g. React, OS, DBMS, DSA
  company:    { type: String },          // e.g. Google, TCS (if company-specific)
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
  tags:       [String],
  source:     { type: String, default: 'curated' }, // curated | scraped | alumni
  embedding:  { type: [Number] },        // 384-dim vector
}, { timestamps: true });

module.exports.InterviewKnowledge = mongoose.models.InterviewKnowledge ||
  mongoose.model('InterviewKnowledge', interviewKnowledgeSchema);
