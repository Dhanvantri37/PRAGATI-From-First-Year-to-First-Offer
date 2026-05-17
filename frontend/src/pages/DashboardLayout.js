import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tk  = () => ({ Authorization: `Bearer ${localStorage.getItem('pragati_token')}` });

const NAV_STUDENT = [
  { to:'/dashboard',               icon:'🏠', label:'Dashboard' },
  { to:'/dashboard/notes',         icon:'📚', label:'Notes' },
  { to:'/dashboard/problems',      icon:'💻', label:'Daily Practice' },
  { to:'/dashboard/aptitude',      icon:'🎯', label:'Aptitude' },
  { to:'/dashboard/interview-prep',icon:'🏅', label:'Interview Prep' },
  { to:'/dashboard/companies',     icon:'🏢', label:'Companies' },
  { to:'/dashboard/drives',        icon:'🗓️', label:'Placement Drives' },
  { to:'/dashboard/skillpath',     icon:'🧠', label:'SkillPath AI' },
  { to:'/dashboard/gd',            icon:'🎤', label:'Group Discussion' },
  { to:'/dashboard/discussions',   icon:'💬', label:'Discussions' },
];
const NAV_FACULTY = [
  { to:'/dashboard',                  icon:'🏠', label:'Dashboard' },
  { to:'/dashboard/students',         icon:'👥', label:'Students' },
  { to:'/dashboard/leaderboard-view', icon:'🏆', label:'Leaderboard' },
  { to:'/dashboard/announcements',    icon:'📢', label:'Announcements' },
  { to:'/dashboard/drives',           icon:'🗓️', label:'Placement Drives' },
  { to:'/dashboard/companies',        icon:'🏢', label:'Companies' },
  { to:'/dashboard/notes',            icon:'📚', label:'Notes' },
  { to:'/dashboard/gd',               icon:'🎤', label:'Group Discussion' },
  { to:'/dashboard/discussions',      icon:'💬', label:'Discussions' },
];
const NAV_ADMIN = [
  { to:'/dashboard',          icon:'📊', label:'Overview' },
  { to:'/dashboard/admin',    icon:'⚙️', label:'Admin Panel' },
  { to:'/dashboard/notes',    icon:'📚', label:'Notes' },
  { to:'/dashboard/companies',icon:'🏢', label:'Companies' },
  { to:'/dashboard/drives',   icon:'🗓️', label:'Placement Drives' },
];

