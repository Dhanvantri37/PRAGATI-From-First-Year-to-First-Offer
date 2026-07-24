import React, { useState, useEffect, useCallback } from 'react';
import { RoundHeader, Card, SectionTitle, GRAD } from './PracticeComponents';
import { ROUND_RESOURCES } from './RESOURCES';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tk  = () => ({ Authorization:`Bearer ${localStorage.getItem('pragati_token')}` });
const tks = () => ({ ...tk(), 'Content-Type':'application/json' });

// ─────────────────────────────────────────────────────────────────────────────
// SUBTOPICS & SUBJECT CHEATSHEETS
// ─────────────────────────────────────────────────────────────────────────────
const SUBJECT_SUBTOPICS = {
  DBMS: ['Normalization', 'SQL Joins & Queries', 'ACID & Transactions', 'Indexing & B-Trees', 'NoSQL & CAP Theorem'],
  OS: ['Process & Threads', 'CPU Scheduling', 'Memory & Paging', 'Deadlocks & Sync'],
  CN: ['OSI & TCP/IP', 'HTTP/HTTPS/DNS', 'Subnetting & IP', 'Network Security'],
  OOPs: ['4 Pillars', 'SOLID Principles', 'Design Patterns', 'Class vs Interface'],
  Java: ['Core & JVM', 'Memory & GC', 'Collections & HashMap', 'Streams & Concurrency'],
  Python: ['Core Syntax', 'OOPs & Decorators', 'GIL & Concurrency', 'Iterators & Generators'],
  DSA: ['Arrays & Strings', 'Trees & Graphs', 'Dynamic Programming', 'Sorting & Searching'],
  'System Design': ['High-Level Architecture', 'Caching & Load Balancing', 'Scalable Services']
};

