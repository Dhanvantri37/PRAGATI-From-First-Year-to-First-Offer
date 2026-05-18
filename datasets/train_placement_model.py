"""
PRAGATI — Placement Readiness Prediction Model Training
=======================================================
Dataset  : Campus Placement Dataset (Kaggle)
           https://www.kaggle.com/datasets/benroshan/factors-affecting-campus-placement

Download :
    pip install kaggle
    kaggle datasets download -d benroshan/factors-affecting-campus-placement -p . --unzip

Then run :
    python train_placement_model.py

Output   :
    ../ml-service/data/placement_model.pkl
    ../ml-service/data/placement_features.pkl
    ../ml-service/data/degree_encoder.pkl
"""

import os
import sys
import pandas as pd
import numpy as np
import joblib

from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    classification_report, accuracy_score, roc_auc_score, confusion_matrix
)

# ── Check dataset exists ───────────────────────────────────────────────────────
DATASET_PATH = 'Placement_Data_Full_Class.csv'
if not os.path.exists(DATASET_PATH):
    print("ERROR: Dataset not found.")
    print("Download it first:")
    print("  kaggle datasets download -d benroshan/factors-affecting-campus-placement --unzip")
    sys.exit(1)

# ── Load dataset ──────────────────────────────────────────────────────────────
print("Loading dataset...")
df = pd.read_csv(DATASET_PATH)
print(f"Shape: {df.shape}")
print(f"Columns: {list(df.columns)}")
print(f"\nClass distribution:\n{df['status'].value_counts()}")

# ── Feature engineering ───────────────────────────────────────────────────────
print("\nEngineering features...")

# Binary encodings
df['workex_enc']    = (df['workex'] == 'Yes').astype(int)
df['gender_enc']    = (df['gender'] == 'M').astype(int)

# Encode degree type (Comm&Mgmt / Sci&Tech / Others)
le_degree = LabelEncoder()
df['degree_enc'] = le_degree.fit_transform(df['degree_t'].fillna('Unknown'))

# Encode HSC specialization (Commerce / Science / Arts)
le_hsc = LabelEncoder()
df['hsc_spec_enc'] = le_hsc.fit_transform(df['hsc_s'].fillna('Unknown'))

# Fill missing aptitude test score with median
df['etest_p'] = df['etest_p'].fillna(df['etest_p'].median())

# ── Define features and target ─────────────────────────────────────────────────
FEATURES = [
    'ssc_p',        # Secondary school percentage (10th)
    'hsc_p',        # Higher secondary percentage (12th)
    'degree_p',     # Degree percentage (UG)
    'etest_p',      # Employability test percentage
    'workex_enc',   # Work experience (0/1)
    'gender_enc',   # Gender (M=1, F=0)
    'degree_enc',   # Degree type (encoded)
    'hsc_spec_enc', # HSC specialization (encoded)
]

X = df[FEATURES]
y = (df['status'] == 'Placed').astype(int)

print(f"\nFeatures: {FEATURES}")
print(f"Placed: {y.sum()} | Not Placed: {(y==0).sum()}")

# ── Train / test split ────────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

# ── Try 3 models, pick the best ───────────────────────────────────────────────
print("\nTraining and comparing models...")

models = {
    'Random Forest': Pipeline([
        ('scaler', StandardScaler()),
        ('model', RandomForestClassifier(
            n_estimators=200,
            max_depth=8,
            min_samples_leaf=2,
            random_state=42
        ))
    ]),
    'Gradient Boosting': Pipeline([
        ('scaler', StandardScaler()),
        ('model', GradientBoostingClassifier(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=4,
            random_state=42
        ))
    ]),
    'Logistic Regression': Pipeline([
        ('scaler', StandardScaler()),
        ('model', LogisticRegression(C=1.0, max_iter=1000, random_state=42))
    ]),
}

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
results = {}

for name, pipeline in models.items():
    cv_scores = cross_val_score(pipeline, X, y, cv=cv, scoring='roc_auc')
    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)
    y_prob = pipeline.predict_proba(X_test)[:, 1]

    results[name] = {
        'pipeline':   pipeline,
        'cv_auc':     cv_scores.mean(),
        'test_acc':   accuracy_score(y_test, y_pred),
        'test_auc':   roc_auc_score(y_test, y_prob),
    }
    print(f"\n{name}:")
    print(f"  CV AUC (5-fold): {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")
    print(f"  Test Accuracy:   {accuracy_score(y_test, y_pred):.3f}")
    print(f"  Test AUC-ROC:    {roc_auc_score(y_test, y_prob):.3f}")

# ── Pick best model by CV AUC ─────────────────────────────────────────────────
best_name = max(results, key=lambda k: results[k]['cv_auc'])
best = results[best_name]
print(f"\n🏆 Best model: {best_name} (CV AUC = {best['cv_auc']:.3f})")

# Detailed report on best model
y_pred_best = best['pipeline'].predict(X_test)
print("\nClassification Report (Best Model):")
print(classification_report(y_test, y_pred_best, target_names=['Not Placed', 'Placed']))

print("Confusion Matrix:")
cm = confusion_matrix(y_test, y_pred_best)
print(f"  True Negatives:  {cm[0][0]}  |  False Positives: {cm[0][1]}")
print(f"  False Negatives: {cm[1][0]}  |  True Positives:  {cm[1][1]}")

# Feature importance (Random Forest / GB only)
if hasattr(best['pipeline'].named_steps['model'], 'feature_importances_'):
    importances = best['pipeline'].named_steps['model'].feature_importances_
    print("\nFeature Importances:")
    for feat, imp in sorted(zip(FEATURES, importances), key=lambda x: -x[1]):
        bar = '█' * int(imp * 40)
        print(f"  {feat:20s}: {bar} {imp:.3f}")

# ── Save model ────────────────────────────────────────────────────────────────
out_dir = os.path.join('..', 'ml-service', 'data')
os.makedirs(out_dir, exist_ok=True)

joblib.dump(best['pipeline'],  os.path.join(out_dir, 'placement_model.pkl'))
joblib.dump(FEATURES,          os.path.join(out_dir, 'placement_features.pkl'))
joblib.dump(le_degree,         os.path.join(out_dir, 'degree_encoder.pkl'))
joblib.dump(le_hsc,            os.path.join(out_dir, 'hsc_encoder.pkl'))

print(f"\n✅ Saved to {out_dir}/")
print("   placement_model.pkl     ← main trained model")
print("   placement_features.pkl  ← feature name list")
print("   degree_encoder.pkl      ← LabelEncoder for degree_t")
print("   hsc_encoder.pkl         ← LabelEncoder for hsc_s")
print("\nDone! The model is now used by the Analytics module.")
