import React from 'react';
import { useNavigate } from 'react-router-dom';

const FEATURES = [
  { icon: '🧠', title: 'SkillPath AI', desc: 'Upload your resume + job description. Get ATS score, skill gap analysis, and a personalised learning roadmap instantly.', color: '#531697' },
  { icon: '📚', title: 'Smart Notes', desc: 'Department-wise, subject-wise notes from faculty and students. Searchable. Downloadable. Always updated.', color: '#13a1a5' },
  { icon: '💻', title: 'Daily Practice', desc: 'Adaptive coding problems from LeetCode & HackerRank matched to your skill level. Track your streak.', color: '#042c5d' },
  { icon: '🏢', title: 'Company Intel', desc: 'Detailed profiles of companies visiting campus — rounds, aptitude patterns, difficulty, CTC, and prep tips.', color: '#47d372' },
  { icon: '🎯', title: 'Aptitude Prep', desc: 'Topic-wise questions (Quant, Logical, Verbal, Technical) with explanations and interactive quiz mode.', color: '#f59e0b' },
  { icon: '💬', title: 'Doubt Resolution', desc: 'Post doubts to peers or faculty. Threaded discussions. Searchable knowledge repository.', color: '#3b82f6' },
];

const HOW = [
  { role: '🎓 Student', steps: ['Sign up & upload resume on first login', 'Get placed in Beginner / Intermediate / Expert tier', 'Solve daily problems, prepare company-wise', 'Run SkillPath AI against any job description', 'Track ATS score, fill skill gaps, land the offer'] },
  { role: '👨‍🏫 Faculty', steps: ['Upload notes by department & subject', 'Answer student doubts in your domain', 'Review student placement readiness', 'Monitor which topics need more coverage', 'Collaborate on company preparation resources'] },
  { role: '⚙️ Admin', steps: ['Approve notes from students/faculty', 'Add company data — rounds, prep tips, CTC', 'Bulk upload aptitude question banks', 'Monitor cohort skill distribution', 'Manage users, set semester context'] },
];

