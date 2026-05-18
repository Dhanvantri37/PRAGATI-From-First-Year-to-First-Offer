import React, { useEffect, useState, useCallback } from 'react';

const API   = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tk    = () => ({ Authorization: `Bearer ${localStorage.getItem('pragati_token')}` });
const apiFetch = p => fetch(`${API}${p}`, { headers: tk() }).then(r => r.json()).catch(() => null);

const GRAD    = 'linear-gradient(135deg,#531697,#13a1a5)';
const MEDALS  = ['🥇','🥈','🥉'];
const RANK_COLORS = { 1:'#f59e0b', 2:'#9ca3af', 3:'#b45309' };

// ── Donut chart for problems solved ─────────────────────────────────────────
function DonutChart({ easy=0, medium=0, hard=0, total=0 }) {
  const easyTotal=941, medTotal=1926, hardTotal=829;
  const solved = easy + medium + hard;
  const radius=52, cx=60, cy=60, stroke=9;
  const circ   = 2 * Math.PI * radius;
  const pctE   = easy   / (easyTotal+medTotal+hardTotal);
  const pctM   = medium / (easyTotal+medTotal+hardTotal);
  const pctH   = hard   / (easyTotal+medTotal+hardTotal);
  const dashE  = circ * pctE;
  const dashM  = circ * pctM;
  const dashH  = circ * pctH;
  const offE   = 0;
  const offM   = -(dashE);
  const offH   = -(dashE + dashM);

  return (
    <div style={{ display:'flex', alignItems:'center', gap:18 }}>
      <div style={{ position:'relative', flexShrink:0 }}>
        <svg width={120} height={120} style={{ transform:'rotate(-90deg)' }}>
          {/* Background ring */}
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#f0f3fa" strokeWidth={stroke}/>
          {/* Easy - green */}
          {dashE>0.01 && <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#47d372" strokeWidth={stroke}
            strokeDasharray={`${dashE} ${circ}`} strokeDashoffset={offE} strokeLinecap="butt"/>}
          {/* Medium - orange */}
          {dashM>0.01 && <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#f59e0b" strokeWidth={stroke}
            strokeDasharray={`${dashM} ${circ}`} strokeDashoffset={offM} strokeLinecap="butt"/>}
          {/* Hard - red */}
          {dashH>0.01 && <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#ef4444" strokeWidth={stroke}
            strokeDasharray={`${dashH} ${circ}`} strokeDashoffset={offH} strokeLinecap="butt"/>}
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.2rem', color:'#0f1a2e', lineHeight:1 }}>{solved}</div>
          <div style={{ fontSize:'.6rem', color:'#b0bec9', fontWeight:700, marginTop:2 }}>Solved</div>
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {[['Easy',easy,easyTotal,'#47d372'],['Med',medium,medTotal,'#f59e0b'],['Hard',hard,hardTotal,'#ef4444']].map(([lbl,val,tot,col])=>(
          <div key={lbl} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:col, flexShrink:0 }}/>
            <span style={{ fontSize:'.72rem', color:'#7a8ba8', fontWeight:700, minWidth:30 }}>{lbl}</span>
            <span style={{ fontSize:'.82rem', fontWeight:800, color:'#0f1a2e' }}>{val}</span>
            <span style={{ fontSize:'.65rem', color:'#b0bec9' }}>/{tot}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Mini bar rating graph ────────────────────────────────────────────────────
function RatingGraph({ score=0, history=[] }) {
  const W=260, H=80, pad=10;
  const points = history.length >= 2 ? history : [
    { score: Math.max(0, score-120) }, { score: Math.max(0, score-60) }, { score }
  ];
  const scores = points.map(p=>p.score||0);
  const minS = Math.min(...scores);
  const maxS = Math.max(...scores, minS+1);
  const toX  = i => pad + (i/(points.length-1))*(W-pad*2);
  const toY  = s => H - pad - ((s-minS)/(maxS-minS))*(H-pad*2);
  const pts  = points.map((p,i)=>({ x:toX(i), y:toY(p.score||0) }));
  const d    = pts.map((p,i)=>i===0?`M${p.x},${p.y}`:`L${p.x},${p.y}`).join(' ');
  const area = pts.map((p,i)=>i===0?`M${p.x},${H} L${p.x},${p.y}`:`L${p.x},${p.y}`).join(' ')+` L${pts[pts.length-1].x},${H} Z`;

  return (
    <svg width={W} height={H} style={{ overflow:'visible' }}>
      <defs>
        <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#531697" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#531697" stopOpacity="0.02"/>
        </linearGradient>
      </defs>
      <path d={area} fill="url(#rg)"/>
      <path d={d} fill="none" stroke="#531697" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"/>
      {pts.map((p,i)=>(
        <circle key={i} cx={p.x} cy={p.y} r={i===pts.length-1?4:2.5}
          fill={i===pts.length-1?'#531697':'#13a1a5'} stroke="#fff" strokeWidth={1.5}/>
      ))}
    </svg>
  );
}

// ── Submission heatmap (LeetCode style) ─────────────────────────────────────
function Heatmap({ submissions=0 }) {
  const weeks=20, days=7;
  const total=weeks*days;
  // Simulate heatmap data seeded from submissions count
  const seed=submissions||0;
  const cells=Array.from({length:total},(_,i)=>{
    const rng=(i*2654435761+seed*6364136223846793005)>>>0;
    const v=seed>0?(rng%100<(seed/3)?Math.floor(rng%5):0):0;
    return Math.min(v,4);
  });
  const cols=['#f0f3fa','#c4b5fd','#8b5cf6','#6d28d9','#4c1d95'];
  const monthLabels=['Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr'];
  return (
    <div>
      <div style={{ display:'flex', gap:2 }}>
        {Array.from({length:weeks},(_,w)=>(
          <div key={w} style={{ display:'flex', flexDirection:'column', gap:2 }}>
            {Array.from({length:days},(_,d)=>{
              const idx=w*days+d;
              const v=cells[idx]||0;
              return (
                <div key={d} title={`${v} submission${v!==1?'s':''}`}
                  style={{ width:10, height:10, borderRadius:2, background:cols[v], cursor:'default', transition:'transform .1s' }}
                  onMouseOver={e=>e.currentTarget.style.transform='scale(1.4)'}
                  onMouseOut={e=>e.currentTarget.style.transform='scale(1)'}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:4, marginTop:8, alignItems:'center' }}>
        <span style={{ fontSize:'.65rem', color:'#b0bec9' }}>Less</span>
        {cols.map((c,i)=><div key={i} style={{ width:10, height:10, borderRadius:2, background:c }}/>)}
        <span style={{ fontSize:'.65rem', color:'#b0bec9' }}>More</span>
      </div>
    </div>
  );
}

// ── Profile detail panel (LeetCode style) ───────────────────────────────────
function StudentProfilePanel({ student, profileData, onBack }) {
  const s       = student;
  const solved  = s.totalProblemsSolved || 0;
  const easy    = Math.round(solved * 0.45);
  const medium  = Math.round(solved * 0.38);
  const hard    = solved - easy - medium;
  const rating  = s.totalScore || 0;
  const rank    = `#${s.globalRank || '?'}`;
  const streak  = s.streak || 0;
  const level   = s.skillLevel || 'Beginner';
  const levelColor = { Beginner:'#f59e0b', Intermediate:'#531697', Expert:'#47d372' }[level] || '#531697';
  const initials = (s.name||'U').split(' ').map(p=>p[0]).join('').slice(0,2).toUpperCase();

  return (
    <div>
      <button onClick={onBack}
        style={{ marginBottom:16, display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:8, border:'1px solid #e8edf5', background:'#f8f9fc', cursor:'pointer', color:'#7a8ba8', fontWeight:700, fontSize:'.78rem', fontFamily:"'Nunito',sans-serif" }}>
        ← Back to Leaderboard
      </button>

      {/* ── Profile card ── */}
      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:20, marginBottom:16 }}>
        {/* Left column */}
        <div style={{ minWidth:160 }}>
          {/* Avatar */}
          <div style={{ width:72, height:72, borderRadius:14, background:GRAD, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.6rem', color:'#fff', marginBottom:10 }}>
            {initials}
          </div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1rem', color:'#0f1a2e', marginBottom:3 }}>{s.name}</div>
          <div style={{ fontSize:'.72rem', color:'#7a8ba8', marginBottom:2 }}>{s.rollNumber || 'No roll no.'}</div>
          <div style={{ fontSize:'.72rem', color:'#7a8ba8', marginBottom:8 }}>{s.department} · Year {s.year}</div>

          {/* Level badge */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:999, background:levelColor+'18', border:`1px solid ${levelColor}33`, marginBottom:10 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:levelColor }}/>
            <span style={{ fontSize:'.7rem', fontWeight:800, color:levelColor }}>{level}</span>
          </div>

          {/* Social links */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {s.linkedinUrl && <a href={s.linkedinUrl} target="_blank" rel="noreferrer" style={{ padding:'4px 8px', borderRadius:7, background:'rgba(83,22,151,.07)', color:'#531697', fontWeight:700, fontSize:'.68rem', textDecoration:'none' }}>💼 LinkedIn</a>}
            {s.githubUrl   && <a href={s.githubUrl}   target="_blank" rel="noreferrer" style={{ padding:'4px 8px', borderRadius:7, background:'rgba(83,22,151,.07)', color:'#531697', fontWeight:700, fontSize:'.68rem', textDecoration:'none' }}>🐙 GitHub</a>}
          </div>

          {/* Community stats */}
          <div style={{ marginTop:14, paddingTop:12, borderTop:'1px solid #f0f3fa' }}>
            <div style={{ fontSize:'.68rem', fontWeight:800, color:'#b0bec9', marginBottom:8, letterSpacing:'.05em' }}>ACTIVITY</div>
            {[['🔥 Streak', `${streak} days`],['🎯 ATS Score', rating],['📅 Joined', s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN',{month:'short',year:'numeric'}) : 'N/A']].map(([lbl,val])=>(
              <div key={lbl} style={{ display:'flex', justifyContent:'space-between', fontSize:'.75rem', marginBottom:6, alignItems:'center' }}>
                <span style={{ color:'#7a8ba8' }}>{lbl}</span>
                <span style={{ fontWeight:800, color:'#0f1a2e' }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* Rating banner */}
          <div style={{ background:'rgba(83,22,151,0.04)', border:'1px solid rgba(83,22,151,0.12)', borderRadius:12, padding:'14px 18px', marginBottom:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
              <div>
                <div style={{ fontSize:'.68rem', fontWeight:800, color:'#b0bec9', marginBottom:4, letterSpacing:'.05em' }}>ATS RATING</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                  <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'2rem', background:GRAD, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>{rating}</span>
                  <span style={{ fontSize:'.72rem', color:'#b0bec9' }}>pts</span>
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:'.68rem', fontWeight:800, color:'#b0bec9', marginBottom:4 }}>RANK</div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.3rem', color:'#531697' }}>{rank}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:'.68rem', fontWeight:800, color:'#b0bec9', marginBottom:4 }}>STREAK</div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.3rem', color:'#f59e0b' }}>🔥{streak}d</div>
              </div>
            </div>
            <div style={{ marginTop:12 }}>
              <RatingGraph score={rating}/>
            </div>
          </div>

          {/* Problems solved donut */}
          <div style={{ background:'#fff', border:'1px solid #e8edf5', borderRadius:12, padding:'14px 18px', marginBottom:14 }}>
            <div style={{ fontSize:'.72rem', fontWeight:800, color:'#b0bec9', marginBottom:10, letterSpacing:'.05em' }}>PROBLEMS SOLVED</div>
            <DonutChart easy={easy} medium={medium} hard={hard} total={solved}/>
          </div>
        </div>
      </div>

      {/* Submission heatmap */}
      <div style={{ background:'#fff', border:'1px solid #e8edf5', borderRadius:12, padding:'14px 18px', marginBottom:14, overflowX:'auto' }}>
        <div style={{ fontSize:'.72rem', fontWeight:800, color:'#b0bec9', marginBottom:10, letterSpacing:'.05em' }}>SUBMISSION ACTIVITY ({s.totalProblemsSolved||0} total submissions)</div>
        <Heatmap submissions={s.totalProblemsSolved||0}/>
      </div>

      {/* Aptitude topic bars */}
      {profileData?.aptStats?.length > 0 && (
        <div style={{ background:'#fff', border:'1px solid #e8edf5', borderRadius:12, padding:'14px 18px' }}>
          <div style={{ fontSize:'.72rem', fontWeight:800, color:'#b0bec9', marginBottom:12, letterSpacing:'.05em' }}>APTITUDE ACCURACY BY TOPIC</div>
          {profileData.aptStats.map(st => {
            const pct = Math.round(st.accuracy||0);
            const col = pct>=70?'#47d372':pct>=45?'#f59e0b':'#ef4444';
            return (
              <div key={st.topic} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.75rem', fontWeight:700, color:'#3d4e6b', marginBottom:4 }}>
                  <span>{st.topic}</span>
                  <span style={{ color:col }}>{pct}% · {st.correct||0}/{st.total||0}</span>
                </div>
                <div style={{ height:6, background:'#f0f3fa', borderRadius:999, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${col},#13a1a5)`, borderRadius:999, transition:'width .6s' }}/>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN LEADERBOARD MODAL — LeetCode style
// ══════════════════════════════════════════════════════════════════════════════
export default function LeaderboardModal({ onClose, myId }) {
  const [all, setAll]         = useState([]);
  const [search, setSearch]   = useState('');
  const [fbranch, setFBranch] = useState('All');
  const [fyear, setFYear]     = useState('All');
  const [selected, setSelected] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('global'); // 'global' | 'dept'

  useEffect(() => {
    apiFetch('/analytics/leaderboard?limit=200').then(d => {
      const list = (d?.leaderboard || []).map((s, i) => ({ ...s, globalRank: i + 1 }));
      setAll(list);
      setLoading(false);
    });
  }, []);

  async function viewProfile(s) {
    setSelected(s);
    setProfileData(null);
    const d = await apiFetch(`/analytics/student-profile/${s._id}`);
    setProfileData(d);
  }

  const branches = ['All', ...new Set(all.map(s=>s.department).filter(Boolean))].sort();
  const myData   = all.find(s=>s._id===myId);
  const myRank   = all.findIndex(s=>s._id===myId)+1;

  const filtered = all.filter(s => {
    const ms = !search.trim() || (s.name||'').toLowerCase().includes(search.toLowerCase()) || (s.rollNumber||'').toLowerCase().includes(search.toLowerCase());
    const mb = fbranch==='All' || s.department===fbranch;
    const my = fyear==='All' || String(s.year)===fyear;
    return ms && mb && my;
  });

  const deptFiltered = myData ? all.filter(s=>s.department===myData.department) : [];
  const displayList  = tab==='dept' ? deptFiltered : filtered;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(4,44,93,0.6)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={onClose}>
      <div style={{ background:'#f8f9fc', borderRadius:20, width:'100%', maxWidth:780, maxHeight:'92vh', overflowY:'auto', boxShadow:'0 24px 80px rgba(4,44,93,0.3)', display:'flex', flexDirection:'column' }}
        onClick={e=>e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={{ padding:'20px 24px 14px', borderBottom:'1px solid #e8edf5', background:'#fff', borderRadius:'20px 20px 0 0', position:'sticky', top:0, zIndex:10 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:selected?0:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:GRAD, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem' }}>🏆</div>
              <div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.1rem', color:'#0f1a2e', lineHeight:1 }}>Leaderboard</div>
                {!selected && <div style={{ fontSize:'.7rem', color:'#b0bec9', marginTop:2 }}>{all.length} students ranked</div>}
              </div>
            </div>
            <button onClick={onClose}
              style={{ width:34, height:34, borderRadius:'50%', border:'1px solid #e8edf5', background:'#f8f9fc', cursor:'pointer', fontWeight:800, color:'#7a8ba8', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
          </div>

          {/* Tabs — only show when not in profile view */}
          {!selected && (
            <div style={{ display:'flex', gap:6 }}>
              {[['global','🌐 Global'],['dept','🏫 My Dept']].map(([key,lbl])=>(
                <button key={key} onClick={()=>setTab(key)}
                  style={{ padding:'6px 14px', borderRadius:8, border:`1.5px solid ${tab===key?'#531697':'#e8edf5'}`, background:tab===key?'rgba(83,22,151,0.08)':'transparent', color:tab===key?'#531697':'#7a8ba8', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.78rem' }}>
                  {lbl}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div style={{ padding:'16px 24px 24px', flex:1 }}>

          {selected ? (
            <StudentProfilePanel
              student={selected}
              profileData={profileData}
              onBack={()=>{ setSelected(null); setProfileData(null); }}
            />
          ) : (
            <>
              {/* My rank banner */}
              {myData && (
                <div style={{ background:'#fff', border:'1.5px solid rgba(83,22,151,0.18)', borderRadius:14, padding:'14px 18px', marginBottom:16, display:'flex', alignItems:'center', gap:14 }}>
                  {/* Avatar */}
                  <div style={{ width:46, height:46, borderRadius:12, background:GRAD, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1rem', color:'#fff', flexShrink:0 }}>
                    {(myData.name||'U').split(' ').map(p=>p[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.9rem', color:'#0f1a2e' }}>{myData.name} <span style={{ fontSize:'.68rem', color:'#531697', fontWeight:700 }}>(you)</span></div>
                    <div style={{ fontSize:'.72rem', color:'#7a8ba8', marginTop:2 }}>{myData.department} · Year {myData.year} · 🔥{myData.streak}d streak</div>
                  </div>
                  <div style={{ textAlign:'center', padding:'6px 14px', background:'rgba(83,22,151,0.06)', borderRadius:10 }}>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.3rem', background:GRAD, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>{myRank}</div>
                    <div style={{ fontSize:'.6rem', color:'#b0bec9', fontWeight:700 }}>RANK</div>
                  </div>
                  <div style={{ textAlign:'center', padding:'6px 14px', background:'rgba(19,161,165,0.06)', borderRadius:10 }}>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.3rem', color:'#13a1a5' }}>{myData.totalScore}</div>
                    <div style={{ fontSize:'.6rem', color:'#b0bec9', fontWeight:700 }}>SCORE</div>
                  </div>
                </div>
              )}

              {/* Search + filters — only on global tab */}
              {tab==='global' && (
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
                  <input value={search} onChange={e=>setSearch(e.target.value)}
                    placeholder="🔍 Search name or roll number…"
                    style={{ flex:1, minWidth:150, padding:'8px 12px', borderRadius:9, border:'1.5px solid #e8edf5', fontFamily:"'Nunito',sans-serif", fontSize:'.82rem', outline:'none', background:'#fff' }}/>
                  <select value={fbranch} onChange={e=>setFBranch(e.target.value)}
                    style={{ padding:'8px 10px', borderRadius:9, border:'1.5px solid #e8edf5', fontFamily:"'Nunito',sans-serif", fontSize:'.78rem', fontWeight:700, color:'#3d4e6b', background:'#fff', cursor:'pointer' }}>
                    {branches.map(b=><option key={b} value={b}>{b==='All'?'All Branches':b}</option>)}
                  </select>
                  <select value={fyear} onChange={e=>setFYear(e.target.value)}
                    style={{ padding:'8px 10px', borderRadius:9, border:'1.5px solid #e8edf5', fontFamily:"'Nunito',sans-serif", fontSize:'.78rem', fontWeight:700, color:'#3d4e6b', background:'#fff', cursor:'pointer' }}>
                    {['All','1','2','3','4'].map(y=><option key={y} value={y}>{y==='All'?'All Years':`Year ${y}`}</option>)}
                  </select>
                </div>
              )}

              {/* Count */}
              <div style={{ fontSize:'.7rem', color:'#b0bec9', marginBottom:10, fontWeight:600 }}>
                {tab==='global' ? `Showing ${displayList.length} of ${all.length} students` : `${displayList.length} students in your department`}
              </div>

              {/* List */}
              {loading ? (
                <div style={{ textAlign:'center', padding:40 }}>
                  <div style={{ width:36, height:36, border:'3px solid #e8edf5', borderTopColor:'#531697', borderRadius:'50%', animation:'_lbspin .7s linear infinite', margin:'0 auto 10px' }}/>
                  <style>{`@keyframes _lbspin{to{transform:rotate(360deg)}}`}</style>
                  <div style={{ color:'#b0bec9', fontSize:'.82rem' }}>Loading leaderboard…</div>
                </div>
              ) : displayList.length === 0 ? (
                <div style={{ textAlign:'center', padding:30, color:'#b0bec9', fontSize:'.85rem' }}>No students match this filter.</div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {displayList.map((s, i) => {
                    const isMe   = s._id === myId;
                    const gRank  = s.globalRank || (all.indexOf(s)+1);
                    const medal  = MEDALS[gRank-1];
                    const rankColor = RANK_COLORS[gRank];
                    const initials = (s.name||'U').split(' ').map(p=>p[0]).join('').slice(0,2).toUpperCase();
                    const levelColor = { Beginner:'#f59e0b', Intermediate:'#531697', Expert:'#47d372' }[s.skillLevel] || '#531697';

                    return (
                      <div key={s._id}
                        style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:12, background:isMe?'rgba(83,22,151,0.05)':'#fff', border:isMe?'1.5px solid rgba(83,22,151,0.2)':'1px solid #f0f3fa', transition:'all .15s', cursor:'pointer' }}
                        onMouseOver={e=>{ if(!isMe){ e.currentTarget.style.background='#f8f9fc'; e.currentTarget.style.borderColor='#e8edf5'; }}}
                        onMouseOut={e=>{ e.currentTarget.style.background=isMe?'rgba(83,22,151,0.05)':'#fff'; e.currentTarget.style.borderColor=isMe?'rgba(83,22,151,0.2)':'#f0f3fa'; }}
                        onClick={()=>viewProfile(s)}>

                        {/* Rank number */}
                        <div style={{ width:34, textAlign:'center', flexShrink:0 }}>
                          {medal ? (
                            <span style={{ fontSize:'1.2rem' }}>{medal}</span>
                          ) : (
                            <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.82rem', color:rankColor||'#b0bec9' }}>#{gRank}</span>
                          )}
                        </div>

                        {/* Avatar */}
                        <div style={{ width:38, height:38, borderRadius:10, background:isMe?GRAD:'linear-gradient(135deg,#e8edf5,#d0d7e8)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'.82rem', color:isMe?'#fff':'#7a8ba8', flexShrink:0 }}>
                          {initials}
                        </div>

                        {/* Info */}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                            <span style={{ fontWeight:700, fontSize:'.88rem', color:'#0f1a2e', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.name}</span>
                            {isMe && <span style={{ fontSize:'.62rem', color:'#531697', fontWeight:800, flexShrink:0 }}>YOU</span>}
                          </div>
                          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                            <span style={{ fontSize:'.67rem', color:'#b0bec9' }}>{s.department}</span>
                            {s.year && <span style={{ fontSize:'.67rem', color:'#b0bec9' }}>· Y{s.year}</span>}
                            {s.rollNumber && <span style={{ fontSize:'.67rem', color:'#b0bec9' }}>· {s.rollNumber}</span>}
                            <span style={{ fontSize:'.67rem', fontWeight:700, color:levelColor }}>· {s.skillLevel}</span>
                            {s.streak > 0 && <span style={{ fontSize:'.67rem', color:'#f59e0b' }}>🔥{s.streak}d</span>}
                          </div>
                        </div>

                        {/* Stats */}
                        <div style={{ display:'flex', gap:10, alignItems:'center', flexShrink:0 }}>
                          {/* Problems solved */}
                          <div style={{ textAlign:'center', display:'none' }} className="hide-sm">
                            <div style={{ fontSize:'.78rem', fontWeight:800, color:'#13a1a5' }}>{s.totalProblemsSolved||0}</div>
                            <div style={{ fontSize:'.58rem', color:'#b0bec9' }}>solved</div>
                          </div>
                          {/* Score */}
                          <div style={{ textAlign:'center', minWidth:52, padding:'5px 10px', borderRadius:8, background: isMe?'rgba(83,22,151,0.08)':'#f8f9fc' }}>
                            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'.95rem', background:GRAD, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>{s.totalScore||0}</div>
                            <div style={{ fontSize:'.58rem', color:'#b0bec9', fontWeight:700 }}>pts</div>
                          </div>
                          {/* Arrow */}
                          <div style={{ color:'#d0d7e8', fontSize:'.9rem' }}>›</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
