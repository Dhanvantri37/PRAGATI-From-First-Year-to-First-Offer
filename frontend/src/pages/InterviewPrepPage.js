/* eslint-disable */
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
import { getNaturalVoice, speakText } from '../utils/voiceHelper';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tk  = () => ({ Authorization: `Bearer ${localStorage.getItem('pragati_token')}` });

// ─── Continuous STT ───────────────────────────────────────────────────────────
function useContinuousSTT({ lang='en-IN', onPartial, onError }={}) {
  const [listening,  setListening]  = useState(false);
  const [permError,  setPermError]  = useState(false);
  const [supported]                 = useState(!!(window.SpeechRecognition||window.webkitSpeechRecognition));

  const recRef      = useRef(null);
  const activeRef   = useRef(false);
  const mediaStreamRef = useRef(null);
  const onPartialRef= useRef(onPartial);
  const onErrorRef  = useRef(onError);
  const langRef     = useRef(lang);

  useEffect(()=>{ onPartialRef.current= onPartial; }, [onPartial]);
  useEffect(()=>{ onErrorRef.current  = onError;   }, [onError]);
  useEffect(()=>{ langRef.current     = lang;      }, [lang]);

  const startSessRef = useRef(null);
  startSessRef.current = () => {
    if (!activeRef.current) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    try { recRef.current?.abort(); } catch {}

    const r = new SR();
    r.continuous     = true;
    r.interimResults = true;
    r.lang           = langRef.current;
    r.maxAlternatives= 1;
    recRef.current   = r;

    r.onstart = () => setListening(true);

    r.onresult = e => {
      let finalSpeech = '', interimSpeech = '';
      for (let i = 0; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalSpeech += chunk + ' ';
        else interimSpeech += chunk;
      }
      const totalSpeech = (finalSpeech + interimSpeech).trim();
      onPartialRef.current?.(totalSpeech);
    };

    r.onerror = e => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        activeRef.current = false;
        setListening(false);
        setPermError(true);
        onErrorRef.current?.('Microphone permission denied.');
        return;
      }
      console.warn('[STT] recognition error:', e.error);
    };

    r.onend = () => {
      if (activeRef.current) {
        setTimeout(() => {
          if (activeRef.current) startSessRef.current?.();
        }, 300);
      } else {
        setListening(false);
      }
    };

    try { r.start(); } catch (err) {
      if (activeRef.current) {
        setTimeout(() => {
          if (activeRef.current) startSessRef.current?.();
        }, 1000);
      }
    }
  };

  const start = useCallback(async () => {
    if (!supported) return;
    try {
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setPermError(true);
      return;
    }
    activeRef.current = true;
    startSessRef.current();
  }, [supported]);

  const stop = useCallback(() => {
    activeRef.current = false;
    try { recRef.current?.stop(); } catch {}
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    setListening(false);
  }, []);

  useEffect(() => () => {
    activeRef.current = false;
    try { recRef.current?.abort(); } catch {}
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
    }
  }, []);

  return { listening, supported, permError, start, stop };
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

async function getDynamicNext({msgs,answer,qNum,isLast,role,type,resumeText,jdText}){
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
{"feedback":"...","nextQuestion":${isLast?'null':'"..."'},"confidence":7,"keyMissing":"one missing thing or empty string"}${resumeText ? `\n\nCandidate's Resume (excerpt):\n${resumeText.slice(0, 1500)}` : ''}${jdText ? `\n\nJob Description:\n${jdText.slice(0, 1500)}` : ''}`;

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

// ─── Personas ──────────────────────────────────────────────────────────────────
const PERSONAS={
  Technical: {name:'Arjun Sharma',  title:'Senior Engineer',     company:'TechSphere', color:'#531697', photo:'/arjun_sharma.png'},
  HR:        {name:'Priya Mehta',   title:'HR Manager',          company:'InnoSoft',   color:'#13a1a5', photo:'/priya_mehta.png'},
  Managerial:{name:'Vikram Nair',   title:'Engineering Manager', company:'BuildScale', color:'#47d372', photo:'/vikram_nair.png'},
};

// ─── AI Avatar — professional portrait photo with animated status ring ───────────────
function AIAvatar({isSpeaking,isThinking,isListening,persona,size=132}){
  const col=persona?.color||'#531697';
  const ringBg=isSpeaking
    ?`conic-gradient(from 0deg,${col},#13a1a5,#47d372,${col})`
    :isListening?'conic-gradient(from 0deg,#ef4444,#f97316,#ef4444)'
    :isThinking?'conic-gradient(from 0deg,#f59e0b,#ef4444,#f59e0b)'
    :`conic-gradient(from 0deg,${col},rgba(255,255,255,0.12),${col})`;

  const [imgErr,setImgErr]=useState(false);

  return(
    <div style={{position:'relative',width:size,height:size,flexShrink:0}}>
      {/* Animated status ring */}
      <div style={{
        position:'absolute',inset:-6,borderRadius:'50%',
        background:ringBg,
        animation:isSpeaking||isListening||isThinking?'avSpin 1.6s linear infinite':'avPulse 3.5s ease-in-out infinite',
        opacity:.9
      }}/>
      {/* Portrait */}
      <div style={{
        position:'absolute',inset:4,borderRadius:'50%',overflow:'hidden',
        border:`2px solid ${col}44`,
        background:'linear-gradient(145deg,#1c2b42,#0f1a2e)',
        display:'flex',alignItems:'center',justifyContent:'center',
      }}>
        {persona?.photo&&!imgErr
          ?<img src={persona.photo} alt={persona.name}
              style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'top center'}}
              onError={()=>setImgErr(true)}
            />
          :<span style={{color:'#fff',fontWeight:900,fontSize:Math.round(size*0.35),fontFamily:"'Syne',sans-serif"}}>
              {persona?.name?.[0]||'?'}
            </span>
        }
      </div>
      {/* Status dot */}
      <div style={{
        position:'absolute',bottom:4,right:4,
        width:12,height:12,borderRadius:'50%',
        background:isSpeaking?'#47d372':isListening?'#ef4444':isThinking?'#f59e0b':'#64748b',
        border:'2px solid #0f1a2e',
        boxShadow:isSpeaking?'0 0 8px #47d372':isListening?'0 0 8px #ef4444':'none',
      }}/>
      {/* Sound rings */}
      {isSpeaking&&[1,2,3].map(i=><div key={i} style={{position:'absolute',inset:-(i*13),borderRadius:'50%',border:`1.5px solid ${col}44`,animation:`sndRing 1.6s ease-out ${i*0.32}s infinite`,pointerEvents:'none'}}/>)}
      {isListening&&[1,2].map(i=><div key={i} style={{position:'absolute',inset:-(i*12),borderRadius:'50%',border:'1.5px solid rgba(239,68,68,0.5)',animation:`sndRing 1.3s ease-out ${i*0.3}s infinite`,pointerEvents:'none'}}/>)}
    </div>
  );
}

