const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { DepartmentSettings } = require('../models');

// GET /api/settings/department/:department
// Any authenticated user might need to read this (e.g., student in Coding Practice)
router.get('/department/:department', authenticate, async (req, res) => {
  try {
    const { department } = req.params;
    let settings = await DepartmentSettings.findOne({ department });
    if (!settings) {
      settings = await DepartmentSettings.create({ department });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/department/:department
// Only admins can update their own department's settings (superadmins/pragati-admins can update any)
router.post('/department/:department', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { department } = req.params;
    
    // Check if Department Admin is trying to update another department's settings
    if (req.user.role === 'admin' && req.user.department !== 'All' && req.user.department !== department) {
      return res.status(403).json({ error: 'You can only update settings for your own department.' });
    }

    const { disablePasteInEditor } = req.body;
    
    let settings = await DepartmentSettings.findOne({ department });
    if (!settings) {
      settings = new DepartmentSettings({ department });
    }
    
    if (disablePasteInEditor !== undefined) {
      settings.disablePasteInEditor = disablePasteInEditor;
    }
    
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
