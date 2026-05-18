import React, { useState, useEffect, useCallback } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tk  = () => ({ Authorization: `Bearer ${localStorage.getItem('pragati_token')}` });
const tks = () => ({ ...tk(), 'Content-Type': 'application/json' });
const apiFetch = p => fetch(`${API}${p}`,{headers:tk()}).then(r=>r.json()).catch(()=>null);
const GRAD = 'linear-gradient(135deg,#531697,#13a1a5)';

const PRIORITY_STYLES = {
  high:   { bg:'rgba(239,68,68,0.08)',   color:'#dc2626', border:'rgba(239,68,68,0.2)',   label:'🚨 High'   },
  normal: { bg:'rgba(83,22,151,0.07)',   color:'#531697', border:'rgba(83,22,151,0.2)',   label:'📢 Normal' },
  low:    { bg:'rgba(107,114,128,0.06)', color:'#6b7280', border:'rgba(107,114,128,0.2)', label:'💬 Low'    },
};

export default function FacultyAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [msg, setMsg]           = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', message: '', priority: 'normal', targetYear: 'all', targetDept: 'all',
  });

  const load = useCallback(async () => {
    setLoading(true);
    const d = await apiFetch('/announcements?limit=50');
    setAnnouncements(d?.announcements || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function send(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) { setMsg('❌ Title and message are required.'); return; }
    setSending(true);
    try {
      const res = await fetch(`${API}/announcements`, {
        method:'POST', headers: tks(),
        body: JSON.stringify({
          title: form.title,
          message: form.message,
          priority: form.priority,
          targetFilter: {
            year: form.targetYear === 'all' ? undefined : Number(form.targetYear),
            department: form.targetDept === 'all' ? undefined : form.targetDept,
          },
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to send');
      setMsg('✅ Announcement sent successfully!');
      setForm({ title:'', message:'', priority:'normal', targetYear:'all', targetDept:'all' });
      setShowForm(false);
      load();
    } catch(err) { setMsg(`❌ ${err.message}`); }
    setSending(false);
    setTimeout(() => setMsg(''), 4000);
  }

  async function deleteAnn(id) {
    if (!window.confirm('Delete this announcement?')) return;
    await fetch(`${API}/announcements/${id}`, { method:'DELETE', headers:tk() });
    setAnnouncements(a => a.filter(x => x._id !== id));
  }

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif" }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.5rem', color:'#0f1a2e', margin:0 }}>📢 Announcements</h1>
          <p style={{ color:'#7a8ba8', marginTop:4, fontSize:'.85rem' }}>Create and manage announcements visible to all students</p>
        </div>
        <button onClick={()=>setShowForm(s=>!s)}
          style={{ padding:'10px 20px', borderRadius:10, border:'none', background:showForm?'#f0f3fa':GRAD, color:showForm?'#531697':'#fff', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.85rem' }}>
          {showForm ? '✕ Cancel' : '+ New Announcement'}
        </button>
      </div>

      {/* Status message */}
      {msg && (
        <div style={{ padding:'10px 16px', borderRadius:9, background:msg.startsWith('✅')?'rgba(71,211,114,0.1)':'rgba(239,68,68,0.1)', border:`1px solid ${msg.startsWith('✅')?'rgba(71,211,114,0.3)':'rgba(239,68,68,0.3)'}`, color:msg.startsWith('✅')?'#166534':'#991b1b', fontWeight:700, fontSize:'.85rem', marginBottom:16 }}>
          {msg}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div style={{ background:'#fff', borderRadius:16, border:'1.5px solid rgba(83,22,151,0.2)', padding:'22px 24px', marginBottom:22, boxShadow:'0 4px 20px rgba(83,22,151,0.1)' }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1rem', color:'#0f1a2e', marginBottom:18 }}>📝 Create Announcement</div>
          <form onSubmit={send}>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:'.72rem', fontWeight:800, color:'#7a8ba8', marginBottom:5, fontFamily:"'Syne',sans-serif" }}>TITLE *</label>
              <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} required
                placeholder="e.g. TCS Drive Registration Open — Last date: 15 May"
                style={{ width:'100%', padding:'10px 14px', borderRadius:9, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.88rem', outline:'none', boxSizing:'border-box' }}
                onFocus={e=>e.target.style.borderColor='#531697'} onBlur={e=>e.target.style.borderColor='#d0d7e8'}/>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:'.72rem', fontWeight:800, color:'#7a8ba8', marginBottom:5, fontFamily:"'Syne',sans-serif" }}>MESSAGE *</label>
              <textarea value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} required rows={4}
                placeholder="Write the full announcement message here…"
                style={{ width:'100%', padding:'10px 14px', borderRadius:9, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.88rem', resize:'vertical', outline:'none', boxSizing:'border-box' }}
                onFocus={e=>e.target.style.borderColor='#531697'} onBlur={e=>e.target.style.borderColor='#d0d7e8'}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:18 }}>
              {[
                { label:'PRIORITY', key:'priority', opts:[['normal','Normal'],['high','High'],['low','Low']] },
                { label:'TARGET YEAR', key:'targetYear', opts:[['all','All Years'],['1','Year 1'],['2','Year 2'],['3','Year 3'],['4','Year 4']] },
                { label:'TARGET BRANCH', key:'targetDept', opts:[['all','All Branches'],['CSE','CSE'],['IT','IT'],['ECE','ECE'],['MECH','MECH'],['CIVIL','CIVIL']] },
              ].map(({ label, key, opts }) => (
                <div key={key}>
                  <label style={{ display:'block', fontSize:'.72rem', fontWeight:800, color:'#7a8ba8', marginBottom:5, fontFamily:"'Syne',sans-serif" }}>{label}</label>
                  <select value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
                    style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.85rem', background:'#fff', color:'#3d4e6b', boxSizing:'border-box' }}>
                    {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <button type="submit" disabled={sending}
                style={{ padding:'10px 24px', borderRadius:10, border:'none', background:sending?'#d0d7e8':GRAD, color:'#fff', fontWeight:800, cursor:sending?'default':'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.88rem' }}>
                {sending ? '📤 Sending…' : '📢 Send Announcement'}
              </button>
              <span style={{ fontSize:'.72rem', color:'#b0bec9' }}>Students will see this immediately in their dashboard</span>
            </div>
          </form>
        </div>
      )}

      {/* Announcements list */}
      {loading ? (
        <div style={{ textAlign:'center', padding:40 }}>
          <div style={{ width:36, height:36, border:'3px solid #e8edf5', borderTopColor:'#531697', borderRadius:'50%', animation:'_sp .7s linear infinite', margin:'0 auto 10px' }}/>
          <style>{`@keyframes _sp{to{transform:rotate(360deg)}}`}</style>
          <div style={{ color:'#b0bec9' }}>Loading announcements…</div>
        </div>
      ) : announcements.length === 0 ? (
        <div style={{ textAlign:'center', padding:'50px 20px', background:'#fff', borderRadius:14, border:'1px solid #e8edf5' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:10 }}>📢</div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1rem', color:'#0f1a2e', marginBottom:4 }}>No announcements yet</div>
          <div style={{ color:'#7a8ba8', fontSize:'.83rem' }}>Click "+ New Announcement" to create your first announcement</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {announcements.map(ann => {
            const ps = PRIORITY_STYLES[ann.priority] || PRIORITY_STYLES.normal;
            const date = new Date(ann.createdAt);
            const timeAgo = (() => {
              const diff = (Date.now() - date.getTime()) / 1000;
              if (diff < 60) return 'just now';
              if (diff < 3600) return `${Math.floor(diff/60)} min ago`;
              if (diff < 86400) return `${Math.floor(diff/3600)} hr ago`;
              return date.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
            })();
            return (
              <div key={ann._id} style={{ background:'#fff', borderRadius:14, border:`1.5px solid ${ps.border}`, padding:'16px 20px', boxShadow:'0 2px 8px rgba(4,44,93,0.05)' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:6 }}>
                      <span style={{ padding:'2px 8px', borderRadius:999, background:ps.bg, color:ps.color, fontSize:'.65rem', fontWeight:800, border:`1px solid ${ps.border}` }}>{ps.label}</span>
                      {ann.targetFilter?.year && <span style={{ padding:'2px 7px', borderRadius:999, background:'rgba(83,22,151,0.07)', color:'#531697', fontSize:'.65rem', fontWeight:700 }}>Year {ann.targetFilter.year}</span>}
                      {ann.targetFilter?.department && <span style={{ padding:'2px 7px', borderRadius:999, background:'rgba(19,161,165,0.07)', color:'#0d7a7e', fontSize:'.65rem', fontWeight:700 }}>{ann.targetFilter.department}</span>}
                    </div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', color:'#0f1a2e', marginBottom:6 }}>{ann.title}</div>
                    <div style={{ fontSize:'.82rem', color:'#3d4e6b', lineHeight:1.7, marginBottom:8 }}>{ann.message}</div>
                    <div style={{ fontSize:'.68rem', color:'#b0bec9' }}>
                      By {ann.createdBy?.name || 'Faculty'} · {timeAgo}
                    </div>
                  </div>
                  <button onClick={()=>deleteAnn(ann._id)}
                    style={{ padding:'6px 12px', borderRadius:8, border:'1px solid rgba(239,68,68,0.2)', background:'rgba(239,68,68,0.05)', color:'#dc2626', fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.72rem', flexShrink:0 }}>
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
