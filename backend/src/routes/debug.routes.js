const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');

// ── API Keys — Groq (primary) → Gemini (fallback) → Static analysis ───────────
const GROQ_API_KEY   = process.env.GROQ_API_KEY   || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY || '';

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// ── Groq call (OpenAI-compatible) ─────────────────────────────────────────────
async function callGroq(prompt, retries = 2) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model:       'llama-3.1-8b-instant',   // fast + free (14,400 req/day)
          messages:    [{ role: 'user', content: prompt }],
          max_tokens:  4096,
          temperature: 0.0,
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || '';
      if (!text) throw new Error('Empty response from Groq');
      return text;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
}

// ── Gemini call (fallback) ────────────────────────────────────────────────────
async function callGemini(prompt, retries = 2) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.0, maxOutputTokens: 4096, topP: 1.0, topK: 1 },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) throw new Error('Empty response from Gemini');
      return text;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
}

// ── Shared prompt (identical for both providers) ──────────────────────────────
function buildPrompt({ code, language, problemTitle, testCases }) {
  const lang = (language || 'javascript').toLowerCase();
  const tcSection = (testCases && testCases.length > 0)
    ? `Test Cases:\n${testCases.map((tc, i) =>
        `  Case ${i + 1}: Input=${JSON.stringify(tc.input)} -> Expected=${JSON.stringify(tc.expected)}`
      ).join('\n')}`
    : '(No test cases provided — analyze algorithm correctness from logic)';

  const langChecks = {
    java:       '== vs .equals(), integer overflow, IndexOutOfBounds, NullPointer, missing break, int/Integer comparison',
    python:     '/ vs //, range() bounds, mutable defaults, indentation, global/local scope, mutating list in loop',
    javascript: '=== vs ==, typeof null, NaN comparisons, undefined, array.sort() defaults, async/await',
    'c++':      'pointer deref, out-of-bounds, overflow, uninitialized vars, memory leaks, stack overflow',
    c:          'buffer overflow, uninitialized pointers, leaks, signed/unsigned, overflow',
    go:         'nil deref, slice bounds, goroutine leak, division truncation',
    rust:       'borrow/ownership errors, integer overflow, unwrap on None/Err',
  };
  const specificChecks = langChecks[lang] || 'integer overflow, uninitialized variables, bounds checking';

  return `Analyze this ${lang} solution for "${problemTitle || 'Coding Problem'}" as an expert debugger.
Return a structured JSON debug report.

Context:
Language: ${lang}
${tcSection}

Code:
\`\`\`${lang}
${code}
\`\`\`

Instructions:
1. Trace execution step-by-step for the given inputs.
2. Check for typical bugs: off-by-one, wrong operators, missing return/break, uninitialized variables, overflow, null dereference, bad recursion base cases, or edge cases.
3. Check for specific ${lang} bugs: ${specificChecks}.
4. If errors are found, identify the exact line and explain why it is incorrect. Provide a complete corrected code block in 'suggestedFix'.
5. Strictly decide the verdict:
   - "likely_correct": All tests pass, no bugs found, handles all edge cases.
   - "has_errors": Code contains a logic bug, incorrect test output, or runtime exception.
   - "review": No test cases supplied, correctness is uncertain, or code is overly complex.

Response Format:
Respond ONLY with parseable JSON (no markdown block, no extra text before or after):
{
  "verdict": "likely_correct" | "review" | "has_errors",
  "verdictMessage": "One concise sentence summarizing the verdict",
  "explanation": "3-4 sentences: approach summary, correctness check, and complexity.",
  "issues": [
    {
      "type": "error" | "warning" | "info",
      "line": 12, // line number as integer, or null
      "msg": "Clear bug description and impact",
      "fix": "Corrected line of code or quick fix"
    }
  ],
  "hints": ["Specific actionable hint to solve the issue"],
  "testResults": [
    {
      "input": "string input",
      "expected": "string expected",
      "actualOutput": "string actual",
      "passed": true | false,
      "trace": "Step-by-step tracing snippet"
    }
  ],
  "suggestedFix": "Complete corrected function code. Empty string if no bugs.",
  "timeComplexity": "O(...) complexity",
  "spaceComplexity": "O(...) complexity"
}`;
}

