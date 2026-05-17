import React, { useState, useEffect, useCallback } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tk  = () => ({ Authorization: `Bearer ${localStorage.getItem('pragati_token')}` });
const apiFetch = p => fetch(`${API}${p}`, { headers: tk() }).then(r => r.json()).catch(() => null);

const GRAD = 'linear-gradient(135deg,#531697,#13a1a5)';
const SKILL_COL = { Beginner:'#f59e0b', Intermediate:'#531697', Expert:'#47d372' };

/* ── Donut Chart (same as leaderboard) ───────────────────────────────────── */
function DonutChart({ easy=0, medium=0, hard=0, total=3920 }) {
  const solved = easy + medium + hard;
  const R=54, stroke=10, norm=2*Math.PI*R;
  const st = total||1;
  const segs=[
    { pct:(easy/st)*norm,   color:'#47d372', label:'Easy',   val:easy },
    { pct:(medium/st)*norm, color:'#f59e0b', label:'Medium', val:medium },
    { pct:(hard/st)*norm,   color:'#ef4444', label:'Hard',   val:hard },
  ];
  let offset = norm*0.25;
  const paths = segs.map(s => {
    const len = Math.max(0, s.pct-2);
    const d = { ...s, dasharray:`${len} ${norm-len}`, offset };
    offset = (offset - s.pct + norm*10) % (norm*10);
    return d;
  });
  return (
    <div style={{ display:'flex', alignItems:'center', gap:16 }}>
      <div style={{ position:'relative', width:120, height:120, flexShrink:0 }}>
        <svg width={120} height={120} style={{ transform:'rotate(-90deg)' }}>
          <circle cx={60} cy={60} r={R} fill="none" stroke="#f0f3fa" strokeWidth={stroke}/>
          {paths.map((s,i)=>(
            <circle key={i} cx={60} cy={60} r={R} fill="none" stroke={s.color}
              strokeWidth={stroke} strokeDasharray={s.dasharray} strokeDashoffset={-s.offset}
              strokeLinecap="round"/>
          ))}
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.3rem', color:'#0f1a2e', lineHeight:1 }}>{solved}</div>
          <div style={{ fontSize:'.58rem', color:'#b0bec9', fontWeight:700, marginTop:2 }}>/{total} Solved</div>
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
        {paths.map(s=>(
          <div key={s.label} style={{ display:'flex', alignItems:'center', gap:7 }}>
            <div style={{ width:9, height:9, borderRadius:3, background:s.color }}/>
            <div style={{ fontSize:'.72rem', color:'#7a8ba8', minWidth:44 }}>{s.label}</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.82rem', color:'#0f1a2e' }}>{s.val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Activity Heatmap ─────────────────────────────────────────────────────── */
function Heatmap({ dates=[] }) {
  const today = new Date(), cells = 364;
  const counts = {};
  dates.forEach(d => { counts[d] = (counts[d]||0)+1; });
  const days = Array.from({ length:cells }, (_,i) => {
    const dt = new Date(today);
    dt.setDate(today.getDate()-(cells-1-i));
    const key = dt.toISOString().slice(0,10);
    return { key, count: counts[key]||0 };
  });
  const maxC = Math.max(1, ...days.map(d=>d.count));
  const getColor = c => {
    if (!c) return '#f0f3fa';
    const t=c/maxC;
    if (t<.25) return '#c8e6c9'; if (t<.5) return '#66bb6a';
    if (t<.75) return '#43a047'; return '#1b5e20';
  };
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return (
    <div style={{ overflowX:'auto' }}>
      <svg width={728} height={110}>
        {days.map((d,i)=>{
          const col=Math.floor(i/7), row=i%7;
          return (<rect key={i} x={col*14} y={row*14+16} width={11} height={11} rx={2} fill={getColor(d.count)}><title>{d.key}: {d.count}</title></rect>);
        })}
        {Array.from({length:12},(_,mi)=>{
          const col=Math.floor((mi/12)*52);
          return <text key={mi} x={col*14} y={11} fontSize={9} fill="#b0bec9">{months[mi]}</text>;
        })}
      </svg>
    </div>
  );
}

/* ── Score Breakdown Card ─────────────────────────────────────────────────── */
function ScoreBreakdown({ breakdown }) {
  if (!breakdown) return null;
  return (
    <div style={{ padding:'12px 16px', borderRadius:10, background:'rgba(83,22,151,0.04)', border:'1px solid rgba(83,22,151,0.1)', marginTop:10 }}>
      <div style={{ fontSize:'.68rem', fontWeight:800, color:'#b0bec9', letterSpacing:'.06em', marginBottom:8 }}>SCORE BREAKDOWN</div>
      {Object.entries(breakdown).map(([k,v])=>(
        <div key={k} style={{ display:'flex', gap:8, marginBottom:4, fontSize:'.72rem' }}>
          <span style={{ fontWeight:800, color:'#531697', minWidth:60, textTransform:'capitalize' }}>{k}:</span>
          <span style={{ color:'#3d4e6b' }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Full LeetCode-style Student Profile Modal ────────────────────────────── */
function StudentProfileModal({ student, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    apiFetch(`/analytics/student-profile/${student._id}`).then(d => {
      setData(d); setLoading(false);
    });
  }, [student._id]);

  const s    = student;
  const sc   = SKILL_COL[s.skillLevel] || '#531697';
  const easy   = data?.problemStats?.easy   || 0;
  const medium = data?.problemStats?.medium || 0;
  const hard   = data?.problemStats?.hard   || 0;
  const TABS = ['overview','aptitude','coding','activity'];

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(4,44,93,0.6)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'20px 12px', overflowY:'auto' }}
      onClick={onClose}>
      <div style={{ background:'#f8f9fc', borderRadius:20, width:'100%', maxWidth:780, boxShadow:'0 24px 80px rgba(4,44,93,0.3)' }}
        onClick={e=>e.stopPropagation()}>

        {/* Header gradient */}
        <div style={{ background:GRAD, borderRadius:'20px 20px 0 0', padding:'18px 24px', display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:56, height:56, borderRadius:14, background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.5rem', flexShrink:0 }}>
            {s.name?.charAt(0)?.toUpperCase()}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.1rem', color:'#fff' }}>{s.name}</div>
            <div style={{ fontSize:'.75rem', color:'rgba(255,255,255,0.75)', marginTop:2 }}>
              {s.department} · Year {s.year}{s.rollNumber ? ` · ${s.rollNumber}` : ''} ·{' '}
              <span style={{ fontWeight:800, color:'rgba(255,255,255,0.9)' }}>{s.skillLevel||'Beginner'}</span>
            </div>
          </div>
          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.4rem', color:'#fff' }}>{s.totalScore||0}</div>
              <div style={{ fontSize:'.6rem', color:'rgba(255,255,255,0.65)' }}>SCORE</div>
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.4rem', color:'#f59e0b' }}>🔥{s.streak||0}</div>
              <div style={{ fontSize:'.6rem', color:'rgba(255,255,255,0.65)' }}>STREAK</div>
            </div>
            <button onClick={onClose} style={{ width:34, height:34, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.15)', cursor:'pointer', color:'#fff', fontWeight:900, fontSize:'1.1rem', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ background:'#fff', display:'flex', gap:0, borderBottom:'1px solid #e8edf5', padding:'0 24px' }}>
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              style={{ padding:'12px 16px', border:'none', background:'transparent', cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:'.8rem', color:tab===t?'#531697':'#7a8ba8', borderBottom:`2px solid ${tab===t?'#531697':'transparent'}`, transition:'all .15s', textTransform:'capitalize' }}>
              {t==='overview'?'📊 Overview':t==='aptitude'?'🎯 Aptitude':t==='coding'?'💻 Coding':'📅 Activity'}
            </button>
          ))}
        </div>

        <div style={{ padding:'20px 24px', maxHeight:'70vh', overflowY:'auto' }}>
          {loading ? (
            <div style={{ textAlign:'center', padding:40 }}>
              <div style={{ width:36, height:36, border:'3px solid #e8edf5', borderTopColor:'#531697', borderRadius:'50%', animation:'_sp .7s linear infinite', margin:'0 auto 10px' }}/>
              <style>{`@keyframes _sp{to{transform:rotate(360deg)}}`}</style>
              <div style={{ color:'#b0bec9', fontSize:'.82rem' }}>Loading profile…</div>
            </div>
          ) : (
            <>
              {/* ── Overview Tab ── */}
              {tab==='overview' && (
                <div>
                  {/* Quick stat cards */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:18 }}>
                    {[
                      ['ATS Score',   s.atsScore||0,                '#531697', '🎯'],
                      ['Problems',    s.codingProblems||data?.summary?.totalSolved||0, '#13a1a5', '💻'],
                      ['Apt Attempts',data?.summary?.totalApt||s.totalAptAttempts||0,  '#f59e0b', '📝'],
                      ['Accuracy',    `${data?.summary?.accuracy||0}%`,                '#47d372', '✅'],
                    ].map(([l,v,c,ic])=>(
                      <div key={l} style={{ textAlign:'center', padding:'12px 8px', background:'#fff', borderRadius:12, border:'1px solid #e8edf5' }}>
                        <div style={{ fontSize:'1rem', marginBottom:4 }}>{ic}</div>
                        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1rem', color:c }}>{v}</div>
                        <div style={{ fontSize:'.62rem', color:'#b0bec9', fontWeight:700, marginTop:2 }}>{l}</div>
                      </div>
                    ))}
                  </div>

                  {/* Donut + Score breakdown side by side */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
                    <div style={{ background:'#fff', border:'1px solid #e8edf5', borderRadius:14, padding:'16px 18px' }}>
                      <div style={{ fontSize:'.68rem', fontWeight:800, color:'#b0bec9', letterSpacing:'.06em', marginBottom:12 }}>PROBLEMS SOLVED</div>
                      <DonutChart easy={easy} medium={medium} hard={hard}/>
                    </div>
                    <div style={{ background:'#fff', border:'1px solid #e8edf5', borderRadius:14, padding:'16px 18px' }}>
                      <div style={{ fontSize:'.68rem', fontWeight:800, color:'#b0bec9', letterSpacing:'.06em', marginBottom:12 }}>ADDITIONAL INFO</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        {[
                          ['Topics Attempted', s.aptTopics||data?.summary?.topicsAttempted||0],
                          ['Discussions Posted', s.discussions||data?.summary?.discussionCount||0],
                          ['SkillPath Done', (s.hasSkillPath||data?.summary?.hasSkillPath)?'Yes':'No'],
                          ['Rank', `#${s.rank||'N/A'}`],
                        ].map(([l,v])=>(
                          <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #f0f3fa' }}>
                            <span style={{ fontSize:'.75rem', color:'#7a8ba8' }}>{l}</span>
                            <span style={{ fontSize:'.78rem', fontWeight:800, color:'#0f1a2e' }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Social links */}
                  <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
                    {s.linkedinUrl && <a href={s.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ padding:'6px 14px', borderRadius:8, background:'rgba(37,99,235,0.08)', color:'#2563eb', fontWeight:700, fontSize:'.75rem', textDecoration:'none' }}>💼 LinkedIn</a>}
                    {s.githubUrl   && <a href={s.githubUrl}   target="_blank" rel="noopener noreferrer" style={{ padding:'6px 14px', borderRadius:8, background:'rgba(15,26,46,0.06)', color:'#0f1a2e', fontWeight:700, fontSize:'.75rem', textDecoration:'none' }}>🐙 GitHub</a>}
                    {s.portfolioUrl && <a href={s.portfolioUrl} target="_blank" rel="noopener noreferrer" style={{ padding:'6px 14px', borderRadius:8, background:'rgba(83,22,151,0.07)', color:'#531697', fontWeight:700, fontSize:'.75rem', textDecoration:'none' }}>🌐 Portfolio</a>}
                  </div>

                  {/* Score breakdown */}
                  {s.scoreBreakdown && <ScoreBreakdown breakdown={s.scoreBreakdown}/>}
                </div>
              )}

              {/* ── Aptitude Tab ── */}
              {tab==='aptitude' && (
                <div>
                  <div style={{ display:'flex', gap:12, marginBottom:16 }}>
                    {[
                      [`${data?.summary?.correctApt||0}/${data?.summary?.totalApt||0}`, 'Correct/Total', '#531697'],
                      [`${data?.summary?.accuracy||0}%`, 'Accuracy', data?.summary?.accuracy>=70?'#47d372':data?.summary?.accuracy>=45?'#f59e0b':'#ef4444'],
                      [`${data?.summary?.topicsAttempted||0}`, 'Topics', '#13a1a5'],
                    ].map(([v,l,c])=>(
                      <div key={l} style={{ flex:1, textAlign:'center', padding:'12px', background:'#fff', borderRadius:12, border:'1px solid #e8edf5' }}>
                        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.1rem', color:c }}>{v}</div>
                        <div style={{ fontSize:'.65rem', color:'#b0bec9', fontWeight:700 }}>{l}</div>
                      </div>
                    ))}
                  </div>

                  {data?.aptStats?.length > 0 ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {data.aptStats.map(stat=>{
                        const pct = Math.round(stat.accuracy||0);
                        const c = pct>=70?'#47d372':pct>=45?'#f59e0b':'#ef4444';
                        return (
                          <div key={stat.topic} style={{ background:'#fff', borderRadius:10, padding:'12px 14px', border:'1px solid #e8edf5' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                              <div>
                                <span style={{ fontWeight:700, fontSize:'.82rem', color:'#0f1a2e' }}>{stat.topic}</span>
                                <span style={{ fontSize:'.65rem', color:'#b0bec9', marginLeft:8 }}>{stat.total} attempts</span>
                              </div>
                              <span style={{ fontWeight:800, fontSize:'.82rem', color:c }}>{pct}% ({stat.correct}/{stat.total})</span>
                            </div>
                            <div style={{ height:7, background:'#f0f3fa', borderRadius:999, overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${c},#13a1a5)`, borderRadius:999, transition:'width .8s' }}/>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ textAlign:'center', padding:30, color:'#b0bec9', fontSize:'.85rem' }}>
                      <div style={{ fontSize:'2rem', marginBottom:8 }}>📝</div>No aptitude attempts yet
                    </div>
                  )}
                </div>
              )}

              {/* ── Coding Tab ── */}
              {tab==='coding' && (
                <div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
                    <div style={{ background:'#fff', border:'1px solid #e8edf5', borderRadius:14, padding:'16px 18px' }}>
                      <div style={{ fontSize:'.68rem', fontWeight:800, color:'#b0bec9', marginBottom:12 }}>DIFFICULTY BREAKDOWN</div>
                      <DonutChart easy={easy} medium={medium} hard={hard}/>
                    </div>
                    <div style={{ background:'#fff', border:'1px solid #e8edf5', borderRadius:14, padding:'16px 18px' }}>
                      <div style={{ fontSize:'.68rem', fontWeight:800, color:'#b0bec9', marginBottom:12 }}>SUMMARY</div>
                      {[
                        ['Easy Solved',   easy,   '#47d372'],
                        ['Medium Solved', medium, '#f59e0b'],
                        ['Hard Solved',   hard,   '#ef4444'],
                        ['Total Solved',  easy+medium+hard, '#531697'],
                      ].map(([l,v,c])=>(
                        <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #f0f3fa' }}>
                          <span style={{ fontSize:'.75rem', color:'#7a8ba8' }}>{l}</span>
                          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.82rem', color:c }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {data?.codingStats?.filter(s=>s.topic).length > 0 && (
                    <div>
                      <div style={{ fontSize:'.68rem', fontWeight:800, color:'#b0bec9', marginBottom:10 }}>BY TOPIC</div>
                      {data.codingStats.filter(s=>s.topic).map(stat=>{
                        const pct = stat.total ? Math.round((stat.solved/stat.total)*100) : 0;
                        return (
                          <div key={stat.topic} style={{ background:'#fff', borderRadius:10, padding:'10px 14px', border:'1px solid #e8edf5', marginBottom:7 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                              <span style={{ fontWeight:700, fontSize:'.8rem', color:'#0f1a2e' }}>{stat.topic}</span>
                              <span style={{ fontSize:'.75rem', color:'#531697', fontWeight:800 }}>{stat.solved}/{stat.total}</span>
                            </div>
                            <div style={{ height:5, background:'#f0f3fa', borderRadius:999, overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${pct}%`, background:GRAD, borderRadius:999 }}/>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Activity Tab ── */}
              {tab==='activity' && (
                <div>
                  <div style={{ background:'#fff', border:'1px solid #e8edf5', borderRadius:14, padding:'16px 18px', marginBottom:14, overflowX:'auto' }}>
                    <div style={{ fontSize:'.68rem', fontWeight:800, color:'#b0bec9', marginBottom:10 }}>ACTIVITY HEATMAP — PAST YEAR</div>
                    <Heatmap dates={data?.submissionDates||[]}/>
                    <div style={{ fontSize:'.7rem', color:'#b0bec9', marginTop:6 }}>
                      {data?.summary?.totalApt||0} aptitude submissions in the past year
                    </div>
                  </div>

                  {/* Recent activity list */}
                  {data?.recentActivity?.length > 0 && (
                    <div style={{ background:'#fff', border:'1px solid #e8edf5', borderRadius:14, padding:'16px 18px' }}>
                      <div style={{ fontSize:'.68rem', fontWeight:800, color:'#b0bec9', marginBottom:12 }}>RECENT APTITUDE ACTIVITY</div>
                      {data.recentActivity.slice(0,10).map((a,i)=>(
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:i<9?'1px solid #f0f3fa':'none' }}>
                          <span style={{ fontSize:'1rem' }}>{a.correct?'✅':'❌'}</span>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:600, fontSize:'.78rem', color:'#0f1a2e', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {a.questionId?.question || 'Question'}
                            </div>
                            <div style={{ fontSize:'.65rem', color:'#b0bec9' }}>
                              {a.questionId?.topic||a.topic} · {a.questionId?.difficulty||'Medium'}
                            </div>
                          </div>
                          <span style={{ fontSize:'.65rem', color:'#b0bec9', flexShrink:0 }}>
                            {new Date(a.attemptedAt||a.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Faculty Students Page ───────────────────────────────────────────── */
export default function FacultyStudentsPage() {
  const [students, setStudents]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);
  const [search, setSearch]       = useState('');
  const [filterBranch, setFB]     = useState('All');
  const [filterYear, setFY]       = useState('All');
  const [filterSkill, setFS]      = useState('All');
  const [sortBy, setSortBy]       = useState('score');

  const load = useCallback(async () => {
    setLoading(true);
    const d = await apiFetch('/analytics/leaderboard?limit=500');
    setStudents(d?.leaderboard || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const branches = ['All', ...new Set(students.map(s=>s.department).filter(Boolean))].sort();

  const filtered = students
    .filter(s => {
      const q = search.toLowerCase();
      const matchS = !q || s.name?.toLowerCase().includes(q) || s.rollNumber?.toLowerCase().includes(q) || s.department?.toLowerCase().includes(q);
      return matchS &&
        (filterBranch==='All' || s.department===filterBranch) &&
        (filterYear==='All'   || String(s.year)===filterYear) &&
        (filterSkill==='All'  || s.skillLevel===filterSkill);
    })
    .sort((a,b) => {
      if (sortBy==='name')    return (a.name||'').localeCompare(b.name||'');
      if (sortBy==='streak')  return (b.streak||0)-(a.streak||0);
      if (sortBy==='solved')  return (b.codingProblems||0)-(a.codingProblems||0);
      if (sortBy==='apt')     return (b.aptScore||0)-(a.aptScore||0);
      return (b.totalScore||0)-(a.totalScore||0);
    });

  const stats = {
    total:    students.length,
    expert:   students.filter(s=>s.skillLevel==='Expert').length,
    active:   students.filter(s=>(s.streak||0)>=3).length,
    avgScore: students.length ? Math.round(students.reduce((a,s)=>a+(s.totalScore||0),0)/students.length) : 0,
  };

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif" }}>
      {selected && <StudentProfileModal student={selected} onClose={()=>setSelected(null)}/>}

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.5rem', color:'#0f1a2e', margin:0 }}>👥 Students</h1>
        <p style={{ color:'#7a8ba8', marginTop:4, fontSize:'.85rem' }}>View all students, their performance metrics, and detailed profiles</p>
      </div>

      {/* Summary stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          ['Total Students', stats.total,    '#531697', '👥'],
          ['Expert Level',   stats.expert,   '#47d372', '🏆'],
          ['Active (3+ streak)', stats.active, '#f59e0b', '🔥'],
          ['Avg Score',      stats.avgScore, '#13a1a5', '📊'],
        ].map(([l,v,c,ic])=>(
          <div key={l} style={{ background:'#fff', borderRadius:14, border:'1px solid #e8edf5', padding:'16px 18px', boxShadow:'0 2px 8px rgba(4,44,93,0.05)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <span style={{ fontSize:'1.2rem' }}>{ic}</span>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.4rem', color:c }}>{v}</div>
            </div>
            <div style={{ fontSize:'.72rem', color:'#7a8ba8', fontWeight:600 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Name, roll no, branch…"
          style={{ flex:1, minWidth:180, padding:'8px 12px', borderRadius:9, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.82rem', outline:'none' }}/>
        {[
          [filterBranch, setFB, ['All',...branches.filter(b=>b!=='All')]],
          [filterYear,   setFY, ['All','1','2','3','4']],
          [filterSkill,  setFS, ['All','Beginner','Intermediate','Expert']],
        ].map(([val,set,opts],i)=>(
          <select key={i} value={val} onChange={e=>set(e.target.value)}
            style={{ padding:'8px 10px', borderRadius:9, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.78rem', fontWeight:700, background:'#fff', color:'#3d4e6b', cursor:'pointer' }}>
            {opts.map(o=><option key={o} value={o}>{o==='All'?['All Branches','All Years','All Levels'][i]:o==='1'||o==='2'||o==='3'||o==='4'?`Year ${o}`:o}</option>)}
          </select>
        ))}
        {/* Sort */}
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
          style={{ padding:'8px 10px', borderRadius:9, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.78rem', fontWeight:700, background:'#fff', color:'#3d4e6b', cursor:'pointer' }}>
          {[['score','Sort: Score'],['streak','Sort: Streak'],['solved','Sort: Solved'],['apt','Sort: Aptitude'],['name','Sort: Name']].map(([v,l])=>(
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      <div style={{ fontSize:'.72rem', color:'#b0bec9', marginBottom:12, fontWeight:600 }}>
        Showing {filtered.length} of {students.length} students
      </div>

      {/* Student list */}
      {loading ? (
        <div style={{ textAlign:'center', padding:40 }}>
          <div style={{ width:36, height:36, border:'3px solid #e8edf5', borderTopColor:'#531697', borderRadius:'50%', animation:'_sp .7s linear infinite', margin:'0 auto 10px' }}/>
          <style>{`@keyframes _sp{to{transform:rotate(360deg)}}`}</style>
          <div style={{ color:'#b0bec9', fontSize:'.82rem' }}>Loading students…</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:40, background:'#fff', borderRadius:14, border:'1px solid #e8edf5' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:8 }}>🔍</div>
          <div style={{ color:'#7a8ba8', fontSize:'.85rem' }}>No students match this filter</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.map((s,i)=>{
            const sc = SKILL_COL[s.skillLevel]||'#531697';
            const medals = ['🥇','🥈','🥉'];
            const globalRank = students.findIndex(x=>x._id===s._id);
            return (
              <div key={s._id}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'#fff', borderRadius:12, border:'1px solid #f0f3fa', boxShadow:'0 1px 4px rgba(4,44,93,0.04)', cursor:'pointer', transition:'all .15s' }}
                onClick={()=>setSelected(s)}
                onMouseOver={e=>{e.currentTarget.style.borderColor='rgba(83,22,151,0.2)';e.currentTarget.style.boxShadow='0 4px 16px rgba(83,22,151,0.08)';}}
                onMouseOut={e=>{e.currentTarget.style.borderColor='#f0f3fa';e.currentTarget.style.boxShadow='0 1px 4px rgba(4,44,93,0.04)';}}>
                {/* Rank */}
                <div style={{ width:36, textAlign:'center', flexShrink:0 }}>
                  {globalRank<3
                    ? <span style={{ fontSize:'1.1rem' }}>{medals[globalRank]}</span>
                    : <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.78rem', color:'#b0bec9' }}>#{globalRank+1}</span>}
                </div>
                {/* Avatar */}
                <div style={{ width:40, height:40, borderRadius:11, background:`linear-gradient(135deg,${sc},#13a1a5)`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', flexShrink:0 }}>
                  {s.name?.charAt(0)}
                </div>
                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <span style={{ fontWeight:700, fontSize:'.88rem', color:'#0f1a2e' }}>{s.name}</span>
                    <span style={{ padding:'1px 7px', borderRadius:999, background:sc+'18', color:sc, fontSize:'.62rem', fontWeight:800 }}>{s.skillLevel||'Beginner'}</span>
                  </div>
                  <div style={{ fontSize:'.68rem', color:'#b0bec9', marginTop:2 }}>
                    {s.department} · Year {s.year}{s.rollNumber?` · ${s.rollNumber}`:''}
                  </div>
                </div>
                {/* Metrics */}
                <div style={{ display:'flex', gap:16, alignItems:'center', flexShrink:0 }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:'.6rem', color:'#b0bec9', fontWeight:700 }}>STREAK</div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.82rem', color:'#f59e0b' }}>🔥{s.streak||0}d</div>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:'.6rem', color:'#b0bec9', fontWeight:700 }}>APTITUDE</div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.82rem', color:'#13a1a5' }}>{s.aptScore||0}%</div>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:'.6rem', color:'#b0bec9', fontWeight:700 }}>SOLVED</div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.82rem', color:'#531697' }}>{s.codingProblems||0}</div>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:'.6rem', color:'#b0bec9', fontWeight:700 }}>SCORE</div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'.95rem', background:GRAD, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>{s.totalScore||0}</div>
                  </div>
                  <button onClick={e=>{e.stopPropagation();setSelected(s);}}
                    style={{ padding:'7px 14px', borderRadius:9, border:'none', background:GRAD, color:'#fff', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.75rem', whiteSpace:'nowrap' }}>
                    View →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
