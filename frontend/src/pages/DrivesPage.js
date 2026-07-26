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
  const [activeTab, setActiveTab] = useState('campus'); // 'campus' | 'external' | 'alumni'
  const [drives, setDrives]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [applying, setApplying]   = useState({});
  const [showForm, setShowForm]   = useState(false);
  const [filter, setFilter]       = useState('all');
  const [form, setForm]           = useState({
    companyName: '', role: '', ctc: '', driveDate: '',
    lastApplyDate: '', eligibility: '', description: '',
    applyLink: '', status: 'upcoming', logoUrl: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [msg, setMsg]             = useState('');

  // RAG Scraped Openings & Discovered Alumni state
  const [externalOpenings, setExternalOpenings] = useState([]);
  const [alumniList, setAlumniList]             = useState([]);
  const [ragLoading, setRagLoading]             = useState(false);
  const [searchQuery, setSearchQuery]           = useState('');
  const [selectedAlumni, setSelectedAlumni]     = useState(null);
  const [linkedinDraft, setLinkedinDraft]       = useState('');
  const [draftLoading, setDraftLoading]         = useState(false);
  const [copiedDraft, setCopiedDraft]           = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/drives`, { headers: tk() });
      const d   = await res.json();
      setDrives(d.drives || []);
    } catch {}
    setLoading(false);
  }

  async function loadRAGData() {
    setRagLoading(true);
    try {
      const [opRes, alumRes] = await Promise.all([
        fetch(`${API}/drives/external-openings?query=${encodeURIComponent(searchQuery)}`, { headers: tk() }),
        fetch(`${API}/drives/alumni?search=${encodeURIComponent(searchQuery)}`, { headers: tk() })
      ]);
      const opData = await opRes.json();
      const alumData = await alumRes.json();
      setExternalOpenings(opData.openings || []);
      setAlumniList(alumData.alumni || []);
    } catch (e) {}
    setRagLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (activeTab !== 'campus') {
      loadRAGData();
    }
  }, [activeTab, searchQuery]);

  async function generateLinkedInDraft(alumnus) {
    setSelectedAlumni(alumnus);
    setDraftLoading(true);
    setCopiedDraft(false);
    try {
      const res = await fetch(`${API}/drives/linkedin-draft`, {
        method: 'POST', headers: tks(),
        body: JSON.stringify({
          alumniName: alumnus.name,
          alumniCompany: alumnus.currentCompany,
          alumniRole: alumnus.role,
          userBranch: user?.department || 'Computer Science'
        })
      });
      const d = await res.json();
      setLinkedinDraft(d.draft || '');
    } catch {}
    setDraftLoading(false);
  }

  async function triggerCrawler() {
    if (!window.confirm('Run background worker crawler to fetch new jobs & alumni patterns?')) return;
    setMsg('⏳ Running background scraper...');
    try {
      const res = await fetch(`${API}/drives/run-crawler`, { method: 'POST', headers: tks() });
      const d = await res.json();
      if (res.ok) {
        setMsg('✅ Background scraper finished updating listings & alumni!');
        loadRAGData();
      } else {
        setMsg(`❌ ${d.error || 'Scraper failed'}`);
      }
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    }
    setTimeout(() => setMsg(''), 4000);
  }

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
    try {
      const res = await fetch(`${API}/drives`, {
        method: 'POST', headers: tks(),
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed');
      setMsg('✅ Drive created and announcement sent!');
      setShowForm(false);
      setForm({ companyName: '', role: '', ctc: '', driveDate: '', lastApplyDate: '', eligibility: '', description: '', applyLink: '', status: 'upcoming', logoUrl: '' });
      load();
      setTimeout(() => setMsg(''), 4000);
    } catch (err) { setMsg(`❌ ${err.message}`); }
    setFormLoading(false);
  }

  async function deleteDrive(id) {
    if (!window.confirm('Delete this drive?')) return;
    await fetch(`${API}/drives/${id}`, { method: 'DELETE', headers: tk() });
    load();
  }

  const filtered = filter === 'all' ? drives : drives.filter(d => d.status === filter);
  const isAdmin  = user?.role === 'admin' || user?.role === 'faculty';

  return (
    <div style={{ fontFamily: "'Nunito',sans-serif" }}>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.5rem', color: 'var(--text)', margin: 0 }}>🗓️ Placement & Career Opportunities</h1>
          <p style={{ color: 'var(--text-3)', marginTop: 4, fontSize: '.85rem' }}>Campus drives, live global openings, and discovered KIT college alumni</p>
        </div>
        {isAdmin && (
          <button onClick={triggerCrawler}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #d0d7e8', background: 'var(--surface)', color: '#531697', fontWeight: 800, cursor: 'pointer', fontSize: '.8rem' }}>
            ⚡ Run RAG Scraper Worker
          </button>
        )}
      </div>

      {msg && (
        <div style={{ padding: '10px 16px', borderRadius: 9, background: msg.startsWith('✅') ? 'rgba(71,211,114,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.startsWith('✅') ? 'rgba(71,211,114,0.3)' : 'rgba(239,68,68,0.3)'}`, color: msg.startsWith('✅') ? '#166534' : '#991b1b', fontWeight: 700, fontSize: '.85rem', marginBottom: 16 }}>
          {msg}
        </div>
      )}

      {/* Module Navigation Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid #e8edf5', pb: 10 }}>
        {[
          ['campus', '🏢 Campus Placement Drives'],
          ['external', '🌐 Live Global Internships & Jobs (RAG)'],
          ['alumni', '🎓 Discovered KIT Alumni']
        ].map(([tabKey, label]) => (
          <button key={tabKey} onClick={() => setActiveTab(tabKey)}
            style={{ padding: '8px 16px', borderRadius: '8px 8px 0 0', border: 'none', borderBottom: activeTab === tabKey ? '3px solid #531697' : '3px solid transparent', background: activeTab === tabKey ? 'rgba(83,22,151,0.06)' : 'transparent', color: activeTab === tabKey ? '#531697' : 'var(--text-3)', fontWeight: 800, cursor: 'pointer', fontSize: '.88rem' }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'campus' && (
        <>
          {/* Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {['all', 'open', 'upcoming', 'closed'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{ padding: '6px 14px', borderRadius: 999, border: `1.5px solid ${filter === f ? '#531697' : '#d0d7e8'}`, background: filter === f ? 'rgba(83,22,151,0.08)' : '#fff', color: filter === f ? '#531697' : 'var(--text-3)', fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.78rem', textTransform: 'capitalize' }}>
                  {f === 'all' ? 'All Drives' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
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
                    <div style={{ width: 54, height: 54, borderRadius: 12, border: '1px solid #e8edf5', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                      {drive.logoUrl
                        ? <img src={drive.logoUrl} alt={drive.companyName} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} onError={e => e.target.style.display = 'none'} />
                        : <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.1rem', color: '#531697' }}>{drive.companyName?.charAt(0)}</span>
                      }
                    </div>

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

                      {drive.eligibility && (
                        <div style={{ fontSize: '.75rem', color: 'var(--text-2)', background: 'rgba(83,22,151,0.04)', padding: '5px 10px', borderRadius: 7, marginBottom: 8, border: '1px solid rgba(83,22,151,0.1)', display: 'inline-block' }}>
                          📋 Eligibility: {drive.eligibility}
                        </div>
                      )}

                      {drive.description && (
                        <div style={{ fontSize: '.78rem', color: 'var(--text-3)', lineHeight: 1.5, marginBottom: 8 }}>{drive.description}</div>
                      )}

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        {user?.role === 'student' && drive.status === 'open' && !drive.applied && (
                          <button onClick={() => apply(drive._id)} disabled={applying[drive._id]}
                            style={{ padding: '8px 18px', borderRadius: 9, border: 'none', background: applying[drive._id] ? '#d0d7e8' : 'linear-gradient(135deg,#531697,#13a1a5)', color: '#fff', fontWeight: 800, cursor: applying[drive._id] ? 'default' : 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.82rem' }}>
                            {applying[drive._id] ? 'Applying…' : '🚀 Apply Now'}
                          </button>
                        )}
                        {user?.role === 'student' && drive.status === 'open' && drive.applied && (
                          <span style={{ padding: '8px 16px', borderRadius: 9, background: 'rgba(71,211,114,0.08)', color: '#166534', fontWeight: 800, fontSize: '.82rem', border: '1px solid rgba(71,211,114,0.2)' }}>✅ Application Submitted</span>
                        )}
                        {drive.applyLink && (
                          <a href={drive.applyLink} target="_blank" rel="noreferrer"
                            style={{ padding: '8px 14px', borderRadius: 9, border: '1px solid #d0d7e8', background: 'var(--surface)', color: '#531697', fontWeight: 700, textDecoration: 'none', fontSize: '.78rem' }}>
                            🌐 External Link
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
        </>
      )}

      {/* RAG Scraped Global Openings */}
      {activeTab === 'external' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="🔍 Search live jobs by role, stack, or company (e.g. React, Amazon, Cloud)..."
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #d0d7e8', outline: 'none', fontSize: '.88rem' }} />
          </div>

          {ragLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>Loading RAG Openings...</div>
          ) : externalOpenings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, background: 'var(--surface)', borderRadius: 12 }}>No external openings found. Try running the RAG scraper worker!</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {externalOpenings.map((op, idx) => (
                <div key={idx} style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid #e8edf5', padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '.98rem', color: 'var(--text)' }}>{op.title}</div>
                    <div style={{ fontSize: '.82rem', color: '#531697', fontWeight: 700, marginTop: 2 }}>🏢 {op.companyName} • {op.ctc ? `${op.ctc} LPA` : 'Competitive'}</div>
                    <div style={{ fontSize: '.75rem', color: 'var(--text-3)', marginTop: 4 }}>
                      Branches: {op.allowedBranches?.join(', ') || 'All Branches'} • Source: {op.source || 'RSS Crawler'}
                    </div>
                  </div>
                  <a href={op.applyLink} target="_blank" rel="noreferrer"
                    style={{ padding: '8px 16px', borderRadius: 8, background: 'linear-gradient(135deg,#531697,#13a1a5)', color: '#fff', fontWeight: 800, textDecoration: 'none', fontSize: '.8rem' }}>
                    Apply External ↗
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Discovered KIT Alumni Tab */}
      {activeTab === 'alumni' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="🔍 Search alumni by company or role (e.g. Amazon, TCS, SDE)..."
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #d0d7e8', outline: 'none', fontSize: '.88rem' }} />
          </div>

          {ragLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>Searching Discovered Alumni...</div>
          ) : alumniList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, background: 'var(--surface)', borderRadius: 12 }}>No alumni cards found.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {alumniList.map((alm, idx) => (
                <div key={idx} style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid #e8edf5', padding: '16px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)' }}>🎓 {alm.name}</div>
                    <div style={{ fontSize: '.84rem', color: '#531697', fontWeight: 700, marginTop: 4 }}>{alm.role || 'Software Engineer'}</div>
                    <div style={{ fontSize: '.8rem', color: 'var(--text-2)', marginTop: 2 }}>🏢 {alm.currentCompany}</div>
                    <div style={{ fontSize: '.75rem', color: 'var(--text-3)', marginTop: 6 }}>Branch: {alm.branch || 'CSE'} ({alm.gradYear || 'Batch'})</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <a href={alm.linkedinUrl && !alm.linkedinUrl.includes('kit-alumni-discovered') && !alm.linkedinUrl.includes('-kitcoek') ? alm.linkedinUrl : `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(alm.name + ' ' + (alm.currentCompany || ''))}`} target="_blank" rel="noreferrer"
                      style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid #0077b5', color: '#0077b5', textAlign: 'center', textDecoration: 'none', fontWeight: 700, fontSize: '.76rem' }}>
                      LinkedIn ↗
                    </a>
                    <button onClick={() => generateLinkedInDraft(alm)}
                      style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#531697,#13a1a5)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '.76rem' }}>
                      ✨ AI Draft
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* AI LinkedIn Draft Modal */}
          {selectedAlumni && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
              <div style={{ background: 'var(--surface)', borderRadius: 14, width: '100%', maxWidth: 500, padding: 22, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)' }}>✨ AI LinkedIn Draft for {selectedAlumni.name}</div>
                  <button onClick={() => setSelectedAlumni(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                </div>
                {draftLoading ? (
                  <div style={{ padding: 20, textAlign: 'center' }}>Generating tailored AI draft…</div>
                ) : (
                  <div>
                    <textarea value={linkedinDraft} onChange={e => setLinkedinDraft(e.target.value)} rows={7}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #d0d7e8', fontSize: '.84rem', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                      <span style={{ fontSize: '.75rem', color: 'var(--text-3)' }}>Copy and paste into your LinkedIn connection note</span>
                      <button onClick={() => { navigator.clipboard.writeText(linkedinDraft); setCopiedDraft(true); }}
                        style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: copiedDraft ? '#166534' : '#531697', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '.82rem' }}>
                        {copiedDraft ? '✅ Copied!' : '📋 Copy Draft'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

