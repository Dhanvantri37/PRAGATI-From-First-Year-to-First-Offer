/**
 * CompanyLogoCarousel.js
 * ─────────────────────
 * Path: frontend/src/components/CompanyLogoCarousel.js
 *
 * Production-ready infinite logo scroller.
 * Uses only CSS animations — no third-party carousel libs.
 *
 * Props:
 *   reverse  {boolean}  — scroll right→left (default) or left→right
 *   speed    {number}   — seconds for one full cycle (default: 30)
 *   height   {number}   — logo row height in px (default: 44)
 */

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tk  = () => ({ Authorization: `Bearer ${localStorage.getItem('pragati_token')}` });

// ── Skeleton shimmer ──────────────────────────────────────────────────────────
const SkeletonItem = memo(() => (
  <div style={{
    width: 88, height: 40, borderRadius: 10, flexShrink: 0,
    background: 'linear-gradient(90deg, #f0f3fa 25%, #e8edf5 50%, #f0f3fa 75%)',
    backgroundSize: '200% 100%',
    animation: '_shimmer 1.4s ease-in-out infinite',
  }}/>
));

// ── Single logo pill ──────────────────────────────────────────────────────────
const LogoPill = memo(({ company, height, onNavigate }) => {
  const [imgError, setImgError]   = useState(false);
  const [showTip, setShowTip]     = useState(false);

  const initials = company.name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  return (
    <div
      onClick={() => onNavigate(company._id)}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
      title={company.name}
      style={{
        position: 'relative',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: height,
        minWidth: 96,
        padding: '0 12px',
        borderRadius: 12,
        border: '1px solid #e8edf5',
        background: '#fff',
        cursor: 'pointer',
        transition: 'transform .18s ease, box-shadow .18s ease, border-color .18s ease',
        boxSizing: 'border-box',
        userSelect: 'none',
      }}
      onMouseOver={e => {
        e.currentTarget.style.transform = 'scale(1.06) translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 18px rgba(83,22,151,.13)';
        e.currentTarget.style.borderColor = 'rgba(83,22,151,.22)';
      }}
      onMouseOut={e => {
        e.currentTarget.style.transform = 'scale(1) translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = '#e8edf5';
      }}
    >
      {/* Tooltip */}
      {showTip && (
        <div style={{
          position: 'absolute', bottom: '110%', left: '50%',
          transform: 'translateX(-50%)',
          background: '#0f1a2e', color: '#fff',
          padding: '4px 10px', borderRadius: 7,
          fontSize: '.68rem', fontWeight: 700,
          whiteSpace: 'nowrap', pointerEvents: 'none',
          fontFamily: "'Nunito',sans-serif",
          boxShadow: '0 4px 12px rgba(0,0,0,.18)',
          zIndex: 10,
        }}>
          {company.name}
          {/* Arrow */}
          <span style={{
            position: 'absolute', top: '100%', left: '50%',
            transform: 'translateX(-50%)',
            border: '5px solid transparent',
            borderTopColor: '#0f1a2e',
            display: 'block', width: 0, height: 0,
          }}/>
        </div>
      )}

      {/* Logo or initials fallback */}
      {company.logoUrl && !imgError ? (
        <img
          src={company.logoUrl}
          alt={company.name}
          draggable={false}
          onError={() => setImgError(true)}
          style={{
            maxHeight: height - 16,
            maxWidth: 80,
            objectFit: 'contain',
            display: 'block',
            pointerEvents: 'none',
          }}
        />
      ) : (
        <span style={{
          fontFamily: "'Syne',sans-serif",
          fontWeight: 800,
          fontSize: '.78rem',
          color: '#531697',
          letterSpacing: '.04em',
        }}>
          {initials}
        </span>
      )}
    </div>
  );
});

// ── Main Carousel ─────────────────────────────────────────────────────────────
export default function CompanyLogoCarousel({
  reverse = false,
  speed   = 30,
  height  = 44,
}) {
  const navigate              = useNavigate();
  const [companies, setComp]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [paused,  setPaused]  = useState(false);
  const trackRef              = useRef(null);

  // Fetch — only companies with logoUrl are shown
  useEffect(() => {
    fetch(`${API}/companies`, { headers: tk() })
      .then(r => r.json())
      .then(d => {
        const withLogo = (d.companies || []).filter(c => c.logoUrl || c.name);
        setComp(withLogo);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleNavigate = useCallback(id => {
    navigate(`/dashboard/companies`);  // use your existing companies page route
  }, [navigate]);

  // Duplicate items enough times to fill width seamlessly
  // We need at least 3 copies so the loop never shows a gap
  const items = companies.length > 0
    ? [...companies, ...companies, ...companies]
    : [];

  const ITEM_W  = 112;  // minWidth + gap
  const GAP     = 16;
  const setW    = companies.length * (ITEM_W + GAP);

  if (loading) {
    return (
      <div style={{
        background: '#fff', border: '1px solid #e8edf5', borderRadius: 14,
        padding: '14px 24px', marginBottom: 20, overflow: 'hidden',
        display: 'flex', gap: 16, alignItems: 'center',
      }}>
        {Array.from({ length: 8 }).map((_, i) => <SkeletonItem key={i}/>)}
        <style>{`@keyframes _shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      </div>
    );
  }

  if (!companies.length) return null;

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        background: '#fff',
        border: '1px solid #e8edf5',
        borderRadius: 14,
        padding: `12px 0`,
        marginBottom: 20,
        overflow: 'hidden',
        position: 'relative',
        // Fade left + right edges
        WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, #000 8%, #000 92%, transparent 100%)',
        maskImage:       'linear-gradient(90deg, transparent 0%, #000 8%, #000 92%, transparent 100%)',
      }}
    >
      {/* Scrolling track */}
      <div
        ref={trackRef}
        style={{
          display: 'flex',
          gap: GAP,
          alignItems: 'center',
          width: 'max-content',
          padding: '0 24px',
          // CSS animation — translate by 1 set width for seamless loop
          animation: `_scroll${reverse ? 'R' : 'L'} ${speed}s linear infinite`,
          animationPlayState: paused ? 'paused' : 'running',
          willChange: 'transform',
        }}
      >
        {items.map((company, i) => (
          <LogoPill
            key={`${company._id}-${i}`}
            company={company}
            height={height}
            onNavigate={handleNavigate}
          />
        ))}
      </div>

      <style>{`
        /* Scroll left (default) */
        @keyframes _scrollL {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-${setW + GAP}px); }
        }
        /* Scroll right (reverse) */
        @keyframes _scrollR {
          0%   { transform: translateX(-${setW + GAP}px); }
          100% { transform: translateX(0); }
        }
        /* Shimmer for skeleton */
        @keyframes _shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}