#!/bin/bash
echo "🚀 Starting PRAGATI Platform..."
echo ""

# Check if node_modules exist
if [ ! -d "backend/node_modules" ]; then
  echo "📦 Installing backend dependencies..."
  cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  cd frontend && npm install && cd ..
fi

echo ""
echo "✅ Starting servers..."
echo "   Backend  → http://localhost:5000"
echo "   Frontend → http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start both in parallel
(cd backend && npm run dev) &
BACKEND_PID=$!

(cd frontend && npm start) &
FRONTEND_PID=$!

# Wait and handle Ctrl+C
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

wait
