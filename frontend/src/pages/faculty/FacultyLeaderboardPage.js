import React, { useState, useEffect, useCallback } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tk  = () => ({ Authorization: `Bearer ${localStorage.getItem('pragati_token')}` });
const apiFetch = p => fetch(`${API}${p}`, { headers: tk() }).then(r => r.json()).catch(() => null);

const GRAD = 'linear-gradient(135deg,#531697,#13a1a5)';
const SKILL_COL = { Beginner:'#f59e0b', Intermediate:'#531697', Expert:'#47d372' };
const MEDALS = ['🥇','🥈','🥉'];

function DeptChart({ students }) {
  const depts = {};
  students.forEach(s => {
    if (!s.department) return;
    if (!depts[s.department]) depts[s.department] = { count:0, totalScore:0 };
    depts[s.department].count++;
    depts[s.department].totalScore += (s.totalScore||0);
  });
  const sorted = Object.entries(depts)
    .map(([d,v])=>({ dept:d, count:v.count, avgScore:Math.round(v.totalScore/v.count) }))
    .sort((a,b)=>b.avgScore-a.avgScore);
  const maxScore = Math.max(1, ...sorted.map(d=>d.avgScore));
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {sorted.map(d=>(
        <div key={d.dept}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
            <span style={{ fontSize:'.75rem', fontWeight:700, color:'#0f1a2e' }}>{d.dept}</span>
            <span style={{ fontSize:'.7rem', color:'#7a8ba8' }}>{d.count} students · avg {d.avgScore}pts</span>
          </div>
          <div style={{ height:8, background:'#f0f3fa', borderRadius:999, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${(d.avgScore/maxScore)*100}%`, background:GRAD, borderRadius:999, transition:'width .6s' }}/>
          </div>
        </div>
      ))}
    </div>
  );
}

function ScoreHistogram({ students }) {
  const buckets = Array.from({length:10},(_,i)=>({
    lo:i*10, hi:(i+1)*10,
    count:students.filter(s=>(s.totalScore||0)>=i*10&&(s.totalScore||0)<(i+1)*10).length
  }));
  const maxCount = Math.max(1,...buckets.map(b=>b.count));
  return (
    <div style={{ display:'flex', gap:4, alignItems:'flex-end', height:80 }}>
      {buckets.map((b,i)=>{
        const h=Math.max(4,(b.count/maxCount)*72);
        const col=b.lo>=70?'#47d372':b.lo>=40?'#f59e0b':'#ef4444';
        return (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
            <div title={`${b.lo}-${b.hi}: ${b.count} students`} style={{ width:'100%', height:h, background:col, borderRadius:4, opacity:.85, transition:'height .5s', cursor:'default' }}/>
            <span style={{ fontSize:'.52rem', color:'#b0bec9' }}>{b.lo}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function FacultyLeaderboardPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [lastUpdated, setLU]    = useState(null);
  const [search, setSearch]     = useState('');
  const [filterBranch, setFB]   = useState('All');
  const [filterYear, setFY]     = useState('All');
  const [sortBy, setSortBy]     = useState('score');
  const [view, setView]         = useState('table');

  const load = useCallback(async () => {
    setLoading(true);
    const d = await apiFetch('/analytics/leaderboard?limit=500');
    setStudents(d?.leaderboard || []);
    setLU(d?.lastUpdated);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

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
      if (sortBy==='solved')  return (b.codingProblems||0)-(a.codingProblems||0);
      if (sortBy==='apt')     return (b.aptScore||0)-(a.aptScore||0);
      return (b.totalScore||0)-(a.totalScore||0);
    });

  const top3 = filtered.slice(0,3);
  const avgScore = students.length ? Math.round(students.reduce((a,s)=>a+(s.totalScore||0),0)/students.length) : 0;
  const topScore = students[0]?.totalScore || 0;
  const activeStudents = students.filter(s=>(s.streak||0)>=1).length;

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif" }}>
      {/* Hero */}
      <div style={{ background:GRAD, borderRadius:18, padding:'22px 26px', marginBottom:20, color:'#fff', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:-30, top:-30, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,0.05)' }}/>
        <div style={{ position:'relative', zIndex:1 }}>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.5rem', margin:'0 0 6px', letterSpacing:'-.02em' }}>🏆 Live Leaderboard</h1>
          <p style={{ margin:0, opacity:.85, fontSize:'.82rem' }}>Dynamic rankings based on aptitude accuracy, coding problems, streak & SkillPath scores</p>
          {lastUpdated && <div style={{ fontSize:'.65rem', opacity:.6, marginTop:4 }}>Last computed: {new Date(lastUpdated).toLocaleString('en-IN')}</div>}
        </div>
        <div style={{ display:'flex', gap:12, marginTop:16, flexWrap:'wrap' }}>
          {[['Total',students.length,'👥'],['Avg Score',avgScore,'📊'],['Top Score',topScore,'🏅'],['Active',activeStudents,'🔥']].map(([l,v,ic])=>(
            <div key={l} style={{ padding:'9px 14px', borderRadius:10, background:'rgba(255,255,255,0.14)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:'1rem' }}>{ic}</span>
                <div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'.95rem' }}>{v}</div>
                  <div style={{ fontSize:'.58rem', opacity:.75 }}>{l}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* View toggle + refresh */}
      <div style={{ display:'flex', gap:8, marginBottom:16, alignItems:'center', flexWrap:'wrap' }}>
        {[['table','📋 Rankings'],['analytics','📊 Analytics']].map(([v,l])=>(
          <button key={v} onClick={()=>setView(v)}
            style={{ padding:'8px 18px', borderRadius:9, border:`1.5px solid ${view===v?'#531697':'#d0d7e8'}`, background:view===v?GRAD:'#fff', color:view===v?'#fff':'#7a8ba8', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.82rem' }}>
            {l}
          </button>
        ))}
        <div style={{ flex:1 }}/>
        <button onClick={load} disabled={loading}
          style={{ padding:'8px 14px', borderRadius:9, border:'1px solid #d0d7e8', background:'#fff', color:'#531697', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.78rem' }}>
          {loading ? '⏳ Loading…' : '🔄 Refresh'}
        </button>
      </div>

      {/* ── ANALYTICS VIEW ── */}
      {view==='analytics' && !loading && (
        <div style={{ display:'grid', gap:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e8edf5', padding:'18px 20px' }}>
              <div style={{ fontSize:'.68rem', fontWeight:800, color:'#b0bec9', letterSpacing:'.06em', marginBottom:14 }}>SCORE DISTRIBUTION</div>
              <ScoreHistogram students={students}/>
              <div style={{ display:'flex', gap:10, marginTop:12, flexWrap:'wrap' }}>
                {[['0–39','At Risk','#ef4444'],['40–69','Average','#f59e0b'],['70+','Good','#47d372']].map(([r,l,c])=>(
                  <div key={r} style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <div style={{ width:9, height:9, borderRadius:3, background:c }}/>
                    <span style={{ fontSize:'.62rem', color:'#7a8ba8' }}>{r} {l}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e8edf5', padding:'18px 20px' }}>
              <div style={{ fontSize:'.68rem', fontWeight:800, color:'#b0bec9', letterSpacing:'.06em', marginBottom:14 }}>DEPT AVG SCORE</div>
              <DeptChart students={students}/>
            </div>
          </div>
          <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e8edf5', padding:'18px 20px' }}>
            <div style={{ fontSize:'.68rem', fontWeight:800, color:'#b0bec9', letterSpacing:'.06em', marginBottom:14 }}>SKILL LEVEL DISTRIBUTION</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
              {['Beginner','Intermediate','Expert'].map(level=>{
                const count = students.filter(s=>s.skillLevel===level).length;
                const pct   = students.length ? Math.round((count/students.length)*100) : 0;
                const col   = SKILL_COL[level]||'#531697';
                return (
                  <div key={level} style={{ textAlign:'center', padding:'14px', borderRadius:12, border:`2px solid ${col}22`, background:`${col}08` }}>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.6rem', color:col }}>{count}</div>
                    <div style={{ fontSize:'.78rem', fontWeight:700, color:'#0f1a2e', margin:'4px 0' }}>{level}</div>
                    <div style={{ fontSize:'.65rem', color:'#b0bec9' }}>{pct}% of students</div>
                    <div style={{ height:5, background:'#f0f3fa', borderRadius:999, marginTop:8, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:col, borderRadius:999 }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e8edf5', padding:'18px 20px' }}>
            <div style={{ fontSize:'.68rem', fontWeight:800, color:'#b0bec9', letterSpacing:'.06em', marginBottom:14 }}>TOP SCORER PER DEPARTMENT</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
              {[...new Set(students.map(s=>s.department).filter(Boolean))].sort().map(dept=>{
                const top = students.filter(s=>s.department===dept)[0];
                if (!top) return null;
                const sc = SKILL_COL[top.skillLevel]||'#531697';
                return (
                  <div key={dept} style={{ padding:'12px 14px', borderRadius:11, border:'1px solid #e8edf5', background:'#fafbff' }}>
                    <div style={{ fontSize:'.62rem', fontWeight:800, color:'#b0bec9', marginBottom:6 }}>{dept}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:32, height:32, borderRadius:9, background:`linear-gradient(135deg,${sc},#13a1a5)`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:'.8rem', flexShrink:0 }}>{top.name?.charAt(0)}</div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:'.78rem', color:'#0f1a2e', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{top.name}</div>
                        <div style={{ fontSize:'.62rem', color:'#b0bec9' }}>Score: <strong style={{ color:sc }}>{top.totalScore}</strong></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── RANKINGS TABLE VIEW ── */}
      {view==='table' && (
        <>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="🔍 Name or roll no…"
              style={{ flex:1, minWidth:180, padding:'8px 12px', borderRadius:9, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.82rem', outline:'none' }}/>
            <select value={filterBranch} onChange={e=>setFB(e.target.value)}
              style={{ padding:'8px 10px', borderRadius:9, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.78rem', fontWeight:700, background:'#fff', color:'#3d4e6b', cursor:'pointer' }}>
              {branches.map(b=><option key={b} value={b}>{b==='All'?'All Branches':b}</option>)}
            </select>
            <select value={filterYear} onChange={e=>setFY(e.target.value)}
              style={{ padding:'8px 10px', borderRadius:9, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.78rem', fontWeight:700, background:'#fff', color:'#3d4e6b', cursor:'pointer' }}>
              {['All','1','2','3','4'].map(y=><option key={y} value={y}>{y==='All'?'All Years':`Year ${y}`}</option>)}
            </select>
            <div style={{ display:'flex', border:'1.5px solid #d0d7e8', borderRadius:9, overflow:'hidden' }}>
              {[['score','🏅 Score'],['streak','🔥 Streak'],['solved','💻 Solved'],['apt','🎯 Apt']].map(([k,l])=>(
                <button key={k} onClick={()=>setSortBy(k)}
                  style={{ padding:'8px 11px', border:'none', background:sortBy===k?GRAD:'#fff', color:sortBy===k?'#fff':'#7a8ba8', fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.72rem' }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div style={{ fontSize:'.7rem', color:'#b0bec9', marginBottom:14, fontWeight:600 }}>
            {filtered.length} students · sorted by {sortBy}
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:40 }}>
              <div style={{ width:36, height:36, border:'3px solid #e8edf5', borderTopColor:'#531697', borderRadius:'50%', animation:'_sp .7s linear infinite', margin:'0 auto 10px' }}/>
              <style>{`@keyframes _sp{to{transform:rotate(360deg)}}`}</style>
              <div style={{ color:'#b0bec9', fontSize:'.82rem' }}>Computing dynamic rankings…</div>
            </div>
          ) : (
            <>
              {/* Podium top-3 */}
              {!search && filterBranch==='All' && filterYear==='All' && sortBy==='score' && top3.length===3 && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1.12fr 1fr', gap:12, marginBottom:18, alignItems:'flex-end' }}>
                  {[top3[1],top3[0],top3[2]].map((s,pi)=>{
                    const actualRank = pi===0?1:pi===1?0:2;
                    const pc = ['#c0c0c0','#f59e0b','#cd7f32'][actualRank];
                    const sc = SKILL_COL[s.skillLevel]||'#531697';
                    return (
                      <div key={s._id} style={{ background:'#fff', borderRadius:16, padding:'16px 12px', textAlign:'center', border:`2px solid ${pc}40`, boxShadow:`0 4px 20px ${pc}20` }}>
                        <div style={{ fontSize:pi===1?'2.2rem':'1.6rem', marginBottom:8 }}>{MEDALS[actualRank]}</div>
                        <div style={{ width:48, height:48, borderRadius:13, background:`linear-gradient(135deg,${sc},#13a1a5)`, margin:'0 auto 10px', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.2rem' }}>
                          {s.name?.charAt(0)}
                        </div>
                        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.85rem', color:'#0f1a2e', marginBottom:3 }}>{s.name?.split(' ')[0]}</div>
                        <div style={{ fontSize:'.63rem', color:'#b0bec9', marginBottom:8 }}>{s.department} · Y{s.year}</div>
                        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.1rem', color:pc }}>{s.totalScore}</div>
                        <div style={{ fontSize:'.58rem', color:'#b0bec9', marginBottom:6 }}>points</div>
                        <div style={{ display:'flex', justifyContent:'center', gap:8, fontSize:'.62rem', color:'#7a8ba8' }}>
                          <span>🔥{s.streak||0}d</span>
                          <span>💻{s.codingProblems||0}</span>
                          <span>🎯{s.aptScore||0}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Table */}
              <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e8edf5', overflow:'hidden' }}>
                <div style={{ display:'grid', gridTemplateColumns:'50px 1fr 90px 72px 72px 72px 80px', padding:'10px 16px', background:'#f8f9fc', borderBottom:'1px solid #e8edf5', fontSize:'.62rem', fontWeight:800, color:'#b0bec9', letterSpacing:'.06em' }}>
                  {['RANK','STUDENT','SCORE','STREAK','SOLVED','APT%','LEVEL'].map((h,i)=>(
                    <div key={h} style={{ textAlign:i>1?'center':'left' }}>{h}</div>
                  ))}
                </div>
                {filtered.map(s=>{
                  const globalRank = students.findIndex(x=>x._id===s._id);
                  const sc = SKILL_COL[s.skillLevel]||'#531697';
                  const aptCol = (s.aptScore||0)>=70?'#47d372':(s.aptScore||0)>=45?'#f59e0b':'#ef4444';
                  return (
                    <div key={s._id}
                      style={{ display:'grid', gridTemplateColumns:'50px 1fr 90px 72px 72px 72px 80px', padding:'11px 16px', borderBottom:'1px solid #f0f3fa', transition:'background .12s', alignItems:'center' }}
                      onMouseOver={e=>e.currentTarget.style.background='#fafbff'}
                      onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                      <div>
                        {globalRank<3
                          ? <span style={{ fontSize:'1rem' }}>{MEDALS[globalRank]}</span>
                          : <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.75rem', color:'#b0bec9' }}>#{globalRank+1}</span>}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:9, minWidth:0 }}>
                        <div style={{ width:34, height:34, borderRadius:9, background:`linear-gradient(135deg,${sc},#13a1a5)`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:'.82rem', flexShrink:0 }}>
                          {s.name?.charAt(0)}
                        </div>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontWeight:700, fontSize:'.82rem', color:'#0f1a2e', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.name}</div>
                          <div style={{ fontSize:'.62rem', color:'#b0bec9' }}>{s.department} · Y{s.year}{s.rollNumber?` · ${s.rollNumber}`:''}</div>
                        </div>
                      </div>
                      <div style={{ textAlign:'center' }}>
                        <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'.9rem', background:GRAD, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>{s.totalScore||0}</span>
                      </div>
                      <div style={{ textAlign:'center' }}>
                        <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.82rem', color:'#f59e0b' }}>🔥{s.streak||0}</span>
                      </div>
                      <div style={{ textAlign:'center' }}>
                        <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.82rem', color:'#13a1a5' }}>{s.codingProblems||0}</span>
                      </div>
                      <div style={{ textAlign:'center' }}>
                        <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.82rem', color:aptCol }}>{s.aptScore||0}%</span>
                      </div>
                      <div style={{ textAlign:'center' }}>
                        <span style={{ padding:'2px 8px', borderRadius:999, background:sc+'18', color:sc, fontSize:'.62rem', fontWeight:800 }}>{s.skillLevel||'Beginner'}</span>
                      </div>
                    </div>
                  );
                })}
                {filtered.length===0 && (
                  <div style={{ textAlign:'center', padding:40, color:'#b0bec9' }}>
                    <div style={{ fontSize:'2rem', marginBottom:8 }}>🔍</div>
                    No students match this filter
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