export default function LandingPage() {
  const nav = useNavigate();

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", color: '#0f1a2e', overflowX: 'hidden', background: 'transparent' }}>

      {/* ── Topbar ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(4,44,93,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 5%',
      }}>
        <img src="/logo.png" alt="PRAGATI" style={{ height: 42, objectFit: 'contain' }} />
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => nav('/login')} className="btn btn-ghost">Sign In</button>
          <button onClick={() => nav('/register')} className="btn btn-primary">Get Started →</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        minHeight: '92vh',
        background: 'linear-gradient(150deg, #f8f9ff 0%, #f0eeff 40%, #e8fdfd 70%, #f0fff5 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '60px 5%',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative blobs */}
        <div style={{ position:'absolute', top:'-10%', right:'-5%', width:500, height:500, borderRadius:'60% 40% 70% 30% / 50% 60% 40% 50%', background:'linear-gradient(135deg,#531697,#13a1a5)', opacity:.06 }} />
        <div style={{ position:'absolute', bottom:'-10%', left:'-5%', width:400, height:400, borderRadius:'40% 60% 30% 70% / 60% 40% 60% 40%', background:'linear-gradient(135deg,#042c5d,#47d372)', opacity:.05 }} />
        <div style={{ position:'absolute', top:'20%', left:'5%', width:200, height:200, borderRadius:'50%', background:'linear-gradient(135deg,#13a1a5,#47d372)', opacity:.06 }} />

        {/* Logo */}
        <div className="fade-up" style={{ marginBottom: 32 }}>
          <img src="/logo.png" alt="PRAGATI" style={{ height: 100, objectFit: 'contain', filter: 'drop-shadow(0 8px 32px rgba(83,22,151,0.2))' }} />
        </div>

        <div className="fade-up-1">
          <div style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, rgba(83,22,151,0.08), rgba(19,161,165,0.08))',
            border: '1px solid rgba(83,22,151,0.15)',
            borderRadius: 999, padding: '5px 16px',
            fontSize: '.82rem', fontWeight: 700, color: '#531697',
            letterSpacing: '.04em', marginBottom: 20,
          }}>
            🚀 Campus Placement Intelligence System
          </div>
        </div>

        <h1 className="fade-up-2" style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 800,
          fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: 1.15,
          maxWidth: 780, marginBottom: 20,
        }}>
          From First Year to
          <span style={{ display: 'block', background: 'linear-gradient(135deg,#042c5d,#531697,#13a1a5,#47d372)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            First Offer
          </span>
        </h1>

        <p className="fade-up-3" style={{ fontSize: '1.1rem', color: '#3d4e6b', maxWidth: 580, marginBottom: 36, lineHeight: 1.7 }}>
          PRAGATI unifies your academic notes, daily coding practice, aptitude prep, company intelligence, and AI-powered resume analysis — into one platform built for engineering students.
        </p>

        <div className="fade-up-3" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => nav('/register')} className="btn btn-primary" style={{ padding: '13px 28px', fontSize: '1rem' }}>
            Start Your Journey →
          </button>
          <button onClick={() => nav('/login')} className="btn btn-ghost" style={{ padding: '13px 28px', fontSize: '1rem' }}>
            I have an account
          </button>
        </div>

        {/* Quick stats */}
        <div className="fade-up-3" style={{ display:'flex', gap:32, marginTop:52, flexWrap:'wrap', justifyContent:'center' }}>
          {[['6', 'Integrated Modules'],['AI', 'Powered Analysis'],['3', 'User Roles'],['∞', 'Growth Potential']].map(([n,l]) => (
            <div key={l} style={{ textAlign:'center' }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'2rem', background:'linear-gradient(135deg,#042c5d,#531697)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>{n}</div>
              <div style={{ fontSize:'.78rem', color:'#7a8ba8', fontWeight:600, marginTop:2 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: '80px 5%', background: '#fff' }}>
        <div style={{ textAlign:'center', marginBottom:52 }}>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'clamp(1.6rem,3vw,2.4rem)', marginBottom:12 }}>
            Everything you need to
            <span style={{ display:'block', background:'linear-gradient(90deg,#531697,#13a1a5)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>crack placements</span>
          </h2>
          <p style={{ color:'#7a8ba8', maxWidth:500, margin:'0 auto', lineHeight:1.7 }}>Six focused modules that work together across your entire preparation journey.</p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:20, maxWidth:1100, margin:'0 auto' }}>
          {FEATURES.map(f => (
            <div key={f.title} className="card card-hover" style={{ padding:'24px 22px', transition:'all .2s' }}>
              <div style={{ width:48, height:48, borderRadius:14, background:`${f.color}14`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.4rem', marginBottom:14 }}>{f.icon}</div>
              <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:'1.05rem', marginBottom:8, color:f.color }}>{f.title}</h3>
              <p style={{ color:'#7a8ba8', fontSize:'.875rem', lineHeight:1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ padding:'80px 5%', background:'linear-gradient(135deg,#f8f9ff,#f0eeff,#e8fdfd)' }}>
        <div style={{ textAlign:'center', marginBottom:52 }}>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'clamp(1.6rem,3vw,2.4rem)', marginBottom:12 }}>
            How PRAGATI works
          </h2>
          <p style={{ color:'#7a8ba8' }}>Different roles, one connected platform.</p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:24, maxWidth:1000, margin:'0 auto' }}>
          {HOW.map((h,i) => (
            <div key={h.role} className="card" style={{ padding:'28px 24px' }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.1rem', marginBottom:18, color:['#042c5d','#531697','#0d7a7e'][i] }}>{h.role}</div>
              <ol style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:10 }}>
                {h.steps.map((s,j) => (
                  <li key={j} style={{ display:'flex', gap:10, alignItems:'flex-start', fontSize:'.875rem', color:'#3d4e6b' }}>
                    <span style={{
                      width:22, height:22, borderRadius:'50%', flexShrink:0,
                      background:['linear-gradient(135deg,#042c5d,#531697)','linear-gradient(135deg,#531697,#13a1a5)','linear-gradient(135deg,#13a1a5,#47d372)'][i],
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:'.65rem', fontWeight:800, color:'#fff',
                    }}>{j+1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding:'80px 5%', background:'linear-gradient(135deg,#042c5d,#531697,#13a1a5)', textAlign:'center' }}>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'clamp(1.6rem,3vw,2.4rem)', color:'#fff', marginBottom:16 }}>
          Your placement journey starts today
        </h2>
        <p style={{ color:'rgba(255,255,255,0.75)', marginBottom:32, fontSize:'1.05rem' }}>
          Join KIT's College of Engineering on PRAGATI — built for your batch, your companies, your success.
        </p>
        <button onClick={() => nav('/register')} className="btn" style={{ background:'#fff', color:'#531697', padding:'14px 36px', fontSize:'1rem', fontWeight:800, boxShadow:'0 8px 32px rgba(0,0,0,0.2)' }}>
          Register Now — It's Free
        </button>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background:'#0b1628', color:'rgba(255,255,255,0.5)', textAlign:'center', padding:'28px 5% 32px', fontSize:'.82rem', marginTop:0 }}>
        <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:12, background:'rgba(255,255,255,0.08)', padding:'6px 16px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)' }}>
          <img src="/logo.png" alt="PRAGATI" style={{ height:24, objectFit:'contain' }} />
          <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.85rem', color:'rgba(255,255,255,0.6)', letterSpacing:'.08em' }}>PRAGATI</span>
        </div>
        <p style={{ color:'rgba(255,255,255,0.6)' }}>PRAGATI — Campus Placement Intelligence System</p>
        <p style={{ marginTop:6, color:'rgba(255,255,255,0.35)', fontSize:'.75rem' }}>KIT's College of Engineering · Dept. CSE (AI&ML) · 2026-27</p>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Nunito:wght@400;600&display=swap');
        .btn { display:inline-flex; align-items:center; gap:6px; padding:9px 20px; border-radius:10px; font-family:'Nunito',sans-serif; font-size:.875rem; font-weight:700; border:none; cursor:pointer; transition:all .18s; }
        .btn-primary { background:linear-gradient(135deg,#531697,#13a1a5); color:#fff; box-shadow:0 4px 16px rgba(83,22,151,0.25); }
        .btn-primary:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(83,22,151,0.35); }
        .btn-ghost { background:transparent; color:#3d4e6b; border:1.5px solid #e4e8f0; }
        .btn-ghost:hover { border-color:#13a1a5; color:#13a1a5; }
        .card { background:#fff; border:1px solid #e4e8f0; border-radius:14px; box-shadow:0 2px 8px rgba(4,44,93,0.07); }
        .card-hover { transition:all .2s; }
        .card-hover:hover { box-shadow:0 8px 32px rgba(4,44,93,0.12); transform:translateY(-3px); }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation:fadeUp .5s ease forwards; }
        .fade-up-1 { animation:fadeUp .5s .1s ease both; }
        .fade-up-2 { animation:fadeUp .5s .2s ease both; }
        .fade-up-3 { animation:fadeUp .5s .3s ease both; }
      `}</style>
    </div>
  );
}
