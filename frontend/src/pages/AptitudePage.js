import React, { useEffect, useState, useCallback } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tk  = () => ({ Authorization:`Bearer ${localStorage.getItem('pragati_token')}` });
const tks = () => ({ ...tk(), 'Content-Type':'application/json' });

const ICONS = { 'Quantitative':'🔢','Logical':'🧩','Verbal':'📖','Technical':'💻','DSA':'🌳','Data Interpretation':'📊','Quantitative Aptitude':'🔢','Logical Reasoning':'🧩','Verbal Ability':'📖','DSA Aptitude':'🌳' };
const DC    = { Easy:'#47d372', Medium:'#f59e0b', Hard:'#ef4444' };
const GRAD  = 'linear-gradient(135deg,#531697,#13a1a5)';

// ── Subtopic metadata: theory + GFG/IndiaBix links ─────────────────────────
const SUBTOPIC_META = {
  /* ── Quantitative Aptitude ──────────────────────────────────────────── */
  'Number System':{
    theory:'Covers divisibility rules, LCM/HCF, prime factorization, unit digits, surds & indices.',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/number-system-gq/',
    indiabix:'https://www.indiabix.com/aptitude/numbers/' },
  'Percentages':{
    theory:'Percentages link to profit/loss, discount, interest. Formula: (Part/Whole)×100.',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/percentages-aptitude-gq/',
    indiabix:'https://www.indiabix.com/aptitude/percentage/' },
  'Profit & Loss':{
    theory:'Profit = SP−CP. Profit% = (Profit/CP)×100. Key: Marked Price and successive discounts.',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/profit-loss-discount-aptitude-gq/',
    indiabix:'https://www.indiabix.com/aptitude/profit-and-loss/' },
  'Simple & Compound Interest':{
    theory:'SI = PRT/100. CI = P(1+r/100)^n − P. Difference CI−SI for 2 yrs = P(r/100)².',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/interest-aptitude-gq/',
    indiabix:'https://www.indiabix.com/aptitude/simple-interest/' },
  'Ratio & Proportion':{
    theory:'a:b = c:d ⟹ ad=bc. Partnership divides profit in ratio of investment × time.',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/ratio-proportion-aptitude-gq/',
    indiabix:'https://www.indiabix.com/aptitude/ratio-and-proportion/' },
  'Averages':{
    theory:'Average = Sum/Count. Weighted average uses proportional weights.',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/averages-aptitude-gq/',
    indiabix:'https://www.indiabix.com/aptitude/average/' },
  'Mixture & Alligation':{
    theory:'Alligation Rule: (Dearer−Mean):(Mean−Cheaper) = ratio of cheaper to dearer.',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/mixture-and-alligation-aptitude-gq/',
    indiabix:'https://www.indiabix.com/aptitude/alligation-or-mixture/' },
  'Time & Work':{
    theory:"If A finishes in n days, A's 1-day work = 1/n. LCM method simplifies multi-person problems.",
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/time-and-work-aptitude-gq/',
    indiabix:'https://www.indiabix.com/aptitude/time-and-work/' },
  'Pipes & Cisterns':{
    theory:'Inlet fills (+ve), outlet drains (−ve). Net rate = sum of all rates.',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/pipes-and-cisterns-aptitude-gq/',
    indiabix:'https://www.indiabix.com/aptitude/pipes-and-cistern/' },
  'Speed, Time & Distance':{
    theory:'Speed = Distance/Time. Average speed = 2S₁S₂/(S₁+S₂) for equal distances.',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/speed-time-distance-aptitude-gq/',
    indiabix:'https://www.indiabix.com/aptitude/time-and-distance/' },
  'Boats & Streams':{
    theory:'Downstream = B+S. Upstream = B−S. Still water = (D+U)/2.',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/boat-and-streams-aptitude-gq/',
    indiabix:'https://www.indiabix.com/aptitude/boats-and-streams/' },
  'Algebra':{
    theory:'Linear/quadratic equations. Sum of roots = −b/a, product = c/a.',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/algebra-aptitude-gq/',
    indiabix:'https://www.indiabix.com/aptitude/problems-on-numbers/' },
  'Progressions':{
    theory:'AP: nth term=a+(n−1)d. GP: nth term=arⁿ⁻¹. HP: reciprocals form AP.',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/progressions-aptitude-gq/',
    indiabix:'https://www.indiabix.com/aptitude/problems-on-numbers/' },
  'Mensuration':{
    theory:'2D: Circle=πr², Triangle=½bh. 3D: Cylinder=πr²h, Cone=πr²h/3, Sphere SA=4πr².',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/mensuration-2d-aptitude-gq/',
    indiabix:'https://www.indiabix.com/aptitude/area/' },
  'Permutation & Combination':{
    theory:'nPr = n!/(n−r)! (order matters). nCr = n!/(r!(n−r)!) (order irrelevant).',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/permutation-and-combinations-aptitude-gq/',
    indiabix:'https://www.indiabix.com/aptitude/permutation-and-combination/' },
  'Probability':{
    theory:'P(E) = Favourable/Total. P(A∪B)=P(A)+P(B)−P(A∩B).',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/probability-aptitude-gq/',
    indiabix:'https://www.indiabix.com/aptitude/probability/' },
  'Clocks':{
    theory:'Minute hand gains 5.5°/min over hour hand. They overlap every 720/11 min.',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/clock-aptitude-gq/',
    indiabix:'https://www.indiabix.com/aptitude/clock/' },
  'Calendars':{
    theory:'Odd days: 1 ordinary year=1, 1 leap year=2. 100 yrs=5 odd days.',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/calendar-aptitude-gq/',
    indiabix:'https://www.indiabix.com/aptitude/calendar/' },
  'Data Interpretation':{
    theory:'Read graphs/tables carefully. For pie charts: segment%×total=value.',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/data-interpretation/',
    indiabix:'https://www.indiabix.com/data-interpretation/table-charts/' },

  /* ── Logical Reasoning ──────────────────────────────────────────────── */
  'Seating Arrangement':{
    theory:'Linear: determine positions from conditions. Circular: fix one person. Draw a diagram first.',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/seating-arrangement-aptitude-gq/',
    indiabix:'https://www.indiabix.com/logical-reasoning/seating-arrangement/' },
  'Blood Relations':{
    theory:'Draw a family tree. Common trick: "pointing to photo" problems — trace step by step.',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/blood-relations-aptitude-gq/',
    indiabix:'https://www.indiabix.com/logical-reasoning/blood-relation-test/' },
  'Direction Sense':{
    theory:'Track N↑ S↓ E→ W← axes. Final displacement = √(h²+v²).',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/direction-sense-aptitude-gq/',
    indiabix:'https://www.indiabix.com/logical-reasoning/direction-sense-test/' },
  'Number Series':{
    theory:'Look for: AP, GP, squares/cubes, alternating series, difference-of-difference patterns.',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/number-series-aptitude-gq/',
    indiabix:'https://www.indiabix.com/logical-reasoning/number-series/' },
  'Letter Series':{
    theory:'Assign A=1…Z=26. Check forward/backward alphabets, alternate positions.',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/letter-series-aptitude-gq/',
    indiabix:'https://www.indiabix.com/logical-reasoning/alphabet-test/' },
  'Alphanumeric Series':{
    theory:'Solve letter and number positions independently, then combine.',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/letter-and-symbol-series/',
    indiabix:'https://www.indiabix.com/logical-reasoning/series-completion/' },
  'Coding-Decoding':{
    theory:'Types: letter shift, reverse alphabet, position-based (A=1,B=2…), word reversal.',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/coding-decoding-aptitude-gq/',
    indiabix:'https://www.indiabix.com/logical-reasoning/coding-decoding/' },
  'Syllogism':{
    theory:'Use Venn diagrams. Conclusions must be 100% certain — avoid assumptions.',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/syllogism-aptitude-gq/',
    indiabix:'https://www.indiabix.com/logical-reasoning/statement-and-conclusion/' },
  'Statements & Conclusions':{
    theory:'A conclusion must logically follow — no external assumptions. Do not over-generalise.',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/statement-and-conclusion-aptitude-gq/',
    indiabix:'https://www.indiabix.com/logical-reasoning/statement-and-conclusion/' },
  'Mirror Images':{
    theory:'Vertical mirror flips left-right. Letters unchanged: A,H,I,M,O,T,U,V,W,X,Y.',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/mirror-images-aptitude-gq/',
    indiabix:'https://www.indiabix.com/non-verbal-reasoning/mirror-images/' },
  'Odd One Out':{
    theory:'Find item that does not belong by category, property, series pattern, or shape.',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/odd-one-out-aptitude-gq/',
    indiabix:'https://www.indiabix.com/verbal-reasoning/classification/' },

  /* ── Verbal Ability ─────────────────────────────────────────────────── */
  'Synonyms & Antonyms':{
    theory:'Build vocab daily. Antonyms: look for prefixes un-, dis-, in-, im-, non-.',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/verbal-ability-gq/',
    indiabix:'https://www.indiabix.com/verbal-ability/synonyms/' },
  'Grammar':{
    theory:'Subject-verb agreement, tenses, articles (a/an/the), prepositions, active/passive voice.',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/grammar-verbal-ability-gq/',
    indiabix:'https://www.indiabix.com/verbal-ability/spotting-errors/' },
  'One Word Substitution':{
    theory:'Learn phobias, -logy (study of), -phile (lover of), government types.',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/one-word-substitution/',
    indiabix:'https://www.indiabix.com/verbal-ability/one-word-substitutes/' },
  'Idioms & Phrases':{
    theory:'Idioms have non-literal meanings. "kick the bucket"=die, "bite the bullet"=endure bravely.',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/idioms-and-phrases/',
    indiabix:'https://www.indiabix.com/verbal-ability/idioms-and-phrases/' },
  'Para Jumbles':{
    theory:'Find opening sentence (no pronoun reference). Look for connectives (however, therefore).',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/verbal-ability-gq/',
    indiabix:'https://www.indiabix.com/verbal-ability/ordering-of-sentences/' },
  'Reading Comprehension':{
    theory:'Read questions first, then passage. Fact-based: answer in text. Inference: logical conclusion.',
    gfg:'https://www.geeksforgeeks.org/aptitude-gq/verbal-ability-gq/',
    indiabix:'https://www.indiabix.com/verbal-ability/comprehension/' },

  /* ── Topic-level groups (for subtopic panel) ────────────────────────── */
  'Verbal Ability':['Synonyms & Antonyms','Grammar','One Word Substitution','Idioms & Phrases','Para Jumbles','Reading Comprehension'],
};

