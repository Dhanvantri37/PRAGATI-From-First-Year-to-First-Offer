const router = require('express').Router();
const { PlacementDrive, Announcement } = require('../models/index');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// GET all drives (students can see open/upcoming)
router.get('/', authenticate, async (req, res) => {
  try {
    const drives = await PlacementDrive.find()
      .populate('createdBy', 'name')
      .sort({ driveDate: 1 });
    const result = drives.map(d => ({
      ...d.toObject(),
      applied: d.applicants.some(uid => uid.toString() === req.user._id.toString()),
    }));
    res.json({ drives: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create drive (admin/faculty only)
router.post('/', authenticate, authorize('admin', 'faculty'), async (req, res) => {
  try {
    const drive = await PlacementDrive.create({ ...req.body, createdBy: req.user._id });
    // Auto-create announcement
    await Announcement.create({
      title: `📢 New Placement Drive: ${drive.companyName}`,
      message: `${drive.companyName} is visiting on ${new Date(drive.driveDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}. Role: ${drive.role || 'N/A'}. Apply before ${drive.lastApplyDate ? new Date(drive.lastApplyDate).toLocaleDateString('en-IN') : 'drive date'}.`,
      link: `/dashboard/drives`,
      createdBy: req.user._id,
      targetFilter: { role: 'all' },
      priority: 'high',
    });

    // Asynchronously send bell + push notifications to all users
    const User = require('../models/User.model');
    const { emitToUser } = require('./notifications.routes');
    const notifPayload = {
      _id: drive._id,
      type: 'drive',
      title: `🗓️ New Placement Drive: ${drive.companyName}`,
      message: `${drive.companyName} is visiting for ${drive.role || 'N/A'}. CTC: ${drive.ctc || 'N/A'}.`,
      link: `/dashboard/drives`,
      priority: 'high',
      createdAt: drive.createdAt,
    };
    User.find().select('_id pushSubscription').then(allUsers => {
      allUsers.forEach(u => {
        const hasPush = !!u.pushSubscription?.endpoint;
        emitToUser(req.app, u._id, notifPayload, { push: hasPush }).catch(() => {});
      });
    }).catch(err => console.error('[Drive notify error]', err.message));

    res.status(201).json({ drive });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST apply to drive
router.post('/:id/apply', authenticate, async (req, res) => {
  try {
    const drive = await PlacementDrive.findById(req.params.id);
    if (!drive) return res.status(404).json({ error: 'Drive not found' });
    if (drive.applicants.some(uid => uid.toString() === req.user._id.toString()))
      return res.status(400).json({ error: 'Already applied' });
    drive.applicants.push(req.user._id);
    await drive.save();
    res.json({ message: 'Applied successfully', applicantsCount: drive.applicants.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE drive (admin/faculty)
router.delete('/:id', authenticate, authorize('admin', 'faculty'), async (req, res) => {
  try {
    await PlacementDrive.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
