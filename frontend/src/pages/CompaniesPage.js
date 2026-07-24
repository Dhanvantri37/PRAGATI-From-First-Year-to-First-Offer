/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import CompanyLogoCarousel from "../components/CompanyLogoCarousel";

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Round type mapping: text label → route param
const ROUND_TYPE_MAP = {
  'technical': 'TECHNICAL', 'tech': 'TECHNICAL', 'technical interview': 'TECHNICAL',
  'hr': 'HR', 'hr interview': 'HR', 'human resources': 'HR',
  'gd': 'GD', 'group discussion': 'GD',
  'case study': 'CASE_STUDY', 'case': 'CASE_STUDY',
  'system design': 'SYSTEM_DESIGN', 'design': 'SYSTEM_DESIGN',
  'project': 'PROJECT', 'project presentation': 'PROJECT',
  'gaming': 'GAMING', 'game': 'GAMING',
  'puzzle': 'PUZZLE', 'puzzles': 'PUZZLE',
  'debugging': 'DEBUGGING', 'debug': 'DEBUGGING', 'coding': 'TECHNICAL',
  'aptitude': 'APTITUDE', 'online test': 'APTITUDE',
};

function getRoundType(roundText) {
  if (!roundText) return null;
  const lower = roundText.toLowerCase().trim();
  for (const [key, val] of Object.entries(ROUND_TYPE_MAP)) {
    if (lower.includes(key)) return val;
  }
  return null;
}
const tk  = () => ({ Authorization: `Bearer ${localStorage.getItem('pragati_token')}` });
const tks = () => ({ ...tk(), 'Content-Type': 'application/json' });

const DIFF_STYLE = {
  Easy:   { bg:'rgba(21,128,61,.08)',  color: 'var(--text-3)', border:'rgba(21,128,61,.2)'  },
  Medium: { bg:'rgba(217,119,6,.08)',  color:'#b45309', border:'rgba(217,119,6,.2)'  },
  Hard:   { bg:'rgba(185,28,28,.07)',  color:'var(--text)', border:'rgba(185,28,28,.18)' },
};
const STATUS_STYLE = {
  visited:  { bg:'rgba(83,22,151,.08)',  color:'#531697' },
  upcoming: { bg:'rgba(19,161,165,.08)', color: 'var(--text)' },
  expected: { bg:'rgba(245,158,11,.08)', color:'var(--text-2)' },
};

