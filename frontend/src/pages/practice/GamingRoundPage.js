import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RoundHeader, Card, SectionTitle } from './PracticeComponents';
import { ROUND_RESOURCES } from './RESOURCES';

const GRAD = 'linear-gradient(135deg,#531697,#13a1a5)';

// ─────────────────────────────────────────────────────────────────────────────
// GAME 1: Deductive Logical Thinking (Geo-Sudoku)
// ─────────────────────────────────────────────────────────────────────────────
const GEO_SYMBOLS = ['🟥', '🔵', '⭐', '🔺'];

const PUZZLES_4X4 = [
  {
    initial: [
      ['🟥', null, null, '🔺'],
      [null, '🔺', '🟥', null],
      [null, '🔵', '⭐', null],
      ['⭐', null, null, '🔵']
    ],
    solution: [
      ['🟥', '⭐', '🔵', '🔺'],
      ['🔵', '🔺', '🟥', '⭐'],
      ['🔺', '🔵', '⭐', '🟥'],
      ['⭐', '🟥', '🔺', '🔵']
    ]
  },
  {
    initial: [
      [null, '🔵', '🔺', null],
      ['🔺', null, null, '⭐'],
      ['⭐', null, null, '🔵'],
      [null, '🔺', '🔵', null]
    ],
    solution: [
      ['🟥', '🔵', '🔺', '⭐'],
      ['🔺', '🟥', '⭐', '🔵'],
      ['⭐', '🔺', '🟥', '🔵'],
      ['🔵', '⭐', '🔵', '🔺']
    ]
  }
];

