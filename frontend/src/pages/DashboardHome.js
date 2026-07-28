/* eslint-disable */
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CalendarHeatmap from '../components/CalendarHeatmap';
import { AnnouncementModal, AllAnnouncementsModal, DriveModal, DailyOpportunitiesDigestModal } from '../components/DashboardModals';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tk = () => ({ Authorization: `Bearer ${localStorage.getItem('pragati_token')}` });
const apiFetch = p => fetch(`${API}${p}`, { headers: tk() }).then(r => r.json()).catch(() => null);

function Stat({ icon, label, value, sub, grad, onClick }) {
  return (
    <div onClick={onClick} className="card" style={{ padding:'18px 16px', cursor:onClick?'pointer':'default', position:'relative', overflow:'hidden', transition:'transform .2s' }}
      onMouseOver={e=>onClick&&(e.currentTarget.style.transform='translateY(-3px)')}
      onMouseOut={e=>(e.currentTarget.style.transform='none')}>
      <div style={{ position:'absolute', top:-20, right:-20, width:80, height:80, borderRadius:'50%', background:grad, opacity:.1 }}/>
      <div style={{ fontSize:'1.3rem', marginBottom:6 }}>{icon}</div>
      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.5rem', background:grad, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', lineHeight:1 }}>{value??'—'}</div>
      <div style={{ fontSize:'.78rem', fontWeight:700, color:'var(--text-2)', marginTop:4 }}>{label}</div>
      {sub&&<div style={{ fontSize:'.68rem', color:'#b0bec9', marginTop:2 }}>{sub}</div>}
    </div>
  );
}

