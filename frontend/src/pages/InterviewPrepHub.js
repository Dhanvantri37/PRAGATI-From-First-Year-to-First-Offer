import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUND_META, ROUND_RESOURCES } from './practice/RESOURCES';

const GRAD = 'linear-gradient(135deg,#531697,#13a1a5)';

const STATS = [
  { icon: '❓', label: 'Practice Questions', value: '200+' },
  { icon: '🎯', label: 'Round Types',        value: '9' },
  { icon: '🔗', label: 'External Resources', value: '40+' },
  { icon: '🏆', label: '360° Coverage',      value: '100%' },
];

export default function InterviewPrepHub() {
  const nav = useNavigate();
  const [activeResource, setActiveResource] = useState(null);

  const rounds = Object.entries(ROUND_META);

  return (
    <div style={{ fontFamily: "'Nunito',sans-serif" }}>
      {/* Hero Header */}
      <div style={{ background: GRAD, borderRadius: 18, padding: '28px 30px', marginBottom: 24, color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -20, top: -20, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', right: 40, bottom: -40, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎯</div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: '1.6rem', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            Interview Prep Hub
          </h1>
          <p style={{ margin: 0, opacity: 0.88, fontSize: '.9rem', lineHeight: 1.6, maxWidth: 500 }}>
            Complete 360° placement preparation — practice all 9 interview round types, 200+ questions, and curated external resources. Everything you need in one place.
          </p>
        </div>
        {/* Stats row */}
        <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
          {STATS.map(s => (
            <div key={s.label} style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>
              <div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1rem', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '.65rem', opacity: 0.8, marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Interview CTA — NEW featured card */}
      <div
        onClick={() => nav('/dashboard/ai-interview')}
        style={{ background: 'linear-gradient(145deg,#042c5d 0%,#1a0d3e 55%,#0c3240 100%)', borderRadius: 14, padding: '20px 22px', marginBottom: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 18, boxShadow: '0 8px 28px rgba(83,22,151,0.28)', transition: 'all .2s' }}
        onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 36px rgba(83,22,151,0.4)'; }}
        onMouseOut={e  => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 28px rgba(83,22,151,0.28)'; }}
      >
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg,#531697,#13a1a5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', flexShrink: 0, boxShadow: '0 4px 16px rgba(83,22,151,0.4)' }}>🎤</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: '1rem', color: '#fff', marginBottom: 4 }}>🤖 AI Mock Interview — Human-Like Interviewer</div>
          <div style={{ fontSize: '.8rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>
            Your AI interviewer adapts <strong style={{ color: 'rgba(255,255,255,0.9)' }}>every question</strong> to your previous answer — with a real animated face, voice, and continuous mic. Just like a real interview.
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {['🎙️ Voice Enabled', '🧠 Adaptive Questions', '📊 Live Scoring', '💻 Tech + HR + Manager'].map(tag => (
              <span key={tag} style={{ padding: '2px 9px', borderRadius: 999, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', fontSize: '.65rem', fontWeight: 700 }}>{tag}</span>
            ))}
          </div>
        </div>
        <div style={{ padding: '10px 20px', borderRadius: 999, background: 'linear-gradient(135deg,#531697,#13a1a5)', color: '#fff', fontWeight: 800, fontSize: '.82rem', flexShrink: 0 }}>Start →</div>
      </div>

      {/* How to prepare banner */}
      <div style={{ background: 'rgba(83,22,151,0.04)', border: '1px solid rgba(83,22,151,0.12)', borderRadius: 12, padding: '14px 18px', marginBottom: 22, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>💡</span>
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.88rem', color: '#531697', marginBottom: 4 }}>How to use this hub</div>
          <div style={{ fontSize: '.8rem', color: 'var(--text-2)', lineHeight: 1.7 }}>
            <strong>Step 1:</strong> Click the AI Mock Interview card above for a fully adaptive voice-enabled interview experience. &nbsp;
            <strong>Step 2:</strong> Click any round card below to practice specific round types. &nbsp;
            <strong>Step 3:</strong> Practice from Company profiles → Recruitment Rounds → 🎯 Practice.
          </div>
        </div>
      </div>

      {/* Round Cards Grid */}
      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.78rem', color: 'var(--text-3)', letterSpacing: '.08em', marginBottom: 12 }}>ALL ROUND TYPES</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14, marginBottom: 28 }}>
        {rounds.map(([key, meta]) => {
          const resources = ROUND_RESOURCES[key] || [];
          const showRes = activeResource === key;
          return (
            <div key={key} style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(4,44,93,0.05)', overflow: 'hidden', transition: 'box-shadow .2s' }}
              onMouseOver={e => e.currentTarget.style.boxShadow = '0 6px 24px rgba(83,22,151,0.12)'}
              onMouseOut={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(4,44,93,0.05)'}>
              {/* Card top */}
              <div style={{ background: meta.bg, padding: '16px 18px', borderBottom: `2px solid ${meta.color}22` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: '1.6rem' }}>{meta.icon}</span>
                  <div>
                    <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.95rem', color: 'var(--text)' }}>{meta.label}</div>
                    <div style={{ fontSize: '.7rem', color: 'var(--text-3)', marginTop: 1 }}>{resources.length} external resources</div>
                  </div>
                </div>
                <div style={{ fontSize: '.78rem', color: 'var(--text-2)', lineHeight: 1.6 }}>{meta.desc}</div>
              </div>

              {/* Card actions */}
              <div style={{ padding: '12px 16px', display: 'flex', gap: 8 }}>
                <button onClick={() => key === 'GD' ? nav('/dashboard/gd') : nav(`/dashboard/practice/${key}`)}
                  style={{ flex: 1, padding: '9px 14px', borderRadius: 9, border: 'none', background: key === 'GD' ? 'linear-gradient(135deg,#2563eb,#13a1a5)' : GRAD, color: '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.8rem', transition: 'opacity .15s' }}
                  onMouseOver={e => e.currentTarget.style.opacity = '0.9'} onMouseOut={e => e.currentTarget.style.opacity = '1'}>
                  {key === 'GD' ? '🎤 Join Live GD Room' : '🎯 Practice Now'}
                </button>
                <button onClick={() => setActiveResource(showRes ? null : key)}
                  style={{ padding: '9px 14px', borderRadius: 9, border: `1.5px solid ${showRes ? meta.color : 'var(--border)'}`, background: showRes ? meta.bg : 'var(--surface)', color: showRes ? meta.color : 'var(--text-3)', fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.8rem', transition: 'all .15s', whiteSpace: 'nowrap' }}>
                  📚 {showRes ? 'Hide' : 'Resources'}
                </button>
              </div>

              {/* Expandable resources */}
              {showRes && (
                <div style={{ padding: '0 16px 14px', borderTop: '1px solid #f0f3fa' }}>
                  <div style={{ fontSize: '.68rem', fontWeight: 800, color: '#b0bec9', marginBottom: 8, marginTop: 8, letterSpacing: '.06em' }}>BEST RESOURCES ONLINE</div>
                  {resources.map((r, i) => (
                    <a key={i} href={r.url} target="_blank" rel="noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, marginBottom: 5, background: '#fafbff', border: '1px solid #e8edf5', textDecoration: 'none', transition: 'all .15s' }}
                      onMouseOver={e => { e.currentTarget.style.background = meta.bg; e.currentTarget.style.borderColor = meta.color + '44'; }}
                      onMouseOut={e => { e.currentTarget.style.background = '#fafbff'; e.currentTarget.style.borderColor = '#e8edf5'; }}>
                      <span style={{ fontSize: '.62rem', fontWeight: 800, padding: '2px 6px', borderRadius: 5, background: r.color + '18', color: r.color, whiteSpace: 'nowrap', flexShrink: 0 }}>{r.tag}</span>
                      <span style={{ fontSize: '.8rem', color: 'var(--text)', fontWeight: 600, flex: 1 }}>{r.name}</span>
                      <span style={{ color: '#b0bec9', fontSize: '.75rem', flexShrink: 0 }}>↗</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Preparation Roadmap */}
      <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', padding: '22px 24px', marginBottom: 20 }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1rem', color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          🗺️ Recommended Preparation Roadmap
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {[
            { week: 'Week 1–2', title: 'Technical Foundations', items: ['DBMS: Normalization, SQL, Transactions', 'OS: Processes, Scheduling, Memory', 'CN: OSI, TCP/IP, HTTP', 'OOPs: 4 pillars, SOLID, Design patterns'], color: '#531697' },
            { week: 'Week 3–4', title: 'DSA & Coding', items: ['Arrays, Strings, Linked Lists', 'Trees, Graphs, Heaps', 'DP, Greedy, Backtracking', 'Practice 2 problems/day on LeetCode'], color: '#13a1a5' },
            { week: 'Week 5', title: 'HR & Behavioral', items: ['Prepare STAR format answers', '15 behavioral questions practiced', 'Company research for each target', 'Mock interviews with friends'], color: '#f59e0b' },
            { week: 'Week 6', title: 'GD & Communication', items: ['Read 3 GD topics/day', 'Practice speaking for 2 min', 'Learn Do\'s & Don\'ts', 'Group practice sessions'], color: '#47d372' },
            { week: 'Week 7', title: 'System Design', items: ['URL shortener, Pastebin', 'Twitter, Instagram, WhatsApp', 'Design patterns: LRU Cache, Rate Limiter', 'Scalability: Load balancing, CDN, DB sharding'], color: '#ef4444' },
            { week: 'Week 8', title: 'Mock & Polish', items: ['Full mock interviews (all rounds)', 'Project presentation rehearsal', 'Aptitude speed practice', 'Resume final review'], color: '#8b5cf6' },
          ].map((phase, i) => (
            <div key={i} style={{ padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${phase.color}22`, background: phase.color + '06' }}>
              <div style={{ fontSize: '.65rem', fontWeight: 800, color: phase.color, letterSpacing: '.06em', marginBottom: 4 }}>{phase.week}</div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.82rem', color: 'var(--text)', marginBottom: 8 }}>{phase.title}</div>
              {phase.items.map((item, j) => (
                <div key={j} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                  <span style={{ color: phase.color, fontSize: '.7rem', flexShrink: 0, marginTop: 2 }}>▸</span>
                  <span style={{ fontSize: '.73rem', color: 'var(--text-2)', lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Company-wise rounds tip */}
      <div style={{ background: 'rgba(19,161,165,0.05)', border: '1px solid rgba(19,161,165,0.18)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>🏢</span>
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.88rem', color: '#0d7a7e', marginBottom: 4 }}>Practice Company-Specific Rounds</div>
          <div style={{ fontSize: '.8rem', color: 'var(--text-2)', lineHeight: 1.7 }}>
            Go to <strong>Companies</strong> page → select a company → scroll to <strong>Recruitment Rounds</strong> → click <strong>🎯 Practice</strong> next to each round to practice round types specific to that company's interview process.
          </div>
          <button onClick={() => nav('/dashboard/companies')}
            style={{ marginTop: 10, padding: '8px 16px', borderRadius: 8, border: 'none', background: 'rgba(19,161,165,0.12)', color: '#0d7a7e', fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.78rem' }}>
            Go to Companies →
          </button>
        </div>
      </div>
    </div>
  );
}
