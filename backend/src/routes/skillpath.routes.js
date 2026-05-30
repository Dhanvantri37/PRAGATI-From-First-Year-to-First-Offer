const router = require('express').Router();
const axios  = require('axios');
const FormData = require('form-data');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { SkillpathResult } = require('../models/index');
const User = require('../models/User.model');
const { authenticate } = require('../middleware/auth.middleware');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── AI Provider: Groq (primary, free) → Gemini (fallback) ─────────────────────
// Groq models: llama-3.1-8b-instant (fast, free), mixtral-8x7b-32768 (better)
// Gemini: gemini-2.0-flash (free 15 req/min, 1M tokens/day)
async function callAI(prompt, maxTokens = 1500) {
  const GROQ_KEY   = process.env.GROQ_API_KEY;
  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  // 1. Try Groq first (faster, generous free tier: 14,400 req/day)
  if (GROQ_KEY) {
    try {
      const resp = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        { model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens, temperature: 0.7 },
        { headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' }, timeout: 25000 }
      );
      return resp.data?.choices?.[0]?.message?.content?.trim() || null;
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.error?.message || err.message;
      console.warn(`[AI] Groq failed (${status}): ${msg}`);
      if (status === 429) console.warn('[AI] Groq rate limit hit — falling back to Gemini');
    }
  }

  // 2. Fallback to Gemini
  if (GEMINI_KEY) {
    try {
      const resp = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens } },
        { headers: { 'Content-Type': 'application/json' }, timeout: 25000 }
      );
      return resp.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.error?.message || err.message;
      console.warn(`[AI] Gemini failed (${status}): ${msg}`);
      if (status === 429 || msg?.toLowerCase().includes('quota')) {
        console.warn('[AI] Gemini quota exceeded — returning mock data');
      }
    }
  }

  if (!GROQ_KEY && !GEMINI_KEY) {
    console.info('[AI] No API keys configured — using mock data');
  }

  return null; // both failed or no keys
}

function parseJSON(text) {
  if (!text) return null;
  try {
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(clean);
  } catch { return null; }
}

// ── POST /api/skillpath/analyze ───────────────────────────────────────────────
router.post('/analyze', authenticate, upload.fields([{ name:'resume', maxCount:1 }, { name:'jdFile', maxCount:1 }]), async (req, res) => {
  try {
    const jdText = req.body?.jdText || req.body?.jd_text || '';
    const jobTitle = req.body?.jobTitle || '';
    const companyId = req.body?.companyId || null;
    const jdFileBuffer = req.files?.jdFile?.[0]?.buffer;
    const resumeFileBuffer = req.files?.resume?.[0]?.buffer;
    const hasJD = (jdText && jdText.trim().length >= 10) || jdFileBuffer;
    if (!hasJD) return res.status(400).json({ error: 'Job description required — paste text or upload PDF' });

    let resumeUrl = req.user.resumeUrl;
    if (resumeFileBuffer) {
      const up = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ folder:'pragati/resumes', resource_type:'raw' },
          (err, result) => err ? reject(err) : resolve(result));
        stream.end(resumeFileBuffer);
      });
      resumeUrl = up.secure_url;
      await User.findByIdAndUpdate(req.user._id, { resumeUrl });
    }
    if (!resumeUrl) return res.status(400).json({ error: 'No resume found. Upload your resume (PDF).' });

    let mlData;
    let mlResp;
    let attempts = 0;
    while (attempts < 3) {
      try {
        attempts++;
        if (jdFileBuffer && !jdText.trim()) {
          const form = new FormData();
          const resumeResp = await axios.get(resumeUrl, { responseType:'arraybuffer', timeout:30000 });
          form.append('resume', Buffer.from(resumeResp.data), { filename:'resume.pdf', contentType:'application/pdf' });
          form.append('job_description', jdFileBuffer, { filename:'jd.pdf', contentType:'application/pdf' });
          mlResp = await axios.post(`${process.env.ML_SERVICE_URL}/analyze-file`, form, { headers:form.getHeaders(), timeout:90000 });
        } else {
          const form = new FormData();
          form.append('resume_url', resumeUrl);
          form.append('jd_text', jdText);
          form.append('user_id', req.user._id.toString());
          mlResp = await axios.post(`${process.env.ML_SERVICE_URL}/analyze`, form, { headers:form.getHeaders(), timeout:90000 });
        }
        mlData = mlResp.data;
        break; // Success, exit retry loop
      } catch (err) {
        if (err.response?.status === 429 && attempts < 3) {
          console.warn(`[SkillPath] ML Service 429 on attempt ${attempts}, retrying...`);
          await new Promise(r => setTimeout(r, 2000 * attempts)); // Backoff: 2s, 4s
        } else {
          throw err; // Not a 429 or max attempts reached
        }
      }
    }

    const skill_gap = mlData.skill_gap || {};
    const dbResult = await SkillpathResult.create({
      userId: req.user._id, resumeUrl,
      jobTitle: mlData.target_role || jobTitle || 'Job Analysis', companyId: companyId || null,
      jdText: jdText || '[PDF job description]',
      atsScore: mlData.ats_score || 0, atsBreakdown: mlData.ats_breakdown || {},
      eligibilityPercent: mlData.eligibility_percent || mlData.overall_readiness_score || 0,
      eligibilityReason: mlData.eligibility_reason || '',
      skillGapAnalysis: {
        matchedSkills: skill_gap.matched_skills || skill_gap.matchedSkills || mlData.strengths || [],
        missingSkills: skill_gap.missing_skills || skill_gap.missingSkills || (mlData.skill_gaps||[]).map(g=>g.skill),
        weakAreas: skill_gap.weak_areas || skill_gap.weakAreas || [],
      },
      proficiencyLevel: mlData.proficiency_level || 'Beginner',
      recommendations: mlData.recommendations || [], parsedSkills: mlData.parsed_skills || [],
    });

    await User.findByIdAndUpdate(req.user._id, {
      atsScore: mlData.ats_score || 0,
      resumeParsedSkills: mlData.parsed_skills || [],
      skillLevel: mlData.proficiency_level || 'Beginner',
    });
    res.json({ message:'Analysis complete', result:dbResult, fullAnalysis:mlData });
  } catch (err) {
    if (err.code==='ECONNREFUSED'||err.code==='ECONNABORTED') return res.status(503).json({ error:'AI service unavailable. Try again shortly.' });
    if (err.response?.status === 429) {
      console.warn('[SkillPath] ML Service Rate Limit Hit (429).');
      return res.status(429).json({ error: 'The AI analysis service is currently busy. Please wait a moment and try again.' });
    }
    console.error('SkillPath error:', err.message);
    res.status(500).json({ error: err.response?.data?.detail || err.message });
  }
});

