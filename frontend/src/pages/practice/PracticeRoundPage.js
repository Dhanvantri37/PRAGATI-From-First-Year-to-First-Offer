import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import HRRoundPage        from './HRRoundPage';
import GDRoundPage        from './GDRoundPage';
import TechnicalRoundPage from './TechnicalRoundPage';
import CaseStudyPage      from './CaseStudyPage';
import SystemDesignPage   from './SystemDesignPage';
import ProjectRoundPage   from './ProjectRoundPage';
import GamingRoundPage    from './GamingRoundPage';
import PuzzleRoundPage    from './PuzzleRoundPage';
import DebuggingRoundPage from './DebuggingRoundPage';

const ROUND_MAP = {
  HR:           HRRoundPage,
  GD:           GDRoundPage,
  TECHNICAL:    TechnicalRoundPage,
  CASE_STUDY:   CaseStudyPage,
  SYSTEM_DESIGN:SystemDesignPage,
  PROJECT:      ProjectRoundPage,
  GAMING:       GamingRoundPage,
  PUZZLE:       PuzzleRoundPage,
  DEBUGGING:    DebuggingRoundPage,
};

export default function PracticeRoundPage() {
  const { roundType } = useParams();
  const nav = useNavigate();
  const key = (roundType || '').toUpperCase();
  const Component = ROUND_MAP[key];

  if (!Component) {
    return (
      <div style={{ textAlign: 'center', padding: 60, fontFamily: "'Nunito',sans-serif" }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>🚫</div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.2rem', color: '#0f1a2e', marginBottom: 8 }}>
          Round type "{roundType}" not found
        </div>
        <button onClick={() => nav(-1)}
          style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#531697,#13a1a5)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif" }}>
          ← Go Back
        </button>
      </div>
    );
  }

  return <Component />;
}
