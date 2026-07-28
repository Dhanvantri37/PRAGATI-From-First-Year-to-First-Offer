import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function AnnouncementModal({ ann, onClose }) {
  if (!ann) return null;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99999, padding:20 }}>
      <div style={{ background:'var(--surface)', width:'100%', maxWidth:600, borderRadius:16, overflow:'hidden', boxShadow:'0 10px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:'1.4rem' }}>📢</span>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.2rem', color:'var(--text)' }}>{ann.title}</div>
          </div>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:'var(--text-3)', cursor:'pointer', fontSize:'1.2rem' }}>✕</button>
        </div>
        <div style={{ padding:'24px', maxHeight:'60vh', overflowY:'auto', fontSize:'.9rem', color:'var(--text-2)', lineHeight:1.6 }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({node, ...props}) => <a {...props} target="_blank" rel="noreferrer" style={{color:'#531697', textDecoration:'underline'}}/> }}>
            {ann.message}
          </ReactMarkdown>
          {ann.link && (
            <div style={{ marginTop:24 }}>
              <a href={ann.link.startsWith('http') ? ann.link : `https://${ann.link}`} target="_blank" rel="noreferrer" style={{ display:'inline-block', padding:'10px 18px', background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', borderRadius:8, fontWeight:700, textDecoration:'none', boxShadow:'0 4px 12px rgba(83,22,151,0.2)' }}>
                🔗 External Link →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AllAnnouncementsModal({ announcements, onClose, onView }) {
  if (!announcements) return null;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99998, padding:20 }}>
      <div style={{ background:'var(--surface)', width:'100%', maxWidth:700, borderRadius:16, overflow:'hidden', boxShadow:'0 10px 40px rgba(0,0,0,0.2)', display:'flex', flexDirection:'column', maxHeight:'85vh' }}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.2rem', color:'var(--text)' }}>📢 All Announcements</div>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:'var(--text-3)', cursor:'pointer', fontSize:'1.2rem' }}>✕</button>
        </div>
        <div style={{ padding:'20px', overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:10 }}>
          {announcements.map(a => {
            const pc = { urgent:'#ef4444', high:'#f59e0b', normal:'#531697' };
            const col = pc[a.priority] || pc.normal;
            return (
              <div key={a._id} onClick={() => onView(a)} style={{ padding:'14px 18px', borderRadius:10, border:`1px solid ${col}20`, background:`${col}06`, cursor:'pointer', transition:'transform 0.1s' }} onMouseOver={e=>e.currentTarget.style.transform='translateY(-2px)'} onMouseOut={e=>e.currentTarget.style.transform='none'}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  {a.priority === 'urgent' && <span style={{ width:10, height:10, borderRadius:'50%', background:'#ef4444', flexShrink:0 }}/>}
                  {a.priority === 'high' && <span style={{ width:10, height:10, borderRadius:'50%', background:'#f59e0b', flexShrink:0 }}/>}
                  <span style={{ fontWeight:800, fontSize:'1rem', color:'var(--text)', flex:1 }}>{a.title}</span>
                  {a.priority !== 'normal' && (
                    <span style={{ padding:'2px 8px', borderRadius:999, background:`${col}20`, color:col, fontSize:'.65rem', fontWeight:800 }}>{a.priority.toUpperCase()}</span>
                  )}
                </div>
                <div style={{ fontSize:'.82rem', color:'var(--text-3)', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{a.message}</div>
                <div style={{ fontSize:'.7rem', color:'#b0bec9', marginTop:10 }}>
                  {a.createdBy?.name && `By ${a.createdBy.name} · `}{new Date(a.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                </div>
              </div>
            );
          })}
          {announcements.length === 0 && <div style={{ textAlign:'center', color:'var(--text-3)', padding:40 }}>No announcements found.</div>}
        </div>
      </div>
    </div>
  );
}

export function DriveModal({ drive, onClose }) {
  if (!drive) return null;
  const isCompany = !drive.companyName; // if it's from companies array
  const name = isCompany ? drive.name : drive.companyName;
  const date = isCompany ? drive.campusVisitDate : drive.driveDate;
  const role = isCompany ? (drive.roles?.[0] || 'Multiple Roles') : drive.role;
  const desc = isCompany ? (drive.jdText || drive.prepTips) : drive.description;
  const link = isCompany ? drive.website : drive.applyLink;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99999, padding:20 }}>
      <div style={{ background:'var(--surface)', width:'100%', maxWidth:600, borderRadius:16, overflow:'hidden', boxShadow:'0 10px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {drive.logoUrl ? (
              <img src={drive.logoUrl} alt={name} style={{ width:32, height:32, objectFit:'contain', borderRadius:6, background:'var(--surface)' }} onError={e=>e.target.style.display='none'}/>
            ) : (
              <span style={{ fontSize:'1.4rem' }}>🏢</span>
            )}
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.2rem', color:'var(--text)' }}>{name}</div>
          </div>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:'var(--text-3)', cursor:'pointer', fontSize:'1.2rem' }}>✕</button>
        </div>
        <div style={{ padding:'24px', maxHeight:'60vh', overflowY:'auto', fontSize:'.9rem', color:'var(--text-2)', lineHeight:1.6 }}>
          {role && <div style={{ fontWeight:700, marginBottom:10 }}>Role: <span style={{ fontWeight:500 }}>{role}</span></div>}
          {date && <div style={{ fontWeight:700, marginBottom:10 }}>Date: <span style={{ fontWeight:500 }}>{new Date(date).toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'})}</span></div>}
          {drive.ctc && <div style={{ fontWeight:700, marginBottom:10 }}>CTC: <span style={{ fontWeight:500 }}>{drive.ctc}</span></div>}
          
          {desc && (
            <div style={{ marginTop:14 }}>
              <div style={{ fontWeight:700, marginBottom:6 }}>Details:</div>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({node, ...props}) => <a {...props} target="_blank" rel="noreferrer" style={{color:'#531697', textDecoration:'underline'}}/> }}>
                {desc}
              </ReactMarkdown>
            </div>
          )}
          {link && (
            <div style={{ marginTop:24 }}>
              <a href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noreferrer" style={{ display:'inline-block', padding:'10px 18px', background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', borderRadius:8, fontWeight:700, textDecoration:'none', boxShadow:'0 4px 12px rgba(83,22,151,0.2)' }}>
                🔗 Apply / View Details →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DailyOpportunitiesDigestModal({ user, drives = [], onClose }) {
  if (!drives || drives.length === 0) return null;
  const userDept = (user?.department || 'CSE').toUpperCase();
  const topDrives = drives.slice(0, 4);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:99999, padding:20 }}>
      <div style={{ background:'var(--surface)', width:'100%', maxWidth:640, borderRadius:20, overflow:'hidden', boxShadow:'0 20px 60px rgba(83,22,151,0.3)', border:'2px solid rgba(83,22,151,0.2)' }}>
        <div style={{ padding:'22px 26px', background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:'1.25rem', display:'flex', alignItems:'center', gap:8 }}>
              <span>🎯</span> Daily Opportunities Digest
            </div>
            <div style={{ fontSize:'.78rem', opacity:0.9, marginTop:4 }}>
              Tailored for {user?.name ? `${user.name} (${userDept})` : `${userDept} Students`} · {new Date().toLocaleDateString('en-IN', { weekday:'short', month:'short', day:'numeric' })}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.2)', border:'none', color:'#fff', width:36, height:36, borderRadius:'50%', cursor:'pointer', fontWeight:800, fontSize:'1.1rem' }}>✕</button>
        </div>

        <div style={{ padding:'24px', maxHeight:'65vh', overflowY:'auto' }}>
          <div style={{ fontSize:'.85rem', color:'var(--text-2)', marginBottom:16, fontWeight:700 }}>
            🔥 We matched {drives.length} verified internships & placement drives for your branch today! Here are top picks:
          </div>

          <div style={{ display:'grid', gap:12 }}>
            {topDrives.map(d => (
              <div key={d._id} style={{ background:'var(--surface-2)', borderRadius:12, padding:'14px 18px', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:14 }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:'.92rem', color:'var(--text)', fontFamily:"'Syne',sans-serif" }}>{d.companyName}</div>
                  <div style={{ fontSize:'.78rem', color:'#531697', fontWeight:700 }}>{d.role || 'Software Engineering Role'}</div>
                  <div style={{ fontSize:'.72rem', color:'var(--text-3)', marginTop:2 }}>
                    📍 {d.location || 'India & Remote'} · {d.opportunityType === 'internship' ? '🎓 Internship' : '💼 Full-Time'}
                  </div>
                </div>
                <a href={d.applyLink && d.applyLink.startsWith('http') ? d.applyLink : '/dashboard/drives'} target="_blank" rel="noreferrer"
                  onClick={onClose}
                  style={{ padding:'8px 16px', borderRadius:9, background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontWeight:800, textDecoration:'none', fontSize:'.78rem', whiteSpace:'nowrap', boxShadow:'0 4px 12px rgba(83,22,151,0.2)' }}>
                  Apply Now →
                </a>
              </div>
            ))}
          </div>

          <div style={{ marginTop:20, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:'.78rem', color:'var(--text-3)' }}>Never miss a deadline — check Placement Drives daily!</span>
            <a href="/dashboard/drives" onClick={onClose} style={{ padding:'10px 20px', borderRadius:10, background:'#531697', color:'#fff', fontWeight:800, textDecoration:'none', fontSize:'.82rem' }}>
              View All {drives.length} Drives →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