// ── GET /api/skillpath/ai-status ──────────────────────────────────────────────
router.get('/ai-status', authenticate, async (req, res) => {
  const groqKey   = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const result = { groq: { configured: !!groqKey, working: false }, gemini: { configured: !!geminiKey, working: false } };
  if (groqKey) {
    try {
      const r = await axios.post('https://api.groq.com/openai/v1/chat/completions',
        { model:'llama-3.1-8b-instant', messages:[{role:'user',content:'Say OK'}], max_tokens:5 },
        { headers:{ Authorization:`Bearer ${groqKey}`, 'Content-Type':'application/json' }, timeout:10000 });
      result.groq.working = !!r.data?.choices?.[0]?.message?.content;
    } catch(e) { result.groq.error = e.response?.data?.error?.message||e.message; }
  }
  if (geminiKey) {
    try {
      const r = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        { contents:[{parts:[{text:'Say OK'}]}], generationConfig:{maxOutputTokens:5} },
        { headers:{'Content-Type':'application/json'}, timeout:10000 });
      result.gemini.working = !!r.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch(e) { result.gemini.error = e.response?.data?.error?.message||e.message; }
  }
  result.activeProvider = result.groq.working ? 'Groq (llama-3.1-8b-instant)' : result.gemini.working ? 'Gemini 2.0 Flash' : 'None (using mock data)';
  res.json(result);
});

