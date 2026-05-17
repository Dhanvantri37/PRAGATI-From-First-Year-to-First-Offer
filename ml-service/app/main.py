"""
PRAGATI SkillPath AI Service v2.0
Built on SkillGap engine — FastAPI + spaCy + NetworkX + Trained ML Models

Endpoints:
  GET  /health          - liveness check
  POST /analyze         - PRAGATI integration (resume_url + jd_text)
  POST /analyze-file    - direct file upload (original SkillGap interface)
  POST /analyze-text    - plain text (testing / Swagger UI)
  POST /predict-placement - placement probability for a student
  POST /classify-role   - predict job role from skills text
"""

import logging
import os
import httpx
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

from app.services.parser import extract_text
from app.services.extractor import (
    extract_skills_from_text, extract_required_skills,
    compute_skill_gaps, compute_readiness_score,
    extract_candidate_name, extract_target_role,
)
from app.services.pathway import build_learning_pathway
from app.services.extras import (
    compute_ats_score, generate_resume_suggestions,
    build_weekly_roadmap, recommend_jobs,
)
from app import model_loader

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="PRAGATI SkillPath AI Service",
    description="Campus Placement Intelligence — skill gap analysis, learning pathways & ML predictions.",
    version="2.0.0",
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
def startup():
    model_loader.load_all()
    logger.info("All ML models loaded")


# ── Core analysis pipeline ─────────────────────────────────────────────────────

def run_analysis(resume_text: str, jd_text: str) -> dict:
    candidate_name  = extract_candidate_name(resume_text)
    target_role     = extract_target_role(jd_text)
    resume_skills   = extract_skills_from_text(resume_text)
    required_skills = extract_required_skills(jd_text)
    gaps, strengths = compute_skill_gaps(resume_skills, required_skills)
    pathway_result  = build_learning_pathway(gaps, resume_skills)
    readiness       = compute_readiness_score(gaps, len(required_skills))

    ats_result      = compute_ats_score(resume_text, resume_skills, required_skills, gaps)
    suggestions     = generate_resume_suggestions(resume_text, resume_skills, required_skills, gaps, candidate_name, target_role)
    weekly_roadmap  = build_weekly_roadmap(pathway_result["learning_pathway"])
    job_recs        = recommend_jobs(resume_skills, gaps)

    # Proficiency from readiness
    proficiency = "Expert" if readiness >= 80 else "Intermediate" if readiness >= 50 else "Beginner"

    # Use trained role classifier if available
    skills_text = " ".join(s["skill"] for s in resume_skills)
    predicted_role = model_loader.predict_role(skills_text)

    # Skill gap structured for PRAGATI frontend
    req_set = {r["skill"] for r in required_skills}
    res_set = {s["skill"] for s in resume_skills}
    matched = list(req_set & res_set)
    missing = [g["skill"] for g in gaps if g["gap_score"] > 0.7]
    weak    = [g["skill"] for g in gaps if 0.3 < g["gap_score"] <= 0.7]

    # Top recommendations from pathway
    recommendations = []
    for phase in pathway_result["learning_pathway"][:3]:
        for module in phase.get("modules", [])[:2]:
            recs = module.get("resources", [])
            if recs:
                recommendations.append({
                    "skill": module.get("skill_addressed", ""),
                    "resource": recs[0].get("name", ""),
                    "priority": module.get("priority", "medium"),
                })

    ats_score_val = ats_result.get("total_score", 0) if isinstance(ats_result, dict) else int(ats_result)

    return {
        # PRAGATI backend stores these fields
        "ats_score":           ats_score_val,
        "ats_breakdown":       ats_result if isinstance(ats_result, dict) else {},
        "eligibility_percent": readiness,
        "eligibility_reason":  f"Matched {len(matched)} of {len(required_skills)} required skills. Level: {proficiency}.",
        "skill_gap": {
            "matchedSkills": matched,
            "missingSkills": missing,
            "weakAreas":     weak,
        },
        "proficiency_level":   proficiency,
        "recommendations":     recommendations,
        "parsed_skills":       [s["skill"] for s in resume_skills],
        # Full SkillGap fields for detailed results view
        "candidate_name":          candidate_name,
        "target_role":             target_role or predicted_role,
        "resume_skills":           resume_skills,
        "required_skills":         required_skills,
        "skill_gaps":              gaps,
        "strengths":               strengths,
        "learning_pathway":        pathway_result["learning_pathway"],
        "overall_readiness_score": readiness,
        "estimated_total_weeks":   pathway_result["estimated_total_weeks"],
        "reasoning_trace":         pathway_result["reasoning_trace"],
        "resume_suggestions":      suggestions,
        "weekly_roadmap":          weekly_roadmap,
        "job_recommendations":     job_recs,
        "predicted_role":          predicted_role,
    }


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "PRAGATI SkillPath AI v2.0"}


@app.post("/analyze")
async def analyze_from_url(resume_url: str = Form(...), jd_text: str = Form(...), user_id: Optional[str] = Form(None)):
    """Called by PRAGATI Node.js backend — resume_url + jd_text."""
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(resume_url)
            if resp.status_code != 200:
                raise HTTPException(status_code=400, detail="Could not fetch resume from URL")
            file_bytes = resp.content
        fmt = "pdf" if ".pdf" in resume_url.lower() else "docx"
        resume_text = extract_text(file_bytes, fmt)
        if not resume_text.strip():
            raise HTTPException(status_code=422, detail="Could not extract text from resume")
        return JSONResponse(content=run_analysis(resume_text, jd_text))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze-file")
async def analyze_file(resume: UploadFile = File(...), job_description: UploadFile = File(...)):
    """Direct file upload — original SkillGap interface."""
    resume_bytes = await resume.read()
    jd_bytes     = await job_description.read()
    resume_ext   = (resume.filename or "").rsplit(".", 1)[-1].lower()
    jd_ext       = (job_description.filename or "").rsplit(".", 1)[-1].lower()
    resume_text  = extract_text(resume_bytes, resume_ext)
    jd_text      = extract_text(jd_bytes, jd_ext)
    if not resume_text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from resume")
    return JSONResponse(content=run_analysis(resume_text, jd_text))


@app.post("/analyze-text")
async def analyze_text(resume_text: str = Form(...), jd_text: str = Form(...)):
    """Plain text — for Swagger UI testing."""
    return JSONResponse(content=run_analysis(resume_text, jd_text))


class PlacementRequest(BaseModel):
    ssc_p: float        # 10th percentage
    hsc_p: float        # 12th percentage
    degree_p: float     # degree percentage
    etest_p: float      # aptitude/employability test %
    workex: str         # "Yes" or "No"
    gender: str         # "M" or "F"
    degree_t: str       # "Sci&Tech", "Comm&Mgmt", "Others"
    hsc_s: str          # "Commerce", "Science", "Arts"

@app.post("/predict-placement")
def predict_placement(req: PlacementRequest):
    """Predict campus placement probability using trained Random Forest / LR model."""
    result = model_loader.predict_placement(
        req.ssc_p, req.hsc_p, req.degree_p, req.etest_p,
        req.workex, req.gender, req.degree_t, req.hsc_s
    )
    return result


class RoleRequest(BaseModel):
    skills_text: str

@app.post("/classify-role")
def classify_role(req: RoleRequest):
    """Predict likely job role from a resume's skills."""
    role = model_loader.predict_role(req.skills_text)
    return {"predicted_role": role}
