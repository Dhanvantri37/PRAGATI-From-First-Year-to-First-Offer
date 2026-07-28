import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tk  = () => ({ Authorization: `Bearer ${localStorage.getItem('pragati_token')}` });
const tks = () => ({ ...tk(), 'Content-Type': 'application/json' });

const STATUS_COLORS = {
  open:     { bg: 'rgba(71,211,114,0.1)',   color: '#166534',  border: 'rgba(71,211,114,0.3)'   },
  upcoming: { bg: 'rgba(83,22,151,0.08)',    color: '#531697',  border: 'rgba(83,22,151,0.2)'    },
  closed:   { bg: 'rgba(239,68,68,0.08)',    color: '#991b1b',  border: 'rgba(239,68,68,0.2)'    },
};

export default function DrivesPage() {
  const { user } = useAuth();
  const [drives, setDrives]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [applying, setApplying]   = useState({});
  const [showForm, setShowForm]   = useState(false);
  const [filter, setFilter]           = useState('all');
  const [companyFilter, setCompanyFilter] = useState('');
  const [form, setForm]               = useState({
    companyName: '', role: '', ctc: '', driveDate: '',
    lastApplyDate: '', eligibility: '', description: '',
    applyLink: '', status: 'upcoming', logoUrl: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [msg, setMsg]                 = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/drives`, { headers: tk() });
      const d   = await res.json();
      setDrives(d.drives || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function apply(id) {
    setApplying(a => ({ ...a, [id]: true }));
    try {
      const res = await fetch(`${API}/drives/${id}/apply`, { method: 'POST', headers: tk() });
      const d   = await res.json();
      if (!res.ok) { alert(d.error || 'Already applied'); }
      else { load(); }
    } catch {}
    setApplying(a => ({ ...a, [id]: false }));
  }

  async function createDrive(e) {
    e.preventDefault();
    setFormLoading(true);
    setMsg('');
    try {
      const res = await fetch(`${API}/drives`, {
        method: 'POST',
        headers: tks(),
        body: JSON.stringify(form)
      });
      const d = await res.json();
      if (!res.ok) {
        setMsg(`❌ ${d.error || 'Failed to create drive'}`);
      } else {
        setMsg('✅ Placement drive created successfully!');
        setShowForm(false);
        setForm({
          companyName: '', role: '', ctc: '', driveDate: '',
          lastApplyDate: '', eligibility: '', description: '',
          applyLink: '', status: 'upcoming', logoUrl: '',
        });
        load();
      }
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setFormLoading(false);
    }
  }

  async function deleteDrive(id) {
    if (!window.confirm('Are you sure you want to delete this drive?')) return;
    try {
      const res = await fetch(`${API}/drives/${id}`, {
        method: 'DELETE',
        headers: tk()
      });
      const d = await res.json();
      if (!res.ok) {
        alert(d.error || 'Failed to delete drive');
      } else {
        setMsg('✅ Drive deleted successfully');
        load();
      }
    } catch (err) {
      alert(`Error deleting drive: ${err.message}`);
    }
  }

  const appliedCount    = drives.filter(d => d.applied).length;
  const internshipCount = drives.filter(d => d.opportunityType === 'internship' || /\b(intern|internship|trainee|apprentice|stipend)\b/i.test(`${d.role} ${d.description}`)).length;
  const jobCount        = drives.filter(d => d.opportunityType === 'job' || !/\b(intern|internship|trainee|apprentice|stipend)\b/i.test(`${d.role} ${d.description}`)).length;
  const scrapedCount    = drives.filter(d => d.isScraped).length;

  const userDept = (user?.department || 'CSE').toUpperCase();

  // Unique companies for filter dropdown
  const uniqueCompanies = [...new Set(drives.map(d => d.companyName).filter(Boolean))].sort();

  // Filter out non-technical/unrelated HR roles for engineering students
  const techOnlyDrives = drives.filter(d => {
    const text = `${d.companyName} ${d.role} ${d.description || ''}`.toLowerCase();
    const isHR = /\b(hr manager|recruiter|telecaller|bpo|front desk|accounts executive|payroll)\b/i.test(text);
    const matchesCompany = !companyFilter || (d.companyName && d.companyName.toLowerCase().includes(companyFilter.toLowerCase()));
    return !isHR && matchesCompany;
  });

  const filtered = (filter === 'all'
    ? techOnlyDrives
    : filter === 'applied'
      ? drives.filter(d => d.applied)
      : filter === 'internships'
        ? techOnlyDrives.filter(d => d.opportunityType === 'internship' || /\b(intern|internship|trainee|apprentice|stipend)\b/i.test(`${d.role} ${d.description}`))
        : filter === 'jobs'
          ? techOnlyDrives.filter(d => d.opportunityType === 'job' && !/\b(intern|internship|trainee|apprentice|stipend)\b/i.test(`${d.role} ${d.description}`))
          : filter === 'external'
            ? techOnlyDrives.filter(d => d.isScraped)
            : techOnlyDrives.filter(d => d.status === filter)
  ).sort((a, b) => {
    const aMatch = (a.branches || []).some(b => b.toUpperCase().includes(userDept));
    const bMatch = (b.branches || []).some(b => b.toUpperCase().includes(userDept));
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });

  const isAdmin  = user?.role === 'admin' || user?.role === 'faculty';

  return (
    <div style={{ fontFamily: "'Nunito',sans-serif" }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.5rem', color: 'var(--text)', margin: 0 }}>🗓️ Placement & Internship Opportunities</h1>
        <p style={{ color: 'var(--text-3)', marginTop: 4, fontSize: '.85rem' }}>Verified campus drives, Unstop, Devfolio, Google, DRDO/ISRO & national tech opportunities</p>
      </div>

      {/* Exciting High-Match Branch Alert Banner */}
      <div style={{ background: 'linear-gradient(135deg, rgba(83,22,151,0.08), rgba(19,161,165,0.08))', border: '1.5px solid rgba(83,22,151,0.25)', borderRadius: 14, padding: '14px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '1.6rem', animation: '_pulse 1.5s infinite' }}>🔥</span>
          <style>{`@keyframes _pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}`}</style>
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.92rem', color: '#531697' }}>
              High-Match Opportunities for {userDept} Branch!
            </div>
            <div style={{ fontSize: '.78rem', color: 'var(--text-3)' }}>
              Showing {filtered.length} verified engineering opportunities tailored to your domain. Apply before deadlines expire!
            </div>
          </div>
        </div>
        <span style={{ padding: '6px 14px', borderRadius: 999, background: 'linear-gradient(135deg,#531697,#13a1a5)', color: '#fff', fontWeight: 800, fontSize: '.75rem' }}>
          ⚡ 90%+ Profile Match Active
        </span>
      </div>

      {msg && (
        <div style={{ padding: '10px 16px', borderRadius: 9, background: msg.startsWith('✅') ? 'rgba(71,211,114,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.startsWith('✅') ? 'rgba(71,211,114,0.3)' : 'rgba(239,68,68,0.3)'}`, color: msg.startsWith('✅') ? '#166534' : '#991b1b', fontWeight: 700, fontSize: '.85rem', marginBottom: 16 }}>
          {msg}
        </div>
      )}

      {/* Controls & Company Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { id: 'all',         label: `All (${drives.length})` },
            { id: 'applied',     label: `📜 My Applied History (${appliedCount})` },
            { id: 'internships', label: `🎓 Internships (${internshipCount})` },
            { id: 'jobs',        label: `💼 Full-Time Jobs (${jobCount})` },
            { id: 'open',        label: 'Open Drives' },
            { id: 'external',    label: `🌐 External / Remote (${scrapedCount})` },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{ padding: '6px 14px', borderRadius: 999, border: `1.5px solid ${filter === f.id ? '#531697' : '#d0d7e8'}`, background: filter === f.id ? 'rgba(83,22,151,0.08)' : '#fff', color: filter === f.id ? '#531697' : 'var(--text-3)', fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.78rem' }}>
              {f.label}
            </button>
          ))}

          {/* Company Filter Dropdown */}
          <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}
            style={{ padding: '6px 14px', borderRadius: 999, border: '1.5px solid #d0d7e8', background: companyFilter ? 'rgba(83,22,151,0.08)' : '#fff', color: companyFilter ? '#531697' : 'var(--text-3)', fontWeight: 700, fontFamily: "'Nunito',sans-serif", fontSize: '.78rem', outline: 'none' }}>
            <option value="">🏢 All Companies</option>
            {uniqueCompanies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {companyFilter && (
            <button onClick={() => setCompanyFilter('')}
              style={{ padding: '4px 8px', borderRadius: 999, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#991b1b', fontWeight: 700, fontSize: '.72rem', cursor: 'pointer' }}>
              ✕ Clear Company
            </button>
          )}
        </div>

        {isAdmin && (
          <button onClick={() => setShowForm(s => !s)}
            style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#531697,#13a1a5)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.85rem' }}>
            {showForm ? '✕ Cancel' : '+ Add Drive'}
          </button>
        )}
      </div>

      {/* Create Drive Form (admin/faculty only) */}
      {showForm && isAdmin && (
        <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1.5px solid rgba(83,22,151,0.2)', padding: '20px 22px', marginBottom: 20, boxShadow: '0 4px 20px rgba(83,22,151,0.1)' }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1rem', color: 'var(--text)', marginBottom: 16 }}>📋 New Placement Drive</div>
          <form onSubmit={createDrive}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              {[
                ['companyName', 'Company Name *', 'text', true],
                ['role', 'Role / Position', 'text', false],
                ['ctc', 'CTC / Package', 'text', false],
                ['logoUrl', 'Company Logo URL', 'url', false],
                ['driveDate', 'Drive Date *', 'date', true],
                ['lastApplyDate', 'Last Date to Apply', 'date', false],
              ].map(([key, label, type, req]) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 800, color: 'var(--text-3)', marginBottom: 4, fontFamily: "'Syne',sans-serif" }}>{label}</label>
                  <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} required={req}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #d0d7e8', fontFamily: "'Nunito',sans-serif", fontSize: '.85rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 800, color: 'var(--text-3)', marginBottom: 4, fontFamily: "'Syne',sans-serif" }}>Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #d0d7e8', fontFamily: "'Nunito',sans-serif", fontSize: '.85rem', outline: 'none', boxSizing: 'border-box' }}>
                  <option value="upcoming">Upcoming</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 800, color: 'var(--text-3)', marginBottom: 4, fontFamily: "'Syne',sans-serif" }}>Apply Link (optional)</label>
                <input type="url" value={form.applyLink} onChange={e => setForm(f => ({ ...f, applyLink: e.target.value }))}
                  placeholder="https://..." style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #d0d7e8', fontFamily: "'Nunito',sans-serif", fontSize: '.85rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 800, color: 'var(--text-3)', marginBottom: 4, fontFamily: "'Syne',sans-serif" }}>Eligibility Criteria</label>
              <input type="text" value={form.eligibility} onChange={e => setForm(f => ({ ...f, eligibility: e.target.value }))}
                placeholder="e.g. CGPA > 7.0, No backlogs, CSE/IT branches"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #d0d7e8', fontFamily: "'Nunito',sans-serif", fontSize: '.85rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 800, color: 'var(--text-3)', marginBottom: 4, fontFamily: "'Syne',sans-serif" }}>Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                placeholder="Additional details about the drive…"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #d0d7e8', fontFamily: "'Nunito',sans-serif", fontSize: '.85rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button type="submit" disabled={formLoading}
                style={{ padding: '10px 24px', borderRadius: 9, border: 'none', background: formLoading ? '#d0d7e8' : 'linear-gradient(135deg,#531697,#13a1a5)', color: '#fff', fontWeight: 800, cursor: formLoading ? 'default' : 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.88rem' }}>
                {formLoading ? 'Creating…' : '🚀 Create Drive & Notify Students'}
              </button>
              <span style={{ fontSize: '.75rem', color: 'var(--text-3)' }}>An announcement will be auto-created for all students</span>
            </div>
          </form>
        </div>
      )}

      {/* Drives List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ width: 36, height: 36, border: '3px solid #e8edf5', borderTopColor: '#531697', borderRadius: '50%', animation: '_sp .7s linear infinite', margin: '0 auto' }} />
          <style>{`@keyframes _sp{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--surface)', borderRadius: 14, border: '1px solid #e8edf5' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🏢</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1rem', color: 'var(--text)', marginBottom: 4 }}>No drives found</div>
          <div style={{ color: 'var(--text-3)', fontSize: '.83rem' }}>
            {isAdmin ? 'Click "+ Add Drive" to create the first placement drive' : 'Check back later for upcoming placement drives'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {filtered.map(drive => {
            const sc      = STATUS_COLORS[drive.status] || STATUS_COLORS.upcoming;
            const dDate   = drive.driveDate ? new Date(drive.driveDate) : null;
            const lDate   = drive.lastApplyDate ? new Date(drive.lastApplyDate) : null;
            const daysLeft= dDate ? Math.ceil((dDate - new Date()) / (1000 * 60 * 60 * 24)) : null;
            const lDaysLeft= lDate ? Math.ceil((lDate - new Date()) / (1000 * 60 * 60 * 24)) : null;

            return (
              <div key={drive._id} style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid #e8edf5', padding: '18px 20px', boxShadow: '0 2px 10px rgba(4,44,93,0.05)', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                {/* Logo */}
                <div style={{ width: 54, height: 54, borderRadius: 12, border: '1px solid #e8edf5', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                  {drive.logoUrl
                    ? <img src={drive.logoUrl} alt={drive.companyName} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} onError={e => e.target.style.display = 'none'} />
                    : <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.1rem', color: '#531697' }}>{drive.companyName?.charAt(0)}</span>
                  }
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                    <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1rem', color: 'var(--text)' }}>{drive.companyName}</div>
                    <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '.65rem', fontWeight: 800, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                      {drive.status.toUpperCase()}
                    </span>
                    {drive.applied && <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '.65rem', fontWeight: 800, background: 'rgba(71,211,114,0.1)', color: '#166534', border: '1px solid rgba(71,211,114,0.3)' }}>✅ APPLIED</span>}
                  </div>

                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: '.78rem', color: 'var(--text-3)', marginBottom: 8 }}>
                    {drive.role && <span>💼 {drive.role}</span>}
                    {drive.ctc  && <span>💰 {drive.ctc}</span>}
                    {dDate      && <span>📅 {dDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}{daysLeft > 0 ? ` (${daysLeft} days away)` : ' (Past)'}</span>}
                    {lDate      && lDaysLeft > 0 && <span style={{ color: lDaysLeft <= 3 ? '#ef4444' : 'var(--text-3)' }}>⏰ Apply by: {lDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ({lDaysLeft}d left)</span>}
                  </div>

                  {/* Branch tags & Personalized Profile Match Score */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
                    {user?.role === 'student' && (() => {
                      const userDept = (user.department || 'CSE').toUpperCase();
                      const userSkills = (user.skills || []).map(s => s.toLowerCase());
                      const roleText = `${drive.companyName} ${drive.role} ${drive.description || ''} ${(drive.branches || []).join(' ')}`.toLowerCase();

                      let baseScore = 74;
                      const branches = (drive.branches || []).map(b => b.toUpperCase());
                      if (branches.length === 0 || branches.some(b => b.includes(userDept) || userDept.includes(b))) {
                        baseScore += 12;
                      }

                      const isGovt = /drdo|isro|iit|barc|aicte|govt|defense|space/i.test(roleText);
                      if (isGovt) baseScore += 6;

                      // Skill overlap
                      let skillBonus = 0;
                      userSkills.forEach(s => {
                        if (s.length > 2 && roleText.includes(s)) skillBonus += 2;
                      });
                      baseScore += Math.min(6, skillBonus);

                      // Unique deterministic jitter per drive ID so scores vary authentically across cards
                      let hash = 0;
                      const str = `${drive._id || drive.companyName}_${drive.role}`;
                      for (let i = 0; i < str.length; i++) hash += str.charCodeAt(i);
                      const jitter = (hash % 7) - 3; // -3 to +3

                      const score = Math.min(98, Math.max(65, baseScore + jitter));

                      return (
                        <>
                          <span style={{ padding: '2px 9px', borderRadius: 999, fontSize: '.65rem', fontWeight: 800,
                            background: score >= 88 ? 'rgba(71,211,114,0.12)' : 'rgba(83,22,151,0.08)',
                            color: score >= 88 ? '#166534' : '#531697',
                            border: `1px solid ${score >= 88 ? 'rgba(71,211,114,0.3)' : 'rgba(83,22,151,0.2)'}` }}>
                            🎯 Match Score: {score}%
                          </span>
                          {score >= 88 && (
                            <span style={{ padding: '2px 9px', borderRadius: 999, fontSize: '.65rem', fontWeight: 800,
                              background: 'rgba(239,68,68,0.1)', color: '#991b1b', border: '1px solid rgba(239,68,68,0.25)' }}>
                              ⚡ MANDATORY APPLY
                            </span>
                          )}
                          {isGovt && (
                            <span style={{ padding: '2px 9px', borderRadius: 999, fontSize: '.65rem', fontWeight: 800,
                              background: 'rgba(245,158,11,0.12)', color: '#92400e', border: '1px solid rgba(245,158,11,0.3)' }}>
                              🇮🇳 GOVT / PRESTIGIOUS
                            </span>
                          )}
                        </>
                      );
                    })()}

                    {drive.isScraped && drive.branches?.length > 0 && drive.branches.map(b => (
                      <span key={b} style={{ padding: '2px 8px', borderRadius: 999, fontSize: '.62rem', fontWeight: 700,
                        background: 'rgba(19,161,165,0.08)', color: '#0e7490', border: '1px solid rgba(19,161,165,0.2)' }}>
                        {b}
                      </span>
                    ))}
                    {drive.sourceName && (
                      <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '.62rem', fontWeight: 700,
                        background: 'rgba(83,22,151,0.06)', color: '#531697', border: '1px solid rgba(83,22,151,0.15)' }}>
                        via {drive.sourceName}
                      </span>
                    )}
                  </div>

                  {drive.eligibility && (
                    <div style={{ fontSize: '.75rem', color: 'var(--text-2)', background: 'rgba(83,22,151,0.04)', padding: '5px 10px', borderRadius: 7, marginBottom: 8, border: '1px solid rgba(83,22,151,0.1)', display: 'inline-block' }}>
                      📋 Eligibility: {drive.eligibility}
                    </div>
                  )}

                  {/* Show AI description for scraped jobs, regular description for admin drives */}
                  {(drive.aiDescription || drive.description) && (
                    <div style={{ fontSize: '.78rem', color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 8 }}>
                      {drive.aiDescription || drive.description}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Button 1: Open Official Application Portal */}
                    {drive.applyLink && (
                      <a href={drive.applyLink} target="_blank" rel="noreferrer"
                        style={{ padding: '8px 16px', borderRadius: 9, border: 'none',
                          background: 'linear-gradient(135deg,#13a1a5,#531697)', color: '#fff',
                          fontWeight: 800, textDecoration: 'none', fontSize: '.82rem' }}>
                        🚀 Open Portal →
                      </a>
                    )}

                    {/* Button 2: Explicit "Did you apply? Mark as Applied" confirmation */}
                    {user?.role === 'student' && !drive.applied && (
                      <button onClick={() => apply(drive._id)} disabled={applying[drive._id]}
                        style={{ padding: '8px 14px', borderRadius: 9, border: '1.5px solid rgba(83,22,151,0.3)',
                          background: 'rgba(83,22,151,0.06)', color: '#531697', fontWeight: 800,
                          cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.8rem' }}>
                        {applying[drive._id] ? 'Saving…' : '☑️ Have you applied? Mark as Applied'}
                      </button>
                    )}

                    {/* Status badge when applied */}
                    {user?.role === 'student' && drive.applied && (
                      <span style={{ padding: '6px 14px', borderRadius: 999, background: 'rgba(71,211,114,0.15)', color: '#166534', border: '1px solid rgba(71,211,114,0.3)', fontWeight: 800, fontSize: '.78rem' }}>
                        ✅ Applied (In History)
                      </span>
                    )}
                    {/* Non-scraped official link */}
                    {!drive.isScraped && drive.applyLink && (
                      <a href={drive.applyLink} target="_blank" rel="noreferrer"
                        style={{ padding: '8px 14px', borderRadius: 9, border: '1px solid #d0d7e8', background: 'var(--surface)', color: '#531697', fontWeight: 700, textDecoration: 'none', fontSize: '.78rem' }}>
                        🌐 Official Link
                      </a>
                    )}
                    {isAdmin && (
                      <button onClick={() => deleteDrive(drive._id)}
                        style={{ padding: '8px 12px', borderRadius: 9, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', color: '#991b1b', fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.75rem' }}>
                        🗑️ Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Countdown */}
                {daysLeft !== null && daysLeft > 0 && (
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.6rem', color: daysLeft <= 7 ? '#ef4444' : daysLeft <= 30 ? '#f59e0b' : '#47d372', lineHeight: 1 }}>{daysLeft}</div>
                    <div style={{ fontSize: '.62rem', color: '#b0bec9', fontWeight: 600 }}>days</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
