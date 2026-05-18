import React, { useState } from 'react';
import { ROUND_RESOURCES } from './RESOURCES';
import { RoundHeader, Card, SectionTitle } from './PracticeComponents';

const DEBUG_PROBLEMS = [
  {
    id: 'db1', title: 'Off-by-one Error', lang: 'JavaScript', difficulty: 'Easy',
    buggy: `function findMax(arr) {
  let max = arr[0];
  for (let i = 0; i <= arr.length; i++) {
    if (arr[i] > max) {
      max = arr[i];
    }
  }
  return max;
}
// Test: findMax([3, 1, 4, 1, 5, 9]) → returns NaN`,
    options: ['Loop should use i < arr.length (not <=)', 'max should be initialized to 0', 'Return statement is wrong', 'arr[i] comparison is wrong'],
    correct: 0,
    fixed: `function findMax(arr) {
  let max = arr[0];
  for (let i = 0; i < arr.length; i++) {  // Fixed: < not <=
    if (arr[i] > max) {
      max = arr[i];
    }
  }
  return max;
}
// Test: findMax([3, 1, 4, 1, 5, 9]) → returns 9 ✅`,
    explanation: 'The loop uses i <= arr.length, which accesses arr[arr.length] — an out-of-bounds index. In JavaScript, accessing an array beyond its bounds returns undefined, and undefined > max evaluates to false (NaN comparisons), but the loop itself tries to access undefined, causing NaN to propagate.',
  },
  {
    id: 'db2', title: 'Infinite Recursion', lang: 'Python', difficulty: 'Easy',
    buggy: `def factorial(n):
    if n == 0:
        return 1
    return n * factorial(n)  # Bug here

# factorial(5) → RecursionError`,
    options: ['Missing base case for n < 0', 'Should be factorial(n-1) not factorial(n)', 'Return value should be n + factorial(n-1)', 'if n == 0 should be if n == 1'],
    correct: 1,
    fixed: `def factorial(n):
    if n == 0:
        return 1
    return n * factorial(n - 1)  # Fixed: n-1 to ensure termination

# factorial(5) → 120 ✅`,
    explanation: 'The recursive call passes n instead of n-1, so n never decreases. The base case (n == 0) is never reached, causing infinite recursion until the call stack overflows.',
  },
  {
    id: 'db3', title: 'Async/Await Mistake', lang: 'JavaScript', difficulty: 'Medium',
    buggy: `async function fetchUser(id) {
  const response = fetch(\`https://api.example.com/users/\${id}\`);
  const data = response.json();
  return data.name;
}

// fetchUser(1).then(name => console.log(name))
// Output: TypeError: response.json is not a function`,
    options: ['fetch() should use XMLHttpRequest instead', 'Missing await before fetch() and response.json()', 'The URL template literal is wrong', 'Should use .then() instead of async/await'],
    correct: 1,
    fixed: `async function fetchUser(id) {
  const response = await fetch(\`https://api.example.com/users/\${id}\`); // await
  const data = await response.json();  // await
  return data.name;
}

// fetchUser(1).then(name => console.log(name)) ✅`,
    explanation: 'Without await, fetch() returns a Promise (not a Response object). Calling .json() on a Promise throws TypeError. Both fetch() and response.json() are asynchronous and must be awaited to get the resolved values.',
  },
  {
    id: 'db4', title: 'SQL N+1 Query Problem', lang: 'SQL/Pseudocode', difficulty: 'Medium',
    buggy: `// Fetching orders with customer names
const orders = db.query("SELECT * FROM orders");  // 1 query

orders.forEach(order => {
  const customer = db.query(
    \`SELECT name FROM customers WHERE id = \${order.customer_id}\`
  );  // N queries — one per order!
  order.customerName = customer.name;
});

// If there are 1000 orders → 1001 database queries! Very slow.`,
    options: ['The forEach loop should be a for loop', 'Should use JOIN to fetch both tables in one query', 'customers table should be indexed', 'Use setTimeout to batch the queries'],
    correct: 1,
    fixed: `// Fixed: Use JOIN to fetch in a single query
const ordersWithCustomers = db.query(\`
  SELECT orders.*, customers.name AS customerName
  FROM orders
  INNER JOIN customers ON orders.customer_id = customers.id
\`);

// 1 query instead of N+1 queries ✅
// For 1000 orders: 1 query vs 1001 queries`,
    explanation: 'The N+1 problem occurs when you run 1 query to get a list, then N additional queries for each item. The fix is to use a SQL JOIN to retrieve all related data in a single query. This is one of the most common performance bugs in database-driven applications.',
  },
  {
    id: 'db5', title: 'Race Condition in Counter', lang: 'Python', difficulty: 'Hard',
    buggy: `import threading

counter = 0

def increment():
    global counter
    for _ in range(100000):
        counter += 1  # Not thread-safe!

t1 = threading.Thread(target=increment)
t2 = threading.Thread(target=increment)
t1.start(); t2.start()
t1.join(); t2.join()

print(counter)  # Expected: 200000, Actual: <200000 (varies!)`,
    options: ['Use counter += 2 instead of += 1', 'counter += 1 is not atomic — needs a Lock', 'Should use multiprocessing not threading', 'The loop count should be 50000 each'],
    correct: 1,
    fixed: `import threading

counter = 0
lock = threading.Lock()  # Create a lock

def increment():
    global counter
    for _ in range(100000):
        with lock:  # Acquire lock before modifying shared state
            counter += 1

t1 = threading.Thread(target=increment)
t2 = threading.Thread(target=increment)
t1.start(); t2.start()
t1.join(); t2.join()

print(counter)  # Always: 200000 ✅`,
    explanation: 'counter += 1 involves 3 operations: READ counter, ADD 1, WRITE back. Without a lock, two threads can simultaneously read the same value, both add 1, and write the same result — losing one increment. This race condition causes the final count to be less than 200000. Using threading.Lock() ensures mutual exclusion.',
  },
];

