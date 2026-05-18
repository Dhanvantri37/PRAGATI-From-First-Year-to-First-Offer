const router = require('express').Router();
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const axios = require('axios');
const Note = require('../models/Note.model');
const User = require('../models/User.model');
const { authenticate, authorize } = require('../middleware/auth.middleware');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'pragati/notes', resource_type: 'raw',
    use_filename: true, unique_filename: true,
  }),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

function getExt(url) {
  if (!url) return '.pdf';
  const u = url.split('?')[0].split('/').pop();
  const ext = u.lastIndexOf('.') > 0 ? u.slice(u.lastIndexOf('.')) : '';
  return ext || '.pdf';
}
const isDriveUrl = url => url && (url.includes('drive.google.com') || url.includes('docs.google.com'));

// GET /api/notes — with faculty name filter, subject, topic
router.get('/', authenticate, async (req, res) => {
  try {
    const { department, year, subject, topic, facultyName, page = 1, limit = 40 } = req.query;
    const filter = { status: 'approved', $or: [{ visibility: 'public' }, { visibility: { $exists: false } }, { uploadedBy: req.user._id }] };
    if (department) filter.department = department;
    if (year) filter.year = Number(year);
    if (subject) filter.subject = { $regex: subject, $options: 'i' };
    if (topic) filter.topic = { $regex: topic, $options: 'i' };

    let notes = await Note.find(filter)
      .populate('uploadedBy', 'name role department')
      .sort({ subject: 1, createdAt: -1 })
      .limit(Number(limit) * 5)  // over-fetch so we can filter by facultyName in JS
      .skip((Number(page) - 1) * Number(limit));

    // Filter by faculty name in JS (populate makes this easier than a DB join)
    if (facultyName && facultyName.trim()) {
      const fl = facultyName.toLowerCase();
      notes = notes.filter(n =>
        (n.uploadedBy?.name || '').toLowerCase().includes(fl) ||
        (n.adminUploadedFor || '').toLowerCase().includes(fl)
      );
    }

    // Get unique filter values for the frontend dropdowns
    const allNotes = await Note.find({ status: 'approved' })
      .populate('uploadedBy', 'name role')
      .select('subject topic uploadedBy adminUploadedFor');

    const subjects   = [...new Set(allNotes.map(n => n.subject).filter(Boolean))].sort();
    const topics     = [...new Set(allNotes.map(n => n.topic).filter(Boolean))].sort();
    const faculties  = [...new Set(allNotes.map(n => n.adminUploadedFor || n.uploadedBy?.name).filter(Boolean))].sort();

    const total = notes.length;
    const paginated = notes.slice(0, Number(limit));

    res.json({ notes: paginated, total, pages: Math.ceil(total / limit), subjects, topics, faculties });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/notes/pending
router.get('/pending', authenticate, authorize('admin', 'faculty'), async (req, res) => {
  try {
    const notes = await Note.find({ status: 'pending' })
      .populate('uploadedBy', 'name role department')
      .sort({ createdAt: -1 });
    res.json({ notes });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/notes/download/:id — proxy download
router.get('/download/:id', authenticate, async (req, res) => {
  try {
    const note = await Note.findByIdAndUpdate(req.params.id, { $inc: { downloadCount: 1 } }, { new: true });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (note.status !== 'approved' && req.user.role === 'student') return res.status(403).json({ error: 'Not yet approved' });
    if (isDriveUrl(note.fileUrl)) return res.redirect(note.fileUrl);
    if (!note.fileUrl) return res.status(404).json({ error: 'No file attached' });
    const ext = getExt(note.fileUrl);
    const safeName = (note.title || 'note').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_') + ext;
    const ctMap = { '.pdf': 'application/pdf', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', '.doc': 'application/msword', '.ppt': 'application/vnd.ms-powerpoint' };
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('Content-Type', ctMap[ext] || 'application/octet-stream');
    const response = await axios({ method: 'GET', url: note.fileUrl, responseType: 'stream', timeout: 30000 });
    if (response.headers['content-length']) res.setHeader('Content-Length', response.headers['content-length']);
    response.data.pipe(res);
  } catch (err) { res.status(500).json({ error: 'Download failed: ' + err.message }); }
});

// POST /api/notes/upload
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    const { title, description, department, subject, year, topic, tags, driveUrl } = req.body;
    if (!req.file && !driveUrl) return res.status(400).json({ error: 'File or Drive link required' });
    if (!title) return res.status(400).json({ error: 'Title required' });
    const note = await Note.create({
      title, description, department: department || req.user.department,
      subject: subject || 'General', year: Number(year) || 1, topic,
      fileUrl: driveUrl || req.file?.path,
      fileType: driveUrl ? 'drive' : (req.file?.mimetype || 'application/pdf'),
      isDriveLink: !!driveUrl,
      uploadedBy: req.user._id, uploaderRole: req.user.role,
      // Faculty always uploads as public; students can choose private (auto-approved) or public (needs review)
      visibility: req.user.role === 'faculty' ? 'public' : (req.body.visibility === 'private' ? 'private' : 'public'),
      // Private student notes are instantly approved (only visible to uploader); public student notes await faculty/admin review
      status: (req.user.role === 'student' && req.body.visibility === 'private') ? 'approved' : (req.user.role === 'student' ? 'pending' : 'approved'),
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    });
    const msg = req.user.role === 'student' ? 'Note submitted — awaiting admin approval' : 'Note published successfully ✅';
    res.status(201).json({ message: msg, note });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// POST /api/notes/upload-admin
router.post('/upload-admin', authenticate, authorize('admin'), upload.single('file'), async (req, res) => {
  try {
    const { title, description, department, subject, year, topic, tags, driveUrl, uploaderName } = req.body;
    if (!req.file && !driveUrl) return res.status(400).json({ error: 'File or Drive link required' });
    const note = await Note.create({
      title, description: description || `Uploaded by admin on behalf of ${uploaderName || 'faculty'}`,
      department, subject: subject || 'General', year: Number(year) || 1, topic,
      fileUrl: driveUrl || req.file?.path,
      fileType: driveUrl ? 'drive' : req.file?.mimetype,
      isDriveLink: !!driveUrl,
      uploadedBy: req.user._id, uploaderRole: 'faculty',
      adminUploadedFor: uploaderName, status: 'approved',
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    });
    res.status(201).json({ message: 'Note published ✅', note });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.patch('/:id/approve', authenticate, authorize('admin', 'faculty'), async (req, res) => {
  try {
    const note = await Note.findByIdAndUpdate(req.params.id, { status: 'approved', approvedBy: req.user._id, approvedAt: new Date() }, { new: true });
    res.json({ message: 'Note approved', note });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.patch('/:id/reject', authenticate, authorize('admin', 'faculty'), async (req, res) => {
  try {
    const note = await Note.findByIdAndUpdate(req.params.id, { status: 'rejected', rejectionReason: req.body.reason }, { new: true });
    res.json({ message: 'Note rejected', note });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', authenticate, authorize('admin', 'faculty'), async (req, res) => {
  try {
    await Note.findByIdAndDelete(req.params.id);
    res.json({ message: 'Note deleted' });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;
