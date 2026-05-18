# 🚀 PRAGATI — Enhanced Setup Guide

## ✅ What's New in This Version

### 🎯 Practice This Round (9 New Round Pages)
- **HR Round** — Common interview questions with keyword-based feedback & sample answers
- **GD Round** — Do's & Don'ts, 8 practice topics with 2-min timer, model answers
- **Technical Round** — DBMS, OS, CN, OOPs questions with Q&A + Flashcard modes
- **Case Study** — Real-world business problems (Zomato, EdTech) with structured solving
- **System Design** — URL Shortener & Notification System with diagrams and component breakdowns
- **Project Round** — 5 mock interviewer project questions with STAR-format feedback
- **Gaming Round** — Memory Match, Pattern Recognition, Reaction Timer mini-games
- **Puzzle Round** — 4 classic puzzles (Bridge Crossing, Faulty Scale, Pirate, Poison Bottles) with hints & explanations
- **Debugging Round** — 5 buggy code snippets (JS, Python, SQL) with MCQ identification and fixed code reveal

### 📢 Announcements Fixed
- Notifications now appear correctly in the bell icon (was using wrong localStorage key)
- Bell now merges both announcements AND placement drives in the notification list
- Leaderboard badge shows correct count

### 🗓️ Placement Drives (Admin-Managed)
- Admins/faculty can create drives from the new **Placement Drives** page
- Creating a drive auto-creates an announcement for all students
- Students can browse and apply to open drives directly in the platform
- "All Companies →" in dashboard now links to the Drives page
- Countdown timer shows days remaining

### 🎯 Aptitude Practice Mode Fixed
- Practice mode now falls back to topic-only search when exact subtopic isn't found in DB
- Topic/subtopic search uses case-insensitive regex (matches regardless of casing)
- GFG and IndiaBix links were already correct — now verified working

---

## 📋 Prerequisites

- Node.js v16+ and npm
- MongoDB (local or Atlas)
- Git (optional)

---

## 🔧 One-Command Setup

### Step 1 — Install all dependencies

```bash
# From the project root
cd backend && npm install
cd ../frontend && npm install
```

### Step 2 — Configure environment variables

**Backend** — create `backend/.env`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/pragati
JWT_SECRET=pragati_super_secret_key_2024
JWT_REFRESH_SECRET=pragati_refresh_secret_2024
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

**Frontend** — create `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### Step 3 — Start MongoDB

```bash
# If running locally:
mongod --dbpath /data/db

# OR if using Atlas: update MONGO_URI in backend/.env
```

### Step 4 — Start both servers

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Server runs at http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm start
# App runs at http://localhost:3000
```

---

## 📦 One-Script Start (Windows)

Create `start.bat` in project root:
```bat
start cmd /k "cd backend && npm run dev"
start cmd /k "cd frontend && npm start"
```

## 📦 One-Script Start (Mac/Linux)

Create `start.sh` in project root:
```bash
#!/bin/bash
cd backend && npm run dev &
cd ../frontend && npm start &
wait
```
Then: `chmod +x start.sh && ./start.sh`

---

## 🌱 Seed Aptitude Questions (Important!)

If Practice Mode shows "No questions found", seed the database:

```bash
cd backend
node scripts/seed-aptitude.js
```

If the seed script doesn't exist, add questions via Admin Panel → Aptitude → Add Question.

---

## 🎮 Using New Features

### Practice This Round
1. Go to **Companies** page
2. Click any company
3. Scroll to "Recruitment Rounds" section  
4. Click **🎯 Practice** button next to any round type
5. You'll be redirected to the practice page for that round

### Direct Access
Navigate directly to:
- `/dashboard/practice/HR`
- `/dashboard/practice/GD`
- `/dashboard/practice/TECHNICAL`
- `/dashboard/practice/CASE_STUDY`
- `/dashboard/practice/SYSTEM_DESIGN`
- `/dashboard/practice/PROJECT`
- `/dashboard/practice/GAMING`
- `/dashboard/practice/PUZZLE`
- `/dashboard/practice/DEBUGGING`

### Placement Drives (Admin)
1. Log in as admin or faculty
2. Go to **Placement Drives** in the sidebar
3. Click **+ Add Drive**
4. Fill in company details
5. Click **🚀 Create Drive & Notify Students**
6. An announcement is automatically created and visible to all students

### Placement Drives (Student)
1. See drives in the Dashboard → Upcoming Drives section
2. Go to **Placement Drives** in sidebar for full list
3. Click **🚀 Apply Now** on open drives to register your interest

---

## 🗂️ New Files Added

```
backend/
  src/
    models/practice.model.js          ← PracticeRound & PracticeResponse schemas
    routes/practice.routes.js          ← GET /api/practice/:roundType, POST /submit-response
    routes/drives.routes.js            ← GET/POST /api/drives, POST /api/drives/:id/apply

frontend/src/
  pages/
    DrivesPage.js                      ← Placement Drives full page
    practice/
      PracticeRoundPage.js             ← Router — dispatches to correct round component
      PracticeComponents.js            ← Shared: RoundHeader, Card, AnswerBox, Timer, FeedbackPanel
      HRRoundPage.js                   ← 8 HR questions with keyword feedback
      GDRoundPage.js                   ← Do's/Don'ts + 8 GD topics + timed practice
      TechnicalRoundPage.js            ← DBMS/OS/CN/OOPs Q&A + Flashcard mode
      CaseStudyPage.js                 ← 2 business case studies (Zomato, EdTech)
      SystemDesignPage.js              ← URL Shortener + Notification System design
      ProjectRoundPage.js              ← 5 project interview questions
      GamingRoundPage.js               ← Memory Match + Pattern + Reaction Timer
      PuzzleRoundPage.js               ← 4 classic puzzles with hints
      DebuggingRoundPage.js            ← 5 buggy code MCQs with fixed code

Modified files:
  backend/src/server.js               ← +2 new routes registered
  backend/src/models/index.js         ← +PlacementDrive model
  backend/src/routes/aptitude.routes.js ← Case-insensitive regex matching
  frontend/src/App.js                 ← +DrivesPage route
  frontend/src/pages/DashboardLayout.js ← +Drives nav + fixed notification key
  frontend/src/pages/AptitudePage.js  ← Fixed handleStartPractice fallback
```

---

## 🛠️ Troubleshooting

| Problem | Fix |
|---------|-----|
| Aptitude practice shows "No questions" | Seed questions or add via Admin Panel. Topic names in DB must contain the category keywords. |
| Announcements not showing | Make sure faculty/admin creates announcements via Admin Panel. Check browser console for API errors. |
| Drives page empty | Log in as admin/faculty and create a drive first. |
| Practice round pages show 404 | Ensure you're at `/dashboard/practice/HR` (not `/practice/HR`). |
| GFG/IndiaBix links don't open | Check browser popup blocker settings. Links open in new tab. |