export default function DebuggingRoundPage() {
  const [selected, setSelected] = useState({});
  const [submitted, setSubmitted] = useState({});
  const [showFix, setShowFix] = useState({});
  const [showRes, setShowRes] = useState(false);

  function select(id, idx) {
    if (submitted[id]) return;
    setSelected(s => ({ ...s, [id]: idx }));
  }

  function submit(id) {
    if (selected[id] === undefined) return;
    setSubmitted(s => ({ ...s, [id]: true }));
  }

  const DIFF_STYLE = { Easy: { bg: 'rgba(71,211,114,0.1)', color: '#166534' }, Medium: { bg: 'rgba(245,158,11,0.1)', color: '#92400e' }, Hard: { bg: 'rgba(239,68,68,0.1)', color: '#991b1b' } };

  return (
    <div style={{ fontFamily: "'Nunito',sans-serif" }}>
      <RoundHeader icon="🐞" title="Debugging Round Practice" subtitle="Find bugs in code snippets and understand why they occur" />
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
        <button onClick={()=>setShowRes(r=>!r)}
          style={{ padding:'7px 16px', borderRadius:9, border:`1.5px solid ${showRes?'#16a34a':'#d0d7e8'}`, background:showRes?'rgba(22,163,74,0.06)':'#fff', color:showRes?'#16a34a':'#7a8ba8', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.78rem' }}>
          📚 {showRes?'Hide':'Resources'}
        </button>
      </div>
      {showRes && (
        <div style={{ background:'rgba(22,163,74,0.04)', border:'1px solid rgba(22,163,74,0.18)', borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
          <div style={{ fontSize:'.7rem', fontWeight:800, color:'#b0bec9', marginBottom:10 }}>BEST DEBUGGING RESOURCES</div>
          <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
            {ROUND_RESOURCES.DEBUGGING.map((r,i)=>(
              <a key={i} href={r.url} target="_blank" rel="noreferrer"
                style={{ padding:'5px 11px', borderRadius:7, background:r.color+'18', color:r.color, fontSize:'.72rem', fontWeight:800, textDecoration:'none', border:`1px solid ${r.color}30` }}>
                {r.tag} — {r.name} ↗
              </a>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {DEBUG_PROBLEMS.map((p, pi) => {
          const isSubmitted = submitted[p.id];
          const isCorrect = selected[p.id] === p.correct;
          const ds = DIFF_STYLE[p.difficulty];
          return (
            <Card key={p.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#531697,#13a1a5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '.78rem', flexShrink: 0 }}>#{pi+1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.9rem', color: '#0f1a2e' }}>{p.title}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                    <span style={{ padding: '1px 6px', borderRadius: 999, background: '#f0f3fa', color: '#7a8ba8', fontSize: '.65rem', fontWeight: 700 }}>{p.lang}</span>
                    <span style={{ padding: '1px 6px', borderRadius: 999, background: ds.bg, color: ds.color, fontSize: '.65rem', fontWeight: 700 }}>{p.difficulty}</span>
                  </div>
                </div>
                {isSubmitted && <span style={{ fontSize: '1.2rem' }}>{isCorrect ? '✅' : '❌'}</span>}
              </div>

              {/* Buggy code */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: '.68rem', fontWeight: 800, color: '#b0bec9', marginBottom: 4 }}>🐛 BUGGY CODE</div>
                <pre style={{ padding: '14px 16px', borderRadius: 10, background: '#0f1a2e', color: '#ef4444', fontSize: '.78rem', fontFamily: 'monospace', overflowX: 'auto', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {p.buggy}
                </pre>
              </div>

              {/* Options */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '.72rem', fontWeight: 800, color: '#7a8ba8', marginBottom: 8 }}>WHAT IS THE BUG?</div>
                {p.options.map((opt, i) => {
                  const isPicked = selected[p.id] === i;
                  const isRight = i === p.correct;
                  let bg = '#fafbff', border = '#d0d7e8', color = '#3d4e6b';
                  if (isSubmitted) {
                    if (isRight) { bg = 'rgba(71,211,114,0.08)'; border = '#47d372'; color = '#166534'; }
                    else if (isPicked) { bg = 'rgba(239,68,68,0.07)'; border = '#ef4444'; color = '#991b1b'; }
                  } else if (isPicked) { bg = 'rgba(83,22,151,0.07)'; border = '#531697'; color = '#531697'; }
                  return (
                    <div key={i} onClick={() => select(p.id, i)}
                      style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 14px', borderRadius: 9, border: `1.5px solid ${border}`, background: bg, color, fontWeight: 600, cursor: isSubmitted ? 'default' : 'pointer', marginBottom: 6, fontSize: '.82rem', transition: 'all .15s' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem', flexShrink: 0, background: isPicked && !isSubmitted ? '#531697' : 'transparent', color: isPicked && !isSubmitted ? '#fff' : 'inherit' }}>
                        {isSubmitted && isRight ? '✓' : isSubmitted && isPicked ? '✗' : String.fromCharCode(65 + i)}
                      </div>
                      {opt}
                    </div>
                  );
                })}
              </div>

              {!isSubmitted ? (
                <button onClick={() => submit(p.id)} disabled={selected[p.id] === undefined}
                  style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: selected[p.id] !== undefined ? 'linear-gradient(135deg,#531697,#13a1a5)' : '#d0d7e8', color: '#fff', fontWeight: 800, cursor: selected[p.id] !== undefined ? 'pointer' : 'default', fontFamily: "'Nunito',sans-serif", fontSize: '.85rem' }}>
                  Submit Answer
                </button>
              ) : (
                <div>
                  <div style={{ padding: '8px 12px', borderRadius: 8, background: isCorrect ? 'rgba(71,211,114,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${isCorrect ? 'rgba(71,211,114,0.3)' : 'rgba(239,68,68,0.3)'}`, color: isCorrect ? '#166534' : '#991b1b', fontSize: '.82rem', fontWeight: 700, marginBottom: 10 }}>
                    {isCorrect ? '✅ Correct!' : `❌ Incorrect. The bug is: ${p.options[p.correct]}`}
                  </div>
                  <div style={{ fontSize: '.8rem', color: '#7a8ba8', lineHeight: 1.6, marginBottom: 10 }}>{p.explanation}</div>
                  <button onClick={() => setShowFix(f => ({ ...f, [p.id]: !f[p.id] }))}
                    style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: showFix[p.id] ? '#f0f3fa' : 'linear-gradient(135deg,#531697,#13a1a5)', color: showFix[p.id] ? '#531697' : '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.78rem' }}>
                    {showFix[p.id] ? '🙈 Hide Fix' : '🔧 Show Fixed Code'}
                  </button>
                  {showFix[p.id] && (
                    <pre style={{ marginTop: 10, padding: '14px 16px', borderRadius: 10, background: '#0f1a2e', color: '#47d372', fontSize: '.78rem', fontFamily: 'monospace', overflowX: 'auto', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                      {p.fixed}
                    </pre>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
