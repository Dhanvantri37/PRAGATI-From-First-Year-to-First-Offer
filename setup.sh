#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  PRAGATI — One-Shot Setup Script
#  Installs dependencies, seeds the DB, and starts both servers
# ═══════════════════════════════════════════════════════════════════════════════

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT_DIR/backend"
FRONTEND="$ROOT_DIR/frontend"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_step() { echo -e "\n${BLUE}▶ $1${NC}"; }
print_ok()   { echo -e "${GREEN}✅ $1${NC}"; }
print_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║         PRAGATI — Career Readiness Platform          ║"
echo "║              Enhanced Setup Script v2.0              ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ── Step 1: Check .env ───────────────────────────────────────────────────────
print_step "Checking backend .env file…"
if [ ! -f "$BACKEND/.env" ]; then
  echo -e "${RED}❌  backend/.env not found!${NC}"
  echo ""
  echo "Please create $BACKEND/.env with the following content:"
  echo "------------------------------------------------------"
  cat << 'ENVTEMPLATE'
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/pragati?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_here
JWT_REFRESH_SECRET=your_refresh_secret_here
ANTHROPIC_API_KEY=sk-ant-...
NODE_ENV=development
ENVTEMPLATE
  echo "------------------------------------------------------"
  exit 1
fi
print_ok "backend/.env found"

# ── Step 2: Backend deps ─────────────────────────────────────────────────────
print_step "Installing backend dependencies…"
cd "$BACKEND"
npm install --legacy-peer-deps
print_ok "Backend dependencies installed"

# ── Step 3: Frontend deps ────────────────────────────────────────────────────
print_step "Installing frontend dependencies…"
cd "$FRONTEND"
npm install --legacy-peer-deps
print_ok "Frontend dependencies installed"

# ── Step 4: Seed Database ───────────────────────────────────────────────────
print_step "Seeding database…"
cd "$BACKEND"

echo "  → Seeding demo users (admin, faculty, student)…"
node src/utils/demo-seeder.js 2>&1 | tail -5 || print_warn "Demo seeder had warnings (may be OK if already seeded)"

echo "  → Seeding aptitude question bank (500+ questions)…"
node src/utils/aptitude-seed-full.js 2>&1 | tail -5 || print_warn "Aptitude seed had warnings"

echo "  → Seeding company data…"
node src/utils/companySeed.js 2>&1 | tail -5 || print_warn "Company seed had warnings"

echo "  → Seeding DSA problems…"
node src/utils/leetcode-problems-seed.js 2>&1 | tail -5 || print_warn "Problems seed had warnings"

echo "  → Seeding practice round content (HR, GD, Technical, Puzzles, Debugging)…"
node src/utils/practice-rounds-seed.js 2>&1 | tail -5 || print_warn "Practice rounds seed had warnings"

echo "  → Seeding practice round content (HR, GD, Technical, Puzzles, etc.)…"
node src/utils/practice-rounds-seed.js 2>&1 | tail -5 || print_warn "Practice rounds seed had warnings"

print_ok "Database seeded"

# ── Step 5: Start both servers ───────────────────────────────────────────────
print_step "Starting servers…"
echo ""
echo -e "${YELLOW}Both servers will start. Use Ctrl+C to stop both.${NC}"
echo ""
echo -e "  📡 Backend:  http://localhost:5000"
echo -e "  🌐 Frontend: http://localhost:3000"
echo ""
echo -e "  📱 Default accounts:"
echo -e "     Admin:   admin@pragati.com    / Admin@123"
echo -e "     Faculty: faculty@pragati.com  / Faculty@123"
echo -e "     Student: student@pragati.com  / Student@123"
echo ""

# Use concurrently if available, otherwise use background processes
if command -v concurrently &> /dev/null; then
  cd "$ROOT_DIR"
  concurrently --kill-others-on-fail \
    --prefix "[{name}]" \
    --names "BACKEND,FRONTEND" \
    --prefix-colors "blue,green" \
    "cd backend && npm run dev" \
    "cd frontend && npm start"
else
  # Start backend in background
  cd "$BACKEND"
  npm run dev &
  BACKEND_PID=$!
  echo "Backend started (PID: $BACKEND_PID)"

  # Wait for backend to start
  sleep 3

  # Start frontend
  cd "$FRONTEND"
  npm start &
  FRONTEND_PID=$!
  echo "Frontend started (PID: $FRONTEND_PID)"

  # Wait for Ctrl+C
  echo ""
  echo "Press Ctrl+C to stop all servers"
  trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT
  wait
fi
