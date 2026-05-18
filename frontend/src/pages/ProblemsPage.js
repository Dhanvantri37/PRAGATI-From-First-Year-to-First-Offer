import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tk  = () => ({ Authorization:`Bearer ${localStorage.getItem('pragati_token')}` });
const tks = () => ({ Authorization:`Bearer ${localStorage.getItem('pragati_token')}`, 'Content-Type':'application/json' });

const DIFF = {
  Easy:   { bg:'rgba(71,211,114,0.1)',  color:'#166534', border:'rgba(71,211,114,0.3)' },
  Medium: { bg:'rgba(245,158,11,0.1)',  color:'#92400e', border:'rgba(245,158,11,0.3)' },
  Hard:   { bg:'rgba(239,68,68,0.1)',   color:'#991b1b', border:'rgba(239,68,68,0.3)' },
};
const SRC_COLOR = { LeetCode:'#f59e0b', HackerRank:'#22c55e', CodeChef:'#531697', GFG:'#2ea854', HackerEarth:'#3b82f6', Custom:'#13a1a5' };
const PROB_CATS = ['All','Arrays','Strings','Linked List','Trees','Graphs','Dynamic Programming','Sorting','Binary Search','Stack & Queue','Recursion','Backtracking','Bit Manipulation','Math','Greedy'];
const PROB_SRCS = ['All','LeetCode','HackerRank','CodeChef','GFG','HackerEarth','Custom'];
const LANGUAGES = ['javascript','python','java','c++','c','go','rust'];

const PLATFORMS = [
  { id:'LeetCode',    name:'LeetCode',    emoji:'⚡', color:'#f59e0b', desc:'DSA & interview prep', url:'https://leetcode.com/problemset/', tagline:'#1 for FAANG prep' },
  { id:'CodeChef',    name:'CodeChef',    emoji:'👨‍🍳', color:'#531697', desc:'Competitive programming', url:'https://www.codechef.com/practice', tagline:'Great for contests' },
  { id:'HackerRank',  name:'HackerRank',  emoji:'💻', color:'#22c55e', desc:'Company-specific problems', url:'https://www.hackerrank.com/domains/algorithms', tagline:'Used by TCS, Wipro' },
  { id:'GFG',         name:'GeeksForGeeks', emoji:'🌐', color:'#2ea854', desc:'Concept + practice combo', url:'https://practice.geeksforgeeks.org/', tagline:'Best for theory+coding' },
  { id:'HackerEarth', name:'HackerEarth', emoji:'🌍', color:'#3b82f6', desc:'Hiring contests & practice', url:'https://www.hackerearth.com/practice/', tagline:'Used in campus hiring' },
  { id:'Custom',      name:'PRAGATI Bank',emoji:'🎯', color:'#13a1a5', desc:'Curated by your faculty', url:null, tagline:'Faculty-curated problems' },
];
const COMPANY_COLORS = {
  Google:'#4285F4', Amazon:'#FF9900', Microsoft:'#00A4EF', Facebook:'#1877F2',
  Apple:'#555', Uber:'#000', Flipkart:'#2874F0', Adobe:'#FF0000',
  Infosys:'#007CC3', TCS:'#E40000', Wipro:'#7CBB00', Accenture:'#A100FF',
  'Goldman Sachs':'#7B8B6F', Bloomberg:'#F03A17', Oracle:'#F80000',
  Ola:'#E8B84B', Swiggy:'#FC8019', Zomato:'#E23744', Paytm:'#00B9F1',
  'TCS Digital':'#E40000', 'TCS NQT':'#E40000', Qualcomm:'#3253DC',
  LinkedIn:'#0077B5', LyFt:'#FF00BF', Airbnb:'#FF5A5F', Pinterest:'#E60023',
};

/* ── Live Countdown hook (updates every second) ──────────────────── */
function useCountdown(targetHours) {
  const [timeLeft, setTimeLeft] = React.useState(targetHours * 3600);
  React.useEffect(() => {
    const id = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(timeLeft / 3600);
  const m = Math.floor((timeLeft % 3600) / 60);
  const s = timeLeft % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

/* ── Platform Selection Popup ────────────────────────────────────── */
function PlatformPopup({ onSelect }) {
  const today = new Date().toDateString();
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(4,44,93,0.6)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:20, padding:'28px', maxWidth:520, width:'100%', boxShadow:'0 24px 80px rgba(4,44,93,0.3)' }}>
        <div style={{ textAlign:'center', marginBottom:22 }}>
          <div style={{ fontSize:'2rem', marginBottom:8 }}>💻</div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.2rem', color:'#0f1a2e' }}>Where do you want to practice today?</div>
          <div style={{ fontSize:'.78rem', color:'#7a8ba8', marginTop:4 }}>{today} · Choose your platform for today's session</div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {PLATFORMS.map(p => (
            <button key={p.id} onClick={() => onSelect(p)}
              style={{ padding:'14px 16px', borderRadius:12, border:`1.5px solid ${p.color}30`, background:`${p.color}06`, cursor:'pointer', textAlign:'left', transition:'all .15s', fontFamily:"'Nunito',sans-serif" }}
              onMouseOver={e=>{e.currentTarget.style.borderColor=`${p.color}80`; e.currentTarget.style.background=`${p.color}12`;}}
              onMouseOut={e=>{e.currentTarget.style.borderColor=`${p.color}30`; e.currentTarget.style.background=`${p.color}06`;}}>
              <div style={{ fontSize:'1.4rem', marginBottom:4 }}>{p.emoji}</div>
              <div style={{ fontWeight:800, fontSize:'.88rem', color:p.color }}>{p.name}</div>
              <div style={{ fontSize:'.7rem', color:'#7a8ba8', marginTop:2 }}>{p.desc}</div>
              <div style={{ fontSize:'.65rem', color:p.color, marginTop:3, fontWeight:700 }}>{p.tagline}</div>
            </button>
          ))}
        </div>
        <button onClick={() => onSelect(null)}
          style={{ width:'100%', marginTop:14, padding:'9px', borderRadius:10, border:'1px solid #e8edf5', background:'transparent', color:'#7a8ba8', fontWeight:600, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.82rem' }}>
          Skip — Show all problems
        </button>
      </div>
    </div>
  );
}

