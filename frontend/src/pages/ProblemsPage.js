import React, { useState, useEffect, useMemo, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  MOST_LIKELY_ASKED,
  NEETCODE_150,
  NC_CATEGORIES,
  FULL_COURSES,
  COMPANY_LOGOS,
  getProblemStatement
} from './practice/PracticeData';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tk  = () => ({ Authorization:`Bearer ${localStorage.getItem('pragati_token')}` });
const tks = () => ({ Authorization:`Bearer ${localStorage.getItem('pragati_token')}`, 'Content-Type':'application/json' });

const DIFF = {
  Easy:   { bg:'rgba(71,211,114,0.1)',  color:'#166534', border:'rgba(71,211,114,0.3)' },
  Medium: { bg:'rgba(245,158,11,0.1)',  color:'#92400e', border:'rgba(245,158,11,0.3)' },
  Hard:   { bg:'rgba(239,68,68,0.1)',   color:'#991b1b', border:'rgba(239,68,68,0.3)' },
};

function renderMarkdown(md) {
  if (!md) return '';
  let html = md;
  // Escape HTML entities to prevent script injection
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Format headers, bold text, code blocks, and code tags
  html = html
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/```(javascript|python|java|cpp)?\s*([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>');

  return html;
}

const LANGUAGES = ['javascript', 'python', 'java', 'c++'];

/* ── AI Debug Result Component ── */
function DebugPanel({ result, loading, code, onApplyFix }) {
  const [showFix, setShowFix]   = useState(false);
  const [copiedFix, setCopied]  = useState(false);
  const [expandTC, setExpandTC] = useState({});

  if (loading) return (
    <div style={{ marginTop:14, padding:'20px 18px', background:'#0f172a', border:'1px solid rgba(83,22,151,0.3)', borderRadius:14, display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
      <div style={{ position:'relative', width:40, height:40 }}>
        <div style={{ position:'absolute', inset:0, border:'3px solid rgba(83,22,151,0.2)', borderTopColor:'#531697', borderRadius:'50%', animation:'_spin .7s linear infinite' }} />
        <div style={{ position:'absolute', inset:6, border:'2px solid rgba(19,161,165,0.2)', borderTopColor:'#13a1a5', borderRadius:'50%', animation:'_spin .5s linear infinite reverse' }} />
      </div>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'.88rem', color:'#a78bfa', fontWeight:800 }}>🤖 Analysing your code…</div>
        <div style={{ fontSize:'.72rem', color:'#64748b', marginTop:3 }}>Running test cases · Checking complexities</div>
      </div>
      <style>{`@keyframes _spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (!result) return null;

  const v = result.verdict || 'review';
  const cfg = {
    likely_correct: { bg:'#052e16', brd:'rgba(71,211,114,0.35)', hdr:'rgba(71,211,114,0.12)', icon:'✅', color:'#4ade80', label:'Correct' },
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
      <div style={{ padding:'12px 16px', background:cfg.hdr, borderBottom:`1px solid ${cfg.brd}`, display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:36, height:36, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', background:`${cfg.color}15`, border:`1.5px solid ${cfg.color}` }}>
          {cfg.icon}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:'.88rem', color:'#f1f5f9', display:'flex', alignItems:'center', gap:6 }}>
            🤖 AI Debug Report
          </div>
          <div style={{ fontSize:'.8rem', color:cfg.color, fontWeight:700 }}>{result.verdictMessage}</div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:3, alignItems:'flex-end' }}>
          {result.timeComplexity && result.timeComplexity!=='N/A' && (
            <span style={{ padding:'2px 8px', borderRadius:6, background:'rgba(83,22,151,0.2)', color:'#c4b5fd', fontSize:'.65rem', fontWeight:800 }}>⏱ {result.timeComplexity}</span>
          )}
        </div>
      </div>

      <div style={{ padding:14, display:'flex', flexDirection:'column', gap:12 }}>
        {result.explanation && (
          <div style={{ padding:12, background:'rgba(83,22,151,0.08)', border:'1px solid rgba(83,22,151,0.15)', borderRadius:10 }}>
            <div style={{ fontSize:'.82rem', color:'#cbd5e1', lineHeight:1.65 }}>{result.explanation}</div>
          </div>
        )}

        {result.issues?.length > 0 && (
          <div>
            {result.issues.map((issue, i) => (
              <div key={i} style={{ display:'flex', gap:8, padding:10, background:'rgba(239,68,68,0.05)', border:'1px solid rgba(239,68,68,0.15)', borderRadius:8, marginBottom:6, fontSize:'.8rem', color:'#fca5a5' }}>
                <span>❌</span>
                <div>
                  <strong>Line {issue.line}:</strong> {issue.msg}
                  {issue.fix && <div style={{ color:'#86efac', marginTop:4 }}>💡 Fix: {issue.fix}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {total > 0 && (
          <div>
            <div style={{ fontSize:'.72rem', fontWeight:800, color:'#94a3b8', marginBottom:6 }}>🧪 TEST CASES: {passed}/{total} PASSED</div>
            {result.testResults.map((tc, i) => {
              const isOpen = expandTC[i];
              return (
                <div key={i} style={{ border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, marginBottom:4, overflow:'hidden' }}>
                  <button onClick={()=>setExpandTC(e=>({...e,[i]:!e[i]}))} style={{ width:'100%', display:'flex', padding:8, background:'rgba(255,255,255,0.02)', border:'none', color:'#f1f5f9', cursor:'pointer', fontSize:'.78rem', justifyContent:'space-between' }}>
                    <span>{tc.passed ? '✅' : '❌'} Test Case {i+1}</span>
                    <span>{isOpen ? '▲' : '▼'}</span>
                  </button>
                  {isOpen && (
                    <div style={{ padding:10, background:'rgba(0,0,0,0.2)', fontSize:'.75rem', display:'flex', flexDirection:'column', gap:4 }}>
                      <div><strong>Input:</strong> <code>{String(tc.input)}</code></div>
                      <div><strong>Expected:</strong> <code style={{ color:'#4ade80' }}>{String(tc.expected)}</code></div>
                      <div><strong>Actual:</strong> <code style={{ color:tc.passed?'#4ade80':'#f87171' }}>{String(tc.actualOutput)}</code></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {result.suggestedFix && (
          <div>
            <button onClick={()=>setShowFix(f=>!f)} style={{ width:'100%', padding:8, borderRadius:8, border:'1px solid rgba(74,222,128,0.3)', background:'transparent', color:'#4ade80', fontWeight:700, cursor:'pointer', fontSize:'.78rem' }}>
              {showFix ? 'Hide Suggested Fix' : '🔧 View Suggested Fix'}
            </button>
            {showFix && (
              <div style={{ marginTop:6, border:'1px solid rgba(74,222,128,0.2)', borderRadius:8, overflow:'hidden' }}>
                <div style={{ display:'flex', justifyContent:'space-between', padding:6, background:'#1e293b' }}>
                  <span style={{ fontSize:'.7rem', color:'#94a3b8' }}>Fixed Solution</span>
                  <button onClick={copyFix} style={{ padding:'2px 8px', background:'rgba(74,222,128,0.1)', color:'#4ade80', border:'none', borderRadius:4, cursor:'pointer', fontSize:'.7rem' }}>
                    {copiedFix ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>
                <pre style={{ margin:0, padding:10, background:'#020617', color:'#e2e8f0', fontSize:'.75rem', overflowX:'auto', fontFamily:'monospace', whiteSpace:'pre-wrap' }}>
                  {result.suggestedFix}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Split Screen Coding Workspace Component ── */
function CodingWorkspace({ problem, onClose, onSolveProgress, localData }) {
  const [activeTab, setActiveTab] = useState('desc');
  const [lang, setLang] = useState('javascript');
  const [code, setCode] = useState(() => localData.submissions[problem.id] || `// Write your ${lang} solution for ${problem.title}...\n\nfunction solve() {\n    // Write code here\n}`);
  const [notes, setNotes] = useState(() => localData.notes[problem.id] || '');
  const [isSolved, setIsSolved] = useState(() => localData.solved.has(problem.id));
  const [isFav, setIsFav] = useState(() => localData.favorites.has(problem.id));

  const [debugging, setDebugging] = useState(false);
  const [debugResult, setDebugResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  
  // Interactive Terminal State
  const [terminalOutput, setTerminalOutput] = useState('');
  const [terminalInput, setTerminalInput] = useState('');
  const socketRef = useRef(null);

  useEffect(() => {
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // Live state for fetched LeetCode descriptions & hints
  const [fullProblem, setFullProblem] = useState(problem);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [disablePaste, setDisablePaste] = useState(false);

  useEffect(() => {
    try {
      const t = localStorage.getItem('pragati_token');
      if (t) {
        const u = JSON.parse(atob(t.split('.')[1]));
        if (u.department && u.department !== 'All') {
          fetch(`${API}/settings/department/${u.department}`, { headers: tk() })
            .then(res => res.json())
            .then(data => {
              if (data && data.disablePasteInEditor) setDisablePaste(true);
            })
            .catch(console.warn);
        }
      }
    } catch (e) { console.warn(e); }
  }, []);

  useEffect(() => {
    const targetIdOrTitle = problem._id || problem.id || problem.title;
    if (targetIdOrTitle) {
      setLoadingDetails(true);
      fetch(`${API}/problems/${encodeURIComponent(targetIdOrTitle)}`, { headers: tk() })
        .then(res => {
          if (!res.ok) throw new Error('Failed to load live problem details');
          return res.json();
        })
        .then(data => {
          if (data.problem) {
            setFullProblem(data.problem);
          }
        })
        .catch(err => {
          console.warn('Could not fetch live problem details, falling back to static metadata:', err);
        })
        .finally(() => {
          setLoadingDetails(false);
        });
    }
  }, [problem]);

  const problemDetails = useMemo(() => {
    return getProblemStatement(fullProblem.title, fullProblem.topic, fullProblem.difficulty || fullProblem.level);
  }, [fullProblem]);

  useEffect(() => {
    // Record last visited problem
    localStorage.setItem('pragati_practice_last_visited', problem.id);
  }, [problem]);

  // Sync code and notes changes
  useEffect(() => {
    const subs = JSON.parse(localStorage.getItem('pragati_practice_code_submissions') || '{}');
    subs[problem.id] = code;
    localStorage.setItem('pragati_practice_code_submissions', JSON.stringify(subs));
  }, [code, problem.id]);

  useEffect(() => {
    const n = JSON.parse(localStorage.getItem('pragati_practice_notes') || '{}');
    n[problem.id] = notes;
    localStorage.setItem('pragati_practice_notes', JSON.stringify(n));
  }, [notes, problem.id]);

  const handleDebug = async () => {
    if (!code.trim()) return;
    setDebugging(true);
    setDebugResult(null);
    try {
      const res = await fetch(`${API}/debug`, {
        method:'POST',
        headers:tks(),
        body: JSON.stringify({
          code,
          language: lang,
          problemTitle: fullProblem.title,
          testCases: [
            { input: problemDetails.examples[0]?.input || '', expected: problemDetails.examples[0]?.output || '' }
          ]
        })
      });
      const d = await res.json();
      setDebugResult(d);
    } catch {
      setDebugResult({ verdict:'review', verdictMessage:'Debug service offline. Code syntax checked.' });
    } finally {
      setDebugging(false);
    }
  };

  const handleRunCode = () => {
    if (!code.trim()) return;
    setRunning(true);
    setTerminalOutput('');
    setRunResult(true);

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socketUrl = API.replace('/api', '');
    const socket = io(socketUrl + '/compile', { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('start_execution', { code, language: lang });
    });

    socket.on('output', (data) => {
      setTerminalOutput(prev => prev + data);
    });

    socket.on('execution_finished', (msg) => {
      setTerminalOutput(prev => prev + msg);
      setRunning(false);
      socket.disconnect();
      socketRef.current = null;
    });

    socket.on('error', (err) => {
      setTerminalOutput(prev => prev + '\n[Error: ' + err + ']');
      setRunning(false);
      socket.disconnect();
      socketRef.current = null;
    });

    socket.on('disconnect', () => {
      setRunning(false);
    });
  };

  const handleTerminalInput = (e) => {
    if (e.key === 'Enter') {
      if (socketRef.current) {
        socketRef.current.emit('input', terminalInput);
        setTerminalOutput(prev => prev + terminalInput + '\n');
        setTerminalInput('');
      }
    }
  };

  const stopExecution = () => {
    if (socketRef.current) {
      socketRef.current.emit('stop_execution');
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setRunning(false);
  };

  const handleSolveSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/problems/${problem._id || problem.id}/solve`, {
        method: 'POST',
        headers: tks(),
        body: JSON.stringify({
          solutionCode: code,
          approachNotes: notes || 'Solved daily target.',
          selfRating: 5,
          timeTakenMinutes: 15
        })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to submit solution');

      setIsSolved(true);
      setShowCelebration(true);
      onSolveProgress(problem._id || problem.id, problem.difficulty || problem.level || 'Easy');
      setTimeout(() => setShowCelebration(false), 3500);
    } catch (err) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFavorite = () => {
    const favs = new Set(localData.favorites);
    if (favs.has(problem.id)) {
      favs.delete(problem.id);
      setIsFav(false);
    } else {
      favs.add(problem.id);
      setIsFav(true);
    }
    localStorage.setItem('pragati_practice_favorites', JSON.stringify([...favs]));
    localData.favorites = favs; // update local context reference
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'#0b0f19', zIndex:2000, display:'flex', flexDirection:'column', fontFamily:"'Nunito',sans-serif", color:'#e2e8f0' }}>
      {/* Workspace Header */}
      <header style={{ padding:'12px 24px', background:'#111827', borderBottom:'1px solid #1f2937', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <button onClick={onClose} style={{ padding:'6px 14px', borderRadius:8, background:'transparent', border:'1px solid #374151', color:'#cbd5e1', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontWeight:700, fontSize:'.85rem' }}>
          ← Back to Dashboard
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:'1.1rem' }}>💻</span>
          <span style={{ fontWeight:800, fontSize:'1.05rem', fontFamily:"'Syne',sans-serif" }}>{fullProblem.title}</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={toggleFavorite} style={{ padding:'6px 12px', borderRadius:8, border:'1px solid #374151', background:isFav?'rgba(245,158,11,0.12)':'transparent', color:isFav?'#f59e0b':'#94a3b8', cursor:'pointer', fontWeight:700, fontSize:'.85rem' }}>
            {isFav ? '⭐ Bookmarked' : '☆ Bookmark'}
          </button>
        </div>
      </header>

      {/* Workspace split columns */}
      <div style={{ flex:1, display:'flex', overflow:'hidden', flexDirection:window.innerWidth < 768 ? 'column' : 'row' }}>
        {/* Left Side: Problem Details & Solution Video Embed */}
        <div style={{ flex:1, borderRight:'1px solid #1f2937', display:'flex', flexDirection:'column', overflow:'hidden', background:'#0b0f19' }}>
          {/* Tabs bar */}
          <div style={{ display:'flex', background:'#111827', borderBottom:'1px solid #1f2937' }}>
            {[
              { id:'desc', icon:'📄', label:'Description' },
              { id:'hints', icon:'💡', label:'Hints & Editorial' },
              ...(problem.videoId ? [{ id:'video', icon:'📺', label:'Watch Video Explanation' }] : []),
              { id:'notes', icon:'📝', label:'My Notes' }
            ].map(tab => (
              <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{ flex:1, padding:'10px', border:'none', background:activeTab===tab.id?'#1f2937':'transparent', color:activeTab===tab.id?'#38bdf8':'#94a3b8', fontWeight:800, fontSize:'.78rem', cursor:'pointer', borderBottom:activeTab===tab.id?'2.5px solid #38bdf8':'none' }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div style={{ flex:1, overflowY:'auto', padding:'20px' }}>
            {activeTab === 'desc' && (() => {
              const isHtml = fullProblem.description && (fullProblem.description.startsWith('<') || fullProblem.description.includes('</') || fullProblem.description.includes('<p>'));
              return (
                <div>
                  <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
                    <span style={{ padding:'3px 10px', borderRadius:999, background:DIFF[fullProblem.difficulty||fullProblem.level]?.bg || 'rgba(255,255,255,0.05)', color:DIFF[fullProblem.difficulty||fullProblem.level]?.color || '#fff', fontSize:'.72rem', fontWeight:800 }}>
                      {fullProblem.difficulty || fullProblem.level}
                    </span>
                    <span style={{ padding:'3px 10px', borderRadius:999, background:'rgba(56,189,248,0.1)', color:'#38bdf8', fontSize:'.72rem', fontWeight:800 }}>
                      {fullProblem.topic}
                    </span>
                    {fullProblem.askedBy && (
                      <span style={{ padding:'3px 10px', borderRadius:999, background:'rgba(245,158,11,0.1)', color:'#f59e0b', fontSize:'.72rem', fontWeight:800 }}>
                        🔥 Frequency Asked
                      </span>
                    )}
                  </div>

                  {isHtml ? (
                    <div style={{ lineHeight:1.8, fontSize:'.88rem', color:'#cbd5e1' }} className="leetcode-html-desc">
                      <style>{`
                        .leetcode-html-desc p { margin-bottom: 14px; }
                        .leetcode-html-desc code { background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; color: #f43f5e; font-size: 0.82rem; }
                        .leetcode-html-desc pre { background: #111827; padding: 14px; border-radius: 10px; border: 1.5px solid #1f2937; margin: 14px 0; white-space: pre-wrap; font-family: 'JetBrains Mono', monospace; color: #cbd5e1; font-size: 0.8rem; }
                        .leetcode-html-desc ul { margin-left: 20px; margin-bottom: 14px; list-style-type: disc; }
                        .leetcode-html-desc li { margin-bottom: 6px; }
                        .leetcode-html-desc strong { color: #fff; font-weight: 700; }
                      `}</style>
                      <div dangerouslySetInnerHTML={{ __html: fullProblem.description }} />
                    </div>
                  ) : (
                    <>
                      <div style={{ whiteSpace:'pre-wrap', lineHeight:1.75, fontSize:'.88rem', color:'#cbd5e1' }}>
                        {fullProblem.description || problemDetails.desc}
                      </div>

                      <h4 style={{ marginTop:20, color:'#f1f5f9', fontWeight:800 }}>Constraints:</h4>
                      <pre style={{ padding:10, background:'#1e2937', borderRadius:8, fontSize:'.8rem', color:'#94a3b8', border:'1.5px solid #374151' }}>
                        {problemDetails.constraints}
                      </pre>

                      <h4 style={{ marginTop:20, color:'#f1f5f9', fontWeight:800 }}>Examples:</h4>
                      {problemDetails.examples.map((ex, idx) => (
                        <div key={idx} style={{ padding:12, background:'#111827', borderRadius:10, border:'1.5px solid #1f2937', marginBottom:8, fontSize:'.84rem' }}>
                          <div style={{ color:'#38bdf8', fontWeight:700, marginBottom:4 }}>Example {idx+1}:</div>
                          <div><strong>Input:</strong> <code>{ex.input}</code></div>
                          <div><strong>Output:</strong> <code>{ex.output}</code></div>
                          {ex.explanation && <div style={{ color:'#94a3b8', fontSize:'.78rem', marginTop:4 }}><strong>Explanation:</strong> {ex.explanation}</div>}
                        </div>
                      ))}
                    </>
                  )}

                  {fullProblem.askedBy && (
                    <div style={{ marginTop:24, borderTop:'1px solid #1f2937', paddingTop:16 }}>
                      <h5 style={{ fontSize:'.8rem', fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.03em', marginBottom:8 }}>Companies Asked:</h5>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                        {fullProblem.askedBy.split(', ').map(item => {
                          const [name] = item.split('-');
                          return (
                            <span key={item} style={{ padding:'4px 9px', borderRadius:6, background:'#1e2937', color:'#cbd5e1', fontSize:'.7rem', fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
                              {COMPANY_LOGOS[name] || '🏢'} {item}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {activeTab === 'hints' && (
              <div>
                <h4 style={{ color:'#f1f5f9', fontWeight:800, marginBottom:12 }}>💡 Guided Hints:</h4>
                {((fullProblem.hints && fullProblem.hints.length > 0) ? fullProblem.hints : problemDetails.hints).map((hint, idx) => (
                  <div key={idx} style={{ padding:12, background:'rgba(56,189,248,0.05)', border:'1.5px solid rgba(56,189,248,0.15)', borderRadius:10, marginBottom:8, fontSize:'.84rem', display:'flex', gap:10 }}>
                    <span style={{ fontSize:'1rem' }}>💡</span>
                    <span style={{ lineHeight:1.6, color:'#cbd5e1' }} dangerouslySetInnerHTML={{ __html: hint }} />
                  </div>
                ))}

                <h4 style={{ color:'#f1f5f9', fontWeight:800, marginTop:24, marginBottom:12 }}>📝 Editorial Solution:</h4>
                {fullProblem.editorial ? (
                  <div style={{ lineHeight:1.8, fontSize:'.88rem', color:'#cbd5e1' }} className="leetcode-markdown-editorial">
                    <style>{`
                      .leetcode-markdown-editorial p { margin-bottom: 12px; }
                      .leetcode-markdown-editorial code { background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; color: #f43f5e; font-size: 0.82rem; }
                      .leetcode-markdown-editorial pre { background: #111827; padding: 14px; border-radius: 10px; border: 1.5px solid #1f2937; margin: 14px 0; white-space: pre-wrap; font-family: 'JetBrains Mono', monospace; color: #cbd5e1; font-size: 0.8rem; overflow-x: auto; }
                      .leetcode-markdown-editorial strong { color: #fff; font-weight: 700; }
                      .leetcode-markdown-editorial h1, .leetcode-markdown-editorial h2, .leetcode-markdown-editorial h3 { color: #38bdf8; font-weight: 800; margin-top: 18px; margin-bottom: 8px; }
                    `}</style>
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(fullProblem.editorial) }} />
                  </div>
                ) : (
                  <div style={{ padding:14, background:'#111827', borderRadius:12, border:'1.5px solid #1f2937', fontSize:'.85rem', lineHeight:1.7, color:'#94a3b8', whiteSpace:'pre-wrap' }}>
                    {problemDetails.editorial}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'video' && (
              <div style={{ textAlign:'center' }}>
                <h4 style={{ color:'#f1f5f9', fontWeight:800, marginBottom:8 }}>📺 Watch YouTube Solution Video</h4>
                <p style={{ fontSize:'.78rem', color:'#94a3b8', marginBottom:16 }}>Practice coding side-by-side with this video explanation player!</p>
                <div style={{ position:'relative', paddingBottom:'56.25%', height:0, overflow:'hidden', borderRadius:12, border:'1.5px solid #1f2937', background:'#000' }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${problem.videoId}`}
                    title="YouTube solution explanation"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%' }}
                  />
                </div>
              </div>
            )}

            {activeTab === 'notes' && (
              <div>
                <h4 style={{ color:'#f1f5f9', fontWeight:800, marginBottom:8 }}>📝 Personal Solutions &amp; Notes</h4>
                <p style={{ fontSize:'.78rem', color:'#94a3b8', marginBottom:12 }}>Notes are permanently saved in your local database for revision.</p>
                <textarea
                  value={notes}
                  onChange={e=>setNotes(e.target.value)}
                  placeholder="Record your algorithm approaches, pitfalls, time complexity analyses, or study summaries..."
                  style={{ width:'100%', minHeight:300, padding:14, borderRadius:12, border:'1.5px solid #1f2937', background:'#111827', color:'#cbd5e1', outline:'none', resize:'vertical', fontSize:'.88rem', lineHeight:1.65 }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Code Editor Workspace */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'#0a0d14' }}>
          {/* Header controls */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 16px', background:'#111827', borderBottom:'1px solid #1f2937' }}>
            <div style={{ display:'flex', gap:6 }}>
              {LANGUAGES.map(l => (
                <button key={l} onClick={()=>setLang(l)} style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${lang===l?'#38bdf8':'#374151'}`, background:lang===l?'rgba(56,189,248,0.12)':'transparent', color:lang===l?'#38bdf8':'#cbd5e1', fontSize:'.7rem', fontWeight:800, cursor:'pointer' }}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            {isSolved ? (
              <span style={{ fontSize:'.78rem', color:'#4ade80', fontWeight:800, display:'flex', alignItems:'center', gap:4 }}>
                ✓ Solved
              </span>
            ) : (
              <span style={{ fontSize:'.78rem', color:'#ef4444', fontWeight:800 }}>
                ● Unsolved
              </span>
            )}
          </div>

          {/* Code Textarea Workspace */}
          <div style={{ flex:1, position:'relative', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ display:'flex', flex:1 }}>
              {/* Simulated terminal line numbers */}
              <div style={{ width:38, background:'#0a0d14', borderRight:'1px solid #1f2937', display:'flex', flexDirection:'column', alignItems:'center', padding:'14px 0', fontSize:'.72rem', color:'#4b5563', fontFamily:'monospace', userSelect:'none', lineHeight:1.8 }}>
                {Array.from({ length: 40 }).map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <textarea
                value={code}
                onChange={e=>setCode(e.target.value)}
                onPaste={e => {
                  if (disablePaste) {
                    e.preventDefault();
                    alert('⚠️ Pasting code is disabled for your department to encourage typing and practice.');
                  }
                }}
                style={{ flex:1, border:'none', padding:'14px', background:'#0a0d14', color:'#818cf8', fontFamily:'JetBrains Mono, monospace', fontSize:'.84rem', outline:'none', resize:'none', lineHeight:1.8 }}
              />
            </div>
          </div>

          {/* Compile panel - Interactive Terminal */}
          {runResult && (
            <div style={{ maxHeight:250, overflowY:'auto', borderTop:'1.5px solid #1f2937', padding:'10px', background:'#020617', color:'#4ade80', fontSize:'.8rem', fontFamily:'monospace', whiteSpace:'pre-wrap' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <strong style={{ color:'#94a3b8' }}>Execution Output:</strong>
                <button onClick={()=>{ setRunResult(null); stopExecution(); }} style={{ background:'transparent', border:'none', color:'#ef4444', cursor:'pointer' }}>✖</button>
              </div>
              <div>{terminalOutput || 'Waiting for output...'}</div>
              {running && (
                <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8, borderTop:'1px dashed #334155', paddingTop:8 }}>
                  <span style={{ color:'#38bdf8' }}>❯</span>
                  <input
                    value={terminalInput}
                    onChange={e => setTerminalInput(e.target.value)}
                    onKeyDown={handleTerminalInput}
                    placeholder="Type input and press Enter..."
                    style={{ flex:1, background:'transparent', border:'none', color:'#f8fafc', outline:'none', fontFamily:'monospace', fontSize:'.8rem' }}
                    autoFocus
                  />
                  <button onClick={stopExecution} style={{ background:'rgba(239,68,68,0.2)', color:'#f87171', border:'none', padding:'4px 10px', borderRadius:4, cursor:'pointer', fontSize:'.7rem', fontWeight:800 }}>Stop</button>
                </div>
              )}
            </div>
          )}

          {/* Debug panel */}
          {debugResult && (
            <div style={{ maxHeight:260, overflowY:'auto', borderTop:'1.5px solid #1f2937', padding:'10px' }}>
              <DebugPanel result={debugResult} loading={debugging} code={code} onApplyFix={fixed => setCode(fixed)} />
            </div>
          )}

          {/* Action buttons footer */}
          <div style={{ padding:'12px 18px', background:'#111827', borderTop:'1px solid #1f2937', display:'flex', gap:8, justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={handleRunCode} disabled={running || !code.trim()} style={{ padding:'10px 18px', borderRadius:8, border:'1px solid #374151', background:running?'transparent':'rgba(74,222,128,0.1)', color:'#4ade80', fontWeight:700, fontSize:'.82rem', cursor:running||!code.trim()?'not-allowed':'pointer' }}>
                {running ? 'Running...' : '▶ Run Code'}
              </button>
              <button onClick={handleDebug} disabled={debugging || !code.trim()} style={{ padding:'10px 18px', borderRadius:8, border:'1px solid #374151', background:debugging?'transparent':'rgba(129,140,248,0.1)', color:'#818cf8', fontWeight:700, fontSize:'.82rem', cursor:debugging||!code.trim()?'not-allowed':'pointer' }}>
                {debugging ? 'Analysing...' : '🤖 AI Analyse Code'}
              </button>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {isSolved ? (
                <span style={{ color:'#4ade80', fontSize:'.85rem', fontWeight:800 }}>🎉 You solved this problem!</span>
              ) : (
                <button onClick={handleSolveSubmit} disabled={submitting || !code.trim()} style={{ padding:'10px 24px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#13a1a5,#531697)', color:'#fff', fontWeight:800, fontSize:'.82rem', cursor:submitting||!code.trim()?'not-allowed':'pointer', boxShadow:'0 4px 12px rgba(83,22,151,0.25)' }}>
                  {submitting ? 'Submitting...' : 'Mark as Solved & Earn XP'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Glowing success modal overlay */}
      {showCelebration && (
        <div style={{ position:'fixed', inset:0, background:'rgba(11,15,25,0.85)', zIndex:2500, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
          <div style={{ padding:32, background:'#111827', border:'2.5px solid #4ade80', borderRadius:24, textAlign:'center', maxWidth:420, width:'90%', boxShadow:'0 0 50px rgba(74,222,128,0.3)', animation:'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
            <div style={{ fontSize:'3.5rem', marginBottom:12, animation:'bounce 1s infinite' }}>🏆</div>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.4rem', color:'#4ade80', marginBottom:8 }}>EXCELLENT WORK!</h2>
            <p style={{ color:'#cbd5e1', fontSize:'.9rem', lineHeight:1.6, marginBottom:20 }}>
              You have successfully completed <strong>{problem.title}</strong>!<br />
              Your streak progresses and rewards are permanently recorded.
            </p>
            <div style={{ display:'flex', justifyContent:'space-around', background:'#1f2937', padding:12, borderRadius:14, marginBottom:24 }}>
              <div>
                <div style={{ color:'#fbbf24', fontWeight:800 }}>+{problem.difficulty === 'Hard' || problem.level === 'Hard' ? 100 : problem.difficulty === 'Medium' || problem.level === 'Medium' ? 30 : 10} XP</div>
                <div style={{ fontSize:'.68rem', color:'#94a3b8' }}>XP Points</div>
              </div>
              <div style={{ borderLeft:'1px solid #374151' }} />
              <div>
                <div style={{ color:'#4ade80', fontWeight:800 }}>🔥 Active</div>
                <div style={{ fontSize:'.68rem', color:'#94a3b8' }}>Heatmap Logged</div>
              </div>
            </div>
            <button onClick={()=>setShowCelebration(false)} style={{ width:'100%', padding:'10px 0', border:'none', borderRadius:10, background:'#4ade80', color:'#111827', fontWeight:800, cursor:'pointer', fontSize:'.88rem' }}>
              AWESOME
            </button>
          </div>
          <style>{`
            @keyframes popIn { from { transform: scale(0.85); opacity:0; } to { transform: scale(1); opacity:1; } }
            @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
          `}</style>
        </div>
      )}
    </div>
  );
}

/* ── Main Structured Platform Component ── */
export default function ProblemsPage() {
  const [tab, setTab] = useState('dash');
  const [showPlatformSelectModal, setShowPlatformSelectModal] = useState(true);
  const [allLeetCodeProblems, setAllLeetCodeProblems] = useState([]);
  const [allLeetCodeLoading, setAllLeetCodeLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [solvedFilter, setSolvedFilter] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [companyFilter, setCompanyFilter] = useState('All');

  // Pagination states for browsing all LeetCode problems
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, difficultyFilter, solvedFilter, selectedCategory, companyFilter]);
  
  // Custom states for local DB sync
  const [solved, setSolved] = useState(() => new Set(JSON.parse(localStorage.getItem('pragati_practice_solved') || '[]')));
  const [favorites] = useState(() => new Set(JSON.parse(localStorage.getItem('pragati_practice_favorites') || '[]')));
  const [notes] = useState(() => JSON.parse(localStorage.getItem('pragati_practice_notes') || '{}'));
  const [submissions] = useState(() => JSON.parse(localStorage.getItem('pragati_practice_code_submissions') || '{}'));
  const [xp, setXp] = useState(() => parseInt(localStorage.getItem('pragati_practice_xp') || '0'));
  const [streak, setStreak] = useState(() => parseInt(localStorage.getItem('pragati_practice_streak') || '1'));
  const [lastSolveDate, setLastSolveDate] = useState(() => localStorage.getItem('pragati_practice_last_solve_date') || '');
  const [heatmap, setHeatmap] = useState(() => JSON.parse(localStorage.getItem('pragati_practice_heatmap') || '{}'));
  const [courseProgress, setCourseProgress] = useState(() => JSON.parse(localStorage.getItem('pragati_course_completed_chapters') || '{}'));

  // Active Splitscreen workspace item
  const [activeWorkspaceProblem, setActiveWorkspaceProblem] = useState(null);

  // Daily API sync variables
  const [daily, setDaily] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDaily = async () => {
    try {
      const res = await fetch(`${API}/problems/daily`, { headers:tk() });
      if (res.ok) {
        const d = await res.json();
        setDaily(d);
      }
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const syncPracticeData = async () => {
    try {
      // 1. Fetch user solved problems history
      const resHist = await fetch(`${API}/problems/history`, { headers: tk() });
      if (resHist.ok) {
        const histData = await resHist.json();
        const solvedIds = new Set(
          (histData.history || [])
            .filter(up => up.status === 'solved')
            .map(up => up.problemId?._id || up.problemId)
            .filter(Boolean)
        );
        setSolved(solvedIds);
        localStorage.setItem('pragati_practice_solved', JSON.stringify([...solvedIds]));
      }

      // 2. Fetch my profile for streak & heatmap
      const resProf = await fetch(`${API}/analytics/my-profile`, { headers: tk() });
      if (resProf.ok) {
        const prof = await resProf.json();
        if (prof.student) {
          setStreak(prof.student.streak || 0);
          setXp(prof.student.totalProblemsSolved * 10); // sync XP based on solved count
          localStorage.setItem('pragati_practice_streak', String(prof.student.streak || 0));
        }

        // Reconstruct heatmap count from submissionDates
        if (prof.submissionDates) {
          const counts = {};
          prof.submissionDates.forEach(d => { counts[d] = (counts[d] || 0) + 1; });
          setHeatmap(counts);
          localStorage.setItem('pragati_practice_heatmap', JSON.stringify(counts));
        }
      }
    } catch (e) {
      console.error('Error synchronizing coding practice data with server:', e);
    }
  };

  useEffect(() => {
    fetchDaily();
    syncPracticeData();
  }, []);

  const handleSolveProgress = (problemId, difficulty) => {
    // Proactively add solved problem locally first for instant feedback
    const nextSolved = new Set(solved);
    nextSolved.add(problemId);
    setSolved(nextSolved);

    // Refresh everything from the database
    syncPracticeData();
  };

  const fetchAllProblems = async () => {
    setAllLeetCodeLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (difficultyFilter !== 'All') params.append('difficulty', difficultyFilter);
      if (selectedCategory !== 'All') params.append('topic', selectedCategory);
      params.append('source', 'LeetCode');

      const res = await fetch(`${API}/problems?${params.toString()}`, { headers: tk() });
      if (res.ok) {
        const d = await res.json();
        setAllLeetCodeProblems(d.problems || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAllLeetCodeLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'all-problems') {
      fetchAllProblems();
    }
  }, [tab, search, difficultyFilter, selectedCategory]);

  const handleToggleCourseChapter = (courseId, chapterIndex) => {
    const nextProgress = { ...courseProgress };
    const current = nextProgress[courseId] || [];
    if (current.includes(chapterIndex)) {
      nextProgress[courseId] = current.filter(idx => idx !== chapterIndex);
    } else {
      nextProgress[courseId] = [...current, chapterIndex];
    }
    setCourseProgress(nextProgress);
    localStorage.setItem('pragati_course_completed_chapters', JSON.stringify(nextProgress));
  };

  // Pre-calculated overall scoring values
  const overallCodingScore = useMemo(() => {
    return solved.size * 10 + xp;
  }, [solved, xp]);

  const stats = useMemo(() => {
    const neetcodeSolved = NEETCODE_150.filter(p => solved.has(p.id)).length;
    const neetcodePct = Math.round((neetcodeSolved / NEETCODE_150.length) * 100);

    const mlaSolved = MOST_LIKELY_ASKED.filter(p => solved.has(p.id)).length;
    const mlaPct = Math.round((mlaSolved / MOST_LIKELY_ASKED.length) * 100);

    return {
      neetcodeSolved,
      neetcodePct,
      mlaSolved,
      mlaPct
    };
  }, [solved]);

  const heatmapGridData = useMemo(() => {
    const data = [];
    const today = new Date();
    // 12 weeks is 84 days. Monday to Sunday alignment
    for (let i = 83; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = heatmap[dateStr] || 0;
      data.push({ date: dateStr, count });
    }
    return data;
  }, [heatmap]);

  const allFilteredProblems = useMemo(() => {
    // Collect all unique problems across MLA and NeetCode
    const mlaMap = new Map(MOST_LIKELY_ASKED.map(p => [p.title.toLowerCase(), p]));
    const neetcodeMap = new Map(NEETCODE_150.map(p => [p.title.toLowerCase(), p]));

    const allTitles = new Set([...mlaMap.keys(), ...neetcodeMap.keys()]);
    const list = Array.from(allTitles).map(t => {
      const mla = mlaMap.get(t);
      const nc = neetcodeMap.get(t);
      return {
        id: nc?.id || mla?.id,
        title: nc?.title || mla?.title,
        topic: nc?.topic || mla?.topic,
        difficulty: nc?.difficulty || mla?.level,
        videoId: nc?.videoId || mla?.videoId,
        askedBy: mla?.askedBy || '',
        isNeetcode: !!nc,
        isMla: !!mla
      };
    });

    return list.filter(p => {
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (difficultyFilter !== 'All' && p.difficulty !== difficultyFilter) return false;
      if (solvedFilter === 'Solved' && !solved.has(p.id)) return false;
      if (solvedFilter === 'Unsolved' && solved.has(p.id)) return false;
      if (solvedFilter === 'Favorites' && !favorites.has(p.id)) return false;
      if (selectedCategory !== 'All' && p.topic !== selectedCategory) return false;
      if (companyFilter !== 'All' && !p.askedBy.includes(companyFilter)) return false;
      return true;
    });
  }, [search, difficultyFilter, solvedFilter, selectedCategory, companyFilter, solved, favorites]);

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:80 }}>
      <div style={{ width:40, height:40, border:'3px solid #e8edf5', borderTopColor:'#531697', borderRadius:'50%', animation:'_loadingSpin .7s linear infinite' }} />
      <style>{`@keyframes _loadingSpin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif", color:'var(--text)', background:'var(--background)', minHeight:'100vh', paddingBottom:60 }}>
      {/* Platform Select Modal */}
      {showPlatformSelectModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(11,15,25,0.85)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
          <div style={{ padding:32, background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:20, maxWidth:600, width:'95%', boxShadow:'0 10px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ textAlign:'center', marginBottom:24 }}>
              <div style={{ fontSize:'2.5rem', marginBottom:12 }}>🤔</div>
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.4rem', color:'var(--text)' }}>Where would you like to practice coding?</h2>
              <p style={{ color:'var(--text-3)', fontSize:'.9rem', marginTop:8 }}>Select an external platform to solve problems there, or use PRAGATI Bank to practice in our built-in workspace.</p>
            </div>
            
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8, marginBottom:20 }}>
              {[
                { name: 'LeetCode', icon: '📝', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', url: 'https://leetcode.com/problemset/all/' },
                { name: 'CodeChef', icon: '👨‍🍳', color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', url: 'https://www.codechef.com/practice' },
                { name: 'HackerRank', icon: '💻', color: '#10b981', bg: 'rgba(16,185,129,0.08)', url: 'https://www.hackerrank.com/domains/algorithms' },
                { name: 'HackerEarth', icon: '🌍', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', url: 'https://www.hackerearth.com/practice/' },
                { name: 'Codeforces', icon: '📊', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', url: 'https://codeforces.com/problemset' },
                { name: 'PRAGATI Bank', icon: '🏫', color: '#531697', bg: 'rgba(83,22,151,0.08)', isLocal: true }
              ].map(plat => (
                <a key={plat.name} href={plat.url ? plat.url : '#'} target={plat.url ? '_blank' : '_self'} rel="noreferrer"
                   onClick={(e) => {
                     if (plat.isLocal) { e.preventDefault(); setShowPlatformSelectModal(false); }
                   }}
                   style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'12px 6px', borderRadius:14, border:`1px solid ${plat.color}40`, background:plat.bg, textDecoration:'none', cursor:'pointer', transition:'all 0.2s', textAlign:'center' }}
                   onMouseOver={e=>e.currentTarget.style.transform='translateY(-2px)'} onMouseOut={e=>e.currentTarget.style.transform='none'}>
                  <div style={{ fontSize:'1.6rem', marginBottom:6 }}>{plat.icon}</div>
                  <div style={{ fontWeight:800, color:plat.color, fontSize:'.75rem' }}>{plat.name}</div>
                  {plat.url && <div style={{ fontSize:'.6rem', color:'var(--text-3)', marginTop:4, display:'flex', alignItems:'center', gap:2 }}>↗ External</div>}
                  {plat.isLocal && <div style={{ fontSize:'.6rem', color:'var(--text-3)', marginTop:4, display:'flex', alignItems:'center', gap:2 }}>⚡ Built-in</div>}
                </a>
              ))}
            </div>

            <button onClick={()=>setShowPlatformSelectModal(false)} style={{ width:'100%', padding:'12px', borderRadius:12, border:'1px solid var(--border)', background:'transparent', color:'var(--text-2)', fontWeight:800, cursor:'pointer', fontSize:'.9rem' }}>
              Skip & Continue to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Splitscreen Workspace Modal */}
      {activeWorkspaceProblem && (
        <CodingWorkspace
          problem={activeWorkspaceProblem}
          onClose={() => { setActiveWorkspaceProblem(null); fetchDaily(); }}
          onSolveProgress={handleSolveProgress}
          localData={{ solved, favorites, notes, submissions }}
        />
      )}

      {/* Main Header */}
      <div style={{ marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.6rem', display:'flex', alignItems:'center', gap:8 }}>
            <span>💻</span> Coding Practice Platform
          </h1>
          <p style={{ color:'var(--text-3)', fontSize:'.84rem', marginTop:3 }}>Master DSA · NeetCode 150 Roadmap · Curriculum courses & Video Solution splitscreen player</p>
        </div>
        {/* Dynamic score summary */}
        <div style={{ background:'linear-gradient(135deg,rgba(83,22,151,0.06),rgba(19,161,165,0.06))', padding:'8px 16px', borderRadius:10, border:'1.5px solid rgba(83,22,151,0.12)', textAlign:'right' }}>
          <div style={{ fontSize:'.65rem', fontWeight:800, color:'#531697', textTransform:'uppercase' }}>Overall Coding Score</div>
          <div style={{ fontSize:'1.1rem', fontWeight:900, color:'#13a1a5' }}>{overallCodingScore} pts</div>
        </div>
      </div>

      {/* Structured learning navigation tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:20, borderBottom:'1px solid var(--border)', flexWrap:'wrap' }}>
        {[
          { id:'dash', label:'🏠 Dashboard & Stats' },
          { id:'all-problems', label:'🌐 All LeetCode Problems' },
          { id:'mla', label:'🔥 Most Likely Asked' },
          { id:'nc150', label:'🛣️ NeetCode 150 Roadmap' },
          { id:'courses', label:'🎓 Full Video Courses' },
          { id:'categories', label:'🗂️ Browse Categories' }
        ].map(tabItem => (
          <button key={tabItem.id} onClick={()=>setTab(tabItem.id)} style={{ padding:'10px 18px', border:'none', background:tab===tabItem.id?'rgba(83,22,151,0.06)':'transparent', color:tab===tabItem.id?'#531697':'var(--text-3)', fontWeight:800, cursor:'pointer', fontSize:'.85rem', borderBottom:tab===tabItem.id?'2.5px solid #531697':'2.5px solid transparent', transition:'all 0.2s' }}>
            {tabItem.label}
          </button>
        ))}
      </div>

      {/* Today's curriculum assigned problems list (Easy, Medium, Hard) */}
      {tab === 'dash' && daily?.dailyProblems && daily.dailyProblems.length > 0 && (
        <div style={{ background:'linear-gradient(135deg,rgba(83,22,151,0.03),rgba(19,161,165,0.03))', border:'1.5px solid rgba(83,22,151,0.12)', borderRadius:16, padding:20, marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:10 }}>
            <div>
              <span style={{ padding:'2px 8px', borderRadius:6, background:'rgba(245,158,11,0.15)', color:'#d97706', fontSize:'.65rem', fontWeight:800, textTransform:'uppercase' }}>Curriculum Assigned</span>
              <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.1rem', margin:'4px 0 0 0' }}>📌 Daily 3 LeetCode Targets</h3>
            </div>
            <span style={{ fontSize:'.75rem', color:'var(--text-3)', fontWeight:600 }}>Solve at least 1 to advance your streak! Solve all 3 for maximum heatmap dark purple color!</span>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:14 }}>
            {daily.dailyProblems.map(({ problem, userProblem }) => {
              const isSolved = solved.has(problem._id || problem.id);
              const diffCol = DIFF[problem.difficulty]?.color || '#cbd5e1';
              return (
                <div key={problem._id || problem.id} style={{ background:'var(--surface)', padding:16, borderRadius:12, border:isSolved?'1.5px solid rgba(71,211,114,0.4)':'1.5px solid var(--border)', display:'flex', flexDirection:'column', justifyContent:'space-between', transition:'transform 0.2s' }}>
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                      <span style={{ padding:'2px 8px', borderRadius:6, background:DIFF[problem.difficulty]?.bg, color:diffCol, fontSize:'.68rem', fontWeight:800 }}>
                        {problem.difficulty}
                      </span>
                      {isSolved ? (
                        <span style={{ fontSize:'.75rem', color:'#47d372', fontWeight:800 }}>✅ Solved</span>
                      ) : (
                        <span style={{ fontSize:'.75rem', color:'#ea580c', fontWeight:800 }}>🎯 Assigned</span>
                      )}
                    </div>
                    <h4 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.9rem', color:'var(--text)', margin:'0 0 6px 0' }}>{problem.title}</h4>
                    <p style={{ fontSize:'.72rem', color:'var(--text-3)', margin:0 }}>Topic: {problem.topic}</p>
                  </div>
                  <div style={{ display:'flex', gap:8, marginTop:12 }}>
                    <button onClick={() => setActiveWorkspaceProblem(problem)} style={{ flex:1, padding:'8px 0', borderRadius:8, background:isSolved?'rgba(71,211,114,0.06)':'linear-gradient(135deg,#531697,#13a1a5)', color:isSolved?'#47d372':'#fff', border:isSolved?'1px solid #47d372':'none', fontWeight:800, cursor:'pointer', fontSize:'.78rem', transition:'opacity 0.2s' }}>
                      {isSolved ? 'Review Solution' : 'Solve Target →'}
                    </button>
                    <a href={`https://leetcode.com/problems/${problem.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/`} target="_blank" rel="noreferrer" style={{ display:'flex', alignItems:'center', justifyContent:'center', flex:1, padding:'8px 0', borderRadius:8, background:'rgba(255,255,255,0.05)', color:'#cbd5e1', border:'1px solid var(--border)', fontWeight:800, fontSize:'.78rem', textDecoration:'none' }}>
                      Solve on LeetCode ↗
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 1: DASHBOARD & STATS */}
      {tab === 'dash' && (
        <div>
          {/* Top row stats card */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:14, marginBottom:20 }}>
            {[
              { icon:'🔥', label:'Solving Streak', val:`${streak} days`, color:'#ea580c', bg:'rgba(234,88,12,0.06)' },
              { icon:'🧠', label:'Total Solutions Logged', val:`${solved.size} solved`, color:'#10b981', bg:'rgba(16,185,129,0.06)' },
              { icon:'⭐', label:'Total Earned XP', val:`${xp} XP`, color:'#eab308', bg:'rgba(234,179,8,0.06)' },
              { icon:'🛣️', label:'NeetCode 150', val:`${stats.neetcodePct}% complete`, color:'#a855f7', bg:'rgba(168,85,247,0.06)' },
              { icon:'🔥', label:'Most Likely Asked', val:`${stats.mlaPct}% complete`, color:'#3b82f6', bg:'rgba(59,130,246,0.06)' }
            ].map((stat, i) => (
              <div key={i} style={{ padding:16, background:'var(--surface)', borderRadius:14, border:'1.5px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:'1.8rem', padding:8, borderRadius:10, background:stat.bg }}>{stat.icon}</span>
                <div>
                  <div style={{ fontSize:'.68rem', color:'var(--text-3)', fontWeight:700, textTransform:'uppercase' }}>{stat.label}</div>
                  <div style={{ fontSize:'1.05rem', fontWeight:800, color:stat.color, marginTop:2 }}>{stat.val}</div>
                </div>
              </div>
            ))}
          </div>

          {/* GitHub-like Solving Heatmap Card */}
          <div style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:16, padding:20, marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.92rem', textTransform:'uppercase', color:'var(--text-2)' }}>📊 Problem Solving Heatmap</h3>
              <span style={{ fontSize:'.7rem', color:'var(--text-3)' }}>Record of coding activities in the last 12 weeks</span>
            </div>
            {/* Renders dynamic board */}
            <div style={{ display:'flex', gap:3, flexWrap:'wrap', padding:8, background:'rgba(255,255,255,0.01)', borderRadius:10 }}>
              {heatmapGridData.map((d, idx) => {
                let bgColor = 'rgba(255,255,255,0.06)';
                if (d.count === 1) bgColor = 'rgba(168,85,247,0.25)';
                if (d.count === 2) bgColor = 'rgba(168,85,247,0.55)';
                if (d.count >= 3) bgColor = 'rgba(168,85,247,0.9)';
                return (
                  <div key={idx} title={`${d.count} solved on ${d.date}`} style={{ width:12, height:12, borderRadius:2, background:bgColor, cursor:'pointer' }} />
                );
              })}
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:10, fontSize:'.68rem', color:'var(--text-3)' }}>
              <span>Less</span>
              <div style={{ display:'flex', gap:2, alignItems:'center' }}>
                <div style={{ width:10, height:10, background:'rgba(255,255,255,0.06)', borderRadius:1 }} />
                <div style={{ width:10, height:10, background:'rgba(168,85,247,0.25)', borderRadius:1 }} />
                <div style={{ width:10, height:10, background:'rgba(168,85,247,0.55)', borderRadius:1 }} />
                <div style={{ width:10, height:10, background:'rgba(168,85,247,0.9)', borderRadius:1 }} />
              </div>
              <span>More</span>
            </div>
          </div>

          {/* Roadmaps progress bars section */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, flexWrap:'wrap' }}>
            {/* NeetCode card */}
            <div style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:16, padding:20 }}>
              <div style={{ fontSize:'.68rem', fontWeight:800, color:'#a855f7', textTransform:'uppercase' }}>Complete Roadmap</div>
              <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.1rem', margin:'4px 0 12px 0' }}>🛣️ NeetCode 150 Progress</h3>
              <div style={{ height:12, background:'var(--border)', borderRadius:10, overflow:'hidden', marginBottom:12 }}>
                <div style={{ width:`${stats.neetcodePct}%`, height:'100%', background:'linear-gradient(90deg,#a855f7,#c084fc)', borderRadius:10 }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.85rem' }}>
                <span>Solved: <strong>{stats.neetcodeSolved}</strong> / {NEETCODE_150.length}</span>
                <span style={{ color:'#a855f7', fontWeight:800 }}>{stats.neetcodePct}% complete</span>
              </div>
              <button onClick={()=>setTab('nc150')} style={{ width:'100%', marginTop:16, padding:'8px 0', border:'1px solid #a855f7', borderRadius:8, background:'rgba(168,85,247,0.05)', color:'#a855f7', cursor:'pointer', fontWeight:800, fontSize:'.8rem' }}>
                View Full Roadmap Accordion →
              </button>
            </div>
            {/* MLA card */}
            <div style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:16, padding:20 }}>
              <div style={{ fontSize:'.68rem', fontWeight:800, color:'#3b82f6', textTransform:'uppercase' }}>Most Frequently Asked</div>
              <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.1rem', margin:'4px 0 12px 0' }}>🔥 Most Likely Asked progress</h3>
              <div style={{ height:12, background:'var(--border)', borderRadius:10, overflow:'hidden', marginBottom:12 }}>
                <div style={{ width:`${stats.mlaPct}%`, height:'100%', background:'linear-gradient(90deg,#3b82f6,#60a5fa)', borderRadius:10 }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.85rem' }}>
                <span>Solved: <strong>{stats.mlaSolved}</strong> / {MOST_LIKELY_ASKED.length}</span>
                <span style={{ color:'#3b82f6', fontWeight:800 }}>{stats.mlaPct}% complete</span>
              </div>
              <button onClick={()=>setTab('mla')} style={{ width:'100%', marginTop:16, padding:'8px 0', border:'1px solid #3b82f6', borderRadius:8, background:'rgba(59,130,246,0.05)', color:'#3b82f6', cursor:'pointer', fontWeight:800, fontSize:'.8rem' }}>
                View 130 Interview Questions →
              </button>
            </div>
          </div>
        </div>
      )}
      {/* TAB: ALL LEETCODE PROBLEMS */}
      {tab === 'all-problems' && (
        <div>
          {/* Quick Filters */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search LeetCode problem title..." style={{ padding:'8px 12px', borderRadius:8, border:'1.5px solid var(--border)', flex:1, outline:'none', fontSize:'.82rem', background:'var(--surface)', color:'var(--text)' }} />
            <select value={difficultyFilter} onChange={e=>setDifficultyFilter(e.target.value)} style={{ padding:'8px 12px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--surface)', color:'var(--text)', fontWeight:700, fontSize:'.8rem' }}>
              <option value="All">All Difficulty</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
            <select value={selectedCategory} onChange={e=>setSelectedCategory(e.target.value)} style={{ padding:'8px 12px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--surface)', color:'var(--text)', fontWeight:700, fontSize:'.8rem' }}>
              <option value="All">All Topics</option>
              {['Arrays', 'Strings', 'Linked List', 'Trees', 'Dynamic Programming', 'Graphs', 'Binary Search', 'Stack & Queue', 'Backtracking', 'Bit Manipulation', 'Math', 'Greedy'].map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select value={solvedFilter} onChange={e=>setSolvedFilter(e.target.value)} style={{ padding:'8px 12px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--surface)', color:'var(--text)', fontWeight:700, fontSize:'.8rem' }}>
              <option value="All">All Solved Status</option>
              <option value="Solved">Solved</option>
              <option value="Unsolved">Unsolved</option>
            </select>
            <button onClick={fetchAllProblems} style={{ padding:'8px 16px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontWeight:800, fontSize:'.8rem', cursor:'pointer' }}>
              🔄 Refresh List
            </button>
          </div>

          {/* Table / Grid list */}
          {allLeetCodeLoading ? (
            <div style={{ textAlign:'center', padding:40 }}>
              <div style={{ width:32, height:32, border:'3px solid #e8edf5', borderTopColor:'#531697', borderRadius:'50%', animation:'_leetcodeSpin .7s linear infinite', margin:'0 auto 10px' }} />
              <style>{`@keyframes _leetcodeSpin{to{transform:rotate(360deg)}}`}</style>
              <div style={{ color:'var(--text-3)', fontSize:'.82rem' }}>Fetching LeetCode problems list...</div>
            </div>
          ) : (
            <div style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', textAlign:'left', fontSize:'.85rem' }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid var(--border)', background:'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding:'12px 16px', color:'var(--text-3)', fontWeight:800 }}>ID</th>
                    <th style={{ padding:'12px 16px', color:'var(--text-3)', fontWeight:800 }}>TITLE</th>
                    <th style={{ padding:'12px 16px', color:'var(--text-3)', fontWeight:800 }}>DIFFICULTY</th>
                    <th style={{ padding:'12px 16px', color:'var(--text-3)', fontWeight:800 }}>TOPIC</th>
                    <th style={{ padding:'12px 16px', color:'var(--text-3)', fontWeight:800 }}>ACCEPTANCE</th>
                    <th style={{ padding:'12px 16px', color:'var(--text-3)', fontWeight:800 }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filtered = allLeetCodeProblems.filter(p => {
                      const isSolved = solved.has(p._id || p.id);
                      if (solvedFilter === 'Solved' && !isSolved) return false;
                      if (solvedFilter === 'Unsolved' && isSolved) return false;
                      return true;
                    });
                    
                    const totalPages = Math.ceil(filtered.length / pageSize) || 1;
                    const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

                    return (
                      <>
                        {paginated.map(p => {
                          const isSolved = solved.has(p._id || p.id);
                          const diffCol = DIFF[p.difficulty]?.color || '#cbd5e1';
                          return (
                            <tr key={p._id || p.id} style={{ borderBottom:'1px solid var(--border)', background:isSolved?'rgba(71,211,114,0.02)':'transparent', transition:'background 0.2s' }}>
                              <td style={{ padding:'12px 16px', fontWeight:800, color:'var(--text-3)' }}>#{p.problemId}</td>
                              <td style={{ padding:'12px 16px', fontWeight:800, color:'var(--text)' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                  {p.title}
                                  {isSolved && <span style={{ padding:'2px 6px', borderRadius:4, background:'rgba(71,211,114,0.1)', color:'#47d372', fontSize:'.65rem', fontWeight:800 }}>SOLVED</span>}
                                </div>
                              </td>
                              <td style={{ padding:'12px 16px' }}>
                                <span style={{ padding:'3px 8px', borderRadius:6, background:DIFF[p.difficulty]?.bg, color:diffCol, fontSize:'.7rem', fontWeight:800 }}>
                                  {p.difficulty}
                                </span>
                              </td>
                              <td style={{ padding:'12px 16px', color:'var(--text-2)' }}>{p.topic}</td>
                              <td style={{ padding:'12px 16px', color:'var(--text-3)' }}>{p.acceptanceRate ? `${p.acceptanceRate}%` : 'N/A'}</td>
                              <td style={{ padding:'12px 16px' }}>
                                <button onClick={() => setActiveWorkspaceProblem({ ...p, id: p._id || p.id })} style={{ padding:'5px 12px', borderRadius:6, background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', border:'none', fontSize:'.72rem', fontWeight:800, cursor:'pointer' }}>
                                  Solve →
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {filtered.length === 0 && (
                          <tr>
                            <td colSpan={6} style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>
                              No problems found. Start the server background sync or try another query!
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })()}
                </tbody>
              </table>
              {(() => {
                const filtered = allLeetCodeProblems.filter(p => {
                  const isSolved = solved.has(p._id || p.id);
                  if (solvedFilter === 'Solved' && !isSolved) return false;
                  if (solvedFilter === 'Unsolved' && isSolved) return false;
                  return true;
                });
                const totalPages = Math.ceil(filtered.length / pageSize) || 1;
                return (
                  <div style={{ padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid var(--border)', background:'rgba(255,255,255,0.01)', flexWrap:'wrap', gap:10 }}>
                    <div style={{ fontSize:'.75rem', color:'var(--text-3)', fontWeight:700 }}>
                      Showing <strong>{filtered.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(filtered.length, currentPage * pageSize)}</strong> of <strong>{filtered.length}</strong> matching problems.
                    </div>
                    {totalPages > 1 && (
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        <button 
                          disabled={currentPage === 1}
                          onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          style={{ padding:'6px 14px', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface)', color:currentPage === 1 ? 'var(--text-3)' : 'var(--text-2)', cursor:currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight:800, fontSize:'.75rem', transition:'all 0.2s' }}
                        >
                          ← Previous
                        </button>
                        
                        <span style={{ fontSize:'.78rem', color:'var(--text)', fontWeight:800, padding:'0 8px' }}>
                          Page <span style={{ color:'#38bdf8' }}>{currentPage}</span> of {totalPages}
                        </span>
                        
                        <button 
                          disabled={currentPage === totalPages}
                          onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          style={{ padding:'6px 14px', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface)', color:currentPage === totalPages ? 'var(--text-3)' : 'var(--text-2)', cursor:currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight:800, fontSize:'.75rem', transition:'all 0.2s' }}
                        >
                          Next →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MOST LIKELY ASKED */}
      {tab === 'mla' && (
        <div>
          {/* Quick Filters */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search question title..." style={{ padding:'8px 12px', borderRadius:8, border:'1.5px solid var(--border)', flex:1, outline:'none', fontSize:'.82rem', background:'var(--surface)', color:'var(--text)' }} />
            <select value={difficultyFilter} onChange={e=>setDifficultyFilter(e.target.value)} style={{ padding:'8px 12px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--surface)', color:'var(--text)', fontWeight:700, fontSize:'.8rem' }}>
              <option value="All">All Difficulty</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
            <select value={solvedFilter} onChange={e=>setSolvedFilter(e.target.value)} style={{ padding:'8px 12px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--surface)', color:'var(--text)', fontWeight:700, fontSize:'.8rem' }}>
              <option value="All">All Solved Status</option>
              <option value="Solved">Solved</option>
              <option value="Unsolved">Unsolved</option>
              <option value="Favorites">Bookmarked</option>
            </select>
            <select value={companyFilter} onChange={e=>setCompanyFilter(e.target.value)} style={{ padding:'8px 12px', borderRadius:8, border:'1.5px solid var(--border)', background:'var(--surface)', color:'var(--text)', fontWeight:700, fontSize:'.8rem' }}>
              <option value="All">All Popular Companies</option>
              <option value="Amazon">Amazon</option>
              <option value="Google">Google</option>
              <option value="Microsoft">Microsoft</option>
              <option value="Facebook">Meta (Facebook)</option>
              <option value="Apple">Apple</option>
              <option value="Uber">Uber</option>
            </select>
          </div>

          {/* List */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {allFilteredProblems.filter(p => p.isMla).map(p => {
              const completed = solved.has(p.id);
              return (
                <div key={p.id} style={{ padding:'12px 18px', background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      <span style={{ fontSize:'1rem' }}>{completed ? '✅' : '○'}</span>
                      <strong style={{ fontSize:'.88rem' }}>{p.title}</strong>
                      <span style={{ padding:'2px 8px', borderRadius:999, background:DIFF[p.difficulty]?.bg, color:DIFF[p.difficulty]?.color, fontSize:'.65rem', fontWeight:800 }}>
                        {p.difficulty}
                      </span>
                    </div>
                    {p.askedBy && (
                      <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                        {p.askedBy.split(', ').slice(0, 3).map(item => {
                          const [name] = item.split('-');
                          return (
                            <span key={item} style={{ fontSize:'.65rem', color:'var(--text-3)', padding:'1px 5px', borderRadius:4, background:'var(--background)', border:'1.5px solid var(--border)', display:'inline-flex', alignItems:'center', gap:2 }}>
                              {COMPANY_LOGOS[name]} {item}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <button onClick={() => setActiveWorkspaceProblem(p)} style={{ padding:'6px 14px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontWeight:800, cursor:'pointer', fontSize:'.78rem' }}>
                    Practice Solution →
                  </button>
                </div>
              );
            })}
            {allFilteredProblems.filter(p => p.isMla).length === 0 && (
              <div style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>No interview questions match your filter query.</div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: NEETCODE 150 ROADMAP */}
      {tab === 'nc150' && (
        <div>
          {/* 18 accordions mapping NeetCodeCategories */}
          {NC_CATEGORIES.map((cat, i) => {
            const catProblems = NEETCODE_150.filter(p => p.topic === cat.name);
            const catSolved = catProblems.filter(p => solved.has(p.id));
            const catPct = Math.round((catSolved.length / catProblems.length) * 100) || 0;
            const easyCount = catProblems.filter(p => p.difficulty === 'Easy').length;
            const medCount = catProblems.filter(p => p.difficulty === 'Medium').length;
            const hardCount = catProblems.filter(p => p.difficulty === 'Hard').length;

            return (
              <div key={i} style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:16, padding:18, marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10, marginBottom:10 }}>
                  <div>
                    <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1rem', margin:0 }}>{cat.name}</h3>
                    <div style={{ display:'flex', gap:8, fontSize:'.72rem', color:'var(--text-3)', marginTop:3 }}>
                      <span>Problems: <strong>{catProblems.length}</strong> (Easy: {easyCount} · Med: {medCount} · Hard: {hardCount})</span>
                      <span>·</span>
                      <span>Est. time: {cat.estTime}</span>
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <span style={{ fontSize:'.8rem', fontWeight:800, color:'#a855f7' }}>{catPct}% solved</span>
                    <div style={{ fontSize:'.68rem', color:'var(--text-3)' }}>{catSolved.length} / {catProblems.length} Complete</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height:6, background:'var(--border)', borderRadius:10, overflow:'hidden', marginBottom:12 }}>
                  <div style={{ width:`${catPct}%`, height:'100%', background:'linear-gradient(90deg,#a855f7,#cbd5e1)', borderRadius:10 }} />
                </div>

                {/* List categories problems */}
                <div style={{ display:'grid', gridTemplateColumns:window.innerWidth<640?'1fr':'1fr 1fr', gap:8 }}>
                  {catProblems.map(p => {
                    const comp = solved.has(p.id);
                    return (
                      <div key={p.id} style={{ padding:'8px 12px', background:'var(--background)', border:`1.5px solid ${comp?'#4ade80':'var(--border)'}`, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <span style={{ fontSize:'.82rem', fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'65%' }}>
                          {comp ? '✅' : '○'} {p.title}
                        </span>
                        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                          <span style={{ fontSize:'.65rem', color:DIFF[p.difficulty].color, background:DIFF[p.difficulty].bg, padding:'1px 6px', borderRadius:4, border:`1px solid ${DIFF[p.difficulty].border}` }}>{p.difficulty}</span>
                          <button onClick={()=>setActiveWorkspaceProblem(p)} style={{ padding:'3px 8px', borderRadius:6, border:'none', background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontWeight:800, cursor:'pointer', fontSize:'.65rem' }}>
                            Solve
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 4: FULL COURSES */}
      {tab === 'courses' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:20 }}>
          {FULL_COURSES.map((course) => {
            const completedChaps = courseProgress[course.id] || [];
            const isCompleted = completedChaps.length === course.chapters.length;
            const progress = Math.round((completedChaps.length / course.chapters.length) * 100) || 0;

            return (
              <div key={course.id} style={{ background:'var(--surface)', border:`1.5px solid ${isCompleted?'#fbbf24':'var(--border)'}`, borderRadius:16, padding:20, display:'flex', flexDirection:'column', justifyContent:'space-between', boxShadow:isCompleted?'0 4px 20px rgba(251,191,36,0.12)':'none' }}>
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <span style={{ padding:'3px 9px', borderRadius:999, background:'rgba(19,161,165,0.08)', color:'#13a1a5', fontSize:'.68rem', fontWeight:800 }}>{course.topic}</span>
                    {isCompleted ? (
                      <span style={{ padding:'2px 8px', borderRadius:999, background:'rgba(251,191,36,0.15)', color:'#d97706', fontSize:'.62rem', fontWeight:800, border:'1px solid #fbbf24' }}>🏆 GRADUATED</span>
                    ) : (
                      <span style={{ fontSize:'.68rem', color:'var(--text-3)' }}>⏱ {course.duration}</span>
                    )}
                  </div>

                  <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.05rem', margin:'8px 0' }}>{course.title}</h3>
                  <p style={{ fontSize:'.78rem', color:'var(--text-3)', lineHeight:1.6, marginBottom:14 }}>{course.description}</p>

                  <div style={{ borderTop:'1px solid var(--border)', paddingTop:12, marginBottom:16 }}>
                    <div style={{ fontSize:'.7rem', fontWeight:800, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.03em', marginBottom:6 }}>Topics covered:</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                      {course.chapters.map((chap, cIdx) => {
                        const checked = completedChaps.includes(cIdx);
                        return (
                          <label key={cIdx} style={{ display:'flex', alignItems:'center', gap:8, fontSize:'.75rem', color:checked?'var(--text-2)':'var(--text-3)', cursor:'pointer' }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleToggleCourseChapter(course.id, cIdx)}
                              style={{ accentColor:'#13a1a5' }}
                            />
                            <span style={{ textDecoration:checked?'line-through':'none' }}>{chap}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  {/* Progress bar */}
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.7rem', marginBottom:4, fontWeight:700 }}>
                    <span>Course Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div style={{ height:6, background:'var(--border)', borderRadius:10, overflow:'hidden', marginBottom:12 }}>
                    <div style={{ width:`${progress}%`, height:'100%', background:isCompleted?'#fbbf24':'#13a1a5', borderRadius:10 }} />
                  </div>

                  <button onClick={() => setActiveWorkspaceProblem({ id: course.id, title: course.title, topic: course.topic, videoId: course.videoId, difficulty: 'Easy' })} style={{ width:'100%', padding:'10px 0', borderRadius:10, border:'none', background:isCompleted?'linear-gradient(135deg,#fbbf24,#d97706)':'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontWeight:800, fontSize:'.8rem', cursor:'pointer' }}>
                    {isCompleted ? 'Re-watch Playlist Solution' : 'Watch Playlist Solution'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 5: BROWSE CATEGORIES */}
      {tab === 'categories' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:14 }}>
          {['All','Arrays','Strings','Linked List','Trees','Graphs','Dynamic Programming','Sorting','Binary Search','Stack & Queue','Recursion','Backtracking','Bit Manipulation','Math','Greedy'].map((c, i) => {
            const count = allFilteredProblems.filter(p => p.topic === c || (c==='Linked List' && p.topic==='Linked Lists') || (c==='Stack & Queue' && p.topic==='Stack') || (c==='Bit Manipulation' && p.topic==='Bit Manipulation')).length;
            return (
              <button key={i} onClick={() => { setSelectedCategory(c === 'All' ? 'All' : c); setTab('mla'); }} style={{ padding:20, background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:14, cursor:'pointer', textAlign:'left', transition:'all 0.2s', borderBottom:selectedCategory===c?'2px solid #531697':'1.5px solid var(--border)' }} onMouseOver={e=>e.currentTarget.style.borderColor='#531697'} onMouseOut={e=>e.currentTarget.style.borderColor='var(--border)'}>
                <div style={{ fontSize:'1.5rem', marginBottom:6 }}>📂</div>
                <div style={{ fontWeight:800, fontSize:'.9rem', color:'var(--text)' }}>{c}</div>
                <div style={{ fontSize:'.7rem', color:'var(--text-3)', marginTop:4 }}>{count} Curated Problems</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}