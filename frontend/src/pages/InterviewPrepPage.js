/**
 * InterviewPrepPage v5.0 — Timed AI Interviewer (Adaptive Questions)
 *
 * Changes from v4:
 *  - Duration selector (5 / 10 / 15 / 20 / 30 min) replaces fixed 8-question limit
 *  - Number of questions is fully adaptive — AI keeps asking until time runs out
 *  - Countdown timer visible during interview; auto-ends when time expires
 *  - All other features preserved: voice TTS, voice STT, webcam, scoring, etc.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tk  = () => ({ Authorization: `Bearer ${localStorage.getItem('pragati_token')}` });

// ─── Continuous STT ───────────────────────────────────────────────────────────
function useContinuousSTT({ lang='en-IN', silenceMs=2500, onPartial, onFinal, onError }={}) {
  const [listening, setListening] = useState(false);
  const [supported] = useState(!!(window.SpeechRecognition||window.webkitSpeechRecognition));
  const recRef=useRef(null), finalRef=useRef(''), silRef=useRef(null), activeRef=useRef(false);
  const onFinalRef=useRef(onFinal), onPartialRef=useRef(onPartial);
  useEffect(()=>{onFinalRef.current=onFinal;},[onFinal]);
  useEffect(()=>{onPartialRef.current=onPartial;},[onPartial]);

  const armSil=useCallback(()=>{
    clearTimeout(silRef.current);
    silRef.current=setTimeout(()=>{ const t=finalRef.current.trim(); if(t)onFinalRef.current?.(t); },silenceMs);
  },[silenceMs]);

  const startSess=useCallback(()=>{
    if(!activeRef.current)return;
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition; if(!SR)return;
    try{recRef.current?.abort();}catch{}
    const r=new SR(); r.continuous=true; r.interimResults=true; r.lang=lang; r.maxAlternatives=1;
    recRef.current=r;
    r.onstart=()=>setListening(true);
    r.onresult=e=>{
      let nf='',int='';
      for(let i=e.resultIndex;i<e.results.length;i++){
        const c=e.results[i][0].transcript;
        if(e.results[i].isFinal)nf+=c+' '; else int=c;
      }
      if(nf){finalRef.current+=nf;armSil();}
      onPartialRef.current?.((finalRef.current+int).trim());
    };
    r.onerror=e=>{if(e.error==='not-allowed'){activeRef.current=false;setListening(false);onError?.('Microphone permission denied.');}};
    r.onend=()=>{if(activeRef.current)setTimeout(startSess,200);else setListening(false);};
    try{r.start();}catch{}
  },[lang,armSil,onError]);

  const start=useCallback(()=>{
    if(!supported)return; finalRef.current=''; clearTimeout(silRef.current); activeRef.current=true; startSess();
  },[supported,startSess]);

  const stop=useCallback(()=>{
    activeRef.current=false; clearTimeout(silRef.current); try{recRef.current?.stop();}catch{} setListening(false);
    const t=finalRef.current.trim(); finalRef.current=''; return t;
  },[]);

  useEffect(()=>()=>{activeRef.current=false;clearTimeout(silRef.current);try{recRef.current?.abort();}catch{};},[]);
  return {listening,supported,start,stop};
}

// ─── Answer scoring ───────────────────────────────────────────────────────────
const FILLERS=['um','uh','like','you know','basically','actually','literally','sort of','kind of','right so','okay so','i mean'];
function scoreAnswer(text,secs){
  const words=text.trim().split(/\s+/).filter(Boolean).length;
  const fCount=FILLERS.reduce((n,w)=>n+(text.toLowerCase().split(w).length-1),0);
  const wpm=secs>2?Math.round((words/secs)*60):0;
  const hasEg=/example|project|experience|built|worked|implemented|used|developed/i.test(text);
  const hasStar=/(situation|task|action|result)/i.test(text);
  let s=45;
  if(words>=80)s+=20;else if(words>=40)s+=10;else if(words<15)s-=20;
  if(fCount<=1)s+=10;else if(fCount>5)s-=12;
  if(wpm>=90&&wpm<=165)s+=8;else if(wpm>200||(wpm>0&&wpm<55))s-=8;
  if(hasEg)s+=10; if(hasStar)s+=7;
  s=Math.max(10,Math.min(100,s));
  return {score:s,words,fCount,wpm,hasEg,hasStar,
    clarity:s>=78?'Excellent':s>=58?'Good':s>=38?'Fair':'Needs Work',
    pace:wpm>185?'Too Fast':wpm>0&&wpm<65?'Too Slow':'Good'};
}

// ─── Tech detection + drilldowns ─────────────────────────────────────────────
const TECH_KW={
  react:['react','jsx','hook','usestate','useeffect','redux','context api','next.js','nextjs'],
  java:['java','spring','springboot','hibernate','jvm','maven','gradle','multithreading'],
  python:['python','django','flask','fastapi','pandas','numpy','tensorflow','pytorch'],
  nodejs:['node','express','nodejs','nestjs','typescript','javascript backend'],
  database:['sql','mysql','postgres','mongodb','database','nosql','redis','orm','schema'],
  cloud:['aws','azure','gcp','docker','kubernetes','ci/cd','devops','terraform'],
  ml:['machine learning','deep learning','neural','nlp','model training','classification'],
  sysdesign:['system design','scalab','load balanc','cache','cdn','kafka','sharding'],
};
function detectTech(msgs){
  const text=msgs.filter(m=>m.role==='user').map(m=>m.content).join(' ').toLowerCase();
  return Object.entries(TECH_KW).filter(([,kws])=>kws.some(k=>text.includes(k))).map(([t])=>t);
}
const DRILLS={
  react:["Walk me through how React's reconciliation algorithm decides what to re-render. How does virtual DOM diffing work?","Explain useCallback vs useMemo with a real scenario where each prevents a performance issue.","How do you prevent unnecessary re-renders? Give 3 techniques with their trade-offs."],
  java:["How does the JVM garbage collector work? Difference between young generation and old generation?","Explain synchronized vs volatile vs AtomicInteger in Java concurrency — when do you use each?","Walk me through @Component, @Service, and @Repository in Spring — does the choice actually matter?"],
  python:["Explain Python's GIL. How do you achieve real parallelism in Python despite it?","Difference between a generator and list comprehension? Give a real scenario where you'd choose one.","How does Python memory management work? Explain reference counting and cyclic garbage collection."],
  nodejs:["How does Node.js handle thousands of concurrent connections with a single thread? Explain the event loop.","What's the difference between process.nextTick(), setImmediate(), and setTimeout(0)?","How do you handle CPU-intensive tasks in Node.js without blocking the event loop?"],
  database:["Explain clustered vs non-clustered index. When would adding an index actually hurt performance?","What is the N+1 query problem and how do you detect and fix it?","Explain ACID properties — how does a database ensure atomicity during a crash?"],
  cloud:["How do you handle zero-downtime deployments in Kubernetes? Walk me through your strategy.","Horizontal vs vertical scaling — when does horizontal scaling break down for stateful services?","How do you manage secrets in a containerized production environment?"],
  ml:["How do you handle class imbalance? Trade-offs between oversampling and undersampling?","Explain the bias-variance tradeoff. How do you diagnose which is causing underperformance?","What's the difference between L1 and L2 regularization and how do they affect your model?"],
  sysdesign:["Design a URL shortener like bit.ly for 100 million daily requests. Walk me through the key components.","How would you design a notification system delivering 1 million push notifications per minute?","Explain consistent hashing — why is it used in distributed cache clusters?"],
};
const HR_QS=["Tell me about a time you strongly disagreed with your team's decision. How did you handle it?","Describe a situation where you had to deliver bad news to a stakeholder.","Give an example of when you took initiative on something outside your responsibilities.","Tell me about your biggest professional failure. What did you learn and do differently?","Describe a time you had to work under extreme pressure with a tight deadline.","How do you handle critical feedback you disagree with? Give a real example.","Tell me about a time you had to influence someone without having formal authority."];
const GENERIC_Q=["Walk me through the most challenging technical problem you've solved and how you debugged it.","How do you ensure code quality when working under a tight deadline?","Describe a project where you made a significant architectural decision. What alternatives did you consider?","How do you approach learning a new technology you've never used before?","Tell me about a time a production issue occurred. What was your debugging approach?"];

async function getDynamicNext({msgs,answer,qNum,isLast,role,type}){
  const techs=detectTech(msgs);
  const history=msgs.slice(-6).map(m=>`${m.role==='user'?'Candidate':'Interviewer'}: ${m.content}`).join('\n');
  const techCtx=techs.length?`\nDetected technologies: ${techs.join(', ')}`:'';

  const prompt=`You are an expert ${type||'technical'} interviewer at a top Indian tech company interviewing for ${role}.${techCtx}

Recent conversation:
${history}

Candidate just answered: "${answer}"

1. Give 2 sentences of SPECIFIC constructive feedback (what was good + one concrete improvement)
2. ${isLast?'Congratulate them warmly and give a 2-sentence overall performance summary.':`Generate ONE sharp follow-up question that DIRECTLY builds on what they just said:
   - If they mentioned a specific tech → probe deeper into THAT technology
   - Vague answer (under 30 words, no examples) → ask for a concrete project example
   - Strong answer → push with an edge case or failure scenario
   - HR type → behavioral STAR follow-up
   - NEVER repeat a previous question`}

Return ONLY valid JSON:
{"feedback":"...","nextQuestion":${isLast?'null':'"..."'},"confidence":7,"keyMissing":"one missing thing or empty string"}`;

  try{
    const res=await fetch(`${API}/skillpath/dynamic-interview`,{method:'POST',headers:{...tk(),'Content-Type':'application/json'},body:JSON.stringify({prompt,targetRole:role,interviewType:type,lastAnswer:answer,isLast:isLast||false})});
    if(!res.ok)throw new Error();
    const d=await res.json(); if(d?.feedback)return d; throw new Error();
  }catch{return localFallback(answer,techs,qNum,type,isLast);}
}

function localFallback(answer,techs,qNum,type,isLast){
  const hasEg=/example|project|built|used|worked/i.test(answer);
  const words = answer.trim().split(/\s+/).filter(Boolean).length;
  const isWeak=words<30||!hasEg;
  if(isLast)return{feedback:'Good effort overall! Focus on adding concrete project examples and STAR format for stronger answers.',nextQuestion:null,confidence:7,keyMissing:''};
  for(const tech of techs){if(DRILLS[tech])return{feedback:`Good ${tech} mention.${!hasEg?' Tie it to a specific project next time.':''}`,nextQuestion:DRILLS[tech][qNum%DRILLS[tech].length],confidence:7,keyMissing:hasEg?'':'Project reference'};}
  if(isWeak)return{feedback:'Brief answer — use the STAR format and mention a real project.',nextQuestion:'Can you give a specific example from one of your projects that illustrates that?',confidence:4,keyMissing:'STAR example'};
  if(type==='HR')return{feedback:`${hasEg?'Good behavioral answer.':'Add a real situation next time.'}`,nextQuestion:HR_QS[qNum%HR_QS.length],confidence:7,keyMissing:''};
  return{feedback:`${words>=60?'Good depth.':'Try to elaborate more.'} ${hasEg?'':'Mention a real project.'}`,nextQuestion:GENERIC_Q[qNum%GENERIC_Q.length],confidence:6,keyMissing:hasEg?'':'Project example'};
}

// ─── Personas ─────────────────────────────────────────────────────────────────
const PERSONAS={
  Technical: {name:'Arjun Sharma',  title:'Senior Engineer',     company:'TechSphere', color:'#531697'},
  HR:        {name:'Priya Mehta',   title:'HR Manager',          company:'InnoSoft',   color:'#13a1a5'},
  Managerial:{name:'Vikram Nair',   title:'Engineering Manager', company:'BuildScale', color:'#47d372'},
};

// ─── AI Avatar — animated SVG face ───────────────────────────────────────────
function AIAvatar({isSpeaking,isThinking,isListening,persona,size=132}){
  const [blinkOpen,setBlinkOpen]=useState(true);
  const [mouthOpen,setMouthOpen]=useState(0);
  const [gaze,setGaze]=useState({x:0,y:0});
  const [browRaise,setBrowRaise]=useState(0);

  useEffect(()=>{
    let t; const blink=()=>{setBlinkOpen(false);setTimeout(()=>setBlinkOpen(true),130);t=setTimeout(blink,3000+Math.random()*2500);};
    t=setTimeout(blink,2000); return()=>clearTimeout(t);
  },[]);

  useEffect(()=>{
    if(!isSpeaking){setMouthOpen(0);return;}
    let a; const tick=()=>{setMouthOpen(0.25+Math.random()*0.75);a=setTimeout(tick,65+Math.random()*110);}; tick(); return()=>clearTimeout(a);
  },[isSpeaking]);

  useEffect(()=>{
    if(!isThinking){setBrowRaise(0);return;}
    const t=setInterval(()=>setBrowRaise(v=>v===0?3:0),600); return()=>clearInterval(t);
  },[isThinking]);

  useEffect(()=>{
    const t=setInterval(()=>setGaze({x:(Math.random()-.5)*5,y:(Math.random()-.5)*3}),2800+Math.random()*2000);
    return()=>clearInterval(t);
  },[]);

  const eyeRY=blinkOpen?8:1, mCY=70+mouthOpen*9, col=persona?.color||'#531697';

  return(
    <div style={{position:'relative',width:size,height:size,flexShrink:0}}>
      <div style={{position:'absolute',inset:-8,borderRadius:'50%',
        background:isSpeaking?`conic-gradient(from 0deg,${col},#13a1a5,#47d372,${col})`:isListening?'conic-gradient(from 0deg,#13a1a5,#47d372,#13a1a5)':isThinking?'conic-gradient(from 0deg,#f59e0b,#ef4444,#f59e0b)':`conic-gradient(from 0deg,${col},rgba(255,255,255,0.08),${col})`,
        animation:isSpeaking||isListening||isThinking?'avSpin 1.8s linear infinite':'avPulse 3.5s ease-in-out infinite',opacity:.9}}/>
      <div style={{position:'absolute',inset:8,borderRadius:'50%',background:'linear-gradient(145deg,#1c2b42,#0f1a2e)',border:`2px solid ${col}44`,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <svg width={size-16} height={size-16} viewBox="0 0 110 110" style={{animation:'breathe 3.8s ease-in-out infinite'}}>
          <ellipse cx="55" cy="60" rx="37" ry="42" fill="url(#sk)"/>
          <ellipse cx="19" cy="62" rx="6" ry="9" fill="url(#sk)"/>
          <ellipse cx="91" cy="62" rx="6" ry="9" fill="url(#sk)"/>
          <ellipse cx="55" cy="24" rx="37" ry="22" fill="url(#hr)"/>
          <rect x="18" y="18" width="74" height="14" fill="url(#hr)" rx="3"/>
          <path d={`M${32+gaze.x},${43-browRaise+gaze.y} Q${38+gaze.x},${39-browRaise+gaze.y} ${44+gaze.x},${43-browRaise+gaze.y}`} stroke="url(#br)" strokeWidth="2.8" strokeLinecap="round" fill="none"/>
          <path d={`M${66+gaze.x},${43-browRaise+gaze.y} Q${72+gaze.x},${39-browRaise+gaze.y} ${78+gaze.x},${43-browRaise+gaze.y}`} stroke="url(#br)" strokeWidth="2.8" strokeLinecap="round" fill="none"/>
          <ellipse cx={38+gaze.x} cy={53+gaze.y} rx="7.5" ry={eyeRY} fill="white"/>
          <ellipse cx={72+gaze.x} cy={53+gaze.y} rx="7.5" ry={eyeRY} fill="white"/>
          {blinkOpen&&<><ellipse cx={38+gaze.x} cy={53+gaze.y} rx="4.8" ry="5.5" fill="#16103a"/><ellipse cx={72+gaze.x} cy={53+gaze.y} rx="4.8" ry="5.5" fill="#16103a"/><ellipse cx={39.5+gaze.x} cy={51.2+gaze.y} rx="1.6" ry="1.8" fill="white" opacity=".85"/><ellipse cx={73.5+gaze.x} cy={51.2+gaze.y} rx="1.6" ry="1.8" fill="white" opacity=".85"/></>}
          <path d="M52,64 Q55,71 58,64" stroke="rgba(0,0,0,0.18)" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
          <path d={`M43,${69-mouthOpen*2} Q55,${mCY} 67,${69-mouthOpen*2}`} stroke="url(#lp)" strokeWidth="2.4" strokeLinecap="round" fill="none"/>
          {mouthOpen>0.35&&<ellipse cx="55" cy={70+mouthOpen*4} rx={10*mouthOpen} ry={5.5*mouthOpen} fill="rgba(0,0,0,0.55)"/>}
          <circle cx="88" cy="24" r="5.5" fill={isSpeaking?'#47d372':isListening?'#13a1a5':isThinking?'#f59e0b':col} style={{filter:'drop-shadow(0 0 4px currentColor)'}}/>
          <defs>
            <radialGradient id="sk" cx="38%" cy="32%" r="70%"><stop offset="0%" stopColor="#f8c9a6"/><stop offset="100%" stopColor="#d4976e"/></radialGradient>
            <linearGradient id="hr" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#2d1b4e"/><stop offset="100%" stopColor="#180f2e"/></linearGradient>
            <linearGradient id="br" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#5c3a1e"/><stop offset="100%" stopColor="#3b2010"/></linearGradient>
            <linearGradient id="lp" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#c87870"/><stop offset="100%" stopColor="#a05550"/></linearGradient>
          </defs>
        </svg>
        {isThinking&&<div style={{position:'absolute',bottom:8,display:'flex',gap:5}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:'50%',background:'#f59e0b',animation:`thinkB 1.2s ease-in-out ${i*0.2}s infinite`}}/>)}</div>}
      </div>
      {isSpeaking&&[1,2,3].map(i=><div key={i} style={{position:'absolute',inset:-(i*13),borderRadius:'50%',border:`1.5px solid ${col}44`,animation:`sndRing 1.6s ease-out ${i*0.32}s infinite`,pointerEvents:'none'}}/>)}
      {isListening&&[1,2].map(i=><div key={i} style={{position:'absolute',inset:-(i*12),borderRadius:'50%',border:'1.5px solid rgba(19,161,165,0.5)',animation:`sndRing 1.3s ease-out ${i*0.3}s infinite`,pointerEvents:'none'}}/>)}
    </div>
  );
}

// ─── Webcam panel ─────────────────────────────────────────────────────────────
function WebcamPanel({enabled,onToggle}){
  const videoRef=useRef(null);
  const streamRef=useRef(null);

  useEffect(()=>{
    if(!enabled){
      if(streamRef.current){streamRef.current.getTracks().forEach(t=>t.stop());streamRef.current=null;}
      if(videoRef.current)videoRef.current.srcObject=null;
      return;
    }
    navigator.mediaDevices.getUserMedia({video:{width:320,height:240,facingMode:'user'},audio:false})
      .then(stream=>{streamRef.current=stream;if(videoRef.current){videoRef.current.srcObject=stream;videoRef.current.play();}})
      .catch(()=>onToggle(false));
    return()=>{if(streamRef.current){streamRef.current.getTracks().forEach(t=>t.stop());}};
  },[enabled,onToggle]);

  return(
    <div style={{position:'relative',borderRadius:12,overflow:'hidden',background:'#0f1a2e',border:'2px solid rgba(83,22,151,0.3)',flexShrink:0}}>
      {enabled?(
        <>
          <video ref={videoRef} muted playsInline autoPlay style={{width:220,height:160,objectFit:'cover',display:'block',transform:'scaleX(-1)'}}/>
          <div style={{position:'absolute',bottom:6,left:6,display:'flex',gap:4,alignItems:'center'}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:'#47d372',animation:'blink .8s ease-in-out infinite'}}/>
            <span style={{fontSize:'.58rem',color:'rgba(255,255,255,0.8)',fontWeight:700}}>Camera On</span>
          </div>
          <button onClick={()=>onToggle(false)} style={{position:'absolute',top:5,right:5,width:22,height:22,borderRadius:'50%',background:'rgba(0,0,0,0.5)',border:'none',color:'#fff',fontSize:'.7rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </>
      ):(
        <button onClick={()=>onToggle(true)} style={{width:220,height:160,background:'rgba(83,22,151,0.08)',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,fontFamily:"'Nunito',sans-serif"}}>
          <span style={{fontSize:'1.8rem'}}>📷</span>
          <span style={{fontSize:'.72rem',color:'#531697',fontWeight:800}}>Enable Camera</span>
          <span style={{fontSize:'.62rem',color:'#7a8ba8',maxWidth:150,textAlign:'center',lineHeight:1.4}}>See yourself like a real interview. No recording — local only.</span>
        </button>
      )}
    </div>
  );
}

// ─── Score Panel ──────────────────────────────────────────────────────────────
function ScorePanel({m}){
  if(!m)return null;
  const col=m.score>=75?'#166534':m.score>=50?'#92400e':'#991b1b';
  const bar=m.score>=75?'#47d372':m.score>=50?'#f59e0b':'#ef4444';
  return(
    <div style={{padding:'10px 16px',borderRadius:11,background:`${col}0d`,border:`1px solid ${col}20`,marginTop:10}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8,flexWrap:'wrap'}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:'1.2rem',color:col}}>{m.score}<span style={{fontSize:'.6rem',fontWeight:700}}>/100</span></div>
        <div style={{flex:1,height:5,background:'#e8edf5',borderRadius:999,minWidth:60}}><div style={{width:`${m.score}%`,height:'100%',borderRadius:999,background:bar,transition:'width .7s ease'}}/></div>
        <span style={{fontSize:'.7rem',fontWeight:800,color:col}}>{m.clarity}</span>
      </div>
      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
        {[['📝','Words',m.words,m.words>=50?'#166534':'#92400e'],['💬','Fillers',m.fCount,m.fCount<=2?'#166534':'#991b1b'],['⚡','Pace',m.wpm>0?`${m.wpm}wpm`:'—',m.pace==='Good'?'#166534':'#92400e'],['📖','Example',m.hasEg?'Yes ✓':'Missing',m.hasEg?'#166534':'#991b1b'],['⭐','STAR',m.hasStar?'Yes ✓':'No',m.hasStar?'#166534':'#7a8ba8']].map(([ic,label,val,c])=>(
          <div key={label} style={{display:'flex',alignItems:'center',gap:3,fontSize:'.7rem'}}>
            <span>{ic}</span><span style={{color:'#7a8ba8'}}>{label}:</span><strong style={{color:c}}>{val}</strong>
          </div>
        ))}
      </div>
      {!m.hasEg&&<div style={{marginTop:5,fontSize:'.7rem',color:'#92400e'}}>💡 Mention a project/experience to score higher</div>}
      {m.fCount>4&&<div style={{marginTop:3,fontSize:'.7rem',color:'#991b1b'}}>⚠️ Reduce filler words: "um", "uh", "like", "basically"…</div>}
    </div>
  );
}

// ─── Duration options ─────────────────────────────────────────────────────────
const DURATION_OPTIONS=[
  {label:'5 min',  secs:5*60},
  {label:'10 min', secs:10*60},
  {label:'15 min', secs:15*60},
  {label:'20 min', secs:20*60},
  {label:'30 min', secs:30*60},
];

function formatTime(s){
  const m=Math.floor(s/60), r=s%60;
  return `${m}:${String(r).padStart(2,'0')}`;
}

// ─── Mock Interview ───────────────────────────────────────────────────────────
function MockInterview({targetRole,interviewType,userName,onEnd}){
  const persona=PERSONAS[interviewType]||PERSONAS.Technical;
  // Duration selection before interview starts
  const [selectedDuration,setSelectedDuration]=useState(null); // null = not started
  const [timeLeft,setTimeLeft]=useState(0);
  const timerRef=useRef(null);

  const [msgs,setMsgs]=useState([]);
  const [input,setInput]=useState('');
  const [loading,setLoading]=useState(false);
  const [ready,setReady]=useState(false);
  const [qNum,setQNum]=useState(0);
  const [metrics,setMetrics]=useState(null);
  const [scores,setScores]=useState([]);
  const [ansStart,setAnsStart]=useState(null);
  const [aiSpeaking,setAiSpeaking]=useState(false);
  const [done,setDone]=useState(false);
  const [liveText,setLiveText]=useState('');
  const [camEnabled,setCamEnabled]=useState(false);
  const [ttsEnabled,setTtsEnabled]=useState(true);
  const bottomRef=useRef(null);
  const sendRef=useRef(null);
  const doneRef=useRef(false);

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'});},[msgs,liveText]);

  // ── Countdown timer ──────────────────────────────────────────────────────
  useEffect(()=>{
    if(!selectedDuration||done)return;
    timerRef.current=setInterval(()=>{
      setTimeLeft(t=>{
        if(t<=1){
          clearInterval(timerRef.current);
          // Trigger end via ref so no stale closure issues
          if(!doneRef.current){
            doneRef.current=true;
            // End interview gracefully
            setDone(true);
            window.speechSynthesis?.cancel();
            setAiSpeaking(false);
            setMsgs(prev=>[...prev,{role:'ai',content:"⏱️ Time's up! Great effort. Your interview session has ended. Check your results below."}]);
          }
          return 0;
        }
        return t-1;
      });
    },1000);
    return()=>clearInterval(timerRef.current);
  // eslint-disable-next-line
  },[selectedDuration,done]);

  // TTS — speaks every interviewer message aloud
  const speak=useCallback((text)=>{
    if(!ttsEnabled||!text?.trim()||!window.speechSynthesis)return;
    window.speechSynthesis.cancel();
    const utt=new SpeechSynthesisUtterance(text);
    utt.rate=0.91; utt.pitch=1.05; utt.volume=1; utt.lang='en-IN';
    const pick=()=>{
      const vv=window.speechSynthesis.getVoices();
      return vv.find(v=>v.name.includes('Google')&&v.lang==='en-IN')
          ||vv.find(v=>v.lang.startsWith('en-IN'))
          ||vv.find(v=>v.lang.startsWith('en')&&!v.localService)
          ||vv.find(v=>v.lang.startsWith('en'))||vv[0];
    };
    utt.onstart=()=>setAiSpeaking(true);
    utt.onend=()=>setAiSpeaking(false);
    utt.onerror=()=>setAiSpeaking(false);
    // Chrome fix: resume if paused when tab hidden
    const keepAlive=setInterval(()=>{if(window.speechSynthesis.paused)window.speechSynthesis.resume();},5000);
    utt.onend=()=>{clearInterval(keepAlive);setAiSpeaking(false);};
    if(!window.speechSynthesis.getVoices().length){
      window.speechSynthesis.onvoiceschanged=()=>{window.speechSynthesis.onvoiceschanged=null;utt.voice=pick();window.speechSynthesis.speak(utt);};
    }else{utt.voice=pick();window.speechSynthesis.speak(utt);}
  },[ttsEnabled]);

  const {listening,supported,start:startMic,stop:stopMic}=useContinuousSTT({
    lang:'en-IN',silenceMs:2500,
    onPartial:t=>{setLiveText(t);if(!ansStart)setAnsStart(Date.now());},
    onFinal:t=>{if(t.trim())sendRef.current?.(t.trim());},
  });

  // Init — fires when student picks a duration
  useEffect(()=>{
    if(!selectedDuration)return;
    doneRef.current=false;
    setTimeLeft(selectedDuration.secs);
    const openQ=interviewType==='HR'
      ?"Tell me about yourself — your background, education, and what motivated you to pursue this career path."
      :"Let's start with a quick introduction. Walk me through your technical background, the projects you've built, and the technologies you're most comfortable with.";
    setTimeout(()=>{
      const greeting=`Hello ${userName?.split(' ')[0]||'there'}! I'm ${persona.name}, ${persona.title} at ${persona.company}.\n\nI'll be conducting your ${interviewType} interview for the ${targetRole} role. You have ${selectedDuration.label} — I'll keep asking questions until time runs out. The better your answers, the deeper we go!\n\n🎙️ Click the mic to speak hands-free — auto-sends after 2.5s silence.\n📷 Enable your camera for a real interview feel.\n\n❓ Question 1:\n\n${openQ}`;
      setMsgs([{role:'ai',content:greeting}]);
      setReady(true);
      setAnsStart(Date.now());
      speak(openQ);
    },400);
  // eslint-disable-next-line
  },[selectedDuration]);

  const sendAnswer=useCallback(async(textOverride)=>{
    const text=(textOverride!==undefined?textOverride:input).trim();
    if(!text||loading||done)return;
    const secs=ansStart?(Date.now()-ansStart)/1000:0;
    const m=scoreAnswer(text,secs);
    setMetrics(m); setScores(prev=>[...prev,m.score]);
    setLiveText(''); setInput('');
    if(listening)stopMic();
    window.speechSynthesis?.cancel(); setAiSpeaking(false);
    const updatedMsgs=[...msgs,{role:'user',content:text}];
    setMsgs(updatedMsgs); setLoading(true);
    setMsgs(p=>[...p,{role:'ai',content:'',loading:true}]);
    setAnsStart(null);
    const newQNum=qNum+1; setQNum(newQNum);
    // isLast = timer already ran out while student was answering
    const isLast=doneRef.current;
    try{
      const result=await getDynamicNext({msgs:updatedMsgs,answer:text,qNum:newQNum,isLast,role:targetRole,type:interviewType});
      let reply=result.feedback||'Good answer!';
      if(result.keyMissing)reply+=`\n\n💡 Tip: Consider mentioning — ${result.keyMissing}`;
      if(isLast||!result.nextQuestion){
        const allScores=[...scores,m.score];
        const avg=Math.round(allScores.reduce((a,b)=>a+b,0)/allScores.length);
        reply+=`\n\n🎉 Interview complete! Your average score: ${avg}/100. Well done — keep practicing and you'll ace the real thing!`;
        doneRef.current=true; setDone(true);
        speak(result.feedback||'Well done on completing the interview!');
      }else{
        reply+=`\n\n❓ Question ${newQNum+1}:\n\n${result.nextQuestion}`;
        setAnsStart(Date.now());
        speak(result.nextQuestion);
      }
      setMsgs(pp=>pp.map((msg,i)=>i===pp.length-1?{role:'ai',content:reply}:msg));
    }catch{
      setMsgs(pp=>pp.map((msg,i)=>i===pp.length-1?{role:'ai',content:'Good effort! Keep adding concrete project examples.'}:msg));
    }finally{setLoading(false);}
  },[input,loading,done,msgs,qNum,targetRole,interviewType,listening,stopMic,speak,ansStart,scores]);

  useEffect(()=>{sendRef.current=sendAnswer;},[sendAnswer]);

  const avgScore=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):null;

  // ── Duration Selection Screen ───────────────────────────────────────────
  if(!selectedDuration){
    return(
      <div style={{fontFamily:"'Nunito',sans-serif",background:'#fff',borderRadius:16,overflow:'hidden',border:'1px solid #e8edf5',boxShadow:'0 6px 28px rgba(4,44,93,0.1)'}}>
        <div style={{background:'linear-gradient(135deg,#042c5d 0%,#1a0d3e 45%,#0c3240 100%)',padding:'32px 28px',textAlign:'center'}}>
          <AIAvatar isSpeaking={false} isThinking={false} isListening={false} persona={persona} size={100}/>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:'1.25rem',color:'#fff',marginTop:16}}>{persona.name}</div>
          <div style={{fontSize:'.8rem',color:'rgba(255,255,255,0.55)',marginTop:4}}>{persona.title} · {persona.company}</div>
          <div style={{marginTop:12,padding:'6px 16px',borderRadius:999,background:'rgba(83,22,151,0.4)',display:'inline-block',color:'#e0d0ff',fontSize:'.75rem',fontWeight:800}}>{interviewType} Interview · {targetRole}</div>
        </div>
        <div style={{padding:'28px 28px 24px'}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:'1.05rem',color:'#0f1a2e',marginBottom:6,textAlign:'center'}}>⏱️ How long do you want to practice?</div>
          <div style={{fontSize:'.82rem',color:'#7a8ba8',textAlign:'center',marginBottom:22}}>The AI will keep asking adaptive questions based on your answers until time runs out. More time = deeper drill-down.</div>
          <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap',marginBottom:24}}>
            {DURATION_OPTIONS.map(opt=>(
              <button key={opt.label} onClick={()=>setSelectedDuration(opt)} style={{padding:'14px 22px',borderRadius:12,border:'2px solid #531697',background:'rgba(83,22,151,0.07)',color:'#531697',fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:'1rem',cursor:'pointer',transition:'all .15s'}}
                onMouseOver={e=>{e.currentTarget.style.background='rgba(83,22,151,0.18)';}}
                onMouseOut={e=>{e.currentTarget.style.background='rgba(83,22,151,0.07)';}}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div style={{background:'rgba(83,22,151,0.04)',borderRadius:12,padding:'12px 16px',fontSize:'.78rem',color:'#531697',lineHeight:1.7,textAlign:'center'}}>
            💡 <strong>Tip:</strong> Start with 10 min to warm up. Use 20–30 min for deep technical drill-downs or full HR simulations.
          </div>
        </div>
      </div>
    );
  }

  // ── Timer color ──────────────────────────────────────────────────────────
  const timerColor=timeLeft>120?'#47d372':timeLeft>30?'#f59e0b':'#ef4444';

  return(
    <div style={{fontFamily:"'Nunito',sans-serif",background:'#fff',borderRadius:16,overflow:'hidden',border:'1px solid #e8edf5',boxShadow:'0 6px 28px rgba(4,44,93,0.1)'}}>

      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#042c5d 0%,#1a0d3e 45%,#0c3240 100%)',padding:'20px 24px'}}>
        <div style={{display:'flex',alignItems:'center',gap:20,marginBottom:14}}>
          <AIAvatar isSpeaking={aiSpeaking} isThinking={loading} isListening={listening} persona={persona} size={132}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:'1.15rem',color:'#fff'}}>{persona.name}</div>
            <div style={{fontSize:'.78rem',color:'rgba(255,255,255,0.55)',marginTop:2}}>{persona.title} · {persona.company}</div>
            <div style={{display:'flex',gap:7,flexWrap:'wrap',marginTop:10,alignItems:'center'}}>
              <span style={{padding:'3px 10px',borderRadius:999,background:'rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.85)',fontSize:'.68rem',fontWeight:700}}>{targetRole}</span>
              <span style={{padding:'3px 10px',borderRadius:999,background:`${persona.color}55`,color:'#fff',fontSize:'.68rem',fontWeight:800}}>{interviewType} Interview</span>
              {aiSpeaking&&<span style={{display:'flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:999,background:'rgba(71,211,114,0.25)',color:'#86efac',fontSize:'.68rem',fontWeight:800}}><span style={{width:6,height:6,borderRadius:'50%',background:'#47d372',animation:'blink .8s infinite'}}/> Speaking…</span>}
              {listening&&<span style={{display:'flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:999,background:'rgba(239,68,68,0.25)',color:'#fca5a5',fontSize:'.68rem',fontWeight:800}}><span style={{width:6,height:6,borderRadius:'50%',background:'#ef4444',animation:'blink .8s infinite'}}/> Listening…</span>}
              {loading&&!aiSpeaking&&<span style={{display:'flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:999,background:'rgba(245,158,11,0.2)',color:'#fcd34d',fontSize:'.68rem',fontWeight:800}}><span style={{width:6,height:6,borderRadius:'50%',background:'#f59e0b',animation:'blink .5s infinite'}}/> Thinking…</span>}
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:8}}>
            <div style={{textAlign:'right'}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:'1.5rem',color:done?'rgba(255,255,255,0.4)':timerColor}}>{done?'Done':formatTime(timeLeft)}</div>
              <div style={{fontSize:'.6rem',color:'rgba(255,255,255,0.4)'}}>Remaining</div>
              <div style={{marginTop:3,fontSize:'.65rem',color:'rgba(255,255,255,0.4)',fontWeight:700}}>Q{qNum} done · {avgScore??'—'}/100</div>
            </div>
            {/* Controls */}
            <div style={{display:'flex',gap:6}}>
              <button onClick={()=>setTtsEnabled(t=>!t)} title={ttsEnabled?'Mute interviewer voice':'Enable voice'} style={{padding:'5px 10px',borderRadius:8,border:'1px solid rgba(255,255,255,0.2)',background:ttsEnabled?'rgba(71,211,114,0.2)':'rgba(255,255,255,0.08)',color:'#fff',cursor:'pointer',fontSize:'.7rem',fontWeight:700}}>
                {ttsEnabled?'🔊':'🔇'}
              </button>
            </div>
          </div>
        </div>

        {/* Webcam row */}
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <WebcamPanel enabled={camEnabled} onToggle={setCamEnabled}/>
          {!camEnabled&&(
            <div style={{flex:1}}>
              <div style={{fontSize:'.75rem',color:'rgba(255,255,255,0.55)',lineHeight:1.6}}>
                📷 <strong style={{color:'rgba(255,255,255,0.85)'}}>Enable your camera</strong> to feel like a real interview. Your video stays on your device — nothing is recorded or uploaded.
              </div>
            </div>
          )}
          {camEnabled&&(
            <div style={{flex:1}}>
              <div style={{fontSize:'.73rem',color:'rgba(255,255,255,0.55)',lineHeight:1.7}}>
                👁️ <strong style={{color:'rgba(255,255,255,0.85)'}}>Interview feel:</strong><br/>
                • Maintain eye contact with the screen<br/>
                • Sit straight, speak clearly<br/>
                • Take a breath before answering
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress */}
      <div style={{height:4,background:'rgba(83,22,151,0.1)'}}>
        <div style={{height:'100%',width:`${done?100:Math.max(0,100-Math.round((timeLeft/(selectedDuration?.secs||600))*100))}%`,background:'linear-gradient(90deg,#531697,#13a1a5,#47d372)',transition:'width .55s ease'}}/>
      </div>

      {/* Messages */}
      <div style={{minHeight:300,maxHeight:400,overflowY:'auto',padding:'16px 20px 8px',background:'#f8f9fc',display:'flex',flexDirection:'column'}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start',marginBottom:12}}>
            {m.role==='ai'&&<div style={{width:30,height:30,borderRadius:'50%',background:`linear-gradient(135deg,#042c5d,${persona.color})`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:'.75rem',color:'#fff',flexShrink:0,marginRight:9,alignSelf:'flex-end'}}>{persona.name[0]}</div>}
            <div style={{maxWidth:'78%',padding:'12px 16px',borderRadius:m.role==='user'?'18px 18px 4px 18px':'18px 18px 18px 4px',background:m.role==='user'?'linear-gradient(135deg,#531697,#13a1a5)':'#fff',color:m.role==='user'?'#fff':'#0f1a2e',border:m.role==='user'?'none':'1px solid #e8edf5',boxShadow:m.role==='user'?'0 4px 14px rgba(83,22,151,0.22)':'0 2px 10px rgba(4,44,93,0.05)',fontSize:'.875rem',lineHeight:1.7,whiteSpace:'pre-wrap',fontFamily:"'Nunito',sans-serif"}}>
              {m.loading?<span style={{opacity:.4,animation:'blink .8s ease-in-out infinite'}}>▋</span>:m.content}
            </div>
            {m.role==='user'&&<div style={{width:30,height:30,borderRadius:'50%',background:'#e8edf5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.8rem',flexShrink:0,marginLeft:9,alignSelf:'flex-end'}}>👤</div>}
          </div>
        ))}
        {listening&&liveText&&(
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:8}}>
            <div style={{maxWidth:'78%',padding:'10px 14px',borderRadius:'18px 18px 4px 18px',background:'rgba(83,22,151,0.08)',border:'1px dashed rgba(83,22,151,0.3)',fontSize:'.84rem',color:'#531697',fontStyle:'italic',fontFamily:"'Nunito',sans-serif"}}>
              <span style={{display:'inline-block',width:7,height:7,borderRadius:'50%',background:'#ef4444',marginRight:7,verticalAlign:'middle',animation:'blink .7s infinite'}}/>{liveText}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Score */}
      {metrics&&<div style={{padding:'0 20px'}}><ScorePanel m={metrics}/></div>}

      {/* Input */}
      <div style={{padding:'14px 20px',borderTop:'1px solid #e8edf5',background:'#fff'}}>
        <div style={{display:'flex',gap:10,alignItems:'flex-end'}}>
          <textarea value={input} onChange={e=>{setInput(e.target.value);if(!ansStart)setAnsStart(Date.now());}}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendAnswer();}}}
            placeholder={listening?'🔴 Listening — speak naturally, auto-sends after 2.5s pause…':done?'Interview complete!':'Type your answer or click 🎙️ to speak…'}
            rows={2} disabled={loading||!ready||done}
            style={{flex:1,padding:'10px 14px',borderRadius:10,border:`1.5px solid ${listening?'#ef4444':'#d0d7e8'}`,fontFamily:"'Nunito',sans-serif",fontSize:'.88rem',resize:'none',outline:'none',lineHeight:1.55,color:'#0f1a2e',background:done?'#f8f9fc':'#fff',transition:'border-color .2s'}}/>
          {supported&&!done&&(
            <button onClick={listening?stopMic:startMic} disabled={loading||!ready}
              style={{width:48,height:48,borderRadius:'50%',border:'none',flexShrink:0,cursor:loading||!ready?'not-allowed':'pointer',background:listening?'linear-gradient(135deg,#ef4444,#b91c1c)':'linear-gradient(135deg,#531697,#13a1a5)',color:'#fff',fontSize:'1.2rem',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:listening?'0 0 0 6px rgba(239,68,68,0.2)':'0 4px 14px rgba(83,22,151,0.3)',animation:listening?'micRing 1.4s ease-in-out infinite':'none',transition:'background .2s'}}>
              {listening?'⏹':'🎙️'}
            </button>
          )}
          <button onClick={()=>sendAnswer()} disabled={loading||!input.trim()||!ready||done}
            style={{padding:'0 22px',height:48,borderRadius:10,border:'none',flexShrink:0,fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:'.88rem',cursor:loading||!input.trim()||done?'not-allowed':'pointer',background:loading||!input.trim()||done?'#e8edf5':'linear-gradient(135deg,#531697,#13a1a5)',color:loading||!input.trim()||done?'#b0bec9':'#fff',transition:'all .2s'}}>
            {loading?'…':'Send ↑'}
          </button>
        </div>
        <div style={{marginTop:8,display:'flex',gap:16,fontSize:'.68rem',color:'#b0bec9',flexWrap:'wrap'}}>
          <span>🎙️ Click mic once → speak → auto-sends after 2.5s silence</span>
          <span>📷 Camera: for real interview practice feel</span>
          {scores.length>0&&<span style={{color:persona.color,fontWeight:800}}>{scores.length} answered · Best: {Math.max(...scores)}/100</span>}
        </div>
      </div>

      {/* Summary */}
      {done&&scores.length>0&&(
        <div style={{padding:'18px 22px',borderTop:'1px solid #e8edf5',background:'linear-gradient(135deg,rgba(83,22,151,0.04),rgba(19,161,165,0.04))'}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:'.95rem',color:'#0f1a2e',marginBottom:14}}>📊 Interview Complete — Your Results</div>
          <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:14}}>
            {[['Overall',`${Math.round(scores.reduce((a,b)=>a+b,0)/scores.length)}/100`,persona.color],['Answered',scores.length,'#13a1a5'],['Duration',selectedDuration?.label||'—','#531697'],['Best',`${Math.max(...scores)}/100`,'#47d372'],['Weakest',`${Math.min(...scores)}/100`,'#f59e0b']].map(([l,v,c])=>(
              <div key={l} style={{padding:'12px 18px',background:'#fff',borderRadius:12,border:'1px solid #e8edf5',textAlign:'center',boxShadow:'0 2px 8px rgba(4,44,93,0.05)'}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:'1.1rem',color:c}}>{v}</div>
                <div style={{fontSize:'.65rem',color:'#7a8ba8',marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:'.68rem',fontWeight:800,color:'#7a8ba8',marginBottom:6}}>PER-QUESTION SCORES</div>
            <div style={{display:'flex',gap:4,alignItems:'flex-end'}}>
              {scores.map((s,i)=>(
                <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                  <div style={{width:28,borderRadius:'3px 3px 0 0',height:`${Math.max(4,s*0.4)}px`,background:s>=75?'#47d372':s>=50?'#f59e0b':'#ef4444',transition:'height .5s ease'}}/>
                  <div style={{fontSize:'.58rem',color:'#b0bec9'}}>Q{i+1}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button onClick={onEnd} style={{padding:'10px 24px',borderRadius:10,border:'none',background:'linear-gradient(135deg,#531697,#13a1a5)',color:'#fff',fontWeight:800,cursor:'pointer',fontFamily:"'Nunito',sans-serif",fontSize:'.86rem'}}>🔄 New Interview</button>
            <button onClick={()=>window.speechSynthesis?.cancel()} style={{padding:'10px 18px',borderRadius:10,border:'1px solid #d0d7e8',background:'transparent',color:'#7a8ba8',fontWeight:700,cursor:'pointer',fontFamily:"'Nunito',sans-serif",fontSize:'.82rem'}}>🔇 Stop Voice</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes avSpin   { to{transform:rotate(360deg)} }
        @keyframes avPulse  { 0%,100%{opacity:.65}50%{opacity:1} }
        @keyframes breathe  { 0%,100%{transform:scale(1)}50%{transform:scale(1.016)} }
        @keyframes sndRing  { 0%{opacity:.55;transform:scale(1)}100%{opacity:0;transform:scale(1.9)} }
        @keyframes thinkB   { 0%,100%{opacity:.3;transform:translateY(0)}50%{opacity:1;transform:translateY(-6px)} }
        @keyframes blink    { 0%,100%{opacity:1}50%{opacity:.2} }
        @keyframes micRing  { 0%,100%{box-shadow:0 0 0 6px rgba(239,68,68,0.2)}50%{box-shadow:0 0 0 14px rgba(239,68,68,0.04)} }
      `}</style>
    </div>
  );
}

// ─── PrepResult (preserved) ───────────────────────────────────────────────────
function PrepResult({data,targetRole}){
  const [section,setSection]=useState('technical');
  const secs=[{id:'technical',label:'💻 Technical',count:data.technical_questions?.length},{id:'behavioral',label:'🤝 Behavioural',count:data.behavioral_questions?.length},{id:'gap',label:'⚠️ Gaps',count:data.gap_questions?.length},{id:'wins',label:'⚡ Quick Wins',count:data.quick_wins?.length}];
  const dc={easy:'#47d372',medium:'#f59e0b',hard:'#ef4444'};
  return(
    <div>
      <div style={{background:'linear-gradient(135deg,rgba(83,22,151,0.05),rgba(19,161,165,0.05))',border:'1px solid rgba(83,22,151,0.12)',borderRadius:14,padding:'16px 18px',marginBottom:18}}>
        <div style={{fontSize:'.7rem',fontWeight:800,color:'#531697',marginBottom:6}}>🧠 PERSONALISED COACHING SUMMARY</div>
        <div style={{fontSize:'.88rem',color:'#3d4e6b',lineHeight:1.75}}>{data.coaching_summary}</div>
        <div style={{marginTop:8,fontSize:'.7rem',color:'#b0bec9'}}>For: <strong style={{color:'#531697'}}>{targetRole}</strong></div>
      </div>
      <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>{secs.map(s=><button key={s.id} onClick={()=>setSection(s.id)} style={{padding:'7px 14px',borderRadius:999,border:`1.5px solid ${section===s.id?'#531697':'#d0d7e8'}`,background:section===s.id?'rgba(83,22,151,0.08)':'#fff',color:section===s.id?'#531697':'#7a8ba8',fontWeight:700,cursor:'pointer',fontSize:'.78rem',fontFamily:"'Nunito',sans-serif"}}>{s.label} ({s.count||0})</button>)}</div>
      {section==='technical'&&<div style={{display:'flex',flexDirection:'column',gap:10}}>{(data.technical_questions||[]).map((q,i)=><div key={i} style={{background:'#fff',border:'1px solid #e8edf5',borderRadius:12,padding:'14px 16px',borderLeft:`3px solid ${dc[q.difficulty]||'#531697'}`}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><div style={{fontWeight:700,fontSize:'.88rem',color:'#0f1a2e',flex:1,paddingRight:8}}>Q{i+1}. {q.question}</div><span style={{padding:'2px 8px',borderRadius:999,background:`${dc[q.difficulty]||'#531697'}15`,color:dc[q.difficulty]||'#531697',fontSize:'.65rem',fontWeight:700,flexShrink:0,textTransform:'capitalize'}}>{q.difficulty}</span></div><div style={{fontSize:'.78rem',color:'#7a8ba8'}}>💡 {q.tip}</div>{q.skill&&<span style={{display:'inline-block',marginTop:6,padding:'2px 8px',borderRadius:999,background:'rgba(83,22,151,0.07)',color:'#531697',fontSize:'.68rem',fontWeight:700}}>{q.skill}</span>}</div>)}</div>}
      {section==='behavioral'&&<div style={{display:'flex',flexDirection:'column',gap:10}}>{(data.behavioral_questions||[]).map((q,i)=><div key={i} style={{background:'#fff',border:'1px solid #e8edf5',borderRadius:12,padding:'14px 16px',borderLeft:'3px solid #13a1a5'}}><div style={{fontWeight:700,fontSize:'.88rem',color:'#0f1a2e',marginBottom:6}}>Q{i+1}. {q.question}</div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><span style={{padding:'2px 8px',borderRadius:999,background:'rgba(19,161,165,0.08)',color:'#0d7a7e',fontSize:'.68rem',fontWeight:700}}>Use {q.framework}</span><span style={{fontSize:'.75rem',color:'#7a8ba8'}}><em>{q.angle}</em></span></div></div>)}</div>}
      {section==='gap'&&<div style={{display:'flex',flexDirection:'column',gap:10}}>{(data.gap_questions||[]).map((q,i)=><div key={i} style={{background:'#fff',border:'1px solid #e8edf5',borderRadius:12,padding:'14px 16px',borderLeft:'3px solid #f59e0b'}}><div style={{fontWeight:700,fontSize:'.88rem',color:'#0f1a2e',marginBottom:8}}>⚠️ {q.question}</div><div style={{padding:'10px 12px',background:'rgba(245,158,11,0.06)',borderRadius:8,fontSize:'.8rem',color:'#3d4e6b',lineHeight:1.6}}><strong style={{color:'#92400e'}}>How to handle: </strong>{q.how_to_handle}</div></div>)}</div>}
      {section==='wins'&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))',gap:10}}>{(data.quick_wins||[]).map((w,i)=><div key={i} style={{background:'#fff',border:'1px solid #e8edf5',borderRadius:12,padding:'14px 16px',borderTop:'3px solid #47d372',display:'flex',gap:10}}><div style={{width:26,height:26,borderRadius:'50%',background:'rgba(71,211,114,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:'.75rem',color:'#166534',flexShrink:0}}>{i+1}</div><div style={{fontSize:'.83rem',color:'#3d4e6b',lineHeight:1.6}}>{w}</div></div>)}</div>}
    </div>
  );
}

const ITYPES=[
  {id:'Technical',icon:'💻',color:'#531697',desc:'DSA, system design, your tech stack, coding concepts',tags:['React','Java','Python','SQL','System Design']},
  {id:'HR',icon:'🤝',color:'#13a1a5',desc:'Behavioral, teamwork, conflict, goals, motivation (STAR)',tags:['Behavioral','STAR','Teamwork','Leadership']},
  {id:'Managerial',icon:'📊',color:'#47d372',desc:'Decision-making, project ownership, team leadership',tags:['Leadership','Strategy','Decisions']},
];

export default function InterviewPrepPage(){
  const {user}=useAuth();
  const [mainTab,setMainTab]=useState('ai');
  const [mode,setMode]=useState(null);
  const [iType,setIType]=useState('Technical');
  const [targetRole,setRole]=useState('Software Engineer');
  const [latest,setLatest]=useState(null);
  const [prepLoading,setPrepLoading]=useState(false);
  const [prepResult,setPrepResult]=useState(null);
  const [prepError,setPrepError]=useState('');
  const [deepTopic,setDeepTopic]=useState('');
  const [deepResult,setDeepResult]=useState(null);
  const [deepLoading,setDeepLoading]=useState(false);
  const [mockKey,setMockKey]=useState(0);
  const [bankQs,setBankQs]=useState([]);
  const [bankLoad,setBankLoad]=useState(false);
  const [bankRole,setBankRole]=useState('All');
  const [bankSub,setBankSub]=useState('All');
  const [bankSearch,setBankSearch]=useState('');
  const [bankOpen,setBankOpen]=useState(null);
  const [userAns,setUserAns]=useState({});
  const [aiAns,setAiAns]=useState({});
  const [aiAnsLoad,setAiAnsLoad]=useState({});

  const BROLES=['All','Frontend Developer','Backend Developer','Full Stack','Data Science','Machine Learning','DevOps','Android','System Design'];
  const BSUBS=['All','DBMS','Operating Systems','Computer Networks','DSA','OOPs','System Design','Web Development','Machine Learning','Cloud','SQL'];

  useEffect(()=>{
    fetch(`${API}/skillpath/latest`,{headers:tk()}).then(r=>r.json()).then(d=>{if(d?.result){setLatest(d.result);setRole(d.result.jobTitle||'Software Engineer');}}).catch(()=>{});
  },[]);

  useEffect(()=>{
    if(mainTab!=='bank')return;
    setBankLoad(true);
    const p=new URLSearchParams();
    if(bankRole!=='All')p.set('role',bankRole);
    if(bankSub!=='All')p.set('subject',bankSub);
    fetch(`${API}/interview?${p}`,{headers:tk()}).then(r=>r.json()).then(d=>setBankQs(d.questions||[])).catch(()=>setBankQs([])).finally(()=>setBankLoad(false));
  },[mainTab,bankRole,bankSub]);

  async function getAiAns(qId,q){
    setAiAnsLoad(l=>({...l,[qId]:true}));
    try{const d=await fetch(`${API}/interview/ai-answer`,{method:'POST',headers:{...tk(),'Content-Type':'application/json'},body:JSON.stringify({question:q,role:bankRole!=='All'?bankRole:'',subject:bankSub!=='All'?bankSub:''})}).then(r=>r.json());setAiAns(a=>({...a,[qId]:d.answer||'No answer.'}));}
    catch{setAiAns(a=>({...a,[qId]:'Could not fetch.'}));}
    finally{setAiAnsLoad(l=>({...l,[qId]:false}));}
  }

  async function runPrep(){
    setPrepLoading(true);setPrepError('');setPrepResult(null);
    try{
      const res=await fetch(`${API}/skillpath/interview-prep`,{method:'POST',headers:{...tk(),'Content-Type':'application/json'},body:JSON.stringify({candidateName:user?.name,targetRole,skillGaps:(latest?.skillGapAnalysis?.missingSkills||[]).map(s=>({skill:s,importance:'important'})),strengths:latest?.skillGapAnalysis?.matchedSkills||[],readinessScore:latest?.atsScore||0})});
      const d=await res.json(); if(!res.ok)throw new Error(d.error||'Failed'); setPrepResult(d);
    }catch(e){setPrepError(e.message);}
    finally{setPrepLoading(false);}
  }

  async function runDeep(){
    if(!deepTopic.trim())return; setDeepLoading(true);setDeepResult(null);
    try{setDeepResult(await fetch(`${API}/skillpath/deep-dive`,{method:'POST',headers:{...tk(),'Content-Type':'application/json'},body:JSON.stringify({topic:deepTopic,targetRole,candidateName:user?.name})}).then(r=>r.json()));}
    catch{setDeepResult({explanation:`${deepTopic} is a core skill.`,practice_questions:[`Explain ${deepTopic} simply.`,`Give a real-world example.`],quick_prep:'Concept → Example → Trade-off.'});}
    finally{setDeepLoading(false);}
  }

  const gaps=latest?.skillGapAnalysis?.missingSkills||[];
  const persona=PERSONAS[iType]||PERSONAS.Technical;

  return(
    <div style={{fontFamily:"'Nunito',sans-serif",maxWidth:960,margin:'0 auto'}}>
      <div style={{marginBottom:22}}>
        <h1 style={{fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:'1.65rem',color:'#0f1a2e',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',margin:0}}>
          🎤 AI Interview Coach
          <span style={{padding:'4px 12px',borderRadius:999,background:'linear-gradient(135deg,rgba(83,22,151,0.1),rgba(19,161,165,0.1))',color:'#531697',fontSize:'.7rem',fontWeight:800,border:'1px solid rgba(83,22,151,0.15)'}}>Human AI · Voice · Camera · Adaptive</span>
        </h1>
        <p style={{color:'#7a8ba8',marginTop:6,fontSize:'.88rem',marginBottom:0}}>Your AI interviewer speaks, adapts every question to your answer, and listens continuously — just like a real interview.</p>
      </div>

      <div style={{display:'flex',gap:4,marginBottom:22,borderBottom:'1px solid #e8edf5'}}>
        {[['ai','🤖 AI Interview'],['bank','📚 Questions Bank']].map(([id,label])=>(
          <button key={id} onClick={()=>setMainTab(id)} style={{padding:'9px 20px',borderRadius:'10px 10px 0 0',border:'none',borderBottom:mainTab===id?'2.5px solid #531697':'2.5px solid transparent',background:mainTab===id?'rgba(83,22,151,0.06)':'transparent',color:mainTab===id?'#531697':'#7a8ba8',fontWeight:800,cursor:'pointer',fontSize:'.85rem',fontFamily:"'Nunito',sans-serif"}}>{label}</button>
        ))}
      </div>

      {mainTab==='bank'&&(
        <div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14,alignItems:'center'}}>
            <input value={bankSearch} onChange={e=>setBankSearch(e.target.value)} placeholder="🔍 Search questions…" style={{padding:'8px 14px',borderRadius:9,border:'1.5px solid #d0d7e8',fontFamily:"'Nunito',sans-serif",fontSize:'.84rem',flex:1,minWidth:170,outline:'none'}}/>
            {[['Role',BROLES,bankRole,setBankRole],['Subject',BSUBS,bankSub,setBankSub]].map(([label,opts,val,setter])=>(
              <select key={label} value={val} onChange={e=>setter(e.target.value)} style={{padding:'8px 10px',borderRadius:9,border:'1.5px solid #d0d7e8',fontFamily:"'Nunito',sans-serif",fontSize:'.8rem',fontWeight:700,color:'#3d4e6b',background:'#fff',cursor:'pointer'}}>
                {opts.map(o=><option key={o}>{label}: {o}</option>)}
              </select>
            ))}
          </div>
          {bankLoad&&<div style={{textAlign:'center',padding:40,color:'#b0bec9'}}>Loading…</div>}
          {!bankLoad&&bankQs.filter(q=>!bankSearch||q.question?.toLowerCase().includes(bankSearch.toLowerCase())).map(q=>{
            const isOpen=bankOpen===q._id;
            const dc2={Hard:'#ef4444',Medium:'#f59e0b',Easy:'#47d372'}[q.difficulty]||'#531697';
            return(
              <div key={q._id} style={{padding:'14px 18px',marginBottom:10,background:'#fff',border:'1px solid #e8edf5',borderRadius:13}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:7}}>
                      {q.role&&<span style={{padding:'2px 8px',borderRadius:999,background:'rgba(83,22,151,0.08)',color:'#531697',fontSize:'.67rem',fontWeight:700}}>👤 {q.role}</span>}
                      {q.subject&&<span style={{padding:'2px 8px',borderRadius:999,background:'rgba(19,161,165,0.08)',color:'#13a1a5',fontSize:'.67rem',fontWeight:700}}>📘 {q.subject}</span>}
                      {q.difficulty&&<span style={{padding:'2px 8px',borderRadius:999,background:`${dc2}12`,color:dc2,fontSize:'.67rem',fontWeight:700}}>{q.difficulty}</span>}
                    </div>
                    <div style={{fontWeight:700,fontSize:'.9rem',color:'#0f1a2e',lineHeight:1.55}}>{q.question}</div>
                  </div>
                  <button onClick={()=>setBankOpen(isOpen?null:q._id)} style={{padding:'6px 12px',borderRadius:8,border:'1.5px solid #d0d7e8',background:isOpen?'rgba(83,22,151,0.06)':'transparent',color:'#531697',fontWeight:700,cursor:'pointer',fontSize:'.75rem',flexShrink:0,fontFamily:"'Nunito',sans-serif"}}>{isOpen?'▲ Hide':'▼ Answer'}</button>
                </div>
                {isOpen&&(
                  <div style={{marginTop:14,paddingTop:14,borderTop:'1px solid #f0f3fa'}}>
                    <textarea value={userAns[q._id]||''} onChange={e=>setUserAns(a=>({...a,[q._id]:e.target.value}))} placeholder="Write your answer here…" rows={3} style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1.5px solid #d0d7e8',fontFamily:"'Nunito',sans-serif",fontSize:'.84rem',resize:'vertical',outline:'none',boxSizing:'border-box',marginBottom:10}}/>
                    {q.answer&&<div style={{padding:'10px 14px',background:'rgba(71,211,114,0.07)',border:'1px solid rgba(71,211,114,0.25)',borderRadius:9,fontSize:'.83rem',color:'#166534',lineHeight:1.65,marginBottom:10}}><strong>📖 Suggested:</strong> {q.answer}</div>}
                    {aiAns[q._id]&&<div style={{padding:'10px 14px',background:'rgba(83,22,151,0.05)',border:'1px solid rgba(83,22,151,0.12)',borderRadius:9,fontSize:'.83rem',color:'#3d4e6b',lineHeight:1.65,marginBottom:10}}><strong style={{color:'#531697'}}>🤖 AI:</strong> {aiAns[q._id]}</div>}
                    <button onClick={()=>getAiAns(q._id,q.question)} disabled={aiAnsLoad[q._id]} style={{padding:'7px 16px',borderRadius:8,border:'none',background:aiAnsLoad[q._id]?'#e8edf5':'linear-gradient(135deg,#531697,#13a1a5)',color:aiAnsLoad[q._id]?'#b0bec9':'#fff',fontWeight:700,cursor:'pointer',fontSize:'.78rem',fontFamily:"'Nunito',sans-serif"}}>{aiAnsLoad[q._id]?'⏳ Loading…':'🤖 Get AI Answer'}</button>
                  </div>
                )}
              </div>
            );
          })}
          {!bankLoad&&bankQs.length===0&&<div style={{textAlign:'center',padding:50,color:'#b0bec9'}}>No questions found.</div>}
        </div>
      )}

      {mainTab==='ai'&&(
        <div>
          <div style={{background:'#fff',border:'1px solid #e8edf5',borderRadius:14,padding:'16px 20px',marginBottom:20,boxShadow:'0 2px 10px rgba(4,44,93,0.05)'}}>
            <div style={{display:'flex',gap:14,flexWrap:'wrap',alignItems:'center',marginBottom:14}}>
              <div style={{fontSize:'.78rem',fontWeight:800,color:'#3d4e6b',flexShrink:0}}>🎯 Target Role:</div>
              <input value={targetRole} onChange={e=>setRole(e.target.value)} placeholder="e.g. Software Engineer, Data Scientist" style={{flex:1,minWidth:200,padding:'9px 14px',borderRadius:9,border:'1.5px solid #d0d7e8',fontFamily:"'Nunito',sans-serif",fontSize:'.9rem',outline:'none',color:'#0f1a2e'}}/>
              {latest&&<div style={{fontSize:'.72rem',color:'#7a8ba8'}}>ATS: <strong style={{color:'#531697'}}>{latest.atsScore}/100</strong> · Gaps: <strong style={{color:'#991b1b'}}>{gaps.length}</strong></div>}
            </div>
            <div style={{fontSize:'.72rem',fontWeight:800,color:'#7a8ba8',marginBottom:10}}>Interview Type:</div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              {ITYPES.map(t=>(
                <button key={t.id} onClick={()=>setIType(t.id)} style={{padding:'10px 18px',borderRadius:11,border:`1.5px solid ${iType===t.id?t.color:'#d0d7e8'}`,background:iType===t.id?`${t.color}12`:'#fff',color:iType===t.id?t.color:'#7a8ba8',fontWeight:800,cursor:'pointer',fontFamily:"'Nunito',sans-serif",fontSize:'.82rem',display:'flex',alignItems:'center',gap:6}}>
                  {t.icon} {t.id}{iType===t.id&&' ✓'}
                </button>
              ))}
            </div>
            {iType&&<div style={{marginTop:8,fontSize:'.75rem',color:'#7a8ba8'}}>{ITYPES.find(t=>t.id===iType)?.desc}</div>}
          </div>

          {mode&&<button onClick={()=>{setMode(null);setPrepResult(null);setDeepResult(null);setPrepError('');window.speechSynthesis?.cancel();}} style={{marginBottom:16,padding:'7px 16px',borderRadius:9,border:'1.5px solid #d0d7e8',background:'transparent',color:'#7a8ba8',fontWeight:700,cursor:'pointer',fontFamily:"'Nunito',sans-serif",fontSize:'.82rem'}}>← Back to modes</button>}

          {!mode&&(
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14}}>
              <div onClick={()=>setMode('mock')}
                style={{background:'linear-gradient(145deg,#042c5d 0%,#1a0d3e 55%,#0c3240 100%)',border:'none',borderRadius:16,padding:'22px 20px',cursor:'pointer',transition:'all .2s',boxShadow:'0 8px 28px rgba(83,22,151,0.28)'}}
                onMouseOver={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow='0 16px 40px rgba(83,22,151,0.38)';}}
                onMouseOut={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 8px 28px rgba(83,22,151,0.28)';}}>
                <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:14}}>
                  <AIAvatar isSpeaking={false} isThinking={false} isListening={false} persona={persona} size={76}/>
                  <div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:'.85rem',color:'#fff'}}>{persona.name}</div>
                    <div style={{fontSize:'.68rem',color:'rgba(255,255,255,0.5)',marginTop:2}}>{persona.title} · {persona.company}</div>
                  </div>
                </div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:'1rem',color:'#fff',marginBottom:6}}>🎤 AI Mock Interview</div>
                <div style={{fontSize:'.8rem',color:'rgba(255,255,255,0.6)',lineHeight:1.6,marginBottom:14}}>Human-like AI speaks questions, adapts to your answers. Voice + Camera for real interview feel.</div>
                <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:14}}>
                  {['🗣️ Speaks Aloud','🎙️ Voice Input','📷 Camera','🧠 Adaptive'].map(t=><span key={t} style={{padding:'2px 8px',borderRadius:999,background:'rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.8)',fontSize:'.62rem',fontWeight:700}}>{t}</span>)}
                </div>
                <div style={{display:'inline-block',padding:'7px 16px',borderRadius:999,background:'linear-gradient(135deg,#531697,#13a1a5)',color:'#fff',fontWeight:800,fontSize:'.8rem'}}>Start Interview →</div>
              </div>
              <div onClick={()=>{setMode('prep');runPrep();}}
                style={{background:'#fff',border:'1.5px solid #e8edf5',borderRadius:16,padding:'22px 20px',cursor:'pointer',transition:'all .2s',boxShadow:'0 2px 10px rgba(4,44,93,0.05)'}}
                onMouseOver={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.borderColor='#531697';}}
                onMouseOut={e=>{e.currentTarget.style.transform='';e.currentTarget.style.borderColor='#e8edf5';}}>
                <div style={{fontSize:'2rem',marginBottom:10}}>🎯</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:'.95rem',color:'#0f1a2e',marginBottom:6}}>Full Interview Prep</div>
                <div style={{fontSize:'.8rem',color:'#7a8ba8',lineHeight:1.6}}>Personalised: technical questions, behavioral prep, skill gaps, quick wins.</div>
              </div>
              <div onClick={()=>setMode('tips')}
                style={{background:'#fff',border:'1.5px solid #e8edf5',borderRadius:16,padding:'22px 20px',cursor:'pointer',transition:'all .2s',boxShadow:'0 2px 10px rgba(4,44,93,0.05)'}}
                onMouseOver={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.borderColor='#531697';}}
                onMouseOut={e=>{e.currentTarget.style.transform='';e.currentTarget.style.borderColor='#e8edf5';}}>
                <div style={{fontSize:'2rem',marginBottom:10}}>💡</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:'.95rem',color:'#0f1a2e',marginBottom:6}}>Topic Deep Dive</div>
                <div style={{fontSize:'.8rem',color:'#7a8ba8',lineHeight:1.6}}>Pick any skill gap — focused explanation, practice questions, quick interview prep.</div>
              </div>
            </div>
          )}

          {mode==='mock'&&<MockInterview key={mockKey} targetRole={targetRole} interviewType={iType} userName={user?.name} onEnd={()=>{setMockKey(k=>k+1);setMode(null);}}/>}

          {mode==='prep'&&(
            <div>
              {prepLoading&&<div style={{textAlign:'center',padding:'50px 0'}}><div style={{width:42,height:42,border:'3px solid #e8edf5',borderTopColor:'#531697',borderRadius:'50%',animation:'spin .7s linear infinite',margin:'0 auto 14px'}}/><div style={{color:'#7a8ba8'}}>Generating prep guide…</div><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>}
              {prepError&&<div style={{padding:'14px 18px',background:'#fee2e2',border:'1px solid #fca5a5',borderRadius:10,color:'#991b1b',fontSize:'.85rem',fontWeight:600,marginBottom:14}}>⚠️ {prepError} <button onClick={runPrep} style={{marginLeft:10,padding:'4px 12px',borderRadius:7,border:'none',background:'#991b1b',color:'#fff',cursor:'pointer',fontFamily:"'Nunito',sans-serif",fontSize:'.78rem'}}>Retry</button></div>}
              {prepResult&&!prepLoading&&<PrepResult data={prepResult} targetRole={targetRole}/>}
            </div>
          )}

          {mode==='tips'&&(
            <div>
              <div style={{background:'#fff',border:'1px solid #e8edf5',borderRadius:14,padding:'20px 22px',marginBottom:16}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'.95rem',marginBottom:12,color:'#0f1a2e'}}>💡 Topic Deep Dive</div>
                {gaps.length>0&&<div style={{marginBottom:14}}><div style={{fontSize:'.7rem',fontWeight:800,color:'#991b1b',marginBottom:8}}>YOUR SKILL GAPS:</div><div style={{display:'flex',flexWrap:'wrap',gap:6}}>{gaps.slice(0,10).map(s=><button key={s} onClick={()=>setDeepTopic(s)} style={{padding:'5px 12px',borderRadius:999,border:`1.5px solid ${deepTopic===s?'#531697':'rgba(239,68,68,0.3)'}`,background:deepTopic===s?'rgba(83,22,151,0.08)':'rgba(239,68,68,0.06)',color:deepTopic===s?'#531697':'#991b1b',fontSize:'.78rem',fontWeight:700,cursor:'pointer',fontFamily:"'Nunito',sans-serif"}}>{s}</button>)}</div></div>}
                <div style={{display:'flex',gap:10}}>
                  <input value={deepTopic} onChange={e=>setDeepTopic(e.target.value)} placeholder="Type any skill: Docker, System Design, React Hooks…" style={{flex:1,padding:'10px 14px',borderRadius:9,border:'1.5px solid #d0d7e8',fontFamily:"'Nunito',sans-serif",fontSize:'.9rem',outline:'none'}}/>
                  <button onClick={runDeep} disabled={!deepTopic.trim()||deepLoading} style={{padding:'10px 24px',borderRadius:9,border:'none',background:!deepTopic.trim()||deepLoading?'#e8edf5':'linear-gradient(135deg,#531697,#13a1a5)',color:!deepTopic.trim()?'#b0bec9':'#fff',fontWeight:800,cursor:'pointer',fontFamily:"'Nunito',sans-serif"}}>{deepLoading?'…':'Dive In →'}</button>
                </div>
              </div>
              {deepResult&&(
                <div style={{display:'flex',flexDirection:'column',gap:14}}>
                  <div style={{background:'#fff',border:'1px solid #e8edf5',borderRadius:13,padding:'16px 18px'}}><div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'.9rem',marginBottom:10,color:'#0f1a2e'}}>📖 About {deepTopic}</div><div style={{fontSize:'.86rem',color:'#3d4e6b',lineHeight:1.75}}>{deepResult.explanation}</div></div>
                  {deepResult.practice_questions?.length>0&&<div style={{background:'#fff',border:'1px solid #e8edf5',borderRadius:13,padding:'16px 18px'}}><div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'.9rem',marginBottom:10,color:'#0f1a2e'}}>❓ Practice Questions</div>{deepResult.practice_questions.map((q,i)=><div key={i} style={{padding:'9px 12px',background:'#f8f9fc',borderRadius:8,marginBottom:7,fontSize:'.84rem',color:'#3d4e6b'}}>Q{i+1}. {q}</div>)}</div>}
                  {deepResult.quick_prep&&<div style={{background:'rgba(83,22,151,0.04)',border:'1px solid rgba(83,22,151,0.12)',borderRadius:13,padding:'14px 18px',fontSize:'.84rem',color:'#3d4e6b',lineHeight:1.7}}><strong style={{color:'#531697'}}>⚡ Quick Interview Prep: </strong>{deepResult.quick_prep}</div>}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
