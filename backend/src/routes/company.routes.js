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

// AI PROVIDER HELPERS
async function callAI(prompt, maxTokens = 2000) {
  const GROQ_KEY   = process.env.GROQ_API_KEY;
  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  if (GROQ_KEY) {
    try {
      const resp = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        { model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens, temperature: 0.7 },
        { headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' }, timeout: 25000 }
      );
      return resp.data?.choices?.[0]?.message?.content?.trim() || null;
    } catch (err) {
      console.warn(`[AI] Groq failed: ${err.message}`);
    }
  }

  if (GEMINI_KEY) {
    try {
      const resp = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens } },
        { headers: { 'Content-Type': 'application/json' }, timeout: 25000 }
      );
      return resp.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    } catch (err) {
      console.warn(`[AI] Gemini failed: ${err.message}`);
    }
  }
  return null;
}

function ensureValidJson(str) {
  if (!str) return null;
  let clean = str.replace(/```json/g, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error('[JSON Parse Error]', e.message);
    return null;
  }
}

const axios = require('axios');

// POST /api/companies/ai-retrieve — Search internet via AI and add new company to DB
router.post('/ai-retrieve', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    const searchName = name.trim();

    // 1. Check if the company already exists in the DB (case-insensitive)
    const existing = await Company.findOne({ name: { $regex: new RegExp(`^${searchName}$`, 'i') } });
    if (existing) {
      return res.json({
        message: 'Company already exists in database',
        company: existing,
        isNew: false
      });
    }

    // 2. Build the AI search/research prompt as requested by the user
    const aiPrompt = `I want real company information as per the following points give me proper company details with respecr to following points:
Now give me details with links for ${searchName}. Make Sure You will give me the latest Company Data CtC difficulty eligibilityCriteria-->minCGPA,allowedBranches,backlogs rolesrecruitmentRounds aptitudePatterns interviewPatterns jdText tags companyOverview techStack workCulture growthPath interviewDifficulty bondDetails hiringMode testPlatform bond packageBreakdown Give me all this details .

Return the data STRICTLY formatted as a valid JSON object matching the following structure. Do NOT wrap the JSON in conversational text or headers. Just return raw JSON:
{
  "name": "${searchName}",
  "sector": "Sector of the company (e.g. IT Services, Fintech, Core Engineering)",
  "website": "Official website URL (must start with https://)",
  "status": "-",
  "campusVisitDate": "-",
  "ctc": "Average package range (e.g., 6.00-12.00 LPA)",
  "difficulty": "Easy|Medium|Hard|Easy-Medium|Medium-Hard",
  "eligibilityCriteria": {
    "minCGPA": 6.0,
    "allowedBranches": ["CSE", "IT", "ECE"],
    "backlogs": false
  },
  "roles": ["Role 1", "Role 2"],
  "recruitmentRounds": ["Round 1", "Round 2"],
  "aptitudePatterns": "Details about their test patterns...",
  "interviewPatterns": "Details about their technical and HR interview patterns...",
  "jdText": "Short job description summary...",
  "prepTips": "Practical interview and test preparation tips...",
  "tags": ["key-tag-1", "key-tag-2"],
  "companyOverview": "Brief overview of the company history and size...",
  "techStack": ["Java", "SQL", "React"],
  "workCulture": "Short description of company work environment...",
  "growthPath": "Career progression steps...",
  "interviewDifficulty": "Interview difficulty details...",
  "bondDetails": "Service bond agreement details...",
  "hiringMode": "Hiring channel details...",
  "testPlatform": "Online test platform name...",
  "bond": "Bond duration (e.g., 1 year or None)",
  "packageBreakdown": "Salary package breakdown...",
  "resources": [
    "https://unstop.com",
    "https://prepinsta.com"
  ]
}`;

    const rawResult = await callAI(aiPrompt, 2000);
    const parsed = ensureValidJson(rawResult);

    if (!parsed || !parsed.name) {
      return res.status(502).json({ error: 'AI failed to retrieve structured company profile. Please try again.' });
    }

    // Force status and visit date to '-' for user searched companies
    parsed.status = '-';
    parsed.campusVisitDate = '-';

    // 3. Construct direct logo URL using Clearbit Logo API
    let domain = '';
    const web = parsed.website || '';
    try {
      domain = web.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    } catch (e) {}
    
    if (domain) {
      parsed.logoUrl = `https://logo.clearbit.com/${domain}`;
    } else {
      parsed.logoUrl = `https://logo.clearbit.com/${parsed.name.toLowerCase().replace(/\s+/g, '')}.com`;
    }

    // 4. Save the company into the database
    const newCompany = await Company.create(parsed);
    console.log(`[AI-Retrieve] Seeded new company: ${newCompany.name} (Logo: ${newCompany.logoUrl})`);

    res.status(201).json({
      message: `Successfully researched and added ${newCompany.name} to the database!`,
      company: newCompany,
      isNew: true
    });

  } catch (err) {
    console.error('[AI-Retrieve error]', err.stack);
    res.status(500).json({ error: err.message });
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