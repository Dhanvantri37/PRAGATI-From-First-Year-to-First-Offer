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
const tk = () => ({ Authorization: `Bearer ${localStorage.getItem('pragati_token')}` });

// ─── Dynamic Openers ─────────────────────────────────────────────────────────────
const DYNAMIC_OPENERS = {
  Technical: [
    "Let's start with a quick introduction. Walk me through your technical background, the projects you've built, and the technologies you're most comfortable with.",
    "Tell me about a challenging technical problem you've solved recently.",
    "Could you walk me through a project you are particularly proud of?"
  ],
  HR: [
    "Let's start with a quick introduction. Could you tell me a little bit about yourself and your background?",
    "Why are you interested in this position?",
    "Where do you see yourself in five years?"
  ],
  Managerial: [
    "Let's start with a quick introduction. Tell me about your background and how it led you to this field.",
    "Tell me about a time you had to deal with a difficult coworker.",
    "Describe a situation where you showed leadership."
  ]
};
if (typeof window !== 'undefined') window.DYNAMIC_OPENERS = DYNAMIC_OPENERS;

// ─── Continuous STT ───────────────────────────────────────────────────────────
function useContinuousSTT({ lang = (navigator.language || 'en-US'), onPartial, onError } = {}) {
  const [listening, setListening] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [permError, setPermError] = useState(false);
  const [supported] = useState(!!(window.SpeechRecognition || window.webkitSpeechRecognition));

  const recRef = useRef(null);
  const activeRef = useRef(false);
  const accumulatedSpeechRef = useRef(''); // Retain speech across restart cycles
  const mediaStreamRef = useRef(null);
  const onPartialRef = useRef(onPartial);
  const onErrorRef = useRef(onError);
  const langRef = useRef(lang);

  useEffect(() => { onPartialRef.current = onPartial; }, [onPartial]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { langRef.current = lang; }, [lang]);

  const startSessRef = useRef(null);
  startSessRef.current = () => {
    if (!activeRef.current) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    try { recRef.current?.abort(); } catch { }

    const r = new SR();
    r.continuous = true; // Enable continuous speech recognition so pauses do not cut off the student's voice
    r.interimResults = true;
    r.lang = langRef.current || 'en-US';
    r.maxAlternatives = 1;
    recRef.current = r;

    r.onstart = () => setListening(true);

    let sessionFinal = '';

    r.onresult = e => {
      let currentFinal = '', currentInterim = '';
      for (let i = 0; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript;
        if (e.results[i].isFinal) currentFinal += chunk + ' ';
        else currentInterim += chunk;
      }
      sessionFinal = currentFinal;
      const currentChunk = (currentFinal + currentInterim).trim();
      const fullText = (accumulatedSpeechRef.current + ' ' + currentChunk).trim();
      if (fullText) {
        onPartialRef.current?.(fullText);
      }
    };

    r.onerror = e => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        activeRef.current = false;
        setIsActive(false);
        setListening(false);
        setPermError(true);
        onErrorRef.current?.('Microphone permission denied.');
        return;
      }
      if (e.error === 'audio-capture') {
        activeRef.current = false;
        setIsActive(false);
        setListening(false);
        onErrorRef.current?.('No microphone found. Please connect one and try again.');
        return;
      }
      if (e.error === 'network') {
        onErrorRef.current?.('Network issue interrupted speech recognition — retrying…');
      }
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.warn('[STT] recognition error:', e.error);
      }
    };

    r.onend = () => {
      if (sessionFinal) {
        accumulatedSpeechRef.current = (accumulatedSpeechRef.current + ' ' + sessionFinal).trim();
      }
      if (activeRef.current) {
        setTimeout(() => {
          if (activeRef.current) startSessRef.current?.();
        }, 100);
      } else {
        setIsActive(false);
        setListening(false);
      }
    };

    try { r.start(); } catch (err) {
      if (activeRef.current) {
        setTimeout(() => {
          if (activeRef.current) startSessRef.current?.();
        }, 300);
      }
    }
  };

  const start = useCallback(async () => {
    if (!supported) return;
    accumulatedSpeechRef.current = ''; // Fresh reset when user clicks mic
    activeRef.current = true;
    setIsActive(true);
    startSessRef.current();
  }, [supported]);

  const stop = useCallback(() => {
    activeRef.current = false;
    setIsActive(false);
    try { recRef.current?.stop(); } catch { }
    setListening(false);
  }, []);

  useEffect(() => () => {
    activeRef.current = false;
    setIsActive(false);
    try { recRef.current?.abort(); } catch { }
  }, []);

  return { listening, isActive, supported, permError, start, stop };
}

// ─── Answer scoring ───────────────────────────────────────────────────────────
const FILLERS = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally', 'sort of', 'kind of', 'right so', 'okay so', 'i mean'];
function scoreAnswer(text, secs) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const fCount = FILLERS.reduce((n, w) => n + (text.toLowerCase().split(w).length - 1), 0);
  const wpm = secs > 2 ? Math.round((words / secs) * 60) : 0;
  const hasEg = /example|project|experience|built|worked|implemented|used|developed/i.test(text);
  const hasStar = /(situation|task|action|result)/i.test(text);
  let s = 45;
  if (words >= 80) s += 20; else if (words >= 40) s += 10; else if (words < 15) s -= 20;
  if (fCount <= 1) s += 10; else if (fCount > 5) s -= 12;
  if (wpm >= 90 && wpm <= 165) s += 8; else if (wpm > 200 || (wpm > 0 && wpm < 55)) s -= 8;
  if (hasEg) s += 10; if (hasStar) s += 7;
  s = Math.max(10, Math.min(100, s));
  return {
    score: s, words, fCount, wpm, hasEg, hasStar,
    clarity: s >= 78 ? 'Excellent' : s >= 58 ? 'Good' : s >= 38 ? 'Fair' : 'Needs Work',
    pace: wpm > 185 ? 'Too Fast' : wpm > 0 && wpm < 65 ? 'Too Slow' : 'Good'
  };
}

// ─── Tech detection + drilldowns ─────────────────────────────────────────────
const TECH_KW = {
  react: ['react', 'jsx', 'hook', 'usestate', 'useeffect', 'redux', 'context api', 'next.js', 'nextjs'],
  java: ['java', 'spring', 'springboot', 'hibernate', 'jvm', 'maven', 'gradle', 'multithreading'],
  python: ['python', 'django', 'flask', 'fastapi', 'pandas', 'numpy', 'tensorflow', 'pytorch'],
  nodejs: ['node', 'express', 'nodejs', 'nestjs', 'typescript', 'javascript backend'],
  database: ['sql', 'mysql', 'postgres', 'mongodb', 'database', 'nosql', 'redis', 'orm', 'schema'],
  cloud: ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'ci/cd', 'devops', 'terraform'],
  ml: ['machine learning', 'deep learning', 'neural', 'nlp', 'model training', 'classification'],
  sysdesign: ['system design', 'scalab', 'load balanc', 'cache', 'cdn', 'kafka', 'sharding'],
};
function detectTech(msgs) {
  const text = msgs.filter(m => m.role === 'user').map(m => m.content).join(' ').toLowerCase();
  return Object.entries(TECH_KW).filter(([, kws]) => kws.some(k => text.includes(k))).map(([t]) => t);
}
const DRILLS = {
  react: ["Walk me through how React's reconciliation algorithm decides what to re-render. How does virtual DOM diffing work?", "Explain useCallback vs useMemo with a real scenario where each prevents a performance issue.", "How do you prevent unnecessary re-renders? Give 3 techniques with their trade-offs."],
  java: ["How does the JVM garbage collector work? Difference between young generation and old generation?", "Explain synchronized vs volatile vs AtomicInteger in Java concurrency — when do you use each?", "Walk me through @Component, @Service, and @Repository in Spring — does the choice actually matter?"],
  python: ["Explain Python's GIL. How do you achieve real parallelism in Python despite it?", "Difference between a generator and list comprehension? Give a real scenario where you'd choose one.", "How does Python memory management work? Explain reference counting and cyclic garbage collection."],
  nodejs: ["How does Node.js handle thousands of concurrent connections with a single thread? Explain the event loop.", "What's the difference between process.nextTick(), setImmediate(), and setTimeout(0)?", "How do you handle CPU-intensive tasks in Node.js without blocking the event loop?"],
  database: ["Explain clustered vs non-clustered index. When would adding an index actually hurt performance?", "What is the N+1 query problem and how do you detect and fix it?", "Explain ACID properties — how does a database ensure atomicity during a crash?"],
  cloud: ["How do you handle zero-downtime deployments in Kubernetes? Walk me through your strategy.", "Horizontal vs vertical scaling — when does horizontal scaling break down for stateful services?", "How do you manage secrets in a containerized production environment?"],
  ml: ["How do you handle class imbalance? Trade-offs between oversampling and undersampling?", "Explain the bias-variance tradeoff. How do you diagnose which is causing underperformance?", "What's the difference between L1 and L2 regularization and how do they affect your model?"],
  sysdesign: ["Design a URL shortener like bit.ly for 100 million daily requests. Walk me through the key components.", "How would you design a notification system delivering 1 million push notifications per minute?", "Explain consistent hashing — why is it used in distributed cache clusters?"],
};
const HR_QS = ["Tell me about a time you strongly disagreed with your team's decision. How did you handle it?", "Describe a situation where you had to deliver bad news to a stakeholder.", "Give an example of when you took initiative on something outside your responsibilities.", "Tell me about your biggest professional failure. What did you learn and do differently?", "Describe a time you had to work under extreme pressure with a tight deadline.", "How do you handle critical feedback you disagree with? Give a real example.", "Tell me about a time you had to influence someone without having formal authority."];
const GENERIC_Q = ["Walk me through the most challenging technical problem you've solved and how you debugged it.", "How do you ensure code quality when working under a tight deadline?", "Describe a project where you made a significant architectural decision. What alternatives did you consider?", "How do you approach learning a new technology you've never used before?", "Tell me about a time a production issue occurred. What was your debugging approach?"];

