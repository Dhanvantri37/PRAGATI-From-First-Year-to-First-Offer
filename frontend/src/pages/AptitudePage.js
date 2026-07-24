/* eslint-disable */
import React, { useEffect, useState, useCallback } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tk  = () => ({ Authorization:`Bearer ${localStorage.getItem('pragati_token')}` });
const tks = () => ({ ...tk(), 'Content-Type':'application/json' });

const ICONS = {
  'Quantitative':'🔢','Logical':'🧩','Verbal':'📖','Technical':'💻','DSA':'🌳',
  'Data Interpretation':'📊','Quantitative Aptitude':'🔢','Logical Reasoning':'🧩',
  'Verbal Ability':'📖','DSA Aptitude':'🌳'
};
const DC   = { Easy:'#47d372', Medium:'#f59e0b', Hard:'#ef4444' };
const GRAD = 'linear-gradient(135deg,#531697,#13a1a5)';

const COMPANY_BADGES = {
  TCS:            { color:'#38bdf8', icon:'🏢' },
  Wipro:          { color:'#818cf8', icon:'◆'  },
  Infosys:        { color:'#60a5fa', icon:'■'  },
  Capgemini:      { color:'#38bdf8', icon:'◆'  },
  Accenture:      { color:'#c084fc', icon:'♥'  },
  HCL:            { color:'#f87171', icon:'●'  },
  Cognizant:      { color:'#38bdf8', icon:'🌐' },
  Zoho:           { color:'#4ade80', icon:'🟢' },
  Amazon:         { color:'#fbbf24', icon:'📦' },
  Deloitte:       { color:'#34d399', icon:'🟢' },
  'Tech Mahindra':{ color:'#a78bfa', icon:'⭐' },
  LTIMindtree:    { color:'#38bdf8', icon:'💎' },
  DXC:            { color:'#f43f5e', icon:'⚡' },
  Virtusa:        { color:'#8b5cf6', icon:'🎯' },
};

// ── Subtopic theory + practice resource metadata (100% Verified Live URLs) ───────
const SUBTOPIC_META = {
  'Number System':              { theory:'Divisibility rules, LCM/HCF, prime factorization, unit digits, surds & indices.', gfg:'https://www.geeksforgeeks.org/number-system/', indiabix:'https://www.indiabix.com/aptitude/numbers/' },
  'Percentages':                { theory:'(Part/Whole)×100. Key to profit/loss, discount, interest.', gfg:'https://www.geeksforgeeks.org/percentages/', indiabix:'https://www.indiabix.com/aptitude/percentage/' },
  'Profit & Loss':              { theory:'Profit = SP−CP. Profit% = (Profit/CP)×100. Marked Price & successive discounts.', gfg:'https://www.geeksforgeeks.org/profit-and-loss/', indiabix:'https://www.indiabix.com/aptitude/profit-and-loss/' },
  'Simple & Compound Interest': { theory:'SI = PRT/100. CI = P(1+r/100)^n − P. Diff for 2 yrs = P(r/100)².', gfg:'https://www.geeksforgeeks.org/aptitude-questions-and-answers/', indiabix:'https://www.indiabix.com/aptitude/simple-interest/' },
  'Ratio & Proportion':         { theory:'a:b = c:d ⟹ ad=bc. Investment ratio × time ratio = Profit ratio.', gfg:'https://www.geeksforgeeks.org/aptitude-questions-and-answers/', indiabix:'https://www.indiabix.com/aptitude/ratio-and-proportion/' },
  'Averages':                   { theory:'Average = Sum/Count. Weighted average uses proportional weights.', gfg:'https://www.geeksforgeeks.org/aptitude-questions-and-answers/', indiabix:'https://www.indiabix.com/aptitude/average/' },
  'Time & Work':                { theory:"A's 1-day work = 1/n. LCM method simplifies multi-person problems.", gfg:'https://www.geeksforgeeks.org/time-and-work/', indiabix:'https://www.indiabix.com/aptitude/time-and-work/' },
  'Speed, Time & Distance':     { theory:'Speed = Distance/Time. Avg speed = 2S₁S₂/(S₁+S₂) for equal distances.', gfg:'https://www.geeksforgeeks.org/speed-time-distance/', indiabix:'https://www.indiabix.com/aptitude/time-and-distance/' },
  'Permutation & Combination':  { theory:'nPr = n!/(n-r)!  nCr = n!/r!(n-r)!  Apply for selections/arrangements.', gfg:'https://www.geeksforgeeks.org/permutation-and-combination/', indiabix:'https://www.indiabix.com/aptitude/permutation-and-combination/' },
  'Probability':                { theory:'P(E) = Favorable/Total. Mutually exclusive: P(A or B)=P(A)+P(B).', gfg:'https://www.geeksforgeeks.org/probability-in-maths/', indiabix:'https://www.indiabix.com/aptitude/probability/' },
  'Data Interpretation':        { theory:'Read tables/bar charts carefully. Approx % change = Δ/original × 100.', gfg:'https://www.geeksforgeeks.org/data-interpretation/', indiabix:'https://www.indiabix.com/data-interpretation/table-charts/' },
  'Seating Arrangement':        { theory:'Linear vs Circular. Clockwise = left. Fix one person in circular to avoid duplicates.', gfg:'https://www.geeksforgeeks.org/seating-arrangement-aptitude/', indiabix:'https://www.indiabix.com/logical-reasoning/seating-arrangement/' },
  'Blood Relations':            { theory:'Draw family trees. Mother/Father = 1 gen up; uncle/aunt = parent siblings.', gfg:'https://www.geeksforgeeks.org/logical-reasoning/', indiabix:'https://www.indiabix.com/logical-reasoning/blood-relation-test/' },
  'Direction Sense':            { theory:'North default. After L = 90° counter-clockwise. Pythagoras for distance.', gfg:'https://www.geeksforgeeks.org/direction-sense-test/', indiabix:'https://www.indiabix.com/logical-reasoning/direction-sense-test/' },
  'Number Series':              { theory:'Check: diff of diffs, multiples, alternating, squares, cubes patterns.', gfg:'https://www.geeksforgeeks.org/logical-reasoning/', indiabix:'https://www.indiabix.com/aptitude/number-series/' },
  'Coding-Decoding':            { theory:'Shift each letter by fixed amount; or mirror-coding (A=Z). Also positional.', gfg:'https://www.geeksforgeeks.org/coding-decoding/', indiabix:'https://www.indiabix.com/logical-reasoning/coding-decoding/' },
  'Syllogism':                  { theory:'All A are B, Some B are C → Some A may be C. Use Venn diagrams.', gfg:'https://www.geeksforgeeks.org/logical-reasoning/', indiabix:'https://www.indiabix.com/logical-reasoning/syllogism/' },
  'Statements & Conclusions':   { theory:'Conclusion must be 100% true based ONLY on given statements. No external knowledge.', gfg:'https://www.geeksforgeeks.org/logical-reasoning/', indiabix:'https://www.indiabix.com/logical-reasoning/statement-and-conclusion/' },
  'Synonyms & Antonyms':        { theory:'Root words: bene (good), mal (bad), chron (time), phil (love). Context clues matter.', gfg:'https://www.geeksforgeeks.org/verbal-ability/', indiabix:'https://www.indiabix.com/verbal-ability/synonyms/' },
  'Grammar':                    { theory:'Subject-Verb agreement, Tenses, Articles (a/an/the), Prepositions, Active/Passive.', gfg:'https://www.geeksforgeeks.org/english-grammar/', indiabix:'https://www.indiabix.com/verbal-ability/spotting-errors/' },
  'One Word Substitution':      { theory:'Memorize common groups: one who collects stamps = Philatelist; fear of height = Acrophobia.', gfg:'https://www.geeksforgeeks.org/verbal-ability/', indiabix:'https://www.indiabix.com/verbal-ability/one-word-substitutes/' },
  'Idioms & Phrases':           { theory:'"Break the ice" = start conversation. "Bite the bullet" = endure pain. Learn 50 key idioms.', gfg:'https://www.geeksforgeeks.org/idioms-and-phrases/', indiabix:'https://www.indiabix.com/verbal-ability/idioms-and-phrases/' },
  'Para Jumbles':               { theory:'Find the topic sentence (no pronoun/connector start). Then logic flow. PQRS order.', gfg:'https://www.geeksforgeeks.org/verbal-ability/', indiabix:'https://www.indiabix.com/verbal-ability/ordering-of-sentences/' },
  'Arrays':                     { theory:'Contiguous memory block. Fast O(1) index access, linear O(n) search/insertion.', gfg:'https://www.geeksforgeeks.org/array-data-structure/', indiabix:'https://www.indiabix.com/computer-science/data-structures/' },
  'Linked Lists':               { theory:'Dynamic nodes with data & pointers. Sequential access O(n), fast insert at head O(1).', gfg:'https://www.geeksforgeeks.org/linked-list-data-structure/', indiabix:'https://www.indiabix.com/computer-science/data-structures/' },
  'Stacks & Queues':            { theory:'Stack = LIFO (Push/Pop O(1)). Queue = FIFO (Enqueue/Dequeue O(1)).', gfg:'https://www.geeksforgeeks.org/stack-data-structure/', indiabix:'https://www.indiabix.com/computer-science/data-structures/' },
  'Trees':                      { theory:'Hierarchical structure. Binary Tree has at most 2 children. BST in-order traversal yields sorted order.', gfg:'https://www.geeksforgeeks.org/binary-tree-data-structure/', indiabix:'https://www.indiabix.com/computer-science/data-structures/' },
  'Graphs':                     { theory:'Vertices & Edges. BFS (shortest path, queue) vs DFS (backtracking, stack/recursion).', gfg:'https://www.geeksforgeeks.org/graph-data-structure-and-algorithms/', indiabix:'https://www.indiabix.com/computer-science/data-structures/' },
  'Dynamic Programming':        { theory:'Optimal substructure & overlapping subproblems. Memoization (Top-down) vs Tabulation (Bottom-up).', gfg:'https://www.geeksforgeeks.org/dynamic-programming/', indiabix:'https://www.indiabix.com/computer-science/data-structures/' },
  'Sorting':                    { theory:'Heap/Merge Sort O(n log n) worst case. Quick Sort O(n log n) avg / O(n²) worst. Bubble/Insertion O(n²).', gfg:'https://www.geeksforgeeks.org/sorting-algorithms/', indiabix:'https://www.indiabix.com/computer-science/data-structures/' },
  'Searching':                  { theory:'Linear Search O(n) un-sorted. Binary Search O(log n) sorted array. Interpolation Search O(log log n).', gfg:'https://www.geeksforgeeks.org/searching-algorithms/', indiabix:'https://www.indiabix.com/computer-science/data-structures/' },
  'Recursion':                  { theory:'Function calling itself. Requires base case to prevent stack overflow. Tail recursion optimizes call stack.', gfg:'https://www.geeksforgeeks.org/introduction-to-recursion-data-structure-and-algorithm-tutorials/', indiabix:'https://www.indiabix.com/computer-science/data-structures/' },
  'Hashing':                    { theory:'Key to index mapping O(1) avg. Chaining & Open Addressing (Linear Probing) resolve collisions.', gfg:'https://www.geeksforgeeks.org/hashing-data-structure/', indiabix:'https://www.indiabix.com/computer-science/data-structures/' },
};

