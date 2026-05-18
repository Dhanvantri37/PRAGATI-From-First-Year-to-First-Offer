<div align="center">

<img src="frontend/public/logo.png" alt="PRAGATI Logo" width="160"/>

# PRAGATI
### Campus Placement Intelligence System

[![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react&logoColor=white)](https://reactjs.org)
[![Node.js](https://img.shields.io/badge/Node.js-18-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python-3.10-3776ab?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0-47a248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ed?style=flat-square&logo=docker&logoColor=white)](https://docker.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

> A full-stack, AI-powered campus placement preparation platform — combining resume analysis, adaptive skill-gap learning, daily DSA challenges, aptitude practice, and placement analytics in one unified system.

*Mini Project · Department of Computer Science (AI & ML) · KIT's College of Engineering, Kolhapur*

</div>

---

## Table of Contents

1. [Overview](#overview)
2. [Core Features](#core-features)
3. [System Architecture](#system-architecture)
4. [SkillPath AI Pipeline](#skillpath-ai-pipeline)
5. [User Roles](#user-roles)
6. [Tech Stack](#tech-stack)
7. [Project Structure](#project-structure)
8. [Getting Started](#getting-started)
9. [Environment Variables](#environment-variables)
10. [Seeding the Database](#seeding-the-database)
11. [API Reference](#api-reference)
12. [ML Service](#ml-service)
13. [Troubleshooting](#troubleshooting)

---

## Overview

PRAGATI replaces the fragmented experience of juggling LeetCode, random aptitude apps, WhatsApp note-sharing, and YouTube mock interviews. Everything lives in one system, personalised to each student's current skill level and target company.

Its centrepiece is **SkillPath AI v2** — a multi-stage NLP pipeline that parses a student's resume, compares it against a job description, scores ATS readiness section-by-section, classifies skill gaps by importance and market demand, and generates a dependency-aware phased learning pathway using a NetworkX DAG.

**Interview Prep** (powered by Groq `llama-3.1-8b-instant` → Gemini fallback) generates personalised technical questions, mock interviews with real-time voice feedback, and topic deep-dives tailored to each student's identified gaps.

---

## Core Features

### For Students

| Feature | Description |
|---|---|
| **SkillPath AI** | Upload resume + paste JD → get ATS score, skill gap analysis, and phased learning pathway |
| **Daily DSA Problem** | One LeetCode problem assigned every 24 hours (200+ real problems with direct links) |
| **Streak Tracking** | Consecutive solve streak with badges at 7, 30, and 100 days |
| **Aptitude Practice** | 2,000+ questions across Quantitative, Logical Reasoning, and Verbal Ability with GFG/IndiaBix links |
| **Interview Prep** | AI-generated mock interviews, HR rounds, and topic-based Q&A |
| **Company Research** | Detailed profiles for 15+ companies — CTC, rounds, patterns, prep tips |
| **Discussion Forum** | Doubt-posting with subject tagging and faculty resolution |
| **Smart Notes** | Rich-text notes with Markdown support, organized by subject |
| **Leaderboard** | Live ranking by ATS score, streak, and problems solved |

### For Faculty / Admin

| Feature | Description |
|---|---|
| **Student Analytics** | Department-wise ATS trends, skill gap heatmaps, at-risk student flagging |
| **Problem Management** | Add, edit, remove DSA problems and aptitude questions |
| **Placement Dashboard** | Company visit tracking, placement statistics, offer breakdown |
| **Announcement System** | Broadcast notices to all students or specific branches |
| **Student Profiles** | Full view of any student's resume skills, gap analysis, and activity |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser / Mobile                         │
│                  React 18  ·  Nginx (prod)                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────────────┐
│                   Node.js / Express API                          │
│              JWT Auth  ·  Rate Limiting  ·  Helmet              │
│   REST endpoints for auth, problems, aptitude, skillpath,       │
│   companies, notes, discussions, analytics, announcements       │
└──────┬──────────────────┬───────────────────┬───────────────────┘
       │                  │                   │
┌──────▼──────┐  ┌────────▼────────┐  ┌──────▼──────────────┐
│  MongoDB    │  │  FastAPI ML     │  │  Java Resume Parser  │
│  (primary   │  │  Service        │  │  (Spring Boot)       │
│   database) │  │  Python 3.10    │  │  PDF → structured    │
│             │  │  spaCy · NumPy  │  │  JSON text           │
│  Mongoose   │  │  NetworkX       │  └──────────────────────┘
│  ODM        │  │  scikit-learn   │
└─────────────┘  └────────┬────────┘
                          │
              ┌───────────▼────────────┐
              │   AI Providers         │
              │   Groq (primary)       │
              │   Gemini (fallback)    │
              │   Anthropic (debug)    │
              └────────────────────────┘
```

All four services are orchestrated with **Docker Compose** and can be started with a single command.

---

## SkillPath AI Pipeline

The SkillPath AI service (`ml-service/`) implements a 6-stage pipeline:

```
Resume PDF ──► Text Extraction ──► Skill Extraction ──► Gap Analysis
                                         │                    │
                                   3-pass NLP:         Priority Score:
                                   1. Exact match       gap_score (0–10)
                                   2. N-gram match    + importance weight
                                   3. TF-IDF cosine   + market frequency
                                      similarity       + unlock factor
                                   (confidence 0–1)   - depth penalty
                                         │                    │
                                         └─────────┬──────────┘
                                                   ▼
                                        Dependency DAG (NetworkX)
                                        Topological sort ensures
                                        prereqs come before advanced
                                                   │
                                                   ▼
                                     Load-Balanced Phase Assignment
                                     Phase 1: Critical Foundations (≤40h)
                                     Phase 2: Core Competency  (≤50h)
                                     Phase 3: Role Proficiency (≤60h)
                                     Phase 4: Advanced Mastery (unlimited)
                                                   │
                                                   ▼
                                     ATS Score · Skill Gap Report
                                     Learning Pathway · Reasoning Trace
```

### Priority Scoring Formula

Each skill gap is scored using:

```
priority = 0.30 × gap_score_norm
         + 0.28 × importance_weight
         + 0.20 × market_frequency
         + 0.15 × unlock_factor
         − 0.07 × depth_penalty
```

Where:
- **gap_score_norm** — normalised level delta (0–1)
- **importance_weight** — critical=1.0, important=0.75, nice-to-have=0.45
- **market_frequency** — frequency of skill in Indian tech JDs (empirically sourced)
- **unlock_factor** — how many other gap skills this skill is a prerequisite for
- **depth_penalty** — penalises skills deep in the dependency tree (learn shallow first)

---

## User Roles

| Role | Capabilities |
|---|---|
| `student` | Access all learning features, view own analytics |
| `faculty` | All student capabilities + manage problems, view department analytics |
| `admin` | All faculty capabilities + manage companies, users, announcements |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Context API, CSS-in-JS |
| **Backend** | Node.js 18, Express 4, JWT, Helmet, express-rate-limit |
| **Database** | MongoDB 6 (Mongoose ODM) |
| **ML Service** | Python 3.10, FastAPI, spaCy, NumPy, scikit-learn, NetworkX |
| **Resume Parser** | Java 17, Spring Boot, Apache Tika |
| **AI Providers** | Groq (llama-3.1-8b-instant), Google Gemini, Anthropic Claude |
| **Infrastructure** | Docker, Docker Compose, Nginx |
| **File Storage** | Cloudinary (resume PDFs) |

---

## Project Structure

```
PRAGATI/
├── frontend/                          # React 18 SPA
│   ├── public/
│   │   └── logo.png
│   └── src/
│       ├── components/
│       │   ├── common/
│       │   │   └── PragatiLogo.js
│       │   └── skillpath/
│       │       ├── AtsGauge.js        # ATS score radial gauge
│       │       ├── EligibilityBadge.js
│       │       ├── PathwayView.js     # Learning phase cards
│       │       ├── SkillGapPanel.js
│       │       ├── SkillPathModule.js # Main SkillPath UI
│       │       └── UploadSection.js
│       ├── context/
│       │   └── AuthContext.js         # JWT auth context
│       └── pages/
│           ├── AptitudePage.js        # Quiz + browse + bookmarks
│           ├── CompaniesPage.js       # Company research & comparison
│           ├── DashboardHome.js       # Main dashboard + leaderboard
│           ├── DashboardLayout.js     # Sidebar navigation
│           ├── DiscussionsPage.js     # Doubt forum
│           ├── InterviewPrepPage.js   # AI mock interviews
│           ├── NotesPage.js           # Smart notes
│           ├── ProblemsPage.js        # DSA daily + problem bank
│           ├── AdminPage.js           # Admin panel
│           ├── LoginPage.js
│           └── RegisterPage.js
│
├── backend/                           # Node.js / Express API
│   └── src/
│       ├── middleware/
│       │   └── auth.middleware.js     # JWT verify + role check
│       ├── models/
│       │   ├── index.js               # All Mongoose schemas
│       │   └── User.model.js
│       ├── routes/
│       │   ├── auth.routes.js
│       │   ├── problem.routes.js      # DSA problems + streak
│       │   ├── aptitude.routes.js     # Quiz + bookmarks
│       │   ├── skillpath.routes.js    # Resume analysis
│       │   ├── company.routes.js
│       │   ├── analytics.routes.js
│       │   ├── discussion.routes.js
│       │   ├── interview.routes.js
│       │   ├── note.routes.js
│       │   ├── announcement.routes.js
│       │   ├── application.routes.js
│       │   ├── debug.routes.js        # AI code debugger
│       │   └── directmessage.routes.js
│       ├── utils/
│       │   ├── seeder.js              # Master seed (companies + aptitude)
│       │   ├── companySeed.js         # Company data + logos
│       │   ├── aptitude-seed-full.js  # 2000+ aptitude questions
│       │   └── leetcode-problems-seed.js  # 200+ real LeetCode problems ★
│       └── server.js
│
├── ml-service/                        # Python FastAPI ML service
│   ├── app/
│   │   ├── main.py                    # API endpoints
│   │   ├── schemas.py
│   │   └── services/
│   │       ├── extractor.py           # 3-pass NLP skill extraction ★
│   │       ├── pathway.py             # Enhanced ML pathway engine ★
│   │       ├── extras.py              # ATS scoring, job recommendations
│   │       └── parser.py             # PDF/DOCX text extraction
│   ├── data/
│   │   └── skill_taxonomy.json        # 500+ skills with aliases + prereqs
│   └── requirements.txt
│
├── resume-parser/                     # Java Spring Boot service
│   └── src/main/java/com/pragati/
│       ├── controller/ResumeController.java
│       ├── service/ResumeParserService.java
│       └── model/ParsedResume.java
│
├── datasets/                          # ML training scripts
│   ├── train_all_models.py
│   └── train_placement_model.py
│
├── docs/
│   ├── HOW_TO_RUN.md
│   ├── DATABASE_CONNECTION.md
│   └── DATASETS_AND_MODELS.md
│
├── docker-compose.yml
├── .env.example
└── README.md
```

*Files marked ★ were added or significantly enhanced in v2.*

---

## Getting Started

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Backend + Frontend |
| Python | 3.10+ | ML service |
| Java | 17+ | Resume parser |
| MongoDB | 6.0+ | Database |
| Docker | 24+ | Container orchestration |

### Option A — Docker Compose (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/your-org/pragati.git
cd pragati

# 2. Copy and fill in environment variables
cp .env.example .env
# Edit .env with your MongoDB URI, API keys, Cloudinary credentials

# 3. Start all services
docker-compose up --build

# 4. Seed the database (run once, in a separate terminal)
docker exec -it pragati-backend node src/utils/seeder.js
docker exec -it pragati-backend node src/utils/leetcode-problems-seed.js
```

Services will be available at:

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| ML Service | http://localhost:8000 |
| Resume Parser | http://localhost:8080 |
| API Docs (FastAPI) | http://localhost:8000/docs |

---

### Option B — Manual Setup

**Backend**

```bash
cd backend
npm install
cp .env.example .env    # fill in values
npm run dev             # starts on port 5000
```

**Frontend**

```bash
cd frontend
npm install
npm start               # starts on port 3000
```

**ML Service**

```bash
cd ml-service
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
uvicorn app.main:app --reload --port 8000
```

**Resume Parser**

```bash
cd resume-parser
./mvnw spring-boot:run            # starts on port 8080
```

---

## Environment Variables

### Backend (`backend/.env`)

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/pragati

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# Cloudinary (resume file storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# AI Providers
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# ML Service URL
ML_SERVICE_URL=http://localhost:8000

# Resume Parser URL
RESUME_PARSER_URL=http://localhost:8080
```

### ML Service (`ml-service/.env`)

```env
ANTHROPIC_API_KEY=your_anthropic_api_key
```

---

## Seeding the Database

Run these commands once after setting up your database. Each script is safe to re-run — it upserts rather than duplicating.

```bash
cd backend

# Seed companies, aptitude questions, and placeholder problems
npm run seed

# Seed 200+ real LeetCode problems with direct URLs and company tags
npm run seed:problems

# Or run everything in one go
npm run seed:all
```

**Available seed scripts:**

| Script | Command | Description |
|---|---|---|
| Full seed | `npm run seed` | Companies, aptitude questions, roles |
| LeetCode problems | `npm run seed:problems` | 200+ real problems with URLs, constraints, company tags |
| Aptitude only | `npm run seed:aptitude` | 2,000+ aptitude questions |
| All | `npm run seed:all` | Runs `seed` then `seed:problems` |

---

## API Reference

All endpoints are prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Register a new student |
| `POST` | `/api/auth/login` | No | Login and receive JWT |
| `GET` | `/api/auth/me` | Yes | Get current user profile |

### Problems (DSA)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/problems/daily` | Yes | Get today's assigned problem + hours until next |
| `POST` | `/api/problems/shuffle` | Yes | Swap today's problem for an easier one (once/day) |
| `POST` | `/api/problems/:id/solve` | Yes | Submit solution code and update streak |
| `POST` | `/api/problems/:id/attempt` | Yes | Mark problem as attempted |
| `GET` | `/api/problems/history` | Yes | Last 90 problem assignments |
| `GET` | `/api/problems/stats` | Yes | Solve counts by topic and difficulty |
| `GET` | `/api/problems` | Yes | Browse all problems (filter by difficulty, topic, source) |
| `POST` | `/api/problems` | Admin/Faculty | Add a new problem |
| `DELETE` | `/api/problems/:id` | Admin | Remove a problem |

### Aptitude

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/aptitude/topics` | Yes | All topics with subtopic map and question counts |
| `GET` | `/api/aptitude` | Yes | Paginated question list (filter by topic, subtopic, company, difficulty) |
| `GET` | `/api/aptitude/set` | Yes | Random quiz set of 10 questions |
| `POST` | `/api/aptitude/submit` | Yes | Submit quiz answers and record results |
| `GET` | `/api/aptitude/stats` | Yes | Accuracy breakdown by topic |
| `GET` | `/api/aptitude/history` | Yes | Past 100 attempts |
| `POST` | `/api/aptitude/bookmark/:id` | Yes | Toggle bookmark on a question |
| `GET` | `/api/aptitude/bookmarks` | Yes | All bookmarked questions |

### SkillPath AI

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/skillpath/analyze` | Yes | Run full resume vs JD analysis |
| `GET` | `/api/skillpath/result` | Yes | Get latest analysis result |
| `GET` | `/api/skillpath/results` | Yes | Analysis history |

### Analytics

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/analytics/dashboard` | Yes | Student personal dashboard stats |
| `GET` | `/api/analytics/leaderboard` | Yes | Department leaderboard |
| `GET` | `/api/analytics/faculty` | Faculty | Department-wide analytics |
| `GET` | `/api/analytics/placement` | Admin | Full placement statistics |
| `GET` | `/api/analytics/atrisk` | Faculty | At-risk student list |

### Companies

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/companies` | Yes | All companies with full profiles |
| `GET` | `/api/companies/:id` | Yes | Single company detail |
| `POST` | `/api/companies/:id/pin` | Yes | Toggle pin/bookmark a company |

---

## ML Service

The FastAPI ML service exposes these endpoints at `http://localhost:8000`:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Liveness check |
| `POST` | `/analyze` | Full resume + JD analysis (used by backend) |
| `POST` | `/analyze-text` | Plain text analysis (testing) |
| `POST` | `/predict-placement` | Placement probability score |
| `POST` | `/classify-role` | Job role classification from skills |
| `GET` | `/docs` | Interactive Swagger UI |

**Skill extraction uses a 3-pass pipeline:**

| Pass | Method | Confidence |
|---|---|---|
| 1 | Exact alias match (regex word boundary) | 0.95 |
| 2 | N-gram match (up to trigrams) | 0.80 |
| 3 | TF-IDF cosine similarity (threshold 0.70) | 0.70–0.94 |

---

## Troubleshooting

### VS Code — Pylance import warnings for `numpy`, `networkx`

These warnings appear because Pylance is pointing to the system Python instead of your virtual environment.

**Fix:**
1. Open the Command Palette → `Python: Select Interpreter`
2. Choose the interpreter inside your `venv` folder:
   - macOS/Linux: `ml-service/venv/bin/python`
   - Windows: `ml-service\venv\Scripts\python.exe`
3. Alternatively, add a `pyrightconfig.json` to `ml-service/`:

```json
{
  "venvPath": ".",
  "venv": "venv",
  "pythonVersion": "3.10"
}
```

### `Counter is not defined` / `math is not defined`

Fixed in v2 — `import math` and `from collections import Counter` are now explicitly imported at the top of `extractor.py`. Replace your file with the latest version.

### MongoDB connection refused

Ensure MongoDB is running:

```bash
# Docker
docker-compose up mongodb

# Local
mongod --dbpath /data/db
```

### ML service fails to start

Install spaCy's English model after pip install:

```bash
python -m spacy download en_core_web_sm
```

### Company logos not showing

Re-run the company seed to apply the latest stable Wikipedia logo URLs:

```bash
cd backend
node src/utils/companySeed.js
```

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

<div align="center">

Built with ❤️ by the PRAGATI Team · KIT's College of Engineering, Kolhapur

</div>