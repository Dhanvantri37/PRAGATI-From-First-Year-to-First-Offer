import React, { useState } from 'react';
import { ROUND_RESOURCES } from './RESOURCES';
import { RoundHeader, Card, SectionTitle, AnswerBox, FeedbackPanel, QuestionCard } from './PracticeComponents';

const PROJECT_QUESTIONS = [
  {
    id: 'p1',
    question: 'Tell me about your best project. What was it and what did you build?',
    tip: 'Use the STAR format: Situation → Task → Action → Result. Mention the tech stack upfront.',
    sampleAnswer: `I built a real-time collaborative code editor — similar to Google Docs but for code. The motivation was to help my study group work on DSA problems together without screen sharing.\n\nTech stack: React (frontend), Node.js + Socket.IO (real-time sync), Monaco Editor (VS Code's editor), MongoDB (session persistence), deployed on Heroku.\n\nI implemented operational transformation for conflict resolution when two users type simultaneously. The project handles 50+ concurrent users per session. It was featured in our college tech fest and won first place.`,
    keywords: ['tech stack', 'problem', 'built', 'users', 'result', 'deploy'],
  },
  {
    id: 'p2',
    question: 'What was the biggest technical challenge you faced in your project and how did you solve it?',
    tip: 'Avoid generic answers. Mention a specific technical problem and the exact steps you took to debug/fix it.',
    sampleAnswer: `The biggest challenge was handling real-time synchronization when multiple users edited the same line simultaneously. Initially, users would overwrite each other's changes — classic race condition.\n\nI researched conflict resolution algorithms and implemented Operational Transformation (OT). The concept: each operation (insert/delete) is transformed relative to concurrent operations before being applied.\n\nDebugging was hard — I wrote custom logging middleware to track operation sequences and used Jest to simulate concurrent edits. After two weeks of iteration, the system achieved 99.5% conflict-free sync in stress tests with 20 concurrent users.`,
    keywords: ['challenge', 'debug', 'solution', 'algorithm', 'tested', 'result'],
  },
  {
    id: 'p3',
    question: 'Why did you choose this tech stack? What are its limitations?',
    tip: 'Show you made deliberate choices. Acknowledge trade-offs — it shows engineering maturity.',
    sampleAnswer: `I chose Node.js + Socket.IO because of their excellent support for WebSocket-based real-time applications — the event-driven model is perfect for high-frequency collaborative editing. React was chosen for its component model and the ecosystem (Monaco Editor has a React wrapper).\n\nLimitations: Node.js is single-threaded, so CPU-intensive tasks can block the event loop. In the future, I'd offload heavy operations (like code compilation) to worker threads or a separate Python microservice. MongoDB worked well for flexible session data, but for user data with clear relationships, a relational DB like PostgreSQL would be more appropriate.`,
    keywords: ['chose', 'reason', 'limitation', 'trade-off', 'future', 'alternative'],
  },
  {
    id: 'p4',
    question: 'How would you scale this project to handle 1 million users?',
    tip: 'Think about: horizontal scaling, databases, caching, load balancing, CDN. Even if you haven\'t done it, show your awareness.',
    sampleAnswer: `Currently the app runs on a single Heroku dyno, which wouldn't scale. For 1M users, I'd architect it differently:\n\n1. Horizontally scale Node.js behind a load balancer (AWS ALB). Use sticky sessions or move state out of individual servers.\n2. Replace in-memory session storage with Redis Pub/Sub so all Node instances share real-time events.\n3. Use MongoDB Atlas with sharding based on session ID for the database tier.\n4. Serve static assets (React build) via CDN (CloudFront).\n5. Implement WebSocket connection pooling and graceful degradation.\n6. Add Prometheus + Grafana for monitoring and set auto-scaling rules based on WebSocket connection count.`,
    keywords: ['scale', 'load balancer', 'cache', 'database', 'CDN', 'monitoring', 'horizontal'],
  },
  {
    id: 'p5',
    question: 'What would you do differently if you rebuilt this project from scratch?',
    tip: 'Show self-reflection. Mention architectural improvements, not just "I would write better code".',
    sampleAnswer: `Looking back, I would make three key changes:\n\n1. Start with a proper design doc. I jumped into coding too quickly, which led to refactoring the database schema twice.\n\n2. Write tests from day one. I added tests late (after the core features), which slowed debugging. TDD would have caught edge cases earlier.\n\n3. Use TypeScript instead of JavaScript. The codebase grew to 5,000+ lines, and type safety would have prevented several bugs where I passed wrong object shapes to functions.\n\n4. Containerize early with Docker so the team has a consistent dev environment — we spent too much time on "works on my machine" issues.`,
    keywords: ['improve', 'design', 'testing', 'TypeScript', 'Docker', 'architecture', 'lesson'],
  },
];

