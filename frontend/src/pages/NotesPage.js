import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDropzone } from 'react-dropzone';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tk = () => ({ Authorization: `Bearer ${localStorage.getItem('pragati_token')}` });
const DEPTS = ['CSE','CSAIML','IT','ECE','Mechanical','Civil','Other'];
const TOPICS = ['Algorithms','Data Structures','Machine Learning','Deep Learning','DBMS','Operating Systems','Computer Networks','Mathematics','Web Development','Cloud Computing','Aptitude','Other'];

// ── File Dropzone ──────────────────────────────────────────────────────────
function FileDropzone({ file, onFile }) {
  const onDrop = useCallback(acc => { if (acc[0]) onFile(acc[0]); }, [onFile]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: false });
  return (
    <div {...getRootProps()} style={{ border: `2px dashed ${isDragActive ? '#13a1a5' : file ? '#47d372' : '#d0d7e8'}`, borderRadius: 10, padding: '18px', textAlign: 'center', cursor: 'pointer', background: file ? 'rgba(71,211,114,0.04)' : '#fafbff', transition: 'all .2s' }}>
      <input {...getInputProps()} />
      <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{file ? '✅' : '📁'}</div>
      <div style={{ fontSize: '.8rem', fontWeight: 700, color: file ? '#2ea854' : '#7a8ba8' }}>{file ? file.name : 'Drop file here or click to browse'}</div>
      <div style={{ fontSize: '.7rem', color: '#b0bec9', marginTop: 2 }}>PDF, DOCX, PPT, PPTX — max 20MB</div>
    </div>
  );
}

