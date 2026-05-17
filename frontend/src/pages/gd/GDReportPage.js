import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
         BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

const API  = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tk   = () => ({ Authorization: `Bearer ${localStorage.getItem('pragati_token')}` });
const GRAD = 'linear-gradient(135deg,#531697,#13a1a5)';

function ScoreRing({ score, label, color, size = 90 }) {
  const r = (size / 2) - 10;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f0f3fa" strokeWidth={8} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${circ}`} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
      </svg>
      <div style={{ marginTop: -size/2-4, fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: size > 80 ? '1.3rem' : '.9rem', color: '#0f1a2e' }}>{score}</div>
      <div style={{ marginTop: size/2-8, fontSize: '.68rem', fontWeight: 700, color: '#7a8ba8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  );
}

const SCORE_COLORS = {
  communication: '#531697', confidence: '#13a1a5', leadership: '#f59e0b',
  participation: '#47d372', fluency: '#3b82f6', relevance: '#ec4899', teamwork: '#8b5cf6',
};

export default function GDReportPage() {
  const { code, userId } = useParams();
  const location = useLocation();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const passedEval = location.state?.evalData;
    if (passedEval) {
      const me = passedEval.participants?.find(p => p.userId === userId);
      if (me) {
        setData({ participant: me, topic: location.state?.topic, roomCode: code, myStats: location.state?.myStats });
        setLoading(false); return;
      }
    }
    fetch(`${API}/gd/rooms/${code}/report/${userId}`, { headers: tk() })
      .then(r => r.json()).then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [code, userId, location.state]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 40, height: 40, border: '3px solid #e8edf5', borderTopColor: '#531697', borderRadius: '50%', animation: '_s .7s linear infinite' }} />
      <style>{`@keyframes _s{to{transform:rotate(360deg)}}`}</style>
      <div style={{ color: '#b0bec9' }}>Generating AI evaluation…</div>
    </div>
  );

  if (!data?.participant) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <div style={{ fontSize: '2rem', marginBottom: 12 }}>📋</div>
      <div style={{ color: '#7a8ba8' }}>Report not available yet. Please wait for evaluation to complete.</div>
      <button onClick={() => nav('/dashboard/gd')} style={{ marginTop: 16, padding: '9px 20px', borderRadius: 10, border: 'none', background: GRAD, color: '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif" }}>← Back to Lobby</button>
    </div>
  );

  const { participant, topic, myStats } = data;
  const scores = participant.aiScore || {};
  const overall = scores.overall || 0;
  const overallColor = overall >= 75 ? '#47d372' : overall >= 55 ? '#f59e0b' : '#ef4444';
  const overallLabel = overall >= 75 ? '🌟 Excellent — Ready for Placement GD!' : overall >= 55 ? '👍 Good — Minor improvements needed' : '📈 Developing — Practice more GDs';

  const radarData = [
    { subject: 'Communication', score: scores.communication || 0 },
    { subject: 'Confidence',    score: scores.confidence    || 0 },
    { subject: 'Leadership',    score: scores.leadership    || 0 },
    { subject: 'Participation', score: scores.participation || 0 },
    { subject: 'Fluency',       score: scores.fluency       || 0 },
    { subject: 'Relevance',     score: scores.relevance     || 0 },
    { subject: 'Teamwork',      score: scores.teamwork      || 0 },
  ];

  const barData = Object.entries(SCORE_COLORS).map(([key, color]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    score: scores[key] || 0,
    color,
  }));

  const readinessColor = {
    'Ready': '#47d372', 'Near Ready': '#f59e0b', 'Needs Practice': '#ef4444',
  }[scores.placementReadiness] || '#7a8ba8';

  return (
    <div style={{ fontFamily: "'Nunito',sans-serif", maxWidth: 960, margin: '0 auto', padding: '0 8px 40px' }}>

      {/* Header */}
      <div style={{ background: GRAD, borderRadius: 16, padding: '28px 32px', marginBottom: 20, color: '#fff' }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.5rem', marginBottom: 6 }}>
          📊 AI Evaluation Report
        </div>
        <div style={{ opacity: .85, fontSize: '.88rem', marginBottom: 4 }}>Participant: <strong>{participant.name}</strong></div>
        {topic && <div style={{ opacity: .75, fontSize: '.8rem' }}>Topic: "{topic}"</div>}
      </div>

      {/* Overall score + readiness */}
      <div className="card" style={{ padding: '28px 32px', marginBottom: 16, textAlign: 'center' }}>
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: '3.5rem', fontFamily: "'Syne',sans-serif", fontWeight: 800, color: overallColor }}>{overall}</span>
          <span style={{ fontSize: '1.5rem', color: '#b0bec9' }}>/100</span>
        </div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.1rem', color: '#0f1a2e', marginBottom: 10 }}>{overallLabel}</div>

        {/* Placement readiness badge */}
        {scores.placementReadiness && (
          <div style={{ display: 'inline-block', padding: '6px 20px', borderRadius: 20, background: `${readinessColor}18`, border: `1.5px solid ${readinessColor}`, color: readinessColor, fontWeight: 800, fontSize: '.85rem', marginBottom: 16 }}>
            🎯 Placement Readiness: {scores.placementReadiness}
          </div>
        )}

        {/* 7 mini score rings */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 20, marginTop: 10 }}>
          {Object.entries(SCORE_COLORS).map(([key, color]) => (
            <ScoreRing key={key} score={scores[key] || 0} label={key} color={color} size={82} />
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* Radar */}
        <div className="card" style={{ padding: '20px 16px' }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.9rem', marginBottom: 12 }}>📡 Skill Radar</div>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e8edf5" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#7a8ba8', fontFamily: "'Nunito',sans-serif" }} />
              <Radar name="Score" dataKey="score" stroke="#531697" fill="#531697" fillOpacity={0.18} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart */}
        <div className="card" style={{ padding: '20px 16px' }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.9rem', marginBottom: 12 }}>📊 Dimension Scores</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fontFamily: "'Nunito',sans-serif" }} width={90} />
              <Tooltip formatter={(v) => [`${v}/100`]} />
              <Bar dataKey="score" radius={4}>
                {barData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Summary + Detailed Feedback */}
      {(scores.summary || scores.detailedFeedback) && (
        <div className="card" style={{ padding: '20px 24px', marginBottom: 14 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.9rem', marginBottom: 14 }}>🤖 AI Feedback</div>
          {scores.summary && (
            <div style={{ marginBottom: 12, padding: '12px 16px', borderRadius: 10, background: 'rgba(83,22,151,0.06)', border: '1px solid rgba(83,22,151,0.12)' }}>
              <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#531697', marginBottom: 6 }}>SUMMARY</div>
              <div style={{ fontSize: '.85rem', color: '#3d4e6b', lineHeight: 1.7 }}>{scores.summary}</div>
            </div>
          )}
          {scores.detailedFeedback && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(19,161,165,0.05)', border: '1px solid rgba(19,161,165,0.12)' }}>
              <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#13a1a5', marginBottom: 6 }}>DETAILED ANALYSIS</div>
              <div style={{ fontSize: '.85rem', color: '#3d4e6b', lineHeight: 1.7 }}>{scores.detailedFeedback}</div>
            </div>
          )}
        </div>
      )}

      {/* Strengths + Improvements */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        {scores.strengths?.length > 0 && (
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.9rem', color: '#47d372', marginBottom: 12 }}>✅ Strengths</div>
            {scores.strengths.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', borderBottom: '1px solid #f0f3fa' }}>
                <span style={{ color: '#47d372', fontSize: '.9rem', marginTop: 1 }}>●</span>
                <span style={{ fontSize: '.83rem', color: '#3d4e6b', lineHeight: 1.5 }}>{s}</span>
              </div>
            ))}
          </div>
        )}
        {scores.improvements?.length > 0 && (
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.9rem', color: '#f59e0b', marginBottom: 12 }}>🔧 Areas to Improve</div>
            {scores.improvements.map((imp, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', borderBottom: '1px solid #f0f3fa' }}>
                <span style={{ color: '#f59e0b', fontSize: '.9rem', marginTop: 1 }}>●</span>
                <span style={{ fontSize: '.83rem', color: '#3d4e6b', lineHeight: 1.5 }}>{imp}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Speech metrics */}
      {(myStats || participant) && (
        <div className="card" style={{ padding: '18px 24px', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.9rem', marginBottom: 12 }}>📈 Speaking Metrics</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              ['🗣️', 'Speaking Time', `${participant.speakingTime || 0}s`],
              ['💬', 'Words Spoken',   participant.wordCount     || 0],
              ['⚠️', 'Filler Words',   participant.fillerWords   || 0],
              ['🔔', 'Interruptions',  participant.interruptions || 0],
            ].map(([ic, label, val]) => (
              <div key={label} style={{ textAlign: 'center', padding: '12px 8px', borderRadius: 10, background: '#f8faff' }}>
                <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>{ic}</div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '1.1rem', color: '#0f1a2e' }}>{val}</div>
                <div style={{ fontSize: '.68rem', color: '#b0bec9', fontWeight: 700 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button onClick={() => nav('/dashboard/gd')} style={{ padding: '12px 28px', borderRadius: 12, border: 'none', background: GRAD, color: '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '1rem' }}>
          ← Back to Lobby
        </button>
        <button onClick={() => window.print()} style={{ padding: '12px 28px', borderRadius: 12, border: '1.5px solid #d0d7e8', background: 'transparent', color: '#3d4e6b', fontWeight: 700, cursor: 'pointer', fontFamily: "'Nunito',sans-serif" }}>
          🖨️ Print Report
        </button>
      </div>
    </div>
  );
}
