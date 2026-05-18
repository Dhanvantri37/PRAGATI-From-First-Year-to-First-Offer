import React from 'react';

function Chip({ label, variant }) {
  const styles = {
    matched: { background: '#dcfce7', color: '#166534' },
    missing: { background: '#fee2e2', color: '#991b1b' },
    weak:    { background: '#fef3c7', color: '#92400e' },
  };
  return (
    <span style={{
      ...styles[variant],
      padding: '3px 10px',
      borderRadius: 999,
      fontSize: '.78rem',
      fontWeight: 600,
      display: 'inline-block',
      margin: '3px',
    }}>
      {label}
    </span>
  );
}

export default function SkillGapPanel({ skillGap }) {
  const { matchedSkills = [], missingSkills = [], weakAreas = [] } = skillGap || {};

  return (
    <div>
      {/* Matched */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
          <span style={{ fontSize: '.82rem', fontWeight: 700, color: '#166534' }}>
            You Have ({matchedSkills.length})
          </span>
        </div>
        <div>
          {matchedSkills.length
            ? matchedSkills.map(s => <Chip key={s} label={s} variant="matched" />)
            : <span style={{ fontSize: '.8rem', color: '#94a3b8' }}>None detected</span>
          }
        </div>
      </div>

      {/* Missing */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
          <span style={{ fontSize: '.82rem', fontWeight: 700, color: '#991b1b' }}>
            You Need ({missingSkills.length})
          </span>
        </div>
        <div>
          {missingSkills.length
            ? missingSkills.map(s => <Chip key={s} label={s} variant="missing" />)
            : <span style={{ fontSize: '.8rem', color: '#94a3b8' }}>No critical gaps!</span>
          }
        </div>
      </div>

      {/* Weak areas */}
      {weakAreas.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
            <span style={{ fontSize: '.82rem', fontWeight: 700, color: '#92400e' }}>
              Needs Strengthening ({weakAreas.length})
            </span>
          </div>
          <div>
            {weakAreas.map(s => <Chip key={s} label={s} variant="weak" />)}
          </div>
        </div>
      )}
    </div>
  );
}
