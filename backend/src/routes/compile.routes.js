const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// POST /api/compile
router.post('/', authenticate, async (req, res) => {
  const { language, code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code is required' });

  // Currently supporting 'javascript' and 'python'
  let ext = '';
  let command = '';
  if (language === 'javascript' || language === 'nodejs' || language === 'js') {
    ext = 'js';
    command = 'node';
  } else if (language === 'python' || language === 'python3') {
    ext = 'py';
    command = 'python'; // or python3 depending on env
  } else {
    return res.status(400).json({ error: 'Unsupported language. Supported: javascript, python' });
  }

  // Ensure temp dir exists
  const tempDir = path.join(__dirname, '../../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const filename = `code_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const filepath = path.join(tempDir, filename);

  try {
    // Write code to file
    fs.writeFileSync(filepath, code);

    // Execute
    exec(`${command} ${filepath}`, { timeout: 5000 }, (error, stdout, stderr) => {
      // Clean up
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }

      if (error) {
        if (error.killed) {
          return res.json({ output: 'Error: Execution Timed Out (5s limit)' });
        }
        return res.json({ output: stderr || stdout || error.message });
      }

      res.json({ output: stdout || stderr });
    });
  } catch (err) {
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