// ── POST /api/skillpath/interview-prep ────────────────────────────────────────
router.post('/interview-prep', authenticate, async (req, res) => {
  try {
    const { targetRole, skillGaps, strengths, readinessScore, candidateName } = req.body;
    const criticalGaps  = (skillGaps||[]).filter(g=>g.importance==='critical').map(g=>g.skill).slice(0,5);
    const importantGaps = (skillGaps||[]).filter(g=>g.importance==='important').map(g=>g.skill).slice(0,4);
    const topStrengths  = (strengths||[]).slice(0,6);
    const gapList = [...criticalGaps, ...importantGaps].slice(0,6);

    const prompt = `You are an expert technical interview coach for campus placements at engineering colleges in India.

Candidate: ${candidateName||'Engineering Student'}
Target Role: ${targetRole||'Software Engineer'}
Readiness Score: ${readinessScore||50}/100
Critical Skill Gaps: ${criticalGaps.join(', ')||'None'}
Important Skill Gaps: ${importantGaps.join(', ')||'None'}
Key Strengths: ${topStrengths.join(', ')||'Core CS fundamentals'}

Generate a comprehensive interview preparation guide. Return ONLY valid JSON (no markdown, no backticks):
{
  "coaching_summary": "2-3 sentence personalised coaching for this candidate",
  "technical_questions": [{"question":"...","skill":"...","difficulty":"easy|medium|hard","tip":"one sentence answer tip"}],
  "behavioral_questions": [{"question":"...","framework":"STAR|CAR|PAR","angle":"what they test"}],
  "gap_questions": [{"question":"...","skill":"...","how_to_handle":"honest strategy"}],
  "quick_wins": ["actionable tip 1","actionable tip 2","actionable tip 3","actionable tip 4"]
}
Rules: 5 technical questions, 4 behavioral questions, 3 gap questions, 4 quick wins. Specific to Indian campus placements.`;

    const raw = await callAI(prompt, 1800);
    const parsed = parseJSON(raw);
    if (parsed) return res.json(parsed);

    // High-quality mock fallback
    const gap = gapList[0] || 'core technical skills';
    const strength = topStrengths[0] || 'your core CS skills';
    res.json({
      coaching_summary: `You are targeting ${targetRole||'Software Engineer'} with a readiness of ${readinessScore||50}/100. Your strongest asset is ${strength} — lead with this in interviews. For ${gap}, be honest about your learning journey and show a concrete plan. Note: This is mock data — add GROQ_API_KEY or GEMINI_API_KEY in .env for personalised AI responses.`,
      technical_questions: [
        { question:`Explain how you would use ${gap} in a real project.`, skill:gap, difficulty:'medium', tip:'Focus on a concrete project example, not theory.' },
        { question:'What is the time and space complexity of Merge Sort? When would you prefer it over Quick Sort?', skill:'algorithms', difficulty:'medium', tip:'O(n log n) both — prefer Merge Sort for linked lists and stable sort requirements.' },
        { question:'Explain the difference between a process and a thread with a real-world example.', skill:'operating systems', difficulty:'medium', tip:'Restaurant analogy: process = kitchen, thread = chef. Share memory, different stacks.' },
        { question:'Write a SQL query to find the third highest salary from an employee table.', skill:'sql', difficulty:'medium', tip:'Use DENSE_RANK() or LIMIT with OFFSET. Show both approaches.' },
        { question:'What is REST? How is it different from GraphQL?', skill:'system design', difficulty:'easy', tip:'REST: multiple endpoints, over-fetching. GraphQL: one endpoint, fetch exactly what you need.' },
      ],
      behavioral_questions: [
        { question:'Tell me about a project you are most proud of and what you learned from it.', framework:'STAR', angle:'Technical depth + ownership + impact' },
        { question:'Describe a time you had to learn something quickly under pressure.', framework:'STAR', angle:'Learning agility and adaptability' },
        { question:'Give an example of how you resolved a conflict in a team project.', framework:'CAR', angle:'Collaboration and communication skills' },
        { question:'Tell me about a time you failed and what you learned.', framework:'PAR', angle:'Self-awareness and growth mindset' },
      ],
      gap_questions: [
        { question:`We require strong ${gap} experience. How much have you worked with it?`, skill:gap, how_to_handle:'Be honest: "I have foundational knowledge and have been building [specific project]. I am actively improving through [resource]."' },
        { question:'What areas do you feel you need to grow in for this role?', skill:'self-awareness', how_to_handle:'Name the gap confidently, then pivot to your concrete plan to close it within 3 months.' },
        { question:'Why should we hire you over someone with more experience?', skill:'value proposition', how_to_handle:'Lead with learning velocity and fresh perspective — "I might have less experience but I adapt faster and bring energy to every problem."' },
      ],
      quick_wins: [
        `Build one project using ${gap} this week — even a simple demo shows initiative`,
        'Prepare a crisp 90-second "tell me about yourself" that connects your projects directly to this role',
        'Research the company tech stack and prepare 3 thoughtful questions about their engineering challenges',
        'Revise your resume to quantify every achievement with numbers (users, performance %, time saved)',
      ]
    });
  } catch (err) {
    console.error('Interview prep error:', err.message);
    res.json({ coaching_summary:'Interview prep is temporarily unavailable. Check your AI API keys in .env.', technical_questions:[], behavioral_questions:[], gap_questions:[], quick_wins:[] });
  }
});

// ── POST /api/skillpath/interview-feedback ────────────────────────────────────
router.post('/interview-feedback', authenticate, async (req, res) => {
  try {
    const { question, answer, nextQuestion, candidateName, targetRole } = req.body;
    if (!answer?.trim()) return res.json({ feedback: 'Please type or speak your answer first.' });

    const prompt = `You are a campus placement interview coach for Indian engineering students.
Candidate: ${candidateName||'Student'} | Role: ${targetRole||'Software Engineer'}
Interview Question: ${question}
Candidate's Answer: ${answer}

Give 2-3 sentence constructive feedback: what was good, what to improve, encourage using STAR format if weak.
${nextQuestion ? `End with "Next Question: ${nextQuestion}"` : 'Congratulate them for completing all questions.'}
Keep under 100 words. No markdown formatting.`;

    const text = await callAI(prompt, 200);
    if (text) return res.json({ feedback: text });

    // Mock fallback
    const words = (answer||'').split(/\s+/).filter(Boolean).length;
    const quality = words>=50?'Good depth and detail!':words>=20?'Decent — try adding a specific example using STAR format.':'Too brief — aim for 3-4 sentences with a concrete example.';
    const nxt = nextQuestion ? `\n\n➡️ Next Question: ${nextQuestion}` : '\n\n✅ Great work completing the mock interview!';
    res.json({ feedback: `📝 ${quality}${nxt}` });
  } catch (err) {
    console.error('Feedback error:', err.message);
    res.json({ feedback: 'Good attempt! Be more specific next time.' + (req.body.nextQuestion ? `\n\nNext: ${req.body.nextQuestion}` : '') });
  }
});

