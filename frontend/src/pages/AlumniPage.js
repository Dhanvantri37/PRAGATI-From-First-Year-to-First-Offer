import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tk  = () => ({ Authorization: `Bearer ${localStorage.getItem('pragati_token')}` });
const tks = () => ({ ...tk(), 'Content-Type': 'application/json' });

const DEPT_COLORS = {
  'CSE':   { bg: 'rgba(83,22,151,0.08)',   color: '#531697',  border: 'rgba(83,22,151,0.2)'  },
  'IT':    { bg: 'rgba(19,161,165,0.08)',   color: '#0e7490',  border: 'rgba(19,161,165,0.2)' },
  'AIML':  { bg: 'rgba(245,158,11,0.1)',    color: '#92400e',  border: 'rgba(245,158,11,0.3)' },
  'ENTC':  { bg: 'rgba(71,211,114,0.08)',   color: '#166534',  border: 'rgba(71,211,114,0.2)' },
  'ME':    { bg: 'rgba(239,68,68,0.08)',    color: '#991b1b',  border: 'rgba(239,68,68,0.2)'  },
  'CE':    { bg: 'rgba(59,130,246,0.08)',   color: '#1d4ed8',  border: 'rgba(59,130,246,0.2)' },
};

const HELP_TYPES = [
  { value: 'mentorship',       label: '🎓 Mentorship',      desc: 'Career guidance & advice' },
  { value: 'referral',         label: '🔗 Job Referral',    desc: 'Refer me to your company' },
  { value: 'resume-review',    label: '📄 Resume Review',   desc: 'Feedback on my resume' },
  { value: 'mock-interview',   label: '🎤 Mock Interview',  desc: 'Practice interview session' },
  { value: 'general',          label: '💬 General Connect', desc: 'Just want to network' },
];

