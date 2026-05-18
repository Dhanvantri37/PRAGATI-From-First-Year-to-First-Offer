import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tk  = () => ({ Authorization: `Bearer ${localStorage.getItem('pragati_token')}` });
const apiFetch = p => fetch(`${API}${p}`, { headers: tk() }).then(r => r.json()).catch(() => null);

const GRAD = 'linear-gradient(135deg,#531697,#13a1a5)';
const SKILL_COLOR = { Beginner:'#f59e0b', Intermediate:'#531697', Expert:'#47d372' };

/* ── Donut Chart ── */
function DonutChart({ easy=0, medium=0, hard=0, total=3920 }) {
  const solved = easy + medium + hard;
  const R = 42, stroke = 8, norm = 2*Math.PI*R;
  const st = total || 1;
  const segs = [
    { pct:(easy/st)*norm,   color:'#47d372', label:'Easy',   val:easy },
    { pct:(medium/st)*norm, color:'#f59e0b', label:'Medium', val:medium },
    { pct:(hard/st)*norm,   color:'#ef4444', label:'Hard',   val:hard },
  ];
  let offset = norm*0.25;
  const paths = segs.map(s => {
    const len = Math.max(0, s.pct - 2);
    const d = { ...s, dasharray:`${len} ${norm-len}`, offset };
    offset = (offset - s.pct + norm*10) % (norm*10);
    return d;
  });
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
      <div style={{ position:'relative', width:100, height:100, flexShrink:0 }}>
        <svg width={100} height={100} style={{ transform:'rotate(-90deg)' }}>
          <circle cx={50} cy={50} r={R} fill="none" stroke="#f0f3fa" strokeWidth={stroke}/>
          {paths.map((s,i) => (
            <circle key={i} cx={50} cy={50} r={R} fill="none" stroke={s.color}
              strokeWidth={stroke} strokeDasharray={s.dasharray} strokeDashoffset={-s.offset} strokeLinecap="round"/>
          ))}
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.1rem', color:'#0f1a2e', lineHeight:1 }}>{solved}</div>
          <div style={{ fontSize:'.52rem', color:'#b0bec9', fontWeight:700 }}>/{total}</div>
        </div>
      </div>
      <div>
        {paths.map(s => (
          <div key={s.label} style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
            <div style={{ width:8, height:8, borderRadius:2, background:s.color }}/>
            <span style={{ fontSize:'.68rem', color:'#7a8ba8', minWidth:36 }}>{s.label}</span>
            <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.75rem', color:'#0f1a2e' }}>{s.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Mini Heatmap ── */
function MiniHeatmap({ dates=[] }) {
  const today = new Date();
  const cells = 84; // 12 weeks
  const counts = {};
  dates.forEach(d => { counts[d] = (counts[d]||0)+1; });
  const days = Array.from({ length:cells }, (_,i) => {
    const dt = new Date(today);
    dt.setDate(today.getDate() - (cells-1-i));
    const key = dt.toISOString().slice(0,10);
    return { key, count: counts[key]||0 };
  });
  const maxC = Math.max(1, ...days.map(d=>d.count));
  const getColor = c => {
    if (!c) return '#f0f3fa';
    const t = c/maxC;
    if (t < 0.3) return '#c8e6c9';
    if (t < 0.6) return '#66bb6a';
    return '#1b5e20';
  };
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(12,1fr)', gap:2 }}>
      {Array.from({ length:12 }, (_,week) =>
        Array.from({ length:7 }, (_,day) => {
          const idx = week*7+day;
          const d = days[idx];
          if (!d) return null;
          return <div key={idx} title={`${d.key}: ${d.count}`} style={{ width:8, height:8, borderRadius:2, background:getColor(d.count) }}/>;
        })
      )}
    </div>
  );
}

/* ── Activity Bar Chart (last 7 days) ── */
function ActivityBars({ recentActivity=[] }) {
  const days = Array.from({ length:7 }, (_,i) => {
    const dt = new Date(); dt.setDate(dt.getDate()-i);
    return dt.toISOString().slice(0,10);
  }).reverse();
  const counts = {};
  recentActivity.forEach(a => {
    const d = a.attemptedAt ? new Date(a.attemptedAt).toISOString().slice(0,10) : null;
    if (d) counts[d] = (counts[d]||0)+1;
  });
  const max = Math.max(1, ...days.map(d => counts[d]||0));
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:36 }}>
      {days.map((d,i) => {
        const c = counts[d]||0;
        const h = Math.max(2, Math.round((c/max)*34));
        return (
          <div key={i} title={`${d}: ${c} attempts`}
            style={{ flex:1, height:h, borderRadius:'3px 3px 0 0', background:c>0?'linear-gradient(180deg,#531697,#13a1a5)':'#f0f3fa', transition:'height .3s' }}/>
        );
      })}
    </div>
  );
}

