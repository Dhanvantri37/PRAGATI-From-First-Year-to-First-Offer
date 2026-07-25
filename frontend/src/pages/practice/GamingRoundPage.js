import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RoundHeader, Card, SectionTitle } from './PracticeComponents';
import { ROUND_RESOURCES } from './RESOURCES';

const GRAD = 'linear-gradient(135deg,#531697,#13a1a5)';

// ─────────────────────────────────────────────────────────────────────────────
// MOTIVATIONAL TOAST & BANNER MESSAGES
// ─────────────────────────────────────────────────────────────────────────────
const MOTIVATIONAL_SUCCESS = [
  '🌟 SUPERB! Outstanding logical speed!',
  '🔥 EXCELLENT! GenC Next Level performance!',
  '💪 WELL DONE! Perfect execution!',
  '⚡ BRILLIANT! Top percentile speed!',
  '🎉 AWESOME! You smashed this puzzle!'
];

const MOTIVATIONAL_RETRY = [
  '💡 Keep going! Every mistake builds your cognitive muscle.',
  '🚀 Don’t give up! Re-analyze the pattern and try again.',
  '🎯 Almost there! Take a deep breath and give it another shot.',
  '✨ Learning in progress! Master this technique now.'
];

function MotivationalToast({ message, type }) {
  if (!message) return null;
  const isSuccess = type === 'success';
  return (
    <div
      style={{
        marginTop: 12,
        padding: '12px 18px',
        borderRadius: 10,
        background: isSuccess ? 'rgba(71,211,114,0.15)' : 'rgba(239,68,68,0.12)',
        border: `1.5px solid ${isSuccess ? '#47d372' : '#ef4444'}`,
        color: isSuccess ? '#166534' : '#991b1b',
        fontWeight: 800,
        fontSize: '.85rem',
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
      }}
    >
      {message}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION TIMER BAR (Cognizant & Capgemini Exam Pattern)
// ─────────────────────────────────────────────────────────────────────────────
function ExamTimerBar({ durationSeconds, onTimeUp, isActive }) {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);

  useEffect(() => {
    setTimeLeft(durationSeconds);
  }, [durationSeconds]);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onTimeUp) onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, timeLeft, onTimeUp]);

  const pct = (timeLeft / durationSeconds) * 100;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  let barColor = '#47d372';
  if (pct < 50) barColor = '#f59e0b';
  if (pct < 20) barColor = '#ef4444';

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.78rem', fontWeight: 800, color: 'var(--text-3)', marginBottom: 4 }}>
        <span>⏱️ Cognizant Exam Section Timer</span>
        <span style={{ color: barColor }}>{timeStr}</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: barColor,
            transition: 'width 1s linear, background 0.3s'
          }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const SYMBOL_SETS = [
  ['🔴', '🟦', '🔺', '⭐'],
  ['🟢', '💎', '🔥', '⚡'],
  ['💜', '🌼', '🌙', '🎯'],
  ['🍀', '🔮', '🍉', '🚀']
];

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1: LEARN CARDS (CONCEPT & FORMULA GUIDES)
// ─────────────────────────────────────────────────────────────────────────────
function LearnPhaseGuide() {
  const GUIDES = [
    { title: '🧩 Geo-Sudoku (Deductive Logic)', desc: 'Each row and column must contain every symbol exactly once without repeating.', tip: 'Rule: Scan rows and columns with 3 filled cells first to deduce the 4th missing symbol instantly.' },
    { title: '🔀 Switch Challenge (Sequence Decoder)', desc: 'Numbers in key code (e.g. 3-1-4-2) indicate which element position moves to which output slot.', tip: 'Tip: Track just 1 key shape (like 🔴) to instantly eliminate 2-3 wrong options.' },
    { title: '🎯 Motion Pathfinder (Maze Navigation)', desc: 'Navigate dot to goal avoiding block walls using minimum steps.', tip: 'BFS Strategy: Work backwards from the target star to find the shortest unobstructed corridor.' },
    { title: '🧠 Grid Recall (Memory & Spatial)', desc: 'Memorize dot flash positions and complete vertical symmetry interrupts.', tip: 'Tip: Visualize the grid as 4 quadrants to store dot positions in working memory.' },
    { title: '🔢 Digit Challenge (Speed Arithmetic)', desc: 'Construct math expressions using number tokens to equal the target value.', tip: 'Tip: Work with factors of the target number to simplify math expressions.' }
  ];

  return (
    <div style={{ display: 'grid', gap: 14, marginBottom: 20 }}>
      <div style={{ padding: '16px 20px', borderRadius: 14, background: 'rgba(83,22,151,0.06)', border: '1.5px solid rgba(83,22,151,0.18)' }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1rem', color: '#531697', marginBottom: 4 }}>
          📖 Phase 1: Cognitive Test Concepts & Strategy Rules
        </div>
        <div style={{ fontSize: '.83rem', color: 'var(--text-2)', lineHeight: 1.6 }}>
          Master the rules, deduction tricks, and shortcuts used in Cognizant (GenC / GenC Next) and Capgemini (Aon / SHL) gaming rounds before taking the timed tests.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {GUIDES.map((g, i) => (
          <div key={i} style={{ padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.9rem', color: '#531697', marginBottom: 6 }}>{g.title}</div>
            <div style={{ fontSize: '.8rem', color: 'var(--text-2)', marginBottom: 8, lineHeight: 1.5 }}>{g.desc}</div>
            <div style={{ padding: '8px 10px', borderRadius: 8, background: '#f8fafc', borderLeft: '3px solid #13a1a5', fontSize: '.75rem', fontWeight: 700, color: '#0d7a7e' }}>
              💡 {g.tip}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME 1: DEDUCTIVE LOGIC (GEO-SUDOKU)
// ─────────────────────────────────────────────────────────────────────────────
function generateLatinSquare(symbols) {
  const n = symbols.length;
  const grid = Array.from({ length: n }, () => Array(n).fill(null));
  const syms = shuffle(symbols);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      grid[r][c] = syms[(r + c) % n];
    }
  }
  const rowOrder = shuffle([0, 1, 2, 3]);
  const colOrder = shuffle([0, 1, 2, 3]);
  return rowOrder.map(r => colOrder.map(c => grid[r][c]));
}

function GeoSudokuGame({ mode }) {
  const [level, setLevel] = useState(1);
  const [symSet, setSymSet] = useState(SYMBOL_SETS[0]);
  const [initial, setInitial] = useState([]);
  const [grid, setGrid] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [toast, setToast] = useState(null);
  const [score, setScore] = useState(0);

  const initGame = useCallback((lvl, setIdx = null) => {
    const symbols = SYMBOL_SETS[setIdx ?? Math.floor(Math.random() * SYMBOL_SETS.length)];
    setSymSet(symbols);
    const sol = generateLatinSquare(symbols);

    const removeCount = lvl === 1 ? 4 : lvl === 2 ? 7 : 10;
    const initGrid = sol.map(row => [...row]);
    const indices = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) indices.push([r, c]);
    }
    const toRemove = shuffle(indices).slice(0, removeCount);
    toRemove.forEach(([r, c]) => { initGrid[r][c] = null; });

    setInitial(initGrid.map(row => [...row]));
    setGrid(initGrid.map(row => [...row]));
    setSelectedCell(null);
    setToast(null);
  }, []);

  useEffect(() => { initGame(1, 0); }, [initGame]);

  const handleCellClick = (r, c) => {
    if (initial[r] && initial[r][c] !== null) return;
    setSelectedCell([r, c]);
  };

  const placeSymbol = (sym) => {
    if (!selectedCell) return;
    const [r, c] = selectedCell;
    const nextGrid = grid.map((row, ri) => row.map((v, ci) => (ri === r && ci === c ? sym : v)));
    setGrid(nextGrid);
    setToast(null);
  };

  const clearCell = () => {
    if (!selectedCell) return;
    const [r, c] = selectedCell;
    const nextGrid = grid.map((row, ri) => row.map((v, ci) => (ri === r && ci === c ? null : v)));
    setGrid(nextGrid);
    setToast(null);
  };

  const checkSolution = () => {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!grid[r][c]) {
          setToast({ message: MOTIVATIONAL_RETRY[Math.floor(Math.random() * MOTIVATIONAL_RETRY.length)], type: 'error' });
          return;
        }
      }
    }
    for (let i = 0; i < 4; i++) {
      const rowSet = new Set(grid[i]);
      const colSet = new Set(grid.map(row => row[i]));
      if (rowSet.size < 4 || colSet.size < 4) {
        setToast({ message: 'Duplicate symbols found in row or column! Re-check rules.', type: 'error' });
        return;
      }
    }
    setToast({ message: MOTIVATIONAL_SUCCESS[Math.floor(Math.random() * MOTIVATIONAL_SUCCESS.length)], type: 'success' });
    setScore(s => s + level * 150);
  };

  return (
    <Card style={{ background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <SectionTitle>🧩 Deductive Logic: Geo-Sudoku</SectionTitle>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: '.78rem', color: '#531697', fontWeight: 800 }}>Score: {score}</span>
          <select
            value={level}
            onChange={(e) => { const l = Number(e.target.value); setLevel(l); initGame(l); }}
            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #d0d7e8', fontSize: '.75rem', fontWeight: 700 }}
          >
            <option value={1}>Level 1: Easy (4 empty)</option>
            <option value={2}>Level 2: Medium (7 empty)</option>
            <option value={3}>Level 3: Cognizant GenC (10 empty)</option>
          </select>
        </div>
      </div>
      <p style={{ fontSize: '.82rem', color: 'var(--text-3)', marginBottom: 14 }}>
        Fill the 4x4 matrix so every row and column has each symbol exactly once without repeating.
      </p>

      {mode === 'timed' && <ExamTimerBar durationSeconds={180} onTimeUp={() => setToast({ message: '⏰ Time is up! Try generating a new puzzle.', type: 'error' })} isActive={true} />}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 56px)', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const isInitial = initial[r] && initial[r][c] !== null;
            const isSelected = selectedCell && selectedCell[0] === r && selectedCell[1] === c;
            return (
              <div
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center',
                  fontSize: '1.6rem',
                  cursor: isInitial ? 'not-allowed' : 'pointer',
                  background: isSelected ? 'rgba(83,22,151,0.15)' : isInitial ? '#f0f3fa' : '#fff',
                  border: isSelected ? '2.5px solid #531697' : '1.5px solid #d0d7e8',
                  boxShadow: isSelected ? '0 0 8px rgba(83,22,151,0.2)' : 'none',
                  transition: 'all .15s ease'
                }}
              >
                {cell || ''}
              </div>
            );
          })
        )}
      </div>

      {/* Symbol Palette */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: '.8rem', color: 'var(--text-3)', fontWeight: 700 }}>Palette:</span>
        {symSet.map(sym => (
          <button key={sym} onClick={() => placeSymbol(sym)} style={{ width: 42, height: 42, borderRadius: 8, border: '1.5px solid #d0d7e8', background: '#fff', fontSize: '1.3rem', cursor: 'pointer' }}>
            {sym}
          </button>
        ))}
        <button onClick={clearCell} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ef4444', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontWeight: 800, fontSize: '.75rem', cursor: 'pointer' }}>
          Clear
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button onClick={checkSolution} style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: GRAD, color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '.82rem' }}>
          Check Solution
        </button>
        <button onClick={() => initGame(level)} style={{ padding: '9px 18px', borderRadius: 9, border: '1.5px solid #d0d7e8', background: 'transparent', color: 'var(--text)', fontWeight: 700, cursor: 'pointer', fontSize: '.82rem' }}>
          🔄 Generate New Puzzle
        </button>
      </div>

      {toast && <MotivationalToast message={toast.message} type={toast.type} />}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME 2: SWITCH CHALLENGE (Logic Sequence Decoder)