// ── Upload Form ────────────────────────────────────────────────────────────
function UploadForm({ user, onUploaded }) {
  const [method, setMethod] = useState('file');
  const [form, setForm] = useState({ title: '', description: '', department: user?.department || 'CSE', subject: '', year: '3', topic: '', tags: '', driveUrl: '', uploaderName: '', visibility: 'public' });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleUpload(e) {
    e.preventDefault();
    if (method === 'file' && !file) { setMsg('❌ Please select a file'); return; }
    if (method === 'drive' && !form.driveUrl.trim()) { setMsg('❌ Please enter a Google Drive link'); return; }
    if (!form.title.trim()) { setMsg('❌ Note title is required'); return; }
    if (!form.subject.trim()) { setMsg('❌ Subject is required'); return; }
    setLoading(true); setMsg('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (method === 'file' && file) fd.append('file', file);
      const endpoint = user?.role === 'admin' ? '/notes/upload-admin' : '/notes/upload';
      const res = await fetch(`${API}${endpoint}`, { method: 'POST', headers: tk(), body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const isStudent = true;
      const uploadMsg = data.message || 'Note uploaded successfully';
      setMsg(`✅ ${uploadMsg}${isStudent && data.note?.status === 'pending' ? ' — It will appear after admin/faculty approval.' : ''}`);
      setFile(null);
      setForm(f => ({ ...f, title: '', description: '', subject: '', tags: '', driveUrl: '', uploaderName: '' }));
      onUploaded();
    } catch (err) { setMsg(`❌ ${err.message}`); }
    finally { setLoading(false); }
  }

  const INP = { style: { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #d0d7e8', fontFamily: "'Nunito',sans-serif", fontSize: '.875rem', outline: 'none', background: '#fafbff' } };
  const LBL = ({ children, req }) => <label style={{ display: 'block', fontSize: '.75rem', fontWeight: 700, color: '#3d4e6b', marginBottom: 4, fontFamily: "'Syne',sans-serif" }}>{children}{req && <span style={{ color: '#ef4444' }}> *</span>}</label>;

  return (
    <div style={{ background: '#fff', border: '1px solid #e8edf5', borderRadius: 16, padding: '22px 22px', marginBottom: 20, boxShadow: '0 2px 8px rgba(4,44,93,0.05)' }}>
      <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1rem', marginBottom: 16, color: '#0f1a2e' }}>
        📤 {user?.role === 'admin' ? 'Upload Notes on Behalf of Faculty' : 'Upload Notes'}
      </h3>

      {/* Method toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['file', '📁 File Upload'], ['drive', '🔗 Google Drive Link']].map(([m, l]) => (
          <button key={m} type="button" onClick={() => setMethod(m)}
            style={{ flex: 1, padding: '9px', borderRadius: 8, border: `1.5px solid ${method === m ? '#531697' : '#d0d7e8'}`, background: method === m ? 'rgba(83,22,151,0.06)' : 'transparent', color: method === m ? '#531697' : '#7a8ba8', fontWeight: 700, cursor: 'pointer', fontSize: '.82rem', fontFamily: "'Nunito',sans-serif" }}>
            {l}
          </button>
        ))}
      </div>

      <form onSubmit={handleUpload}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <LBL req>Note Title</LBL>
            <input {...INP} value={form.title} onChange={set('title')} placeholder="e.g. Unit 3 — Neural Networks" />
          </div>
          {user?.role === 'admin' && (
            <div style={{ gridColumn: '1/-1' }}>
              <LBL req>Faculty Name (uploading on behalf of)</LBL>
              <input {...INP} value={form.uploaderName} onChange={set('uploaderName')} placeholder="e.g. Mrs. Sapana Buwa" />
            </div>
          )}
          <div>
            <LBL req>Subject</LBL>
            <input {...INP} value={form.subject} onChange={set('subject')} placeholder="e.g. Machine Learning" />
          </div>
          <div>
            <LBL>Topic</LBL>
            <select {...INP} value={form.topic} onChange={set('topic')}>
              <option value="">Select topic</option>
              {TOPICS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <LBL>Department</LBL>
            <select {...INP} value={form.department} onChange={set('department')}>
              {DEPTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <LBL>Year</LBL>
            <select {...INP} value={form.year} onChange={set('year')}>
              {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <LBL>Description</LBL>
            <textarea {...INP} value={form.description} onChange={set('description')} rows={2} placeholder="Brief description of the content..." style={{ ...INP.style, resize: 'none' }} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <LBL>Tags <span style={{ fontWeight: 400, color: '#b0bec9' }}>(comma-separated)</span></LBL>
            <input {...INP} value={form.tags} onChange={set('tags')} placeholder="e.g. backpropagation, CNN, activation functions" />
          </div>

          {/* Visibility Toggle — Faculty can only upload Public; students can choose */}
          <div style={{ gridColumn: '1/-1' }}>
            <LBL>Visibility</LBL>
            {user?.role === 'faculty' ? (
              <div style={{ padding: '10px 14px', borderRadius: 9, border: '1.5px solid #13a1a5', background: 'rgba(19,161,165,0.07)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: '.83rem', color: '#13a1a5' }}>🌐 Public</span>
                <span style={{ fontSize: '.72rem', color: '#7a8ba8' }}>Faculty notes are always public — visible to all students after upload</span>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                {[['public','🌐 Public','Visible to all peers after faculty approval'],['private','🔒 Private','Only visible to you — uploaded instantly, no approval needed']].map(([val, label, desc]) => (
                  <button key={val} type="button" onClick={() => setForm(f => ({ ...f, visibility: val }))}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: 9, border: `1.5px solid ${form.visibility === val ? (val === 'public' ? '#13a1a5' : '#531697') : '#d0d7e8'}`, background: form.visibility === val ? (val === 'public' ? 'rgba(19,161,165,0.07)' : 'rgba(83,22,151,0.07)') : 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'all .15s' }}>
                    <div style={{ fontWeight: 700, fontSize: '.83rem', color: form.visibility === val ? (val === 'public' ? '#13a1a5' : '#531697') : '#7a8ba8', fontFamily: "'Nunito',sans-serif" }}>{label}</div>
                    <div style={{ fontSize: '.68rem', color: '#b0bec9', marginTop: 2 }}>{desc}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ gridColumn: '1/-1' }}>
            {method === 'file' ? (
              <><LBL req>File</LBL><FileDropzone file={file} onFile={setFile} /></>
            ) : (
              <>
                <LBL req>Google Drive Shareable Link</LBL>
                <input {...INP} type="url" value={form.driveUrl} onChange={set('driveUrl')} placeholder="https://drive.google.com/file/d/..." />
                <div style={{ fontSize: '.7rem', color: '#7a8ba8', marginTop: 4 }}>Make sure sharing is set to "Anyone with link can view"</div>
              </>
            )}
          </div>
        </div>

        {msg && (
          <div style={{ padding: '10px 14px', borderRadius: 8, fontSize: '.82rem', fontWeight: 600, marginBottom: 12, background: msg.startsWith('✅') ? '#dcfce7' : '#fee2e2', color: msg.startsWith('✅') ? '#166534' : '#991b1b' }}>
            {msg}
          </div>
        )}

        <button type="submit" disabled={loading}
          style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: loading ? '#d0d7e8' : 'linear-gradient(135deg,#531697,#13a1a5)', color: '#fff', fontWeight: 800, fontSize: '.9rem', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Nunito',sans-serif" }}>
          {loading ? 'Uploading…' : '📤 Upload Note'}
        </button>
      </form>
    </div>
  );
}

// ── Note Card ──────────────────────────────────────────────────────────────
function NoteCard({ note, user, onRefresh }) {
  const [showCode, setShowCode] = useState(false);
  const uploaderName = note.adminUploadedFor || note.uploadedBy?.name || 'Unknown';
  const isDrive = note.isDriveLink || isDriveUrl(note.fileUrl);
  const fileIcon = isDrive ? '🔗' : note.fileType?.includes('pdf') ? '📄' : note.fileType?.includes('presentation') ? '📊' : '📝';

  function isDriveUrl(url) { return url && (url.includes('drive.google.com') || url.includes('docs.google.com')); }

  async function handleDownload() {
    if (isDrive) { window.open(note.fileUrl, '_blank'); return; }
    const res = await fetch(`${API}/notes/download/${note._id}`, { headers: tk() });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = note.title || 'pragati-note';
      a.click(); URL.revokeObjectURL(url);
    } else { window.open(note.fileUrl, '_blank'); }
  }

  async function approve(action) {
    await fetch(`${API}/notes/${note._id}/${action}`, { method: 'PATCH', headers: tk() });
    onRefresh();
  }

  return (
    <div className="card" style={{ padding: '16px 18px', transition: 'all .2s', display: 'flex', flexDirection: 'column', gap: 8 }}
      onMouseOver={e => e.currentTarget.style.boxShadow = '0 6px 24px rgba(4,44,93,0.1)'}
      onMouseOut={e => e.currentTarget.style.boxShadow = ''}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,rgba(83,22,151,0.08),rgba(19,161,165,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>{fileIcon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '.88rem', color: '#0f1a2e', fontFamily: "'Syne',sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note.title}</div>
          <div style={{ fontSize: '.72rem', color: '#7a8ba8', marginTop: 2 }}>
            <span style={{ fontWeight: 700, color: '#531697' }}>{uploaderName}</span>
            {note.subject && <> · {note.subject}</>}
            {note.topic && <> · {note.topic}</>}
          </div>
          <div style={{ fontSize: '.7rem', color: '#b0bec9', marginTop: 1 }}>
            {note.department} · Year {note.year}
            {note.createdAt && <> · {new Date(note.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</>}
          </div>
        </div>
      </div>

      {note.description && <div style={{ fontSize: '.77rem', color: '#7a8ba8', lineHeight: 1.5 }}>{note.description}</div>}

      {note.tags?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {note.tags.map(t => <span key={t} style={{ padding: '2px 7px', borderRadius: 999, background: 'rgba(19,161,165,0.08)', color: '#0d7a7e', fontSize: '.68rem', fontWeight: 700 }}>{t}</span>)}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
        <button onClick={handleDownload}
          style={{ flex: 1, padding: '7px', borderRadius: 8, border: '1.5px solid rgba(83,22,151,0.2)', background: 'rgba(83,22,151,0.04)', cursor: 'pointer', fontSize: '.75rem', fontWeight: 700, color: '#531697', fontFamily: "'Nunito',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          {isDrive ? '🔗 Open Drive' : '⬇️ Download'}
        </button>
        {user?.role === 'admin' && note.status === 'pending' && (<>
          <button onClick={() => approve('approve')} style={{ padding: '7px 12px', borderRadius: 8, border: 'none', background: '#dcfce7', color: '#166534', cursor: 'pointer', fontSize: '.75rem', fontWeight: 700, fontFamily: "'Nunito',sans-serif" }}>✅</button>
          <button onClick={() => approve('reject')} style={{ padding: '7px 12px', borderRadius: 8, border: 'none', background: '#fee2e2', color: '#991b1b', cursor: 'pointer', fontSize: '.75rem', fontWeight: 700, fontFamily: "'Nunito',sans-serif" }}>❌</button>
        </>)}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function NotesPage() {
  const { user } = useAuth();
  const [notes, setNotes]       = useState([]);
  const [pending, setPending]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [activeTab, setActiveTab] = useState('browse');
  const [filterOptions, setFilterOptions] = useState({ subjects: [], topics: [], faculties: [] });
  const [filters, setFilters]   = useState({ department: '', year: '', subject: '', topic: '', facultyName: '' });
  const setF = k => e => setFilters(f => ({ ...f, [k]: e.target.value }));

  async function loadNotes() {
    setLoading(true);
    try {
      const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)));
      const res = await fetch(`${API}/notes?${params}`, { headers: tk() });
      const data = await res.json();
      setNotes(data.notes || []);
      if (data.subjects) setFilterOptions({ subjects: data.subjects || [], topics: data.topics || [], faculties: data.faculties || [] });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function loadPending() {
    try {
      const res = await fetch(`${API}/notes/pending`, { headers: tk() });
      const data = await res.json();
      setPending(data.notes || []);
    } catch (e) {}
  }

  useEffect(() => { loadNotes(); }, [filters]);
  useEffect(() => { if (user?.role === 'admin') loadPending(); }, [user]);

  // Group notes by Subject for display
  const groupedNotes = notes.reduce((acc, note) => {
    const key = note.subject || 'General';
    if (!acc[key]) acc[key] = [];
    acc[key].push(note);
    return acc;
  }, {});

  const TABS = [
    { id: 'browse', label: '📚 Browse Notes' },
    { id: 'upload', label: '📤 Upload Note' },
    ...(user?.role === 'admin' ? [{ id: 'pending', label: `⏳ Pending (${pending.length})` }] : []),
  ];

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div style={{ fontFamily: "'Nunito',sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.6rem', color: '#0f1a2e' }}>📚 Notes</h1>
        <p style={{ color: '#7a8ba8', marginTop: 4 }}>Study materials organised by faculty, subject, and topic.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 20, borderBottom: '1px solid #e8edf5' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding: '9px 18px', borderRadius: '9px 9px 0 0', border: 'none', borderBottom: activeTab === t.id ? '2px solid #531697' : '2px solid transparent', background: activeTab === t.id ? 'rgba(83,22,151,0.06)' : 'transparent', color: activeTab === t.id ? '#531697' : '#7a8ba8', fontWeight: 700, cursor: 'pointer', fontSize: '.85rem', fontFamily: "'Nunito',sans-serif" }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'upload' && <UploadForm user={user} onUploaded={() => { loadNotes(); setActiveTab('browse'); }} />}

      {activeTab === 'pending' && user?.role === 'admin' && (
        <div>
          <div style={{ marginBottom: 14, fontSize: '.85rem', color: '#7a8ba8' }}>{pending.length} notes awaiting approval</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
            {pending.map(n => <NoteCard key={n._id} note={n} user={user} onRefresh={() => { loadNotes(); loadPending(); }} />)}
            {!pending.length && <div style={{ color: '#7a8ba8', padding: '24px 0', fontWeight: 700 }}>✅ All caught up!</div>}
          </div>
        </div>
      )}

      {activeTab === 'browse' && (
        <>
          {/* ── Filter bar ── */}
          <div style={{ background: '#fff', border: '1px solid #e8edf5', borderRadius: 12, padding: '14px 18px', marginBottom: 18, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: '0 0 auto' }}>
              <div style={{ fontSize: '.7rem', fontWeight: 700, color: '#7a8ba8', marginBottom: 4 }}>FILTER BY</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {/* Faculty */}
                <select value={filters.facultyName} onChange={setF('facultyName')}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #d0d7e8', fontFamily: "'Nunito',sans-serif", fontSize: '.83rem', background: filters.facultyName ? 'rgba(83,22,151,0.06)' : '#fff', color: '#3d4e6b', cursor: 'pointer', minWidth: 160 }}>
                  <option value="">👤 All Faculty</option>
                  {filterOptions.faculties.map(f => <option key={f} value={f}>{f}</option>)}
                </select>

                {/* Subject */}
                <select value={filters.subject} onChange={setF('subject')}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #d0d7e8', fontFamily: "'Nunito',sans-serif", fontSize: '.83rem', background: filters.subject ? 'rgba(83,22,151,0.06)' : '#fff', color: '#3d4e6b', cursor: 'pointer', minWidth: 160 }}>
                  <option value="">📖 All Subjects</option>
                  {filterOptions.subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                {/* Topic */}
                <select value={filters.topic} onChange={setF('topic')}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #d0d7e8', fontFamily: "'Nunito',sans-serif", fontSize: '.83rem', background: filters.topic ? 'rgba(83,22,151,0.06)' : '#fff', color: '#3d4e6b', cursor: 'pointer', minWidth: 140 }}>
                  <option value="">🏷️ All Topics</option>
                  {filterOptions.topics.map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                {/* Department */}
                <select value={filters.department} onChange={setF('department')}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #d0d7e8', fontFamily: "'Nunito',sans-serif", fontSize: '.83rem', background: filters.department ? 'rgba(83,22,151,0.06)' : '#fff', color: '#3d4e6b', cursor: 'pointer' }}>
                  <option value="">🏛️ All Depts</option>
                  {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>

                {/* Year */}
                <select value={filters.year} onChange={setF('year')}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #d0d7e8', fontFamily: "'Nunito',sans-serif", fontSize: '.83rem', background: filters.year ? 'rgba(83,22,151,0.06)' : '#fff', color: '#3d4e6b', cursor: 'pointer' }}>
                  <option value="">📅 All Years</option>
                  {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
            </div>

            {hasFilters && (
              <button onClick={() => setFilters({ department: '', year: '', subject: '', topic: '', facultyName: '' })}
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #d0d7e8', background: 'transparent', color: '#7a8ba8', fontWeight: 700, cursor: 'pointer', fontSize: '.8rem', fontFamily: "'Nunito',sans-serif", alignSelf: 'flex-end' }}>
                ✕ Clear filters
              </button>
            )}
          </div>

          {/* Results summary */}
          <div style={{ fontSize: '.8rem', color: '#b0bec9', marginBottom: 14 }}>
            {loading ? 'Loading…' : `${notes.length} note${notes.length !== 1 ? 's' : ''} found${hasFilters ? ' (filtered)' : ''}`}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7a8ba8' }}>Loading notes…</div>
          ) : notes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>📚</div>
              <div style={{ color: '#7a8ba8', fontWeight: 700 }}>No notes found</div>
              <div style={{ color: '#b0bec9', fontSize: '.83rem', marginTop: 4 }}>
                {hasFilters ? 'Try removing some filters' : 'Upload the first note using the Upload tab'}
              </div>
            </div>
          ) : filters.subject || filters.facultyName || filters.topic ? (
            /* Flat view when filtering */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
              {notes.map(n => <NoteCard key={n._id} note={n} user={user} onRefresh={loadNotes} />)}
            </div>
          ) : (
            /* Grouped by subject when no filter */
            <div>
              {Object.entries(groupedNotes).sort(([a], [b]) => a.localeCompare(b)).map(([subject, subjectNotes]) => (
                <div key={subject} style={{ marginBottom: 24 }}>
                  {/* Subject header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.95rem', color: '#0f1a2e' }}>📖 {subject}</div>
                    <div style={{ flex: 1, height: 1, background: '#e8edf5' }} />
                    <div style={{ fontSize: '.75rem', color: '#b0bec9', fontWeight: 600 }}>{subjectNotes.length} note{subjectNotes.length !== 1 ? 's' : ''}</div>
                  </div>

                  {/* Notes in this subject */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
                    {subjectNotes.map(n => <NoteCard key={n._id} note={n} user={user} onRefresh={loadNotes} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
