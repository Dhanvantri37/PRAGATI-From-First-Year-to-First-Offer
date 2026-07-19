import React, { useState, useEffect, useMemo, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { io } from 'socket.io-client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../context/AuthContext';
import {
  MOST_LIKELY_ASKED,
  NEETCODE_150,
  NC_CATEGORIES,
  FULL_COURSES,
  COMPANY_LOGOS,
  getProblemStatement
} from './practice/PracticeData';
import { A2Z_SHEET_PROBLEMS } from './practice/A2ZSheetData';
import CalendarHeatmap from '../components/CalendarHeatmap';

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
function CodingWorkspace({ problem, onClose, onSolveProgress, onUpdateStreak, localData }) {
  const [activeTab, setActiveTab] = useState('desc');
  const [lang, setLang] = useState('javascript');
  const pId = problem._id || problem.id;
  const [code, setCode] = useState(() => localData.submissions[pId] || `// Write your ${lang} solution for ${problem.title}...\n\nfunction solve() {\n    // Write code here\n}`);
  const [notes, setNotes] = useState(() => localData.notes[pId] || '');
  const [isSolved, setIsSolved] = useState(() => localData.solved.has(pId));
  const [isFav, setIsFav] = useState(() => localData.favorites.has(pId));

  const [debugging, setDebugging] = useState(false);
  const [debugResult, setDebugResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
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
    const pId = problem._id || problem.id;
    if (pId) localStorage.setItem('pragati_practice_last_visited', pId);
  }, [problem]);

  // Sync code and notes changes locally
  useEffect(() => {
    const pId = problem._id || problem.id;
    if (pId) {
      const subs = JSON.parse(localStorage.getItem('pragati_practice_code_submissions') || '{}');
      subs[pId] = code;
      localStorage.setItem('pragati_practice_code_submissions', JSON.stringify(subs));
    }
  }, [code, problem]);

  useEffect(() => {
    const pId = problem._id || problem.id;
    if (pId) {
      const n = JSON.parse(localStorage.getItem('pragati_practice_notes') || '{}');
      n[pId] = notes;
      localStorage.setItem('pragati_practice_notes', JSON.stringify(n));
    }
  }, [notes, problem]);

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const res = await fetch(`${API}/problems/${problem._id || problem.id}/save-notes`, {
        method: 'POST',
        headers: tks(),
        body: JSON.stringify({
          approachNotes: notes,
          solutionCode: code
        })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to save draft');
      
      // Update local storage too so localData has it
      const existingNotes = JSON.parse(localStorage.getItem('pragati_practice_notes') || '{}');
      const existingCode = JSON.parse(localStorage.getItem('pragati_practice_code_submissions') || '{}');
      existingNotes[pId] = notes;
      existingCode[pId] = code;
      localStorage.setItem('pragati_practice_notes', JSON.stringify(existingNotes));
      localStorage.setItem('pragati_practice_code_submissions', JSON.stringify(existingCode));
      localData.notes[pId] = notes;
      localData.submissions[pId] = code;
      
      alert('✅ Draft and notes saved successfully!');
    } catch (err) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSavingDraft(false);
    }
  };

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
          problemTitle: fullProblem?.title || problem?.title || 'Coding Practice',
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
    setTerminalOutput('Preparing submission...');
    setRunResult(true);
    
    try {
      // Detect if this is a static roadmap problem (nc-*, mla-*, a2z-*) 
      // These don't have executable test harnesses — skip the test runner
      const pid = problem._id || problem.id || '';
      const isStaticRoadmapProblem = !problem._id && problem.id;
      const isRoadmapStringId = typeof pid === 'string' && /^(nc|mla|a2z)-\d+/.test(pid);
      
      let shouldSkipTestRunner = isStaticRoadmapProblem || isRoadmapStringId;
      
      if (!shouldSkipTestRunner) {
        // 1. Run tests — only for DB problems that have a proper ObjectId _id
        setTerminalOutput('Running pre-submission test verification...');
        const runRes = await fetch(`${API}/compile/run-tests`, {
          method: 'POST',
          headers: tks(),
          body: JSON.stringify({
            problemId: problem._id || problem.id,
            code,
            language: lang
          })
        });
        
        const testVerdict = await runRes.json();
        if (!runRes.ok) {
          // If test runner fails (DB lookup error etc.), fall through to direct submit
          shouldSkipTestRunner = true;
          setTerminalOutput(`⚠️ Test runner unavailable — submitting directly...\n${testVerdict.error || ''}`);
        } else {
          let outputStr = `Pre-submission Tests: ${testVerdict.message}\n\n`;
          (testVerdict.results || []).forEach(r => {
            outputStr += `Case ${r.caseIndex}: ${r.verdict} ${r.passed ? '✅' : '❌'}\n`;
            if (!r.passed) {
              outputStr += `  Input:    ${r.input}\n  Expected: ${r.expected}\n  Actual:   ${r.actual}\n`;
            }
          });
          setTerminalOutput(outputStr);
          
          if (testVerdict.success === false && (testVerdict.results || []).some(r => r.verdict === 'Runtime Error')) {
            throw new Error('Code has runtime or syntax errors. Fix your code before submitting, or use AI Analyse for hints.');
          }
        }
      } else {
        // Static problem — show a friendly compilation check message
        setTerminalOutput('⚡ Static roadmap problem — verifying code compiles...\n\nRunning compilation check via Piston sandbox...');
        // Quick compile check (run with empty input, just see if it errors)
        try {
          const compileRes = await fetch(`${API}/compile`, {
            method: 'POST',
            headers: tks(),
            body: JSON.stringify({ code, language: lang, input: '' })
          });
          const compileData = await compileRes.json();
          const output = compileData.output || '';
          setTerminalOutput(`✅ Compilation successful!\n\nCode output:\n${output || '(no output — function-only code is fine)'}\n\nSubmitting solution...`);
        } catch {
          setTerminalOutput('✅ Submitting solution directly...');
        }
      }

      // 2. Submit solved progress to DB
      const res = await fetch(`${API}/problems/${problem._id || problem.id}/solve`, {
        method: 'POST',
        headers: tks(),
        body: JSON.stringify({
          solutionCode: code,
          approachNotes: notes || 'Solved via PRAGATI workspace.',
          selfRating: 5,
          timeTakenMinutes: 15
        })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to submit solution');

      setIsSolved(true);
      setShowCelebration(true);

      // Immediately update streak from backend response
      if (typeof d.streak === 'number') {
        onUpdateStreak(d.streak);
      }

      onSolveProgress(problem._id || problem.id, problem.difficulty || problem.level || 'Easy');
      setTimeout(() => setShowCelebration(false), 3500);
    } catch (err) {
      alert(`Cannot Submit: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };


  const toggleFavorite = () => {
    const pId = problem._id || problem.id;
    if (!pId) return;
    const favs = new Set(localData.favorites);
    if (favs.has(pId)) {
      favs.delete(pId);
      setIsFav(false);
    } else {
      favs.add(pId);
      setIsFav(true);
    }
    localStorage.setItem('pragati_practice_favorites', JSON.stringify([...favs]));
    localData.favorites = favs; // update local context reference
  };

  // Select examples source dynamically (DB test cases fallback to details example list)
  const displayExamples = (fullProblem.testCases && fullProblem.testCases.length > 0)
    ? fullProblem.testCases.map(tc => ({ input: tc.input, output: tc.output }))
    : (problemDetails.examples || []);

  return (
    <div style={{ position:'fixed', inset:0, background:'#1e1e1e', zIndex:2000, display:'flex', flexDirection: 'column', fontFamily:"Consolas, 'Courier New', monospace", color:'#d4d4d4', userSelect:'none' }}>
      
      {/* ── VS Code Title Bar ── */}
      <header style={{ height:35, background:'#3c3c3c', borderBottom:'1px solid #252526', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 10px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={onClose} style={{ padding:'2px 8px', borderRadius:4, background:'#4b4b4b', border:'1px solid #5a5a5a', color:'#fff', cursor:'pointer', fontSize:'.72rem', fontWeight:600, fontFamily:"'Segoe UI',sans-serif" }}>
            ✕ Close Editor
          </button>
          <span style={{ fontSize:'.7rem', color:'#858585' }}>PRAGATI Workspace</span>
        </div>
        <div style={{ fontSize:'.75rem', color:'#a6a6a6', background:'#2d2d2d', padding:'2px 40px', borderRadius:4, border:'1px solid #454545', maxWidth:400, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          pragati-platform / practice / {fullProblem?.title || problem?.title || 'Coding Practice'}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <button onClick={toggleFavorite} style={{ padding:'2px 8px', borderRadius:4, border:'none', background:isFav?'#3a3a3a':'transparent', color:isFav?'#f59e0b':'#858585', cursor:'pointer', fontSize:'.72rem' }}>
            {isFav ? '★ Bookmarked' : '☆ Bookmark'}
          </button>
        </div>
      </header>

      {/* ── Main Workspace Body ── */}
      <div style={{ display:'flex', flex:1, overflow:'hidden', minHeight:0 }}>
        
        {/* Left Side: VS Code Sidebar (Description, Hints, Notes as mock files) */}
        <div style={{ width:'40%', minWidth:320, background:'#252526', borderRight:'1px solid #2d2d2d', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          
          {/* Sidebar Header */}
          <div style={{ height:35, padding:'0 16px', background:'#252526', borderBottom:'1px solid #2d2d2d', display:'flex', alignItems:'center', justifyContent:'space-between', color:'#bbbbbb', fontSize:'.68rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.05em', fontFamily:"'Segoe UI',sans-serif" }}>
            <span>Explorer: Instructions</span>
          </div>

          {/* Explorer mock file tree / tabs */}
          <div style={{ display:'flex', background:'#2d2d2d', borderBottom:'1px solid #252526' }}>
            {[
              { id:'desc', file:'Description.md', icon:'📝' },
              { id:'hints', file:'Hints.md', icon:'💡' },
              { id:'notes', file:'Notes.txt', icon:'✏️' },
              ...( (problem.videoId || problem.youtube) ? [{ id:'video', file:'Video.mp4', icon:'🎥' }] : [])
            ].map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1,
                    height: 35,
                    border: 'none',
                    background: active ? '#1e1e1e' : '#2d2d2d',
                    color: active ? '#ffffff' : '#969696',
                    fontSize: '.72rem',
                    fontWeight: active ? 'bold' : 'normal',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    borderRight: '1px solid #252526',
                    borderTop: active ? '2px solid #007acc' : '2px solid transparent',
                    fontFamily: "'Segoe UI',sans-serif"
                  }}>
                  <span>{tab.icon}</span>
                  <span>{tab.file}</span>
                </button>
              );
            })}
          </div>

          {/* Left Panel Content Area */}
          <div style={{ flex:1, overflowY:'auto', padding:'16px', background:'#1e1e1e', fontFamily:"'Segoe UI',sans-serif" }}>
            
            {activeTab === 'desc' && (() => {
              const isHtml = fullProblem.description && (fullProblem.description.startsWith('<') || fullProblem.description.includes('</') || fullProblem.description.includes('<p>'));
              return (
                <div style={{ fontSize:'.82rem', lineHeight:1.6, color:'#cccccc' }}>
                  <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
                    <span style={{ padding:'2px 8px', borderRadius:3, background:DIFF[fullProblem.difficulty||fullProblem.level]?.bg || '#3a3a3a', color:DIFF[fullProblem.difficulty||fullProblem.level]?.color || '#fff', fontSize:'.65rem', fontWeight:800 }}>
                      {fullProblem.difficulty || fullProblem.level}
                    </span>
                    <span style={{ padding:'2px 8px', borderRadius:3, background:'rgba(56,189,248,0.12)', color:'#38bdf8', fontSize:'.65rem', fontWeight:800 }}>
                      {fullProblem.topic}
                    </span>
                    {fullProblem.askedBy && (
                      <span style={{ padding:'2px 8px', borderRadius:3, background:'rgba(245,158,11,0.15)', color:'#f59e0b', fontSize:'.65rem', fontWeight:800 }}>
                        🔥 Popular
                      </span>
                    )}
                  </div>

                  {isHtml ? (
                    <div className="leetcode-html-desc" style={{ fontFamily:"'Segoe UI',sans-serif" }}>
                      <style>{`
                        .leetcode-html-desc p { margin-bottom: 12px; }
                        .leetcode-html-desc code { background: #2d2d2d; padding: 2px 5px; border-radius: 3px; font-family: Consolas, monospace; color: #f43f5e; font-size: 0.8rem; }
                        .leetcode-html-desc pre { background: #181818; padding: 12px; border-radius: 6px; border: 1px solid #3c3c3c; margin: 12px 0; white-space: pre-wrap; font-family: Consolas, monospace; color: #cbd5e1; font-size: 0.78rem; }
                        .leetcode-html-desc ul { margin-left: 20px; margin-bottom: 12px; list-style-type: disc; }
                        .leetcode-html-desc li { margin-bottom: 5px; }
                      `}</style>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{fullProblem.description}</ReactMarkdown>
                    </div>
                  ) : (
                    <>
                      <div style={{ whiteSpace:'pre-wrap' }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{fullProblem.description || problemDetails.desc}</ReactMarkdown>
                      </div>

                      <h4 style={{ marginTop:20, color:'#ffffff', fontWeight:700, fontSize:'.88rem' }}>Constraints:</h4>
                      <pre style={{ padding:10, background:'#181818', borderRadius:4, fontSize:'.78rem', color:'#85c5ed', border:'1px solid #3c3c3c', fontFamily:'Consolas, monospace', whiteSpace:'pre-wrap' }}>
                        {fullProblem.constraints || problemDetails.constraints}
                      </pre>

                      <h4 style={{ marginTop:20, color:'#ffffff', fontWeight:700, fontSize:'.88rem' }}>Examples:</h4>
                      {displayExamples.map((ex, idx) => (
                        <div key={idx} style={{ padding:12, background:'#181818', borderRadius:6, border:'1px solid #3c3c3c', marginBottom:8, fontSize:'.78rem', fontFamily:'Consolas, monospace' }}>
                          <div style={{ color:'#38bdf8', fontWeight:700, marginBottom:4 }}>Example {idx+1}:</div>
                          <div><strong>Input:</strong> {ex.input}</div>
                          <div><strong>Output:</strong> {ex.output}</div>
                          {ex.explanation && <div style={{ color:'#858585', marginTop:4 }}><strong>Explanation:</strong> {ex.explanation}</div>}
                        </div>
                      ))}
                    </>
                  )}

                  {(() => {
                    const companyList = Array.isArray(fullProblem.companies) && fullProblem.companies.length > 0
                      ? fullProblem.companies
                      : (typeof fullProblem.askedBy === 'string'
                          ? fullProblem.askedBy.split(', ').map(item => item.split('-')[0])
                          : (Array.isArray(fullProblem.askedBy) ? fullProblem.askedBy : []));
                    if (companyList.length === 0) return null;
                    return (
                      <div style={{ marginTop:24, borderTop:'1px solid #2d2d2d', paddingTop:16 }}>
                        <h5 style={{ fontSize:'.72rem', fontWeight:800, color:'#858585', textTransform:'uppercase', letterSpacing:'0.03em', marginBottom:8 }}>Companies Asked:</h5>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                          {companyList.map((comp, idx) => (
                            <span key={idx} style={{ padding:'3px 8px', borderRadius:3, background:'#2d2d2d', color:'#cccccc', fontSize:'.68rem', fontWeight:600 }}>
                              {typeof comp === 'string' ? comp : String(comp)}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {activeTab === 'hints' && (
              <div style={{ fontSize:'.82rem', lineHeight:1.6 }}>
                <h4 style={{ color:'#ffffff', fontWeight:700, marginBottom:12, fontSize:'.88rem' }}>💡 Hints:</h4>
                {((fullProblem.hints && fullProblem.hints.length > 0) ? fullProblem.hints : problemDetails.hints).map((hint, idx) => (
                  <div key={idx} style={{ padding:10, background:'rgba(56,189,248,0.05)', border:'1px solid rgba(56,189,248,0.15)', borderRadius:4, marginBottom:8, display:'flex', gap:10 }}>
                    <span>💡</span>
                    <span style={{ color:'#cbd5e1' }}><ReactMarkdown remarkPlugins={[remarkGfm]}>{hint}</ReactMarkdown></span>
                  </div>
                ))}

                <h4 style={{ color:'#ffffff', fontWeight:700, marginTop:24, marginBottom:12, fontSize:'.88rem' }}>📝 Editorial Solution:</h4>
                {fullProblem.editorial ? (
                  <div className="leetcode-markdown-editorial" style={{ color:'#cbd5e1' }}>
                    <style>{`
                      .leetcode-markdown-editorial p { margin-bottom: 10px; }
                      .leetcode-markdown-editorial code { background: #2d2d2d; padding: 2px 5px; border-radius: 3px; font-family: Consolas, monospace; color: #f43f5e; font-size: 0.8rem; }
                      .leetcode-markdown-editorial pre { background: #181818; padding: 12px; border-radius: 6px; border: 1px solid #3c3c3c; margin: 12px 0; white-space: pre-wrap; font-family: Consolas, monospace; color: #cbd5e1; font-size: 0.78rem; overflow-x: auto; }
                      .leetcode-markdown-editorial h1, .leetcode-markdown-editorial h2, .leetcode-markdown-editorial h3 { color: #38bdf8; font-weight: 700; margin-top: 16px; margin-bottom: 8px; font-size: 0.95rem; }
                    `}</style>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{fullProblem.editorial}</ReactMarkdown>
                  </div>
                ) : (
                  <div style={{ padding:12, background:'#181818', borderRadius:6, border:'1px solid #3c3c3c', fontSize:'.78rem', lineHeight:1.6, color:'#858585', whiteSpace:'pre-wrap', fontFamily:'Consolas, monospace' }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{problemDetails.editorial}</ReactMarkdown>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'video' && (() => {
              let ytId = problem.videoId;
              if (!ytId && problem.youtube) {
                const url = problem.youtube;
                if (url.includes('v=')) ytId = url.split('v=')[1].split('&')[0];
                else if (url.includes('youtu.be/')) ytId = url.split('youtu.be/')[1].split('?')[0];
                else ytId = url;
              }
              return (
                <div style={{ textAlign:'center' }}>
                  <h4 style={{ color:'#ffffff', fontWeight:700, marginBottom:8, fontSize:'.88rem' }}>📺 Video Player</h4>
                  <div style={{ position:'relative', paddingBottom:'56.25%', height:0, overflow:'hidden', borderRadius:6, border:'1px solid #3c3c3c', background:'#000' }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}`}
                      title="YouTube explanation"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%' }}
                    />
                  </div>
                </div>
              );
            })()}

            {activeTab === 'notes' && (
              <div>
                <h4 style={{ color:'#ffffff', fontWeight:700, marginBottom:8, fontSize:'.88rem' }}>📝 Solution Notes</h4>
                <textarea
                  value={notes}
                  onChange={e=>setNotes(e.target.value)}
                  placeholder="Record your algorithm approaches, complexities, constraints..."
                  style={{ width:'100%', minHeight:200, padding:10, borderRadius:4, border:'1px solid #3c3c3c', background:'#181818', color:'#d4d4d4', outline:'none', resize:'vertical', fontSize:'.8rem', fontFamily:'Consolas, monospace', lineHeight:1.5 }}
                />
                <button onClick={handleSaveDraft} disabled={savingDraft} style={{ marginTop: 8, padding: '6px 12px', borderRadius: 4, border: 'none', background: '#007acc', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '.72rem', fontFamily: "'Segoe UI',sans-serif" }}>
                  {savingDraft ? 'Saving Draft...' : '💾 Save Notes & Draft'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Monaco Code Editor & Terminal (Split Horizontally) */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'#1e1e1e' }}>
          
          {/* Mock Open Editors Tab Bar in VS Code */}
          <div style={{ height:35, background:'#2d2d2d', borderBottom:'1px solid #252526', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
            <div style={{ display:'flex', height:'100%' }}>
              {LANGUAGES.map(l => {
                const active = lang === l;
                const fileExt = { javascript:'js', python:'py', java:'java', 'c++':'cpp' }[l] || 'js';
                return (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    style={{
                      height: '100%',
                      padding: '0 16px',
                      border: 'none',
                      background: active ? '#1e1e1e' : '#2d2d2d',
                      color: active ? '#ffffff' : '#969696',
                      fontSize: '.72rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      borderRight: '1px solid #252526',
                      borderTop: active ? '2px solid #007acc' : '2px solid transparent',
                      cursor: 'pointer',
                      fontFamily: "Consolas, monospace"
                    }}>
                    <span>📄</span>
                    <span>Solution.{fileExt}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ paddingRight:16 }}>
              {isSolved ? (
                <span style={{ fontSize:'.68rem', color:'#4ade80', fontWeight:800 }}>● Solved</span>
              ) : (
                <span style={{ fontSize:'.68rem', color:'#f87171', fontWeight:800 }}>● Unsolved</span>
              )}
            </div>
          </div>

          {/* Editor pane */}
          <div style={{ flex:1, position:'relative', display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>
            <Editor
              height="100%"
              language={
                lang === 'c++' || lang === 'cpp' ? 'cpp' : 
                lang === 'python' || lang === 'python3' ? 'python' : 
                lang === 'javascript' || lang === 'js' || lang === 'nodejs' ? 'javascript' : 
                lang
              }
              theme="vs-dark"
              value={code}
              onChange={val => setCode(val || '')}
              onMount={(editor) => {
                if (disablePaste) {
                  editor.onDidPaste((e) => {
                    e.prevent();
                    alert('⚠️ Pasting code is disabled for your department to encourage typing and practice.');
                  });
                }
              }}
              options={{
                fontSize: 14,
                fontFamily: 'Consolas, monospace',
                minimap: { enabled: false },
                automaticLayout: true,
                suggestOnTriggerCharacters: true,
                wordWrap: 'on',
                readOnly: false
              }}
            />
          </div>

          {/* VS Code Bottom Panel: TERMINAL / OUTPUT Console */}
          <div style={{ height: debugResult ? 380 : 200, background: '#1e1e1e', borderTop: '1px solid #2d2d2d', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0, transition:'height 0.3s ease' }}>
            
            {/* ── Terminal Header with Action Buttons (VS Code style) ── */}
            <div style={{ height:36, background:'#252526', borderBottom:'1px solid #2d2d2d', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 8px', flexShrink:0 }}>
              {/* Left: Tab labels */}
              <div style={{ display:'flex', gap:0, height:'100%', alignItems:'stretch' }}>
                <span style={{ fontSize:'.68rem', fontWeight:'bold', color:'#ffffff', borderBottom:'2px solid #007acc', display:'flex', alignItems:'center', cursor:'pointer', padding:'0 12px' }}>
                  TERMINAL
                </span>
                {debugResult && (
                  <span onClick={() => setActiveTab('hints')} style={{ fontSize:'.68rem', color:'#f59e0b', display:'flex', alignItems:'center', cursor:'pointer', padding:'0 12px', gap:4, borderBottom:'2px solid transparent' }}>
                    🤖 ANALYSIS
                  </span>
                )}
              </div>
              {/* Right: Action buttons in header (VS Code toolbar style) */}
              <div style={{ display:'flex', alignItems:'center', gap:2 }}>
                <button onClick={handleRunCode} disabled={running || !code.trim()}
                  title="Run Code (Execute)"
                  style={{ padding:'4px 10px', height:26, border:'none', background: running ? 'rgba(0,122,204,0.3)' : 'rgba(0,122,204,0.15)', color:'#ffffff', cursor:running||!code.trim()?'not-allowed':'pointer', fontWeight:700, display:'flex', alignItems:'center', gap:4, fontSize:'.68rem', borderRadius:4, opacity: (!code.trim()) ? 0.5 : 1 }}>
                  <span>▶</span> Run
                </button>
                <span style={{ color:'rgba(255,255,255,0.2)', fontSize:'.8rem' }}>│</span>
                <button onClick={handleDebug} disabled={debugging || !code.trim()}
                  title="AI Analyse Code"
                  style={{ padding:'4px 10px', height:26, border:'none', background: debugging ? 'rgba(167,139,250,0.3)' : 'rgba(167,139,250,0.12)', color:'#c4b5fd', cursor:debugging||!code.trim()?'not-allowed':'pointer', fontWeight:700, display:'flex', alignItems:'center', gap:4, fontSize:'.68rem', borderRadius:4, opacity:(!code.trim()) ? 0.5 : 1 }}>
                  {debugging ? '⏳' : '🤖'} {debugging ? 'Analysing…' : 'AI Analyse'}
                </button>
                <span style={{ color:'rgba(255,255,255,0.2)', fontSize:'.8rem' }}>│</span>
                <button onClick={handleSaveDraft} disabled={savingDraft || !code.trim()}
                  title="Save Draft & Notes"
                  style={{ padding:'4px 10px', height:26, border:'none', background:'rgba(255,255,255,0.05)', color:'#94a3b8', cursor:savingDraft||!code.trim()?'not-allowed':'pointer', fontWeight:700, display:'flex', alignItems:'center', gap:4, fontSize:'.68rem', borderRadius:4, opacity:(!code.trim()) ? 0.5 : 1 }}>
                  💾 {savingDraft ? 'Saving…' : 'Save Draft'}
                </button>
                <span style={{ color:'rgba(255,255,255,0.2)', fontSize:'.8rem' }}>│</span>
                {isSolved ? (
                  <span style={{ padding:'0 10px', height:26, display:'flex', alignItems:'center', fontWeight:700, color:'#4ade80', fontSize:'.68rem' }}>
                    ✓ Solved
                  </span>
                ) : (
                  <button onClick={handleSolveSubmit} disabled={submitting || !code.trim()}
                    title="Submit Solution"
                    style={{ padding:'4px 12px', height:26, border:'none', background:'#1f8244', color:'#ffffff', cursor:submitting||!code.trim()?'not-allowed':'pointer', fontWeight:800, display:'flex', alignItems:'center', gap:4, fontSize:'.68rem', borderRadius:4, opacity:(!code.trim()) ? 0.5 : 1 }}>
                    🚀 {submitting ? 'Submitting…' : 'Submit Solution'}
                  </button>
                )}
                <span style={{ color:'rgba(255,255,255,0.2)', fontSize:'.8rem', margin:'0 4px' }}>│</span>
                <button onClick={() => setTerminalOutput('')} style={{ background:'transparent', border:'none', color:'#858585', cursor:'pointer', fontSize:'.68rem', padding:'4px 6px' }} title="Clear Console">
                  🗑️
                </button>
                {runResult && (
                  <button onClick={() => { setRunResult(null); stopExecution(); }} style={{ background:'transparent', border:'none', color:'#ef4444', cursor:'pointer', fontSize:'.68rem', padding:'4px 6px' }}>
                    ✖
                  </button>
                )}
              </div>
            </div>

            {/* AI Analysis floating panel (above terminal output when active) */}
            {(debugResult || debugging) && (
              <div style={{ flex: debugResult ? '1 1 55%' : '0 0 auto', background:'#0d0d1a', borderBottom:'1px solid rgba(83,22,151,0.3)', overflowY:'auto', padding:'0 12px 8px 12px', flexShrink:0 }}>
                <DebugPanel
                  result={debugResult}
                  loading={debugging}
                  code={code}
                  onApplyFix={(fixedCode) => setCode(fixedCode)}
                />
              </div>
            )}

            {/* Terminal Console Output Scrollbox */}
            <div style={{ flex:1, overflowY:'auto', padding:'10px', background:'#181818', color:'#3cd876', fontSize:'.75rem', fontFamily:'Consolas, monospace', whiteSpace:'pre-wrap', minHeight:0 }}>
              {runResult || terminalOutput ? (
                <div>
                  {terminalOutput || 'Executing code...'}
                  {running && (
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6, borderTop:'1px dashed #3c3c3c', paddingTop:6 }}>
                      <span style={{ color:'#38bdf8' }}>pragati-sandbox:~$</span>
                      <input
                        value={terminalInput}
                        onChange={e => setTerminalInput(e.target.value)}
                        onKeyDown={handleTerminalInput}
                        placeholder="Type stdin input and press Enter..."
                        style={{ flex:1, background:'transparent', border:'none', color:'#ffffff', outline:'none', fontFamily:'Consolas, monospace', fontSize:'.75rem' }}
                        autoFocus
                      />
                      <button onClick={stopExecution} style={{ background:'#ef4444', color:'#fff', border:'none', padding:'2px 8px', borderRadius:2, cursor:'pointer', fontSize:'.65rem', fontWeight:'bold' }}>Stop</button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color:'#858585' }}>
                  pragati-sandbox:~/workspace$ click ▶ Run or 🚀 Submit above to compile &amp; run...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* ── VS Code Bottom Status Bar (Action Controllers) ── */}
      <footer style={{ height:22, background:'#007acc', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 10px', fontSize:'.68rem', color:'#ffffff', flexShrink:0, fontFamily:"'Segoe UI',sans-serif" }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ background:'#1f1f1f', padding:'0 8px', height:'100%', display:'flex', alignItems:'center' }}>
            ⚙️ Compile Sandbox
          </span>
          <span>Spaces: 4</span>
          <span>UTF-8</span>
          <span>Language: {lang.toUpperCase()}</span>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:1 }}>
          <button onClick={handleRunCode} disabled={running || !code.trim()} 
            style={{ padding:'0 10px', height:22, border:'none', background:'transparent', color:'#ffffff', cursor:running||!code.trim()?'not-allowed':'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
            <span>▶</span> Run Code
          </button>
          <span style={{ color:'rgba(255,255,255,0.4)' }}>|</span>
          <button onClick={handleDebug} disabled={debugging || !code.trim()} 
            style={{ padding:'0 10px', height:22, border:'none', background:'transparent', color:'#ffffff', cursor:debugging||!code.trim()?'not-allowed':'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
            <span>🤖</span> AI Analyse
          </button>
          <span style={{ color:'rgba(255,255,255,0.4)' }}>|</span>
          <button onClick={handleSaveDraft} disabled={savingDraft || !code.trim()} 
            style={{ padding:'0 10px', height:22, border:'none', background:'transparent', color:'#ffffff', cursor:savingDraft||!code.trim()?'not-allowed':'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
            <span>💾</span> Save Draft
          </button>
          <span style={{ color:'rgba(255,255,255,0.4)' }}>|</span>
          
          {isSolved ? (
            <span style={{ padding:'0 12px', background:'rgba(255,255,255,0.15)', height:22, display:'flex', alignItems:'center', fontWeight:700 }}>
              ✓ Solved
            </span>
          ) : (
            <button onClick={handleSolveSubmit} disabled={submitting || !code.trim()} 
              style={{ padding:'0 14px', height:22, border:'none', background:'#1f8244', color:'#ffffff', cursor:submitting||!code.trim()?'not-allowed':'pointer', fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
              🚀 Submit Solution
            </button>
          )}
        </div>
      </footer>

      {/* Celebration success overlay */}
      {showCelebration && (
        <div style={{ position:'fixed', inset:0, background:'rgba(11,15,25,0.85)', zIndex:2500, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
          <div style={{ padding:32, background:'#1e1e1e', border:'2px solid #007acc', borderRadius:16, textAlign:'center', maxWidth:420, width:'90%', boxShadow:'0 0 30px rgba(0,122,204,0.3)', animation:'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)', fontFamily:"'Segoe UI',sans-serif" }}>
            <div style={{ fontSize:'3.5rem', marginBottom:12, animation:'bounce 1s infinite' }}>🏆</div>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.4rem', color:'#4ade80', marginBottom:8 }}>EXCELLENT WORK!</h2>
            <p style={{ color:'#cbd5e1', fontSize:'.9rem', lineHeight:1.6, marginBottom:20 }}>
              You have successfully completed <strong>{problem.title}</strong>!<br />
              Your streak progresses and rewards are permanently recorded.
            </p>
            <div style={{ display:'flex', justifyContent:'space-around', background:'#2d2d2d', padding:12, borderRadius:8, marginBottom:24 }}>
              <div>
                <div style={{ color:'#fbbf24', fontWeight:800 }}>+{problem.difficulty === 'Hard' || problem.level === 'Hard' ? 100 : problem.difficulty === 'Medium' || problem.level === 'Medium' ? 30 : 10} XP</div>
                <div style={{ fontSize:'.68rem', color:'#94a3b8' }}>XP Points</div>
              </div>
              <div style={{ borderLeft:'1px solid #3c3c3c' }} />
              <div>
                <div style={{ color:'#4ade80', fontWeight:800 }}>🔥 Active</div>
                <div style={{ fontSize:'.68rem', color:'#94a3b8' }}>Heatmap Logged</div>
              </div>
            </div>
            <button onClick={()=>setShowCelebration(false)} style={{ width:'100%', padding:'10px 0', border:'none', borderRadius:6, background:'#007acc', color:'#ffffff', fontWeight:800, cursor:'pointer', fontSize:'.88rem' }}>
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



export default function ProblemsPage() {
  const { setUser } = useAuth();
  const [tab, setTab] = useState('dash');

  const [showPlatformSelectModal, setShowPlatformSelectModal] = useState(true);
  const [heatmapYear, setHeatmapYear] = useState(new Date().getFullYear().toString());
  const [allLeetCodeProblems, setAllLeetCodeProblems] = useState([]);
  const [a2zExpanded, setA2zExpanded] = useState({}); // For accordion state
  const [allLeetCodeLoading, setAllLeetCodeLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [solvedFilter, setSolvedFilter] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [companyFilter, setCompanyFilter] = useState('All');
  const [activeSubmissionCategory, setActiveSubmissionCategory] = useState(null);

  // Pagination states for browsing all LeetCode problems
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, difficultyFilter, solvedFilter, selectedCategory, companyFilter]);
  
  // Custom states for local DB sync
  const [solved, setSolved] = useState(() => new Set((JSON.parse(localStorage.getItem('pragati_practice_solved') || '[]')).filter(Boolean).filter(x => x !== 'undefined')));
  const [favorites] = useState(() => new Set((JSON.parse(localStorage.getItem('pragati_practice_favorites') || '[]')).filter(Boolean).filter(x => x !== 'undefined')));
  const [notes] = useState(() => JSON.parse(localStorage.getItem('pragati_practice_notes') || '{}'));
  const [submissions] = useState(() => JSON.parse(localStorage.getItem('pragati_practice_code_submissions') || '{}'));
  const [xp, setXp] = useState(() => parseInt(localStorage.getItem('pragati_practice_xp') || '0'));
  const [streak, setStreak] = useState(() => parseInt(localStorage.getItem('pragati_practice_streak') || '0'));
  const [lastSolveDate, setLastSolveDate] = useState(() => localStorage.getItem('pragati_practice_last_solve_date') || '');
  const [heatmap, setHeatmap] = useState(() => JSON.parse(localStorage.getItem('pragati_practice_heatmap') || '{}'));
  const [courseProgress, setCourseProgress] = useState(() => JSON.parse(localStorage.getItem('pragati_course_completed_chapters') || '{}'));

  // Active Splitscreen workspace item
  const [activeWorkspaceProblem, setActiveWorkspaceProblem] = useState(null);

  // Daily API sync variables
  const [daily, setDaily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [dailyError, setDailyError] = useState(null);
  const [dailyRetryCount, setDailyRetryCount] = useState(0);
  const dailyRetryTimerRef = React.useRef(null);

  const fetchDaily = React.useCallback(async (isAutoRetry = false) => {
    if (!isAutoRetry) {
      setDailyLoading(true);
      setDailyError(null);
      setDailyRetryCount(0);
      // Clear any pending auto-retry
      if (dailyRetryTimerRef.current) clearTimeout(dailyRetryTimerRef.current);
    }
    try {
      const res = await fetch(`${API}/problems/daily`, { headers: tk() });
      if (res.ok) {
        const d = await res.json();
        setDaily(d);
        setDailyError(null);
        setDailyLoading(false);
        setDailyRetryCount(0);
        if (dailyRetryTimerRef.current) clearTimeout(dailyRetryTimerRef.current);
      } else {
        const e = await res.json().catch(() => ({}));
        const msg = e.message || e.error || 'Server returned an error. Retrying...';
        setDailyError(msg);
        setDailyLoading(false);
      }
    } catch (e) {
      console.warn('[fetchDaily] attempt failed:', e.message);
      setDailyError('connecting');
      setDailyLoading(false);
      // Auto-retry up to 8 times with 4s interval
      setDailyRetryCount(prev => {
        const next = prev + 1;
        if (next <= 8) {
          dailyRetryTimerRef.current = setTimeout(() => fetchDaily(true), 4000);
        }
        return next;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const syncPracticeData = async () => {
    try {
      // 1. Fetch user solved problems history
      const resHist = await fetch(`${API}/problems/history`, { headers: tk() });
      if (resHist.ok) {
        const histData = await resHist.json();
        const solvedIds = new Set();
        const localNotes = {};
        const localCode = {};
        
        (histData.history || []).forEach(up => {
          const pId = up.problemId?._id || up.problemId;
          if (pId) {
            if (up.status === 'solved') {
              solvedIds.add(pId);
            }
            if (up.approachNotes) {
              localNotes[pId] = up.approachNotes;
            }
            if (up.solutionCode) {
              localCode[pId] = up.solutionCode;
            }
          }
        });
        
        // Merge into persistent state objects and localStorage
        const existingNotes = JSON.parse(localStorage.getItem('pragati_practice_notes') || '{}');
        const existingCode = JSON.parse(localStorage.getItem('pragati_practice_code_submissions') || '{}');
        
        const mergedNotes = { ...existingNotes, ...localNotes };
        const mergedCode = { ...existingCode, ...localCode };
        
        localStorage.setItem('pragati_practice_solved', JSON.stringify([...solvedIds]));
        localStorage.setItem('pragati_practice_notes', JSON.stringify(mergedNotes));
        localStorage.setItem('pragati_practice_code_submissions', JSON.stringify(mergedCode));
        
        setSolved(solvedIds);
        Object.assign(notes, mergedNotes);
        Object.assign(submissions, mergedCode);
      }

      // 2. Fetch my profile for streak & heatmap
      const resProf = await fetch(`${API}/analytics/my-profile`, { headers: tk() });
      if (resProf.ok) {
        const prof = await resProf.json();
        if (prof.student) {
          const newStreak = prof.student.streak || 0;
          setStreak(newStreak);
          setXp(prof.student.totalProblemsSolved * 10);
          localStorage.setItem('pragati_practice_streak', String(newStreak));
          // Also sync user context so DashboardHome shows updated streak
          if (setUser && prof.student) {
            setUser(prev => prev ? { ...prev, streak: newStreak, totalProblemsSolved: prof.student.totalProblemsSolved } : prev);
          }
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
    // Run both in parallel — no sequential waiting
    Promise.all([
      fetchDaily(),
      syncPracticeData(),
    ]);
  }, []); // eslint-disable-line

  const handleSolveProgress = (problemId, difficulty) => {
    // Proactively add solved problem locally first for instant feedback
    const nextSolved = new Set(solved);
    nextSolved.add(problemId);
    setSolved(nextSolved);

    // Wait 800ms for DB write to commit before re-fetching profile/streak
    setTimeout(() => syncPracticeData(), 800);
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
    if (tab === 'all-problems' || tab === 'submissions') {
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

    const a2zSolved = A2Z_SHEET_PROBLEMS.filter(p => solved.has(p.id)).length;
    const a2zPct = Math.round((a2zSolved / A2Z_SHEET_PROBLEMS.length) * 100);

    return {
      neetcodeSolved,
      neetcodePct,
      mlaSolved,
      mlaPct,
      a2zSolved,
      a2zPct
    };
  }, [solved]);

  const heatmapGridData = useMemo(() => {
    const data = [];
    const year = parseInt(heatmapYear) || new Date().getFullYear();
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const count = heatmap[dateStr] || 0;
      data.push({ date: dateStr, count, month: d.toLocaleString('default', { month: 'short' }), day: d.getDate() });
    }
    return data;
  }, [heatmap, heatmapYear]);

  const baseProblems = useMemo(() => {
    const mlaMap = new Map(MOST_LIKELY_ASKED.map(p => [p.title.toLowerCase(), p]));
    const neetcodeMap = new Map(NEETCODE_150.map(p => [p.title.toLowerCase(), p]));

    const allTitles = new Set([...mlaMap.keys(), ...neetcodeMap.keys()]);
    return Array.from(allTitles).map(t => {
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
  }, []);

  const isTopicMatch = (problemTopic, category) => {
    if (!problemTopic) return false;
    const pt = problemTopic.toLowerCase();
    const c = category.toLowerCase();
    if (c === 'all') return true;
    if (c === 'arrays') return pt.includes('array');
    if (c === 'strings') return pt.includes('string');
    if (c === 'trees') return pt.includes('tree') || pt.includes('trie');
    if (c === 'graphs') return pt.includes('graph');
    if (c === 'dynamic programming') return pt.includes('dynamic programming') || pt.includes('dp');
    if (c === 'stack & queue') return pt.includes('stack') || pt.includes('queue') || pt.includes('heap');
    if (c === 'math') return pt.includes('math') || pt.includes('geometry');
    if (c === 'binary search') return pt.includes('binary search');
    if (c === 'bit manipulation') return pt.includes('bit');
    if (c === 'recursion') return pt.includes('recursion');
    if (c === 'backtracking') return pt.includes('backtracking');
    if (c === 'sorting') return pt.includes('sort');
    if (c === 'greedy') return pt.includes('greedy');
    if (c === 'linked list') return pt.includes('linked list');
    return pt === c;
  };

  const allFilteredProblems = useMemo(() => {
    return baseProblems.filter(p => {
      if (search && !(p?.title || '').toLowerCase().includes(search.toLowerCase())) return false;
      if (difficultyFilter !== 'All' && p.difficulty !== difficultyFilter) return false;
      if (solvedFilter === 'Solved' && !solved.has(p.id)) return false;
      if (solvedFilter === 'Unsolved' && solved.has(p.id)) return false;
      if (solvedFilter === 'Favorites' && !favorites.has(p.id)) return false;
      if (selectedCategory !== 'All' && !isTopicMatch(p.topic, selectedCategory)) return false;
      if (companyFilter !== 'All' && !(p.askedBy && p.askedBy.includes(companyFilter))) return false;
      return true;
    });
  }, [baseProblems, search, difficultyFilter, solvedFilter, selectedCategory, companyFilter, solved, favorites]);

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
          onUpdateStreak={(newStreak) => {
            // Immediately update local streak state
            setStreak(newStreak);
            localStorage.setItem('pragati_practice_streak', String(newStreak));
            // Sync to user context so DashboardHome reflects it instantly
            if (setUser) {
              setUser(prev => prev ? { ...prev, streak: newStreak } : prev);
            }
          }}
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
          { id:'a2z', label:'🔥 A2Z DSA Roadmap' },
          { id:'all-problems', label:'🌐 All LeetCode Problems' },
          { id:'mla', label:'🔥 Most Likely Asked' },
          { id:'nc150', label:'🛣️ NeetCode 150 Roadmap' },
          { id:'submissions', label:'✅ My Submissions' },
          { id:'courses', label:'🎓 Full Video Courses' },
          { id:'categories', label:'🗂️ Browse Categories' }
        ].map(tabItem => (
          <button key={tabItem.id} onClick={()=>setTab(tabItem.id)} style={{ padding:'10px 18px', border:'none', background:tab===tabItem.id?'rgba(83,22,151,0.06)':'transparent', color:tab===tabItem.id?'#531697':'var(--text-3)', fontWeight:800, cursor:'pointer', fontSize:'.85rem', borderBottom:tab===tabItem.id?'2.5px solid #531697':'2.5px solid transparent', transition:'all 0.2s' }}>
            {tabItem.label}
          </button>
        ))}
      </div>

      {/* Today's curriculum assigned problems list (Easy, Medium, Hard) */}
      {tab === 'dash' && (
        <div style={{ background:'linear-gradient(135deg,rgba(83,22,151,0.03),rgba(19,161,165,0.03))', border:'1.5px solid rgba(83,22,151,0.12)', borderRadius:16, padding:20, marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:10 }}>
            <div>
              <span style={{ padding:'2px 8px', borderRadius:6, background:'rgba(245,158,11,0.15)', color:'#d97706', fontSize:'.65rem', fontWeight:800, textTransform:'uppercase' }}>Curriculum Assigned</span>
              <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.1rem', margin:'4px 0 0 0' }}>📌 Daily 3 LeetCode Targets</h3>
            </div>
            <span style={{ fontSize:'.75rem', color:'var(--text-3)', fontWeight:600 }}>Solve at least 1 to advance your streak! Solve all 3 for maximum heatmap dark purple color!</span>
          </div>

          {/* Loading state */}
          {dailyLoading && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:14 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ background:'var(--surface)', padding:16, borderRadius:12, border:'1.5px solid var(--border)' }}>
                  <div style={{ height:12, background:'linear-gradient(90deg,rgba(83,22,151,0.08),rgba(19,161,165,0.08),rgba(83,22,151,0.08))', backgroundSize:'200% 100%', borderRadius:6, marginBottom:10, animation:'_shimmer 1.5s infinite' }} />
                  <div style={{ height:18, background:'linear-gradient(90deg,rgba(83,22,151,0.06),rgba(19,161,165,0.06),rgba(83,22,151,0.06))', backgroundSize:'200% 100%', borderRadius:6, marginBottom:8, width:'80%', animation:'_shimmer 1.5s infinite' }} />
                  <div style={{ height:10, background:'rgba(255,255,255,0.04)', borderRadius:6, marginBottom:6, animation:'_shimmer 1.5s infinite' }} />
                  <div style={{ height:10, background:'rgba(255,255,255,0.04)', borderRadius:6, marginBottom:6, width:'60%', animation:'_shimmer 1.5s infinite' }} />
                  <style>{`@keyframes _shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
                </div>
              ))}
            </div>
          )}

          {/* Error / Connecting state */}
          {!dailyLoading && dailyError && (
            <div style={{ padding:20, background: dailyError === 'connecting' ? 'rgba(83,22,151,0.06)' : 'rgba(239,68,68,0.06)', border:`1px solid ${dailyError === 'connecting' ? 'rgba(83,22,151,0.25)' : 'rgba(239,68,68,0.2)'}`, borderRadius:12, textAlign:'center' }}>
              {dailyError === 'connecting' ? (
                <>
                  <div style={{ fontSize:'1.5rem', marginBottom:8, animation:'spin 1.5s linear infinite', display:'inline-block' }}>⚡</div>
                  <div style={{ fontSize:'.88rem', color:'#a78bfa', fontWeight:700, marginBottom:4 }}>Connecting to PRAGATI server…</div>
                  <div style={{ fontSize:'.75rem', color:'var(--text-3)', marginBottom:10 }}>
                    {dailyRetryCount <= 8 ? `Auto-retrying… (${dailyRetryCount}/8)` : 'Server may be starting up. Click Retry.'}
                  </div>
                  <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
                    <button onClick={() => fetchDaily(false)} style={{ padding:'6px 16px', borderRadius:8, background:'rgba(83,22,151,0.15)', border:'1px solid rgba(83,22,151,0.3)', color:'#a78bfa', fontWeight:800, cursor:'pointer', fontSize:'.78rem' }}>
                      🔄 Retry Now
                    </button>
                  </div>
                  <style>{`@keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }`}</style>
                </>
              ) : (
                <>
                  <div style={{ fontSize:'1.5rem', marginBottom:8 }}>⚠️</div>
                  <div style={{ fontSize:'.85rem', color:'#f87171', fontWeight:700, marginBottom:8 }}>{dailyError}</div>
                  <button onClick={() => fetchDaily(false)} style={{ padding:'6px 16px', borderRadius:8, background:'rgba(83,22,151,0.15)', border:'1px solid rgba(83,22,151,0.3)', color:'#a78bfa', fontWeight:800, cursor:'pointer', fontSize:'.78rem' }}>
                    🔄 Retry
                  </button>
                </>
              )}
            </div>
          )}

          {/* Empty state (fetch succeeded but no problems) */}
          {!dailyLoading && !dailyError && (!daily?.dailyProblems || daily.dailyProblems.length === 0) && (
            <div style={{ padding:20, background:'rgba(255,255,255,0.02)', border:'1px solid var(--border)', borderRadius:12, textAlign:'center' }}>
              <div style={{ fontSize:'1.8rem', marginBottom:8 }}>🎯</div>
              <div style={{ fontSize:'.88rem', color:'var(--text-2)', fontWeight:700, marginBottom:4 }}>No daily targets assigned yet</div>
              <div style={{ fontSize:'.75rem', color:'var(--text-3)' }}>Daily problems are refreshed at midnight. Check back tomorrow!</div>
            </div>
          )}

          {/* Problems grid */}
          {!dailyLoading && !dailyError && daily?.dailyProblems && daily.dailyProblems.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:14 }}>
              {(daily.dailyProblems || []).filter(d => d && d.problem && typeof d.problem === 'object' && (d.problem.title || d.problem._id || d.problem.id)).map(({ problem, userProblem }) => {
                const isSolved = solved.has(problem._id || problem.id);
                const diffCol = DIFF[problem.difficulty]?.color || '#cbd5e1';
                const diffBg = DIFF[problem.difficulty]?.bg || 'rgba(255,255,255,0.05)';
                // Gather description/hints from static data if not in problem object
                const staticData = getProblemStatement(problem.title, problem.topic, problem.difficulty);
                const descSnippet = problem.description
                  ? (problem.description.replace(/<[^>]+>/g, '').substring(0, 120) + (problem.description.length > 120 ? '…' : ''))
                  : (staticData.desc ? staticData.desc.substring(0, 120) + '…' : null);
                const hintsCount = (problem.hints && problem.hints.length) || (staticData.hints && staticData.hints.length) || 0;
                const hasEditorial = !!(problem.editorial || staticData.editorial);
                const topicBadge = problem.topic || staticData.topic || '';
                return (
                  <div key={problem._id || problem.id || problem.title}
                    style={{ background:'var(--surface)', padding:18, borderRadius:14,
                      border: isSolved ? '1.5px solid rgba(71,211,114,0.4)' : '1.5px solid var(--border)',
                      display:'flex', flexDirection:'column', justifyContent:'space-between',
                      boxShadow: isSolved ? '0 0 12px rgba(71,211,114,0.08)' : 'none',
                      transition:'transform 0.2s, box-shadow 0.2s',
                      position: 'relative', overflow: 'hidden'
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'none'}
                  >
                    {/* Top row: difficulty + status */}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
                        <span style={{ padding:'2px 8px', borderRadius:6, background:diffBg, color:diffCol, fontSize:'.68rem', fontWeight:800 }}>
                          {problem.difficulty || 'Easy'}
                        </span>
                        {topicBadge && (
                          <span style={{ padding:'2px 8px', borderRadius:6, background:'rgba(56,189,248,0.1)', color:'#38bdf8', fontSize:'.62rem', fontWeight:700, maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {topicBadge}
                          </span>
                        )}
                      </div>
                      {isSolved ? (
                        <span style={{ fontSize:'.72rem', color:'#47d372', fontWeight:800, display:'flex', alignItems:'center', gap:3 }}>✅ Solved</span>
                      ) : (
                        <span style={{ fontSize:'.72rem', color:'#ea580c', fontWeight:800, display:'flex', alignItems:'center', gap:3 }}>🎯 Target</span>
                      )}
                    </div>

                    {/* Title */}
                    <h4 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.92rem', color:'var(--text)', margin:'0 0 8px 0', lineHeight:1.3 }}>
                      {problem.title}
                    </h4>

                    {/* Description snippet */}
                    {descSnippet && (
                      <p style={{ fontSize:'.72rem', color:'var(--text-3)', margin:'0 0 10px 0', lineHeight:1.55 }}>
                        {descSnippet}
                      </p>
                    )}

                    {/* Badges: hints + editorial */}
                    <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
                      {hintsCount > 0 && (
                        <span style={{ padding:'2px 7px', borderRadius:5, background:'rgba(251,191,36,0.12)', color:'#fbbf24', fontSize:'.6rem', fontWeight:800 }}>
                          💡 {hintsCount} Hints
                        </span>
                      )}
                      {hasEditorial && (
                        <span style={{ padding:'2px 7px', borderRadius:5, background:'rgba(167,139,250,0.12)', color:'#a78bfa', fontSize:'.6rem', fontWeight:800 }}>
                          📖 Editorial
                        </span>
                      )}
                      <span style={{ padding:'2px 7px', borderRadius:5, background:'rgba(56,189,248,0.1)', color:'#38bdf8', fontSize:'.6rem', fontWeight:800 }}>
                        ⚡ AI Analysis
                      </span>
                    </div>

                    {/* CTA buttons */}
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={() => setActiveWorkspaceProblem(problem)}
                        style={{ flex:2, padding:'9px 0', borderRadius:9,
                          background: isSolved ? 'rgba(71,211,114,0.08)' : 'linear-gradient(135deg,#531697,#13a1a5)',
                          color: isSolved ? '#47d372' : '#fff',
                          border: isSolved ? '1px solid rgba(71,211,114,0.4)' : 'none',
                          fontWeight:800, cursor:'pointer', fontSize:'.78rem', transition:'opacity 0.2s'
                        }}>
                        {isSolved ? '🔍 Review Solution' : '⚡ Solve Target →'}
                      </button>
                      <a href={`https://leetcode.com/problems/${(problem.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}/`}
                        target="_blank" rel="noreferrer"
                        style={{ display:'flex', alignItems:'center', justifyContent:'center', flex:1, padding:'9px 0',
                          borderRadius:9, background:'rgba(255,255,255,0.03)',
                          color:'#94a3b8', border:'1px solid var(--border)', fontWeight:800, fontSize:'.72rem', textDecoration:'none'
                        }}>
                        LeetCode ↗
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
              { icon:'🛣️', label:'NeetCode 150', val:`${stats.neetcodePct}% complete`, color:'#a855f7', bg:'rgba(168,85,247,0.06)' },
              { icon:'🔥', label:'Most Likely Asked', val:`${stats.mlaPct}% complete`, color:'#3b82f6', bg:'rgba(59,130,246,0.06)' },
              { icon:'A2Z', label:'A2Z DSA Roadmap', val:`${stats.a2zPct}% complete`, color:'#ec4899', bg:'rgba(236,72,153,0.06)' }
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
          <div style={{ marginBottom:20 }}>
            <CalendarHeatmap heatmapProp={heatmap} />
          </div>

          {/* Roadmaps progress bars section */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:20, flexWrap:'wrap' }}>
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
            {/* A2Z card */}
            <div style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:16, padding:20 }}>
              <div style={{ fontSize:'.68rem', fontWeight:800, color:'#ec4899', textTransform:'uppercase' }}>Striver's Top 450+</div>
              <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.1rem', margin:'4px 0 12px 0' }}>🔥 A2Z DSA Roadmap</h3>
              <div style={{ height:12, background:'var(--border)', borderRadius:10, overflow:'hidden', marginBottom:12 }}>
                <div style={{ width:`${stats.a2zPct}%`, height:'100%', background:'linear-gradient(90deg,#ec4899,#f472b6)', borderRadius:10 }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.85rem' }}>
                <span>Solved: <strong>{stats.a2zSolved}</strong> / {A2Z_SHEET_PROBLEMS.length}</span>
                <span style={{ color:'#ec4899', fontWeight:800 }}>{stats.a2zPct}% complete</span>
              </div>
              <button onClick={()=>setTab('a2z')} style={{ width:'100%', marginTop:16, padding:'8px 0', border:'1px solid #ec4899', borderRadius:8, background:'rgba(236,72,153,0.05)', color:'#ec4899', cursor:'pointer', fontWeight:800, fontSize:'.8rem' }}>
                View Full A2Z Accordion →
              </button>
            </div>
          </div>
        </div>
      )}
      {/* TAB: A2Z DSA ROADMAP */}
      {tab === 'a2z' && (
        <div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search A2Z problem title..." style={{ padding:'8px 12px', borderRadius:8, border:'1.5px solid var(--border)', flex:1, outline:'none', fontSize:'.82rem', background:'var(--surface)', color:'var(--text)' }} />
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
            </select>
          </div>

          {(() => {
            // Group A2Z_SHEET_PROBLEMS by category first, then apply filters
            const grouped = {};
            A2Z_SHEET_PROBLEMS.forEach(p => {
              if (!grouped[p.category]) grouped[p.category] = [];
              grouped[p.category].push(p);
            });
            
            return Object.entries(grouped).map(([catName, problems]) => {
              const filtered = problems.filter(p => {
                const isSolved = solved.has(p.id);
                if (search && !(p?.title || '').toLowerCase().includes(search.toLowerCase())) return false;
                if (difficultyFilter !== 'All' && p.difficulty !== difficultyFilter) return false;
                if (solvedFilter === 'Solved' && !isSolved) return false;
                if (solvedFilter === 'Unsolved' && isSolved) return false;
                return true;
              });

              if (filtered.length === 0) return null;

              const catSolvedCount = problems.filter(p => solved.has(p.id)).length;
              const catPct = Math.round((catSolvedCount / problems.length) * 100) || 0;

              return (
                <div key={catName} style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:16, padding:18, marginBottom:16 }}>
                  <div 
                    onClick={() => setA2zExpanded(prev => ({...prev, [catName]: !prev[catName]}))}
                    style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10, marginBottom:10, cursor:'pointer' }}
                  >
                    <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1rem', margin:0, display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:'.8rem', transition:'transform 0.2s', transform:a2zExpanded[catName]?'rotate(90deg)':'rotate(0deg)' }}>▶</span>
                      {catName}
                    </h3>
                    <div style={{ textAlign:'right' }}>
                      <span style={{ fontSize:'.8rem', fontWeight:800, color:'#38bdf8' }}>{catPct}% solved</span>
                      <div style={{ fontSize:'.68rem', color:'var(--text-3)' }}>{catSolvedCount} / {problems.length} Complete</div>
                    </div>
                  </div>
                  <div style={{ height:6, background:'var(--border)', borderRadius:10, overflow:'hidden', marginBottom:12 }}>
                    <div style={{ width:`${catPct}%`, height:'100%', background:'linear-gradient(90deg,#38bdf8,#818cf8)', borderRadius:10 }} />
                  </div>

                  {a2zExpanded[catName] && (
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', textAlign:'left', fontSize:'.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom:'1px solid var(--border)' }}>
                          <th style={{ padding:'12px 16px', color:'var(--text-3)', fontWeight:800, width:'40px' }}>STATUS</th>
                          <th style={{ padding:'12px 16px', color:'var(--text-3)', fontWeight:800 }}>PROBLEM</th>
                          <th style={{ padding:'12px 16px', color:'var(--text-3)', fontWeight:800 }}>SOLVE</th>
                          <th style={{ padding:'12px 16px', color:'var(--text-3)', fontWeight:800 }}>RESOURCE</th>
                          <th style={{ padding:'12px 16px', color:'var(--text-3)', fontWeight:800 }}>PRACTICE</th>
                          <th style={{ padding:'12px 16px', color:'var(--text-3)', fontWeight:800 }}>DIFFICULTY</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map(p => {
                          const isSolved = solved.has(p.id);
                          return (
                            <tr key={p.id} style={{ borderBottom:'1px solid var(--border)', background:isSolved?'rgba(71,211,114,0.02)':'transparent' }}>
                              <td style={{ padding:'12px 16px', textAlign:'center', fontSize:'1rem' }}>{isSolved ? '✅' : '○'}</td>
                              <td style={{ padding:'12px 16px', fontWeight:700, color:'var(--text)' }}>{p.title}</td>
                              <td style={{ padding:'12px 16px' }}>
                                <button onClick={() => setActiveWorkspaceProblem(p)} style={{ padding:'5px 12px', borderRadius:6, background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', border:'none', fontSize:'.72rem', fontWeight:800, cursor:'pointer' }}>
                                  Solve in PRAGATI →
                                </button>
                              </td>
                              <td style={{ padding:'12px 16px' }}>
                                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                                  {p.youtube && (
                                    <a href={p.youtube.includes('http') ? p.youtube : `https://youtube.com/watch?v=${p.youtube}`} target="_blank" rel="noreferrer" style={{ textDecoration:'none', fontSize:'1.1rem' }} title="Video Solution">📺</a>
                                  )}
                                  {p.article && (
                                    <a href={p.article.includes('http') ? p.article : `https://takeuforward.org${p.article}`} target="_blank" rel="noreferrer" style={{ textDecoration:'none', fontSize:'1.1rem' }} title="Article">📝</a>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding:'12px 16px', textAlign:'center' }}>
                                {p.leetcode ? (
                                  <a href={p.leetcode} target="_blank" rel="noreferrer" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4, textDecoration:'none', color:'#f59e0b', fontSize:'.75rem', fontWeight:700 }}>
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/1/19/LeetCode_logo_black.png" alt="Leetcode" style={{ width:16, filter:'invert(1)' }} />
                                  </a>
                                ) : (
                                  <span style={{ color:'var(--text-3)' }}>-</span>
                                )}
                              </td>
                              <td style={{ padding:'12px 16px' }}>
                                <span style={{ padding:'3px 8px', borderRadius:6, background:DIFF[p.difficulty]?.bg, color:DIFF[p.difficulty]?.color, fontSize:'.7rem', fontWeight:800 }}>
                                  {p.difficulty}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* TAB: MY SUBMISSIONS */}
      {tab === 'submissions' && (() => {
        const allProbIds = new Set([
          ...Object.keys(submissions || {}), 
          ...Object.keys(notes || {}), 
          ...(solved ? Array.from(solved) : [])
        ]);

        const validSubmissions = Array.from(allProbIds).filter(probId => {
          if (probId === 'undefined') return false;
          const c = submissions[probId];
          const n = notes[probId];
          const hasRealCode = c && c.trim() && !c.trim().startsWith('// Write your');
          const hasRealNotes = n && n.trim() !== '';
          const isSolved = solved.has(probId);
          return hasRealCode || hasRealNotes || isSolved;
        });

        const catMap = { '🔥 A2Z DSA Roadmap': [], '🛣️ NeetCode 150 Roadmap': [], '🔥 Most Likely Asked': [], '🌐 All LeetCode Problems': [], 'other': [] };
        
        validSubmissions.forEach(probId => {
          if (A2Z_SHEET_PROBLEMS && A2Z_SHEET_PROBLEMS.some(p => p.id === probId)) {
            catMap['🔥 A2Z DSA Roadmap'].push(probId);
          } else if (NEETCODE_150 && NEETCODE_150.some(p => p.id === probId)) {
            catMap['🛣️ NeetCode 150 Roadmap'].push(probId);
          } else if (MOST_LIKELY_ASKED && MOST_LIKELY_ASKED.some(p => p.id === probId)) {
            catMap['🔥 Most Likely Asked'].push(probId);
          } else if (allLeetCodeProblems && allLeetCodeProblems.some(p => p.id === probId || p._id === probId)) {
            catMap['🌐 All LeetCode Problems'].push(probId);
          } else if (daily?.dailyProblems?.some(d => d?.problem?._id === probId || d?.problem?.id === probId)) {
            catMap['🌐 All LeetCode Problems'].push(probId);
          } else {
            catMap['other'].push(probId);
          }
        });

        const getProbTitle = (id) => {
          const fromStatic = allFilteredProblems.find(p => p?.id === id || p?._id === id);
          if (fromStatic) return fromStatic.title;
          const fromDb = allLeetCodeProblems.find(p => p?._id === id || p?.id === id);
          if (fromDb) return fromDb.title;
          const fromDaily = daily?.dailyProblems?.find(d => d?.problem?._id === id || d?.problem?.id === id);
          if (fromDaily?.problem) return fromDaily.problem.title;
          return id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        };

        return (
          <div>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.2rem', marginBottom:16 }}>
              {activeSubmissionCategory ? (
                <span style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <button onClick={() => setActiveSubmissionCategory(null)} style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:'1.2rem', padding:0 }}>⬅️</button>
                  {activeSubmissionCategory}
                </span>
              ) : '✅ Saved Code Submissions & Notes'}
            </h2>
            
            {validSubmissions.length === 0 ? (
              <div style={{ padding:40, textAlign:'center', color:'var(--text-3)', background:'var(--surface)', borderRadius:16, border:'1.5px solid var(--border)' }}>
                No actual submissions found yet. Write some code, notes, or mark a problem as solved!
              </div>
            ) : !activeSubmissionCategory ? (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16 }}>
                {Object.keys(catMap).map(catName => {
                  return (
                    <div 
                      key={catName} 
                      onClick={() => setActiveSubmissionCategory(catName)}
                      style={{ 
                        background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:14, padding:20, 
                        cursor:'pointer', transition:'transform 0.2s, borderColor 0.2s',
                        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center',
                        gap:10
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = '#531697'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                    >
                      <div style={{ fontSize:'1.1rem', fontWeight:800, color:'var(--text)' }}>
                        {catName}
                      </div>
                      <div style={{ fontSize:'.85rem', color:'var(--text-3)', fontWeight:700, background:'rgba(83,22,151,0.05)', padding:'4px 12px', borderRadius:20 }}>
                        {catMap[catName].length} Submissions
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {catMap[activeSubmissionCategory].length === 0 ? (
                  <div style={{ padding:30, textAlign:'center', color:'var(--text-3)', background:'var(--surface)', borderRadius:14, border:'1.5px solid var(--border)' }}>
                    No submissions found in this category.
                  </div>
                ) : (
                  catMap[activeSubmissionCategory].map(probId => {
                    const title = getProbTitle(probId);
                    return (
                      <div key={probId} style={{ border:'1.5px solid var(--border)', background:'var(--surface)', borderRadius:12, padding:14, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
                        <div>
                          <div style={{ fontWeight:800, fontSize:'1rem', color:'var(--text)', display:'flex', alignItems:'center', gap:8 }}>
                            {solved.has(probId) ? '✅' : '📝'} {title}
                          </div>
                          <div style={{ fontSize:'.75rem', color:'var(--text-3)', marginTop:4 }}>
                            {submissions[probId] && !submissions[probId].trim().startsWith('// Write your') ? 'Has Code ' : ''}
                            {notes[probId] && notes[probId].trim() !== '' ? (submissions[probId] && !submissions[probId].trim().startsWith('// Write your') ? '· Has Notes' : 'Has Notes') : ''}
                          </div>
                        </div>
                        <button onClick={() => setActiveWorkspaceProblem({ id: probId, title, topic: 'Revision', difficulty: 'Any' })} style={{ padding:'8px 16px', borderRadius:8, background:'rgba(56,189,248,0.1)', color:'#38bdf8', border:'1px solid rgba(56,189,248,0.2)', fontWeight:800, cursor:'pointer', fontSize:'.8rem' }}>
                          View Code →
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })()}

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
            <div style={{ background:'var(--surface)', border:'1.5px solid var(--border)', borderRadius:16, overflowX:'auto' }}>
              <table style={{ width:'100%', minWidth:'700px', borderCollapse:'collapse', textAlign:'left', fontSize:'.85rem' }}>
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
                    const filtered = (allLeetCodeProblems || []).filter(p => {
                      if (!p || (!p._id && !p.id)) return false;
                      const isSolved = solved.has(p._id || p.id);
                      if (solvedFilter === 'Solved' && !isSolved) return false;
                      if (solvedFilter === 'Unsolved' && isSolved) return false;
                      if (difficultyFilter !== 'All' && (p.difficulty || p.level) !== difficultyFilter) return false;
                      if (selectedCategory !== 'All' && !isTopicMatch(p.topic, selectedCategory)) return false;
                      if (search && !(p.title || '').toLowerCase().includes(search.toLowerCase())) return false;
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
                                <div style={{ display:'flex', gap:6, flexWrap:'wrap', minWidth:'160px' }}>
                                  <button onClick={() => setActiveWorkspaceProblem({ ...p, id: p._id || p.id })} style={{ padding:'5px 12px', borderRadius:6, background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', border:'none', fontSize:'.72rem', fontWeight:800, cursor:'pointer', whiteSpace:'nowrap' }}>
                                    Solve →
                                  </button>
                                  <a href={p.url || `https://leetcode.com/problems/${(p.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}/`} target="_blank" rel="noopener noreferrer" style={{ padding:'5px 12px', borderRadius:6, background:'linear-gradient(135deg,#13a1a5,#531697)', color:'#fff', border:'none', fontSize:'.72rem', fontWeight:800, cursor:'pointer', textDecoration:'none', whiteSpace:'nowrap' }}>
                                    LeetCode
                                  </a>
                                </div>
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
                const filtered = (allLeetCodeProblems || []).filter(p => {
                  if (!p || (!p._id && !p.id)) return false;
                  const isSolved = solved.has(p._id || p.id);
                  if (solvedFilter === 'Solved' && !isSolved) return false;
                  if (solvedFilter === 'Unsolved' && isSolved) return false;
                  if (difficultyFilter !== 'All' && (p.difficulty || p.level) !== difficultyFilter) return false;
                  if (selectedCategory !== 'All' && !isTopicMatch(p.topic, selectedCategory)) return false;
                  if (search && !(p.title || '').toLowerCase().includes(search.toLowerCase())) return false;
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

      {/* TAB 2: MOST LIKELY ASKED / CATEGORY VIEW */}
      {tab === 'mla' && (
        <div>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.2rem', marginBottom:14, color:'var(--text)' }}>
            {selectedCategory === 'All' ? '🔥 Most Likely Asked Interview Questions' : `📂 Curated Problems: ${selectedCategory}`}
          </h2>
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
            {allFilteredProblems.filter(p => p && (selectedCategory !== 'All' ? true : p.isMla)).map(p => {
              const completed = solved.has(p.id);
              const companyList = typeof p.askedBy === 'string'
                ? p.askedBy.split(', ').slice(0, 3)
                : (Array.isArray(p.askedBy) ? p.askedBy.slice(0, 3) : []);
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
                    {companyList.length > 0 && (
                      <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                        {companyList.map(item => {
                          const [name] = String(item).split('-');
                          return (
                            <span key={String(item)} style={{ fontSize:'.65rem', color:'var(--text-3)', padding:'1px 5px', borderRadius:4, background:'var(--background)', border:'1.5px solid var(--border)', display:'inline-flex', alignItems:'center', gap:2 }}>
                              {COMPANY_LOGOS[name]} {String(item)}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <button onClick={() => setActiveWorkspaceProblem(p)} style={{ padding:'6px 14px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontWeight:800, cursor:'pointer', fontSize:'.78rem' }}>
                      Practice Solution →
                    </button>
                    <a href={`https://leetcode.com/problems/${(p?.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}/`} target="_blank" rel="noreferrer" style={{ display:'flex', alignItems:'center', gap:4, textDecoration:'none', color:'#f59e0b', fontSize:'.75rem', fontWeight:800, padding:'6px 10px', borderRadius:8, background:'rgba(245,158,11,0.1)' }}>
                      <img src="https://upload.wikimedia.org/wikipedia/commons/1/19/LeetCode_logo_black.png" alt="Leetcode" style={{ width:14, filter:'invert(1)' }} />
                      LeetCode
                    </a>
                  </div>
                </div>
              );
            })}
            {allFilteredProblems.filter(p => selectedCategory !== 'All' ? true : p.isMla).length === 0 && (
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
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:10 }}>
                  {catProblems.map(p => {
                    const comp = solved.has(p.id);
                    return (
                      <div key={p.id} style={{ padding:'10px 14px', background:'var(--background)', border:`1.5px solid ${comp?'#4ade80':'var(--border)'}`, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                        <span style={{ flex:1, fontSize:'.85rem', fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {comp ? '✅' : '○'} {p.title}
                        </span>
                        <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
                          <span style={{ fontSize:'.65rem', color:DIFF[p.difficulty]?.color || '#cbd5e1', background:DIFF[p.difficulty]?.bg || 'transparent', padding:'2px 8px', borderRadius:6, border:`1px solid ${DIFF[p.difficulty]?.border || 'transparent'}` }}>{p.difficulty}</span>
                          <a href={`https://leetcode.com/problems/${(p?.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}/`} target="_blank" rel="noreferrer" style={{ padding:'4px 10px', borderRadius:8, border:'none', background:'rgba(245,158,11,0.15)', color:'#f59e0b', fontWeight:800, textDecoration:'none', display:'flex', alignItems:'center', gap:4, fontSize:'.65rem' }}>
                            <img src="https://upload.wikimedia.org/wikipedia/commons/1/19/LeetCode_logo_black.png" alt="Leetcode" style={{ width:12, filter:'invert(1)' }} />
                          </a>
                          <button onClick={()=>setActiveWorkspaceProblem(p)} style={{ padding:'4px 10px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontWeight:800, cursor:'pointer', fontSize:'.65rem' }}>
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
            const count = baseProblems.filter(p => isTopicMatch(p.topic, c)).length;
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