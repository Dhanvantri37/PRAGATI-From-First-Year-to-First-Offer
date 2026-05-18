# PRAGATI — ML Datasets

The SkillPath AI module (built on SkillGap) already comes with a curated
`skill_taxonomy.json` that powers the NLP pipeline. No separate dataset download
is needed for the core skill extraction — the taxonomy IS the dataset.

However, you can enhance the ML models using these public datasets:

---

## Recommended Kaggle Datasets

### 1. Resume Dataset (for testing SkillPath)
**Dataset:** Resume Dataset  
**URL:** https://www.kaggle.com/datasets/gauravduttakiit/resume-dataset  
**Download:** `kaggle datasets download -d gauravduttakiit/resume-dataset`  
**Use:** Test the resume upload → analysis pipeline with real resume samples.

### 2. Job Description Dataset  
**Dataset:** Job Description Dataset  
**URL:** https://www.kaggle.com/datasets/ravindrasinghrana/job-description-dataset  
**Download:** `kaggle datasets download -d ravindrasinghrana/job-description-dataset`  
**Use:** Extract JD text to test SkillPath's JD parsing.

### 3. Skills Dataset (to expand the taxonomy)
**Dataset:** LinkedIn Job Postings 2023  
**URL:** https://www.kaggle.com/datasets/arshkon/linkedin-job-postings  
**Download:** `kaggle datasets download -d arshkon/linkedin-job-postings`  
**Use:** Mine new skill keywords and add to `ml-service/data/skill_taxonomy.json`.

### 4. Campus Placement Dataset (for analytics predictions)
**Dataset:** Campus Placement Dataset  
**URL:** https://www.kaggle.com/datasets/benroshan/factors-affecting-campus-placement  
**Download:** `kaggle datasets download -d benroshan/factors-affecting-campus-placement`  
**Use:** Train the placement readiness prediction model in the analytics module.

---

## How to Download (Kaggle CLI)

```bash
# Install Kaggle CLI
pip install kaggle

# Set up credentials
# Go to: https://www.kaggle.com/settings → API → Create New Token
# Place kaggle.json at ~/.kaggle/kaggle.json

# Download datasets
cd datasets/
kaggle datasets download -d gauravduttakiit/resume-dataset --unzip -p ./resumes/
kaggle datasets download -d ravindrasinghrana/job-description-dataset --unzip -p ./job-descriptions/
kaggle datasets download -d benroshan/factors-affecting-campus-placement --unzip -p ./placement/
```

---

## Existing Skill Taxonomy
The file `ml-service/data/skill_taxonomy.json` is the core dataset for skill matching.
It contains:
- Skills with aliases (e.g., "Python", "python3", "py")
- Skill categories (Programming, Databases, Cloud, etc.)
- Prerequisites (e.g., Python → must know before ML libraries)
- Course catalog with free + paid resources

You can expand this file manually as you add more companies and roles to PRAGATI.

---

## Training a Placement Prediction Model (Optional)

Using the Campus Placement dataset, you can train a simple classifier:

```python
# datasets/train_placement_model.py
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import joblib

df = pd.read_csv('placement/Placement_Data_Full_Class.csv')

# Features: CGPA, stream, work experience, etc.
features = ['ssc_p', 'hsc_p', 'degree_p', 'etest_p', 'mba_p', 'workex']
df['workex_enc'] = (df['workex'] == 'Yes').astype(int)

X = df[['ssc_p', 'hsc_p', 'degree_p', 'etest_p', 'workex_enc']].fillna(0)
y = (df['status'] == 'Placed').astype(int)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

print(f"Accuracy: {model.score(X_test, y_test):.2%}")
joblib.dump(model, '../ml-service/data/placement_model.pkl')
print("Model saved!")
```

Then load and use it in `ml-service/app/services/extras.py`.