const TOPIC_SUBTOPICS = {
  'Quantitative': [
    'Number System','Percentages','Profit & Loss','Simple & Compound Interest',
    'Ratio & Proportion','Averages','Time & Work','Speed, Time & Distance',
    'Permutation & Combination','Probability','Data Interpretation',
  ],
  'Logical': [
    'Seating Arrangement','Blood Relations','Direction Sense','Number Series',
    'Coding-Decoding','Syllogism','Statements & Conclusions','Odd One Out',
  ],
  'Verbal': [
    'Synonyms & Antonyms','Grammar','One Word Substitution','Idioms & Phrases','Para Jumbles',
  ],
  'DSA': [
    'Arrays','Linked Lists','Stacks & Queues','Trees','Graphs',
    'Dynamic Programming','Sorting','Searching','Recursion','Hashing'
  ],
};

const TOPIC_LABELS = {
  'Quantitative': 'Quantitative Aptitude',
  'Logical':      'Logical Reasoning',
  'Verbal':       'Verbal Ability',
  'DSA':          'DSA Aptitude',
};

// Map frontend short codes to full DB topic names
const TOPIC_DB = {
  'Quantitative': 'Quantitative',
  'Logical':      'Logical Reasoning',
  'Verbal':       'Verbal Ability',
  'DSA':          'DSA Aptitude',
};

