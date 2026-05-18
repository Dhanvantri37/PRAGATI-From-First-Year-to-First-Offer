import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tk  = () => ({ Authorization:`Bearer ${localStorage.getItem('pragati_token')}`, 'Content-Type':'application/json' });

/* ── AI Chat Tab ──────────────────────────────────────────────────── */
function AIChat() {
  const { user } = useAuth();
  const isFaculty = user?.role === 'faculty';
  const defaultMsg = isFaculty
    ? `Hello, ${user?.name?.split(' ')[0]||'Professor'}! 👋 I'm your PRAGATI AI assistant. I can help you generate quiz questions, create announcements, explain complex concepts for your students, analyze placement trends, or suggest teaching strategies!`
    : `Hi ${user?.name?.split(' ')[0]||'there'}! 👋 I'm your PRAGATI AI assistant. Ask me anything about placement prep, DSA, company patterns, aptitude, or career advice!`;

  const [msgs, setMsgs]   = useState([{ role:'ai', text: defaultMsg }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);

  async function send() {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput('');
    setMsgs(m => [...m, { role:'user', text:userMsg }]);
    setLoading(true);
    try {
      const res = await fetch(`${API}/skillpath/ai-chat`, {
        method:'POST',
        headers:{ Authorization:`Bearer ${localStorage.getItem('pragati_token')}`, 'Content-Type':'application/json' },
        body:JSON.stringify({ message:userMsg, userName:user?.name, targetRole: isFaculty ? 'Faculty' : (user?.targetRole||'Software Engineer') })
      });
      const d = await res.json();
      setMsgs(m => [...m, { role:'ai', text:d.reply||'Sorry, I could not process that. Try again!' }]);
    } catch(e) {
      setMsgs(m => [...m, { role:'ai', text:'I had a brief hiccup connecting. Please try asking again — if the issue persists, the backend may be restarting.' }]);
    } finally { setLoading(false); }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:500 }}>
      <div style={{ flex:1, overflowY:'auto', padding:'8px 0', display:'flex', flexDirection:'column', gap:10 }}>
        {msgs.map((m,i) => (
          <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start' }}>
            {m.role==='ai' && <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#531697,#13a1a5)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.85rem', flexShrink:0, marginRight:8, alignSelf:'flex-end' }}>🤖</div>}
            <div style={{ maxWidth:'75%', padding:'12px 16px', borderRadius: m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px',
              background: m.role==='user'?'linear-gradient(135deg,#531697,#13a1a5)':'#f8f9fc',
              color: m.role==='user'?'#fff':'#0f1a2e',
              border: m.role==='ai'?'1px solid #e8edf5':'none',
              fontSize:'.85rem', lineHeight:1.6, whiteSpace:'pre-wrap' }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display:'flex', justifyContent:'flex-start', gap:8 }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#531697,#13a1a5)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.85rem' }}>🤖</div>
            <div style={{ padding:'12px 16px', borderRadius:'16px 16px 16px 4px', background:'#f8f9fc', border:'1px solid #e8edf5' }}>
              <div style={{ display:'flex', gap:4 }}>
                {[0,1,2].map(i => <div key={i} style={{ width:7, height:7, borderRadius:'50%', background:'#531697', animation:`_dot .9s ${i*0.2}s ease-in-out infinite` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div style={{ paddingTop:12, borderTop:'1px solid #e8edf5', display:'flex', gap:8 }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()}
          placeholder={isFaculty ? "Ask me to generate questions, explain concepts, draft announcements…" : "Ask anything — DSA, aptitude, company prep, career advice…"}
          style={{ flex:1, padding:'10px 14px', borderRadius:10, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.875rem', outline:'none' }} />
        <button onClick={send} disabled={!input.trim()||loading}
          style={{ padding:'10px 18px', borderRadius:10, border:'none', background:input.trim()&&!loading?'linear-gradient(135deg,#531697,#13a1a5)':'#d0d7e8', color:'#fff', fontWeight:800, cursor:input.trim()&&!loading?'pointer':'not-allowed', fontFamily:"'Nunito',sans-serif" }}>
          Send
        </button>
      </div>
      <style>{`@keyframes _dot{0%,80%,100%{transform:scale(.7);opacity:.5}40%{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

/* ── Faculty Inbox — faculty sees messages from students ──────────── */
function FacultyInbox() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected]   = useState(null); // { studentId, studentName, studentDept }
  const [msgs, setMsgs]           = useState([]);
  const [input, setInput]         = useState('');
  const [sending, setSending]     = useState(false);
  const [loading, setLoading]     = useState(true);
  const endRef = useRef(null);
  const pollRef = useRef(null);

  // Fetch all conversations for this faculty
  async function loadConversations() {
    try {
      const r = await fetch(`${API}/direct-messages/conversations`, { headers:{ Authorization:`Bearer ${localStorage.getItem('pragati_token')}` } });
      const d = await r.json();
      setConversations(d.conversations || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    loadConversations();
    // Poll for new conversations every 15s
    const t = setInterval(loadConversations, 15000);
    return () => clearInterval(t);
  }, []);

  // Poll for new messages in active conversation every 5s
  async function loadMessages(studentId) {
    try {
      const r = await fetch(`${API}/direct-messages/${studentId}`, { headers:{ Authorization:`Bearer ${localStorage.getItem('pragati_token')}` } });
      const d = await r.json();
      setMsgs(d.messages || []);
    } catch {}
  }

  useEffect(() => {
    if (!selected) { clearInterval(pollRef.current); return; }
    loadMessages(selected.studentId);
    pollRef.current = setInterval(() => loadMessages(selected.studentId), 5000);
    return () => clearInterval(pollRef.current);
  }, [selected]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);

  async function send() {
    if (!input.trim() || !selected) return;
    setSending(true);
    const text = input.trim(); setInput('');
    try {
      const res = await fetch(`${API}/direct-messages/${selected.studentId}`, {
        method:'POST', headers:tk(), body:JSON.stringify({ text })
      });
      const d = await res.json();
      if (d.messages) setMsgs(d.messages);
    } catch {}
    finally { setSending(false); }
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'230px 1fr', gap:12, height:520 }}>
      {/* Conversation list */}
      <div style={{ overflowY:'auto', borderRight:'1px solid #e8edf5', paddingRight:10 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.78rem', color:'#3d4e6b', marginBottom:8 }}>📥 STUDENT MESSAGES</div>
        {loading && <div style={{ color:'#b0bec9', fontSize:'.8rem' }}>Loading…</div>}
        {!loading && conversations.length === 0 && (
          <div style={{ color:'#b0bec9', fontSize:'.78rem', lineHeight:1.6, padding:'8px 0' }}>No student messages yet. Students can reach you via the "Chat with Faculty" tab.</div>
        )}
        {conversations.map(c => {
          const isActive = selected?.studentId === c.studentId;
          const lastMsg = c.lastMessage;
          return (
            <div key={c.studentId} onClick={()=>setSelected(c)}
              style={{ padding:'10px 11px', borderRadius:10, marginBottom:6, cursor:'pointer', background:isActive?'rgba(83,22,151,0.09)':'#fafbff', border:isActive?'1.5px solid rgba(83,22,151,.28)':'1px solid #f0f3fa', transition:'all .15s' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#042c5d,#531697)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.8rem', color:'#fff', fontWeight:800, flexShrink:0 }}>
                  {c.studentName?.[0]?.toUpperCase()||'S'}
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:'.78rem', color:'#0f1a2e', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.studentName}</div>
                  <div style={{ fontSize:'.62rem', color:'#b0bec9' }}>{c.studentDept}</div>
                </div>
                {c.unread > 0 && <div style={{ marginLeft:'auto', minWidth:18, height:18, borderRadius:999, background:'#531697', color:'#fff', fontSize:'.62rem', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px', flexShrink:0 }}>{c.unread}</div>}
              </div>
              {lastMsg && <div style={{ fontSize:'.67rem', color:'#94a3b8', marginTop:5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{lastMsg}</div>}
            </div>
          );
        })}
      </div>

      {/* Chat pane */}
      {selected ? (
        <div style={{ display:'flex', flexDirection:'column' }}>
          <div style={{ paddingBottom:8, borderBottom:'1px solid #e8edf5', marginBottom:8, display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={()=>setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#7a8ba8', fontSize:'1rem', padding:0 }}>←</button>
            <div>
              <div style={{ fontWeight:800, fontSize:'.87rem', color:'#0f1a2e' }}>{selected.studentName}</div>
              <div style={{ fontSize:'.68rem', color:'#b0bec9' }}>{selected.studentDept} · auto-refreshing every 5s</div>
            </div>
          </div>
          <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:8, paddingBottom:8 }}>
            {msgs.length === 0 && <div style={{ textAlign:'center', padding:30, color:'#b0bec9', fontSize:'.8rem' }}>No messages yet</div>}
            {msgs.map((m,i) => {
              const isMe = m.from === user._id || m.from?._id === user._id;
              return (
                <div key={i} style={{ display:'flex', justifyContent:isMe?'flex-end':'flex-start' }}>
                  {!isMe && <div style={{ width:26, height:26, borderRadius:'50%', background:'linear-gradient(135deg,#042c5d,#531697)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.7rem', color:'#fff', fontWeight:800, marginRight:6, flexShrink:0, alignSelf:'flex-end' }}>{selected.studentName?.[0]?.toUpperCase()}</div>}
                  <div style={{ maxWidth:'72%', padding:'9px 14px', borderRadius:isMe?'14px 14px 4px 14px':'14px 14px 14px 4px', background:isMe?'linear-gradient(135deg,#531697,#13a1a5)':'#f8f9fc', color:isMe?'#fff':'#0f1a2e', fontSize:'.83rem', lineHeight:1.55, border:isMe?'none':'1px solid #e8edf5' }}>
                    {m.text}
                    <div style={{ fontSize:'.6rem', opacity:.6, marginTop:3 }}>{new Date(m.createdAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                </div>
              );
            })}
            <div ref={endRef}/>
          </div>
          <div style={{ display:'flex', gap:8, paddingTop:8, borderTop:'1px solid #e8edf5' }}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()}
              placeholder={`Reply to ${selected.studentName}…`}
              style={{ flex:1, padding:'9px 12px', borderRadius:9, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.85rem', outline:'none' }} />
            <button onClick={send} disabled={!input.trim()||sending}
              style={{ padding:'9px 16px', borderRadius:9, border:'none', background:input.trim()&&!sending?'linear-gradient(135deg,#531697,#13a1a5)':'#d0d7e8', color:'#fff', fontWeight:800, cursor:input.trim()&&!sending?'pointer':'not-allowed', fontFamily:"'Nunito',sans-serif" }}>
              Send
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', color:'#b0bec9', fontSize:'.85rem', flexDirection:'column', gap:8 }}>
          <div style={{ fontSize:'2.5rem' }}>📬</div>
          <div style={{ fontWeight:700 }}>Select a conversation</div>
          <div style={{ fontSize:'.75rem', textAlign:'center', maxWidth:240, lineHeight:1.6 }}>Student messages appear here. The inbox auto-refreshes every 15 seconds.</div>
        </div>
      )}
    </div>
  );
}

/* ── Direct Faculty Chat (student side) ────────────────────────────── */
function FacultyChat() {
  const { user } = useAuth();
  const [faculty, setFaculty]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [msgs, setMsgs]         = useState([]);
  const [input, setInput]       = useState('');
  const [sending, setSending]   = useState(false);
  const endRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/users?role=faculty`, { headers:{ Authorization:`Bearer ${localStorage.getItem('pragati_token')}` } })
      .then(r=>r.json()).then(d=>setFaculty(d.users||[])).catch(()=>{});
  }, []);

  // Load messages + poll every 5s for real-time feel
  async function loadMessages(facultyId) {
    try {
      const r = await fetch(`${API}/direct-messages/${facultyId}`, { headers:{ Authorization:`Bearer ${localStorage.getItem('pragati_token')}` } });
      const d = await r.json();
      setMsgs(d.messages || []);
    } catch {}
  }

  useEffect(() => {
    if (!selected) { clearInterval(pollRef.current); return; }
    loadMessages(selected._id);
    pollRef.current = setInterval(() => loadMessages(selected._id), 5000);
    return () => clearInterval(pollRef.current);
  }, [selected]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);

  async function send() {
    if (!input.trim()||!selected) return;
    setSending(true);
    const text = input.trim(); setInput('');
    // Optimistic update
    setMsgs(m=>[...m,{ from:user._id, text, createdAt:new Date() }]);
    try {
      const res = await fetch(`${API}/direct-messages/${selected._id}`, {
        method:'POST', headers:tk(), body:JSON.stringify({ text })
      });
      const d = await res.json();
      if (d.messages) setMsgs(d.messages);
    } catch(e){} finally { setSending(false); }
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:12, height:500 }}>
      {/* Faculty list */}
      <div style={{ overflowY:'auto', borderRight:'1px solid #e8edf5', paddingRight:10 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.78rem', color:'#3d4e6b', marginBottom:8 }}>SELECT FACULTY</div>
        {faculty.length===0 && <div style={{ color:'#b0bec9', fontSize:'.8rem' }}>No faculty found</div>}
        {faculty.map(f => (
          <div key={f._id} onClick={()=>setSelected(f)}
            style={{ padding:'9px 10px', borderRadius:9, marginBottom:5, cursor:'pointer', background:selected?._id===f._id?'rgba(83,22,151,0.08)':'#fafbff', border:selected?._id===f._id?'1.5px solid rgba(83,22,151,.25)':'1px solid #f0f3fa', transition:'all .15s' }}>
            <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,#531697,#13a1a5)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.8rem', color:'#fff', fontWeight:800, marginBottom:5 }}>
              {f.name?.[0]?.toUpperCase()||'F'}
            </div>
            <div style={{ fontWeight:700, fontSize:'.78rem', color:'#0f1a2e' }}>{f.name}</div>
            <div style={{ fontSize:'.65rem', color:'#b0bec9' }}>{f.department}</div>
          </div>
        ))}
      </div>

      {/* Chat area */}
      {selected ? (
        <div style={{ display:'flex', flexDirection:'column' }}>
          <div style={{ paddingBottom:8, borderBottom:'1px solid #e8edf5', marginBottom:8 }}>
            <div style={{ fontWeight:800, fontSize:'.87rem', color:'#0f1a2e' }}>Chat with {selected.name}</div>
            <div style={{ fontSize:'.7rem', color:'#b0bec9' }}>{selected.department}</div>
          </div>
          <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:8, paddingBottom:8 }}>
            {msgs.length===0 && <div style={{ textAlign:'center', padding:30, color:'#b0bec9', fontSize:'.8rem' }}>Start a conversation with {selected.name}</div>}
            {msgs.map((m,i) => {
              const isMe = m.from===user._id || m.from?._id===user._id;
              return (
                <div key={i} style={{ display:'flex', justifyContent:isMe?'flex-end':'flex-start' }}>
                  <div style={{ maxWidth:'75%', padding:'9px 14px', borderRadius:isMe?'14px 14px 4px 14px':'14px 14px 14px 4px',
                    background:isMe?'linear-gradient(135deg,#531697,#13a1a5)':'#f8f9fc',
                    color:isMe?'#fff':'#0f1a2e', fontSize:'.83rem', lineHeight:1.55,
                    border:isMe?'none':'1px solid #e8edf5' }}>
                    {m.text}
                  </div>
                </div>
              );
            })}
            <div ref={endRef}/>
          </div>
          <div style={{ display:'flex', gap:8, paddingTop:8, borderTop:'1px solid #e8edf5' }}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()}
              placeholder={`Message ${selected.name}…`}
              style={{ flex:1, padding:'9px 12px', borderRadius:9, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.85rem', outline:'none' }} />
            <button onClick={send} disabled={!input.trim()||sending}
              style={{ padding:'9px 16px', borderRadius:9, border:'none', background:input.trim()&&!sending?'linear-gradient(135deg,#531697,#13a1a5)':'#d0d7e8', color:'#fff', fontWeight:800, cursor:input.trim()&&!sending?'pointer':'not-allowed', fontFamily:"'Nunito',sans-serif" }}>
              Send
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', color:'#b0bec9', fontSize:'.85rem', flexDirection:'column', gap:8 }}>
          <div style={{ fontSize:'2rem' }}>💬</div>
          <div>Select a faculty member to start chatting</div>
        </div>
      )}
    </div>
  );
}

/* ── Thread card ──────────────────────────────────────────────────── */
function ThreadCard({ disc, onOpen }) {
  const tc = { 'student-faculty':{ bg:'rgba(3,105,161,0.08)', color:'#0369a1' }, 'student-student':{ bg:'rgba(124,58,237,0.08)', color:'#7c3aed' } };
  const s  = tc[disc.type]||tc['student-student'];
  return (
    <div onClick={onOpen} className="card" style={{ padding:'16px 18px', cursor:'pointer', marginBottom:10, transition:'all .2s' }}
      onMouseOver={e=>e.currentTarget.style.boxShadow='0 6px 20px rgba(4,44,93,0.1)'}
      onMouseOut={e=>e.currentTarget.style.boxShadow=''}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
        <span style={{ padding:'2px 8px', borderRadius:999, background:s.bg, color:s.color, fontSize:'.7rem', fontWeight:700 }}>
          {disc.type==='student-faculty'?'Faculty Doubt':'Peer Discussion'}
        </span>
        {disc.isResolved && <span style={{ padding:'2px 8px', borderRadius:999, background:'rgba(71,211,114,0.1)', color:'#166534', fontSize:'.7rem', fontWeight:700 }}>✅ Resolved</span>}
        <span style={{ marginLeft:'auto', fontSize:'.7rem', color:'#b0bec9' }}>{new Date(disc.createdAt).toLocaleDateString('en-IN',{ day:'numeric', month:'short' })}</span>
      </div>
      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.9rem', color:'#0f1a2e', marginBottom:4 }}>{disc.title}</div>
      <div style={{ fontSize:'.75rem', color:'#7a8ba8' }}>
        by {disc.createdBy?.name||'Anonymous'} · {disc.replies?.length||0} {disc.replies?.length===1?'reply':'replies'}
        {disc.tags?.length>0 && ' · ' + disc.tags.slice(0,2).join(', ')}
      </div>
    </div>
  );
}

/* ── Thread detail ────────────────────────────────────────────────── */
function ThreadDetail({ disc, user, onBack, onReply, onResolve }) {
  const [reply, setReply] = useState('');
  const [sending, setSend] = useState(false);
  async function handleReply() {
    if (!reply.trim()) return;
    setSend(true);
    await onReply(disc._id, reply.trim());
    setReply(''); setSend(false);
  }
  return (
    <div>
      <button onClick={onBack} style={{ marginBottom:14, padding:'6px 14px', borderRadius:8, border:'1px solid #d0d7e8', background:'transparent', color:'#7a8ba8', fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.8rem' }}>← Back</button>
      <div className="card" style={{ padding:'20px 22px', marginBottom:14 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1rem', color:'#0f1a2e', marginBottom:8 }}>{disc.title}</div>
        {disc.approach && <div style={{ fontSize:'.85rem', color:'#3d4e6b', lineHeight:1.7, marginBottom:10 }}>{disc.approach}</div>}
        {disc.problemLink && <a href={disc.problemLink} target="_blank" rel="noreferrer" style={{ fontSize:'.78rem', color:'#531697', fontWeight:700 }}>🔗 View Problem</a>}
        <div style={{ marginTop:10, fontSize:'.73rem', color:'#b0bec9' }}>Posted by {disc.createdBy?.name} · {new Date(disc.createdAt).toLocaleString('en-IN')}</div>
        {!disc.isResolved && user?.role !== 'student' && (
          <button onClick={()=>onResolve(disc._id)} style={{ marginTop:10, padding:'5px 12px', borderRadius:7, border:'none', background:'rgba(71,211,114,0.1)', color:'#166534', fontWeight:700, fontSize:'.75rem', cursor:'pointer', fontFamily:"'Nunito',sans-serif" }}>✅ Mark Resolved</button>
        )}
      </div>

      <div style={{ marginBottom:14 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.85rem', marginBottom:10, color:'#3d4e6b' }}>REPLIES ({disc.replies?.length||0})</div>
        {(disc.replies||[]).map((r,i) => (
          <div key={i} style={{ padding:'12px 14px', borderRadius:10, background:r.isAccepted?'rgba(71,211,114,0.06)':'#fafbff', border:`1px solid ${r.isAccepted?'rgba(71,211,114,0.25)':'#e8edf5'}`, marginBottom:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:'.78rem', fontWeight:700, color:'#3d4e6b' }}>
                {r.author?.name||'Anonymous'}
                {r.isAccepted && <span style={{ marginLeft:8, color:'#166634' }}>✓ Accepted</span>}
              </span>
              <span style={{ fontSize:'.7rem', color:'#b0bec9' }}>{new Date(r.createdAt).toLocaleDateString('en-IN',{ day:'numeric', month:'short' })}</span>
            </div>
            <div style={{ fontSize:'.85rem', color:'#0f1a2e', lineHeight:1.65 }}>{r.content}</div>
          </div>
        ))}
        {(!disc.replies||!disc.replies.length) && <div style={{ fontSize:'.82rem', color:'#b0bec9', padding:'12px 0' }}>No replies yet — be the first to answer!</div>}
      </div>

      <div>
        <textarea value={reply} onChange={e=>setReply(e.target.value)} rows={3}
          placeholder="Write your reply…"
          style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.875rem', resize:'vertical', outline:'none', marginBottom:8 }} />
        <button onClick={handleReply} disabled={!reply.trim()||sending}
          style={{ padding:'10px 22px', borderRadius:10, border:'none', background:reply.trim()&&!sending?'linear-gradient(135deg,#531697,#13a1a5)':'#d0d7e8', color:'#fff', fontWeight:800, cursor:reply.trim()&&!sending?'pointer':'not-allowed', fontFamily:"'Nunito',sans-serif" }}>
          {sending?'Sending…':'Post Reply'}
        </button>
      </div>
    </div>
  );
}

/* ── Create thread ────────────────────────────────────────────────── */
function CreateThread({ onCreated, onCancel, isFaculty }) {
  const [form, setForm] = useState({ title:'', approach:'', problemLink:'', type:'student-faculty', tags:'' });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));
  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      const payload = isFaculty
        ? { title:form.title, approach:form.approach, type:'student-faculty' }
        : { ...form, tags:form.tags.split(',').map(t=>t.trim()).filter(Boolean) };
      const res = await fetch(`${API}/discussions`, { method:'POST', headers:tk(), body:JSON.stringify(payload) });
      const d = await res.json();
      onCreated(d.discussion);
    } catch(err){ console.error(err); }
    finally { setLoading(false); }
  }
  const inp = { style:{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #d0d7e8', fontFamily:"'Nunito',sans-serif", fontSize:'.875rem', outline:'none', background:'#fafbff' } };
  const lbl = { style:{ display:'block', fontSize:'.75rem', fontWeight:700, color:'#3d4e6b', marginBottom:4, fontFamily:"'Syne',sans-serif" } };
  return (
    <form onSubmit={submit} className="card" style={{ padding:'20px 22px', marginBottom:16 }}>
      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', marginBottom:14, color:'#0f1a2e' }}>📝 Post a Question</div>
      <div style={{ display:'grid', gap:12 }}>
        <div><label {...lbl}>Title / Question *</label><input {...inp} value={form.title} onChange={set('title')} placeholder="What is your question?" required /></div>
        {!isFaculty && (
          <div><label {...lbl}>Type</label>
            <select {...inp} value={form.type} onChange={set('type')}>
              <option value="student-faculty">Ask Faculty</option>
              <option value="student-student">Peer Discussion</option>
            </select>
          </div>
        )}
        <div><label {...lbl}>Details / Approach tried</label><textarea {...inp} style={{ ...inp.style, height:80, resize:'none' }} value={form.approach} onChange={set('approach')} placeholder="Describe what you've tried…" /></div>
        {!isFaculty && (
          <>
            <div><label {...lbl}>Problem Link (optional)</label><input {...inp} type="url" value={form.problemLink} onChange={set('problemLink')} placeholder="https://leetcode.com/problems/..." /></div>
            <div><label {...lbl}>Tags (comma-separated)</label><input {...inp} value={form.tags} onChange={set('tags')} placeholder="arrays, dp, sorting" /></div>
          </>
        )}
      </div>
      <div style={{ display:'flex', gap:8, marginTop:14 }}>
        <button type="button" onClick={onCancel} style={{ padding:'10px 18px', borderRadius:10, border:'1.5px solid #d0d7e8', background:'transparent', color:'#7a8ba8', fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif" }}>Cancel</button>
        <button type="submit" disabled={loading} style={{ flex:1, padding:'10px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif" }}>
          {loading?'Posting…':'Post Question'}
        </button>
      </div>
    </form>
  );
}

/* ── Main page ────────────────────────────────────────────────────── */
export default function DiscussionsPage() {
  const { user } = useAuth();
  const isFaculty = user?.role === 'faculty';
  const [tab, setTab]             = useState('forum');  // forum | chat | ai
  const [discussions, setDiscussions] = useState([]);
  const [selected, setSelected]   = useState(null);
  const [creating, setCreating]   = useState(false);
  const [filter, setFilter]       = useState('all');    // all | student-faculty | student-student
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    fetch(`${API}/discussions`, { headers:{ Authorization:`Bearer ${localStorage.getItem('pragati_token')}` } })
      .then(r=>r.json()).then(d=>setDiscussions(d.discussions||[])).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  async function handleReply(id, content) {
    const res = await fetch(`${API}/discussions/${id}/reply`, { method:'POST', headers:tk(), body:JSON.stringify({ content }) });
    const d = await res.json();
    setDiscussions(ds => ds.map(x => x._id===id ? d.discussion : x));
    setSelected(d.discussion);
  }

  async function handleResolve(id) {
    const res = await fetch(`${API}/discussions/${id}/resolve`, { method:'PATCH', headers:tk() });
    const d = await res.json();
    setDiscussions(ds => ds.map(x => x._id===id ? d.discussion : x));
    setSelected(d.discussion);
  }

  const filtered = discussions.filter(d => filter==='all' ? true : d.type===filter);

  const TABS = isFaculty ? [
    { id:'forum',  label:'💬 Forum' },
    { id:'inbox',  label:'📥 Student Messages' },
    { id:'ai',     label:'🤖 Chat with AI' },
  ] : [
    { id:'forum', label:'💬 Forum' },
    { id:'chat',  label:'👨‍🏫 Chat with Faculty' },
    { id:'ai',    label:'🤖 Chat with AI' },
  ];

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif" }}>
      <div style={{ marginBottom:18 }}>
        <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.5rem', color:'#0f1a2e' }}>💬 Discussions</h1>
        <p style={{ color:'#7a8ba8', marginTop:3 }}>Ask faculty, discuss with peers, or chat with PRAGATI AI instantly</p>
      </div>

      <div style={{ display:'flex', gap:5, marginBottom:16, borderBottom:'1px solid #e8edf5' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>{setTab(t.id); setSelected(null); setCreating(false);}}
            style={{ padding:'8px 18px', borderRadius:'9px 9px 0 0', border:'none', borderBottom:tab===t.id?'2px solid #531697':'2px solid transparent', background:tab===t.id?'rgba(83,22,151,.06)':'transparent', color:tab===t.id?'#531697':'#7a8ba8', fontWeight:700, cursor:'pointer', fontSize:'.85rem', fontFamily:"'Nunito',sans-serif" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'ai' && (
        <div className="card" style={{ padding:'20px 22px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', color:'#0f1a2e' }}>🤖 PRAGATI AI Assistant</div>
            <span style={{ padding:'2px 8px', borderRadius:999, background:'rgba(83,22,151,0.08)', color:'#531697', fontSize:'.68rem', fontWeight:700 }}>Powered by Gemini 2.0 Flash</span>
          </div>
          <AIChat />
        </div>
      )}

      {tab === 'chat' && (
        <div className="card" style={{ padding:'20px 22px' }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', color:'#0f1a2e', marginBottom:14 }}>👨‍🏫 Direct Chat with Faculty</div>
          <FacultyChat />
        </div>
      )}

      {tab === 'inbox' && (
        <div className="card" style={{ padding:'20px 22px' }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.95rem', color:'#0f1a2e', marginBottom:14 }}>📥 Student Message Inbox</div>
          <FacultyInbox />
        </div>
      )}

      {tab === 'forum' && (
        <>
          {selected ? (
            <ThreadDetail disc={selected} user={user} onBack={()=>setSelected(null)} onReply={handleReply} onResolve={handleResolve} />
          ) : creating ? (
            <CreateThread
              isFaculty={isFaculty}
              onCreated={d => { setDiscussions(ds => [d,...ds]); setCreating(false); setSelected(d); }}
              onCancel={() => setCreating(false)} />
          ) : (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <div style={{ display:'flex', gap:6 }}>
                  {[['all','All'],['student-faculty','Ask Faculty'],['student-student','Peer']].map(([k,l])=>(
                    <button key={k} onClick={()=>setFilter(k)} style={{ padding:'5px 12px', borderRadius:999, border:`1px solid ${filter===k?'#531697':'#d0d7e8'}`, background:filter===k?'rgba(83,22,151,.08)':'transparent', color:filter===k?'#531697':'#7a8ba8', fontWeight:700, cursor:'pointer', fontSize:'.75rem', fontFamily:"'Nunito',sans-serif" }}>{l}</button>
                  ))}
                </div>
                <button onClick={()=>setCreating(true)} style={{ padding:'8px 16px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#531697,#13a1a5)', color:'#fff', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.82rem' }}>
                  + Ask Question
                </button>
              </div>
              {loading ? <div style={{ textAlign:'center', padding:40, color:'#b0bec9' }}>Loading…</div> :
                filtered.length === 0 ? (
                  <div style={{ textAlign:'center', padding:60 }}>
                    <div style={{ fontSize:'3rem', marginBottom:12 }}>💬</div>
                    <div style={{ color:'#b0bec9', fontWeight:700 }}>No discussions yet</div>
                    <div style={{ color:'#b0bec9', fontSize:'.82rem', marginTop:4 }}>Be the first to post a question!</div>
                  </div>
                ) : filtered.map(d => <ThreadCard key={d._id} disc={d} onOpen={()=>setSelected(d)} />)
              }
            </>
          )}
        </>
      )}

      {/* Opportunities from Unstop & Devfolio */}
      {tab === 'forum' && !selected && !creating && (
        <div style={{ marginTop:20 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.88rem', marginBottom:12, color:'#0f1a2e' }}>🌐 Opportunities — Hackathons & Internships</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[
              { name:'Unstop', emoji:'🏆', desc:'Hackathons, competitions, and internships for students', url:'https://unstop.com/competitions?superType=competitions', color:'#531697' },
              { name:'Devfolio', emoji:'💻', desc:"India's hackathon platform — find events near you", url:'https://devfolio.co/hackathons', color:'#042c5d' },
              { name:'Internshala', emoji:'📋', desc:'Internships and student jobs across India', url:'https://internshala.com/internships/', color:'#13a1a5' },
              { name:'HackerEarth', emoji:'👨‍💻', desc:'Coding challenges and hiring contests', url:'https://www.hackerearth.com/challenges/', color:'#47d372' },
            ].map(op=>(
              <a key={op.name} href={op.url} target="_blank" rel="noreferrer"
                style={{ padding:'14px 16px', borderRadius:12, border:`1.5px solid ${op.color}25`, background:`${op.color}06`, textDecoration:'none', display:'flex', gap:12, alignItems:'flex-start', transition:'all .2s' }}
                onMouseOver={e=>e.currentTarget.style.background=`${op.color}12`}
                onMouseOut={e=>e.currentTarget.style.background=`${op.color}06`}>
                <div style={{ fontSize:'1.4rem', flexShrink:0 }}>{op.emoji}</div>
                <div>
                  <div style={{ fontWeight:800, fontSize:'.85rem', color:op.color, fontFamily:"'Syne',sans-serif" }}>{op.name}</div>
                  <div style={{ fontSize:'.75rem', color:'#7a8ba8', marginTop:3, lineHeight:1.5 }}>{op.desc}</div>
                  <div style={{ fontSize:'.7rem', color:op.color, marginTop:4, fontWeight:700 }}>Visit →</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

