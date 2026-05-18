import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RoundHeader, Card, SectionTitle } from './PracticeComponents';
import { ROUND_RESOURCES } from './RESOURCES';

// ── Memory Match Game ─────────────────────────────────────────────────────────
const EMOJIS = ['🧠', '💡', '🎯', '🔥', '⚡', '🚀', '🌟', '🎪'];

function MemoryMatch() {
  const makeBoard = () => {
    const pairs = [...EMOJIS, ...EMOJIS];
    return pairs.sort(() => Math.random() - 0.5).map((e, i) => ({ id: i, emoji: e, flipped: false, matched: false }));
  };
  const [board, setBoard] = useState(makeBoard);
  const [selected, setSelected] = useState([]);
  const [moves, setMoves] = useState(0);
  const [done, setDone] = useState(false);
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setElapsedTime(Math.floor((Date.now() - startTime) / 1000)), 500);
    return () => clearInterval(t);
  }, [done, startTime]);

  function flip(card) {
    if (card.flipped || card.matched || selected.length === 2) return;
    const newBoard = board.map(c => c.id === card.id ? { ...c, flipped: true } : c);
    const newSel = [...selected, card];
    setBoard(newBoard);
    setSelected(newSel);
    if (newSel.length === 2) {
      setMoves(m => m + 1);
      if (newSel[0].emoji === newSel[1].emoji) {
        setTimeout(() => {
          setBoard(b => b.map(c => newSel.some(s => s.id === c.id) ? { ...c, matched: true } : c));
          setSelected([]);
          const updated = newBoard.map(c => newSel.some(s => s.id === c.id) ? { ...c, matched: true } : c);
          if (updated.every(c => c.matched)) setDone(true);
        }, 400);
      } else {
        setTimeout(() => {
          setBoard(b => b.map(c => !c.matched ? { ...c, flipped: false } : c));
          setSelected([]);
        }, 800);
      }
    }
  }

  function reset() { setBoard(makeBoard()); setSelected([]); setMoves(0); setDone(false); setElapsedTime(0); }

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <SectionTitle>🧠 Memory Match</SectionTitle>
        <div style={{ display: 'flex', gap: 14 }}>
          <span style={{ fontSize: '.78rem', color: '#7a8ba8', fontWeight: 700 }}>Moves: <strong style={{ color: '#531697' }}>{moves}</strong></span>
          <span style={{ fontSize: '.78rem', color: '#7a8ba8', fontWeight: 700 }}>Time: <strong style={{ color: '#531697' }}>{elapsedTime}s</strong></span>
        </div>
      </div>
      {done ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎉</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.1rem', color: '#0f1a2e', marginBottom: 4 }}>Completed!</div>
          <div style={{ color: '#7a8ba8', fontSize: '.85rem', marginBottom: 14 }}>{moves} moves · {elapsedTime} seconds</div>
          <button onClick={reset} style={{ padding: '9px 22px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#531697,#13a1a5)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif" }}>Play Again</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, maxWidth: 360, margin: '0 auto' }}>
          {board.map(card => (
            <div key={card.id} onClick={() => flip(card)}
              style={{ height: 70, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', cursor: card.matched || card.flipped ? 'default' : 'pointer', background: card.matched ? 'rgba(71,211,114,0.12)' : card.flipped ? 'rgba(83,22,151,0.08)' : 'linear-gradient(135deg,#531697,#13a1a5)', border: `2px solid ${card.matched ? 'rgba(71,211,114,0.3)' : card.flipped ? 'rgba(83,22,151,0.2)' : 'transparent'}`, transition: 'all .2s', transform: card.flipped || card.matched ? 'scale(1.02)' : 'scale(1)' }}>
              {card.flipped || card.matched ? card.emoji : ''}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Pattern Recognition ───────────────────────────────────────────────────────
const PATTERNS = [
  { seq: [2, 4, 6, 8, '?'], answer: '10', hint: 'Add 2 each time' },
  { seq: [1, 3, 9, 27, '?'], answer: '81', hint: 'Multiply by 3 each time' },
  { seq: [1, 1, 2, 3, 5, 8, '?'], answer: '13', hint: 'Fibonacci: sum of two previous' },
  { seq: [100, 50, 25, '?'], answer: '12.5', hint: 'Divide by 2 each time' },
  { seq: [1, 4, 9, 16, 25, '?'], answer: '36', hint: 'Perfect squares: 1², 2², 3²…' },
  { seq: [3, 6, 10, 15, 21, '?'], answer: '28', hint: 'Triangular numbers: +3, +4, +5, +6, +7' },
];

function PatternGame() {
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [score, setScore] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const p = PATTERNS[idx];

  function check() {
    const correct = input.trim() === p.answer;
    setResult(correct);
    if (correct) setScore(s => s + 1);
  }
  function next() {
    setIdx(i => (i + 1) % PATTERNS.length);
    setInput(''); setResult(null); setShowHint(false);
  }

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <SectionTitle>🔢 Pattern Recognition</SectionTitle>
        <span style={{ fontSize: '.78rem', color: '#7a8ba8', fontWeight: 700 }}>Score: <strong style={{ color: '#531697' }}>{score}/{PATTERNS.length}</strong></span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        {p.seq.map((n, i) => (
          <div key={i} style={{ minWidth: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: n === '?' ? 'linear-gradient(135deg,#531697,#13a1a5)' : '#f0f3fa', color: n === '?' ? '#fff' : '#0f1a2e', fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1rem', border: n === '?' ? 'none' : '1px solid #e8edf5' }}>
            {n}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !result && check()} placeholder="What comes next?" disabled={result !== null}
          style={{ flex: 1, padding: '10px 14px', borderRadius: 9, border: `1.5px solid ${result === null ? '#d0d7e8' : result ? '#47d372' : '#ef4444'}`, fontFamily: "'Nunito',sans-serif", fontSize: '.9rem', outline: 'none' }} />
        {result === null ? (
          <button onClick={check} style={{ padding: '10px 18px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#531697,#13a1a5)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif" }}>Check</button>
        ) : (
          <button onClick={next} style={{ padding: '10px 18px', borderRadius: 9, border: 'none', background: '#47d372', color: '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif" }}>Next →</button>
        )}
      </div>
      {result !== null && (
        <div style={{ padding: '8px 12px', borderRadius: 8, background: result ? 'rgba(71,211,114,0.1)' : 'rgba(239,68,68,0.1)', color: result ? '#166534' : '#991b1b', fontSize: '.82rem', fontWeight: 700 }}>
          {result ? '✅ Correct!' : `❌ Answer: ${p.answer} — ${p.hint}`}
        </div>
      )}
      {result === null && (
        <button onClick={() => setShowHint(s => !s)} style={{ marginTop: 8, padding: '4px 12px', borderRadius: 7, border: '1px solid #d0d7e8', background: 'transparent', color: '#7a8ba8', fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.75rem' }}>
          {showHint ? 'Hide hint' : '💡 Hint'}
        </button>
      )}
      {showHint && <div style={{ marginTop: 6, fontSize: '.78rem', color: '#531697' }}>Hint: {p.hint}</div>}
    </Card>
  );
}

// ── Reaction Timer ─────────────────────────────────────────────────────────────
function ReactionTimer() {
  const [state, setState] = useState('idle'); // idle | waiting | ready | done
  const [reactionTime, setReactionTime] = useState(null);
  const [scores, setScores] = useState([]);
  const timeoutRef = useRef(null);
  const startRef = useRef(null);

  const start = useCallback(() => {
    setState('waiting');
    const delay = 1500 + Math.random() * 3000;
    timeoutRef.current = setTimeout(() => { setState('ready'); startRef.current = Date.now(); }, delay);
  }, []);

  function handleClick() {
    if (state === 'idle') { start(); return; }
    if (state === 'waiting') { clearTimeout(timeoutRef.current); setState('idle'); alert('Too early! Wait for green.'); return; }
    if (state === 'ready') {
      const rt = Date.now() - startRef.current;
      setReactionTime(rt);
      setScores(s => [...s, rt]);
      setState('done');
    }
  }

  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <SectionTitle>⚡ Reaction Timer</SectionTitle>
        {avg && <span style={{ fontSize: '.78rem', color: '#7a8ba8' }}>Avg: <strong style={{ color: '#531697' }}>{avg}ms</strong></span>}
      </div>
      <div onClick={handleClick}
        style={{ height: 140, borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: state === 'ready' ? '#47d372' : state === 'waiting' ? '#ef4444' : 'linear-gradient(135deg,#531697,#13a1a5)', transition: 'background .1s', userSelect: 'none' }}>
        <div style={{ fontSize: '2rem', marginBottom: 6 }}>{state === 'ready' ? '🟢' : state === 'waiting' ? '🔴' : state === 'done' ? '⏱️' : '🖱️'}</div>
        <div style={{ color: '#fff', fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.95rem' }}>
          {state === 'idle' ? 'Click to Start' : state === 'waiting' ? 'Wait for green…' : state === 'ready' ? 'CLICK NOW!' : `${reactionTime}ms`}
        </div>
        {state === 'done' && <div onClick={e => { e.stopPropagation(); start(); }} style={{ marginTop: 10, padding: '5px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.25)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '.78rem' }}>Try Again</div>}
      </div>
      {scores.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {scores.map((s, i) => (
            <span key={i} style={{ padding: '2px 8px', borderRadius: 999, background: s < 250 ? 'rgba(71,211,114,0.1)' : s < 400 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', color: s < 250 ? '#166534' : s < 400 ? '#92400e' : '#991b1b', fontSize: '.72rem', fontWeight: 700 }}>{s}ms</span>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function GamingRoundPage() {
  const [showRes, setShowRes] = useState(false);
  return (
    <div style={{ fontFamily: "'Nunito',sans-serif" }}>
      <RoundHeader icon="🎮" title="Gaming Round Practice" subtitle="Mini games to test memory, pattern recognition, and reaction speed" />
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
        <button onClick={()=>setShowRes(r=>!r)}
          style={{ padding:'7px 16px', borderRadius:9, border:`1.5px solid ${showRes?'#059669':'#d0d7e8'}`, background:showRes?'rgba(5,150,105,0.06)':'#fff', color:showRes?'#059669':'#7a8ba8', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.78rem' }}>
          📚 {showRes?'Hide':'Resources'}
        </button>
      </div>
      {showRes && (
        <div style={{ background:'rgba(5,150,105,0.04)', border:'1px solid rgba(5,150,105,0.18)', borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
          <div style={{ fontSize:'.7rem', fontWeight:800, color:'#b0bec9', marginBottom:10 }}>GAMING ROUND & COGNITIVE TEST RESOURCES</div>
          <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
            {ROUND_RESOURCES.GAMING.map((r,i)=>(
              <a key={i} href={r.url} target="_blank" rel="noreferrer"
                style={{ padding:'5px 11px', borderRadius:7, background:r.color+'18', color:r.color, fontSize:'.72rem', fontWeight:800, textDecoration:'none', border:`1px solid ${r.color}30` }}>
                {r.tag} — {r.name} ↗
              </a>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gap: 20 }}>
        <MemoryMatch />
        <PatternGame />
        <ReactionTimer />
      </div>
    </div>
  );
}