// ── Flashcard Component ──────────────────────────────────────────────────────
function FlashcardStack({ subtopic, onStart }) {
  const meta = SUBTOPIC_META[subtopic] ||
    Object.entries(SUBTOPIC_META).find(([k]) => k.toLowerCase() === (subtopic||'').toLowerCase())?.[1];
  const [idx, setIdx] = useState(0);
  const [animDir, setAnimDir] = useState('');

  if (!meta) return null;

  const cards = [
    {
      type:'Definition', icon:'📘', color:'var(--text)',
      bgColor:'rgba(83,22,151,0.05)', brdColor:'rgba(83,22,151,0.15)',
      content: meta.theory,
    },
    {
      type:'Pro Tip', icon:'💡', color:'#f59e0b',
      bgColor:'rgba(245,158,11,0.05)', brdColor:'rgba(245,158,11,0.2)',
      content: meta.theory.includes('Key:')
        ? meta.theory.split('Key:')[1]?.trim()
        : 'Practice this topic regularly. Aptitude questions follow repeating patterns — master the formula shortcut for speed.',
    },
    {
      type:'Practice Links', icon:'🔗', color:'var(--text-3)',
      bgColor:'rgba(19,161,165,0.05)', brdColor:'rgba(19,161,165,0.15)',
      content: null,
    },
  ];

  function go(dir) {
    setAnimDir(dir === 1 ? 'left' : 'right');
    setTimeout(() => { setIdx(i => Math.max(0, Math.min(cards.length-1, i+dir))); setAnimDir(''); }, 150);
  }

  const card = cards[idx];
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.85rem', color:'var(--text)' }}>
          📖 Theory: {subtopic}
        </div>
        <span style={{ marginLeft:'auto', fontSize:'.72rem', color:'#b0bec9', fontWeight:600 }}>
          Card {idx+1} of {cards.length}
        </span>
      </div>

      <div style={{
        padding:'20px 22px', background:card.bgColor, border:`1.5px solid ${card.brdColor}`, borderRadius:14, minHeight:120,
        opacity: animDir ? 0 : 1,
        transform: animDir==='left' ? 'translateX(-18px)' : animDir==='right' ? 'translateX(18px)' : 'none',
        transition:'all .15s ease', marginBottom:12
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
          <span style={{ fontSize:'1.1rem' }}>{card.icon}</span>
          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.8rem', color:card.color, letterSpacing:'.04em' }}>
            {card.type.toUpperCase()}
          </span>
        </div>
        {card.content !== null ? (
          <div style={{ fontSize:'.85rem', color:'var(--text-2)', lineHeight:1.75 }}>{card.content}</div>
        ) : (
          <div>
            <div style={{ fontSize:'.83rem', color:'var(--text-2)', marginBottom:12 }}>
              Practice this exact topic on trusted platforms:
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {meta.gfg && <a href={meta.gfg} target="_blank" rel="noreferrer"
                style={{ padding:'8px 16px', borderRadius:9, background:'rgba(46,168,84,0.1)', border:'1.5px solid rgba(46,168,84,0.25)', color:'#2ea854', fontSize:'.82rem', fontWeight:800, textDecoration:'none', display:'flex', alignItems:'center', gap:6 }}>
                🟢 GeeksforGeeks →
              </a>}
              {meta.indiabix && <a href={meta.indiabix} target="_blank" rel="noreferrer"
                style={{ padding:'8px 16px', borderRadius:9, background:'rgba(19,161,165,0.1)', border:'1.5px solid rgba(19,161,165,0.25)', color:'#13a1a5', fontSize:'.82rem', fontWeight:800, textDecoration:'none', display:'flex', alignItems:'center', gap:6 }}>
                📘 IndiaBix →
              </a>}
            </div>
          </div>
        )}
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
        <button onClick={() => go(-1)} disabled={idx===0}
          style={{ padding:'7px 14px', borderRadius:8, border:'1.5px solid #d0d7e8', background:idx===0?'transparent':'#fafbff', color:idx===0?'#d0d7e8':'#531697', fontWeight:700, cursor:idx===0?'not-allowed':'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.8rem' }}>
          ← Prev
        </button>
        <div style={{ flex:1, display:'flex', justifyContent:'center', gap:5 }}>
          {cards.map((_,i) => <div key={i} style={{ width:i===idx?18:7, height:7, borderRadius:999, background:i===idx?'#531697':'#d0d7e8', transition:'width .2s' }} />)}
        </div>
        <button onClick={() => go(1)} disabled={idx===cards.length-1}
          style={{ padding:'7px 14px', borderRadius:8, border:'1.5px solid #d0d7e8', background:idx===cards.length-1?'transparent':'#fafbff', color:idx===cards.length-1?'#d0d7e8':'#531697', fontWeight:700, cursor:idx===cards.length-1?'not-allowed':'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.8rem' }}>
          Next →
        </button>
      </div>

      <button onClick={onStart}
        style={{ width:'100%', padding:'13px', borderRadius:11, border:'none', background:GRAD, color:'#fff', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.95rem', boxShadow:'0 4px 15px rgba(83,22,151,0.25)' }}>
        🚀 Start Practice: {subtopic}
      </button>
    </div>
  );
}

// ── Custom Multi-Topic Quiz Generator Component ─────────────────────────────
function CustomQuizSetup({ onStartQuiz }) {
  const [selectedTopics, setSelectedTopics]   = useState(['Quantitative', 'Logical Reasoning', 'Verbal Ability', 'DSA Aptitude']);
  const [difficulty, setDifficulty]           = useState('All');
  const [questionCount, setQuestionCount]     = useState(10);
  const [selectedCompany, setSelectedCompany] = useState('All Companies');

  const topicOptions = [
    { id: 'Quantitative',       label: '🔢 Quantitative Aptitude' },
    { id: 'Logical Reasoning',  label: '🧩 Logical Reasoning' },
    { id: 'Verbal Ability',     label: '📖 Verbal Ability' },
    { id: 'DSA Aptitude',       label: '🌳 DSA Aptitude' },
  ];

  function toggleTopic(id) {
    setSelectedTopics(prev =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter(t => t !== id) : prev) : [...prev, id]
    );
  }

  function handleStart() {
    onStartQuiz({
      topics: selectedTopics,
      difficulty,
      company: selectedCompany,
      count: questionCount
    });
  }

  return (
    <div className="card" style={{ padding: 24, maxWidth: 640, margin: '0 auto' }}>
      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.2rem', color: 'var(--text)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
        ⚡ Custom Multi-Topic Quiz Generator
      </div>
      <p style={{ fontSize: '.83rem', color: 'var(--text-3)', marginBottom: 20 }}>
        Select multiple topics, choose difficulty level, set question count, and optionally filter by target company.
      </p>

      {/* 1. Select Topics */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: '.82rem', fontWeight: 800, color: 'var(--text)', display: 'block', marginBottom: 10 }}>
          1. Select Topics (at least one required):
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {topicOptions.map(t => {
            const active = selectedTopics.includes(t.id);
            return (
              <button key={t.id} onClick={() => toggleTopic(t.id)}
                style={{
                  padding: '12px 14px', borderRadius: 10,
                  border: `1.5px solid ${active ? '#531697' : '#d0d7e8'}`,
                  background: active ? 'rgba(83,22,151,0.08)' : 'var(--surface-2)',
                  color: active ? '#531697' : 'var(--text-2)',
                  fontWeight: 700, cursor: 'pointer', textAlign: 'left',
                  fontSize: '.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                <span>{t.label}</span>
                <span>{active ? '✅' : '⬜'}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Select Difficulty */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: '.82rem', fontWeight: 800, color: 'var(--text)', display: 'block', marginBottom: 10 }}>
          2. Target Difficulty:
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {['All', 'Easy', 'Medium', 'Hard'].map(d => (
            <button key={d} onClick={() => setDifficulty(d)}
              style={{
                flex: 1, padding: '10px', borderRadius: 9,
                border: `1.5px solid ${difficulty === d ? '#531697' : '#d0d7e8'}`,
                background: difficulty === d ? GRAD : 'transparent',
                color: difficulty === d ? '#fff' : 'var(--text)',
                fontWeight: 700, cursor: 'pointer', fontSize: '.82rem'
              }}>
              {d === 'All' ? '⚡ Mixed / All' : d}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Number of Questions */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: '.82rem', fontWeight: 800, color: 'var(--text)', display: 'block', marginBottom: 10 }}>
          3. Number of Questions:
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[5, 10, 15, 20, 25, 30].map(cnt => (
            <button key={cnt} onClick={() => setQuestionCount(cnt)}
              style={{
                flex: 1, padding: '9px', borderRadius: 9,
                border: `1.5px solid ${questionCount === cnt ? '#531697' : '#d0d7e8'}`,
                background: questionCount === cnt ? 'rgba(83,22,151,0.1)' : 'transparent',
                color: questionCount === cnt ? '#531697' : 'var(--text-2)',
                fontWeight: 800, cursor: 'pointer', fontSize: '.82rem'
              }}>
              {cnt} Qs
            </button>
          ))}
        </div>
      </div>

      {/* 4. Target Company (Optional) */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: '.82rem', fontWeight: 800, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
          4. Target Company (Optional):
        </label>
        <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid #d0d7e8', background: 'var(--surface)', color: 'var(--text)', fontFamily: "'Nunito',sans-serif", fontSize: '.85rem' }}>
          <option value="All Companies">🌟 All Companies (No Filter)</option>
          {Object.keys(COMPANY_BADGES).map(c => (
            <option key={c} value={c}>🏢 {c}</option>
          ))}
        </select>
      </div>

      {/* Start Button */}
      <button onClick={handleStart}
        style={{ width: '100%', padding: '14px', borderRadius: 11, border: 'none', background: GRAD, color: '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '1rem', boxShadow: '0 4px 15px rgba(83,22,151,0.25)' }}>
        🚀 Generate & Start Custom Quiz ({questionCount} Qs)
      </button>
    </div>
  );
}

// ── Quiz / Practice Question Component ───────────────────────────────────────
function QuizQuestion({ q, idx, total, onAnswer, onFinish, mode, bookmarks=[], notes={}, onToggleBookmark, onSaveNote }) {
  const [sel, setSel]          = useState(null);
  const [revealed, setRev]     = useState(false);
  const [timer, setTimer]      = useState(90);
  const [expired, setExp]      = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState(notes[q?._id] || '');
  const [savingNote, setSaving] = useState(false);
  const isBookmarked           = bookmarks.includes(q?._id);

  useEffect(() => {
    setSel(null); setRev(false); setTimer(90); setExp(false);
    setShowNote(false); setNoteText(notes[q?._id] || '');
  }, [idx]);

  useEffect(() => {
    const t = setInterval(() => setTimer(n => { if (n <= 1) { setExp(true); clearInterval(t); return 0; } return n-1; }), 1000);
    return () => clearInterval(t);
  }, [idx]);

  function next() {
    const isLast = idx >= total - 1;
    onAnswer({ questionId:q._id, topic:q.topic, subtopic:q.subtopic, selectedAnswer:sel||'(skipped)', timeSpent:90-timer }, isLast);
  }

  async function handleSaveNote() {
    setSaving(true);
    await onSaveNote(q._id, noteText);
    setSaving(false); setShowNote(false);
  }

  const tc = timer > 60 ? '#47d372' : timer > 30 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ maxWidth:680, margin:'0 auto' }}>
      {/* Progress bar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ fontSize:'.8rem', fontWeight:700, color:'var(--text-3)' }}>
          {mode==='practice' ? '📖 Practice' : '🧪 Quiz'} · Q{idx+1}/{total}
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <div style={{ height:6, width:160, background:'#f0f3fa', borderRadius:999 }}>
            <div style={{ height:'100%', width:`${((idx+1)/total)*100}%`, background:GRAD, borderRadius:999, transition:'width .3s' }} />
          </div>
          <div style={{ fontWeight:800, color:tc, fontSize:'.88rem', minWidth:34 }}>{timer}s</div>
        </div>
      </div>

      <div className="card" style={{ padding:'22px 24px', position:'relative' }}>
        {/* Bookmark + Note icons */}
        <div style={{ position:'absolute', top:16, right:18, display:'flex', gap:8 }}>
          <button onClick={() => onToggleBookmark(q._id)} title="Bookmark"
            style={{ padding:'5px 9px', borderRadius:8, border:'1.5px solid #d0d7e8', background:isBookmarked?'rgba(245,158,11,0.12)':'transparent', color:isBookmarked?'#f59e0b':'#b0bec9', cursor:'pointer', fontSize:'1rem' }}>
            {isBookmarked ? '🔖' : '☆'}
          </button>
          <button onClick={() => setShowNote(!showNote)} title="Note"
            style={{ padding:'5px 9px', borderRadius:8, border:'1.5px solid #d0d7e8', background:noteText?'rgba(83,22,151,0.12)':'transparent', color:noteText?'#531697':'#b0bec9', cursor:'pointer', fontSize:'1rem' }}>
            📝
          </button>
        </div>

        {/* Badges row */}
        <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:14, paddingRight:80 }}>
          <span style={{ padding:'3px 10px', borderRadius:999, background:'rgba(83,22,151,0.08)', color:'#531697', fontSize:'.7rem', fontWeight:700 }}>
            {ICONS[q.topic]||'❓'} {q.topic}
          </span>
          {q.subtopic && <span style={{ padding:'3px 10px', borderRadius:999, background:'rgba(19,161,165,0.08)', color:'#13a1a5', fontSize:'.7rem', fontWeight:700 }}>📌 {q.subtopic}</span>}
          <span style={{ padding:'3px 10px', borderRadius:999, background:`${DC[q.difficulty]||'#b0bec9'}15`, color:DC[q.difficulty]||'#b0bec9', fontSize:'.7rem', fontWeight:700 }}>{q.difficulty}</span>
          {[...(Array.isArray(q.companies)?q.companies:q.company?[q.company]:[])].filter(Boolean).slice(0,3).map(c => (
            <span key={c} style={{ padding:'3px 10px', borderRadius:999, background:'rgba(4,44,93,0.06)', color:'#042c5d', fontSize:'.7rem', fontWeight:700 }}>🏢 {c}</span>
          ))}
        </div>

        {/* Note drawer */}
        {showNote && (
          <div style={{ marginBottom:16, padding:14, background:'rgba(83,22,151,0.05)', border:'1.5px solid rgba(83,22,151,0.2)', borderRadius:10 }}>
            <div style={{ fontSize:'.8rem', fontWeight:800, color:'#531697', marginBottom:6 }}>📝 Note (saved to Dashboard)</div>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Write key formula, shortcut, or doubt here..."
              rows={3} style={{ width:'100%', padding:8, borderRadius:8, border:'1px solid #d0d7e8', fontFamily:'inherit', fontSize:'.82rem', outline:'none', boxSizing:'border-box' }} />
            <div style={{ display:'flex', gap:8, marginTop:8, justifyContent:'flex-end' }}>
              <button onClick={() => setShowNote(false)} style={{ padding:'4px 10px', borderRadius:6, border:'none', background:'transparent', color:'var(--text-3)', cursor:'pointer', fontSize:'.75rem' }}>Cancel</button>
              <button onClick={handleSaveNote} disabled={savingNote}
                style={{ padding:'5px 14px', borderRadius:6, border:'none', background:GRAD, color:'#fff', fontWeight:700, cursor:'pointer', fontSize:'.75rem' }}>
                {savingNote ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>
        )}

        <div style={{ fontWeight:700, fontSize:'.97rem', color:'var(--text)', lineHeight:1.7, marginBottom:20, whiteSpace:'pre-wrap' }}>{q.question}</div>

        <div style={{ display:'flex', flexDirection:'column', gap:9, marginBottom:16 }}>
          {(q.options||[]).map((opt,i) => {
            let bg='var(--surface-2)', brd='var(--border)', col='var(--text-2)';
            if (revealed) {
              if (opt===q.answer)            { bg='rgba(71,211,114,0.12)'; brd='var(--success)'; col='var(--success)'; }
              else if (opt===sel)            { bg='rgba(239,68,68,0.1)';  brd='var(--danger)';  col='var(--danger)'; }
            } else if (sel===opt)            { bg='rgba(83,22,151,0.1)';  brd='var(--purple)';  col='var(--purple)'; }
            return (
              <button key={i} onClick={() => !revealed && !expired && setSel(opt)} disabled={revealed||expired}
                style={{ padding:'12px 16px', borderRadius:10, border:`1.5px solid ${brd}`, background:bg, color:col,
                  fontWeight:(opt===q.answer&&revealed)?800:500, cursor:(revealed||expired)?'default':'pointer',
                  textAlign:'left', fontFamily:"'Nunito',sans-serif", fontSize:'.88rem', transition:'all .15s',
                  display:'flex', gap:10, alignItems:'center' }}>
                <span style={{ width:22, height:22, borderRadius:'50%', border:`1.5px solid ${brd}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.7rem', fontWeight:800, flexShrink:0 }}>
                  {['A','B','C','D'][i]}
                </span>
                {opt}
                {revealed && opt===q.answer && <span style={{ marginLeft:'auto' }}>✅</span>}
                {revealed && opt===sel && opt!==q.answer && <span style={{ marginLeft:'auto' }}>❌</span>}
              </button>
            );
          })}
        </div>

        {expired && !revealed && (
          <div style={{ padding:'9px 12px', background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:8, fontSize:'.82rem', color:'#991b1b', fontWeight:600, marginBottom:12 }}>⏱️ Time's up!</div>
        )}

        {/* Explanation — shows in practice mode after reveal, or in quiz mode after submit */}
        {revealed && q.explanation && (
          <div style={{ padding:'12px 14px', background:'rgba(83,22,151,0.05)', borderRadius:10, border:'1px solid rgba(83,22,151,0.1)', fontSize:'.82rem', color:'var(--text-2)', lineHeight:1.7, marginBottom:12 }}>
            <strong style={{ color:'var(--purple)' }}>💡 Explanation:</strong> {q.explanation}
          </div>
        )}

        <div style={{ display:'flex', gap:8 }}>
          {mode==='practice' && !revealed && (
            <button onClick={() => { if (sel||expired) setRev(true); }} disabled={!sel&&!expired}
              style={{ flex:1, padding:'11px', borderRadius:10, border:'none', background:(sel||expired)?GRAD:'#d0d7e8', color:'var(--surface)', fontWeight:800, cursor:(sel||expired)?'pointer':'not-allowed', fontFamily:"'Nunito',sans-serif" }}>
              {sel ? '✓ Check Answer' : 'Select an answer'}
            </button>
          )}
          {mode==='quiz' && (
            <button onClick={next} disabled={!sel&&!expired}
              style={{ flex:1, padding:'11px', borderRadius:10, border:'none', background:(sel||expired)?GRAD:'#d0d7e8', color:'#fff', fontWeight:800, cursor:(sel||expired)?'pointer':'not-allowed', fontFamily:"'Nunito',sans-serif" }}>
              {idx < total-1 ? 'Next Question →' : '🏁 Submit Quiz'}
            </button>
          )}
          {mode==='practice' && revealed && (
            <button onClick={next}
              style={{ flex:1, padding:'11px', borderRadius:10, border:'none', background:GRAD, color:'var(--surface)', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif" }}>
              {idx < total-1 ? 'Next Question →' : '🏁 Finish Practice'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Results Component ────────────────────────────────────────────────────────
function Results({ answers, results, title, mode, onRestart }) {
  const dataset = (results && results.length) ? results : answers;
  const correct = dataset.filter(r => r.correct).length;
  const total   = dataset.length;
  const score   = total ? Math.round((correct / total) * 100) : 0;
  const col     = score >= 70 ? '#47d372' : score >= 45 ? '#f59e0b' : '#ef4444';

  // Identify weak subtopics for resource links
  const weakMap = {};
  dataset.filter(a => !a.correct).forEach(a => { weakMap[a.subtopic] = (weakMap[a.subtopic]||0)+1; });
  const weak = Object.keys(weakMap).filter(s => SUBTOPIC_META[s]);

  return (
    <div style={{ maxWidth:640, margin:'0 auto' }}>
      <div className="card" style={{ padding:'28px 24px', textAlign:'center', marginBottom:14 }}>
        <div style={{ fontSize:'2.5rem', marginBottom:8 }}>{score>=70?'🏆':score>=45?'👍':'📚'}</div>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'2.8rem', color:col, lineHeight:1 }}>{score}%</div>
        <div style={{ fontWeight:700, color:'var(--text-2)', marginBottom:12, marginTop:4 }}>
          {correct} / {total} correct · {mode==='practice'?'Practice':'Quiz'} — {title}
        </div>
        <div style={{ height:8, background:'#f0f3fa', borderRadius:999, marginBottom:8 }}>
          <div style={{ height:'100%', width:`${score}%`, background:`linear-gradient(90deg,${col},#13a1a5)`, borderRadius:999, transition:'width 1s' }} />
        </div>
        <div style={{ fontSize:'.83rem', color:'var(--text-3)', marginBottom:20 }}>
          {score>=70?'Excellent! Strong grip on this topic 💪':score>=45?'Good effort! Review explanations 📖':'Keep practicing — consistency is key! 🔥'}
        </div>
        <button onClick={onRestart}
          style={{ padding:'11px 28px', borderRadius:10, border:'none', background:GRAD, color:'var(--surface)', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif" }}>
          ← Back to Topics
        </button>
      </div>

      {/* Weak subtopics → study resources */}
      {weak.length > 0 && (
        <div className="card" style={{ padding:'16px 20px', marginBottom:14 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.88rem', color:'var(--text)', marginBottom:10 }}>📌 Subtopics to Revise</div>
          {weak.map(sub => {
            const m = SUBTOPIC_META[sub] || {};
            return (
              <div key={sub} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', background:'rgba(239,68,68,0.04)', borderRadius:8, marginBottom:6 }}>
                <span style={{ fontWeight:700, fontSize:'.82rem', color:'var(--text-2)' }}>{sub}</span>
                <div style={{ display:'flex', gap:6 }}>
                  {m.gfg && <a href={m.gfg} target="_blank" rel="noreferrer" style={{ padding:'3px 8px', borderRadius:6, background:'rgba(46,168,84,0.1)', color:'#2ea854', fontSize:'.7rem', fontWeight:700, textDecoration:'none' }}>GFG →</a>}
                  {m.indiabix && <a href={m.indiabix} target="_blank" rel="noreferrer" style={{ padding:'3px 8px', borderRadius:6, background:'rgba(19,161,165,0.1)', color:'#13a1a5', fontSize:'.7rem', fontWeight:700, textDecoration:'none' }}>IndiaBix →</a>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed answer review with explanations */}
      {results && results.length > 0 && (
        <div className="card" style={{ padding:'16px 20px' }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', color:'var(--text)', marginBottom:12 }}>📋 Detailed Review & Explanations</div>
          {results.map((r,i) => (
            <div key={i} style={{ padding:12, borderRadius:8, background:r.correct?'rgba(71,211,114,0.05)':'rgba(239,68,68,0.05)', border:`1px solid ${r.correct?'rgba(71,211,114,0.2)':'rgba(239,68,68,0.2)'}`, marginBottom:8 }}>
              <div style={{ fontSize:'.83rem', fontWeight:700, color:'var(--text)', marginBottom:4 }}>Q{i+1}: {r.topic} — {r.subtopic}</div>
              <div style={{ fontSize:'.8rem', color:r.correct?'#166534':'#991b1b', marginBottom:2 }}>
                Your Answer: <strong>{r.selectedAnswer}</strong> {r.correct?'✅':'❌'}
              </div>
              {!r.correct && r.correctAnswer && (
                <div style={{ fontSize:'.8rem', color:'#166534', fontWeight:700, marginBottom:4 }}>
                  ✅ Correct: {r.correctAnswer}
                </div>
              )}
              {r.explanation && (
                <div style={{ fontSize:'.78rem', color:'var(--text-2)', background:'rgba(83,22,151,0.04)', padding:'8px 10px', borderRadius:8, marginTop:4, lineHeight:1.6 }}>
                  💡 {r.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Browse All Problems Component ────────────────────────────────────────────
function BrowseAll({ onStartPractice }) {
  const [questions, setQ]    = useState([]);
  const [total, setTotal]    = useState(0);
  const [loading, setLoad]   = useState(true);
  const [page, setPage]      = useState(1);
  const [pages, setPages]    = useState(1);
  const [filters, setFilters] = useState({ topic:'All', difficulty:'All', company:'All', search:'' });

  useEffect(() => {
    setLoad(true);
    const params = new URLSearchParams({ page, limit:15 });
    if (filters.topic !== 'All')      params.set('topic', filters.topic);
    if (filters.difficulty !== 'All') params.set('difficulty', filters.difficulty);
    if (filters.company !== 'All')    params.set('company', filters.company);
    if (filters.search)               params.set('search', filters.search);

    fetch(`${API}/aptitude?${params}`, { headers:tk() })
      .then(r => r.json())
      .then(d => { setQ(d.questions||[]); setTotal(d.total||0); setPages(d.pages||1); })
      .catch(() => {})
      .finally(() => setLoad(false));
  }, [page, filters]);

  function setFilter(key, val) { setFilters(f => ({ ...f, [key]:val })); setPage(1); }

  const INPUT_S = { padding:'7px 12px', borderRadius:9, border:'1px solid #d0d7e8', fontSize:'.82rem', fontFamily:"'Nunito',sans-serif", outline:'none', background:'var(--surface)', color:'var(--text)' };
  const SEL_S   = { ...INPUT_S, cursor:'pointer' };

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
        <input value={filters.search} onChange={e => setFilter('search', e.target.value)} placeholder="🔍 Search questions…"
          style={{ ...INPUT_S, flex:1, minWidth:200 }} />
        <select value={filters.topic} onChange={e => setFilter('topic', e.target.value)} style={SEL_S}>
          <option value="All">All Topics</option>
          {Object.entries(TOPIC_LABELS).map(([k,v]) => <option key={k} value={TOPIC_DB[k]||k}>{v}</option>)}
        </select>
        <select value={filters.difficulty} onChange={e => setFilter('difficulty', e.target.value)} style={SEL_S}>
          <option value="All">All Difficulties</option>
          {['Easy','Medium','Hard'].map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filters.company} onChange={e => setFilter('company', e.target.value)} style={SEL_S}>
          <option value="All">All Companies</option>
          {Object.keys(COMPANY_BADGES).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ fontSize:'.78rem', color:'var(--text-3)', marginBottom:12, fontWeight:600 }}>
        Showing {questions.length} of {total} questions
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
          <div style={{ width:28, height:28, border:'3px solid #e8edf5', borderTopColor:'#531697', borderRadius:'50%', animation:'_s .7s linear infinite' }} />
          <style>{`@keyframes _s{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : (
        <>
          {questions.map((q,i) => (
            <div key={q._id||i} className="card" style={{ padding:'14px 18px', marginBottom:10 }}>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:8 }}>
                <span style={{ padding:'2px 8px', borderRadius:999, background:'rgba(83,22,151,0.07)', color:'#531697', fontSize:'.67rem', fontWeight:700 }}>{q.topic}</span>
                {q.subtopic && <span style={{ padding:'2px 8px', borderRadius:999, background:'rgba(19,161,165,0.07)', color:'#13a1a5', fontSize:'.67rem', fontWeight:700 }}>📌 {q.subtopic}</span>}
                <span style={{ padding:'2px 8px', borderRadius:999, background:`${DC[q.difficulty]||'#b0bec9'}15`, color:DC[q.difficulty]||'#b0bec9', fontSize:'.67rem', fontWeight:700 }}>{q.difficulty}</span>
                {(q.companies||[]).slice(0,3).map(c => (
                  <span key={c} style={{ padding:'2px 8px', borderRadius:999, background:'rgba(4,44,93,0.05)', color:'#042c5d', fontSize:'.67rem', fontWeight:700 }}>🏢 {c}</span>
                ))}
              </div>
              <div style={{ fontWeight:600, fontSize:'.87rem', color:'var(--text)', lineHeight:1.65, marginBottom:8 }}>{q.question}</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {(q.options||[]).map((opt,j) => (
                  <span key={j} style={{ padding:'3px 10px', borderRadius:7, background:'var(--surface-2)', color:'var(--text-2)', fontSize:'.75rem', border:'1px solid #e8edf5' }}>
                    {['A','B','C','D'][j]}) {opt}
                  </span>
                ))}
              </div>
              <button onClick={() => onStartPractice({ topic:q.topic, subtopic:q.subtopic })}
                style={{ marginTop:10, padding:'5px 12px', borderRadius:8, border:'none', background:GRAD, color:'#fff', fontWeight:700, cursor:'pointer', fontSize:'.75rem' }}>
                Practice this subtopic →
              </button>
            </div>
          ))}

          {/* Pagination */}
          {pages > 1 && (
            <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:12 }}>
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                style={{ padding:'6px 12px', borderRadius:8, border:'1px solid #d0d7e8', background:'transparent', color:page===1?'#d0d7e8':'#531697', fontWeight:700, cursor:page===1?'not-allowed':'pointer', fontSize:'.8rem' }}>
                ← Prev
              </button>
              <span style={{ padding:'6px 14px', fontSize:'.82rem', fontWeight:700, color:'var(--text-3)' }}>
                Page {page} of {pages}
              </span>
              <button onClick={() => setPage(p => Math.min(pages,p+1))} disabled={page===pages}
                style={{ padding:'6px 12px', borderRadius:8, border:'1px solid #d0d7e8', background:'transparent', color:page===pages?'#d0d7e8':'#531697', fontWeight:700, cursor:page===pages?'not-allowed':'pointer', fontSize:'.8rem' }}>
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Target Company Section ───────────────────────────────────────────────────
function TargetCompanySection({ companyStats, onSelectCompany }) {
  const [selectedComp, setSelected] = useState('All Companies');
  const statsMap = {};
  (companyStats||[]).forEach(s => { statsMap[s.company] = s.count; });

  const companies = [
    { name:'All Companies', count:0, badge:{ color:'#a855f7', icon:'🌟' } },
    ...Object.entries(COMPANY_BADGES).map(([name,badge]) => ({
      name, badge, count: statsMap[name] || 0
    }))
  ];

  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1rem', color:'var(--text)', display:'flex', alignItems:'center', gap:6 }}>
          🏛️ Target Company Practice
        </div>
        <span style={{ fontSize:'.75rem', color:'var(--text-3)', fontWeight:600 }}>Filter by company</span>
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
        {companies.map(c => {
          const active = selectedComp === c.name;
          return (
            <button key={c.name} onClick={() => { setSelected(c.name); onSelectCompany(c.name); }}
              style={{ padding:'8px 14px', borderRadius:10, border:`1.5px solid ${active?'#531697':'rgba(255,255,255,0.12)'}`,
                background:active?GRAD:'rgba(255,255,255,0.04)', color:active?'#fff':'var(--text)',
                fontWeight:700, fontSize:'.82rem', cursor:'pointer', fontFamily:"'Nunito',sans-serif",
                display:'flex', alignItems:'center', gap:6, transition:'all .15s' }}>
              <span style={{ color:c.badge?.color }}>{c.badge?.icon||'🏢'}</span>
              <span>{c.name}</span>
              {c.count > 0 && (
                <span style={{ fontSize:'.7rem', color:active?'#e0e7ff':'#818cf8', background:active?'rgba(255,255,255,0.2)':'rgba(129,140,248,0.12)', padding:'1px 6px', borderRadius:999 }}>
                  {c.count}+ Qs
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Bookmarks & Notes Tab ────────────────────────────────────────────────────
function BookmarksAndNotesTab() {
  const [bookmarks, setBMs] = useState([]);
  const [notes, setNotes]   = useState([]);
  const [loading, setLoad]  = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/aptitude/bookmarks`, { headers:tk() }).then(r => r.json()),
      fetch(`${API}/aptitude/notes`,     { headers:tk() }).then(r => r.json()),
    ]).then(([b,n]) => { setBMs(b.bookmarks||[]); setNotes(n.notes||[]); }).finally(() => setLoad(false));
  }, []);

  async function removeBM(id) {
    await fetch(`${API}/aptitude/bookmark/${id}`, { method:'POST', headers:tk() });
    setBMs(bs => bs.filter(b => b.questionId?._id !== id && b.questionId !== id));
  }

  if (loading) return <div style={{ textAlign:'center', padding:40, color:'#b0bec9' }}>Loading bookmarks and notes…</div>;

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
      <div>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', color:'var(--text)', marginBottom:12 }}>🔖 Bookmarked Questions</div>
        {!bookmarks.length && <div style={{ color:'#b0bec9', fontSize:'.83rem' }}>No bookmarked questions yet. Click ☆ on questions to save them.</div>}
        {bookmarks.map(b => {
          const q = b.questionId;
          if (!q) return null;
          return (
            <div key={b._id} className="card" style={{ padding:'14px 18px', marginBottom:10 }}>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:6 }}>
                <span style={{ padding:'2px 8px', borderRadius:999, background:'rgba(83,22,151,0.07)', color:'#531697', fontSize:'.67rem', fontWeight:700 }}>{q.topic}</span>
                {q.subtopic && <span style={{ padding:'2px 8px', borderRadius:999, background:'rgba(19,161,165,0.07)', color:'#13a1a5', fontSize:'.67rem', fontWeight:700 }}>📌 {q.subtopic}</span>}
              </div>
              <div style={{ fontWeight:600, fontSize:'.85rem', color:'var(--text)', lineHeight:1.6 }}>{q.question}</div>
              <button onClick={() => removeBM(q._id)}
                style={{ marginTop:8, padding:'3px 8px', borderRadius:6, border:'none', background:'rgba(239,68,68,0.08)', color:'#ef4444', cursor:'pointer', fontSize:'.72rem', fontWeight:700 }}>
                Remove
              </button>
            </div>
          );
        })}
      </div>
      <div>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', color:'var(--text)', marginBottom:12 }}>📝 Your Notes</div>
        {!notes.length && <div style={{ color:'#b0bec9', fontSize:'.83rem' }}>No notes saved yet. Click 📝 during practice to jot notes.</div>}
        {notes.map(n => {
          const q = n.questionId;
          if (!q) return null;
          return (
            <div key={n._id} className="card" style={{ padding:'14px 18px', marginBottom:10, background:'rgba(83,22,151,0.03)' }}>
              <div style={{ fontSize:'.75rem', fontWeight:700, color:'#531697', marginBottom:4 }}>Q: {q.question?.slice(0,70)}...</div>
              <div style={{ fontSize:'.83rem', color:'var(--text-2)', background:'var(--surface)', padding:10, borderRadius:8, border:'1px solid #e8edf5', whiteSpace:'pre-wrap' }}>{n.note}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Aptitude Page ───────────────────────────────────────────────────────
export default function AptitudePage() {
  const [tab, setTab]             = useState('topics');
  const [topicsData, setTopics]   = useState({ topics:[], questionCounts:{}, subtopicMap:{} });
  const [companyStats, setCStats] = useState([]);
  const [stats, setStats]         = useState([]);
  const [progress, setProgress]   = useState({ totalAttempted:0, totalCorrect:0, accuracy:0 });
  const [bookmarks, setBookmarks] = useState([]);
  const [notes, setNotes]         = useState({});
  const [loading, setLoad]        = useState(true);
  const [syncing, setSyncing]     = useState(false);

  // Subtopic flashcard selection state
  const [activeFlashcard, setActiveFlashcard] = useState(null); // subtopic name

  // Active quiz/practice session
  const [mode, setMode]           = useState(null);
  const [questions, setQ]         = useState([]);
  const [qIdx, setQIdx]           = useState(0);
  const [answers, setAnswers]     = useState([]);
  const [submitResults, setSubmitResults] = useState([]);
  const [quizDone, setDone]       = useState(false);
  const [sessionTitle, setTitle]  = useState('');
  const [sessionMode, setSMode]   = useState('practice');
  const [aiLoading, setAILoading] = useState(false);

  const fetchInitialData = useCallback(() => {
    Promise.all([
      fetch(`${API}/aptitude/topics`,       { headers:tk() }).then(r => r.json()),
      fetch(`${API}/aptitude/stats`,        { headers:tk() }).then(r => r.json()),
      fetch(`${API}/aptitude/company-stats`,{ headers:tk() }).then(r => r.json()),
      fetch(`${API}/aptitude/bookmarks`,    { headers:tk() }).then(r => r.json()),
      fetch(`${API}/aptitude/notes`,        { headers:tk() }).then(r => r.json()),
    ]).then(([t,s,cs,b,n]) => {
      setTopics(t || { topics:[], questionCounts:{}, subtopicMap:{} });
      setStats(s.stats||[]);
      setProgress({ totalAttempted:s.totalAttempted||0, totalCorrect:s.totalCorrect||0, accuracy:s.accuracy||0 });
      if (cs.stats?.length) setCStats(cs.stats);
      setBookmarks(b.ids||[]);
      const nMap = {};
      (n.notes||[]).forEach(item => { if (item.questionId?._id) nMap[item.questionId._id] = item.note; });
      setNotes(nMap);
    }).catch(() => {}).finally(() => setLoad(false));
  }, []);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch(`${API}/aptitude/sync`, { method:'POST', headers:tk() }).then(r => r.json());
      alert(res.message || 'Questions synced!');
      fetchInitialData();
    } catch (e) { alert('Sync failed: ' + e.message); }
    finally { setSyncing(false); }
  }

  async function handleToggleBookmark(qId) {
    try {
      const d = await fetch(`${API}/aptitude/bookmark/${qId}`, { method:'POST', headers:tk() }).then(r => r.json());
      setBookmarks(b => d.bookmarked ? [...b, qId] : b.filter(i => i !== qId));
    } catch (e) {}
  }

  async function handleSaveNote(qId, text) {
    try {
      await fetch(`${API}/aptitude/note/${qId}`, { method:'POST', headers:tks(), body:JSON.stringify({ note:text }) });
      setNotes(n => ({ ...n, [qId]:text }));
    } catch (e) {}
  }

  // Start practice from DB (answers VISIBLE for self-check)
  async function handleStartPractice({ topic, subtopic, company, count=20 }) {
    setLoad(true);
    setActiveFlashcard(null);
    try {
      const params = new URLSearchParams({ limit:count });
      if (topic)                               params.set('topic', topic);
      if (subtopic)                            params.set('subtopic', subtopic);
      if (company && company !== 'All Companies') params.set('company', company);

      const d = await fetch(`${API}/aptitude/set?${params}`, { headers:tk() }).then(r => r.json());
      if (!d.questions?.length) { alert('No questions found for this selection. Try a different filter.'); return; }
      setQ(d.questions); setQIdx(0); setAnswers([]); setDone(false);
      setTitle(subtopic || company || topic || 'General Practice');
      setSMode('practice'); setMode('session');
    } catch (e) { alert('Failed to load questions.'); }
    finally { setLoad(false); }
  }

  // Start quiz (answers HIDDEN, verified on submit)
  async function handleStartQuiz({ topics, difficulty, company, count=10 }) {
    setLoad(true);
    try {
      const params = new URLSearchParams({ limit:count, quizMode:'true' });
      if (topics?.length)                      params.set('topics', topics.join(','));
      if (company && company !== 'All Companies') params.set('company', company);
      if (difficulty && difficulty !== 'All')  params.set('difficulty', difficulty);

      const d = await fetch(`${API}/aptitude/set?${params}`, { headers:tk() }).then(r => r.json());
      if (!d.questions?.length) { alert('No questions found for this quiz setup.'); return; }
      setQ(d.questions); setQIdx(0); setAnswers([]); setDone(false);
      setTitle(company && company !== 'All Companies' ? `${company} Quiz` : topics ? topics.join(' + ') : 'Quiz Mode');
      setSMode('quiz'); setMode('session');
    } catch (e) { alert('Failed to load quiz.'); }
    finally { setLoad(false); }
  }

  // Start AI or DB company quiz
  async function handleStartAICompanyQuiz(companyName) {
    if (companyName === 'All Companies') {
      return handleStartPractice({ topic:'Quantitative', count:15 });
    }
    setAILoading(true);
    try {
      const res = await fetch(`${API}/aptitude/ai-quiz`, {
        method:'POST', headers:tks(),
        body:JSON.stringify({ company:companyName, count:10, difficulty:'Mixed' })
      }).then(r => r.json());

      if (res.questions?.length) {
        setQ(res.questions); setQIdx(0); setAnswers([]); setDone(false);
        setTitle(res.fallback ? `📖 ${companyName} Practice` : `🤖 AI ${companyName} Quiz`);
        setSMode('quiz'); setMode('session');
        return;
      }
      // Absolute fallback
      await handleStartQuiz({ company:companyName, count:10 });
    } catch (e) {
      console.warn('[AI Quiz]', e.message);
      handleStartQuiz({ company:companyName, count:10 });
    } finally { setAILoading(false); }
  }

  function handleAnswer(ans, isLast = false) {
    setAnswers(prev => {
      const updated = [...prev, ans];
      if (isLast) {
        handleFinish(updated);
      }
      return updated;
    });
    setQIdx(i => i + 1);
  }

  async function handleFinish(finalAnswers) {
    setDone(true);
    const answersToSend = finalAnswers || answers;
    try {
      const res = await fetch(`${API}/aptitude/submit`, {
        method: 'POST', headers: tks(), body: JSON.stringify({ answers: answersToSend })
      }).then(r => r.json());
      if (res.results) setSubmitResults(res.results);
      // Auto-refresh counts & stats in UI
      fetchInitialData();
    } catch (e) {}
  }

  function reset() { setMode(null); setQ([]); setAnswers([]); setSubmitResults([]); setDone(false); setActiveFlashcard(null); }

  const TABS = [
    { id:'topics',    label:'🎯 Practice & Topics' },
    { id:'custom',    label:'⚡ Custom Quiz' },
    { id:'browse',    label:'📚 Browse All' },
    { id:'company',   label:'🏢 Company Specific' },
    { id:'bookmarks', label:'🔖 Bookmarks & Notes' },
  ];

  if (loading && !mode && !aiLoading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
      <div style={{ width:36, height:36, border:'3px solid #e8edf5', borderTopColor:'#531697', borderRadius:'50%', animation:'_s .7s linear infinite' }} />
      <style>{`@keyframes _s{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif" }}>
      {/* Page header */}
      <div style={{ marginBottom:18, display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.5rem', color:'var(--text)', display:'flex', alignItems:'center', gap:8 }}>
            🎯 Aptitude Practice & Quizzes
          </h1>
          <p style={{ color:'var(--text-3)', marginTop:3, fontSize:'.85rem' }}>
            Practice Mode · Custom Multi-Topic Quiz Generator · Target Company Filters · Theory Flashcards · Valid GFG & IndiaBix links
          </p>
        </div>
        <button onClick={handleSync} disabled={syncing}
          style={{ padding:'8px 16px', borderRadius:9, border:'none', background:GRAD, color:'#fff', fontWeight:800, cursor:syncing?'wait':'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.8rem', display:'flex', alignItems:'center', gap:6, boxShadow:'0 4px 12px rgba(83,22,151,0.2)' }}>
          {syncing ? '⌛ Syncing...' : '🔄 Sync Questions'}
        </button>
      </div>

      {/* AI Loading overlay */}
      {aiLoading && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
          <div className="card" style={{ padding:'30px 40px', textAlign:'center', maxWidth:400 }}>
            <div style={{ fontSize:'2.5rem', marginBottom:10 }}>🤖</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.1rem', color:'#531697', marginBottom:6 }}>Generating AI Company Quiz…</div>
            <div style={{ fontSize:'.82rem', color:'var(--text-3)' }}>Creating genuine mixed-difficulty questions…</div>
          </div>
        </div>
      )}

      {/* Session flow */}
      {mode === 'session' && !quizDone && questions.length > 0 && (
        <div>
          <div style={{ marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={reset}
              style={{ padding:'6px 14px', borderRadius:8, border:'1px solid #d0d7e8', background:'transparent', color:'var(--text-3)', fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.8rem' }}>
              ← Exit
            </button>
            <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, color:'var(--text)', fontSize:'.9rem' }}>
              {sessionMode==='practice'?'📖':'🧪'} {sessionTitle}
            </span>
          </div>
          <QuizQuestion
            q={questions[qIdx]} idx={qIdx} total={questions.length}
            mode={sessionMode} onAnswer={handleAnswer} onFinish={handleFinish}
            bookmarks={bookmarks} notes={notes}
            onToggleBookmark={handleToggleBookmark} onSaveNote={handleSaveNote}
          />
        </div>
      )}

      {mode === 'session' && quizDone && (
        <Results answers={answers} results={submitResults} title={sessionTitle} mode={sessionMode} onRestart={reset} />
      )}

      {mode === null && (
        <>
          {/* Tabs */}
          <div style={{ display:'flex', gap:0, marginBottom:18, borderBottom:'1px solid #e8edf5' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ padding:'9px 18px', borderRadius:'9px 9px 0 0', border:'none',
                  borderBottom: tab===t.id ? '2.5px solid #531697' : '2px solid transparent',
                  background: tab===t.id ? 'rgba(83,22,151,.06)' : 'transparent',
                  color: tab===t.id ? '#531697' : 'var(--text-3)',
                  fontWeight:700, cursor:'pointer', fontSize:'.83rem', fontFamily:"'Nunito',sans-serif" }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Tab: Practice & Topics ── */}
          {tab === 'topics' && (
            <div>
              <TargetCompanySection companyStats={companyStats} onSelectCompany={cName => {
                if (cName === 'All Companies') handleStartPractice({ topic:'Quantitative', count:15 });
                else handleStartAICompanyQuiz(cName);
              }} />

              {/* Progress summary */}
              <div className="card" style={{ padding:'14px 18px', marginBottom:16, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                {[['🎯','Attempted',progress.totalAttempted],['✅','Correct',progress.totalCorrect],['📈','Accuracy',`${progress.accuracy}%`]].map(([ic,l,v]) => (
                  <div key={l} style={{ textAlign:'center', padding:'8px', background:'rgba(83,22,151,0.04)', borderRadius:10 }}>
                    <div style={{ fontSize:'1.2rem' }}>{ic}</div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.2rem', color:'#531697' }}>{v}</div>
                    <div style={{ fontSize:'.68rem', color:'var(--text-3)', fontWeight:700 }}>{l}</div>
                  </div>
                ))}
              </div>

              {/* Topic accordion with flashcards and subtopics */}
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {Object.keys(TOPIC_SUBTOPICS).map(cat => {
                  const subs = TOPIC_SUBTOPICS[cat] || [];
                  const fullName = TOPIC_LABELS[cat] || cat;
                  const dbName  = TOPIC_DB[cat] || cat;
                  const qCount  = topicsData.questionCounts?.[fullName] || topicsData.questionCounts?.[dbName] || topicsData.questionCounts?.[cat] || 0;

                  return (
                    <div key={cat} className="card" style={{ padding:18 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                        <div style={{ width:40, height:40, borderRadius:10, background:GRAD, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', flexShrink:0 }}>
                          {ICONS[cat]||'❓'}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', color:'var(--text)' }}>{fullName}</div>
                          <div style={{ fontSize:'.68rem', color:'#b0bec9', marginTop:2 }}>{subs.length} subtopics · {qCount} questions</div>
                        </div>
                        <div style={{ display:'flex', gap:6 }}>
                          <button onClick={() => handleStartPractice({ topic:dbName, count:20 })}
                            style={{ padding:'6px 12px', borderRadius:8, border:'none', background:GRAD, color:'#fff', fontWeight:800, cursor:'pointer', fontSize:'.75rem' }}>
                            Practice →
                          </button>
                          <button onClick={() => handleStartQuiz({ topics:[dbName], count:10 })}
                            style={{ padding:'6px 12px', borderRadius:8, border:'1.5px solid #531697', background:'transparent', color:'#531697', fontWeight:800, cursor:'pointer', fontSize:'.75rem' }}>
                            Quiz 🧪
                          </button>
                        </div>
                      </div>

                      {/* Subtopic grid */}
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:7 }}>
                        {subs.map(sub => {
                          const hasMeta = !!SUBTOPIC_META[sub];
                          const isActive = activeFlashcard === sub;
                          return (
                            <div key={sub}
                              onClick={() => setActiveFlashcard(isActive ? null : sub)}
                              style={{ padding:'9px 12px', borderRadius:9,
                                border: isActive ? '1.5px solid #531697' : '1px solid rgba(19,161,165,0.18)',
                                background: isActive ? 'rgba(83,22,151,0.06)' : 'rgba(19,161,165,0.04)',
                                cursor:'pointer', transition:'all .15s' }}>
                              <div style={{ fontWeight:700, fontSize:'.8rem', color:'var(--text)' }}>{sub}</div>
                              {hasMeta && <div style={{ fontSize:'.65rem', color:'#b0bec9', marginTop:2 }}>📖 Theory available</div>}
                            </div>
                          );
                        })}
                      </div>

                      {/* Flashcard panel for active subtopic */}
                      {activeFlashcard && subs.includes(activeFlashcard) && (
                        <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid #e8edf5' }}>
                          <FlashcardStack
                            subtopic={activeFlashcard}
                            onStart={() => handleStartPractice({ topic:dbName, subtopic:activeFlashcard, count:15 })}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Tab: Custom Quiz Generator ── */}
          {tab === 'custom' && (
            <CustomQuizSetup onStartQuiz={handleStartQuiz} />
          )}

          {/* ── Tab: Browse All ── */}
          {tab === 'browse' && (
            <BrowseAll onStartPractice={handleStartPractice} />
          )}

          {/* ── Tab: Company Specific ── */}
          {tab === 'company' && (
            <div className="card" style={{ padding:22 }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1rem', color:'var(--text)', marginBottom:6 }}>
                🏢 Company-Specific AI & Database Quizzes
              </div>
              <p style={{ fontSize:'.82rem', color:'var(--text-3)', marginBottom:16 }}>
                Select a target company to generate real exam questions powered by AI, or practice saved company papers.
              </p>

              {/* Cognizant Gaming Assessment Special Banner */}
              <div style={{ padding: '16px 20px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(83,22,151,0.08), rgba(19,161,165,0.08))', border: '1.5px solid rgba(83,22,151,0.2)', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.95rem', color: '#531697', marginBottom: 4 }}>
                    <span>🎮</span> Cognizant Gaming Assessment Rounds Simulator
                  </div>
                  <div style={{ fontSize: '.8rem', color: 'var(--text-2)' }}>
                    Practice Motion Pathfinder, Switch Rule Decoders, Geo-Sudoku, Grid Recall, and Fast Digit Speed Challenges.
                  </div>
                </div>
                <button
                  onClick={() => window.location.href = '/dashboard/practice/GAMING'}
                  style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: GRAD, color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '.8rem', boxShadow: '0 4px 12px rgba(83,22,151,0.25)' }}
                >
                  🎮 Play Gaming Assessment →
                </button>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
                {Object.entries(COMPANY_BADGES).map(([cName, badge]) => (
                  <div key={cName} style={{ padding:16, borderRadius:12, border:'1.5px solid #e8edf5', background:'var(--surface)', textAlign:'center' }}>
                    <div style={{ fontSize:'1.8rem', marginBottom:4 }}>{badge.icon}</div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', color:'var(--text)', marginBottom:10 }}>{cName}</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      <button onClick={() => handleStartAICompanyQuiz(cName)}
                        style={{ padding:'8px', borderRadius:8, border:'none', background:GRAD, color:'#fff', fontWeight:800, cursor:'pointer', fontSize:'.75rem' }}>
                        🤖 AI Company Quiz
                      </button>
                      {cName === 'Cognizant' && (
                        <button onClick={() => window.location.href = '/dashboard/practice/GAMING'}
                          style={{ padding:'7px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#059669,#10b981)', color:'#fff', fontWeight:800, cursor:'pointer', fontSize:'.75rem' }}>
                          🎮 Gaming Rounds
                        </button>
                      )}
                      <button onClick={() => handleStartPractice({ company:cName, count:15 })}
                        style={{ padding:'7px', borderRadius:8, border:'1.5px solid #d0d7e8', background:'transparent', color:'var(--text)', fontWeight:700, cursor:'pointer', fontSize:'.75rem' }}>
                        📖 Practice DB Questions
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Tab: Bookmarks & Notes ── */}
          {tab === 'bookmarks' && <BookmarksAndNotesTab />}
        </>
      )}
    </div>
  );
}