// ─── TalkingHeadInterviewer — Premium 2.5D Animated SVG Face ─────────────────
function TalkingHeadInterviewer({ isSpeaking, isThinking, isListening, persona }) {
  const pName = persona?.name || 'Arjun Sharma';

  let eyeLeft = 56.35, eyeRight = 66.21, eyeTop = 36.23;
  let mouthLeft = 50.00, mouthTop = 62.00;
  let skinTone = '#dfb495';
  let lipColor = '#a65c56';
  let mouthScaleX = 14;

  if (pName.includes('Priya')) {
    eyeLeft = 45.31; eyeRight = 54.30; eyeTop = 32.62;
    mouthLeft = 50.00; mouthTop = 59.00;
    skinTone = '#eec2a3';
    lipColor = '#c86a62';
    mouthScaleX = 12;
  } else if (pName.includes('Vikram')) {
    eyeLeft = 44.04; eyeRight = 53.61; eyeTop = 30.38;
    mouthLeft = 50.00; mouthTop = 60.00;
    skinTone = '#cca080';
    lipColor = '#8c463c';
    mouthScaleX = 12;
  }

  // Blinking effect
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 3800 + Math.random() * 1000);
    return () => clearInterval(interval);
  }, []);

  // Gaze drift
  const [gazeX, setGazeX] = useState(0);
  const [gazeY, setGazeY] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setGazeX((Math.random() - 0.5) * 1.5);
      setGazeY((Math.random() - 0.5) * 1);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  // Mouth morph height when speaking
  const [mouthHeight, setMouthHeight] = useState(2);
  useEffect(() => {
    if (!isSpeaking) {
      setMouthHeight(2);
      return;
    }
    const interval = setInterval(() => {
      setMouthHeight(Math.random() * 8 + 3);
    }, 110);
    return () => clearInterval(interval);
  }, [isSpeaking]);

  const headClass = isSpeaking
    ? 'headTalk'
    : isThinking
    ? 'headThink'
    : isListening
    ? 'headListen'
    : 'headIdle';

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #020617 100%)'
    }}>
      {/* Scanline CRT overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.15) 50%)',
        backgroundSize: '100% 4px', zIndex: 5, opacity: 0.8
      }} />

      {/* Corporate Visualizer Grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.12, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, rgba(19, 161, 165, 0.25) 1px, transparent 1px)',
        backgroundSize: '24px 24px', zIndex: 1
      }} />

      {/* Main Face Container centered with a fixed square aspect ratio */}
      <div className={headClass} style={{
        position: 'relative',
        height: '100%',
        width: 'auto',
        maxWidth: '100%',
        aspectRatio: '1 / 1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transformOrigin: 'bottom center',
        transition: 'transform 0.5s ease-out'
      }}>
        {/* Base Portrait Image */}
        <img
          src={persona?.photo || '/arjun_sharma.png'}
          alt={pName}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top center',
            userSelect: 'none',
            WebkitUserDrag: 'none'
          }}
        />

        {/* Eyelids Overlays */}
        {/* Left Eyelid */}
        <div style={{
          position: 'absolute',
          left: `${eyeLeft}%`,
          top: `${eyeTop}%`,
          width: '3.6%',
          height: blink ? '1.8%' : '0%',
          background: skinTone,
          borderRadius: '50%',
          borderBottom: blink ? '1px solid rgba(0,0,0,0.35)' : 'none',
          transform: `translate(-50%, -50%) translate(${gazeX * 0.15}%, ${gazeY * 0.15}%)`,
          transition: 'height 0.08s ease-in-out',
          zIndex: 4
        }} />

        {/* Right Eyelid */}
        <div style={{
          position: 'absolute',
          left: `${eyeRight}%`,
          top: `${eyeTop}%`,
          width: '3.6%',
          height: blink ? '1.8%' : '0%',
          background: skinTone,
          borderRadius: '50%',
          borderBottom: blink ? '1px solid rgba(0,0,0,0.35)' : 'none',
          transform: `translate(-50%, -50%) translate(${gazeX * 0.15}%, ${gazeY * 0.15}%)`,
          transition: 'height 0.08s ease-in-out',
          zIndex: 4
        }} />

        {/* Talking Mouth Overlay */}
        {isSpeaking && (
          <div style={{
            position: 'absolute',
            left: `${mouthLeft}%`,
            top: `${mouthTop}%`,
            width: `${mouthScaleX}%`,
            height: `${mouthHeight * 0.6}%`,
            background: '#47121b',
            borderRadius: '50%',
            border: `1.8px solid ${lipColor}`,
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 4,
            overflow: 'hidden'
          }}>
            {/* Teeth line */}
            <div style={{
              width: '75%',
              height: '10%',
              background: 'var(--surface)',
              position: 'absolute',
              top: '1px',
              borderRadius: 1
            }} />
          </div>
        )}
      </div>

      {/* Floating status banner */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16,
        background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.1)', padding: '6px 12px',
        borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, zIndex: 10
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: isSpeaking ? '#47d372' : isThinking ? '#f59e0b' : '#38bdf8',
          boxShadow: isSpeaking ? '0 0 8px #47d372' : 'none'
        }} />
        <span style={{ fontSize: '.72rem', color: '#f8fafc', fontWeight: 800 }}>{pName}</span>
      </div>
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
    <div style={{position:'relative',borderRadius:12,overflow:'hidden',background:'var(--text)',border:'2px solid rgba(83,22,151,0.3)',flexShrink:0}}>
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
          <span style={{fontSize:'.62rem',color:'var(--text-3)',maxWidth:150,textAlign:'center',lineHeight:1.4}}>See yourself like a real interview. No recording — local only.</span>
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
        {[['📝','Words',m.words,m.words>=50?'#166534':'#92400e'],['💬','Fillers',m.fCount,m.fCount<=2?'#166534':'#991b1b'],['⚡','Pace',m.wpm>0?`${m.wpm}wpm`:'—',m.pace==='Good'?'#166534':'#92400e'],['📖','Example',m.hasEg?'Yes ✓':'Missing',m.hasEg?'#166534':'#991b1b'],['⭐','STAR',m.hasStar?'Yes ✓':'No',m.hasStar?'#166534':'var(--text-3)']].map(([ic,label,val,c])=>(
          <div key={label} style={{display:'flex',alignItems:'center',gap:3,fontSize:'.7rem'}}>
            <span>{ic}</span><span style={{color:'var(--text-3)'}}>{label}:</span><strong style={{color:c}}>{val}</strong>
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
function MockInterview({targetRole,interviewType,userName,resumeText='',jdText='',onEnd}){
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
  const recognitionRef = useRef(null);

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'});},[msgs,liveText]);

  // ── Countdown timer ──────────────────────────────────────────────────────
  useEffect(()=>{
    if(!selectedDuration||done)return;
    timerRef.current=setInterval(()=>{
      setTimeLeft(t=>{
        if(t<=1){
          clearInterval(timerRef.current);
          if(!doneRef.current){
            doneRef.current=true;
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
  },[selectedDuration,done]);

  // TTS — speaks every interviewer message aloud using premium backend neural TTS
  const speak = useCallback(async (text) => {
    if (!ttsEnabled || !text?.trim()) return;
    
    // Stop any existing playing speech
    if (window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    if (window.pragatiAudioPlayer) {
      try { window.pragatiAudioPlayer.pause(); } catch (e) {}
    }

    const userGender = localStorage.getItem('pragati_voice_gender');
    const gender = userGender || (interviewType === 'HR' ? 'female' : 'male');
    const role = gender === 'male' ? 'system_male' : 'interviewer';

    setAiSpeaking(true);
    await speakText(text, role);
    setAiSpeaking(false);
  }, [ttsEnabled, interviewType]);

  const {listening,supported,permError:micPermError,start:startMic,stop:stopMic}=useContinuousSTT({
    lang:'en-IN',
    onPartial:t=>{setLiveText(t);if(!ansStart)setAnsStart(Date.now());},
  });

  const handleMicStart = useCallback(() => {
    setLiveText('');
    startMic().catch(e => console.warn('[STT] Manual start mic failed:', e.message));
  }, [startMic]);

  const handleMicStop = useCallback(() => {
    stopMic();
    if (liveText.trim()) {
      sendRef.current?.(liveText.trim());
    }
  }, [stopMic, liveText]);

  // Auto-stop microphone when interviewer starts speaking or thinking
  useEffect(() => {
    if (aiSpeaking || loading || done) {
      stopMic();
    }
  }, [aiSpeaking, loading, done, stopMic]);

  // Init — fires when student picks a duration
  useEffect(()=>{
    if(!selectedDuration)return;
    doneRef.current=false;
    setTimeLeft(selectedDuration.secs);
    const openQ=interviewType==='HR'
      ?"Tell me about yourself — your background, education, and what motivated you to pursue this career path."
      :"Let's start with a quick introduction. Walk me through your technical background, the projects you've built, and the technologies you're most comfortable with.";
    setTimeout(()=>{
      const hasResume=resumeText&&resumeText.length>20;
      const hasJD=jdText&&jdText.length>10;
      const personalisedNote=hasResume&&hasJD
        ? `I've reviewed your resume and the job description — my questions will be tailored specifically to your background and what ${targetRole} at this company requires.`
        : hasJD
        ? `I have the job description — questions will be aligned to what this role requires.`
        : hasResume
        ? `I've looked at your resume — questions will reflect your actual background and experience.`
        : `I'll conduct a standard ${interviewType} interview for the ${targetRole} role.`;
      const greeting=`Hello ${userName?.split(' ')[0]||'there'}! I'm ${persona.name}, ${persona.title} at ${persona.company}.\n\nI'll be conducting your ${interviewType} interview for the ${targetRole} role. ${personalisedNote}\n\nYou have ${selectedDuration.label} — I'll keep asking questions until time runs out. The better your answers, the deeper we go!\n\n🎙️ Click the mic to start speaking, and click it again when finished to send your answer.\n📷 Enable your camera for a real interview feel.\n\n❓ Question 1:\n\n${openQ}`;
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
      const result=await getDynamicNext({msgs:updatedMsgs,answer:text,qNum:newQNum,isLast,role:targetRole,type:interviewType,resumeText,jdText});
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
  },[input,loading,done,msgs,qNum,targetRole,interviewType,listening,stopMic,speak,ansStart,scores,resumeText,jdText]);

  useEffect(()=>{sendRef.current=sendAnswer;},[sendAnswer]);

  const avgScore=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):null;

  // ── Duration Selection Screen ───────────────────────────────────────────
  if(!selectedDuration){
    // Pre-request mic so the browser prompt fires here, not inside the interview
    async function pickDuration(opt){
      try{
        const s=await navigator.mediaDevices.getUserMedia({audio:true});
        s.getTracks().forEach(t=>t.stop()); // release immediately — STT will re-acquire
      }catch(e){
        // User denied — still proceed; mic button inside will show 🚫 with instructions
        console.warn('[interview] mic pre-request denied',e.message);
      }
      setSelectedDuration(opt);
    }
    return(
      <div style={{fontFamily:"'Nunito',sans-serif",background:'var(--surface)',borderRadius:16,overflow:'hidden',border:'1px solid var(--border)',boxShadow:'0 6px 28px rgba(4,44,93,0.1)'}}>
        <div style={{background:'linear-gradient(135deg,#042c5d 0%,#1a0d3e 45%,#0c3240 100%)',padding:'32px 28px',textAlign:'center'}}>
          <AIAvatar isSpeaking={false} isThinking={false} isListening={false} persona={persona} size={100}/>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:'1.25rem',color:'#fff',marginTop:16}}>{persona.name}</div>
          <div style={{fontSize:'.8rem',color:'rgba(255,255,255,0.55)',marginTop:4}}>{persona.title} · {persona.company}</div>
          <div style={{marginTop:12,padding:'6px 16px',borderRadius:999,background:'rgba(83,22,151,0.4)',display:'inline-block',color:'#e0d0ff',fontSize:'.75rem',fontWeight:800}}>{interviewType} Interview · {targetRole}</div>
        </div>
        <div style={{padding:'28px 28px 24px'}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:'1.05rem',color:'var(--text)',marginBottom:6,textAlign:'center'}}>⏱️ How long do you want to practice?</div>
          <div style={{fontSize:'.82rem',color:'var(--text-2)',textAlign:'center',marginBottom:6}}>The AI will keep asking adaptive questions based on your answers until time runs out.</div>
          <div style={{fontSize:'.75rem',color:'#13a1a5',textAlign:'center',marginBottom:20,fontWeight:700}}>🎙️ Clicking a duration will request microphone access — please allow it.</div>
          <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap',marginBottom:24}}>
            {DURATION_OPTIONS.map(opt=>(
              <button key={opt.label} onClick={()=>pickDuration(opt)}
                style={{padding:'14px 22px',borderRadius:12,border:'2px solid #531697',background:'rgba(83,22,151,0.07)',color:'#531697',fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:'1rem',cursor:'pointer',transition:'all .15s'}}
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
    <div style={{
      fontFamily: "'Nunito',sans-serif",
      background: '#090d16',
      borderRadius: 18,
      overflow: 'hidden',
      border: '1.5px solid #1e293b',
      boxShadow: '0 12px 36px rgba(0,0,0,0.3)',
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'nowrap',
      height: '660px',
      width: '100%',
      position: 'relative'
    }}>

      {/* ── LEFT PANE: MAIN MEETING SCREEN (70% width) ── */}
      <div style={{
        flex: 1,
        background: '#020617',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        height: '100%'
      }}>
        {/* Call metadata overlays */}
        <div style={{
          position: 'absolute', top: 12, left: 16, right: 16,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          zIndex: 10, pointerEvents: 'none'
        }}>
          {/* Recording & Quality Indicators */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{
              background: 'rgba(239, 68, 68, 0.2)', color: '#f87171',
              padding: '3px 8px', borderRadius: 4, fontSize: '.65rem', fontWeight: 800,
              display: 'flex', alignItems: 'center', gap: 4,
              animation: 'avPulse 1.5s ease-in-out infinite'
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
              LIVE RECORDING
            </span>
            <span style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8', padding: '3px 8px', borderRadius: 4, fontSize: '.65rem', fontWeight: 700 }}>
              1080p HD
            </span>
          </div>

          {/* Time and Question Counter */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
              color: timerColor, fontFamily: 'monospace', fontWeight: 700,
              padding: '4px 10px', borderRadius: 6, fontSize: '.9rem', border: `1px solid ${timerColor}33`
            }}>
              {done ? 'DONE' : formatTime(timeLeft)}
            </div>
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
              color: '#fff', fontWeight: 700, padding: '4px 10px', borderRadius: 6, fontSize: '.75rem'
            }}>
              Q{qNum}
            </div>
          </div>
        </div>

        {/* Dynamic Human Portrait AI Interviewer Avatar */}
        <TalkingHeadInterviewer
          isSpeaking={aiSpeaking}
          isThinking={loading}
          isListening={listening}
          persona={persona}
        />

        {/* Corporate bottom visualizer bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
          padding: '16px 20px', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', zIndex: 10, pointerEvents: 'none'
        }}>
          <div>
            <div style={{ color: '#fff', fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.95rem' }}>
              {persona.name}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '.72rem', marginTop: 2 }}>
              {persona.title} · {persona.company}
            </div>
          </div>

          {/* Speaking volume bars visualizer */}
          {aiSpeaking && (
            <div style={{ display: 'flex', gap: 3.5, alignItems: 'flex-end', height: 18 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{
                  width: 3,
                  background: '#13a1a5',
                  borderRadius: 1.5,
                  animation: `audioBar 0.7s ease-in-out infinite alternate ${i * 0.12}s`,
                }} />
              ))}
            </div>
          )}
        </div>

        {/* Candidate Webcam Overlay (PiP corner) */}
        <div style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          zIndex: 10,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          borderRadius: 12,
          overflow: 'hidden',
          border: '2px solid rgba(255, 255, 255, 0.15)',
        }}>
          <WebcamPanel enabled={camEnabled} onToggle={setCamEnabled} />
        </div>
      </div>

      {/* ── RIGHT PANE: MEETING SIDEBAR (300px width) ── */}
      <div style={{
        width: 320,
        display: 'flex',
        flexDirection: 'column',
        background: '#0f172a',
        borderLeft: '1px solid #1e293b',
        boxSizing: 'border-box',
        overflow: 'hidden',
        height: '100%'
      }}>
        {/* Top: Metadata & Quick Controls */}
        <div style={{
          padding: '12px 14px', borderBottom: '1px solid #1e293b',
          display: 'flex', gap: 8, alignItems: 'center', background: '#0a0f1d', flexShrink: 0
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Interview Feed
            </div>
            <div style={{ fontWeight: 800, fontSize: '.84rem', color: '#fff', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userName}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setTtsEnabled(t => !t)}
              title={ttsEnabled ? 'Mute AI voice' : 'Unmute AI voice'}
              style={{
                padding: '4px 8px', borderRadius: 6, border: '1px solid #1e293b',
                background: ttsEnabled ? 'rgba(19, 161, 165, 0.15)' : 'rgba(255,255,255,0.05)',
                color: ttsEnabled ? '#13a1a5' : '#64748b', cursor: 'pointer', fontSize: '.68rem', fontWeight: 700
              }}>
              {ttsEnabled ? '🔊' : '🔇'}
            </button>
            {!done && (
              <button onClick={() => {
                window.speechSynthesis?.cancel();
                setAiSpeaking(false);
                sendAnswer('I would like to skip this question.');
              }}
                title="Skip current question"
                style={{
                  padding: '4px 8px', borderRadius: 6, border: '1px solid #1e293b',
                  background: 'rgba(255,255,255,0.05)', color: '#94a3b8',
                  cursor: 'pointer', fontSize: '.68rem', fontWeight: 700
                }}>
                ⏭️ Skip
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Conversation Bubbles */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '14px',
          background: '#090d16', display: 'flex', flexDirection: 'column'
        }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
              {m.role === 'ai' && (
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: `linear-gradient(135deg, #042c5d, ${persona.color})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: '.65rem', color: '#fff',
                  flexShrink: 0, marginRight: 6, alignSelf: 'flex-end'
                }}>
                  {persona.name[0]}
                </div>
              )}
              <div style={{
                maxWidth: '85%', padding: '8px 12px',
                borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                background: m.role === 'user' ? 'linear-gradient(135deg, #531697, #13a1a5)' : '#1e293b',
                color: '#fff',
                border: m.role === 'user' ? 'none' : '1px solid #2d3748',
                fontSize: '.78rem', lineHeight: 1.5, whiteSpace: 'pre-wrap',
                fontFamily: "'Nunito',sans-serif", boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
              }}>
                {m.loading ? (
                  <span style={{ opacity: .4, animation: 'blink 0.8s ease-in-out infinite' }}>Thinking…</span>
                ) : m.content}
              </div>
            </div>
          ))}
          
          {/* Live speech recognition caption overlay */}
          {listening && liveText && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
              <div style={{
                maxWidth: '85%', padding: '6px 10px', borderRadius: '12px 12px 2px 12px',
                background: 'rgba(83,22,151,0.2)', border: '1px dashed rgba(83,22,151,0.4)',
                fontSize: '.75rem', color: '#c4a0f5', fontStyle: 'italic', fontFamily: "'Nunito',sans-serif"
              }}>
                <span style={{
                  display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
                  background: '#ef4444', marginRight: 5, verticalAlign: 'middle',
                  animation: 'blink 0.7s infinite'
                }} />
                {liveText}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Real-time Performance Metrics */}
        {metrics && (
          <div style={{ padding: '8px 12px', background: '#0a0f1d', flexShrink: 0 }}>
            <ScorePanel m={metrics} />
          </div>
        )}

        {/* Bottom: Answer Submission Control Box */}
        <div style={{ padding: '12px', background: '#0f172a', borderTop: '1px solid #1e293b', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', position: 'relative' }}>
            <textarea
              value={input}
              onChange={e => { setInput(e.target.value); if (!ansStart) setAnsStart(Date.now()); }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAnswer(); } }}
              placeholder={listening ? '🎙️ Listening... speak naturally' : done ? 'Interview complete' : 'Type your answer...'}
              rows={2}
              disabled={loading || !ready || done}
              style={{
                flex: 1, padding: '8px 10px', borderRadius: 8,
                border: `1.5px solid ${listening ? '#ef4444' : '#1e293b'}`,
                fontFamily: "'Nunito',sans-serif", fontSize: '.8rem', resize: 'none', outline: 'none',
                lineHeight: 1.4, color: '#fff', background: done ? '#1e293b' : '#090d16',
                transition: 'border-color 0.2s', boxSizing: 'border-box'
              }}
            />
            
            {/* Microphone Toggle */}
            {supported && !done && (
              <button
                onClick={micPermError ? undefined : (listening ? handleMicStop : handleMicStart)}
                disabled={loading || !ready || micPermError}
                title={micPermError ? 'Microphone blocked' : listening ? '⏹ Stop & Send Answer' : '🎙️ Click to Start Speaking'}
                style={{
                  width: 38, height: 38, borderRadius: '50%', border: 'none', flexShrink: 0,
                  cursor: loading || !ready || micPermError ? 'not-allowed' : 'pointer',
                  background: micPermError ? '#475569' : listening ? 'linear-gradient(135deg,#ef4444,#b91c1c)' : 'linear-gradient(135deg,#531697,#13a1a5)',
                  color: '#fff', fontSize: '.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: micPermError ? 'none' : listening ? '0 0 10px rgba(239,68,68,0.3)' : '0 3px 8px rgba(83,22,151,0.15)',
                  animation: listening ? 'micRing 1.4s ease-in-out infinite' : 'none', transition: 'background 0.2s'
                }}>
                {micPermError ? '🚫' : listening ? '⏹' : '🎙️'}
              </button>
            )}
            
            <button onClick={() => sendAnswer()} disabled={loading || !input.trim() || !ready || done}
              style={{
                padding: '0 16px', height: 42, borderRadius: 10, border: 'none', flexShrink: 0,
                fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: '.84rem',
                cursor: loading || !input.trim() || done ? 'not-allowed' : 'pointer',
                background: loading || !input.trim() || done ? '#1e293b' : 'linear-gradient(135deg,#531697,#13a1a5)',
                color: loading || !input.trim() || done ? '#64748b' : '#fff', transition: 'all 0.2s'
              }}>
              {loading ? '…' : 'Send ↑'}
            </button>
          </div>
          
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: '.65rem', color: '#64748b' }}>
            <span>🎙️ Click mic to start recording · Click again to stop &amp; send your answer</span>
            {scores.length > 0 && <span style={{ color: '#13a1a5', fontWeight: 800 }}>Score: {avgScore}/100</span>}
          </div>
        </div>
      </div>

      {/* Summary report overlay */}
      {done && scores.length > 0 && (
        <div style={{ padding: '18px 22px', borderTop: '1px solid #1e293b', background: '#0a0f1d', width: '100%' }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: '.95rem', color: '#fff', marginBottom: 14 }}>
            📊 Interview Complete — Your Results
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            {[['Overall', `${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}/100`, '#13a1a5'], ['Answered', scores.length, '#531697'], ['Duration', selectedDuration?.label || '—', '#47d372'], ['Best', `${Math.max(...scores)}/100`, '#47d372'], ['Weakest', `${Math.min(...scores)}/100`, '#ef4444']].map(([l, v, c]) => (
              <div key={l} style={{ padding: '12px 18px', background: '#0f172a', borderRadius: 12, border: '1px solid #1e293b', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: '1.1rem', color: c }}>{v}</div>
                <div style={{ fontSize: '.65rem', color: '#64748b', marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: '.68rem', fontWeight: 800, color: '#64748b', marginBottom: 6 }}>PER-QUESTION SCORES</div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end' }}>
              {scores.map((s, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ width: 28, borderRadius: '3px 3px 0 0', height: `${Math.max(4, s * 0.4)}px`, background: s >= 75 ? '#47d372' : s >= 50 ? '#f59e0b' : '#ef4444', transition: 'height .5s ease' }} />
                  <div style={{ fontSize: '.58rem', color: '#64748b' }}>Q{i + 1}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={onEnd} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#531697,#13a1a5)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.86rem' }}>🔄 New Interview</button>
            <button onClick={() => window.speechSynthesis?.cancel()} style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid #1e293b', background: 'transparent', color: '#64748b', fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.82rem' }}>🔇 Stop Voice</button>
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
        @keyframes audioBar { 0% { height: 15%; } 100% { height: 100%; } }
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
        <div style={{fontSize:'.88rem',color:'var(--text-2)',lineHeight:1.75}}>{data.coaching_summary}</div>
        <div style={{marginTop:8,fontSize:'.7rem',color:'#b0bec9'}}>For: <strong style={{color:'#531697'}}>{targetRole}</strong></div>
      </div>
      <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>{secs.map(s=><button key={s.id} onClick={()=>setSection(s.id)} style={{padding:'7px 14px',borderRadius:999,border:`1.5px solid ${section===s.id?'#531697':'#d0d7e8'}`,background:section===s.id?'rgba(83,22,151,0.08)':'#fff',color:section===s.id?'#531697':'var(--text-3)',fontWeight:700,cursor:'pointer',fontSize:'.78rem',fontFamily:"'Nunito',sans-serif"}}>{s.label} ({s.count||0})</button>)}</div>
      {section==='technical'&&<div style={{display:'flex',flexDirection:'column',gap:10}}>{(data.technical_questions||[]).map((q,i)=><div key={i} style={{background:'var(--surface)',border:'1px solid #e8edf5',borderRadius:12,padding:'14px 16px',borderLeft:`3px solid ${dc[q.difficulty]||'#531697'}`}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><div style={{fontWeight:700,fontSize:'.88rem',color:'var(--text)',flex:1,paddingRight:8}}>Q{i+1}. {q.question}</div><span style={{padding:'2px 8px',borderRadius:999,background:`${dc[q.difficulty]||'#531697'}15`,color:dc[q.difficulty]||'#531697',fontSize:'.65rem',fontWeight:700,flexShrink:0,textTransform:'capitalize'}}>{q.difficulty}</span></div><div style={{fontSize:'.78rem',color:'var(--text-3)'}}>💡 {q.tip}</div>{q.skill&&<span style={{display:'inline-block',marginTop:6,padding:'2px 8px',borderRadius:999,background:'rgba(83,22,151,0.07)',color:'#531697',fontSize:'.68rem',fontWeight:700}}>{q.skill}</span>}</div>)}</div>}
      {section==='behavioral'&&<div style={{display:'flex',flexDirection:'column',gap:10}}>{(data.behavioral_questions||[]).map((q,i)=><div key={i} style={{background:'var(--surface)',border:'1px solid #e8edf5',borderRadius:12,padding:'14px 16px',borderLeft:'3px solid #13a1a5'}}><div style={{fontWeight:700,fontSize:'.88rem',color:'var(--text)',marginBottom:6}}>Q{i+1}. {q.question}</div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><span style={{padding:'2px 8px',borderRadius:999,background:'rgba(19,161,165,0.08)',color: 'var(--text)',fontSize:'.68rem',fontWeight:700}}>Use {q.framework}</span><span style={{fontSize:'.75rem',color:'var(--text-3)'}}><em>{q.angle}</em></span></div></div>)}</div>}
      {section==='gap'&&<div style={{display:'flex',flexDirection:'column',gap:10}}>{(data.gap_questions||[]).map((q,i)=><div key={i} style={{background:'var(--surface)',border:'1px solid #e8edf5',borderRadius:12,padding:'14px 16px',borderLeft:'3px solid #f59e0b'}}><div style={{fontWeight:700,fontSize:'.88rem',color:'var(--text)',marginBottom:8}}>⚠️ {q.question}</div><div style={{padding:'10px 12px',background:'rgba(245,158,11,0.06)',borderRadius:8,fontSize:'.8rem',color:'var(--text-2)',lineHeight:1.6}}><strong style={{color:'#92400e'}}>How to handle: </strong>{q.how_to_handle}</div></div>)}</div>}
      {section==='wins'&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))',gap:10}}>{(data.quick_wins||[]).map((w,i)=><div key={i} style={{background:'var(--surface)',border:'1px solid #e8edf5',borderRadius:12,padding:'14px 16px',borderTop:'3px solid #47d372',display:'flex',gap:10}}><div style={{width:26,height:26,borderRadius:'50%',background:'rgba(71,211,114,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:'.75rem',color:'#166534',flexShrink:0}}>{i+1}</div><div style={{fontSize:'.83rem',color:'var(--text-2)',lineHeight:1.6}}>{w}</div></div>)}</div>}
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
  // ── Resume + JD upload for personalised interview ──────────────────────
  const [resumeText,setResumeText]=useState('');
  const [jdText,setJdText]=useState('');
  const [uploadingResume,setUploadingResume]=useState(false);
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

  // Parse uploaded resume PDF/docx to text (client-side via FileReader)
  async function handleResumeUpload(file){
    if(!file)return;
    setUploadingResume(true);
    try{
      // Try to extract text from file (txt fallback — PDF parsing needs backend)
      if(file.type==='text/plain'){
        const text=await file.text();
        setResumeText(text);
      } else {
        // For PDF/DOCX: send to backend /skillpath/extract-text (if available)
        // or send base64 and let the AI analyse from filename + JD context
        const reader=new FileReader();
        reader.onload=async(e)=>{
          const b64=e.target.result.split(',')[1]||'';
          try{
            const res=await fetch(`${API}/skillpath/extract-text`,{
              method:'POST',
              headers:{...tk(),'Content-Type':'application/json'},
              body:JSON.stringify({fileBase64:b64,fileName:file.name}),
            });
            const d=await res.json();
            setResumeText(d.text||'[Resume uploaded — AI will analyse by filename context]');
          }catch{
            setResumeText(`[Resume: ${file.name} — AI will ask generic role questions if text extraction fails]`);
          }
        };
        reader.readAsDataURL(file);
      }
    }finally{setUploadingResume(false);}
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
        <h1 style={{fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:'1.65rem',color:'var(--text)',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',margin:0}}>
          🎤 AI Interview Coach
          <span style={{padding:'4px 12px',borderRadius:999,background:'linear-gradient(135deg,rgba(83,22,151,0.1),rgba(19,161,165,0.1))',color:'#531697',fontSize:'.7rem',fontWeight:800,border:'1px solid rgba(83,22,151,0.15)'}}>Human AI · Voice · Camera · Adaptive</span>
        </h1>
        <p style={{color:'var(--text-3)',marginTop:6,fontSize:'.88rem',marginBottom:0}}>Your AI interviewer speaks, adapts every question to your answer, and listens continuously — just like a real interview.</p>
      </div>

      <div style={{display:'flex',gap:4,marginBottom:22,borderBottom:'1px solid #e8edf5'}}>
        {[['ai','🤖 AI Interview'],['bank','📚 Questions Bank']].map(([id,label])=>(
          <button key={id} onClick={()=>setMainTab(id)} style={{padding:'9px 20px',borderRadius:'10px 10px 0 0',border:'none',borderBottom:mainTab===id?'2.5px solid #531697':'2.5px solid transparent',background:mainTab===id?'rgba(83,22,151,0.06)':'transparent',color:mainTab===id?'#531697':'var(--text-3)',fontWeight:800,cursor:'pointer',fontSize:'.85rem',fontFamily:"'Nunito',sans-serif"}}>{label}</button>
        ))}
      </div>

      {mainTab==='bank'&&(
        <div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14,alignItems:'center'}}>
            <input value={bankSearch} onChange={e=>setBankSearch(e.target.value)} placeholder="🔍 Search questions…" style={{padding:'8px 14px',borderRadius:9,border:'1.5px solid #d0d7e8',fontFamily:"'Nunito',sans-serif",fontSize:'.84rem',flex:1,minWidth:170,outline:'none'}}/>
            {[['Role',BROLES,bankRole,setBankRole],['Subject',BSUBS,bankSub,setBankSub]].map(([label,opts,val,setter])=>(
              <select key={label} value={val} onChange={e=>setter(e.target.value)} style={{padding:'8px 10px',borderRadius:9,border:'1.5px solid #d0d7e8',fontFamily:"'Nunito',sans-serif",fontSize:'.8rem',fontWeight:700,color:'var(--text-2)',background:'var(--surface)',cursor:'pointer'}}>
                {opts.map(o=><option key={o}>{label}: {o}</option>)}
              </select>
            ))}
          </div>
          {bankLoad&&<div style={{textAlign:'center',padding:40,color:'#b0bec9'}}>Loading…</div>}
          {!bankLoad&&bankQs.filter(q=>!bankSearch||q.question?.toLowerCase().includes(bankSearch.toLowerCase())).map(q=>{
            const isOpen=bankOpen===q._id;
            const dc2={Hard:'#ef4444',Medium:'#f59e0b',Easy:'#47d372'}[q.difficulty]||'#531697';
            return(
              <div key={q._id} style={{padding:'14px 18px',marginBottom:10,background:'var(--surface)',border:'1px solid #e8edf5',borderRadius:13}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:7}}>
                      {q.role&&<span style={{padding:'2px 8px',borderRadius:999,background:'rgba(83,22,151,0.08)',color:'#531697',fontSize:'.67rem',fontWeight:700}}>👤 {q.role}</span>}
                      {q.subject&&<span style={{padding:'2px 8px',borderRadius:999,background:'rgba(19,161,165,0.08)',color:'#13a1a5',fontSize:'.67rem',fontWeight:700}}>📘 {q.subject}</span>}
                      {q.difficulty&&<span style={{padding:'2px 8px',borderRadius:999,background:`${dc2}12`,color:dc2,fontSize:'.67rem',fontWeight:700}}>{q.difficulty}</span>}
                    </div>
                    <div style={{fontWeight:700,fontSize:'.9rem',color:'var(--text)',lineHeight:1.55}}>{q.question}</div>
                  </div>
                  <button onClick={()=>setBankOpen(isOpen?null:q._id)} style={{padding:'6px 12px',borderRadius:8,border:'1.5px solid #d0d7e8',background:isOpen?'rgba(83,22,151,0.06)':'transparent',color:'#531697',fontWeight:700,cursor:'pointer',fontSize:'.75rem',flexShrink:0,fontFamily:"'Nunito',sans-serif"}}>{isOpen?'▲ Hide':'▼ Answer'}</button>
                </div>
                {isOpen&&(
                  <div style={{marginTop:14,paddingTop:14,borderTop:'1px solid #f0f3fa'}}>
                    <textarea value={userAns[q._id]||''} onChange={e=>setUserAns(a=>({...a,[q._id]:e.target.value}))} placeholder="Write your answer here…" rows={3} style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1.5px solid #d0d7e8',fontFamily:"'Nunito',sans-serif",fontSize:'.84rem',resize:'vertical',outline:'none',boxSizing:'border-box',marginBottom:10}}/>
                    {q.answer&&<div style={{padding:'10px 14px',background:'rgba(71,211,114,0.07)',border:'1px solid rgba(71,211,114,0.25)',borderRadius:9,fontSize:'.83rem',color:'#166534',lineHeight:1.65,marginBottom:10}}><strong>📖 Suggested:</strong> {q.answer}</div>}
                    {aiAns[q._id]&&<div style={{padding:'10px 14px',background:'rgba(83,22,151,0.05)',border:'1px solid rgba(83,22,151,0.12)',borderRadius:9,fontSize:'.83rem',color:'var(--text-2)',lineHeight:1.65,marginBottom:10}}><strong style={{color:'#531697'}}>🤖 AI:</strong> {aiAns[q._id]}</div>}
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
          <div style={{background:'var(--surface)',border:'1px solid #e8edf5',borderRadius:14,padding:'16px 20px',marginBottom:20,boxShadow:'0 2px 10px rgba(4,44,93,0.05)'}}>
            <div style={{display:'flex',gap:14,flexWrap:'wrap',alignItems:'center',marginBottom:14}}>
              <div style={{fontSize:'.78rem',fontWeight:800,color:'var(--text-2)',flexShrink:0}}>🎯 Target Role:</div>
              <input value={targetRole} onChange={e=>setRole(e.target.value)} placeholder="e.g. Software Engineer, Data Scientist" style={{flex:1,minWidth:200,padding:'9px 14px',borderRadius:9,border:'1.5px solid #d0d7e8',fontFamily:"'Nunito',sans-serif",fontSize:'.9rem',outline:'none',color:'var(--text)'}}/>
              {latest&&<div style={{fontSize:'.72rem',color:'var(--text-3)'}}>ATS: <strong style={{color:'#531697'}}>{latest.atsScore}/100</strong> · Gaps: <strong style={{color:'#991b1b'}}>{gaps.length}</strong></div>}
            </div>
            {/* ── Resume + JD Upload ── */}
            <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'flex-start',marginBottom:14,padding:'12px 14px',borderRadius:11,border:'1.5px solid #e8edf5',background:'#fafbff'}}>
              <div style={{flex:1,minWidth:200}}>
                <div style={{fontSize:'.72rem',fontWeight:800,color:'var(--text-2)',marginBottom:5}}>📄 Upload Resume (optional):</div>
                <input type="file" accept=".pdf,.docx,.txt" onChange={e=>handleResumeUpload(e.target.files?.[0])} style={{fontSize:'.78rem',color:'#531697',cursor:'pointer'}}/>
                {uploadingResume&&<div style={{fontSize:'.68rem',color:'var(--text-3)',marginTop:4}}>⏳ Extracting text…</div>}
                {resumeText&&!uploadingResume&&<div style={{fontSize:'.68rem',color:'#166534',marginTop:4}}>✅ Resume loaded — AI will personalise questions</div>}
              </div>
              <div style={{flex:1,minWidth:200}}>
                <div style={{fontSize:'.72rem',fontWeight:800,color:'var(--text-2)',marginBottom:5}}>📋 Job Description (optional):</div>
                <textarea value={jdText} onChange={e=>setJdText(e.target.value)} placeholder="Paste the JD here — e.g. Amazon SDE-2 requirements…" rows={3}
                  style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1.5px solid #d0d7e8',fontFamily:"'Nunito',sans-serif",fontSize:'.8rem',outline:'none',resize:'vertical',color:'var(--text)',boxSizing:'border-box'}}/>
                {jdText&&<div style={{fontSize:'.68rem',color:'#166534',marginTop:2}}>✅ JD loaded — questions tailored to this role</div>}
              </div>
            </div>
            <div style={{fontSize:'.72rem',fontWeight:800,color:'var(--text-3)',marginBottom:10}}>Interview Type:</div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              {ITYPES.map(t=>(
                <button key={t.id} onClick={()=>setIType(t.id)} style={{padding:'10px 18px',borderRadius:11,border:`1.5px solid ${iType===t.id?t.color:'#d0d7e8'}`,background:iType===t.id?`${t.color}12`:'#fff',color:iType===t.id?t.color:'var(--text-3)',fontWeight:800,cursor:'pointer',fontFamily:"'Nunito',sans-serif",fontSize:'.82rem',display:'flex',alignItems:'center',gap:6}}>
                  {t.icon} {t.id}{iType===t.id&&' ✓'}
                </button>
              ))}
            </div>
            {iType&&<div style={{marginTop:8,fontSize:'.75rem',color:'var(--text-3)'}}>{ITYPES.find(t=>t.id===iType)?.desc}</div>}
          </div>

          {mode&&<button onClick={()=>{setMode(null);setPrepResult(null);setDeepResult(null);setPrepError('');window.speechSynthesis?.cancel();}} style={{marginBottom:16,padding:'7px 16px',borderRadius:9,border:'1.5px solid #d0d7e8',background:'transparent',color:'var(--text-3)',fontWeight:700,cursor:'pointer',fontFamily:"'Nunito',sans-serif",fontSize:'.82rem'}}>← Back to modes</button>}

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
                style={{background:'var(--surface)',border:'1.5px solid #e8edf5',borderRadius:16,padding:'22px 20px',cursor:'pointer',transition:'all .2s',boxShadow:'0 2px 10px rgba(4,44,93,0.05)'}}
                onMouseOver={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.borderColor='#531697';}}
                onMouseOut={e=>{e.currentTarget.style.transform='';e.currentTarget.style.borderColor='#e8edf5';}}>
                <div style={{fontSize:'2rem',marginBottom:10}}>🎯</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:'.95rem',color:'var(--text)',marginBottom:6}}>Full Interview Prep</div>
                <div style={{fontSize:'.8rem',color:'var(--text-3)',lineHeight:1.6}}>Personalised: technical questions, behavioral prep, skill gaps, quick wins.</div>
              </div>
              <div onClick={()=>setMode('tips')}
                style={{background:'var(--surface)',border:'1.5px solid #e8edf5',borderRadius:16,padding:'22px 20px',cursor:'pointer',transition:'all .2s',boxShadow:'0 2px 10px rgba(4,44,93,0.05)'}}
                onMouseOver={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.borderColor='#531697';}}
                onMouseOut={e=>{e.currentTarget.style.transform='';e.currentTarget.style.borderColor='#e8edf5';}}>
                <div style={{fontSize:'2rem',marginBottom:10}}>💡</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:'.95rem',color:'var(--text)',marginBottom:6}}>Topic Deep Dive</div>
                <div style={{fontSize:'.8rem',color:'var(--text-3)',lineHeight:1.6}}>Pick any skill gap — focused explanation, practice questions, quick interview prep.</div>
              </div>
            </div>
          )}

          {mode==='mock'&&<MockInterview key={mockKey} targetRole={targetRole} interviewType={iType} userName={user?.name} resumeText={resumeText} jdText={jdText} onEnd={()=>{setMockKey(k=>k+1);setMode(null);}}/>}

          {mode==='prep'&&(
            <div>
              {prepLoading&&<div style={{textAlign:'center',padding:'50px 0'}}><div style={{width:42,height:42,border:'3px solid #e8edf5',borderTopColor:'#531697',borderRadius:'50%',animation:'spin .7s linear infinite',margin:'0 auto 14px'}}/><div style={{color:'var(--text-3)'}}>Generating prep guide…</div><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>}
              {prepError&&<div style={{padding:'14px 18px',background:'#fee2e2',border:'1px solid #fca5a5',borderRadius:10,color:'#991b1b',fontSize:'.85rem',fontWeight:600,marginBottom:14}}>⚠️ {prepError} <button onClick={runPrep} style={{marginLeft:10,padding:'4px 12px',borderRadius:7,border:'none',background:'#991b1b',color:'#fff',cursor:'pointer',fontFamily:"'Nunito',sans-serif",fontSize:'.78rem'}}>Retry</button></div>}
              {prepResult&&!prepLoading&&<PrepResult data={prepResult} targetRole={targetRole}/>}
            </div>
          )}

          {mode==='tips'&&(
            <div>
              <div style={{background:'var(--surface)',border:'1px solid #e8edf5',borderRadius:14,padding:'20px 22px',marginBottom:16}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'.95rem',marginBottom:12,color:'var(--text)'}}>💡 Topic Deep Dive</div>
                {gaps.length>0&&<div style={{marginBottom:14}}><div style={{fontSize:'.7rem',fontWeight:800,color:'#991b1b',marginBottom:8}}>YOUR SKILL GAPS:</div><div style={{display:'flex',flexWrap:'wrap',gap:6}}>{gaps.slice(0,10).map(s=><button key={s} onClick={()=>setDeepTopic(s)} style={{padding:'5px 12px',borderRadius:999,border:`1.5px solid ${deepTopic===s?'#531697':'rgba(239,68,68,0.3)'}`,background:deepTopic===s?'rgba(83,22,151,0.08)':'rgba(239,68,68,0.06)',color:deepTopic===s?'#531697':'#991b1b',fontSize:'.78rem',fontWeight:700,cursor:'pointer',fontFamily:"'Nunito',sans-serif"}}>{s}</button>)}</div></div>}
                <div style={{display:'flex',gap:10}}>
                  <input value={deepTopic} onChange={e=>setDeepTopic(e.target.value)} placeholder="Type any skill: Docker, System Design, React Hooks…" style={{flex:1,padding:'10px 14px',borderRadius:9,border:'1.5px solid #d0d7e8',fontFamily:"'Nunito',sans-serif",fontSize:'.9rem',outline:'none'}}/>
                  <button onClick={runDeep} disabled={!deepTopic.trim()||deepLoading} style={{padding:'10px 24px',borderRadius:9,border:'none',background:!deepTopic.trim()||deepLoading?'#e8edf5':'linear-gradient(135deg,#531697,#13a1a5)',color:!deepTopic.trim()?'#b0bec9':'#fff',fontWeight:800,cursor:'pointer',fontFamily:"'Nunito',sans-serif"}}>{deepLoading?'…':'Dive In →'}</button>
                </div>
              </div>
              {deepResult&&(
                <div style={{display:'flex',flexDirection:'column',gap:14}}>
                  <div style={{background:'var(--surface)',border:'1px solid #e8edf5',borderRadius:13,padding:'16px 18px'}}><div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'.9rem',marginBottom:10,color:'var(--text)'}}>📖 About {deepTopic}</div><div style={{fontSize:'.86rem',color:'var(--text-2)',lineHeight:1.75}}>{deepResult.explanation}</div></div>
                  {deepResult.practice_questions?.length>0&&<div style={{background:'var(--surface)',border:'1px solid #e8edf5',borderRadius:13,padding:'16px 18px'}}><div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'.9rem',marginBottom:10,color:'var(--text)'}}>❓ Practice Questions</div>{deepResult.practice_questions.map((q,i)=><div key={i} style={{padding:'9px 12px',background:'#f8f9fc',borderRadius:8,marginBottom:7,fontSize:'.84rem',color:'var(--text-2)'}}>Q{i+1}. {q}</div>)}</div>}
                  {deepResult.quick_prep&&<div style={{background:'rgba(83,22,151,0.04)',border:'1px solid rgba(83,22,151,0.12)',borderRadius:13,padding:'14px 18px',fontSize:'.84rem',color:'var(--text-2)',lineHeight:1.7}}><strong style={{color:'#531697'}}>⚡ Quick Interview Prep: </strong>{deepResult.quick_prep}</div>}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}