/**
 * PRAGATI — Practice Round Content Seeder
 * Run: node src/utils/practice-rounds-seed.js
 *
 * Seeds HR, GD, Technical, Case Study, System Design, Project,
 * Puzzle, and Debugging questions into MongoDB.
 *
 * To ADD MORE QUESTIONS: just push more objects into the arrays
 * below and re-run this script. It uses upsert so no duplicates.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pragati';

// ── Schemas ───────────────────────────────────────────────────────────────────

const HRQuestionSchema = new mongoose.Schema({
  question: String, category: String,
  sampleAnswer: String, keywords: [String],
  difficulty: { type:String, enum:['Easy','Medium','Hard'], default:'Medium' },
}, { timestamps:true });

const GDTopicSchema = new mongoose.Schema({
  topic: String, category: String, difficulty: String,
  keyPoints: [String], modelAnswer: String,
}, { timestamps:true });

const TechnicalQuestionSchema = new mongoose.Schema({
  subject: String, question: String, answer: String,
  difficulty: { type:String, enum:['Easy','Medium','Hard'], default:'Medium' },
  tags: [String],
}, { timestamps:true });

const CaseStudySchema = new mongoose.Schema({
  title: String, difficulty: String, context: String,
  sections: [String],
  sampleAnswer: { type: Map, of: String },
  keywords: [String], domain: String,
}, { timestamps:true });

const PuzzleSchema = new mongoose.Schema({
  title: String, puzzle: String, hint: String,
  answer: String, explanation: String, category: String,
  difficulty: { type:String, enum:['Easy','Medium','Hard'], default:'Medium' },
}, { timestamps:true });

const DebuggingProblemSchema = new mongoose.Schema({
  title: String, lang: String, difficulty: String,
  buggy: String, options: [String], correct: Number,
  fixed: String, explanation: String,
}, { timestamps:true });

const HRQuestion         = mongoose.model('HRQuestion', HRQuestionSchema);
const GDTopic            = mongoose.model('GDTopic', GDTopicSchema);
const TechnicalQuestion  = mongoose.model('TechnicalQuestion', TechnicalQuestionSchema);
const CaseStudy          = mongoose.model('CaseStudy', CaseStudySchema);
const Puzzle             = mongoose.model('Puzzle', PuzzleSchema);
const DebuggingProblem   = mongoose.model('DebuggingProblem', DebuggingProblemSchema);

// ══════════════════════════════════════════════════════════════════════════════
// HR QUESTIONS — Add more below in the same format
// ══════════════════════════════════════════════════════════════════════════════
const HR_QUESTIONS = [
  { question:'Tell me about yourself.', category:'Introduction', difficulty:'Easy',
    sampleAnswer:`I'm a final-year CS student skilled in Java, Python, and full-stack development. I've built a real-time collaborative editor and an e-commerce platform. I'm passionate about scalable software and excited to contribute from day one.`,
    keywords:['skills','project','passion','contribute','background'] },
  { question:'Why do you want to work here?', category:'Motivation', difficulty:'Easy',
    sampleAnswer:`I've researched your company and I'm impressed by your culture of innovation and the impact your products create. My skills align well with this role, and I'm excited to grow here.`,
    keywords:['research','culture','skills','growth','impact'] },
  { question:'What are your strengths and weaknesses?', category:'Self-Assessment', difficulty:'Easy',
    sampleAnswer:`Strength: I learn fast — picked up React in two weeks. Weakness: I used to struggle with time management, but I now use Notion and time-blocking to stay on track.`,
    keywords:['strength','weakness','improvement','learning','example'] },
  { question:'Where do you see yourself in 5 years?', category:'Goals', difficulty:'Medium',
    sampleAnswer:`As a senior engineer leading teams, contributing to architecture decisions, and possibly pursuing a certification like AWS Solutions Architect.`,
    keywords:['senior','leadership','growth','expertise','certification'] },
  { question:'Describe a challenging situation and how you handled it.', category:'Behavioral - STAR', difficulty:'Medium',
    sampleAnswer:`Two days before our final project demo, our DB had a race condition bug. I analyzed logs, identified the ORM issue, implemented transaction isolation, worked overnight, and we delivered a flawless demo.`,
    keywords:['situation','action','result','challenge','learned'] },
  { question:'How do you handle conflict with a team member?', category:'Teamwork', difficulty:'Medium',
    sampleAnswer:`I have a calm one-on-one, listen actively, then state my view with data. We once disagreed on architecture — presented both approaches to our professor, chose the better one.`,
    keywords:['communication','listen','perspective','resolve','collaboration'] },
  { question:'Why should we hire you?', category:'Motivation', difficulty:'Medium',
    sampleAnswer:`I bring strong technical skills, practical project experience, and a growth mindset. I think about problems holistically, write clean code, and can contribute meaningfully from week one.`,
    keywords:['unique','skills','experience','contribute','technical','evidence'] },
  { question:'How do you prioritize tasks with multiple deadlines?', category:'Work Style', difficulty:'Easy',
    sampleAnswer:`I use an urgency-importance matrix. High urgency + importance goes first. I communicate proactively if a deadline is at risk, and use Notion for daily milestone tracking.`,
    keywords:['priority','urgency','communication','plan','organize','deadline'] },
  { question:'What is your biggest achievement?', category:'Achievement', difficulty:'Easy',
    sampleAnswer:`Winning first place in our college hackathon. We built a real-time disaster alert system in 24 hours using Node.js, React, and Twilio SMS. The experience taught me to build under extreme time pressure.`,
    keywords:['achievement','built','team','result','impact','learned'] },
  { question:'How do you keep your technical skills updated?', category:'Learning', difficulty:'Easy',
    sampleAnswer:`I do 30 min LeetCode daily, follow TLDR and ByteByteGo newsletters, take Udemy courses, and build side projects to apply new concepts practically.`,
    keywords:['learning','habit','resources','practice','side project'] },
  { question:'Are you comfortable with Agile/Scrum?', category:'Work Style', difficulty:'Easy',
    sampleAnswer:`Yes, I've used Scrum in my project teams — two-week sprints, daily stand-ups, sprint planning, and retrospectives. I'm also familiar with Jira and Trello.`,
    keywords:['agile','scrum','sprint','stand-up','jira'] },
  { question:'What motivates you at work?', category:'Motivation', difficulty:'Easy',
    sampleAnswer:`Solving hard problems that create real impact. When my code makes someone's task easier, that's deeply satisfying. I'm also motivated by continuous learning.`,
    keywords:['problem-solving','impact','learning','satisfaction','growth'] },
  { question:'How do you handle failure?', category:'Behavioral - STAR', difficulty:'Medium',
    sampleAnswer:`I view failure as feedback. My first startup idea failed because I didn't validate user needs. I analyzed what went wrong, documented lessons, and applied them — the next project had 200+ active users.`,
    keywords:['failure','learn','analyse','bounce back','apply'] },
  { question:'Describe your ideal work environment.', category:'Culture Fit', difficulty:'Easy',
    sampleAnswer:`One with clear goals, technical challenges, and a culture of continuous learning where feedback is open, mistakes are learning opportunities, and quality is valued.`,
    keywords:['learning','feedback','team','culture','quality'] },
  { question:'What is your expected salary?', category:'Logistics', difficulty:'Hard',
    sampleAnswer:`Based on industry standards for a fresher with my skills, I'd expect [X-Y LPA]. I'm open to discussion and more focused on growth opportunities than just the number.`,
    keywords:['research','range','flexible','growth','open','negotiate'] },
  { question:'Tell me about a time you took initiative.', category:'Behavioral - STAR', difficulty:'Medium',
    sampleAnswer:`During my internship I noticed our deployment was entirely manual. Without being asked, I set up a GitHub Actions CI/CD pipeline. Deployment time dropped from 2 hours to 10 minutes. Adopted company-wide.`,
    keywords:['initiative','identify','action','result','impact'] },
  { question:'Are you a leader or a follower?', category:'Leadership', difficulty:'Medium',
    sampleAnswer:`I believe in situational leadership — I lead when I have expertise or responsibility, and follow actively when learning from someone more experienced. Both are important.`,
    keywords:['situational','lead','follow','team','adaptable'] },
  { question:'How do you manage stress under tight deadlines?', category:'Work Style', difficulty:'Medium',
    sampleAnswer:`I break the problem into smaller tasks, focus on what's controllable, use the Pomodoro technique for focus, and communicate early if I see a risk to the deadline.`,
    keywords:['break down','prioritize','communicate','pomodoro','focus','calm'] },
  { question:'Describe your communication style.', category:'Communication', difficulty:'Easy',
    sampleAnswer:`Clear, concise, and adapted to the audience — more technical with engineers, outcome-focused with managers. I believe in proactive updates and asking clarifying questions early.`,
    keywords:['clear','concise','adapt','audience','proactive','ask'] },
  { question:'Why did you choose computer science?', category:'Introduction', difficulty:'Easy',
    sampleAnswer:`From age 14, I was fascinated by how software solves real problems. I wrote a Python script for my parents' business and seeing it work confirmed my passion. CS is at the intersection of creativity, logic, and impact.`,
    keywords:['passion','origin','problem-solving','impact','motivated'] },
  { question:'How do you work in a team?', category:'Teamwork', difficulty:'Easy',
    sampleAnswer:`I communicate clearly, deliver commitments on time, help unblock teammates, and review code constructively. In my project team of four, I took the tech lead role — made architecture decisions and held weekly syncs.`,
    keywords:['communicate','deliver','help','review','team','role'] },
  { question:'What do you know about our products/services?', category:'Research', difficulty:'Medium',
    sampleAnswer:`I've researched your offerings — specifically [product X] which solves [problem Y]. I've also read about your recent expansion into [area Z]. I'm impressed by how you approach [specific aspect].`,
    keywords:['research','products','mission','impressed','value'] },
  { question:'Can you work under pressure?', category:'Work Style', difficulty:'Easy',
    sampleAnswer:`Yes. During our final project demo week, I fixed a critical bug overnight and delivered on time. Pressure sharpens my focus — I stay calm by breaking problems into steps.`,
    keywords:['pressure','calm','step','deliver','experience'] },
  { question:'What are your hobbies?', category:'Personal', difficulty:'Easy',
    sampleAnswer:`Competitive programming on Codeforces, open-source contributions on GitHub, reading system design content, and chess — which sharpens strategic thinking.`,
    keywords:['hobby','coding','chess','reading','open-source'] },
  { question:'Do you have any questions for us?', category:'Closing', difficulty:'Easy',
    sampleAnswer:`Yes. What does the onboarding process look like? How does the team measure success for this role in the first 90 days? What are growth opportunities within the team?`,
    keywords:['onboarding','success','growth','team','culture'] },
];

// ══════════════════════════════════════════════════════════════════════════════
// GD TOPICS — Add more below
// ══════════════════════════════════════════════════════════════════════════════
const GD_TOPICS = [
  { topic:'Should AI replace human jobs?', category:'Technology', difficulty:'Medium',
    keyPoints:['Automation benefits','Job displacement','New job creation','Reskilling','Human creativity'],
    modelAnswer:`AI will automate repetitive tasks but history shows tech creates more jobs than it destroys. The key lies in reskilling workforces for AI-adjacent roles. The real question is whether we'll adapt fast enough.` },
  { topic:'Work from home vs. office — which is better?', category:'Corporate', difficulty:'Easy',
    keyPoints:['Flexibility','Collaboration','Mental health','Infrastructure','Work-life balance'],
    modelAnswer:`Both have merits. WFH offers flexibility and saves commute time; offices enable serendipitous collaboration. A hybrid model combining both is ideal for most knowledge workers.` },
  { topic:'Is social media doing more harm than good?', category:'Society', difficulty:'Easy',
    keyPoints:['Mental health','Misinformation','Connectivity','Business opportunities','Addiction'],
    modelAnswer:`Social media democratizes information and connects people globally, but unchecked algorithms amplify misinformation and harm mental health. The problem is the business model, not the technology itself.` },
  { topic:'Electric vehicles: Are they truly the future?', category:'Environment', difficulty:'Medium',
    keyPoints:['Battery technology','Charging infrastructure','Carbon emissions','Cost','Range anxiety'],
    modelAnswer:`EVs are the future but transition challenges remain — grid capacity, battery mining ethics, and affordability. Government subsidies and private investment must accelerate infrastructure development.` },
  { topic:'Brain drain from India — problem or opportunity?', category:'Economics', difficulty:'Hard',
    keyPoints:['Talent emigration','Remittances','Startup ecosystem','Policy reforms','Global exposure'],
    modelAnswer:`Brain drain costs India talent but gains remittances, global exposure, and eventually some return as founders. Better domestic opportunities, research funding, and policy reform are the real answers.` },
  { topic:'Cryptocurrency — boon or bane?', category:'Finance', difficulty:'Hard',
    keyPoints:['Decentralization','Volatility','Regulation','Financial inclusion','Fraud'],
    modelAnswer:`Crypto offers decentralization and financial inclusion for the unbanked, but extreme volatility and lack of regulation enable fraud. Regulated stablecoins and CBDCs may offer the best of both worlds.` },
  { topic:'Online education vs. traditional classroom', category:'Education', difficulty:'Easy',
    keyPoints:['Accessibility','Engagement','Practical skills','Cost','Infrastructure'],
    modelAnswer:`Online education democratizes access and reduces cost but lacks social interaction and practical labs. A blended approach combining online theory with in-person labs and mentorship is optimal.` },
  { topic:'Should voting age be reduced to 16?', category:'Politics', difficulty:'Medium',
    keyPoints:['Maturity','Civic responsibility','Youth representation','International examples','Education'],
    modelAnswer:`16-year-olds pay taxes, can drive, and are directly affected by policy decisions. Countries like Scotland and Austria have extended voting rights successfully. Civic education should accompany any such change.` },
  { topic:'Startups vs. Large Corporations — which to join?', category:'Corporate', difficulty:'Easy',
    keyPoints:['Learning','Stability','Risk','Compensation','Culture','Impact'],
    modelAnswer:`Startups offer learning speed and ownership; corporations offer stability and resources. The right choice depends on individual risk appetite, career stage, and what you value — impact or security.` },
  { topic:'Is India ready for 5G?', category:'Technology', difficulty:'Medium',
    keyPoints:['Infrastructure','Cost','Use cases','Rural connectivity','Privacy'],
    modelAnswer:`5G deployment is underway in metros but rural India lacks the infrastructure. Success requires affordable smartphones, dense tower networks, and compelling use cases beyond faster mobile internet.` },
  { topic:'Nuclear energy — should India expand it?', category:'Environment', difficulty:'Hard',
    keyPoints:['Clean energy','Safety','Cost','Waste disposal','Energy security'],
    modelAnswer:`Nuclear provides reliable baseload clean energy. India's thorium reserves make it strategically valuable. Safety concerns are real but modern reactors are far safer. Long-term waste storage remains the key challenge.` },
  { topic:'Impact of IPL on Indian cricket', category:'Sports', difficulty:'Easy',
    keyPoints:['Talent discovery','Commercialization','Player workload','Global players','Revenue'],
    modelAnswer:`IPL has transformed Indian cricket by creating a talent pipeline, generating massive revenue, and exposing players to world-class competition. However, excessive T20 cricket risks player burnout and Test cricket quality.` },
];

// ══════════════════════════════════════════════════════════════════════════════
// TECHNICAL QUESTIONS — Add more below by subject
// ══════════════════════════════════════════════════════════════════════════════
const TECHNICAL_QUESTIONS = [
  // DBMS
  { subject:'DBMS', difficulty:'Medium', tags:['normalization','design'],
    question:'What is normalization? Explain 1NF, 2NF, 3NF.',
    answer:`1NF: Atomic values, no repeating groups.\n2NF: 1NF + no partial dependency (non-key attributes fully depend on PK).\n3NF: 2NF + no transitive dependency.\nBCNF: Stronger 3NF — every determinant must be a candidate key.` },
  { subject:'DBMS', difficulty:'Easy', tags:['sql','joins'],
    question:'Explain types of SQL JOINs.',
    answer:`INNER JOIN: Only matching rows from both tables.\nLEFT JOIN: All left + matching right (NULL if no match).\nRIGHT JOIN: All right + matching left.\nFULL OUTER JOIN: All rows from both.\nCROSS JOIN: Cartesian product.\nSELF JOIN: Table joined with itself.` },
  { subject:'DBMS', difficulty:'Medium', tags:['transaction','acid'],
    question:'What are ACID properties?',
    answer:`Atomicity: All or nothing — full commit or full rollback.\nConsistency: DB moves between valid states only.\nIsolation: Concurrent transactions don't interfere.\nDurability: Committed data persists even after crashes.` },
  { subject:'DBMS', difficulty:'Medium', tags:['index','performance'],
    question:'Explain database indexing. What are its types?',
    answer:`Index: Data structure (B-Tree/Hash) for fast lookup without full table scan.\nTypes: Primary (on PK), Unique, Composite (multiple cols), Clustered (reorders data), Non-clustered (separate structure), Full-text.\nTradeoff: Faster SELECT; slower INSERT/UPDATE/DELETE.` },
  { subject:'DBMS', difficulty:'Hard', tags:['concurrency','lock'],
    question:'What is a deadlock in databases? How to prevent it?',
    answer:`Deadlock: T1 waits for T2's lock; T2 waits for T1's lock — neither proceeds.\nPrevention: Lock ordering (always acquire in same sequence), timeout-based rollback.\nDetection: Wait-for graph — if cycle found → rollback youngest transaction.\nSQL: SET LOCK_TIMEOUT, DEADLOCK_PRIORITY.` },
  { subject:'DBMS', difficulty:'Easy', tags:['sql','basics'],
    question:'What is the difference between WHERE and HAVING?',
    answer:`WHERE: Filters rows BEFORE aggregation — works on individual row data.\nHAVING: Filters groups AFTER GROUP BY — works on aggregated data.\nRule: Non-aggregate filter → WHERE. Aggregate filter (COUNT/SUM/AVG) → HAVING.` },
  { subject:'DBMS', difficulty:'Hard', tags:['cap','distributed'],
    question:'Explain CAP theorem.',
    answer:`CAP: A distributed system can guarantee at most 2 of 3:\nConsistency: Every read gets most recent write.\nAvailability: Every request gets a response.\nPartition Tolerance: System works despite network partitions.\nSince partitions are inevitable: choice is CP (MongoDB, ZooKeeper) vs AP (Cassandra, DynamoDB).` },
  { subject:'DBMS', difficulty:'Medium', tags:['view','stored-procedure'],
    question:'What is the difference between a view and a stored procedure?',
    answer:`View: Virtual table defined by SELECT query. No data storage. Used for simplification and security.\nStored Procedure: Precompiled SQL logic block. Can use DML (INSERT/UPDATE/DELETE). Called with EXECUTE. Has side effects.\nMaterialized View: Physically stores query result — refreshed periodically.` },
  // OS
  { subject:'OS', difficulty:'Easy', tags:['process','thread'],
    question:'What is the difference between a process and a thread?',
    answer:`Process: Independent execution unit with own memory (code, heap, stack, data).\nThread: Lightweight unit within a process sharing its memory.\nProcess creation: ~10x slower than thread. Thread switch faster (no memory map change).\nProcess crash doesn't affect others; thread crash can kill the process.` },
  { subject:'OS', difficulty:'Medium', tags:['scheduling','cpu'],
    question:'Explain CPU scheduling algorithms.',
    answer:`FCFS: Non-preemptive, simple, causes convoy effect.\nSJF: Optimal avg waiting time; may starve long processes.\nSRTF: Preemptive SJF.\nRound Robin: Fixed time quantum; fair for all processes.\nPriority: Higher priority first; aging solves starvation.\nMFQ: Multiple queues with feedback based on behavior.` },
  { subject:'OS', difficulty:'Medium', tags:['memory','paging'],
    question:'What is virtual memory and paging?',
    answer:`Virtual Memory: Illusion of large memory using disk as RAM extension.\nPaging: Divides virtual space into pages (fixed size, e.g., 4KB). RAM into frames. OS maintains page tables.\nPage Fault: Referenced page not in RAM → OS loads from disk (~1ms vs ~100ns for RAM).\nTLB: Cache for page table entries — speeds up address translation.\nThrashing: Too many page faults → fix by reducing multiprogramming degree.` },
  { subject:'OS', difficulty:'Medium', tags:['deadlock','coffman'],
    question:'What are the four necessary conditions for deadlock?',
    answer:`1. Mutual Exclusion: Resource held by only one process at a time.\n2. Hold and Wait: Process holds resource while waiting for another.\n3. No Preemption: Resources cannot be forcibly taken.\n4. Circular Wait: P1→P2→P3→P1 circular chain.\nPrevent by breaking any one condition.` },
  { subject:'OS', difficulty:'Medium', tags:['semaphore','synchronization'],
    question:'What is a semaphore? How does it differ from mutex?',
    answer:`Semaphore: Integer variable for sync. wait(P) decrements, signal(V) increments.\nBinary semaphore: 0 or 1. Counting semaphore: any non-negative value.\nMutex: Lock with ownership — only the locking thread can unlock.\nDifferences: Mutex has ownership; semaphore doesn't. Mutex is binary; semaphore can count. Mutex for mutual exclusion; semaphore for signaling.` },
  // CN
  { subject:'CN', difficulty:'Easy', tags:['osi','layers'],
    question:'Explain the OSI model — all 7 layers.',
    answer:`L7 Application: HTTP, FTP, DNS, SMTP — user-facing.\nL6 Presentation: Encryption, compression, format.\nL5 Session: Session management (RPC, NetBIOS).\nL4 Transport: TCP (reliable), UDP (fast) — ports, segmentation.\nL3 Network: IP, routing, logical addressing — routers.\nL2 Data Link: Ethernet, MAC, ARP, CRC — switches.\nL1 Physical: Bits on wire — cables, fiber, radio.` },
  { subject:'CN', difficulty:'Medium', tags:['tcp','udp'],
    question:'What are the differences between TCP and UDP?',
    answer:`TCP: Connection-oriented (3-way handshake). Reliable (ACKs, retransmission). Flow/congestion control. Use: HTTP, FTP, email.\nUDP: Connectionless. No reliability. Low latency. Use: DNS, video streaming, VoIP, gaming.` },
  { subject:'CN', difficulty:'Easy', tags:['dns','resolution'],
    question:'What is DNS and how does DNS resolution work?',
    answer:`DNS: Translates domain names to IP addresses.\nResolution: browser cache → OS cache → recursive resolver → root NS → TLD NS → authoritative NS → IP.\nRecord types: A (IPv4), AAAA (IPv6), CNAME (alias), MX (mail), NS (nameserver), TXT (verification).` },
  { subject:'CN', difficulty:'Hard', tags:['https','tls'],
    question:'How does HTTPS/TLS work?',
    answer:`TLS Handshake:\n1. Client Hello: TLS version, cipher suites, random nonce.\n2. Server Hello: Certificate (public key) + chosen cipher.\n3. Client verifies certificate against CA chain.\n4. Key Exchange: ECDHE — both derive shared secret.\n5. Session keys derived — symmetric encryption begins.\nTLS 1.3: 1-RTT, mandatory forward secrecy, no weak ciphers.` },
  // OOPs
  { subject:'OOPs', difficulty:'Easy', tags:['pillars','concepts'],
    question:'Explain the four pillars of OOP.',
    answer:`Encapsulation: Bundle data + methods, hide internals (private + getters/setters).\nAbstraction: Expose only necessary interface, hide implementation.\nInheritance: Child inherits parent behavior. Types: single, multilevel, hierarchical, multiple.\nPolymorphism: Same interface, different behavior — overloading (compile-time) and overriding (runtime).` },
  { subject:'OOPs', difficulty:'Medium', tags:['solid','principles'],
    question:'Explain SOLID principles.',
    answer:`S: Single Responsibility — one class, one reason to change.\nO: Open/Closed — open for extension, closed for modification.\nL: Liskov Substitution — subclasses substitutable for parents.\nI: Interface Segregation — many small interfaces > one fat interface.\nD: Dependency Inversion — depend on abstractions, not concretions.` },
  { subject:'OOPs', difficulty:'Easy', tags:['overloading','overriding'],
    question:'What is the difference between method overloading and overriding?',
    answer:`Overloading: Same class, same name, different parameters. Resolved at compile time.\nOverriding: Subclass reimplements parent method. Same signature. Resolved at runtime via vtable.\nOverloading = compile-time polymorphism. Overriding = runtime polymorphism.` },
  // Java
  { subject:'Java', difficulty:'Easy', tags:['jvm','jdk','jre'],
    question:'What is the difference between JDK, JRE, and JVM?',
    answer:`JVM: Executes bytecode. Platform-specific. Provides GC, JIT.\nJRE: JVM + runtime libraries. Needed to RUN Java apps.\nJDK: JRE + development tools (javac, debugger). Needed to DEVELOP.\nFlow: .java → javac → .class bytecode → JVM → native code.` },
  { subject:'Java', difficulty:'Medium', tags:['collections','hashmap'],
    question:'Explain HashMap internals and collision handling.',
    answer:`HashMap: Array of buckets using hash table. O(1) average.\nJava 8+: Each bucket is linked list; converts to Red-Black tree when 8+ entries.\nCollision: Two keys hash to same bucket → chaining.\nLoad factor: 0.75 default. Resize at 75% capacity (double + rehash).\nNot thread-safe. Use ConcurrentHashMap for concurrent access.` },
  // Python
  { subject:'Python', difficulty:'Easy', tags:['basics','data-structures'],
    question:'Explain list, tuple, set, dict — differences and use cases.',
    answer:`List []: Ordered, mutable, duplicates. O(n) search. Use for sequences.\nTuple (): Ordered, immutable, duplicates. Faster than list. Use for fixed data/dict keys.\nSet {}: Unordered, mutable, no duplicates. O(1) lookup. Use for unique collections.\nDict {k:v}: Key-value, ordered (3.7+), mutable, unique keys. O(1) lookup.` },
  { subject:'Python', difficulty:'Medium', tags:['decorator','functions'],
    question:'What are decorators in Python?',
    answer:`Decorator: Function wrapping another function to extend behavior without modifying it.\n\ndef timer(func):\n  def wrapper(*args, **kwargs):\n    start = time.time()\n    result = func(*args, **kwargs)\n    print(f"Time: {time.time()-start:.3f}s")\n    return result\n  return wrapper\n\n@timer\ndef slow(): time.sleep(1)\n\nBuilt-ins: @property, @staticmethod, @classmethod, @abstractmethod, @lru_cache` },
  // DSA
  { subject:'DSA', difficulty:'Easy', tags:['bfs','dfs','graph'],
    question:'What is the difference between BFS and DFS?',
    answer:`BFS: Queue-based, explores level by level. O(V+E). Finds shortest path in unweighted graph.\nDFS: Stack/recursion, explores as deep as possible. O(V+E). Use: cycle detection, topological sort, paths.\nBFS when: shortest path, level-by-level processing.\nDFS when: cycle detection, topological sort, exhaustive search.` },
  { subject:'DSA', difficulty:'Medium', tags:['dp','dynamic-programming'],
    question:'Explain Dynamic Programming — top-down vs bottom-up.',
    answer:`DP: Solve by breaking into overlapping subproblems and caching results.\nTop-down (Memoization): Recursive + cache. Natural to implement.\nBottom-up (Tabulation): Iterative, fill table from base cases. Better space.\nClassic: Fibonacci, 0/1 Knapsack, LCS, LIS, Coin Change, Edit Distance.` },
  { subject:'DSA', difficulty:'Medium', tags:['sorting','complexity'],
    question:'Time complexity of common sorting algorithms?',
    answer:`Bubble/Selection/Insertion: O(n²) avg, O(1) space.\nMerge Sort: O(n log n) all cases, O(n) space. Stable.\nQuick Sort: O(n log n) avg, O(n²) worst, O(log n) space. Not stable.\nHeap Sort: O(n log n) all cases, O(1) space. Not stable.\nCounting/Radix: O(n+k). Linear time for bounded integers.\nBest practice: QuickSort (cache-friendly), MergeSort (stable), TimSort (Python/Java default).` },
];

// ══════════════════════════════════════════════════════════════════════════════
// CASE STUDIES — Add more below
// ══════════════════════════════════════════════════════════════════════════════
const CASE_STUDIES = [
  { title:'Zomato Delivery Optimization', difficulty:'Medium', domain:'Operations',
    context:`Zomato faces 35% order cancellations due to 60+ min delivery times during peak hours (7-9 PM). Target is 30 min. 10,000 active delivery partners are unevenly distributed. Complaints up 42%.`,
    sections:['Problem','Analysis','Solution','Impact'],
    sampleAnswer: new Map([
      ['Problem','High delivery times (60+ min vs 30-min target) during peak hours causing 35% cancellations.'],
      ['Analysis','Root causes: Uneven partner distribution, demand surges not predicted, no dynamic reallocation. 7-9 PM has 3x demand but only 1.2x capacity.'],
      ['Solution','(1) Predictive demand model to pre-position partners by 6:30 PM. (2) Surge pricing for off-peak orders. (3) Partner incentive program (extra ₹50/delivery during peak). (4) Real-time traffic route optimization.'],
      ['Impact','Expected: delivery time → 35 min, cancellations → <10%, satisfaction +25% within 90 days.'],
    ]),
    keywords:['root cause','demand prediction','incentive','optimization','impact'] },
  { title:'Flipkart Big Billion Day Scaling', difficulty:'Hard', domain:'Technology',
    context:`Flipkart's Big Billion Day sale crashed their servers 3 years ago due to 10x traffic spike. They now need to architect a system that handles 50M concurrent users, 1M orders/hour, with zero downtime.`,
    sections:['Problem','Analysis','Solution','Impact'],
    sampleAnswer: new Map([
      ['Problem','System crash under 10x traffic spike causing revenue loss, customer frustration, and reputational damage.'],
      ['Analysis','Issues: Monolithic architecture, no horizontal scaling, DB as bottleneck, no CDN for static assets, inefficient caching.'],
      ['Solution','Microservices architecture, Auto-scaling (AWS/GCP), Redis for cart/session caching, CDN for static assets, Read replicas for product catalog, Queue-based order processing (Kafka), Circuit breakers. Load test weeks before.'],
      ['Impact','Zero downtime during Big Billion Day for 3 consecutive years. 50M concurrent users served. 99.99% uptime.'],
    ]),
    keywords:['microservices','scaling','cache','cdn','queue','testing'] },
  { title:'BYJU\'s User Retention Problem', difficulty:'Medium', domain:'EdTech',
    context:`BYJU's monthly churn rate is 8%. CAC = ₹3,000. LTV = ₹5,000. LTV:CAC ratio is 1.67:1 (below ideal 3:1). The team needs to reduce churn to <3% within 6 months.`,
    sections:['Problem','Analysis','Solution','Impact'],
    sampleAnswer: new Map([
      ['Problem','8% monthly churn = ~65% annual. LTV:CAC of 1.67:1 makes the business unprofitable at scale.'],
      ['Analysis','Churn drivers: Low engagement after week 1, no personalization, price sensitivity after trial. High-value users who pass key milestones (week 3 module) churn at only 2%.'],
      ['Solution','(1) Engagement loop: Gamification, streaks, progress celebrations in first 30 days. (2) Personalization engine: adapt difficulty based on performance. (3) Parent engagement: weekly progress emails to parents. (4) Price optimization: EMI options, referral discounts.'],
      ['Impact','Churn reduction to 3% = LTV increases to ₹9,500. LTV:CAC improves to 3.17:1. Business becomes unit-economics positive.'],
    ]),
    keywords:['churn','engagement','personalization','LTV','CAC','retention'] },
];

// ══════════════════════════════════════════════════════════════════════════════
// PUZZLES — Add more below
// ══════════════════════════════════════════════════════════════════════════════
const PUZZLES = [
  { title:'The Bridge Crossing', category:'Logic', difficulty:'Medium',
    puzzle:`4 people need to cross a bridge at night with one torch. Bridge holds max 2. Speeds: A=1min, B=2min, C=5min, D=10min. Two people walk at slower person's pace. Minimum time for all to cross?`,
    hint:'The key: the two slowest should cross together. Don\'t always send the fastest back.',
    answer:'17 minutes',
    explanation:`A+B cross (2 min) → A back (1 min) → C+D cross (10 min) → B back (2 min) → A+B cross (2 min) = Total 17 minutes.` },
  { title:'The 12 Balls Problem', category:'Classic', difficulty:'Hard',
    puzzle:`You have 12 identical-looking balls. One is slightly heavier or lighter. You have a balance scale. Use it exactly 3 times. Identify the odd ball AND whether heavier or lighter.`,
    hint:'Each weighing has 3 outcomes: left heavy, right heavy, balanced. 3³=27 > 24 (12 balls × 2 states). Information theory makes it possible.',
    answer:'Divide into groups of 4 and use systematic comparison',
    explanation:`Weigh 4 vs 4 (leaving 4 aside). If balanced → odd ball in remaining 4. If not → odd ball in weighed 8. Continue narrowing down using the result of each weighing to identify both the ball and its nature in 3 total weighings.` },
  { title:'Pirate Gold Distribution', category:'Game Theory', difficulty:'Hard',
    puzzle:`5 pirates find 100 gold coins. Most senior proposes split. 50%+ vote = accepted. Otherwise he's thrown overboard and next proposes. All are rational and greedy. What does Pirate 1 propose?`,
    hint:'Work backwards from 2 pirates. Each pirate accepts if they get more than they would in the next scenario.',
    answer:'P1:96, P2:0, P3:1, P4:0, P5:3',
    explanation:`Working backwards: With 2 pirates, P2 keeps all. With 3, P3 gives P1=1 (accepts vs 0). With 4, P4 gives P2=1. With 5, P1 needs P3(1 coin) and P5(3 coins) to accept. P1 keeps 96.` },
  { title:'Poison Bottles', category:'Binary / Math', difficulty:'Medium',
    puzzle:`A king has 1000 bottles of wine. One is poisoned (kills in 20-29 days). He has 10 prisoners and 30 days. How to identify the poisoned bottle?`,
    hint:'Think binary — 2^10 = 1024 > 1000.',
    answer:'Use binary encoding — each prisoner represents one bit position',
    explanation:`Number bottles 1-1000 in binary (10 bits). Prisoner N drinks from all bottles where bit N = 1. After 20-29 days, the dead prisoners' positions form the binary number = poisoned bottle.` },
  { title:'Two Egg Problem', category:'DP / Math', difficulty:'Medium',
    puzzle:`You have 2 eggs and a 100-floor building. Find the minimum number of trials needed in the worst case to determine the highest safe floor from which an egg won't break.`,
    hint:'Think about minimizing the maximum number of tries. If the first egg breaks on floor X, you have X-1 trials left for the second egg.',
    answer:'14 trials',
    explanation:`Drop first egg from floors 14, 27, 39, 50, 60, 69, 77, 84, 90, 95, 99, 100 (intervals decreasing by 1). If it breaks at floor 14, linearly check floors 1-13 with second egg. At most 14 total trials.` },
  { title:'3 Bulbs 3 Switches', category:'Logic', difficulty:'Easy',
    puzzle:`In a room are 3 lightbulbs. Outside are 3 switches. You can only enter the room once. How do you determine which switch controls which bulb?`,
    hint:'Bulbs give off heat. Use both light AND heat as signals.',
    answer:'Use heat from the bulbs as additional information',
    explanation:`Turn on Switch 1 for 10 minutes, then turn it off. Turn on Switch 2. Enter the room. Hot+off = Switch 1. On = Switch 2. Cold+off = Switch 3.` },
  { title:'Infinite Chess Board', category:'Math', difficulty:'Hard',
    puzzle:`On an infinite chessboard, a chess knight is placed at the origin. Can the knight reach any square? How many moves does it take to reach square (1,0)?`,
    hint:'A knight moves in an L-shape: 2+1. Consider parity of squares.',
    answer:'Yes, any square is reachable. Square (1,0) requires at minimum 3 moves.',
    explanation:`Knight moves change the sum of coordinates by ±1 or ±3 (always odd). (1,0) has odd sum, so it's reachable. Minimum path: (0,0)→(2,1)→(0,2)→(1,0) = 3 moves.` },
  { title:'Weighing Gold Coins', category:'Math', difficulty:'Easy',
    puzzle:`You have 10 stacks of coins, each with 10 coins. One stack is fake — all coins are 1 gram lighter than real (10g vs 9g). You have a digital weighing scale (one use). How do you find the fake stack?`,
    hint:'Take different numbers of coins from each stack.',
    answer:'Take 1 coin from stack 1, 2 from stack 2, ... 10 from stack 10. Weigh all 55.',
    explanation:`If all were real: 55 × 10g = 550g. If stack N is fake: weight = 550 - N. So (550 - actual_weight) = N = fake stack number.` },
];

// ══════════════════════════════════════════════════════════════════════════════
// DEBUGGING PROBLEMS — Add more below
// ══════════════════════════════════════════════════════════════════════════════
const DEBUGGING_PROBLEMS = [
  { title:'Off-by-one Error', lang:'JavaScript', difficulty:'Easy',
    buggy:`function findMax(arr) {\n  let max = arr[0];\n  for (let i = 0; i <= arr.length; i++) {\n    if (arr[i] > max) max = arr[i];\n  }\n  return max;\n}\n// findMax([3,1,4,1,5]) → NaN`,
    options:['Loop should use i < arr.length (not <=)','max should start at 0','Return statement is wrong','Comparison should be arr[i] >= max'],
    correct:0,
    fixed:`function findMax(arr) {\n  let max = arr[0];\n  for (let i = 0; i < arr.length; i++) {  // Fixed: < not <=\n    if (arr[i] > max) max = arr[i];\n  }\n  return max;\n}`,
    explanation:`i <= arr.length accesses arr[arr.length] which is undefined. NaN comparisons cause incorrect results.` },
  { title:'Infinite Recursion', lang:'Python', difficulty:'Easy',
    buggy:`def factorial(n):\n  if n == 0:\n    return 1\n  return n * factorial(n)  # Bug!\n# factorial(5) → RecursionError`,
    options:['Missing base case for n < 0','Should be factorial(n-1) not factorial(n)','Return should be n + factorial(n)','if n == 0 should be if n == 1'],
    correct:1,
    fixed:`def factorial(n):\n  if n == 0:\n    return 1\n  return n * factorial(n - 1)  # Fixed`,
    explanation:`factorial(n) calls itself with the same n, never reaching the base case (n==0), causing infinite recursion.` },
  { title:'Missing Await', lang:'JavaScript', difficulty:'Medium',
    buggy:`async function fetchUser(id) {\n  const response = fetch(\`/api/users/\${id}\`);\n  const data = response.json();  // Bug!\n  return data.name;\n}\n// TypeError: response.json is not a function`,
    options:['fetch() should be XMLHttpRequest','Missing await before fetch() and response.json()','URL is wrong','Should use .then() instead'],
    correct:1,
    fixed:`async function fetchUser(id) {\n  const response = await fetch(\`/api/users/\${id}\`);  // await\n  const data = await response.json();              // await\n  return data.name;\n}`,
    explanation:`Without await, fetch() returns a Promise (not a Response). Calling .json() on a Promise throws TypeError.` },
  { title:'SQL N+1 Query', lang:'SQL/JS', difficulty:'Medium',
    buggy:`const orders = db.query("SELECT * FROM orders");\norders.forEach(order => {\n  const customer = db.query(\n    \`SELECT name FROM customers WHERE id = \${order.customer_id}\`\n  );\n  order.customerName = customer.name;\n});\n// 1000 orders = 1001 queries!`,
    options:['Use a for loop instead of forEach','Use JOIN to fetch in a single query','Add index to customer_id','Use async/await'],
    correct:1,
    fixed:`const ordersWithCustomers = db.query(\`\n  SELECT orders.*, customers.name AS customerName\n  FROM orders\n  INNER JOIN customers ON orders.customer_id = customers.id\n\`);\n// 1 query instead of N+1`,
    explanation:`N+1 problem: 1 query for list + N queries for each item. Fix: JOIN to fetch all data in one query.` },
  { title:'Race Condition', lang:'Python', difficulty:'Hard',
    buggy:`import threading\ncounter = 0\ndef increment():\n  global counter\n  for _ in range(100000):\n    counter += 1  # Not thread-safe!\nt1 = threading.Thread(target=increment)\nt2 = threading.Thread(target=increment)\nt1.start(); t2.start()\nt1.join(); t2.join()\nprint(counter)  # Expected 200000, gets less!`,
    options:['Use counter += 2 instead','counter += 1 is not atomic — needs a Lock','Use multiprocessing instead','Use range(50000) each'],
    correct:1,
    fixed:`import threading\ncounter = 0\nlock = threading.Lock()\ndef increment():\n  global counter\n  for _ in range(100000):\n    with lock:  # Lock before modifying\n      counter += 1\n# Always: 200000`,
    explanation:`counter += 1 involves READ-ADD-WRITE. Without lock, both threads read same value simultaneously and lose one increment (race condition).` },
  { title:'Null Pointer Dereference', lang:'Java', difficulty:'Easy',
    buggy:`String name = null;\nif (name.equals("admin")) {\n  System.out.println("Welcome admin!");\n}\n// NullPointerException!`,
    options:['equals() method is deprecated','Calling .equals() on null throws NullPointerException','String comparison needs == not equals()','Should use compareTo() instead'],
    correct:1,
    fixed:`String name = null;\nif ("admin".equals(name)) {  // Yoda condition — safe even if name is null\n  System.out.println("Welcome admin!");\n}\n// Or: if (name != null && name.equals("admin"))`,
    explanation:`null.equals() throws NullPointerException. Use "literal".equals(variable) (Yoda condition) or null-check first.` },
  { title:'Mutable Default Argument', lang:'Python', difficulty:'Medium',
    buggy:`def add_item(item, lst=[]):  # Bug!\n  lst.append(item)\n  return lst\n\nprint(add_item(1))  # [1]\nprint(add_item(2))  # Expected [2], got [1, 2]!`,
    options:['Should use lst = list() inside function','Default mutable argument is shared across all calls','append() should be extend()','item and lst parameters are reversed'],
    correct:1,
    fixed:`def add_item(item, lst=None):  # Fixed\n  if lst is None:\n    lst = []\n  lst.append(item)\n  return lst\n\nprint(add_item(1))  # [1]\nprint(add_item(2))  # [2] ✅`,
    explanation:`Default mutable arguments (list, dict) are created once at function definition and shared across all calls. Use None as default and create a new list inside.` },
  { title:'Integer Overflow', lang:'Java', difficulty:'Medium',
    buggy:`int a = 2000000000;\nint b = 2000000000;\nlong sum = a + b;  // Bug!\nSystem.out.println(sum);  // Prints -294967296 not 4000000000`,
    options:['Should use double instead of long','a + b overflows int before assignment to long','long cannot hold values > 2 billion','Should use Math.addExact()'],
    correct:1,
    fixed:`int a = 2000000000;\nint b = 2000000000;\nlong sum = (long) a + b;  // Cast a to long first\nSystem.out.println(sum);  // 4000000000 ✅`,
    explanation:`a + b is evaluated as int arithmetic first (overflow!), then stored in long. Cast one operand to long before adding.` },
];

// ══════════════════════════════════════════════════════════════════════════════
// SEED FUNCTION
// ══════════════════════════════════════════════════════════════════════════════
async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const ops = [
    { model: HRQuestion,        data: HR_QUESTIONS,        name: 'HR Questions' },
    { model: GDTopic,           data: GD_TOPICS,           name: 'GD Topics' },
    { model: TechnicalQuestion, data: TECHNICAL_QUESTIONS, name: 'Technical Questions' },
    { model: CaseStudy,         data: CASE_STUDIES,        name: 'Case Studies' },
    { model: Puzzle,            data: PUZZLES,             name: 'Puzzles' },
    { model: DebuggingProblem,  data: DEBUGGING_PROBLEMS,  name: 'Debugging Problems' },
  ];

  for (const { model, data, name } of ops) {
    await model.deleteMany({});
    const inserted = await model.insertMany(data);
    console.log(`✅ ${name}: ${inserted.length} documents seeded`);
  }

  console.log('\n🎉 All practice round content seeded successfully!');
  console.log('\nTO ADD MORE QUESTIONS:');
  console.log('  1. Open this file: backend/src/utils/practice-rounds-seed.js');
  console.log('  2. Add objects to the relevant array (HR_QUESTIONS, GD_TOPICS, etc.)');
  console.log('  3. Re-run: node src/utils/practice-rounds-seed.js');

  await mongoose.disconnect();
}

seed().catch(err => { console.error('❌ Seed failed:', err); process.exit(1); });
