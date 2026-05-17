# PRAGATI — ML Datasets & Model Training Guide

## How the AI/ML Pipeline Actually Works

PRAGATI's SkillPath module does NOT use a traditional "train on dataset → save model → load model" 
pipeline for its core skill matching. Here's exactly what each algorithm uses:

---

## Module 1 — Skill Extraction (No Training Required)

### What it uses
**Your own `skill_taxonomy.json`** — a hand-curated knowledge base of 135 skills.

### How it works
```
Resume Text
    ↓
spaCy en_core_web_md  ← pre-trained by spaCy (downloaded automatically)
    ↓
Alias Matching        ← checks skill_taxonomy.json aliases
    ↓
TF-IDF Weighted Score ← sklearn TfidfVectorizer (no training, fitted at runtime)
    ↓
Proficiency Inference ← regex + context signals ("3 years of Python" → intermediate)
```

### Why no dataset is needed
The skill taxonomy IS the dataset. When you add "pytorch" as an alias for "PyTorch",
the system immediately recognizes it in any resume — no retraining needed.

**To expand coverage: edit `ml-service/data/skill_taxonomy.json`**

---

## Module 2 — ATS Scoring (Rule-Based, No Training)

### Algorithm (5 dimensions, max 100 points)

| Dimension | Max Points | Method |
|-----------|-----------|--------|
| Keyword Match | 35 | Set intersection: resume skills ∩ JD skills |
| Section Presence | 25 | Regex for Education, Skills, Experience, Projects headings |
| Quantified Achievements | 20 | Regex: "improved X by 30%", "built system for 500 users" |
| Action Verb Usage | 10 | Keyword list: "developed", "designed", "implemented"... |
| Length & Density | 10 | 300–800 words = full marks |

**No dataset or training needed. Pure deterministic scoring.**

---

## Module 3 — Learning Pathway (Graph Algorithm, No Training)

### What it uses
NetworkX directed graph built from `skill_taxonomy.json` prerequisites.

```
Gap Skills List
    ↓
Build Dependency Graph (NetworkX DiGraph)
    ↓
Topological Sort        ← ensures Python before Django
    ↓
Phase Assignment        ← bin by priority + cognitive load
    ↓
Course Lookup           ← course_catalog in skill_taxonomy.json
```

**No training. The course catalog in the taxonomy is the "model".**

---

## Module 4 — Placement Readiness Prediction (Needs Training)

This is the **only module that benefits from a real ML model**.

### Dataset to Use

**Dataset: Campus Placement Dataset (Kaggle)**
- URL: https://www.kaggle.com/datasets/benroshan/factors-affecting-campus-placement
- Size: ~215 rows, 15 columns
- Features: SSC %, HSC %, Degree %, Aptitude test %, Work experience, Specialization
- Target: Placed / Not Placed

### Download
```bash
pip install kaggle
# Place kaggle.json at ~/.kaggle/kaggle.json (from kaggle.com → Settings → API)
kaggle datasets download -d benroshan/factors-affecting-campus-placement -p datasets/placement/ --unzip
```

---

## How to Train the Placement Model

Save this as `datasets/train_placement_model.py` and run it:

