import React from 'react';

/**
 * PragatiLogo — clean logo, no dark background
 * Uses the logo's own natural shape (horizontal pill on auth pages,
 * small square for sidebar)
 *
 * variant: 'natural' | 'pill' | 'inline'
 */
export default function PragatiLogo({ size = 'md', showText = false, variant = 'natural', style = {} }) {
  const sizes = { xs: 28, sm: 36, md: 48, lg: 64, xl: 96, '2xl': 140 };
  const px = sizes[size] || sizes.md;

  if (variant === 'pill') {
    // Wide horizontal pill that mirrors the logo's landscape shape
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        padding: '8px 20px',
        background: 'linear-gradient(135deg, #f0f4ff 0%, #f5f0ff 60%, #e8fffe 100%)',
        border: '1.5px solid rgba(83,22,151,0.12)',
        borderRadius: 999,
        boxShadow: '0 4px 20px rgba(4,44,93,0.08)',
        ...style,
      }}>
        <img src="/logo.png" alt="PRAGATI" style={{ height: px * 0.55, objectFit: 'contain' }} />
      </div>
    );
  }

  if (variant === 'inline') {
    // For sidebar/header — just logo image, no container
    return (
      <img
        src="/logo.png"
        alt="PRAGATI"
        style={{ height: px, width: 'auto', objectFit: 'contain', flexShrink: 0, ...style }}
      />
    );
  }

  // 'natural' — logo with a very subtle rounded-rect background matching logo palette
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, ...style }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(4,44,93,0.04) 0%, rgba(83,22,151,0.04) 50%, rgba(19,161,165,0.04) 100%)',
        borderRadius: 18,
        padding: `${Math.round(px * 0.12)}px ${Math.round(px * 0.18)}px`,
        border: '1px solid rgba(83,22,151,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <img src="/logo.png" alt="PRAGATI" style={{ height: px, width: 'auto', objectFit: 'contain' }} />
      </div>
      {showText && (
        <div>
          <div style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: px * 0.38,
            background: 'linear-gradient(135deg, #042c5d, #531697, #13a1a5)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.05em',
            lineHeight: 1,
          }}>PRAGATI</div>
          <div style={{ fontSize: px * 0.18, color: '#7a8ba8', marginTop: 2, fontWeight: 600 }}>
            Empowering Your Placement Journey
          </div>
        </div>
      )}
    </div>
  );
}