// ─────────────────────────────────────────────────────────────────────────────
const ALL_SHAPES = ['🔴', '🟦', '🔺', '⭐', '🟢', '💎', '🔥', '⚡', '🌙', '🎯'];

function applyPermutation(input, perm) {
  return perm.map(pos => input[pos - 1]);
}

function generateSwitchProblem(level) {
  const length = level >= 3 ? 5 : 4;
  const input = shuffle(ALL_SHAPES).slice(0, length);
  const perm1 = shuffle(Array.from({ length }, (_, i) => i + 1));
  let intermediate = applyPermutation(input, perm1);
  let finalAns = intermediate;
  let codeStr = `CODE A: ${perm1.join(' - ')}`;

  if (level >= 2) {
    const perm2 = shuffle(Array.from({ length }, (_, i) => i + 1));
    finalAns = applyPermutation(intermediate, perm2);
    codeStr = `CODE A: ${perm1.join('-')} ➔ CODE B: ${perm2.join('-')}`;
  }

  const distractors = new Set();
  while (distractors.size < 3) {
    const cand = shuffle(input);
    if (cand.join('') !== finalAns.join('')) {
      distractors.add(JSON.stringify(cand));
    }
  }

  const options = shuffle([finalAns, ...Array.from(distractors).map(s => JSON.parse(s))]);
  const correctIdx = options.findIndex(opt => opt.join('') === finalAns.join(''));

  return { input, codeStr, options, correctIdx, finalAns };
}