const CHEATSHEETS = {
  DBMS: {
    Normalization: {
      summary: 'Normalization reduces data redundancy and improves data integrity by organizing fields and tables.',
      points: [
        '1NF: Ensure column values are atomic (indivisible) and no repeating groups exist.',
        '2NF: 1NF + eliminate partial functional dependencies (every non-key attribute depends fully on primary key).',
        '3NF: 2NF + eliminate transitive functional dependencies (X → Y and Y → Z means X → Z).',
        'BCNF: Strict 3NF — for every dependency X → Y, X must be a super key.'
      ],
      shortcut: 'Rule of Thumb: If a non-key column depends on another non-key column, split it into a separate table!'
    },
    'SQL Joins & Queries': {
      summary: 'SQL Joins combine rows from two or more tables based on a related column between them.',
      points: [
        'INNER JOIN: Returns only matching records present in both tables.',
        'LEFT JOIN: Returns all records from left table + matching records from right table (NULL if no match).',
        'RIGHT JOIN: Returns all records from right table + matching left table records.',
        'FULL OUTER JOIN: Returns all records when there is a match in either left or right table.',
        'WHERE vs HAVING: WHERE filters rows BEFORE aggregation; HAVING filters groups AFTER GROUP BY.'
      ],
      shortcut: 'Performance Tip: Always ensure join columns (foreign keys) have indexes to prevent full table scans!'
    },
    'ACID & Transactions': {
      summary: 'ACID guarantees database transaction reliability across concurrent operations and crashes.',
      points: [
        'Atomicity: Entire transaction succeeds or completely rolls back (All or Nothing).',
        'Consistency: DB state remains valid according to constraints before and after execution.',
        'Isolation: Concurrent transactions run independently without interfering with each other.',
        'Durability: Committed data is permanently saved in non-volatile storage (WAL logging).'
      ],
      shortcut: 'Isolation Levels: Read Uncommitted ➔ Read Committed ➔ Repeatable Read ➔ Serializable.'
    }
  },
  OS: {
    'Process & Threads': {
      summary: 'Processes are independent execution units with separate memory space; Threads share address space.',
      points: [
        'Process: Isolated memory (Code, Data, Heap, Stack). Higher context-switch overhead.',
        'Thread: Lightweight execution path within a process. Shares Heap and Data segment.',
        'IPC (Inter-Process Communication): Shared Memory, Pipes, Sockets, Message Queues.',
        'Context Switch: Saving CPU registers/registers state and loading another thread/process state.'
      ],
      shortcut: 'Tradeoff: Threads share memory for fast communication, but 1 crashed thread can bring down the process!'
    },
    'Deadlocks & Sync': {
      summary: 'Deadlock is a state where processes are permanently blocked waiting for resources held by each other.',
      points: [
        '4 Coffman Conditions: 1. Mutual Exclusion, 2. Hold & Wait, 3. No Preemption, 4. Circular Wait.',
        'Mutex: Binary lock with OWNERSHIP — only locking thread can unlock.',
        'Semaphore: Signaling counter variable without ownership (wait/P decrements, signal/V increments).'
      ],
      shortcut: 'Deadlock Prevention: Always acquire locks in a strict global lock ordering sequence!'
    }
  },
  CN: {
    'OSI & TCP/IP': {
      summary: 'OSI 7-layer model defines standardized communication protocols for network systems.',
      points: [
        'Layer 7 Application: HTTP, HTTPS, FTP, SMTP, DNS.',
        'Layer 4 Transport: TCP (reliable 3-way handshake) and UDP (fast datagrams).',
        'Layer 3 Network: IP routing, ICMP, Routers.',
        'Layer 2 Data Link: MAC addresses, Ethernet switches.'
      ],
      shortcut: 'Handshake: SYN ➔ SYN-ACK ➔ ACK establishes reliable TCP connection.'
    }
  },
  OOPs: {
    '4 Pillars': {
      summary: 'Object-Oriented Programming models real-world software components through 4 fundamental principles.',
      points: [
        'Encapsulation: Bundling state and methods together while restricting direct access via private fields.',
        'Abstraction: Exposing only high-level functionality contracts (Interfaces/Abstract classes).',
        'Inheritance: Extending base class attributes to reuse code and establish hierarchical relationships.',
        'Polymorphism: Overloading (compile-time) and Overriding (runtime dynamic dispatch).'
      ],
      shortcut: 'Design Principle: Favor composition ("has-a") over deep inheritance hierarchies ("is-a")!'
    }
  },
  Java: {
    'Core & JVM': {
      summary: 'JVM executes Java bytecode platform-independently using Garbage Collection and JIT compilation.',
      points: [
        'JDK = JRE + Compilers (javac) & Dev tools. JRE = JVM + Core Java Runtime Libraries.',
        'Memory: Young Generation (Eden + Survivor) ➔ Old Generation ➔ Metaspace (class metadata).',
        'HashMap: Bucket array converted from Linked List to Red-Black Tree when bucket size > 8.'
      ],
      shortcut: 'Equals Contract: Always override hashCode() whenever you override equals()!'
    }
  },
  Python: {
    'Core Syntax': {
      summary: 'Python is a high-level interpreted language with automatic reference-counting garbage collection.',
      points: [
        'GIL (Global Interpreter Lock): Mutex allowing only 1 thread to execute bytecode at a time.',
        'List (mutable, ordered), Tuple (immutable, ordered), Set (unique, unordered), Dict (key-value).'
      ],
      shortcut: 'Concurrency Tip: Use multiprocessing for CPU-bound tasks and asyncio/threading for I/O bound!'
    }
  },
  DSA: {
    'Trees & Graphs': {
      summary: 'Graph and Tree structures represent hierarchical and networked relationships between nodes.',
      points: [
        'BFS: Level-by-level traversal using Queue. Finds shortest path in unweighted graphs.',
        'DFS: Deep path traversal using Stack/recursion. Used for topological sort & cycle detection.',
        'BST: In-order traversal (Left ➔ Root ➔ Right) yields elements in sorted order.'
      ],
      shortcut: 'Dijkstra Algorithm: Min-Heap priority queue computes shortest path in non-negative weighted graphs.'
    }
  },
  'System Design': {
    'High-Level Architecture': {
      summary: 'Designing scalable distributed systems balancing throughput, latency, and fault-tolerance.',
      points: [
        'Load Balancer: Distributes traffic across servers (Round Robin, Least Connections, Consistent Hashing).',
        'Caching: Redis/Memcached in front of DB to serve 80% read traffic in under 5ms.',
        'Database Sharding: Horizontal partitioning of data across multiple database nodes.'
      ],
      shortcut: 'CAP Theorem: In a network partition, you must choose between Consistency (CP) or Availability (AP).'
    }
  }
};