// ── Logo ticker ───────────────────────────────────────────────────────────────
function LogoTicker({ companies, brokenLogos, onBrokenLogo }) {
  const logos = companies.filter(c => c.logoUrl && !brokenLogos[c._id]);
  if (!logos.length) return null;

  // Duplicate for infinite scroll
  const items = [...logos, ...logos];

  return (
    <div style={{ background:'var(--surface)', border:'1px solid #e8edf5', borderRadius:14, padding:'14px 0', marginBottom:20, overflow:'hidden', position:'relative' }}>
      <div style={{ position:'absolute', left:0, top:0, bottom:0, width:60, background:'linear-gradient(90deg,#fff,transparent)', zIndex:2, pointerEvents:'none' }}/>
      <div style={{ position:'absolute', right:0, top:0, bottom:0, width:60, background:'linear-gradient(270deg,#fff,transparent)', zIndex:2, pointerEvents:'none' }}/>
      <div style={{ display:'flex', gap:40, alignItems:'center', animation:'_ticker 12s linear infinite', width:'max-content', padding:'0 20px' }}>
        {items.map((c, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
            <img src={c.logoUrl} alt={c.name}
              style={{ height:32, maxWidth:90, objectFit:'contain', filter:'grayscale(20%)' }}
              onError={() => { onBrokenLogo(c._id); }}/>
            <span style={{ fontSize:'.85rem', fontWeight:700, color:'var(--text-3)' }}>{c.name}</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes _ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes _ticker:hover { animation-play-state:paused }
      `}</style>
    </div>
  );
}

// ── Company card (Internshala-style) ──────────────────────────────────────────
function CompanyCard({ company, onPin, onCompareToggle, compareSelected, onViewDetail }) {
  const ds = DIFF_STYLE[company.difficulty] || DIFF_STYLE.Easy;
  const ss = STATUS_STYLE[company.status]   || { bg:'rgba(100,116,139,.08)', color:'#64748b' };
  const [pinLoading, setPinLoading] = useState(false);

  async function handlePin(e) {
    e.stopPropagation();
    setPinLoading(true);
    try {
      const res = await fetch(`${API}/companies/${company._id}/pin`, { method:'POST', headers:tk() });
      const d   = await res.json();
      onPin(company._id, d.pinned);
    } finally { setPinLoading(false); }
  }

  function handleCompare(e) {
    e.stopPropagation();
    onCompareToggle(company);
  }

  return (
    <div style={{ background:'var(--surface)', border:`1.5px solid ${compareSelected?'#531697':'#e8edf5'}`, borderRadius:16, padding:'18px 18px 14px', boxShadow: compareSelected?'0 0 0 3px rgba(83,22,151,.12)':'0 2px 8px rgba(4,44,93,.05)', transition:'all .2s', position:'relative', display:'flex', flexDirection:'column', gap:10 }}
      onMouseOver={e=>{ if(!compareSelected) e.currentTarget.style.boxShadow='0 8px 24px rgba(4,44,93,.1)'; }}
      onMouseOut={e=>{ if(!compareSelected) e.currentTarget.style.boxShadow='0 2px 8px rgba(4,44,93,.05)'; }}>

      {/* Pin + Compare buttons (top-right like Internshala) */}
      <div style={{ display:'flex', gap:6, position:'absolute', top:14, right:14 }}>
        <button onClick={handlePin} disabled={pinLoading} title={company.pinned?'Unpin':'Pin this company'}
          style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:999, border:`1px solid ${company.pinned?'#f59e0b':'#d0d7e8'}`, background:company.pinned?'rgba(245,158,11,.1)':'#fff', cursor:'pointer', fontSize:'.72rem', fontWeight:700, color:company.pinned?'#92400e':'var(--text-3)', fontFamily:"'Nunito',sans-serif", transition:'all .15s' }}>
          {company.pinned ? '📌 Pinned' : '☆ Pin'}
        </button>
        <button onClick={handleCompare} title={compareSelected?'Remove from compare':'Add to compare'}
          style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:999, border:`1px solid ${compareSelected?'#531697':'#d0d7e8'}`, background:compareSelected?'rgba(83,22,151,.1)':'#fff', cursor:'pointer', fontSize:'.72rem', fontWeight:700, color:compareSelected?'#531697':'var(--text-3)', fontFamily:"'Nunito',sans-serif", transition:'all .15s' }}>
          ⇄ Compare
        </button>
      </div>

      {/* Logo + Name */}
      <div style={{ display:'flex', alignItems:'center', gap:12, paddingRight:140 }}>
        <div style={{ width:52, height:52, borderRadius:10, border:'1px solid #e8edf5', background:'#f8f9fc', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
          {company.logoUrl
            ? <img src={company.logoUrl} alt={company.name} style={{ width:'100%', height:'100%', objectFit:'contain', padding:4 }}
                onError={e=>{ e.target.style.display='none'; e.target.parentElement.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:800;font-size:1.1rem;color:#531697;background:rgba(83,22,151,0.08);border-radius:10px">${company.name.charAt(0)}</div>`; }}/>
            : <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', color:'#531697' }}>{company.name.slice(0,2).toUpperCase()}</span>
          }
        </div>
        <div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1rem', color:'var(--text)' }}>{company.name}</div>
          <div style={{ fontSize:'.75rem', color:'var(--text-3)', marginTop:1 }}>{company.sector}</div>
        </div>
      </div>

      {/* Badges row */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
        <span style={{ padding:'2px 8px', borderRadius:999, fontSize:'.68rem', fontWeight:700, background:ds.bg, color:ds.color, border:`1px solid ${ds.border}` }}>{company.difficulty || '—'}</span>
        <span style={{ padding:'2px 8px', borderRadius:999, fontSize:'.68rem', fontWeight:700, background:ss.bg, color:ss.color }}>
          {company.status === 'visited' ? '✓ Visited' : company.status === 'upcoming' ? '⏳ Upcoming' : company.status === 'expected' ? '📅 Expected' : '-'}
        </span>
        {company.ctc && <span style={{ padding:'2px 8px', borderRadius:999, fontSize:'.68rem', fontWeight:700, background:'rgba(71,211,114,.08)', color:'#166534' }}>💰 {company.ctc}</span>}
      </div>

      {/* Roles */}
      {company.roles?.length > 0 && (
        <div>
          <div style={{ fontSize:'.68rem', fontWeight:700, color:'#b0bec9', marginBottom:4, letterSpacing:'.05em' }}>ROLES OFFERED</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
            {company.roles.slice(0,3).map((r,i) => (
              <span key={i} style={{ padding:'2px 7px', borderRadius:6, background:'#f0f3fa', color:'var(--text-2)', fontSize:'.7rem' }}>{r}</span>
            ))}
            {company.roles.length > 3 && <span style={{ fontSize:'.7rem', color:'#b0bec9' }}>+{company.roles.length-3} more</span>}
          </div>
        </div>
      )}

      {/* Eligibility */}
      {company.eligibilityCriteria?.minCGPA && (
        <div style={{ fontSize:'.73rem', color:'var(--text-3)' }}>
          Min CGPA: <strong style={{ color:'var(--text)' }}>{company.eligibilityCriteria.minCGPA}</strong>
          {company.eligibilityCriteria.allowedBranches?.length > 0 &&
            <span style={{ marginLeft:8 }}>· Branches: <strong style={{ color:'var(--text)' }}>{company.eligibilityCriteria.allowedBranches.slice(0,3).join(', ')}{company.eligibilityCriteria.allowedBranches.length>3?'…':''}</strong></span>
          }
        </div>
      )}

      {/* Tags */}
      {company.tags?.length > 0 && (
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
          {company.tags.map(t => (
            <span key={t} style={{ padding:'1px 7px', borderRadius:999, background:'rgba(83,22,151,.05)', color:'#531697', fontSize:'.65rem', fontWeight:600 }}>#{t}</span>
          ))}
        </div>
      )}

      {/* View Details button */}
      <div style={{ display:'flex', gap:8, marginTop:4 }}>
        <button onClick={()=>onViewDetail(company)}
          style={{ flex:1, padding:'9px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#042c5d,#531697)', color:'#fff', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.82rem' }}>
          View Details →
        </button>
        {company.website && (
          <a href={company.website} target="_blank" rel="noreferrer"
            style={{ padding:'9px 12px', borderRadius:9, border:'1px solid #d0d7e8', background:'transparent', color:'#531697', fontWeight:700, textDecoration:'none', fontSize:'.78rem', display:'flex', alignItems:'center' }}>
            🌐
          </a>
        )}
      </div>
    </div>
  );
}

// ── Compare modal ─────────────────────────────────────────────────────────────
function CompareModal({ companies, onClose }) {
  const fields = [
    { label:'Sector',          key: c => c.sector || '—' },
    { label:'Difficulty',      key: c => c.difficulty || '—' },
    { label:'CTC',             key: c => c.ctc || '—' },
    { label:'Min CGPA',        key: c => c.eligibilityCriteria?.minCGPA || '—' },
    { label:'Status',          key: c => c.status === 'visited' ? 'Visited' : c.status === 'upcoming' ? 'Upcoming' : c.status === 'expected' ? 'Expected' : '-' },
    { label:'Rounds',          key: c => c.recruitmentRounds?.length ? `${c.recruitmentRounds.length} rounds` : '—' },
    { label:'Roles',           key: c => (c.roles||[]).join(', ') || '—' },
    { label:'Allowed Branches',key: c => (c.eligibilityCriteria?.allowedBranches||[]).join(', ') || 'All' },
    { label:'Bond',            key: c => c.eligibilityCriteria?.backlogs ? 'Backlogs allowed' : 'No backlogs' },
    { label:'Campus Visit',    key: c => c.campusVisitDate && c.campusVisitDate !== '-' ? new Date(c.campusVisitDate).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '-' },
    { label:'Tags',            key: c => (c.tags||[]).join(', ') || '—' },
  ];

  const diffScore = { Easy:3, Medium:2, Hard:1 };
  const getBetter = (field, vals) => {
    if (field === 'Min CGPA') {
      const mn = Math.min(...vals.filter(v=>v!=='—').map(Number));
      return vals.map(v => v !== '—' && Number(v) === mn);
    }
    if (field === 'Difficulty') {
      const mx = Math.max(...vals.map(v => diffScore[v]||0));
      return vals.map(v => (diffScore[v]||0) === mx);
    }
    return vals.map(()=>false);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'var(--surface)', borderRadius:20, width:'100%', maxWidth:900, maxHeight:'90vh', overflow:'auto', padding:'28px 28px', boxShadow:'0 24px 60px rgba(0,0,0,.2)' }} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.15rem', color:'var(--text)' }}>⇄ Comparing {companies.length} Companies</div>
            <div style={{ fontSize:'.78rem', color:'var(--text-3)', marginTop:2 }}>Side-by-side comparison of placement details</div>
          </div>
          <button onClick={onClose} style={{ width:34, height:34, borderRadius:'50%', border:'none', background:'#f0f3fa', color:'var(--text-3)', cursor:'pointer', fontSize:'.95rem', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>

        {/* Company headers */}
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:600 }}>
            <thead>
              <tr>
                <th style={{ padding:'10px 14px', textAlign:'left', fontSize:'.75rem', fontWeight:700, color:'var(--text-3)', background:'#f8f9fc', borderRadius:'8px 0 0 8px', width:150 }}>PARAMETER</th>
                {companies.map(c => (
                  <th key={c._id} style={{ padding:'12px 16px', textAlign:'center', background:'#f8f9fc', borderLeft:'1px solid #e8edf5' }}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                      {c.logoUrl && <img src={c.logoUrl} alt={c.name} style={{ height:36, maxWidth:80, objectFit:'contain' }} onError={e=>e.target.style.display='none'}/>}
                      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.9rem', color:'var(--text)' }}>{c.name}</div>

                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fields.map((field, fi) => {
                const vals = companies.map(c => field.key(c));
                const better = getBetter(field.label, vals);
                return (
                  <tr key={fi} style={{ borderBottom:'1px solid #f0f3fa', background: fi%2===0 ? '#fafbff' : '#fff' }}>
                    <td style={{ padding:'10px 14px', fontSize:'.78rem', fontWeight:700, color:'var(--text-2)' }}>{field.label}</td>
                    {companies.map((c, ci) => {
                      const val = vals[ci];
                      const isBetter = better[ci];
                      return (
                        <td key={c._id} style={{ padding:'10px 16px', textAlign:'center', borderLeft:'1px solid #f0f3fa', fontSize:'.8rem', color: isBetter?'#166534':'var(--text-2)', fontWeight: isBetter?700:400, background: isBetter?'rgba(21,128,61,.05)':'transparent' }}>
                          {isBetter ? <span>⭐ {val}</span> : val}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {/* Recruitment rounds row */}
              <tr style={{ borderBottom:'1px solid #f0f3fa' }}>
                <td style={{ padding:'10px 14px', fontSize:'.78rem', fontWeight:700, color:'var(--text-2)', verticalAlign:'top' }}>Recruitment Rounds</td>
                {companies.map(c => (
                  <td key={c._id} style={{ padding:'10px 16px', borderLeft:'1px solid #f0f3fa', verticalAlign:'top' }}>
                    {(c.recruitmentRounds||[]).map((r,i) => (
                      <div key={i} style={{ display:'flex', gap:6, alignItems:'flex-start', marginBottom:4 }}>
                        <span style={{ width:18, height:18, borderRadius:'50%', background:'rgba(83,22,151,.1)', color:'#531697', fontSize:'.65rem', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>{i+1}</span>
                        <span style={{ fontSize:'.73rem', color:'var(--text-2)', lineHeight:1.4 }}>{r}</span>
                      </div>
                    ))}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Verdict row */}
        <div style={{ display:'grid', gridTemplateColumns:`repeat(${companies.length}, 1fr)`, gap:10, marginTop:20, paddingTop:16, borderTop:'1px solid #e8edf5' }}>
          <div style={{ gridColumn:'1/-1', fontSize:'.72rem', fontWeight:800, color:'var(--text-3)', marginBottom:4, letterSpacing:'.06em' }}>OVERALL RECOMMENDATION</div>
          {companies.map(c => {
            const score = (c.difficulty==='Easy'?3:c.difficulty==='Medium'?2:1) +
              (c.eligibilityCriteria?.minCGPA <= 6.5 ? 2 : 1) +
              (c.status==='visited'?3:c.status==='upcoming'?2:1);
            const label = score >= 7 ? '🟢 Best fit for most students' : score >= 5 ? '🟡 Good with preparation' : '🔴 Requires strong profile';
            return (
              <div key={c._id} style={{ padding:'10px 14px', borderRadius:10, background:score>=7?'rgba(21,128,61,.06)':score>=5?'rgba(217,119,6,.06)':'rgba(185,28,28,.04)', border:`1px solid ${score>=7?'rgba(21,128,61,.2)':score>=5?'rgba(217,119,6,.2)':'rgba(185,28,28,.15)'}`, textAlign:'center' }}>
                <div style={{ fontWeight:700, fontSize:'.78rem', color:'var(--text)', marginBottom:2 }}>{c.name}</div>
                <div style={{ fontSize:'.73rem', color:score>=7?'#166534':score>=5?'#92400e':'#991b1b' }}>{label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Company Detail Modal ───────────────────────────────────────────────────────
function CompanyDetail({ company, onClose, onPin, onEdit, onDelete }) {
  const { user } = useAuth();
  const ds = DIFF_STYLE[company.difficulty] || DIFF_STYLE.Easy;
  const ss = STATUS_STYLE[company.status] || STATUS_STYLE.expected;
  const [pinLoading, setPinLoading] = useState(false);
  const nav = useNavigate();

  async function handlePin() {
    setPinLoading(true);
    try {
      const res = await fetch(`${API}/companies/${company._id}/pin`, { method:'POST', headers:tk() });
      const d   = await res.json();
      onPin(company._id, d.pinned);
    } finally { setPinLoading(false); }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ background:'var(--surface)', borderRadius:20, width:'100%', maxWidth:680, maxHeight:'90vh', overflow:'auto', boxShadow:'0 24px 60px rgba(0,0,0,.2)' }} onClick={e=>e.stopPropagation()}>
        {/* Header strip */}
        <div style={{ background:'linear-gradient(135deg,#042c5d,#531697)', padding:'24px 26px', borderRadius:'20px 20px 0 0' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div style={{ display:'flex', gap:14, alignItems:'center' }}>
              {company.logoUrl && (
                <div style={{ width:56, height:56, background:'var(--surface)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', padding:6 }}>
                  <img src={company.logoUrl} alt={company.name} style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain' }}
                    onError={e=>{ e.target.style.display='none'; e.target.parentElement.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:800;font-size:2rem;color:#531697">${company.name.charAt(0)}</div>`; }}/>
                </div>
              )}
              <div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.3rem', color:'#fff' }}>{company.name}</div>
                <div style={{ color:'rgba(255,255,255,.7)', fontSize:'.82rem' }}>{company.sector}</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              {(user?.role === 'admin' || user?.role === 'faculty') && (
                <>
                  <button onClick={() => onEdit(company)}
                    style={{ padding:'6px 14px', borderRadius:9, border:'1px solid rgba(255,255,255,.3)', background:'rgba(255,255,255,.1)', color:'#fff', fontWeight:700, cursor:'pointer', fontSize:'.78rem', fontFamily:"'Nunito',sans-serif" }}>
                    ✏️ Edit
                  </button>
                  <button onClick={() => onDelete(company._id, company.name)}
                    style={{ padding:'6px 14px', borderRadius:9, border:'1px solid rgba(239,68,68,.4)', background:'rgba(239,68,68,.15)', color:'#fca5a5', fontWeight:700, cursor:'pointer', fontSize:'.78rem', fontFamily:"'Nunito',sans-serif" }}>
                    🗑️ Delete
                  </button>
                </>
              )}
              <button onClick={handlePin} disabled={pinLoading}
                style={{ padding:'6px 14px', borderRadius:9, border:`1px solid ${company.pinned?'#f59e0b':'rgba(255,255,255,.3)'}`, background:company.pinned?'rgba(245,158,11,.2)':'rgba(255,255,255,.1)', color:company.pinned?'#fcd34d':'#fff', fontWeight:700, cursor:'pointer', fontSize:'.78rem', fontFamily:"'Nunito',sans-serif" }}>
                {company.pinned ? '📌 Pinned' : '☆ Pin'}
              </button>
              <button onClick={onClose} style={{ width:32, height:32, borderRadius:'50%', border:'none', background:'rgba(255,255,255,.15)', color:'#fff', cursor:'pointer', fontSize:'.9rem', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ display:'flex', gap:16, marginTop:16, flexWrap:'wrap' }}>
            {[
              ['💰', 'CTC', company.ctc||'—'],
              ['📊', 'Difficulty', company.difficulty||'—'],
              ['📅', 'Status', company.status === 'visited' ? 'Visited' : company.status === 'upcoming' ? 'Upcoming' : company.status === 'expected' ? 'Expected' : '-'],
              ['🎓', 'Min CGPA', company.eligibilityCriteria?.minCGPA||'—'],
            ].map(([ic,l,v]) => (
              <div key={l} style={{ background:'rgba(255,255,255,.12)', borderRadius:10, padding:'8px 14px', minWidth:90 }}>
                <div style={{ fontSize:'.62rem', color:'rgba(255,255,255,.55)', fontWeight:700 }}>{ic} {l}</div>
                <div style={{ color:'#fff', fontWeight:800, fontSize:'.88rem', marginTop:2 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:'22px 26px', display:'flex', flexDirection:'column', gap:16 }}>
          {company.roles?.length > 0 && (
            <Section title="🎯 Roles Offered">
              <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                {company.roles.map((r,i) => <Tag key={i}>{r}</Tag>)}
              </div>
            </Section>
          )}

          {company.eligibilityCriteria?.allowedBranches?.length > 0 && (
            <Section title="✅ Eligible Branches">
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {company.eligibilityCriteria.allowedBranches.map((b,i) => (
                  <span key={i} style={{ padding:'3px 10px', borderRadius:7, background:'rgba(21,128,61,.07)', color:'#166534', fontSize:'.75rem', fontWeight:600 }}>{b}</span>
                ))}
              </div>
            </Section>
          )}

          {company.recruitmentRounds?.length > 0 && (
            <Section title="🔁 Recruitment Rounds">
              {company.recruitmentRounds.map((r,i) => {
                const roundType = getRoundType(r);
                return (
                  <div key={i} style={{ display:'flex', gap:10, alignItems:'center', marginBottom:10, padding:'10px 14px', borderRadius:10, border:'1px solid #e8edf5', background:'#fafbff' }}>
                    <span style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontSize:'.72rem', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{i+1}</span>
                    <span style={{ flex:1, fontSize:'.82rem', color:'var(--text-2)', lineHeight:1.5 }}>{r}</span>
                    {roundType && (
                      <button
                        onClick={() => { onClose(); nav(roundType === 'APTITUDE' ? '/dashboard/aptitude' : `/dashboard/practice/${roundType}`); }}
                        style={{ padding:'5px 12px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.7rem', flexShrink:0, whiteSpace:'nowrap' }}>
                        🎯 Practice
                      </button>
                    )}
                  </div>
                );
              })}
            </Section>
          )}

          {company.companyOverview && (
            <Section title="🏢 Company Overview">
              <DetailText>{company.companyOverview}</DetailText>
            </Section>
          )}

          {company.techStack?.length > 0 && (
            <Section title="💻 Tech Stack">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {company.techStack.map((tech, i) => (
                  <span key={i} style={{ padding: '3px 10px', borderRadius: 7, background: 'rgba(83,22,151,.07)', color: '#531697', fontSize: '.75rem', fontWeight: 600 }}>{tech}</span>
                ))}
              </div>
            </Section>
          )}

          {company.workCulture && (
            <Section title="🌟 Work Culture">
              <DetailText>{company.workCulture}</DetailText>
            </Section>
          )}

          {company.growthPath && (
            <Section title="📈 Career Growth Path">
              <DetailText>{company.growthPath}</DetailText>
            </Section>
          )}

          {(company.bondDetails || company.hiringMode || company.testPlatform || company.packageBreakdown) && (
            <Section title="⚖️ Service, Package & Platform Details">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '12px 14px', background: '#f8f9fc', border: '1px solid #e8edf5', borderRadius: 12 }}>
                {company.packageBreakdown && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ fontSize: '.68rem', fontWeight: 700, color: '#b0bec9', display: 'block', marginBottom: 2 }}>SALARY BREAKDOWN</span>
                    <span style={{ fontSize: '.8rem', color: 'var(--text-2)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{company.packageBreakdown}</span>
                  </div>
                )}
                {company.bondDetails && (
                  <div>
                    <span style={{ fontSize: '.68rem', fontWeight: 700, color: '#b0bec9', display: 'block', marginBottom: 2 }}>SERVICE BOND DETAILS</span>
                    <span style={{ fontSize: '.8rem', color: 'var(--text-2)' }}>{company.bondDetails}</span>
                  </div>
                )}
                {company.hiringMode && (
                  <div>
                    <span style={{ fontSize: '.68rem', fontWeight: 700, color: '#b0bec9', display: 'block', marginBottom: 2 }}>HIRING MODE</span>
                    <span style={{ fontSize: '.8rem', color: 'var(--text-2)' }}>{company.hiringMode}</span>
                  </div>
                )}
                {company.testPlatform && (
                  <div>
                    <span style={{ fontSize: '.68rem', fontWeight: 700, color: '#b0bec9', display: 'block', marginBottom: 2 }}>TEST ASSESSMENT PLATFORM</span>
                    <span style={{ fontSize: '.8rem', color: 'var(--text-2)' }}>{company.testPlatform}</span>
                  </div>
                )}
              </div>
            </Section>
          )}

          {company.aptitudePatterns && <Section title="🧠 Aptitude Pattern"><DetailText>{company.aptitudePatterns}</DetailText></Section>}
          {company.interviewPatterns && <Section title="💬 Interview Pattern"><DetailText>{company.interviewPatterns}</DetailText></Section>}
          {company.jdText && <Section title="📄 Job Description / Company Intel"><DetailText>{company.jdText}</DetailText></Section>}
          {company.prepTips && (
            <Section title="💡 Preparation Tips">
              <div style={{ padding:'12px 14px', background:'rgba(83,22,151,.04)', borderRadius:10, border:'1px solid rgba(83,22,151,.1)', fontSize:'.83rem', color:'var(--text-2)', lineHeight:1.7 }}>{company.prepTips}</div>
            </Section>
          )}

          {company.resources?.length > 0 && (
            <Section title="📚 Additional Resources & Prep Blogs">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {company.resources.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer"
                    style={{ fontSize: '.8rem', color: '#531697', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                    <span>🔗</span> <span style={{ textDecoration: 'underline' }}>{url}</span>
                  </a>
                ))}
              </div>
            </Section>
          )}

          {company.website && (
            <a href={company.website} target="_blank" rel="noreferrer"
              style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'10px 18px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#042c5d,#531697)', color:'#fff', fontWeight:800, textDecoration:'none', fontSize:'.85rem', alignSelf:'flex-start' }}>
              🌐 Visit Official Website →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.82rem', color:'var(--text)', marginBottom:8, letterSpacing:'.03em' }}>{title}</div>
      {children}
    </div>
  );
}
function Tag({ children }) {
  return <span style={{ padding:'3px 10px', borderRadius:7, background:'#f0f3fa', color:'var(--text-2)', fontSize:'.75rem', fontWeight:600 }}>{children}</span>;
}
function DetailText({ children }) {
  return <div style={{ fontSize:'.83rem', color:'var(--text-2)', lineHeight:1.75, whiteSpace:'pre-wrap' }}>{children}</div>;
}

// ── Compare tray (bottom bar when companies selected) ─────────────────────────
function CompareTray({ selected, onRemove, onCompare, onClear }) {
  if (!selected.length) return null;
  return (
    <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:500, background:'var(--surface)', borderTop:'2px solid #531697', padding:'12px 24px', display:'flex', alignItems:'center', gap:12, boxShadow:'0 -4px 24px rgba(83,22,151,.12)', fontFamily:"'Nunito',sans-serif" }}>
      <div style={{ fontWeight:700, fontSize:'.82rem', color:'#531697', flexShrink:0 }}>⇄ Compare ({selected.length}/3)</div>
      <div style={{ display:'flex', gap:8, flex:1, flexWrap:'wrap' }}>
        {selected.map(c => (
          <div key={c._id} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 10px', borderRadius:9, border:'1px solid #d0d7e8', background:'#f8f9fc' }}>
            {c.logoUrl && <img src={c.logoUrl} alt={c.name} style={{ height:18, maxWidth:40, objectFit:'contain' }} onError={e=>e.target.style.display='none'}/>}
            <span style={{ fontSize:'.78rem', fontWeight:700, color:'var(--text)' }}>{c.name}</span>
            <button onClick={()=>onRemove(c._id)} style={{ border:'none', background:'none', color:'#b0bec9', cursor:'pointer', fontSize:'.8rem', padding:0 }}>✕</button>
          </div>
        ))}
      </div>
      <button onClick={onClear} style={{ padding:'7px 14px', borderRadius:9, border:'1px solid #d0d7e8', background:'transparent', color:'var(--text-3)', fontWeight:700, cursor:'pointer', fontSize:'.78rem' }}>Clear All</button>
      <button onClick={onCompare} disabled={selected.length < 2}
        style={{ padding:'8px 20px', borderRadius:9, border:'none', background:selected.length>=2?'linear-gradient(135deg,#531697,#13a1a5)':'#d0d7e8', color:'#fff', fontWeight:800, cursor:selected.length>=2?'pointer':'not-allowed', fontSize:'.85rem' }}>
        Compare Now {selected.length >= 2 ? `(${selected.length})` : ''}
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CompaniesPage() {
  const { user } = useAuth();
  const [companies, setCompanies]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [filterStatus, setFStatus]    = useState('');
  const [filterDiff, setFDiff]        = useState('');
  const [filterSector, setFSector]    = useState('');
  const [showPinned, setShowPinned]   = useState(false);
  const [tab, setTab]                 = useState('all');    // all | pinned
  const [detailCompany, setDetail]    = useState(null);
  const [compareList, setCompare]     = useState([]);       // max 3
  const [showCompare, setShowCompare] = useState(false);

  // AI retrieval states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSuccess, setAiSuccess] = useState('');

  // Broken logos state
  const [brokenLogos, setBrokenLogos] = useState({});

  // AI Retrieve Preview & Confirmation states
  const [aiPreviewCompany, setAiPreviewCompany] = useState(null);
  const [confirmSaveLoading, setConfirmSaveLoading] = useState(false);

  // Edit / Delete states
  const [editingCompany, setEditingCompany] = useState(null);

  useEffect(() => {
    fetch(`${API}/companies`, { headers: tk() })
      .then(r => r.json())
      .then(d => setCompanies(d.companies || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Handler for broken logo ticker detection
  function handleBrokenLogo(id) {
    setBrokenLogos(prev => ({ ...prev, [id]: true }));
  }

  // Preview AI Retrieve (Step 1)
  async function handleAiRetrieve() {
    if (!search.trim() || aiLoading) return;
    setAiLoading(true);
    setAiError('');
    setAiSuccess('');
    try {
      const res = await fetch(`${API}/companies/ai-retrieve`, {
        method: 'POST',
        headers: tks(),
        body: JSON.stringify({ name: search.trim() })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to retrieve company');
      
      if (d.isPreview) {
        setAiPreviewCompany(d.company);
      } else {
        // Company already exists in DB
        setCompanies(cs => {
          if (cs.some(c => c._id === d.company._id)) return cs;
          return [d.company, ...cs];
        });
        setAiSuccess(d.message || 'Company already exists in database');
        setDetail(d.company);
      }
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  }

  // Confirm and Save Researched Company (Step 2)
  async function handleConfirmSaveRetrieved() {
    if (!aiPreviewCompany || confirmSaveLoading) return;
    setConfirmSaveLoading(true);
    try {
      const res = await fetch(`${API}/companies/ai-retrieve`, {
        method: 'POST',
        headers: tks(),
        body: JSON.stringify({ confirmSave: true, companyData: aiPreviewCompany })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to save company');

      setCompanies(cs => {
        if (cs.some(c => c._id === d.company._id)) return cs;
        return [d.company, ...cs];
      });
      setAiSuccess(d.message);
      setDetail(d.company);
      setAiPreviewCompany(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setConfirmSaveLoading(false);
    }
  }

  // Faculty / Admin Edit Company
  function handleEditCompany(company) {
    setEditingCompany(company);
  }

  // Save Edited Company
  function handleSaveEditedCompany(updatedCompany) {
    setCompanies(cs => cs.map(c => c._id === updatedCompany._id ? updatedCompany : c));
    if (detailCompany?._id === updatedCompany._id) {
      setDetail(updatedCompany);
    }
  }

  // Faculty / Admin Delete Company
  async function handleDeleteCompany(id, name) {
    const confirm = window.confirm(`Are you sure you want to permanently delete "${name}" from the database?`);
    if (!confirm) return;

    try {
      const res = await fetch(`${API}/companies/${id}`, {
        method: 'DELETE',
        headers: tk()
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to delete company');

      setCompanies(cs => cs.filter(c => c._id !== id));
      setCompare(prev => prev.filter(c => c._id !== id));
      setDetail(null);
      alert(d.message || 'Company deleted successfully');
    } catch (err) {
      alert(err.message);
    }
  }

  function handlePin(id, pinned) {
    setCompanies(cs => cs.map(c => c._id === id ? { ...c, pinned } : c));
    if (detailCompany?._id === id) setDetail(d => ({ ...d, pinned }));
  }

  function handleCompareToggle(company) {
    setCompare(prev => {
      const exists = prev.find(c => c._id === company._id);
      if (exists) return prev.filter(c => c._id !== company._id);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, company];
    });
  }

  const sectors = [...new Set(companies.map(c => c.sector).filter(Boolean))];

  const filtered = companies.filter(c => {
    if (tab === 'pinned' && !c.pinned) return false;
    if (search.trim() && !c.name.toLowerCase().includes(search.toLowerCase()) && !(c.sector||'').toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    if (filterDiff   && c.difficulty !== filterDiff) return false;
    if (filterSector && c.sector !== filterSector) return false;
    return true;
  });

  const TABS = [
    { id:'all',    label:`🏢 All Companies (${companies.length})` },
    { id:'pinned', label:`📌 Pinned (${companies.filter(c=>c.pinned).length})` },
  ];

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif", paddingBottom: compareList.length ? 80 : 0 }}>
      {/* Page header */}
      <div style={{ marginBottom:18 }}>
        <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.5rem', color:'var(--text)' }}>🏢 Company Hub</h1>
        <p style={{ color:'var(--text-3)', marginTop:4 }}>Pin companies, compare side-by-side, and explore detailed prep guides</p>
      </div>

      {/* Running logo ticker */}
      <LogoTicker companies={companies} brokenLogos={brokenLogos} onBrokenLogo={handleBrokenLogo}/>

      {/* Tabs */}
      <div style={{ display:'flex', gap:5, marginBottom:16, borderBottom:'1px solid #e8edf5' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ padding:'8px 16px', borderRadius:'9px 9px 0 0', border:'none', borderBottom:tab===t.id?'2px solid #531697':'2px solid transparent', background:tab===t.id?'rgba(83,22,151,.06)':'transparent', color:tab===t.id?'#531697':'var(--text-3)', fontWeight:700, cursor:'pointer', fontSize:'.83rem', fontFamily:"'Nunito',sans-serif" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters bar */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        {/* Search */}
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#b0bec9' }}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search company or sector…"
            style={{ width:'100%', padding:'9px 12px 9px 34px', borderRadius:9, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.85rem', outline:'none', background:'#fafbff' }}/>
        </div>
        {[
          { label:'All Status', val:filterStatus, set:setFStatus, opts:[['','All Status'],['visited','Visited'],['upcoming','Upcoming'],['expected','Expected']] },
          { label:'All Difficulty', val:filterDiff, set:setFDiff, opts:[['','All Difficulty'],['Easy','Easy'],['Medium','Medium'],['Hard','Hard']] },
          { label:'All Sectors', val:filterSector, set:setFSector, opts:[['','All Sectors'],...sectors.map(s=>[s,s])] },
        ].map(({ val, set, opts }) => (
          <select key={opts[0][1]} value={val} onChange={e=>set(e.target.value)}
            style={{ padding:'9px 12px', borderRadius:9, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.82rem', background:'#fafbff', cursor:'pointer' }}>
            {opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        {(search||filterStatus||filterDiff||filterSector) && (
          <button onClick={()=>{setSearch('');setFStatus('');setFDiff('');setFSector('');}}
            style={{ padding:'9px 14px', borderRadius:9, border:'1px solid #d0d7e8', background:'transparent', color:'var(--text-3)', fontWeight:700, cursor:'pointer', fontSize:'.8rem', fontFamily:"'Nunito',sans-serif" }}>
            Clear ✕
          </button>
        )}
        <span style={{ fontSize:'.75rem', color:'#b0bec9', flexShrink:0 }}>{filtered.length} result{filtered.length!==1?'s':''}</span>
      </div>

      {/* Cards grid */}
      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'#b0bec9' }}>Loading companies…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:40 }}>
          <div style={{ fontSize:'2.5rem', marginBottom:10 }}>🔍</div>
          <div style={{ fontWeight:700, color:'#b0bec9', marginBottom: 15 }}>{tab==='pinned'?'No pinned companies yet':'No companies match your filters'}</div>
          {tab==='pinned' && <div style={{ fontSize:'.82rem', color:'#b0bec9', marginTop:4 }}>Pin companies from the All Companies tab to save them here</div>}
          
          {tab !== 'pinned' && search.trim() && (
            <div style={{
              marginTop: 20,
              padding: '24px',
              borderRadius: 16,
              background: 'rgba(83, 22, 151, 0.04)',
              border: '1.5px dashed rgba(83, 22, 151, 0.3)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              maxWidth: 500,
              margin: '20px auto 0'
            }}>
              <div style={{ fontSize: '2rem' }}>✨</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '1.1rem', color: '#531697' }}>
                Research "{search}" with AI
              </div>
              <p style={{ fontSize: '.83rem', color: 'var(--text-3)', margin: 0, lineHeight: 1.5 }}>
                Pragati will search the internet for the latest recruitment rounds, tech stack, average package, eligibility criteria, and preparation tips, then add it to our database for all students!
              </p>
              <button
                onClick={handleAiRetrieve}
                disabled={aiLoading}
                style={{
                  padding: '10px 24px',
                  borderRadius: 9,
                  border: 'none',
                  background: 'linear-gradient(135deg, #042c5d, #531697)',
                  color: '#fff',
                  fontWeight: 800,
                  cursor: aiLoading ? 'not-allowed' : 'pointer',
                  fontFamily: "'Nunito', sans-serif",
                  fontSize: '.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 12px rgba(83, 22, 151, 0.2)',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={e => !aiLoading && (e.currentTarget.style.transform = 'scale(1.02)')}
                onMouseOut={e => !aiLoading && (e.currentTarget.style.transform = 'scale(1)')}
              >
                {aiLoading ? (
                  <>
                    <div style={{ width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    Researching & Seeding...
                  </>
                ) : (
                  '🚀 Ask Pragati AI to retrieve'
                )}
              </button>
              {aiError && <div style={{ fontSize: '.78rem', color: '#ef4444', fontWeight: 600 }}>❌ {aiError}</div>}
              {aiSuccess && <div style={{ fontSize: '.78rem', color: '#22c55e', fontWeight: 600 }}>✅ {aiSuccess}</div>}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
          {filtered.map(c => (
            <CompanyCard key={c._id} company={c}
              onPin={handlePin}
              onCompareToggle={handleCompareToggle}
              compareSelected={compareList.some(x=>x._id===c._id)}
              onViewDetail={setDetail}/>
          ))}
        </div>
      )}

      {/* Company detail modal */}
      {detailCompany && (
        <CompanyDetail
          company={{ ...detailCompany, pinned: companies.find(c=>c._id===detailCompany._id)?.pinned ?? detailCompany.pinned }}
          onClose={()=>setDetail(null)}
          onPin={handlePin}
          onEdit={handleEditCompany}
          onDelete={handleDeleteCompany}/>
      )}

      {/* Compare modal */}
      {showCompare && compareList.length >= 2 && (
        <CompareModal companies={compareList} onClose={()=>setShowCompare(false)}/>
      )}

      {/* Compare tray */}
      <CompareTray
        selected={compareList}
        onRemove={id=>setCompare(cs=>cs.filter(c=>c._id!==id))}
        onCompare={()=>setShowCompare(true)}
        onClear={()=>setCompare([])}/>

      {/* Retrieve Confirm Modal */}
      {aiPreviewCompany && (
        <RetrieveConfirmModal
          company={aiPreviewCompany}
          onClose={() => setAiPreviewCompany(null)}
          onConfirm={handleConfirmSaveRetrieved}
          loading={confirmSaveLoading}
        />
      )}

      {/* Edit Company Modal */}
      {editingCompany && (
        <EditCompanyModal
          company={editingCompany}
          onClose={() => setEditingCompany(null)}
          onSave={handleSaveEditedCompany}
        />
      )}
    </div>
  );
}

// ── Retrieve Confirmation Modal ───────────────────────────────────────────────
function RetrieveConfirmModal({ company, onClose, onConfirm, loading }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'var(--surface)', borderRadius:20, width:'100%', maxWidth:520, padding:'24px', boxShadow:'0 24px 60px rgba(0,0,0,.3)', textAlign:'center', display:'flex', flexDirection:'column', gap:16 }}>
        <div style={{ fontSize: '3rem' }}>✨</div>
        <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.25rem', color:'#531697', margin:0 }}>We Researched "{company.name}"!</h3>
        <p style={{ fontSize:'.85rem', color:'var(--text-3)', margin:0, lineHeight:1.5 }}>
          Pragati AI found all details, tech stacks, and Glassdoor interview resources. 
          Would you like to save this company to the shared campus directory so all other students can view it?
        </p>

        <div style={{ background:'#f8f9fc', border:'1px solid #e8edf5', borderRadius:12, padding:'14px', textAlign:'left', display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ fontSize:'.82rem', color:'var(--text-2)' }}><strong>🏢 Company:</strong> {company.name}</div>
          <div style={{ fontSize:'.82rem', color:'var(--text-2)' }}><strong>💼 Sector:</strong> {company.sector}</div>
          <div style={{ fontSize:'.82rem', color:'var(--text-2)' }}><strong>💰 Est. CTC:</strong> {company.ctc}</div>
          <div style={{ fontSize:'.82rem', color:'var(--text-2)' }}><strong>📊 Difficulty:</strong> {company.difficulty}</div>
          <div style={{ fontSize:'.82rem', color:'var(--text-2)' }}><strong>🔁 Rounds:</strong> {(company.recruitmentRounds || []).join(' → ')}</div>
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'center', marginTop:10 }}>
          <button onClick={onClose} disabled={loading}
            style={{ padding:'10px 20px', borderRadius:8, border:'1px solid #d0d7e8', background:'transparent', fontWeight:700, cursor:'pointer', fontSize:'.85rem', fontFamily:"'Nunito',sans-serif" }}>
            No, Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            style={{ padding:'10px 24px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#042c5d,#531697)', color:'#fff', fontWeight:800, cursor:loading?'not-allowed':'pointer', fontSize:'.85rem', fontFamily:"'Nunito',sans-serif", display:'flex', alignItems:'center', gap:6 }}>
            {loading && <div style={{ width:12, height:12, border:'2px solid #fff', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />}
            Yes, Save to Directory
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Company Modal (Faculty & Admin Only) ───────────────────────────────
function EditCompanyModal({ company, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: company.name || '',
    sector: company.sector || '',
    website: company.website || '',
    ctc: company.ctc || '',
    difficulty: company.difficulty || 'Medium',
    minCGPA: company.eligibilityCriteria?.minCGPA || 6.0,
    allowedBranches: (company.eligibilityCriteria?.allowedBranches || []).join(', '),
    roles: (company.roles || []).join(', '),
    recruitmentRounds: (company.recruitmentRounds || []).join(', '),
    techStack: (company.techStack || []).join(', '),
    resources: (company.resources || []).join(', '),
    companyOverview: company.companyOverview || '',
    aptitudePatterns: company.aptitudePatterns || '',
    interviewPatterns: company.interviewPatterns || '',
    jdText: company.jdText || '',
    prepTips: company.prepTips || '',
    workCulture: company.workCulture || '',
    growthPath: company.growthPath || '',
    bondDetails: company.bondDetails || '',
    bond: company.bond || 'None',
    packageBreakdown: company.packageBreakdown || '',
    logoUrl: company.logoUrl || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Parse arrays
    const allowedBranches = formData.allowedBranches.split(',').map(s => s.trim()).filter(Boolean);
    const roles = formData.roles.split(',').map(s => s.trim()).filter(Boolean);
    const recruitmentRounds = formData.recruitmentRounds.split(',').map(s => s.trim()).filter(Boolean);
    const techStack = formData.techStack.split(',').map(s => s.trim()).filter(Boolean);
    const resources = formData.resources.split(',').map(s => s.trim()).filter(Boolean);

    const payload = {
      ...formData,
      eligibilityCriteria: {
        minCGPA: parseFloat(formData.minCGPA) || 0,
        allowedBranches,
        backlogs: company.eligibilityCriteria?.backlogs ?? false
      },
      roles,
      recruitmentRounds,
      techStack,
      resources
    };

    try {
      const res = await fetch(`${API}/companies/${company._id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('pragati_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to update company');
      onSave(d.company);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'var(--surface)', borderRadius:20, width:'100%', maxWidth:600, maxHeight:'85vh', overflow:'auto', boxShadow:'0 24px 60px rgba(0,0,0,.2)', display:'flex', flexDirection:'column' }}>
        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#042c5d,#531697)', padding:'18px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.15rem', color:'#fff', margin:0 }}>✏️ Edit Company: {company.name}</h2>
          <button onClick={onClose} style={{ border:'none', background:'none', color:'#fff', cursor:'pointer', fontSize:'1.1rem' }}>✕</button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:14 }}>
          {error && <div style={{ color:'#ef4444', fontSize:'.8rem', fontWeight:600 }}>⚠️ {error}</div>}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:'.75rem', fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:4 }}>COMPANY NAME</label>
              <input name="name" value={formData.name} onChange={handleChange} required
                style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #d0d7e8', fontSize:'.82rem', fontFamily:"'Nunito',sans-serif" }}/>
            </div>
            <div>
              <label style={{ fontSize:'.75rem', fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:4 }}>SECTOR</label>
              <input name="sector" value={formData.sector} onChange={handleChange}
                style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #d0d7e8', fontSize:'.82rem', fontFamily:"'Nunito',sans-serif" }}/>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:'.75rem', fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:4 }}>WEBSITE</label>
              <input name="website" value={formData.website} onChange={handleChange}
                style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #d0d7e8', fontSize:'.82rem', fontFamily:"'Nunito',sans-serif" }}/>
            </div>
            <div>
              <label style={{ fontSize:'.75rem', fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:4 }}>LOGO URL</label>
              <input name="logoUrl" value={formData.logoUrl} onChange={handleChange}
                style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #d0d7e8', fontSize:'.82rem', fontFamily:"'Nunito',sans-serif" }}/>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            <div>
              <label style={{ fontSize:'.75rem', fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:4 }}>CTC (e.g. 5.00 LPA)</label>
              <input name="ctc" value={formData.ctc} onChange={handleChange}
                style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #d0d7e8', fontSize:'.82rem', fontFamily:"'Nunito',sans-serif" }}/>
            </div>
            <div>
              <label style={{ fontSize:'.75rem', fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:4 }}>DIFFICULTY</label>
              <select name="difficulty" value={formData.difficulty} onChange={handleChange}
                style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #d0d7e8', fontSize:'.82rem', fontFamily:"'Nunito',sans-serif" }}>
                <option value="Easy">Easy</option>
                <option value="Easy-Medium">Easy-Medium</option>
                <option value="Medium">Medium</option>
                <option value="Medium-Hard">Medium-Hard</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize:'.75rem', fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:4 }}>MIN CGPA</label>
              <input type="number" step="0.1" name="minCGPA" value={formData.minCGPA} onChange={handleChange}
                style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #d0d7e8', fontSize:'.82rem', fontFamily:"'Nunito',sans-serif" }}/>
            </div>
          </div>

          <div>
            <label style={{ fontSize:'.75rem', fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:4 }}>ALLOWED BRANCHES (comma-separated)</label>
            <input name="allowedBranches" value={formData.allowedBranches} onChange={handleChange}
              style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #d0d7e8', fontSize:'.82rem', fontFamily:"'Nunito',sans-serif" }}/>
          </div>

          <div>
            <label style={{ fontSize:'.75rem', fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:4 }}>ROLES OFFERED (comma-separated)</label>
            <input name="roles" value={formData.roles} onChange={handleChange}
              style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #d0d7e8', fontSize:'.82rem', fontFamily:"'Nunito',sans-serif" }}/>
          </div>

          <div>
            <label style={{ fontSize:'.75rem', fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:4 }}>TECH STACK (comma-separated)</label>
            <input name="techStack" value={formData.techStack} onChange={handleChange}
              style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #d0d7e8', fontSize:'.82rem', fontFamily:"'Nunito',sans-serif" }}/>
          </div>

          <div>
            <label style={{ fontSize:'.75rem', fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:4 }}>RECRUITMENT ROUNDS (comma-separated in order)</label>
            <textarea name="recruitmentRounds" value={formData.recruitmentRounds} onChange={handleChange} rows={2}
              style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #d0d7e8', fontSize:'.82rem', fontFamily:"'Nunito',sans-serif" }}/>
          </div>

          <div>
            <label style={{ fontSize:'.75rem', fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:4 }}>RESOURCES / BLOG LINKS (comma-separated)</label>
            <textarea name="resources" value={formData.resources} onChange={handleChange} rows={2}
              style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #d0d7e8', fontSize:'.82rem', fontFamily:"'Nunito',sans-serif" }}/>
          </div>

          <div>
            <label style={{ fontSize:'.75rem', fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:4 }}>COMPANY OVERVIEW</label>
            <textarea name="companyOverview" value={formData.companyOverview} onChange={handleChange} rows={3}
              style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #d0d7e8', fontSize:'.82rem', fontFamily:"'Nunito',sans-serif" }}/>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:'.75rem', fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:4 }}>BOND TERM (e.g. 2 years)</label>
              <input name="bond" value={formData.bond} onChange={handleChange}
                style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #d0d7e8', fontSize:'.82rem', fontFamily:"'Nunito',sans-serif" }}/>
            </div>
            <div>
              <label style={{ fontSize:'.75rem', fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:4 }}>BOND DETAILS</label>
              <input name="bondDetails" value={formData.bondDetails} onChange={handleChange}
                style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #d0d7e8', fontSize:'.82rem', fontFamily:"'Nunito',sans-serif" }}/>
            </div>
          </div>

          <div>
            <label style={{ fontSize:'.75rem', fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:4 }}>PACKAGE BREAKDOWN</label>
            <input name="packageBreakdown" value={formData.packageBreakdown} onChange={handleChange}
              style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #d0d7e8', fontSize:'.82rem', fontFamily:"'Nunito',sans-serif" }}/>
          </div>

          <div>
            <label style={{ fontSize:'.75rem', fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:4 }}>APTITUDE / TEST PATTERN</label>
            <textarea name="aptitudePatterns" value={formData.aptitudePatterns} onChange={handleChange} rows={3}
              style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #d0d7e8', fontSize:'.82rem', fontFamily:"'Nunito',sans-serif" }}/>
          </div>

          <div>
            <label style={{ fontSize:'.75rem', fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:4 }}>INTERVIEW PATTERNS</label>
            <textarea name="interviewPatterns" value={formData.interviewPatterns} onChange={handleChange} rows={3}
              style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #d0d7e8', fontSize:'.82rem', fontFamily:"'Nunito',sans-serif" }}/>
          </div>

          <div>
            <label style={{ fontSize:'.75rem', fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:4 }}>PREPARATION TIPS</label>
            <textarea name="prepTips" value={formData.prepTips} onChange={handleChange} rows={3}
              style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #d0d7e8', fontSize:'.82rem', fontFamily:"'Nunito',sans-serif" }}/>
          </div>

          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:10 }}>
            <button type="button" onClick={onClose} style={{ padding:'8px 18px', borderRadius:8, border:'1px solid #d0d7e8', background:'transparent', cursor:'pointer', fontSize:'.85rem', fontFamily:"'Nunito',sans-serif" }}>Cancel</button>
            <button type="submit" disabled={loading}
              style={{ padding:'8px 22px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#042c5d,#531697)', color:'#fff', fontWeight:700, cursor:loading?'not-allowed':'pointer', fontSize:'.85rem', fontFamily:"'Nunito',sans-serif" }}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}