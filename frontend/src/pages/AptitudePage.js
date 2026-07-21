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

// Preset Target Companies matching screenshot
const DEFAULT_COMPANY_STATS = [
  { company: 'TCS', count: 197 },
  { company: 'Wipro', count: 107 },
  { company: 'Infosys', count: 100 },
  { company: 'Capgemini', count: 74 },
  { company: 'Accenture', count: 61 },
  { company: 'HCL', count: 61 },
  { company: 'Cognizant', count: 5 },
  { company: 'Zoho', count: 3 },
  { company: 'Amazon', count: 3 },
  { company: 'Deloitte', count: 1 },
];

const COMPANY_BADGES = {
  TCS: { color: '#38bdf8', icon: '🏢' },
  Wipro: { color: '#818cf8', icon: '◆' },
  Infosys: { color: '#60a5fa', icon: '■' },
  Capgemini: { color: '#38bdf8', icon: '◆' },
  Accenture: { color: '#c084fc', icon: '♥' },
  HCL: { color: '#f87171', icon: '●' },
  Cognizant: { color: '#38bdf8', icon: '🌐' },
  Zoho: { color: '#4ade80', icon: '🟢' },
  Amazon: { color: '#fbbf24', icon: '📦' },
  Deloitte: { color: '#34d399', icon: '🟢' }
};

// ── Subtopic metadata ────────────────────────────────────────────────────────
const SUBTOPIC_META = {
  'Number System':{ theory:'Divisibility rules, LCM/HCF, prime factorization, unit digits, surds & indices.', gfg:'https://www.geeksforgeeks.org/aptitude-gq/number-system-gq/', indiabix:'https://www.indiabix.com/aptitude/numbers/' },
  'Percentages':{ theory:'(Part/Whole)×100. Key to profit/loss, discount, interest.', gfg:'https://www.geeksforgeeks.org/aptitude-gq/percentages-aptitude-gq/', indiabix:'https://www.indiabix.com/aptitude/percentage/' },
  'Profit & Loss':{ theory:'Profit = SP−CP. Profit% = (Profit/CP)×100. Marked Price & successive discounts.', gfg:'https://www.geeksforgeeks.org/aptitude-gq/profit-loss-discount-aptitude-gq/', indiabix:'https://www.indiabix.com/aptitude/profit-and-loss/' },
  'Simple & Compound Interest':{ theory:'SI = PRT/100. CI = P(1+r/100)^n − P. Diff for 2 yrs = P(r/100)².', gfg:'https://www.geeksforgeeks.org/aptitude-gq/interest-aptitude-gq/', indiabix:'https://www.indiabix.com/aptitude/simple-interest/' },
  'Ratio & Proportion':{ theory:'a:b = c:d ⟹ ad=bc. Investment ratio × time ratio = Profit ratio.', gfg:'https://www.geeksforgeeks.org/aptitude-gq/ratio-proportion-aptitude-gq/', indiabix:'https://www.indiabix.com/aptitude/ratio-and-proportion/' },
  'Averages':{ theory:'Average = Sum/Count. Weighted average uses proportional weights.', gfg:'https://www.geeksforgeeks.org/aptitude-gq/averages-aptitude-gq/', indiabix:'https://www.indiabix.com/aptitude/average/' },
  'Time & Work':{ theory:"A's 1-day work = 1/n. LCM method simplifies multi-person problems.", gfg:'https://www.geeksforgeeks.org/aptitude-gq/time-and-work-aptitude-gq/', indiabix:'https://www.indiabix.com/aptitude/time-and-work/' },
  'Speed, Time & Distance':{ theory:'Speed = Distance/Time. Avg speed = 2S₁S₂/(S₁+S₂) for equal distances.', gfg:'https://www.geeksforgeeks.org/aptitude-gq/speed-time-distance-aptitude-gq/', indiabix:'https://www.indiabix.com/aptitude/time-and-distance/' },
  'Data Structures':{ theory:'Array, Hash Tables, Trees, Graphs, Sorting & Searching complexities.', gfg:'https://www.geeksforgeeks.org/data-structures/', indiabix:'https://www.indiabix.com/computer-science/data-structures/' },
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
    'Arrays','Linked Lists','Stacks & Queues','Trees','Graphs','Hashing',
  ],
};

const TOPIC_LABELS = {
  'Quantitative': 'Quantitative Aptitude',
  'Logical':      'Logical Reasoning',
  'Verbal':       'Verbal Ability',
  'DSA':          'DSA Aptitude',
};