/* ── Edit Profile Modal ─────────────────────────────────────────────────── */
function EditProfileModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: user?.name||'', department: user?.department||'', year: user?.year||'',
    rollNumber: user?.rollNumber||'', phone: user?.phone||'', bio: user?.bio||'',
    linkedinUrl: user?.linkedinUrl||'', githubUrl: user?.githubUrl||'', portfolioUrl: user?.portfolioUrl||'',
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '' });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState('');

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const setPwd = k => e => setPwdForm(f=>({...f,[k]:e.target.value}));
  const INP = { style:{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.875rem', outline:'none', background:'#fafbff', boxSizing:'border-box' } };
  const LBL = ({ children }) => <label style={{ display:'block', fontSize:'.73rem', fontWeight:700, color:'var(--text-2)', marginBottom:4, fontFamily:"'Syne',sans-serif" }}>{children}</label>;

  async function save(e) {
    e.preventDefault(); setLoading(true); setMsg('');
    try {
      const res = await fetch(`${API}/users/profile`, { method:'PUT', headers:{ ...tk(), 'Content-Type':'application/json' }, body:JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error||'Failed');
      setMsg('✅ Profile updated!');
      if (onSaved) onSaved(d.user);
      setTimeout(onClose, 1200);
    } catch(err){ setMsg(`❌ ${err.message}`); }
    finally { setLoading(false); }
  }

  async function changePassword(e) {
    e.preventDefault(); setPwdLoading(true); setPwdMsg('');
    try {
      const r = await fetch(`${API}/users/change-password`, { method:'PUT', headers:{...tk(),'Content-Type':'application/json'}, body:JSON.stringify(pwdForm) });
      const d = await r.json();
      if(!r.ok) throw new Error(d.error||'Failed');
      setPwdMsg('✅ Password updated!');
      setPwdForm({ currentPassword:'', newPassword:'' });
    } catch(err){ setPwdMsg(`❌ ${err.message}`); }
    finally { setPwdLoading(false); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content-responsive" style={{ maxWidth:560, maxHeight:'90vh', overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.1rem', color:'var(--text)' }}>✏️ Edit Profile</div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:'50%', border:'1px solid #e8edf5', background:'#f8f9fc', cursor:'pointer', fontWeight:800, color:'var(--text-3)', fontSize:'1rem' }}>×</button>
        </div>

        {/* Avatar */}
        <div style={{ textAlign:'center', marginBottom:18 }}>
          <div style={{ width:72, height:72, borderRadius:'50%', background:'linear-gradient(135deg,#531697,#13a1a5)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'1.8rem', color:'#fff', fontFamily:"'Syne',sans-serif", fontWeight:800 }}>
            {user?.name?.[0]?.toUpperCase()||'U'}
          </div>
          <div style={{ marginTop:6, fontSize:'.78rem', color:'var(--text-3)' }}>{user?.email}</div>
          <div style={{ marginTop:2 }}>
            <span style={{ padding:'2px 10px', borderRadius:999, background:'rgba(83,22,151,.08)', color:'#531697', fontSize:'.7rem', fontWeight:700 }}>{user?.role?.toUpperCase()}</span>
          </div>
        </div>

        <form onSubmit={save} style={{ marginBottom: 24 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <div style={{ gridColumn:'1/-1' }}><LBL>Full Name</LBL><input {...INP} value={form.name} onChange={set('name')} placeholder="Your full name" /></div>
            <div><LBL>Department</LBL>
              <select {...INP} value={form.department} onChange={set('department')}>
                {['CSE','CSAIML','IT','ECE','Mechanical','Civil','Other'].map(d=><option key={d}>{d}</option>)}
              </select>
            </div>
            {user?.role === 'student' && (
              <div><LBL>Year</LBL>
                <select {...INP} value={form.year} onChange={set('year')}>
                  {[1,2,3,4].map(y=><option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
            )}
            {user?.role === 'student' && (
              <div><LBL>Roll Number</LBL><input {...INP} value={form.rollNumber} onChange={set('rollNumber')} placeholder="e.g. 22CS101" /></div>
            )}
            <div><LBL>Phone</LBL><input {...INP} value={form.phone} onChange={set('phone')} placeholder="+91 XXXXXXXXXX" /></div>
            <div style={{ gridColumn:'1/-1' }}><LBL>Bio</LBL><textarea {...INP} style={{ ...INP.style, resize:'vertical', height:64 }} value={form.bio} onChange={set('bio')} placeholder="A short bio about yourself…" /></div>
            <div style={{ gridColumn:'1/-1' }}><LBL>LinkedIn URL</LBL><input {...INP} type="url" value={form.linkedinUrl} onChange={set('linkedinUrl')} placeholder="https://linkedin.com/in/username" /></div>
            <div><LBL>GitHub URL</LBL><input {...INP} type="url" value={form.githubUrl} onChange={set('githubUrl')} placeholder="https://github.com/username" /></div>
            <div><LBL>Portfolio URL</LBL><input {...INP} type="url" value={form.portfolioUrl} onChange={set('portfolioUrl')} placeholder="https://yourportfolio.com" /></div>
          </div>
          {msg && <div style={{ marginBottom:12, padding:'9px 14px', borderRadius:8, fontSize:'.83rem', fontWeight:600, background:msg.startsWith('✅')?'#dcfce7':'#fee2e2', color:msg.startsWith('✅')?'#166534':'#991b1b' }}>{msg}</div>}
          <button type="submit" disabled={loading} style={{ width:'100%', padding:'11px', borderRadius:10, border:'none', background:loading?'#d0d7e8':'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontWeight:800, fontSize:'.9rem', cursor:loading?'not-allowed':'pointer', fontFamily:"'Nunito',sans-serif" }}>
            {loading?'Saving…':'💾 Save Profile'}
          </button>
        </form>

        <div style={{ paddingTop:20, borderTop:'1px solid #e8edf5' }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:'1rem', color:'var(--text)', marginBottom:12 }}>🔒 Change Password</div>
          <form onSubmit={changePassword}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:12, marginBottom:12 }}>
              <div><LBL>Current Password</LBL><input {...INP} type="password" value={pwdForm.currentPassword} onChange={setPwd('currentPassword')} required /></div>
              <div><LBL>New Password</LBL><input {...INP} type="password" value={pwdForm.newPassword} onChange={setPwd('newPassword')} required minLength={6} /></div>
            </div>
            {pwdMsg && <div style={{ marginBottom:12, padding:'9px 14px', borderRadius:8, fontSize:'.83rem', fontWeight:600, background:pwdMsg.startsWith('✅')?'#dcfce7':'#fee2e2', color:pwdMsg.startsWith('✅')?'#166534':'#991b1b' }}>{pwdMsg}</div>}
            <button type="submit" disabled={pwdLoading} style={{ width:'100%', padding:'11px', borderRadius:10, border:'none', background:pwdLoading?'#d0d7e8':'#042c5d', color:'#fff', fontWeight:800, fontSize:'.9rem', cursor:pwdLoading?'not-allowed':'pointer', fontFamily:"'Nunito',sans-serif" }}>
              {pwdLoading?'Updating...':'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ── LeetCode-style Leaderboard Modal ────────────────────────────────────── */

/* ── Problem Breakdown: stable stacked-bar chart, no SVG arc math, never glitches ── */
function DonutChart({ easy=0, medium=0, hard=0, total=0 }) {
  const e = Math.max(0, Number(easy)   || 0);
  const m = Math.max(0, Number(medium) || 0);
  const h = Math.max(0, Number(hard)   || 0);
  const solved = e + m + h;

  const [hovered, setHovered] = React.useState(null); // 'Easy' | 'Medium' | 'Hard' | null

  // Circle properties
  const R = 22;
  const C = 2 * Math.PI * R; // ~138.23

  const totalSafe = solved || 1;
  const pctE = (e / totalSafe) * 100;
  const pctM = (m / totalSafe) * 100;
  const pctH = (h / totalSafe) * 100;

  // Easy starts at -90deg (top). Medium starts after Easy. Hard starts after Medium.
  const dashE = `${(e / totalSafe) * C} ${C}`;
  const offsetE = 0; // starts at top if rotated -90deg

  const dashM = `${(m / totalSafe) * C} ${C}`;
  const offsetM = -((e / totalSafe) * C);

  const dashH = `${(h / totalSafe) * C} ${C}`;
  const offsetH = -(((e + m) / totalSafe) * C);

  const activeVal = hovered === 'Easy' ? e : hovered === 'Medium' ? m : hovered === 'Hard' ? h : solved;
  const activeLabel = hovered ? hovered : 'Solved';
  const activeColor = hovered === 'Easy' ? '#47d372' : hovered === 'Medium' ? '#f59e0b' : hovered === 'Hard' ? '#ef4444' : 'var(--text)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <div style={{ position: 'relative', width: 96, height: 96, marginBottom: 12 }}>
        <svg viewBox="0 0 64 64" style={{ width: 96, height: 96, transform: 'rotate(-90deg)', overflow: 'visible' }}>
          {/* Empty Track */}
          <circle cx="32" cy="32" r={R} fill="none" stroke="var(--border)" strokeWidth="5.5" />

          {solved > 0 ? (
            <>
              {/* Easy Slice */}
              {e > 0 && (
                <circle cx="32" cy="32" r={R} fill="none" stroke="#47d372" strokeWidth={hovered === 'Easy' ? '7.5' : '6'}
                  strokeDasharray={dashE} strokeDashoffset={offsetE} strokeLinecap="round"
                  onMouseEnter={() => setHovered('Easy')} onMouseLeave={() => setHovered(null)}
                  style={{ cursor: 'pointer', transition: 'stroke-width 0.2s, stroke 0.2s' }}
                />
              )}
              {/* Medium Slice */}
              {m > 0 && (
                <circle cx="32" cy="32" r={R} fill="none" stroke="#f59e0b" strokeWidth={hovered === 'Medium' ? '7.5' : '6'}
                  strokeDasharray={dashM} strokeDashoffset={offsetM} strokeLinecap="round"
                  onMouseEnter={() => setHovered('Medium')} onMouseLeave={() => setHovered(null)}
                  style={{ cursor: 'pointer', transition: 'stroke-width 0.2s, stroke 0.2s' }}
                />
              )}
              {/* Hard Slice */}
              {h > 0 && (
                <circle cx="32" cy="32" r={R} fill="none" stroke="#ef4444" strokeWidth={hovered === 'Hard' ? '7.5' : '6'}
                  strokeDasharray={dashH} strokeDashoffset={offsetH} strokeLinecap="round"
                  onMouseEnter={() => setHovered('Hard')} onMouseLeave={() => setHovered(null)}
                  style={{ cursor: 'pointer', transition: 'stroke-width 0.2s, stroke 0.2s' }}
                />
              )}
            </>
          ) : null}
        </svg>

        {/* Center Text */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
        }}>
          <span style={{ fontSize: '.58rem', color: 'var(--text-3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {activeLabel}
          </span>
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: '1.15rem', color: activeColor, marginTop: 1 }}>
            {activeVal}
          </span>
        </div>
      </div>

      {/* Legend below */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: 4, marginTop: 4 }}>
        {[
          { label: 'Easy', val: e, color: '#47d372' },
          { label: 'Medium', val: m, color: '#f59e0b' },
          { label: 'Hard', val: h, color: '#ef4444' }
        ].map(t => (
          <div key={t.label}
            onMouseEnter={() => setHovered(t.label)}
            onMouseLeave={() => setHovered(null)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1,
              padding: '3px 4px', borderRadius: 6, cursor: 'pointer',
              background: hovered === t.label ? 'rgba(83,22,151,0.05)' : 'transparent',
              transition: 'background 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.color }} />
              <span style={{ fontSize: '.62rem', color: 'var(--text-3)', fontWeight: 700 }}>{t.label}</span>
            </div>
            <span style={{ fontSize: '.72rem', fontWeight: 800, color: t.color }}>{t.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Contest rating mini-chart (sparkline) */
function RatingChart({ ratings=[] }) {
  if (ratings.length < 2) return (
    <div style={{ height:80, display:'flex', alignItems:'center', justifyContent:'center', color:'#d0d7e8', fontSize:'.78rem' }}>No contest history</div>
  );
  const vals = ratings.map(r => r.rating||r);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const W=300, H=80, pad=8;
  const pts = vals.map((v,i) => {
    const x = pad + (i/(vals.length-1))*(W-2*pad);
    const y = H - pad - ((v-min)/range)*(H-2*pad);
    return `${x},${y}`;
  });
  const last = vals[vals.length-1];
  const prev = vals[vals.length-2];
  const up = last >= prev;
  return (
    <div>
      <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:4 }}>
        <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.6rem', color:'var(--text)' }}>{last}</span>
        <span style={{ fontSize:'.72rem', color: up?'#47d372':'#ef4444', fontWeight:700 }}>{up?'↑':'↓'}{Math.abs(last-prev)}</span>
        <span style={{ fontSize:'.68rem', color:'#b0bec9', marginLeft:4 }}>Contest Rating</span>
      </div>
      <svg width={W} height={H} style={{ overflow:'visible' }}>
        <polyline points={pts.join(' ')} fill="none" stroke={up?'#f59e0b':'#ef4444'} strokeWidth={2} strokeLinejoin="round"/>
        <circle cx={pts[pts.length-1].split(',')[0]} cy={pts[pts.length-1].split(',')[1]} r={4} fill={up?'#f59e0b':'#ef4444'}/>
      </svg>
    </div>
  );
}

/* ── LeetCode-style profile card (shown when clicking a student) ── */
function LCProfileCard({ s, profileData, onBack }) {
  const easy   = profileData?.problemStats?.easy   ?? Math.floor((s.codingProblems||s.totalProblemsSolved||0)*0.45);
  const medium = profileData?.problemStats?.medium ?? Math.floor((s.codingProblems||s.totalProblemsSolved||0)*0.38);
  const hard   = profileData?.problemStats?.hard   ?? Math.max(0,(s.codingProblems||s.totalProblemsSolved||0) - easy - medium);
  const totalQ = 3920;
  const aptStats = profileData?.aptStats || [];
  const submissions = profileData?.submissionDates || [];
  const ratings = profileData?.contestRatings || (s.atsScore ? [{ rating: Math.max(1200, (s.atsScore||0)*8) }, { rating: Math.max(1300, (s.atsScore||0)*9) }] : []);
  const SKILL_COLOR = { Beginner:'#f59e0b', Intermediate:'#531697', Expert:'#47d372' };

  return (
    <div>
      {/* Back button */}
      <button onClick={onBack}
        style={{ marginBottom:16, padding:'6px 14px', borderRadius:8, border:'1px solid #d0d7e8', background:'transparent', color:'var(--text-3)', fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.8rem', display:'flex', alignItems:'center', gap:6 }}>
        ← Back to Leaderboard
      </button>

      {/* Profile header — LeetCode style */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'20px 22px', marginBottom:14 }}>
        <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
          {/* Avatar */}
          <div style={{ width:72, height:72, borderRadius:16, background:'linear-gradient(135deg,#531697,#13a1a5)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.8rem', flexShrink:0, boxShadow:'0 4px 14px rgba(83,22,151,0.25)' }}>
            {s.name?.charAt(0)?.toUpperCase()}
          </div>
          {/* Info */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.05rem', color:'var(--text)' }}>{s.name}</div>
              <span style={{ padding:'2px 8px', borderRadius:999, fontSize:'.65rem', fontWeight:800, background: SKILL_COLOR[s.skillLevel]+'18', color: SKILL_COLOR[s.skillLevel]||'#531697', border:`1px solid ${SKILL_COLOR[s.skillLevel]||'#531697'}30` }}>
                {s.skillLevel || 'Beginner'}
              </span>
            </div>
            <div style={{ fontSize:'.75rem', color:'var(--text-3)', marginTop:3 }}>
              {s.rollNumber && <span>#{s.rollNumber} · </span>}
              {s.department && <span>{s.department} · </span>}
              {s.year && <span>Year {s.year} · </span>}
              <span>India</span>
            </div>
            <div style={{ fontSize:'.72rem', color:'#b0bec9', marginTop:2 }}>🔥 {s.streak||0} day streak · 🏆 Rank #{s.rank||'—'}</div>
            {/* Social links */}
            <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
              {s.githubUrl && <a href={s.githubUrl} target="_blank" rel="noopener noreferrer" style={{ padding:'3px 10px', borderRadius:6, background:'rgba(255,255,255,0.06)', color:'var(--text-2)', fontWeight:700, fontSize:'.68rem', textDecoration:'none' }}>🐙 GitHub</a>}
              {s.linkedinUrl && <a href={s.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ padding:'3px 10px', borderRadius:6, background:'rgba(37,99,235,0.08)', color:'#2563eb', fontWeight:700, fontSize:'.68rem', textDecoration:'none' }}>💼 LinkedIn</a>}
              {s.portfolioUrl && <a href={s.portfolioUrl} target="_blank" rel="noopener noreferrer" style={{ padding:'3px 10px', borderRadius:6, background:'rgba(83,22,151,0.08)', color:'#531697', fontWeight:700, fontSize:'.68rem', textDecoration:'none' }}>🌐 Portfolio</a>}
            </div>
          </div>
          {/* Score badge */}
          <div style={{ textAlign:'center', background:'linear-gradient(135deg,#531697,#13a1a5)', borderRadius:12, padding:'10px 16px', color:'#fff', flexShrink:0 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.4rem', lineHeight:1 }}>{s.totalScore||0}</div>
            <div style={{ fontSize:'.6rem', opacity:0.8, marginTop:2 }}>SCORE</div>
          </div>
        </div>
      </div>

      {/* Two-column layout: Contest + Problems */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
        {/* Contest rating */}
        <div style={{ background:'var(--surface)', border:'1px solid #e8edf5', borderRadius:14, padding:'16px 18px' }}>
          <div style={{ fontSize:'.7rem', fontWeight:800, color:'#b0bec9', letterSpacing:'.06em', marginBottom:10 }}>CONTEST RATING</div>
          <RatingChart ratings={ratings}/>
          <div style={{ display:'flex', gap:12, marginTop:8 }}>
            <div><div style={{ fontSize:'.68rem', color:'#b0bec9' }}>Global Ranking</div><div style={{ fontWeight:800, fontSize:'.85rem', color:'var(--text)' }}>#{s.rank||'N/A'}</div></div>
            <div><div style={{ fontSize:'.68rem', color:'#b0bec9' }}>ATS Score</div><div style={{ fontWeight:800, fontSize:'.85rem', color:'#531697' }}>{s.atsScore||0}</div></div>
          </div>
        </div>

        {/* Problems solved donut */}
        <div style={{ background:'var(--surface)', border:'1px solid #e8edf5', borderRadius:14, padding:'16px 18px' }}>
          <div style={{ fontSize:'.7rem', fontWeight:800, color:'#b0bec9', letterSpacing:'.06em', marginBottom:10 }}>PROBLEMS SOLVED</div>
          <DonutChart easy={easy} medium={medium} hard={hard} total={totalQ}/>
          <div style={{ display:'flex', gap:10, marginTop:10 }}>
            <div style={{ textAlign:'center' }}><div style={{ fontSize:'.68rem', color:'#b0bec9' }}>Attempting</div><div style={{ fontWeight:800, fontSize:'.85rem', color:'var(--text)' }}>{s.codingProblems||s.totalProblemsSolved||0}</div></div>
            <div style={{ textAlign:'center' }}><div style={{ fontSize:'.68rem', color:'#b0bec9' }}>Streak</div><div style={{ fontWeight:800, fontSize:'.85rem', color:'#f59e0b' }}>🔥{s.streak||0}d</div></div>
          </div>
        </div>
      </div>

      {/* Activity Heatmap */}
      <div style={{ background:'var(--surface)', border:'1px solid #e8edf5', borderRadius:14, padding:'16px 18px', marginBottom:12, overflowX:'auto' }}>
        <div style={{ fontSize:'.7rem', fontWeight:800, color:'#b0bec9', letterSpacing:'.06em', marginBottom:10 }}>ACTIVITY</div>
        <CalendarHeatmap noCard={true} title="ACTIVITY" subtitle="" submissions={submissions} currentStreak={s.streak||0} maxStreak={s.maxStreak||s.streak||0}/>
        <div style={{ fontSize:'.7rem', color:'#b0bec9', marginTop:6 }}>
          {s.codingProblems||s.totalProblemsSolved||0} submissions in the past one year
        </div>
      </div>

      {/* Aptitude topic breakdown */}
      {aptStats.length > 0 && (
        <div style={{ background:'var(--surface)', border:'1px solid #e8edf5', borderRadius:14, padding:'16px 18px' }}>
          <div style={{ fontSize:'.7rem', fontWeight:800, color:'#b0bec9', letterSpacing:'.06em', marginBottom:12 }}>APTITUDE ACCURACY BY TOPIC</div>
          {aptStats.map(stat => {
            const pct = Math.round(stat.accuracy||0);
            const col = pct>=70?'#47d372':pct>=45?'#f59e0b':'#ef4444';
            return (
              <div key={stat.topic} style={{ marginBottom:9 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.73rem', fontWeight:700, color:'var(--text-2)', marginBottom:3 }}>
                  <span>{stat.topic}</span>
                  <span style={{ color:col }}>{pct}% ({stat.correct||0}/{stat.total||0})</span>
                </div>
                <div style={{ height:6, background:'#f0f3fa', borderRadius:999, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${col},#13a1a5)`, borderRadius:999, transition:'width .6s ease' }}/>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!profileData && (
        <div style={{ textAlign:'center', padding:28, color:'#b0bec9', fontSize:'.85rem' }}>
          <div style={{ fontSize:'1.5rem', marginBottom:8 }}>⏳</div>Loading detailed profile…
        </div>
      )}
    </div>
  );
}

/* ── Main LeaderboardModal ── */
function LeaderboardModal({ onClose, myId }) {
  const [all, setAll]         = useState([]);
  const [search, setSearch]   = useState('');
  const [filterBranch, setFB] = useState('All');
  const [filterYear, setFY]   = useState('All');
  const [sortBy, setSortBy]   = useState('score');
  const [profile, setProfile] = useState(null);
  const [profileData, setPD]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLU]  = useState(null);

  async function fetchLeaderboard() {
    try {
      const d = await apiFetch('/analytics/leaderboard?limit=500');
      setAll(d?.leaderboard || []);
      setLU(d?.lastUpdated || new Date());
    } catch {}
  }

  useEffect(() => {
    fetchLeaderboard().then(() => setLoading(false));
  }, []);

  async function refresh() {
    setRefreshing(true);
    await fetchLeaderboard();
    setRefreshing(false);
  }

  async function viewProfile(s) {
    setProfile(s); setPD(null);
    try {
      const endpoint = s._id === myId
        ? '/analytics/my-profile'
        : `/analytics/student-profile/${s._id}`;
      const d = await apiFetch(endpoint);
      setPD(d);
    } catch(e) { setPD({}); }
  }

  const myData       = all.find(s => s._id === myId);
  const myGlobalRank = all.findIndex(s => s._id === myId);
  const branches     = ['All', ...new Set(all.map(s=>s.department).filter(Boolean))].sort();
  const medals       = ['🥇','🥈','🥉'];

  const filtered = all
    .filter(s => {
      const q = search.toLowerCase();
      const matchS = !q || s.name?.toLowerCase().includes(q) || s.rollNumber?.toLowerCase().includes(q);
      const matchB = filterBranch === 'All' || s.department === filterBranch;
      const matchY = filterYear   === 'All' || String(s.year) === filterYear;
      return matchS && matchB && matchY;
    })
    .sort((a,b) => {
      if (sortBy === 'streak') return (b.streak||0) - (a.streak||0);
      if (sortBy === 'solved') return (b.codingProblems||b.totalProblemsSolved||0) - (a.codingProblems||a.totalProblemsSolved||0);
      return (b.totalScore||0) - (a.totalScore||0);
    });

  const myRankFiltered = filtered.findIndex(s => s._id === myId);
  const SKILL_COLOR = { Beginner:'#f59e0b', Intermediate:'#531697', Expert:'#47d372' };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content-responsive" style={{ maxWidth:860, padding: 0 }} onClick={e => e.stopPropagation()}>

        {/* ── Header bar ── */}
        <div style={{ background:'linear-gradient(135deg,#531697,#13a1a5)', borderRadius:'20px 20px 0 0', padding:'18px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:'1.4rem' }}>🏆</span>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.1rem', color:'#fff' }}>PRAGATI Leaderboard</div>
              <div style={{ fontSize:'.68rem', color:'rgba(255,255,255,0.7)', marginTop:1 }}>
                {all.length} students ranked · Live dynamic scores
                {lastUpdated && ` · Updated ${new Date(lastUpdated).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}`}
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button onClick={refresh} disabled={refreshing}
              style={{ padding:'6px 12px', borderRadius:8, border:'1.5px solid rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.15)', cursor:refreshing?'default':'pointer', color:'#fff', fontWeight:700, fontSize:'.72rem', fontFamily:"'Nunito',sans-serif" }}>
              {refreshing ? '⏳' : '🔄'} Refresh
            </button>
            <button onClick={onClose}
              style={{ width:34, height:34, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.15)', cursor:'pointer', color:'#fff', fontWeight:900, fontSize:'1.1rem', display:'flex', alignItems:'center', justifyContent:'center' }}>
              ×
            </button>
          </div>
        </div>

        <div style={{ padding:'20px 24px', maxHeight:'82vh', overflowY:'auto' }}>
          {/* ── Profile view ── */}
          {profile ? (
            <LCProfileCard s={profile} profileData={profileData} onBack={() => { setProfile(null); setPD(null); }} />
          ) : (
            <>
              {/* ── My rank banner ── */}
              {myData && (
                <div style={{ background:'var(--surface)', border:'2px solid rgba(83,22,151,0.2)', borderRadius:14, padding:'14px 18px', marginBottom:16, display:'flex', alignItems:'center', gap:14, boxShadow:'0 2px 12px rgba(83,22,151,0.08)' }}>
                  <div style={{ width:42, height:42, borderRadius:12, background:'linear-gradient(135deg,#531697,#13a1a5)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.1rem', flexShrink:0 }}>
                    {myData.name?.charAt(0)}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, fontSize:'.9rem', color:'var(--text)' }}>
                      {myData.name} <span style={{ color:'#531697', fontSize:'.72rem' }}>(you)</span>
                    </div>
                    <div style={{ fontSize:'.72rem', color:'var(--text-3)', marginTop:2 }}>
                      🔥 {myData.streak||0}d streak · {myData.codingProblems||myData.totalProblemsSolved||0} solved · {myData.department}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:16 }}>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.3rem', background:'linear-gradient(135deg,#531697,#13a1a5)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>#{myGlobalRank+1}</div>
                      <div style={{ fontSize:'.6rem', color:'#b0bec9', fontWeight:700 }}>Global</div>
                    </div>
                    {myRankFiltered !== myGlobalRank && myRankFiltered >= 0 && (
                      <div style={{ textAlign:'center' }}>
                        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.3rem', color:'#13a1a5' }}>#{myRankFiltered+1}</div>
                        <div style={{ fontSize:'.6rem', color:'#b0bec9', fontWeight:700 }}>Filtered</div>
                      </div>
                    )}
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.3rem', color:'#531697' }}>{myData.totalScore||0}</div>
                      <div style={{ fontSize:'.6rem', color:'#b0bec9', fontWeight:700 }}>Score</div>
                    </div>
                  </div>
                  <button onClick={() => viewProfile(myData)}
                    style={{ padding:'7px 14px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.75rem', whiteSpace:'nowrap' }}>
                    My Profile →
                  </button>
                </div>
              )}

              {/* ── Filters row ── */}
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
                <input value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="🔍 Name or roll number…"
                  style={{ flex:1, minWidth:150, padding:'8px 12px', borderRadius:9, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.82rem', outline:'none', background:'var(--surface)' }}/>
                <select value={filterBranch} onChange={e=>setFB(e.target.value)}
                  style={{ padding:'8px 10px', borderRadius:9, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.78rem', fontWeight:700, background:'var(--surface)', color:'var(--text-2)', cursor:'pointer' }}>
                  {branches.map(b=><option key={b} value={b}>{b==='All'?'All Branches':b}</option>)}
                </select>
                <select value={filterYear} onChange={e=>setFY(e.target.value)}
                  style={{ padding:'8px 10px', borderRadius:9, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.78rem', fontWeight:700, background:'var(--surface)', color:'var(--text-2)', cursor:'pointer' }}>
                  {['All','1','2','3','4'].map(y=><option key={y} value={y}>{y==='All'?'All Years':`Year ${y}`}</option>)}
                </select>
                {/* Sort by */}
                <div style={{ display:'flex', borderRadius:9, overflow:'hidden', border:'1.5px solid #d0d7e8' }}>
                  {[['score','🏅 Score'],['streak','🔥 Streak'],['solved','💻 Solved']].map(([k,lbl])=>(
                    <button key={k} onClick={()=>setSortBy(k)}
                      style={{ padding:'8px 11px', border:'none', background:sortBy===k?'linear-gradient(135deg,#531697,#13a1a5)':'#fff', color:sortBy===k?'#fff':'var(--text-3)', fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.72rem' }}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter info */}
              <div style={{ fontSize:'.7rem', color:'#b0bec9', marginBottom:12 }}>
                Showing {filtered.length} of {all.length} students · Sorted by {sortBy}
              </div>

              {/* ── Top 3 podium ── */}
              {!search && filterBranch==='All' && filterYear==='All' && sortBy==='score' && filtered.length >= 3 && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1.15fr 1fr', gap:10, marginBottom:16, alignItems:'flex-end' }}>
                  {[filtered[1], filtered[0], filtered[2]].map((s,podiumIdx) => {
                    const actualRank = podiumIdx===0?1:podiumIdx===1?0:2;
                    const heights = [88,108,76];
                    const colors = ['#c0c0c0','#f59e0b','#cd7f32'];
                    return (
                      <div key={s._id} onClick={() => viewProfile(s)}
                        style={{ background:'var(--surface)', borderRadius:14, padding:'14px 10px', textAlign:'center', cursor:'pointer', border:`2px solid ${colors[actualRank]}40`, boxShadow:`0 4px 16px ${colors[actualRank]}20`, transition:'transform .15s' }}
                        onMouseOver={e=>e.currentTarget.style.transform='translateY(-3px)'}
                        onMouseOut={e=>e.currentTarget.style.transform='none'}>
                        <div style={{ fontSize:podiumIdx===1?'2rem':'1.5rem', marginBottom:6 }}>{medals[actualRank]}</div>
                        <div style={{ width:44, height:44, borderRadius:12, background:`linear-gradient(135deg,${colors[actualRank]},#13a1a5)`, margin:'0 auto 8px', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.1rem' }}>
                          {s.name?.charAt(0)}
                        </div>
                        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.8rem', color:'var(--text)', marginBottom:2 }}>{s.name?.split(' ')[0]}</div>
                        <div style={{ fontSize:'.65rem', color:'#b0bec9', marginBottom:6 }}>{s.department} · Y{s.year}</div>
                        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1rem', color:colors[actualRank] }}>{s.totalScore||0}</div>
                        <div style={{ fontSize:'.6rem', color:'#b0bec9' }}>pts</div>
                        <div style={{ fontSize:'.68rem', color:'var(--text-3)', marginTop:4 }}>🔥{s.streak||0}d</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Full list ── */}
              {loading ? (
                <div style={{ textAlign:'center', padding:32 }}>
                  <div style={{ width:36, height:36, border:'3px solid #e8edf5', borderTopColor:'#531697', borderRadius:'50%', animation:'_spin .7s linear infinite', margin:'0 auto 10px' }}/>
                  <style>{`@keyframes _spin{to{transform:rotate(360deg)}}`}</style>
                  <div style={{ color:'#b0bec9', fontSize:'.82rem' }}>Loading leaderboard…</div>
                </div>
              ) : (
                <>
                  {filtered.map((s, i) => {
                    const globalIdx = all.indexOf(s);
                    const isMe = s._id === myId;
                    const sc   = SKILL_COLOR[s.skillLevel] || '#531697';
                    return (
                      <div key={s._id}
                        style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderRadius:12, marginBottom:6, background:isMe?'rgba(83,22,151,0.05)':'#fff', border:isMe?'1.5px solid rgba(83,22,151,0.2)':'1px solid #f0f3fa', transition:'all .15s', cursor:'pointer' }}
                        onClick={() => viewProfile(s)}
                        onMouseOver={e=>{ if(!isMe) e.currentTarget.style.background='#f8f9ff'; e.currentTarget.style.borderColor='rgba(83,22,151,0.15)'; }}
                        onMouseOut={e=>{ e.currentTarget.style.background=isMe?'rgba(83,22,151,0.05)':'#fff'; e.currentTarget.style.borderColor=isMe?'rgba(83,22,151,0.2)':'#f0f3fa'; }}>
                        {/* Rank */}
                        <div style={{ width:36, textAlign:'center', flexShrink:0 }}>
                          {globalIdx < 3
                            ? <span style={{ fontSize:'1.2rem' }}>{medals[globalIdx]}</span>
                            : <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.82rem', color:'#b0bec9' }}>#{globalIdx+1}</span>}
                        </div>
                        {/* Avatar */}
                        <div style={{ width:36, height:36, borderRadius:10, background:`linear-gradient(135deg,${sc},#13a1a5)`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.9rem', flexShrink:0 }}>
                          {s.name?.charAt(0)}
                        </div>
                        {/* Name + info */}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <span style={{ fontWeight:700, fontSize:'.88rem', color:'var(--text)' }}>{s.name}</span>
                            {isMe && <span style={{ fontSize:'.62rem', fontWeight:800, color:'#531697', background:'rgba(83,22,151,0.1)', padding:'1px 6px', borderRadius:999 }}>YOU</span>}
                          </div>
                          <div style={{ fontSize:'.68rem', color:'#b0bec9', marginTop:1 }}>
                            {s.department} · Y{s.year}
                            {s.rollNumber ? ` · ${s.rollNumber}` : ''}
                            {' · '}<span style={{ color:sc, fontWeight:700 }}>{s.skillLevel||'Beginner'}</span>
                          </div>
                        </div>
                        {/* Stats chips */}
                        <div style={{ display:'flex', gap:10, alignItems:'center', flexShrink:0 }}>
                          <div style={{ textAlign:'center' }}>
                            <div style={{ fontSize:'.62rem', color:'#b0bec9', fontWeight:700 }}>STREAK</div>
                            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.82rem', color:'#f59e0b' }}>🔥{s.streak||0}d</div>
                          </div>
                          <div style={{ textAlign:'center' }}>
                            <div style={{ fontSize:'.62rem', color:'#b0bec9', fontWeight:700 }}>SOLVED</div>
                            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.82rem', color:'#13a1a5' }}>{s.codingProblems||s.totalProblemsSolved||0}</div>
                          </div>
                          <div style={{ textAlign:'center' }}>
                            <div style={{ fontSize:'.62rem', color:'#b0bec9', fontWeight:700 }}>SCORE</div>
                            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.9rem', background:'linear-gradient(135deg,#531697,#13a1a5)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>{s.totalScore||0}</div>
                          </div>
                          <span style={{ color:'#d0d7e8', fontSize:'.75rem' }}>→</span>
                        </div>
                      </div>
                    );
                  })}
                  {filtered.length === 0 && (
                    <div style={{ textAlign:'center', padding:40, color:'#b0bec9' }}>
                      <div style={{ fontSize:'2rem', marginBottom:8 }}>🔍</div>
                      No students match this filter.
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// STUDENT DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function StudentDash() {
  const { user:ctxUser, setUser } = useAuth();
  const nav = useNavigate();

  // ALL hooks declared at top unconditionally
  const [data, setData]         = useState(null);
  const [companies, setCompanies] = useState([]);
  const [history, setHistory]   = useState([]);
  const [batchData, setBatch]   = useState(null);
  const [compReadiness, setCompReadiness] = useState([]);
  const [ipResult, setIpResult] = useState(null);
  const [ipLoading, setIpLoading] = useState(false);
  const [ipError, setIpError]   = useState('');
  const [ipAnswer, setIpAnswer] = useState('');
  const [ipQIdx, setIpQIdx]     = useState(0);
  const [showIP, setShowIP]     = useState(false);
  // Dynamic top AI Interview Prep Widget states
  const [prepQuestions, setPrepQuestions] = useState([]);
  const [prepIdx, setPrepIdx] = useState(0);
  const [prepAns, setPrepAns] = useState('');
  const [prepStatus, setPrepStatus] = useState('idle'); // 'idle' | 'started' | 'completed'
  const [prepFeedback, setPrepFeedback] = useState('');
  const [prepLoading, setPrepLoading] = useState(false);
  const [prepResults, setPrepResults] = useState([]);
  const [prepMic, setPrepMic] = useState(false);
  const [prepOverallFeedback, setPrepOverallFeedback] = useState('');
  const [isMobileScreen, setIsMobileScreen] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobileScreen(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [loading, setLoading]   = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [drives, setDrives]     = useState([]);
  const [newAnnouncementsCount, setNewAnnouncementsCount] = useState(0);
  const [showProfile, setShowProfile] = useState(false);
  const [profileForm, setProfileForm] = useState(null);
  const [profileMsg, setProfileMsg] = useState('');;
  const [profileSaving, setProfileSaving] = useState(false);
  const [lbSearch, setLbSearch] = useState('');
  const [showFullLb, setShowFullLb] = useState(false);
  const [fullLeaderboard, setFullLeaderboard] = useState([]);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [myActivityData, setMyActivityData] = useState(() => {
    // Seed from localStorage so DonutChart shows immediately (not zero)
    try { return JSON.parse(localStorage.getItem('pragati_activity_cache') || 'null'); } catch { return null; }
  });
  const updateActivityData = (d) => {
    if (!d) return;
    setMyActivityData(prev => {
      const prevSolved = (prev?.problemStats?.easy||0) + (prev?.problemStats?.medium||0) + (prev?.problemStats?.hard||0);
      const newSolved  = (d?.problemStats?.easy||0)   + (d?.problemStats?.medium||0)   + (d?.problemStats?.hard||0);
      const merged = { ...d };
      
      // If new solved count is 0 or less than what we already verified/cached, keep the higher numbers
      if (newSolved < prevSolved && prevSolved > 0) {
        merged.problemStats = prev.problemStats;
      }
      
      try { localStorage.setItem('pragati_activity_cache', JSON.stringify(merged)); } catch {}
      return merged;
    });
  };
  
  const [activeAnnouncement, setActiveAnnouncement] = useState(null);
  const [showAllAnnouncements, setShowAllAnnouncements] = useState(false);
  const [activeDrive, setActiveDrive] = useState(null);
  const [showDailyDigest, setShowDailyDigest] = useState(false);

  const load = useCallback(async () => {
    // ── WAVE 1: Critical data — renders the page immediately ──────────────────
    const [dash, me, hist] = await Promise.all([
      apiFetch('/analytics/dashboard'),
      apiFetch('/auth/me'),
      apiFetch('/skillpath/history'),
    ]);
    setData(dash || {});
    if (me?.user && setUser) setUser(me.user);
    setHistory(hist?.results || []);
    setLoading(false); // ← show page NOW with partial data

    // Load student's own heatmap/donut activity data
    const uid = me?.user?._id;
    if (uid) {
      apiFetch('/analytics/my-profile').then(d => {
        if (d) updateActivityData(d);
      }).catch(() => {
        apiFetch(`/analytics/student-profile/${uid}`).then(d => { if (d) updateActivityData(d); });
      });
    }

    // ── WAVE 2: Each API fires independently — state updates as each one lands ──
    apiFetch('/companies').then(co => { if (co?.companies) setCompanies(co.companies); }).catch(()=>{});
    apiFetch('/analytics/batch-percentile').then(batch => { if (batch) setBatch(batch); }).catch(()=>{});
    apiFetch('/analytics/company-readiness').then(cr => { if (cr?.results) setCompReadiness(cr.results); }).catch(()=>{});
    apiFetch('/analytics/leaderboard?limit=200').then(lb => { if (lb?.leaderboard) setLeaderboard(lb.leaderboard); }).catch(()=>{});
    apiFetch('/announcements').then(ann => {
      if (ann?.announcements) {
        setAnnouncements(ann.announcements);
        const lastSeen = parseInt(localStorage.getItem('pragati_notif_seen') || '0');
        setNewAnnouncementsCount(ann.announcements.filter(a => new Date(a.createdAt).getTime() > lastSeen).length);
      }
    }).catch(()=>{});
    apiFetch('/drives').then(driveData => {
      if (driveData?.drives && driveData.drives.length > 0) {
        setDrives(driveData.drives);
        const todayStr = new Date().toDateString();
        if (localStorage.getItem('pragati_opp_popup_date') !== todayStr) {
          setShowDailyDigest(true);
        }
      }
    }).catch(()=>{});

  }, [setUser]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh company readiness + user streak when tab regains focus
  useEffect(() => {
    async function refreshOnFocus() {
      try {
        const cr = await apiFetch('/analytics/company-readiness');
        if (cr?.results) setCompReadiness(cr.results);
      } catch {}
      try {
        // Re-fetch /auth/me to pick up updated streak after solving a daily problem
        const me = await apiFetch('/auth/me');
        if (me?.user && setUser) setUser(me.user);
      } catch {}
    }
    window.addEventListener('focus', refreshOnFocus);
    return () => window.removeEventListener('focus', refreshOnFocus);
  }, []);

  const user   = data?.user || ctxUser || {};
  const ats    = user?.atsScore || 0;
  const lvl    = user?.skillLevel || 'Beginner';
  const streak = user?.streak || 0;
  const solved = user?.totalProblemsSolved || data?.problems?.solved || 0;
  const result = data?.latestAnalysis;
  const lc     = { Beginner:'#f59e0b', Intermediate:'#531697', Expert:'#47d372' };

  // Consistency fix: ATS-based confidence label
  const confidenceLabel = ats >= 70 ? 'Apply with confidence! ✅' : ats >= 50 ? 'Needs improvement ⚠️' : 'Build skills first 📚';
  const confidenceColor = ats >= 70 ? '#166534' : ats >= 50 ? '#92400e' : '#991b1b';

  async function loadFullLeaderboard() {
    const d = await apiFetch('/analytics/leaderboard?limit=100');
    if (d?.leaderboard) setFullLeaderboard(d.leaderboard);
    setShowFullLb(true);
  }

  function openProfile() {
    const u = data?.user || ctxUser || {};
    setProfileForm({
      name: u.name || '',
      email: u.email || '',
      department: u.department || '',
      year: u.year || '',
      rollNumber: u.rollNumber || '',
      linkedinUrl: u.linkedinUrl || '',
      githubUrl: u.githubUrl || '',
      portfolioUrl: u.portfolioUrl || '',
      bio: u.bio || '',
    });
    setProfileMsg('');
    setShowProfile(true);
  }

  async function saveProfile(e) {
    e.preventDefault();
    setProfileSaving(true); setProfileMsg('');
    try {
      const res = await fetch(`${API}/users/profile`, {
        method: 'PUT',
        headers: { ...tk(), 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm)
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Save failed');
      if (d.user && setUser) setUser(d.user);
      setProfileMsg('✅ Profile updated!');
      setTimeout(() => setShowProfile(false), 1200);
    } catch(err) { setProfileMsg(`❌ ${err.message}`); }
    finally { setProfileSaving(false); }
  }

  async function runInterviewPrep() {
    setIpLoading(true); setIpError(''); setIpQIdx(0);
    try {
      const payload = {
        candidateName: user?.name,
        targetRole: result?.jobTitle || 'Software Engineer',
        skillGaps: result?.skillGapAnalysis?.missingSkills?.map(s=>({ skill:s, importance:'important' })) || [],
        strengths: result?.skillGapAnalysis?.matchedSkills || [],
        readinessScore: ats,
      };
      const res = await fetch(`${API}/skillpath/interview-prep`, {
        method:'POST', headers:{ ...tk(), 'Content-Type':'application/json' }, body:JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('API error');
      const d = await res.json();
      setIpResult(d);
    } catch(e){ setIpError('Could not connect to AI service. Check that GEMINI_API_KEY is set and the backend is running.'); }
    finally { setIpLoading(false); }
  }

  async function submitAnswer() {
    if (!ipAnswer.trim()) return;
    const allQs = [
      ...(ipResult?.technical_questions||[]).map(q=>({ ...q, type:'technical' })),
      ...(ipResult?.behavioral_questions||[]).map(q=>({ ...q, type:'behavioral' })),
    ];
    const next = allQs[ipQIdx + 1];
    try {
      const res = await fetch(`${API}/skillpath/interview-feedback`, {
        method:'POST', headers:{ ...tk(), 'Content-Type':'application/json' },
        body:JSON.stringify({ question: allQs[ipQIdx]?.question, answer: ipAnswer,
          nextQuestion: next?.question, candidateName: user?.name, targetRole: result?.jobTitle })
      });
      const d = await res.json();
      setIpResult(r => ({ ...r, _feedback: d.feedback }));
      setIpAnswer('');
      if (next) setIpQIdx(i => i+1);
    } catch(e){}
  }

  const DYNAMIC_INTERVIEW_QUESTIONS = [
    // ── Core DSA ───────────────────────────────────────────────────────────
    { question: "How does a Hash Map handle collisions? Explain the difference between chaining and open addressing.", type: "Core DSA" },
    { question: "Explain the difference between a Stack and a Queue. What are their typical time complexities for insertion and deletion?", type: "Core DSA" },
    { question: "What is the difference between Depth First Search (DFS) and Breadth First Search (BFS)? When would you prefer BFS?", type: "Core DSA" },
    { question: "How do you detect a cycle in a Singly Linked List? Explain Floyd's Cycle-Finding Algorithm.", type: "Core DSA" },
    { question: "What is the time complexity of Quick Sort and Merge Sort in the worst and average cases? Why does Quick Sort have a worst case of O(n^2)?", type: "Core DSA" },
    { question: "Explain the concept of Binary Search. What is its time complexity and what is the prerequisite for applying it?", type: "Core DSA" },
    { question: "What is a Binary Search Tree (BST)? How does its search operation differ from a standard Binary Tree in terms of time complexity?", type: "Core DSA" },

    // ── CS Fundamentals: DBMS ──────────────────────────────────────────────
    { question: "What are ACID properties in a database transaction? Explain Atomicity and Consistency with an example.", type: "CS Fundamentals (DBMS)" },
    { question: "Explain the difference between a primary key, a unique key, and a foreign key in database tables.", type: "CS Fundamentals (DBMS)" },
    { question: "What is database normalization? Explain 1NF, 2NF, and 3NF in simple terms.", type: "CS Fundamentals (DBMS)" },
    { question: "What is the difference between a Clustered and a Non-Clustered index in SQL? How do they affect query performance?", type: "CS Fundamentals (DBMS)" },
    { question: "Explain the difference between INNER JOIN, LEFT JOIN, and RIGHT JOIN with database tables.", type: "CS Fundamentals (DBMS)" },

    // ── CS Fundamentals: OS ────────────────────────────────────────────────
    { question: "Explain the difference between a Process and a Thread. How do they share memory?", type: "CS Fundamentals (OS)" },
    { question: "What is a deadlock in Operating Systems? What are the four necessary conditions for a deadlock to occur?", type: "CS Fundamentals (OS)" },
    { question: "What is virtual memory and paging? Explain the concept of Thrashing.", type: "CS Fundamentals (OS)" },
    { question: "Explain the difference between preemptive and non-preemptive CPU scheduling. Give an example of each.", type: "CS Fundamentals (OS)" },

    // ── CS Fundamentals: Networking ────────────────────────────────────────
    { question: "What is the difference between TCP and UDP? In what real-world scenarios would you prefer UDP over TCP?", type: "CS Fundamentals (CN)" },
    { question: "What happens behind the scenes when you type a URL like google.com in a browser and hit enter?", type: "CS Fundamentals (CN)" },
    { question: "Explain the three-way handshake process in TCP connection establishment.", type: "CS Fundamentals (CN)" },
    { question: "What is the difference between HTTP and HTTPS? How does SSL/TLS ensure security?", type: "CS Fundamentals (CN)" },

    // ── Technical Round: OOPs & System Design ──────────────────────────────
    { question: "Explain the four pillars of Object-Oriented Programming (OOP) with real-world analogies.", type: "Technical Round (OOPs)" },
    { question: "What is the difference between an Abstract Class and an Interface? When would you use which in Java or C++?", type: "Technical Round (OOPs)" },
    { question: "What is the Model-View-Controller (MVC) architecture? How do the three components interact?", type: "Technical Round (Design)" },
    { question: "Explain the difference between Method Overloading and Method Overriding with a short code example scenario.", type: "Technical Round (OOPs)" },
    { question: "What is horizontal scaling vs vertical scaling? In what situations would you scale a database horizontally?", type: "Technical Round (Design)" }
  ];

  const loadAndPlayQuestion = async (text, welcome = false, targetIdx = 0) => {
    setPrepLoading(true);
    const speechText = welcome 
      ? `Welcome to your AI Placement Interview Prep module. Here is your first question. ${text}`
      : `Question ${targetIdx + 1}. ${text}`;

    try {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (window.interviewAudioPlayer) {
        try { window.interviewAudioPlayer.pause(); } catch(e){}
        window.interviewAudioPlayer = null;
      }
      
      const response = await fetch(`${API}/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('pragati_token')}`
        },
        body: JSON.stringify({
          text: speechText,
          role: 'system_female'
        })
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        window.interviewAudioPlayer = audio;
        
        // Sync question display on screen with exact moment audio starts playing!
        setPrepIdx(targetIdx);
        setPrepAns('');
        setPrepFeedback('');
        setPrepLoading(false);
        await audio.play();
      } else {
        throw new Error('TTS failed');
      }
    } catch (e) {
      // Fallback
      setPrepIdx(targetIdx);
      setPrepAns('');
      setPrepFeedback('');
      setPrepLoading(false);
      
      const ut = new SpeechSynthesisUtterance(speechText);
      const voices = window.speechSynthesis?.getVoices() || [];
      const englishVoice = voices.find(v => v.lang.startsWith('en-US')) || voices[0];
      if (englishVoice) ut.voice = englishVoice;
      window.speechSynthesis?.speak(ut);
    }
  };

  const speakFeedbackAndThen = async (feedbackText, onDone) => {
    setPrepLoading(true);
    try {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (window.interviewAudioPlayer) {
        try { window.interviewAudioPlayer.pause(); } catch(e){}
        window.interviewAudioPlayer = null;
      }
      
      const response = await fetch(`${API}/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('pragati_token')}`
        },
        body: JSON.stringify({
          text: `Feedback. ${feedbackText}`,
          role: 'system_female' // Natural Indian English female Neerja Neural voice
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        window.interviewAudioPlayer = audio;
        
        audio.onended = () => {
          setPrepLoading(false);
          onDone();
        };
        audio.onerror = () => {
          setPrepLoading(false);
          onDone();
        };
        await audio.play();
      } else {
        throw new Error('TTS failed');
      }
    } catch (e) {
      // Fallback
      setPrepLoading(false);
      const ut = new SpeechSynthesisUtterance(`Feedback. ${feedbackText}`);
      const voices = window.speechSynthesis?.getVoices() || [];
      const englishVoice = voices.find(v => v.lang.startsWith('en-IN')) || voices[0];
      if (englishVoice) ut.voice = englishVoice;
      
      ut.onend = () => { onDone(); };
      ut.onerror = () => { onDone(); };
      window.speechSynthesis?.speak(ut);
    }
  };

  const startWidgetInterview = () => {
    const shuffled = [...DYNAMIC_INTERVIEW_QUESTIONS].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 10); // 10 questions per round!
    setPrepQuestions(selected);
    setPrepResults([]);
    setPrepStatus('started');
    setPrepOverallFeedback('');
    
    // Welcome user and immediately load + voice Q1
    loadAndPlayQuestion(selected[0].question, true, 0);
  };

  const handleWidgetSubmit = async () => {
    if (!prepAns.trim() || prepLoading) return;
    setPrepLoading(true);
    try {
      const activeQ = prepQuestions[prepIdx];
      const res = await fetch(`${API}/skillpath/interview-feedback`, {
        method: 'POST',
        headers: { ...tk(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: activeQ.question,
          answer: prepAns,
          candidateName: ctxUser?.name || 'Student',
          targetRole: 'Software Developer'
        })
      });
      const d = await res.json();
      setPrepFeedback(d.feedback);
      
      const newResult = { question: activeQ.question, answer: prepAns, feedback: d.feedback };
      const updatedResults = [...prepResults, newResult];
      setPrepResults(updatedResults);
      
      // Let Pragati speak feedback, then go to next question or complete
      speakFeedbackAndThen(d.feedback, () => {
        if (prepIdx < prepQuestions.length - 1) {
          const nextIdx = prepIdx + 1;
          loadAndPlayQuestion(prepQuestions[nextIdx].question, false, nextIdx);
        } else {
          // Compute overall score
          let scoreSum = 0;
          updatedResults.forEach(r => {
            const words = r.answer.trim().split(/\s+/).length;
            if (words >= 45) scoreSum += 9;
            else if (words >= 25) scoreSum += 7;
            else scoreSum += 4;
          });
          const finalScore = Math.round(scoreSum / updatedResults.length);
          setPrepOverallFeedback(`Grade: ${finalScore}/10. Great job completing the mock interview series!`);
          setPrepStatus('completed');
          
          // Voice final success note
          const congratsMsg = `Congratulations! You have completed all mock questions. Wishing you the absolute best of luck for your upcoming interviews! You've got this!`;
          try {
            if (window.speechSynthesis) window.speechSynthesis.cancel();
            fetch(`${API}/tts`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('pragati_token')}`
              },
              body: JSON.stringify({ text: congratsMsg, role: 'system_female' })
            }).then(response => {
              if (response.ok) {
                response.blob().then(blob => {
                  const audio = new Audio(URL.createObjectURL(blob));
                  audio.play();
                });
              }
            });
          } catch (e) {
            const ut = new SpeechSynthesisUtterance(congratsMsg);
            window.speechSynthesis?.speak(ut);
          }
        }
      });
    } catch (err) {
      console.error(err);
      setPrepLoading(false);
    }
  };

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'60vh', flexDirection:'column', gap:12 }}>
      <div style={{ width:40, height:40, border:'3px solid #e8edf5', borderTopColor:'#531697', borderRadius:'50%', animation:'_s .7s linear infinite' }}/>
      <div style={{ color:'#b0bec9', fontSize:'.82rem' }}>Loading your dashboard…</div>
      <style>{`@keyframes _s{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const allIpQs = ipResult ? [
    ...(ipResult.technical_questions||[]).map(q=>({ ...q, type:'💻 Technical' })),
    ...(ipResult.behavioral_questions||[]).map(q=>({ ...q, type:'🤝 Behavioural' })),
    ...(ipResult.gap_questions||[]).map(q=>({ ...q, type:'⚠️ Gap Question' })),
  ] : [];
  const currentQ = allIpQs[ipQIdx];

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif", maxWidth:1200, margin:'0 auto' }}>
      {showEditProfile && <EditProfileModal user={user} onClose={()=>setShowEditProfile(false)} onSaved={u=>{ if(setUser) setUser(u); load(); }} />}
      {showLeaderboard && <LeaderboardModal myId={user._id} onClose={() => setShowLeaderboard(false)} />}
      <AnnouncementModal ann={activeAnnouncement} onClose={()=>setActiveAnnouncement(null)} />
      {showAllAnnouncements && <AllAnnouncementsModal announcements={announcements} onClose={()=>setShowAllAnnouncements(false)} onView={(a)=>{ setShowAllAnnouncements(false); setActiveAnnouncement(a); }} />}
      <DriveModal drive={activeDrive} onClose={()=>setActiveDrive(null)} />

      {/* ── PAGE HEADER ───────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.6rem', color:'var(--text)', margin:0 }}>
            Hello, {user?.name?.split(' ')[0]||'Student'} 👋
          </h1>
          <p style={{ color:'var(--text-3)', marginTop:4, fontSize:'.88rem' }}>
            {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>{ setShowLeaderboard(true); setNewAnnouncementsCount(0); localStorage.setItem('pragati_notif_seen', Date.now().toString()); }} style={{ padding:'8px 14px', borderRadius:10, border:'1.5px solid rgba(83,22,151,.2)', background:'rgba(83,22,151,.05)', color:'#531697', fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.8rem', display:'flex', alignItems:'center', gap:5, position:'relative' }}>
            🏆 Leaderboard
            {newAnnouncementsCount > 0 && (
              <span style={{ position:'absolute', top:-6, right:-6, width:18, height:18, borderRadius:'50%', background:'#ef4444', color:'#fff', fontSize:'.6rem', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid #fff' }}>
                {newAnnouncementsCount > 9 ? '9+' : newAnnouncementsCount}
              </span>
            )}
          </button>
          <button onClick={()=>setShowEditProfile(true)} style={{ padding:'8px 14px', borderRadius:10, border:'1.5px solid rgba(19,161,165,.2)', background:'rgba(19,161,165,.05)', color:'#13a1a5', fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.8rem', display:'flex', alignItems:'center', gap:5 }}>
            ✏️ Edit Profile
          </button>
        </div>
      </div>

      {/* ── URGENT ANNOUNCEMENTS ────────────────────────────────────────── */}
      {announcements.filter(a=>a.priority==='urgent').map(a=>(
        <div key={a._id} style={{ padding:'10px 16px', borderRadius:10, background:'rgba(239,68,68,0.07)', border:'1.5px solid rgba(239,68,68,0.25)', marginBottom:10, display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:'1.1rem' }}>🚨</span>
          <div style={{ flex:1 }}>
            <span style={{ fontWeight:800, color:'#991b1b', fontSize:'.85rem' }}>{a.title}: </span>
            <span style={{ color:'var(--text-3)', fontSize:'.82rem' }}>{a.message}</span>
          </div>
          {a.link&&<a href={a.link} target="_blank" rel="noreferrer" style={{ color:'#991b1b', fontWeight:700, fontSize:'.75rem', textDecoration:'none' }}>View →</a>}
        </div>
      ))}

      {/* ── UPLOAD PROMPT ──────────────────────────────────────────────── */}
      {!user?.resumeUrl && (
        <div onClick={()=>nav('/dashboard/skillpath')} style={{ background:'linear-gradient(135deg,rgba(83,22,151,0.06),rgba(19,161,165,0.06))', border:'1.5px dashed rgba(83,22,151,.25)', borderRadius:12, padding:'12px 18px', marginBottom:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontWeight:800, color:'#531697', fontSize:'.88rem' }}>📄 Upload your resume to unlock personalised insights</div>
            <div style={{ fontSize:'.75rem', color:'var(--text-3)', marginTop:2 }}>Get ATS score, skill gaps, company readiness and learning pathway</div>
          </div>
          <div style={{ padding:'6px 14px', borderRadius:8, background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontWeight:800, fontSize:'.78rem', flexShrink:0 }}>Start Now →</div>
        </div>
      )}

      {/* ── KPI STATS ROW ────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
        {[
          { icon:'🔥', label:'Day Streak', value:streak, sub:streak>0?`${streak} day${streak!==1?'s':''} running!`:'Start today!', grad:'linear-gradient(135deg,#f59e0b,#ef4444)', onClick:()=>nav('/dashboard/problems') },
          { icon:'💻', label:'Problems Solved', value:solved, sub:'Total across all time', grad:'linear-gradient(135deg,#531697,#13a1a5)', onClick:()=>nav('/dashboard/problems') },
          { icon:'📊', label:'ATS Score', value:ats?`${ats}/100`:'—', sub:ats?confidenceLabel:'Upload resume', grad:'linear-gradient(135deg,#042c5d,#531697)', onClick:()=>nav('/dashboard/skillpath') },
          { icon:'⭐', label:'Skill Level', value:lvl, sub:`Based on latest analysis`, grad:`linear-gradient(135deg,${lc[lvl]||'#531697'},#13a1a5)` },
        ].map(s=>(
          <div key={s.label} onClick={s.onClick} style={{ background:'var(--surface)', borderRadius:14, padding:'14px 16px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', border:'1px solid #f0f3fa', cursor:s.onClick?'pointer':'default', transition:'transform .15s, box-shadow .15s' }}
            onMouseOver={e=>{ if(s.onClick){ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(83,22,151,0.1)'; }}}
            onMouseOut={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.06)'; }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <div style={{ width:34, height:34, borderRadius:9, background:s.grad, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem', flexShrink:0 }}>{s.icon}</div>
              <div style={{ fontSize:'.7rem', color:'#b0bec9', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em' }}>{s.label}</div>
            </div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.5rem', color:'var(--text)', lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:'.7rem', color:'var(--text-3)', marginTop:4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── APTITUDE PROGRESS WIDGET ─────────────────────────────────────── */}
      <div style={{ background:'linear-gradient(135deg,rgba(83,22,151,0.06),rgba(19,161,165,0.06))', border:'1.5px solid rgba(83,22,151,0.18)', borderRadius:14, padding:'14px 18px', marginBottom:14, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:42, height:42, borderRadius:12, background:'linear-gradient(135deg,#531697,#13a1a5)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.3rem', color:'#fff', flexShrink:0 }}>🎯</div>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', color:'var(--text)' }}>Aptitude & Company Prep</div>
            <div style={{ fontSize:'.75rem', color:'var(--text-3)', marginTop:2 }}>Target company practice · AI-generated company quizzes · Instant explanations</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button onClick={()=>nav('/dashboard/aptitude')} style={{ padding:'8px 16px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.8rem', boxShadow:'0 4px 12px rgba(83,22,151,0.2)' }}>
            🎯 Practice Aptitude Now →
          </button>
        </div>
      </div>

      {/* ── CODING ACTIVITY: Heatmap + Donut ────────────────────────── */}
      {(() => {
        const myProblems = solved || 0;
        const easy   = myActivityData?.problemStats?.easy   ?? Math.floor(myProblems * 0.45);
        const medium = myActivityData?.problemStats?.medium ?? Math.floor(myProblems * 0.38);
        const hard   = myActivityData?.problemStats?.hard   ?? Math.max(0, myProblems - Math.floor(myProblems*0.45) - Math.floor(myProblems*0.38));
        return (
          <div style={{ background:'var(--surface)', borderRadius:14, padding:'18px 20px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', border:'1px solid #f0f3fa', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:8 }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', color:'var(--text)' }}>
                📊 My Coding Activity & Interview Prep
              </div>
              <div style={{ fontSize:'.72rem', color:'var(--text-3)', fontWeight:600 }}>
                {myProblems} problems solved total
              </div>
            </div>

            {/* Heatmap Row (Full Width) */}
            <div style={{ width: '100%', marginBottom: 24, overflowX: 'hidden' }}>
              <div style={{ fontSize:'.7rem', fontWeight:700, color:'var(--text-2)', marginBottom:10 }}>📅 Monthly Activity</div>
              <CalendarHeatmap
                noCard={true}
                title=""
                subtitle=""
                submissions={myActivityData?.submissionDates || []}
                currentStreak={streak}
                maxStreak={user?.maxStreak || streak}
              />
            </div>

            {/* Below Heatmap: Stacks on Mobile */}
            <div style={{
              display:'grid',
              gridTemplateColumns: isMobileScreen ? '1fr' : '1fr 1.5fr',
              gap:24,
              borderTop:'1px solid #e8edf5',
              paddingTop:20
            }}>
              {/* Left Column: Donut Chart */}
              <div style={{ minWidth:190 }}>
                <div style={{ fontSize:'.7rem', fontWeight:700, color:'var(--text-2)', marginBottom:12 }}>💻 Problems Breakdown</div>
                <DonutChart easy={easy} medium={medium} hard={hard} total={myProblems}/>
                <button onClick={()=>nav('/dashboard/problems')}
                  style={{ marginTop:14, width:'100%', padding:'8px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.75rem' }}>
                  Solve More Problems →
                </button>
              </div>

              {/* Right Column: AI Interview Prep Widget */}
              <div style={{
                borderLeft: isMobileScreen ? 'none' : '1px solid #e8edf5',
                borderTop: isMobileScreen ? '1px solid #e8edf5' : 'none',
                paddingLeft: isMobileScreen ? 0 : 24,
                paddingTop: isMobileScreen ? 20 : 0
              }}>
                <div style={{ fontSize:'.82rem', fontWeight:800, color:'var(--text)', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                  🎙️ AI Placement Interview Prep
                </div>
                
                {prepStatus === 'idle' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    <div style={{ fontSize:'.75rem', color:'var(--text-3)', lineHeight:1.6 }}>
                      Ready to test your skills? Try our fast 10-question AI mock interview to practice speaking, get graded, and get placement ready!
                    </div>
                    <button onClick={startWidgetInterview}
                      style={{ padding:'8px 14px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.78rem', boxShadow:'0 4px 12px rgba(83,22,151,0.15)' }}>
                      Start Quick Mock Interview 🎤
                    </button>
                  </div>
                )}

                {prepStatus === 'started' && prepQuestions.length > 0 && (() => {
                  const activeQ = prepQuestions[prepIdx];
                  return (
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <span style={{ fontSize:'.68rem', color:'#b0bec9', fontWeight:700 }}>Question {prepIdx + 1} of 10</span>
                        <span style={{ padding:'2px 6px', borderRadius:4, background:'rgba(83,22,151,0.06)', color:'#531697', fontSize:'.65rem', fontWeight:800 }}>{activeQ.type}</span>
                      </div>
                      <div style={{ height:4, background:'#f0f3fa', borderRadius:999, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${((prepIdx + 1) / 10) * 100}%`, background:'linear-gradient(90deg,#531697,#13a1a5)', borderRadius:999 }} />
                      </div>
                      
                      <div style={{ fontWeight:700, fontSize:'.8rem', color:'var(--text)', lineHeight:1.45, marginTop:4 }}>
                        {activeQ.question}
                      </div>

                      <div style={{ position:'relative', marginTop:6 }}>
                        <textarea
                          value={prepAns}
                          onChange={e => setPrepAns(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleWidgetSubmit();
                            }
                          }}
                          placeholder="Type your answer... (Press Enter to submit)"
                          rows={3}
                          style={{ width:'100%', padding:'10px 40px 10px 10px', borderRadius:10, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.82rem', resize:'none', outline:'none', boxSizing:'border-box' }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
                            if (!SR) { alert('Speech recognition is not supported in this browser.'); return; }
                            if (prepMic) {
                              setPrepMic(false);
                              return;
                            }
                            
                            // Pause wake word detection before starting widget mic
                            window.dispatchEvent(new CustomEvent('pragati-pause-wake-word'));
                            
                            setPrepMic(true);
                            const rec = new SR();
                            rec.lang = 'en-IN';
                            rec.continuous = false;
                            rec.interimResults = false;
                            rec.onresult = event => {
                              setPrepAns(a => a + ' ' + event.results[0][0].transcript);
                            };
                            rec.onerror = () => {
                              setPrepMic(false);
                              window.dispatchEvent(new CustomEvent('pragati-resume-wake-word'));
                            };
                            rec.onend = () => {
                              setPrepMic(false);
                              window.dispatchEvent(new CustomEvent('pragati-resume-wake-word'));
                            };
                            rec.start();
                          }}
                          style={{ position:'absolute', right:8, top:8, border:'none', background:prepMic?'#ef4444':'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', width:26, height:26, borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.8rem' }}
                        >
                          {prepMic ? '🛑' : '🎙️'}
                        </button>
                      </div>

                      {prepLoading && (
                        <div style={{ fontSize:'.7rem', color:'var(--text-3)' }}>⏳ Analyzing answer, please wait...</div>
                      )}

                      {prepFeedback && !prepLoading && (
                        <div style={{ padding:'8px 10px', background:'rgba(71,211,114,0.06)', border:'1px solid rgba(71,211,114,0.2)', borderRadius:8, fontSize:'.73rem', color:'#166534', lineHeight:1.5 }}>
                          <strong>Feedback:</strong> {prepFeedback}
                        </div>
                      )}

                      <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                        <button onClick={handleWidgetSubmit} disabled={!prepAns.trim() || prepLoading}
                          style={{ padding:'6px 12px', borderRadius:8, border:'none', background:prepAns.trim()?'linear-gradient(135deg,#531697,#13a1a5)':'#d0d7e8', color:'#fff', fontWeight:700, cursor:prepAns.trim()?'pointer':'not-allowed', fontFamily:"'Nunito',sans-serif", fontSize:'.73rem' }}>
                          Submit & Next →
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {prepStatus === 'completed' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    <div style={{ fontSize:'.78rem', color:'#166534', fontWeight:800, background:'rgba(71,211,114,0.08)', padding:'8px 10px', borderRadius:8, border:'1px solid rgba(71,211,114,0.2)' }}>
                      🏆 {prepOverallFeedback}
                    </div>
                    <div style={{ fontSize:'.73rem', color:'var(--text-2)', lineHeight:1.6, fontStyle:'italic' }}>
                      🌟 Great effort! Keep practicing. Wishing you the absolute best of luck for your upcoming campus placement interviews! You've got this! 🔥
                    </div>
                    <button onClick={startWidgetInterview}
                      style={{ padding:'6px 12px', borderRadius:8, border:'1px solid #531697', background:'transparent', color:'#531697', fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.73rem', marginTop:4 }}>
                      🔄 Restart Interview
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── ROW 2: SKILLPATH + QUICK ACTIONS ─────────────────────────── */}
      <div className="grid-16-1">

        {/* Latest SkillPath */}
        <div style={{ background:'var(--surface)', borderRadius:14, padding:'18px 20px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', border:'1px solid #f0f3fa' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', color:'var(--text)' }}>🧠 Latest SkillPath Analysis</div>
            <button onClick={()=>nav('/dashboard/skillpath')} style={{ padding:'5px 12px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.73rem' }}>New →</button>
          </div>
          {result ? (
            <>
              {/* ATS Score bar */}
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                <div style={{ position:'relative', width:64, height:64, flexShrink:0 }}>
                  <svg viewBox="0 0 64 64" style={{ width:64, height:64, transform:'rotate(-90deg)' }}>
                    <circle cx="32" cy="32" r="26" fill="none" stroke="#f0f3fa" strokeWidth="8"/>
                    <circle cx="32" cy="32" r="26" fill="none" strokeWidth="8"
                      stroke={ats>=70?'#47d372':ats>=50?'#f59e0b':'#ef4444'}
                      strokeDasharray={`${(ats/100)*163.4} 163.4`}
                      strokeLinecap="round"/>
                  </svg>
                  <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.9rem', color:'var(--text)' }}>{ats}</div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, color:'var(--text)', fontSize:'.88rem', marginBottom:3 }}>{result.jobTitle||'Role'}</div>
                  <div style={{ fontSize:'.75rem', color:confidenceColor, fontWeight:700, marginBottom:6 }}>{confidenceLabel}</div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {[['Eligibility',`${result.eligibilityPercent||0}%`,'#13a1a5'],['Skills Found',result.parsedSkills?.length||0,'#531697'],['Gaps',result.skillGapAnalysis?.missingSkills?.length||0,'#ef4444']].map(([l,v,c])=>(
                      <span key={l} style={{ padding:'2px 8px', borderRadius:999, background:`${c}12`, color:c, fontSize:'.68rem', fontWeight:700 }}>{l}: {v}</span>
                    ))}
                  </div>
                </div>
              </div>
              {/* Skill gap chips */}
              {result.skillGapAnalysis?.missingSkills?.length > 0 && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:'.7rem', fontWeight:700, color:'#b0bec9', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.04em' }}>Top Skill Gaps</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                    {result.skillGapAnalysis.missingSkills.slice(0,6).map(s=>(
                      <span key={s} style={{ padding:'2px 8px', borderRadius:999, background:'rgba(239,68,68,0.07)', color:'#991b1b', fontSize:'.7rem', fontWeight:600 }}>− {s}</span>
                    ))}
                  </div>
                </div>
              )}
              {/* ATS history mini chart */}
              {history.length > 1 && (() => {
                const vals = [...history].sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt)).map(h=>h.atsScore||0);
                const maxV = Math.max(...vals, 1);
                const W=260, H=42;
                const pts = vals.map((v,i)=>({ x:8+(vals.length===1?W-16:(i/(vals.length-1))*(W-16)), y:H-6-((v/maxV)*(H-12)) }));
                const path = pts.map((p,i)=>`${i===0?'M':'L'}${p.x},${p.y}`).join(' ');
                return (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:'.7rem', fontWeight:700, color:'#b0bec9', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.04em' }}>ATS History ({vals.length} analyses)</div>
                    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:42 }}>
                      <defs><linearGradient id="atsg2" x1="0" x2="1"><stop offset="0%" stopColor="#531697"/><stop offset="100%" stopColor="#13a1a5"/></linearGradient></defs>
                      <path d={`${path} L${pts[pts.length-1].x},${H} L${pts[0].x},${H} Z`} fill="url(#atsg2)" opacity={0.1}/>
                      <path d={path} fill="none" stroke="url(#atsg2)" strokeWidth={2} strokeLinecap="round"/>
                      {pts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={3} fill="url(#atsg2)"><title>{vals[i]}/100</title></circle>)}
                    </svg>
                  </div>
                );
              })()}
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={()=>nav('/dashboard/skillpath')} style={{ flex:1, padding:'8px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.78rem' }}>📄 Re-analyse</button>
                <button onClick={()=>{setShowIP(s=>!s); if(!ipResult) runInterviewPrep();}} style={{ flex:1, padding:'8px', borderRadius:9, border:`1.5px solid ${showIP?'#531697':'#d0d7e8'}`, background:showIP?'rgba(83,22,151,.06)':'transparent', color:'#531697', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.78rem' }}>
                  🎤 Prep Guide
                </button>
                <button onClick={()=>nav('/dashboard/ai-interview')} style={{ flex:1, padding:'8px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.78rem' }}>
                  🤖 AI Interview
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign:'center', padding:'24px 0' }}>
              <div style={{ fontSize:'2.5rem', marginBottom:10 }}>🧠</div>
              <div style={{ fontSize:'.85rem', color:'#b0bec9', marginBottom:14 }}>Upload your resume & paste a JD to get started</div>
              <button onClick={()=>nav('/dashboard/skillpath')} style={{ padding:'10px 24px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.85rem' }}>Start SkillPath AI →</button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{ background:'var(--surface)', borderRadius:14, padding:'18px 20px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', border:'1px solid var(--border)', display:'flex', flexDirection:'column', height:'100%' }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', marginBottom:12, color:'var(--text)' }}>⚡ Quick Actions</div>
          {[
            { icon:'💻', label:"Today's DSA Problem", sub:'Solve to extend streak', to:'/dashboard/problems', grad:'linear-gradient(135deg,#531697,#13a1a5)' },
            { icon:'🧠', label:'SkillPath AI', sub:'Resume analysis & gaps', to:'/dashboard/skillpath', grad:'linear-gradient(135deg,#042c5d,#531697)' },
            { icon:'🏢', label:'Company Research', sub:'JDs, rounds, prep tips', to:'/dashboard/companies', grad:'linear-gradient(135deg,#13a1a5,#47d372)' },
            { icon:'🎯', label:'Aptitude Practice', sub:'Quiz + GFG/IndiaBix links', to:'/dashboard/aptitude', grad:'linear-gradient(135deg,#3b82f6,#531697)' },
            { icon:'🎤', label:'Interview Prep', sub:'AI mock interviews', to:'/dashboard/ai-interview', grad:'linear-gradient(135deg,#f59e0b,#ef4444)' },
            { icon:'📝', label:'Discussions', sub:'Post doubts, get answers', to:'/dashboard/discussions', grad:'linear-gradient(135deg,#10b981,#13a1a5)' },
          ].map(a=>(
            <button key={a.to} onClick={()=>nav(a.to)}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface-2)', cursor:'pointer', marginBottom:5, textAlign:'left', transition:'all .15s' }}
              onMouseOver={e=>{ e.currentTarget.style.background='rgba(83,22,151,0.08)'; e.currentTarget.style.borderColor='rgba(83,22,151,0.2)'; }}
              onMouseOut={e=>{ e.currentTarget.style.background='var(--surface-2)'; e.currentTarget.style.borderColor='var(--border)'; }}>
              <div style={{ width:32, height:32, borderRadius:8, background:a.grad, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.9rem', flexShrink:0 }}>{a.icon}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:'.8rem', fontWeight:700, color:'var(--text)' }}>{a.label}</div>
                <div style={{ fontSize:'.67rem', color:'#b0bec9' }}>{a.sub}</div>
              </div>
              <span style={{ color:'#d0d7e8', fontSize:'.8rem' }}>›</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── INTERVIEW PREP PANEL ────────────────────────────────────────── */}
      {showIP && (
        <div style={{ background:'var(--surface)', borderRadius:14, padding:'20px 22px', marginBottom:12, boxShadow:'0 2px 12px rgba(0,0,0,0.06)', border:'1.5px solid rgba(83,22,151,.15)' }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', marginBottom:12, color:'var(--text)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              🎤 AI Interview Prep
              <span style={{ padding:'2px 8px', borderRadius:999, background:'rgba(83,22,151,.08)', color:'#531697', fontSize:'.68rem', fontWeight:700 }}>Gemini AI</span>
            </div>
            <button onClick={()=>setShowIP(false)} style={{ width:24, height:24, borderRadius:'50%', border:'1px solid #d0d7e8', background:'transparent', cursor:'pointer', color:'#b0bec9', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.8rem' }}>✕</button>
          </div>
          {ipLoading && <div style={{ textAlign:'center', padding:20, color:'var(--text-3)' }}>⏳ Generating personalised prep guide…</div>}
          {ipError && <div style={{ padding:'10px 14px', background:'#fee2e2', borderRadius:8, fontSize:'.82rem', color:'#991b1b', fontWeight:600 }}>{ipError}</div>}
          {ipResult && !ipLoading && (
            <>
              <div style={{ padding:'12px 14px', background:'rgba(83,22,151,.04)', borderRadius:10, marginBottom:14, fontSize:'.83rem', color:'var(--text-2)', lineHeight:1.65 }}>
                💬 <strong>Coach:</strong> {ipResult.coaching_summary}
              </div>
              {currentQ && (
                <div style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <span style={{ padding:'2px 8px', borderRadius:999, background:'rgba(83,22,151,.08)', color:'#531697', fontSize:'.7rem', fontWeight:700 }}>{currentQ.type}</span>
                    <span style={{ fontSize:'.73rem', color:'#b0bec9' }}>Q {ipQIdx+1} of {allIpQs.length}</span>
                    <div style={{ flex:1, height:4, background:'#f0f3fa', borderRadius:999 }}>
                      <div style={{ height:'100%', width:`${((ipQIdx+1)/allIpQs.length)*100}%`, background:'linear-gradient(90deg,#531697,#13a1a5)', borderRadius:999 }}/>
                    </div>
                  </div>
                  <div style={{ fontWeight:700, fontSize:'.9rem', color:'var(--text)', marginBottom:8, lineHeight:1.5 }}>{currentQ.question}</div>
                  {currentQ.tip && <div style={{ fontSize:'.75rem', color:'var(--text-3)', marginBottom:10, fontStyle:'italic', padding:'6px 10px', background:'rgba(245,158,11,0.06)', borderRadius:6 }}>💡 {currentQ.tip}</div>}
                  <div style={{ position:'relative' }}>
                    <textarea value={ipAnswer} onChange={e=>setIpAnswer(e.target.value)} rows={3}
                      placeholder="Type your answer here…"
                      style={{ width:'100%', padding:'10px 50px 10px 12px', borderRadius:10, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.875rem', resize:'vertical', outline:'none', boxSizing:'border-box' }}/>
                    <button type="button" onClick={()=>{
                      if(!('webkitSpeechRecognition' in window||'SpeechRecognition' in window)){alert('Voice requires Chrome');return;}
                      const SR=window.SpeechRecognition||window.webkitSpeechRecognition; const rec=new SR(); rec.lang='en-IN'; rec.interimResults=false;
                      rec.onresult=e=>setIpAnswer(a=>a+' '+e.results[0][0].transcript); rec.start();
                    }} style={{ position:'absolute', right:10, top:8, width:32, height:32, borderRadius:'50%', border:'none', background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', cursor:'pointer', fontSize:'.85rem' }}>🎙️</button>
                  </div>
                  {ipResult._feedback && <div style={{ marginTop:8, padding:'10px 14px', background:'rgba(71,211,114,.06)', border:'1px solid rgba(71,211,114,.2)', borderRadius:8, fontSize:'.82rem', color:'#166534', lineHeight:1.6 }}>{ipResult._feedback}</div>}
                  <button onClick={submitAnswer} disabled={!ipAnswer.trim()}
                    style={{ marginTop:8, padding:'8px 20px', borderRadius:9, border:'none', background:ipAnswer.trim()?'linear-gradient(135deg,#531697,#13a1a5)':'#d0d7e8', color:'#fff', fontWeight:800, cursor:ipAnswer.trim()?'pointer':'not-allowed', fontFamily:"'Nunito',sans-serif", fontSize:'.82rem' }}>
                    Submit & Get Feedback →
                  </button>
                </div>
              )}
              {ipResult.quick_wins?.length > 0 && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                  {ipResult.quick_wins.map((w,i)=>(
                    <div key={i} style={{ display:'flex', gap:6, padding:'7px 10px', background:'rgba(71,211,114,0.05)', borderRadius:8, border:'1px solid rgba(71,211,114,0.15)' }}>
                      <span style={{ color:'#47d372', fontWeight:800, flexShrink:0 }}>✓</span>
                      <span style={{ fontSize:'.75rem', color:'var(--text-2)' }}>{w}</span>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={runInterviewPrep} style={{ marginTop:10, padding:'6px 14px', borderRadius:8, border:'1.5px solid #d0d7e8', background:'transparent', color:'#531697', fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.75rem' }}>🔄 Regenerate</button>
            </>
          )}
        </div>
      )}

      {/* ── ROW 3: COMPANY READINESS + BATCH RANK ─────────────────────── */}
      <div className="grid-2-1">

        {/* Company Readiness */}
        <div style={{ background:'var(--surface)', borderRadius:14, padding:'18px 20px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', border:'1px solid var(--border)', display:'flex', flexDirection:'column', height:'100%' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', color:'var(--text)' }}>🏢 Company Readiness</div>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={async()=>{ const cr=await apiFetch('/analytics/company-readiness'); if(cr?.results) setCompReadiness(cr.results); }}
                style={{ padding:'4px 10px', borderRadius:7, border:'1px solid #d0d7e8', background:'transparent', color:'#13a1a5', fontWeight:700, fontSize:'.7rem', cursor:'pointer', fontFamily:"'Nunito',sans-serif" }}>↻</button>
              <button onClick={()=>nav('/dashboard/companies')} style={{ padding:'4px 10px', borderRadius:7, border:'1px solid #d0d7e8', background:'transparent', color:'#531697', fontWeight:700, fontSize:'.7rem', cursor:'pointer', fontFamily:"'Nunito',sans-serif" }}>All →</button>
            </div>
          </div>
          <div style={{ fontSize:'.72rem', color:'var(--text-3)', marginBottom:10 }}>
            {user?.resumeParsedSkills?.length ? `Based on ${user.resumeParsedSkills.length} skills from your resume · ATS ${ats}/100` : <span style={{ color:'#f59e0b', fontWeight:600 }}>⚠️ Upload resume in SkillPath AI to personalise scores</span>}
          </div>
          {compReadiness.length > 0 ? compReadiness.slice(0,6).map(c=>{
            const mc = c.matchScore>=75?'#47d372':c.matchScore>=50?'#f59e0b':'#ef4444';
            const icon = c.matchScore>=75?'✅':c.matchScore>=50?'⚠️':'❌';
            return (
              <div key={c.name} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:9 }}>
                <div style={{ width:88, fontSize:'.78rem', fontWeight:700, color:'var(--text)', flexShrink:0 }}>{c.name}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                    <div style={{ flex:1, height:8, background:'#f0f3fa', borderRadius:999, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${c.matchScore}%`, background:`linear-gradient(90deg,${mc},#13a1a5)`, borderRadius:999, transition:'width 1s cubic-bezier(.4,0,.2,1)' }}/>
                    </div>
                    <div style={{ width:34, textAlign:'right', fontWeight:800, fontSize:'.8rem', color:mc, flexShrink:0 }}>{c.matchScore}%</div>
                    <div style={{ fontSize:'.75rem', flexShrink:0 }}>{icon}</div>
                  </div>
                  {c.missingSkills?.length > 0 && (
                    <div style={{ fontSize:'.65rem', color:'#991b1b' }}>Gap: {c.missingSkills.slice(0,3).join(', ')}{c.missingSkills.length>3?'…':''}</div>
                  )}
                </div>
              </div>
            );
          }) : (
            <div style={{ textAlign:'center', padding:'20px 0', color:'#b0bec9', fontSize:'.82rem' }}>
              <div style={{ fontSize:'1.8rem', marginBottom:6 }}>📊</div>
              Run SkillPath AI analysis to see your company match scores
            </div>
          )}
        </div>

        {/* Batch Rank + Leaderboard Top 3 */}
        <div style={{ display:'flex', flexDirection:'column', gap:10, height:'100%' }}>
          <div style={{ background:'var(--surface)', borderRadius:14, padding:'16px 18px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', border:'1px solid var(--border)', flex:1, display:'flex', flexDirection:'column', justifyContent:'center' }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.9rem', marginBottom:10, color:'var(--text)' }}>🏆 Batch Rank</div>
            {batchData?.batchSize > 1 ? (
              <div style={{ textAlign:'center' }}>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'2.2rem', color:batchData.topPct<=25?'#47d372':batchData.topPct<=50?'#f59e0b':'#ef4444', lineHeight:1 }}>Top {batchData.topPct}%</div>
                <div style={{ fontSize:'.7rem', color:'var(--text-3)', marginTop:4, marginBottom:10 }}>of {batchData.batchSize} students in your dept</div>
                <div style={{ height:8, background:'#f0f3fa', borderRadius:999, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${batchData.percentile}%`, background:'linear-gradient(90deg,#531697,#13a1a5)', borderRadius:999 }}/>
                </div>
              </div>
            ) : <div style={{ textAlign:'center', color:'#b0bec9', fontSize:'.78rem', padding:'10px 0' }}>More data needed for batch rank</div>}
          </div>
          <div style={{ background:'var(--surface)', borderRadius:14, padding:'16px 18px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', border:'1px solid var(--border)', flex:1, display:'flex', flexDirection:'column', justifyContent:'center' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.9rem', color:'var(--text)' }}>🥇 Top Performers</div>
              <button onClick={()=>setShowLeaderboard(true)} style={{ padding:'3px 8px', borderRadius:6, border:'1px solid rgba(83,22,151,.2)', background:'rgba(83,22,151,.05)', color:'#531697', fontWeight:700, fontSize:'.65rem', cursor:'pointer', fontFamily:"'Nunito',sans-serif" }}>All →</button>
            </div>
            {leaderboard.length === 0 ? (
              <div style={{ textAlign:'center', padding:'14px 0', color:'#b0bec9', fontSize:'.75rem' }}>
                <div style={{ fontSize:'1.5rem', marginBottom:4 }}>⏳</div>
                Loading rankings…
              </div>
            ) : (
              leaderboard.slice(0,3).map((s,i)=>{
                const medals=['🥇','🥈','🥉'];
                const isMe = s._id===(data?.user?._id||ctxUser?._id);
                const skillColors = { Beginner:'#f59e0b', Intermediate:'#531697', Expert:'#47d372' };
                const sc = skillColors[s.skillLevel] || '#531697';
                return (
                  <div key={s._id||i} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:10, marginBottom:5, background:isMe?'rgba(83,22,151,0.06)':'var(--surface-2)', border:isMe?'1.5px solid rgba(83,22,151,0.2)':'1px solid var(--border)', cursor:'pointer' }}
                    onClick={()=>setShowLeaderboard(true)}>
                    <span style={{ fontSize:'1.1rem', flexShrink:0 }}>{medals[i]}</span>
                    <div style={{ width:28, height:28, borderRadius:8, background:`linear-gradient(135deg,${sc},#13a1a5)`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.75rem', flexShrink:0 }}>
                      {s.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:'.78rem', color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {s.name}{isMe&&<span style={{ color:'#531697', fontSize:'.62rem' }}> (you)</span>}
                      </div>
                      <div style={{ fontSize:'.62rem', color:'#b0bec9' }}>
                        🔥{s.streak||0}d · {s.department||'—'}
                      </div>
                    </div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.82rem', background:'linear-gradient(135deg,#531697,#13a1a5)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', flexShrink:0 }}>
                      {s.totalScore||0}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── ROW 4: ANNOUNCEMENTS + UPCOMING DRIVES ─────────────────────── */}
      <div className="grid-1-1">

        {/* Announcements */}
        <div style={{ background:'var(--surface)', borderRadius:14, padding:'18px 20px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', border:'1px solid #f0f3fa' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', color:'var(--text)', display:'flex', alignItems:'center', gap:8 }}>
              📢 Announcements
              {newAnnouncementsCount > 0 && (
                <span style={{ padding:'2px 8px', borderRadius:999, background:'rgba(239,68,68,0.1)', color:'#991b1b', fontSize:'.68rem', fontWeight:800 }}>
                  {newAnnouncementsCount} new
                </span>
              )}
            </div>
            {announcements.length > 5 && (
              <button onClick={()=>setShowAllAnnouncements(true)} style={{ padding:'4px 10px', borderRadius:7, border:'1px solid rgba(83,22,151,.2)', background:'rgba(83,22,151,.05)', color:'#531697', fontWeight:700, fontSize:'.7rem', cursor:'pointer', fontFamily:"'Nunito',sans-serif" }}>All Announcements →</button>
            )}
          </div>
          {announcements.length > 0 ? (
            announcements.slice(0,5).map(a => {
              const pc = { urgent:'#ef4444', high:'#f59e0b', normal:'#531697' };
              const col = pc[a.priority] || pc.normal;
              return (
                <div key={a._id} onClick={()=>setActiveAnnouncement(a)} style={{ padding:'10px 12px', borderRadius:9, marginBottom:8, border:`1px solid ${col}20`, background:`${col}06`, cursor:'pointer', transition:'transform 0.1s' }} onMouseOver={e=>e.currentTarget.style.transform='translateY(-2px)'} onMouseOut={e=>e.currentTarget.style.transform='none'}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                    {a.priority === 'urgent' && <span style={{ width:8, height:8, borderRadius:'50%', background:'#ef4444', flexShrink:0 }}/>}
                    {a.priority === 'high' && <span style={{ width:8, height:8, borderRadius:'50%', background:'#f59e0b', flexShrink:0 }}/>}
                    <span style={{ fontWeight:800, fontSize:'.82rem', color:'var(--text)', flex:1 }}>{a.title}</span>
                    {a.priority !== 'normal' && (
                      <span style={{ padding:'1px 5px', borderRadius:999, background:`${col}20`, color:col, fontSize:'.6rem', fontWeight:700 }}>{a.priority.toUpperCase()}</span>
                    )}
                  </div>
                  <div style={{ fontSize:'.76rem', color:'var(--text-3)', lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{a.message}</div>
                  <div style={{ fontSize:'.7rem', color:'#531697', fontWeight:700, marginTop:4, display:'inline-block' }}>🔗 View →</div>
                  <div style={{ fontSize:'.65rem', color:'#b0bec9', marginTop:2 }}>
                    {a.createdBy?.name && `By ${a.createdBy.name} · `}{new Date(a.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign:'center', padding:'20px 0', color:'#b0bec9', fontSize:'.8rem' }}>
              <div style={{ fontSize:'1.5rem', marginBottom:6 }}>📭</div>
              No announcements from faculty
            </div>
          )}
        </div>

        {/* Upcoming Drives */}
        <div style={{ background:'var(--surface)', borderRadius:14, padding:'18px 20px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', border:'1px solid #f0f3fa' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', color:'var(--text)' }}>🗓️ Upcoming Drives</div>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={()=>nav('/dashboard/drives')} style={{ padding:'4px 10px', borderRadius:7, border:'1px solid rgba(83,22,151,.2)', background:'rgba(83,22,151,.05)', color:'#531697', fontWeight:700, fontSize:'.7rem', cursor:'pointer', fontFamily:"'Nunito',sans-serif" }}>All Drives →</button>
              <button onClick={()=>nav('/dashboard/companies')} style={{ padding:'4px 10px', borderRadius:7, border:'1px solid rgba(19,161,165,.2)', background:'rgba(19,161,165,.05)', color:'var(--text)', fontWeight:700, fontSize:'.7rem', cursor:'pointer', fontFamily:"'Nunito',sans-serif" }}>Companies →</button>
            </div>
          </div>
          {/* Show admin-created drives first, then fall back to company dates */}
          {drives.filter(d => new Date(d.driveDate) > new Date()).length > 0 ? (
            drives.filter(d => new Date(d.driveDate) > new Date())
              .sort((a,b) => new Date(a.driveDate)-new Date(b.driveDate)).slice(0,4).map(d => {
              const days = Math.ceil((new Date(d.driveDate)-new Date())/(1000*60*60*24));
              const urg = days<=7?'#ef4444':days<=30?'#f59e0b':'#47d372';
              return (
                <div key={d._id} onClick={()=>setActiveDrive(d)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:9, marginBottom:8, background:`${urg}06`, border:`1px solid ${urg}20`, cursor:'pointer', transition:'transform 0.1s' }} onMouseOver={e=>e.currentTarget.style.transform='translateY(-2px)'} onMouseOut={e=>e.currentTarget.style.transform='none'}>
                  <div style={{ width:36, height:36, borderRadius:8, background:'#f0f3fa', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.8rem', fontWeight:800, color:'#531697', flexShrink:0 }}>
                    {d.companyName?.charAt(0)||'?'}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, fontSize:'.82rem', color:'var(--text)' }}>{d.companyName}</div>
                    <div style={{ fontSize:'.68rem', color:'var(--text-3)' }}>
                      {d.role && `${d.role} · `}{new Date(d.driveDate).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.1rem', color:urg, lineHeight:1 }}>{days}</div>
                    <div style={{ fontSize:'.62rem', color:urg, fontWeight:600 }}>days</div>
                  </div>
                </div>
              );
            })
          ) : companies.filter(c=>c.campusVisitDate&&new Date(c.campusVisitDate)>new Date()).length > 0 ? (
            companies.filter(c=>c.campusVisitDate&&new Date(c.campusVisitDate)>new Date())
              .sort((a,b)=>new Date(a.campusVisitDate)-new Date(b.campusVisitDate)).slice(0,4).map(c => {
              const days = Math.ceil((new Date(c.campusVisitDate)-new Date())/(1000*60*60*24));
              const urg = days<=7?'#ef4444':days<=30?'#f59e0b':'#47d372';
              return (
                <div key={c.name} onClick={()=>setActiveDrive(c)} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:9, marginBottom:6, background:`${urg}06`, border:`1px solid ${urg}20`, cursor:'pointer', transition:'transform 0.1s' }} onMouseOver={e=>e.currentTarget.style.transform='translateY(-2px)'} onMouseOut={e=>e.currentTarget.style.transform='none'}>
                  {c.logoUrl && <img src={c.logoUrl} alt={c.name} style={{ width:28, height:28, objectFit:'contain', borderRadius:6, background:'var(--surface)', padding:2 }} onError={e=>e.target.style.display='none'}/>}
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:'.82rem', color:'var(--text)' }}>{c.name}</div>
                    <div style={{ fontSize:'.68rem', color:'var(--text-3)' }}>{new Date(c.campusVisitDate).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.2rem', color:urg, lineHeight:1 }}>{days}</div>
                    <div style={{ fontSize:'.62rem', color:urg, fontWeight:600 }}>days</div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign:'center', padding:'20px 0', color:'#b0bec9', fontSize:'.8rem' }}>
              <div style={{ fontSize:'1.5rem', marginBottom:6 }}>🏢</div>
              No upcoming drives scheduled
            </div>
          )}
        </div>
      </div>

      {/* Daily Opportunities Digest Modal Popup */}
      {showDailyDigest && (
        <DailyOpportunitiesDigestModal user={user} drives={drives} onClose={() => {
          setShowDailyDigest(false);
          localStorage.setItem('pragati_opp_popup_date', new Date().toDateString());
        }} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FACULTY DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function FacultyDash() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [stats, setStats]         = useState({ notesCount:0, pendingDoubts:0, companiesCount:0, recentNotes:[] });
  const [students, setStudents]   = useState([]);
  const [yearFilter, setYearFilter] = useState('');
  const [weakTopics, setWeakTopics] = useState(null);
  const [atRisk, setAtRisk]       = useState(null);
  const [deptIndex, setDeptIndex] = useState(null);
  const [compReadiness, setCompReadiness] = useState([]);
  const [pendingNotes, setPendingNotes] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [noteMsg, setNoteMsg]     = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentProfile, setStudentProfile]   = useState(null);
  const [profileLoading, setProfileLoading]   = useState(false);
  const [annForm, setAnnForm]     = useState({ title:'', message:'', link:'', priority:'normal', targetRole:'all', targetDept:'', targetYear:'' });
  const [annMsg, setAnnMsg]       = useState('');
  const [annLoading, setAnnLoading] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [lbSearch, setLbSearch]   = useState('');
  const [lbProfileStudent, setLbProfileStudent] = useState(null);
  const [lbProfileData, setLbProfileData] = useState(null);
  const [previewNote, setPreviewNote] = useState(null);

  useEffect(() => {
    Promise.all([
      apiFetch('/analytics/faculty'),
      apiFetch('/analytics/weak-topics'),
      apiFetch('/analytics/at-risk'),
      apiFetch('/analytics/dept-placement-index'),
      apiFetch('/analytics/company-readiness'),
      apiFetch('/notes/pending'),
      apiFetch('/analytics/leaderboard?limit=100'),
    ]).then(([fac, wt, ar, di, cr, pn, lb]) => {
      if (fac) setStats(fac);
      if (wt) setWeakTopics(wt);
      if (ar) setAtRisk(ar);
      if (di) setDeptIndex(di);
      if (cr?.results) setCompReadiness(cr.results);
      if (pn?.notes) setPendingNotes(pn.notes);
      if (lb?.leaderboard) setLeaderboard(lb.leaderboard);
    });
  }, []);

  useEffect(() => {
    setLoadingStudents(true);
    apiFetch(`/analytics/cohort${yearFilter?`?year=${yearFilter}`:''}`)
      .then(d=>setStudents(d?.students||[])).finally(()=>setLoadingStudents(false));
  }, [yearFilter]);

  async function viewProfile(student) {
    setSelectedStudent(student);
    setStudentProfile(null);
    setProfileLoading(true);
    try {
      const d = await apiFetch(`/analytics/student-profile/${student._id}`);
      if (d) setStudentProfile(d);
    } finally { setProfileLoading(false); }
  }

  async function postAnnouncement(e) {
    e.preventDefault();
    if (!annForm.title.trim() || !annForm.message.trim()) { setAnnMsg('❌ Title and message are required'); return; }
    setAnnLoading(true); setAnnMsg('');
    try {
      const target = {};
      if (annForm.targetRole && annForm.targetRole !== 'all') target.role = annForm.targetRole;
      if (annForm.targetDept) target.department = annForm.targetDept;
      if (annForm.targetYear) target.year = Number(annForm.targetYear);
      const res = await fetch(`${API}/announcements`, {
        method:'POST',
        headers:{ Authorization:`Bearer ${localStorage.getItem('pragati_token')}`, 'Content-Type':'application/json' },
        body: JSON.stringify({ title: annForm.title, message: annForm.message, link: annForm.link, priority: annForm.priority, targetFilter: target })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setAnnMsg('✅ Announcement posted!');
      setAnnForm({ title:'', message:'', link:'', priority:'normal', targetRole:'all', targetDept:'', targetYear:'' });
    } catch(err) { setAnnMsg(`❌ ${err.message}`); }
    finally { setAnnLoading(false); }
  }

  async function actNote(id, action) {
    const res = await fetch(`${API}/notes/${id}/${action}`, { method:'PATCH', headers:{ ...tk(), 'Content-Type':'application/json' } });
    if (res.ok) {
      setPendingNotes(ns => ns.filter(n => n._id !== id));
      setNoteMsg(`Note ${action}d successfully`);
      setTimeout(() => setNoteMsg(''), 3000);
    }
  }

  const TABS = [
    { id:'overview',  label:'📊 Overview' },
    { id:'readiness', label:'📈 Dept Placement Index' },
    { id:'readiness2',label:'🏢 Company Readiness' },
    { id:'notes',     label:`📋 Review Notes (${pendingNotes.length})` },
    { id:'leaderboard',label:'🏆 Leaderboard' },
    { id:'weak',      label:'🧠 Weak Topics' },
    { id:'risk',      label:`🚨 At Risk (${atRisk?.total||0})` },
    { id:'students',  label:'👥 Students' },
    { id:'announce',   label:'📢 Announcements' },
  ];

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif" }}>
      {showEditProfile && <EditProfileModal user={user} onClose={()=>setShowEditProfile(false)} onSaved={()=>{}} />}

      {/* Note Preview Modal */}
      {previewNote && (
        <div style={{ position:'fixed', inset:0, background:'rgba(4,44,93,0.55)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={()=>setPreviewNote(null)}>
          <div style={{ background:'var(--surface)', borderRadius:20, padding:'24px 28px', maxWidth:700, width:'100%', maxHeight:'88vh', overflowY:'auto', boxShadow:'0 20px 80px rgba(4,44,93,0.25)' }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1rem', color:'var(--text)' }}>📄 {previewNote.title}</div>
              <button onClick={()=>setPreviewNote(null)} style={{ width:32, height:32, borderRadius:'50%', border:'1px solid #e8edf5', background:'#f8f9fc', cursor:'pointer', fontWeight:800, color:'var(--text-3)', fontSize:'1rem' }}>×</button>
            </div>
            <div style={{ fontSize:'.78rem', color:'var(--text-3)', marginBottom:14 }}>{previewNote.subject} · {previewNote.department} · Year {previewNote.year} · by {previewNote.uploadedBy?.name}</div>
            {previewNote.fileUrl ? (
              previewNote.isDriveLink || previewNote.fileUrl?.includes('drive.google.com') || previewNote.fileUrl?.includes('docs.google.com') ? (
                <iframe src={previewNote.fileUrl.replace('/view','/preview')} title="Note Preview" style={{ width:'100%', height:400, border:'1px solid #e8edf5', borderRadius:10 }} />
              ) : previewNote.fileType?.includes('pdf') ? (
                <iframe src={previewNote.fileUrl} title="Note Preview" style={{ width:'100%', height:400, border:'1px solid #e8edf5', borderRadius:10 }} />
              ) : (
                <div style={{ padding:20, background:'#f8f9fc', borderRadius:10, textAlign:'center' }}>
                  <div style={{ fontSize:'2rem', marginBottom:8 }}>📁</div>
                  <div style={{ fontSize:'.83rem', color:'var(--text-3)' }}>Preview not available for this file type.</div>
                  <a href={previewNote.fileUrl} target="_blank" rel="noopener noreferrer" style={{ marginTop:10, display:'inline-block', padding:'7px 16px', borderRadius:8, background:'rgba(83,22,151,.08)', color:'#531697', fontWeight:700, fontSize:'.8rem', textDecoration:'none' }}>Open File →</a>
                </div>
              )
            ) : <div style={{ color:'#b0bec9', textAlign:'center', padding:20 }}>No file URL available</div>}
            <div style={{ display:'flex', gap:10, marginTop:16 }}>
              <button onClick={()=>{ actNote(previewNote._id,'approve'); setPreviewNote(null); }} style={{ flex:1, padding:'10px', borderRadius:9, border:'none', background:'#dcfce7', color:'#166534', fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.85rem' }}>✅ Approve Note</button>
              <button onClick={()=>{ actNote(previewNote._id,'reject'); setPreviewNote(null); }} style={{ flex:1, padding:'10px', borderRadius:9, border:'none', background:'#fee2e2', color:'#991b1b', fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.85rem' }}>❌ Reject Note</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.5rem', color:'var(--text)' }}>Hello, {user?.name} 🎓</h1>
          <p style={{ color:'var(--text-3)', marginTop:3 }}>Department: {user?.department} · Manage notes, monitor students</p>
        </div>
        <button onClick={()=>setShowEditProfile(true)} style={{ padding:'8px 16px', borderRadius:10, border:'1.5px solid rgba(83,22,151,.25)', background:'rgba(83,22,151,.06)', color:'#531697', fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.82rem' }}>✏️ Edit Profile</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
        <Stat icon="📚" label="Notes Uploaded" value={stats.notesCount} grad="linear-gradient(135deg,#042c5d,#531697)" onClick={()=>nav('/dashboard/notes')}/>
        <Stat icon="💬" label="Doubts Pending" value={stats.pendingDoubts} grad="linear-gradient(135deg,#531697,#13a1a5)" onClick={()=>nav('/dashboard/discussions')}/>
        <Stat icon="⏳" label="Notes to Review" value={pendingNotes.length} grad="linear-gradient(135deg,#f59e0b,#ef4444)" onClick={()=>setActiveTab('notes')}/>
        <Stat icon="🚨" label="At-Risk Students" value={atRisk?.total||0} grad="linear-gradient(135deg,#ef4444,#f59e0b)" onClick={()=>setActiveTab('risk')}/>
      </div>

      <div style={{ display:'flex', gap:5, marginBottom:14, borderBottom:'1px solid #e8edf5', flexWrap:'wrap' }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{ padding:'7px 12px', borderRadius:'8px 8px 0 0', border:'none', borderBottom:activeTab===t.id?'2px solid #531697':'2px solid transparent', background:activeTab===t.id?'rgba(83,22,151,.06)':'transparent', color:activeTab===t.id?'#531697':'var(--text-3)', fontWeight:700, cursor:'pointer', fontSize:'.78rem', fontFamily:"'Nunito',sans-serif", whiteSpace:'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      {noteMsg && <div style={{ marginBottom:12, padding:'10px 14px', background:'#dcfce7', borderRadius:8, color:'#166534', fontWeight:700, fontSize:'.83rem' }}>✅ {noteMsg}</div>}

      {/* Overview */}
      {activeTab==='overview' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div className="card" style={{ padding:'16px 18px' }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.88rem', marginBottom:12 }}>📋 Faculty Actions</div>
            {[
              { icon:'📤', label:'Upload Notes', sub:'File or Drive link', to:'/dashboard/notes', c:'#531697' },
              { icon:'💬', label:'Answer Doubts', sub:`${stats.pendingDoubts} unanswered`, to:'/dashboard/discussions', c:'#13a1a5' },
              { icon:'🏢', label:'View Companies', sub:'Placement info', to:'/dashboard/companies', c:'#042c5d' },
            ].map(a=>(
              <button key={a.to} onClick={()=>nav(a.to)} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:9, border:`1px solid ${a.c}25`, background:`${a.c}06`, cursor:'pointer', marginBottom:7, textAlign:'left' }}
                onMouseOver={e=>e.currentTarget.style.background=`${a.c}10`}
                onMouseOut={e=>e.currentTarget.style.background=`${a.c}06`}>
                <div style={{ width:32, height:32, borderRadius:8, background:`${a.c}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.95rem', flexShrink:0 }}>{a.icon}</div>
                <div><div style={{ fontWeight:700, fontSize:'.82rem', color:'var(--text)' }}>{a.label}</div><div style={{ fontSize:'.7rem', color:'var(--text-3)' }}>{a.sub}</div></div>
                <span style={{ marginLeft:'auto', color:a.c }}>→</span>
              </button>
            ))}
          </div>
          <div className="card" style={{ padding:'16px 18px' }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.88rem', marginBottom:10 }}>📝 Recent Uploads</div>
            {stats.recentNotes?.length>0 ? stats.recentNotes.map(n=>(
              <div key={n._id} style={{ padding:'7px 0', borderBottom:'1px solid #f0f3fa' }}>
                <div style={{ fontWeight:700, fontSize:'.8rem', color:'var(--text)' }}>{n.title}</div>
                <div style={{ fontSize:'.68rem', color:'#b0bec9', marginTop:1 }}>
                  {n.subject} · {new Date(n.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'})} · <span style={{ color:n.status==='approved'?'#166534':'#92400e', fontWeight:700 }}>{n.status}</span>
                </div>
              </div>
            )) : <div style={{ color:'#b0bec9', fontSize:'.8rem', padding:'10px 0' }}>No notes yet.</div>}
          </div>
        </div>
      )}

      {/* Dept Placement Index */}
      {activeTab==='readiness' && (
        <div className="card" style={{ padding:'20px 22px' }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', marginBottom:14 }}>📈 {user?.department} Department — Placement Readiness Index</div>
          {deptIndex ? (
            <>
              <div style={{ background:'linear-gradient(135deg,#042c5d,#531697)', borderRadius:12, padding:'16px 22px', marginBottom:16, color:'#fff' }}>
                <div style={{ color:'rgba(255,255,255,.6)', fontSize:'.72rem', marginBottom:4 }}>OVERALL READINESS INDEX</div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'2.5rem', lineHeight:1 }}>{deptIndex.readiness}%</div>
                <div style={{ fontSize:'.8rem', color:'rgba(255,255,255,.7)', marginTop:4 }}>
                  {deptIndex.readiness>=70?'✅ Good — most students on track':deptIndex.readiness>=50?'⚠️ Moderate — targeted intervention needed':'🔴 Needs immediate attention'}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginTop:14 }}>
                  {[['Students',deptIndex.total],['Avg ATS',`${deptIndex.avgAts}/100`],['Have Resume',`${Math.round((deptIndex.withResume/deptIndex.total)*100)}%`],['Active Streak',`${deptIndex.activeStreaks}`]].map(([l,v])=>(
                    <div key={l}><div style={{ color:'rgba(255,255,255,.5)', fontSize:'.62rem' }}>{l}</div><div style={{ color:'#fff', fontWeight:800 }}>{v}</div></div>
                  ))}
                </div>
              </div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.85rem', marginBottom:10 }}>Year-wise Breakdown</div>
              {deptIndex.yearBreakdown.map(y=>(
                <div key={y.year} style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.78rem', fontWeight:700, color:'var(--text-2)', marginBottom:3 }}>
                    <span>Year {y.year} — {y.count} students</span><span style={{ color:'#531697' }}>Avg ATS: {y.avgAts}/100</span>
                  </div>
                  <div style={{ height:7, background:'#f0f3fa', borderRadius:999 }}>
                    <div style={{ height:'100%', width:`${y.avgAts}%`, background:'linear-gradient(90deg,#531697,#13a1a5)', borderRadius:999 }}/>
                  </div>
                </div>
              ))}
            </>
          ) : <div style={{ color:'#b0bec9', textAlign:'center', padding:30 }}>Loading department data…</div>}
        </div>
      )}

      {/* Company Readiness for faculty */}
      {activeTab==='readiness2' && (
        <div className="card" style={{ padding:'20px 22px' }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', marginBottom:6 }}>🏢 Your Company Readiness Score</div>
          <div style={{ fontSize:'.75rem', color:'var(--text-3)', marginBottom:14 }}>Scores calculated from your skills, ATS score, and each company's JD requirements</div>
          {compReadiness.length>0 ? compReadiness.slice(0,8).map(c=>{
            const mc = c.matchScore>=75?'#47d372':c.matchScore>=50?'#f59e0b':'#ef4444';
            return (
              <div key={c.name} style={{ marginBottom:12, padding:'10px 12px', borderRadius:9, border:'1px solid #e8edf5', background:'#fafbff' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:5 }}>
                  <div style={{ width:80, fontWeight:700, fontSize:'.82rem', color:'var(--text)', flexShrink:0 }}>{c.name}</div>
                  <div style={{ flex:1, height:7, background:'#f0f3fa', borderRadius:999 }}>
                    <div style={{ height:'100%', width:`${c.matchScore}%`, background:`linear-gradient(90deg,${mc},#13a1a5)`, borderRadius:999, transition:'width .8s' }}/>
                  </div>
                  <div style={{ fontWeight:800, fontSize:'.85rem', color:mc, flexShrink:0 }}>{c.matchScore}%</div>
                </div>
                <div style={{ fontSize:'.68rem', color:'var(--text-3)' }}>
                  {c.breakdown.skillMatch} · {c.breakdown.atsContrib} · {c.breakdown.branchStatus}
                </div>
                {c.missingSkills.length>0 && <div style={{ fontSize:'.67rem', color:'#991b1b', marginTop:3 }}>Missing: {c.missingSkills.join(', ')}</div>}
              </div>
            );
          }) : <div style={{ color:'#b0bec9', textAlign:'center', padding:30 }}>No company data available</div>}
        </div>
      )}

      {/* Note review tab for faculty */}
      {activeTab==='notes' && (
        <div className="card" style={{ padding:'20px 22px' }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', marginBottom:14 }}>📋 Notes Awaiting Review</div>
          {pendingNotes.length===0 ? <div style={{ color:'var(--text-3)', fontSize:'.85rem' }}>✅ No notes pending review!</div> :
            pendingNotes.map(n=>(
              <div key={n._id} style={{ padding:'14px 16px', borderRadius:10, border:'1px solid #e8edf5', marginBottom:10, background:'#fafbff' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:'.87rem', color:'var(--text)' }}>{n.title}</div>
                    <div style={{ fontSize:'.73rem', color:'var(--text-3)', marginTop:2 }}>{n.subject} · {n.department} · Year {n.year} · by {n.uploadedBy?.name}</div>
                    {n.description && <div style={{ fontSize:'.75rem', color:'var(--text-2)', marginTop:4, lineHeight:1.5 }}>{n.description}</div>}
                  </div>
                  <span style={{ padding:'2px 8px', borderRadius:999, background:'rgba(245,158,11,.1)', color:'#92400e', fontSize:'.68rem', fontWeight:700, flexShrink:0 }}>Pending</span>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={()=>setPreviewNote(n)} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid rgba(83,22,151,.25)', background:'rgba(83,22,151,.06)', color:'#531697', fontWeight:700, cursor:'pointer', fontSize:'.78rem', fontFamily:"'Nunito',sans-serif" }}>👁️ Preview</button>
                  <button onClick={()=>actNote(n._id,'approve')} style={{ padding:'7px 14px', borderRadius:8, border:'none', background:'#dcfce7', color:'#166534', fontWeight:700, cursor:'pointer', fontSize:'.78rem', fontFamily:"'Nunito',sans-serif" }}>✅ Approve</button>
                  <button onClick={()=>actNote(n._id,'reject')}  style={{ padding:'7px 14px', borderRadius:8, border:'none', background:'#fee2e2', color:'#991b1b', fontWeight:700, cursor:'pointer', fontSize:'.78rem', fontFamily:"'Nunito',sans-serif" }}>❌ Reject</button>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* Leaderboard tab for faculty */}
      {activeTab==='leaderboard' && (() => {
        const lc2 = { Beginner:'#f59e0b', Intermediate:'#531697', Expert:'#47d372' };
        const medals = ['🥇','🥈','🥉'];
        const filtered = leaderboard.filter(s => s.name?.toLowerCase().includes(lbSearch.toLowerCase()) || s.rollNumber?.toLowerCase().includes(lbSearch.toLowerCase()));
        return (
          <div className="card" style={{ padding:'20px 22px' }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', marginBottom:14 }}>🏆 Student Leaderboard</div>
            {lbProfileStudent ? (
              <div>
                <button onClick={()=>{setLbProfileStudent(null);setLbProfileData(null);}} style={{ marginBottom:12, padding:'6px 14px', borderRadius:8, border:'1px solid #d0d7e8', background:'transparent', color:'var(--text-3)', fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.8rem' }}>← Back to Leaderboard</button>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1rem', color:'var(--text)', marginBottom:4 }}>{lbProfileStudent.name}</div>
                <div style={{ fontSize:'.78rem', color:'var(--text-3)', marginBottom:12 }}>{lbProfileStudent.department} · Year {lbProfileStudent.year} · {lbProfileStudent.rollNumber||'—'}</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:14 }}>
                  {[['ATS',lbProfileStudent.atsScore||0,'#531697'],['Streak',`${lbProfileStudent.streak||0}d`,'#f59e0b'],['Solved',lbProfileStudent.totalProblemsSolved||0,'#13a1a5'],['Level',lbProfileStudent.skillLevel||'—','#47d372']].map(([l,v,c])=>(
                    <div key={l} style={{ textAlign:'center', padding:'10px 6px', background:'#f8f9fc', borderRadius:10 }}>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', color:c }}>{v}</div>
                      <div style={{ fontSize:'.65rem', color:'#b0bec9', fontWeight:700 }}>{l}</div>
                    </div>
                  ))}
                </div>
                {!lbProfileData && <div style={{ textAlign:'center', padding:20, color:'#b0bec9' }}>Loading profile…</div>}
                {lbProfileData?.aptStats?.map(s => {
                  const pct = Math.round(s.accuracy||0);
                  const c = pct>=70?'#47d372':pct>=45?'#f59e0b':'#ef4444';
                  return <div key={s.topic} style={{ marginBottom:7 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.73rem', fontWeight:700, color:'var(--text-2)', marginBottom:2 }}><span>{s.topic}</span><span style={{ color:c }}>{pct}%</span></div>
                    <div style={{ height:5, background:'#f0f3fa', borderRadius:999 }}><div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${c},#13a1a5)`, borderRadius:999 }}/></div>
                  </div>;
                })}
                {/* Heatmap + Donut for student profile in faculty leaderboard */}
                {lbProfileData && (() => {
                  const sp = lbProfileStudent;
                  const myProb = sp?.totalProblemsSolved || 0;
                  const easy   = lbProfileData?.problemStats?.easy   ?? Math.floor(myProb*0.45);
                  const medium = lbProfileData?.problemStats?.medium ?? Math.floor(myProb*0.38);
                  const hard   = lbProfileData?.problemStats?.hard   ?? Math.max(0, myProb-Math.floor(myProb*0.45)-Math.floor(myProb*0.38));
                  const subs   = lbProfileData?.submissionDates || [];
                  return (
                    <div style={{ marginTop:14 }}>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.82rem', color:'var(--text)', marginBottom:10 }}>📊 Coding Activity</div>
                      <div style={{ marginBottom:12 }}>
                        <div style={{ fontSize:'.7rem', fontWeight:700, color:'var(--text-2)', marginBottom:8 }}>📅 Monthly Heatmap</div>
                        <CalendarHeatmap noCard={true} title="" subtitle="" submissions={subs} currentStreak={sp?.streak||0} maxStreak={sp?.maxStreak||sp?.streak||0} />
                      </div>
                      <div style={{ borderTop:'1px solid #f0f3fa', paddingTop:12 }}>
                        <div style={{ fontSize:'.7rem', fontWeight:700, color:'var(--text-2)', marginBottom:8 }}>💻 Problems Solved</div>
                        <DonutChart easy={easy} medium={medium} hard={hard} total={myProb}/>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <>
                <input value={lbSearch} onChange={e=>setLbSearch(e.target.value)} placeholder="🔍 Search student by name or roll…"
                  style={{ width:'100%', padding:'9px 14px', borderRadius:10, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.875rem', outline:'none', marginBottom:14, boxSizing:'border-box' }} />
                {filtered.map((s,i) => {
                  const globalIdx = leaderboard.indexOf(s);
                  return (
                    <div key={s._id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, marginBottom:6, background:'#fafbff', border:'1px solid #f0f3fa' }}>
                      <div style={{ width:28, textAlign:'center', fontSize:globalIdx<3?'1.1rem':'.82rem', fontWeight:800, color:'var(--text-3)', flexShrink:0 }}>{medals[globalIdx]||`#${globalIdx+1}`}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:'.85rem', color:'var(--text)' }}>{s.name}</div>
                        <div style={{ fontSize:'.68rem', color:'#b0bec9' }}>{s.department} · Y{s.year} · <span style={{ color:lc2[s.skillLevel]||'#531697' }}>{s.skillLevel}</span> · 🔥{s.streak}d</div>
                      </div>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.9rem', background:'linear-gradient(135deg,#531697,#13a1a5)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', flexShrink:0, marginRight:8 }}>{s.totalScore}</div>
                      <button onClick={async()=>{ setLbProfileStudent(s); const d=await apiFetch(`/analytics/student-profile/${s._id}`); setLbProfileData(d); }}
                        style={{ padding:'4px 10px', borderRadius:7, border:'1px solid rgba(83,22,151,.2)', background:'rgba(83,22,151,.06)', color:'#531697', fontWeight:700, cursor:'pointer', fontSize:'.7rem', fontFamily:"'Nunito',sans-serif" }}>View Profile</button>
                    </div>
                  );
                })}
                {filtered.length===0 && <div style={{ textAlign:'center', padding:24, color:'#b0bec9' }}>No matching students</div>}
              </>
            )}
          </div>
        );
      })()}

      {/* Weak topics */}
      {activeTab==='weak' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div className="card" style={{ padding:'16px 18px' }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.88rem', marginBottom:10 }}>🔍 Skill Gaps Across Batch</div>
            <div style={{ fontSize:'.72rem', color:'var(--text-3)', marginBottom:10 }}>{weakTopics?.studentsAnalyzed||0} of {weakTopics?.totalStudents||0} students analysed</div>
            {(weakTopics?.weakTopics||[]).map(t=>(
              <div key={t.skill} style={{ marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.75rem', fontWeight:700, color:'var(--text-2)', marginBottom:3 }}>
                  <span style={{ textTransform:'capitalize' }}>{t.skill}</span>
                  <span style={{ color:t.pct>=60?'#ef4444':t.pct>=40?'#f59e0b':'#531697' }}>{t.pct}% have gap</span>
                </div>
                <div style={{ height:6, background:'#f0f3fa', borderRadius:999 }}>
                  <div style={{ height:'100%', width:`${t.pct}%`, background:t.pct>=60?'#ef4444':t.pct>=40?'#f59e0b':'#531697', borderRadius:999 }}/>
                </div>
              </div>
            ))}
            {(!weakTopics?.weakTopics?.length) && <div style={{ color:'#b0bec9', fontSize:'.82rem' }}>Run SkillPath analyses to see batch gaps</div>}
          </div>
          <div className="card" style={{ padding:'16px 18px' }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.88rem', marginBottom:10 }}>💻 Problem-Solving Weak Areas</div>
            {(weakTopics?.problemWeakAreas||[]).map(t=>(
              <div key={t.topic} style={{ padding:'8px 10px', borderRadius:8, border:'1px solid #e8edf5', marginBottom:7, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontWeight:700, fontSize:'.8rem', color:'var(--text)' }}>{t.topic||'—'}</span>
                <span style={{ fontSize:'.72rem', color:'var(--text-3)' }}>{t.solved}/{t.total} solved</span>
              </div>
            ))}
            {(!weakTopics?.problemWeakAreas?.length)&&<div style={{ color:'#b0bec9', fontSize:'.82rem' }}>No problem data yet</div>}
          </div>
        </div>
      )}

      {/* At risk */}
      {activeTab==='risk' && atRisk && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
            {[['🔴','High Risk',atRisk.summary?.high,'#ef4444'],['🟡','Medium Risk',atRisk.summary?.medium,'#f59e0b'],['🟢','Low Risk',atRisk.summary?.low,'#47d372']].map(([ic,l,v,c])=>(
              <div key={l} className="card" style={{ padding:'14px 16px', borderLeft:`3px solid ${c}` }}>
                <div>{ic}</div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.5rem', color:c, lineHeight:1 }}>{v||0}</div>
                <div style={{ fontSize:'.75rem', color:'var(--text-3)', marginTop:3 }}>{l}</div>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding:'16px 20px' }}>
            {atRisk.atRisk?.map(s=>(
              <div key={s._id} style={{ padding:'10px 12px', borderRadius:9, border:'1px solid #e8edf5', marginBottom:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontWeight:700, fontSize:'.85rem', color:'var(--text)' }}>{s.name}</span>
                  <span style={{ padding:'1px 7px', borderRadius:999, background:s.riskLevel==='high'?'#fee2e2':'rgba(245,158,11,.1)', color:s.riskLevel==='high'?'#991b1b':'#92400e', fontSize:'.65rem', fontWeight:700 }}>{s.riskLevel}</span>
                </div>
                <div style={{ fontSize:'.72rem', color:'var(--text-3)', marginTop:2 }}>{s.rollNumber} · Year {s.year}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:5 }}>
                  {s.risks?.map(r=><span key={r} style={{ padding:'2px 7px', borderRadius:999, background:'rgba(239,68,68,.06)', color:'#991b1b', fontSize:'.67rem', fontWeight:600, border:'1px solid rgba(239,68,68,.15)' }}>⚠ {r}</span>)}
                </div>
              </div>
            ))}
            {!atRisk.atRisk?.length && <div style={{ textAlign:'center', padding:'24px 0', color:'#47d372', fontWeight:700 }}>✅ No at-risk students!</div>}
          </div>
        </>
      )}

      {/* Students table */}
      {activeTab==='students' && (
        <div className="card" style={{ padding:'16px 20px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.88rem', color:'var(--text)' }}>👥 Student Records</div>
            <div style={{ display:'flex', gap:5 }}>
              {['','1','2','3','4'].map(y=>(
                <button key={y} onClick={()=>setYearFilter(y)} style={{ padding:'4px 10px', borderRadius:999, border:`1px solid ${yearFilter===y?'#531697':'#d0d7e8'}`, background:yearFilter===y?'rgba(83,22,151,.08)':'transparent', color:yearFilter===y?'#531697':'var(--text-3)', fontWeight:700, cursor:'pointer', fontSize:'.72rem', fontFamily:"'Nunito',sans-serif" }}>
                  {y===''?'All':`Y${y}`}
                </button>
              ))}
            </div>
          </div>
          {loadingStudents ? <div style={{ textAlign:'center', padding:20, color:'#b0bec9' }}>Loading…</div> : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.77rem' }}>
                <thead><tr style={{ borderBottom:'2px solid #e8edf5' }}>
                  {['Name','Roll','Year','Dept','Level','Streak','ATS',''].map(h=><th key={h} style={{ padding:'6px 8px', textAlign:'left', color:'var(--text-2)', fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:'.69rem' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {students.map(s=>{
                    const lc2={Beginner:'#f59e0b',Intermediate:'#531697',Expert:'#47d372'};
                    return (
                      <tr key={s._id} style={{ borderBottom:'1px solid #f0f3fa' }}>
                        <td style={{ padding:'7px 8px', fontWeight:700, color:'var(--text)' }}>{s.name}</td>
                        <td style={{ padding:'7px 8px', color:'var(--text-3)' }}>{s.rollNumber||'—'}</td>
                        <td style={{ padding:'7px 8px', color:'var(--text-3)' }}>Y{s.year||'—'}</td>
                        <td style={{ padding:'7px 8px', color:'var(--text-3)' }}>{s.department}</td>
                        <td style={{ padding:'7px 8px' }}><span style={{ padding:'1px 6px', borderRadius:999, background:`${lc2[s.skillLevel]||'#531697'}15`, color:lc2[s.skillLevel]||'#531697', fontWeight:700, fontSize:'.67rem' }}>{s.skillLevel||'Beginner'}</span></td>
                        <td style={{ padding:'7px 8px', color:'var(--text-2)' }}>🔥{s.streak||0}</td>
                        <td style={{ padding:'7px 8px', fontWeight:800, color:'#531697' }}>{s.atsScore||'—'}</td>
                        <td style={{ padding:'7px 8px' }}>
                          <button onClick={()=>viewProfile(s)} style={{ padding:'3px 10px', borderRadius:7, border:'1px solid #531697', background:'rgba(83,22,151,0.06)', color:'#531697', fontWeight:700, cursor:'pointer', fontSize:'.68rem', fontFamily:"'Nunito',sans-serif", whiteSpace:'nowrap' }}>View Profile</button>
                        </td>
                      </tr>
                    );
                  })}
                  {!students.length&&<tr><td colSpan={7} style={{ padding:14, textAlign:'center', color:'#b0bec9' }}>No students found</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Announcements tab */}
      {activeTab==='announce' && (
        <div className="card" style={{ padding:'20px 22px' }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', marginBottom:16 }}>📢 Create Announcement</div>
          <form onSubmit={postAnnouncement}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={{ display:'block', fontSize:'.73rem', fontWeight:700, color:'var(--text-2)', marginBottom:4, fontFamily:"'Syne',sans-serif" }}>Title *</label>
                <input value={annForm.title} onChange={e=>setAnnForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Placement Drive on 15th Jan"
                  style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.875rem', outline:'none', background:'#fafbff', boxSizing:'border-box' }} />
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={{ display:'block', fontSize:'.73rem', fontWeight:700, color:'var(--text-2)', marginBottom:4, fontFamily:"'Syne',sans-serif" }}>Message *</label>
                <textarea value={annForm.message} onChange={e=>setAnnForm(f=>({...f,message:e.target.value}))} rows={3} placeholder="Announcement details…"
                  style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.875rem', outline:'none', background:'#fafbff', resize:'vertical', boxSizing:'border-box' }} />
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={{ display:'block', fontSize:'.73rem', fontWeight:700, color:'var(--text-2)', marginBottom:4, fontFamily:"'Syne',sans-serif" }}>Link (optional)</label>
                <input value={annForm.link} onChange={e=>setAnnForm(f=>({...f,link:e.target.value}))} placeholder="https://…"
                  style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.875rem', outline:'none', background:'#fafbff', boxSizing:'border-box' }} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:'.73rem', fontWeight:700, color:'var(--text-2)', marginBottom:4, fontFamily:"'Syne',sans-serif" }}>Priority</label>
                <select value={annForm.priority} onChange={e=>setAnnForm(f=>({...f,priority:e.target.value}))}
                  style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.875rem', outline:'none', background:'#fafbff' }}>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label style={{ display:'block', fontSize:'.73rem', fontWeight:700, color:'var(--text-2)', marginBottom:4, fontFamily:"'Syne',sans-serif" }}>Target</label>
                <select value={annForm.targetRole} onChange={e=>setAnnForm(f=>({...f,targetRole:e.target.value}))}
                  style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.875rem', outline:'none', background:'#fafbff' }}>
                  <option value="all">All Students</option>
                  <option value="student">Students Only</option>
                  <option value="faculty">Faculty Only</option>
                </select>
              </div>
              <div>
                <label style={{ display:'block', fontSize:'.73rem', fontWeight:700, color:'var(--text-2)', marginBottom:4, fontFamily:"'Syne',sans-serif" }}>Department (optional)</label>
                <select value={annForm.targetDept} onChange={e=>setAnnForm(f=>({...f,targetDept:e.target.value}))}
                  style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.875rem', outline:'none', background:'#fafbff' }}>
                  <option value="">All Departments</option>
                  {['CSE','CSAIML','IT','ECE','Mechanical','Civil','Other'].map(d=><option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:'block', fontSize:'.73rem', fontWeight:700, color:'var(--text-2)', marginBottom:4, fontFamily:"'Syne',sans-serif" }}>Year (optional)</label>
                <select value={annForm.targetYear} onChange={e=>setAnnForm(f=>({...f,targetYear:e.target.value}))}
                  style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.875rem', outline:'none', background:'#fafbff' }}>
                  <option value="">All Years</option>
                  {[1,2,3,4].map(y=><option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
            </div>
            {annMsg && <div style={{ marginBottom:12, padding:'9px 14px', borderRadius:8, fontSize:'.83rem', fontWeight:600, background:annMsg.startsWith('✅')?'#dcfce7':'#fee2e2', color:annMsg.startsWith('✅')?'#166534':'#991b1b' }}>{annMsg}</div>}
            <button type="submit" disabled={annLoading}
              style={{ padding:'11px 24px', borderRadius:10, border:'none', background:annLoading?'#d0d7e8':'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontWeight:800, cursor:annLoading?'not-allowed':'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.88rem' }}>
              {annLoading ? 'Posting…' : '📢 Post Announcement'}
            </button>
          </form>
        </div>
      )}

      {/* Student Profile Modal */}
      {selectedStudent && (
        <div style={{ position:'fixed', inset:0, background:'rgba(4,44,93,0.5)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={()=>{setSelectedStudent(null);setStudentProfile(null);}}>
          <div style={{ background:'var(--surface)', borderRadius:20, padding:'24px 28px', maxWidth:620, width:'100%', maxHeight:'85vh', overflowY:'auto', boxShadow:'0 20px 80px rgba(4,44,93,0.25)' }} onClick={e=>e.stopPropagation()}>
            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
              <div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.15rem', color:'var(--text)' }}>{selectedStudent.name}</div>
                <div style={{ fontSize:'.78rem', color:'var(--text-3)', marginTop:2 }}>{selectedStudent.department} · Year {selectedStudent.year} · {selectedStudent.rollNumber||'No roll no.'}</div>
              </div>
              <button onClick={()=>{setSelectedStudent(null);setStudentProfile(null);}} style={{ width:32, height:32, borderRadius:'50%', border:'1px solid #e8edf5', background:'#f8f9fc', cursor:'pointer', fontWeight:800, color:'var(--text-3)', fontSize:'1rem' }}>×</button>
            </div>

            {/* Quick stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
              {[['ATS',selectedStudent.atsScore||0,'#531697'],['Streak',`${selectedStudent.streak||0}d`,'#f59e0b'],['Solved',selectedStudent.totalProblemsSolved||0,'#13a1a5'],['Level',selectedStudent.skillLevel||'—','#47d372']].map(([l,v,c])=>(
                <div key={l} style={{ textAlign:'center', padding:'10px 6px', background:'#f8f9fc', borderRadius:10 }}>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', color:c }}>{v}</div>
                  <div style={{ fontSize:'.65rem', color:'#b0bec9', fontWeight:700 }}>{l}</div>
                </div>
              ))}
            </div>

            {profileLoading && <div style={{ textAlign:'center', padding:30, color:'#b0bec9' }}>Loading profile data…</div>}

            {studentProfile && !profileLoading && (
              <>
                {/* Aptitude chart */}
                {studentProfile.aptStats?.length > 0 && (
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.82rem', color:'var(--text)', marginBottom:8 }}>🎯 Aptitude Performance (by topic)</div>
                    <div style={{ fontSize:'.72rem', color:'var(--text-3)', marginBottom:8 }}>
                      {studentProfile.summary.correctApt}/{studentProfile.summary.totalApt} correct · {studentProfile.summary.accuracy}% accuracy
                    </div>
                    {studentProfile.aptStats.map(s=>{
                      const pct = Math.round(s.accuracy||0);
                      const c = pct>=70?'#47d372':pct>=45?'#f59e0b':'#ef4444';
                      return (
                        <div key={s.topic} style={{ marginBottom:7 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.72rem', fontWeight:700, color:'var(--text-2)', marginBottom:2 }}>
                            <span>{s.topic}</span>
                            <span style={{ color:c }}>{pct}% ({s.correct}/{s.total})</span>
                          </div>
                          <div style={{ height:6, background:'#f0f3fa', borderRadius:999 }}>
                            <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${c},#13a1a5)`, borderRadius:999, transition:'width 0.8s' }}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Coding chart */}
                {studentProfile.codingStats?.filter(s=>s.topic).length > 0 && (
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.82rem', color:'var(--text)', marginBottom:8 }}>💻 Coding Performance (by topic)</div>
                    {studentProfile.codingStats.filter(s=>s.topic).map(s=>{
                      const pct = s.total > 0 ? Math.round((s.solved/s.total)*100) : 0;
                      return (
                        <div key={s.topic} style={{ marginBottom:7 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.72rem', fontWeight:700, color:'var(--text-2)', marginBottom:2 }}>
                            <span>{s.topic}</span>
                            <span style={{ color:'#531697' }}>{s.solved}/{s.total} solved</span>
                          </div>
                          <div style={{ height:6, background:'#f0f3fa', borderRadius:999 }}>
                            <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#531697,#13a1a5)', borderRadius:999, transition:'width 0.8s' }}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Recent activity */}
                {studentProfile.recentActivity?.length > 0 && (
                  <div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.82rem', color:'var(--text)', marginBottom:8 }}>🕐 Recent Aptitude Activity</div>
                    {studentProfile.recentActivity.slice(0,5).map((a,i)=>(
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:'1px solid #f0f3fa' }}>
                        <span>{a.correct?'✅':'❌'}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:'.78rem', fontWeight:600, color:'var(--text)' }}>{a.questionId?.question?.slice(0,60)||'Question'}…</div>
                          <div style={{ fontSize:'.67rem', color:'#b0bec9' }}>{a.questionId?.topic} · {a.questionId?.difficulty} · {new Date(a.attemptedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!studentProfile.aptStats?.length && !studentProfile.codingStats?.length && (
                  <div style={{ textAlign:'center', padding:20, color:'#b0bec9', fontSize:'.82rem' }}>No activity data yet for this student.</div>
                )}
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function AdminDash() {
  const nav = useNavigate();
  const [cohort, setCohort]     = useState(null);
  const [pending, setPending]   = useState([]);
  const [placement, setPlacement] = useState(null);
  const [demand, setDemand]     = useState(null);
  const [yearFilter, setYearFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const qs = [yearFilter&&`year=${yearFilter}`, deptFilter&&`department=${deptFilter}`].filter(Boolean).join('&');
    Promise.all([
      apiFetch(`/analytics/cohort${qs?'?'+qs:''}`),
      apiFetch('/notes/pending'),
      apiFetch('/analytics/placement-index'),
      apiFetch('/analytics/company-demand'),
    ]).then(([c,n,pi,cd])=>{
      if(c) setCohort(c);
      if(n?.notes) setPending(n.notes);
      if(pi) setPlacement(pi);
      if(cd) setDemand(cd);
    }).finally(()=>setLoading(false));
  }, [yearFilter, deptFilter]);

  const lc = { Beginner:'#f59e0b', Intermediate:'#531697', Expert:'#47d372' };
  const DEPTS = ['','CSE','CSAIML','IT','ECE','Mechanical','Civil'];
  const TABS=[{id:'overview',label:'📊 Overview'},{id:'readiness',label:'📈 Placement Index'},{id:'demand',label:'🏢 Demand Analyzer'},{id:'cohort',label:'👥 Cohort'}];

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif" }}>
      <div style={{ marginBottom:18 }}>
        <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.5rem', color:'var(--text)' }}>⚙️ Admin Overview</h1>
        <p style={{ color:'var(--text-3)', marginTop:3 }}>Full system visibility — students, faculty, and placement readiness.</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
        <Stat icon="🎓" label="Total Students" value={loading?'…':cohort?.total} grad="linear-gradient(135deg,#042c5d,#531697)"/>
        <Stat icon="👨‍🏫" label="Total Faculty" value={loading?'…':cohort?.totalFaculty} grad="linear-gradient(135deg,#531697,#13a1a5)"/>
        <Stat icon="📈" label="Placement Index" value={loading?'…':(placement?.readinessScore?`${placement.readinessScore}%`:'—')} sub="Overall readiness" grad="linear-gradient(135deg,#13a1a5,#47d372)"/>
        <Stat icon="⏳" label="Pending Notes" value={pending.length} sub="Need approval" grad="linear-gradient(135deg,#f59e0b,#ef4444)" onClick={()=>nav('/dashboard/admin')}/>
      </div>

      <div style={{ display:'flex', gap:5, marginBottom:14, borderBottom:'1px solid #e8edf5' }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{ padding:'8px 14px', borderRadius:'9px 9px 0 0', border:'none', borderBottom:activeTab===t.id?'2px solid #531697':'2px solid transparent', background:activeTab===t.id?'rgba(83,22,151,.06)':'transparent', color:activeTab===t.id?'#531697':'var(--text-3)', fontWeight:700, cursor:'pointer', fontSize:'.82rem', fontFamily:"'Nunito',sans-serif" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab==='overview' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div className="card" style={{ padding:'16px 18px' }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.88rem', marginBottom:12 }}>🛠️ Admin Actions</div>
            {[{icon:'✅',label:'Approve Notes',sub:`${pending.length} pending`,to:'/dashboard/admin',c:'#47d372'},{icon:'🏢',label:'Add Company',sub:'Profile + prep guide',to:'/dashboard/admin',c:'#531697'},{icon:'🎯',label:'Bulk Aptitude',sub:'JSON batch upload',to:'/dashboard/admin',c:'#13a1a5'},{icon:'👥',label:'Manage Users',sub:'All accounts',to:'/dashboard/admin',c:'#042c5d'}].map(a=>(
              <button key={a.label} onClick={()=>nav(a.to)} style={{ width:'100%', display:'flex', alignItems:'center', gap:9, padding:'9px 11px', borderRadius:9, border:`1px solid ${a.c}25`, background:`${a.c}06`, cursor:'pointer', marginBottom:7, textAlign:'left' }}
                onMouseOver={e=>e.currentTarget.style.background=`${a.c}12`} onMouseOut={e=>e.currentTarget.style.background=`${a.c}06`}>
                <div style={{ width:30, height:30, borderRadius:7, background:`${a.c}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.9rem', flexShrink:0 }}>{a.icon}</div>
                <div><div style={{ fontWeight:700, fontSize:'.82rem', color:'var(--text)' }}>{a.label}</div><div style={{ fontSize:'.68rem', color:'var(--text-3)' }}>{a.sub}</div></div>
                <span style={{ marginLeft:'auto', color:a.c, fontSize:'.8rem' }}>→</span>
              </button>
            ))}
          </div>
          <div className="card" style={{ padding:'16px 18px' }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.88rem', marginBottom:12 }}>📊 Skill Distribution</div>
            {cohort?.byLevel ? Object.entries(cohort.byLevel).map(([level,count])=>{
              const pct=cohort.total?Math.round((count/cohort.total)*100):0;
              return (
                <div key={level} style={{ marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                    <span style={{ fontWeight:700, fontSize:'.8rem', color:'var(--text-2)' }}>{level}</span>
                    <span style={{ fontSize:'.72rem', color:'#b0bec9' }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ height:7, background:'#f0f3fa', borderRadius:999 }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:lc[level]||'#531697', borderRadius:999, transition:'width .8s' }}/>
                  </div>
                </div>
              );
            }) : <div style={{ color:'#b0bec9' }}>Loading…</div>}
          </div>
        </div>
      )}

      {/* Placement Index */}
      {activeTab==='readiness' && placement && (
        <>
          <div className="card" style={{ padding:'20px 24px', marginBottom:14, background:'linear-gradient(135deg,#042c5d,#531697)', border:'none' }}>
            <div style={{ color:'rgba(255,255,255,.65)', fontSize:'.72rem', fontWeight:700, marginBottom:6 }}>OVERALL PLACEMENT READINESS INDEX</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:10 }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'3rem', color:'#fff', lineHeight:1 }}>{placement.readinessScore}%</div>
              <div style={{ color:'rgba(255,255,255,.65)', fontSize:'.85rem' }}>
                {placement.readinessScore>=70?'✅ Strong — well on track':placement.readinessScore>=50?'⚠️ Moderate — improvement needed':'🔴 Needs urgent action'}
              </div>
            </div>
            <div style={{ marginTop:6, fontSize:'.75rem', color:'rgba(255,255,255,.55)' }}>
              Formula: ATS Score (40%) + Resume Uploaded % (30%) + Skill Level (30%)
            </div>
            <div style={{ display:'flex', gap:20, marginTop:14 }}>
              {[['Avg ATS',`${placement.overall?.avgAts||0}/100`],['With Resume',`${Math.round(((placement.overall?.withResume||0)/Math.max(placement.overall?.total||1,1))*100)}%`],['Experts',`${placement.overall?.expert||0}`],['Active',`${placement.overall?.activeStreaks||0} students`]].map(([l,v])=>(
                <div key={l}><div style={{ color:'rgba(255,255,255,.5)', fontSize:'.62rem' }}>{l}</div><div style={{ color:'#fff', fontWeight:800, fontSize:'.9rem' }}>{v}</div></div>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding:'16px 18px' }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.88rem', marginBottom:12 }}>🏆 Department Leaderboard</div>
            {(placement.deptLeaderboard||[]).map((d,i)=>(
              <div key={d.dept} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'1px solid #f0f3fa' }}>
                <div style={{ width:26, height:26, borderRadius:'50%', background:i===0?'linear-gradient(135deg,#f59e0b,#ef4444)':i===1?'linear-gradient(135deg,#9ca3af,#6b7280)':i===2?'linear-gradient(135deg,#92400e,#b45309)':'#f0f3fa', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.72rem', color:i<=2?'#fff':'var(--text-3)', flexShrink:0 }}>{i+1}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:'.82rem', color:'var(--text)' }}>{d.dept}</div>
                  <div style={{ fontSize:'.68rem', color:'#b0bec9' }}>{d.count} students · avg ATS {d.avgAts}</div>
                </div>
                <div style={{ fontWeight:800, fontSize:'.9rem', color:d.readiness>=70?'#47d372':d.readiness>=50?'#f59e0b':'#ef4444' }}>{d.readiness}%</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Company Demand */}
      {activeTab==='demand' && demand && (
        <div className="card" style={{ padding:'18px 22px' }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', marginBottom:6 }}>📊 Industry Demand vs Student Supply</div>
          <div style={{ fontSize:'.73rem', color:'var(--text-3)', marginBottom:14 }}>Based on {demand.totalCompanies} companies · {demand.totalStudents} students · Gap = demand − supply</div>
          {(demand.demandGap||[]).map(d=>(
            <div key={d.skill} style={{ padding:'10px 0', borderBottom:'1px solid #f0f3fa' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ fontWeight:700, fontSize:'.82rem', color:'var(--text)', textTransform:'capitalize' }}>{d.skill}</span>
                <span style={{ fontSize:'.72rem', fontWeight:700, color:d.gap>30?'#ef4444':d.gap>10?'#f59e0b':'#47d372' }}>Gap: {d.gap>0?'+':''}+{d.gap}%</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                <div><div style={{ fontSize:'.65rem', color:'var(--text-3)', marginBottom:2 }}>Companies demand {d.demand}%</div><div style={{ height:5, background:'#f0f3fa', borderRadius:999 }}><div style={{ height:'100%', width:`${d.demand}%`, background:'#531697', borderRadius:999 }}/></div></div>
                <div><div style={{ fontSize:'.65rem', color:'var(--text-3)', marginBottom:2 }}>Students have {d.supply}%</div><div style={{ height:5, background:'#f0f3fa', borderRadius:999 }}><div style={{ height:'100%', width:`${d.supply}%`, background:'#47d372', borderRadius:999 }}/></div></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cohort */}
      {activeTab==='cohort' && (
        <div className="card" style={{ padding:'16px 20px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:8 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.88rem', color:'var(--text)' }}>👥 Full Cohort</div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {DEPTS.map(d=>(
                <button key={d} onClick={()=>setDeptFilter(d)} style={{ padding:'4px 10px', borderRadius:999, border:`1px solid ${deptFilter===d?'#531697':'#d0d7e8'}`, background:deptFilter===d?'rgba(83,22,151,.08)':'transparent', color:deptFilter===d?'#531697':'var(--text-3)', fontWeight:700, cursor:'pointer', fontSize:'.7rem', fontFamily:"'Nunito',sans-serif" }}>
                  {d||'All Depts'}
                </button>
              ))}
              {['','1','2','3','4'].map(y=>(
                <button key={y} onClick={()=>setYearFilter(y)} style={{ padding:'4px 10px', borderRadius:999, border:`1px solid ${yearFilter===y?'#531697':'#d0d7e8'}`, background:yearFilter===y?'rgba(83,22,151,.08)':'transparent', color:yearFilter===y?'#531697':'var(--text-3)', fontWeight:700, cursor:'pointer', fontSize:'.7rem', fontFamily:"'Nunito',sans-serif" }}>
                  {y?`Y${y}`:'All Yrs'}
                </button>
              ))}
            </div>
          </div>

          {/* Students */}
          <div style={{ fontSize:'.72rem', fontWeight:800, color:'#531697', marginBottom:7, letterSpacing:'.05em' }}>🎓 STUDENTS ({cohort?.total||0})</div>
          <div style={{ overflowX:'auto', marginBottom:18 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.77rem' }}>
              <thead><tr style={{ borderBottom:'2px solid #e8edf5' }}>
                {['Name','Roll','Year','Dept','Level','Streak','ATS'].map(h=><th key={h} style={{ padding:'6px 8px', textAlign:'left', color:'var(--text-2)', fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:'.69rem' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {(cohort?.students||[]).map(s=>(
                  <tr key={s._id} style={{ borderBottom:'1px solid #f0f3fa' }}>
                    <td style={{ padding:'7px 8px', fontWeight:700, color:'var(--text)' }}>{s.name}</td>
                    <td style={{ padding:'7px 8px', color:'var(--text-3)' }}>{s.rollNumber||'—'}</td>
                    <td style={{ padding:'7px 8px', color:'var(--text-3)' }}>Y{s.year||'—'}</td>
                    <td style={{ padding:'7px 8px', color:'var(--text-3)' }}>{s.department}</td>
                    <td style={{ padding:'7px 8px' }}><span style={{ padding:'1px 6px', borderRadius:999, background:`${lc[s.skillLevel]||'#531697'}15`, color:lc[s.skillLevel]||'#531697', fontWeight:700, fontSize:'.67rem' }}>{s.skillLevel||'Beginner'}</span></td>
                    <td style={{ padding:'7px 8px', color:'var(--text-2)' }}>🔥{s.streak||0}</td>
                    <td style={{ padding:'7px 8px', fontWeight:800, color:'#531697' }}>{s.atsScore||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Faculty */}
          {cohort?.faculty?.length>0 && (
            <>
              <div style={{ fontSize:'.72rem', fontWeight:800, color:'#042c5d', marginBottom:7, letterSpacing:'.05em' }}>👨‍🏫 FACULTY ({cohort.totalFaculty||0})</div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.77rem' }}>
                  <thead><tr style={{ borderBottom:'2px solid #e8edf5' }}>
                    {['Name','Department','Joined'].map(h=><th key={h} style={{ padding:'6px 8px', textAlign:'left', color:'var(--text-2)', fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:'.69rem' }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {cohort.faculty.map(f=>(
                      <tr key={f._id} style={{ borderBottom:'1px solid #f0f3fa' }}>
                        <td style={{ padding:'7px 8px', fontWeight:700, color:'#042c5d' }}>{f.name}</td>
                        <td style={{ padding:'7px 8px', color:'var(--text-3)' }}>{f.department}</td>
                        <td style={{ padding:'7px 8px', color:'#b0bec9', fontSize:'.7rem' }}>{f.createdAt?new Date(f.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function DashboardHome() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role==='admin')   return <AdminDash/>;
  if (user.role==='faculty') return <FacultyDash/>;
  return <StudentDash/>;
}
