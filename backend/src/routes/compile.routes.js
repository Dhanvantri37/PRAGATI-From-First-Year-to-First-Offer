const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// POST /api/compile
router.post('/', authenticate, async (req, res) => {
  const { language, code, input } = req.body;
  if (!code) return res.status(400).json({ error: 'Code is required' });

  // Currently supporting 'javascript' and 'python'
  let ext = '';
  let execCommand = '';
  if (language === 'javascript' || language === 'nodejs' || language === 'js') {
    ext = 'js';
    execCommand = 'node Solution.js < input.txt';
  } else if (language === 'python' || language === 'python3') {
    ext = 'py';
    execCommand = 'python3 Solution.py < input.txt';
  } else if (language === 'java') {
    ext = 'java';
    execCommand = 'java Solution.java < input.txt';
  } else if (language === 'c++' || language === 'cpp' || language === 'c') {
    ext = 'cpp';
    execCommand = 'g++ Solution.cpp -o Solution && ./Solution < input.txt';
  } else {
    return res.status(400).json({ error: 'Unsupported language. Supported: javascript, python, java, c++' });
  }

  // Ensure temp dir exists
  const tempDir = path.join(__dirname, '../../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const reqId = `run_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const runDir = path.join(tempDir, reqId);
  if (!fs.existsSync(runDir)) {
    fs.mkdirSync(runDir, { recursive: true });
  }

  const filepath = path.join(runDir, `Solution.${ext}`);
  const inputpath = path.join(runDir, `input.txt`);

  try {
    // Write code to file
    fs.writeFileSync(filepath, code);
    fs.writeFileSync(inputpath, input || '');

    // Execute
    exec(execCommand, { cwd: runDir, timeout: 30000 }, (error, stdout, stderr) => {
      // Clean up directory
      if (fs.existsSync(runDir)) {
        fs.rmSync(runDir, { recursive: true, force: true });
      }

      if (error) {
        if (error.killed) {
          return res.json({ output: 'Time Limit Exceeded (30 seconds) - The code took too long to run. Please check for infinite loops or optimize your logic.' });
        }
        return res.json({ output: stderr || stdout || error.message });
      }

      res.json({ output: stdout || stderr });
    });
  } catch (err) {
    if (fs.existsSync(runDir)) fs.rmSync(runDir, { recursive: true, force: true });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
