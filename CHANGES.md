# PRAGATI Enhancement — Change Log
## Version 2.0 — Student Dashboard Improvements

---

## 🆕 NEW FEATURES ADDED

### 1. "Practice This Round" — Full Implementation
**Route:** `/dashboard/practice/:roundType`

Nine complete practice round pages, each with rich interactive content:

| Round | Route | Features |
|-------|-------|---------|
| 🟣 HR | `/practice/HR` | 8 common HR questions, keyword-based feedback, sample answers |
| 🔵 GD | `/practice/GD` | Do's & Don'ts, 8 GD topics, timed practice mode, model answers |
| 🟠 Technical | `/practice/TECHNICAL` | 4 subjects (DBMS/OS/CN/OOPs), Q&A + Flashcard mode |
| 🟡 Case Study | `/practice/CASE_STUDY` | 2 real-world problems, 4-section structured format |
| 🟤 System Design | `/practice/SYSTEM_DESIGN` | 2 design problems with architecture diagrams |
| ⚫ Project | `/practice/PROJECT` | 5 mock interview questions with tips + sample answers |
| 🎮 Gaming | `/practice/GAMING` | Memory Match, Pattern Recognition, Reaction Timer |
| 🧩 Puzzle | `/practice/PUZZLE` | 4 logical puzzles with hints and step-by-step explanations |
| 🐞 Debugging | `/practice/DEBUGGING` | 5 buggy code snippets, MCQ-style bug identification |

**How to access:** Go to Companies → select any company → view Recruitment Rounds → click **🎯 Practice** next to any round.

---

### 2. Placement Drives Management System
**Route:** `/dashboard/drives`

**For Students:**
- View all placement drives (open / upcoming / closed)
- Apply to drives with one click
- See drive details: company, role, CTC, dates, eligibility
- Days countdown to drive date
- Applied badge on submitted applications

**For Admin/Faculty:**
- Create new placement drives with full details
- When a drive is created → an announcement is **automatically created** and visible to all students
- Delete drives

---

### 3. Announcements → Now Fully Functional
- Announcements created by faculty/admin are now visible in the Dashboard Announcements section
- Drive creation auto-generates announcements
- Notification bell (🔔) in the top bar now counts **both** announcements and new drives
- Unified `localStorage` key (`pragati_notif_seen`) ensures count is consistent across all pages

---

### 4. Notification Badge — Fixed & Enhanced
- Badge on the 🏆 Leaderboard button now correctly shows unseen announcements + new drives
- `pragati_notif_seen` timestamp is set when user clicks Leaderboard (marking all as seen)
- Notification bell in header also shows combined count

---

## 🐛 BUGS FIXED

### 5. Aptitude Practice Mode — Questions Now Load
**Root cause:** The frontend `TOPIC_SUBTOPICS` used category names like `'Quantitative Aptitude'`, but the database stores `topic: 'Quantitative'` (short form). The RegEx filter never matched.

**Fix:** Updated `TOPIC_SUBTOPICS` to use the exact DB topic names:
- `'Quantitative Aptitude'` → `'Quantitative'`
- `'Logical Reasoning'` → `'Logical'`  
- `'Verbal Ability'` → `'Verbal'`
- `'DSA Aptitude'` → `'DSA'`

Added `TOPIC_LABELS` map for displaying friendly names in the UI without breaking the API filter.

Added fallback: if subtopic returns 0 results, falls back to topic-only search automatically.

### 6. GFG & IndiaBix Links
- Links were already correct in code but needed the Practice Mode to be working first (fixed above)
- GFG/IndiaBix badges now visible on each subtopic card
- Both open in new tabs correctly

### 7. "All Companies →" Dashboard Button
- Now shows two buttons: **All Drives →** (goes to new Drives page) and **Companies →**

---

## 📁 FILES CHANGED / ADDED

### New Backend Files:
```
backend/src/routes/practice.routes.js     ← Practice round API
backend/src/routes/drives.routes.js       ← Placement drives CRUD
backend/src/models/practice.model.js      ← PracticeRound + PracticeResponse schemas
backend/src/models/index.js              ← Added PlacementDrive schema
backend/src/server.js                    ← Registered new routes
```

### New Frontend Files:
```
frontend/src/pages/DrivesPage.js                         ← Placement Drives page
frontend/src/pages/practice/PracticeRoundPage.js         ← Router for all round types
frontend/src/pages/practice/PracticeComponents.js        ← Shared UI components
frontend/src/pages/practice/HRRoundPage.js
frontend/src/pages/practice/GDRoundPage.js
frontend/src/pages/practice/TechnicalRoundPage.js
frontend/src/pages/practice/CaseStudyPage.js
frontend/src/pages/practice/SystemDesignPage.js
frontend/src/pages/practice/ProjectRoundPage.js
frontend/src/pages/practice/GamingRoundPage.js
frontend/src/pages/practice/PuzzleRoundPage.js
frontend/src/pages/practice/DebuggingRoundPage.js
```

### Modified Frontend Files:
```
frontend/src/App.js                 ← Added DrivesPage import + route
frontend/src/pages/DashboardLayout.js   ← Added Drives nav item, fixed notifications
frontend/src/pages/DashboardHome.js     ← Fixed localStorage key, added Drives button
frontend/src/pages/AptitudePage.js      ← Fixed TOPIC_SUBTOPICS keys + TOPIC_LABELS
```

---

## 🚀 HOW TO RUN

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (or local MongoDB)
- Anthropic API key (for SkillPath AI)

### Quick Start
```bash
# 1. Ensure backend/.env is configured (see backend/.env.example)

# 2. Run the setup script (Mac/Linux):
chmod +x setup.sh
./setup.sh

# Windows:
setup.bat
```

### Manual Start
```bash
# Terminal 1 — Backend:
cd backend
npm install
npm run dev

# Terminal 2 — Frontend:
cd frontend
npm install
npm start
```

### Seeding the Database
```bash
cd backend
node src/utils/demo-seeder.js          # Creates test accounts
node src/utils/aptitude-seed-full.js   # 500+ aptitude questions
node src/utils/companySeed.js          # Company data
node src/utils/leetcode-problems-seed.js  # DSA problems
```

### Default Login Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@pragati.com | Admin@123 |
| Faculty | faculty@pragati.com | Faculty@123 |
| Student | student@pragati.com | Student@123 |

---

## ✅ WHAT WAS NOT CHANGED

The following were **intentionally left unchanged** as they were working correctly:
- Quiz Mode (aptitude)
- SkillPath AI
- Coding Practice (Daily Practice)
- Notes
- Discussions
- Company readiness scoring
- Leaderboard modal
- Auth (login/register/JWT)
- Admin Panel
