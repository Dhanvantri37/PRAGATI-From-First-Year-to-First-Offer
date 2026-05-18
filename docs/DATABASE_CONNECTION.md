# PRAGATI — Database Connection Guide

## Overview

PRAGATI uses **MongoDB 6** as its primary database.
All four services connect as follows:

| Service       | Connects to MongoDB? | How |
|---------------|---------------------|-----|
| Node.js backend | ✅ Yes (primary)   | Mongoose ODM via `MONGODB_URI` env var |
| Python ML service | ❌ No            | Stateless — no DB needed |
| Java resume parser | ❌ No           | Stateless — no DB needed |
| React frontend | ❌ No              | Talks to Node.js backend only |

---

## Option A — Local MongoDB (Development)

### 1. Install MongoDB
```bash
# macOS
brew tap mongodb/brew && brew install mongodb-community@6.0
brew services start mongodb-community@6.0

# Ubuntu/Debian
sudo apt-get install -y mongodb
sudo systemctl start mongod
```

### 2. Set backend .env
```env
MONGODB_URI= url://
```

No username/password needed for local dev.

---

## Option B — MongoDB Atlas (Cloud, Recommended for Production)

### 1. Create free cluster
- Go to https://cloud.mongodb.com
- Create a free M0 cluster (512 MB, enough for PRAGATI)
- Create a database user with read/write access
- Add your IP to the whitelist (or use 0.0.0.0/0 for dev)

### 2. Get connection string
```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/pragati?retryWrites=true&w=majority
```

### 3. Set backend .env
```env
MONGODB_URI=mongodb+srv://pragati_user:yourpassword@cluster0.xxxxx.mongodb.net/pragati?retryWrites=true&w=majority
```

---

## Option C — Docker (All-in-one, Recommended for Submission Demo)

The `docker-compose.yml` spins up a MongoDB container automatically.
No separate installation needed.

```bash
cp .env.example .env
# Edit .env — set JWT_SECRET, JWT_REFRESH_SECRET (anything random)
# Cloudinary keys optional for basic demo

docker compose up --build

# In a new terminal — seed the database:
docker compose exec backend npm run seed
```

MongoDB data is persisted in a Docker volume (`mongo_data`).
It survives container restarts.

To reset the database:
```bash
docker compose down -v   # -v removes the volume
docker compose up --build
```

---

## MongoDB Collections — Quick Reference

| Collection         | Purpose |
|--------------------|---------|
| `users`            | Students, faculty, admins |
| `notes`            | Study materials (all statuses) |
| `companies`        | Campus recruitment companies |
| `problems`         | Coding problem bank |
| `userproblems`     | Which student got which problem + solved status |
| `aptitudequestions`| Question bank for aptitude prep |
| `discussions`      | Threaded doubts and discussions |
| `skillpathresults` | SkillPath AI analysis history per student |
| `applications`     | Student → company applications |

---

## Mongoose Connection (how it works in code)

In `backend/src/server.js`:
```js
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Backend on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
```

Mongoose handles connection pooling automatically.
The default pool size (5 connections) is fine for a college-scale deployment.

---

## Seeding the Database

After starting the backend (locally or in Docker):
```bash
# Local
cd backend
npm run seed

# Docker
docker compose exec backend npm run seed
```

This creates:
- 3 default users (admin, faculty, student)
- 4 sample companies (TCS, Infosys, Wipro, Persistent)
- 8 coding problems (Easy/Medium/Hard)
- 4 aptitude questions

---

## Troubleshooting

**"MongoServerError: Authentication failed"**
→ Check `MONGO_USER` and `MONGO_PASS` in `.env` match what's in `MONGODB_URI`

**"MongoNetworkError: connect ECONNREFUSED"**
→ MongoDB isn't running. Start it locally or run `docker compose up mongo`

**"MongooseError: The `uri` parameter to `openUri()` must be a string"**
→ `MONGODB_URI` env var is not set. Check your `.env` file exists.

**Atlas connection timeout**
→ Your IP is not whitelisted in Atlas. Go to Network Access → Add IP.
