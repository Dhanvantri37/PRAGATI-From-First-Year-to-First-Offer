@echo off
echo Starting PRAGATI Platform...
echo.

if not exist "backend\node_modules" (
  echo Installing backend dependencies...
  cd backend && npm install && cd ..
)

if not exist "frontend\node_modules" (
  echo Installing frontend dependencies...
  cd frontend && npm install && cd ..
)

echo.
echo Starting Backend on http://localhost:5000 ...
start "PRAGATI Backend" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak >nul

echo Starting Frontend on http://localhost:3000 ...
start "PRAGATI Frontend" cmd /k "cd frontend && npm start"

echo.
echo Both servers starting. Close the terminal windows to stop.
pause
