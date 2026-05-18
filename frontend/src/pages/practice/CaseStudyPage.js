import React, { useState } from 'react';
import { ROUND_RESOURCES } from './RESOURCES';
import { RoundHeader, Card, SectionTitle, AnswerBox, FeedbackPanel } from './PracticeComponents';

const CASE_STUDIES = [
  {
    id: 'cs1',
    title: 'Zomato Delivery Optimization',
    difficulty: 'Medium',
    context: `Zomato is facing a 35% increase in order cancellations due to long delivery times during peak hours (7–9 PM). Customers are waiting 60+ minutes when the target is 30 minutes. The company has 10,000 active delivery partners but they are unevenly distributed across zones. Customer complaints have increased by 42% in the last quarter.`,
    sections: ['Problem', 'Analysis', 'Solution', 'Impact'],
    sampleAnswer: {
      Problem: 'High delivery times (60+ min vs 30-min target) during peak hours leading to 35% order cancellations and 42% increase in complaints.',
      Analysis: 'Root causes: (1) Uneven distribution of delivery partners across zones, (2) Demand surges not predicted, (3) No dynamic reallocation algorithm during peaks. The 7-9 PM window has 3x normal demand but only 1.2x the delivery partner capacity.',
      Solution: 'Implement a three-pronged approach: (1) Predictive demand model using historical data to pre-position delivery partners in high-demand zones by 6:30 PM. (2) Surge pricing to incentivize off-peak orders. (3) Partner incentive program for peak-hour availability (extra ₹50/delivery). Additionally, optimize route algorithms using real-time traffic data.',
      Impact: 'Expected reduction in delivery time to 35 mins (from 60+), cancellation rate drop from 35% to <10%, and 25% improvement in customer satisfaction scores within 90 days.',
    },
    keywords: ['root cause', 'data', 'prediction', 'distribution', 'incentive', 'optimization'],
  },
  {
    id: 'cs2',
    title: 'Startup Growth Strategy: EdTech',
    difficulty: 'Hard',
    context: `EduLeap is an EdTech startup with 50,000 active users. Monthly churn rate is 8% and monthly growth rate is 12%. Unit economics: Customer Acquisition Cost (CAC) = ₹2,000, Lifetime Value (LTV) = ₹4,500. The founder wants to achieve 5x growth in 18 months with ₹5 crore in funding. Key competition: BYJU'S, Unacademy.`,
    sections: ['Problem', 'Analysis', 'Solution', 'Impact'],
    sampleAnswer: {
      Problem: 'High churn (8%/month = ~65% annual) threatens LTV assumptions and makes the ₹4,500 LTV optimistic. With LTV:CAC ratio of 2.25:1 (below the ideal 3:1), the business is not efficiently profitable.',
      Analysis: 'Churn drivers: Low engagement after initial weeks, lack of personalization, price sensitivity. Growth opportunity: Tier 2/3 cities are underserved. The ₹5Cr budget for 18 months = ~₹28L/month to deploy.',
      Solution: 'Priority 1: Reduce churn to <3% by implementing a 30-day engagement loop (gamification, progress tracking, weekly live sessions). Priority 2: B2B2C model — partner with colleges for institutional subscriptions (higher LTV, lower CAC). Priority 3: Freemium model to attract organic users, upsell premium content. Allocate ₹2Cr for product, ₹1.5Cr for marketing, ₹1Cr for content, ₹50L for ops.',
      Impact: '5x growth achievable if churn drops to 3%: Net growth = 12% - 3% = 9%/month. At this rate, 50K users → 2.5L users in 18 months. Improved LTV to ₹7,500 (lower churn = longer tenure), LTV:CAC improves to 3.75:1.',
    },
    keywords: ['churn', 'LTV', 'CAC', 'strategy', 'engagement', 'growth', 'budget'],
  },
];

