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

function AlumniCard({ alumni, onAskMentor, onDraftMessage, onDelete, canManageAlumni }) {
  const dept    = alumni.department?.toUpperCase();
  const dc      = DEPT_COLORS[dept] || DEPT_COLORS['CSE'];
  const initials = alumni.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const linkedinUrl = alumni.linkedinUrl || `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(`KIT Kolhapur ${alumni.name} ${alumni.company}`)}`;

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
          <div style={{ fontSize: '.78rem', color: '#0a66c2', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {alumni.role || 'Software Engineer'} {alumni.company ? `@ ${alumni.company}` : ''}
          </div>
          <div style={{ fontSize: '.7rem', color: '#b0bec9', marginTop: 2 }}>
            🎓 KIT Kolhapur {alumni.batch ? `(${alumni.batch})` : ''} {alumni.location ? `· 📍 ${alumni.location}` : ''}
          </div>
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
        {alumni.company && (
          <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '.65rem', fontWeight: 800,
            background: 'rgba(10,102,194,0.08)', color: '#0a66c2', border: '1px solid rgba(10,102,194,0.2)' }}>
            🏢 {alumni.company}
          </span>
        )}
        <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '.65rem', fontWeight: 700,
          background: 'rgba(71,211,114,0.08)', color: '#166534', border: '1px solid rgba(71,211,114,0.2)' }}>
          ✓ Verified Alumnus
        </span>
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
        </div>
      )}

      {/* Bio */}
      {alumni.bio && (
        <div style={{ fontSize: '.75rem', color: 'var(--text-3)', lineHeight: 1.55,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {alumni.bio}
        </div>
      )}

      {/* Action row */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => onAskMentor(alumni)}
          style={{ flex: 1, padding: '8px 12px', borderRadius: 9, border: '1px solid rgba(83,22,151,0.25)',
            background: 'rgba(83,22,151,0.06)', color: '#531697', fontWeight: 800,
            cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          🤖 Ask AI Mentor
        </button>

        <button onClick={() => onDraftMessage(alumni)}
          style={{ padding: '8px 12px', borderRadius: 9, border: '1px solid rgba(10,102,194,0.3)',
            background: 'rgba(10,102,194,0.08)', color: '#0a66c2',
            fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
          📩 LinkedIn Referral Draft
        </button>

        <a href={linkedinUrl} target="_blank" rel="noreferrer"
          style={{ padding: '8px 12px', borderRadius: 9, border: 'none',
            background: '#0a66c2', color: '#fff', fontWeight: 800,
            textDecoration: 'none', fontSize: '.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
          🔗 View Profile
        </a>

        {canManageAlumni && (
          <button onClick={() => onDelete(alumni._id, alumni.name)}
            style={{ padding: '8px 12px', borderRadius: 9, border: '1px solid rgba(239,68,68,0.3)',
              background: 'rgba(239,68,68,0.08)', color: '#991b1b',
              fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
            🗑️ Delete
          </button>
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

// ── LinkedIn Referral & Outreach Note Generator Modal ─────────────────────
function OutreachDraftModal({ alumni, onClose }) {
  const [helpType, setHelpType] = useState('referral');
  const [draft, setDraft]       = useState('');
  const [copied, setCopied]     = useState(false);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    async function loadDraft() {
      setLoading(true);
      try {
        const res = await fetch(`${API}/alumni/generate-outreach-draft`, {
          method: 'POST', headers: tks(),
          body: JSON.stringify({ alumniId: alumni._id, helpType })
        });
        const d = await res.json();
        setDraft(d.draftMessage || '');
      } catch {}
      setLoading(false);
    }
    loadDraft();
  }, [alumni._id, helpType]);

  const linkedinUrl = alumni.linkedinUrl || `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(`KIT Kolhapur ${alumni.name} ${alumni.company}`)}`;

  function handleCopyAndOpen() {
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => {
      window.open(linkedinUrl, '_blank');
      setCopied(false);
    }, 800);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(4,44,93,0.55)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 18, padding: '26px 28px',
        width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(10,102,194,0.25)' }}>

        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.15rem', color: '#0a66c2', marginBottom: 4 }}>
          📩 Draft LinkedIn Outreach Note for {alumni.name}
        </div>
        <div style={{ fontSize: '.82rem', color: 'var(--text-3)', marginBottom: 16 }}>
          {alumni.role} @ {alumni.company} · KIT's Kolhapur Alumnus
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: '.75rem', fontWeight: 800, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
            Select Outreach Goal:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { id: 'referral',      label: '🔗 Job Referral Request' },
              { id: 'mentorship',    label: '🎓 Career Mentorship' },
              { id: 'resume-review', label: '📄 Resume Feedback' },
              { id: 'general',       label: '💬 General Networking' },
            ].map(t => (
              <button key={t.id} onClick={() => setHelpType(t.id)}
                style={{ padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${helpType === t.id ? '#0a66c2' : '#e0e6f0'}`,
                  background: helpType === t.id ? 'rgba(10,102,194,0.08)' : '#fff', color: helpType === t.id ? '#0a66c2' : 'var(--text)',
                  fontWeight: 700, fontSize: '.75rem', cursor: 'pointer' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: '.75rem', fontWeight: 800, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
            Personalized Connection Request Note:
          </label>
          <textarea value={loading ? 'Generating customized note...' : draft} onChange={e => setDraft(e.target.value)} rows={5}
            style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1.5px solid #d0d7e8',
              fontSize: '.83rem', fontFamily: "'Nunito',sans-serif", outline: 'none', boxSizing: 'border-box', lineHeight: 1.5 }} />
          <div style={{ fontSize: '.68rem', color: '#b0bec9', marginTop: 4 }}>
            💡 Tip: Copy this note and paste it directly into LinkedIn when sending your connection request!
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleCopyAndOpen}
            style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none',
              background: copied ? '#166534' : 'linear-gradient(135deg,#0a66c2,#13a1a5)',
              color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '.84rem' }}>
            {copied ? '✅ Copied! Opening LinkedIn...' : '📋 Copy Note & Open LinkedIn Profile'}
          </button>
          <button onClick={onClose}
            style={{ padding: '11px 16px', borderRadius: 10, border: '1.5px solid #d0d7e8',
              background: 'transparent', color: 'var(--text-3)', fontWeight: 700, cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Excel Upload Component for Faculty / Admin ─────────────────────────────
function ExcelUploadView({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState('');

  async function handleDownloadTemplate() {
    try {
      const res = await fetch(`${API}/alumni/template/download`, { headers: tk() });
      if (!res.ok) throw new Error('Failed to download template');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'KIT_Alumni_Upload_Template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`❌ ${err.message}`);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) {
      setResultMsg('❌ Please select an Excel file (.xlsx, .xls) or CSV to upload.');
      return;
    }
    setLoading(true);
    setResultMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch(`${API}/alumni/upload-excel`, {
        method: 'POST',
        headers: tk(),
        body: fd,
      });
      const d = await res.json();
      if (!res.ok) {
        if (res.status === 403 || d.error?.includes('Insufficient permissions')) {
          throw new Error('Insufficient permissions: Your current logged-in account has a "student" role. Please log out and log in with a Faculty or Admin account (e.g. admin@pragati.edu / admin123) to manage alumni.');
        }
        throw new Error(d.error || 'Upload failed');
      }

      setResultMsg(d.message);
      setFile(null);
      if (onUploaded) onUploaded();
    } catch (err) {
      setResultMsg(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', padding: '24px 28px', maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.2rem', color: 'var(--text)', margin: 0 }}>
            📥 Bulk Import KIT Alumni via Excel / CSV
          </h2>
          <p style={{ fontSize: '.84rem', color: 'var(--text-3)', marginTop: 4 }}>
            Faculty members can upload official alumni spreadsheets to instantly populate the directory & vectorize for RAG search.
          </p>
        </div>
        <button onClick={handleDownloadTemplate}
          style={{ padding: '9px 16px', borderRadius: 9, border: '1.5px solid #13a1a5', background: 'rgba(19,161,165,0.08)', color: '#0d7a7e', fontWeight: 800, cursor: 'pointer', fontSize: '.82rem', fontFamily: "'Nunito',sans-serif" }}>
          ⬇️ Download Sample Excel Template
        </button>
      </div>

      {/* Columns Guide */}
      <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--border)', marginBottom: 20 }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.88rem', color: '#531697', marginBottom: 8 }}>
          📋 Required Excel File Column Headers (Duplicates automatically skipped):
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8, fontSize: '.78rem', color: 'var(--text-2)' }}>
          <div>• <strong>Name</strong> <span style={{ color: '#ef4444' }}>*</span> (Full Name)</div>
          <div>• <strong>Company</strong> <span style={{ color: '#ef4444' }}>*</span> (e.g. Google, Capgemini, TCS)</div>
          <div>• <strong>Role</strong> <span style={{ color: '#ef4444' }}>*</span> (Designation/Position)</div>
          <div>• <strong>Department</strong> <span style={{ color: '#ef4444' }}>*</span> (CSE, CSAIML, IT, ENTC)</div>
          <div>• <strong>Batch</strong> <span style={{ color: '#ef4444' }}>*</span> (e.g. 2023, 2024)</div>
          <div>• <strong>LinkedIn URL</strong> <span style={{ color: '#ef4444' }}>*</span> (Mandatory Profile Link)</div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 18 }}>
          <input type="file" accept=".xlsx, .xls, .csv" onChange={e => setFile(e.target.files[0])}
            style={{ padding: '12px', borderRadius: 10, border: '1.5px dashed #531697', width: '100%', boxSizing: 'border-box', background: 'rgba(83,22,151,0.03)', cursor: 'pointer', fontFamily: "'Nunito',sans-serif" }} />
          {file && <div style={{ fontSize: '.8rem', color: '#166534', fontWeight: 700, marginTop: 6 }}>📁 Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)</div>}
        </div>

        {resultMsg && (
          <div style={{ padding: '12px 16px', borderRadius: 10, fontSize: '.84rem', fontWeight: 700, marginBottom: 16,
            background: resultMsg.startsWith('✅') ? 'rgba(71,211,114,0.1)' : 'rgba(239,68,68,0.1)',
            color: resultMsg.startsWith('✅') ? '#166534' : '#991b1b',
            border: `1px solid ${resultMsg.startsWith('✅') ? 'rgba(71,211,114,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
            {resultMsg}
          </div>
        )}

        <button type="submit" disabled={loading || !file}
          style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none',
            background: loading || !file ? '#d0d7e8' : 'linear-gradient(135deg,#531697,#13a1a5)',
            color: '#fff', fontWeight: 800, fontSize: '.9rem', cursor: loading || !file ? 'default' : 'pointer', fontFamily: "'Nunito',sans-serif" }}>
          {loading ? 'Uploading & Vectorizing RAG Data...' : '📤 Upload & Import Alumni Data'}
        </button>
      </form>
    </div>
  );
}

// ── Manual Add Single Alumnus Component for Faculty / Admin ────────────────
function ManualAddView({ onAdded }) {
  const [form, setForm] = useState({
    name: '', email: '', company: '', role: '', department: 'CSE', batch: '2024',
    linkedinUrl: '', skills: '', location: 'India', bio: '',
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.company.trim()) {
      setMsg('❌ Name and Company are required.');
      return;
    }
    setLoading(true);
    setMsg('');
    try {
      const payload = {
        ...form,
        batch: parseInt(form.batch) || 2024,
        skills: form.skills ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      const res = await fetch(`${API}/alumni`, {
        method: 'POST',
        headers: tks(),
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to add alumni');

      setMsg('✅ Alumni added successfully!');
      setForm({ name: '', email: '', company: '', role: '', department: 'CSE', batch: '2024', linkedinUrl: '', skills: '', location: 'India', bio: '' });
      if (onAdded) onAdded();
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const INP = { style: { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #d0d7e8', fontFamily: "'Nunito',sans-serif", fontSize: '.85rem', outline: 'none', boxSizing: 'border-box' } };
  const LBL = ({ children, req }) => <label style={{ display: 'block', fontSize: '.75rem', fontWeight: 800, color: 'var(--text-3)', marginBottom: 4, fontFamily: "'Syne',sans-serif" }}>{children}{req && <span style={{ color: '#ef4444' }}> *</span>}</label>;

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', padding: '24px 28px', maxWidth: 800 }}>
      <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.2rem', color: 'var(--text)', margin: '0 0 16px 0' }}>
        ➕ Add Single Alumnus Profile Manually
      </h2>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <LBL req>Alumnus Full Name</LBL>
            <input {...INP} value={form.name} onChange={setF('name')} placeholder="e.g. Sapna Patil" required />
          </div>
          <div>
            <LBL req>Current Company</LBL>
            <input {...INP} value={form.company} onChange={setF('company')} placeholder="e.g. Google, Microsoft, Capgemini" required />
          </div>
          <div>
            <LBL req>Role / Designation</LBL>
            <input {...INP} value={form.role} onChange={setF('role')} placeholder="e.g. Senior Software Engineer" required />
          </div>
          <div>
            <LBL req>Department</LBL>
            <select {...INP} value={form.department} onChange={setF('department')}>
              {['CSE', 'CSAIML', 'IT', 'ECE', 'Mechanical', 'Civil', 'Other'].map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <LBL req>Batch Passout Year</LBL>
            <input {...INP} type="number" value={form.batch} onChange={setF('batch')} placeholder="e.g. 2023" required />
          </div>
          <div>
            <LBL>LinkedIn URL</LBL>
            <input {...INP} type="url" value={form.linkedinUrl} onChange={setF('linkedinUrl')} placeholder="https://linkedin.com/in/username" />
          </div>
          <div>
            <LBL>Email Address</LBL>
            <input {...INP} type="email" value={form.email} onChange={setF('email')} placeholder="alumni@kitcoek.in" />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <LBL>Key Skills (comma-separated)</LBL>
            <input {...INP} value={form.skills} onChange={setF('skills')} placeholder="e.g. React, Python, Machine Learning, System Design" />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <LBL>Bio / Mentorship Advice</LBL>
            <textarea {...INP} value={form.bio} onChange={setF('bio')} rows={3} placeholder="Provide details about their career guidance or referral availability..." style={{ ...INP.style, resize: 'vertical' }} />
          </div>
        </div>

        {msg && (
          <div style={{ padding: '12px 16px', borderRadius: 10, fontSize: '.84rem', fontWeight: 700, marginBottom: 16,
            background: msg.startsWith('✅') ? 'rgba(71,211,114,0.1)' : 'rgba(239,68,68,0.1)',
            color: msg.startsWith('✅') ? '#166534' : '#991b1b',
            border: `1px solid ${msg.startsWith('✅') ? 'rgba(71,211,114,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
            {msg}
          </div>
        )}

        <button type="submit" disabled={loading}
          style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none',
            background: loading ? '#d0d7e8' : 'linear-gradient(135deg,#531697,#13a1a5)',
            color: '#fff', fontWeight: 800, fontSize: '.9rem', cursor: loading ? 'default' : 'pointer', fontFamily: "'Nunito',sans-serif" }}>
          {loading ? 'Saving Alumnus...' : '💾 Save Alumnus to Directory'}
        </button>
      </form>
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
  const [draftTarget, setDraftTarget]   = useState(null);
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
      setTimeout(() => setMsg(''), 4000);
    } catch (err) {
      setMsg(`❌ ${err.message}`);
      setTimeout(() => setMsg(''), 4000);
    }
    setConnecting(false);
  }

  async function handleDeleteAlumni(id, name) {
    if (!window.confirm(`Are you sure you want to delete "${name}" from the alumni database?`)) return;
    try {
      const res = await fetch(`${API}/alumni/${id}`, { method: 'DELETE', headers: tk() });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to delete');
      setMsg(`✅ Alumni "${name}" deleted successfully.`);
      loadAlumni();
      setTimeout(() => setMsg(''), 4000);
    } catch (err) {
      setMsg(`❌ ${err.message}`);
      setTimeout(() => setMsg(''), 4000);
    }
  }

  const DEPTS = ['CSE','IT','AIML','ENTC','ME','CE','EEE'];
  const currentYear = new Date().getFullYear();
  const batches = Array.from({ length: 15 }, (_, i) => currentYear - i);

  const userRole = (user?.role || '').toLowerCase();
  const canManageAlumni = userRole === 'faculty' || userRole === 'admin' || userRole === 'tpo' || user?.role === 'Faculty' || user?.role === 'Admin';

  return (
    <div style={{ fontFamily: "'Nunito',sans-serif", maxWidth: 1200 }}>

      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
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

        {/* Quick Action Buttons for Faculty / Admin / TPO */}
        {canManageAlumni && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setActiveTab('excel')}
              style={{ padding: '9px 16px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg,#13a1a5,#531697)', color: '#fff',
                fontWeight: 800, cursor: 'pointer', fontSize: '.82rem', fontFamily: "'Nunito',sans-serif" }}>
              📥 Bulk Upload Alumni (Excel)
            </button>
            <button onClick={() => setActiveTab('manual')}
              style={{ padding: '9px 16px', borderRadius: 10, border: '1.5px solid #531697',
                background: 'rgba(83,22,151,0.06)', color: '#531697',
                fontWeight: 800, cursor: 'pointer', fontSize: '.82rem', fontFamily: "'Nunito',sans-serif" }}>
              ➕ Add Single Alumnus
            </button>
          </div>
        )}
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
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { id: 'browse',      label: `🎓 Browse Alumni (${total})` },
          ...(canManageAlumni ? [
            { id: 'excel',     label: `📥 Bulk Upload Alumni (Excel)` },
            { id: 'manual',    label: `➕ Add Single Alumnus` },
          ] : []),
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
                  <AlumniCard key={a._id} alumni={a} onDraftMessage={setDraftTarget} onAskMentor={setAskTarget} onDelete={handleDeleteAlumni} canManageAlumni={canManageAlumni} />
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

      {/* ── EXCEL UPLOAD TAB ── */}
      {activeTab === 'excel' && (
        <ExcelUploadView onUploaded={() => { loadAlumni(); setActiveTab('browse'); }} />
      )}

      {/* ── MANUAL ADD TAB ── */}
      {activeTab === 'manual' && (
        <ManualAddView onAdded={() => { loadAlumni(); setActiveTab('browse'); }} />
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
                Start connecting with KIT's alumni on LinkedIn for mentorship and opportunities!
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
                  pending:  { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', label: '⏳ Request Sent' },
                  accepted: { bg: 'rgba(71,211,114,0.1)', color: '#166534', label: '✅ Connected' },
                  declined: { bg: 'rgba(239,68,68,0.1)', color: '#991b1b', label: '❌ Declined' },
                };
                const sc = statusColors[conn.status] || statusColors.pending;

                return (
                  <div key={conn._id} style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid #e8edf5',
                    padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#531697,#13a1a5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>
                      {a?.name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '.9rem', color: 'var(--text)' }}>{a?.name}</div>
                      <div style={{ fontSize: '.75rem', color: 'var(--text-3)' }}>{a?.role} @ {a?.company}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: '.68rem', fontWeight: 700,
                        background: sc.bg, color: sc.color }}>
                        {sc.label}
                      </span>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
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

      {/* Draft LinkedIn Message Modal */}
      {draftTarget && (
        <OutreachDraftModal alumni={draftTarget}
          onClose={() => setDraftTarget(null)} />
      )}

      {/* Ask AI Mentor Modal */}
      {askTarget && (
        <AskMentorModal alumni={askTarget}
          onClose={() => setAskTarget(null)} />
      )}
    </div>
  );
}
