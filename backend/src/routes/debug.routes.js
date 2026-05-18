const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');

// ── API Keys — Groq (primary) → Gemini (fallback) → Static analysis ───────────
const GROQ_API_KEY   = process.env.GROQ_API_KEY   || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

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
    ? `\nTEST CASES (simulate execution for EACH, step by step):\n${testCases.map((tc, i) =>
        `  Case ${i + 1}: Input=${JSON.stringify(tc.input)} → Expected=${JSON.stringify(tc.expected)}`
      ).join('\n')}`
    : '\n(No test cases provided — analyze correctness from algorithm logic, identify likely failure inputs)';

  const langChecks = {
    java:       'String == vs .equals(), integer overflow, ArrayIndexOutOfBounds, NullPointerException, missing break in switch, Integer vs int comparisons',
    python:     '/ vs // for integer division, range() off-by-one, mutable default args, indentation errors, global vs local scope, list mutation in loop',
    javascript: '=== vs ==, typeof null === "object", NaN comparisons, undefined access, array.sort() default lexicographic, closure in loop, async/await missing',
    'c++':      'pointer dereference, array bounds, integer overflow, uninitialized variables, memory leaks, stack overflow on recursion',
    c:          'buffer overflow, uninitialized pointers, memory leaks, signed/unsigned mismatch, integer overflow',
    go:         'nil pointer dereference, slice bounds, goroutine leak, integer division truncation',
    rust:       'ownership/borrow errors, integer overflow in debug, unwrap on None/Err',
  };
  const specificChecks = langChecks[lang] || 'integer overflow, uninitialized variables, bounds checking';

  return `You are an elite software engineer and debugger with 20 years of experience. Your job is to deeply analyze the provided code and produce a structured, accurate, and educational debug report.

━━━ CONTEXT ━━━
Language: ${lang}
Problem: ${problemTitle || 'Unknown problem'}
${tcSection}

━━━ CODE TO ANALYZE ━━━
\`\`\`${lang}
${code}
\`\`\`

━━━ YOUR ANALYSIS TASK ━━━

STEP 1 — UNDERSTAND:
  - What algorithm/approach is being used?
  - What is the time and space complexity?
  - Is this the right approach for the problem?

STEP 2 — LINE-BY-LINE EXECUTION TRACE (for each test case):
  - Simulate the code exactly as a CPU would
  - Track every variable's value at each step
  - Identify the exact line where output diverges from expected
  - If no test cases, trace with: empty input, single element, negatives

STEP 3 — BUG HUNT (check ALL of these):
  [ ] Off-by-one errors (loop bounds, array indexing, string slicing)
  [ ] Wrong comparison operators (< vs <=, == vs ===)
  [ ] Missing return/break statements
  [ ] Uninitialized variables used before assignment
  [ ] Integer overflow / underflow
  [ ] Null/undefined/None dereference
  [ ] Incorrect base cases in recursion
  [ ] Wrong algorithm for problem type (e.g., greedy when DP needed)
  [ ] Language-specific bugs: ${specificChecks}
  [ ] Edge cases: empty input, single element, all-same elements, negatives, max constraints

STEP 4 — IF ERRORS FOUND:
  - State EXACTLY which line has the bug
  - Explain WHY it's wrong (not just what, but why it produces wrong output)
  - Provide the CORRECTED version of that specific line
  - Include a complete corrected version of the entire function in suggestedFix

STEP 5 — VERDICT (apply strictly):
  - "likely_correct": ALL test cases pass with correct trace AND no bugs found AND algorithm handles edge cases
  - "has_errors": ANY test case fails OR any logic bug found OR runtime exception possible
  - "review": no test cases provided, OR correctness uncertain, OR algorithm is overly complex

  ⚠️ NEVER say "likely_correct" if you have any doubt. Default to "review" when uncertain.

━━━ RESPONSE FORMAT ━━━
Respond ONLY with valid JSON. No markdown fences, no text before or after. JSON must be parseable by JSON.parse().

{
  "verdict": "likely_correct" | "review" | "has_errors",
  "verdictMessage": "Single concise sentence describing the verdict and main finding",
  "explanation": "3-5 sentences: what the algorithm does, whether it's correct, its complexity, and what could be improved",
  "issues": [
    {
      "type": "error" | "warning" | "info",
      "line": <line number as integer or null>,
      "msg": "Clear description of the exact bug and why it's wrong",
      "fix": "The corrected line of code or short explanation of fix"
    }
  ],
  "hints": [
    "Specific, actionable hint — not vague advice but an exact thing to check or change"
  ],
  "testResults": [
    {
      "input": "human-readable input value",
      "expected": "exact expected output",
      "actualOutput": "what your code actually produces (trace it)",
      "passed": true | false | null,
      "trace": "Step-by-step variable tracking: e.g. i=0,sum=0 → i=1,sum=3 → ... → return 6"
    }
  ],
  "suggestedFix": "Complete corrected function/code with the bugs fixed. Empty string if no bugs.",
  "timeComplexity": "O(n) or specific",
  "spaceComplexity": "O(1) or specific"
}`;
}

// ── Parse AI JSON response ────────────────────────────────────────────────────
function parseAI(raw) {
  let text = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const s = text.indexOf('{'), e = text.lastIndexOf('}');
  if (s === -1 || e === -1) throw new Error('No JSON in AI response');
  return JSON.parse(text.slice(s, e + 1));
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