// ── Topic → Subtopics mapping (drives the Practice Mode accordion) ────────────
const TOPIC_SUBTOPICS = {
  'Quantitative': [
    'Number System','Percentages','Profit & Loss','Simple & Compound Interest',
    'Ratio & Proportion','Averages','Mixture & Alligation','Time & Work',
    'Pipes & Cisterns','Speed, Time & Distance','Boats & Streams',
    'Algebra','Progressions','Mensuration','Permutation & Combination',
    'Probability','Clocks','Calendars','Data Interpretation',
  ],
  'Logical': [
    'Seating Arrangement','Blood Relations','Direction Sense','Number Series',
    'Letter Series','Alphanumeric Series','Coding-Decoding','Syllogism',
    'Statements & Conclusions','Mirror Images','Odd One Out',
  ],
  'Verbal': [
    'Synonyms & Antonyms','Grammar','One Word Substitution',
    'Idioms & Phrases','Para Jumbles','Reading Comprehension',
  ],
  'Technical': [
    'C Programming','C++','Java','Python','Data Structures','Algorithms',
    'DBMS','OS Concepts','Computer Networks','OOPs Concepts',
  ],
  'DSA': [
    'Arrays','Linked Lists','Stacks & Queues','Trees','Graphs',
    'Dynamic Programming','Sorting','Searching','Recursion','Hashing',
  ],
};

// Display labels for topics (UI-friendly names)
const TOPIC_LABELS = {
  'Quantitative': 'Quantitative Aptitude',
  'Logical':      'Logical Reasoning',
  'Verbal':       'Verbal Ability',
  'Technical':    'Technical',
  'DSA':          'DSA Aptitude',
};