function AlumniCard({ alumni, onConnect, myConnections }) {
  const dept    = alumni.department?.toUpperCase();
  const dc      = DEPT_COLORS[dept] || DEPT_COLORS['CSE'];
  const initials = alumni.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const conn    = myConnections.find(c => c.alumni?._id === alumni._id);

  const statusBadge = conn ? {
    pending:  { label: '⏳ Request Sent',     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'   },
    accepted: { label: '✅ Connected',         color: '#166534', bg: 'rgba(71,211,114,0.1)'   },
    declined: { label: '❌ Declined',          color: '#991b1b', bg: 'rgba(239,68,68,0.08)'   },
  }[conn.status] : null;

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid #e8edf5',
      padding: '20px', boxShadow: '0 2px 12px rgba(4,44,93,0.06)',
      display: 'flex', flexDirection: 'column', gap: 12,
      transition: 'transform 0.15s, box-shadow 0.15s' }}
      onMouseOver={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(83,22,151,0.12)'; }}
      onMouseOut={e =>  { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 2px 12px rgba(4,44,93,0.06)'; }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, background: 'linear-gradient(135deg,#531697,#13a1a5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>
          {alumni.photoUrl
            ? <img src={alumni.photoUrl} alt={alumni.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} onError={e => e.target.style.display='none'} />
            : initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.95rem', color: 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alumni.name}</div>
          <div style={{ fontSize: '.78rem', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {alumni.role || 'Software Engineer'} {alumni.company ? `@ ${alumni.company}` : ''}
          </div>
          {alumni.location && (
            <div style={{ fontSize: '.7rem', color: '#b0bec9', marginTop: 2 }}>📍 {alumni.location}</div>
          )}
        </div>
      </div>

      {/* Badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {alumni.department && (
          <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '.65rem', fontWeight: 700,
            background: dc.bg, color: dc.color, border: `1px solid ${dc.border}` }}>
            {alumni.department}
          </span>
        )}
        {alumni.batch && (
          <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '.65rem', fontWeight: 700,
            background: 'rgba(4,44,93,0.06)', color: '#042c5d', border: '1px solid rgba(4,44,93,0.12)' }}>
            Batch {alumni.batch}
          </span>
        )}
        {alumni.availableFor && alumni.availableFor !== 'none' && (
          <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '.65rem', fontWeight: 700,
            background: 'rgba(71,211,114,0.08)', color: '#166534', border: '1px solid rgba(71,211,114,0.2)' }}>
            ✓ Available for {alumni.availableFor}
          </span>
        )}
      </div>

      {/* Skills */}
      {alumni.skills?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {alumni.skills.slice(0, 5).map(s => (
            <span key={s} style={{ padding: '2px 7px', borderRadius: 6, fontSize: '.62rem', fontWeight: 600,
              background: 'rgba(83,22,151,0.05)', color: '#531697', border: '1px solid rgba(83,22,151,0.12)' }}>
              {s}
            </span>
          ))}
          {alumni.skills.length > 5 && (
            <span style={{ padding: '2px 7px', borderRadius: 6, fontSize: '.62rem', color: '#b0bec9' }}>
              +{alumni.skills.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Bio */}
      {alumni.bio && (
        <div style={{ fontSize: '.75rem', color: 'var(--text-3)', lineHeight: 1.55,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {alumni.bio}
        </div>
      )}

      {/* Mentorship areas */}
      {alumni.mentorshipAreas?.length > 0 && (
        <div style={{ fontSize: '.7rem', color: 'var(--text-3)' }}>
          🎯 Mentors in: <strong>{alumni.mentorshipAreas.slice(0, 3).join(', ')}</strong>
        </div>
      )}

      {/* Action row */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
        <button onClick={() => onAskMentor(alumni)}
          style={{ flex: 1, padding: '8px 12px', borderRadius: 9, border: '1px solid rgba(83,22,151,0.25)',
            background: 'rgba(83,22,151,0.06)', color: '#531697', fontWeight: 800,
            cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          🤖 Ask AI Mentor
        </button>
        {statusBadge ? (
          <div style={{ padding: '8px 12px', borderRadius: 9, textAlign: 'center',
            background: statusBadge.bg, color: statusBadge.color, fontWeight: 700, fontSize: '.75rem',
            border: `1px solid ${statusBadge.color}30` }}>
            {statusBadge.label}
          </div>
        ) : (
          <button onClick={() => onConnect(alumni)}
            style={{ padding: '8px 12px', borderRadius: 9, border: 'none',
              background: 'linear-gradient(135deg,#531697,#13a1a5)', color: '#fff',
              fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.78rem' }}>
            🤝 Connect
          </button>
        )}
        {alumni.linkedinUrl && (
          <a href={alumni.linkedinUrl} target="_blank" rel="noreferrer"
            style={{ padding: '8px 10px', borderRadius: 9, border: '1px solid rgba(10,102,194,0.3)',
              background: 'rgba(10,102,194,0.06)', color: '#0a66c2', fontWeight: 700,
              textDecoration: 'none', fontSize: '.75rem' }}>
            LinkedIn
          </a>
        )}
      </div>
    </div>
  );
}

function AskMentorModal({ alumni, onClose }) {
  const [question, setQuestion] = useState('');
  const [advice, setAdvice]     = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleAsk(e) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/alumni/ask-mentor`, {
        method: 'POST',
        headers: tks(),
        body: JSON.stringify({ alumniId: alumni._id, question }),
      });
      const d = await res.json();
      setAdvice(d.advice || 'No response generated.');
    } catch {
      setAdvice('Failed to get career advice. Please try again.');
    }
    setLoading(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(4,44,93,0.55)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 18, padding: '26px 28px',
        width: '100%', maxWidth: 540, boxShadow: '0 20px 60px rgba(83,22,151,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.15rem', color: 'var(--text)', marginBottom: 4 }}>
          🤖 AI Alumni Career Mentor — {alumni.name}
        </div>
        <div style={{ fontSize: '.82rem', color: 'var(--text-3)', marginBottom: 16 }}>
          {alumni.role} @ {alumni.company} · KIT's Kolhapur Alumnus
        </div>

        <form onSubmit={handleAsk} style={{ marginBottom: 16 }}>
          <label style={{ fontSize: '.75rem', fontWeight: 800, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
            Ask a Career / Technical / Interview Question:
          </label>
          <input value={question} onChange={e => setQuestion(e.target.value)}
            placeholder={`e.g., How did you prepare for ${alumni.company}? What skills should I master?`}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1.5px solid #d0d7e8',
              fontSize: '.84rem', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '10px', borderRadius: 9, border: 'none',
              background: 'linear-gradient(135deg,#531697,#13a1a5)', color: '#fff',
              fontWeight: 800, cursor: loading ? 'default' : 'pointer', fontSize: '.84rem' }}>
            {loading ? '⚡ Generating AI Career Guidance...' : '🚀 Ask AI Mentor'}
          </button>
        </form>

        {advice && (
          <div style={{ background: 'rgba(83,22,151,0.04)', border: '1px solid rgba(83,22,151,0.15)',
            borderRadius: 12, padding: '14px 16px', marginTop: 14 }}>
            <div style={{ fontSize: '.75rem', fontWeight: 800, color: '#531697', marginBottom: 6 }}>
              💡 Guidance from {alumni.name}'s Career Experience:
            </div>
            <div style={{ fontSize: '.82rem', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {advice}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'right', marginTop: 18 }}>
          <button onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid #d0d7e8',
              background: 'transparent', color: 'var(--text-3)', fontWeight: 700, cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


function ConnectModal({ alumni, onClose, onSubmit, loading }) {
  const [helpType, setHelpType] = useState('general');
  const [message, setMessage]  = useState('');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(4,44,93,0.55)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 18, padding: '28px 30px',
        width: '100%', maxWidth: 500, boxShadow: '0 20px 60px rgba(83,22,151,0.25)' }}>

        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.15rem',
          color: 'var(--text)', marginBottom: 6 }}>
          🤝 Connect with {alumni.name}
        </div>
        <div style={{ fontSize: '.82rem', color: 'var(--text-3)', marginBottom: 20 }}>
          {alumni.role} @ {alumni.company} · KIT's Kolhapur Alumnus
        </div>

        {/* Help type selector */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '.72rem', fontWeight: 800, color: 'var(--text-3)',
            textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8,
            fontFamily: "'Syne',sans-serif" }}>
            How can they help you?
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {HELP_TYPES.map(h => (
              <button key={h.value} onClick={() => setHelpType(h.value)}
                style={{ padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${helpType === h.value ? '#531697' : '#e0e6f0'}`,
                  background: helpType === h.value ? 'rgba(83,22,151,0.06)' : 'transparent',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                <div style={{ fontWeight: 700, fontSize: '.75rem', color: helpType === h.value ? '#531697' : 'var(--text)' }}>{h.label}</div>
                <div style={{ fontSize: '.65rem', color: 'var(--text-3)', marginTop: 2 }}>{h.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Personal message */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: '.72rem', fontWeight: 800, color: 'var(--text-3)',
            textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6,
            fontFamily: "'Syne',sans-serif" }}>
            Introduce Yourself (optional)
          </div>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
            placeholder={`Hi ${alumni.name.split(' ')[0]}, I'm a student at KIT's Kolhapur. I'm interested in ${helpType === 'referral' ? 'a referral opportunity' : 'your guidance'}...`}
            maxLength={500}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #d0d7e8',
              fontFamily: "'Nunito',sans-serif", fontSize: '.84rem', resize: 'vertical',
              outline: 'none', boxSizing: 'border-box', lineHeight: 1.5 }} />
          <div style={{ textAlign: 'right', fontSize: '.65rem', color: '#b0bec9', marginTop: 3 }}>
            {message.length}/500
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => onSubmit({ helpType, message })} disabled={loading}
            style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none',
              background: loading ? '#d0d7e8' : 'linear-gradient(135deg,#531697,#13a1a5)',
              color: '#fff', fontWeight: 800, cursor: loading ? 'default' : 'pointer',
              fontFamily: "'Nunito',sans-serif", fontSize: '.88rem' }}>
            {loading ? '⏳ Sending...' : '🚀 Send Connection Request'}
          </button>
          <button onClick={onClose}
            style={{ padding: '11px 18px', borderRadius: 10, border: '1.5px solid #d0d7e8',
              background: 'transparent', color: 'var(--text-3)', fontWeight: 700,
              cursor: 'pointer', fontFamily: "'Nunito',sans-serif" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AlumniPage() {
  const { user } = useAuth();
  const [alumni, setAlumni]           = useState([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [connecting, setConnecting]   = useState(false);
  const [connectTarget, setConnectTarget] = useState(null);
  const [connections, setConnections] = useState([]);
  const [msg, setMsg]                 = useState('');
  const [activeTab, setActiveTab]     = useState('browse'); // 'browse' | 'connections'

  // Filters
  const [search,     setSearch]     = useState('');
  const [department, setDepartment] = useState('');
  const [batch,      setBatch]      = useState('');
  const [company,    setCompany]    = useState('');
  const [page,       setPage]       = useState(1);

  // RAG Search & Mentor AI
  const [askTarget, setAskTarget]       = useState(null);
  const [ragQuery, setRagQuery]         = useState('');
  const [ragSearching, setRagSearching] = useState(false);


  const loadAlumni = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12 });
      if (search)     params.set('search',     search);
      if (department) params.set('department', department);
      if (batch)      params.set('batch',      batch);
      if (company)    params.set('company',    company);

      const res = await fetch(`${API}/alumni?${params}`, { headers: tk() });
      const d   = await res.json();
      setAlumni(d.alumni || []);
      setTotal(d.total  || 0);
    } catch {}
    setLoading(false);
  }, [search, department, batch, company, page]);

  async function handleRagSearch(e) {
    if (e) e.preventDefault();
    if (!ragQuery.trim()) return loadAlumni();
    setRagSearching(true);
    setLoading(true);
    try {
      const res = await fetch(`${API}/alumni/rag-search`, {
        method: 'POST',
        headers: tks(),
        body: JSON.stringify({ query: ragQuery }),
      });
      const d = await res.json();
      setAlumni(d.alumni || []);
      setTotal(d.total || 0);
    } catch {}
    setLoading(false);
    setRagSearching(false);
  }


  const loadConnections = useCallback(async () => {
    try {
      const res = await fetch(`${API}/alumni/connections`, { headers: tk() });
      const d   = await res.json();
      setConnections(d.connections || []);
    } catch {}
  }, []);

  useEffect(() => { loadAlumni(); }, [loadAlumni]);
  useEffect(() => { loadConnections(); }, [loadConnections]);

  async function sendConnect({ helpType, message }) {
    if (!connectTarget) return;
    setConnecting(true);
    try {
      const res = await fetch(`${API}/alumni/connect`, {
        method: 'POST', headers: tks(),
        body: JSON.stringify({ alumniId: connectTarget._id, message, helpType }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setMsg(d.message || '✅ Connection request sent!');
      setConnectTarget(null);
      await loadConnections();
      setTimeout(() => setMsg(''), 5000);
    } catch (err) {
      setMsg(`❌ ${err.message}`);
      setTimeout(() => setMsg(''), 4000);
    }
    setConnecting(false);
  }

  const DEPTS = ['CSE','IT','AIML','ENTC','ME','CE','EEE'];
  const currentYear = new Date().getFullYear();
  const batches = Array.from({ length: 15 }, (_, i) => currentYear - i);

  return (
    <div style={{ fontFamily: "'Nunito',sans-serif", maxWidth: 1200 }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.6rem',
          color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          🎓 Alumni Network
          <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '.65rem', fontWeight: 700,
            background: 'rgba(83,22,151,0.08)', color: '#531697',
            border: '1px solid rgba(83,22,151,0.2)', fontFamily: "'Nunito',sans-serif" }}>
            KIT's College of Engineering, Kolhapur
          </span>
        </h1>
        <p style={{ color: 'var(--text-3)', marginTop: 6, fontSize: '.88rem' }}>
          Connect with alumni for mentorship, referrals, resume reviews & mock interviews
        </p>
      </div>

      {/* Toast */}
      {msg && (
        <div style={{ padding: '12px 18px', borderRadius: 10, marginBottom: 16, fontWeight: 700, fontSize: '.85rem',
          background: msg.startsWith('✅') ? 'rgba(71,211,114,0.1)' : 'rgba(239,68,68,0.1)',
          color: msg.startsWith('✅') ? '#166534' : '#991b1b',
          border: `1px solid ${msg.startsWith('✅') ? 'rgba(71,211,114,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
          {msg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { id: 'browse',      label: `🎓 Browse Alumni (${total})` },
          { id: 'connections', label: `🤝 My Connections (${connections.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding: '8px 18px', borderRadius: 9,
              border: `1.5px solid ${activeTab === t.id ? '#531697' : '#d0d7e8'}`,
              background: activeTab === t.id ? 'rgba(83,22,151,0.08)' : '#fff',
              color: activeTab === t.id ? '#531697' : 'var(--text-3)',
              fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.82rem' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── BROWSE TAB ── */}
      {activeTab === 'browse' && (
        <>
          {/* RAG AI Career Goal Search Box */}
          <form onSubmit={handleRagSearch} style={{ background: 'linear-gradient(135deg, rgba(83,22,151,0.06), rgba(19,161,165,0.06))',
            border: '1.5px solid rgba(83,22,151,0.2)', borderRadius: 14, padding: '14px 18px', marginBottom: 18, display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: '1.3rem' }}>🤖</span>
            <input value={ragQuery} onChange={e => setRagQuery(e.target.value)}
              placeholder="Ask RAG: e.g. 'I want to get into NVIDIA for AI research', 'DRDO interview prep', 'Software Engineers at Google'..."
              style={{ flex: 1, padding: '10px 14px', borderRadius: 9, border: '1px solid #d0d7e8', fontSize: '.86rem', outline: 'none', background: '#fff' }} />
            <button type="submit" disabled={ragSearching}
              style={{ padding: '10px 18px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#531697,#13a1a5)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '.84rem' }}>
              {ragSearching ? '⚡ RAG Discovering...' : '🧠 AI RAG Search'}
            </button>
          </form>

          {/* Filters */}
          <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '16px 18px',
            border: '1px solid #e8edf5', marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="🔍 Filter by name, company, role..."
              style={{ flex: 1, minWidth: 200, padding: '9px 12px', borderRadius: 9,
                border: '1.5px solid #d0d7e8', fontFamily: "'Nunito',sans-serif", fontSize: '.84rem', outline: 'none' }} />

            <select value={department} onChange={e => { setDepartment(e.target.value); setPage(1); }}
              style={{ padding: '9px 12px', borderRadius: 9, border: '1.5px solid #d0d7e8',
                fontFamily: "'Nunito',sans-serif", fontSize: '.84rem', outline: 'none' }}>
              <option value="">All Departments</option>
              {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={batch} onChange={e => { setBatch(e.target.value); setPage(1); }}
              style={{ padding: '9px 12px', borderRadius: 9, border: '1.5px solid #d0d7e8',
                fontFamily: "'Nunito',sans-serif", fontSize: '.84rem', outline: 'none' }}>
              <option value="">All Batches</option>
              {batches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <input value={company} onChange={e => { setCompany(e.target.value); setPage(1); }}
              placeholder="Company..."
              style={{ width: 150, padding: '9px 12px', borderRadius: 9,
                border: '1.5px solid #d0d7e8', fontFamily: "'Nunito',sans-serif", fontSize: '.84rem', outline: 'none' }} />
            {(search || department || batch || company) && (
              <button onClick={() => { setSearch(''); setDepartment(''); setBatch(''); setCompany(''); setPage(1); }}
                style={{ padding: '9px 14px', borderRadius: 9, border: '1px solid rgba(239,68,68,0.3)',
                  background: 'rgba(239,68,68,0.05)', color: '#991b1b', fontWeight: 700,
                  cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.8rem' }}>
                ✕ Clear
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ width: 40, height: 40, border: '3px solid #e8edf5', borderTopColor: '#531697',
                borderRadius: '50%', animation: '_sp .7s linear infinite', margin: '0 auto 12px' }} />
              <style>{`@keyframes _sp{to{transform:rotate(360deg)}}`}</style>
              <div style={{ color: 'var(--text-3)', fontSize: '.85rem' }}>Loading alumni profiles...</div>
            </div>
          ) : alumni.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--surface)',
              borderRadius: 14, border: '1px solid #e8edf5' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎓</div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.1rem',
                color: 'var(--text)', marginBottom: 6 }}>No Alumni Found</div>
              <div style={{ color: 'var(--text-3)', fontSize: '.84rem', marginBottom: 16 }}>
                {search || department || batch || company || ragQuery
                  ? 'No exact match found for your current search filter.'
                  : 'No verified alumni profiles available in this view.'}
              </div>
              <button onClick={() => {
                const targetQuery = search || ragQuery || company || department || 'Engineering';
                setRagQuery(targetQuery);
                handleRagSearch({ preventDefault: () => {} });
              }}
                style={{ padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg,#531697,#13a1a5)', color: '#fff',
                  fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.85rem' }}>
                ⚡ Trigger AI RAG Discovery for "{search || ragQuery || company || department || 'Engineering'}"
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
                {alumni.map(a => (
                  <AlumniCard key={a._id} alumni={a} onConnect={setConnectTarget} onAskMentor={setAskTarget} myConnections={connections} />
                ))}
              </div>

              {/* Pagination */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding: '8px 16px', borderRadius: 9, border: '1.5px solid #d0d7e8',
                    background: '#fff', color: page === 1 ? '#b0bec9' : '#531697',
                    fontWeight: 700, cursor: page === 1 ? 'default' : 'pointer',
                    fontFamily: "'Nunito',sans-serif" }}>
                  ← Prev
                </button>
                <span style={{ fontSize: '.82rem', color: 'var(--text-3)', fontWeight: 700 }}>
                  Page {page} · {total} alumni
                </span>
                <button onClick={() => setPage(p => p + 1)} disabled={alumni.length < 12}
                  style={{ padding: '8px 16px', borderRadius: 9, border: '1.5px solid #d0d7e8',
                    background: '#fff', color: alumni.length < 12 ? '#b0bec9' : '#531697',
                    fontWeight: 700, cursor: alumni.length < 12 ? 'default' : 'pointer',
                    fontFamily: "'Nunito',sans-serif" }}>
                  Next →
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* ── CONNECTIONS TAB ── */}
      {activeTab === 'connections' && (
        <div>
          {connections.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--surface)',
              borderRadius: 14, border: '1px solid #e8edf5' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>🤝</div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1rem',
                color: 'var(--text)', marginBottom: 6 }}>No Connections Yet</div>
              <div style={{ color: 'var(--text-3)', fontSize: '.84rem', marginBottom: 16 }}>
                Start connecting with KIT's alumni for mentorship and opportunities!
              </div>
              <button onClick={() => setActiveTab('browse')}
                style={{ padding: '10px 24px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg,#531697,#13a1a5)', color: '#fff',
                  fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif" }}>
                Browse Alumni →
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {connections.map(conn => {
                const a = conn.alumni;
                const statusColors = {
                  pending:  { bg: 'rgba(245,158,11,0.08)',  color: '#92400e', label: '⏳ Pending'  },
                  accepted: { bg: 'rgba(71,211,114,0.08)',  color: '#166534', label: '✅ Connected' },
                  declined: { bg: 'rgba(239,68,68,0.08)',   color: '#991b1b', label: '❌ Declined'  },
                };
                const sc = statusColors[conn.status] || statusColors.pending;

                return (
                  <div key={conn._id} style={{ background: 'var(--surface)', borderRadius: 14,
                    border: '1px solid #e8edf5', padding: '16px 18px',
                    display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10,
                      background: 'linear-gradient(135deg,#531697,#13a1a5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 800, fontSize: '.85rem', flexShrink: 0 }}>
                      {a?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '.88rem', color: 'var(--text)' }}>{a?.name}</div>
                      <div style={{ fontSize: '.75rem', color: 'var(--text-3)' }}>
                        {a?.role} {a?.company ? `@ ${a.company}` : ''} · Batch {a?.batch}
                      </div>
                      {conn.message && (
                        <div style={{ fontSize: '.72rem', color: '#b0bec9', marginTop: 4, fontStyle: 'italic' }}>
                          "{conn.message.slice(0, 100)}{conn.message.length > 100 ? '...' : ''}"
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '.7rem', fontWeight: 700,
                        background: sc.bg, color: sc.color }}>
                        {sc.label}
                      </span>
                      <span style={{ fontSize: '.65rem', color: '#b0bec9' }}>
                        {HELP_TYPES.find(h => h.value === conn.helpType)?.label || '💬 General'}
                      </span>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <a href="/dashboard/discussions"
                          style={{ padding: '6px 12px', borderRadius: 8, background: 'linear-gradient(135deg,#531697,#13a1a5)',
                            color: '#fff', fontWeight: 800, textDecoration: 'none', fontSize: '.72rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          💬 Chat Now
                        </a>
                        {a?.linkedinUrl && (
                          <a href={a.linkedinUrl} target="_blank" rel="noreferrer"
                            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(10,102,194,0.3)',
                              background: 'rgba(10,102,194,0.06)', color: '#0a66c2', fontWeight: 700,
                              textDecoration: 'none', fontSize: '.72rem' }}>
                            LinkedIn →
                          </a>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Connect Modal */}
      {connectTarget && (
        <ConnectModal alumni={connectTarget} loading={connecting}
          onClose={() => setConnectTarget(null)}
          onSubmit={sendConnect} />
      )}

      {/* Ask AI Mentor Modal */}
      {askTarget && (
        <AskMentorModal alumni={askTarget}
          onClose={() => setAskTarget(null)} />
      )}
    </div>
  );
}
