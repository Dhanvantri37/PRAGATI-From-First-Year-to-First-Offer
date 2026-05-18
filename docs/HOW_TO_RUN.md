# PRAGATI — How to Run the Application

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Docker + Docker Compose | Docker 24+ | `docker --version` |
| Node.js | v18+ | `node --version` |
| Python | 3.10+ | `python --version` |
| Java JDK | 17+ | `java --version` |
| Maven | 3.8+ | `mvn --version` |
| Git | Any | `git --version` |

---

## METHOD 1 — Docker (Recommended — One Command)

This runs everything: MongoDB + Java Parser + Python ML + Node.js Backend + React Frontend.

### Step 1 — Clone / extract the project
```bash
# If using the zip:
unzip PRAGATI_v2.zip
cd PRAGATI
```

### Step 2 — Configure environment
```bash
cp .env.example .env
```

Open `.env` and fill in:
```env
# MongoDB — leave defaults for Docker
MONGO_USER=pragati
MONGO_PASS=pragati_secret_change_me

# JWT — generate any random strings (min 32 chars)
JWT_SECRET=some_very_long_random_string_here_64_chars_minimum_abc123
JWT_REFRESH_SECRET=another_very_long_random_string_here_64_chars_abc456

# Cloudinary — create free account at https://cloudinary.com
# (needed for file uploads — notes and resumes)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Anthropic (optional — used for AI suggestions in SkillPath)
ANTHROPIC_API_KEY=sk-ant-...
```

### Step 3 — Build and start all services
```bash
docker compose up --build
```

First build takes 5–10 minutes (downloads Java, Python, Node images + spaCy model).
Subsequent starts take ~30 seconds.

### Step 4 — Seed the database (first time only)
Open a new terminal:
```bash
docker compose exec backend npm run seed
```

Output:
```
✅ Default users seeded
✅ Companies seeded
✅ Problems seeded
✅ Aptitude questions seeded
🎉 Database seeded successfully!
```

### Step 5 — Open the app
```
http://localhost:3000
```

Login with:
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@pragati.edu | Admin@123 |
| Faculty | faculty@pragati.edu | Faculty@123 |
| Student | student@pragati.edu | Student@123 |

### Service URLs (for testing/debugging)
| Service | URL |
|---------|-----|
| Frontend (React) | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| ML Service | http://localhost:8000/docs |
| Resume Parser | http://localhost:8080/health |
| MongoDB | localhost:27017 |

### Stop everything
```bash
docker compose down          # stop, keep data
docker compose down -v       # stop + delete database
```

---

## METHOD 2 — Manual / Local (No Docker)

Run each service separately. Better for development.

### Terminal 1 — MongoDB
```bash
# macOS
brew services start mongodb-community@6.0

# Ubuntu
sudo systemctl start mongod

# Windows — start from MongoDB Compass or:
"C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe"
```

### Terminal 2 — Java Resume Parser
```bash
cd resume-parser
./mvnw spring-boot:run
# Windows: mvnw.cmd spring-boot:run
```
Wait for: `Started ResumeParserApplication on port 8080`

### Terminal 3 — Python ML Service
```bash
cd ml-service
python -m venv venv

# macOS/Linux:
source venv/bin/activate

# Windows:
venv\Scripts\activate

pip install -r requirements.txt
python -m spacy download en_core_web_md

uvicorn app.main:app --reload --port 8000
```
Wait for: `Application startup complete`

### Terminal 4 — Node.js Backend
```bash
cd backend
cp .env.example .env
# Edit .env — set MONGODB_URI=mongodb://localhost:27017/pragati
npm install
npm run seed       # first time only
npm run dev
```
Wait for: `✅ MongoDB connected` and `🚀 PRAGATI Backend running on port 5000`

### Terminal 5 — React Frontend
```bash
cd frontend
npm install
npm start
```
Opens automatically at http://localhost:3000

---

## METHOD 3 — Quick Demo (Frontend + Backend Only, No Java/Python)

If you only want to demo the UI without the ML features:

### Step 1 — Start MongoDB + Backend
```bash
# Terminal 1
brew services start mongodb-community@6.0

# Terminal 2
cd backend
cp .env.example .env
# Set MONGODB_URI=mongodb://localhost:27017/pragati in .env
npm install && npm run seed && npm run dev
```

### Step 2 — Start Frontend
```bash
# Terminal 3
cd frontend
npm install
npm start
```

SkillPath Analysis will show an error ("ML service unavailable") but all other modules
(Notes, Problems, Companies, Dashboard) work fully.

