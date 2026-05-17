import React, { useState } from 'react';

function ModuleRow({ module }) {
  return (
    <div style={{
      padding: '10px 14px', background: '#f8fafd',
      borderRadius: 8, marginBottom: 6,
      border: '1px solid #e2e8f4',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '.85rem', fontWeight: 600, color: '#0f172a' }}>
            {module.title || module.skill_addressed}
          </div>
          {module.skill_addressed && module.title !== module.skill_addressed && (
            <div style={{ fontSize: '.75rem', color: '#64748b', marginTop: 2 }}>
              Skill: {module.skill_addressed}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {module.estimated_hours && (
            <span style={{ fontSize: '.72rem', color: '#64748b', background: '#f1f5fb', padding: '2px 8px', borderRadius: 999 }}>
              ~{module.estimated_hours}h
            </span>
          )}
          {module.priority && (
            <span style={{
              fontSize: '.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999,
              background: module.priority === 'high' ? '#fee2e2' : module.priority === 'medium' ? '#fef3c7' : '#f1f5fb',
              color: module.priority === 'high' ? '#991b1b' : module.priority === 'medium' ? '#92400e' : '#475569',
            }}>
              {module.priority === 'high' ? '🔴' : module.priority === 'medium' ? '🟡' : '🟢'} {module.priority}
            </span>
          )}
          {module.market_demand !== undefined && (
            <span title="Market demand in Indian tech JDs" style={{ fontSize: '.7rem', color: '#0369a1', background: '#e0f2fe', padding: '2px 7px', borderRadius: 999, fontWeight: 600 }}>
              📈 {Math.round((module.market_demand || 0) * 100)}%
            </span>
          )}
          {module.confidence !== undefined && (
            <span title="Gap confidence score" style={{ fontSize: '.7rem', color: '#6b21a8', background: '#f3e8ff', padding: '2px 7px', borderRadius: 999, fontWeight: 600 }}>
              🎯 {Math.round((module.confidence || 0) * 100)}%
            </span>
          )}
        </div>
      </div>

      {/* Resources */}
      {module.resources && module.resources.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {module.resources.slice(0, 2).map((r, i) => (
            <a
              key={i} href={r.url} target="_blank" rel="noopener noreferrer"
              style={{
                fontSize: '.73rem', color: '#1a56db',
                background: '#e8effe', padding: '2px 9px',
                borderRadius: 999, textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
            >
              {r.free && <span>🆓</span>} {r.name}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function PhaseCard({ phase }) {
  const [open, setOpen] = useState(phase.phase === 1);

  const phaseColors = ['#1a56db', '#7c3aed', '#059669', '#dc2626', '#d97706'];
  const color = phaseColors[(phase.phase - 1) % phaseColors.length];

  return (
    <div style={{
      border: '1px solid #e2e8f4', borderRadius: 12,
      overflow: 'hidden', marginBottom: 12,
    }}>
      {/* Phase header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '14px 16px',
          background: open ? '#f8fafd' : '#fff',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: open ? '1px solid #e2e8f4' : 'none',
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: color, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '.8rem', fontWeight: 800, flexShrink: 0,
        }}>
          {phase.phase}
        </div>
        <div style={{ textAlign: 'left', flex: 1 }}>
          <div style={{ fontSize: '.9rem', fontWeight: 700, color: '#0f172a' }}>
            {phase.phase_name}
          </div>
          <div style={{ fontSize: '.75rem', color: '#94a3b8', marginTop: 1 }}>
            {phase.duration_weeks} week{phase.duration_weeks !== 1 ? 's' : ''} · {phase.modules?.length || 0} modules
          </div>
        </div>
        <span style={{ color: '#94a3b8', fontSize: '.9rem' }}>{open ? '▲' : '▼'}</span>
      </button>

      {/* Modules */}
      {open && (
        <div style={{ padding: '12px 16px' }}>
          {phase.description && (
            <p style={{ fontSize: '.8rem', color: '#64748b', marginBottom: 10, lineHeight: 1.5 }}>
              {phase.description}
            </p>
          )}
          {(phase.modules || []).map((m, i) => (
            <ModuleRow key={i} module={m} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PathwayView({ pathway, totalWeeks }) {
  if (!pathway || pathway.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
        No learning pathway generated
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: '.85rem', color: '#475569' }}>
          {pathway.length} phases · {totalWeeks} weeks total
        </div>
      </div>
      {pathway.map(phase => (
        <PhaseCard key={phase.phase} phase={phase} />
      ))}
    </div>
  );
}