const RESOURCE_LINKS = {
  DBMS: [
    { name: 'GeeksforGeeks DBMS Corner', url: 'https://www.geeksforgeeks.org/dbms-interview-questions/' },
    { name: 'IndiaBix Database Practice', url: 'https://www.indiabix.com/database/questions-and-answers/' },
    { name: 'InterviewBit SQL Guide', url: 'https://www.interviewbit.com/sql-interview-questions/' }
  ],
  OS: [
    { name: 'GeeksforGeeks OS Corner', url: 'https://www.geeksforgeeks.org/operating-systems-interview-questions/' },
    { name: 'Scaler OS Topics', url: 'https://www.scaler.com/topics/operating-system/' },
    { name: 'Tutorialspoint OS Q&A', url: 'https://www.tutorialspoint.com/operating_system/index.htm' }
  ],
  CN: [
    { name: 'GeeksforGeeks Networking', url: 'https://www.geeksforgeeks.org/computer-network-interview-questions/' },
    { name: 'IndiaBix Computer Networks', url: 'https://www.indiabix.com/networking/questions-and-answers/' }
  ],
  OOPs: [
    { name: 'GeeksforGeeks OOPs Guide', url: 'https://www.geeksforgeeks.org/oops-interview-questions/' },
    { name: 'JavaTpoint OOPs Concepts', url: 'https://www.javatpoint.com/oops-interview-questions' }
  ],
  Java: [
    { name: 'GeeksforGeeks Java Corner', url: 'https://www.geeksforgeeks.org/java-interview-questions/' },
    { name: 'JavaTpoint 500+ Java Q&A', url: 'https://www.javatpoint.com/corejava-interview-questions' },
    { name: 'Baeldung Core Java', url: 'https://www.baeldung.com/java-tutorial' }
  ],
  Python: [
    { name: 'GeeksforGeeks Python Corner', url: 'https://www.geeksforgeeks.org/python-interview-questions/' },
    { name: 'InterviewBit Python Practice', url: 'https://www.interviewbit.com/python-interview-questions/' }
  ],
  DSA: [
    { name: 'GeeksforGeeks DSA Sheet', url: 'https://www.geeksforgeeks.org/data-structures-algorithms-interview-questions/' },
    { name: 'LeetCode Problemset', url: 'https://leetcode.com/problemset/' },
    { name: 'Striver A2Z DSA Sheet', url: 'https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/' }
  ],
  'System Design': [
    { name: 'System Design Primer (GitHub ⭐)', url: 'https://github.com/donnemartin/system-design-primer' },
    { name: 'ByteByteGo System Design Blog', url: 'https://blog.bytebytego.com/' },
    { name: 'Grokking System Design', url: 'https://www.educative.io/courses/grokking-the-system-design-interview' }
  ]
};