// ── Parse AI JSON response ────────────────────────────────────────────────────
function parseAI(raw) {
  let text = raw.trim();
  // Strip markdown code fences if present
  text = text.replace(/^```json\s*/i, '').replace(/```\s*$/g, '').trim();
  
  const s = text.indexOf('{'), e = text.lastIndexOf('}');
  if (s === -1 || e === -1) throw new Error('No JSON in AI response');
  text = text.slice(s, e + 1);

  try {
    return JSON.parse(text);
  } catch (err) {
    console.warn('[Debug Router] Standard JSON parse failed, attempting regex/unescape cleanup...', err.message);
    try {
      // Replace raw newlines and carriage returns in string properties with escaped versions
      // This regex identifies string literals inside the JSON (values inside quotes) and cleans up newlines.
      const cleaned = text.replace(/: \s*"([^"\\]*(\\.[^"\\]*)*)"/g, (match, p1) => {
        const escapedValue = p1.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
        return ': "' + escapedValue + '"';
      });
      return JSON.parse(cleaned);
    } catch (innerErr) {
      throw new Error(`JSON parsing failed: ${err.message}. Original text: ${text.slice(0, 250)}`);
    }
  }
}

// ── Enforce strict verdict rules ──────────────────────────────────────────────
function enforceAndRespond(parsed, testCases, source) {
  let verdict = parsed.verdict || 'review';
  if (parsed.issues?.some(i => i.type === 'error'))       verdict = 'has_errors';
  if (parsed.testResults?.some(t => t.passed === false))  verdict = 'has_errors';
  if (!testCases.length && verdict === 'likely_correct')  verdict = 'review';

  const VM = {
    likely_correct: '✅ All tests passed!',
    has_errors:     '❌ Errors found.',
    review:         '⚠️ Review needed.',
  };

  return {
    verdict,
    verdictMessage:  parsed.verdictMessage  || VM[verdict],
    issues:          Array.isArray(parsed.issues)      ? parsed.issues      : [],
    hints:           Array.isArray(parsed.hints)       ? parsed.hints       : [],
    testResults:     Array.isArray(parsed.testResults) ? parsed.testResults : [],
    suggestedFix:    parsed.suggestedFix    || '',
    timeComplexity:  parsed.timeComplexity  || 'N/A',
    spaceComplexity: parsed.spaceComplexity || 'N/A',
    explanation:     parsed.explanation     || '',
    source,
  };
}

// ── POST /api/debug ───────────────────────────────────────────────────────────
router.post('/', authenticate, async (req, res) => {
  const { code, language = 'javascript', problemTitle = '', testCases = [] } = req.body;

  if (!code || code.trim().length < 5) {
    return res.status(400).json({ error: 'Provide code to debug (min 5 chars).' });
  }

  const prompt = buildPrompt({ code, language, problemTitle, testCases });

  // ── 1. Groq — primary (14,400 free req/day, ~300 tokens/sec) ─────────────
  if (GROQ_API_KEY) {
    try {
      console.log('[Debug] Trying Groq...');
      const raw    = await callGroq(prompt);
      const parsed = parseAI(raw);
      console.log('[Debug] Groq success, verdict:', parsed.verdict);
      return res.json(enforceAndRespond(parsed, testCases, 'groq'));
    } catch (err) {
      const hint = err.message?.includes('429') ? '429 rate limit hit' : err.message?.slice(0, 60);
      console.warn(`[Debug] Groq failed (${hint}) — falling back to Gemini`);
    }
  }

  // ── 2. Gemini — fallback ──────────────────────────────────────────────────
  if (GEMINI_API_KEY) {
    try {
      console.log('[Debug] Trying Gemini fallback...');
      const raw    = await callGemini(prompt);
      const parsed = parseAI(raw);
      console.log('[Debug] Gemini success, verdict:', parsed.verdict);
      return res.json(enforceAndRespond(parsed, testCases, 'gemini'));
    } catch (err) {
      console.error('[Debug] Gemini also failed:', err.message?.slice(0, 80));
    }
  }

  // ── 3. Static / rule-based — last resort ─────────────────────────────────
  console.warn('[Debug] No AI available — using static rule-based analysis');
  const issues = [], hints = [];
  let verdict  = 'review';
  const lang   = (language || '').toLowerCase();

  if (/<=\s*(arr\.length|n|len|size)\b/.test(code) && !/.length\s*-\s*1/.test(code)) {
    issues.push({ line: null, type: 'warning', msg: 'Off-by-one: `<= arr.length` should be `< arr.length`' });
    hints.push('Use `i < arr.length` not `i <= arr.length`.');
  }
  if (/while\s*\(\s*true\s*\)/i.test(code) && !/break\b/i.test(code)) {
    issues.push({ line: null, type: 'error', msg: 'while(true) without break — infinite loop' });
    verdict = 'has_errors';
  }
  if (/function\s+\w+/.test(code) && !/\breturn\b/.test(code)) {
    issues.push({ line: null, type: 'warning', msg: 'Function with no return statement' });
    hints.push('All code paths must return a value.');
  }
  if (lang === 'java' && (/==\s*"/.test(code) || /"\s*==/.test(code))) {
    issues.push({ line: null, type: 'error', msg: 'Java: use .equals() for String comparison, not ==' });
    verdict = 'has_errors';
  }
  if (issues.some(i => i.type === 'error')) verdict = 'has_errors';

  const noKeyMsg = !GROQ_API_KEY && !GEMINI_API_KEY
    ? '⚠️ No AI key configured. Add GROQ_API_KEY in .env (free at console.groq.com).'
    : '⚠️ AI temporarily unavailable — showing static analysis only.';

  return res.json({
    verdict,
    verdictMessage: verdict === 'has_errors' ? '❌ Static analysis found errors.' : noKeyMsg,
    issues,
    hints,
    testResults:    [],
    suggestedFix:   '',
    timeComplexity: 'N/A',
    spaceComplexity:'N/A',
    explanation:    'Rule-based analysis only. ' + noKeyMsg,
    source: 'rule-based',
  });
});

module.exports = router;
