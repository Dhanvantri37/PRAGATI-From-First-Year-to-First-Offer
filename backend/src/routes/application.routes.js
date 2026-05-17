// application.routes.js
const express = require('express');
const router = express.Router();
const { Application } = require('../models/index');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/', authenticate, async (req, res) => {
  try {
    const apps = await Application.find({ userId: req.user._id })
      .populate('companyId', 'name sector logo')
      .sort({ appliedDate: -1 });
    res.json({ applications: apps });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const app = await Application.create({ ...req.body, userId: req.user._id });
    res.status(201).json({ application: app });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const app = await Application.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json({ application: app });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
