import React, { useEffect, useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../../context/AuthContext';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/* ── colour helpers ────────────────────────────────────────────────── */
const IMP_COLOR  = { critical:'#ef4444', important:'#f59e0b', 'nice-to-have':'#7a8ba8' };
const IMP_BG     = { critical:'rgba(239,68,68,0.08)', important:'rgba(245,158,11,0.08)', 'nice-to-have':'rgba(122,139,168,0.08)' };
const DIFF_COLOR = { easy:'#47d372', medium:'#f59e0b', hard:'#ef4444' };
const PHASE_GRAD = ['linear-gradient(135deg,#042c5d,#531697)','linear-gradient(135deg,#531697,#13a1a5)','linear-gradient(135deg,#13a1a5,#47d372)','linear-gradient(135deg,#f59e0b,#ef4444)'];

/* ── ATS ring ──────────────────────────────────────────────────────── */
function AtsRing({ score }) {
  const r=52, c=2*Math.PI*r, pct=Math.min(100,Math.max(0,Number(score)||0));
  const color = pct>=70?'#47d372':pct>=45?'#f59e0b':'#ef4444';
  return (
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center' }}>
      <div style={{ position:'relative',width:140,height:140 }}>
        <svg width={140} height={140} style={{ transform:'rotate(-90deg)' }}>
          <circle cx={70} cy={70} r={r} fill="none" stroke="#f0f3fa" strokeWidth={12}/>
          <circle cx={70} cy={70} r={r} fill="none" stroke={color} strokeWidth={12}
            strokeDasharray={`${c*pct/100} ${c}`} strokeLinecap="round"
            style={{ transition:'stroke-dasharray 1.4s cubic-bezier(.4,0,.2,1)' }}/>
        </svg>
        <div style={{ position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center' }}>
          <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'2rem',color,lineHeight:1 }}>{pct}</div>
          <div style={{ fontSize:'.7rem',color:'#7a8ba8',fontWeight:700 }}>/100</div>
        </div>
      </div>
      <div style={{ fontSize:'.78rem',fontWeight:700,color,marginTop:6 }}>
        {pct>=70?'✅ Strong ATS':pct>=45?'⚠️ Needs Work':'❌ Low Match'}
      </div>
    </div>
  );
}

/* ── Progress bar ──────────────────────────────────────────────────── */
function Bar({ label, val, max=100, color }) {
  const pct = Math.min(100,Math.round((val/max)*100));
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:'flex',justifyContent:'space-between',fontSize:'.75rem',fontWeight:700,color:'#3d4e6b',marginBottom:4 }}>
        <span>{label}</span><span style={{ color }}>{val}/{max}</span>
      </div>
      <div style={{ height:8,background:'#f0f3fa',borderRadius:999 }}>
        <div style={{ height:'100%',width:`${pct}%`,background:color,borderRadius:999,transition:'width 1s' }}/>
      </div>
    </div>
  );
}