/* ── Full Student Profile Card (LeetCode Style) ── */
function StudentProfileModal({ student, profileData, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');
  const s = student;
  const pd = profileData;
  const sc = SKILL_COLOR[s.skillLevel] || '#531697';
  const easy   = pd?.problemStats?.easy   || 0;
  const medium = pd?.problemStats?.medium || 0;
  const hard   = pd?.problemStats?.hard   || 0;
  const aptStats = pd?.aptStats || [];
  const codingStats = pd?.codingStats || [];
  const recentActivity = pd?.recentActivity || [];
  const summary = pd?.summary || {};

  const tabs = [
    { id:'overview', label:'📊 Overview' },
    { id:'aptitude', label:'🎯 Aptitude' },
    { id:'coding',   label:'💻 Coding' },
    { id:'activity', label:'📅 Activity' },
  ];

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(4,44,93,0.65)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'16px 12px', overflowY:'auto' }}
      onClick={onClose}>
      <div style={{ background:'#f8f9fc', borderRadius:20, width:'100%', maxWidth:720, boxShadow:'0 24px 80px rgba(4,44,93,0.3)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background:GRAD, borderRadius:'20px 20px 0 0', padding:'18px 22px', display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:56, height:56, borderRadius:14, background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.5rem', color:'#fff', flexShrink:0 }}>
            {s.name?.charAt(0)}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.05rem', color:'#fff' }}>{s.name}</div>
            <div style={{ fontSize:'.72rem', color:'rgba(255,255,255,0.75)', marginTop:2 }}>
              {s.rollNumber && `${s.rollNumber} · `}{s.department} · Year {s.year}
              {s.email && ` · ${s.email}`}
            </div>
            <div style={{ display:'flex', gap:8, marginTop:6, flexWrap:'wrap' }}>
              <span style={{ padding:'2px 8px', borderRadius:999, background:'rgba(255,255,255,0.2)', color:'#fff', fontSize:'.62rem', fontWeight:800 }}>{s.skillLevel||'Beginner'}</span>
              <span style={{ padding:'2px 8px', borderRadius:999, background:'rgba(255,255,255,0.15)', color:'#fff', fontSize:'.62rem', fontWeight:700 }}>🔥 {s.streak||0}d streak</span>
              <span style={{ padding:'2px 8px', borderRadius:999, background:'rgba(255,255,255,0.15)', color:'#fff', fontSize:'.62rem', fontWeight:700 }}>ATS: {s.atsScore||0}</span>
            </div>
          </div>
          <div style={{ textAlign:'center', background:'rgba(255,255,255,0.15)', borderRadius:12, padding:'10px 14px', flexShrink:0 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.4rem', color:'#fff', lineHeight:1 }}>{s.totalScore||0}</div>
            <div style={{ fontSize:'.58rem', color:'rgba(255,255,255,0.7)', marginTop:2 }}>SCORE</div>
          </div>
          <button onClick={onClose}
            style={{ width:32, height:32, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.15)', cursor:'pointer', color:'#fff', fontWeight:900, fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            ×
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', background:'#fff', borderBottom:'1px solid #e8edf5' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ flex:1, padding:'12px 8px', border:'none', background:'transparent', color:activeTab===t.id?'#531697':'#7a8ba8', fontWeight:activeTab===t.id?800:600, fontSize:'.75rem', cursor:'pointer', borderBottom:activeTab===t.id?'2px solid #531697':'2px solid transparent', fontFamily:"'Nunito',sans-serif", transition:'all .15s' }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding:'18px 20px', maxHeight:'70vh', overflowY:'auto' }}>

          {/* ── OVERVIEW TAB ── */}
          {activeTab==='overview' && (
            <div>
              {/* Score breakdown cards */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
                {[
                  { label:'Total Score', val:s.totalScore||0, color:'#531697', icon:'🏆' },
                  { label:'Apt Accuracy', val:`${summary.accuracy||0}%`, color:'#13a1a5', icon:'🎯' },
                  { label:'Problems', val:summary.totalSolved||s.totalProblemsSolved||0, color:'#f59e0b', icon:'💻' },
                  { label:'Discussions', val:summary.discussionCount||0, color:'#47d372', icon:'💬' },
                ].map(item => (
                  <div key={item.label} style={{ textAlign:'center', padding:'12px 8px', background:'#fff', borderRadius:12, border:'1px solid #e8edf5' }}>
                    <div style={{ fontSize:'1.1rem', marginBottom:4 }}>{item.icon}</div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.1rem', color:item.color }}>{item.val}</div>
                    <div style={{ fontSize:'.6rem', color:'#b0bec9', fontWeight:700, marginTop:2 }}>{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Problems donut + Activity heatmap */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e8edf5', padding:'14px 16px' }}>
                  <div style={{ fontSize:'.65rem', fontWeight:800, color:'#b0bec9', marginBottom:10 }}>PROBLEMS SOLVED</div>
                  <DonutChart easy={easy} medium={medium} hard={hard}/>
                </div>
                <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e8edf5', padding:'14px 16px' }}>
                  <div style={{ fontSize:'.65rem', fontWeight:800, color:'#b0bec9', marginBottom:10 }}>LAST 7 DAYS ACTIVITY</div>
                  <ActivityBars recentActivity={recentActivity}/>
                  <div style={{ fontSize:'.68rem', fontWeight:800, color:'#b0bec9', marginBottom:6, marginTop:12 }}>12-WEEK HEATMAP</div>
                  <MiniHeatmap dates={pd?.submissionDates||[]}/>
                </div>
              </div>

              {/* Score breakdown explanation */}
              {s.scoreBreakdown && (
                <div style={{ background:'rgba(83,22,151,0.04)', border:'1px solid rgba(83,22,151,0.12)', borderRadius:12, padding:'12px 14px' }}>
                  <div style={{ fontSize:'.65rem', fontWeight:800, color:'#531697', marginBottom:8 }}>📊 SCORE BREAKDOWN</div>
                  {Object.entries(s.scoreBreakdown).map(([k,v]) => (
                    <div key={k} style={{ fontSize:'.72rem', color:'#3d4e6b', lineHeight:1.7 }}>
                      <strong style={{ textTransform:'capitalize' }}>{k}:</strong> {v}
                    </div>
                  ))}
                </div>
              )}

              {/* Links */}
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:14 }}>
                {s.githubUrl   && <a href={s.githubUrl}    target="_blank" rel="noreferrer" style={{ padding:'6px 12px', borderRadius:8, background:'#f0f3fa', color:'#3d4e6b', fontSize:'.75rem', fontWeight:700, textDecoration:'none' }}>🐙 GitHub</a>}
                {s.linkedinUrl && <a href={s.linkedinUrl}  target="_blank" rel="noreferrer" style={{ padding:'6px 12px', borderRadius:8, background:'rgba(37,99,235,0.08)', color:'#2563eb', fontSize:'.75rem', fontWeight:700, textDecoration:'none' }}>💼 LinkedIn</a>}
                {s.portfolioUrl&& <a href={s.portfolioUrl} target="_blank" rel="noreferrer" style={{ padding:'6px 12px', borderRadius:8, background:'rgba(83,22,151,0.08)', color:'#531697', fontSize:'.75rem', fontWeight:700, textDecoration:'none' }}>🌐 Portfolio</a>}
                {s.resumeUrl   && <a href={s.resumeUrl}    target="_blank" rel="noreferrer" style={{ padding:'6px 12px', borderRadius:8, background:'rgba(71,211,114,0.08)', color:'#166534', fontSize:'.75rem', fontWeight:700, textDecoration:'none' }}>📄 Resume</a>}
              </div>
            </div>
          )}

          {/* ── APTITUDE TAB ── */}
          {activeTab==='aptitude' && (
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
                {[
                  { label:'Total Attempts', val:summary.totalApt||0, color:'#531697' },
                  { label:'Correct', val:summary.correctApt||0, color:'#47d372' },
                  { label:'Accuracy', val:`${summary.accuracy||0}%`, color:'#13a1a5' },
                ].map(item => (
                  <div key={item.label} style={{ textAlign:'center', padding:'12px 8px', background:'#fff', borderRadius:12, border:'1px solid #e8edf5' }}>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.2rem', color:item.color }}>{item.val}</div>
                    <div style={{ fontSize:'.62rem', color:'#b0bec9', fontWeight:700, marginTop:3 }}>{item.label}</div>
                  </div>
                ))}
              </div>
              {aptStats.length === 0 ? (
                <div style={{ textAlign:'center', padding:32, color:'#b0bec9', fontSize:'.85rem' }}>
                  <div style={{ fontSize:'2rem', marginBottom:8 }}>🎯</div>
                  No aptitude attempts yet
                </div>
              ) : aptStats.map(stat => {
                const pct = Math.round(stat.accuracy||0);
                const col = pct>=70?'#47d372':pct>=45?'#f59e0b':'#ef4444';
                return (
                  <div key={stat.topic} style={{ marginBottom:10, background:'#fff', borderRadius:10, border:'1px solid #e8edf5', padding:'10px 14px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                      <div>
                        <span style={{ fontWeight:800, fontSize:'.82rem', color:'#0f1a2e' }}>{stat.topic}</span>
                        <span style={{ fontSize:'.68rem', color:'#b0bec9', marginLeft:8 }}>{stat.total} attempts</span>
                      </div>
                      <span style={{ fontWeight:800, fontSize:'.82rem', color:col }}>{pct}%</span>
                    </div>
                    <div style={{ height:6, background:'#f0f3fa', borderRadius:999, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${col},#13a1a5)`, borderRadius:999, transition:'width .6s' }}/>
                    </div>
                    <div style={{ fontSize:'.65rem', color:'#b0bec9', marginTop:4 }}>{stat.correct||0}/{stat.total} correct · {stat.subtopics?.length||0} subtopics attempted</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── CODING TAB ── */}
          {activeTab==='coding' && (
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
                {[
                  { label:'Easy Solved', val:easy, color:'#47d372' },
                  { label:'Medium Solved', val:medium, color:'#f59e0b' },
                  { label:'Hard Solved', val:hard, color:'#ef4444' },
                ].map(item => (
                  <div key={item.label} style={{ textAlign:'center', padding:'12px 8px', background:'#fff', borderRadius:12, border:'1px solid #e8edf5' }}>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.2rem', color:item.color }}>{item.val}</div>
                    <div style={{ fontSize:'.62rem', color:'#b0bec9', fontWeight:700, marginTop:3 }}>{item.label}</div>
                  </div>
                ))}
              </div>
              {codingStats.length === 0 ? (
                <div style={{ textAlign:'center', padding:32, color:'#b0bec9', fontSize:'.85rem' }}>
                  <div style={{ fontSize:'2rem', marginBottom:8 }}>💻</div>No coding submissions yet
                </div>
              ) : codingStats.map(stat => {
                const pct = stat.total > 0 ? Math.round((stat.solved/stat.total)*100) : 0;
                return (
                  <div key={stat.topic||'misc'} style={{ marginBottom:10, background:'#fff', borderRadius:10, border:'1px solid #e8edf5', padding:'10px 14px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                      <span style={{ fontWeight:800, fontSize:'.82rem', color:'#0f1a2e' }}>{stat.topic||'General'}</span>
                      <span style={{ fontSize:'.75rem', color:'#531697', fontWeight:700 }}>{stat.solved}/{stat.total}</span>
                    </div>
                    <div style={{ height:5, background:'#f0f3fa', borderRadius:999, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg,#531697,#13a1a5)', borderRadius:999 }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── ACTIVITY TAB ── */}
          {activeTab==='activity' && (
            <div>
              <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e8edf5', padding:'14px 16px', marginBottom:14 }}>
                <div style={{ fontSize:'.65rem', fontWeight:800, color:'#b0bec9', marginBottom:10 }}>12-WEEK ACTIVITY HEATMAP</div>
                <MiniHeatmap dates={pd?.submissionDates||[]}/>
                <div style={{ fontSize:'.62rem', color:'#b0bec9', marginTop:8 }}>{pd?.submissionDates?.length||0} active days</div>
              </div>
              <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e8edf5', padding:'14px 16px' }}>
                <div style={{ fontSize:'.65rem', fontWeight:800, color:'#b0bec9', marginBottom:12 }}>RECENT ACTIVITY</div>
                {recentActivity.length === 0 ? (
                  <div style={{ textAlign:'center', padding:20, color:'#b0bec9', fontSize:'.82rem' }}>No recent activity</div>
                ) : recentActivity.slice(0,15).map((a,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #f0f3fa' }}>
                    <span style={{ fontSize:'.75rem', fontWeight:800, padding:'2px 6px', borderRadius:5, background:a.correct?'rgba(71,211,114,0.1)':'rgba(239,68,68,0.08)', color:a.correct?'#166534':'#991b1b', flexShrink:0 }}>{a.correct?'✓':'✗'}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'.75rem', color:'#3d4e6b', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.questionId?.question||'Question'}</div>
                      <div style={{ fontSize:'.62rem', color:'#b0bec9' }}>{a.questionId?.topic||a.topic} · {a.questionId?.difficulty}</div>
                    </div>
                    <div style={{ fontSize:'.62rem', color:'#b0bec9', flexShrink:0 }}>{a.attemptedAt ? new Date(a.attemptedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN FACULTY STUDENTS PAGE
══════════════════════════════════════════════════════════════════ */
export default function FacultyStudentsPage() {
  const [students, setStudents]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterBranch, setFB]       = useState('All');
  const [filterYear, setFY]         = useState('All');
  const [sortBy, setSortBy]         = useState('score');
  const [selectedStudent, setSel]   = useState(null);
  const [profileData, setPD]        = useState(null);
  const [profileLoading, setPL]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await apiFetch('/analytics/leaderboard?limit=500');
    setStudents(d?.leaderboard || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function viewProfile(s) {
    setSel(s); setPD(null); setPL(true);
    const d = await apiFetch(`/analytics/student-profile/${s._id}`);
    setPD(d); setPL(false);
  }

  const branches = ['All', ...new Set(students.map(s=>s.department).filter(Boolean))].sort();

  const filtered = students
    .filter(s => {
      const q = search.toLowerCase();
      return (!q || s.name?.toLowerCase().includes(q) || s.rollNumber?.toLowerCase().includes(q))
        && (filterBranch==='All' || s.department===filterBranch)
        && (filterYear==='All' || String(s.year)===filterYear);
    })
    .sort((a,b) => {
      if (sortBy==='streak') return (b.streak||0)-(a.streak||0);
      if (sortBy==='solved') return (b.codingProblems||0)-(a.codingProblems||0);
      if (sortBy==='apt')    return (b.aptScore||0)-(a.aptScore||0);
      return (b.totalScore||0)-(a.totalScore||0);
    });

  const medals = ['🥇','🥈','🥉'];
  const SS = { padding:'8px 10px', borderRadius:9, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.78rem', fontWeight:700, background:'#fff', color:'#3d4e6b', cursor:'pointer' };

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif" }}>
      {selectedStudent && (
        <StudentProfileModal
          student={{ ...selectedStudent, totalScore: selectedStudent.totalScore, scoreBreakdown: selectedStudent.scoreBreakdown }}
          profileData={profileLoading ? null : profileData}
          onClose={() => { setSel(null); setPD(null); }}/>
      )}

      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.4rem', color:'#0f1a2e', margin:0 }}>👥 Students</h1>
        <p style={{ color:'#7a8ba8', marginTop:4, fontSize:'.82rem' }}>{students.length} students · Click any row to view full LeetCode-style profile</p>
      </div>

      {/* Summary stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10, marginBottom:18 }}>
        {[
          { label:'Total Students', val:students.length, color:'#531697', icon:'👥' },
          { label:'Active Streaks', val:students.filter(s=>(s.streak||0)>=3).length, color:'#f59e0b', icon:'🔥' },
          { label:'Avg Score', val:Math.round(students.reduce((a,s)=>a+(s.totalScore||0),0)/(students.length||1)), color:'#13a1a5', icon:'📊' },
          { label:'Avg Apt %', val:`${Math.round(students.reduce((a,s)=>a+(s.aptScore||0),0)/(students.length||1))}%`, color:'#47d372', icon:'🎯' },
        ].map(item => (
          <div key={item.label} style={{ background:'#fff', borderRadius:12, border:'1px solid #e8edf5', padding:'12px 14px', textAlign:'center' }}>
            <div style={{ fontSize:'1.2rem', marginBottom:4 }}>{item.icon}</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.2rem', color:item.color }}>{item.val}</div>
            <div style={{ fontSize:'.62rem', color:'#b0bec9', fontWeight:700, marginTop:2 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14, alignItems:'center' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search name or roll…"
          style={{ flex:1, minWidth:160, padding:'9px 12px', borderRadius:9, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.82rem', outline:'none' }}/>
        <select style={SS} value={filterBranch} onChange={e=>setFB(e.target.value)}>
          {branches.map(b => <option key={b} value={b}>{b==='All'?'All Branches':b}</option>)}
        </select>
        <select style={SS} value={filterYear} onChange={e=>setFY(e.target.value)}>
          {['All','1','2','3','4'].map(y => <option key={y} value={y}>{y==='All'?'All Years':`Year ${y}`}</option>)}
        </select>
        <div style={{ display:'flex', borderRadius:9, overflow:'hidden', border:'1.5px solid #d0d7e8' }}>
          {[['score','🏅 Score'],['apt','🎯 Aptitude'],['solved','💻 Solved'],['streak','🔥 Streak']].map(([k,lbl])=>(
            <button key={k} onClick={()=>setSortBy(k)}
              style={{ padding:'8px 11px', border:'none', background:sortBy===k?GRAD:'#fff', color:sortBy===k?'#fff':'#7a8ba8', fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.72rem' }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>
      <div style={{ fontSize:'.7rem', color:'#b0bec9', marginBottom:12 }}>
        Showing {filtered.length} of {students.length} students
      </div>

      {/* Student list */}
      {loading ? (
        <div style={{ textAlign:'center', padding:48 }}>
          <div style={{ width:36, height:36, border:'3px solid #e8edf5', borderTopColor:'#531697', borderRadius:'50%', animation:'_spin .7s linear infinite', margin:'0 auto 12px' }}/>
          <style>{`@keyframes _spin{to{transform:rotate(360deg)}}`}</style>
          <div style={{ color:'#b0bec9', fontSize:'.82rem' }}>Loading students…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:48, background:'#fff', borderRadius:14, border:'1px solid #e8edf5' }}>
          <div style={{ fontSize:'2rem', marginBottom:10 }}>🔍</div>
          <div style={{ color:'#b0bec9', fontSize:'.85rem' }}>No students match this filter.</div>
        </div>
      ) : filtered.map((s, i) => {
        const globalRank = students.indexOf(s);
        const sc = SKILL_COLOR[s.skillLevel] || '#531697';
        return (
          <div key={s._id}
            style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:12, marginBottom:7, background:'#fff', border:'1px solid #f0f3fa', cursor:'pointer', transition:'all .15s' }}
            onClick={() => viewProfile(s)}
            onMouseOver={e => { e.currentTarget.style.background='#f8f9ff'; e.currentTarget.style.borderColor='rgba(83,22,151,0.15)'; e.currentTarget.style.boxShadow='0 2px 12px rgba(83,22,151,0.08)'; }}
            onMouseOut={e  => { e.currentTarget.style.background='#fff'; e.currentTarget.style.borderColor='#f0f3fa'; e.currentTarget.style.boxShadow='none'; }}>

            {/* Rank */}
            <div style={{ width:36, textAlign:'center', flexShrink:0 }}>
              {globalRank < 3
                ? <span style={{ fontSize:'1.2rem' }}>{medals[globalRank]}</span>
                : <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.78rem', color:'#b0bec9' }}>#{globalRank+1}</span>}
            </div>

            {/* Avatar */}
            <div style={{ width:38, height:38, borderRadius:10, background:`linear-gradient(135deg,${sc},#13a1a5)`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.9rem', flexShrink:0 }}>
              {s.name?.charAt(0)}
            </div>

            {/* Info */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:'.88rem', color:'#0f1a2e' }}>{s.name}</div>
              <div style={{ fontSize:'.68rem', color:'#b0bec9', marginTop:1 }}>
                {s.department} · Y{s.year}{s.rollNumber?` · ${s.rollNumber}`:''} · <span style={{ color:sc, fontWeight:700 }}>{s.skillLevel||'Beginner'}</span>
              </div>
            </div>

            {/* Stat chips */}
            <div style={{ display:'flex', gap:12, alignItems:'center', flexShrink:0 }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:'.58rem', color:'#b0bec9', fontWeight:700 }}>APT</div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.82rem', color:'#13a1a5' }}>{s.aptScore||0}%</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:'.58rem', color:'#b0bec9', fontWeight:700 }}>SOLVED</div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.82rem', color:'#f59e0b' }}>{s.codingProblems||0}</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:'.58rem', color:'#b0bec9', fontWeight:700 }}>STREAK</div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.82rem', color:'#ef4444' }}>🔥{s.streak||0}</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:'.58rem', color:'#b0bec9', fontWeight:700 }}>SCORE</div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.9rem', background:GRAD, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>{s.totalScore||0}</div>
              </div>
              <span style={{ color:'#d0d7e8', fontSize:'.8rem' }}>→</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