// ── POST /api/skillpath/ai-chat ───────────────────────────────────────────────
router.post('/ai-chat', authenticate, async (req, res) => {
  try {
    const { message, userName, targetRole } = req.body;
    if (!message?.trim()) return res.status(400).json({ error:'Message required' });

    const prompt = `You are PRAGATI AI, an expert placement assistant for Indian engineering students at KIT's College of Engineering.

Student: ${userName||'Engineering Student'} | Target: ${targetRole||'Software Engineer'}
Question: ${message}

Reply in 3-5 sentences. Be specific, practical, and encouraging. Use 1-2 relevant emojis. Focus on actionable advice for Indian campus placements. If about a technical topic, include the most important concept to remember.`;

    const reply = await callAI(prompt, 250);
    if (reply) return res.json({ reply });

    // Smart mock fallback
    const q = message.toLowerCase();
    let fallback = '';
    if (q.includes('array')||q.includes('dsa')||q.includes('algorithm'))
      fallback = '📚 For DSA problems: master Two Pointers, Sliding Window, and Binary Search first. These patterns solve ~60% of interview questions. Practice on LeetCode Easy → Medium in order. Time your solutions from day 1.';
    else if (q.includes('resume')||q.includes('ats'))
      fallback = '📄 ATS Resume Tips: Match keywords from the JD exactly. Structure: Contact → Skills → Projects → Education → Experience. Quantify every achievement: "Built REST API handling 500 requests/day." Run SkillPath AI for your personalised ATS score!';
    else if (q.includes('interview')||q.includes('prepare'))
      fallback = '🎤 Interview Prep: 1) Revise OOP (4 pillars with examples) 2) DBMS (normalization, JOINs) 3) OS (process vs thread, deadlock) 4) 2 strong projects you can explain deeply 5) 50+ LeetCode problems. Use PRAGATI Interview Prep for AI-powered mock interviews!';
    else if (q.includes('tcs')||q.includes('infosys')||q.includes('wipro'))
      fallback = '🏢 For service companies: Focus on quant aptitude, pseudocode tracing, basic DSA, OOP, and SQL. Communication is key for HR rounds. Practice TCS NQT mock tests — timing is everything. Good luck! 💪';
    else
      fallback = `🤖 Great question! For placement success, I recommend: 1) Upload your resume to SkillPath AI for a personalised gap analysis 2) Solve today's daily coding problem 3) Practice topic-wise aptitude 4) Check company prep guides. What specific topic can I help with? Note: Add GROQ_API_KEY to .env for full AI responses.`;

    res.json({ reply: fallback });
  } catch (err) {
    console.error('AI chat error:', err.message);
    res.json({ reply: 'I had a brief hiccup. Please try asking again!' });
  }
});

// ── POST /api/skillpath/deep-dive ─────────────────────────────────────────────
router.post('/deep-dive', authenticate, async (req, res) => {
  try {
    const { topic, targetRole, candidateName } = req.body;
    const prompt = `You are a placement coach for Indian engineering students preparing for ${targetRole||'software engineering'} interviews.
Topic: ${topic} | Candidate: ${candidateName||'Student'}
Return ONLY valid JSON (no markdown):
{"explanation":"2-3 sentence clear explanation for a campus interview context","practice_questions":["3 interview questions about ${topic}"],"resources":["2 specific free resource URLs or names"],"quick_prep":"One sentence on how to answer ${topic} questions in an interview"}`;

    const raw = await callAI(prompt, 600);
    const parsed = parseJSON(raw);
    if (parsed) return res.json(parsed);

    res.json({
      explanation: `${topic} is a core technical skill frequently tested in campus placements. Understanding the fundamentals, use cases, and trade-offs is essential for both interviews and practical development.`,
      practice_questions: [`Explain ${topic} with a real-world example.`, `What are the common pitfalls when using ${topic}?`, `Compare ${topic} with similar alternatives.`],
      resources: [`freeCodeCamp.org — search "${topic} tutorial"`, `GeeksforGeeks.org — search "${topic}"`],
      quick_prep: `In interviews: explain the concept clearly in one sentence, give a concrete example, mention one trade-off or limitation.`,
    });
  } catch (err) {
    console.error('Deep dive error:', err.message);
    res.json({ explanation:`${req.body.topic} is an important topic. Study fundamentals and build a project using it.`, practice_questions:[], resources:['freeCodeCamp.org','GeeksforGeeks.org'], quick_prep:'Explain concept, give example, mention trade-offs.' });
  }
});