async function getDynamicNext({ msgs, answer, qNum, isLast, role, type, resumeText, jdText }) {
  const techs = detectTech(msgs);
  const history = msgs.slice(-6).map(m => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`).join('\n');
  const techCtx = techs.length ? `\nDetected technologies: ${techs.join(', ')}` : '';

  const prompt = `You are an expert ${type || 'technical'} interviewer at a top Indian tech company interviewing for ${role}.${techCtx}

Recent conversation:
${history}

Candidate just answered: "${answer}"

1. Give 2 sentences of SPECIFIC constructive feedback (what was good + one concrete improvement)
2. ${isLast ? 'Congratulate them warmly and give a 2-sentence overall performance summary.' : `Generate ONE sharp follow-up question that DIRECTLY builds on what they just said:
   - If they mentioned a specific tech → probe deeper into THAT technology
   - Vague answer (under 30 words, no examples) → ask for a concrete project example
   - Strong answer → push with an edge case or failure scenario
   - HR type → behavioral STAR follow-up
   - NEVER repeat a previous question`}

Return ONLY valid JSON:
{"feedback":"...","nextQuestion":${isLast ? 'null' : '"..."'},"confidence":7,"keyMissing":"one missing thing or empty string"}${resumeText ? `\n\nCandidate's Resume (excerpt):\n${resumeText.slice(0, 1500)}` : ''}${jdText ? `\n\nJob Description:\n${jdText.slice(0, 1500)}` : ''}`;

  try {
    const res = await fetch(`${API}/skillpath/dynamic-interview`, { method: 'POST', headers: { ...tk(), 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, targetRole: role, interviewType: type, lastAnswer: answer, isLast: isLast || false }) });
    if (!res.ok) throw new Error();
    const d = await res.json(); if (d?.feedback) return d; throw new Error();
  } catch { return localFallback(answer, techs, qNum, type, isLast); }
}

function localFallback(answer, techs, qNum, type, isLast) {
  const hasEg = /example|project|built|used|worked/i.test(answer);
  const words = answer.trim().split(/\s+/).filter(Boolean).length;
  const isWeak = words < 30 || !hasEg;
  if (isLast) return { feedback: 'Good effort overall! Focus on adding concrete project examples and STAR format for stronger answers.', nextQuestion: null, confidence: 7, keyMissing: '' };
  for (const tech of techs) { if (DRILLS[tech]) return { feedback: `Good ${tech} mention.${!hasEg ? ' Tie it to a specific project next time.' : ''}`, nextQuestion: DRILLS[tech][qNum % DRILLS[tech].length], confidence: 7, keyMissing: hasEg ? '' : 'Project reference' }; }
  if (isWeak) return { feedback: 'Brief answer — use the STAR format and mention a real project.', nextQuestion: 'Can you give a specific example from one of your projects that illustrates that?', confidence: 4, keyMissing: 'STAR example' };
  if (type === 'HR') return { feedback: `${hasEg ? 'Good behavioral answer.' : 'Add a real situation next time.'}`, nextQuestion: HR_QS[qNum % HR_QS.length], confidence: 7, keyMissing: '' };
  return { feedback: `${words >= 60 ? 'Good depth.' : 'Try to elaborate more.'} ${hasEg ? '' : 'Mention a real project.'}`, nextQuestion: GENERIC_Q[qNum % GENERIC_Q.length], confidence: 6, keyMissing: hasEg ? '' : 'Project example' };
}


// ─── Personas ──────────────────────────────────────────────────────────────────
const PERSONAS = {
  Technical: { name: 'Arjun Sharma', title: 'Senior Engineer', company: 'TechSphere', color: '#531697', photo: '/arjun_sharma.png' },
  HR: { name: 'Priya Mehta', title: 'HR Manager', company: 'InnoSoft', color: '#13a1a5', photo: '/priya_mehta.png' },
  Managerial: { name: 'Vikram Nair', title: 'Engineering Manager', company: 'BuildScale', color: '#47d372', photo: '/vikram_nair.png' },
};

// ─── AI Avatar — professional portrait photo with animated status ring ───────────────
function AIAvatar({ isSpeaking, isThinking, isListening, persona, size = 132 }) {
  const col = persona?.color || '#531697';
  const ringBg = isSpeaking
    ? `conic-gradient(from 0deg,${col},#13a1a5,#47d372,${col})`
    : isListening ? 'conic-gradient(from 0deg,#ef4444,#f97316,#ef4444)'
      : isThinking ? 'conic-gradient(from 0deg,#f59e0b,#ef4444,#f59e0b)'
        : `conic-gradient(from 0deg,${col},rgba(255,255,255,0.12),${col})`;

  const [imgErr, setImgErr] = useState(false);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {/* Animated status ring */}
      <div style={{
        position: 'absolute', inset: -6, borderRadius: '50%',
        background: ringBg,
        animation: isSpeaking || isListening || isThinking ? 'avSpin 1.6s linear infinite' : 'avPulse 3.5s ease-in-out infinite',
        opacity: .9
      }} />
      {/* Portrait */}
      <div style={{
        position: 'absolute', inset: 4, borderRadius: '50%', overflow: 'hidden',
        border: `2px solid ${col}44`,
        background: 'linear-gradient(145deg,#1c2b42,#0f1a2e)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {persona?.photo && !imgErr
          ? <img src={persona.photo} alt={persona.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
            onError={() => setImgErr(true)}
          />
          : <span style={{ color: '#fff', fontWeight: 900, fontSize: Math.round(size * 0.35), fontFamily: "'Syne',sans-serif" }}>
            {persona?.name?.[0] || '?'}
          </span>
        }
      </div>
      {/* Status dot */}
      <div style={{
        position: 'absolute', bottom: 4, right: 4,
        width: 12, height: 12, borderRadius: '50%',
        background: isSpeaking ? '#47d372' : isListening ? '#ef4444' : isThinking ? '#f59e0b' : '#64748b',
        border: '2px solid #0f1a2e',
        boxShadow: isSpeaking ? '0 0 8px #47d372' : isListening ? '0 0 8px #ef4444' : 'none',
      }} />
      {/* Sound rings */}
      {isSpeaking && [1, 2, 3].map(i => <div key={i} style={{ position: 'absolute', inset: -(i * 13), borderRadius: '50%', border: `1.5px solid ${col}44`, animation: `sndRing 1.6s ease-out ${i * 0.32}s infinite`, pointerEvents: 'none' }} />)}
      {isListening && [1, 2].map(i => <div key={i} style={{ position: 'absolute', inset: -(i * 12), borderRadius: '50%', border: '1.5px solid rgba(239,68,68,0.5)', animation: `sndRing 1.3s ease-out ${i * 0.3}s infinite`, pointerEvents: 'none' }} />)}
    </div>
  );
}

// Script loader hook
function useScript(src) {
  const [status, setStatus] = useState(src ? "loading" : "idle");
  useEffect(() => {
    if (!src) {
      setStatus("idle");
      return;
    }
    let script = document.querySelector(`script[src="${src}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.setAttribute("data-status", "loading");
      document.body.appendChild(script);
      const setAttributeFromEvent = (event) => {
        script.setAttribute(
          "data-status",
          event.type === "load" ? "ready" : "error"
        );
      };
      script.addEventListener("load", setAttributeFromEvent);
      script.addEventListener("error", setAttributeFromEvent);
    } else {
      setStatus(script.getAttribute("data-status"));
    }
    const setStateFromEvent = (event) => {
      setStatus(event.type === "load" ? "ready" : "error");
    };
    script.addEventListener("load", setStateFromEvent);
    script.addEventListener("error", setStateFromEvent);
    return () => {
      if (script) {
        script.removeEventListener("load", setStateFromEvent);
        script.removeEventListener("error", setStateFromEvent);
      }
    };
  }, [src]);
  return status;
}

// ─── VideoHeadInterviewer — Premium Realistic Looping Human Videos & Fail-Safe Fallback ─────────────────
function VideoHeadInterviewer({ isSpeaking, isThinking, isListening, persona }) {
  const pName = persona?.name || 'Arjun Sharma';

  const videos = {
    'Arjun Sharma': {
      idle: 'https://assets.mixkit.co/videos/preview/mixkit-man-in-office-smiling-at-camera-35802-large.mp4',
      speaking: 'https://assets.mixkit.co/videos/preview/mixkit-man-in-office-talking-to-camera-35805-large.mp4'
    },
    'Priya Mehta': {
      idle: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-with-glasses-nodding-and-smiling-34675-large.mp4',
      speaking: 'https://assets.mixkit.co/videos/preview/mixkit-businesswoman-talking-to-camera-in-office-41584-large.mp4'
    },
    'Vikram Nair': {
      idle: 'https://assets.mixkit.co/videos/preview/mixkit-man-looking-at-camera-with-serious-expression-39906-large.mp4',
      speaking: 'https://assets.mixkit.co/videos/preview/mixkit-man-talking-at-camera-in-office-39912-large.mp4'
    }
  }[pName] || {
    idle: 'https://assets.mixkit.co/videos/preview/mixkit-man-in-office-smiling-at-camera-35802-large.mp4',
    speaking: 'https://assets.mixkit.co/videos/preview/mixkit-man-in-office-talking-to-camera-35805-large.mp4'
  };

  const idleVideoRef = useRef(null);
  const speakingVideoRef = useRef(null);
  const [videoError, setVideoError] = useState(false);
  const [isPlayingWord, setIsPlayingWord] = useState(false);

  // Lip-sync tracking effect
  useEffect(() => {
    if (videoError) return;

    if (!isSpeaking) {
      setIsPlayingWord(false);
      if (speakingVideoRef.current) {
        try { speakingVideoRef.current.pause(); } catch { }
      }
      if (idleVideoRef.current) {
        try { idleVideoRef.current.play().catch(() => { }); } catch { }
      }
      return;
    }

    let intervalId = null;
    let audioContext = null;
    let analyser = null;

    const setupAudioAnalysis = () => {
      const audio = window.pragatiAudioPlayer;
      if (!audio) return false;

      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContextClass();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;

        const source = audioContext.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioContext.destination);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkAmplitude = () => {
          if (!audio.paused && isSpeaking) {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const average = sum / bufferLength;
            const active = average > 12;
            setIsPlayingWord(active);
            if (active) {
              if (speakingVideoRef.current && speakingVideoRef.current.paused) {
                speakingVideoRef.current.play().catch(() => { });
              }
            } else {
              if (speakingVideoRef.current && !speakingVideoRef.current.paused) {
                speakingVideoRef.current.pause();
              }
            }
          } else {
            setIsPlayingWord(false);
            if (speakingVideoRef.current && !speakingVideoRef.current.paused) {
              speakingVideoRef.current.pause();
            }
          }
        };

        intervalId = setInterval(checkAmplitude, 80);
        return true;
      } catch (err) {
        console.warn('[LipSync] Web Audio connect failed, using timed simulation fallback:', err.message);
        return false;
      }
    };

    let success = false;
    const timeoutId = setTimeout(() => {
      success = setupAudioAnalysis();

      if (!success) {
        let toggle = true;
        intervalId = setInterval(() => {
          const audio = window.pragatiAudioPlayer;
          const isSynthesisSpeaking = window.speechSynthesis && window.speechSynthesis.speaking;
          const isAudioPlaying = audio && !audio.paused;

          if (isAudioPlaying || isSynthesisSpeaking) {
            toggle = Math.random() > 0.15 ? !toggle : toggle;
            setIsPlayingWord(toggle);
            if (toggle) {
              if (speakingVideoRef.current && speakingVideoRef.current.paused) {
                speakingVideoRef.current.play().catch(() => { });
              }
            } else {
              if (speakingVideoRef.current && !speakingVideoRef.current.paused) {
                speakingVideoRef.current.pause();
              }
            }
          } else {
            setIsPlayingWord(false);
            if (speakingVideoRef.current && !speakingVideoRef.current.paused) {
              speakingVideoRef.current.pause();
            }
          }
        }, 120);
      }
    }, 150);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
      if (audioContext) {
        try { audioContext.close(); } catch { }
      }
    };
  }, [isSpeaking, videoError]);

  if (videoError) {
    return (
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        background: 'radial-gradient(circle at center, #1e1b4b 0%, #070a14 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{
          position: 'relative', width: 140, height: 140, borderRadius: '50%',
          border: `3px solid ${persona.color || '#531697'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 40px ${persona.color || '#531697'}75`,
          animation: isSpeaking ? 'pulse 1.2s ease-in-out infinite' : 'none'
        }}>
          <AIAvatar isSpeaking={isSpeaking} isThinking={isThinking} isListening={isListening} persona={persona} size={130} />
        </div>
        <div style={{ marginTop: 18, textAlign: 'center' }}>
          <div style={{ color: '#fff', fontWeight: 900, fontSize: '1.05rem', fontFamily: "'Syne', sans-serif" }}>{persona.name}</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '.78rem', marginTop: 3 }}>{persona.title} · {persona.company}</div>
        </div>
      </div>
    );
  }

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

      {/* Main Face Container */}
      <div style={{
        position: 'relative',
        height: '100%',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Idle video loop */}
        <video
          ref={idleVideoRef}
          src={videos.idle}
          autoPlay
          loop
          muted
          playsInline
          onError={() => setVideoError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: isSpeaking ? 'none' : 'block'
          }}
        />

        {/* Speaking video loop */}
        <video
          ref={speakingVideoRef}
          src={videos.speaking}
          loop
          muted
          playsInline
          onError={() => setVideoError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: isSpeaking ? 'block' : 'none'
          }}
        />
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
          background: isSpeaking ? (isPlayingWord ? '#47d372' : '#f59e0b') : isThinking ? '#f59e0b' : '#38bdf8',
          boxShadow: isSpeaking && isPlayingWord ? '0 0 8px #47d372' : 'none'
        }} />
        <span style={{ fontSize: '.72rem', color: '#f8fafc', fontWeight: 800 }}>{pName}</span>
      </div>
    </div>
  );
}

// ─── Webcam panel with active presence detection proctoring ──────────────────
function WebcamPanel({ enabled, onToggle, onFaceDetected, trackingLoaded }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const trackerTaskRef = useRef(null);
  const missedFramesRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
      if (videoRef.current) videoRef.current.srcObject = null;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (trackerTaskRef.current) { try { trackerTaskRef.current.stop(); } catch (e) { } trackerTaskRef.current = null; }
      return;
    }

    let cancelled = false;

    navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' }, audio: false })
      .then(stream => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.width = 320;
          videoRef.current.height = 240;
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => { });
        }

        // Prefer real face detection via tracking.js — this actually tells us
        // whether the candidate's face is present/centered (i.e. looking at
        // the screen), instead of guessing from raw pixel motion.
        if (trackingLoaded && window.tracking && videoRef.current) {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 320;
            canvas.height = 240;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            const tracker = new window.tracking.ObjectTracker('face');
            tracker.setInitialScale(4);
            tracker.setStepSize(1.7);
            tracker.setEdgesDensity(0.1);

            tracker.on('track', event => {
              const rects = event.data || [];
              if (rects.length > 0) {
                missedFramesRef.current = 0;
                const rect = rects[0];
                const videoW = 320;
                const videoH = 240;
                const faceCenterX = rect.x + rect.width / 2;
                const faceCenterY = rect.y + rect.height / 2;
                const offX = Math.abs(faceCenterX - videoW / 2) / videoW;
                const offY = Math.abs(faceCenterY - videoH / 2) / videoH;
                // Face detected AND roughly centered ⇒ looking at the screen.
                // Off to one side/top/bottom ⇒ looking away.
                const lookingAway = offX > 0.35 || offY > 0.38;
                onFaceDetected(!lookingAway);
              } else {
                // Require a couple of consecutive misses before flagging
                // "away" so a single dropped frame doesn't cause a flicker.
                missedFramesRef.current += 1;
                if (missedFramesRef.current >= 5) onFaceDetected(false);
              }
            });

            const trackInterval = setInterval(() => {
              if (videoRef.current && videoRef.current.readyState >= 2) {
                try {
                  ctx.drawImage(videoRef.current, 0, 0, 320, 240);
                  const imageData = ctx.getImageData(0, 0, 320, 240);
                  tracker.track(imageData.data, 320, 240);
                } catch (e) {
                  console.warn('[Proctoring] Throttled tracker step failed:', e);
                }
              }
            }, 600);

            trackerTaskRef.current = {
              stop: () => clearInterval(trackInterval)
            };
            return; // real detection active — skip the fallback heuristic
          } catch (e) {
            console.warn('[Proctoring] tracking.js face tracker failed, falling back:', e);
          }
        }

        // Fallback (used only if tracking.js hasn't loaded / isn't available):
        // just flags a blocked/blacked-out camera. It intentionally does NOT
        // treat motion as "looking away" — normal fidgeting/talking used to
        // falsely trigger the old heuristic and made the alert unreliable.
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 24;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        intervalRef.current = setInterval(() => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            ctx.drawImage(videoRef.current, 0, 0, 32, 24);
            const imgData = ctx.getImageData(0, 0, 32, 24).data;
            let sum = 0;
            for (let i = 0; i < imgData.length; i += 4) {
              sum += (imgData[i] + imgData[i + 1] + imgData[i + 2]) / 3;
            }
            const avg = sum / (imgData.length / 4);
            const isCameraBlocked = avg <= 10;
            onFaceDetected(!isCameraBlocked);
          } catch (e) {
            onFaceDetected(true);
          }
        }, 500);
      })
      .catch(() => onToggle(false));

    return () => {
      cancelled = true;
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); }
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (trackerTaskRef.current) { try { trackerTaskRef.current.stop(); } catch (e) { } trackerTaskRef.current = null; }
    };
  }, [enabled, onToggle, onFaceDetected, trackingLoaded]);

  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: 'var(--text)', border: '2px solid rgba(83,22,151,0.3)', flexShrink: 0 }}>
      {enabled ? (
        <>
          <video ref={videoRef} muted playsInline autoPlay style={{ width: 220, height: 160, objectFit: 'cover', display: 'block', transform: 'scaleX(-1)' }} />
          <div style={{ position: 'absolute', bottom: 6, left: 6, display: 'flex', gap: 4, alignItems: 'center' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#47d372', animation: 'blink .8s ease-in-out infinite' }} />
            <span style={{ fontSize: '.58rem', color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>Camera On</span>
          </div>
          <button onClick={() => onToggle(false)} style={{ position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', fontSize: '.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </>
      ) : (
        <button onClick={() => onToggle(true)} style={{ width: 220, height: 160, background: 'rgba(83,22,151,0.08)', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: "'Nunito',sans-serif" }}>
          <span style={{ fontSize: '1.8rem' }}>📷</span>
          <span style={{ fontSize: '.72rem', color: '#531697', fontWeight: 800 }}>Enable Camera</span>
          <span style={{ fontSize: '.62rem', color: 'var(--text-3)', maxWidth: 150, textAlign: 'center', lineHeight: 1.4 }}>See yourself like a real interview. No recording — local only.</span>
        </button>
      )}
    </div>
  );
}

// ─── Score Panel ──────────────────────────────────────────────────────────────
function ScorePanel({ m }) {
  if (!m) return null;
  const col = m.score >= 75 ? '#166534' : m.score >= 50 ? '#92400e' : '#991b1b';
  const bar = m.score >= 75 ? '#47d372' : m.score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ padding: '10px 16px', borderRadius: 11, background: `${col}0d`, border: `1px solid ${col}20`, marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: '1.2rem', color: col }}>{m.score}<span style={{ fontSize: '.6rem', fontWeight: 700 }}>/100</span></div>
        <div style={{ flex: 1, height: 5, background: '#e8edf5', borderRadius: 999, minWidth: 60 }}><div style={{ width: `${m.score}%`, height: '100%', borderRadius: 999, background: bar, transition: 'width .7s ease' }} /></div>
        <span style={{ fontSize: '.7rem', fontWeight: 800, color: col }}>{m.clarity}</span>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[['📝', 'Words', m.words, m.words >= 50 ? '#166534' : '#92400e'], ['💬', 'Fillers', m.fCount, m.fCount <= 2 ? '#166534' : '#991b1b'], ['⚡', 'Pace', m.wpm > 0 ? `${m.wpm}wpm` : '—', m.pace === 'Good' ? '#166534' : '#92400e'], ['📖', 'Example', m.hasEg ? 'Yes ✓' : 'Missing', m.hasEg ? '#166534' : '#991b1b'], ['⭐', 'STAR', m.hasStar ? 'Yes ✓' : 'No', m.hasStar ? '#166534' : 'var(--text-3)']].map(([ic, label, val, c]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '.7rem' }}>
            <span>{ic}</span><span style={{ color: 'var(--text-3)' }}>{label}:</span><strong style={{ color: c }}>{val}</strong>
          </div>
        ))}
      </div>
      {!m.hasEg && <div style={{ marginTop: 5, fontSize: '.7rem', color: '#92400e' }}>💡 Mention a project/experience to score higher</div>}
      {m.fCount > 4 && <div style={{ marginTop: 3, fontSize: '.7rem', color: '#991b1b' }}>⚠️ Reduce filler words: "um", "uh", "like", "basically"…</div>}
    </div>
  );
}

// ─── Duration options ─────────────────────────────────────────────────────────
const DURATION_OPTIONS = [
  { label: '5 min', secs: 5 * 60 },
  { label: '10 min', secs: 10 * 60 },
  { label: '15 min', secs: 15 * 60 },
  { label: '20 min', secs: 20 * 60 },
  { label: '30 min', secs: 30 * 60 },
];

function formatTime(s) {
  const m = Math.floor(s / 60), r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

// ─── Mock Interview ───────────────────────────────────────────────────────────
function MockInterview({ targetRole, interviewType, userName, resumeText = '', jdText = '', onEnd }) {
  const persona = PERSONAS[interviewType] || PERSONAS.Technical;

  // Stable ref for onPartial — avoids TDZ since setLiveText/ansStart are declared below
  const onPartialRef = useRef(null);
  const [sttError, setSttError] = useState('');
  const { listening, isActive, supported, permError: micPermError, start: startMic, stop: stopMic } = useContinuousSTT({
    lang: 'en-IN',
    onPartial: useCallback((t) => { if (onPartialRef.current) onPartialRef.current(t); }, []),
    onError: useCallback((msg) => setSttError(msg), []),
  });

  // Script status for tracking.js
  const trackStatus = useScript("https://cdnjs.cloudflare.com/ajax/libs/tracking.js/1.1.3/tracking-min.js");
  const faceStatus = useScript(trackStatus === "ready" ? "https://cdnjs.cloudflare.com/ajax/libs/tracking.js/1.1.3/data/face-min.js" : null);
  const trackingLoaded = trackStatus === "ready" && faceStatus === "ready";

  // Hardware Setup & Duration Selection states
  const [setupStream, setSetupStream] = useState(null);
  const [micGranted, setMicGranted] = useState(false);
  const [camGranted, setCamGranted] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [checkingHardware, setCheckingHardware] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const setupVideoRef = useRef(null);
  const setupAudioAnalyserRef = useRef(null);
  const setupStreamRef = useRef(null);

  const [selectedDuration, setSelectedDuration] = useState(null); // null = not started
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);

  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [qNum, setQNum] = useState(0);
  const [metrics, setMetrics] = useState(null);
  const [scores, setScores] = useState([]);
  const [ansStart, setAnsStart] = useState(null);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [done, setDone] = useState(false);
  const [liveText, setLiveText] = useState('');
  const [camEnabled, setCamEnabled] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [voiceGender, setVoiceGender] = useState('female');

  // Proctoring States
  const [facePresent, setFacePresent] = useState(true);
  const [gazeAwaySeconds, setGazeAwaySeconds] = useState(0);
  const [gazeWarningCount, setGazeWarningCount] = useState(0);
  const [showGazeAlert, setShowGazeAlert] = useState(false);

  const [bgNoiseSeconds, setBgNoiseSeconds] = useState(0);
  const [bgNoiseWarningCount, setBgNoiseWarningCount] = useState(0);
  const [showBgNoiseAlert, setShowBgNoiseAlert] = useState(false);

  // Active decibels tracking for proctoring
  const [realtimeInputVol, setRealtimeInputVol] = useState(0);

  const bottomRef = useRef(null);
  const sendRef = useRef(null);
  const doneRef = useRef(false);
  const audioContextRef = useRef(null);
  const streamAnalyserRef = useRef(null);
  const monitorStreamRef = useRef(null);
  const gazeAlertDismissed = useRef(false);
  const bgNoiseAlertDismissed = useRef(false);

  // Wire up stable onPartial ref now that state setters are declared
  useEffect(() => {
    onPartialRef.current = (t) => {
      setLiveText(t);
      setInput(t);
      setAnsStart(prev => prev ?? Date.now());
    };
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, liveText]);

  // Pause Layout Wake-Word Recognition while in Mock Interview Page to avoid microphone resource contention
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('pragati-pause-wake-word'));
    return () => {
      window.dispatchEvent(new CustomEvent('pragati-resume-wake-word'));
      if (setupStreamRef.current) {
        setupStreamRef.current.getTracks().forEach(t => t.stop());
        setupStreamRef.current = null;
      }
    };
  }, []);

  // Request permissions and verify hardware
  const startHardwareVerification = async () => {
    setCheckingHardware(true);
    setSetupError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 320, height: 240 } });
      setupStreamRef.current = stream;
      setSetupStream(stream);
      setMicGranted(true);
      setCamGranted(true);

      // Delay slightly to let ref bind
      setTimeout(() => {
        if (setupVideoRef.current) {
          setupVideoRef.current.srcObject = stream;
        }
      }, 200);

      // Micro sound meter
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContextClass();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        setupAudioAnalyserRef.current = { ctx, analyser };

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateMeter = () => {
          if (!stream.active) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const avg = sum / bufferLength;
          setMicVolume(Math.min(100, Math.round(avg * 2.5)));
          requestAnimationFrame(updateMeter);
        };
        requestAnimationFrame(updateMeter);
      } catch (ae) {
        console.warn('Meter setup failed:', ae);
      }
    } catch (err) {
      console.error(err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setSetupError('Access denied. Please click the lock/camera icon in your URL bar to allow camera and microphone access.');
      } else {
        setSetupError(`Device connection failed: ${err.message}`);
      }
      setMicGranted(false);
      setCamGranted(false);
    } finally {
      setCheckingHardware(false);
    }
  };

  // Close hardware stream
  const releaseSetupStream = () => {
    if (setupStreamRef.current) {
      setupStreamRef.current.getTracks().forEach(t => t.stop());
      setupStreamRef.current = null;
    }
    if (setupStream) {
      setupStream.getTracks().forEach(t => t.stop());
      setSetupStream(null);
    }
    if (setupAudioAnalyserRef.current?.ctx) {
      try { setupAudioAnalyserRef.current.ctx.close(); } catch (e) { }
      setupAudioAnalyserRef.current = null;
    }
  };

  // Connect active mic analysis during interview for proctoring (background
  // noise detection). IMPORTANT: this must NOT stay open while the candidate
  // is using the mic to answer — holding two simultaneous getUserMedia audio
  // streams open at once causes some browsers/OSes to starve or silence
  // whichever stream is second, which is why the answer mic looked "on" but
  // never actually captured any speech. See stopInterviewAudioMonitor below,
  // which releases this stream whenever STT `listening` becomes true.
  const stopInterviewAudioMonitor = useCallback(() => {
    if (monitorStreamRef.current) {
      monitorStreamRef.current.getTracks().forEach(t => t.stop());
      monitorStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) { }
      audioContextRef.current = null;
    }
    streamAnalyserRef.current = null;
    setRealtimeInputVol(0);
  }, []);

  const startInterviewAudioMonitor = useCallback(() => {
    if (doneRef.current || monitorStreamRef.current) return;
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then(stream => {
        if (doneRef.current || monitorStreamRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        monitorStreamRef.current = stream;
        try {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          const ctx = new AudioContextClass();
          const src = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          src.connect(analyser);
          audioContextRef.current = ctx;
          streamAnalyserRef.current = analyser;

          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          const loopVal = () => {
            if (doneRef.current || monitorStreamRef.current !== stream) {
              return; // stopped (interview ended, or superseded by a restart)
            }
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const avg = sum / bufferLength;
            setRealtimeInputVol(Math.round(avg));
            requestAnimationFrame(loopVal);
          };
          requestAnimationFrame(loopVal);
        } catch (e) {
          console.warn('Interview audio monitor setup failed:', e);
        }
      })
      .catch(e => console.warn('Could not monitor interview audio:', e));
  }, []);

  // Release the proctoring mic the moment the candidate starts speaking into
  // the answer mic, and bring it back once they stop — so only one consumer
  // ever holds the microphone at a time. Also release if AI is speaking or thinking
  // to avoid device conflicts and feedback false positives.
  useEffect(() => {
    if (!selectedDuration) return;
    if (isActive || listening || aiSpeaking || loading) {
      stopInterviewAudioMonitor();
    } else if (!done) {
      startInterviewAudioMonitor();
    }
  }, [isActive, listening, aiSpeaking, loading, selectedDuration, done, startInterviewAudioMonitor, stopInterviewAudioMonitor]);

  // Make sure the proctoring stream is always released on unmount
  useEffect(() => () => stopInterviewAudioMonitor(), [stopInterviewAudioMonitor]);

  // Tab switch / window focus proctoring
  useEffect(() => {
    if (!selectedDuration || done) return;
    const handleVis = () => {
      if (document.hidden) {
        setShowGazeAlert(true);
        setGazeWarningCount(c => c + 1);
      }
    };
    const handleBlur = () => {
      setShowGazeAlert(true);
      setGazeWarningCount(c => c + 1);
    };
    document.addEventListener('visibilitychange', handleVis);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVis);
      window.removeEventListener('blur', handleBlur);
    };
  }, [selectedDuration, done]);

  // Proctoring timer effect (runs every 1s)
  useEffect(() => {
    if (!selectedDuration || done) return;

    const interval = setInterval(() => {
      // 1. Face Gaze deviation proctoring
      if (camEnabled) {
        if (!facePresent) {
          setGazeAwaySeconds(s => {
            const next = s + 1;
            if (next >= 3) {
              if (!gazeAlertDismissed.current) {
                setShowGazeAlert(true);
              }
              if (next % 3 === 0) {
                setGazeWarningCount(c => c + 1);
              }
            }
            return next;
          });
        } else {
          // Candidate is looking at the screen again — clear immediately,
          // don't wait around before dismissing the alert.
          setGazeAwaySeconds(0);
          setShowGazeAlert(false);
          gazeAlertDismissed.current = false;
        }
      }

      // 2. Background talking detection proctoring (trigger when not recording)
      const isCandidateSpeaking = isActive || listening || (liveText && liveText.length > 0);
      if (!isCandidateSpeaking && realtimeInputVol > 35) {
        setBgNoiseSeconds(s => {
          const next = s + 1;
          if (next >= 5) {
            if (!bgNoiseAlertDismissed.current) {
              setShowBgNoiseAlert(true);
            }
            if (next % 5 === 0) {
              setBgNoiseWarningCount(w => w + 1);
            }
          }
          return next;
        });
      } else {
        setBgNoiseSeconds(0);
        setShowBgNoiseAlert(false);
        bgNoiseAlertDismissed.current = false;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedDuration, done, camEnabled, trackingLoaded, facePresent, isActive, listening, liveText, realtimeInputVol]);

  // ── Countdown timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedDuration || done) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          if (!doneRef.current) {
            doneRef.current = true;
            setDone(true);
            window.speechSynthesis?.cancel();
            setAiSpeaking(false);
            stopInterviewAudioMonitor();
            setMsgs(prev => [...prev, { role: 'ai', content: "⏱️ Time's up! Great effort. Your interview session has ended. Saving your results..." }]);
            saveInterviewReport();
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [selectedDuration, done]);

  const handleMicStart = useCallback(() => {
    setLiveText('');
    setInput('');
    setSttError('');
    stopInterviewAudioMonitor(); // Explicitly release monitor before starting SpeechRecognition to avoid race condition
    try {
      const p = startMic();
      if (p && typeof p.catch === 'function') {
        p.catch(e => console.warn('[STT] Manual start mic failed:', e?.message));
      }
    } catch (e) {
      console.warn('[STT] Exception on mic start:', e);
    }
  }, [startMic, stopInterviewAudioMonitor]);

  // TTS
  const speak = useCallback(async (text) => {
    if (!ttsEnabled || !text?.trim()) return;

    if (window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (e) { }
    }
    if (window.pragatiAudioPlayer) {
      try { window.pragatiAudioPlayer.pause(); } catch (e) { }
    }

    const role = voiceGender === 'female' ? 'interviewer_female' : 'interviewer_male';

    setAiSpeaking(true);
    await speakText(text, role);
    setAiSpeaking(false);
  }, [ttsEnabled, voiceGender]);

  // Stop interview handler — stops interview & immediately generates session report
  const handleStopInterview = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setDone(true);
    window.speechSynthesis?.cancel();
    if (window.pragatiAudioPlayer) {
      try { window.pragatiAudioPlayer.pause(); } catch { }
    }
    setAiSpeaking(false);
    stopMic();
    stopInterviewAudioMonitor();
    if (document.fullscreenElement) {
      try { document.exitFullscreen().catch(() => { }); } catch { }
    }
    setMsgs(prev => [...prev, { role: 'ai', content: '🛑 Interview stopped by candidate. Generating your evaluation report...' }]);
    saveInterviewReport();
  }, [stopMic, stopInterviewAudioMonitor]);

  const handleMicStop = useCallback(() => {
    stopMic();
    if (liveText.trim() || input.trim()) {
      const text = (liveText.trim() || input.trim());
      sendRef.current?.(text);
    }
  }, [stopMic, liveText, input]);

  useEffect(() => {
    if (aiSpeaking || loading || done) {
      stopMic();
    }
  }, [aiSpeaking, loading, done, stopMic]);

  // Init — fires when student picks a duration
  useEffect(() => {
    if (!selectedDuration) return;
    doneRef.current = false;
    setTimeLeft(selectedDuration.secs);

    // Enable camera automatically since hardware was verified
    setCamEnabled(true);

    // Request full screen for real interview feel
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => { });
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
      }
    } catch (e) { }

    const openersDict = (typeof DYNAMIC_OPENERS !== 'undefined' && DYNAMIC_OPENERS) || (typeof window !== 'undefined' && window.DYNAMIC_OPENERS) || {};
    const openers = openersDict[interviewType] || openersDict.Technical || [
      "Let's start with a quick introduction. Walk me through your technical background, the projects you've built, and the technologies you're most comfortable with."
    ];
    const openQ = openers[Math.floor(Math.random() * openers.length)];

    setTimeout(() => {
      const hasResume = resumeText && resumeText.length > 20;
      const hasJD = jdText && jdText.length > 10;
      const personalisedNote = hasResume && hasJD
        ? `I've reviewed your resume and the job description — my questions will be tailored to your background.`
        : hasJD
          ? `I have the job description — questions will align with role requirements.`
          : hasResume
            ? `I've looked at your resume — questions will reflect your experience.`
            : `I'll conduct a standard ${interviewType} interview for the ${targetRole} role.`;

      const greetingText = `Hello ${userName?.split(' ')[0] || 'candidate'}! I'm ${persona.name}, ${persona.title} at ${persona.company}.\n\nI'll be conducting your ${interviewType} interview for the ${targetRole} role. ${personalisedNote}\n\nYou have ${selectedDuration.label} — I'll keep asking questions until time runs out.\n\n🎙️ Click the mic to start speaking, and click it again when finished to send your answer.\n\n❓ Question 1:\n\n${openQ}`;

      setMsgs([{ role: 'ai', content: greetingText, feedback: 'Introduction', score: 100 }]);
      setReady(true);
      setAnsStart(Date.now());

      const spokenIntro = `Hello ${userName?.split(' ')[0] || 'candidate'}! I am ${persona.name}, ${persona.title} at ${persona.company}. Welcome to your ${interviewType} interview for ${targetRole}. Question one: ${openQ}`;
      speak(spokenIntro);
    }, 400);
  }, [selectedDuration]);

  // Save the report dynamically to MongoDB Atlas
  const saveInterviewReport = async (finalScores = scores, finalMsgs = msgs) => {
    try {
      const avg = finalScores.length ? Math.round(finalScores.reduce((a, b) => a + b, 0) / finalScores.length) : 0;

      const payload = {
        targetRole,
        interviewType,
        durationLabel: selectedDuration?.label || '5 min',
        overallScore: avg,
        scoresList: finalScores,
        conversation: finalMsgs.map(m => ({
          role: m.role,
          content: m.content,
          feedback: m.feedback || '',
          score: m.score || 0,
          wordsCount: m.wordsCount || 0,
          fillerWordsCount: m.fillerWordsCount || 0,
          wpm: m.wpm || 0
        })),
        proctoringViolations: {
          gazeAwayWarningCount: gazeWarningCount,
          backgroundNoiseWarningCount: bgNoiseWarningCount
        }
      };

      await fetch(`${API}/interview/session`, {
        method: 'POST',
        headers: { ...tk(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error('Failed to save interview session report:', err);
    }
  };

  const sendAnswer = useCallback(async (textOverride) => {
    const text = (textOverride !== undefined ? textOverride : input).trim();
    if (!text || loading || done) return;
    const secs = ansStart ? (Date.now() - ansStart) / 1000 : 0;
    const m = scoreAnswer(text, secs);
    setMetrics(m);
    const nextScores = [...scores, m.score];
    setScores(nextScores);
    setLiveText(''); setInput('');
    if (listening) stopMic();
    window.speechSynthesis?.cancel(); setAiSpeaking(false);

    const userMsg = {
      role: 'user',
      content: text,
      score: m.score,
      wordsCount: m.words,
      fillerWordsCount: m.fCount,
      wpm: m.wpm
    };
    const updatedMsgs = [...msgs, userMsg];
    setMsgs(updatedMsgs); setLoading(true);
    setMsgs(p => [...p, { role: 'ai', content: '', loading: true }]);
    setAnsStart(null);
    const newQNum = qNum + 1; setQNum(newQNum);
    const isLast = doneRef.current;
    try {
      const result = await getDynamicNext({ msgs: updatedMsgs, answer: text, qNum: newQNum, isLast, role: targetRole, type: interviewType, resumeText, jdText });
      let reply = result.feedback || 'Good answer!';
      if (result.keyMissing) reply += `\n\n💡 Tip: Consider mentioning — ${result.keyMissing}`;

      let nextMsgs;
      if (isLast || !result.nextQuestion) {
        const avg = Math.round(nextScores.reduce((a, b) => a + b, 0) / nextScores.length);
        reply += `\n\n🎉 Interview complete! Your average score: ${avg}/100. Well done — details saved.`;
        doneRef.current = true; setDone(true);

        nextMsgs = updatedMsgs.map((msg, i) => i === updatedMsgs.length - 1 ? { role: 'ai', content: reply, feedback: result.feedback } : msg);
        setMsgs(nextMsgs);
        speak(result.feedback || 'Well done on completing the interview!');
        saveInterviewReport(nextScores, nextMsgs);
      } else {
        reply += `\n\n❓ Question ${newQNum + 1}:\n\n${result.nextQuestion}`;
        setAnsStart(Date.now());

        nextMsgs = updatedMsgs.map((msg, i) => i === updatedMsgs.length - 1 ? { role: 'ai', content: reply, feedback: result.feedback } : msg);
        setMsgs(nextMsgs);
        speak(result.nextQuestion);
      }
    } catch {
      const failReply = 'Good effort! Keep adding concrete project examples.';
      const nextMsgs = updatedMsgs.map((msg, i) => i === updatedMsgs.length - 1 ? { role: 'ai', content: failReply, feedback: 'Error' } : msg);
      setMsgs(nextMsgs);
    } finally { setLoading(false); }
  }, [input, loading, done, msgs, qNum, targetRole, interviewType, listening, stopMic, speak, ansStart, scores, resumeText, jdText, gazeWarningCount, bgNoiseWarningCount]);

  useEffect(() => { sendRef.current = sendAnswer; }, [sendAnswer]);

  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  // ── Setup Access & Hardware Verification Screen ───────────────────────────
  if (!selectedDuration) {
    const bothGranted = micGranted && camGranted;
    return (
      <div style={{ fontFamily: "'Nunito',sans-serif", background: 'var(--surface)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 6px 28px rgba(4,44,93,0.1)' }}>
        <div style={{ background: 'linear-gradient(135deg,#042c5d 0%,#1a0d3e 45%,#0c3240 100%)', padding: '24px 28px', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: '1.3rem', color: '#fff' }}>🎙️ AI Interview Device Setup & Check</div>
          <div style={{ fontSize: '.82rem', color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>Authorize hardware permissions to verify security credentials before start.</div>
        </div>

        <div style={{ padding: '24px 28px 24px' }}>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 24 }}>
            {/* Live Camera Preview Container */}
            <div style={{ flex: 1, minWidth: 250, height: 200, background: '#020617', borderRadius: 12, overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2.5px dashed #53169733' }}>
              <video ref={setupVideoRef} muted autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: bothGranted ? 'block' : 'none' }} />
              {!bothGranted && (
                <div style={{ textAlign: 'center', padding: 16 }}>
                  <span style={{ fontSize: '2.2rem' }}>📷</span>
                  <div style={{ color: 'var(--text-3)', fontSize: '.75rem', marginTop: 8 }}>Live webcam verification feed</div>
                </div>
              )}
              {bothGranted && (
                <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(71,211,114,0.2)', color: '#47d372', padding: '2px 8px', borderRadius: 6, fontSize: '.65rem', fontWeight: 800, border: '1px solid #47d372' }}>
                  LIVE PREVIEW
                </div>
              )}
            </div>

            {/* Checklist */}
            <div style={{ flex: 1.2, minWidth: 250, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.9rem', color: 'var(--text)', marginBottom: 12 }}>📋 Permissions Verification Checklist</div>

              {/* Mic row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: micGranted ? 'rgba(71,211,114,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${micGranted ? '#47d37233' : '#ef444433'}`, marginBottom: 8 }}>
                <span style={{ fontSize: '.82rem', color: 'var(--text)', fontWeight: 700 }}>🎙️ Microphone Input Access</span>
                <span style={{ fontSize: '.75rem', color: micGranted ? '#166534' : '#991b1b', fontWeight: 800 }}>{micGranted ? 'Verified ✓' : 'Required ❌'}</span>
              </div>

              {/* Cam row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: camGranted ? 'rgba(71,211,114,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${camGranted ? '#47d37233' : '#ef444433'}`, marginBottom: 12 }}>
                <span style={{ fontSize: '.82rem', color: 'var(--text)', fontWeight: 700 }}>📷 Webcam Video Access</span>
                <span style={{ fontSize: '.75rem', color: camGranted ? '#166534' : '#991b1b', fontWeight: 800 }}>{camGranted ? 'Verified ✓' : 'Required ❌'}</span>
              </div>

              {/* Volume Indicator */}
              {micGranted && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.68rem', color: 'var(--text-3)', marginBottom: 4, fontWeight: 700 }}>
                    <span>🗣️ Speak to test mic volume:</span>
                    <span>{micVolume}%</span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: '#e8edf5', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${micVolume}%`, height: '100%', background: '#47d372', borderRadius: 999, transition: 'width 0.08s ease' }} />
                  </div>
                </div>
              )}

              {/* Request hardware access action */}
              {!bothGranted && (
                <button onClick={startHardwareVerification} disabled={checkingHardware}
                  style={{ padding: '12px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#531697,#13a1a5)', color: '#fff', fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: '.86rem', cursor: 'pointer' }}>
                  {checkingHardware ? 'Checking Hardware...' : 'Verify Camera & Microphone Access'}
                </button>
              )}
              {setupError && <div style={{ fontSize: '.75rem', color: '#ef4444', fontWeight: 700, marginTop: 8, textAlign: 'center' }}>{setupError}</div>}
            </div>
          </div>

          <hr style={{ border: '0', borderTop: '1.5px dashed var(--border)', margin: '20px 0' }} />

          {/* Select Voice */}
          <div style={{ opacity: bothGranted ? 1 : 0.35, pointerEvents: bothGranted ? 'auto' : 'none', transition: 'opacity 0.2s', marginBottom: 24 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: '1rem', color: 'var(--text)', marginBottom: 4, textAlign: 'center' }}>🎙️ Select AI Interviewer Voice</div>
            <div style={{ fontSize: '.78rem', color: 'var(--text-3)', textAlign: 'center', marginBottom: 14 }}>Choose natural neural AI voice for your mock interview.</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setVoiceGender('female')}
                style={{
                  padding: '10px 20px', borderRadius: 10,
                  border: voiceGender === 'female' ? '2.5px solid #13a1a5' : '1.5px solid var(--border)',
                  background: voiceGender === 'female' ? 'rgba(19,161,165,0.12)' : 'var(--surface-2)',
                  color: voiceGender === 'female' ? '#13a1a5' : 'var(--text-2)',
                  fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.88rem',
                  display: 'flex', alignItems: 'center', gap: 8
                }}>
                <span>👩</span> Female Voice (Priya AI / Neerja Neural / ElevenLabs)
              </button>
              <button
                type="button"
                onClick={() => setVoiceGender('male')}
                style={{
                  padding: '10px 20px', borderRadius: 10,
                  border: voiceGender === 'male' ? '2.5px solid #531697' : '1.5px solid var(--border)',
                  background: voiceGender === 'male' ? 'rgba(83,22,151,0.12)' : 'var(--surface-2)',
                  color: voiceGender === 'male' ? '#c4a0f5' : 'var(--text-2)',
                  fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.88rem',
                  display: 'flex', alignItems: 'center', gap: 8
                }}>
                <span>👨</span> Male Voice (Arjun AI / Prabhat Neural / ElevenLabs)
              </button>
            </div>
          </div>

          {/* Select Duration */}
          <div style={{ opacity: bothGranted ? 1 : 0.35, pointerEvents: bothGranted ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: '1.05rem', color: 'var(--text)', marginBottom: 4, textAlign: 'center' }}>⏱️ Select Practice Duration & Begin</div>
            <div style={{ fontSize: '.8rem', color: 'var(--text-3)', textAlign: 'center', marginBottom: 20 }}>AI adapts complexity dynamically. Select options below to launch.</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {DURATION_OPTIONS.map(opt => (
                <button key={opt.label} onClick={() => { releaseSetupStream(); setSelectedDuration(opt); }}
                  style={{ padding: '12px 20px', borderRadius: 10, border: '2.5px solid #531697', background: 'rgba(83,22,151,0.06)', color: '#531697', fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: '.95rem', cursor: 'pointer', transition: 'all .15s' }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(83,22,151,0.18)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(83,22,151,0.06)'; }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const latestAiMsg = [...msgs].reverse().find(m => m.role === 'ai' && !m.loading);
  let currentQuestionText = '';
  if (latestAiMsg) {
    const rawContent = latestAiMsg.content;
    const parts = rawContent.split('❓ Question');
    if (parts.length > 1) {
      currentQuestionText = ('❓ Question' + parts[1]).trim();
    } else {
      currentQuestionText = rawContent;
    }
  }

  const timerColor = timeLeft > 120 ? '#47d372' : timeLeft > 30 ? '#f59e0b' : '#ef4444';

  return (
    <div className={`interview-room ${selectedDuration && !done ? 'active-session' : ''}`} style={{
      fontFamily: "'Nunito',sans-serif",
      background: '#090d16',
      borderRadius: 18,
      overflow: 'hidden',
      border: '1.5px solid #1e293b',
      boxShadow: '0 12px 36px rgba(0,0,0,0.3)',
      position: 'relative'
    }}>

      {/* Proctoring Warning Toast */}
      {(showGazeAlert || showBgNoiseAlert) && (
        <div style={{
          position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg,#7f1d1d,#991b1b)', color: '#fecaca',
          padding: '12px 20px', borderRadius: 14, border: '2px solid #f87171',
          boxShadow: '0 8px 32px rgba(239,68,68,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', gap: 12, maxWidth: 540, width: '90%',
          pointerEvents: 'auto', animation: 'avPulse 2s ease-in-out infinite'
        }}>
          <span style={{ fontSize: '1.6rem' }}>🚨</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: '.9rem', color: '#fff' }}>PROCTORING ALERT</div>
            <div style={{ fontSize: '.9rem', marginTop: 6, maxWidth: 380, lineHeight: 1.5 }}>
              {showGazeAlert && "Candidate is looking away from camera! Keep eyes on screen."}
              {showGazeAlert && showBgNoiseAlert && " & "}
              {showBgNoiseAlert && "Background speech detected! Please sit in a quiet environment."}
            </div>
            <div style={{ fontSize: '.72rem', color: '#f87171', marginTop: 12, fontWeight: 800 }}>
              Warnings Counted · Logged to Final Campus Report
            </div>
            <button onClick={() => {
              setShowGazeAlert(false);
              setShowBgNoiseAlert(false);
              gazeAlertDismissed.current = true;
              bgNoiseAlertDismissed.current = true;
            }} style={{ marginTop: 12, padding: '6px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '.8rem', fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif" }}>
              Dismiss Alert ✕
            </button>
          </div>
        </div>
      )}

      {/* ── LEFT PANE: MAIN MEETING SCREEN (70% width) ── */}
      <div className="left-pane" style={{
        background: '#020617',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Call metadata overlays */}
        <div style={{
          position: 'absolute', top: 12, left: 16, right: 16,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          zIndex: 10, pointerEvents: 'none'
        }}>
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

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', pointerEvents: 'auto' }}>
            {!done && (
              <button onClick={handleStopInterview} style={{
                background: '#ef4444', color: '#fff', fontWeight: 800,
                padding: '4px 12px', borderRadius: 6, fontSize: '.75rem',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                boxShadow: '0 2px 8px rgba(239,68,68,0.4)', fontFamily: "'Nunito',sans-serif"
              }}>
                🛑 Stop Interview
              </button>
            )}
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
        <VideoHeadInterviewer
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
          border: showGazeAlert ? '2px solid #ef4444' : '2px solid rgba(255, 255, 255, 0.15)',
          animation: showGazeAlert ? 'micRing 1.5s infinite' : 'none'
        }}>
          <WebcamPanel enabled={camEnabled} onToggle={setCamEnabled} onFaceDetected={setFacePresent} trackingLoaded={trackingLoaded} />
        </div>

        {/* Mobile controls overlay (visible only on mobile/tablet via CSS) */}
        {selectedDuration && !done && (
          <div className="mobile-controls-overlay" style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50
          }}>
            {/* Live speech recognition caption overlay */}
            {listening && liveText && (
              <div style={{
                position: 'absolute', bottom: 175, left: 16, right: 16,
                textAlign: 'center', pointerEvents: 'auto'
              }}>
                <div style={{
                  display: 'inline-block', padding: '6px 12px', borderRadius: 8,
                  background: 'rgba(83, 22, 151, 0.75)', backdropFilter: 'blur(6px)',
                  border: '1px dashed rgba(196, 160, 245, 0.4)',
                  fontSize: '.78rem', color: '#c4a0f5', fontStyle: 'italic', fontFamily: "'Nunito',sans-serif"
                }}>
                  <span style={{
                    display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                    background: '#ef4444', marginRight: 6, verticalAlign: 'middle',
                    animation: 'blink 0.7s infinite'
                  }} />
                  {liveText}
                </div>
              </div>
            )}

            {/* Current Question Subtitle */}
            {currentQuestionText && (
              <div style={{
                position: 'absolute', bottom: 95, left: 16, right: 16,
                textAlign: 'center', pointerEvents: 'auto'
              }}>
                <div style={{
                  display: 'inline-block', padding: '8px 14px', borderRadius: 10,
                  background: 'rgba(15, 23, 42, 0.78)', backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff', fontSize: '.82rem', lineHeight: 1.45,
                  maxWidth: '90%', boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                  textAlign: 'left'
                }}>
                  <div style={{ fontSize: '.62rem', color: '#13a1a5', fontWeight: 800, textTransform: 'uppercase', marginBottom: 3 }}>Current Question</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{currentQuestionText}</div>
                </div>
              </div>
            )}

            {/* Floating Action Button Bar */}
            <div style={{
              position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.12)', padding: '8px 18px',
              borderRadius: 30, display: 'flex', alignItems: 'center', gap: 12,
              pointerEvents: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
            }}>
              {/* Mic button */}
              {supported && (
                <button
                  onClick={micPermError ? undefined : (listening ? handleMicStop : handleMicStart)}
                  disabled={loading || !ready}
                  title={micPermError ? 'Microphone blocked' : listening ? 'Stop & Send' : 'Speak'}
                  style={{
                    width: 44, height: 44, borderRadius: '50%', border: 'none',
                    cursor: loading || !ready || micPermError ? 'not-allowed' : 'pointer',
                    background: micPermError ? '#475569' : listening ? 'linear-gradient(135deg,#ef4444,#b91c1c)' : 'linear-gradient(135deg,#531697,#13a1a5)',
                    color: '#fff', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: micPermError ? 'none' : listening ? '0 0 12px rgba(239,68,68,0.4)' : '0 3px 10px rgba(83,22,151,0.2)',
                    animation: listening ? 'micRing 1.4s ease-in-out infinite' : 'none', transition: 'background 0.2s'
                  }}>
                  {micPermError ? '🚫' : listening ? '⏹' : '🎙️'}
                </button>
              )}

              {/* TTS Mute toggle */}
              <button onClick={() => setTtsEnabled(t => !t)}
                title={ttsEnabled ? 'Mute voice' : 'Unmute voice'}
                style={{
                  width: 38, height: 38, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)',
                  background: ttsEnabled ? 'rgba(19, 161, 165, 0.25)' : 'rgba(255,255,255,0.06)',
                  color: ttsEnabled ? '#13a1a5' : '#94a3b8', cursor: 'pointer', fontSize: '.9rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                {ttsEnabled ? '🔊' : '🔇'}
              </button>

              {/* Skip question */}
              <button onClick={() => {
                window.speechSynthesis?.cancel();
                setAiSpeaking(false);
                sendAnswer('I would like to skip this question.');
              }}
                title="Skip question"
                style={{
                  width: 38, height: 38, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.06)', color: '#94a3b8',
                  cursor: 'pointer', fontSize: '.9rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                ⏭️
              </button>

              {/* Separator */}
              <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)' }} />

              {/* Stop button */}
              <button onClick={handleStopInterview}
                title="Stop Interview"
                style={{
                  width: 38, height: 38, borderRadius: '50%', border: 'none',
                  background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '.9rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 3px 8px rgba(239,68,68,0.3)'
                }}>
                🛑
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT PANE: MEETING SIDEBAR (300px width) ── */}
      <div className="right-pane" style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#0f172a',
        boxSizing: 'border-box',
        overflow: 'hidden',
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
          {sttError && (
            <div style={{ marginTop: 6, padding: '6px 10px', borderRadius: 7, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5', fontSize: '.68rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span>⚠️ {sttError}</span>
              <button onClick={() => setSttError('')} style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '.75rem', fontWeight: 800, lineHeight: 1 }}>✕</button>
            </div>
          )}
        </div>
      </div>

      {/* Summary report overlay */}
      {done && scores.length > 0 && (
        <div style={{ padding: '18px 22px', borderTop: '1px solid #1e293b', background: '#0a0f1d', width: '100%' }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: '.95rem', color: '#fff', marginBottom: 14 }}>
            📊 Interview Complete — Your Results (Saved to Database)
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            {[['Overall', `${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}/100`, '#13a1a5'], ['Answered', scores.length, '#531697'], ['Duration', selectedDuration?.label || '—', '#47d372'], ['Gaze Dev.', `${gazeWarningCount} alerts`, '#ef4444'], ['Talk Dev.', `${bgNoiseWarningCount} alerts`, '#ef4444']].map(([l, v, c]) => (
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
        .interview-room {
          display: flex;
          flex-direction: row;
          flex-wrap: nowrap;
          height: 660px;
          width: 100%;
        }
        .left-pane {
          flex: 1;
          height: 100%;
        }
        .right-pane {
          width: 320px;
          height: 100%;
          border-left: 1px solid #1e293b;
        }

        @media (max-width: 1024px) {
          .interview-room {
            flex-direction: column !important;
            height: auto !important;
            min-height: 660px;
          }
          .left-pane {
            height: 520px !important;
            flex: none !important;
            width: 100% !important;
          }
          .right-pane {
            width: 100% !important;
            height: 400px !important;
            border-left: none !important;
            border-top: 1px solid #1e293b !important;
          }

          /* Active mobile session overlay configuration */
          .interview-room.active-session {
            height: 100vh !important;
            min-height: 100vh !important;
            position: fixed !important;
            inset: 0 !important;
            z-index: 9999 !important;
            border-radius: 0 !important;
            border: none !important;
          }
          .interview-room.active-session .right-pane {
            display: flex !important;
            height: 55% !important;
            width: 100% !important;
            border-top: 1px solid #1e293b !important;
          }
          .interview-room.active-session .left-pane {
            height: 45% !important;
            width: 100% !important;
            flex: none !important;
          }

          .mobile-controls-overlay {
            display: flex !important;
          }
        }

        @media (min-width: 1025px) {
          .mobile-controls-overlay {
            display: none !important;
          }
        }

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
function PrepResult({ data, targetRole }) {
  const [section, setSection] = useState('technical');
  const secs = [{ id: 'technical', label: '💻 Technical', count: data.technical_questions?.length }, { id: 'behavioral', label: '🤝 Behavioural', count: data.behavioral_questions?.length }, { id: 'gap', label: '⚠️ Gaps', count: data.gap_questions?.length }, { id: 'wins', label: '⚡ Quick Wins', count: data.quick_wins?.length }];
  const dc = { easy: '#47d372', medium: '#f59e0b', hard: '#ef4444' };
  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg,rgba(83,22,151,0.05),rgba(19,161,165,0.05))', border: '1px solid rgba(83,22,151,0.12)', borderRadius: 14, padding: '16px 18px', marginBottom: 18 }}>
        <div style={{ fontSize: '.7rem', fontWeight: 800, color: '#531697', marginBottom: 6 }}>🧠 PERSONALISED COACHING SUMMARY</div>
        <div style={{ fontSize: '.88rem', color: 'var(--text-2)', lineHeight: 1.75 }}>{data.coaching_summary}</div>
        <div style={{ marginTop: 8, fontSize: '.7rem', color: '#b0bec9' }}>For: <strong style={{ color: '#531697' }}>{targetRole}</strong></div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>{secs.map(s => <button key={s.id} onClick={() => setSection(s.id)} style={{ padding: '7px 14px', borderRadius: 999, border: `1.5px solid ${section === s.id ? '#531697' : '#d0d7e8'}`, background: section === s.id ? 'rgba(83,22,151,0.08)' : '#fff', color: section === s.id ? '#531697' : 'var(--text-3)', fontWeight: 700, cursor: 'pointer', fontSize: '.78rem', fontFamily: "'Nunito',sans-serif" }}>{s.label} ({s.count || 0})</button>)}</div>
      {section === 'technical' && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{(data.technical_questions || []).map((q, i) => <div key={i} style={{ background: 'var(--surface)', border: '1px solid #e8edf5', borderRadius: 12, padding: '14px 16px', borderLeft: `3px solid ${dc[q.difficulty] || '#531697'}` }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><div style={{ fontWeight: 700, fontSize: '.88rem', color: 'var(--text)', flex: 1, paddingRight: 8 }}>Q{i + 1}. {q.question}</div><span style={{ padding: '2px 8px', borderRadius: 999, background: `${dc[q.difficulty] || '#531697'}15`, color: dc[q.difficulty] || '#531697', fontSize: '.65rem', fontWeight: 700, flexShrink: 0, textTransform: 'capitalize' }}>{q.difficulty}</span></div><div style={{ fontSize: '.78rem', color: 'var(--text-3)' }}>💡 {q.tip}</div>{q.skill && <span style={{ display: 'inline-block', marginTop: 6, padding: '2px 8px', borderRadius: 999, background: 'rgba(83,22,151,0.07)', color: '#531697', fontSize: '.68rem', fontWeight: 700 }}>{q.skill}</span>}</div>)}</div>}
      {section === 'behavioral' && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{(data.behavioral_questions || []).map((q, i) => <div key={i} style={{ background: 'var(--surface)', border: '1px solid #e8edf5', borderRadius: 12, padding: '14px 16px', borderLeft: '3px solid #13a1a5' }}><div style={{ fontWeight: 700, fontSize: '.88rem', color: 'var(--text)', marginBottom: 6 }}>Q{i + 1}. {q.question}</div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(19,161,165,0.08)', color: 'var(--text)', fontSize: '.68rem', fontWeight: 700 }}>Use {q.framework}</span><span style={{ fontSize: '.75rem', color: 'var(--text-3)' }}><em>{q.angle}</em></span></div></div>)}</div>}
      {section === 'gap' && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{(data.gap_questions || []).map((q, i) => <div key={i} style={{ background: 'var(--surface)', border: '1px solid #e8edf5', borderRadius: 12, padding: '14px 16px', borderLeft: '3px solid #f59e0b' }}><div style={{ fontWeight: 700, fontSize: '.88rem', color: 'var(--text)', marginBottom: 8 }}>⚠️ {q.question}</div><div style={{ padding: '10px 12px', background: 'rgba(245,158,11,0.06)', borderRadius: 8, fontSize: '.8rem', color: 'var(--text-2)', lineHeight: 1.6 }}><strong style={{ color: '#92400e' }}>How to handle: </strong>{q.how_to_handle}</div></div>)}</div>}
      {section === 'wins' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 10 }}>{(data.quick_wins || []).map((w, i) => <div key={i} style={{ background: 'var(--surface)', border: '1px solid #e8edf5', borderRadius: 12, padding: '14px 16px', borderTop: '3px solid #47d372', display: 'flex', gap: 10 }}><div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(71,211,114,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '.75rem', color: '#166534', flexShrink: 0 }}>{i + 1}</div><div style={{ fontSize: '.83rem', color: 'var(--text-2)', lineHeight: 1.6 }}>{w}</div></div>)}</div>}
    </div>
  );
}

const ITYPES = [
  { id: 'Technical', icon: '💻', color: '#531697', desc: 'DSA, system design, your tech stack, coding concepts', tags: ['React', 'Java', 'Python', 'SQL', 'System Design'] },
  { id: 'HR', icon: '🤝', color: '#13a1a5', desc: 'Behavioral, teamwork, conflict, goals, motivation (STAR)', tags: ['Behavioral', 'STAR', 'Teamwork', 'Leadership'] },
  { id: 'Managerial', icon: '📊', color: '#47d372', desc: 'Decision-making, project ownership, team leadership', tags: ['Leadership', 'Strategy', 'Decisions'] },
];

export default function InterviewPrepPage() {
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState('ai');
  const [mode, setMode] = useState(null);
  const [iType, setIType] = useState('Technical');
  const [targetRole, setRole] = useState('Software Engineer');
  const [latest, setLatest] = useState(null);
  const [prepLoading, setPrepLoading] = useState(false);
  const [prepResult, setPrepResult] = useState(null);
  const [prepError, setPrepError] = useState('');
  const [deepTopic, setDeepTopic] = useState('');
  const [deepResult, setDeepResult] = useState(null);
  const [deepLoading, setDeepLoading] = useState(false);
  const [mockKey, setMockKey] = useState(0);
  // ── Resume + JD upload for personalised interview ──────────────────────
  const [resumeText, setResumeText] = useState('');
  const [jdText, setJdText] = useState('');
  const [uploadingResume, setUploadingResume] = useState(false);
  const [bankQs, setBankQs] = useState([]);
  const [bankLoad, setBankLoad] = useState(false);
  const [bankRole, setBankRole] = useState('All');
  const [bankSub, setBankSub] = useState('All');
  const [bankSearch, setBankSearch] = useState('');
  const [bankOpen, setBankOpen] = useState(null);
  const [userAns, setUserAns] = useState({});
  const [aiAns, setAiAns] = useState({});
  const [aiAnsLoad, setAiAnsLoad] = useState({});

  const BROLES = ['All', 'Frontend Developer', 'Backend Developer', 'Full Stack', 'Data Science', 'Machine Learning', 'DevOps', 'Android', 'System Design'];
  const BSUBS = ['All', 'DBMS', 'Operating Systems', 'Computer Networks', 'DSA', 'OOPs', 'System Design', 'Web Development', 'Machine Learning', 'Cloud', 'SQL'];

  useEffect(() => {
    fetch(`${API}/skillpath/latest`, { headers: tk() }).then(r => r.json()).then(d => { if (d?.result) { setLatest(d.result); setRole(d.result.jobTitle || 'Software Engineer'); } }).catch(() => { });
  }, []);

  useEffect(() => {
    if (mainTab !== 'bank') return;
    setBankLoad(true);
    const p = new URLSearchParams();
    if (bankRole !== 'All') p.set('role', bankRole);
    if (bankSub !== 'All') p.set('subject', bankSub);
    fetch(`${API}/interview?${p}`, { headers: tk() }).then(r => r.json()).then(d => setBankQs(d.questions || [])).catch(() => setBankQs([])).finally(() => setBankLoad(false));
  }, [mainTab, bankRole, bankSub]);

  async function getAiAns(qId, q) {
    setAiAnsLoad(l => ({ ...l, [qId]: true }));
    try { const d = await fetch(`${API}/interview/ai-answer`, { method: 'POST', headers: { ...tk(), 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q, role: bankRole !== 'All' ? bankRole : '', subject: bankSub !== 'All' ? bankSub : '' }) }).then(r => r.json()); setAiAns(a => ({ ...a, [qId]: d.answer || 'No answer.' })); }
    catch { setAiAns(a => ({ ...a, [qId]: 'Could not fetch.' })); }
    finally { setAiAnsLoad(l => ({ ...l, [qId]: false })); }
  }

  // Parse uploaded resume PDF/docx to text (client-side via FileReader)
  async function handleResumeUpload(file) {
    if (!file) return;
    setUploadingResume(true);
    try {
      // Try to extract text from file (txt fallback — PDF parsing needs backend)
      if (file.type === 'text/plain') {
        const text = await file.text();
        setResumeText(text);
      } else {
        // For PDF/DOCX: send to backend /skillpath/extract-text (if available)
        // or send base64 and let the AI analyse from filename + JD context
        const reader = new FileReader();
        reader.onload = async (e) => {
          const b64 = e.target.result.split(',')[1] || '';
          try {
            const res = await fetch(`${API}/skillpath/extract-text`, {
              method: 'POST',
              headers: { ...tk(), 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileBase64: b64, fileName: file.name }),
            });
            const d = await res.json();
            setResumeText(d.text || '[Resume uploaded — AI will analyse by filename context]');
          } catch {
            setResumeText(`[Resume: ${file.name} — AI will ask generic role questions if text extraction fails]`);
          }
        };
        reader.readAsDataURL(file);
      }
    } finally { setUploadingResume(false); }
  }

  async function runPrep() {
    setPrepLoading(true); setPrepError(''); setPrepResult(null);
    try {
      const res = await fetch(`${API}/skillpath/interview-prep`, { method: 'POST', headers: { ...tk(), 'Content-Type': 'application/json' }, body: JSON.stringify({ candidateName: user?.name, targetRole, skillGaps: (latest?.skillGapAnalysis?.missingSkills || []).map(s => ({ skill: s, importance: 'important' })), strengths: latest?.skillGapAnalysis?.matchedSkills || [], readinessScore: latest?.atsScore || 0 }) });
      const d = await res.json(); if (!res.ok) throw new Error(d.error || 'Failed'); setPrepResult(d);
    } catch (e) { setPrepError(e.message); }
    finally { setPrepLoading(false); }
  }

  async function runDeep() {
    if (!deepTopic.trim()) return; setDeepLoading(true); setDeepResult(null);
    try { setDeepResult(await fetch(`${API}/skillpath/deep-dive`, { method: 'POST', headers: { ...tk(), 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: deepTopic, targetRole, candidateName: user?.name }) }).then(r => r.json())); }
    catch { setDeepResult({ explanation: `${deepTopic} is a core skill.`, practice_questions: [`Explain ${deepTopic} simply.`, `Give a real-world example.`], quick_prep: 'Concept → Example → Trade-off.' }); }
    finally { setDeepLoading(false); }
  }

  const gaps = latest?.skillGapAnalysis?.missingSkills || [];
  const persona = PERSONAS[iType] || PERSONAS.Technical;

  return (
    <div style={{ fontFamily: "'Nunito',sans-serif", maxWidth: 980, margin: '0 auto' }}>

      {/* ── HERO HEADER ── */}
      <div style={{
        borderRadius: 20, overflow: 'hidden', marginBottom: 24, position: 'relative',
        background: 'linear-gradient(135deg,#0a0618 0%,#0d1b3e 45%,#0a1f2e 100%)',
        boxShadow: '0 20px 60px rgba(83,22,151,0.3)',
        border: '1px solid rgba(83,22,151,0.2)',
        padding: '28px 32px',
      }}>
        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: -60, left: -60, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle,rgba(83,22,151,0.35) 0%,transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, right: -40, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle,rgba(19,161,165,0.2) 0%,transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: '1.85rem', color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
              🎤 AI Mock Interview
            </h1>
            <span style={{ padding: '4px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', color: 'rgba(255,255,255,0.85)', fontSize: '.68rem', fontWeight: 800, border: '1px solid rgba(255,255,255,0.12)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Live · Adaptive · Human-Like
            </span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.55)', margin: 0, fontSize: '.9rem', lineHeight: 1.65, maxWidth: 620 }}>
            Your AI interviewer speaks naturally, adapts every question to your answers, and uses your resume &amp; JD to ask role-specific questions — just like a real interview panel.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            {['🗣️ Voice TTS', '🎙️ Continuous STT', '📷 Webcam Proctoring', '🧠 Adaptive AI', '📊 Instant Report'].map(t => (
              <span key={t} style={{ padding: '4px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', fontSize: '.68rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.08)' }}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── SETUP PANEL ── */}
      {!mode && (
        <div style={{
          background: 'var(--surface)', border: '1px solid #e8edf5', borderRadius: 18,
          padding: '22px 24px', marginBottom: 24,
          boxShadow: '0 4px 20px rgba(4,44,93,0.06)',
        }}>
          {/* Target Role */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
              <span style={{ fontSize: '1.2rem' }}>🎯</span>
              <span style={{ fontSize: '.8rem', fontWeight: 800, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>Target Role</span>
            </div>
            <input value={targetRole} onChange={e => setRole(e.target.value)}
              placeholder="e.g. Software Engineer, Data Scientist, Product Manager"
              style={{
                flex: 1, minWidth: 220, padding: '10px 16px', borderRadius: 10, border: '1.5px solid #d0d7e8',
                fontFamily: "'Nunito',sans-serif", fontSize: '.92rem', outline: 'none', color: 'var(--text)',
                background: 'var(--surface)', transition: 'border-color .2s'
              }}
              onFocus={e => e.target.style.borderColor = '#531697'}
              onBlur={e => e.target.style.borderColor = '#d0d7e8'}
            />
            {latest && <div style={{ fontSize: '.72rem', color: 'var(--text-3)', flexShrink: 0 }}>ATS: <strong style={{ color: '#531697' }}>{latest.atsScore}/100</strong> · Gaps: <strong style={{ color: '#991b1b' }}>{gaps.length}</strong></div>}
          </div>

          {/* Resume + JD Upload */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div style={{
              padding: '16px 18px', borderRadius: 12, border: '1.5px dashed #d0d7e8',
              background: 'linear-gradient(135deg,rgba(83,22,151,0.02),rgba(19,161,165,0.02))',
              transition: 'all .2s',
            }}>
              <div style={{ fontSize: '.72rem', fontWeight: 800, color: '#531697', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>📄</span> Resume Upload <span style={{ color: '#94a3b8', fontWeight: 500 }}>(optional)</span>
              </div>
              <input type="file" accept=".pdf,.docx,.txt" onChange={e => handleResumeUpload(e.target.files?.[0])}
                style={{ fontSize: '.78rem', color: '#531697', cursor: 'pointer', marginBottom: 6 }} />
              {uploadingResume && <div style={{ fontSize: '.68rem', color: '#64748b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>⏳ Extracting text…</div>}
              {resumeText && !uploadingResume && (
                <div style={{ fontSize: '.7rem', color: '#166534', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                  ✅ Resume loaded — AI will personalise questions
                </div>
              )}
            </div>
            <div style={{
              padding: '16px 18px', borderRadius: 12, border: '1.5px dashed #d0d7e8',
              background: 'linear-gradient(135deg,rgba(83,22,151,0.02),rgba(19,161,165,0.02))',
            }}>
              <div style={{ fontSize: '.72rem', fontWeight: 800, color: '#13a1a5', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>📋</span> Job Description <span style={{ color: '#94a3b8', fontWeight: 500 }}>(optional)</span>
              </div>
              <textarea value={jdText} onChange={e => setJdText(e.target.value)}
                placeholder="Paste the JD here — e.g. Amazon SDE-2 requirements…" rows={3}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #d0d7e8',
                  fontFamily: "'Nunito',sans-serif", fontSize: '.8rem', outline: 'none',
                  resize: 'vertical', color: 'var(--text)', boxSizing: 'border-box',
                  background: 'transparent', transition: 'border-color .2s'
                }}
                onFocus={e => e.target.style.borderColor = '#13a1a5'}
                onBlur={e => e.target.style.borderColor = '#d0d7e8'}
              />
              {jdText && <div style={{ fontSize: '.68rem', color: '#166534', marginTop: 2, fontWeight: 700 }}>✅ JD loaded — questions tailored to this role</div>}
            </div>
          </div>

          {/* Interview Type */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: '.72rem', fontWeight: 800, color: 'var(--text-3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Interview Type</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {ITYPES.map(t => (
                <button key={t.id} onClick={() => setIType(t.id)} style={{
                  padding: '10px 20px', borderRadius: 12,
                  border: `1.5px solid ${iType === t.id ? t.color : '#e0e7f0'}`,
                  background: iType === t.id ? `linear-gradient(135deg,${t.color}18,${t.color}08)` : 'transparent',
                  color: iType === t.id ? t.color : 'var(--text-3)',
                  fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif",
                  fontSize: '.82rem', display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'all .18s',
                  boxShadow: iType === t.id ? `0 4px 14px ${t.color}25` : 'none',
                }}>
                  {t.icon} {t.id}{iType === t.id && <span style={{ fontSize: '.65rem', opacity: .7 }}>✓</span>}
                </button>
              ))}
            </div>
            {iType && <div style={{ marginTop: 8, fontSize: '.75rem', color: 'var(--text-3)', paddingLeft: 2 }}>{ITYPES.find(t => t.id === iType)?.desc}</div>}
          </div>
        </div>
      )}

      {mode && <button onClick={() => { setMode(null); setPrepResult(null); setDeepResult(null); setPrepError(''); window.speechSynthesis?.cancel(); }}
        style={{ marginBottom: 18, padding: '7px 18px', borderRadius: 9, border: '1.5px solid #e0e7f0', background: 'transparent', color: 'var(--text-3)', fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
        ← Back to modes
      </button>}

      {/* ── MODE CARDS ── */}
      {!mode && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>

          {/* AI Mock Interview Card */}
          <div onClick={() => setMode('mock')}
            style={{
              background: 'linear-gradient(145deg,#07051c 0%,#1a0935 40%,#06213d 100%)',
              border: '1px solid rgba(83,22,151,0.35)', borderRadius: 18, padding: '24px 22px',
              cursor: 'pointer', transition: 'all .25s',
              boxShadow: '0 12px 36px rgba(83,22,151,0.25)',
              position: 'relative', overflow: 'hidden',
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 24px 52px rgba(83,22,151,0.4)'; e.currentTarget.style.borderColor = 'rgba(83,22,151,0.6)'; }}
            onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 12px 36px rgba(83,22,151,0.25)'; e.currentTarget.style.borderColor = 'rgba(83,22,151,0.35)'; }}>
            {/* Glow */}
            <div style={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle,rgba(83,22,151,0.4) 0%,transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                <AIAvatar isSpeaking={false} isThinking={false} isListening={false} persona={persona} size={72} />
                <div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: '.88rem', color: '#fff' }}>{persona.name}</div>
                  <div style={{ fontSize: '.68rem', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{persona.title} · {persona.company}</div>
                </div>
              </div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: '1.05rem', color: '#fff', marginBottom: 8 }}>🎤 AI Mock Interview</div>
              <div style={{ fontSize: '.8rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, marginBottom: 16 }}>
                Human-like AI speaks your questions aloud, adapts follow-ups to every answer, and watches your camera for real interview immersion.
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 18 }}>
                {['🗣️ Speaks Aloud', '🎙️ Voice Input', '📷 Camera', '🧠 Adaptive AI'].map(t => (
                  <span key={t} style={{ padding: '3px 9px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)', fontSize: '.62rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)' }}>{t}</span>
                ))}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 20px', borderRadius: 999, background: 'linear-gradient(135deg,#7c3aed,#13a1a5)', color: '#fff', fontWeight: 800, fontSize: '.82rem', boxShadow: '0 4px 14px rgba(124,58,237,0.4)' }}>
                Start Interview <span style={{ fontSize: '1rem' }}>→</span>
              </div>
            </div>
          </div>

          {/* Full Prep Card */}
          <div onClick={() => { setMode('prep'); runPrep(); }}
            style={{ background: 'var(--surface)', border: '1.5px solid #e8edf5', borderRadius: 18, padding: '24px 22px', cursor: 'pointer', transition: 'all .25s', boxShadow: '0 4px 16px rgba(4,44,93,0.05)' }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#531697'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(83,22,151,0.12)'; }}
            onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = '#e8edf5'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(4,44,93,0.05)'; }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,rgba(83,22,151,0.12),rgba(83,22,151,0.06))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', marginBottom: 14 }}>🎯</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: '1rem', color: 'var(--text)', marginBottom: 8 }}>Full Interview Prep</div>
            <div style={{ fontSize: '.82rem', color: 'var(--text-3)', lineHeight: 1.65 }}>Personalised guide: technical Q&A, behavioral prep, skill gap analysis, and quick wins based on your profile.</div>
          </div>

          {/* Deep Dive Card */}
          <div onClick={() => setMode('tips')}
            style={{ background: 'var(--surface)', border: '1.5px solid #e8edf5', borderRadius: 18, padding: '24px 22px', cursor: 'pointer', transition: 'all .25s', boxShadow: '0 4px 16px rgba(4,44,93,0.05)' }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#13a1a5'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(19,161,165,0.12)'; }}
            onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = '#e8edf5'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(4,44,93,0.05)'; }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,rgba(19,161,165,0.12),rgba(19,161,165,0.06))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', marginBottom: 14 }}>💡</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: '1rem', color: 'var(--text)', marginBottom: 8 }}>Topic Deep Dive</div>
            <div style={{ fontSize: '.82rem', color: 'var(--text-3)', lineHeight: 1.65 }}>Pick any skill gap or topic — get a focused explanation, curated practice questions, and rapid interview prep.</div>
          </div>
        </div>
      )}

      {mode === 'mock' && <MockInterview key={mockKey} targetRole={targetRole} interviewType={iType} userName={user?.name} resumeText={resumeText} jdText={jdText} onEnd={() => { setMockKey(k => k + 1); setMode(null); }} />}

      {mode === 'prep' && (
        <div>
          {prepLoading && <div style={{ textAlign: 'center', padding: '50px 0' }}><div style={{ width: 42, height: 42, border: '3px solid #e8edf5', borderTopColor: '#531697', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 14px' }} /><div style={{ color: 'var(--text-3)' }}>Generating prep guide…</div><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>}
          {prepError && <div style={{ padding: '14px 18px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, color: '#991b1b', fontSize: '.85rem', fontWeight: 600, marginBottom: 14 }}>⚠️ {prepError} <button onClick={runPrep} style={{ marginLeft: 10, padding: '4px 12px', borderRadius: 7, border: 'none', background: '#991b1b', color: '#fff', cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.78rem' }}>Retry</button></div>}
          {prepResult && !prepLoading && <PrepResult data={prepResult} targetRole={targetRole} />}
        </div>
      )}

      {mode === 'tips' && (
        <div>
          <div style={{ background: 'var(--surface)', border: '1px solid #e8edf5', borderRadius: 14, padding: '20px 22px', marginBottom: 16 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.95rem', marginBottom: 12, color: 'var(--text)' }}>💡 Topic Deep Dive</div>
            {gaps.length > 0 && <div style={{ marginBottom: 14 }}><div style={{ fontSize: '.7rem', fontWeight: 800, color: '#991b1b', marginBottom: 8 }}>YOUR SKILL GAPS:</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{gaps.slice(0, 10).map(s => <button key={s} onClick={() => setDeepTopic(s)} style={{ padding: '5px 12px', borderRadius: 999, border: `1.5px solid ${deepTopic === s ? '#531697' : 'rgba(239,68,68,0.3)'}`, background: deepTopic === s ? 'rgba(83,22,151,0.08)' : 'rgba(239,68,68,0.06)', color: deepTopic === s ? '#531697' : '#991b1b', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito',sans-serif" }}>{s}</button>)}</div></div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <input value={deepTopic} onChange={e => setDeepTopic(e.target.value)} placeholder="Type any skill: Docker, System Design, React Hooks…" style={{ flex: 1, padding: '10px 14px', borderRadius: 9, border: '1.5px solid #d0d7e8', fontFamily: "'Nunito',sans-serif", fontSize: '.9rem', outline: 'none' }} />
              <button onClick={runDeep} disabled={!deepTopic.trim() || deepLoading} style={{ padding: '10px 24px', borderRadius: 9, border: 'none', background: !deepTopic.trim() || deepLoading ? '#e8edf5' : 'linear-gradient(135deg,#531697,#13a1a5)', color: !deepTopic.trim() ? '#b0bec9' : '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif" }}>{deepLoading ? '…' : 'Dive In →'}</button>
            </div>
          </div>
          {deepResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: 'var(--surface)', border: '1px solid #e8edf5', borderRadius: 13, padding: '16px 18px' }}><div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.9rem', marginBottom: 10, color: 'var(--text)' }}>📖 About {deepTopic}</div><div style={{ fontSize: '.86rem', color: 'var(--text-2)', lineHeight: 1.75 }}>{deepResult.explanation}</div></div>
              {deepResult.practice_questions?.length > 0 && <div style={{ background: 'var(--surface)', border: '1px solid #e8edf5', borderRadius: 13, padding: '16px 18px' }}><div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.9rem', marginBottom: 10, color: 'var(--text)' }}>❓ Practice Questions</div>{deepResult.practice_questions.map((q, i) => <div key={i} style={{ padding: '9px 12px', background: '#f8f9fc', borderRadius: 8, marginBottom: 7, fontSize: '.84rem', color: 'var(--text-2)' }}>Q{i + 1}. {q}</div>)}</div>}
              {deepResult.quick_prep && <div style={{ background: 'rgba(83,22,151,0.04)', border: '1px solid rgba(83,22,151,0.12)', borderRadius: 13, padding: '14px 18px', fontSize: '.84rem', color: 'var(--text-2)', lineHeight: 1.7 }}><strong style={{ color: '#531697' }}>⚡ Quick Interview Prep: </strong>{deepResult.quick_prep}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}