```python
"""
Train PRAGATI's placement readiness prediction model.
Dataset: Campus Placement (Kaggle)
Output:  ml-service/data/placement_model.pkl
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score
import joblib
import os

# ── Load dataset ──────────────────────────────────────────────────────────────
df = pd.read_csv('placement/Placement_Data_Full_Class.csv')
print(f"Dataset shape: {df.shape}")
print(df.head())

# ── Feature engineering ───────────────────────────────────────────────────────
# Encode work experience: Yes=1, No=0
df['workex_enc'] = (df['workex'] == 'Yes').astype(int)

# Encode gender: M=1, F=0
df['gender_enc'] = (df['gender'] == 'M').astype(int)

# Encode degree type
le = LabelEncoder()
df['degree_enc'] = le.fit_transform(df['degree_t'].fillna('Unknown'))

# Features to use
FEATURES = ['ssc_p', 'hsc_p', 'degree_p', 'etest_p', 'workex_enc', 'gender_enc', 'degree_enc']

# Fill missing aptitude score with median
df['etest_p'] = df['etest_p'].fillna(df['etest_p'].median())

X = df[FEATURES]
y = (df['status'] == 'Placed').astype(int)

print(f"\nPlaced: {y.sum()} | Not Placed: {(y==0).sum()}")

# ── Train / test split ────────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# ── Train Random Forest ───────────────────────────────────────────────────────
pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('model', RandomForestClassifier(
        n_estimators=100,
        max_depth=6,
        min_samples_leaf=3,
        random_state=42
    ))
])

pipeline.fit(X_train, y_train)

# ── Evaluate ──────────────────────────────────────────────────────────────────
y_pred = pipeline.predict(X_test)
acc = accuracy_score(y_test, y_pred)
cv_scores = cross_val_score(pipeline, X, y, cv=5, scoring='accuracy')

print(f"\nTest Accuracy:       {acc:.2%}")
print(f"Cross-val Accuracy:  {cv_scores.mean():.2%} ± {cv_scores.std():.2%}")
print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=['Not Placed', 'Placed']))

# Feature importance
importances = pipeline.named_steps['model'].feature_importances_
print("\nFeature Importances:")
for feat, imp in sorted(zip(FEATURES, importances), key=lambda x: -x[1]):
    print(f"  {feat:15s}: {imp:.3f}")

# ── Save model ────────────────────────────────────────────────────────────────
os.makedirs('../ml-service/data', exist_ok=True)
joblib.dump(pipeline, '../ml-service/data/placement_model.pkl')

# Also save feature names so the API knows what to pass in
joblib.dump(FEATURES, '../ml-service/data/placement_features.pkl')
joblib.dump(le, '../ml-service/data/degree_encoder.pkl')

print("\n✅ Models saved to ml-service/data/")
print("   placement_model.pkl")
print("   placement_features.pkl")
print("   degree_encoder.pkl")
```

Run it:
```bash
cd datasets
python train_placement_model.py
```

---

## Resume Dataset (For Testing SkillPath, Not Training)

**Dataset: Resume Dataset**
- URL: https://www.kaggle.com/datasets/gauravduttakiit/resume-dataset
- Use: 2400+ real resumes across 25 job categories
- Purpose: **Test** your SkillPath module — upload these resumes and verify outputs

```bash
kaggle datasets download -d gauravduttakiit/resume-dataset -p datasets/resumes/ --unzip
```

---

## Summary Table

| Module | Algorithm | Dataset Needed | Status |
|--------|-----------|----------------|--------|
| Skill Extraction | spaCy NLP + Alias Matching | `skill_taxonomy.json` (included) | ✅ Ready |
| ATS Scoring | Rule-based (5 dimensions) | None | ✅ Ready |
| Skill Gap | Set difference + weighted scoring | `skill_taxonomy.json` (included) | ✅ Ready |
| Learning Pathway | NetworkX graph + topological sort | `skill_taxonomy.json` (included) | ✅ Ready |
| Placement Prediction | Random Forest | Campus Placement (Kaggle) | ⚠️ Train first |
| Resume Testing | — | Resume Dataset (Kaggle) | Optional |

---

## What spaCy's `en_core_web_md` Provides (Pre-trained)

This 43MB model (downloaded automatically by the Dockerfile) gives you:
- **Named Entity Recognition** — identifies PERSON, ORG, DATE in resume text
- **Word Vectors** — 300-dimension GloVe embeddings for semantic similarity
- **POS Tagging** — filters only nouns/proper nouns for skill detection
- **Dependency Parsing** — understands "3 years of Python experience"

You do NOT train this. spaCy trained it on OntoNotes 5.0 + Common Crawl.
