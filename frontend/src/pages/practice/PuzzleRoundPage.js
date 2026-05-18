import React, { useState } from 'react';
import { ROUND_RESOURCES } from './RESOURCES';
import { RoundHeader, Card, SectionTitle } from './PracticeComponents';

const PUZZLES = [
  {
    id: 'pz1', title: 'The Bridge Crossing',
    puzzle: `4 people need to cross a bridge at night. They have one torch and the bridge can hold only 2 people at a time. They walk at different speeds:\n- Person A: 1 minute\n- Person B: 2 minutes\n- Person C: 5 minutes\n- Person D: 10 minutes\n\nWhen two people walk together, they walk at the slower person's pace. The torch must always be carried when crossing. What is the minimum time for all 4 to cross?`,
    hint: 'The key insight: the two slowest people should cross together. Don\'t always send the fastest back with the torch.',
    answer: '17 minutes',
    explanation: 'Step 1: A+B cross → 2 min. A goes back → 1 min. (Total: 3 min)\nStep 2: C+D cross → 10 min. B goes back → 2 min. (Total: 15 min)\nStep 3: A+B cross → 2 min. (Total: 17 min)\n\nTotal: 2+1+10+2+2 = 17 minutes',
    category: 'Logic',
  },
  {
    id: 'pz2', title: 'The Faulty Scale',
    puzzle: `You have 12 identical-looking balls. One ball is slightly heavier or lighter than the rest. You have a balance scale and can use it exactly 3 times. How do you identify the odd ball AND whether it's heavier or lighter?`,
    hint: 'Think about information theory. Each weighing gives 3 outcomes: left heavy, right heavy, or balanced. With 3 weighings you get 3³=27 outcomes, which is enough to identify 1 odd ball from 12 and its nature.',
    answer: 'Group the 12 balls into groups of 4 and weigh strategically.',
    explanation: 'Weighing 1: Weigh 4 balls vs 4 balls (leaving 4 aside).\n- If balanced: the odd ball is in the remaining 4.\n- If unbalanced: the odd ball is in the 8 you weighed.\n\nWeighing 2 & 3: Use the result to narrow down further. (Full solution involves a complex tree of decisions based on each outcome.)\n\nThis is a classic interview puzzle testing systematic thinking.',
    category: 'Classic',
  },
  {
    id: 'pz3', title: 'The Pirate Distribution',
    puzzle: `5 pirates find 100 gold coins. They vote on how to split them. The most senior pirate proposes a distribution. If 50% or more agree, it's accepted. If not, the proposing pirate is thrown overboard and the next pirate proposes.\n\nAll pirates are rational, greedy, and prefer to stay alive. What distribution does Pirate 1 (most senior) propose?`,
    hint: 'Work backwards from the simplest case (2 pirates) and build up.',
    answer: 'Pirate 1 proposes: [96, 0, 1, 0, 3]',
    explanation: 'Work backwards:\n5 pirates: P1 needs P3 and P5 to agree. They\'ll accept 1 and 3 coins (more than they\'d get with fewer pirates). P2 and P4 get 0.\n\nP1: 96, P2: 0, P3: 1, P4: 0, P5: 3\n\nP3 accepts 1 (vs 0 if P1 is thrown overboard in the 4-pirate scenario).\nP5 accepts 3 (vs 0 or 1 in 4-pirate scenario).\nP1 keeps 96 coins.',
    category: 'Game Theory',
  },
  {
    id: 'pz4', title: 'Bottles of Wine',
    puzzle: `A king has 1000 bottles of wine. One bottle is poisoned. He has 10 prisoners and 30 days. The poison kills in exactly 20-29 days. He wants to find the poisoned bottle using only the prisoners as testers.\n\nHow can he identify the poisoned bottle?`,
    hint: 'Think binary. 2¹⁰ = 1024 > 1000.',
    answer: 'Use binary encoding: assign each bottle a unique 10-bit binary number.',
    explanation: 'Number bottles 1-1000 in binary (10 bits). Each prisoner represents one bit position.\n\nPrisoner 1 drinks from all bottles where bit 1 = 1.\nPrisoner 2 drinks from all bottles where bit 2 = 1.\n… and so on.\n\nAfter 20-29 days, the prisoners who die form a binary number. That binary number = the bottle number of the poisoned wine.\n\n10 bits → 2¹⁰ = 1024 possible combinations → enough to identify any of the 1000 bottles.',
    category: 'Binary / Math',
  },
];