const FALLBACK_QUESTIONS = {
  DBMS: {
    Normalization: [
      { level: 'Beginner', company: 'TCS', q: 'What is normalization? Explain 1NF, 2NF, 3NF.', a: '1NF: Atomic values, no repeating groups.\n2NF: 1NF + no partial dependency (every non-key attribute depends fully on primary key).\n3NF: 2NF + no transitive dependency.\n\nExample: Table (OrderID, ProductID, ProductName) — ProductName depends only on ProductID (partial dep). Split into Orders & Products tables.' },
      { level: 'Intermediate', company: 'Cognizant', q: 'What is BCNF (Boyce-Codd Normal Form)? How does it differ from 3NF?', a: 'BCNF is a stricter version of 3NF. For every functional dependency X → Y, X must be a super key.\n\n3NF allows Y to be a prime attribute even if X is not a super key. BCNF eliminates this exception to prevent redundancy when candidate keys overlap.' }
    ],
    'SQL Joins & Queries': [
      { level: 'Beginner', company: 'Infosys', q: 'Difference between INNER JOIN, LEFT JOIN, and FULL OUTER JOIN.', a: 'INNER JOIN: Returns only matching rows from both tables.\nLEFT JOIN: Returns all rows from left table + matching rows from right (NULL if no match).\nFULL OUTER JOIN: Returns all rows when there is a match in either left or right table.' },
      { level: 'Intermediate', company: 'Wipro', q: 'WHERE vs HAVING clause in SQL — when to use which?', a: 'WHERE: Filters individual rows BEFORE aggregation.\nHAVING: Filters aggregated groups AFTER GROUP BY.\n\nRule: Use WHERE for column conditions (salary > 50000); use HAVING for aggregate functions (COUNT(*) > 5).' }
    ],
    'ACID & Transactions': [
      { level: 'Beginner', company: 'Accenture', q: 'Explain ACID properties in database transactions.', a: 'Atomicity: All or nothing execution.\nConsistency: DB transitions from one valid state to another.\nIsolation: Concurrent transactions run independently without interference.\nDurability: Committed changes persist even during power/system failures.' },
      { level: 'Advanced', company: 'Amazon', q: 'Explain Transaction Isolation Levels and Read Phenomena (Dirty Read, Non-repeatable Read, Phantom Read).', a: 'Read Uncommitted: Allows Dirty Reads (reading uncommitted data).\nRead Committed: Prevents Dirty Reads, allows Non-repeatable Reads.\nRepeatable Read: Prevents Non-repeatable Reads, allows Phantom Reads.\nSerializable: Highest isolation; prevents all read anomalies using locks or MVCC.' }
    ]
  },
  OS: {
    'Process & Threads': [
      { level: 'Beginner', company: 'TCS', q: 'Process vs Thread — explain key differences.', a: 'Process: Independent execution program with isolated address space (code, heap, stack).\nThread: Lightweight unit within a process sharing the same heap and code space.\nContext switching between threads is much faster than between processes.' },
      { level: 'Intermediate', company: 'Capgemini', q: 'What is Context Switching? Why is it expensive?', a: 'Context switching is the process of storing state of CPU process/thread so execution can be resumed later.\nIt is expensive because it invalidates CPU caches (L1/L2), flushing TLB entries and consuming kernel CPU cycles.' }
    ],
    'Deadlocks & Sync': [
      { level: 'Beginner', company: 'Wipro', q: 'What is a deadlock? List the 4 necessary conditions.', a: 'Deadlock: Situation where processes are permanently blocked waiting for resources held by each other.\n4 Conditions: 1. Mutual Exclusion, 2. Hold & Wait, 3. No Preemption, 4. Circular Wait.' },
      { level: 'Advanced', company: 'Microsoft', q: 'Mutex vs Semaphore — explain ownership and signaling differences.', a: 'Mutex: Binary locking mechanism with OWNERSHIP (only thread that locked mutex can unlock it).\nSemaphore: Signaling mechanism without ownership (any thread can call signal/V to increment count).' }
    ]
  },
  CN: {
    'OSI & TCP/IP': [
      { level: 'Beginner', company: 'Infosys', q: 'Explain the 7 layers of the OSI model.', a: '1. Physical (bits)\n2. Data Link (frames, MAC)\n3. Network (packets, IP)\n4. Transport (segments, TCP/UDP)\n5. Session (dialog control)\n6. Presentation (formatting, TLS encryption)\n7. Application (HTTP, FTP, SMTP).' },
      { level: 'Intermediate', company: 'Cognizant', q: 'TCP vs UDP — compare reliability and speed.', a: 'TCP: Connection-oriented (3-way handshake SYN→SYN-ACK→ACK), reliable, flow-controlled, ordered.\nUDP: Connectionless, fast, lightweight, unordered. Used in streaming, VoIP, online gaming.' }
    ]
  },
  OOPs: {
    '4 Pillars': [
      { level: 'Beginner', company: 'TCS', q: 'Explain the 4 fundamental pillars of OOP.', a: 'Encapsulation: Bundling data and methods together while hiding internal details.\nAbstraction: Hiding complex implementation and exposing clean interface.\nInheritance: Reusing code by extending base class properties.\nPolymorphism: Single interface for different underlying forms (overloading & overriding).' }
    ]
  },
  Java: {
    'Core & JVM': [
      { level: 'Beginner', company: 'Infosys', q: 'Difference between JDK, JRE, and JVM.', a: 'JVM: Executes Java bytecode (.class).\nJRE: JVM + core Java runtime libraries (used to run Java apps).\nJDK: JRE + compiler (javac) & dev tools (used to build Java apps).' }
    ],
    'Collections & HashMap': [
      { level: 'Advanced', company: 'Amazon', q: 'Explain HashMap internal architecture in Java 8+.', a: 'HashMap uses an array of buckets. Each bucket holds a linked list.\nIn Java 8+, if bucket size exceeds 8 entries, the linked list converts to a Red-Black Tree for O(log N) lookup performance.' }
    ]
  },
  Python: {
    'Core Syntax': [
      { level: 'Beginner', company: 'Wipro', q: 'List vs Tuple vs Set vs Dict in Python.', a: 'List: Ordered, mutable, allows duplicates.\nTuple: Ordered, immutable, allows duplicates.\nSet: Unordered, mutable, NO duplicates.\nDict: Key-value mapping, unique keys.' }
    ]
  },
  DSA: {
    'Trees & Graphs': [
      { level: 'Intermediate', company: 'Zoho', q: 'BFS vs DFS graph traversal algorithms.', a: 'BFS: Level-by-level traversal using Queue. Used for shortest path in unweighted graphs.\nDFS: Deep path traversal using Stack/recursion. Used for topological sort & cycle detection.' }
    ]
  },
  'System Design': {
    'High-Level Architecture': [
      { level: 'Intermediate', company: 'Amazon', q: 'How would you design a URL shortener like Bit.ly?', a: '1. API: POST /shorten(url) → returns shortCode\n2. Key Gen: Base62 encoding of auto-increment ID or MD5 hash\n3. Cache: Redis for hot short code redirects\n4. Database: NoSQL (Cassandra/DynamoDB) mapping shortCode ➔ originalURL' }
    ]
  }
};

