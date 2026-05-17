import React from 'react';

const LEVELS = {
  Beginner:     { color: '#92400e', bg: '#fef3c7', label: 'Beginner' },
  Intermediate: { color: '#1d4ed8', bg: '#dbeafe', label: 'Intermediate' },
  Expert:       { color: '#166534', bg: '#dcfce7', label: 'Expert' },
};

export default function EligibilityBadge({ percent, reason, proficiency }) {
  const level = LEVELS[proficiency] || LEVELS['Beginner'];

  // Ring color
  const ringColor = percent >= 70 ? '#10b981' : percent >= 45 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Big percentage */}
      <div style={{
        width: 100, height: 100, borderRadius: '50%', margin: '0 auto 12px',
        border: `6px solid ${ringColor}`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#fff',
      }}>
        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: ringColor, lineHeight: 1 }}>
          {percent}%
        </div>
      </div>

      <div style={{ fontSize: '.85rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
        Eligibility Score
      </div>

      {/* Proficiency badge */}
      <span style={{
        background: level.bg, color: level.color,
        padding: '4px 14px', borderRadius: 999,
        fontSize: '.8rem', fontWeight: 700,
        display: 'inline-block', marginBottom: 12,
      }}>
        {level.label}
      </span>

      {/* Reason text */}
      {reason && (
        <p style={{ fontSize: '.8rem', color: '#475569', lineHeight: 1.5, textAlign: 'left' }}>
          {reason}
        </p>
      )}
    </div>
  );
}