export default function DashboardLayout() {
  const notifRef = useRef(null);
  const { user, setUser, logout } = useAuth();
  const nav      = useNavigate();
  const location = useLocation();                                          // ✅ hook at top level

  // GD Room/Report pages need full-screen — no sidebar padding/maxWidth
  const isGDRoom = /\/dashboard\/gd\/.+/.test(location.pathname);         // ✅ derived from hook

  const [open, setOpen]             = useState(true);
  const [darkMode, setDarkMode]     = useState(() => localStorage.getItem('pragati_dark') === '1');
  const [showNotif, setShowNotif]   = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifList, setNotifList]   = useState([]);

  // Fetch announcements for bell icon
  React.useEffect(() => {
    const lastSeen = parseInt(localStorage.getItem('pragati_notif_seen') || '0');
    const base  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('pragati_token');
    Promise.all([
      fetch(`${base}/announcements`, { headers: { Authorization: `Bearer ${token}` } }).then(r=>r.json()).catch(()=>({announcements:[]})),
      fetch(`${base}/drives`,        { headers: { Authorization: `Bearer ${token}` } }).then(r=>r.json()).catch(()=>({drives:[]})),
    ]).then(([annData, driveData]) => {
      const anns   = annData.announcements || [];
      const drives = (driveData.drives || []).map(d => ({
        _id: d._id, title: `🗓️ Drive: ${d.companyName}`,
        message: `${d.role ? d.role + ' — ' : ''}${d.status === 'open' ? 'Applications Open!' : 'Upcoming drive'}`,
        createdAt: d.createdAt, priority: d.status === 'open' ? 'high' : 'normal',
      }));
      const all = [...anns, ...drives].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotifList(all);
      const unseen = all.filter(a => new Date(a.createdAt).getTime() > lastSeen);
      setNotifCount(unseen.length);
    });
  }, []);

  const [showEditProfile,   setShowEditProfile]   = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef();

  const navItems = user?.role === 'admin' ? NAV_ADMIN : user?.role === 'faculty' ? NAV_FACULTY : NAV_STUDENT;

  function handleLogout() { logout(); nav('/'); }

  function toggleDark() {
    setDarkMode(d => {
      const next = !d;
      localStorage.setItem('pragati_dark', next ? '1' : '0');
      return next;
    });
  }

  async function handleDeleteAccount() {
    try { await fetch(`${API}/users/profile`, { method:'DELETE', headers:tk() }); } catch {}
    localStorage.removeItem('pragati_token');
    localStorage.removeItem('pragati_refresh');
    window.location.href = '/login';
  }

  useEffect(() => {
    function handle(e) { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const roleColor = {
    student: 'linear-gradient(135deg,#531697,#13a1a5)',
    faculty: 'linear-gradient(135deg,#042c5d,#531697)',
    admin:   'linear-gradient(135deg,#13a1a5,#47d372)',
  };
  const roleLabel = { student:'Student', faculty:'Faculty', admin:'Administrator' };

  const dm         = darkMode;
  const pageBg     = dm ? '#0f1623' : '#f4f6fb';
  const sidebarBg  = dm ? '#161d2e' : '#fff';
  const sidebarBrd = dm ? '#1e2d42' : '#e8edf5';
  const headerBg   = dm ? '#161d2e' : '#fff';
  const headerBrd  = dm ? '#1e2d42' : '#e8edf5';
  const dropBg     = dm ? '#1a2235' : '#fff';
  const dropBrd    = dm ? '#2d3a52' : '#e8edf5';
  const txt        = dm ? '#e2e8f0' : '#0f1a2e';
  const sub        = dm ? '#94a3b8' : '#7a8ba8';
  const hover      = dm ? '#2d3748' : '#f8f9fc';
  const inpBg      = dm ? '#2d3748' : '#fafbff';
  const inpBrd     = dm ? '#334155' : '#d0d7e8';

  // ── Edit Profile Modal ────────────────────────────────────────────────────
  function EditProfileModal() {
    const [form, setForm] = useState({
      name: user?.name||'', department: user?.department||'', year: user?.year||'',
      rollNumber: user?.rollNumber||'', phone: user?.phone||'', bio: user?.bio||'',
      linkedinUrl: user?.linkedinUrl||'', githubUrl: user?.githubUrl||'', portfolioUrl: user?.portfolioUrl||'',
    });
    const [photoFile, setPhotoFile]     = useState(null);
    const [photoPreview, setPhotoPreview] = useState(user?.profilePhoto||null);
    const [loading, setLoading]         = useState(false);
    const [msg, setMsg]                 = useState('');
    const fileRef = useRef();

    const set = k => e => setForm(f=>({...f,[k]:e.target.value}));
    const INP = { style:{ width:'100%', padding:'9px 12px', borderRadius:8, border:`1.5px solid ${inpBrd}`, fontFamily:"'Nunito',sans-serif", fontSize:'.875rem', outline:'none', background:inpBg, color:txt, boxSizing:'border-box' } };
    const LBL = ({ children }) => <label style={{ display:'block', fontSize:'.73rem', fontWeight:700, color:sub, marginBottom:4, fontFamily:"'Syne',sans-serif" }}>{children}</label>;

    function handlePhoto(e) {
      const f = e.target.files[0]; if(!f) return;
      setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f));
    }

    async function save(e) {
      e.preventDefault(); setLoading(true); setMsg('');
      try {
        let profilePhoto;
        if (photoFile) {
          profilePhoto = await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(photoFile); });
        }
        const payload = { ...form, ...(profilePhoto?{profilePhoto}:{}) };
        const r = await fetch(`${API}/users/profile`, { method:'PUT', headers:{...tk(),'Content-Type':'application/json'}, body:JSON.stringify(payload) });
        const d = await r.json();
        if(!r.ok) throw new Error(d.error||'Failed');
        setMsg('✅ Profile updated!');
        if(setUser) setUser(d.user);
        setTimeout(()=>setShowEditProfile(false), 1200);
      } catch(err){ setMsg(`❌ ${err.message}`); }
      finally { setLoading(false); }
    }

    return (
      <div style={{ position:'fixed', inset:0, background:'rgba(4,44,93,0.6)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={()=>setShowEditProfile(false)}>
        <div style={{ background:dropBg, borderRadius:20, padding:'24px 28px', maxWidth:560, width:'100%', maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 80px rgba(4,44,93,0.3)' }} onClick={e=>e.stopPropagation()}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.1rem', color:txt }}>✏️ Edit Profile</div>
            <button onClick={()=>setShowEditProfile(false)} style={{ width:32, height:32, borderRadius:'50%', border:`1px solid ${inpBrd}`, background:inpBg, cursor:'pointer', fontWeight:800, color:sub, fontSize:'1rem' }}>×</button>
          </div>
          <div style={{ textAlign:'center', marginBottom:18 }}>
            <div style={{ position:'relative', display:'inline-block' }}>
              {photoPreview
                ? <img src={photoPreview} alt="av" style={{ width:80, height:80, borderRadius:'50%', objectFit:'cover', border:'3px solid #531697' }} />
                : <div style={{ width:80, height:80, borderRadius:'50%', background:'linear-gradient(135deg,#531697,#13a1a5)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'2rem', color:'#fff', fontWeight:800 }}>{user?.name?.[0]?.toUpperCase()||'U'}</div>
              }
              <button onClick={()=>fileRef.current?.click()} style={{ position:'absolute', bottom:-4, right:-4, width:26, height:26, borderRadius:'50%', border:'2px solid #fff', background:'#531697', color:'#fff', fontSize:'.75rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>📷</button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display:'none' }} />
            <div style={{ marginTop:7, fontSize:'.72rem', color:sub }}>Click 📷 to upload profile photo</div>
            <div style={{ marginTop:2, fontSize:'.7rem', color:sub }}>{user?.email}</div>
            <span style={{ padding:'2px 10px', borderRadius:999, background:'rgba(83,22,151,.1)', color:'#531697', fontSize:'.7rem', fontWeight:700 }}>{user?.role?.toUpperCase()}</span>
          </div>
          <form onSubmit={save}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div style={{ gridColumn:'1/-1' }}><LBL>Full Name</LBL><input {...INP} value={form.name} onChange={set('name')} placeholder="Your full name" /></div>
              <div><LBL>Department</LBL><select {...INP} value={form.department} onChange={set('department')}>{['CSE','CSAIML','IT','ECE','Mechanical','Civil','Other'].map(d=><option key={d}>{d}</option>)}</select></div>
              {user?.role==='student'&&<div><LBL>Year</LBL><select {...INP} value={form.year} onChange={set('year')}>{[1,2,3,4].map(y=><option key={y} value={y}>Year {y}</option>)}</select></div>}
              {user?.role==='student'&&<div><LBL>Roll Number</LBL><input {...INP} value={form.rollNumber} onChange={set('rollNumber')} placeholder="e.g. 22CS101" /></div>}
              <div><LBL>Phone</LBL><input {...INP} value={form.phone} onChange={set('phone')} placeholder="+91 XXXXXXXXXX" /></div>
              <div style={{ gridColumn:'1/-1' }}><LBL>Bio</LBL><textarea {...INP} style={{...INP.style,resize:'vertical',height:64}} value={form.bio} onChange={set('bio')} placeholder="A short bio…" /></div>
              <div style={{ gridColumn:'1/-1' }}><LBL>LinkedIn URL</LBL><input {...INP} type="url" value={form.linkedinUrl} onChange={set('linkedinUrl')} placeholder="https://linkedin.com/in/username" /></div>
              <div><LBL>GitHub URL</LBL><input {...INP} type="url" value={form.githubUrl} onChange={set('githubUrl')} placeholder="https://github.com/username" /></div>
              <div><LBL>Portfolio URL</LBL><input {...INP} type="url" value={form.portfolioUrl} onChange={set('portfolioUrl')} placeholder="https://yourportfolio.com" /></div>
            </div>
            {msg&&<div style={{ marginBottom:12, padding:'9px 14px', borderRadius:8, fontSize:'.83rem', fontWeight:600, background:msg.startsWith('✅')?'#dcfce7':'#fee2e2', color:msg.startsWith('✅')?'#166534':'#991b1b' }}>{msg}</div>}
            <button type="submit" disabled={loading} style={{ width:'100%', padding:'11px', borderRadius:10, border:'none', background:loading?'#d0d7e8':'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontWeight:800, fontSize:'.9rem', cursor:loading?'not-allowed':'pointer', fontFamily:"'Nunito',sans-serif" }}>
              {loading?'Saving…':'💾 Save Profile'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Delete Confirm Modal ──────────────────────────────────────────────────
  function DeleteModal() {
    const [confirmText, setConfirmText] = useState('');
    return (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={()=>setShowDeleteConfirm(false)}>
        <div style={{ background:dropBg, borderRadius:20, padding:'28px', maxWidth:420, width:'100%', boxShadow:'0 20px 80px rgba(0,0,0,0.4)' }} onClick={e=>e.stopPropagation()}>
          <div style={{ textAlign:'center', marginBottom:16 }}>
            <div style={{ fontSize:'3rem', marginBottom:8 }}>⚠️</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.2rem', color:'#ef4444' }}>Delete Account</div>
            <div style={{ fontSize:'.84rem', color:sub, marginTop:8, lineHeight:1.6 }}>This action is <strong style={{ color:txt }}>permanent</strong>. All your data, progress, and history will be erased. Type <strong style={{ color:'#ef4444' }}>DELETE</strong> to confirm.</div>
          </div>
          <input value={confirmText} onChange={e=>setConfirmText(e.target.value)} placeholder="Type DELETE to confirm"
            style={{ width:'100%', padding:'10px 14px', borderRadius:9, border:`1.5px solid ${inpBrd}`, fontFamily:"'Nunito',sans-serif", fontSize:'.9rem', outline:'none', background:inpBg, color:txt, boxSizing:'border-box', marginBottom:14, textAlign:'center' }} />
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={()=>setShowDeleteConfirm(false)} style={{ flex:1, padding:'11px', borderRadius:10, border:`1.5px solid ${inpBrd}`, background:'transparent', color:sub, fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif" }}>Cancel</button>
            <button onClick={()=>confirmText==='DELETE'&&handleDeleteAccount()} disabled={confirmText!=='DELETE'}
              style={{ flex:1, padding:'11px', borderRadius:10, border:'none', background:confirmText==='DELETE'?'#ef4444':'#d0d7e8', color:'#fff', fontWeight:800, cursor:confirmText==='DELETE'?'pointer':'not-allowed', fontFamily:"'Nunito',sans-serif" }}>
              🗑️ Delete Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:pageBg, fontFamily:"'Nunito',sans-serif" }}>
      <style>{`
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
        ${dm?`.card{background:#1a2235!important;border-color:#2d3a52!important;}body{background:#0f1623;color:#e2e8f0;}`:``}
      `}</style>

      {showEditProfile   && <EditProfileModal />}
      {showDeleteConfirm && <DeleteModal />}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside style={{
        width: open ? 256 : 64, transition:'width .22s cubic-bezier(.4,0,.2,1)',
        background:sidebarBg, borderRight:`1px solid ${sidebarBrd}`,
        display:'flex', flexDirection:'column',
        position:'sticky', top:0, height:'100vh',
        overflow:'hidden', flexShrink:0,
        boxShadow:'2px 0 12px rgba(4,44,93,0.06)',
      }}>
        <div style={{ padding:'16px 14px', borderBottom:`1px solid ${sidebarBrd}`, display:'flex', alignItems:'center', gap:10 }}>
          <img src="/logo.png" alt="PRAGATI" style={{ height:34, width:'auto', objectFit:'contain', flexShrink:0, maxWidth:120 }} />
          {open && (
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', background:'linear-gradient(135deg,#042c5d,#531697,#13a1a5)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', whiteSpace:'nowrap' }}>PRAGATI</div>
          )}
        </div>

        {open && user && (
          <div style={{ margin:'12px 12px 0', padding:'10px 12px', borderRadius:10, background:roleColor[user.role]||roleColor.student, color:'#fff' }}>
            <div style={{ fontSize:'.72rem', opacity:.8, fontWeight:700, letterSpacing:'.05em' }}>SIGNED IN AS</div>
            <div style={{ fontWeight:800, fontSize:'.82rem', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:170 }}>{user.name}</div>
            <div style={{ fontSize:'.72rem', opacity:.8 }}>{roleLabel[user.role]}</div>
          </div>
        )}

        <nav style={{ flex:1, padding:'12px 8px', overflowY:'auto' }}>
          {navItems.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to==='/dashboard'}
              style={({ isActive }) => ({
                display:'flex', alignItems:'center', gap:10,
                padding:'9px 12px', borderRadius:10, marginBottom:2,
                textDecoration:'none', fontWeight: isActive ? 700 : 600,
                fontSize:'.875rem', transition:'all .15s',
                background: isActive ? (dm?'rgba(83,22,151,0.2)':'linear-gradient(135deg,rgba(83,22,151,0.08),rgba(19,161,165,0.08))') : 'transparent',
                color: isActive ? '#531697' : (dm?'#94a3b8':'#3d4e6b'),
                borderLeft: isActive ? '3px solid #531697' : '3px solid transparent',
              })}>
              <span style={{ fontSize:'1rem', flexShrink:0 }}>{n.icon}</span>
              {open && n.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding:'10px 8px', borderTop:`1px solid ${sidebarBrd}` }}>
          <button onClick={handleLogout}
            style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10, border:'none', background:'transparent', cursor:'pointer', width:'100%', color:'#ef4444', fontSize:'.875rem', fontWeight:700, transition:'background .15s' }}
            onMouseOver={e=>e.currentTarget.style.background='rgba(239,68,68,0.1)'}
            onMouseOut={e=>e.currentTarget.style.background='transparent'}>
            <span style={{ flexShrink:0 }}>🚪</span>
            {open && 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>

        {/* Header — hidden on GD room so the call gets full screen */}
        {!isGDRoom && (
          <header style={{ height:58, background:headerBg, borderBottom:`1px solid ${headerBrd}`, display:'flex', alignItems:'center', padding:'0 24px', gap:12, position:'sticky', top:0, zIndex:10, boxShadow:'0 2px 8px rgba(4,44,93,0.05)', flexShrink:0 }}>
            <button onClick={()=>setOpen(o=>!o)} style={{ background:'none', border:'none', fontSize:'1.2rem', cursor:'pointer', color:dm?'#94a3b8':'#7a8ba8', padding:4, borderRadius:6 }}>☰</button>
            <div style={{ flex:1 }} />

            {/* Bell */}
            <div ref={notifRef} style={{ position:'relative' }}>
              <button onClick={()=>setShowNotif(n=>!n)}
                style={{ width:36, height:36, borderRadius:10, border:`1px solid ${headerBrd}`, background:dm?'rgba(255,255,255,0.06)':'rgba(4,44,93,0.04)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', position:'relative' }}
                title="Notifications">
                🔔
                {notifCount>0&&<span style={{ position:'absolute', top:-4, right:-4, width:18, height:18, borderRadius:'50%', background:'#ef4444', color:'#fff', fontSize:'.6rem', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid #fff' }}>{notifCount>9?'9+':notifCount}</span>}
              </button>
              {showNotif&&(
                <div style={{ position:'absolute', top:44, right:0, width:320, background:dm?'#1e2a3b':'#fff', border:`1px solid ${headerBrd}`, borderRadius:14, boxShadow:'0 8px 32px rgba(0,0,0,0.15)', zIndex:200, overflow:'hidden' }}>
                  <div style={{ padding:'12px 16px', borderBottom:`1px solid ${headerBrd}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontWeight:800, fontSize:'.88rem', color:dm?'#e2e8f0':'#0f1a2e', fontFamily:"'Syne',sans-serif" }}>🔔 Notifications</span>
                    <button onClick={()=>{ setNotifCount(0); localStorage.setItem('pragati_notif_seen', Date.now()); setShowNotif(false); }}
                      style={{ fontSize:'.65rem', color:'#531697', fontWeight:700, background:'none', border:'none', cursor:'pointer' }}>Mark all read</button>
                  </div>
                  <div style={{ maxHeight:300, overflowY:'auto' }}>
                    {notifList.length>0 ? notifList.map((a,i)=>(
                      <div key={i} style={{ padding:'10px 16px', borderBottom:`1px solid ${headerBrd}`, background:i===0&&notifCount>0?dm?'rgba(83,22,151,0.08)':'rgba(83,22,151,0.04)':'transparent' }}>
                        <div style={{ fontWeight:700, fontSize:'.8rem', color:dm?'#e2e8f0':'#0f1a2e', marginBottom:2 }}>{a.title}</div>
                        <div style={{ fontSize:'.73rem', color:dm?'#94a3b8':'#7a8ba8', lineHeight:1.5 }}>{a.message}</div>
                        <div style={{ fontSize:'.65rem', color:dm?'#64748b':'#b0bec9', marginTop:3 }}>{new Date(a.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                      </div>
                    )) : (
                      <div style={{ padding:'24px 16px', textAlign:'center', color:dm?'#64748b':'#b0bec9', fontSize:'.82rem' }}>No notifications yet</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Dark mode */}
            <button onClick={toggleDark} title={dm?'Light Mode':'Dark Mode'}
              style={{ background:dm?'rgba(255,255,255,0.08)':'rgba(4,44,93,0.06)', border:`1px solid ${headerBrd}`, borderRadius:8, padding:'5px 10px', cursor:'pointer', fontSize:'.85rem', display:'flex', alignItems:'center', gap:5 }}>
              <span>{dm?'☀️':'🌙'}</span>
              <span style={{ fontSize:'.72rem', fontWeight:700, color:dm?'#f8d76b':'#531697' }}>{dm?'Light':'Dark'}</span>
            </button>

            {/* Streak */}
            {user?.role === 'student' && (
              <div style={{ display:'flex', alignItems:'center', gap:6, background:'linear-gradient(135deg,rgba(245,158,11,0.1),rgba(71,211,114,0.1))', padding:'5px 14px', borderRadius:999, border:'1px solid rgba(245,158,11,0.2)' }}>
                <span style={{ animation:'pulse 1.5s ease-in-out infinite', display:'inline-block' }}>🔥</span>
                <span style={{ fontSize:'.82rem', fontWeight:800, color:'#d97706' }}>{user.streak || 0}</span>
                <span style={{ fontSize:'.72rem', color:'#92400e', fontWeight:600 }}>day streak</span>
              </div>
            )}

            {/* Profile dropdown */}
            <div ref={dropRef} style={{ position:'relative' }}>
              <button onClick={()=>setDropOpen(o=>!o)} style={{
                width:38, height:38, borderRadius:'50%',
                background: user?.profilePhoto?'transparent':(roleColor[user?.role]||roleColor.student),
                display:'flex', alignItems:'center', justifyContent:'center',
                border: dropOpen ? '2.5px solid #531697' : `2px solid ${headerBrd}`,
                cursor:'pointer', boxShadow:'0 2px 10px rgba(83,22,151,0.2)',
                overflow:'hidden', padding:0, transition:'border .15s',
              }}>
                {user?.profilePhoto
                  ? <img src={user.profilePhoto} alt="av" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : <span style={{ color:'#fff', fontWeight:800, fontSize:'.95rem' }}>{user?.name?.[0]?.toUpperCase()}</span>
                }
              </button>

              {dropOpen && (
                <div style={{ position:'absolute', top:'calc(100% + 10px)', right:0, width:248, background:dropBg, borderRadius:14, boxShadow:'0 8px 40px rgba(4,44,93,0.18)', border:`1px solid ${dropBrd}`, zIndex:1000, overflow:'hidden' }}>
                  <div style={{ padding:'13px 16px', borderBottom:`1px solid ${dropBrd}`, display:'flex', gap:10, alignItems:'center' }}>
                    <div style={{ width:40, height:40, borderRadius:'50%', background:roleColor[user?.role]||roleColor.student, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.95rem', color:'#fff', fontWeight:800, overflow:'hidden', flexShrink:0 }}>
                      {user?.profilePhoto ? <img src={user.profilePhoto} alt="av" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : user?.name?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontWeight:800, fontSize:'.85rem', color:txt, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.name}</div>
                      <div style={{ fontSize:'.68rem', color:sub, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.email}</div>
                      {user?.department && <div style={{ fontSize:'.65rem', color:sub }}>{user.department}{user.year?` · Year ${user.year}`:''}{user.rollNumber?` · ${user.rollNumber}`:''}</div>}
                    </div>
                  </div>

                  <button onClick={()=>{setShowEditProfile(true);setDropOpen(false);}}
                    style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', fontFamily:"'Nunito',sans-serif", transition:'background .12s' }}
                    onMouseOver={e=>e.currentTarget.style.background=hover} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                    <span style={{ fontSize:'1rem', width:22, textAlign:'center' }}>✏️</span>
                    <span style={{ fontSize:'.83rem', fontWeight:600, color:txt }}>Edit Profile</span>
                  </button>

                  <button onClick={()=>{setShowEditProfile(true);setDropOpen(false);}}
                    style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', fontFamily:"'Nunito',sans-serif", transition:'background .12s' }}
                    onMouseOver={e=>e.currentTarget.style.background=hover} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                    <span style={{ fontSize:'1rem', width:22, textAlign:'center' }}>📷</span>
                    <span style={{ fontSize:'.83rem', fontWeight:600, color:txt }}>Upload Photo</span>
                  </button>

                  <button onClick={toggleDark}
                    style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', fontFamily:"'Nunito',sans-serif", transition:'background .12s' }}
                    onMouseOver={e=>e.currentTarget.style.background=hover} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                    <span style={{ fontSize:'1rem', width:22, textAlign:'center' }}>{dm?'☀️':'🌙'}</span>
                    <span style={{ flex:1, fontSize:'.83rem', fontWeight:600, color:txt }}>{dm?'Light Mode':'Dark Mode'}</span>
                    <div style={{ width:34, height:18, borderRadius:999, background:dm?'#531697':'#d0d7e8', position:'relative', flexShrink:0 }}>
                      <div style={{ position:'absolute', top:2, left:dm?18:2, width:14, height:14, borderRadius:'50%', background:'#fff', transition:'left .2s' }} />
                    </div>
                  </button>

                  <div style={{ borderTop:`1px solid ${dropBrd}` }}>
                    <button onClick={()=>{setShowDeleteConfirm(true);setDropOpen(false);}}
                      style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', fontFamily:"'Nunito',sans-serif", transition:'background .12s' }}
                      onMouseOver={e=>e.currentTarget.style.background='rgba(239,68,68,0.07)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                      <span style={{ fontSize:'1rem', width:22, textAlign:'center' }}>🗑️</span>
                      <span style={{ fontSize:'.83rem', fontWeight:600, color:'#ef4444' }}>Delete Account</span>
                    </button>
                    <button onClick={handleLogout}
                      style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 16px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', fontFamily:"'Nunito',sans-serif", transition:'background .12s' }}
                      onMouseOver={e=>e.currentTarget.style.background='rgba(239,68,68,0.07)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                      <span style={{ fontSize:'1rem', width:22, textAlign:'center' }}>🚪</span>
                      <span style={{ fontSize:'.83rem', fontWeight:600, color:'#ef4444' }}>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </header>
        )}

        {/*
          ── Page content ─────────────────────────────────────────────────
          GD Room/Report: zero padding, full height, no maxWidth constraint
          Everything else: normal dashboard padding + maxWidth
        */}
        <main style={{
          flex: 1,
          ...(isGDRoom
            ? { padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }
            : { padding: '28px 28px', overflowY: 'auto', maxWidth: 1200, width: '100%' }
          ),
        }}>
          <Outlet context={{ darkMode: dm }} />
        </main>

      </div>
    </div>
  );
}