export default function ProjectRoundPage() {
  const [answers, setAnswers] = useState({});
  const [showRes, setShowRes] = useState(false);

  return (
    <div style={{ fontFamily: "'Nunito',sans-serif" }}>
      <RoundHeader icon="⚫" title="Project Round Practice" subtitle="Mock interviewer questions about your projects with sample answers" />
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
        <button onClick={()=>setShowRes(r=>!r)}
          style={{ padding:'7px 16px', borderRadius:9, border:`1.5px solid ${showRes?'#374151':'#d0d7e8'}`, background:showRes?'rgba(55,65,81,0.07)':'#fff', color:showRes?'#374151':'#7a8ba8', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.78rem' }}>
          📚 {showRes?'Hide':'Resources'}
        </button>
      </div>
      {showRes && (
        <div style={{ background:'rgba(55,65,81,0.04)', border:'1px solid rgba(55,65,81,0.15)', borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
          <div style={{ fontSize:'.7rem', fontWeight:800, color:'#b0bec9', marginBottom:10 }}>PROJECT ROUND RESOURCES</div>
          <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
            {ROUND_RESOURCES.PROJECT.map((r,i)=>(
              <a key={i} href={r.url} target="_blank" rel="noreferrer"
                style={{ padding:'5px 11px', borderRadius:7, background:r.color+'18', color:r.color, fontSize:'.72rem', fontWeight:800, textDecoration:'none', border:`1px solid ${r.color}30` }}>
                {r.tag} — {r.name} ↗
              </a>
            ))}
          </div>
        </div>
      )}
      <Card style={{ marginBottom: 20, background: 'rgba(83,22,151,0.03)', border: '1px solid rgba(83,22,151,0.12)', padding: '14px 18px' }}>
        <SectionTitle>💡 Pro Tips for Project Interviews</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 8 }}>
          {['Know your project inside-out — architecture, all dependencies, every design choice', 'Quantify impact: "handles 500 concurrent users", "reduced load time by 40%"', 'Prepare a 2-min and 5-min version of your project pitch', 'Be honest about limitations — it shows maturity', 'Have GitHub open and code ready to show'].map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 10px', borderRadius: 8, background: '#fff', border: '1px solid #e8edf5' }}>
              <span style={{ color: '#531697', fontWeight: 800, fontSize: '.75rem', flexShrink: 0 }}>💡</span>
              <span style={{ fontSize: '.75rem', color: '#3d4e6b', lineHeight: 1.5 }}>{tip}</span>
            </div>
          ))}
        </div>
      </Card>

      {PROJECT_QUESTIONS.map((q, i) => (
        <QuestionCard key={q.id} num={i + 1} total={PROJECT_QUESTIONS.length} question={q.question}>
          <div style={{ marginBottom: 8, padding: '6px 10px', borderRadius: 7, background: 'rgba(19,161,165,0.06)', border: '1px solid rgba(19,161,165,0.15)' }}>
            <span style={{ fontSize: '.72rem', color: '#0d7a7e' }}>💡 Tip: {q.tip}</span>
          </div>
          <div style={{ marginBottom: 10 }}>
            <AnswerBox value={answers[q.id] || ''} onChange={v => setAnswers(a => ({ ...a, [q.id]: v }))} placeholder="Type your answer…" rows={4} />
          </div>
          <FeedbackPanel sampleAnswer={q.sampleAnswer} keywords={q.keywords} userAnswer={answers[q.id] || ''} />
        </QuestionCard>
      ))}
    </div>
  );
}
