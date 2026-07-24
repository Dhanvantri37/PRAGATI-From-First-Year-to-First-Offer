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
router.put('/:id', authenticate, authorize('admin', 'faculty'), async (req, res) => {
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
    const { name, confirmSave, companyData } = req.body;

    // A. Confirm and Save Mode
    if (confirmSave) {
      if (!companyData || !companyData.name) {
        return res.status(400).json({ error: 'Company data is required for saving' });
      }

      // Check duplicate again
      const existing = await Company.findOne({ name: { $regex: new RegExp(`^${companyData.name.trim()}$`, 'i') } });
      if (existing) {
        return res.json({
          message: 'Company already exists in database',
          company: existing,
          isNew: false
        });
      }

      // Force status, dates, and build clean logo / resource fallbacks
      companyData.status = '-';
      companyData.campusVisitDate = '-';

      // Save
      const savedCompany = await Company.create(companyData);
      console.log(`[AI-Retrieve] Saved company: ${savedCompany.name}`);
      return res.status(201).json({
        message: `Successfully added ${savedCompany.name} to the shared placement directory!`,
        company: savedCompany,
        isNew: true
      });
    }

    // B. Research and Preview Mode
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    const searchName = name.trim();

    // Check duplicate
    const existing = await Company.findOne({ name: { $regex: new RegExp(`^${searchName}$`, 'i') } });
    if (existing) {
      return res.json({
        message: 'Company already exists in database',
        company: existing,
        isNew: false
      });
    }

    // AI prompt requesting REAL specific facts, GFG, and Glassdoor resources
    const aiPrompt = `I want real company information as per the following points give me proper company details with respecr to following points:
Now give me details with links for ${searchName}. Make Sure You will give me the latest Company Data CtC difficulty eligibilityCriteria-->minCGPA,allowedBranches,backlogs rolesrecruitmentRounds aptitudePatterns interviewPatterns jdText tags companyOverview techStack workCulture growthPath interviewDifficulty bondDetails hiringMode testPlatform bond packageBreakdown Give me all this details .

Return the data STRICTLY formatted as a valid JSON object matching the following structure. Do NOT wrap the JSON in conversational text or headers. Just return raw JSON. 
CRITICAL RULES:
1. Do NOT copy the example placeholders or generic texts. You MUST research actual, real-world facts for ${searchName} (specifically their actual recruitment rounds, tech stack, average CTC packages, work culture description, and career path).
2. For "recruitmentRounds", provide the COMPLETE sequence of all actual rounds (do NOT limit to 3 rounds—include every step, e.g. for Google include Online Coding Assessment, Technical Phone Screen, Coding Round 1, Coding Round 2, Coding Round 3, System Design/Googlyness, HR Round).
3. For the "resources" array, provide actual GeeksforGeeks tag/preparation links and Glassdoor interview questions/review links. Do NOT hallucinate specific Glassdoor E-numbers or IDs (like E12345). Instead, use the format:
   - "https://www.geeksforgeeks.org/tag/company-name/"
   - "https://www.google.com/search?q=Glassdoor+company-name+Interview+Questions"
4. Set status to "-" and campusVisitDate to "-".

JSON structure:
{
  "name": "${searchName}",
  "sector": "Real sector of the company (e.g. IT Services, Fintech, Cloud SaaS)",
  "website": "Official website URL (must start with https://)",
  "status": "-",
  "campusVisitDate": "-",
  "ctc": "Real package range (e.g. 6.00-12.00 LPA)",
  "difficulty": "Easy|Medium|Hard|Easy-Medium|Medium-Hard",
  "eligibilityCriteria": {
    "minCGPA": 6.0,
    "allowedBranches": ["CSE", "IT", "ECE"],
    "backlogs": false
  },
  "roles": ["Real Role 1", "Real Role 2"],
  "recruitmentRounds": ["Real Round 1", "Real Round 2", "Real Round 3", "Real Round 4", "Real Round 5"],
  "aptitudePatterns": "Real details about their written/online test formats...",
  "interviewPatterns": "Real details about their technical and HR interview rounds...",
  "jdText": "Job description summary of the roles...",
  "prepTips": "Actual preparation tips for this company's test and interview...",
  "tags": ["tag1", "tag2"],
  "companyOverview": "Brief summary of company scale and business model...",
  "techStack": ["Java", "React", "AWS"],
  "workCulture": "Real description of the working environment...",
  "growthPath": "Typical career progression...",
  "interviewDifficulty": "Real interview difficulty evaluation...",
  "bondDetails": "Service bond agreement details...",
  "hiringMode": "On-Campus/Off-Campus...",
  "testPlatform": "Online test engine...",
  "bond": "Bond duration (e.g. 1 year or None)",
  "packageBreakdown": "Package splits...",
  "resources": [
    "https://www.geeksforgeeks.org/tag/company-name/",
    "https://www.google.com/search?q=Glassdoor+company-name+Interview+Questions"
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

    // Format resources cleanly (guarantee no 404 templates or hallucinated Glassdoor IDs)
    if (!Array.isArray(parsed.resources)) {
      parsed.resources = [];
    }
    parsed.resources = parsed.resources.filter(r => {
      if (!r || typeof r !== 'string') return false;
      if (r.includes('example.com') || r.includes('unstop.com') || r.includes('prepinsta.com')) return false;
      // Filter out hallucinated Glassdoor ID links (e.g. containing E[numbers])
      if (r.includes('glassdoor') && /Interview\/.*-E\d+/i.test(r)) return false;
      return true;
    });

    const searchKeyword = parsed.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    // Construct clean, live, 100% active search redirect links on Google for GFG and Glassdoor
    const gfgSearchLink = `https://www.google.com/search?q=GeeksforGeeks+${encodeURIComponent(parsed.name)}+Interview+Questions`;
    const glassdoorSearchLink = `https://www.google.com/search?q=Glassdoor+${encodeURIComponent(parsed.name)}+Interview+Questions`;

    // Always unshift these 100% working search query links to the top of the resources array!
    parsed.resources.unshift(gfgSearchLink);
    parsed.resources.unshift(glassdoorSearchLink);

    // 3. Construct direct logo URL using Google Favicon API (guaranteed 100% no 404s)
    let domain = '';
    const web = parsed.website || '';
    try {
      domain = web.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    } catch (e) {}
    
    if (domain) {
      parsed.logoUrl = `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
    } else {
      parsed.logoUrl = `https://www.google.com/s2/favicons?sz=128&domain=${parsed.name.toLowerCase().replace(/\s+/g, '')}.com`;
    }

    // Return preview to user without saving to database
    res.json({
      message: `Research complete for ${parsed.name}!`,
      company: parsed,
      isPreview: true
    });

  } catch (err) {
    console.error('[AI-Retrieve error]', err.stack);
    res.status(500).json({ error: err.message });
  }
});

// DELETE COMPANY
router.delete('/:id', authenticate, authorize('admin', 'faculty'), async (req, res) => {
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