// ── Shared styles ────────────────────────────────────────────────────────────
const SEL_S = { padding:'9px 12px', borderRadius:9, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.85rem', color:'#3d4e6b', background:'#fff', cursor:'pointer', width:'100%' };
const LBL   = { display:'block', fontSize:'.75rem', fontWeight:800, color:'#3d4e6b', marginBottom:5, fontFamily:"'Syne',sans-serif" };

// ── Subtopic Info Card ───────────────────────────────────────────────────────
function SubtopicInfoCard({ subtopic }) {
  const m = SUBTOPIC_META[subtopic];
  if (!m) return null;
  return (
    <div style={{ padding:'14px 16px', background:'rgba(83,22,151,0.04)', border:'1px solid rgba(83,22,151,0.12)', borderRadius:12, marginBottom:14 }}>
      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.8rem', color:'#531697', marginBottom:6 }}>📖 Theory: {subtopic}</div>
      <div style={{ fontSize:'.82rem', color:'#3d4e6b', lineHeight:1.7, marginBottom:10 }}>{m.theory}</div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <a href={m.gfg} target="_blank" rel="noreferrer" style={{ padding:'5px 12px', borderRadius:8, background:'rgba(46,168,84,0.08)', border:'1px solid rgba(46,168,84,0.2)', color:'#2ea854', fontSize:'.75rem', fontWeight:700, textDecoration:'none' }}>🟢 Practice on GeeksforGeeks →</a>
        <a href={m.indiabix} target="_blank" rel="noreferrer" style={{ padding:'5px 12px', borderRadius:8, background:'rgba(19,161,165,0.08)', border:'1px solid rgba(19,161,165,0.2)', color:'#13a1a5', fontSize:'.75rem', fontWeight:700, textDecoration:'none' }}>📘 Practice on IndiaBix →</a>
      </div>
    </div>
  );
}

// ── Quiz Question ────────────────────────────────────────────────────────────

/* ── Utility: Fisher-Yates shuffle ──────────────────────────────────── */
function fisherYates(arr) {
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}

function shuffleOptions(q) {
  if(!q.options||q.options.length<2) return q;
  return {...q, options: fisherYates(q.options)};
}

/* ── Platform link fallbacks (main topic pages that always exist) ───── */
const TOPIC_FALLBACK_GFG = {
  'Quantitative Aptitude': 'https://www.geeksforgeeks.org/aptitude-questions-and-answers/',
  'Logical Reasoning':     'https://www.geeksforgeeks.org/reasoning-aptitude-questions-and-answers/',
  'Verbal Ability':        'https://www.geeksforgeeks.org/verbal-ability/',
  'Technical':             'https://www.geeksforgeeks.org/technical-aptitude-questions/',
};
const TOPIC_FALLBACK_INDIABIX = {
  'Quantitative Aptitude': 'https://www.indiabix.com/aptitude/questions-and-answers/',
  'Logical Reasoning':     'https://www.indiabix.com/logical-reasoning/questions-and-answers/',
  'Verbal Ability':        'https://www.indiabix.com/verbal-ability/questions-and-answers/',
  'Technical':             'https://www.indiabix.com/technical/questions-and-answers/',
};

function SafeLink({ href, fallback, children, style }) {
  function handleClick(e) {
    // Just open the link normally - browsers handle 404 themselves
    // We add a note in the tooltip
  }
  return (
    <a href={href || fallback} target="_blank" rel="noreferrer"
       title={`Opens ${href ? 'specific subtopic' : 'main topic'} page`}
       style={style} onClick={handleClick}>
      {children}
    </a>
  );
}

function QuizQuestion({ q, idx, total, onAnswer, onFinish, mode }) {
  const [sel, setSel]      = useState(null);
  const [revealed, setRev] = useState(false);
  const [timer, setTimer]  = useState(90);
  const [expired, setExp]  = useState(false);
  const meta = SUBTOPIC_META[q?.subtopic] || {};

  useEffect(() => { setSel(null); setRev(false); setTimer(90); setExp(false); }, [idx]);
  useEffect(() => {
    const t = setInterval(() => setTimer(n => { if (n<=1){setExp(true);clearInterval(t);return 0;} return n-1; }), 1000);
    return () => clearInterval(t);
  }, [idx]);

  function next() {
    onAnswer({ questionId:q._id, topic:q.topic, subtopic:q.subtopic, selectedAnswer:sel||'(skipped)', correct:sel===q.answer, timeSpent:90-timer });
    if (idx >= total-1) onFinish();
  }

  const tc = timer>60?'#47d372':timer>30?'#f59e0b':'#ef4444';
  return (
    <div style={{ maxWidth:680, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ fontSize:'.8rem', fontWeight:700, color:'#7a8ba8' }}>{mode==='practice'?'📖 Practice':'🧪 Quiz'} · Q{idx+1}/{total}</div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <div style={{ height:6, width:160, background:'#f0f3fa', borderRadius:999 }}>
            <div style={{ height:'100%', width:`${((idx+1)/total)*100}%`, background:GRAD, borderRadius:999, transition:'width .3s' }} />
          </div>
          <div style={{ fontWeight:800, color:tc, fontSize:'.88rem', minWidth:34 }}>{timer}s</div>
        </div>
      </div>

      <div className="card" style={{ padding:'22px 24px' }}>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:14 }}>
          <span style={{ padding:'3px 10px', borderRadius:999, background:'rgba(83,22,151,0.08)', color:'#531697', fontSize:'.7rem', fontWeight:700 }}>{ICONS[q.topic]||'❓'} {q.topic}</span>
          {q.subtopic && <span style={{ padding:'3px 10px', borderRadius:999, background:'rgba(19,161,165,0.08)', color:'#13a1a5', fontSize:'.7rem', fontWeight:700 }}>📌 {q.subtopic}</span>}
          <span style={{ padding:'3px 10px', borderRadius:999, background:`${DC[q.difficulty]}15`, color:DC[q.difficulty], fontSize:'.7rem', fontWeight:700 }}>{q.difficulty}</span>
          {[...(Array.isArray(q.companies)?q.companies:q.company?[q.company]:[])].filter(Boolean).slice(0,2).map(c=>(
            <span key={c} style={{ padding:'3px 10px', borderRadius:999, background:'rgba(4,44,93,0.06)', color:'#042c5d', fontSize:'.7rem', fontWeight:700 }}>🏢 {c}</span>
          ))}
        </div>

        <div style={{ fontWeight:700, fontSize:'.97rem', color:'#0f1a2e', lineHeight:1.7, marginBottom:20, whiteSpace:'pre-wrap' }}>{q.question}</div>

        <div style={{ display:'flex', flexDirection:'column', gap:9, marginBottom:16 }}>
          {(q.options||[]).map((opt,i) => {
            let bg='#fafbff', brd='#d0d7e8', col='#3d4e6b';
            if (revealed) { if (opt===q.answer){bg='rgba(71,211,114,0.1)';brd='#47d372';col='#166534';} else if(opt===sel){bg='rgba(239,68,68,0.08)';brd='#ef4444';col='#991b1b';} }
            else if (sel===opt) { bg='rgba(83,22,151,0.08)';brd='#531697';col='#531697'; }
            return (
              <button key={i} onClick={()=>!revealed&&!expired&&setSel(opt)} disabled={revealed||expired}
                style={{ padding:'12px 16px', borderRadius:10, border:`1.5px solid ${brd}`, background:bg, color:col, fontWeight:opt===q.answer&&revealed?800:500, cursor:revealed||expired?'default':'pointer', textAlign:'left', fontFamily:"'Nunito',sans-serif", fontSize:'.88rem', transition:'all .15s', display:'flex', gap:10, alignItems:'center' }}>
                <span style={{ width:22, height:22, borderRadius:'50%', border:`1.5px solid ${brd}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.7rem', fontWeight:800, flexShrink:0 }}>{['A','B','C','D'][i]}</span>
                {opt}
                {revealed&&opt===q.answer&&<span style={{ marginLeft:'auto' }}>✅</span>}
                {revealed&&opt===sel&&opt!==q.answer&&<span style={{ marginLeft:'auto' }}>❌</span>}
              </button>
            );
          })}
        </div>

        {expired&&!revealed&&<div style={{ padding:'9px 12px', background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:8, fontSize:'.82rem', color:'#991b1b', fontWeight:600, marginBottom:12 }}>⏱️ Time's up!</div>}

        {revealed&&q.explanation&&(
          <div style={{ padding:'12px 14px', background:'rgba(83,22,151,0.05)', borderRadius:10, border:'1px solid rgba(83,22,151,0.1)', fontSize:'.82rem', color:'#3d4e6b', lineHeight:1.7, marginBottom:12 }}>
            <strong style={{ color:'#531697' }}>💡 Explanation:</strong> {q.explanation}
          </div>
        )}

        {revealed&&mode==='practice'&&meta.gfg&&(
          <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
            <a href={meta.gfg} target="_blank" rel="noreferrer" style={{ padding:'5px 12px', borderRadius:8, background:'rgba(46,168,84,0.08)', border:'1px solid rgba(46,168,84,0.25)', color:'#2ea854', fontSize:'.75rem', fontWeight:700, textDecoration:'none' }}>🟢 More on GeeksforGeeks →</a>
            <a href={meta.indiabix} target="_blank" rel="noreferrer" style={{ padding:'5px 12px', borderRadius:8, background:'rgba(19,161,165,0.08)', border:'1px solid rgba(19,161,165,0.25)', color:'#13a1a5', fontSize:'.75rem', fontWeight:700, textDecoration:'none' }}>📘 IndiaBix →</a>
          </div>
        )}

        <div style={{ display:'flex', gap:8 }}>
          {!revealed&&(
            <button onClick={()=>{if(sel||expired)setRev(true);}} disabled={!sel&&!expired}
              style={{ flex:1, padding:'11px', borderRadius:10, border:'none', background:(sel||expired)?GRAD:'#d0d7e8', color:'#fff', fontWeight:800, cursor:(sel||expired)?'pointer':'not-allowed', fontFamily:"'Nunito',sans-serif" }}>
              {sel?'✓ Check Answer':'Select an answer'}
            </button>
          )}
          {!revealed&&mode==='practice'&&(
            <button onClick={()=>setRev(true)} style={{ padding:'11px 16px', borderRadius:10, border:'1.5px solid #d0d7e8', background:'transparent', color:'#7a8ba8', fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.82rem' }}>Skip</button>
          )}
          {revealed&&(
            <button onClick={next} style={{ flex:1, padding:'11px', borderRadius:10, border:'none', background:GRAD, color:'#fff', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif" }}>
              {idx<total-1?'Next Question →':'🏁 Finish'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Results ──────────────────────────────────────────────────────────────────
function Results({ answers, title, mode, onRestart }) {
  const correct = answers.filter(a=>a.correct).length;
  const score   = answers.length ? Math.round((correct/answers.length)*100) : 0;
  const col     = score>=70?'#47d372':score>=45?'#f59e0b':'#ef4444';
  const weak    = [...new Set(answers.filter(a=>!a.correct).map(a=>a.subtopic).filter(Boolean))];

  return (
    <div style={{ maxWidth:560, margin:'0 auto' }}>
      <div className="card" style={{ padding:'28px 24px', textAlign:'center', marginBottom:14 }}>
        <div style={{ fontSize:'2.5rem', marginBottom:8 }}>{score>=70?'🏆':score>=45?'👍':'📚'}</div>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'2.8rem', color:col, lineHeight:1 }}>{score}%</div>
        <div style={{ fontWeight:700, color:'#3d4e6b', marginBottom:12, marginTop:4 }}>{correct} / {answers.length} correct · {mode==='practice'?'Practice':'Quiz'} — {title}</div>
        <div style={{ height:8, background:'#f0f3fa', borderRadius:999, marginBottom:16 }}>
          <div style={{ height:'100%', width:`${score}%`, background:`linear-gradient(90deg,${col},#13a1a5)`, borderRadius:999, transition:'width 1s' }} />
        </div>
        <div style={{ fontSize:'.83rem', color:'#7a8ba8', marginBottom:20 }}>
          {score>=70?'Excellent! Strong grip on this topic 💪':score>=45?'Good effort! Review explanations 📖':'Keep practicing — consistency is key! 🔥'}
        </div>
        <button onClick={onRestart} style={{ padding:'11px 28px', borderRadius:10, border:'none', background:GRAD, color:'#fff', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif" }}>← Back to Topics</button>
      </div>

      {weak.length>0&&(
        <div className="card" style={{ padding:'16px 20px' }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.88rem', color:'#0f1a2e', marginBottom:10 }}>📌 Subtopics to Revise</div>
          {weak.map(sub=>{
            const m=SUBTOPIC_META[sub]||{};
            return (
              <div key={sub} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', background:'rgba(239,68,68,0.04)', borderRadius:8, marginBottom:6 }}>
                <span style={{ fontWeight:700, fontSize:'.82rem', color:'#3d4e6b' }}>{sub}</span>
                <div style={{ display:'flex', gap:6 }}>
                  {m.gfg&&<a href={m.gfg} target="_blank" rel="noreferrer" style={{ padding:'3px 8px', borderRadius:6, background:'rgba(46,168,84,0.1)', color:'#2ea854', fontSize:'.7rem', fontWeight:700, textDecoration:'none' }}>GFG →</a>}
                  {m.indiabix&&<a href={m.indiabix} target="_blank" rel="noreferrer" style={{ padding:'3px 8px', borderRadius:6, background:'rgba(19,161,165,0.1)', color:'#13a1a5', fontSize:'.7rem', fontWeight:700, textDecoration:'none' }}>IndiaBix →</a>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Topic Selector — Practice + Quiz Mode ────────────────────────────────────

/* ── Flashcard Stack ────────────────────────────────────────────────────────── */
function FlashcardStack({ subtopic, onStart }) {
  const meta = SUBTOPIC_META[subtopic] || Object.entries(SUBTOPIC_META).find(([k])=>k.toLowerCase()===(subtopic||'').toLowerCase())?.[1];
  

  // Build 3-5 flashcards from the theory text
  const cards = [
    {
      type: 'Definition',
      icon: '📘',
      color: '#531697',
      bgColor: 'rgba(83,22,151,0.05)',
      brdColor: 'rgba(83,22,151,0.15)',
      content: meta.theory,
    },
    {
      type: 'Pro Tip',
      icon: '💡',
      color: '#f59e0b',
      bgColor: 'rgba(245,158,11,0.05)',
      brdColor: 'rgba(245,158,11,0.2)',
      content: meta.theory.includes('Key tip:')
        ? meta.theory.split('Key tip:')[1]?.trim()
        : meta.theory.includes('Key:')
          ? meta.theory.split('Key:')[1]?.trim()
          : 'Practice this topic regularly. Aptitude questions follow repeating patterns — mastering the formula shortcut is key to speed.',
    },
    {
      type: 'Practice Links',
      icon: '🔗',
      color: '#13a1a5',
      bgColor: 'rgba(19,161,165,0.05)',
      brdColor: 'rgba(19,161,165,0.15)',
      content: null, // special card with buttons
    },
  ];

  const [idx, setIdx] = useState(0);
  const [animDir, setAnimDir] = useState(''); // 'left' | 'right'
  if (!meta) return null;
  
  function go(dir) {
    setAnimDir(dir === 1 ? 'left' : 'right');
    setTimeout(() => { setIdx(i => Math.max(0, Math.min(cards.length - 1, i + dir))); setAnimDir(''); }, 150);
  }

  const card = cards[idx];
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.85rem', color:'#0f1a2e' }}>
          📖 Theory: {subtopic}
        </div>
        <span style={{ marginLeft:'auto', fontSize:'.72rem', color:'#b0bec9', fontWeight:600 }}>Card {idx+1} of {cards.length}</span>
      </div>

      {/* Card */}
      <div style={{ padding:'20px 22px', background:card.bgColor, border:`1.5px solid ${card.brdColor}`, borderRadius:14, minHeight:120,
        opacity: animDir ? 0 : 1, transform: animDir === 'left' ? 'translateX(-18px)' : animDir === 'right' ? 'translateX(18px)' : 'none',
        transition:'all .15s ease', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
          <span style={{ fontSize:'1.1rem' }}>{card.icon}</span>
          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.8rem', color:card.color, letterSpacing:'.04em' }}>{card.type.toUpperCase()}</span>
        </div>
        {card.content !== null ? (
          <div style={{ fontSize:'.85rem', color:'#3d4e6b', lineHeight:1.75 }}>{card.content}</div>
        ) : (
          <div>
            <div style={{ fontSize:'.83rem', color:'#3d4e6b', marginBottom:12 }}>Practice this exact topic on trusted platforms with high-quality questions:</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <a href={meta.gfg} target="_blank" rel="noreferrer" style={{ padding:'8px 16px', borderRadius:9, background:'rgba(46,168,84,0.1)', border:'1.5px solid rgba(46,168,84,0.25)', color:'#2ea854', fontSize:'.82rem', fontWeight:800, textDecoration:'none', display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:'1.1rem' }}>🟢</span> Practice on GeeksforGeeks →
              </a>
              <a href={meta.indiabix} target="_blank" rel="noreferrer" style={{ padding:'8px 16px', borderRadius:9, background:'rgba(19,161,165,0.1)', border:'1.5px solid rgba(19,161,165,0.25)', color:'#13a1a5', fontSize:'.82rem', fontWeight:800, textDecoration:'none', display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:'1.1rem' }}>📘</span> Practice on IndiaBix →
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Card nav */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
        <button onClick={()=>go(-1)} disabled={idx===0} style={{ padding:'7px 14px', borderRadius:8, border:'1.5px solid #d0d7e8', background:idx===0?'transparent':'#fafbff', color:idx===0?'#d0d7e8':'#531697', fontWeight:700, cursor:idx===0?'not-allowed':'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.8rem' }}>← Prev</button>
        <div style={{ flex:1, display:'flex', justifyContent:'center', gap:5 }}>
          {cards.map((_,i)=><div key={i} style={{ width:i===idx?18:7, height:7, borderRadius:999, background:i===idx?'#531697':'#d0d7e8', transition:'width .2s' }} />)}
        </div>
        <button onClick={()=>go(1)} disabled={idx===cards.length-1} style={{ padding:'7px 14px', borderRadius:8, border:'1.5px solid #d0d7e8', background:idx===cards.length-1?'transparent':'#fafbff', color:idx===cards.length-1?'#d0d7e8':'#531697', fontWeight:700, cursor:idx===cards.length-1?'not-allowed':'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.8rem' }}>Next →</button>
      </div>

      <button onClick={onStart}
        style={{ width:'100%', padding:'13px', borderRadius:11, border:'none', background:GRAD, color:'#fff', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.95rem', boxShadow:'0 4px 15px rgba(83,22,151,0.25)' }}>
        🚀 Start Practice: {subtopic}
      </button>
    </div>
  );
}

/* ── Topic Selector (new structured flow) ─────────────────────────────────── */
function TopicSelector({ topicsData, stats, progress, onStartPractice, onStartQuiz }) {
  const [mode, setMode]           = useState('practice');
  const [selCategory, setSelCat]  = useState('');   // e.g. 'Quantitative'
  const [selSubtopic, setSelSub]  = useState('');   // e.g. 'Percentages'
  const [showFlashcards, setShowFC] = useState(false);
  const [quizTopics, setQTopics]  = useState([]);
  const [quizDiff, setQDiff]      = useState('All');
  const [quizCount, setQCount]    = useState(20);
  const [search, setSearch]       = useState('');

  const categories = Object.keys(TOPIC_SUBTOPICS);

  // Stats lookup: accuracy for a subtopic (from topic-level stats)
  function subtopicProgress(topicName) {
    const s = stats.find(x => x.topic === topicName);
    return s ? Math.round((s.accuracy || 0) * 100) : null;
  }

  // Per-subtopic progress (more accurate than category-level)
  function subtopicPct(subtopicName) {
    // stats may have per-subtopic entries if the API returns them
    const s = stats.find(x => x.subtopic === subtopicName || x.topic === subtopicName);
    return s ? Math.round((s.accuracy || 0) * 100) : null;
  }

  const toggleQT = t => setQTopics(p => p.includes(t) ? p.filter(x=>x!==t) : [...p,t]);

  // Search: filter all subtopics
  const allSubtopics = Object.entries(TOPIC_SUBTOPICS).flatMap(([cat, subs]) => subs.map(s => ({ cat, sub: s })));
  const searchResults = search.trim().length > 0
    ? allSubtopics.filter(({ sub }) => sub.toLowerCase().includes(search.toLowerCase()))
    : [];

  function handleSelectSub(cat, sub) {
    setSelCat(cat); setSelSub(sub); setShowFC(true); setSearch('');
  }

  return (
    <div>
      {/* Progress summary */}
      {progress.totalAttempted > 0 && (
        <div className="card" style={{ padding:'14px 18px', marginBottom:16, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          {[['🎯','Attempted',progress.totalAttempted],['✅','Correct',progress.totalCorrect],['📈','Accuracy',`${progress.accuracy}%`]].map(([ic,l,v])=>(
            <div key={l} style={{ textAlign:'center', padding:'8px', background:'rgba(83,22,151,0.04)', borderRadius:10 }}>
              <div style={{ fontSize:'1.2rem' }}>{ic}</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.2rem', color:'#531697' }}>{v}</div>
              <div style={{ fontSize:'.68rem', color:'#7a8ba8', fontWeight:700 }}>{l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Mode switcher */}
      <div style={{ display:'flex', gap:0, marginBottom:20, borderRadius:12, overflow:'hidden', border:'1.5px solid rgba(83,22,151,0.2)' }}>
        {[['practice','📖 Practice Mode'],['quiz','🧪 Quiz Mode']].map(([m,label])=>(
          <button key={m} onClick={()=>{setMode(m);setSelCat('');setSelSub('');setShowFC(false);setQTopics([]);setSearch('');}}
            style={{ flex:1, padding:'12px', border:'none', background:mode===m?GRAD:'transparent', color:mode===m?'#fff':'#531697', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.87rem', transition:'all .2s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── PRACTICE MODE ──────────────────────────────────────────────────── */}
      {mode === 'practice' && (
        <div>
          {/* Search bar */}
          <div style={{ position:'relative', marginBottom:16 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="🔍 Search topic (e.g. Time and Work, Blood Relations…)"
              style={{ width:'100%', padding:'11px 16px', borderRadius:10, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.88rem', outline:'none', boxSizing:'border-box' }} />
            {searchResults.length > 0 && (
              <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', borderRadius:10, boxShadow:'0 8px 30px rgba(4,44,93,0.12)', border:'1px solid #e8edf5', zIndex:20, maxHeight:240, overflowY:'auto', marginTop:4 }}>
                {searchResults.map(({ cat, sub }) => {
                  const pct = subtopicPct(sub);
                  return (
                    <div key={sub} onClick={()=>handleSelectSub(cat, sub)} style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid #f0f3fa', display:'flex', alignItems:'center', gap:10 }}
                      onMouseOver={e=>e.currentTarget.style.background='rgba(83,22,151,0.05)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                      <span style={{ fontSize:'.8rem' }}>{ICONS[cat]||'❓'}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:'.82rem', color:'#0f1a2e' }}>{sub}</div>
                        <div style={{ fontSize:'.65rem', color:'#b0bec9' }}>{cat}</div>
                      </div>
                      {pct !== null && <span style={{ fontSize:'.68rem', fontWeight:700, color: pct>=70?'#47d372':pct>=45?'#f59e0b':'#ef4444' }}>{pct}%</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Flashcard view */}
          {showFlashcards && selSubtopic ? (
            <div className="card" style={{ padding:'20px 22px' }}>
              <button onClick={()=>{setShowFC(false);}} style={{ marginBottom:14, padding:'5px 12px', borderRadius:8, border:'1px solid #d0d7e8', background:'transparent', color:'#7a8ba8', fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.8rem' }}>← Back to Topics</button>
              <FlashcardStack subtopic={selSubtopic} onStart={()=>{ if(!selCategory){alert('Please select a category first.');return;} onStartPractice({topic:selCategory, subtopic:selSubtopic, shuffle:false}); }} />
            </div>
          ) : (
            /* Category accordion */
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {categories.map(cat => {
                const isOpen = selCategory === cat;
                const subs = TOPIC_SUBTOPICS[cat] || [];
                const catPct = subtopicProgress(cat);
                const qCount = topicsData.questionCounts?.[cat] || 0;
                return (
                  <div key={cat} className="card" style={{ padding:0, overflow:'hidden' }}>
                    {/* Category header */}
                    <button onClick={()=>setSelCat(isOpen?'':cat)}
                      style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 18px', border:'none', background:'transparent', cursor:'pointer', textAlign:'left', fontFamily:"'Nunito',sans-serif" }}>
                      <div style={{ width:40, height:40, borderRadius:10, background:GRAD, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', flexShrink:0 }}>
                        {ICONS[cat]||'❓'}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.92rem', color:'#0f1a2e' }}>{TOPIC_LABELS[cat]||cat}</div>
                        <div style={{ fontSize:'.68rem', color:'#b0bec9', marginTop:2 }}>{subs.length} subtopics · {qCount} questions</div>
                      </div>
                      {catPct !== null && (
                        <div style={{ flexShrink:0, textAlign:'right', marginRight:8 }}>
                          <div style={{ fontWeight:800, fontSize:'.82rem', color: catPct>=70?'#47d372':catPct>=45?'#f59e0b':'#ef4444' }}>{catPct}%</div>
                          <div style={{ fontSize:'.6rem', color:'#b0bec9' }}>mastered</div>
                        </div>
                      )}
                      <span style={{ color:'#531697', fontWeight:800, fontSize:'1rem', flexShrink:0, transition:'transform .2s', display:'inline-block', transform:isOpen?'rotate(180deg)':'none' }}>⌄</span>
                    </button>

                    {/* Subtopic list */}
                    {isOpen && (
                      <div style={{ padding:'0 14px 14px' }}>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:7 }}>
                          {subs.map(sub => {
                            const m = SUBTOPIC_META[sub] || Object.entries(SUBTOPIC_META).find(([k])=>k.toLowerCase()===((sub||'').toLowerCase()))?.[1];
                            const pct = subtopicPct(sub);
                            return (
                              <div key={sub} onClick={()=>handleSelectSub(cat, sub)}
                                style={{ padding:'10px 12px', borderRadius:10, border:'1.5px solid rgba(19,161,165,0.18)', background:'rgba(19,161,165,0.04)', cursor:'pointer', transition:'all .15s' }}
                                onMouseOver={e=>{e.currentTarget.style.borderColor='#13a1a5';e.currentTarget.style.background='rgba(19,161,165,0.09)';}}
                                onMouseOut={e=>{e.currentTarget.style.borderColor='rgba(19,161,165,0.18)';e.currentTarget.style.background='rgba(19,161,165,0.04)';}}>
                                <div style={{ fontWeight:700, fontSize:'.8rem', color:'#0f1a2e', marginBottom:5 }}>{sub}</div>
                                {/* Progress bar */}
                                <div style={{ height:4, background:'#e8f5f5', borderRadius:999, marginBottom:6 }}>
                                  <div style={{ height:'100%', width:`${pct || 0}%`, background:pct>=70?'#47d372':pct>=45?'#f59e0b':'#13a1a5', borderRadius:999, transition:'width .8s' }} />
                                </div>
                                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                                  {pct !== null ? <span style={{ fontSize:'.62rem', color:pct>=70?'#47d372':pct>=45?'#f59e0b':'#b0bec9', fontWeight:700 }}>{pct}% done</span> : <span style={{ fontSize:'.62rem', color:'#b0bec9' }}>Not started</span>}
                                  <div style={{ display:'flex', gap:4 }}>
                                    {m?.gfg && <a href={m.gfg} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{ fontSize:'.6rem', color:'#2ea854', fontWeight:800, padding:'1px 5px', borderRadius:4, background:'rgba(46,168,84,0.1)' }}>GFG</a>}
                                    {m?.indiabix && <a href={m.indiabix} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{ fontSize:'.6rem', color:'#13a1a5', fontWeight:800, padding:'1px 5px', borderRadius:4, background:'rgba(19,161,165,0.1)' }}>IB</a>}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {/* Start all */}
                        <button onClick={()=>onStartPractice({topic:cat, subtopic:'', shuffle:true, count:20})}
                          style={{ marginTop:12, width:'100%', padding:'11px', borderRadius:10, border:'none', background:GRAD, color:'#fff', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.85rem' }}>
                          🔀 Start Shuffled Practice: All {TOPIC_LABELS[cat]||cat}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── QUIZ MODE ─────────────────────────────────────────────────────── */}
      {mode === 'quiz' && (
        <div className="card" style={{ padding:'20px 22px' }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', color:'#0f1a2e', marginBottom:6 }}>🧪 Quiz Mode</div>
          <p style={{ fontSize:'.82rem', color:'#7a8ba8', marginBottom:16, lineHeight:1.6 }}>Select topics, set difficulty, and get a timed auto-generated quiz.</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))', gap:8, marginBottom:14 }}>
            {(topicsData.topics||Object.keys(TOPIC_SUBTOPICS)).map(t=>{
              const chosen = quizTopics.includes(t);
              return (
                <button key={t} onClick={()=>toggleQT(t)}
                  style={{ padding:'10px 14px', borderRadius:10, border:`1.5px solid ${chosen?'#531697':'#d0d7e8'}`, background:chosen?'rgba(83,22,151,0.08)':'#fafbff', color:chosen?'#531697':'#3d4e6b', fontWeight:700, cursor:'pointer', textAlign:'left', fontFamily:"'Nunito',sans-serif", fontSize:'.82rem', transition:'all .15s' }}>
                  <div style={{ fontSize:'1.2rem', marginBottom:3 }}>{ICONS[t]||'❓'}</div>
                  <div>{t}</div>
                  <div style={{ fontSize:'.68rem', color:chosen?'#531697':'#b0bec9', marginTop:2 }}>{topicsData.questionCounts?.[t]||0} Qs</div>
                </button>
              );
            })}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
            <div>
              <label style={{ display:'block', fontSize:'.75rem', fontWeight:800, color:'#3d4e6b', marginBottom:5, fontFamily:"'Syne',sans-serif" }}>Difficulty</label>
              <select style={SEL_S} value={quizDiff} onChange={e=>setQDiff(e.target.value)}>
                <option value="All">All Levels</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            <div>
              <label style={{ display:'block', fontSize:'.75rem', fontWeight:800, color:'#3d4e6b', marginBottom:5, fontFamily:"'Syne',sans-serif" }}>Number of Questions</label>
              <select style={SEL_S} value={quizCount} onChange={e=>setQCount(Number(e.target.value))}>
                {[10,15,20,25,30].map(n=><option key={n} value={n}>{n} Questions</option>)}
              </select>
            </div>
          </div>
          {quizTopics.length > 0 && (
            <div style={{ padding:'10px 14px', background:'rgba(83,22,151,0.04)', borderRadius:9, marginBottom:14, fontSize:'.8rem', color:'#531697', fontWeight:600 }}>
              📋 Quiz: {quizTopics.join(' + ')} · {quizCount} questions · {quizDiff} difficulty
            </div>
          )}
          <button disabled={quizTopics.length===0} onClick={()=>onStartQuiz({topics:quizTopics,difficulty:quizDiff,count:quizCount})}
            style={{ width:'100%', padding:'13px', borderRadius:11, border:'none', background:quizTopics.length?GRAD:'#d0d7e8', color:'#fff', fontWeight:800, cursor:quizTopics.length?'pointer':'not-allowed', fontFamily:"'Nunito',sans-serif", fontSize:'.92rem' }}>
            {quizTopics.length?`🧪 Generate Quiz (${quizCount} Questions)`:'Select at least one topic'}
          </button>
        </div>
      )}
    </div>
  );
}


// ── Browse Tab ───────────────────────────────────────────────────────────────
function BrowseTab({ topicsData }) {
  const [questions, setQ]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [pages, setPages]     = useState(1);
  const [loading, setLoad]    = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [companies, setCos]   = useState([]);
  const [expanded, setExp]    = useState(null);
  const [filters, setFilters] = useState({ topic:'All', subtopic:'All', company:'All', difficulty:'All', search:'' });

  const fetchQ = useCallback(async(f,pg)=>{
    setLoad(true);
    const p=new URLSearchParams({page:pg||1,limit:15});
    if(f.topic!=='All')p.set('topic',f.topic);
    if(f.subtopic!=='All')p.set('subtopic',f.subtopic);
    if(f.company!=='All')p.set('company',f.company);
    if(f.difficulty!=='All')p.set('difficulty',f.difficulty);
    if(f.search)p.set('search',f.search);
    try{const d=await fetch(`${API}/aptitude?${p}`,{headers:tk()}).then(r=>r.json());setQ(d.questions||[]);setTotal(d.total||0);setPages(d.pages||1);}
    finally{setLoad(false);}
  },[]);

  useEffect(()=>{fetchQ(filters,page);},[filters,page,fetchQ]);
  useEffect(()=>{
    fetch(`${API}/aptitude/companies`,{headers:tk()}).then(r=>r.json()).then(d=>setCos(d.companies||[]));
    fetch(`${API}/aptitude/bookmarks`,{headers:tk()}).then(r=>r.json()).then(d=>setBookmarks(d.ids||[]));
  },[]);

  async function toggleBM(id){const d=await fetch(`${API}/aptitude/bookmark/${id}`,{method:'POST',headers:tk()}).then(r=>r.json());setBookmarks(b=>d.bookmarked?[...b,id]:b.filter(i=>i!==id));}
  const setF=(k,v)=>{setFilters(f=>({...f,[k]:v,...(k==='topic'?{subtopic:'All'}:{})}));setPage(1);};
  const subtopics=filters.topic!=='All'?(TOPIC_SUBTOPICS[filters.topic]||topicsData.subtopicMap?.[filters.topic]||[]).filter(Boolean):[];
  const SS={padding:'7px 10px',borderRadius:8,border:'1.5px solid #d0d7e8',fontFamily:"'Nunito',sans-serif",fontSize:'.78rem',fontWeight:700,color:'#3d4e6b',background:'#fff',cursor:'pointer'};

  return (
    <div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14, alignItems:'center' }}>
        <input value={filters.search} onChange={e=>setF('search',e.target.value)} placeholder="🔍 Search questions…"
          style={{ padding:'7px 12px', borderRadius:8, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.82rem', flex:1, minWidth:160, outline:'none' }} />
        <select style={SS} value={filters.topic} onChange={e=>setF('topic',e.target.value)}>
          <option value="All">All Topics</option>
          {(topicsData.topics||[]).map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        {subtopics.length>0&&(
          <select style={SS} value={filters.subtopic} onChange={e=>setF('subtopic',e.target.value)}>
            <option value="All">All Subtopics</option>
            {subtopics.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <select style={SS} value={filters.company} onChange={e=>setF('company',e.target.value)}>
          <option value="All">All Companies</option>
          {companies.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select style={SS} value={filters.difficulty} onChange={e=>setF('difficulty',e.target.value)}>
          <option value="All">All Levels</option>
          {['Easy','Medium','Hard'].map(d=><option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div style={{ fontSize:'.73rem', color:'#b0bec9', marginBottom:10 }}>Showing {questions.length} of {total} questions</div>

      {filters.subtopic!=='All'&&<SubtopicInfoCard subtopic={filters.subtopic} />}
      {filters.topic!=='All'&&filters.subtopic==='All'&&(
        <div style={{ padding:'12px 16px', background:'rgba(83,22,151,0.04)', border:'1px solid rgba(83,22,151,0.1)', borderRadius:10, marginBottom:14 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.8rem', color:'#531697', marginBottom:6 }}>📚 Subtopics in {filters.topic}</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
            {subtopics.map(s=>{
              const m=SUBTOPIC_META[s];
              return (
                <div key={s} style={{ display:'flex', alignItems:'center', gap:3 }}>
                  <button onClick={()=>setF('subtopic',s)} style={{ padding:'3px 9px', borderRadius:7, border:'1px solid rgba(19,161,165,0.25)', background:'rgba(19,161,165,0.06)', color:'#13a1a5', fontSize:'.7rem', fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif" }}>{s}</button>
                  {m?.gfg&&<a href={m.gfg} target="_blank" rel="noreferrer" style={{ fontSize:'.62rem', color:'#2ea854', fontWeight:700, textDecoration:'none' }}>GFG</a>}
                  {m?.indiabix&&<a href={m.indiabix} target="_blank" rel="noreferrer" style={{ fontSize:'.62rem', color:'#13a1a5', fontWeight:700, textDecoration:'none' }}>IB</a>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading&&<div style={{ textAlign:'center', padding:30, color:'#b0bec9' }}>Loading…</div>}
      {!loading&&questions.map(q=>{
        const isOpen=expanded===q._id;
        const qMeta=SUBTOPIC_META[q.subtopic]||Object.entries(SUBTOPIC_META).find(([k])=>k.toLowerCase()===(q.subtopic||'').toLowerCase())?.[1]||{};
        return (
          <div key={q._id} className="card" style={{ padding:'14px 18px', marginBottom:10 }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:7 }}>
                  <span style={{ padding:'2px 8px', borderRadius:999, background:'rgba(83,22,151,0.07)', color:'#531697', fontSize:'.67rem', fontWeight:700 }}>{ICONS[q.topic]||'❓'} {q.topic}</span>
                  {q.subtopic&&<span style={{ padding:'2px 8px', borderRadius:999, background:'rgba(19,161,165,0.07)', color:'#13a1a5', fontSize:'.67rem', fontWeight:700 }}>📌 {q.subtopic}</span>}
                  <span style={{ padding:'2px 8px', borderRadius:999, background:`${DC[q.difficulty]}15`, color:DC[q.difficulty], fontSize:'.67rem', fontWeight:700 }}>{q.difficulty}</span>
                  {[...(Array.isArray(q.companies)?q.companies:q.company?[q.company]:[])].filter(Boolean).map(c=>(
                    <span key={c} style={{ padding:'2px 8px', borderRadius:999, background:'rgba(4,44,93,0.06)', color:'#042c5d', fontSize:'.67rem', fontWeight:700 }}>🏢 {c}</span>
                  ))}
                </div>
                <div style={{ fontWeight:600, fontSize:'.87rem', color:'#0f1a2e', lineHeight:1.65 }}>{q.question}</div>
              </div>
              <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                {/* GFG link - falls back to main topic page if subtopic link fails */}
                <SafeLink
                  href={qMeta.gfg}
                  fallback={TOPIC_FALLBACK_GFG[q.topic] || 'https://www.geeksforgeeks.org/aptitude-questions-and-answers/'}
                  style={{ padding:'5px 9px', borderRadius:8, background:'rgba(46,168,84,0.08)', color:'#2ea854', fontWeight:800, fontSize:'.72rem', textDecoration:'none', border:'1px solid rgba(46,168,84,0.2)' }}>
                  GFG →
                </SafeLink>
                <SafeLink
                  href={qMeta.indiabix}
                  fallback={TOPIC_FALLBACK_INDIABIX[q.topic] || 'https://www.indiabix.com/aptitude/questions-and-answers/'}
                  style={{ padding:'5px 9px', borderRadius:8, background:'rgba(19,161,165,0.08)', color:'#13a1a5', fontWeight:800, fontSize:'.72rem', textDecoration:'none', border:'1px solid rgba(19,161,165,0.2)' }}>
                  IndiaBix →
                </SafeLink>
                <button onClick={()=>setExp(isOpen?null:q._id)} style={{ padding:'5px 10px', borderRadius:8, border:'1.5px solid #d0d7e8', background:isOpen?'rgba(83,22,151,0.06)':'transparent', color:'#531697', cursor:'pointer', fontSize:'.75rem', fontWeight:700 }}>{isOpen?'Hide':'View'}</button>
                <button onClick={()=>toggleBM(q._id)} style={{ padding:'5px 9px', borderRadius:8, border:'1.5px solid #d0d7e8', background:bookmarks.includes(q._id)?'rgba(245,158,11,0.08)':'transparent', color:bookmarks.includes(q._id)?'#f59e0b':'#b0bec9', cursor:'pointer', fontSize:'1rem' }}>{bookmarks.includes(q._id)?'🔖':'☆'}</button>
              </div>
            </div>
            {isOpen&&(
              <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid #f0f3fa' }}>
                {fisherYates(q.options||[]).map((opt,i)=>(
                  <div key={i} style={{ padding:'6px 10px', borderRadius:7, marginBottom:4, fontSize:'.83rem', background:opt===q.answer?'rgba(71,211,114,0.09)':'transparent', color:opt===q.answer?'#166534':'#3d4e6b', fontWeight:opt===q.answer?700:400 }}>
                    {opt===q.answer?'✅':'○'} {opt}
                  </div>
                ))}
                {q.explanation&&<div style={{ marginTop:8, padding:'10px 12px', background:'rgba(83,22,151,0.05)', borderRadius:8, fontSize:'.8rem', color:'#3d4e6b', lineHeight:1.65 }}><strong style={{ color:'#531697' }}>💡</strong> {q.explanation}</div>}
                {qMeta.gfg&&(
                  <div style={{ marginTop:8, display:'flex', gap:6 }}>
                    <SafeLink href={qMeta.gfg} fallback={TOPIC_FALLBACK_GFG[q.topic]||'https://www.geeksforgeeks.org/aptitude-questions-and-answers/'} style={{ padding:'4px 9px', borderRadius:6, background:'rgba(46,168,84,0.08)', color:'#2ea854', fontSize:'.72rem', fontWeight:700, textDecoration:'none' }}>🟢 More on GFG →</SafeLink>
                    <SafeLink href={qMeta.indiabix} fallback={TOPIC_FALLBACK_INDIABIX[q.topic]||'https://www.indiabix.com/aptitude/questions-and-answers/'} style={{ padding:'4px 9px', borderRadius:6, background:'rgba(19,161,165,0.08)', color:'#13a1a5', fontSize:'.72rem', fontWeight:700, textDecoration:'none' }}>📘 IndiaBix →</SafeLink>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      {!loading&&questions.length===0&&<div style={{ textAlign:'center', padding:40, color:'#b0bec9' }}>No questions match your filters.</div>}
      {pages>1&&(
        <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:16 }}>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{ padding:'6px 14px', borderRadius:8, border:'1px solid #d0d7e8', background:'transparent', color:'#531697', fontWeight:700, cursor:page===1?'not-allowed':'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.78rem' }}>← Prev</button>
          <span style={{ padding:'6px 14px', fontSize:'.78rem', fontWeight:700, color:'#7a8ba8' }}>Page {page} of {pages}</span>
          <button onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages} style={{ padding:'6px 14px', borderRadius:8, border:'1px solid #d0d7e8', background:'transparent', color:'#531697', fontWeight:700, cursor:page===pages?'not-allowed':'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.78rem' }}>Next →</button>
        </div>
      )}
    </div>
  );
}

// ── Bookmarks Tab ────────────────────────────────────────────────────────────
function BookmarksTab() {
  const [bookmarks, setBMs] = useState([]);
  const [loading, setLoad]  = useState(true);
  useEffect(()=>{ fetch(`${API}/aptitude/bookmarks`,{headers:tk()}).then(r=>r.json()).then(d=>setBMs(d.bookmarks||[])).finally(()=>setLoad(false)); },[]);
  async function remove(id){ await fetch(`${API}/aptitude/bookmark/${id}`,{method:'POST',headers:tk()}); setBMs(bs=>bs.filter(b=>b.questionId?._id!==id&&b.questionId!==id)); }
  if(loading) return <div style={{ textAlign:'center', padding:40, color:'#b0bec9' }}>Loading…</div>;
  if(!bookmarks.length) return <div style={{ textAlign:'center', padding:40, color:'#b0bec9' }}>No bookmarks yet — browse questions and click ☆ to save.</div>;
  return (
    <div>
      {bookmarks.map(b=>{ const q=b.questionId; if(!q) return null; const m=SUBTOPIC_META[q.subtopic]||{}; return (
        <div key={b._id} className="card" style={{ padding:'14px 18px', marginBottom:10 }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:6 }}>
                <span style={{ padding:'2px 8px', borderRadius:999, background:'rgba(83,22,151,0.07)', color:'#531697', fontSize:'.67rem', fontWeight:700 }}>{ICONS[q.topic]||'❓'} {q.topic}</span>
                {q.subtopic&&<span style={{ padding:'2px 8px', borderRadius:999, background:'rgba(19,161,165,0.07)', color:'#13a1a5', fontSize:'.67rem', fontWeight:700 }}>📌 {q.subtopic}</span>}
                <span style={{ padding:'2px 8px', borderRadius:999, background:`${DC[q.difficulty]}15`, color:DC[q.difficulty], fontSize:'.67rem', fontWeight:700 }}>{q.difficulty}</span>
              </div>
              <div style={{ fontWeight:600, fontSize:'.87rem', color:'#0f1a2e', lineHeight:1.65 }}>{q.question}</div>
              {q.explanation&&<div style={{ marginTop:6, fontSize:'.78rem', color:'#7a8ba8', lineHeight:1.55 }}>💡 {q.explanation}</div>}
              {m.gfg&&<div style={{ marginTop:8, display:'flex', gap:6 }}><a href={m.gfg} target="_blank" rel="noreferrer" style={{ padding:'3px 8px', borderRadius:6, background:'rgba(46,168,84,0.08)', color:'#2ea854', fontSize:'.7rem', fontWeight:700, textDecoration:'none' }}>🟢 GFG →</a><a href={m.indiabix} target="_blank" rel="noreferrer" style={{ padding:'3px 8px', borderRadius:6, background:'rgba(19,161,165,0.08)', color:'#13a1a5', fontSize:'.7rem', fontWeight:700, textDecoration:'none' }}>📘 IndiaBix →</a></div>}
            </div>
            <button onClick={()=>remove(q._id)} style={{ padding:'5px 10px', borderRadius:8, border:'none', background:'rgba(239,68,68,0.08)', color:'#ef4444', cursor:'pointer', fontSize:'.78rem', fontWeight:700, flexShrink:0 }}>Remove</button>
          </div>
        </div>
      ); })}
    </div>
  );
}

// ── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar({ stats, totalAttempted, totalCorrect, accuracy }) {
  if (!stats?.length) return null;
  return (
    <div className="card" style={{ padding:'14px 18px', marginBottom:14 }}>
      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.85rem', marginBottom:8, color:'#0f1a2e' }}>📊 Your Progress</div>
      {stats.map(s=>{
        // API returns accuracy as 0-100 (already a percentage), NOT 0-1 decimal
        const pct = Math.min(100, Math.max(0, Math.round(s.accuracy||0)));
        const col = pct>=70?'#47d372':pct>=45?'#f59e0b':'#ef4444';
        return (
          <div key={s.topic} style={{ marginBottom:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.72rem', fontWeight:700, color:'#3d4e6b', marginBottom:3 }}>
              <span>{ICONS[s.topic]||''} {TOPIC_LABELS[s.topic]||s.topic}</span>
              <span style={{ color:col }}>{pct}% ({s.correct}/{s.total})</span>
            </div>
            <div style={{ height:5, background:'#f0f3fa', borderRadius:999, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:col, borderRadius:999, transition:'width .9s' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AptitudePage() {
  const [tab, setTab]           = useState('topics');
  const [topicsData, setTopics] = useState({ topics:[], questionCounts:{}, subtopicMap:{}, userLevel:'Easy' });
  const [stats, setStats]       = useState([]);
  const [progress, setProgress] = useState({ totalAttempted:0, totalCorrect:0, accuracy:0 });
  const [loading, setLoad]      = useState(true);
  const [mode, setMode]         = useState(null); // null | 'session'
  const [questions, setQ]       = useState([]);
  const [qIdx, setQIdx]         = useState(0);
  const [answers, setAnswers]   = useState([]);
  const [quizDone, setDone]     = useState(false);
  const [sessionTitle, setTitle] = useState('');
  const [sessionMode, setSMode] = useState('practice');

  useEffect(()=>{
    Promise.all([
      fetch(`${API}/aptitude/topics`,{headers:tk()}).then(r=>r.json()),
      fetch(`${API}/aptitude/stats`,{headers:tk()}).then(r=>r.json()),
    ]).then(([t,s])=>{
      setTopics(t||{topics:[],questionCounts:{},subtopicMap:{},userLevel:'Easy'});
      setStats(s.stats||[]);
      setProgress({totalAttempted:s.totalAttempted||0,totalCorrect:s.totalCorrect||0,accuracy:s.accuracy||0});
    }).catch(()=>{}).finally(()=>setLoad(false));
  },[]);

  async function fetchQuestions({ topic, subtopic, shuffle, difficulty, topics, count }) {
    setLoad(true);
    try {
      const params=new URLSearchParams({ limit: count || 20 });
      if(topic)params.set('topic',topic);
      if(subtopic)params.set('subtopic',subtopic);
      if(difficulty&&difficulty!=='All')params.set('difficulty',difficulty);
      if(topics?.length>=1)params.set('topics',topics.join(','));
      const d=await fetch(`${API}/aptitude/set?${params}`,{headers:tk()}).then(r=>r.json());
      if(!d.questions?.length) return [];
      return (d.questions||[]).map(shuffleOptions);
    } catch(e){return[];} finally{setLoad(false);}
  }

  async function handleStartPractice({topic,subtopic,shuffle,count}){
    // Try with subtopic first, fall back to topic-only if no results
    let qs = await fetchQuestions({topic, subtopic, shuffle, count: count||20});
    if(!qs.length && subtopic){
      // Subtopic name might not exactly match DB — try topic-only
      qs = await fetchQuestions({topic, subtopic:'', shuffle: true, count: count||20});
    }
    if(!qs.length){
      alert('No questions found for this topic. Please try another topic or ask your admin to seed questions.');
      return;
    }
    setQ(qs);setQIdx(0);setAnswers([]);setDone(false);setTitle(subtopic||topic);setSMode('practice');setMode('session');
  }

  async function handleStartQuiz({topics,difficulty,count}){
    const qs=await fetchQuestions({topics,difficulty,count,shuffle:true});
    if(!qs.length){alert('No questions found. Try selecting more topics or seeding questions.');return;}
    setQ(qs);setQIdx(0);setAnswers([]);setDone(false);setTitle(topics.join(' + '));setSMode('quiz');setMode('session');
  }

  function handleAnswer(ans){setAnswers(a=>[...a,ans]);setQIdx(i=>i+1);}
  async function handleFinish(){
    setDone(true);
    try{await fetch(`${API}/aptitude/submit`,{method:'POST',headers:tks(),body:JSON.stringify({answers})});}catch(e){}
  }
  function reset(){setMode(null);setQ([]);setAnswers([]);setDone(false);setTab('topics');}

  const TABS=[{id:'topics',label:'🎯 Practice & Quiz'},{id:'browse',label:'🔍 Browse All'},{id:'bookmarks',label:'🔖 Bookmarks'}];

  if(loading&&!mode) return (
    <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
      <div style={{ width:36, height:36, border:'3px solid #e8edf5', borderTopColor:'#531697', borderRadius:'50%', animation:'_s .7s linear infinite' }} />
      <style>{`@keyframes _s{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif" }}>
      <div style={{ marginBottom:18 }}>
        <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.5rem', color:'#0f1a2e' }}>🎯 Aptitude Practice</h1>
        <p style={{ color:'#7a8ba8', marginTop:3 }}>Practice Mode · Quiz Mode · Subtopic dropdowns · Theory summaries · GFG & IndiaBix links</p>
      </div>

      {/* ── Active session ── */}
      {mode==='session'&&!quizDone&&questions.length>0&&(
        <div>
          <div style={{ marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={reset} style={{ padding:'6px 14px', borderRadius:8, border:'1px solid #d0d7e8', background:'transparent', color:'#7a8ba8', fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.8rem' }}>← Exit</button>
            <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, color:'#0f1a2e', fontSize:'.9rem' }}>{sessionMode==='practice'?'📖':'🧪'} {sessionTitle}</span>
          </div>
          <QuizQuestion q={questions[qIdx]} idx={qIdx} total={questions.length} mode={sessionMode} onAnswer={handleAnswer} onFinish={handleFinish} />
        </div>
      )}
      {mode==='session'&&quizDone&&<Results answers={answers} title={sessionTitle} mode={sessionMode} onRestart={reset} />}

      {/* ── Main tabs ── */}
      {mode===null&&(
        <>
          <div style={{ display:'flex', gap:0, marginBottom:18, borderBottom:'1px solid #e8edf5' }}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{ padding:'9px 18px', borderRadius:'9px 9px 0 0', border:'none', borderBottom:tab===t.id?'2.5px solid #531697':'2px solid transparent', background:tab===t.id?'rgba(83,22,151,.06)':'transparent', color:tab===t.id?'#531697':'#7a8ba8', fontWeight:700, cursor:'pointer', fontSize:'.83rem', fontFamily:"'Nunito',sans-serif" }}>
                {t.label}
              </button>
            ))}
          </div>
          {tab==='topics'&&<><StatsBar stats={stats} {...progress} /><TopicSelector topicsData={topicsData} stats={stats} progress={progress} onStartPractice={handleStartPractice} onStartQuiz={handleStartQuiz} /></>}
          {tab==='browse'&&<BrowseTab topicsData={topicsData} />}
          {tab==='bookmarks'&&<BookmarksTab />}
        </>
      )}
    </div>
  );
}