/* ── File dropzone ─────────────────────────────────────────────────── */
function FileZone({ label, icon, file, onFile, accept, hint }) {
  const onDrop = useCallback(acc => { if(acc[0]) onFile(acc[0]); },[onFile]);
  const { getRootProps,getInputProps,isDragActive } = useDropzone({ onDrop,accept,multiple:false });
  return (
    <div {...getRootProps()} style={{ border:`2px dashed ${isDragActive?'#13a1a5':file?'#47d372':'#d0d7e8'}`,borderRadius:12,padding:'16px',textAlign:'center',cursor:'pointer',background:file?'rgba(71,211,114,0.04)':isDragActive?'rgba(19,161,165,0.04)':'#fafbff',transition:'all .2s',minHeight:90 }}>
      <input {...getInputProps()}/>
      <div style={{ fontSize:'1.4rem',marginBottom:4 }}>{file?'✅':icon}</div>
      <div style={{ fontSize:'.8rem',fontWeight:700,color:file?'#2ea854':'#7a8ba8' }}>{file?file.name:label}</div>
      <div style={{ fontSize:'.7rem',color:'#b0bec9',marginTop:2 }}>{hint}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/*  ANALYSIS RESULTS VIEW                                               */
/* ─────────────────────────────────────────────────────────────────── */
function AnalysisResults({ dbResult, full, onNewAnalysis }) {
  const [tab, setTab] = useState('overview'); // overview | gaps | pathway

  /* resolve fields from both DB result and full ML response */
  const ats       = Number(dbResult?.atsScore       ?? full?.ats_score       ?? 0);
  const eligPct   = Number(dbResult?.eligibilityPercent ?? full?.eligibility_percent ?? full?.overall_readiness_score ?? 0);
  const level     = dbResult?.proficiencyLevel       ?? full?.proficiency_level   ?? 'Beginner';
  const jobTitle  = dbResult?.jobTitle               ?? full?.target_role         ?? 'Job Analysis';
  const name      = full?.candidate_name             ?? '';
  const atsBreak  = dbResult?.atsBreakdown           ?? full?.ats_breakdown       ?? {};
  const parsed    = dbResult?.parsedSkills           ?? full?.parsed_skills       ?? [];
  const recs      = dbResult?.recommendations        ?? full?.recommendations     ?? [];

  /* Confidence score — logically tied to ATS score:
     - Low ATS → low confidence (candidate not ready)
     - High ATS → high confidence
     Formula: confidencePct = weighted blend of ATS (70%) + eligibility (30%)
     This ensures confidence cannot be high when ATS is low */
  const confidencePct = Math.round(ats * 0.7 + eligPct * 0.3);
  const confidenceLabel = confidencePct >= 70 ? 'Strong Match — Apply with confidence! ✅'
    : confidencePct >= 45 ? 'Partial Match — Focus on skill gaps ⚠️'
    : 'Below Threshold — Build skills first 📚';
  const confidenceColor = confidencePct >= 70 ? '#166534' : confidencePct >= 45 ? '#92400e' : '#991b1b';
  const confidenceBg    = confidencePct >= 70 ? 'rgba(71,211,114,0.1)' : confidencePct >= 45 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.08)';

  /* skill gap — two formats: new fullAnalysis has richSkillGaps with importance */
  const richGaps   = full?.skill_gaps ?? [];       // [{skill,current_level,required_level,gap_score,importance,category}]
  const dbGap      = dbResult?.skillGapAnalysis    ?? {};
  // Build matched set — from DB or ML response (normalise to lowercase for comparison)
  const rawMatched = dbGap?.matchedSkills ?? full?.strengths ?? [];
  // Build missing set — from richGaps (importance-ranked) or DB
  const rawMissing = richGaps.length > 0
    ? richGaps.map(g=>g.skill)
    : (dbGap?.missingSkills ?? []);
  // Deduplicate: a skill cannot appear in both matched AND missing
  // If it appears in missing (gap), remove it from matched — gap takes precedence
  const missingSet = new Set(rawMissing.map(s=>(s||'').toLowerCase()));
  const matched    = rawMatched.filter(s => !missingSet.has((s||'').toLowerCase()));
  const missing    = rawMissing;
  const weakAreas  = dbGap?.weakAreas ?? [];

  /* learning pathway */
  const pathway    = full?.learning_pathway        ?? [];
  const totalWeeks = full?.estimated_total_weeks   ?? 0;
  const trace      = full?.reasoning_trace         ?? null;

  const analyzeDate = new Date(dbResult?.analyzedAt||dbResult?.createdAt||Date.now()).toLocaleDateString('en-IN',{ day:'numeric',month:'short',year:'numeric' });
  const levelColor  = { Beginner:'#f59e0b',Intermediate:'#531697',Expert:'#47d372' };

  const TABS = [
    { id:'overview', label:'📊 Overview' },
    { id:'gaps',     label:`🔍 Skill Gaps ${richGaps.length?`(${richGaps.length})`:''}` },
    { id:'pathway',  label:`🗺️ Learning Path ${pathway.length?`(${pathway.length} phases)`:''}` },
  ];

  return (
    <div>
      {/* Banner */}
      <div style={{ background:'linear-gradient(135deg,#042c5d,#531697)',borderRadius:16,padding:'18px 24px',marginBottom:18,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12 }}>
        <div>
          <div style={{ color:'rgba(255,255,255,.6)',fontSize:'.72rem',fontWeight:700,marginBottom:3 }}>ANALYSIS RESULT · {analyzeDate}</div>
          <div style={{ color:'#fff',fontWeight:800,fontSize:'1.1rem' }}>{jobTitle}</div>
          {name && <div style={{ color:'rgba(255,255,255,.55)',fontSize:'.75rem',marginTop:2 }}>Candidate: {name}</div>}
        </div>
        <div style={{ display:'flex',gap:18,flexWrap:'wrap' }}>
          {[['🎯','ATS',`${ats}/100`],['📊','Eligibility',`${eligPct}%`],['⭐','Level',level],['💡','Skills',parsed.length||'—']].map(([ic,l,v])=>(
            <div key={l} style={{ textAlign:'center' }}>
              <div>{ic}</div>
              <div style={{ color:'rgba(255,255,255,.6)',fontSize:'.65rem',fontWeight:700 }}>{l}</div>
              <div style={{ color:'#fff',fontWeight:800,fontSize:'.9rem' }}>{v}</div>
            </div>
          ))}
        </div>
        <button onClick={onNewAnalysis} style={{ padding:'8px 16px',borderRadius:10,border:'1px solid rgba(255,255,255,0.25)',background:'rgba(255,255,255,0.08)',color:'#fff',fontWeight:700,cursor:'pointer',fontSize:'.8rem',fontFamily:"'Nunito',sans-serif" }}>
          🔄 New Analysis
        </button>
      </div>

      {/* Tab nav */}
      <div style={{ display:'flex',gap:6,marginBottom:16,borderBottom:'1px solid #e8edf5' }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:'9px 18px',borderRadius:'10px 10px 0 0',border:'none',borderBottom: tab===t.id?'2px solid #531697':'2px solid transparent',background: tab===t.id?'rgba(83,22,151,0.06)':'transparent',color: tab===t.id?'#531697':'#7a8ba8',fontWeight:700,cursor:'pointer',fontSize:'.85rem',fontFamily:"'Nunito',sans-serif" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab==='overview' && (
        <div>
          <div style={{ display:'grid',gridTemplateColumns:'180px 1fr',gap:14,marginBottom:14 }}>
            {/* ATS ring */}
            <div className="card" style={{ padding:'22px 12px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center' }}>
              <AtsRing score={ats}/>
            </div>
            {/* ATS breakdown */}
            <div className="card" style={{ padding:'20px 22px' }}>
              <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'.9rem',marginBottom:14,color:'#0f1a2e' }}>📊 ATS Breakdown</div>
              {(() => {
                /* atsBreak can be:
                   a) Full ML object: {breakdown:{keyword_match:{score,max,label},...}, grade, keyword_hit_rate, ...}
                   b) Flat DB object: {structure,keywords,skills,projects} (old schema)
                   c) Empty {} — show proportional bars from ATS score
                */
                const breakdown = atsBreak?.breakdown || {};
                const hasBreakdown = Object.keys(breakdown).length > 0;

                if (hasBreakdown) {
                  const BAR_COLORS = ['linear-gradient(90deg,#531697,#13a1a5)','linear-gradient(90deg,#13a1a5,#47d372)','linear-gradient(90deg,#f59e0b,#13a1a5)','linear-gradient(90deg,#6366f1,#531697)','linear-gradient(90deg,#ec4899,#f59e0b)'];
                  return (
                    <>
                      {Object.entries(breakdown).map(([k,v],i) => (
                        <Bar key={k}
                          label={v?.label || k.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}
                          val={typeof v==='object' ? (v.score||0) : Math.round(Number(v)||0)}
                          max={typeof v==='object' ? (v.max||10) : 10}
                          color={BAR_COLORS[i%BAR_COLORS.length]}/>
                      ))}
                      {/* Extra detail rows */}
                      {atsBreak.grade && <div style={{ marginTop:12, padding:'8px 12px', borderRadius:8, background:'rgba(83,22,151,0.05)', fontSize:'.78rem', color:'#531697', fontWeight:700 }}>Grade: {atsBreak.grade} · Keyword hit rate: {atsBreak.keyword_hit_rate||0}% · Words: {atsBreak.word_count||0}</div>}
                      {(atsBreak.tips||[]).length>0 && (
                        <div style={{ marginTop:10 }}>
                          <div style={{ fontSize:'.72rem', fontWeight:700, color:'#92400e', marginBottom:5 }}>💡 ATS Tips</div>
                          {(atsBreak.tips||[]).map((t,i)=>(<div key={i} style={{ fontSize:'.73rem', color:'#7a8ba8', marginBottom:3 }}>• {t}</div>))}
                        </div>
                      )}
                      {(atsBreak.missing_critical||[]).length>0 && (
                        <div style={{ marginTop:8, padding:'7px 10px', borderRadius:8, background:'rgba(239,68,68,0.05)', border:'1px solid rgba(239,68,68,0.15)', fontSize:'.72rem' }}>
                          <span style={{ fontWeight:700, color:'#991b1b' }}>🔴 Missing Critical: </span>
                          <span style={{ color:'#7a8ba8' }}>{(atsBreak.missing_critical||[]).join(', ')}</span>
                        </div>
                      )}
                      {(atsBreak.matched_keywords||[]).length>0 && (
                        <div style={{ marginTop:6, fontSize:'.7rem', color:'#166534', fontWeight:600 }}>
                          ✅ Matched: {(atsBreak.matched_keywords||[]).slice(0,8).join(', ')}{(atsBreak.matched_keywords||[]).length>8?'…':''}
                        </div>
                      )}
                    </>
                  );
                }
                // Fallback: proportional bars from total ATS score
                return (
                  <>
                    <Bar label="Keyword Match" val={Math.round(ats*0.35)} max={35} color="linear-gradient(90deg,#531697,#13a1a5)"/>
                    <Bar label="Section Structure" val={Math.round(ats*0.25)} max={25} color="linear-gradient(90deg,#13a1a5,#47d372)"/>
                    <Bar label="Quantified Achievements" val={Math.round(ats*0.20)} max={20} color="linear-gradient(90deg,#f59e0b,#13a1a5)"/>
                    <Bar label="Action Verb Usage" val={Math.round(ats*0.10)} max={10} color="linear-gradient(90deg,#6366f1,#531697)"/>
                    <Bar label="Length & Density" val={Math.round(ats*0.10)} max={10} color="linear-gradient(90deg,#ec4899,#f59e0b)"/>
                    <div style={{ marginTop:8, fontSize:'.72rem', color:'#b0bec9' }}>
                      Re-run analysis to get detailed per-section breakdown.
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
            {/* Confidence Score — derived from ATS */}
            <div className="card" style={{ padding:'20px 22px' }}>
              <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'.9rem',marginBottom:14,color:'#0f1a2e' }}>🎯 Confidence Score</div>
              <div style={{ textAlign:'center',padding:'8px 0 12px' }}>
                <div style={{ fontSize:'3rem',fontWeight:800,fontFamily:"'Syne',sans-serif",color:confidenceColor,lineHeight:1 }}>{confidencePct}%</div>
                <div style={{ fontSize:'.72rem',color:'#7a8ba8',marginTop:2 }}>ATS {ats}/100 × 70% + Eligibility {eligPct}% × 30%</div>
                <div style={{ margin:'12px auto 0',padding:'7px 14px',borderRadius:8,background:confidenceBg,display:'inline-block',fontSize:'.8rem',fontWeight:700,color:confidenceColor }}>
                  {confidenceLabel}
                </div>
              </div>
              <div style={{ height:8,background:'#f0f3fa',borderRadius:999,marginTop:8 }}>
                <div style={{ height:'100%',width:`${confidencePct}%`,background:`linear-gradient(90deg,${confidencePct>=70?'#13a1a5,#47d372':confidencePct>=45?'#f59e0b,#13a1a5':'#ef4444,#f59e0b'})`,borderRadius:999,transition:'width 1.4s' }}/>
              </div>
            </div>

            {/* Your skills */}
            <div className="card" style={{ padding:'20px 22px' }}>
              <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'.9rem',marginBottom:12,color:'#0f1a2e' }}>💡 Skills Found ({parsed.length})</div>
              <div style={{ display:'flex',flexWrap:'wrap',gap:4,maxHeight:140,overflowY:'auto' }}>
                {parsed.slice(0,24).map(s=>(
                  <span key={s} style={{ padding:'3px 8px',borderRadius:999,background:'rgba(83,22,151,0.07)',color:'#531697',fontSize:'.7rem',fontWeight:700,border:'1px solid rgba(83,22,151,0.12)' }}>{s}</span>
                ))}
                {parsed.length===0 && <span style={{ color:'#b0bec9',fontSize:'.82rem' }}>No skills extracted</span>}
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {recs.length>0 && (
            <div className="card" style={{ padding:'20px 22px' }}>
              <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'.9rem',marginBottom:14,color:'#0f1a2e' }}>🎯 Personalised Recommendations</div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:10 }}>
                {recs.slice(0,6).map((r,i)=>(
                  <div key={i} style={{ padding:'11px 13px',background:'linear-gradient(135deg,rgba(83,22,151,0.04),rgba(19,161,165,0.04))',borderRadius:10,border:'1px solid rgba(83,22,151,0.08)',fontSize:'.8rem',color:'#3d4e6b',lineHeight:1.55 }}>
                    💡 {typeof r==='string'?r:r.skill?`Build ${r.skill} (${r.priority||'medium'} priority) — ${r.resource||'see resources'}`:JSON.stringify(r)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SKILL GAPS TAB ── */}
      {tab==='gaps' && (
        <div>
          {/* Matched skills */}
          {matched.length>0 && (
            <div className="card" style={{ padding:'18px 20px',marginBottom:14 }}>
              <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'.9rem',marginBottom:12,color:'#166534' }}>✅ Matched Skills ({matched.length})</div>
              <div style={{ display:'flex',flexWrap:'wrap',gap:5 }}>
                {matched.map(s=>(
                  <span key={s} style={{ padding:'4px 10px',borderRadius:999,background:'rgba(71,211,114,0.1)',color:'#166534',fontSize:'.75rem',fontWeight:700,border:'1px solid rgba(71,211,114,0.25)' }}>✓ {s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Rich skill gaps with importance */}
          {richGaps.length>0 ? (
            <div>
              {['critical','important','nice-to-have'].map(imp=>{
                // Remove gaps whose skill is also in matched (deduplicate)
                const gs = richGaps.filter(g=>g.importance===imp && !rawMatched.some(m=>(m||'').toLowerCase()===(g.skill||'').toLowerCase()));
                if(!gs.length) return null;
                return (
                  <div key={imp} className="card" style={{ padding:'18px 20px',marginBottom:14 }}>
                    <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'.88rem',marginBottom:12,color:IMP_COLOR[imp]||'#531697',display:'flex',alignItems:'center',gap:8 }}>
                      {imp==='critical'?'🔴':imp==='important'?'🟡':'🔵'} {imp.charAt(0).toUpperCase()+imp.slice(1)} Gaps ({gs.length})
                    </div>
                    <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:10 }}>
                      {gs.map(g=>(
                        <div key={g.skill} style={{ padding:'12px 14px',borderRadius:10,background:IMP_BG[g.importance]||IMP_BG['nice-to-have'],border:`1px solid ${IMP_COLOR[g.importance]||'#531697'}30` }}>
                          <div style={{ fontWeight:800,fontSize:'.85rem',color:'#0f1a2e',marginBottom:5 }}>{g.skill}</div>
                          <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                            <span style={{ fontSize:'.68rem',fontWeight:700,color:'#7a8ba8' }}>Current: <span style={{ color:'#531697' }}>{g.current_level||'none'}</span></span>
                            <span style={{ fontSize:'.68rem',color:'#b0bec9' }}>→</span>
                            <span style={{ fontSize:'.68rem',fontWeight:700,color:'#7a8ba8' }}>Required: <span style={{ color:'#0d7a7e' }}>{g.required_level||'intermediate'}</span></span>
                          </div>
                          <div style={{ marginTop:6,height:5,background:'#f0f3fa',borderRadius:999 }}>
                            <div style={{ height:'100%',width:`${Math.min(100,(g.gap_score||0)*10)}%`,background:IMP_COLOR[g.importance]||'#531697',borderRadius:999 }}/>
                          </div>
                          {g.category && <div style={{ fontSize:'.65rem',color:'#b0bec9',marginTop:4 }}>{g.category}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Fallback to simple missing/weak */
            <div>
              {missing.length>0 && (
                <div className="card" style={{ padding:'18px 20px',marginBottom:14 }}>
                  <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'.9rem',marginBottom:12,color:'#991b1b' }}>❌ Missing Skills ({missing.length})</div>
                  <div style={{ display:'flex',flexWrap:'wrap',gap:5 }}>
                    {missing.map(s=><span key={s} style={{ padding:'4px 10px',borderRadius:999,background:'rgba(239,68,68,0.08)',color:'#991b1b',fontSize:'.75rem',fontWeight:700,border:'1px solid rgba(239,68,68,0.2)' }}>✗ {s}</span>)}
                  </div>
                </div>
              )}
              {weakAreas.length>0 && (
                <div className="card" style={{ padding:'18px 20px',marginBottom:14 }}>
                  <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'.9rem',marginBottom:12,color:'#92400e' }}>⚠️ Weak Areas ({weakAreas.length})</div>
                  <div style={{ display:'flex',flexWrap:'wrap',gap:5 }}>
                    {weakAreas.map(s=><span key={s} style={{ padding:'4px 10px',borderRadius:999,background:'rgba(245,158,11,0.08)',color:'#92400e',fontSize:'.75rem',fontWeight:700,border:'1px solid rgba(245,158,11,0.2)' }}>⚠ {s}</span>)}
                  </div>
                </div>
              )}
              {!missing.length&&!weakAreas.length&&<div style={{ textAlign:'center',padding:'40px',color:'#b0bec9' }}>No skill gaps detected 🎉</div>}
            </div>
          )}

          {/* Reasoning trace */}
          {trace && (
            <div className="card" style={{ padding:'18px 20px',marginTop:6 }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
                <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'.88rem',color:'#3d4e6b' }}>🔬 ML Analysis Methodology v2</div>
                {trace.ml_confidence !== undefined && (
                  <span style={{ padding:'4px 10px',borderRadius:999,background:'rgba(83,22,151,0.08)',color:'#531697',fontSize:'.72rem',fontWeight:700 }}>
                    🎯 Confidence: {Math.round((trace.ml_confidence||0)*100)}%
                  </span>
                )}
              </div>
              {full?.dominant_cluster && (
                <div style={{ marginBottom:12,padding:'8px 12px',borderRadius:8,background:'rgba(19,161,165,0.07)',border:'1px solid rgba(19,161,165,0.15)',fontSize:'.78rem',color:'#0f766e',fontWeight:600 }}>
                  🧠 Dominant Skill Cluster: <strong>{full.dominant_cluster}</strong>
                </div>
              )}
              {trace.top_skills_by_market_demand && trace.top_skills_by_market_demand.length > 0 && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:'.72rem',fontWeight:700,color:'#0369a1',marginBottom:6 }}>📈 Top Gap Skills by Market Demand (Indian JDs)</div>
                  <div style={{ display:'flex',flexWrap:'wrap',gap:5 }}>
                    {trace.top_skills_by_market_demand.map(s=>(
                      <span key={s.skill} style={{ padding:'3px 9px',borderRadius:999,background:'#e0f2fe',color:'#0369a1',fontSize:'.7rem',fontWeight:700 }}>
                        {s.skill} — {Math.round(s.market_demand*100)}%
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {Object.entries(trace).filter(([k])=>!['top_skills_by_market_demand','ml_confidence'].includes(k)).map(([k,v])=>(
                typeof v === 'string' && (
                  <div key={k} style={{ marginBottom:10 }}>
                    <div style={{ fontSize:'.72rem',fontWeight:700,color:'#531697',marginBottom:3,textTransform:'capitalize' }}>{k.replace(/_/g,' ')}</div>
                    <div style={{ fontSize:'.78rem',color:'#7a8ba8',lineHeight:1.6 }}>{v}</div>
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── LEARNING PATHWAY TAB ── */}
      {tab==='pathway' && (
        <div>
          {pathway.length>0 ? (
            <>
              <div style={{ marginBottom:14,padding:'12px 16px',background:'rgba(83,22,151,0.06)',border:'1px solid rgba(83,22,151,0.12)',borderRadius:10,fontSize:'.82rem',color:'#531697',fontWeight:600 }}>
                🗺️ Personalised learning pathway · {pathway.length} phases · ~{totalWeeks} weeks total
              </div>
              {pathway.map((phase,pi)=>(
                <div key={phase.phase} className="card" style={{ padding:'20px 22px',marginBottom:14 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:14 }}>
                    <div style={{ width:36,height:36,borderRadius:'50%',background:PHASE_GRAD[pi%4],display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:'.9rem',flexShrink:0 }}>{phase.phase}</div>
                    <div>
                      <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'1rem',color:'#0f1a2e' }}>{phase.phase_name}</div>
                      <div style={{ fontSize:'.75rem',color:'#7a8ba8' }}>
                        {phase.duration_weeks} week{phase.duration_weeks!==1?'s':''} · {phase.modules?.length||0} module{(phase.modules?.length||0)!==1?'s':''}
                        {phase.total_hours && ` · ${phase.total_hours}h total`}
                        {phase.avg_confidence !== undefined && (
                          <span style={{ marginLeft:8,color:'#6b21a8',fontWeight:700 }}>
                            🎯 {Math.round(phase.avg_confidence*100)}% confidence
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {phase.description && <div style={{ fontSize:'.82rem',color:'#7a8ba8',marginBottom:14,lineHeight:1.6 }}>{phase.description}</div>}
                  <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:10 }}>
                    {(phase.modules||[]).map(mod=>(
                      <div key={mod.id||mod.skill_addressed} style={{ padding:'14px 14px',borderRadius:10,background:'#fafbff',border:'1px solid #e8edf5' }}>
                        <div style={{ display:'flex',alignItems:'flex-start',gap:8,marginBottom:8 }}>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ fontWeight:700,fontSize:'.85rem',color:'#0f1a2e',lineHeight:1.3 }}>{mod.title||mod.skill_addressed}</div>
                            <div style={{ fontSize:'.7rem',color:'#7a8ba8',marginTop:2 }}>{mod.type||'course'} · {mod.estimated_hours||10}h</div>
                          </div>
                          {mod.importance && <span style={{ padding:'2px 7px',borderRadius:999,background:IMP_BG[mod.importance]||IMP_BG['nice-to-have'],color:IMP_COLOR[mod.importance]||'#7a8ba8',fontSize:'.65rem',fontWeight:700,flexShrink:0 }}>{mod.importance}</span>}
                        </div>
                        {(mod.learning_outcomes||[]).slice(0,2).map((o,i)=>(
                          <div key={i} style={{ fontSize:'.72rem',color:'#7a8ba8',marginBottom:2 }}>• {o}</div>
                        ))}
                        {(mod.resources||[]).slice(0,1).map(res=>(
                          <div key={res.url} style={{ marginTop:8 }}>
                            <a href={res.url||'#'} target="_blank" rel="noreferrer"
                              style={{ display:'inline-flex',alignItems:'center',gap:4,padding:'4px 10px',borderRadius:7,background:'rgba(83,22,151,0.08)',color:'#531697',fontSize:'.72rem',fontWeight:700,textDecoration:'none',border:'1px solid rgba(83,22,151,0.15)' }}>
                              🔗 {res.name||'View Resource'} {res.free?'(Free)':''}
                            </a>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div style={{ textAlign:'center',padding:'60px 0' }}>
              <div style={{ fontSize:'3rem',marginBottom:12 }}>🗺️</div>
              <div style={{ color:'#b0bec9',fontWeight:700 }}>No pathway available</div>
              <div style={{ color:'#b0bec9',fontSize:'.82rem',marginTop:4 }}>Run a new analysis to generate your personalised learning pathway</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/*  UPLOAD FORM                                                          */
/* ─────────────────────────────────────────────────────────────────── */
function UploadForm({ user, onResult }) {
  const [resume, setResume] = useState(null);
  const [jdText, setJdText] = useState('');
  const [jdFile, setJdFile] = useState(null);
  const [jdMode, setJdMode] = useState('text');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  async function handleAnalyze() {
    const hasJD = jdMode==='text' ? jdText.trim().length>=10 : !!jdFile;
    if(!hasJD){ setError(jdMode==='text'?'Please paste a job description (at least 10 characters)':'Please upload a JD PDF'); return; }
    // resume is optional — backend will use saved resumeUrl if none provided
    setAnalyzing(true); setError('');
    try {
      const fd = new FormData();
      if(resume) fd.append('resume', resume);
      if(jdMode==='text') fd.append('jdText', jdText);
      else if(jdFile) fd.append('jdFile', jdFile);
      const token = localStorage.getItem('pragati_token');
      const res = await fetch(`${API}/skillpath/analyze`, { method:'POST', headers:{ Authorization:`Bearer ${token}` }, body:fd });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error||'Analysis failed');
      onResult(data);
    } catch(e){ setError(e.message); }
    finally { setAnalyzing(false); }
  }

  return (
    <div className="card" style={{ padding:'24px 24px',marginBottom:20,position:'relative' }}>
      <div style={{ position:'absolute',top:0,left:'8%',right:'8%',height:3,borderRadius:'0 0 3px 3px',background:'linear-gradient(90deg,#042c5d,#531697,#13a1a5)' }}/>
      <div style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'1rem',marginBottom:16,color:'#0f1a2e' }}>📤 Analyze My Resume</div>

      {user?.resumeUrl && !resume && (
        <div style={{ marginBottom:12,padding:'9px 14px',background:'rgba(71,211,114,0.06)',border:'1px solid rgba(71,211,114,0.2)',borderRadius:8,fontSize:'.8rem',color:'#166534',fontWeight:600 }}>
          ✅ Your saved resume will be used automatically. Upload a new PDF to override.
        </div>
      )}

      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16 }}>
        <div>
          <div style={{ fontSize:'.78rem',fontWeight:700,color:'#3d4e6b',marginBottom:6,fontFamily:"'Syne',sans-serif" }}>
            Resume <span style={{ color:'#b0bec9',fontWeight:500 }}>(PDF — optional if already saved)</span>
          </div>
          <FileZone label="Drop resume here" icon="📄" file={resume} onFile={setResume}
            accept={{ 'application/pdf':['.pdf'],'application/vnd.openxmlformats-officedocument.wordprocessingml.document':['.docx'] }}
            hint="PDF format recommended"/>
        </div>
        <div>
          <div style={{ fontSize:'.78rem',fontWeight:700,color:'#3d4e6b',marginBottom:6,fontFamily:"'Syne',sans-serif" }}>
            Job Description <span style={{ color:'#ef4444' }}>*</span>
          </div>
          <div style={{ display:'flex',gap:6,marginBottom:8 }}>
            {[['text','✏️ Paste Text'],['file','📄 PDF Upload']].map(([m,l])=>(
              <button key={m} onClick={()=>setJdMode(m)} type="button" style={{ flex:1,padding:'6px',borderRadius:7,border:`1.5px solid ${jdMode===m?'#531697':'#d0d7e8'}`,background:jdMode===m?'rgba(83,22,151,0.06)':'transparent',color:jdMode===m?'#531697':'#7a8ba8',fontWeight:700,cursor:'pointer',fontSize:'.75rem',fontFamily:"'Nunito',sans-serif" }}>{l}</button>
            ))}
          </div>
          {jdMode==='text' ? (
            <textarea value={jdText} onChange={e=>setJdText(e.target.value)}
              placeholder="Paste the full job description here — include required skills, experience, responsibilities..."
              style={{ width:'100%',height:100,padding:'10px 12px',borderRadius:10,border:'1.5px solid #d0d7e8',fontFamily:"'Nunito',sans-serif",fontSize:'.85rem',resize:'none',outline:'none',color:'#0f1a2e',background:'#fafbff' }}/>
          ) : (
            <FileZone label="Drop JD PDF here" icon="📋" file={jdFile} onFile={setJdFile}
              accept={{ 'application/pdf':['.pdf'] }} hint="PDF job description"/>
          )}
        </div>
      </div>

      {error && <div style={{ background:'#fee2e2',color:'#991b1b',padding:'9px 12px',borderRadius:8,fontSize:'.82rem',fontWeight:600,marginBottom:12 }}>{error}</div>}

      <button onClick={handleAnalyze} disabled={analyzing}
        style={{ width:'100%',padding:'13px',borderRadius:10,border:'none',background:analyzing?'#d0d7e8':'linear-gradient(135deg,#531697,#13a1a5)',color:'#fff',fontWeight:800,fontSize:'.95rem',cursor:analyzing?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,fontFamily:"'Nunito',sans-serif" }}>
        {analyzing?<><span style={{ width:18,height:18,border:'2.5px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'_sp .7s linear infinite',display:'inline-block' }}/>Analyzing…</>:'⚡ Analyze My Skills'}
      </button>
      <style>{`@keyframes _sp{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/*  MAIN MODULE                                                          */
/* ─────────────────────────────────────────────────────────────────── */
export default function SkillPathModule() {
  const { user, setUser } = useAuth();
  const [dbResult, setDbResult]   = useState(null);
  const [fullData, setFullData]   = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('pragati_token');
    // Restore persisted full analysis from localStorage
    try {
      const stored = localStorage.getItem('pragati_last_full_analysis');
      if(stored) setFullData(JSON.parse(stored));
    } catch(e){}
    fetch(`${API}/skillpath/latest`, { headers:{ Authorization:`Bearer ${token}` } })
      .then(r=>r.json())
      .then(d => {
        if(d?.result) { setDbResult(d.result); setShowUpload(false); }
        else           { setShowUpload(true); }
      })
      .catch(()=>setShowUpload(true))
      .finally(()=>setLoading(false));
  }, []);

  function handleResult(data) {
    // data = { result: dbResult, fullAnalysis: mlData }
    setDbResult(data.result);
    setFullData(data.fullAnalysis);
    setShowUpload(false);
    // Persist fullAnalysis so learning pathway survives page refresh
    try { localStorage.setItem('pragati_last_full_analysis', JSON.stringify(data.fullAnalysis)); } catch(e){}
    // Refresh user so dashboard cards update
    const token = localStorage.getItem('pragati_token');
    fetch(`${API}/auth/me`, { headers:{ Authorization:`Bearer ${token}` } })
      .then(r=>r.json()).then(d=>{ if(d.user&&setUser) setUser(d.user); }).catch(()=>{});
  }

  if(loading) return (
    <div style={{ display:'flex',justifyContent:'center',padding:60 }}>
      <div style={{ width:36,height:36,border:'3px solid #e8edf5',borderTopColor:'#531697',borderRadius:'50%',animation:'_spL .7s linear infinite' }}/>
      <style>{`@keyframes _spL{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif" }}>
      <div style={{ marginBottom:22 }}>
        <h1 style={{ fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'1.6rem',color:'#0f1a2e' }}>🧠 SkillPath AI</h1>
        <p style={{ color:'#7a8ba8',marginTop:4 }}>Resume × Job Description → ATS score · Skill gaps with importance · Personalised learning pathway</p>
      </div>

      {/* Upload form always shown at top when no result or when user wants new analysis */}
      {showUpload && <UploadForm user={user} onResult={handleResult}/>}

      {/* Results */}
      {dbResult && !showUpload && (
        <AnalysisResults
          dbResult={dbResult}
          full={fullData}
          onNewAnalysis={()=>setShowUpload(true)}
        />
      )}

      {/* First-time empty state */}
      {!dbResult && !showUpload && !loading && (
        <div style={{ textAlign:'center',padding:'60px 0' }}>
          <div style={{ fontSize:'3rem',marginBottom:12 }}>🧠</div>
          <div style={{ fontWeight:700,color:'#3d4e6b',marginBottom:6 }}>No analysis yet</div>
          <button onClick={()=>setShowUpload(true)} style={{ padding:'11px 24px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#531697,#13a1a5)',color:'#fff',fontWeight:800,cursor:'pointer',fontFamily:"'Nunito',sans-serif" }}>
            Start Analysis →
          </button>
        </div>
      )}
    </div>
  );
}