---

## Common Issues & Fixes

### Port already in use
```bash
# Find what's using port 5000
lsof -i :5000        # macOS/Linux
netstat -ano | findstr :5000   # Windows

# Kill it
kill -9 <PID>
```

### Docker build fails — out of disk space
```bash
docker system prune -a    # removes unused images/containers
docker compose up --build
```

### spaCy model download fails (ML service)
```bash
cd ml-service
source venv/bin/activate
python -m spacy download en_core_web_md --direct
```

### MongoDB auth error
Make sure `MONGO_USER` and `MONGO_PASS` in `.env` exactly match what's in `MONGODB_URI`.

For local dev without auth, just use:
```env
MONGODB_URI=mongodb://localhost:27017/pragati
```

### Java build fails — Maven not found
```bash
# Maven is bundled — use ./mvnw (not mvn)
cd resume-parser
chmod +x mvnw    # make it executable on Linux/Mac
./mvnw spring-boot:run
```

### Frontend shows blank page
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm start
```

### SkillPath analysis times out
The Python ML service takes ~10–15 seconds for first analysis (spaCy loads the model).
Subsequent calls are fast. This is normal.

---

## Testing the APIs

### Test Backend health
```bash
curl http://localhost:5000/health
# → {"status":"ok","service":"PRAGATI Backend"}
```

### Test login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@pragati.edu","password":"Student@123"}'
```

### Test ML Service (interactive Swagger UI)
```
http://localhost:8000/docs
```
Click `/analyze-text` → Try it out → paste resume text + JD text → Execute

### Test Java Resume Parser
```bash
curl -F "resume=@your_resume.pdf" http://localhost:8080/parse
```

---

## Project Structure Recap

```
PRAGATI/
├── docker-compose.yml        ← start everything
├── .env.example              ← copy to .env and fill secrets
├── README.md
│
├── backend/                  ← Node.js Express (port 5000)
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── server.js         ← entry point
│       ├── models/           ← MongoDB schemas
│       ├── routes/           ← 9 route files
│       ├── middleware/        ← JWT auth
│       └── utils/seeder.js   ← run once: npm run seed
│
├── resume-parser/            ← Java Spring Boot (port 8080)
│   ├── pom.xml
│   └── src/main/java/com/pragati/
│       ├── ResumeParserApplication.java
│       ├── controller/ResumeController.java
│       ├── service/ResumeParserService.java
│       └── model/ParsedResume.java
│
├── ml-service/               ← Python FastAPI (port 8000)
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── data/skill_taxonomy.json   ← core ML "dataset"
│   └── app/
│       ├── main.py           ← FastAPI endpoints
│       └── services/
│           ├── extractor.py  ← skill extraction (spaCy + TF-IDF)
│           ├── pathway.py    ← learning pathway (NetworkX)
│           ├── extras.py     ← ATS scoring (rule-based)
│           └── parser.py     ← PDF/DOCX text extraction
│
├── frontend/                 ← React (port 3000)
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
│       ├── App.js            ← routing
│       ├── context/AuthContext.js
│       ├── pages/
│       │   ├── LoginPage.js
│       │   ├── DashboardLayout.js
│       │   ├── DashboardHome.js
│       │   ├── NotesPage.js          ← full module ✅
│       │   ├── ProblemsPage.js       ← full module ✅
│       │   ├── CompaniesPage.js      ← full module ✅
│       │   └── StubPages.js          ← Aptitude, Discussions (expand later)
│       └── components/skillpath/
│           ├── SkillPathModule.js    ← main component
│           ├── UploadSection.js
│           ├── AtsGauge.js
│           ├── SkillGapPanel.js
│           ├── EligibilityBadge.js
│           └── PathwayView.js
│
└── docs/
    ├── DATABASE_CONNECTION.md
    └── DATASETS_AND_MODELS.md   ← this file
```

---

## For Submission / Demo Day Checklist

- [ ] `docker compose up --build` — all 5 services start cleanly
- [ ] `npm run seed` — default accounts created
- [ ] Login as student → Dashboard shows streak + ATS score
- [ ] Notes page → Upload a PDF → Admin approves it
- [ ] Problems page → Mark today's problem as solved → streak increments
- [ ] Companies page → Click TCS → see recruitment rounds
- [ ] SkillPath → Upload resume + paste JD → get ATS score + pathway
- [ ] Java parser → `curl -F "resume=@file.pdf" http://localhost:8080/parse`
- [ ] MongoDB → connect with Compass to `mongodb://localhost:27017/pragati`