/* ── Voice Button ────────────────────────────────────────────────── */
function VoiceButton({ onResult }) {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  if (!supported) return null;
  function toggle() {
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR(); rec.lang='en-IN'; rec.interimResults=false;
    rec.onresult = e => onResult(e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    rec.start(); recRef.current = rec; setListening(true);
  }
  return (
    <button type="button" onClick={toggle}
      style={{ padding:'6px 10px', borderRadius:8, border:`1.5px solid ${listening?'#ef4444':'#d0d7e8'}`, background:listening?'rgba(239,68,68,0.08)':'transparent', color:listening?'#ef4444':'#531697', fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.75rem', display:'flex', alignItems:'center', gap:5 }}>
      {listening ? '⏹ Stop' : '🎙️ Voice'}
    </button>
  );
}


/* ── Debug Result Panel (v2 — rich, inline, with trace viewer) ───── */
function DebugPanel({ result, loading, code, onApplyFix }) {
  const [showFix, setShowFix]   = useState(false);
  const [copiedFix, setCopied]  = useState(false);
  const [expandTC, setExpandTC] = useState({});

  if (loading) return (
    <div style={{ marginTop:14, padding:'22px 18px', background:'#0f172a', border:'1px solid rgba(83,22,151,0.3)', borderRadius:14, display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
      <div style={{ position:'relative', width:44, height:44 }}>
        <div style={{ position:'absolute', inset:0, border:'3px solid rgba(83,22,151,0.2)', borderTopColor:'#531697', borderRadius:'50%', animation:'_spin .7s linear infinite' }} />
        <div style={{ position:'absolute', inset:6, border:'2px solid rgba(19,161,165,0.2)', borderTopColor:'#13a1a5', borderRadius:'50%', animation:'_spin .5s linear infinite reverse' }} />
      </div>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'.9rem', color:'#a78bfa', fontWeight:800 }}>🤖 Analysing your code…</div>
        <div style={{ fontSize:'.72rem', color:'#64748b', marginTop:4 }}>Tracing logic · Checking edge cases · Running test cases</div>
      </div>
      <style>{`@keyframes _spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (!result) return null;

  const v = result.verdict || 'review';
  const cfg = {
    likely_correct: { bg:'#052e16', brd:'rgba(71,211,114,0.35)', hdr:'rgba(71,211,114,0.12)', icon:'✅', color:'#4ade80', label:'All Correct' },
    review:         { bg:'#1c1506', brd:'rgba(245,158,11,0.35)',  hdr:'rgba(245,158,11,0.10)', icon:'⚠️', color:'#fbbf24', label:'Needs Review' },
    has_errors:     { bg:'#1a0505', brd:'rgba(239,68,68,0.35)',   hdr:'rgba(239,68,68,0.10)',  icon:'❌', color:'#f87171', label:'Errors Found' },
  }[v] || { bg:'#1a1a2e', brd:'rgba(83,22,151,0.3)', hdr:'rgba(83,22,151,0.08)', icon:'🔍', color:'#a78bfa', label:'Analysis' };

  const passed = result.testResults?.filter(t=>t.passed===true).length || 0;
  const total  = result.testResults?.length || 0;

  function copyFix() {
    if (result.suggestedFix) { navigator.clipboard.writeText(result.suggestedFix).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000); }); }
  }

  return (
    <div style={{ marginTop:14, border:`1.5px solid ${cfg.brd}`, borderRadius:16, overflow:'hidden', fontFamily:"'Nunito',sans-serif", background:cfg.bg }}>

      {/* ── Header bar ── */}
      <div style={{ padding:'14px 18px', background:cfg.hdr, borderBottom:`1px solid ${cfg.brd}`, display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:42, height:42, borderRadius:'50%', border:`2px solid ${cfg.color}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', flexShrink:0, background:`${cfg.color}15` }}>
          {cfg.icon}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:'.92rem', color:'#f1f5f9', fontFamily:"'Syne',sans-serif", display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            🤖 AI Debug Report
            <span style={{ padding:'2px 8px', borderRadius:999, background: result.source==='gemini'?'rgba(66,133,244,0.18)':'rgba(83,22,151,0.15)', color: result.source==='gemini'?'#93c5fd':'#c4b5fd', fontSize:'.65rem', fontWeight:700 }}>
              {result.source==='groq'?'⚡ Groq AI':result.source==='gemini'?'✨ Gemini AI':result.source==='rule-based'?'⚙️ Static Analysis':'🧠 Analysis'}
            </span>
          </div>
          <div style={{ fontSize:'.83rem', color:cfg.color, fontWeight:700, marginTop:2 }}>{result.verdictMessage}</div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:5, alignItems:'flex-end', flexShrink:0 }}>
          {result.timeComplexity && result.timeComplexity!=='N/A' && (
            <span style={{ padding:'2px 9px', borderRadius:6, background:'rgba(83,22,151,0.2)', color:'#c4b5fd', fontSize:'.68rem', fontWeight:800 }}>⏱ {result.timeComplexity}</span>
          )}
          {result.spaceComplexity && result.spaceComplexity!=='N/A' && (
            <span style={{ padding:'2px 9px', borderRadius:6, background:'rgba(19,161,165,0.2)', color:'#5eead4', fontSize:'.68rem', fontWeight:800 }}>💾 {result.spaceComplexity}</span>
          )}
        </div>
      </div>

      <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:14 }}>

        {/* ── AI Explanation ── */}
        {result.explanation && (
          <div style={{ padding:'13px 15px', background:'rgba(83,22,151,0.1)', border:'1px solid rgba(83,22,151,0.2)', borderRadius:11 }}>
            <div style={{ fontSize:'.7rem', fontWeight:800, color:'#a78bfa', marginBottom:6, letterSpacing:'.06em' }}>🧠 AI ANALYSIS</div>
            <div style={{ fontSize:'.84rem', color:'#cbd5e1', lineHeight:1.75 }}>{result.explanation}</div>
          </div>
        )}

        {/* ── Issues with line highlights ── */}
        {result.issues?.length > 0 && (
          <div>
            <div style={{ fontSize:'.7rem', fontWeight:800, color:'#94a3b8', marginBottom:8, letterSpacing:'.06em' }}>
              🔍 ISSUES ({result.issues.length}) — {result.issues.filter(i=>i.type==='error').length} error{result.issues.filter(i=>i.type==='error').length!==1?'s':''}, {result.issues.filter(i=>i.type==='warning').length} warning{result.issues.filter(i=>i.type==='warning').length!==1?'s':''}
            </div>
            {result.issues.map((issue, i) => {
              const ic = issue.type==='error'?'#f87171':issue.type==='warning'?'#fbbf24':'#5eead4';
              const ibg = issue.type==='error'?'rgba(248,113,113,0.08)':issue.type==='warning'?'rgba(251,191,36,0.08)':'rgba(94,234,212,0.08)';
              const ibrd = issue.type==='error'?'rgba(248,113,113,0.25)':issue.type==='warning'?'rgba(251,191,36,0.2)':'rgba(94,234,212,0.2)';
              return (
                <div key={i} style={{ display:'flex', gap:10, padding:'10px 13px', background:ibg, border:`1.5px solid ${ibrd}`, borderRadius:10, marginBottom:7, alignItems:'flex-start' }}>
                  <span style={{ fontSize:'.9rem', flexShrink:0, marginTop:1 }}>{issue.type==='error'?'❌':issue.type==='warning'?'⚠️':'ℹ️'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4, flexWrap:'wrap' }}>
                      <span style={{ padding:'2px 7px', borderRadius:4, background:`${ic}20`, color:ic, fontSize:'.68rem', fontWeight:800 }}>
                        {issue.type?.toUpperCase()}
                      </span>
                      {issue.line && (
                        <span style={{ padding:'2px 7px', borderRadius:4, background:'rgba(148,163,184,0.1)', color:'#94a3b8', fontSize:'.68rem', fontWeight:700 }}>
                          Line {issue.line}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize:'.85rem', color:'#f1f5f9', fontWeight:600, lineHeight:1.55 }}>{issue.msg}</div>
                    {issue.fix && (
                      <div style={{ marginTop:6, padding:'6px 9px', background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.15)', borderRadius:7, fontSize:'.78rem', color:'#86efac', lineHeight:1.6 }}>
                        💡 Fix: {issue.fix}
                      </div>
                    )}
                    {/* Show the actual bad line from code */}
                    {issue.line && code && (
                      <div style={{ marginTop:6 }}>
                        {(() => {
                          const lines = code.split('\n');
                          const lineNum = parseInt(issue.line);
                          if (!isNaN(lineNum) && lines[lineNum-1]) {
                            return (
                              <div style={{ padding:'6px 9px', background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.12)', borderRadius:7, fontFamily:'monospace', fontSize:'.75rem', color:'#fca5a5' }}>
                                <span style={{ opacity:.5, marginRight:8 }}>{lineNum}</span>
                                {lines[lineNum-1]}
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Hints ── */}
        {result.hints?.length > 0 && (
          <div>
            <div style={{ fontSize:'.7rem', fontWeight:800, color:'#94a3b8', marginBottom:8, letterSpacing:'.06em' }}>💡 ACTIONABLE HINTS</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {result.hints.map((hint, i) => (
                <div key={i} style={{ display:'flex', gap:9, padding:'10px 13px', background:'rgba(83,22,151,0.08)', border:'1px solid rgba(83,22,151,0.18)', borderRadius:10, alignItems:'flex-start' }}>
                  <span style={{ flexShrink:0, fontSize:'.85rem', marginTop:1 }}>💡</span>
                  <span style={{ fontSize:'.84rem', color:'#e2e8f0', lineHeight:1.65 }}>{hint}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Test case results with trace ── */}
        {total > 0 && (
          <div>
            <div style={{ fontSize:'.7rem', fontWeight:800, color:'#94a3b8', marginBottom:8, letterSpacing:'.06em' }}>
              🧪 TEST RESULTS — {passed}/{total} PASSED
            </div>
            {/* Mini progress bar */}
            <div style={{ height:6, background:'rgba(255,255,255,0.08)', borderRadius:999, marginBottom:10, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${total?Math.round(passed/total*100):0}%`, background:passed===total?'linear-gradient(90deg,#4ade80,#22d3ee)':'linear-gradient(90deg,#f87171,#fbbf24)', borderRadius:999, transition:'width .6s' }} />
            </div>
            {result.testResults.map((tc, i) => {
              const isOpen = expandTC[i];
              const passClr = tc.passed===true?'#4ade80':tc.passed===false?'#f87171':'#fbbf24';
              const passBg  = tc.passed===true?'rgba(74,222,128,0.06)':tc.passed===false?'rgba(248,113,113,0.06)':'rgba(251,191,36,0.06)';
              const passBrd = tc.passed===true?'rgba(74,222,128,0.25)':tc.passed===false?'rgba(248,113,113,0.2)':'rgba(251,191,36,0.2)';
              return (
                <div key={i} style={{ background:passBg, border:`1.5px solid ${passBrd}`, borderRadius:11, marginBottom:8, overflow:'hidden' }}>
                  <button onClick={()=>setExpandTC(e=>({...e,[i]:!e[i]}))}
                    style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 13px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', fontFamily:"'Nunito',sans-serif" }}>
                    <span style={{ fontSize:'1rem', flexShrink:0 }}>{tc.passed===true?'✅':tc.passed===false?'❌':'⚠️'}</span>
                    <span style={{ fontWeight:700, fontSize:'.82rem', color:'#f1f5f9', flex:1 }}>Test Case {i+1}</span>
                    {tc.input !== undefined && (
                      <span style={{ fontSize:'.72rem', color:'#94a3b8', marginRight:4 }}>Input: <code style={{ color:'#e2e8f0' }}>{String(tc.input).slice(0,30)}{String(tc.input).length>30?'…':''}</code></span>
                    )}
                    <span style={{ padding:'2px 8px', borderRadius:999, background:`${passClr}20`, color:passClr, fontSize:'.68rem', fontWeight:800 }}>
                      {tc.passed===true?'PASS':tc.passed===false?'FAIL':'UNCERTAIN'}
                    </span>
                    <span style={{ color:'#64748b', fontSize:'.7rem', marginLeft:4 }}>{isOpen?'▲':'▼'}</span>
                  </button>
                  {isOpen && (
                    <div style={{ padding:'0 13px 12px', display:'flex', flexDirection:'column', gap:8, borderTop:`1px solid ${passBrd}` }}>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:10 }}>
                        <div style={{ padding:'8px 10px', background:'rgba(255,255,255,0.04)', borderRadius:8 }}>
                          <div style={{ fontSize:'.65rem', color:'#64748b', fontWeight:700, marginBottom:4 }}>INPUT</div>
                          <code style={{ fontSize:'.78rem', color:'#94a3b8', wordBreak:'break-all' }}>{String(tc.input)}</code>
                        </div>
                        <div style={{ padding:'8px 10px', background:'rgba(74,222,128,0.06)', borderRadius:8 }}>
                          <div style={{ fontSize:'.65rem', color:'#64748b', fontWeight:700, marginBottom:4 }}>EXPECTED</div>
                          <code style={{ fontSize:'.78rem', color:'#86efac', wordBreak:'break-all' }}>{String(tc.expected)}</code>
                        </div>
                        {tc.actualOutput !== undefined && (
                          <div style={{ padding:'8px 10px', background: tc.passed===false?'rgba(248,113,113,0.06)':'rgba(255,255,255,0.04)', borderRadius:8, gridColumn:tc.passed!==true?'auto':'1/-1' }}>
                            <div style={{ fontSize:'.65rem', color:'#64748b', fontWeight:700, marginBottom:4 }}>YOUR OUTPUT</div>
                            <code style={{ fontSize:'.78rem', color: tc.passed===false?'#fca5a5':'#94a3b8', wordBreak:'break-all' }}>{String(tc.actualOutput)}</code>
                          </div>
                        )}
                      </div>
                      {/* Step trace */}
                      {tc.trace && (
                        <div style={{ padding:'10px 12px', background:'rgba(83,22,151,0.08)', border:'1px solid rgba(83,22,151,0.15)', borderRadius:9 }}>
                          <div style={{ fontSize:'.65rem', fontWeight:800, color:'#a78bfa', marginBottom:6, letterSpacing:'.06em' }}>📋 EXECUTION TRACE</div>
                          <div style={{ fontSize:'.77rem', color:'#94a3b8', lineHeight:1.8, whiteSpace:'pre-wrap', fontFamily:'monospace' }}>{tc.trace}</div>
                        </div>
                      )}
                      {/* Wrong answer diff */}
                      {tc.passed===false && tc.expected !== undefined && tc.actualOutput !== undefined && (
                        <div style={{ padding:'8px 12px', background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.15)', borderRadius:9 }}>
                          <div style={{ fontSize:'.72rem', color:'#f87171', fontWeight:700 }}>
                            ⚡ Your output <code>{String(tc.actualOutput)}</code> doesn't match expected <code>{String(tc.expected)}</code>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Suggested Fix ── */}
        {result.suggestedFix && result.suggestedFix.trim().length > 5 && (
          <div>
            <button onClick={()=>setShowFix(f=>!f)}
              style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1.5px solid rgba(74,222,128,0.3)', background:showFix?'rgba(74,222,128,0.08)':'transparent', color:'#4ade80', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.83rem', textAlign:'left', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span>🔧 {showFix ? 'Hide' : 'View'} Suggested Fix</span>
              <span style={{ fontSize:'.7rem' }}>{showFix?'▲':'▼'}</span>
            </button>
            {showFix && (
              <div style={{ marginTop:6, borderRadius:10, overflow:'hidden', border:'1px solid rgba(74,222,128,0.2)' }}>
                {/* Toolbar */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', background:'rgba(15,23,42,0.9)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize:'.72rem', color:'#64748b', fontWeight:700 }}>✅ Fixed Code</span>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={copyFix}
                      style={{ padding:'4px 10px', borderRadius:6, border:'1px solid rgba(74,222,128,0.25)', background:'rgba(74,222,128,0.08)', color:'#4ade80', fontSize:'.72rem', fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif" }}>
                      {copiedFix?'✅ Copied!':'📋 Copy'}
                    </button>
                    {onApplyFix && (
                      <button onClick={()=>onApplyFix(result.suggestedFix)}
                        style={{ padding:'4px 10px', borderRadius:6, border:'1px solid rgba(83,22,151,0.3)', background:'rgba(83,22,151,0.12)', color:'#a78bfa', fontSize:'.72rem', fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif" }}>
                        ⬆️ Apply to Editor
                      </button>
                    )}
                  </div>
                </div>
                <pre style={{ margin:0, padding:'14px 16px', background:'#060d1a', fontSize:'.8rem', color:'#e2e8f0', overflowX:'auto', lineHeight:1.75, maxHeight:360, fontFamily:'JetBrains Mono,monospace', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                  {result.suggestedFix}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* ── Success state ── */}
        {v === 'likely_correct' && (
          <div style={{ padding:'14px 16px', background:'rgba(74,222,128,0.07)', border:'1px solid rgba(74,222,128,0.2)', borderRadius:12, textAlign:'center' }}>
            <div style={{ fontSize:'1.5rem', marginBottom:6 }}>🎉</div>
            <div style={{ fontWeight:800, fontSize:'.9rem', color:'#4ade80', fontFamily:"'Syne',sans-serif" }}>Code looks correct!</div>
            <div style={{ fontSize:'.77rem', color:'#86efac', marginTop:4, lineHeight:1.6 }}>All test cases passed. You can safely submit your solution.</div>
          </div>
        )}

        {/* ── Error summary block if errors and no explanation ── */}
        {v === 'has_errors' && !result.explanation && (
          <div style={{ padding:'12px 14px', background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:11 }}>
            <div style={{ fontSize:'.82rem', color:'#fca5a5', lineHeight:1.7 }}>
              Your code has {result.issues?.length || 'some'} issue{result.issues?.length!==1?'s':''} that need fixing before submission. Review the issues above and apply the suggested fix.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Countdown Badge ─────────────────────────────────────────────── */
function CountdownBadge({ hours }) {
  const label = useCountdown(hours);
  return <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:'.82rem' }}>{label}</span>;
}

/* ── Problem Card (with integrated Debug + Smart Submit) ─────────── */
function ProblemCard({ problem, userProblem, onSolve, onShuffle, solving, shuffling }) {
  const [showSolve, setShowSolve] = useState(false);
  const [code, setCode]           = useState('');
  const [notes, setNotes]         = useState('');
  const [rating, setRating]       = useState(0);
  const [err, setErr]             = useState('');
  const [lang, setLang]           = useState('javascript');
  const [debugResult, setDebugResult] = useState(null);
  const [debugging, setDebugging]     = useState(false);
  const [submitMode, setSubmitMode]   = useState('idle'); // idle | analysing | error_found | ready | submitting
  const isSolved   = userProblem?.status === 'solved';
  const isShuffled = userProblem?.shuffled;
  const diff = DIFF[problem.difficulty] || DIFF.Easy;
  const srcColor = SRC_COLOR[problem.source] || '#531697';

  function handleOpen() {
    window.open(problem.url, '_blank');
    if (userProblem?.status==='assigned') fetch(`${API}/problems/${problem._id}/attempt`, { method:'POST', headers:tk() }).catch(()=>{});
  }

  // Separate debug (manual)
  async function handleDebug() {
    if (!code.trim() || code.trim().length < 5) { setErr('⚠️ Paste some code first.'); return; }
    setErr(''); setDebugging(true); setDebugResult(null); setSubmitMode('idle');
    try {
      const res = await fetch(`${API}/debug`, {
        method:'POST', headers:tks(),
        body: JSON.stringify({ code, language:lang, problemTitle:problem.title, testCases:problem.testCases||[] }),
      });
      const d = await res.json();
      setDebugResult(d);
    } catch {
      setDebugResult({ verdict:'review', verdictMessage:'Debug service unavailable.', issues:[], hints:[], testResults:[] });
    } finally { setDebugging(false); }
  }

  // Smart submit: auto-debug first, then decide
  async function handleSmartSubmit() {
    if (!code.trim() || code.trim().length < 10) { setErr('⚠️ Paste your solution code before submitting.'); return; }
    setErr(''); setSubmitMode('analysing'); setDebugging(true); setDebugResult(null);
    try {
      const res = await fetch(`${API}/debug`, {
        method:'POST', headers:tks(),
        body: JSON.stringify({ code, language:lang, problemTitle:problem.title, testCases:problem.testCases||[] }),
      });
      const d = await res.json();
      setDebugResult(d);
      if (d.verdict === 'has_errors') {
        setSubmitMode('error_found');
      } else {
        setSubmitMode('ready');
      }
    } catch {
      setDebugResult({ verdict:'review', verdictMessage:'Debug service unavailable — proceeding.', issues:[], hints:[], testResults:[] });
      setSubmitMode('ready');
    } finally { setDebugging(false); }
  }

  function handleForceSubmit() {
    setSubmitMode('submitting');
    onSolve(problem._id, notes, code, rating);
  }

  return (
    <div style={{ background:'#fff', border:`1.5px solid ${isSolved?'#47d372':'#e8edf5'}`, borderRadius:16, padding:'22px 24px', boxShadow:isSolved?'0 4px 16px rgba(71,211,114,0.1)':'0 2px 8px rgba(4,44,93,0.05)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            {isSolved && <span>✅</span>}
            {isShuffled && !isSolved && <span title="Shuffled">🔀</span>}
            <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.05rem', color:'#0f1a2e' }}>{problem.title}</h3>
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <span style={{ ...diff, padding:'3px 10px', borderRadius:999, fontSize:'.72rem', fontWeight:700, border:`1px solid ${diff.border}` }}>{problem.difficulty}</span>
            <span style={{ padding:'3px 10px', borderRadius:999, background:'rgba(83,22,151,0.07)', color:'#531697', fontSize:'.72rem', fontWeight:700 }}>{problem.topic||'General'}</span>
            <span style={{ padding:'3px 10px', borderRadius:999, background:`${srcColor}15`, color:srcColor, fontSize:'.72rem', fontWeight:700 }}>{problem.source}</span>
          </div>
        </div>
        <div style={{ display:'flex', gap:7, flexShrink:0, flexWrap:'wrap', justifyContent:'flex-end' }}>
          {problem.url && (
            <button onClick={handleOpen} style={{ padding:'8px 14px', borderRadius:9, border:`1.5px solid ${srcColor}`, background:`${srcColor}10`, color:srcColor, fontWeight:700, cursor:'pointer', fontSize:'.78rem', fontFamily:"'Nunito',sans-serif" }}>
              Solve on {problem.source} →
            </button>
          )}
          {!isSolved && !userProblem?.shuffled && (
            <button onClick={onShuffle} disabled={shuffling}
              style={{ padding:'8px 12px', borderRadius:9, border:'1.5px solid #d0d7e8', background:'rgba(245,158,11,0.06)', color:'#92400e', fontWeight:700, cursor:shuffling?'not-allowed':'pointer', fontSize:'.78rem', fontFamily:"'Nunito',sans-serif" }}>
              {shuffling?'…':'🔀 Easier'}
            </button>
          )}
          {!isSolved && (
            <button onClick={()=>{ setShowSolve(s=>!s); setDebugResult(null); setSubmitMode('idle'); }}
              style={{ padding:'8px 14px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontWeight:700, cursor:'pointer', fontSize:'.78rem', fontFamily:"'Nunito',sans-serif" }}>
              {showSolve?'Cancel':'✓ Submit'}
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      {problem.description && (
        <div style={{ marginTop:10, fontSize:'.78rem', color:'#4a5568', lineHeight:1.6, padding:'8px 12px', background:'rgba(83,22,151,0.04)', borderRadius:8 }}>
          {problem.description}
        </div>
      )}

      {/* Company tags */}
      {problem.companies && problem.companies.length > 0 && (
        <div style={{ marginTop:8, display:'flex', flexWrap:'wrap', gap:4 }}>
          {problem.companies.slice(0,6).map(co => (
            <span key={co} style={{ padding:'2px 8px', borderRadius:999, fontSize:'.63rem', fontWeight:700,
              background:`${(COMPANY_COLORS[co]||'#531697')}15`, color:COMPANY_COLORS[co]||'#531697',
              border:`1px solid ${(COMPANY_COLORS[co]||'#531697')}30` }}>
              {co}
            </span>
          ))}
          {problem.companies.length > 6 && <span style={{ fontSize:'.63rem', color:'#b0bec9' }}>+{problem.companies.length-6} more</span>}
        </div>
      )}

      {/* LeetCode problem number badge */}
      {problem.problemId && problem.source==='LeetCode' && (
        <div style={{ marginTop:6, fontSize:'.68rem', color:'#f59e0b', fontWeight:700 }}>
          LC #{problem.problemId}
          {problem.constraints && <span style={{ color:'#b0bec9', fontWeight:400, marginLeft:8 }}>Constraints: {problem.constraints}</span>}
        </div>
      )}

      {isSolved && (
        <div style={{ marginTop:10, fontSize:'.75rem', color:'#7a8ba8', display:'flex', gap:12 }}>
          <span>✅ Solved {new Date(userProblem.solvedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span>
          {userProblem.selfRating && <span>{'⭐'.repeat(userProblem.selfRating)}</span>}
        </div>
      )}

      {showSolve && !isSolved && (
        <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid #e8edf5' }}>

          {/* Language */}
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:'.75rem', fontWeight:800, color:'#3d4e6b', fontFamily:"'Syne',sans-serif", display:'block', marginBottom:5 }}>Language</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {LANGUAGES.map(l => (
                <button key={l} type="button" onClick={()=>setLang(l)}
                  style={{ padding:'4px 12px', borderRadius:999, border:`1.5px solid ${lang===l?'#531697':'#d0d7e8'}`, background:lang===l?'rgba(83,22,151,0.08)':'transparent', color:lang===l?'#531697':'#7a8ba8', fontWeight:700, cursor:'pointer', fontSize:'.72rem', fontFamily:"'Nunito',sans-serif" }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Code editor */}
          <div style={{ marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
              <label style={{ fontSize:'.78rem', fontWeight:800, color:'#ef4444', fontFamily:"'Syne',sans-serif" }}>
                Solution Code <span style={{ color:'#b0bec9', fontWeight:500 }}>(required)</span>
              </label>
              <div style={{ display:'flex', gap:7, alignItems:'center' }}>
                <VoiceButton onResult={v=>setCode(p=>p+' '+v)} />
                {code.trim().length > 10 && (
                  <button onClick={handleDebug} disabled={debugging}
                    style={{ padding:'5px 11px', borderRadius:7, border:'1.5px solid rgba(83,22,151,0.25)', background:'rgba(83,22,151,0.06)', color:'#531697', fontWeight:700, cursor:debugging?'not-allowed':'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.72rem', display:'flex', alignItems:'center', gap:5 }}>
                    {debugging?'🔄':'🔍'} {debugging?'Checking…':'Quick Debug'}
                  </button>
                )}
              </div>
            </div>
            <div style={{ position:'relative', borderRadius:12, overflow:'hidden', border:'1.5px solid #334155' }}>
              {/* Editor header bar */}
              <div style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', background:'#1e293b', borderBottom:'1px solid #334155' }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:'#ef4444' }} />
                <div style={{ width:10, height:10, borderRadius:'50%', background:'#f59e0b' }} />
                <div style={{ width:10, height:10, borderRadius:'50%', background:'#22c55e' }} />
                <span style={{ marginLeft:8, fontSize:'.68rem', color:'#64748b', fontFamily:'monospace' }}>{lang} — solution.{lang==='python'?'py':lang==='javascript'?'js':lang==='java'?'java':lang==='c++'?'cpp':'c'}</span>
                {code.trim() && (
                  <span style={{ marginLeft:'auto', fontSize:'.65rem', color:'#64748b' }}>{code.split('\n').length} lines · {code.length} chars</span>
                )}
              </div>
              <textarea value={code} onChange={e=>{ setCode(e.target.value); setSubmitMode('idle'); setDebugResult(null); }} rows={12}
                placeholder={`// Write your ${lang} solution here…\n// The AI debugger will check your code before submission\n\nfunction solution(input) {\n    // your logic\n    return result;\n}`}
                style={{ width:'100%', padding:'14px 16px', border:'none', fontFamily:'JetBrains Mono, Consolas, monospace', fontSize:'.83rem', resize:'vertical', outline:'none', background:'#0f172a', color:'#e2e8f0', lineHeight:1.8, boxSizing:'border-box', display:'block', minHeight:220 }} />
            </div>
          </div>

          {/* Debug Result Panel */}
          <DebugPanel result={debugResult} loading={debugging} code={code} onApplyFix={fixed=>{ setCode(fixed); setDebugResult(null); setSubmitMode('idle'); }} />

          {/* Submit area */}
          <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid #e8edf5' }}>

            {/* Approach notes */}
            <div style={{ marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                <label style={{ fontSize:'.78rem', fontWeight:700, color:'#3d4e6b', fontFamily:"'Syne',sans-serif" }}>Approach Notes <span style={{ fontWeight:500, color:'#b0bec9' }}>(optional)</span></label>
                <VoiceButton onResult={v=>setNotes(p=>p+' '+v)} />
              </div>
              <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2}
                placeholder="Describe your approach, time/space complexity, what you learnt…"
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.85rem', resize:'vertical', outline:'none', boxSizing:'border-box' }} />
            </div>

            {/* Self rating */}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:'.78rem', fontWeight:700, color:'#3d4e6b', marginBottom:8, fontFamily:"'Syne',sans-serif" }}>How did you do? <span style={{ fontWeight:500, color:'#b0bec9' }}>(optional)</span></label>
              <div style={{ display:'flex', gap:7 }}>
                {[1,2,3,4,5].map(r => (
                  <button key={r} onClick={()=>setRating(r)} type="button"
                    style={{ padding:'6px 14px', borderRadius:8, border:`1.5px solid ${rating>=r?'#f59e0b':'#d0d7e8'}`, background:rating>=r?'rgba(245,158,11,0.1)':'transparent', color:rating>=r?'#92400e':'#b0bec9', fontWeight:700, cursor:'pointer', fontSize:'.85rem' }}>
                    {'⭐'.repeat(r)}
                  </button>
                ))}
              </div>
            </div>

            {err && <div style={{ padding:'9px 12px', background:'#fee2e2', color:'#991b1b', borderRadius:8, fontSize:'.82rem', fontWeight:600, marginBottom:12 }}>{err}</div>}

            {/* Smart submit flow */}
            <div>
              {/* Idle — show Analyse & Submit button */}
              {(submitMode === 'idle' || submitMode === 'ready') && (
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                  {submitMode === 'idle' ? (
                    <button onClick={handleSmartSubmit} disabled={!code.trim() || code.trim().length < 10}
                      style={{ padding:'12px 28px', borderRadius:10, border:'none', background:!code.trim()?'#d0d7e8':'linear-gradient(135deg,#1e1b4b,#531697,#13a1a5)', color:'#fff', fontWeight:800, cursor:!code.trim()?'not-allowed':'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.9rem', display:'flex', alignItems:'center', gap:8, boxShadow:code.trim()?'0 4px 15px rgba(83,22,151,0.3)':'none' }}>
                      🔍 Analyse & Submit
                    </button>
                  ) : (
                    <button onClick={handleForceSubmit} disabled={solving}
                      style={{ padding:'12px 28px', borderRadius:10, border:'none', background:solving?'#d0d7e8':'linear-gradient(135deg,#166534,#22c55e)', color:'#fff', fontWeight:800, cursor:solving?'not-allowed':'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.9rem', display:'flex', alignItems:'center', gap:8, boxShadow:'0 4px 15px rgba(34,197,94,0.3)' }}>
                      🎉 {solving?'Saving…':'Confirm & Earn Streak!'}
                    </button>
                  )}
                  <span style={{ fontSize:'.72rem', color:'#b0bec9' }}>
                    {submitMode==='idle'?'AI will check your code first':'✅ Code looks good — confirm submission'}
                  </span>
                </div>
              )}

              {/* Analysing */}
              {submitMode === 'analysing' && (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'rgba(83,22,151,0.05)', borderRadius:10 }}>
                  <div style={{ width:20, height:20, border:'2.5px solid #d0d7e8', borderTopColor:'#531697', borderRadius:'50%', animation:'_spin .7s linear infinite', flexShrink:0 }} />
                  <span style={{ fontSize:'.85rem', color:'#531697', fontWeight:700 }}>Analysing your code before submission…</span>
                </div>
              )}

              {/* Error found — show warning + override */}
              {submitMode === 'error_found' && (
                <div style={{ background:'rgba(239,68,68,0.04)', border:'1.5px solid rgba(239,68,68,0.2)', borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontWeight:800, fontSize:'.88rem', color:'#ef4444', marginBottom:6 }}>❌ AI found errors in your code</div>
                  <div style={{ fontSize:'.8rem', color:'#7a8ba8', marginBottom:12, lineHeight:1.65 }}>
                    The debug report above shows the issues. We recommend fixing them before submitting.
                  </div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <button onClick={()=>setSubmitMode('idle')}
                      style={{ padding:'9px 18px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.83rem' }}>
                      ✏️ Fix & Re-Analyse
                    </button>
                    <button onClick={handleForceSubmit} disabled={solving}
                      style={{ padding:'9px 18px', borderRadius:9, border:'1.5px solid rgba(239,68,68,0.3)', background:'transparent', color:'#ef4444', fontWeight:700, cursor:solving?'not-allowed':'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.83rem' }}>
                      {solving?'Saving…':'Submit Anyway'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/* ── History Card ────────────────────────────────────────────────── */
function HistoryCard({ item }) {
  const [show, setShow] = useState(false);
  const diff = DIFF[item.problemId?.difficulty] || DIFF.Easy;
  return (
    <div style={{ padding:'12px 0', borderBottom:'1px solid #f0f3fa' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <span>✅</span>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:'.86rem', color:'#0f1a2e' }}>{item.problemId?.title}</div>
          <div style={{ fontSize:'.72rem', color:'#b0bec9', marginTop:1 }}>
            {new Date(item.solvedAt||item.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})} · {item.problemId?.topic}
            {item.selfRating && ` · ${'⭐'.repeat(item.selfRating)}`}
          </div>
        </div>
        <span style={{ ...diff, padding:'2px 8px', borderRadius:999, fontSize:'.7rem', fontWeight:700, border:`1px solid ${diff.border}` }}>{item.problemId?.difficulty}</span>
        {item.solutionCode && (
          <button onClick={()=>setShow(s=>!s)} style={{ padding:'4px 10px', borderRadius:7, border:'1px solid #d0d7e8', background:'transparent', color:'#531697', fontSize:'.72rem', fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif" }}>
            {show?'Hide':'View Code'}
          </button>
        )}
      </div>
      {show && item.solutionCode && (
        <pre style={{ marginTop:8, background:'#0f172a', borderRadius:8, padding:'10px 12px', overflow:'auto', color:'#e2e8f0', fontSize:'.78rem', fontFamily:'JetBrains Mono, monospace', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{item.solutionCode}</pre>
      )}
      {show && item.approachNotes && (
        <div style={{ marginTop:6, padding:'8px 12px', background:'rgba(83,22,151,0.05)', borderRadius:8, fontSize:'.78rem', color:'#7a8ba8' }}>{item.approachNotes}</div>
      )}
    </div>
  );
}

/* ── All Problems Tab ────────────────────────────────────────────── */
function AllProblemsTab() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [cat, setCat]     = useState('All');
  const [diff, setDiff]   = useState('All');
  const [src, setSrc]     = useState('All');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [debugResult, setDebugResult] = useState({});
  const [debugging, setDebugging]     = useState({});
  const [userCode, setUserCode]       = useState({});
  const [lang, setLang]               = useState({});

  useEffect(() => {
    const p = new URLSearchParams();
    if (cat !== 'All')  p.set('topic', cat);
    if (diff !== 'All') p.set('difficulty', diff);
    setLoading(true);
    fetch(`${API}/problems?${p}`, { headers:tk() })
      .then(r=>r.json()).then(d=>setProblems(d.problems||[])).finally(()=>setLoading(false));
  }, [cat, diff]);

  const filtered = problems.filter(p => {
    if (src !== 'All' && p.source !== src) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function handleDebug(problem) {
    const code = userCode[problem._id] || '';
    const language = lang[problem._id] || 'javascript';
    if (!code.trim() || code.length < 5) return;
    setDebugging(d => ({...d, [problem._id]:true}));
    try {
      const res = await fetch(`${API}/debug`, { method:'POST', headers:tks(), body:JSON.stringify({ code, language, problemTitle:problem.title, testCases:problem.testCases||[] }) });
      const d = await res.json();
      setDebugResult(r => ({...r, [problem._id]:d}));
    } catch { setDebugResult(r => ({...r, [problem._id]:{ verdict:'review', verdictMessage:'Debug service unavailable.', issues:[], hints:[], testResults:[] }})); }
    finally { setDebugging(d => ({...d, [problem._id]:false})); }
  }

  return (
    <div>
      {/* Filters */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12, alignItems:'center' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search problem title…"
          style={{ padding:'7px 12px', borderRadius:8, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.82rem', flex:1, minWidth:160, outline:'none' }} />
        {[['Category',PROB_CATS,cat,setCat],['Difficulty',['All','Easy','Medium','Hard'],diff,setDiff],['Source',PROB_SRCS,src,setSrc]].map(([label,opts,val,setter])=>(
          <select key={label} value={val} onChange={e=>setter(e.target.value)}
            style={{ padding:'7px 10px', borderRadius:8, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.78rem', fontWeight:700, color:'#3d4e6b', background:'#fff', cursor:'pointer' }}>
            {opts.map(o=><option key={o} value={o}>{o}</option>)}
          </select>
        ))}
      </div>
      <div style={{ fontSize:'.73rem', color:'#7a8ba8', marginBottom:10 }}>{filtered.length} problems</div>

      {loading && <div style={{ textAlign:'center', padding:30, color:'#b0bec9' }}>Loading…</div>}

      {!loading && filtered.map(p => {
        const dc = DIFF[p.difficulty] || DIFF.Easy;
        const sc = SRC_COLOR[p.source] || '#531697';
        const isOpen = expanded === p._id;
        return (
          <div key={p._id} style={{ background:'#fff', border:'1.5px solid #e8edf5', borderRadius:12, marginBottom:10, overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:'.88rem', color:'#0f1a2e', marginBottom:5 }}>{p.title}</div>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                  {p.topic && <span style={{ padding:'2px 8px', borderRadius:999, background:'rgba(83,22,151,0.07)', color:'#531697', fontSize:'.68rem', fontWeight:700 }}>{p.topic}</span>}
                  <span style={{ padding:'2px 8px', borderRadius:999, background:dc.bg, color:dc.color, border:`1px solid ${dc.border}`, fontSize:'.68rem', fontWeight:700 }}>{p.difficulty}</span>
                  <span style={{ padding:'2px 8px', borderRadius:999, background:`${sc}15`, color:sc, fontSize:'.68rem', fontWeight:700 }}>{p.source}</span>
                  {(p.companies||[]).slice(0,3).map(co => (
                    <span key={co} style={{ padding:'2px 7px', borderRadius:999, fontSize:'.63rem', fontWeight:700,
                      background:`${(COMPANY_COLORS[co]||'#531697')}12`, color:COMPANY_COLORS[co]||'#531697' }}>
                      {co}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer"
                  style={{ padding:'6px 12px', borderRadius:8, background:`${sc}15`, color:sc, fontWeight:700, fontSize:'.75rem', textDecoration:'none', border:`1px solid ${sc}30`, display:'flex', alignItems:'center', gap:4 }}>
                  {p.source==='LeetCode' && p.problemId ? `LC #${p.problemId} →` : `Solve →`}
                </a>}
                <button onClick={()=>setExpanded(isOpen ? null : p._id)}
                  style={{ padding:'6px 12px', borderRadius:8, border:'1.5px solid #d0d7e8', background:isOpen?'rgba(83,22,151,0.06)':'transparent', color:'#531697', fontWeight:700, cursor:'pointer', fontSize:'.75rem', fontFamily:"'Nunito',sans-serif" }}>
                  {isOpen ? '▲ Hide' : '🤖 Try & Debug'}
                </button>
              </div>
            </div>

            {/* Inline code editor + debug panel */}
            {isOpen && (
              <div style={{ padding:'14px 16px', borderTop:'1px solid #f0f3fa', background:'#fafbff' }}>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
                  {LANGUAGES.map(l=>(
                    <button key={l} type="button" onClick={()=>setLang(prev=>({...prev,[p._id]:l}))}
                      style={{ padding:'3px 10px', borderRadius:999, border:`1.5px solid ${(lang[p._id]||'javascript')===l?'#531697':'#d0d7e8'}`, background:(lang[p._id]||'javascript')===l?'rgba(83,22,151,0.08)':'transparent', color:(lang[p._id]||'javascript')===l?'#531697':'#7a8ba8', fontWeight:700, cursor:'pointer', fontSize:'.7rem', fontFamily:"'Nunito',sans-serif" }}>
                      {l}
                    </button>
                  ))}
                </div>
                <textarea value={userCode[p._id]||''} onChange={e=>setUserCode(prev=>({...prev,[p._id]:e.target.value}))} rows={8}
                  placeholder={`// Write your ${lang[p._id]||'javascript'} solution here…`}
                  style={{ width:'100%', padding:'12px', borderRadius:10, border:'1.5px solid #2d3748', fontFamily:'JetBrains Mono, monospace', fontSize:'.8rem', resize:'vertical', outline:'none', background:'#0f172a', color:'#e2e8f0', lineHeight:1.7, boxSizing:'border-box', marginBottom:10 }} />
                <button onClick={()=>handleDebug(p)} disabled={debugging[p._id]||!(userCode[p._id]||'').trim()}
                  style={{ padding:'8px 18px', borderRadius:9, border:'none', background:debugging[p._id]||!(userCode[p._id]||'').trim()?'#d0d7e8':'linear-gradient(135deg,#1e1b4b,#531697)', color:'#fff', fontWeight:700, cursor:debugging[p._id]||!(userCode[p._id]||'').trim()?'not-allowed':'pointer', fontSize:'.8rem', fontFamily:"'Nunito',sans-serif" }}>
                  {debugging[p._id]?'Analysing…':'🤖 Debug & Analyse'}
                </button>
                <DebugPanel result={debugResult[p._id]} loading={debugging[p._id]} code={userCode[p._id]||''} onApplyFix={fixed=>setUserCode(prev=>({...prev,[p._id]:fixed}))} />
              </div>
            )}
          </div>
        );
      })}
      {!loading && filtered.length===0 && <div style={{ textAlign:'center', padding:40, color:'#b0bec9' }}>No problems found. Adjust filters.</div>}
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────── */
export default function ProblemsPage() {
  const { user } = useAuth();
  const [daily, setDaily]     = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('today');
  const [solving, setSolving] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [msg, setMsg]         = useState('');

  // Platform selection popup — show once per day
  const todayKey = `pragati_platform_${new Date().toDateString()}`;
  const [showPlatformPopup, setShowPlatformPopup] = useState(() => !localStorage.getItem(todayKey));
  const [selectedPlatform, setSelectedPlatform] = useState(() => {
    const saved = localStorage.getItem(todayKey);
    return saved ? PLATFORMS.find(p => p.id === saved) || null : null;
  });

  function handlePlatformSelect(platform) {
    if (platform) {
      localStorage.setItem(todayKey, platform.id);
      setSelectedPlatform(platform);
      // If external platform chosen, open it in a new tab
      if (platform.url) window.open(platform.url, '_blank');
    } else {
      localStorage.setItem(todayKey, 'Custom');
      setSelectedPlatform(PLATFORMS.find(p => p.id === 'Custom'));
    }
    setShowPlatformPopup(false);
  }

  async function fetchData() {
    try {
      const [d, h] = await Promise.all([
        fetch(`${API}/problems/daily`, { headers:tk() }).then(r=>r.json()),
        fetch(`${API}/problems/history`, { headers:tk() }).then(r=>r.json()),
      ]);
      setDaily(d); setHistory(h.history||[]);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }

  useEffect(() => { fetchData(); }, []);

  async function handleSolve(problemId, notes, code, rating) {
    setSolving(true); setMsg('');
    try {
      const res = await fetch(`${API}/problems/${problemId}/solve`, {
        method:'POST', headers:tks(), body:JSON.stringify({ approachNotes:notes, solutionCode:code, selfRating:rating })
      });
      const d = await res.json();
      if (!res.ok) { setMsg(d.error||'Error'); return; }
      setMsg(`🎉 Solved! Streak: ${d.streak} days 🔥`); fetchData();
    } catch(e){ setMsg('Error submitting'); } finally { setSolving(false); }
  }

  async function handleShuffle() {
    setShuffling(true); setMsg('');
    try {
      const res = await fetch(`${API}/problems/shuffle`, { method:'POST', headers:tk() });
      const d = await res.json();
      if (!res.ok) { setMsg(d.error||'Cannot shuffle'); return; }
      setMsg(`🔀 ${d.message}`); fetchData();
    } catch(e){ setMsg('Shuffle error'); } finally { setShuffling(false); }
  }

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
      <div style={{ width:36, height:36, border:'3px solid #e8edf5', borderTopColor:'#531697', borderRadius:'50%', animation:'_ps .7s linear infinite' }} />
      <style>{`@keyframes _ps{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif" }}>
      {showPlatformPopup && <PlatformPopup onSelect={handlePlatformSelect} />}

      <div style={{ marginBottom:18 }}>
        <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.5rem', color:'#0f1a2e' }}>💻 Coding Practice</h1>
        <p style={{ color:'#7a8ba8', marginTop:3 }}>Daily problem · Category-wise list · 🤖 AI Debugging Agent · Platform links</p>
      </div>

      {/* Today's platform banner */}
      {selectedPlatform && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', borderRadius:12, background:`${selectedPlatform.color}08`, border:`1.5px solid ${selectedPlatform.color}30`, marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:'1.2rem' }}>{selectedPlatform.emoji}</span>
            <div>
              <div style={{ fontWeight:800, fontSize:'.85rem', color:selectedPlatform.color }}>Today's Platform: {selectedPlatform.name}</div>
              <div style={{ fontSize:'.7rem', color:'#7a8ba8' }}>{selectedPlatform.desc}</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {selectedPlatform.url && (
              <a href={selectedPlatform.url} target="_blank" rel="noreferrer"
                style={{ padding:'6px 12px', borderRadius:8, border:`1px solid ${selectedPlatform.color}40`, background:`${selectedPlatform.color}10`, color:selectedPlatform.color, fontWeight:700, fontSize:'.75rem', textDecoration:'none' }}>
                Open {selectedPlatform.name} →
              </a>
            )}
            <button onClick={() => setShowPlatformPopup(true)}
              style={{ padding:'6px 12px', borderRadius:8, border:'1px solid #d0d7e8', background:'transparent', color:'#7a8ba8', fontWeight:600, cursor:'pointer', fontSize:'.75rem', fontFamily:"'Nunito',sans-serif" }}>
              Change
            </button>
          </div>
        </div>
      )}

      {/* Streak banner */}
      <div style={{ background:'linear-gradient(135deg,#042c5d,#531697)', borderRadius:14, padding:'16px 22px', marginBottom:16, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        {[['🔥','Streak',`${user?.streak||0} days`],['💻','Solved',`${user?.totalProblemsSolved||0}`],['⭐','Level',user?.skillLevel||'Beginner']].map(([ic,l,v])=>(
          <div key={l} style={{ textAlign:'center' }}>
            <div>{ic}</div>
            <div style={{ color:'rgba(255,255,255,.6)', fontSize:'.65rem', fontWeight:700 }}>{l}</div>
            <div style={{ color:'#fff', fontWeight:800 }}>{v}</div>
          </div>
        ))}
      </div>

      {msg && (
        <div style={{ marginBottom:14, padding:'10px 16px', background:msg.includes('🎉')||msg.includes('🔀')?'rgba(71,211,114,0.1)':'rgba(239,68,68,0.08)', border:`1px solid ${msg.includes('🎉')||msg.includes('🔀')?'rgba(71,211,114,0.3)':'rgba(239,68,68,0.2)'}`, borderRadius:10, fontWeight:700, color:msg.includes('🎉')||msg.includes('🔀')?'#166534':'#991b1b', fontSize:'.88rem' }}>
          {msg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:5, marginBottom:16, borderBottom:'1px solid #e8edf5' }}>
        {[['today',"📅 Today's Problem"],['all','📋 All Problems'],['history',`📜 History (${history.length})`]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{ padding:'8px 16px', borderRadius:'9px 9px 0 0', border:'none', borderBottom:tab===k?'2px solid #531697':'2px solid transparent', background:tab===k?'rgba(83,22,151,.06)':'transparent', color:tab===k?'#531697':'#7a8ba8', fontWeight:700, cursor:'pointer', fontSize:'.83rem', fontFamily:"'Nunito',sans-serif" }}>
            {l}
          </button>
        ))}
      </div>

      {tab==='today' && (
        <>
          {daily?.problem ? (
            <ProblemCard problem={daily.problem} userProblem={daily.userProblem} onSolve={handleSolve} onShuffle={handleShuffle} solving={solving} shuffling={shuffling} />
          ) : (
            <div style={{ textAlign:'center', padding:'60px 0', color:'#b0bec9' }}>
              <div style={{ fontSize:'3rem', marginBottom:10 }}>💻</div>
              <div style={{ fontWeight:700 }}>{daily?.message||'No problem assigned yet'}</div>
              <div style={{ fontSize:'.8rem', marginTop:6 }}>Ask admin to add problems for your level</div>
            </div>
          )}
          <div style={{ marginTop:14, padding:'12px 16px', background:'rgba(83,22,151,0.05)', border:'1px solid rgba(83,22,151,0.1)', borderRadius:10, fontSize:'.78rem', color:'#531697', fontWeight:600 }}>
            💡 Open the problem on {daily?.problem?.source||'LeetCode'} → solve it → paste your code → click <strong>🤖 Debug &amp; Analyse</strong> → then submit to earn streak!
          {daily?.hoursUntilNext > 0 && (
            <span style={{ marginLeft:12, fontWeight:800, color:'#531697' }}>
              ⏰ Next problem in: <CountdownBadge hours={daily.hoursUntilNext} />
            </span>
          )}
          </div>
        </>
      )}

      {tab==='all' && <AllProblemsTab />}

      {tab==='history' && (
        <div className="card" style={{ padding:'16px 22px' }}>
          {history.length===0 ? (
            <div style={{ padding:'40px 0', textAlign:'center', color:'#b0bec9' }}>No solutions yet — solve today's problem!</div>
          ) : history.map(h => <HistoryCard key={h._id} item={h} />)}
        </div>
      )}
    </div>
  );
}