// ── GET /api/skillpath/history ────────────────────────────────────────────────
router.get('/history', authenticate, async (req, res) => {
  try {
    const results = await SkillpathResult.find({ userId:req.user._id }).sort({ analyzedAt:-1 }).limit(20);
    res.json({ results });
  } catch (err) { res.status(500).json({ error:err.message }); }
});

// ── GET /api/skillpath/latest ─────────────────────────────────────────────────
router.get('/latest', authenticate, async (req, res) => {
  try {
    const result = await SkillpathResult.findOne({ userId:req.user._id }).populate('companyId','name sector').sort({ analyzedAt:-1 });
    res.json({ result });
  } catch (err) { res.status(500).json({ error:err.message }); }
});


// ─────────────────────────────────────────────────────────────────────────────
// NEW: Dynamic AI Interview routes — added v3.0
// ─────────────────────────────────────────────────────────────────────────────

// ── POST /api/skillpath/mock-feedback ────────────────────────────────────────
// Called by old InterviewPrepPage — now upgraded with dynamic tech-aware feedback
router.post('/mock-feedback', authenticate, async (req, res) => {
  try {
    const { candidateName, targetRole, question, answer, nextQuestion, isLast, interviewType } = req.body;
    if (!answer?.trim()) return res.json({ feedback: 'Please answer the question first.' });

    const lower = answer.toLowerCase();
    const words = answer.trim().split(/\s+/).filter(Boolean).length;
    const hasExample = /example|project|experience|built|worked|implemented|used/i.test(answer);

    // Detect tech mentioned
    const tech = (() => {
      if (/react|hook|jsx|redux/.test(lower)) return 'React';
      if (/spring|springboot|hibernate/.test(lower)) return 'Spring Boot';
      if (/java|jvm|collections/.test(lower)) return 'Java';
      if (/python|django|flask|pandas/.test(lower)) return 'Python';
      if (/node|express|nodejs/.test(lower)) return 'Node.js';
      if (/sql|database|mysql|postgres|mongodb/.test(lower)) return 'Database';
      if (/docker|kubernetes|aws|azure/.test(lower)) return 'DevOps/Cloud';
      return null;
    })();

    const techDrills = {
      'React': 'How do you handle performance optimization in React? Explain useMemo vs useCallback.',
      'Spring Boot': 'Explain how Spring dependency injection works. What is the difference between @Autowired on field vs constructor?',
      'Java': 'Explain the difference between checked and unchecked exceptions. When do you use each?',
      'Python': "Explain Python's GIL. How do you achieve true parallelism?",
      'Node.js': 'How does the Node.js event loop work? What happens with CPU-intensive operations?',
      'Database': 'Explain database indexing — when does adding an index hurt performance?',
      'DevOps/Cloud': 'How do you handle zero-downtime deployments in a containerized environment?',
    };

    const prompt = `You are an expert ${interviewType || 'technical'} interviewer for ${targetRole || 'Software Engineer'} roles at top Indian tech companies.
Candidate: ${candidateName || 'Student'}
Question asked: ${question || 'General'}
Their answer: "${answer}"
${tech ? `They mentioned ${tech} — acknowledge this and probe deeper into ${tech}.` : ''}

In 2-3 sentences: give specific feedback (what was good + one concrete improvement).
${isLast
  ? 'Then give a warm overall summary and close the interview.'
  : `End with the next question: "${tech && techDrills[tech] ? techDrills[tech] : (nextQuestion || 'Walk me through the most challenging technical problem you have solved.')}"` }
Max 90 words. Natural conversational tone. No markdown.`;

    const text = await callAI(prompt, 220);
    if (text) return res.json({ feedback: text });

    // Smart local fallback
    const quality = words >= 50 && hasExample ? 'Good depth with a real example!' : words >= 30 ? 'Decent answer — add a specific project example for more impact.' : 'Too brief — aim for 50+ words using the STAR format.';
    const techNote = tech && !isLast ? `\n\n➡️ Follow-up: ${techDrills[tech]}` : '';
    const lastNote = isLast ? '\n\n🎉 Interview complete — great effort!' : (!tech && nextQuestion ? `\n\n➡️ Next Question: ${nextQuestion}` : '');
    res.json({ feedback: `📝 ${quality}${techNote}${lastNote}` });
  } catch (err) {
    console.error('[mock-feedback]', err.message);
    res.json({ feedback: 'Good attempt! Try adding concrete project examples next time.' });
  }
});

