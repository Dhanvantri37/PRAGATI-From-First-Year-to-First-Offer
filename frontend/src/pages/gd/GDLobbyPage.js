/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client';

const API  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api','');
const tk   = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('pragati_token')}` });
const GRAD = 'linear-gradient(135deg,#531697,#13a1a5)';

const selectStyle = {
  width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid var(--border)',
  fontFamily:"'Nunito',sans-serif", fontSize:'.85rem', fontWeight:600, outline:'none', background:'var(--surface)', color:'var(--text)',
};
const inputStyle = {
  width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid var(--border)',
  fontFamily:"'Nunito',sans-serif", fontSize:'.85rem', fontWeight:600, outline:'none', background:'var(--surface)', color:'var(--text)', boxSizing:'border-box',
};

function FormField({ label, children }) {
  return (
    <div>
      <label style={{ display:'block', fontSize:'.72rem', fontWeight:700, color:'var(--text-3)', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.04em' }}>{label}</label>
      {children}
    </div>
  );
}

export default function GDLobbyPage() {
  const nav  = useNavigate();
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [form, setForm] = useState({
    company:'TCS', difficulty:'Medium', minParticipants:3,
    maxParticipants:5, durationSeconds:600, language:'English', isPrivate:false,
  });
  const socketRef    = useRef(null);

  async function fetchRooms() {
    try {
      const r = await fetch(`${API}/gd/rooms`, { headers: tk() });
      const d = await r.json();
      setRooms(d.rooms || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { fetchRooms(); }, []);

  // Global socket for room creation refreshes
  useEffect(() => {
    const token = localStorage.getItem('pragati_token');
    const socket = io(BASE, { auth:{ token }, transports:['websocket'], reconnection:true });
    socketRef.current = socket;
    socket.on('gd-room-created', () => {
      fetchRooms();
    });
    return () => {
      socket.disconnect();
    };
  // eslint-disable-next-line
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      const token = localStorage.getItem('pragati_token');
      if (!token) {
        alert('Please log in first to create a GD room.');
        setCreating(false);
        return;
      }
      const r = await fetch(`${API}/gd/rooms`, {
        method:'POST', headers:tk(), body:JSON.stringify(form),
      });
      const d = await r.json();
      if (r.ok && d.room?.roomCode) {
        nav(`/dashboard/gd/${d.room.roomCode}`);
      } else if (r.status === 401) {
        alert('Your login session has expired. Please log out and log in again to create a room.');
      } else {
        alert(d.error || 'Failed to create room');
      }
    } catch (err) {
      alert('Could not connect to backend server. Please check your network connection.');
    }
    setCreating(false);
  }

  function handleJoinCode(e) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (code.length >= 6) nav(`/dashboard/gd/${code}`);
    else alert('Enter a valid room code');
  }

  const diffColor = { Easy:'#47d372', Medium:'#f59e0b', Hard:'#ef4444' };

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif", maxWidth:960, margin:'0 auto', padding:'0 8px 60px' }}>

      {/* Header */}
      <div style={{ background:GRAD, borderRadius:16, padding:'28px 32px', marginBottom:20, color:'#fff' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.5rem', marginBottom:4 }}>🎤 Group Discussion Arena</div>
            <div style={{ opacity:.85, fontSize:'.88rem', lineHeight:1.5 }}>AI-powered video GD with real-time moderation, voice interaction & detailed evaluation</div>
          </div>
          <button onClick={() => setShowCreate(s => !s)}
            style={{ padding:'12px 24px', borderRadius:12, border:'2px solid rgba(255,255,255,0.4)', background:'rgba(255,255,255,0.15)', color:'#fff', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.95rem' }}>
            {showCreate ? '✕ Cancel' : '+ Create Room'}
          </button>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:16 }}>
          {['🤖 Groq AI Moderator','📹 Live Video','🎙️ Voice-First','📊 AI Evaluation','🔴 Real-time Monitoring'].map(f => (
            <span key={f} style={{ padding:'4px 12px', borderRadius:20, background:'rgba(255,255,255,0.18)', fontSize:'.72rem', fontWeight:700 }}>{f}</span>
          ))}
        </div>
      </div>

      {/* Create Room Form */}
      {showCreate && (
        <div style={{ background:'var(--surface)', borderRadius:16, padding:'24px 28px', marginBottom:20, boxShadow:'0 4px 24px rgba(83,22,151,0.1)', border:'1.5px solid var(--border)' }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.05rem', marginBottom:18, color:'var(--text)' }}>Configure New GD Room</div>
          <form onSubmit={handleCreate}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14, marginBottom:18 }}>
              <FormField label="Company Context">
                <select value={form.company} onChange={e => setForm(f => ({ ...f, company:e.target.value }))} style={selectStyle}>
                  {['TCS','Infosys','Wipro','Cognizant','Capgemini','Accenture','HCL','Tech Mahindra','General'].map(c => <option key={c}>{c}</option>)}
                </select>
              </FormField>
              <FormField label="Difficulty">
                <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty:e.target.value }))} style={selectStyle}>
                  {['Easy','Medium','Hard'].map(d => <option key={d}>{d}</option>)}
                </select>
              </FormField>
              <FormField label="Language">
                <select value={form.language} onChange={e => setForm(f => ({ ...f, language:e.target.value }))} style={selectStyle}>
                  {['English','Hindi','Hinglish'].map(l => <option key={l}>{l}</option>)}
                </select>
              </FormField>
              <FormField label="Min Participants">
                <input type="number" min={2} max={6} value={form.minParticipants}
                  onChange={e => setForm(f => ({ ...f, minParticipants:+e.target.value }))} style={inputStyle} />
              </FormField>
              <FormField label="Max Participants">
                <input type="number" min={2} max={8} value={form.maxParticipants}
                  onChange={e => setForm(f => ({ ...f, maxParticipants:+e.target.value }))} style={inputStyle} />
              </FormField>
              <FormField label="Duration">
                <select value={form.durationSeconds} onChange={e => setForm(f => ({ ...f, durationSeconds:+e.target.value }))} style={selectStyle}>
                  {[[300,'5 min'],[600,'10 min'],[900,'15 min'],[1200,'20 min']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </FormField>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
              <input type="checkbox" id="priv" checked={form.isPrivate} onChange={e => setForm(f => ({ ...f, isPrivate:e.target.checked }))} />
              <label htmlFor="priv" style={{ fontSize:'.85rem', color:'var(--text-2)', fontWeight:700, cursor:'pointer' }}>🔒 Private room (invite only)</label>
            </div>
            <button type="submit" disabled={creating}
              style={{ padding:'12px 32px', borderRadius:12, border:'none', background:GRAD, color:'#fff', fontWeight:800, cursor:creating?'wait':'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.95rem' }}>
              {creating ? '⏳ Creating…' : '🚀 Create & Enter Room'}
            </button>
          </form>
        </div>
      )}

      {/* Join by Code */}
      <div style={{ background:'var(--surface)', borderRadius:14, padding:'18px 22px', marginBottom:20, boxShadow:'0 2px 12px rgba(0,0,0,0.06)', border:'1px solid var(--border)' }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'.9rem', marginBottom:12, color:'var(--text)' }}>🔑 Join with Room Code</div>
        <form onSubmit={handleJoinCode} style={{ display:'flex', gap:10 }}>
          <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder="e.g. A1B2C3D4" maxLength={10}
            style={{ flex:1, padding:'10px 14px', borderRadius:10, border:'1.5px solid var(--border)', background:'var(--surface)', color:'var(--text)', fontFamily:"'Nunito',sans-serif", fontSize:'.9rem', fontWeight:700, letterSpacing:'0.1em', outline:'none' }} />
          <button type="submit"
            style={{ padding:'10px 22px', borderRadius:10, border:'none', background:GRAD, color:'#fff', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif" }}>
            Join →
          </button>
        </form>
      </div>

      {/* Live Rooms */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1.05rem', color:'var(--text)' }}>
          🔴 Live Sessions
          {rooms.length > 0 && <span style={{ marginLeft:8, background:'#ef4444', color:'#fff', borderRadius:20, padding:'2px 10px', fontSize:'.72rem', fontWeight:800 }}>{rooms.length}</span>}
        </div>
        <button onClick={fetchRooms} style={{ padding:'7px 16px', borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--text-3)', fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.78rem' }}>↻ Refresh</button>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'40px 0', color:'#b0bec9' }}>Loading sessions…</div>
      ) : rooms.length === 0 ? (
        <div style={{ textAlign:'center', padding:'50px 20px', background:'var(--surface)', borderRadius:14, border:'1px dashed var(--border)' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:12 }}>🎤</div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1rem', color:'var(--text)', marginBottom:8 }}>No sessions open right now</div>
          <div style={{ color:'var(--text-3)', fontSize:'.85rem', marginBottom:20 }}>Create a room — others will be notified instantly</div>
          <button onClick={() => setShowCreate(true)} style={{ padding:'10px 24px', borderRadius:10, border:'none', background:GRAD, color:'#fff', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif" }}>Create Room</button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
          {rooms.map(room => {
            const count  = room.participants?.filter(p => !p?.isAI).length || 0;
            const pct    = Math.round((count / room.maxParticipants) * 100);
            const bColor = pct >= 100 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#47d372';
            const isFull = count >= room.maxParticipants;
            return (
              <div key={room.roomCode} style={{ background:'var(--surface)', borderRadius:14, padding:'18px 20px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', border:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div style={{ fontFamily:'monospace', fontWeight:800, fontSize:'.9rem', color:'#531697', background:'rgba(83,22,151,0.08)', padding:'3px 10px', borderRadius:6 }}>{room.roomCode}</div>
                  <div style={{ display:'flex', gap:6 }}>
                    <span style={{ padding:'2px 9px', borderRadius:10, background:`${diffColor[room.difficulty]||'#9ab0c8'}18`, color:diffColor[room.difficulty]||'#9ab0c8', fontWeight:800, fontSize:'.68rem' }}>{room.difficulty}</span>
                    {room.isPrivate && <span style={{ padding:'2px 9px', borderRadius:10, background:'#f0f3fa', color:'var(--text-3)', fontWeight:700, fontSize:'.68rem' }}>🔒</span>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {[['🏢',room.companyContext||'General'],['⏱',`${Math.round(room.durationSeconds/60)} min`],['🌐',room.language||'English']].map(([ic,txt]) => (
                    <span key={txt} style={{ fontSize:'.75rem', fontWeight:700, color:'var(--text-2)', background:'var(--bg-alt)', padding:'3px 9px', borderRadius:6 }}>{ic} {txt}</span>
                  ))}
                </div>
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontSize:'.72rem', fontWeight:700, color:'var(--text-3)' }}>Participants</span>
                    <span style={{ fontSize:'.72rem', fontWeight:800, color:bColor }}>{count}/{room.maxParticipants}</span>
                  </div>
                  <div style={{ height:5, borderRadius:4, background:'#f0f3fa', overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:4, background:bColor, width:`${pct}%`, transition:'width .4s' }} />
                  </div>
                  <div style={{ fontSize:'.68rem', color:'#b0bec9', marginTop:3 }}>Minimum: {room.minParticipants}</div>
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {['🤖 AI Moderator','📊 Evaluation','🎙️ Voice'].map(tag => (
                    <span key={tag} style={{ padding:'2px 8px', borderRadius:6, background:'rgba(83,22,151,0.06)', color:'#531697', fontSize:'.62rem', fontWeight:700 }}>{tag}</span>
                  ))}
                </div>
                <button onClick={() => !isFull && nav(`/dashboard/gd/${room.roomCode}`)}
                  disabled={isFull}
                  style={{ padding:'10px', borderRadius:10, border:'none', background:isFull?'#f0f3fa':GRAD, color:isFull?'#b0bec9':'#fff', fontWeight:800, cursor:isFull?'not-allowed':'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.88rem' }}>
                  {isFull ? 'Full' : '▶ Join Session'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* How it works */}
      <div style={{ marginTop:32, background:'var(--surface)', borderRadius:16, padding:'24px 28px', border:'1px solid var(--border)' }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1rem', marginBottom:18, color:'var(--text)' }}>🤖 How AI-Powered GD Works</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:14 }}>
          {[
            ['1️⃣','Enable Camera & Mic','Google Meet-style permission with live preview before joining'],
            ['2️⃣','Prep Time','AI announces the topic with voice. 45 seconds to prepare.'],
            ['3️⃣','Live Video GD','Active speaker detection. Hold mic button to speak & be transcribed.'],
            ['4️⃣','AI Monitoring','Off-topic? AI voice intervenes and brings discussion back on track.'],
            ['5️⃣','AI Auto-Joins','If not enough participants in 2 min, AI fills in as participant.'],
            ['6️⃣','Instant Report','7-dimension AI evaluation report generated per student after GD.'],
          ].map(([n, title, desc]) => (
            <div key={n} style={{ padding:'14px', borderRadius:10, background:'var(--bg-alt)', border:'1px solid var(--border)' }}>
              <div style={{ fontSize:'1.3rem', marginBottom:6 }}>{n}</div>
              <div style={{ fontWeight:800, fontSize:'.82rem', color:'var(--text)', marginBottom:4 }}>{title}</div>
              <div style={{ fontSize:'.75rem', color:'var(--text-3)', lineHeight:1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
