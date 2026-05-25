/**
 * GDRoundPage — UPGRADED v3.0
 *
 * Changes:
 *  1. AI GD Simulator with context-aware AI moderator (via /api/skillpath/gd-moderate)
 *  2. Continuous voice (click once, speak freely, auto-sends on 2.5s silence)
 *  3. Existing write mode + dos/don'ts preserved
 *  4. Two practice modes: Write Mode (existing) + AI GD Simulator (new)
 *  5. Moderator challenges weak arguments, asks for examples, introduces counterpoints
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RoundHeader, Card, SectionTitle, AnswerBox, Timer } from './PracticeComponents';
import { ROUND_RESOURCES } from './RESOURCES';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tk  = () => ({ Authorization: `Bearer ${localStorage.getItem('pragati_token')}` });

const DOS_DONTS = [
  { type:'do',   text:'Listen actively when others speak' },
  { type:'do',   text:'Maintain eye contact with all participants' },
  { type:'do',   text:'Use data and examples to support your points' },
  { type:'do',   text:'Acknowledge good points made by others' },
  { type:'do',   text:'Be the one to summarize or conclude if possible' },
  { type:'do',   text:'Speak clearly and at a moderate pace' },
  { type:'dont', text:"Don't interrupt others while they're speaking" },
  { type:'dont', text:"Don't shout or become aggressive" },
  { type:'dont', text:"Don't repeat the same point multiple times" },
  { type:'dont', text:"Don't stay silent throughout the discussion" },
  { type:'dont', text:"Don't use jargon without explaining it" },
  { type:'dont', text:"Don't deviate from the topic" },
];

const GD_TOPICS = [
  { topic:'Should AI replace human jobs?', category:'Technology', difficulty:'Medium', keyPoints:['Automation benefits','Job displacement','New job creation','Reskilling','Human creativity'] },
  { topic:'Work from home vs. office — which is better for productivity?', category:'Corporate', difficulty:'Easy', keyPoints:['Flexibility','Collaboration','Mental health','Infrastructure','Work-life balance'] },
  { topic:'Is social media doing more harm than good?', category:'Society', difficulty:'Easy', keyPoints:['Mental health impact','Misinformation','Connectivity','Business opportunities','Addiction'] },
  { topic:'Electric vehicles: Are they truly the future of transport?', category:'Environment', difficulty:'Medium', keyPoints:['Battery technology','Charging infrastructure','Carbon emissions','Cost','Range anxiety'] },
  { topic:'Brain drain from India — a problem or opportunity?', category:'Economics', difficulty:'Hard', keyPoints:['Talent emigration','Remittances','Startup ecosystem','Policy reforms','Global exposure'] },
  { topic:'Should the voting age be reduced to 16?', category:'Politics', difficulty:'Medium', keyPoints:['Maturity','Civic responsibility','Youth representation','International examples','Education'] },
  { topic:'Cryptocurrency — boon or bane for the global economy?', category:'Finance', difficulty:'Hard', keyPoints:['Decentralization','Volatility','Regulation','Financial inclusion','Fraud'] },
  { topic:'Online education vs. traditional classroom learning', category:'Education', difficulty:'Easy', keyPoints:['Accessibility','Engagement','Practical skills','Cost','Infrastructure'] },
];

// ── Continuous STT hook ───────────────────────────────────────────────────────
function useContinuousSTT({ lang='en-IN', silenceMs=2500, onPartial, onFinal, onError }={}) {
  const [listening, setListening] = useState(false);
  const [supported] = useState(!!(window.SpeechRecognition||window.webkitSpeechRecognition));
  const recRef = useRef(null);
  const finalRef = useRef('');
  const silRef = useRef(null);
  const activeRef = useRef(false);
  const onFinalRef = useRef(onFinal);
  const onPartialRef = useRef(onPartial);
  useEffect(()=>{ onFinalRef.current=onFinal; },[onFinal]);
  useEffect(()=>{ onPartialRef.current=onPartial; },[onPartial]);

  const armSil = useCallback(()=>{
    clearTimeout(silRef.current);
    silRef.current = setTimeout(()=>{ const t=finalRef.current.trim(); if(t)onFinalRef.current?.(t); }, silenceMs);
  },[silenceMs]);

  const startSess = useCallback(()=>{
    if(!activeRef.current)return;
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition; if(!SR)return;
    try{recRef.current?.abort();}catch{}
    const r=new SR(); r.continuous=true; r.interimResults=true; r.lang=lang; r.maxAlternatives=1;
    recRef.current=r;
    r.onstart=()=>setListening(true);
    r.onresult=e=>{
      let nf='',interim='';
      for(let i=e.resultIndex;i<e.results.length;i++){
        const c=e.results[i][0].transcript;
        if(e.results[i].isFinal)nf+=c+' '; else interim=c;
      }
      if(nf){finalRef.current+=nf;armSil();}
      onPartialRef.current?.((finalRef.current+interim).trim());
    };
    r.onerror=e=>{ if(e.error==='not-allowed'){activeRef.current=false;setListening(false);onError?.('Microphone permission denied.');} };
    r.onend=()=>{ if(activeRef.current)setTimeout(startSess,200); else setListening(false); };
    try{r.start();}catch{}
  },[lang,armSil,onError]);

  const start=useCallback(async()=>{
    if(!supported)return;
    // Request mic permission explicitly before starting SR.
    // Without this, the browser may silently block recognition on first use.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop()); // release immediately — SR takes over
    } catch {
      onError?.('Microphone access was denied. Please allow microphone access in your browser settings and try again.');
      return;
    }
    finalRef.current=''; clearTimeout(silRef.current); activeRef.current=true; startSess();
  },[supported,startSess,onError]);

  const stop=useCallback(()=>{
    activeRef.current=false; clearTimeout(silRef.current);
    try{recRef.current?.stop();}catch{} setListening(false);
    const t=finalRef.current.trim(); finalRef.current=''; return t;
  },[]);

  useEffect(()=>()=>{ activeRef.current=false; clearTimeout(silRef.current); try{recRef.current?.abort();}catch{}; },[]);
  return {listening,supported,start,stop};
}

// ── AI Moderator call ─────────────────────────────────────────────────────────
async function callModerator({ topic, conversation, participantPoint, turn, totalTurns }) {
  const isLast = turn >= totalTurns-1;
  const history = conversation.slice(-5).map(m=>`${m.role==='moderator'?'Moderator':'Participant'}: ${m.text}`).join('\n');

  const prompt = `You are a sharp, experienced Group Discussion moderator at an Indian campus placement interview.
Topic: "${topic}"
${history ? `Conversation so far:\n${history}\n` : ''}
Participant just said: "${participantPoint}"

${isLast
  ? 'Summarize the discussion, highlight strengths and 1-2 improvements, give a GD score out of 10.'
  : `Your response (2-3 sentences):
- If their argument is weak or vague → challenge it and ask for specific data or example
- If it is decent → acknowledge briefly and push deeper or introduce a counterpoint
- If it is strong → build on it by introducing a new dimension of the topic
- Be natural and conversational, not robotic
- For first turn: introduce the topic naturally and invite their opening argument`}

Return ONLY valid JSON: {"response":"...","tone":"challenging|encouraging|neutral|summarizing","pointQuality":"weak|decent|strong"}`;

  try {
    const res = await fetch(`${API}/skillpath/gd-moderate`, {
      method:'POST', headers:{...tk(),'Content-Type':'application/json'},
      body:JSON.stringify({prompt,topic,participantPoint,turn,isLast}),
    });
    if(!res.ok)throw new Error();
    const d = await res.json();
    if(d?.response)return d;
    throw new Error();
  } catch {
    return localModerator(participantPoint, turn, isLast, topic);
  }
}

function localModerator(point, turn, isLast, topic) {
  const words = (point||'').split(/\s+/).length;
  const lower = (point||'').toLowerCase();
  const isWeak = words<25 || !/(because|since|example|data|research|shows|evidence|according|statistics)/i.test(point);

  if(isLast) {
    const score = isWeak?5:words>=60?9:7;
    return { response:`Thank you. ${score>=8?'You demonstrated strong analytical thinking and backed your points with evidence.':'Work on supporting your arguments with specific data next time.'} GD Score: ${score}/10.`, tone:'summarizing', pointQuality:isWeak?'weak':'decent' };
  }
  if(turn===0) return { response:`Let's begin our GD on "${topic}". This is a topic with multiple dimensions worth exploring. Could you start by sharing your initial stance and the strongest argument you would make?`, tone:'neutral', pointQuality:'decent' };
  if(isWeak) {
    const chs = ['That is a valid point, but it is quite general. Can you back it up with a specific statistic, real-world case, or example from India? Vague arguments do not score well in GDs.','You have made an assertion, but where is the evidence? In a GD, every claim needs supporting data or an example.'];
    return { response:chs[turn%chs.length], tone:'challenging', pointQuality:'weak' };
  }
  if(lower.includes('government')||lower.includes('policy')) return { response:"Good policy perspective. But we have seen well-intentioned policies fail at implementation in India. What specific mechanism would ensure this works at the grassroots level?", tone:'challenging', pointQuality:'decent' };
  if(lower.includes('technology')||lower.includes('ai')||lower.includes('digital')) return { response:"Solid technology angle. But consider India's 65% rural population with limited digital access — does your argument apply equally there, and who gets left behind?", tone:'challenging', pointQuality:'decent' };
  const fups = ['Good point. Now present the strongest counterargument and explain why your side still wins.','You have identified the problem well. What is your specific, actionable recommendation? Strong GD participants prescribe solutions.','Solid reasoning. How does this play out specifically in the Indian context versus developed nations?','Strong argument. Can you now summarize the group\'s key points and propose a middle-ground?'];
  return { response:fups[turn%fups.length], tone:'encouraging', pointQuality:'strong' };
}

// ── AI GD Simulator ───────────────────────────────────────────────────────────
function AIGDSimulator({ topic }) {
  const [convo, setConvo]   = useState([]);
  const [input, setInput]   = useState('');
  const [loading, setLoad]  = useState(false);
  const [turn, setTurn]     = useState(0);
  const [totalTurns]        = useState(7);
  const [started, setStart] = useState(false);
  const [done, setDone]     = useState(false);
  const [liveText, setLive] = useState('');
  const bottomRef = useRef(null);
  const sendRef   = useRef(null);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}); },[convo,liveText]);

  const {listening,supported,start:startMic,stop:stopMic} = useContinuousSTT({
    lang:'en-IN', silenceMs:999999, // disable auto-silence submit
    onPartial: t=>setLive(t),
    // no onFinal, wait for manual stop/send
  });

  async function startGD() {
    setStart(true); setLoad(true);
    const intro = await callModerator({topic:topic.topic,conversation:[],participantPoint:'[Session starting]',turn:0,totalTurns});
    setConvo([{role:'moderator',text:intro.response,tone:intro.tone}]);
    setTurn(1); setLoad(false);
  }

  const handleSend = useCallback(async(textOverride)=>{
    let text = (textOverride!==undefined?textOverride:input).trim();
    if(listening) {
      const micText = stopMic();
      if (!text && micText) text = micText;
    }
    setLive(''); setInput('');
    if(!text||loading||done)return;
    const isLast = turn>=totalTurns-1;
    const newConvo=[...convo,{role:'participant',text}];
    setConvo(newConvo); setLoad(true);
    const result = await callModerator({topic:topic.topic,conversation:newConvo,participantPoint:text,turn,totalTurns});
    setTimeout(()=>{
      setConvo(c=>[...c,{role:'moderator',text:result.response,tone:result.tone,pq:result.pointQuality}]);
      setTurn(t=>t+1); setLoad(false);
      if(isLast)setDone(true);
    },700);
  },[input,loading,done,convo,turn,totalTurns,topic,listening,stopMic]);

  useEffect(()=>{ sendRef.current=handleSend; },[handleSend]);

  const tc={challenging:'#991b1b',encouraging:'#166534',neutral:'#531697',summarizing:'#0d7a7e'};
  const tl={challenging:'🔥 Challenging',encouraging:'✅ Encouraging',neutral:'💬 Neutral',summarizing:'📊 Summary'};
  const qc={weak:'#ef4444',decent:'#f59e0b',strong:'#47d372'};

  if(!started) return (
    <div style={{textAlign:'center',padding:'30px 20px'}}>
      <div style={{fontSize:'2.5rem',marginBottom:12}}>🎙️</div>
      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'1rem',color:'var(--text)',marginBottom:8}}>AI GD Simulator</div>
      <div style={{fontWeight:700,fontSize:'.9rem',color:'#531697',marginBottom:6}}>{topic.topic}</div>
      <div style={{color:'var(--text-3)',fontSize:'.84rem',marginBottom:20,maxWidth:460,margin:'0 auto 20px'}}>The AI moderator will introduce the topic, challenge your arguments, ask follow-ups, and summarize — just like a real GD panel.</div>
      <button onClick={startGD} style={{padding:'12px 28px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#531697,#13a1a5)',color:'#fff',fontWeight:800,cursor:'pointer',fontFamily:"'Nunito',sans-serif",fontSize:'.9rem'}}>🚀 Start GD Session</button>
    </div>
  );

  return (
    <div>
      {/* Progress */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <span style={{fontSize:'.7rem',color:'var(--text-3)',fontWeight:700}}>Turn {Math.min(turn,totalTurns)}/{totalTurns}</span>
        <div style={{flex:1,height:4,background:'#f0f3fa',borderRadius:999,margin:'0 10px'}}>
          <div style={{width:`${(turn/totalTurns)*100}%`,height:'100%',background:'linear-gradient(90deg,#531697,#13a1a5)',borderRadius:999,transition:'width .4s'}}/>
        </div>
        {done&&<span style={{fontSize:'.7rem',color:'#13a1a5',fontWeight:800}}>✅ Complete</span>}
      </div>

      {/* Chat */}
      <div style={{minHeight:300,maxHeight:440,overflowY:'auto',display:'flex',flexDirection:'column',gap:10,padding:'10px 0'}}>
        {convo.map((msg,i)=>(
          <div key={i} style={{display:'flex',flexDirection:'column',alignItems:msg.role==='participant'?'flex-end':'flex-start'}}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
              {msg.role==='moderator'&&<>
                <span style={{fontSize:'.65rem',fontWeight:800,color:'var(--text-3)'}}>🎤 MODERATOR</span>
                {msg.tone&&<span style={{fontSize:'.6rem',fontWeight:800,padding:'1px 6px',borderRadius:999,background:`${tc[msg.tone]||'#531697'}18`,color:tc[msg.tone]||'#531697'}}>{tl[msg.tone]}</span>}
              </>}
              {msg.role==='participant'&&<>
                <span style={{fontSize:'.65rem',fontWeight:800,color:'#531697'}}>👤 YOU</span>
                {msg.pq&&<span style={{fontSize:'.6rem',fontWeight:800,padding:'1px 6px',borderRadius:999,background:`${qc[msg.pq]||'#531697'}18`,color:qc[msg.pq]||'#531697',textTransform:'capitalize'}}>{msg.pq}</span>}
              </>}
            </div>
            <div style={{maxWidth:'85%',padding:'12px 16px',borderRadius:msg.role==='participant'?'16px 16px 4px 16px':'16px 16px 16px 4px',background:msg.role==='participant'?'linear-gradient(135deg,#531697,#13a1a5)':'#fff',color:msg.role==='participant'?'#fff':'var(--text)',border:msg.role==='participant'?'none':'1px solid #e8edf5',fontSize:'.85rem',lineHeight:1.65,whiteSpace:'pre-wrap',boxShadow:msg.role==='participant'?'0 4px 14px rgba(83,22,151,0.2)':'0 2px 8px rgba(4,44,93,0.05)'}}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading&&<div style={{display:'flex',alignItems:'center',gap:8,opacity:.6}}>
          <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#531697,#13a1a5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.8rem'}}>🎤</div>
          <div style={{padding:'10px 14px',background:'#fff',border:'1px solid #e8edf5',borderRadius:'12px 12px 12px 4px',fontSize:'.82rem',color:'var(--text-3)'}}>Moderator is thinking…</div>
        </div>}
        {listening&&liveText&&(
          <div style={{display:'flex',justifyContent:'flex-end'}}>
            <div style={{maxWidth:'85%',padding:'10px 14px',borderRadius:'16px 16px 4px 16px',background:'rgba(83,22,151,0.08)',border:'1px dashed rgba(83,22,151,0.3)',fontSize:'.82rem',color:'#531697',fontStyle:'italic'}}>
              <span style={{display:'inline-block',width:6,height:6,borderRadius:'50%',background:'#ef4444',marginRight:6,animation:'gdBlink 1s ease-in-out infinite'}}/>{liveText}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      {!done&&(
        <div style={{borderTop:'1px solid #e8edf5',paddingTop:12,marginTop:8}}>
          <div style={{display:'flex',gap:8,alignItems:'flex-end',marginBottom:6}}>
            <textarea value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend();}}}
              placeholder={listening?'🔴 Listening — speak freely, click mic or send when done…':'Share your viewpoint (click mic to speak or type here)…'}
              rows={2} disabled={loading}
              style={{flex:1,padding:'10px 14px',borderRadius:10,border:`1.5px solid ${listening?'#ef4444':'#d0d7e8'}`,fontFamily:"'Nunito',sans-serif",fontSize:'.88rem',resize:'none',outline:'none',lineHeight:1.5,transition:'border-color .2s'}}
            />
            {supported&&(
              <button onClick={listening?stopMic:startMic} disabled={loading}
                style={{width:44,height:44,borderRadius:'50%',border:'none',background:listening?'linear-gradient(135deg,#ef4444,#b91c1c)':'linear-gradient(135deg,#531697,#13a1a5)',color:'#fff',cursor:loading?'not-allowed':'pointer',fontSize:'1.1rem',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:listening?'0 0 0 5px rgba(239,68,68,0.2)':'0 3px 10px rgba(83,22,151,0.25)',animation:listening?'gdMicPulse 1.4s ease-in-out infinite':'none'}}>
                {listening?'⏹':'🎙️'}
              </button>
            )}
            <button onClick={()=>handleSend()} disabled={!input.trim()||loading}
              style={{padding:'0 18px',height:44,borderRadius:10,border:'none',background:!input.trim()||loading?'#e8edf5':'linear-gradient(135deg,#531697,#13a1a5)',color:!input.trim()||loading?'#b0bec9':'#fff',fontWeight:800,cursor:!input.trim()||loading?'not-allowed':'pointer',fontFamily:"'Nunito',sans-serif",flexShrink:0}}>
              {loading?'…':'Send ↑'}
            </button>
          </div>
          <div style={{fontSize:'.68rem',color:'#b0bec9'}}>🎙️ Click mic once → speak naturally → click mic again to send · ⌨️ Enter to send</div>
        </div>
      )}
      <style>{`
        @keyframes gdBlink    { 0%,100%{opacity:1}50%{opacity:.2} }
        @keyframes gdMicPulse { 0%,100%{box-shadow:0 0 0 5px rgba(239,68,68,0.2)}50%{box-shadow:0 0 0 12px rgba(239,68,68,0.04)} }
      `}</style>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function GDRoundPage() {
  const [tab, setTab]               = useState('rules');
  const [selectedTopic, setTopic]   = useState(null);
  const [answer, setAnswer]         = useState('');
  const [timerActive, setTimer]     = useState(false);
  const [timeDone, setTimeDone]     = useState(false);
  const [filterCat, setFilter]      = useState('All');
  const [showRes, setShowRes]       = useState(false);
  const [gdMode, setGdMode]         = useState('write'); // 'write' | 'ai-gd'

  const cats = ['All',...new Set(GD_TOPICS.map(t=>t.category))];
  const filtered = filterCat==='All' ? GD_TOPICS : GD_TOPICS.filter(t=>t.category===filterCat);

  function startPractice(topic, mode='write') {
    setTopic(topic); setAnswer(''); setTimer(false); setTimeDone(false); setGdMode(mode); setTab('practice');
  }

  const resources = ROUND_RESOURCES.GD || [];

  return (
    <div style={{fontFamily:"'Nunito',sans-serif"}}>
      <RoundHeader icon="🔵" title="Group Discussion Practice" subtitle="Practice GD strategies, AI moderator sessions, and structured responses"/>

      {/* Tabs */}
      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {[["rules","📋 Do's & Don'ts"],["topics","📝 GD Topics"],["practice","⏱️ Practice Mode"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{padding:'8px 18px',borderRadius:9,border:`1.5px solid ${tab===id?'#531697':'#d0d7e8'}`,background:tab===id?'linear-gradient(135deg,#531697,#13a1a5)':'#fff',color:tab===id?'#fff':'var(--text-3)',fontWeight:800,cursor:'pointer',fontFamily:"'Nunito',sans-serif",fontSize:'.82rem'}}>
            {label}
          </button>
        ))}
        <div style={{flex:1}}/>
        <button onClick={()=>setShowRes(r=>!r)} style={{padding:'7px 14px',borderRadius:9,border:`1.5px solid ${showRes?'#531697':'#d0d7e8'}`,background:showRes?'rgba(83,22,151,0.07)':'#fff',color:showRes?'#531697':'var(--text-3)',fontWeight:800,cursor:'pointer',fontFamily:"'Nunito',sans-serif",fontSize:'.78rem'}}>
          📚 {showRes?'Hide':'Resources'}
        </button>
      </div>

      {showRes&&(
        <div style={{background:'rgba(83,22,151,0.03)',border:'1px solid rgba(83,22,151,0.12)',borderRadius:12,padding:'14px 16px',marginBottom:16}}>
          <div style={{fontSize:'.7rem',fontWeight:800,color:'#b0bec9',marginBottom:10}}>BEST GD RESOURCES ONLINE</div>
          <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
            {resources.map((r,i)=>(
              <a key={i} href={r.url} target="_blank" rel="noreferrer" style={{padding:'5px 11px',borderRadius:7,background:`${r.color}18`,color:r.color,fontSize:'.72rem',fontWeight:800,textDecoration:'none',border:`1px solid ${r.color}30`}}>
                {r.tag} — {r.name} ↗
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Do's & Don'ts */}
      {tab==='rules'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <Card>
            <SectionTitle>✅ Do's</SectionTitle>
            {DOS_DONTS.filter(d=>d.type==='do').map((d,i)=>(
              <div key={i} style={{display:'flex',gap:8,alignItems:'flex-start',marginBottom:10}}>
                <span style={{width:20,height:20,borderRadius:'50%',background:'rgba(71,211,114,0.15)',color:'#166534',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.7rem',flexShrink:0,marginTop:1}}>✓</span>
                <span style={{fontSize:'.83rem',color:'var(--text-2)',lineHeight:1.5}}>{d.text}</span>
              </div>
            ))}
          </Card>
          <Card>
            <SectionTitle>❌ Don'ts</SectionTitle>
            {DOS_DONTS.filter(d=>d.type==='dont').map((d,i)=>(
              <div key={i} style={{display:'flex',gap:8,alignItems:'flex-start',marginBottom:10}}>
                <span style={{width:20,height:20,borderRadius:'50%',background:'rgba(239,68,68,0.1)',color:'#991b1b',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.7rem',flexShrink:0,marginTop:1}}>✗</span>
                <span style={{fontSize:'.83rem',color:'var(--text-2)',lineHeight:1.5}}>{d.text}</span>
              </div>
            ))}
          </Card>
          <Card style={{gridColumn:'1/-1',background:'rgba(83,22,151,0.03)',border:'1px solid rgba(83,22,151,0.12)'}}>
            <SectionTitle>🏆 GD Scoring Criteria</SectionTitle>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:10}}>
              {[['Communication','Clarity, fluency, vocabulary'],['Content','Relevance, depth, examples'],['Leadership','Initiating, summarizing'],['Teamwork','Listening, acknowledging others'],['Confidence','Body language, assertiveness'],['Logic','Structured, data-backed arguments']].map(([title,desc])=>(
                <div key={title} style={{padding:'10px 12px',borderRadius:10,background:'#fff',border:'1px solid #e8edf5'}}>
                  <div style={{fontWeight:800,fontSize:'.78rem',color:'#531697',marginBottom:3}}>{title}</div>
                  <div style={{fontSize:'.72rem',color:'var(--text-3)'}}>{desc}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Topics */}
      {tab==='topics'&&(
        <div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
            {cats.map(c=>(
              <button key={c} onClick={()=>setFilter(c)}
                style={{padding:'5px 12px',borderRadius:999,border:`1px solid ${filterCat===c?'#531697':'#d0d7e8'}`,background:filterCat===c?'rgba(83,22,151,0.08)':'#fff',color:filterCat===c?'#531697':'var(--text-3)',fontWeight:700,fontSize:'.75rem',cursor:'pointer',fontFamily:"'Nunito',sans-serif"}}>
                {c}
              </button>
            ))}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {filtered.map((t,i)=>(
              <Card key={i} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 18px'}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:'.9rem',color:'var(--text)',marginBottom:5}}>{t.topic}</div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:6}}>
                    <span style={{padding:'2px 8px',borderRadius:999,background:'rgba(83,22,151,0.07)',color:'#531697',fontSize:'.68rem',fontWeight:700}}>{t.category}</span>
                    <span style={{padding:'2px 8px',borderRadius:999,background:t.difficulty==='Easy'?'rgba(71,211,114,0.1)':t.difficulty==='Hard'?'rgba(239,68,68,0.1)':'rgba(245,158,11,0.1)',color:t.difficulty==='Easy'?'#166534':t.difficulty==='Hard'?'#991b1b':'#92400e',fontSize:'.68rem',fontWeight:700}}>{t.difficulty}</span>
                  </div>
                  <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                    {t.keyPoints.map(kp=><span key={kp} style={{padding:'1px 6px',borderRadius:5,background:'#f0f3fa',color:'var(--text-3)',fontSize:'.65rem'}}>{kp}</span>)}
                  </div>
                </div>
                <div style={{display:'flex',gap:8,flexShrink:0}}>
                  <button onClick={()=>startPractice(t,'write')} style={{padding:'8px 14px',borderRadius:9,border:'1px solid #531697',background:'transparent',color:'#531697',fontWeight:800,cursor:'pointer',fontFamily:"'Nunito',sans-serif",fontSize:'.75rem'}}>✍️ Write</button>
                  <button onClick={()=>startPractice(t,'ai-gd')} style={{padding:'8px 14px',borderRadius:9,border:'none',background:'linear-gradient(135deg,#531697,#13a1a5)',color:'#fff',fontWeight:800,cursor:'pointer',fontFamily:"'Nunito',sans-serif",fontSize:'.75rem'}}>🤖 AI GD →</button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Practice Mode */}
      {tab==='practice'&&(
        <div>
          {!selectedTopic?(
            <Card style={{textAlign:'center',padding:'40px 20px'}}>
              <div style={{fontSize:'2.5rem',marginBottom:12}}>💬</div>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'1rem',color:'var(--text)',marginBottom:6}}>No topic selected</div>
              <div style={{color:'var(--text-3)',fontSize:'.84rem',marginBottom:16}}>Go to GD Topics and click "Write" or "AI GD"</div>
              <button onClick={()=>setTab('topics')} style={{padding:'10px 24px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#531697,#13a1a5)',color:'#fff',fontWeight:800,cursor:'pointer',fontFamily:"'Nunito',sans-serif"}}>Browse Topics →</button>
            </Card>
          ):(
            <div>
              {/* Mode switcher */}
              <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
                {[['write','✍️ Write Mode'],['ai-gd','🤖 AI GD Simulator']].map(([m,label])=>(
                  <button key={m} onClick={()=>setGdMode(m)} style={{padding:'8px 16px',borderRadius:9,border:`1.5px solid ${gdMode===m?'#531697':'#d0d7e8'}`,background:gdMode===m?'linear-gradient(135deg,#531697,#13a1a5)':'#fff',color:gdMode===m?'#fff':'var(--text-3)',fontWeight:800,cursor:'pointer',fontFamily:"'Nunito',sans-serif",fontSize:'.8rem'}}>
                    {label}
                  </button>
                ))}
                <button onClick={()=>{setTopic(null);setTimer(false);}} style={{marginLeft:'auto',padding:'8px 14px',borderRadius:9,border:'1px solid #d0d7e8',background:'#fff',color:'var(--text-3)',fontWeight:700,cursor:'pointer',fontFamily:"'Nunito',sans-serif",fontSize:'.78rem'}}>Change Topic</button>
              </div>

              {/* Topic header */}
              <Card style={{marginBottom:16,background:'linear-gradient(135deg,rgba(83,22,151,0.04),rgba(19,161,165,0.04))',border:'1.5px solid rgba(83,22,151,0.15)'}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'1rem',color:'var(--text)',marginBottom:4}}>📌 GD Topic</div>
                <div style={{fontSize:'.95rem',color:'#531697',fontWeight:700}}>{selectedTopic.topic}</div>
                <div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>
                  <span style={{padding:'2px 8px',borderRadius:999,background:'rgba(83,22,151,0.07)',color:'#531697',fontSize:'.68rem',fontWeight:700}}>{selectedTopic.category}</span>
                  <span style={{padding:'2px 8px',borderRadius:999,background:selectedTopic.difficulty==='Easy'?'rgba(71,211,114,0.1)':selectedTopic.difficulty==='Hard'?'rgba(239,68,68,0.1)':'rgba(245,158,11,0.1)',color:selectedTopic.difficulty==='Easy'?'#166534':selectedTopic.difficulty==='Hard'?'#991b1b':'#92400e',fontSize:'.68rem',fontWeight:700}}>{selectedTopic.difficulty}</span>
                </div>
              </Card>

              {/* Write Mode */}
              {gdMode==='write'&&(
                <div>
                  <Card style={{marginBottom:16}}>
                    <div style={{display:'flex',gap:8,marginBottom:14}}>
                      {!timerActive&&!timeDone&&<button onClick={()=>setTimer(true)} style={{padding:'8px 18px',borderRadius:9,border:'none',background:'#13a1a5',color:'#fff',fontWeight:800,cursor:'pointer',fontFamily:"'Nunito',sans-serif",fontSize:'.82rem'}}>⏱️ Start 2-min Timer</button>}
                      {timeDone&&<span style={{padding:'8px 14px',borderRadius:9,background:'rgba(239,68,68,0.1)',color:'#991b1b',fontWeight:800,fontSize:'.82rem'}}>⏰ Time's up!</span>}
                    </div>
                    {timerActive&&!timeDone&&<Timer seconds={120} onDone={()=>setTimeDone(true)}/>}
                    <SectionTitle>✍️ Your Response</SectionTitle>
                    <AnswerBox value={answer} onChange={setAnswer} placeholder="Structure: Introduction → Your stance → Supporting arguments → Counter-argument → Conclusion…" rows={8}/>
                  </Card>
                  <Card style={{marginBottom:16,background:'rgba(83,22,151,0.03)',border:'1px solid rgba(83,22,151,0.1)'}}>
                    <SectionTitle>💡 Key Points to Cover</SectionTitle>
                    <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                      {selectedTopic.keyPoints.map(kp=>{
                        const covered = answer.toLowerCase().includes(kp.toLowerCase());
                        return <span key={kp} style={{padding:'4px 10px',borderRadius:999,fontSize:'.75rem',fontWeight:700,background:covered?'rgba(71,211,114,0.12)':'#f0f3fa',color:covered?'#166534':'var(--text-3)',border:`1px solid ${covered?'rgba(71,211,114,0.3)':'#e8edf5'}`,transition:'all .3s'}}>{covered?'✅ ':''}{kp}</span>;
                      })}
                    </div>
                  </Card>
                </div>
              )}

              {/* AI GD Mode */}
              {gdMode==='ai-gd'&&(
                <Card><AIGDSimulator key={selectedTopic.topic} topic={selectedTopic}/></Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