// ── POST /api/skillpath/dynamic-interview ─────────────────────────────────────
// Context-aware dynamic next question + feedback — heart of the AI interviewer
router.post('/dynamic-interview', authenticate, async (req, res) => {
  try {
    const { prompt, targetRole, interviewType, lastAnswer, isLast } = req.body;
    if (!lastAnswer?.trim()) return res.status(400).json({ error: 'lastAnswer required' });

    const raw    = await callAI(prompt || `Interview answer: "${lastAnswer}". Give feedback and a follow-up question. JSON: {"feedback":"...","nextQuestion":"...","confidence":7,"keyMissing":""}`, 400);
    const parsed = parseJSON(raw);
    if (parsed?.feedback) return res.json(parsed);

    // Robust local fallback with tech detection
    const lower = lastAnswer.toLowerCase();
    const words = lastAnswer.trim().split(/\s+/).filter(Boolean).length;
    const hasExample = /example|project|experience|built|worked/i.test(lastAnswer);
    const isWeak = words < 30 || !hasExample;

    const techFollowUp = (() => {
      if (/react|hook|useState|useEffect/.test(lower)) return 'Can you explain how React\'s virtual DOM diffing works? And when would you use useMemo?';
      if (/spring|springboot/.test(lower)) return 'How does Spring handle the bean lifecycle? What is the difference between @Bean and @Component?';
      if (/java|jvm/.test(lower)) return 'Explain the difference between the young generation and old generation in Java\'s garbage collector.';
      if (/python|django/.test(lower)) return 'Explain Python\'s GIL. How do you achieve true parallelism in Python despite it?';
      if (/node|express/.test(lower)) return 'How does Node.js handle thousands of concurrent connections with a single thread? Explain the event loop.';
      if (/sql|database|mysql|postgres/.test(lower)) return 'Explain the N+1 query problem. How do you detect and fix it in your ORM?';
      if (/docker|kubernetes|aws/.test(lower)) return 'How do you manage secrets in a containerized production application?';
      if (/machine learning|model|neural/.test(lower)) return 'Explain the bias-variance tradeoff. How do you diagnose which is causing your model to underperform?';
      return null;
    })();

    const genericQs = [
      'Walk me through the most technically challenging problem you have solved. How did you isolate the root cause?',
      'How do you ensure code quality when working under a tight deadline?',
      'Describe a project where you made a significant architectural decision. What alternatives did you consider?',
      'How do you approach learning a new technology you have never used before?',
    ];

    const hrQs = [
      'Tell me about a time you strongly disagreed with your team\'s decision. How did you handle it?',
      'Describe a situation where you delivered bad news to a stakeholder.',
      'Give an example of when you took initiative without being asked.',
    ];

    const nextQuestion = isLast ? null : (
      techFollowUp ||
      (isWeak ? 'Can you give a concrete example from one of your projects that supports what you just said?' :
       interviewType === 'HR' ? hrQs[Math.floor(Math.random() * hrQs.length)] :
       genericQs[Math.floor(Math.random() * genericQs.length)])
    );

    const feedback = isWeak
      ? `Your answer was brief and lacked specifics. Try the STAR format (Situation → Task → Action → Result) and always mention a real project you worked on. Aim for 60+ words.`
      : `${words >= 80 ? 'Good depth!' : 'Solid answer.'} ${hasExample ? 'The project reference was helpful.' : 'Try mentioning a specific project next time — it makes your answers memorable.'} Keep this up.`;

    res.json({
      feedback,
      nextQuestion,
      questionType: interviewType === 'HR' ? 'behavioral' : 'technical',
      confidence: isWeak ? 4 : 7,
      keyMissing: !hasExample ? 'A concrete project/experience example' : '',
    });
  } catch (err) {
    console.error('[dynamic-interview]', err.message);
    res.json({
      feedback: 'Good attempt! Try adding more specific examples from your projects.',
      nextQuestion: 'Walk me through the most challenging problem you solved in your most recent project.',
      questionType: 'technical',
      confidence: 6,
      keyMissing: '',
    });
  }
});