export default function PuzzleRoundPage() {
  const [answers, setAnswers] = useState({});
  const [showHint, setShowHint] = useState({});
  const [showAnswer, setShowAnswer] = useState({});
  const [correct, setCorrect] = useState({});
  const [showRes, setShowRes] = useState(false);

  return (
    <div style={{ fontFamily: "'Nunito',sans-serif" }}>
      <RoundHeader icon="🧩" title="Puzzle Round Practice" subtitle="Logical puzzles with hints, answers, and explanations" />
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
        <button onClick={()=>setShowRes(r=>!r)}
          style={{ padding:'7px 16px', borderRadius:9, border:`1.5px solid ${showRes?'#dc2626':'#d0d7e8'}`, background:showRes?'rgba(220,38,38,0.06)':'#fff', color:showRes?'#dc2626':'#7a8ba8', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.78rem' }}>
          📚 {showRes?'Hide':'Resources'}
        </button>
      </div>
      {showRes && (
        <div style={{ background:'rgba(220,38,38,0.04)', border:'1px solid rgba(220,38,38,0.15)', borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
          <div style={{ fontSize:'.7rem', fontWeight:800, color:'#b0bec9', marginBottom:10 }}>BEST PUZZLE & LOGICAL REASONING RESOURCES</div>
          <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
            {ROUND_RESOURCES.PUZZLE.map((r,i)=>(
              <a key={i} href={r.url} target="_blank" rel="noreferrer"
                style={{ padding:'5px 11px', borderRadius:7, background:r.color+'18', color:r.color, fontSize:'.72rem', fontWeight:800, textDecoration:'none', border:`1px solid ${r.color}30` }}>
                {r.tag} — {r.name} ↗
              </a>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {PUZZLES.map((pz, i) => (
          <Card key={pz.id}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#531697,#13a1a5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.85rem', flexShrink: 0 }}>P{i+1}</div>
              <div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.95rem', color: '#0f1a2e' }}>{pz.title}</div>
                <span style={{ padding: '1px 7px', borderRadius: 999, background: 'rgba(83,22,151,0.07)', color: '#531697', fontSize: '.65rem', fontWeight: 700 }}>{pz.category}</span>
              </div>
            </div>
            <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(83,22,151,0.04)', border: '1px solid rgba(83,22,151,0.1)', fontSize: '.85rem', color: '#3d4e6b', lineHeight: 1.8, whiteSpace: 'pre-wrap', marginBottom: 14 }}>
              {pz.puzzle}
            </div>
            <textarea value={answers[pz.id] || ''} onChange={e => setAnswers(a => ({ ...a, [pz.id]: e.target.value }))}
              placeholder="Write your approach and answer here…" rows={3}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1.5px solid #d0d7e8', fontFamily: "'Nunito',sans-serif", fontSize: '.85rem', resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
              onFocus={e => e.target.style.borderColor = '#531697'} onBlur={e => e.target.style.borderColor = '#d0d7e8'}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => setShowHint(h => ({ ...h, [pz.id]: !h[pz.id] }))}
                style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #d0d7e8', background: showHint[pz.id] ? 'rgba(245,158,11,0.08)' : '#fff', color: showHint[pz.id] ? '#92400e' : '#7a8ba8', fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.78rem' }}>
                💡 {showHint[pz.id] ? 'Hide Hint' : 'Show Hint'}
              </button>
              <button onClick={() => setShowAnswer(h => ({ ...h, [pz.id]: !h[pz.id] }))}
                style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: showAnswer[pz.id] ? '#f0f3fa' : 'linear-gradient(135deg,#531697,#13a1a5)', color: showAnswer[pz.id] ? '#531697' : '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.78rem' }}>
                {showAnswer[pz.id] ? '🙈 Hide Answer' : '✅ Reveal Answer'}
              </button>
            </div>
            {showHint[pz.id] && (
              <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 9, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', fontSize: '.82rem', color: '#92400e' }}>
                💡 Hint: {pz.hint}
              </div>
            )}
            {showAnswer[pz.id] && (
              <div style={{ marginTop: 10 }}>
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(71,211,114,0.08)', border: '1px solid rgba(71,211,114,0.2)', fontSize: '.82rem', color: '#166534', fontWeight: 800, marginBottom: 8 }}>
                  ✅ Answer: {pz.answer}
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(83,22,151,0.04)', border: '1px solid rgba(83,22,151,0.1)', fontSize: '.82rem', color: '#3d4e6b', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                  📖 Explanation:\n{pz.explanation}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
