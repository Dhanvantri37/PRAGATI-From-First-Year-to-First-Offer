@echo off
REM ═══════════════════════════════════════════════════════════════════════════
REM  PRAGATI — One-Shot Setup Script (Windows)
REM ═══════════════════════════════════════════════════════════════════════════

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║         PRAGATI — Career Readiness Platform          ║
echo ║            Enhanced Setup Script v2.0 (Win)          ║
echo ╚══════════════════════════════════════════════════════╝
echo.

SET ROOT=%~dp0
SET BACKEND=%ROOT%backend
SET FRONTEND=%ROOT%frontend

REM ── Check .env ──────────────────────────────────────────────────────────────
IF NOT EXIST "%BACKEND%\.env" (
  echo [ERROR] backend\.env not found!
  echo.
  echo Please create backend\.env with:
  echo   PORT=5000
  echo   MONGO_URI=mongodb+srv://...
  echo   JWT_SECRET=your_secret
  echo   ANTHROPIC_API_KEY=sk-ant-...
  echo.
  pause
  exit /b 1
)
echo [OK] backend\.env found

REM ── Install backend deps ────────────────────────────────────────────────────
echo.
echo [1/4] Installing backend dependencies...
cd /d "%BACKEND%"
call npm install --legacy-peer-deps
IF ERRORLEVEL 1 ( echo [FAIL] Backend install failed & pause & exit /b 1 )
echo [OK] Backend dependencies installed

REM ── Install frontend deps ───────────────────────────────────────────────────
echo.
echo [2/4] Installing frontend dependencies...
cd /d "%FRONTEND%"
call npm install --legacy-peer-deps
IF ERRORLEVEL 1 ( echo [FAIL] Frontend install failed & pause & exit /b 1 )
echo [OK] Frontend dependencies installed

REM ── Seed database ──────────────────────────────────────────────────────────
echo.
echo [3/4] Seeding database...
cd /d "%BACKEND%"
echo   Seeding demo users...
node src\utils\demo-seeder.js
echo   Seeding aptitude questions...
node src\utils\aptitude-seed-full.js
echo   Seeding company data...
node src\utils\companySeed.js
echo   Seeding DSA problems...
node src\utils\leetcode-problems-seed.js
echo   Seeding practice round content...
node src\utils\practice-rounds-seed.js
echo   Seeding practice round content...
node src\utils\practice-rounds-seed.js
echo [OK] Database seeded

REM ── Start servers ──────────────────────────────────────────────────────────
echo.
echo [4/4] Starting servers...
echo.
echo  Backend  : http://localhost:5000
echo  Frontend : http://localhost:3000
echo.
echo  Default accounts:
echo    Admin   : admin@pragati.com   / Admin@123
echo    Faculty : faculty@pragati.com / Faculty@123
echo    Student : student@pragati.com / Student@123
echo.
echo Starting backend in new window...
start "PRAGATI Backend" cmd /k "cd /d %BACKEND% && npm run dev"

timeout /t 3 /nobreak > nul

echo Starting frontend in new window...
start "PRAGATI Frontend" cmd /k "cd /d %FRONTEND% && npm start"

echo.
echo Both servers started in separate windows.
echo Close those windows to stop the servers.
pause