export default function CaseStudyPage() {
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState({});
  const [showModel, setShowModel] = useState(false);
  const [showRes, setShowRes]   = useState(false);

  if (selected) {
    const cs = CASE_STUDIES.find(c => c.id === selected);
    return (
      <div style={{ fontFamily: "'Nunito',sans-serif" }}>
        <RoundHeader icon="🟡" title="Case Study" subtitle={cs.title} onBack={() => { setSelected(null); setShowModel(false); setAnswers({}); }} />
        <Card style={{ marginBottom: 16, background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <SectionTitle>📋 Context</SectionTitle>
          <div style={{ fontSize: '.85rem', color: '#3d4e6b', lineHeight: 1.8 }}>{cs.context}</div>
        </Card>
        {cs.sections.map(section => (
          <Card key={section} style={{ marginBottom: 14 }}>
            <SectionTitle>
              {section === 'Problem' ? '🔍' : section === 'Analysis' ? '📊' : section === 'Solution' ? '💡' : '📈'} {section}
            </SectionTitle>
            <AnswerBox value={answers[section] || ''} onChange={v => setAnswers(a => ({ ...a, [section]: v }))} placeholder={`Write your ${section.toLowerCase()}...`} rows={4} />
          </Card>
        ))}
        <Card>
          <button onClick={() => setShowModel(s => !s)}
            style={{ padding: '10px 20px', borderRadius: 9, border: 'none', background: showModel ? '#f0f3fa' : 'linear-gradient(135deg,#531697,#13a1a5)', color: showModel ? '#531697' : '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.85rem' }}>
            {showModel ? '🙈 Hide Model Answer' : '💡 View Model Answer'}
          </button>
          {showModel && (
            <div style={{ marginTop: 14 }}>
              {cs.sections.map(s => (
                <div key={s} style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: '.78rem', color: '#531697', marginBottom: 4 }}>{s}</div>
                  <div style={{ padding: '10px 14px', borderRadius: 9, background: 'rgba(83,22,151,0.04)', border: '1px solid rgba(83,22,151,0.1)', fontSize: '.83rem', color: '#3d4e6b', lineHeight: 1.7 }}>{cs.sampleAnswer[s]}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Nunito',sans-serif" }}>
      <RoundHeader icon="🟡" title="Case Study Practice" subtitle="Real-world business problems with structured answering format" />
      {/* Resources bar */}
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
        <button onClick={()=>setShowRes(r=>!r)}
          style={{ padding:'7px 16px', borderRadius:9, border:`1.5px solid ${showRes?'#ca8a04':'#d0d7e8'}`, background:showRes?'rgba(202,138,4,0.07)':'#fff', color:showRes?'#ca8a04':'#7a8ba8', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.78rem' }}>
          📚 {showRes?'Hide':'Resources'}
        </button>
      </div>
      {showRes && (
        <div style={{ background:'rgba(202,138,4,0.04)', border:'1px solid rgba(202,138,4,0.2)', borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
          <div style={{ fontSize:'.7rem', fontWeight:800, color:'#b0bec9', marginBottom:10 }}>BEST CASE STUDY RESOURCES</div>
          <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
            {ROUND_RESOURCES.CASE_STUDY.map((r,i)=>(
              <a key={i} href={r.url} target="_blank" rel="noreferrer"
                style={{ padding:'5px 11px', borderRadius:7, background:r.color+'18', color:r.color, fontSize:'.72rem', fontWeight:800, textDecoration:'none', border:`1px solid ${r.color}30` }}>
                {r.tag} — {r.name} ↗
              </a>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gap: 14 }}>
        {CASE_STUDIES.map(cs => (
          <Card key={cs.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.95rem', color: '#0f1a2e', marginBottom: 6 }}>{cs.title}</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <span style={{ padding: '2px 8px', borderRadius: 999, background: cs.difficulty === 'Hard' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: cs.difficulty === 'Hard' ? '#991b1b' : '#92400e', fontSize: '.68rem', fontWeight: 700 }}>{cs.difficulty}</span>
              </div>
              <div style={{ fontSize: '.78rem', color: '#7a8ba8', lineHeight: 1.5 }}>{cs.context.slice(0, 100)}…</div>
            </div>
            <button onClick={() => setSelected(cs.id)}
              style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#531697,#13a1a5)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.8rem', flexShrink: 0 }}>
              Solve →
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
