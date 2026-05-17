const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String },
  department: {
    type: String,
    enum: ['CSE', 'CSAIML', 'IT', 'ECE', 'Mechanical', 'Civil', 'All'],
    required: true
  },
  subject: { type: String, required: true },
  year: { type: Number, enum: [1, 2, 3, 4], required: true },
  topic: { type: String },
  fileUrl: { type: String, required: true },      // Cloudinary URL
  fileType: { type: String },                      // pdf, docx, ppt, etc.
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploaderRole: { type: String, enum: ['student', 'faculty'] },
  visibility: { type: String, enum: ['public', 'private'], default: 'public' },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  rejectionReason: { type: String },
  downloadCount: { type: Number, default: 0 },
  tags: [String]
}, { timestamps: true });

module.exports = mongoose.model('Note', noteSchema);