function GeoSudokuGame() {
  const [levelIdx, setLevelIdx] = useState(0);
  const [grid, setGrid] = useState(PUZZLES_4X4[0].initial);
  const [selectedCell, setSelectedCell] = useState(null); // [r, c]
  const [status, setStatus] = useState(null); // 'success' | 'error' | null
  const [errorMsg, setErrorMsg] = useState('');

  const loadLevel = (idx) => {
    setLevelIdx(idx);
    setGrid(PUZZLES_4X4[idx].initial.map(row => [...row]));
    setSelectedCell(null);
    setStatus(null);
    setErrorMsg('');
  };

  const handleCellClick = (r, c) => {
    if (PUZZLES_4X4[levelIdx].initial[r][c] !== null) return; // immutable
    setSelectedCell([r, c]);
  };

  const placeSymbol = (sym) => {
    if (!selectedCell) return;
    const [r, c] = selectedCell;
    const nextGrid = grid.map((row, ri) =>
      row.map((val, ci) => (ri === r && ci === c ? sym : val))
    );
    setGrid(nextGrid);
    setStatus(null);
  };

  const clearCell = () => {
    if (!selectedCell) return;
    const [r, c] = selectedCell;
    const nextGrid = grid.map((row, ri) =>
      row.map((val, ci) => (ri === r && ci === c ? null : val))
    );
    setGrid(nextGrid);
    setStatus(null);
  };

  const checkSolution = () => {
    // Check if fully filled
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!grid[r][c]) {
          setStatus('error');
          setErrorMsg('Grid is not completely filled yet!');
          return;
        }
      }
    }
    // Check rows & cols uniqueness
    for (let i = 0; i < 4; i++) {
      const rowSet = new Set(grid[i]);
      const colSet = new Set(grid.map(row => row[i]));
      if (rowSet.size < 4 || colSet.size < 4) {
        setStatus('error');
        setErrorMsg('Duplicate symbols found in row or column! Rules violated.');
        return;
      }
    }
    setStatus('success');
  };

  return (
    <Card style={{ background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <SectionTitle>🧩 Deductive Logic: Geo-Sudoku</SectionTitle>
        <span style={{ fontSize: '.78rem', color: '#531697', fontWeight: 800 }}>
          Level {levelIdx + 1}/{PUZZLES_4X4.length}
        </span>
      </div>
      <p style={{ fontSize: '.82rem', color: 'var(--text-3)', marginBottom: 14 }}>
        Fill the grid so every row and column contains each geometric symbol (🟥, 🔵, ⭐, 🔺) exactly once without repeating.
      </p>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 56px)', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const isInitial = PUZZLES_4X4[levelIdx].initial[r][c] !== null;
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
                  justifyContent: 'center',
                  fontSize: '1.6rem',
                  cursor: isInitial ? 'not-allowed' : 'pointer',
                  background: isSelected
                    ? 'rgba(83,22,151,0.15)'
                    : isInitial
                    ? '#f0f3fa'
                    : '#fff',
                  border: isSelected
                    ? '2.5px solid #531697'
                    : '1.5px solid #d0d7e8',
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
        <span style={{ fontSize: '.8rem', color: 'var(--text-3)', fontWeight: 700 }}>Select Symbol:</span>
        {GEO_SYMBOLS.map(sym => (
          <button
            key={sym}
            onClick={() => placeSymbol(sym)}
            style={{
              width: 42,
              height: 42,
              borderRadius: 8,
              border: '1.5px solid #d0d7e8',
              background: '#fff',
              fontSize: '1.3rem',
              cursor: 'pointer'
            }}
          >
            {sym}
          </button>
        ))}
        <button
          onClick={clearCell}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #ef4444',
            background: 'rgba(239,68,68,0.08)',
            color: '#ef4444',
            fontWeight: 800,
            fontSize: '.75rem',
            cursor: 'pointer'
          }}
        >
          Clear
        </button>
      </div>

      {/* Actions & Status */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button
          onClick={checkSolution}
          style={{
            padding: '9px 20px',
            borderRadius: 9,
            border: 'none',
            background: GRAD,
            color: '#fff',
            fontWeight: 800,
            cursor: 'pointer',
            fontSize: '.82rem'
          }}
        >
          Check Solution
        </button>
        <button
          onClick={() => loadLevel((levelIdx + 1) % PUZZLES_4X4.length)}
          style={{
            padding: '9px 18px',
            borderRadius: 9,
            border: '1.5px solid #d0d7e8',
            background: 'transparent',
            color: 'var(--text)',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '.82rem'
          }}
        >
          Next Level →
        </button>
      </div>

      {status === 'success' && (
        <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: 'rgba(71,211,114,0.12)', border: '1px solid rgba(71,211,114,0.3)', color: '#166534', fontSize: '.85rem', fontWeight: 800, textAlign: 'center' }}>
          🎉 Perfect! Geo-Sudoku rules satisfied!
        </div>
      )}
      {status === 'error' && (
        <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#991b1b', fontSize: '.85rem', fontWeight: 700, textAlign: 'center' }}>
          ❌ {errorMsg}
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME 2: Switch Challenge (Logic Sequence Decoder)
// ─────────────────────────────────────────────────────────────────────────────
const SWITCH_QUESTIONS = [
  {
    input: ['🔴', '🟦', '🔺', '⭐'],
    opCode: 'CODE: 3 - 1 - 4 - 2',
    options: [
      ['🔺', '🔴', '⭐', '🟦'],
      ['🟦', '🔺', '⭐', '🔴'],
      ['🔴', '⭐', '🔺', '🟦'],
      ['⭐', '🔺', '🔴', '🟦']
    ],
    correctIdx: 0,
    explanation: 'The code 3-1-4-2 puts 3rd element 1st (🔺), 1st element 2nd (🔴), 4th element 3rd (⭐), and 2nd element 4th (🟦).'
  },
  {
    input: ['⭐', '🟢', '🟥', '🔷'],
    opCode: 'CODE: 2 - 4 - 1 - 3',
    options: [
      ['🟥', '⭐', '🔷', '🟢'],
      ['🟢', '🔷', '⭐', '🟥'],
      ['🔷', '🟢', '🟥', '⭐'],
      ['⭐', '🟥', '🟢', '🔷']
    ],
    correctIdx: 1,
    explanation: 'Code 2-4-1-3 puts 2nd (🟢) -> 1st, 4th (🔷) -> 2nd, 1st (⭐) -> 3rd, and 3rd (🟥) -> 4th.'
  }
];

function SwitchChallengeGame() {
  const [qIdx, setQIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [score, setScore] = useState(0);
  const q = SWITCH_QUESTIONS[qIdx];

  const handleSelect = (idx) => {
    if (selectedOpt !== null) return;
    setSelectedOpt(idx);
    if (idx === q.correctIdx) setScore(s => s + 1);
  };

  const nextQ = () => {
    setSelectedOpt(null);
    setQIdx((qIdx + 1) % SWITCH_QUESTIONS.length);
  };

  return (
    <Card style={{ background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <SectionTitle>🔀 Switch Challenge (Rule Decoder)</SectionTitle>
        <span style={{ fontSize: '.78rem', color: '#531697', fontWeight: 800 }}>
          Score: {score}/{SWITCH_QUESTIONS.length}
        </span>
      </div>
      <p style={{ fontSize: '.82rem', color: 'var(--text-3)', marginBottom: 14 }}>
        Cognizant switch assessment: Apply the hidden numerical transformation rule code to decode the final shape output sequence.
      </p>

      {/* Input Sequence */}
      <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 14, textAlign: 'center' }}>
        <div style={{ fontSize: '.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>INPUT SEQUENCE</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {q.input.map((shape, i) => (
            <div key={i} style={{ width: 44, height: 44, borderRadius: 8, background: '#fff', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
              {shape}
            </div>
          ))}
        </div>
      </div>

      {/* Operator Key */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 20, background: 'rgba(83,22,151,0.1)', color: '#531697', fontWeight: 800, fontSize: '.85rem' }}>
          ⚡ {q.opCode}
        </div>
      </div>

      {/* Answer Options */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {q.options.map((opt, i) => {
          const isChosen = selectedOpt === i;
          const isCorrect = i === q.correctIdx;
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

      {selectedOpt !== null && (
        <div style={{ marginBottom: 14, padding: 10, borderRadius: 8, background: '#f1f5f9', fontSize: '.8rem', color: 'var(--text)' }}>
          <strong>Explanation:</strong> {q.explanation}
        </div>
      )}

      {selectedOpt !== null && (
        <div style={{ textAlign: 'center' }}>
          <button onClick={nextQ} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: GRAD, color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '.8rem' }}>
            Next Switch Puzzle →
          </button>
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME 3: Motion Challenge (Maze Pathfinder)
// ─────────────────────────────────────────────────────────────────────────────
function MotionChallengeGame() {
  const [pos, setPos] = useState({ r: 0, c: 0 });
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const target = { r: 3, c: 3 };
  const walls = ['1-1', '1-2', '2-1', '0-3'];

  const move = (dr, dc) => {
    if (won) return;
    const nr = pos.r + dr;
    const nc = pos.c + dc;
    if (nr < 0 || nr > 3 || nc < 0 || nc > 3) return;
    if (walls.includes(`${nr}-${nc}`)) return;

    setPos({ r: nr, c: nc });
    setMoves(m => m + 1);
    if (nr === target.r && nc === target.c) {
      setWon(true);
    }
  };

  const reset = () => {
    setPos({ r: 0, c: 0 });
    setMoves(0);
    setWon(false);
  };

  return (
    <Card style={{ background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <SectionTitle>🎯 Motion Challenge (Pathfinder)</SectionTitle>
        <span style={{ fontSize: '.78rem', color: '#531697', fontWeight: 800 }}>
          Moves: {moves} (Optimal: 6)
        </span>
      </div>
      <p style={{ fontSize: '.82rem', color: 'var(--text-3)', marginBottom: 14 }}>
        Navigate the dot (🟢) through obstacle walls (🧱) to reach the target destination (⭐) in minimum steps.
      </p>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 52px)', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
        {[0, 1, 2, 3].map(r =>
          [0, 1, 2, 3].map(c => {
            const isPlayer = pos.r === r && pos.c === c;
            const isTarget = target.r === r && target.c === c;
            const isWall = walls.includes(`${r}-${c}`);
            return (
              <div
                key={`${r}-${c}`}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 10,
                  background: isWall ? '#334155' : isPlayer ? 'rgba(83,22,151,0.1)' : '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center',
                  fontSize: '1.5rem'
                }}
              >
                {isPlayer ? '🟢' : isTarget ? '⭐' : isWall ? '🧱' : ''}
              </div>
            );
          })
        )}
      </div>

      {/* Controller Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <button onClick={() => move(-1, 0)} style={{ width: 44, height: 38, borderRadius: 8, border: '1px solid #d0d7e8', background: '#fff', cursor: 'pointer', fontWeight: 800 }}>⬆️</button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => move(0, -1)} style={{ width: 44, height: 38, borderRadius: 8, border: '1px solid #d0d7e8', background: '#fff', cursor: 'pointer', fontWeight: 800 }}>⬅️</button>
          <button onClick={() => move(1, 0)} style={{ width: 44, height: 38, borderRadius: 8, border: '1px solid #d0d7e8', background: '#fff', cursor: 'pointer', fontWeight: 800 }}>⬇️</button>
          <button onClick={() => move(0, 1)} style={{ width: 44, height: 38, borderRadius: 8, border: '1px solid #d0d7e8', background: '#fff', cursor: 'pointer', fontWeight: 800 }}>➡️</button>
        </div>
      </div>

      {won ? (
        <div style={{ textAlign: 'center', padding: 10, background: 'rgba(71,211,114,0.12)', borderRadius: 8, color: '#166534', fontWeight: 800, fontSize: '.85rem' }}>
          🎉 Goal Reached in {moves} moves!
          <button onClick={reset} style={{ marginLeft: 12, padding: '4px 12px', borderRadius: 6, border: 'none', background: GRAD, color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Replay</button>
        </div>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <button onClick={reset} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #d0d7e8', background: 'transparent', color: 'var(--text-3)', fontSize: '.75rem', cursor: 'pointer', fontWeight: 700 }}>Reset Position</button>
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME 4: Grid Challenge (Memory & Spatial Awareness)
// ─────────────────────────────────────────────────────────────────────────────
function GridChallengeGame() {
  const [phase, setPhase] = useState('idle'); // idle | flash | symmetry | recall | result
  const [sequence] = useState([2, 7, 11, 5]); // indices 0..15
  const [highlightIdx, setHighlightIdx] = useState(null);
  const [, setSymmetryAns] = useState(null);
  const [userClicks, setUserClicks] = useState([]);
  const [score, setScore] = useState(0);

  const startTest = () => {
    setPhase('flash');
    setUserClicks([]);
    setSymmetryAns(null);
    let step = 0;
    const interval = setInterval(() => {
      if (step < sequence.length) {
        setHighlightIdx(sequence[step]);
        step++;
      } else {
        clearInterval(interval);
        setHighlightIdx(null);
        setPhase('symmetry');
      }
    }, 900);
  };

  const handleSymmetry = (ans) => {
    setSymmetryAns(ans);
    setPhase('recall');
  };

  const handleGridClick = (idx) => {
    if (phase !== 'recall') return;
    const nextClicks = [...userClicks, idx];
    setUserClicks(nextClicks);
    if (nextClicks.length === sequence.length) {
      // Evaluate
      let correct = 0;
      nextClicks.forEach((val, i) => {
        if (val === sequence[i]) correct++;
      });
      setScore(correct);
      setPhase('result');
    }
  };

  return (
    <Card style={{ background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <SectionTitle>🧠 Grid Challenge (Memory & Spatial)</SectionTitle>
        <span style={{ fontSize: '.78rem', color: '#531697', fontWeight: 800 }}>Phase: {phase.toUpperCase()}</span>
      </div>
      <p style={{ fontSize: '.82rem', color: 'var(--text-3)', marginBottom: 14 }}>
        Memory & spatial orientation assessment: Memorize flashing dot positions, complete the spatial symmetry test, then recall exact dot positions.
      </p>

      {phase === 'idle' && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <button onClick={startTest} style={{ padding: '10px 24px', borderRadius: 9, border: 'none', background: GRAD, color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '.85rem' }}>
            Start Grid Assessment
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
          <div style={{ fontSize: '.8rem', fontWeight: 800, color: 'var(--text-3)', marginBottom: 8 }}>SPATIAL INTERRUPT TASK</div>
          <div style={{ fontSize: '2.2rem', marginBottom: 8 }}>⚖️ 🔺|🔺</div>
          <div style={{ fontSize: '.85rem', fontWeight: 700, marginBottom: 12 }}>Is this figure vertically symmetrical?</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => handleSymmetry('YES')} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#47d372', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Yes</button>
            <button onClick={() => handleSymmetry('NO')} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>No</button>
          </div>
        </div>
      )}

      {phase === 'result' && (
        <div style={{ textAlign: 'center', padding: 12, background: 'rgba(83,22,151,0.08)', borderRadius: 10 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1rem', color: '#531697', marginBottom: 4 }}>Recall Score: {score}/4 Correct Sequence Matches</div>
          <button onClick={startTest} style={{ marginTop: 8, padding: '7px 18px', borderRadius: 8, border: 'none', background: GRAD, color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '.78rem' }}>Try Again</button>
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME 5: Digit Challenge (Fast-Paced Numerical Agility)
// ─────────────────────────────────────────────────────────────────────────────
function DigitChallengeGame() {
  const [target] = useState(24);
  const [nums] = useState([3, 8, 2, 4]);
  const [equation, setEquation] = useState([]);
  const [result, setResult] = useState(null);

  const addToken = (token) => {
    setEquation(prev => [...prev, token]);
  };

  const clearEq = () => {
    setEquation([]);
    setResult(null);
  };

  const evaluateEq = () => {
    try {
      const expr = equation.join('');
      // eslint-disable-next-line no-eval
      const val = eval(expr);
      if (val === target) {
        setResult('success');
      } else {
        setResult(`Evaluated to ${val}, target is ${target}`);
      }
    } catch (e) {
      setResult('Invalid equation format');
    }
  };

  return (
    <Card style={{ background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <SectionTitle>🔢 Digit Challenge (Numerical Speed)</SectionTitle>
        <span style={{ fontSize: '.85rem', color: '#531697', fontWeight: 800 }}>TARGET: {target}</span>
      </div>
      <p style={{ fontSize: '.82rem', color: 'var(--text-3)', marginBottom: 14 }}>
        Construct a valid mathematical expression using the given digit tokens to equal the target value.
      </p>

      {/* Number Tokens */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
        {nums.map((n, i) => (
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

      {/* Equation display */}
      <div style={{ minHeight: 44, background: '#f8fafc', borderRadius: 8, border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', marginBottom: 14 }}>
        {equation.join(' ') || 'Build equation...'}
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button onClick={evaluateEq} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: GRAD, color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '.8rem' }}>Check Equals Target</button>
        <button onClick={clearEq} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontWeight: 800, cursor: 'pointer', fontSize: '.8rem' }}>Clear</button>
      </div>

      {result === 'success' && (
        <div style={{ marginTop: 12, padding: 8, borderRadius: 8, background: 'rgba(71,211,114,0.12)', color: '#166534', fontWeight: 800, textAlign: 'center', fontSize: '.82rem' }}>
          🎉 Perfect! Equation equals target 24!
        </div>
      )}
      {result && result !== 'success' && (
        <div style={{ marginTop: 12, padding: 8, borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#991b1b', fontWeight: 700, textAlign: 'center', fontSize: '.82rem' }}>
          ❌ {result}
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME 6: Reaction Timer (Original Utility)
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
// MAIN PAGE EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export default function GamingRoundPage() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [showRes, setShowRes] = useState(false);

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
        title="Cognizant & Corporate Gaming Assessment Rounds"
        subtitle="Practice real Cognizant GenC / GenC Next interactive gaming tests: Motion Pathfinder, Switch Rule Decoders, Geo-Sudoku, Grid Memory, and Numerical Agility."
      />

      {/* Resource toggle */}
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
          <div style={{ fontSize: '.7rem', fontWeight: 800, color: '#b0bec9', marginBottom: 10 }}>COGNIZANT & CORPORATE COGNITIVE GAMING RESOURCES</div>
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
        {(activeTab === 'ALL' || activeTab === 'DEDUCTIVE') && <GeoSudokuGame />}
        {(activeTab === 'ALL' || activeTab === 'SWITCH') && <SwitchChallengeGame />}
        {(activeTab === 'ALL' || activeTab === 'MOTION') && <MotionChallengeGame />}
        {(activeTab === 'ALL' || activeTab === 'GRID') && <GridChallengeGame />}
        {(activeTab === 'ALL' || activeTab === 'DIGIT') && <DigitChallengeGame />}
        {activeTab === 'ALL' && <ReactionTimer />}
      </div>
    </div>
  );
}