function SwitchChallengeGame({ mode }) {
  const [level, setLevel] = useState(1);
  const [problem, setProblem] = useState(null);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [toast, setToast] = useState(null);

  const nextProblem = useCallback((lvl = level) => {
    setSelectedOpt(null);
    setToast(null);
    setProblem(generateSwitchProblem(lvl));
  }, [level]);

  useEffect(() => { nextProblem(1); }, [nextProblem]);

  const handleSelect = (idx) => {
    if (selectedOpt !== null) return;
    setSelectedOpt(idx);
    if (idx === problem.correctIdx) {
      setScore(s => s + 120 * level);
      setStreak(st => st + 1);
      setToast({ message: MOTIVATIONAL_SUCCESS[Math.floor(Math.random() * MOTIVATIONAL_SUCCESS.length)], type: 'success' });
    } else {
      setStreak(0);
      setToast({ message: MOTIVATIONAL_RETRY[Math.floor(Math.random() * MOTIVATIONAL_RETRY.length)], type: 'error' });
    }
  };

  if (!problem) return null;

  return (
    <Card style={{ background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <SectionTitle>🔀 Switch Challenge (Rule Decoder)</SectionTitle>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: '.78rem', color: '#531697', fontWeight: 800 }}>Score: {score} 🔥 Streak: {streak}</span>
          <select
            value={level}
            onChange={(e) => { const l = Number(e.target.value); setLevel(l); nextProblem(l); }}
            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #d0d7e8', fontSize: '.75rem', fontWeight: 700 }}
          >
            <option value={1}>Level 1: Single Code (4 shapes)</option>
            <option value={2}>Level 2: Dual Code Stack (4 shapes)</option>
            <option value={3}>Level 3: Cognizant GenC Next (5 shapes)</option>
          </select>
        </div>
      </div>
      <p style={{ fontSize: '.82rem', color: 'var(--text-3)', marginBottom: 14 }}>
        Cognizant Exam Pattern: Apply the hidden transformation rules to decode the output sequence.
      </p>

      {mode === 'timed' && <ExamTimerBar durationSeconds={240} onTimeUp={() => setToast({ message: '⏰ Section time expired!', type: 'error' })} isActive={true} />}

      {/* Input Sequence */}
      <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 14, textAlign: 'center' }}>
        <div style={{ fontSize: '.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>INPUT SEQUENCE</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {problem.input.map((shape, i) => (
            <div key={i} style={{ width: 44, height: 44, borderRadius: 8, background: '#fff', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
              {shape}
            </div>
          ))}
        </div>
      </div>

      {/* Operator Key */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 20, background: 'rgba(83,22,151,0.1)', color: '#531697', fontWeight: 800, fontSize: '.85rem' }}>
          ⚡ {problem.codeStr}
        </div>
      </div>

      {/* Answer Options */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {problem.options.map((opt, i) => {
          const isChosen = selectedOpt === i;
          const isCorrect = i === problem.correctIdx;
          let borderCol = '#d0d7e8';
          let bgCol = '#fff';
          if (selectedOpt !== null) {
            if (isCorrect) { borderCol = '#47d372'; bgCol = 'rgba(71,211,114,0.08)'; }
            else if (isChosen) { borderCol = '#ef4444'; bgCol = 'rgba(239,68,68,0.08)'; }
          }
          return (
            <div
              key={i}
              onClick={() => handleSelect(i)}
              style={{
                padding: 12,
                borderRadius: 10,
                border: `2px solid ${borderCol}`,
                background: bgCol,
                cursor: selectedOpt !== null ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justify: 'center',
                gap: 6
              }}
            >
              {opt.map((s, idx) => (
                <span key={idx} style={{ fontSize: '1.2rem' }}>{s}</span>
              ))}
            </div>
          );
        })}
      </div>

      {toast && <MotivationalToast message={toast.message} type={toast.type} />}

      {selectedOpt !== null && (
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button onClick={() => nextProblem(level)} style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: GRAD, color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '.82rem' }}>
            Next Switch Challenge →
          </button>
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME 3: MOTION CHALLENGE (Maze Pathfinder)
// ─────────────────────────────────────────────────────────────────────────────
function bfsShortestPath(size, start, target, walls) {
  const wallSet = new Set(walls);
  const queue = [[start.r, start.c, 0]];
  const visited = new Set([`${start.r}-${start.c}`]);
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  while (queue.length > 0) {
    const [r, c, dist] = queue.shift();
    if (r === target.r && c === target.c) return dist;

    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      const key = `${nr}-${nc}`;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && !wallSet.has(key) && !visited.has(key)) {
        visited.add(key);
        queue.push([nr, nc, dist + 1]);
      }
    }
  }
  return -1;
}