// ── POST /api/skillpath/gd-moderate ──────────────────────────────────────────
// AI GD Moderator — context-aware challenges and follow-ups
router.post('/gd-moderate', authenticate, async (req, res) => {
  try {
    const { prompt, topic, participantPoint, turn, isLast } = req.body;
    if (!participantPoint?.trim() && !prompt) return res.status(400).json({ error: 'participantPoint required' });

    const aiPrompt = prompt || `You are a sharp Group Discussion moderator at an Indian campus placement panel.
Topic: "${topic}". Turn ${turn}. Participant said: "${participantPoint}".
Give a 2-3 sentence response: challenge their argument, ask for evidence, introduce a counterpoint, or probe deeper.
Return ONLY JSON: {"response":"...","tone":"challenging|encouraging|neutral|summarizing","pointQuality":"weak|decent|strong"}`;

    const raw = await callAI(aiPrompt, 300);
    const parsed = parseJSON(raw);
    if (parsed?.response) return res.json(parsed);

    // Local fallback
    const words = (participantPoint || '').split(/\s+/).length;
    const isWeak = words < 25 || !/(because|since|example|data|shows|research|evidence|according)/i.test(participantPoint);
    const lower = (participantPoint || '').toLowerCase();

    let response, tone, pointQuality;
    if (isLast) {
      const score = isWeak ? 5 : words >= 60 ? 9 : 7;
      response = `Thank you for your contributions. ${score >= 8 ? 'You demonstrated strong analytical thinking and backed your points well.' : 'Work on backing your arguments with data and specific examples next time.'} GD Score: ${score}/10.`;
      tone = 'summarizing'; pointQuality = isWeak ? 'weak' : 'decent';
    } else if (isWeak) {
      const chs = [
        'That is a general statement. Can you back it up with a specific statistic, news example, or case study? Vague points do not score in GDs.',
        'You have made an assertion but where is the evidence? In a GD, every claim needs supporting data.',
      ];
      response = chs[turn % chs.length]; tone = 'challenging'; pointQuality = 'weak';
    } else if (lower.includes('government') || lower.includes('policy')) {
      response = "Good policy angle. But we have seen well-intentioned policies fail at implementation in India. What specific mechanism ensures this actually works at the grassroots level?";
      tone = 'challenging'; pointQuality = 'decent';
    } else if (lower.includes('technology') || lower.includes('ai') || lower.includes('digital')) {
      response = "Interesting technology perspective. But consider India's 65% rural population with limited digital access. Does your argument apply equally there?";
      tone = 'challenging'; pointQuality = 'decent';
    } else {
      const fups = [
        'Good point. Now argue the strongest counterargument — and then explain why your side still wins.',
        'You have identified the problem. What is your specific, actionable recommendation? A good GD participant prescribes solutions.',
        'Solid reasoning. How does this play out specifically in the Indian context versus developed nations?',
      ];
      response = fups[turn % fups.length]; tone = 'encouraging'; pointQuality = 'strong';
    }
    res.json({ response, tone, pointQuality });
  } catch (err) {
    console.error('[gd-moderate]', err.message);
    res.json({ response: 'Interesting point. Can you back that up with a specific example or data?', tone: 'challenging', pointQuality: 'decent' });
  }
});


