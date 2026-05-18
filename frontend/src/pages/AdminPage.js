import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tk  = () => ({ Authorization:`Bearer ${localStorage.getItem('pragati_token')}` });

const inp = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.875rem', outline:'none', background:'#fafbff' };
const Lbl = ({ children, req }) => <label style={{ display:'block', fontSize:'.75rem', fontWeight:700, color:'#3d4e6b', marginBottom:4, fontFamily:"'Syne',sans-serif" }}>{children} {req&&<span style={{ color:'#ef4444' }}>*</span>}</label>;
const Msg = ({ msg }) => msg ? <div style={{ padding:'10px 14px', borderRadius:8, fontSize:'.82rem', fontWeight:600, margin:'10px 0', background:msg.startsWith('✅')?'#dcfce7':'#fee2e2', color:msg.startsWith('✅')?'#166534':'#991b1b' }}>{msg}</div> : null;

function Section({ title, children }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #e8edf5', borderRadius:16, padding:'22px 24px', marginBottom:20, boxShadow:'0 2px 8px rgba(4,44,93,0.05)' }}>
      <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', marginBottom:16, color:'#0f1a2e' }}>{title}</h3>
      {children}
    </div>
  );
}

function AddCompanyForm({ onAdded }) {
  const [form, setForm] = useState({ name:'', sector:'IT Services', status:'expected', ctc:'', website:'', roles:'', recruitmentRounds:'', aptitudePatterns:'', interviewPatterns:'', difficulty:'Easy', minCGPA:'6.0', prepTips:'', jdText:'' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const TA = (rows=3) => ({ ...inp, height:rows*28, resize:'none' });
  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setMsg('❌ Company name is required'); return; }
    setLoading(true); setMsg('');
    try {
      await axios.post(`${API}/companies`, {
        ...form,
        roles: form.roles.split('\n').filter(Boolean),
        recruitmentRounds: form.recruitmentRounds.split('\n').filter(Boolean),
        eligibilityCriteria: { minCGPA:Number(form.minCGPA), allowedBranches:['CSE','CSAIML','IT','ECE'], backlogs:false }
      }, { headers:tk() });
      setMsg('✅ Company added!');
      setForm(f=>({...f,name:'',roles:'',recruitmentRounds:'',aptitudePatterns:'',interviewPatterns:'',prepTips:'',jdText:'',website:''}));
      onAdded();
    } catch(err){ setMsg('❌ '+( err.response?.data?.error||err.message)); }
    finally { setLoading(false); }
  }
  return (
    <form onSubmit={submit}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
        <div style={{ gridColumn:'1/-1' }}><Lbl req>Company Name</Lbl><input style={inp} value={form.name} onChange={set('name')} placeholder="TCS, Infosys, Zensar…" required/></div>
        <div><Lbl>Sector</Lbl><select style={inp} value={form.sector} onChange={set('sector')}>{['IT Services','IT Product','FinTech','EdTech','Core Engineering','Consulting','Banking','Healthcare','Other'].map(s=><option key={s}>{s}</option>)}</select></div>
        <div><Lbl>Status</Lbl><select style={inp} value={form.status} onChange={set('status')}><option value="expected">Expected</option><option value="upcoming">Upcoming</option><option value="visited">Visited</option></select></div>
        <div><Lbl>CTC Range</Lbl><input style={inp} value={form.ctc} onChange={set('ctc')} placeholder="4–8 LPA"/></div>
        <div><Lbl>Min CGPA</Lbl><input style={inp} type="number" step="0.1" min="0" max="10" value={form.minCGPA} onChange={set('minCGPA')}/></div>
        <div><Lbl>Difficulty</Lbl><select style={inp} value={form.difficulty} onChange={set('difficulty')}><option>Easy</option><option>Medium</option><option>Hard</option></select></div>
        <div><Lbl>Company Website</Lbl><input style={inp} type="url" value={form.website} onChange={set('website')} placeholder="https://www.company.com"/></div>
        <div style={{ gridColumn:'1/-1' }}><Lbl>Roles (one per line)</Lbl><textarea style={TA(2)} value={form.roles} onChange={set('roles')} placeholder="Software Engineer&#10;Data Analyst"/></div>
        <div style={{ gridColumn:'1/-1' }}><Lbl>Recruitment Rounds (one per line)</Lbl><textarea style={TA(3)} value={form.recruitmentRounds} onChange={set('recruitmentRounds')} placeholder="Online Aptitude Test&#10;Technical Interview&#10;HR Interview"/></div>
        <div style={{ gridColumn:'1/-1' }}><Lbl>Aptitude Pattern</Lbl><textarea style={TA(2)} value={form.aptitudePatterns} onChange={set('aptitudePatterns')} placeholder="Sections, timing, topics…"/></div>
        <div style={{ gridColumn:'1/-1' }}><Lbl>Interview Pattern</Lbl><textarea style={TA(2)} value={form.interviewPatterns} onChange={set('interviewPatterns')} placeholder="Technical and HR round description…"/></div>
        <div style={{ gridColumn:'1/-1' }}><Lbl>Prep Tips</Lbl><textarea style={TA(2)} value={form.prepTips} onChange={set('prepTips')} placeholder="Key resources, books, strategies…"/></div>
        <div style={{ gridColumn:'1/-1' }}><Lbl>Job Description (optional — for skill matching)</Lbl><textarea style={TA(3)} value={form.jdText} onChange={set('jdText')} placeholder="Paste JD text for AI-powered skill matching…"/></div>
      </div>
      <Msg msg={msg}/>
      <button type="submit" disabled={loading} style={{ padding:'11px 24px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif" }}>
        {loading?'Adding…':'🏢 Add Company'}
      </button>
    </form>
  );
}

function BulkAptitudeUpload({ onAdded }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const sample = `[\n  {\n    "topic": "Quantitative",\n    "difficulty": "Easy",\n    "question": "What is 20% of 350?",\n    "options": ["60","70","80","90"],\n    "answer": "70",\n    "explanation": "350 × 0.20 = 70"\n  }\n]`;
  async function submit(e) {
    e.preventDefault();
    setLoading(true); setMsg('');
    try {
      const questions = JSON.parse(text);
      const res = await axios.post(`${API}/aptitude/bulk`, { questions }, { headers:tk() });
      setMsg(`✅ ${res.data.inserted} questions added!`);
      setText('');
      onAdded();
    } catch(err){ setMsg('❌ '+( err.response?.data?.error||err.message)); }
    finally { setLoading(false); }
  }
  return (
    <form onSubmit={submit}>
      <div style={{ marginBottom:10, fontSize:'.82rem', color:'#7a8ba8', lineHeight:1.6 }}>Required fields: <code style={{ background:'#f0f3fa', padding:'1px 6px', borderRadius:4 }}>topic, difficulty, question, options, answer, explanation</code></div>
      <div style={{ marginBottom:12 }}><Lbl>Sample format:</Lbl><pre style={{ background:'#0f172a', borderRadius:8, padding:'10px 12px', fontSize:'.74rem', overflowX:'auto', color:'#e2e8f0', fontFamily:'monospace' }}>{sample}</pre></div>
      <Lbl>Paste JSON Array:</Lbl>
      <textarea style={{ ...inp, height:160, resize:'vertical', fontFamily:'monospace', fontSize:'.8rem', background:'#0f172a', color:'#e2e8f0' }} value={text} onChange={e=>setText(e.target.value)} placeholder={sample} required/>
      <Msg msg={msg}/>
      <button type="submit" disabled={loading||!text.trim()} style={{ marginTop:10, padding:'11px 24px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#13a1a5,#47d372)', color:'#fff', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif" }}>
        {loading?'Uploading…':'🎯 Bulk Upload Questions'}
      </button>
    </form>
  );
}

function PendingNotes({ onRefresh }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    axios.get(`${API}/notes/pending`, { headers:tk() }).then(r=>setNotes(r.data.notes||[])).catch(()=>[]).finally(()=>setLoading(false));
  }, []);
  async function act(id, action) {
    await axios.patch(`${API}/notes/${id}/${action}`, {}, { headers:tk() });
    setNotes(n=>n.filter(x=>x._id!==id));
    onRefresh();
  }
  if (loading) return <div style={{ color:'#b0bec9' }}>Loading…</div>;
  if (!notes.length) return <div style={{ color:'#7a8ba8', fontSize:'.875rem' }}>✅ No pending notes!</div>;
  return notes.map(n=>(
    <div key={n._id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:10, border:'1px solid #e8edf5', marginBottom:8, background:'#fafbff' }}>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:700, fontSize:'.88rem', color:'#0f1a2e' }}>{n.title}</div>
        <div style={{ fontSize:'.73rem', color:'#7a8ba8' }}>{n.subject} · {n.department} · Year {n.year} · by {n.uploadedBy?.name}</div>
      </div>
      <button onClick={()=>act(n._id,'approve')} style={{ padding:'6px 14px', borderRadius:8, border:'none', background:'#dcfce7', color:'#166534', fontWeight:700, cursor:'pointer', fontSize:'.78rem', fontFamily:"'Nunito',sans-serif" }}>✅ Approve</button>
      <button onClick={()=>act(n._id,'reject')} style={{ padding:'6px 14px', borderRadius:8, border:'none', background:'#fee2e2', color:'#991b1b', fontWeight:700, cursor:'pointer', fontSize:'.78rem', fontFamily:"'Nunito',sans-serif" }}>❌ Reject</button>
    </div>
  ));
}

