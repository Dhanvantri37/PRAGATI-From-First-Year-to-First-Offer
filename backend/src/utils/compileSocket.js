const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function registerCompileSocket(io) {
  const compileNamespace = io.of('/compile');

  compileNamespace.on('connection', (socket) => {
    let currentProcess = null;
    let runDir = null;
    let timeoutId = null;
    const MAX_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

    const cleanup = () => {
      if (currentProcess) {
        currentProcess.kill('SIGKILL');
        currentProcess = null;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (runDir && fs.existsSync(runDir)) {
        try {
          fs.rmSync(runDir, { recursive: true, force: true });
        } catch (e) {
          console.error('Error cleaning up run directory:', e);
        }
        runDir = null;
      }
    };

    const resetTimeout = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (currentProcess) {
          socket.emit('output', `\n\n[Time Limit Exceeded (${MAX_TIMEOUT_MS / 1000} seconds)]`);
          cleanup();
        }
      }, MAX_TIMEOUT_MS);
    };

    socket.on('disconnect', () => {
      cleanup();
    });

    socket.on('stop_execution', () => {
      cleanup();
      socket.emit('execution_stopped', 'Execution forcibly stopped.');
    });

    socket.on('start_execution', ({ code, language }) => {
      cleanup(); // Kill any existing running process for this socket

      if (!code) {
        socket.emit('error', 'Code is required');
        return;
      }

      let ext = '';
      let command = '';
      let args = [];

      if (language === 'javascript' || language === 'nodejs' || language === 'js') {
        ext = 'js';
        command = 'node';
        args = ['Solution.js'];
      } else if (language === 'python' || language === 'python3') {
        ext = 'py';
        command = 'python3'; // Use python3 or python depending on env. Assuming python3 is available.
        args = ['-u', 'Solution.py']; // -u for unbuffered stdout so it streams immediately
      } else if (language === 'java') {
        ext = 'java';
        command = 'java';
        args = ['Solution.java'];
      } else if (language === 'c++' || language === 'cpp' || language === 'c') {
        ext = 'cpp';
        // Note: For C++, we need to compile first then run.
        // It's safer to just run bash to chain them or compile synchronously then spawn the executable.
        command = 'bash';
        args = ['-c', 'g++ Solution.cpp -o Solution && ./Solution'];
      } else {
        socket.emit('error', 'Unsupported language');
        return;
      }

      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const reqId = `run_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      runDir = path.join(tempDir, reqId);
      
      try {
        fs.mkdirSync(runDir, { recursive: true });
        const filepath = path.join(runDir, `Solution.${ext}`);
        fs.writeFileSync(filepath, code);

        currentProcess = spawn(command, args, { cwd: runDir });

        currentProcess.stdout.on('data', (data) => {
          socket.emit('output', data.toString());
        });

        currentProcess.stderr.on('data', (data) => {
          socket.emit('output', data.toString());
        });

        currentProcess.on('close', (code) => {
          socket.emit('execution_finished', `\n[Process exited with code ${code}]`);
          cleanup();
        });

        currentProcess.on('error', (err) => {
          socket.emit('output', `\n[Error starting process: ${err.message}]`);
          cleanup();
        });

        // Initialize idle timeout
        resetTimeout();

      } catch (err) {
        socket.emit('error', 'Failed to start execution: ' + err.message);
        cleanup();
      }
    });

    socket.on('input', (data) => {
      if (currentProcess && currentProcess.stdin && currentProcess.stdin.writable) {
        currentProcess.stdin.write(data + '\n');
        resetTimeout(); // Reset the timeout every time user interacts
      }
    });
  });
}

module.exports = { registerCompileSocket };
