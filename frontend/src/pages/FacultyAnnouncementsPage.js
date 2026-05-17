import React, { useState, useEffect } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tk  = () => ({ Authorization: `Bearer ${localStorage.getItem('pragati_token')}` });
const tks = () => ({ ...tk(), 'Content-Type': 'application/json' });

const PRIORITY_STYLE = {
  urgent: { bg:'rgba(239,68,68,0.08)',  color:'#991b1b', border:'rgba(239,68,68,0.2)',  label:'🔴 Urgent' },
  high:   { bg:'rgba(245,158,11,0.08)', color:'#92400e', border:'rgba(245,158,11,0.2)', label:'🟡 High' },
  normal: { bg:'rgba(83,22,151,0.05)',  color:'#531697', border:'rgba(83,22,151,0.15)', label:'🔵 Normal' },
};

export default function FacultyAnnouncementsPage() {
  const [announcements, setAnn] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [msg, setMsg]           = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title:'', message:'', link:'', priority:'normal',
    targetRole:'all', targetDept:'', targetYear:''
  });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const d = await fetch(`${API}/announcements`, { headers: tk() }).then(r=>r.json()).catch(()=>({}));
    setAnn(d.announcements || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function post(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) { setMsg('❌ Title and message are required'); return; }
    setSubmitting(true); setMsg('');
    try {
      const target = {};
      if (form.targetRole && form.targetRole !== 'all') target.role = form.targetRole;
      if (form.targetDept) target.department = form.targetDept;
      if (form.targetYear) target.year = Number(form.targetYear);
      const res = await fetch(`${API}/announcements`, {
        method:'POST', headers:tks(),
        body: JSON.stringify({ title:form.title, message:form.message, link:form.link, priority:form.priority, targetFilter:target })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed');
      setMsg('✅ Announcement posted successfully!');
      setForm({ title:'', message:'', link:'', priority:'normal', targetRole:'all', targetDept:'', targetYear:'' });
      setShowForm(false);
      load();
      setTimeout(() => setMsg(''), 4000);
    } catch(err) { setMsg(`❌ ${err.message}`); }
    finally { setSubmitting(false); }
  }

  async function deleteAnn(id) {
    if (!window.confirm('Delete this announcement?')) return;
    await fetch(`${API}/announcements/${id}`, { method:'DELETE', headers:tk() });
    load();
  }

  const inp = { padding:'9px 12px', borderRadius:8, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.85rem', outline:'none', width:'100%', boxSizing:'border-box' };

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif" }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.4rem', color:'#0f1a2e', margin:0 }}>📢 Announcements</h1>
          <p style={{ color:'#7a8ba8', marginTop:4, fontSize:'.82rem' }}>{announcements.length} announcements posted</p>
        </div>
        <button onClick={() => setShowForm(s=>!s)}
          style={{ padding:'10px 20px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.85rem' }}>
          {showForm ? '✕ Cancel' : '+ New Announcement'}
        </button>
      </div>

      {msg && (
        <div style={{ padding:'10px 16px', borderRadius:10, background:msg.startsWith('✅')?'rgba(71,211,114,0.08)':'rgba(239,68,68,0.08)', border:`1px solid ${msg.startsWith('✅')?'rgba(71,211,114,0.25)':'rgba(239,68,68,0.25)'}`, color:msg.startsWith('✅')?'#166534':'#991b1b', fontWeight:700, fontSize:'.82rem', marginBottom:16 }}>
          {msg}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div style={{ background:'#fff', borderRadius:14, border:'1.5px solid rgba(83,22,151,0.2)', padding:'20px 22px', marginBottom:20, boxShadow:'0 4px 20px rgba(83,22,151,0.08)' }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1rem', color:'#0f1a2e', marginBottom:16 }}>📝 New Announcement</div>
          <form onSubmit={post}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={{ display:'block', fontSize:'.7rem', fontWeight:800, color:'#7a8ba8', marginBottom:4 }}>TITLE *</label>
                <input style={inp} value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Announcement title…" required/>
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={{ display:'block', fontSize:'.7rem', fontWeight:800, color:'#7a8ba8', marginBottom:4 }}>MESSAGE *</label>
                <textarea style={{ ...inp, resize:'vertical' }} rows={4} value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} placeholder="Announcement message…" required/>
              </div>
              <div>
                <label style={{ display:'block', fontSize:'.7rem', fontWeight:800, color:'#7a8ba8', marginBottom:4 }}>PRIORITY</label>
                <select style={inp} value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label style={{ display:'block', fontSize:'.7rem', fontWeight:800, color:'#7a8ba8', marginBottom:4 }}>TARGET AUDIENCE</label>
                <select style={inp} value={form.targetRole} onChange={e=>setForm(f=>({...f,targetRole:e.target.value}))}>
                  <option value="all">All Students</option>
                  <option value="student">Students Only</option>
                  <option value="faculty">Faculty Only</option>
                </select>
              </div>
              <div>
                <label style={{ display:'block', fontSize:'.7rem', fontWeight:800, color:'#7a8ba8', marginBottom:4 }}>DEPARTMENT (optional)</label>
                <input style={inp} value={form.targetDept} onChange={e=>setForm(f=>({...f,targetDept:e.target.value}))} placeholder="e.g. CSE, IT, ENTC"/>
              </div>
              <div>
                <label style={{ display:'block', fontSize:'.7rem', fontWeight:800, color:'#7a8ba8', marginBottom:4 }}>YEAR (optional)</label>
                <select style={inp} value={form.targetYear} onChange={e=>setForm(f=>({...f,targetYear:e.target.value}))}>
                  <option value="">All Years</option>
                  <option value="1">Year 1</option>
                  <option value="2">Year 2</option>
                  <option value="3">Year 3</option>
                  <option value="4">Year 4</option>
                </select>
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={{ display:'block', fontSize:'.7rem', fontWeight:800, color:'#7a8ba8', marginBottom:4 }}>LINK (optional)</label>
                <input type="url" style={inp} value={form.link} onChange={e=>setForm(f=>({...f,link:e.target.value}))} placeholder="https://…"/>
              </div>
            </div>
            <button type="submit" disabled={submitting}
              style={{ padding:'10px 24px', borderRadius:10, border:'none', background:submitting?'#d0d7e8':'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontWeight:800, cursor:submitting?'default':'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.88rem' }}>
              {submitting ? 'Posting…' : '📢 Post Announcement'}
            </button>
          </form>
        </div>
      )}

      {/* Announcements list */}
      {loading ? (
        <div style={{ textAlign:'center', padding:48 }}>
          <div style={{ width:36, height:36, border:'3px solid #e8edf5', borderTopColor:'#531697', borderRadius:'50%', animation:'_sp .7s linear infinite', margin:'0 auto' }}/>
          <style>{`@keyframes _sp{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : announcements.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px', background:'#fff', borderRadius:14, border:'1px solid #e8edf5' }}>
          <div style={{ fontSize:'3rem', marginBottom:12 }}>📢</div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, color:'#0f1a2e', marginBottom:6 }}>No announcements yet</div>
          <div style={{ color:'#7a8ba8', fontSize:'.82rem' }}>Click "+ New Announcement" to post your first announcement</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {announcements.map(ann => {
            const ps = PRIORITY_STYLE[ann.priority] || PRIORITY_STYLE.normal;
            const date = ann.createdAt ? new Date(ann.createdAt) : null;
            return (
              <div key={ann._id} style={{ background:'#fff', borderRadius:14, border:`1px solid ${ps.border}`, padding:'16px 18px', boxShadow:'0 2px 8px rgba(4,44,93,0.04)' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:6 }}>
                      <span style={{ padding:'2px 8px', borderRadius:999, background:ps.bg, color:ps.color, fontSize:'.62rem', fontWeight:800, border:`1px solid ${ps.border}` }}>{ps.label}</span>
                      {ann.targetFilter?.department && <span style={{ padding:'2px 8px', borderRadius:999, background:'#f0f3fa', color:'#531697', fontSize:'.62rem', fontWeight:700 }}>🏛️ {ann.targetFilter.department}</span>}
                      {ann.targetFilter?.year && <span style={{ padding:'2px 8px', borderRadius:999, background:'#f0f3fa', color:'#13a1a5', fontSize:'.62rem', fontWeight:700 }}>Year {ann.targetFilter.year}</span>}
                      {date && <span style={{ fontSize:'.62rem', color:'#b0bec9' }}>{date.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>}
                    </div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', color:'#0f1a2e', marginBottom:6 }}>{ann.title}</div>
                    <div style={{ fontSize:'.82rem', color:'#3d4e6b', lineHeight:1.7 }}>{ann.message}</div>
                    {ann.link && (
                      <a href={ann.link} target="_blank" rel="noreferrer"
                        style={{ display:'inline-block', marginTop:8, padding:'4px 10px', borderRadius:7, background:'rgba(83,22,151,0.07)', color:'#531697', fontSize:'.72rem', fontWeight:700, textDecoration:'none' }}>
                        🔗 View Link
                      </a>
                    )}
                    {ann.createdBy?.name && <div style={{ fontSize:'.65rem', color:'#b0bec9', marginTop:8 }}>Posted by {ann.createdBy.name}</div>}
                  </div>
                  <button onClick={() => deleteAnn(ann._id)}
                    style={{ padding:'6px 10px', borderRadius:8, border:'1px solid rgba(239,68,68,0.2)', background:'rgba(239,68,68,0.04)', color:'#991b1b', fontWeight:700, cursor:'pointer', fontSize:'.72rem', fontFamily:"'Nunito',sans-serif", flexShrink:0 }}>
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
