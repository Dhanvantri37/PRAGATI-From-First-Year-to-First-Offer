const router = require('express').Router();
const { Company } = require('../models/index');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// GET /api/companies — PUBLIC (no auth required)
router.get('/', async (req, res) => {
  try {
    const { status, sector } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (sector) filter.sector = sector;

    const companies = await Company.find(filter).sort({ campusVisitDate: -1 });

    // If token exists, user may be available (optional auth scenario)
    const userId = req.user?._id?.toString();

    const result = companies.map(c => ({
      ...c.toObject(),
      pinned: userId
        ? (c.pinnedBy || []).some(id => id.toString() === userId)
        : false,
    }));

    res.json({ companies: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET pinned companies
router.get('/pinned', authenticate, async (req, res) => {
  try {
    const companies = await Company.find({ pinnedBy: req.user._id }).sort({ name: 1 });

    const result = companies.map(c => ({
      ...c.toObject(),
      pinned: true
    }));

    res.json({ companies: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TOGGLE PIN
router.post('/:id/pin', authenticate, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const userId = req.user._id;

    const isPinned = company.pinnedBy.some(
      id => id.toString() === userId.toString()
    );

    if (isPinned) {
      company.pinnedBy = company.pinnedBy.filter(
        id => id.toString() !== userId.toString()
      );
    } else {
      company.pinnedBy.push(userId);
    }

    await company.save();

    res.json({
      pinned: !isPinned,
      message: isPinned ? 'Unpinned' : 'Pinned!'
    });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// COMPARE COMPANIES
router.post('/compare', authenticate, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length < 2 || ids.length > 3) {
      return res.status(400).json({
        error: 'Provide 2–3 company IDs'
      });
    }

    const companies = await Company.find({ _id: { $in: ids } });

    const userId = req.user._id.toString();

    const result = companies.map(c => ({
      ...c.toObject(),
      pinned: (c.pinnedBy || []).some(
        id => id.toString() === userId
      ),
    }));

    res.json({ companies: result });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET SINGLE COMPANY
router.get('/:id', authenticate, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const userId = req.user._id.toString();

    res.json({
      company: {
        ...company.toObject(),
        pinned: (company.pinnedBy || []).some(
          id => id.toString() === userId
        )
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE COMPANY (ADMIN)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const data = { ...req.body };

    if (data.website && !data.website.startsWith('http')) {
      data.website = 'https://' + data.website;
    }

    const company = await Company.create(data);

    res.status(201).json({
      message: 'Company added',
      company
    });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// UPDATE COMPANY
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json({
      message: 'Company updated',
      company
    });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE COMPANY
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await Company.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Company deleted'
    });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
// PATCH /api/companies/:id/drive — faculty/admin sets campus drive date
router.patch('/:id/drive', authenticate, authorize('faculty', 'admin'), async (req, res) => {
  try {
    const { campusVisitDate, driveDetails } = req.body;
    const update = {};
    if (campusVisitDate) update.campusVisitDate = new Date(campusVisitDate);
    if (driveDetails)   update.driveDetails   = driveDetails;
    const company = await Company.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json({ message: 'Drive date updated', company });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});