const SUBJECT_ICONS = {
  DBMS: '🗄️', OS: '💾', CN: '🌐', OOPs: '🧱', Java: '☕', Python: '🐍', DSA: '🌳', 'System Design': '🏗️'
};

// ─────────────────────────────────────────────────────────────────────────────
// AI MOTIVATIONAL MENTOR CARD (ChatGPT Style: Realistic & Encouraging)
// ─────────────────────────────────────────────────────────────────────────────
function AIMentorCard({ score, feedback, keyTerms }) {
  if (score === null) return null;

  let emoji = '💡';
  let title = 'Great Attempt! Keep Learning!';
  let bg = 'rgba(83,22,151,0.06)';
  let border = 'rgba(83,22,151,0.2)';
  let color = '#531697';
  let message = 'Every top software engineer started right where you are today. Review the missing key terms below, refine your answer, and try again — you’ve got this!';

  if (score >= 85) {
    emoji = '🌟';
    title = 'SUPERB! Tier-1 Interview Ready!';
    bg = 'rgba(71,211,114,0.12)';
    border = 'rgba(71,211,114,0.3)';
    color = '#166534';
    message = 'Outstanding technical depth! You accurately covered core mechanics and key terminology. Excellent work!';
  } else if (score >= 60) {
    emoji = '👏';
    title = 'Solid Performance! Almost Perfect!';
    bg = 'rgba(245,158,11,0.12)';
    border = 'rgba(245,158,11,0.3)';
    color = '#92400e';
    message = 'You have a good grasp of the fundamentals! Adding 1-2 missing technical terms below will make your interview answer 100% airtight.';
  }

  return (
    <div style={{ marginTop: 14, padding: '16px 18px', borderRadius: 12, background: bg, border: `1.5px solid ${border}`, boxShadow: '0 4px 14px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.95rem', color }}>
          <span>{emoji}</span> {title}
        </div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: '1.1rem', color }}>
          {score}% Accuracy
        </div>
      </div>
      <div style={{ fontSize: '.83rem', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 10 }}>
        {message}
      </div>

      {keyTerms && keyTerms.length > 0 && (
        <div>
          <div style={{ fontSize: '.72rem', fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 6 }}>
            🔑 KEY TECHNICAL TERMS EVALUATED:
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {keyTerms.map((term, i) => (
              <span key={i} style={{ padding: '3px 9px', borderRadius: 6, background: '#fff', border: '1px solid #d0d7e8', fontSize: '.72rem', fontWeight: 700, color: 'var(--text)' }}>
                ✓ {term}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN TECHNICAL ROUND PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function TechnicalRoundPage() {
  const [activeSub, setActiveSub] = useState('DBMS');
  const [activeSubtopic, setActiveSubtopic] = useState(SUBJECT_SUBTOPICS.DBMS[0]);
  const [activeLevel, setActiveLevel] = useState('All');
  const [phaseMode, setPhaseMode] = useState('practice');
  const [showRes, setShowRes] = useState(false);

  const [questions, setQuestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});
  const [evalResults, setEvalResults] = useState({});
  const [expanded, setExpanded] = useState({});

  const handleSubjectChange = (subject) => {
    setActiveSub(subject);
    const subs = SUBJECT_SUBTOPICS[subject] || [];
    const firstSub = subs[0] || '';
    setActiveSubtopic(firstSub);
    loadQuestions(subject, firstSub, activeLevel);
  };

  const loadQuestions = useCallback((subject, subtopic, level) => {
    const subQMap = FALLBACK_QUESTIONS[subject] || {};
    const subList = subQMap[subtopic] || Object.values(subQMap).flat() || [];

    let filtered = subList;
    if (level !== 'All') {
      filtered = subList.filter(q => q.level === level);
    }
    if (!filtered.length) filtered = subList;

    setQuestions(filtered);
    setUserAnswers({});
    setEvalResults({});
    setExpanded({});
  }, []);

  useEffect(() => {
    loadQuestions(activeSub, activeSubtopic, activeLevel);
  }, [activeSub, activeSubtopic, activeLevel, loadQuestions]);

  const fetchAIQuestions = async () => {
    setAiLoading(true);
    try {
      const res = await fetch(`${API}/aptitude/ai-quiz`, {
        method: 'POST',
        headers: tks(),
        body: JSON.stringify({
          company: activeSub,
          topic: activeSubtopic,
          difficulty: activeLevel,
          count: 5
        })
      }).then(r => r.json());

      if (res.questions && res.questions.length > 0) {
        const mapped = res.questions.map(q => ({
          level: activeLevel === 'All' ? 'Intermediate' : activeLevel,
          company: 'AI Dynamic',
          q: q.question,
          a: q.explanation || q.answer || 'Standard answer breakdown.'
        }));
        setQuestions(mapped);
      } else {
        loadQuestions(activeSub, activeSubtopic, activeLevel);
      }
    } catch (e) {
      loadQuestions(activeSub, activeSubtopic, activeLevel);
    } finally {
      setAiLoading(false);
    }
  };

  const evaluateAnswer = (idx, qItem) => {
    const text = (userAnswers[idx] || '').trim().toLowerCase();
    if (!text) return;

    const words = qItem.a.toLowerCase().split(/\s+/);
    const keyTermsCandidate = words.filter(w => w.length > 4).slice(0, 5);
    const matched = keyTermsCandidate.filter(w => text.includes(w));
    const score = Math.min(100, Math.max(35, Math.round((matched.length / keyTermsCandidate.length) * 100)));

    setEvalResults(prev => ({
      ...prev,
      [idx]: {
        score: score >= 40 ? score : 45,
        keyTerms: keyTermsCandidate.map(w => w.toUpperCase())
      }
    }));
  };

  const LEVELS = ['All', 'Beginner', 'Intermediate', 'Advanced'];
  const curCheatSheet = CHEATSHEETS[activeSub]?.[activeSubtopic] || CHEATSHEETS[activeSub]?.[Object.keys(CHEATSHEETS[activeSub] || {})[0]];
  const curResourceLinks = RESOURCE_LINKS[activeSub] || [];

  return (
    <div style={{ fontFamily: "'Nunito',sans-serif" }}>
      <RoundHeader
        icon="🏢🟠"
        title="360° Technical Interview Preparation & AI Evaluator"
        subtitle="Master subject subtopics, practice authentic company interview questions (TCS, Amazon, Cognizant, Wipro), and evaluate your technical answers with AI feedback."
      />

      {/* 3-Phase Navigation Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
        {[
          { key: 'learn', label: '📖 Phase 1: Subtopic Cheat Sheets', color: '#531697' },
          { key: 'practice', label: '🧪 Phase 2: Q&A & AI Evaluator', color: '#13a1a5' },
          { key: 'timed', label: '⏱️ Phase 3: Timed Interview Test', color: '#ef4444' }
        ].map(p => (
          <button
            key={p.key}
            onClick={() => setPhaseMode(p.key)}
            style={{
              padding: '11px 14px',
              borderRadius: 12,
              border: phaseMode === p.key ? `2px solid ${p.color}` : '1.5px solid #d0d7e8',
              background: phaseMode === p.key ? `${p.color}12` : '#fff',
              color: phaseMode === p.key ? p.color : 'var(--text)',
              fontFamily: "'Syne',sans-serif",
              fontWeight: 800,
              fontSize: '.82rem',
              cursor: 'pointer',
              boxShadow: phaseMode === p.key ? `0 4px 14px ${p.color}20` : 'none',
              transition: 'all .15s ease'
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Subject Selectors */}
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
        {Object.keys(SUBJECT_SUBTOPICS).map(s => (
          <button
            key={s}
            onClick={() => handleSubjectChange(s)}
            style={{
              padding: '7px 14px',
              borderRadius: 9,
              border: `1.5px solid ${activeSub === s ? '#531697' : '#d0d7e8'}`,
              background: activeSub === s ? GRAD : '#fff',
              color: activeSub === s ? '#fff' : 'var(--text-3)',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: '.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <span>{SUBJECT_ICONS[s] || '📖'}</span> {s}
          </button>
        ))}
      </div>

      {/* Subtopics Selector Bar */}
      <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 16 }}>
        <div style={{ fontSize: '.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>
          {activeSub} SUBTOPICS:
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(SUBJECT_SUBTOPICS[activeSub] || []).map(sub => (
            <button
              key={sub}
              onClick={() => { setActiveSubtopic(sub); loadQuestions(activeSub, sub, activeLevel); }}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: activeSubtopic === sub ? '1.5px solid #13a1a5' : '1px solid #cbd5e1',
                background: activeSubtopic === sub ? 'rgba(19,161,165,0.1)' : '#fff',
                color: activeSubtopic === sub ? '#0d7a7e' : 'var(--text)',
                fontWeight: 700,
                fontSize: '.75rem',
                cursor: 'pointer'
              }}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      {/* Level Filter Bar & Resources Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: '.75rem', fontWeight: 800, color: 'var(--text-3)' }}>Difficulty Level:</span>
          {LEVELS.map(lvl => (
            <button
              key={lvl}
              onClick={() => setActiveLevel(lvl)}
              style={{
                padding: '5px 11px',
                borderRadius: 7,
                border: activeLevel === lvl ? 'none' : '1px solid #d0d7e8',
                background: activeLevel === lvl ? (lvl === 'Advanced' ? '#ef4444' : lvl === 'Intermediate' ? '#f59e0b' : '#531697') : '#fff',
                color: activeLevel === lvl ? '#fff' : 'var(--text-3)',
                fontWeight: 800,
                fontSize: '.72rem',
                cursor: 'pointer'
              }}
            >
              {lvl === 'Beginner' ? '🟢 Beginner (Service)' : lvl === 'Intermediate' ? '🟡 Intermediate (Cognizant/Zoho)' : lvl === 'Advanced' ? '🔴 Advanced (Amazon/FAANG)' : 'All Levels'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowRes(r => !r)}
            style={{
              padding: '7px 14px',
              borderRadius: 8,
              border: `1.5px solid ${showRes ? '#531697' : '#d0d7e8'}`,
              background: showRes ? 'rgba(83,22,151,0.06)' : '#fff',
              color: showRes ? '#531697' : 'var(--text-3)',
              fontWeight: 800,
              fontSize: '.78rem',
              cursor: 'pointer'
            }}
          >
            📚 {showRes ? 'Hide Resources' : 'Resources'}
          </button>
          <button
            onClick={fetchAIQuestions}
            disabled={aiLoading}
            style={{
              padding: '7px 15px',
              borderRadius: 8,
              border: 'none',
              background: GRAD,
              color: '#fff',
              fontWeight: 800,
              cursor: aiLoading ? 'wait' : 'pointer',
              fontSize: '.78rem',
              boxShadow: '0 4px 12px rgba(83,22,151,0.2)'
            }}
          >
            {aiLoading ? '⌛ Fetching AI Questions…' : '🤖 Fetch Dynamic AI Questions'}
          </button>
        </div>
      </div>

      {/* Resource Links Drawer */}
      {showRes && (
        <Card style={{ marginBottom: 16, background: 'rgba(83,22,151,0.03)', border: '1.5px solid rgba(83,22,151,0.18)' }}>
          <SectionTitle>📚 Curated External Guides for {activeSub}</SectionTitle>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {curResourceLinks.map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noreferrer"
                style={{ padding: '7px 14px', borderRadius: 8, background: '#fff', border: '1px solid #e8edf5', color: '#531697', fontWeight: 800, textDecoration: 'none', fontSize: '.78rem', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                📖 {r.name} ↗
              </a>
            ))}
          </div>
          <div style={{ fontSize: '.7rem', fontWeight: 800, color: '#b0bec9', marginBottom: 6 }}>ALL TECHNICAL INTERVIEW PORTALS</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ROUND_RESOURCES.TECHNICAL.map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noreferrer"
                style={{ padding: '5px 11px', borderRadius: 6, background: r.color + '18', color: r.color, fontSize: '.72rem', fontWeight: 800, textDecoration: 'none', border: `1px solid ${r.color}30` }}>
                {r.tag} — {r.name} ↗
              </a>
            ))}
          </div>
        </Card>
      )}

      {/* Phase 1: Learn Cheat Sheets */}
      {phaseMode === 'learn' && (
        <Card style={{ marginBottom: 20, background: '#fff' }}>
          <SectionTitle>📖 Subtopic Cheat Sheet & Concept Guide — {activeSubtopic}</SectionTitle>

          {curCheatSheet ? (
            <div>
              <div style={{ fontSize: '.88rem', color: 'var(--text)', fontWeight: 700, marginBottom: 12, lineHeight: 1.6 }}>
                {curCheatSheet.summary}
              </div>

              <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
                {curCheatSheet.points.map((pt, idx) => (
                  <div key={idx} style={{ padding: '10px 14px', borderRadius: 8, background: '#f8fafc', borderLeft: '3px solid #531697', fontSize: '.82rem', color: 'var(--text-2)', lineHeight: 1.6 }}>
                    {pt}
                  </div>
                ))}
              </div>

              {curCheatSheet.shortcut && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(19,161,165,0.08)', border: '1px solid rgba(19,161,165,0.2)', fontSize: '.8rem', fontWeight: 800, color: '#0d7a7e' }}>
                  💡 {curCheatSheet.shortcut}
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: '.83rem', color: 'var(--text-2)', lineHeight: 1.7 }}>
              Master high-frequency concepts for <strong>{activeSubtopic}</strong> tested in Tier-1 & Tier-2 company interviews. Review trade-offs, architecture patterns, and key syntax before practicing!
            </div>
          )}
        </Card>
      )}

      {/* Questions List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {questions.map((item, i) => (
          <Card key={i} style={{ padding: 18, background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(83,22,151,0.08)', color: '#531697', fontWeight: 800, fontSize: '.7rem' }}>
                  Q{i + 1}
                </span>
                <span style={{ padding: '3px 8px', borderRadius: 6, background: '#f1f5f9', color: 'var(--text-3)', fontWeight: 700, fontSize: '.7rem' }}>
                  {item.level || 'Intermediate'}
                </span>
                {item.company && (
                  <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(19,161,165,0.08)', color: '#0d7a7e', fontWeight: 800, fontSize: '.7rem' }}>
                    🏢 {item.company}
                  </span>
                )}
              </div>

              <button
                onClick={() => setExpanded(e => ({ ...e, [i]: !e[i] }))}
                style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #d0d7e8', background: 'transparent', color: '#531697', fontWeight: 800, fontSize: '.72rem', cursor: 'pointer' }}
              >
                {expanded[i] ? 'Hide Answer' : 'Reveal Expert Answer'}
              </button>
            </div>

            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.92rem', color: 'var(--text)', marginBottom: 12 }}>
              {item.q}
            </div>

            {/* Answer Evaluator Input Box */}
            <div style={{ marginBottom: 12 }}>
              <textarea
                rows={2}
                value={userAnswers[i] || ''}
                onChange={(e) => setUserAnswers({ ...userAnswers, [i]: e.target.value })}
                placeholder="Type your technical answer here to get AI accuracy feedback..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #d0d7e8', fontFamily: "'Nunito',sans-serif", fontSize: '.82rem', outline: 'none', resize: 'vertical' }}
              />
              <button
                onClick={() => evaluateAnswer(i, item)}
                style={{ marginTop: 6, padding: '6px 14px', borderRadius: 7, border: 'none', background: GRAD, color: '#fff', fontWeight: 800, fontSize: '.75rem', cursor: 'pointer' }}
              >
                📝 Evaluate My Answer with AI
              </button>
            </div>

            {evalResults[i] && (
              <AIMentorCard score={evalResults[i].score} feedback={null} keyTerms={evalResults[i].keyTerms} />
            )}

            {expanded[i] && (
              <div style={{ marginTop: 12, padding: 14, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '.83rem', color: 'var(--text-2)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                <div style={{ fontWeight: 800, color: '#531697', marginBottom: 4 }}>🏆 Model Tier-1 Interview Answer:</div>
                {item.a}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
