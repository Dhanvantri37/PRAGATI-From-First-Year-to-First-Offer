import React from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';

// Color changes green → yellow → red based on score
function scoreColor(score) {
  if (score >= 70) return '#10b981';
  if (score >= 45) return '#f59e0b';
  return '#ef4444';
}

export default function AtsGauge({ score, breakdown }) {
  const color = scoreColor(score);
  const data = [{ value: score, fill: color }];

  const dims = [
    { label: 'Keywords', key: 'keyword_match' },
    { label: 'Sections',  key: 'section_presence' },
    { label: 'Skills',    key: 'skill_alignment' },
    { label: 'Format',    key: 'formatting' },
    { label: 'Impact',    key: 'impact_language' },
  ];

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <RadialBarChart
          width={160} height={160}
          innerRadius={55} outerRadius={75}
          data={data}
          startAngle={210} endAngle={-30}
          barSize={14}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" background={{ fill: '#f1f5fb' }} cornerRadius={8} />
        </RadialBarChart>

        {/* Score number in center */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -54%)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color, lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: '.65rem', color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>ATS SCORE</div>
        </div>
      </div>

      {/* Score label */}
      <div style={{ marginTop: 4, fontSize: '.85rem', fontWeight: 700, color }}>
        {score >= 70 ? 'Strong Match' : score >= 45 ? 'Moderate Match' : 'Needs Work'}
      </div>

      {/* Breakdown bars */}
      {breakdown && (
        <div style={{ marginTop: 16, textAlign: 'left' }}>
          {dims.map(d => {
            const val = breakdown[d.key] ?? 0;
            const max = d.key === 'keyword_match' ? 35 : d.key === 'section_presence' ? 25 : 15;
            const pct = Math.round((val / max) * 100);
            return (
              <div key={d.key} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem', color: '#475569', marginBottom: 3 }}>
                  <span>{d.label}</span>
                  <span style={{ fontWeight: 600 }}>{val}/{max}</span>
                </div>
                <div style={{ height: 5, borderRadius: 9, background: '#f1f5fb', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: scoreColor(pct), borderRadius: 9, transition: 'width .6s ease' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