function SafeLink({ href, fallback, children, style }) {
  return (
    <a href={href || fallback} target="_blank" rel="noreferrer" style={style}>
      {children}
    </a>
  );
}

// ── Quiz / Practice Question Component with Bookmarks & Notes ────────────────
function QuizQuestion({ q, idx, total, onAnswer, onFinish, mode, bookmarks = [], notes = {}, onToggleBookmark, onSaveNote }) {
  const [sel, setSel]          = useState(null);
  const [revealed, setRev]     = useState(false);
  const [timer, setTimer]      = useState(90);
  const [expired, setExp]      = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState(notes[q?._id] || '');
  const [savingNote, setSaving] = useState(false);
  const isBookmarked           = bookmarks.includes(q?._id);

  useEffect(() => {
    setSel(null);
    setRev(false);
    setTimer(90);
    setExp(false);
    setShowNote(false);
    setNoteText(notes[q?._id] || '');
  }, [idx, q?._id, notes]);

  useEffect(() => {
    const t = setInterval(() => setTimer(n => { if (n <= 1){ setExp(true); clearInterval(t); return 0;} return n - 1; }), 1000);
    return () => clearInterval(t);
  }, [idx]);

  function next() {
    onAnswer({
      questionId: q._id,
      topic: q.topic,
      subtopic: q.subtopic,
      selectedAnswer: sel || '(skipped)',
      timeSpent: 90 - timer
    });
    if (idx >= total - 1) onFinish();
  }

  async function handleSaveNote() {
    setSaving(true);
    await onSaveNote(q._id, noteText);
    setSaving(false);
    setShowNote(false);
  }

  const tc = timer > 60 ? '#47d372' : timer > 30 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--text-3)' }}>
          {mode === 'practice' ? '📖 Practice' : '🧪 Quiz'} · Q{idx + 1}/{total}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ height: 6, width: 160, background: '#f0f3fa', borderRadius: 999 }}>
            <div style={{ height: '100%', width: `${((idx + 1) / total) * 100}%`, background: GRAD, borderRadius: 999, transition: 'width .3s' }} />
          </div>
          <div style={{ fontWeight: 800, color: tc, fontSize: '.88rem', minWidth: 34 }}>{timer}s</div>
        </div>
      </div>

      <div className="card" style={{ padding: '22px 24px', position: 'relative' }}>
        {/* Action icons bar: Bookmark & Note */}
        <div style={{ position: 'absolute', top: 16, right: 18, display: 'flex', gap: 8 }}>
          <button onClick={() => onToggleBookmark(q._id)} title="Bookmark Question"
            style={{ padding: '5px 9px', borderRadius: 8, border: '1.5px solid #d0d7e8', background: isBookmarked ? 'rgba(245,158,11,0.12)' : 'transparent', color: isBookmarked ? '#f59e0b' : '#b0bec9', cursor: 'pointer', fontSize: '1rem' }}>
            {isBookmarked ? '🔖' : '☆'}
          </button>
          <button onClick={() => setShowNote(!showNote)} title="Add Note for Question"
            style={{ padding: '5px 9px', borderRadius: 8, border: '1.5px solid #d0d7e8', background: noteText ? 'rgba(83,22,151,0.12)' : 'transparent', color: noteText ? '#531697' : '#b0bec9', cursor: 'pointer', fontSize: '1rem' }}>
            📝
          </button>
        </div>

        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14, paddingRight: 80 }}>
          <span style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(83,22,151,0.08)', color: '#531697', fontSize: '.7rem', fontWeight: 700 }}>{ICONS[q.topic] || '❓'} {q.topic}</span>
          {q.subtopic && <span style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(19,161,165,0.08)', color: '#13a1a5', fontSize: '.7rem', fontWeight: 700 }}>📌 {q.subtopic}</span>}
          <span style={{ padding: '3px 10px', borderRadius: 999, background: `${DC[q.difficulty]}15`, color: DC[q.difficulty], fontSize: '.7rem', fontWeight: 700 }}>{q.difficulty}</span>
          {[...(Array.isArray(q.companies) ? q.companies : q.company ? [q.company] : [])].filter(Boolean).slice(0, 3).map(c => (
            <span key={c} style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(4,44,93,0.06)', color: '#042c5d', fontSize: '.7rem', fontWeight: 700 }}>🏢 {c}</span>
          ))}
        </div>

        {/* Note Drawer overlay */}
        {showNote && (
          <div style={{ marginBottom: 16, padding: 14, background: 'rgba(83,22,151,0.05)', border: '1.5px solid rgba(83,22,151,0.2)', borderRadius: 10 }}>
            <div style={{ fontSize: '.8rem', fontWeight: 800, color: '#531697', marginBottom: 6 }}>📝 Question Note (Saved to Dashboard)</div>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Write key formula, shortcut, or doubt here..."
              rows={3} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #d0d7e8', fontFamily: 'inherit', fontSize: '.82rem', outline: 'none', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNote(false)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer', fontSize: '.75rem' }}>Cancel</button>
              <button onClick={handleSaveNote} disabled={savingNote} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: GRAD, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '.75rem' }}>
                {savingNote ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>
        )}

        <div style={{ fontWeight: 700, fontSize: '.97rem', color: 'var(--text)', lineHeight: 1.7, marginBottom: 20, whiteSpace: 'pre-wrap' }}>{q.question}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
          {(q.options || []).map((opt, i) => {
            let bg = 'var(--surface-2)', brd = 'var(--border)', col = 'var(--text-2)';
            if (revealed) {
              if (opt === q.answer) { bg = 'rgba(71,211,114,0.12)'; brd = 'var(--success)'; col = 'var(--success)'; }
              else if (opt === sel) { bg = 'rgba(239,68,68,0.1)'; brd = 'var(--danger)'; col = 'var(--danger)'; }
            } else if (sel === opt) {
              bg = 'rgba(83,22,151,0.1)'; brd = 'var(--purple)'; col = 'var(--purple)';
            }
            return (
              <button key={i} onClick={() => !revealed && !expired && setSel(opt)} disabled={revealed || expired}
                style={{ padding: '12px 16px', borderRadius: 10, border: `1.5px solid ${brd}`, background: bg, color: col, fontWeight: (opt === q.answer && revealed) ? 800 : 500, cursor: (revealed || expired) ? 'default' : 'pointer', textAlign: 'left', fontFamily: "'Nunito',sans-serif", fontSize: '.88rem', transition: 'all .15s', display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', border: `1.5px solid ${brd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem', fontWeight: 800, flexShrink: 0 }}>{['A','B','C','D'][i]}</span>
                {opt}
                {revealed && opt === q.answer && <span style={{ marginLeft: 'auto' }}>✅</span>}
                {revealed && opt === sel && opt !== q.answer && <span style={{ marginLeft: 'auto' }}>❌</span>}
              </button>
            );
          })}
        </div>

        {expired && !revealed && (
          <div style={{ padding: '9px 12px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: '.82rem', color: '#991b1b', fontWeight: 600, marginBottom: 12 }}>⏱️ Time's up!</div>
        )}

        {revealed && q.explanation && (
          <div style={{ padding: '12px 14px', background: 'rgba(83,22,151,0.05)', borderRadius: 10, border: '1px solid rgba(83,22,151,0.1)', fontSize: '.82rem', color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 12 }}>
            <strong style={{ color: 'var(--purple)' }}>💡 Explanation:</strong> {q.explanation}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          {mode === 'practice' && !revealed && (
            <button onClick={() => { if (sel || expired) setRev(true); }} disabled={!sel && !expired}
              style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: (sel || expired) ? GRAD : '#d0d7e8', color: 'var(--surface)', fontWeight: 800, cursor: (sel || expired) ? 'pointer' : 'not-allowed', fontFamily: "'Nunito',sans-serif" }}>
              {sel ? '✓ Check Answer' : 'Select an answer'}
            </button>
          )}
          {mode === 'quiz' && (
            <button onClick={next} disabled={!sel && !expired}
              style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: (sel || expired) ? GRAD : '#d0d7e8', color: '#fff', fontWeight: 800, cursor: (sel || expired) ? 'pointer' : 'not-allowed', fontFamily: "'Nunito',sans-serif" }}>
              {idx < total - 1 ? 'Next Question →' : '🏁 Submit Quiz'}
            </button>
          )}
          {mode === 'practice' && revealed && (
            <button onClick={next} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: GRAD, color: 'var(--surface)', fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif" }}>
              {idx < total - 1 ? 'Next Question →' : '🏁 Finish Practice'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Results Component ────────────────────────────────────────────────────────
function Results({ answers, results, title, mode, onRestart }) {
  const correct = answers.filter(a => a.correct).length;
  const score   = answers.length ? Math.round((correct / answers.length) * 100) : 0;
  const col     = score >= 70 ? '#47d372' : score >= 45 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="card" style={{ padding: '28px 24px', textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{score >= 70 ? '🏆' : score >= 45 ? '👍' : '📚'}</div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '2.8rem', color: col, lineHeight: 1 }}>{score}%</div>
        <div style={{ fontWeight: 700, color: 'var(--text-2)', marginBottom: 12, marginTop: 4 }}>
          {correct} / {answers.length} correct · {mode === 'practice' ? 'Practice' : 'Quiz'} — {title}
        </div>
        <div style={{ height: 8, background: '#f0f3fa', borderRadius: 999, marginBottom: 16 }}>
          <div style={{ height: '100%', width: `${score}%`, background: `linear-gradient(90deg,${col},#13a1a5)`, borderRadius: 999, transition: 'width 1s' }} />
        </div>
        <button onClick={onRestart} style={{ padding: '11px 28px', borderRadius: 10, border: 'none', background: GRAD, color: 'var(--surface)', fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif" }}>← Back to Aptitude</button>
      </div>

      {results && results.length > 0 && (
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.95rem', color: 'var(--text)', marginBottom: 12 }}>📋 Detailed Review & Explanations</div>
          {results.map((r, i) => (
            <div key={i} style={{ padding: 12, borderRadius: 8, background: r.correct ? 'rgba(71,211,114,0.05)' : 'rgba(239,68,68,0.05)', border: `1px solid ${r.correct ? 'rgba(71,211,114,0.2)' : 'rgba(239,68,68,0.2)'}`, marginBottom: 8 }}>
              <div style={{ fontSize: '.83rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Q{i+1}: {r.topic} - {r.subtopic}</div>
              <div style={{ fontSize: '.8rem', color: r.correct ? '#166534' : '#991b1b', marginBottom: 2 }}>
                Your Answer: <strong>{r.selectedAnswer}</strong> {r.correct ? '✅' : '❌'}
              </div>
              {!r.correct && r.correctAnswer && (
                <div style={{ fontSize: '.8rem', color: '#166534', fontWeight: 700 }}>
                  Correct Answer: {r.correctAnswer}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Target Company Practice Component (Screenshot Design) ─────────────────────
function TargetCompanySection({ companyStats, onSelectCompany }) {
  const [selectedComp, setSelectedComp] = useState('All Companies');
  const statsMap = {};
  (companyStats || []).forEach(s => { statsMap[s.company] = s.count; });

  const companiesList = [
    { name: 'All Companies', count: 0, badge: { color: '#a855f7', icon: '🌟' } },
    { name: 'TCS', count: statsMap['TCS'] || 197, badge: COMPANY_BADGES['TCS'] },
    { name: 'Wipro', count: statsMap['Wipro'] || 107, badge: COMPANY_BADGES['Wipro'] },
    { name: 'Infosys', count: statsMap['Infosys'] || 100, badge: COMPANY_BADGES['Infosys'] },
    { name: 'Capgemini', count: statsMap['Capgemini'] || 74, badge: COMPANY_BADGES['Capgemini'] },
    { name: 'Accenture', count: statsMap['Accenture'] || 61, badge: COMPANY_BADGES['Accenture'] },
    { name: 'HCL', count: statsMap['HCL'] || 61, badge: COMPANY_BADGES['HCL'] },
    { name: 'Cognizant', count: statsMap['Cognizant'] || 5, badge: COMPANY_BADGES['Cognizant'] },
    { name: 'Zoho', count: statsMap['Zoho'] || 3, badge: COMPANY_BADGES['Zoho'] },
    { name: 'Amazon', count: statsMap['Amazon'] || 3, badge: COMPANY_BADGES['Amazon'] },
    { name: 'Deloitte', count: statsMap['Deloitte'] || 1, badge: COMPANY_BADGES['Deloitte'] },
  ];

  function handlePick(cName) {
    setSelectedComp(cName);
    onSelectCompany(cName);
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
          🏛️ Target Company Practice
        </div>
        <span style={{ fontSize: '.75rem', color: 'var(--text-3)', fontWeight: 600 }}>Filter by company</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {companiesList.map(c => {
          const active = selectedComp === c.name;
          const bg = active ? GRAD : 'rgba(255,255,255,0.04)';
          const brd = active ? '#531697' : 'rgba(255,255,255,0.12)';

          return (
            <button key={c.name} onClick={() => handlePick(c.name)}
              style={{
                padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${brd}`,
                background: bg, color: active ? '#fff' : 'var(--text)', fontWeight: 700,
                fontSize: '.82rem', cursor: 'pointer', fontFamily: "'Nunito',sans-serif",
                display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s'
              }}>
              <span style={{ color: c.badge?.color }}>{c.badge?.icon || '🏢'}</span>
              <span>{c.name}</span>
              {c.count > 0 && (
                <span style={{ fontSize: '.7rem', color: active ? '#e0e7ff' : '#818cf8', background: active ? 'rgba(255,255,255,0.2)' : 'rgba(129,140,248,0.12)', padding: '1px 6px', borderRadius: 999 }}>
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

// ── Bookmarks & Notes Tab ───────────────────────────────────────────────────
function BookmarksAndNotesTab() {
  const [bookmarks, setBMs] = useState([]);
  const [notes, setNotes]    = useState([]);
  const [loading, setLoad]  = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/aptitude/bookmarks`, { headers: tk() }).then(r => r.json()),
      fetch(`${API}/aptitude/notes`, { headers: tk() }).then(r => r.json()),
    ]).then(([b, n]) => {
      setBMs(b.bookmarks || []);
      setNotes(n.notes || []);
    }).finally(() => setLoad(false));
  }, []);

  async function removeBM(id) {
    await fetch(`${API}/aptitude/bookmark/${id}`, { method: 'POST', headers: tk() });
    setBMs(bs => bs.filter(b => b.questionId?._id !== id && b.questionId !== id));
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: '#b0bec9' }}>Loading bookmarks and notes…</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {/* Bookmarks Column */}
      <div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.95rem', color: 'var(--text)', marginBottom: 12 }}>🔖 Bookmarked Questions</div>
        {!bookmarks.length && <div style={{ color: '#b0bec9', fontSize: '.83rem' }}>No bookmarked questions yet. Click ☆ on questions to save them.</div>}
        {bookmarks.map(b => {
          const q = b.questionId;
          if (!q) return null;
          return (
            <div key={b._id} className="card" style={{ padding: '14px 18px', marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
                <span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(83,22,151,0.07)', color: '#531697', fontSize: '.67rem', fontWeight: 700 }}>{q.topic}</span>
                {q.subtopic && <span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(19,161,165,0.07)', color: '#13a1a5', fontSize: '.67rem', fontWeight: 700 }}>📌 {q.subtopic}</span>}
              </div>
              <div style={{ fontWeight: 600, fontSize: '.85rem', color: 'var(--text)', lineHeight: 1.6 }}>{q.question}</div>
              <button onClick={() => removeBM(q._id)} style={{ marginTop: 8, padding: '3px 8px', borderRadius: 6, border: 'none', background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer', fontSize: '.72rem', fontWeight: 700 }}>Remove</button>
            </div>
          );
        })}
      </div>

      {/* Notes Column */}
      <div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.95rem', color: 'var(--text)', marginBottom: 12 }}>📝 Your Notes</div>
        {!notes.length && <div style={{ color: '#b0bec9', fontSize: '.83rem' }}>No notes saved yet. Click 📝 during practice to jot notes.</div>}
        {notes.map(n => {
          const q = n.questionId;
          if (!q) return null;
          return (
            <div key={n._id} className="card" style={{ padding: '14px 18px', marginBottom: 10, background: 'rgba(83,22,151,0.03)' }}>
              <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#531697', marginBottom: 4 }}>Q: {q.question?.slice(0, 70)}...</div>
              <div style={{ fontSize: '.83rem', color: 'var(--text-2)', background: 'var(--surface)', padding: 10, borderRadius: 8, border: '1px solid #e8edf5', whiteSpace: 'pre-wrap' }}>
                {n.note}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Aptitude Page ───────────────────────────────────────────────────────
export default function AptitudePage() {
  const [tab, setTab]           = useState('topics');
  const [topicsData, setTopics] = useState({ topics:[], questionCounts:{}, subtopicMap:{} });
  const [companyStats, setCStats] = useState(DEFAULT_COMPANY_STATS);
  const [stats, setStats]       = useState([]);
  const [progress, setProgress] = useState({ totalAttempted: 0, totalCorrect: 0, accuracy: 0 });
  const [bookmarks, setBookmarks] = useState([]);
  const [notes, setNotes]        = useState({});
  const [loading, setLoad]      = useState(true);
  const [syncing, setSyncing]   = useState(false);

  // Active quiz / practice session state
  const [mode, setMode]         = useState(null); // null | 'session'
  const [questions, setQ]       = useState([]);
  const [qIdx, setQIdx]         = useState(0);
  const [answers, setAnswers]   = useState([]);
  const [submitResults, setSubmitResults] = useState([]);
  const [quizDone, setDone]     = useState(false);
  const [sessionTitle, setTitle] = useState('');
  const [sessionMode, setSMode] = useState('practice');

  // AI Quiz Loader state
  const [aiLoading, setAILoading] = useState(false);

  const fetchInitialData = useCallback(() => {
    Promise.all([
      fetch(`${API}/aptitude/topics`, { headers: tk() }).then(r => r.json()),
      fetch(`${API}/aptitude/stats`, { headers: tk() }).then(r => r.json()),
      fetch(`${API}/aptitude/company-stats`, { headers: tk() }).then(r => r.json()),
      fetch(`${API}/aptitude/bookmarks`, { headers: tk() }).then(r => r.json()),
      fetch(`${API}/aptitude/notes`, { headers: tk() }).then(r => r.json()),
    ]).then(([t, s, cs, b, n]) => {
      setTopics(t || { topics: [], questionCounts: {}, subtopicMap: {} });
      setStats(s.stats || []);
      setProgress({ totalAttempted: s.totalAttempted || 0, totalCorrect: s.totalCorrect || 0, accuracy: s.accuracy || 0 });
      if (cs.stats?.length) setCStats(cs.stats);
      setBookmarks(b.ids || []);

      const nMap = {};
      (n.notes || []).forEach(item => { if (item.questionId?._id) nMap[item.questionId._id] = item.note; });
      setNotes(nMap);
    }).catch(() => {}).finally(() => setLoad(false));
  }, []);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  // Sync all questions (Available to ALL students)
  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch(`${API}/aptitude/sync`, { method: 'POST', headers: tk() }).then(r => r.json());
      alert(res.message || 'Questions synced successfully!');
      fetchInitialData();
    } catch (e) {
      alert('Sync failed: ' + e.message);
    } finally {
      setSyncing(false);
    }
  }

  // Toggle Bookmark
  async function handleToggleBookmark(qId) {
    try {
      const d = await fetch(`${API}/aptitude/bookmark/${qId}`, { method: 'POST', headers: tk() }).then(r => r.json());
      setBookmarks(b => d.bookmarked ? [...b, qId] : b.filter(i => i !== qId));
    } catch (e) {}
  }

  // Save Note
  async function handleSaveNote(qId, text) {
    try {
      await fetch(`${API}/aptitude/note/${qId}`, { method: 'POST', headers: tks(), body: JSON.stringify({ note: text }) });
      setNotes(n => ({ ...n, [qId]: text }));
    } catch (e) {}
  }

  // Start Practice Set from DB
  async function handleStartPractice({ topic, subtopic, company, count = 20 }) {
    setLoad(true);
    try {
      const params = new URLSearchParams({ limit: count });
      if (topic) params.set('topic', topic);
      if (subtopic) params.set('subtopic', subtopic);
      if (company && company !== 'All Companies') params.set('company', company);

      const d = await fetch(`${API}/aptitude/set?${params}`, { headers: tk() }).then(r => r.json());
      if (!d.questions?.length) {
        alert('No practice questions found for this selection.');
        return;
      }
      setQ(d.questions);
      setQIdx(0);
      setAnswers([]);
      setDone(false);
      setTitle(subtopic || company || topic || 'General Practice');
      setSMode('practice');
      setMode('session');
    } catch (e) {
      alert('Failed to load questions.');
    } finally {
      setLoad(false);
    }
  }

  // Start Quiz (Hidden answers mode)
  async function handleStartQuiz({ topics, difficulty, company, count = 10 }) {
    setLoad(true);
    try {
      const params = new URLSearchParams({ limit: count, quizMode: 'true' });
      if (topics?.length) params.set('topics', topics.join(','));
      if (company && company !== 'All Companies') params.set('company', company);
      if (difficulty && difficulty !== 'All') params.set('difficulty', difficulty);

      const d = await fetch(`${API}/aptitude/set?${params}`, { headers: tk() }).then(r => r.json());
      if (!d.questions?.length) {
        alert('No questions found for this quiz configuration.');
        return;
      }
      setQ(d.questions);
      setQIdx(0);
      setAnswers([]);
      setDone(false);
      setTitle(company ? `${company} Aptitude Quiz` : topics ? topics.join(' + ') : 'Quiz Mode');
      setSMode('quiz');
      setMode('session');
    } catch (e) {
      alert('Failed to load quiz.');
    } finally {
      setLoad(false);
    }
  }

  // Start AI-Generated Company Quiz
  async function handleStartAICompanyQuiz(companyName) {
    setAILoading(true);
    try {
      const res = await fetch(`${API}/aptitude/ai-quiz`, {
        method: 'POST',
        headers: tks(),
        body: JSON.stringify({ company: companyName, count: 10, difficulty: 'Mixed' })
      }).then(r => r.json());

      // If we got questions (either AI or DB fallback), use them silently
      if (res.questions?.length) {
        setQ(res.questions);
        setQIdx(0);
        setAnswers([]);
        setDone(false);
        // Title reflects source
        setTitle(res.fallback
          ? `📖 ${companyName} Practice Questions`
          : `🤖 AI ${companyName} Exam Quiz`);
        setSMode('quiz');
        setMode('session');
        return;
      }

      // Absolute last resort — try DB directly
      await handleStartQuiz({ company: companyName, count: 10 });
    } catch (e) {
      console.warn('[AI Quiz] error:', e.message);
      handleStartQuiz({ company: companyName, count: 10 });
    } finally {
      setAILoading(false);
    }
  }

  function handleAnswer(ans) {
    setAnswers(a => [...a, ans]);
    setQIdx(i => i + 1);
  }

  async function handleFinish() {
    setDone(true);
    try {
      const res = await fetch(`${API}/aptitude/submit`, {
        method: 'POST',
        headers: tks(),
        body: JSON.stringify({ answers })
      }).then(r => r.json());
      if (res.results) setSubmitResults(res.results);
    } catch (e) {}
  }

  function reset() {
    setMode(null);
    setQ([]);
    setAnswers([]);
    setSubmitResults([]);
    setDone(false);
  }

  const TABS = [
    { id: 'topics', label: '🎯 Practice & Quiz' },
    { id: 'company', label: '🏢 Company Specific' },
    { id: 'bookmarks', label: '🔖 Bookmarks & Notes' }
  ];

  if (loading && !mode && !aiLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div style={{ width: 36, height: 36, border: '3px solid #e8edf5', borderTopColor: '#531697', borderRadius: '50%', animation: '_s .7s linear infinite' }} />
      <style>{`@keyframes _s{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Nunito',sans-serif" }}>
      {/* Page Title & Sync Button */}
      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.5rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            🎯 Aptitude Practice
          </h1>
          <p style={{ color: 'var(--text-3)', marginTop: 3, fontSize: '.85rem' }}>
            Practice Mode · Quiz Mode · Target Company Filters · Theory summaries · GeeksforGeeks & IndiaBix links
          </p>
        </div>
        <button onClick={handleSync} disabled={syncing}
          style={{ padding: '8px 16px', borderRadius: 9, border: 'none', background: GRAD, color: '#fff', fontWeight: 800, cursor: syncing ? 'wait' : 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.8rem', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 12px rgba(83,22,151,0.2)' }}>
          {syncing ? '⌛ Syncing...' : '🔄 Sync All Questions'}
        </button>
      </div>

      {/* AI Loading Modal Overlay */}
      {aiLoading && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ padding: '30px 40px', textAlign: 'center', maxWidth: 400 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🤖</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.1rem', color: '#531697', marginBottom: 6 }}>Generating Company AI Quiz...</div>
            <div style={{ fontSize: '.82rem', color: 'var(--text-3)' }}>Creating genuine mixed-difficulty questions with full explanations...</div>
          </div>
        </div>
      )}

      {/* Active Session Flow */}
      {mode === 'session' && !quizDone && questions.length > 0 && (
        <div>
          <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={reset} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #d0d7e8', background: 'transparent', color: 'var(--text-3)', fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.8rem' }}>← Exit</button>
            <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, color: 'var(--text)', fontSize: '.9rem' }}>{sessionMode === 'practice' ? '📖' : '🧪'} {sessionTitle}</span>
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

      {/* Main Navigation Tabs */}
      {mode === null && (
        <>
          <div style={{ display: 'flex', gap: 0, marginBottom: 18, borderBottom: '1px solid #e8edf5' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ padding: '9px 18px', borderRadius: '9px 9px 0 0', border: 'none', borderBottom: tab === t.id ? '2.5px solid #531697' : '2px solid transparent', background: tab === t.id ? 'rgba(83,22,151,.06)' : 'transparent', color: tab === t.id ? '#531697' : 'var(--text-3)', fontWeight: 700, cursor: 'pointer', fontSize: '.83rem', fontFamily: "'Nunito',sans-serif" }}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'topics' && (
            <div>
              {/* Target Company Banner Matching Screenshot */}
              <TargetCompanySection companyStats={companyStats} onSelectCompany={(cName) => {
                if (cName === 'All Companies') handleStartPractice({ topic: 'Quantitative' });
                else handleStartAICompanyQuiz(cName);
              }} />

              {/* Progress Summary Cards */}
              <div className="card" style={{ padding: '14px 18px', marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {[['🎯','Attempted', progress.totalAttempted], ['✅','Correct', progress.totalCorrect], ['📈','Accuracy', `${progress.accuracy}%`]].map(([ic, l, v]) => (
                  <div key={l} style={{ textAlign: 'center', padding: '8px', background: 'rgba(83,22,151,0.04)', borderRadius: 10 }}>
                    <div style={{ fontSize: '1.2rem' }}>{ic}</div>
                    <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.2rem', color: '#531697' }}>{v}</div>
                    <div style={{ fontSize: '.68rem', color: 'var(--text-3)', fontWeight: 700 }}>{l}</div>
                  </div>
                ))}
              </div>

              {/* Accordion Categories */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.keys(TOPIC_SUBTOPICS).map(cat => {
                  const subs = TOPIC_SUBTOPICS[cat] || [];
                  // Match full topic names from DB (e.g. "Logical Reasoning" for cat="Logical")
                  const fullName = TOPIC_LABELS[cat] || cat;
                  const qCount = topicsData.questionCounts?.[fullName]
                               || topicsData.questionCounts?.[cat]
                               || 0;

                  return (
                    <div key={cat} className="card" style={{ padding: 18 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                          {ICONS[cat] || '❓'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.95rem', color: 'var(--text)' }}>{TOPIC_LABELS[cat] || cat}</div>
                          <div style={{ fontSize: '.68rem', color: '#b0bec9', marginTop: 2 }}>{subs.length} subtopics · {qCount} questions</div>
                        </div>
                        <button onClick={() => handleStartPractice({ topic: fullName })}
                          style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: GRAD, color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '.78rem' }}>
                          Start Practice →
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 7 }}>
                        {subs.map(sub => (
                          <div key={sub} onClick={() => handleStartPractice({ topic: fullName, subtopic: sub })}
                            style={{ padding: '9px 12px', borderRadius: 9, border: '1px solid rgba(19,161,165,0.18)', background: 'rgba(19,161,165,0.04)', cursor: 'pointer', transition: 'all .15s' }}>
                            <div style={{ fontWeight: 700, fontSize: '.8rem', color: 'var(--text)' }}>{sub}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'company' && (
            <div className="card" style={{ padding: 22 }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1rem', color: 'var(--text)', marginBottom: 6 }}>
                🏢 Company Specific AI & Database Quizzes
              </div>
              <p style={{ fontSize: '.82rem', color: 'var(--text-3)', marginBottom: 16 }}>
                Select a target company to generate real exam questions powered by AI or practice saved company papers.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
                {Object.keys(COMPANY_BADGES).map(cName => (
                  <div key={cName} style={{ padding: 16, borderRadius: 12, border: '1.5px solid #e8edf5', background: 'var(--surface)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.8rem', marginBottom: 4 }}>{COMPANY_BADGES[cName].icon}</div>
                    <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.95rem', color: 'var(--text)', marginBottom: 10 }}>{cName}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <button onClick={() => handleStartAICompanyQuiz(cName)}
                        style={{ padding: '8px', borderRadius: 8, border: 'none', background: GRAD, color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '.75rem' }}>
                        🤖 Start AI Quiz
                      </button>
                      <button onClick={() => handleStartPractice({ company: cName })}
                        style={{ padding: '7px', borderRadius: 8, border: '1px solid #d0d7e8', background: 'transparent', color: 'var(--text)', fontWeight: 700, cursor: 'pointer', fontSize: '.75rem' }}>
                        📖 Practice DB Questions
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'bookmarks' && <BookmarksAndNotesTab />}
        </>
      )}
    </div>
  );
}