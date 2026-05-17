"""
PRAGATI ML Model Loader
Loads trained .pkl models at startup.
IMPORTANT: All loads are wrapped in try/except — a missing or
incompatible model logs a warning but never crashes the service.
"""
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

DATA_DIR = Path('/app/data')
_models = {}


def _load(name: str, filename: str):
    path = DATA_DIR / filename
    if not path.exists():
        logger.warning(f"Model file not found: {filename} — feature disabled")
        _models[name] = None
        return
    try:
        import joblib
        _models[name] = joblib.load(path)
        logger.info(f"Loaded model: {filename}")
    except Exception as e:
        # Version mismatch or corrupt file — log and continue, never crash
        logger.warning(f"Could not load {filename}: {e} — feature disabled, re-run train_all_models.py")
        _models[name] = None


def load_all():
    _load('placement',            'placement_model.pkl')
    _load('placement_features',   'placement_features.pkl')
    _load('role_classifier',      'role_classifier.pkl')
    _load('gap_score',            'gap_score_model.pkl')
    _load('eligibility',          'eligibility_model.pkl')
    _load('gap_features',         'gap_features.pkl')
    _load('aptitude_difficulty',  'aptitude_difficulty_model.pkl')
    _load('degree_encoder',       'degree_encoder.pkl')
    _load('hsc_encoder',          'hsc_encoder.pkl')
    loaded = sum(1 for v in _models.values() if v is not None)
    logger.info(f"Models ready: {loaded}/{len(_models)} loaded successfully")


def get(name: str):
    return _models.get(name)


def predict_placement(ssc_p, hsc_p, degree_p, etest_p, workex, gender, degree_t, hsc_s) -> dict:
    model = get('placement')
    if model is None:
        return {'probability': 0.0, 'prediction': 'unknown', 'model_available': False}
    try:
        le_deg = get('degree_encoder')
        le_hsc = get('hsc_encoder')
        deg_enc = le_deg.transform([degree_t])[0] if le_deg else 0
        hsc_enc = le_hsc.transform([hsc_s])[0] if le_hsc else 0
        X = [[ssc_p, hsc_p, degree_p, etest_p,
              int(workex == 'Yes'), int(gender == 'M'),
              deg_enc, hsc_enc]]
        prob = model.predict_proba(X)[0][1]
        return {
            'probability': round(float(prob) * 100, 1),
            'prediction': 'Placed' if prob >= 0.5 else 'Not Placed',
            'model_available': True
        }
    except Exception as e:
        logger.error(f"Placement prediction failed: {e}")
        return {'probability': 0.0, 'prediction': 'error', 'model_available': False}


def predict_role(skills_text: str) -> str:
    model = get('role_classifier')
    if model is None:
        return 'Unknown'
    try:
        return model.predict([skills_text])[0]
    except Exception:
        return 'Unknown'


def predict_aptitude_difficulty(question_text: str, topic: str) -> str:
    model = get('aptitude_difficulty')
    if model is None:
        return 'Medium'
    try:
        return model.predict([f"{topic} {question_text}"])[0]
    except Exception:
        return 'Medium'