// ── POST /api/skillpath/pragati-assistant ──────────────────────────────────────
// "Hey Pragati" — personal AI companion with full account context
router.post('/pragati-assistant', authenticate, async (req, res) => {
  try {
    const { message, userData, conversationHistory } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

    // Fetch user's latest SkillPath result for deep context
    let skillContext = '';
    try {
      const latest = await SkillpathResult.findOne({ userId: req.user._id }).sort({ analyzedAt: -1 }).lean();
      if (latest) {
        skillContext = `\n\nStudent's SkillPath Data:\n- ATS Score: ${latest.atsScore}/100\n- Target Role: ${latest.jobTitle || 'Software Engineer'}\n- Matched Skills: ${(latest.skillGapAnalysis?.matchedSkills || []).slice(0,6).join(', ')}\n- Missing Skills: ${(latest.skillGapAnalysis?.missingSkills || []).slice(0,6).join(', ')}\n- Readiness: ${latest.readinessScore || 0}%`;
      }
    } catch {}

    const u = userData || {};
    const systemPrompt = `You are PRAGATI — a warm, knowledgeable, and highly capable AI companion built into the PRAGATI career readiness platform for Indian engineering students.

About the student you are talking to:
- Name: ${u.name || 'Student'}
- Role: ${u.role || 'Student'}  
- Department: ${u.department || 'Engineering'}
- Year: ${u.year ? `Year ${u.year}` : 'Unknown'}
- Roll Number: ${u.rollNumber || 'N/A'}
- Streak: ${u.streak || 0} days
- Bio: ${u.bio || 'Not set'}
${skillContext}

Your personality:
- Warm and encouraging like a senior who genuinely wants you to succeed
- Knowledgeable: expert in DSA, system design, OOP, DBMS, OS, CN, web dev, Java, Python, React, Node.js
- Company-specific: know what TCS, Infosys, Wipro, Cognizant, Capgemini, HCL, Accenture, Amazon, Google, Microsoft, Deloitte, KPMG look for
- Behavioral coach: STAR format, HR answers, leadership examples
- Resume expert: ATS optimization, project descriptions, quantification
- Honest: if someone asks a hard question, give a direct answer
- You call the student by their first name occasionally

Previous conversation:
${conversationHistory || 'No previous conversation'}

The student just asked: "${message}"

Instructions:
- Answer conversationally and helpfully in 3-6 sentences max (unless they need a longer answer)
- Use 1-2 relevant emojis naturally
- If they ask about their weak areas, reference their missing skills from SkillPath if available
- If they ask about a technical concept, explain it clearly with a quick example
- If they ask about a company, give specific advice about that company's interview process
- If they seem stressed or anxious, be supportive and encouraging
- Use Indian context naturally (CGPA, LPA, campus placements, service companies vs product companies)
- Never be robotic or give generic textbook answers
- End with a follow-up question or suggestion occasionally to keep the conversation going`;

    const reply = await callAI(systemPrompt, 400);
    if (reply) return res.json({ reply });

    // Rich local fallback
    const q = message.toLowerCase();
    let fallback = '';

    if (q.includes('my weak') || q.includes('my skill') || q.includes('what should i') || q.includes('what do i')) {
      fallback = `Hey ${u.name?.split(' ')[0] || 'there'}! 🎯 Based on your profile, focus on your skill gaps — upload your resume to SkillPath AI if you haven't for a personalised analysis. Generally for ${u.department || 'CS'} students in Year ${u.year || '3'}: master 2-3 DSA patterns daily, revise OOP and DBMS thoroughly, and have 2 solid projects you can explain end-to-end. What specific area feels weakest right now?`;
    } else if (q.includes('tcs') || q.includes('infosys') || q.includes('wipro') || q.includes('cognizant') || q.includes('capgemini')) {
      const co = q.includes('tcs') ? 'TCS' : q.includes('infosys') ? 'Infosys' : q.includes('wipro') ? 'Wipro' : q.includes('cognizant') ? 'Cognizant' : 'Capgemini';
      fallback = `For ${co} placements 🏢: Focus on quantitative aptitude (profit/loss, time-work, number series), pseudocode tracing, basic DSA (arrays, strings), and email writing. ${co === 'TCS' ? 'TCS NQT has 4 sections — Numerical, Verbal, Reasoning, and Coding. Time management is key.' : 'The HR round tests communication more than technical depth.'} Your ${u.streak || 0}-day streak is great — keep it up! Want me to give you a quick mock question?`;
    } else if (q.includes('amazon') || q.includes('google') || q.includes('microsoft') || q.includes('product company') || q.includes('faang')) {
      fallback = `For product companies like Amazon/Google 💡: You need strong DSA (LeetCode Medium-Hard), system design fundamentals (for 2+ years exp), and behavioral stories (STAR format, Amazon's 16 LPs). Start with arrays → linked lists → trees → DP. Aim for 200+ LeetCode problems before applying. This is a marathon, not a sprint. What's your current LeetCode progress?`;
    } else if (q.includes('resume') || q.includes('ats') || q.includes('cv')) {
      fallback = `Resume tips for you, ${u.name?.split(' ')[0] || 'friend'} 📄: 1) Use exact keywords from the JD. 2) Every project needs: what you built + technology + measurable impact ("Reduced API response time by 40%"). 3) Keep it 1 page. 4) Upload to SkillPath AI for your personalized ATS score! Want help with a specific section?`;
    } else if (q.includes('interview') || q.includes('prepare') || q.includes('mock')) {
      fallback = `Great initiative on interview prep! 🎤 Use the AI Interviewer feature — it adapts questions based on YOUR answers, just like a real panel. For technical rounds: OOP concepts, DBMS normalization, OS process management, and your projects. For HR: prepare 5 STAR stories covering teamwork, conflict, leadership, failure, and achievement. Want to jump into a mock now?`;
    } else if (q.includes('dsa') || q.includes('algorithm') || q.includes('leetcode') || q.includes('data structure')) {
      fallback = `DSA Strategy 💻: Master patterns in order — Two Pointers → Sliding Window → Binary Search → Recursion → BFS/DFS → Dynamic Programming. Solve 3 problems daily on LeetCode: 1 easy + 1 medium + revisit 1 old. Time yourself — most interviews are 20-45 min per problem. Which pattern are you stuck on right now?`;
    } else if (q.includes('stress') || q.includes('anxious') || q.includes('scared') || q.includes('nervous') || q.includes('worried')) {
      fallback = `Hey ${u.name?.split(' ')[0] || 'friend'} 💙 — it's completely okay to feel nervous. Every student preparing for placements goes through this. Remember: you are not competing with everyone, just improving from yesterday's version of yourself. Your ${u.streak || 0}-day streak shows you're consistent — that matters more than one bad day. Take a 10-minute break, then come back. What's worrying you most right now?`;
    } else {
      fallback = `🤖 Hey ${u.name?.split(' ')[0] || 'there'}! I'm here for all your placement questions — DSA concepts, interview prep, company-specific tips, resume help, or just to talk through your strategy. For the best AI responses, make sure GROQ_API_KEY is set in the backend .env file. What would you like to work on?`;
    }

    res.json({ reply: fallback });
  } catch (err) {
    console.error('[pragati-assistant]', err.message);
    res.json({ reply: 'I had a brief hiccup! Please try again.' });
  }
});

module.exports = router;
