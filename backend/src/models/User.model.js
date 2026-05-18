const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  rollNumber: {
    type: String,
    sparse: true   // only students have roll numbers
  },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role: {
    type: String,
    enum: ['student', 'faculty', 'admin'],
    default: 'student'
  },
  department: {
    type: String,
    enum: ['CSE', 'CSAIML', 'IT', 'ECE', 'Mechanical', 'Civil', 'Other'],
    required: true
  },
  year: {
    type: Number,
    enum: [1, 2, 3, 4],
    // only for students
  },
  resumeUrl: { type: String },       // Cloudinary URL
  resumeParsedSkills: [String],      // extracted from resume
  profilePhoto: { type: String },
  atsScore: { type: Number, default: 0 },
  // Optional social / portfolio links (shown on leaderboard)
  linkedinUrl:  { type: String, default: '' },
  githubUrl:    { type: String, default: '' },
  portfolioUrl: { type: String, default: '' },
  bio:          { type: String, default: '' },
  phone:        { type: String, default: '' },
  prn:          { type: String, default: '' },
  division:     { type: String, enum: ['A','B','C',''], default: '' },
  // Streak data for daily problems
  streak: { type: Number, default: 0 },
  lastSolvedDate: { type: Date },
  totalProblemsSolved: { type: Number, default: 0 },
  // Skill level assessed by system
  skillLevel: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Expert'],
    default: 'Beginner'
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, saltRounds);
  next();
});

// Compare password helper
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Never send password in responses
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
