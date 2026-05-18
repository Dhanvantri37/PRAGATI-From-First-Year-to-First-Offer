const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name:      String,
  joinedAt:  { type: Date, default: Date.now },
  isAI:      { type: Boolean, default: false },
  socketId:  String,
  peerId:    String,   // WebRTC peer id
  // live status
  isMuted:       { type: Boolean, default: false },
  isCameraOff:   { type: Boolean, default: false },
  isActiveSpeaker: { type: Boolean, default: false },
  // evaluation metrics
  speakingTime:    { type: Number, default: 0 },
  wordCount:       { type: Number, default: 0 },
  interruptions:   { type: Number, default: 0 },
  fillerWords:     { type: Number, default: 0 },
  uniquePoints:    { type: Number, default: 0 },
  offTopicCount:   { type: Number, default: 0 },
  topicRelevanceScore: { type: Number, default: 0 },
  transcript:      [{ time: Number, text: String, isOffTopic: Boolean }],
  aiScore: {
    communication: { type: Number, default: 0 },
    confidence:    { type: Number, default: 0 },
    leadership:    { type: Number, default: 0 },
    participation: { type: Number, default: 0 },
    fluency:       { type: Number, default: 0 },
    relevance:     { type: Number, default: 0 },
    teamwork:      { type: Number, default: 0 },
    overall:       { type: Number, default: 0 },
    strengths:     [String],
    improvements:  [String],
    summary:       String,
    detailedFeedback: String,
    placementReadiness: String,
  },
});

const gdRoomSchema = new mongoose.Schema({
  roomCode:       { type: String, unique: true, required: true },
  topic:          String,
  topicCategory:  String,
  companyContext: String,
  difficulty:     { type: String, enum: ['Easy','Medium','Hard'], default: 'Medium' },
  language:       { type: String, default: 'English' },
  minParticipants:  { type: Number, default: 3 },
  maxParticipants:  { type: Number, default: 5 },
  durationSeconds:  { type: Number, default: 600 },
  prepSeconds:      { type: Number, default: 45 },
  isPrivate:        { type: Boolean, default: false },
  // state machine
  state: {
    type: String,
    enum: ['waiting','locked','prep','active','completed'],
    default: 'waiting',
  },
  // session persistence — participants can rejoin after refresh
  sessionParticipants: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    joinedAt: Date,
  }],
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  participants: [participantSchema],
  lockedAt:   Date,
  startedAt:  Date,
  endedAt:    Date,
  aiTranscript: [{ speaker: String, text: String, time: Number, isAI: Boolean }],
  // AI moderator state
  aiModerator: {
    hasOpened:   { type: Boolean, default: false },
    hasConcluded:{ type: Boolean, default: false },
    interventions: { type: Number, default: 0 },
  },
  // wait timer for min participants
  waitTimerStarted: Date,
}, { timestamps: true });

gdRoomSchema.index({ state: 1, createdAt: -1 });

module.exports = mongoose.model('GDRoom', gdRoomSchema);
