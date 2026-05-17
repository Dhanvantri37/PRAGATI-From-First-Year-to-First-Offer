import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const GRAD = 'linear-gradient(135deg,#531697,#13a1a5)';

export function RoundHeader({ icon, title, subtitle, onBack }) {
  const nav = useNavigate();
  return (
    <div style={{ marginBottom: 24 }}>
      <button onClick={() => onBack ? onBack() : nav(-1)}
        style={{ marginBottom: 14, padding: '6px 14px', borderRadius: 8, border: '1px solid #d0d7e8', background: 'transparent', color: '#7a8ba8', fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.8rem' }}>
        ← Back
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
          {icon}
        </div>
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.4rem', color: '#0f1a2e', margin: 0 }}>{title}</h1>
          {subtitle && <p style={{ color: '#7a8ba8', margin: '3px 0 0', fontSize: '.84rem' }}>{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

export function Card({ children, style = {} }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e8edf5', padding: '18px 20px', boxShadow: '0 2px 12px rgba(4,44,93,0.05)', ...style }}>
      {children}
    </div>
  );
}

export function SectionTitle({ children }) {
  return (
    <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.9rem', color: '#0f1a2e', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
      {children}
    </div>
  );
}

export function AnswerBox({ value, onChange, placeholder = 'Type your answer here…', rows = 5 }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #d0d7e8', fontFamily: "'Nunito',sans-serif", fontSize: '.88rem', color: '#0f1a2e', resize: 'vertical', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box', transition: 'border-color .15s' }}
      onFocus={e => e.target.style.borderColor = '#531697'}
      onBlur={e => e.target.style.borderColor = '#d0d7e8'}
    />
  );
}

export function FeedbackPanel({ sampleAnswer, keywords = [], userAnswer = '' }) {
  const [show, setShow] = useState(false);
  const matchedKW = keywords.filter(kw =>
    userAnswer.toLowerCase().includes(kw.toLowerCase())
  );
  const score = keywords.length ? Math.round((matchedKW.length / keywords.length) * 100) : null;

  return (
    <div>
      <button onClick={() => setShow(s => !s)}
        style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: show ? '#f0f3fa' : GRAD, color: show ? '#531697' : '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.85rem', transition: 'all .15s' }}>
        {show ? '🙈 Hide Sample Answer' : '💡 Show Sample Answer & Feedback'}
      </button>
      {show && (
        <div style={{ marginTop: 12 }}>
          {score !== null && (
            <div style={{ padding: '10px 14px', borderRadius: 9, background: score >= 70 ? 'rgba(71,211,114,0.08)' : score >= 40 ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${score >= 70 ? 'rgba(71,211,114,0.3)' : score >= 40 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`, marginBottom: 10 }}>
              <div style={{ fontWeight: 800, fontSize: '.82rem', color: score >= 70 ? '#166534' : score >= 40 ? '#92400e' : '#991b1b' }}>
                Keyword Coverage: {score}% ({matchedKW.length}/{keywords.length} keywords found)
              </div>
              {matchedKW.length > 0 && <div style={{ fontSize: '.75rem', color: '#7a8ba8', marginTop: 3 }}>✅ {matchedKW.join(', ')}</div>}
            </div>
          )}
          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(83,22,151,0.04)', border: '1px solid rgba(83,22,151,0.12)', fontSize: '.83rem', color: '#3d4e6b', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
            <div style={{ fontWeight: 800, color: '#531697', marginBottom: 6, fontSize: '.78rem' }}>📝 SAMPLE ANSWER</div>
            {sampleAnswer}
          </div>
          {keywords.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: '.72rem', fontWeight: 800, color: '#7a8ba8', marginBottom: 6 }}>KEY POINTS TO COVER</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {keywords.map(kw => (
                  <span key={kw} style={{ padding: '3px 9px', borderRadius: 999, fontSize: '.72rem', fontWeight: 700, background: matchedKW.includes(kw) ? 'rgba(71,211,114,0.1)' : '#f0f3fa', color: matchedKW.includes(kw) ? '#166534' : '#7a8ba8', border: `1px solid ${matchedKW.includes(kw) ? 'rgba(71,211,114,0.3)' : '#e8edf5'}` }}>
                    {matchedKW.includes(kw) ? '✅ ' : ''}{kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function QuestionCard({ num, total, question, children }) {
  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: GRAD, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.78rem', fontWeight: 800, flexShrink: 0 }}>
          {num}
        </div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: '.92rem', color: '#0f1a2e', flex: 1, lineHeight: 1.5, paddingTop: 6 }}>
          {question}
        </div>
        {total && <span style={{ fontSize: '.68rem', color: '#b0bec9', flexShrink: 0, paddingTop: 8 }}>{num}/{total}</span>}
      </div>
      {children}
    </Card>
  );
}

export function Timer({ seconds, onDone }) {
  const [left, setLeft] = React.useState(seconds);
  React.useEffect(() => {
    if (left <= 0) { onDone?.(); return; }
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left, onDone]);
  const pct = (left / seconds) * 100;
  const col = left > seconds * 0.5 ? '#47d372' : left > seconds * 0.25 ? '#f59e0b' : '#ef4444';
  const m = Math.floor(left / 60), s = left % 60;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 6, background: '#e8edf5', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 999, transition: 'width 1s linear, background .5s' }} />
      </div>
      <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.85rem', color: col, minWidth: 40 }}>
        {m}:{String(s).padStart(2, '0')}
      </span>
    </div>
  );
}