function UsersTable() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState('students'); // students | faculty | admins
  const [yearFilter, setYearFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  useEffect(() => {
    axios.get(`${API}/users`, { headers:tk() })
      .then(r=>setUsers(r.data.users||[])).catch(()=>[]).finally(()=>setLoading(false));
  }, []);

  const lc = { Beginner:'#f59e0b', Intermediate:'#531697', Expert:'#47d372' };
  const students = users.filter(u=>u.role==='student' && (!yearFilter||String(u.year)===yearFilter) && (!deptFilter||u.department===deptFilter));
  const faculty  = users.filter(u=>u.role==='faculty'  && (!deptFilter||u.department===deptFilter));
  const admins   = users.filter(u=>u.role==='admin');
  const DEPTS    = ['','CSE','CSAIML','IT','ECE','Mechanical','Civil'];

  if (loading) return <div style={{ color:'#b0bec9' }}>Loading users…</div>;

  return (
    <div>
      {/* Section toggle */}
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {[['students',`🎓 Students (${users.filter(u=>u.role==='student').length})`],['faculty',`👨‍🏫 Faculty (${users.filter(u=>u.role==='faculty').length})`],['admins',`⚙️ Admins (${users.filter(u=>u.role==='admin').length})`]].map(([s,l])=>(
          <button key={s} onClick={()=>setSection(s)} style={{ padding:'7px 16px', borderRadius:9, border:`1.5px solid ${section===s?'#531697':'#d0d7e8'}`, background:section===s?'rgba(83,22,151,0.08)':'transparent', color:section===s?'#531697':'#7a8ba8', fontWeight:700, cursor:'pointer', fontSize:'.82rem', fontFamily:"'Nunito',sans-serif" }}>
            {l}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        {section==='students' && (
          <select value={yearFilter} onChange={e=>setYearFilter(e.target.value)} style={{ ...inp, width:'auto', padding:'6px 12px' }}>
            {['','1','2','3','4'].map(y=><option key={y} value={y}>{y?`Year ${y}`:'All Years'}</option>)}
          </select>
        )}
        {(section==='students'||section==='faculty') && (
          <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)} style={{ ...inp, width:'auto', padding:'6px 12px' }}>
            {DEPTS.map(d=><option key={d} value={d}>{d||'All Departments'}</option>)}
          </select>
        )}
      </div>

      {/* Students table */}
      {section==='students' && (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.8rem' }}>
            <thead><tr style={{ borderBottom:'2px solid #e8edf5' }}>
              {['Name','Email','Roll','Year','Dept','Level','Streak','ATS'].map(h=><th key={h} style={{ padding:'7px 10px', textAlign:'left', color:'#3d4e6b', fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:'.72rem' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {students.map(u=>(
                <tr key={u._id} style={{ borderBottom:'1px solid #f0f3fa' }}>
                  <td style={{ padding:'8px 10px', fontWeight:700, color:'#0f1a2e' }}>{u.name}</td>
                  <td style={{ padding:'8px 10px', color:'#7a8ba8', fontSize:'.75rem' }}>{u.email}</td>
                  <td style={{ padding:'8px 10px', color:'#7a8ba8' }}>{u.rollNumber||'—'}</td>
                  <td style={{ padding:'8px 10px', color:'#7a8ba8' }}>Y{u.year||'—'}</td>
                  <td style={{ padding:'8px 10px', color:'#7a8ba8' }}>{u.department}</td>
                  <td style={{ padding:'8px 10px' }}><span style={{ padding:'2px 7px', borderRadius:999, background:`${lc[u.skillLevel]||'#531697'}15`, color:lc[u.skillLevel]||'#531697', fontWeight:700, fontSize:'.7rem' }}>{u.skillLevel||'Beginner'}</span></td>
                  <td style={{ padding:'8px 10px', color:'#3d4e6b' }}>🔥{u.streak||0}</td>
                  <td style={{ padding:'8px 10px', fontWeight:800, color:'#531697' }}>{u.atsScore||'—'}</td>
                </tr>
              ))}
              {!students.length&&<tr><td colSpan={8} style={{ padding:16, textAlign:'center', color:'#b0bec9' }}>No students found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Faculty table — NO skill level, NO ATS */}
      {section==='faculty' && (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.8rem' }}>
            <thead><tr style={{ borderBottom:'2px solid #e8edf5' }}>
              {['Name','Email','Department','Joined','Role'].map(h=><th key={h} style={{ padding:'7px 10px', textAlign:'left', color:'#3d4e6b', fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:'.72rem' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {faculty.map(u=>(
                <tr key={u._id} style={{ borderBottom:'1px solid #f0f3fa' }}>
                  <td style={{ padding:'8px 10px', fontWeight:700, color:'#042c5d' }}>{u.name}</td>
                  <td style={{ padding:'8px 10px', color:'#7a8ba8', fontSize:'.75rem' }}>{u.email}</td>
                  <td style={{ padding:'8px 10px', color:'#7a8ba8' }}>{u.department}</td>
                  <td style={{ padding:'8px 10px', color:'#b0bec9', fontSize:'.72rem' }}>{u.createdAt?new Date(u.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):'—'}</td>
                  <td style={{ padding:'8px 10px' }}><span style={{ padding:'2px 8px', borderRadius:999, background:'rgba(4,44,93,0.08)', color:'#042c5d', fontWeight:700, fontSize:'.7rem' }}>Faculty</span></td>
                </tr>
              ))}
              {!faculty.length&&<tr><td colSpan={5} style={{ padding:16, textAlign:'center', color:'#b0bec9' }}>No faculty found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Admins */}
      {section==='admins' && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {admins.map(u=>(
            <div key={u._id} style={{ padding:'10px 16px', borderRadius:10, background:'rgba(83,22,151,0.06)', border:'1px solid rgba(83,22,151,0.12)' }}>
              <div style={{ fontWeight:700, fontSize:'.85rem', color:'#531697' }}>{u.name}</div>
              <div style={{ fontSize:'.72rem', color:'#7a8ba8' }}>{u.email}</div>
            </div>
          ))}
          {!admins.length&&<div style={{ color:'#b0bec9', fontSize:'.875rem' }}>No admins found</div>}
        </div>
      )}
    </div>
  );
}

// ── Manage Placement Drives ──────────────────────────────────────────────────
function ManageDrives({ onRefresh }) {
  const API2 = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const tk2 = () => ({ Authorization: `Bearer ${localStorage.getItem('pragati_token')}` });
  const tks2 = () => ({ ...tk2(), 'Content-Type': 'application/json' });

  const [drives, setDrives] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [msg, setMsg] = React.useState('');
  const [form, setForm] = React.useState({
    companyName:'', role:'', ctc:'', driveDate:'', lastApplyDate:'', eligibility:'', description:'', applyLink:'', status:'upcoming'
  });

  React.useEffect(() => { loadDrives(); }, []);

  async function loadDrives() {
    try {
      const r = await fetch(`${API2}/drives`, { headers: tk2() });
      const d = await r.json();
      setDrives(d.drives || []);
    } catch {} finally { setLoading(false); }
  }

  async function createDrive(e) {
    e.preventDefault();
    if (!form.companyName || !form.driveDate) { setMsg('❌ Company name and drive date are required'); return; }
    try {
      const r = await fetch(`${API2}/drives`, { method:'POST', headers:tks2(), body: JSON.stringify(form) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMsg('✅ Drive created! Announcement auto-sent to all students.');
      setForm({ companyName:'', role:'', ctc:'', driveDate:'', lastApplyDate:'', eligibility:'', description:'', applyLink:'', status:'upcoming' });
      loadDrives();
      onRefresh?.();
    } catch(err) { setMsg(`❌ ${err.message}`); }
  }

  async function deleteDrive(id) {
    if (!window.confirm('Delete this drive?')) return;
    await fetch(`${API2}/drives/${id}`, { method:'DELETE', headers:tk2() });
    loadDrives();
  }

  const INP = { style:{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.85rem', outline:'none', boxSizing:'border-box', color:'#0f1a2e' } };
  const LBL = ({ children }) => <label style={{ display:'block', fontSize:'.73rem', fontWeight:700, color:'#7a8ba8', marginBottom:4 }}>{children}</label>;

  return (
    <div>
      <div style={{ background:'rgba(83,22,151,0.04)', border:'1px solid rgba(83,22,151,0.12)', borderRadius:12, padding:20, marginBottom:24 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', color:'#0f1a2e', marginBottom:16 }}>➕ Add New Placement Drive</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div><LBL>Company Name *</LBL><input {...INP} value={form.companyName} onChange={e=>setForm(f=>({...f,companyName:e.target.value}))} placeholder="e.g. TCS, Infosys"/></div>
          <div><LBL>Role</LBL><input {...INP} value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} placeholder="e.g. Software Engineer"/></div>
          <div><LBL>CTC</LBL><input {...INP} value={form.ctc} onChange={e=>setForm(f=>({...f,ctc:e.target.value}))} placeholder="e.g. ₹6 LPA"/></div>
          <div><LBL>Drive Date *</LBL><input {...INP} type="date" value={form.driveDate} onChange={e=>setForm(f=>({...f,driveDate:e.target.value}))}/></div>
          <div><LBL>Last Apply Date</LBL><input {...INP} type="date" value={form.lastApplyDate} onChange={e=>setForm(f=>({...f,lastApplyDate:e.target.value}))}/></div>
          <div><LBL>Status</LBL>
            <select {...INP} value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
              <option value="upcoming">Upcoming</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div style={{ gridColumn:'1/-1' }}><LBL>Eligibility Criteria</LBL><input {...INP} value={form.eligibility} onChange={e=>setForm(f=>({...f,eligibility:e.target.value}))} placeholder="e.g. CGPA ≥ 6.5, All branches, No backlogs"/></div>
          <div style={{ gridColumn:'1/-1' }}><LBL>Apply Link (optional)</LBL><input {...INP} value={form.applyLink} onChange={e=>setForm(f=>({...f,applyLink:e.target.value}))} placeholder="https://..."/></div>
          <div style={{ gridColumn:'1/-1' }}><LBL>Description</LBL><textarea {...INP} rows={3} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Additional details about the drive…" style={{...INP.style, resize:'vertical'}}/></div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:14 }}>
          <button onClick={createDrive} style={{ padding:'10px 22px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.85rem' }}>
            🗓️ Create Drive & Notify Students
          </button>
          {msg && <span style={{ fontSize:'.83rem', color: msg.startsWith('✅') ? '#166534' : '#991b1b', fontWeight:700 }}>{msg}</span>}
        </div>
      </div>

      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.9rem', color:'#0f1a2e', marginBottom:12 }}>All Placement Drives ({drives.length})</div>
      {loading ? <div style={{ color:'#b0bec9' }}>Loading…</div> :
        drives.length === 0 ? <div style={{ color:'#b0bec9', fontSize:'.85rem' }}>No drives created yet.</div> :
        drives.map(d => (
          <div key={d._id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:10, border:'1px solid #e8edf5', background:'#fafbff', marginBottom:8 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, fontSize:'.88rem', color:'#0f1a2e' }}>{d.companyName} {d.role && <span style={{ color:'#7a8ba8', fontWeight:600 }}>— {d.role}</span>}</div>
              <div style={{ fontSize:'.72rem', color:'#7a8ba8', marginTop:2 }}>
                📅 {new Date(d.driveDate).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                {d.ctc && ` · 💰 ${d.ctc}`}
                {` · 👥 ${d.applicants?.length || 0} applicants`}
                <span style={{ marginLeft:8, padding:'1px 6px', borderRadius:999, background:'rgba(83,22,151,0.08)', color:'#531697', fontSize:'.65rem', fontWeight:700 }}>{d.status}</span>
              </div>
            </div>
            <button onClick={()=>deleteDrive(d._id)} style={{ padding:'5px 10px', borderRadius:7, border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.06)', color:'#991b1b', fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.75rem' }}>Delete</button>
          </div>
        ))
      }
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState('notes');
  const [refresh, setRefresh] = useState(0);
  const TABS = [{ id:'notes',label:'⏳ Approve Notes' },{ id:'company',label:'🏢 Add Company' },{ id:'aptitude',label:'🎯 Bulk Aptitude' },{ id:'users',label:'👥 Users' },{ id:'drives',label:'🗓️ Placement Drives' }];
  return (
    <div style={{ fontFamily:"'Nunito',sans-serif" }}>
      <div style={{ marginBottom:22 }}>
        <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.6rem', color:'#0f1a2e' }}>⚙️ Admin Panel</h1>
        <p style={{ color:'#7a8ba8', marginTop:4 }}>Manage notes, companies, aptitude questions, users, and placement drives.</p>
      </div>
      <div style={{ display:'flex', gap:6, marginBottom:20, borderBottom:'1px solid #e8edf5', flexWrap:'wrap' }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:'10px 18px', borderRadius:'10px 10px 0 0', border:'none', borderBottom:tab===t.id?'2px solid #531697':'2px solid transparent', background:tab===t.id?'rgba(83,22,151,0.06)':'transparent', color:tab===t.id?'#531697':'#7a8ba8', fontWeight:700, cursor:'pointer', fontSize:'.85rem', fontFamily:"'Nunito',sans-serif" }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab==='notes'    && <Section title="📋 Notes Awaiting Approval"><PendingNotes onRefresh={()=>setRefresh(r=>r+1)}/></Section>}
      {tab==='company'  && <Section title="🏢 Add Company Profile"><AddCompanyForm onAdded={()=>setRefresh(r=>r+1)}/></Section>}
      {tab==='aptitude' && <Section title="🎯 Bulk Upload Aptitude Questions"><BulkAptitudeUpload onAdded={()=>setRefresh(r=>r+1)}/></Section>}
      {tab==='users'    && <Section title="👥 All Users"><UsersTable/></Section>}
      {tab==='drives'   && <Section title="🗓️ Placement Drives"><ManageDrives onRefresh={()=>setRefresh(r=>r+1)}/></Section>}
    </div>
  );
}