function generateMotionMaze(level) {
  const size = level === 1 ? 4 : level === 2 ? 5 : 6;
  const wallCount = level === 1 ? 3 : level === 2 ? 6 : 9;
  const start = { r: 0, c: 0 };
  const target = { r: size - 1, c: size - 1 };

  let walls = [];
  let optimalDist = -1;

  while (optimalDist === -1) {
    const candidates = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if ((r === start.r && c === start.c) || (r === target.r && c === target.c)) continue;
        candidates.push(`${r}-${c}`);
      }
    }
    walls = shuffle(candidates).slice(0, wallCount);
    optimalDist = bfsShortestPath(size, start, target, walls);
  }

  return { size, start, target, walls, optimalDist };
}

function MotionChallengeGame({ mode }) {
  const [level, setLevel] = useState(1);
  const [maze, setMaze] = useState(null);
  const [pos, setPos] = useState({ r: 0, c: 0 });
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [score, setScore] = useState(0);
  const [toast, setToast] = useState(null);

  const initLevel = useCallback((lvl = level) => {
    const m = generateMotionMaze(lvl);
    setMaze(m);
    setPos(m.start);
    setMoves(0);
    setWon(false);
    setToast(null);
  }, [level]);

  useEffect(() => { initLevel(1); }, [initLevel]);

  const move = (dr, dc) => {
    if (won || !maze) return;
    const nr = pos.r + dr;
    const nc = pos.c + dc;
    if (nr < 0 || nr >= maze.size || nc < 0 || nc >= maze.size) return;
    if (maze.walls.includes(`${nr}-${nc}`)) return;

    setPos({ r: nr, c: nc });
    const nextMoves = moves + 1;
    setMoves(nextMoves);
    if (nr === maze.target.r && nc === maze.target.c) {
      setWon(true);
      const isOptimal = nextMoves === maze.optimalDist;
      setToast({
        message: isOptimal
          ? '🌟 PERFECT! You found the exact BFS optimal path!'
          : MOTIVATIONAL_SUCCESS[Math.floor(Math.random() * MOTIVATIONAL_SUCCESS.length)],
        type: 'success'
      });
      setScore(s => s + (isOptimal ? 250 : 150) * level);
    }
  };

  if (!maze) return null;

  return (
    <Card style={{ background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <SectionTitle>🎯 Motion Challenge (Pathfinder)</SectionTitle>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: '.78rem', color: '#531697', fontWeight: 800 }}>Moves: {moves} (Optimal: {maze.optimalDist})</span>
          <select
            value={level}
            onChange={(e) => { const l = Number(e.target.value); setLevel(l); initLevel(l); }}
            style={{ padding: '4px 8px', borderRadius: 6, border: '1.5px solid #d0d7e8', fontSize: '.75rem', fontWeight: 700 }}
          >
            <option value={1}>Level 1: 4x4 Grid (3 Walls)</option>
            <option value={2}>Level 2: 5x5 Grid (6 Walls)</option>
            <option value={3}>Level 3: Cognizant GenC (6x6 Grid, 9 Walls)</option>
          </select>
        </div>
      </div>
      <p style={{ fontSize: '.82rem', color: 'var(--text-3)', marginBottom: 14 }}>
        Navigate dot (🟢) to destination (⭐) avoiding walls (🧱) in minimum moves.
      </p>

      {mode === 'timed' && <ExamTimerBar durationSeconds={180} onTimeUp={() => setToast({ message: '⏰ Section time expired!', type: 'error' })} isActive={true} />}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${maze.size}, 46px)`, gap: 6, justifyContent: 'center', marginBottom: 16 }}>
        {Array.from({ length: maze.size }).map((_, r) =>
          Array.from({ length: maze.size }).map((_, c) => {
            const isPlayer = pos.r === r && pos.c === c;
            const isTarget = maze.target.r === r && maze.target.c === c;
            const isWall = maze.walls.includes(`${r}-${c}`);
            return (
              <div
                key={`${r}-${c}`}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 8,
                  background: isWall ? '#334155' : isPlayer ? 'rgba(83,22,151,0.1)' : '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center',
                  fontSize: '1.4rem'
                }}
              >
                {isPlayer ? '🟢' : isTarget ? '⭐' : isWall ? '🧱' : ''}
              </div>
            );
          })
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <button onClick={() => move(-1, 0)} style={{ width: 44, height: 38, borderRadius: 8, border: '1px solid #d0d7e8', background: '#fff', cursor: 'pointer', fontWeight: 800 }}>⬆️</button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => move(0, -1)} style={{ width: 44, height: 38, borderRadius: 8, border: '1px solid #d0d7e8', background: '#fff', cursor: 'pointer', fontWeight: 800 }}>⬅️</button>
          <button onClick={() => move(1, 0)} style={{ width: 44, height: 38, borderRadius: 8, border: '1px solid #d0d7e8', background: '#fff', cursor: 'pointer', fontWeight: 800 }}>⬇️</button>
          <button onClick={() => move(0, 1)} style={{ width: 44, height: 38, borderRadius: 8, border: '1px solid #d0d7e8', background: '#fff', cursor: 'pointer', fontWeight: 800 }}>➡️</button>
        </div>
      </div>

      {toast && <MotivationalToast message={toast.message} type={toast.type} />}

      {won && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button onClick={() => initLevel(level)} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: GRAD, color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '.8rem' }}>
            Next Procedural Maze →
          </button>
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME 4: 100% DYNAMIC DIGIT CHALLENGE
// ─────────────────────────────────────────────────────────────────────────────
function generateDynamicDigitPuzzle(level) {
  const cardCount = level >= 3 ? 5 : 4;
  const pool = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15];
  const nums = shuffle(pool).slice(0, cardCount);

  const opList = ['+', '-', '*'];
  const op1 = opList[Math.floor(Math.random() * opList.length)];
  const op2 = opList[Math.floor(Math.random() * opList.length)];

  let target = 24;
  if (op1 === '+' && op2 === '*') target = (nums[0] + nums[1]) * nums[2];
  else if (op1 === '*' && op2 === '+') target = (nums[0] * nums[1]) + nums[2];
  else if (op1 === '*' && op2 === '-') target = (nums[0] * nums[1]) - nums[2];
  else target = nums[0] + nums[1] + nums[2];

  if (target <= 0 || target > 200) target = (nums[0] * nums[1]) + 5;

  return { target, nums };
}

function DigitChallengeGame({ mode }) {
  const [level, setLevel] = useState(1);
  const [puzzle, setPuzzle] = useState(null);
  const [equation, setEquation] = useState([]);
  const [toast, setToast] = useState(null);
  const [score, setScore] = useState(0);

  const nextPuzzle = useCallback((lvl = level) => {
    setPuzzle(generateDynamicDigitPuzzle(lvl));
    setEquation([]);
    setToast(null);
  }, [level]);

  useEffect(() => { nextPuzzle(1); }, [nextPuzzle]);

  const addToken = (t) => setEquation(prev => [...prev, t]);
  const clearEq = () => { setEquation([]); setToast(null); };

  const evaluateEq = () => {
    try {
      const expr = equation.join('');
      // eslint-disable-next-line no-eval
      const val = eval(expr);
      if (val === puzzle.target) {
        setToast({ message: MOTIVATIONAL_SUCCESS[Math.floor(Math.random() * MOTIVATIONAL_SUCCESS.length)], type: 'success' });
        setScore(s => s + 150 * level);
      } else {
        setToast({ message: `Evaluated to ${val}, target is ${puzzle.target}. Try another expression!`, type: 'error' });
      }
    } catch (e) {
      setToast({ message: 'Invalid mathematical equation format!', type: 'error' });
    }
  };

  if (!puzzle) return null;

  return (
    <Card style={{ background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <SectionTitle>🔢 Dynamic Digit Challenge (Numerical Speed)</SectionTitle>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: '.85rem', color: '#531697', fontWeight: 800 }}>TARGET: {puzzle.target}</span>
          <select
            value={level}
            onChange={(e) => { const l = Number(e.target.value); setLevel(l); nextPuzzle(l); }}
            style={{ padding: '4px 8px', borderRadius: 6, border: '1.5px solid #d0d7e8', fontSize: '.75rem', fontWeight: 700 }}
          >
            <option value={1}>Level 1: Basic Target (4 Cards)</option>
            <option value={2}>Level 2: Medium Target (4 Cards)</option>
            <option value={3}>Level 3: Cognizant GenC Speed (5 Cards)</option>
          </select>
        </div>
      </div>
      <p style={{ fontSize: '.82rem', color: 'var(--text-3)', marginBottom: 14 }}>
        Construct a valid mathematical expression using the given digit tokens to equal the dynamic target value.
      </p>

      {mode === 'timed' && <ExamTimerBar durationSeconds={180} onTimeUp={() => setToast({ message: '⏰ Section time expired!', type: 'error' })} isActive={true} />}

      {/* Number Tokens */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        {puzzle.nums.map((n, i) => (
          <button key={i} onClick={() => addToken(n)} style={{ width: 44, height: 44, borderRadius: 8, border: '1.5px solid #531697', background: 'rgba(83,22,151,0.06)', fontSize: '1.1rem', fontWeight: 800, color: '#531697', cursor: 'pointer' }}>
            {n}
          </button>
        ))}
        {['+', '-', '*', '/'].map((op) => (
          <button key={op} onClick={() => addToken(op)} style={{ width: 44, height: 44, borderRadius: 8, border: '1.5px solid #13a1a5', background: 'rgba(19,161,165,0.06)', fontSize: '1.1rem', fontWeight: 800, color: '#13a1a5', cursor: 'pointer' }}>
            {op}
          </button>
        ))}
      </div>

      <div style={{ minHeight: 44, background: '#f8fafc', borderRadius: 8, border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', marginBottom: 14 }}>
        {equation.join(' ') || 'Build expression...'}
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button onClick={evaluateEq} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: GRAD, color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '.8rem' }}>Evaluate</button>
        <button onClick={clearEq} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontWeight: 800, cursor: 'pointer', fontSize: '.8rem' }}>Clear</button>
        <button onClick={() => nextPuzzle(level)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #d0d7e8', background: 'transparent', color: 'var(--text)', fontWeight: 700, cursor: 'pointer', fontSize: '.8rem' }}>🔄 Next Target</button>
      </div>

      {toast && <MotivationalToast message={toast.message} type={toast.type} />}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME 5: GRID CHALLENGE (Memory & Spatial)
// ─────────────────────────────────────────────────────────────────────────────
function GridChallengeGame({ mode }) {
  const [level, setLevel] = useState(1);
  const [phase, setPhase] = useState('idle');
  const [sequence, setSequence] = useState([]);
  const [highlightIdx, setHighlightIdx] = useState(null);
  const [userClicks, setUserClicks] = useState([]);
  const [score, setScore] = useState(0);
  const [toast, setToast] = useState(null);
  const [symmetryTask, setSymmetryTask] = useState({ shape: '🔺|🔺', isSym: true });

  const startTest = () => {
    const seqLen = level === 1 ? 3 : level === 2 ? 4 : 5;
    const allIndices = Array.from({ length: 16 }, (_, i) => i);
    const newSeq = shuffle(allIndices).slice(0, seqLen);
    setSequence(newSeq);
    setToast(null);

    const symOptions = [
      { shape: '🔺|🔺', isSym: true },
      { shape: '⭐|⭐', isSym: true },
      { shape: '🔻|🔺', isSym: false },
      { shape: '🟢|🔵', isSym: false }
    ];
    setSymmetryTask(symOptions[Math.floor(Math.random() * symOptions.length)]);

    setPhase('flash');
    setUserClicks([]);
    let step = 0;
    const speed = level === 3 ? 600 : 900;
    const interval = setInterval(() => {
      if (step < newSeq.length) {
        setHighlightIdx(newSeq[step]);
        step++;
      } else {
        clearInterval(interval);
        setHighlightIdx(null);
        setPhase('symmetry');
      }
    }, speed);
  };

  const handleSymmetry = () => {
    setPhase('recall');
  };

  const handleGridClick = (idx) => {
    if (phase !== 'recall') return;
    const nextClicks = [...userClicks, idx];
    setUserClicks(nextClicks);
    if (nextClicks.length === sequence.length) {
      let correct = 0;
      nextClicks.forEach((val, i) => { if (val === sequence[i]) correct++; });
      setScore(s => s + correct * 60 * level);
      setToast({
        message: correct === sequence.length
          ? MOTIVATIONAL_SUCCESS[Math.floor(Math.random() * MOTIVATIONAL_SUCCESS.length)]
          : MOTIVATIONAL_RETRY[Math.floor(Math.random() * MOTIVATIONAL_RETRY.length)],
        type: correct === sequence.length ? 'success' : 'error'
      });
      setPhase('result');
    }
  };

  return (
    <Card style={{ background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <SectionTitle>🧠 Grid Challenge (Memory & Spatial)</SectionTitle>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: '.78rem', color: '#531697', fontWeight: 800 }}>Score: {score}</span>
          <select
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            style={{ padding: '4px 8px', borderRadius: 6, border: '1.5px solid #d0d7e8', fontSize: '.75rem', fontWeight: 700 }}
          >
            <option value={1}>Level 1: 3 Dots</option>
            <option value={2}>Level 2: 4 Dots</option>
            <option value={3}>Level 3: Cognizant (5 Dots Fast Flash)</option>
          </select>
        </div>
      </div>
      <p style={{ fontSize: '.82rem', color: 'var(--text-3)', marginBottom: 14 }}>
        Memorize flashing dot sequence, perform spatial symmetry interrupt task, then recall exact positions.
      </p>

      {phase === 'idle' && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <button onClick={startTest} style={{ padding: '10px 24px', borderRadius: 9, border: 'none', background: GRAD, color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '.85rem' }}>
            Start Grid Sequence Test
          </button>
        </div>
      )}

      {(phase === 'flash' || phase === 'recall' || phase === 'result') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 48px)', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
          {Array.from({ length: 16 }).map((_, idx) => {
            const isFlashing = highlightIdx === idx;
            const isClicked = userClicks.includes(idx);
            return (
              <div
                key={idx}
                onClick={() => handleGridClick(idx)}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: isFlashing ? '#531697' : isClicked ? '#13a1a5' : '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  cursor: phase === 'recall' ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center',
                  fontSize: '1.2rem',
                  color: '#fff',
                  fontWeight: 800
                }}
              >
                {isFlashing ? '🔵' : isClicked ? userClicks.indexOf(idx) + 1 : ''}
              </div>
            );
          })}
        </div>
      )}

      {phase === 'symmetry' && (
        <div style={{ textAlign: 'center', background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 14 }}>
          <div style={{ fontSize: '.75rem', fontWeight: 800, color: 'var(--text-3)', marginBottom: 8 }}>SPATIAL INTERRUPT TASK</div>
          <div style={{ fontSize: '2.2rem', marginBottom: 8 }}>⚖️ {symmetryTask.shape}</div>
          <div style={{ fontSize: '.85rem', fontWeight: 700, marginBottom: 12 }}>Is this figure vertically symmetrical?</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => handleSymmetry()} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#47d372', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Yes</button>
            <button onClick={() => handleSymmetry()} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>No</button>
          </div>
        </div>
      )}

      {toast && <MotivationalToast message={toast.message} type={toast.type} />}

      {phase === 'result' && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button onClick={startTest} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: GRAD, color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '.8rem' }}>
            Next Grid Sequence →
          </button>
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME 6: REACTION TIMER
// ─────────────────────────────────────────────────────────────────────────────
function ReactionTimer() {
  const [state, setState] = useState('idle');
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
    <Card style={{ background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <SectionTitle>⚡ Reaction Speed Challenge</SectionTitle>
        {avg && <span style={{ fontSize: '.78rem', color: 'var(--text-3)' }}>Avg: <strong style={{ color: '#531697' }}>{avg}ms</strong></span>}
      </div>
      <div onClick={handleClick}
        style={{ height: 120, borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: state === 'ready' ? '#47d372' : state === 'waiting' ? '#ef4444' : GRAD, transition: 'background .1s', userSelect: 'none' }}>
        <div style={{ fontSize: '1.8rem', marginBottom: 4 }}>{state === 'ready' ? '🟢' : state === 'waiting' ? '🔴' : state === 'done' ? '⏱️' : '🖱️'}</div>
        <div style={{ color: '#fff', fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.9rem' }}>
          {state === 'idle' ? 'Click to Start Reaction Test' : state === 'waiting' ? 'Wait for green…' : state === 'ready' ? 'CLICK NOW!' : `${reactionTime}ms`}
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE EXPORT (3-PHASE ARCHITECTURE)
// ─────────────────────────────────────────────────────────────────────────────
export default function GamingRoundPage() {
  const [phaseMode, setPhaseMode] = useState('practice'); // 'learn' | 'practice' | 'timed'
  const [activeTab, setActiveTab] = useState('ALL');
  const [showRes, setShowRes] = useState(false);

  const PHASES = [
    { key: 'learn', label: '📖 Phase 1: Learn Concepts', color: '#531697' },
    { key: 'practice', label: '🧪 Phase 2: Interactive Practice', color: '#13a1a5' },
    { key: 'timed', label: '⏱️ Phase 3: Timed Exam Mode', color: '#ef4444' }
  ];

  const TABS = [
    { key: 'ALL', label: '🎮 All Challenges' },
    { key: 'DEDUCTIVE', label: '🧩 Geo-Sudoku' },
    { key: 'SWITCH', label: '🔀 Switch Challenge' },
    { key: 'MOTION', label: '🎯 Motion Pathfinder' },
    { key: 'GRID', label: '🧠 Grid Recall' },
    { key: 'DIGIT', label: '🔢 Digit Challenge' }
  ];

  return (
    <div style={{ fontFamily: "'Nunito',sans-serif" }}>
      <RoundHeader
        icon="🏢🎮"
        title="360° Cognizant & Corporate Gaming Assessment Simulator"
        subtitle="3-Phase Preparation Hub: Learn concept rules ➔ Interactive untimed practice ➔ Exam timed simulation with real section timers & percentile scoring."
      />

      {/* 3-Phase Navigation Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {PHASES.map(p => (
          <button
            key={p.key}
            onClick={() => setPhaseMode(p.key)}
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              border: phaseMode === p.key ? `2px solid ${p.color}` : '1.5px solid #d0d7e8',
              background: phaseMode === p.key ? `${p.color}12` : '#fff',
              color: phaseMode === p.key ? p.color : 'var(--text)',
              fontFamily: "'Syne',sans-serif",
              fontWeight: 800,
              fontSize: '.85rem',
              cursor: 'pointer',
              boxShadow: phaseMode === p.key ? `0 4px 14px ${p.color}25` : 'none',
              transition: 'all .2s ease'
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {phaseMode === 'learn' && <LearnPhaseGuide />}

      {/* Resource & Challenge tab controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: activeTab === tab.key ? 'none' : '1.5px solid #d0d7e8',
                background: activeTab === tab.key ? GRAD : '#fff',
                color: activeTab === tab.key ? '#fff' : 'var(--text)',
                fontWeight: 800,
                fontSize: '.78rem',
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowRes(r => !r)}
          style={{
            padding: '7px 14px',
            borderRadius: 8,
            border: `1.5px solid ${showRes ? '#059669' : '#d0d7e8'}`,
            background: showRes ? 'rgba(5,150,105,0.06)' : '#fff',
            color: showRes ? '#059669' : 'var(--text-3)',
            fontWeight: 800,
            cursor: 'pointer',
            fontSize: '.78rem'
          }}
        >
          📚 {showRes ? 'Hide Resources' : 'Resources'}
        </button>
      </div>

      {showRes && (
        <div style={{ background: 'rgba(5,150,105,0.04)', border: '1px solid rgba(5,150,105,0.18)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: '.7rem', fontWeight: 800, color: '#b0bec9', marginBottom: 10 }}>COGNIZANT & CAPGEMINI COGNITIVE GAMING RESOURCES</div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {ROUND_RESOURCES.GAMING.map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noreferrer"
                style={{ padding: '5px 11px', borderRadius: 7, background: r.color + '18', color: r.color, fontSize: '.72rem', fontWeight: 800, textDecoration: 'none', border: `1px solid ${r.color}30` }}>
                {r.tag} — {r.name} ↗
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Render Games Grid */}
      <div style={{ display: 'grid', gap: 20 }}>
        {(activeTab === 'ALL' || activeTab === 'DEDUCTIVE') && <GeoSudokuGame mode={phaseMode} />}
        {(activeTab === 'ALL' || activeTab === 'SWITCH') && <SwitchChallengeGame mode={phaseMode} />}
        {(activeTab === 'ALL' || activeTab === 'MOTION') && <MotionChallengeGame mode={phaseMode} />}
        {(activeTab === 'ALL' || activeTab === 'GRID') && <GridChallengeGame mode={phaseMode} />}
        {(activeTab === 'ALL' || activeTab === 'DIGIT') && <DigitChallengeGame mode={phaseMode} />}
        {activeTab === 'ALL' && <ReactionTimer />}
      </div>
    </div>
  );
}
