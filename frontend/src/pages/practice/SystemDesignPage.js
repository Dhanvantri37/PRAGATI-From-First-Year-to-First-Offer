import React, { useState } from 'react';
import { ROUND_RESOURCES } from './RESOURCES';
import { RoundHeader, Card, SectionTitle } from './PracticeComponents';

const DESIGNS = [
  {
    id: 'sd1', title: 'Design a URL Shortener (like bit.ly)', difficulty: 'Easy',
    sections: {
      Requirements: {
        functional: ['Shorten a long URL to a 6-char code', 'Redirect short URL to original', 'Custom alias support', 'Expiry for links', 'Analytics: click count per link'],
        nonFunctional: ['100M URLs shortened/day', '1B redirects/day', 'Low latency (<100ms for redirect)', 'High availability (99.99% uptime)'],
      },
      Components: [
        { name: 'API Gateway', desc: 'Routes requests to appropriate services' },
        { name: 'URL Shortening Service', desc: 'Generates unique short codes using Base62 encoding' },
        { name: 'Redirect Service', desc: 'Looks up short code → returns 301/302 redirect' },
        { name: 'Database (Cassandra/DynamoDB)', desc: 'Stores shortCode → originalURL mapping with TTL support' },
        { name: 'Cache (Redis)', desc: 'Caches hot/popular short codes for sub-ms redirects' },
        { name: 'Analytics Service', desc: 'Asynchronously logs click events via Kafka' },
      ],
      Flow: '1. User sends POST /shorten with longURL\n2. Service generates unique 6-char Base62 code\n3. Stores {shortCode: longURL, expiry} in DB\n4. Returns short URL: domain/shortCode\n\nFor redirect:\n1. User hits GET /shortCode\n2. Check Redis cache first\n3. If miss → query Cassandra\n4. Return 302 redirect to original URL\n5. Async: log click event to Kafka → Analytics DB',
      Diagram: `[Client] → [Load Balancer] → [API Gateway]
        ↓                                    ↓
[Shortening Service]             [Redirect Service]
        ↓                                    ↓
   [Cassandra DB] ←--------→ [Redis Cache]
        ↓
 [Kafka] → [Analytics Service] → [Analytics DB]`,
    },
  },
  {
    id: 'sd2', title: 'Design a Notification System', difficulty: 'Medium',
    sections: {
      Requirements: {
        functional: ['Send push, email, SMS, and in-app notifications', 'Support bulk notifications (marketing campaigns)', 'User preference management (opt-out)', 'Template management', 'Delivery status tracking'],
        nonFunctional: ['10M notifications/hour peak', 'Delivery within 5 minutes', 'At-least-once delivery guarantee', 'Idempotency — no duplicate delivery'],
      },
      Components: [
        { name: 'Notification Service API', desc: 'Accepts notification requests from clients' },
        { name: 'Message Queue (Kafka)', desc: 'Decouples producers from consumers; handles burst traffic' },
        { name: 'Push Service', desc: 'Integrates with FCM (Android), APNs (iOS)' },
        { name: 'Email Service', desc: 'Uses SendGrid/SES with retry logic' },
        { name: 'SMS Service', desc: 'Integrates with Twilio/D7 Networks' },
        { name: 'Preference Service', desc: 'Manages user opt-outs and channel preferences' },
        { name: 'Retry/DLQ', desc: 'Failed notifications go to Dead Letter Queue for retry' },
      ],
      Flow: '1. Producer service calls /notify API with user_id, channel, template, data\n2. Preference Service checks user opt-out status\n3. If allowed → publish to Kafka topic per channel\n4. Channel-specific consumers (Push/Email/SMS) consume messages\n5. Deliver via respective third-party provider\n6. Track delivery status in DB\n7. Failed → retry queue (3 attempts) → DLQ for manual review',
      Diagram: `[Producer Services] → [Notification API]
                                    ↓
                         [Preference Check]
                                    ↓
                              [Kafka Queue]
                    ↙           ↓           ↘
          [Push Consumer] [Email Consumer] [SMS Consumer]
              ↓               ↓                ↓
           [FCM/APNs]     [SendGrid]       [Twilio]
                    ↘          ↓          ↙
                     [Delivery Status DB]`,
    },
  },
];

export default function SystemDesignPage() {
  const [selected, setSelected] = useState(null);
  const [openSection, setOpenSection] = useState('Requirements');
  const [showRes, setShowRes] = useState(false);

  const design = DESIGNS.find(d => d.id === selected);
  const SECTIONS = ['Requirements', 'Components', 'Flow', 'Diagram'];

  if (design) {
    return (
      <div style={{ fontFamily: "'Nunito',sans-serif" }}>
        <RoundHeader icon="🟤" title="System Design" subtitle={design.title} onBack={() => { setSelected(null); setOpenSection('Requirements'); }} />
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {SECTIONS.map(s => (
            <button key={s} onClick={() => setOpenSection(s)}
              style={{ padding: '7px 16px', borderRadius: 9, border: `1.5px solid ${openSection === s ? '#531697' : '#d0d7e8'}`, background: openSection === s ? 'linear-gradient(135deg,#531697,#13a1a5)' : '#fff', color: openSection === s ? '#fff' : '#7a8ba8', fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.8rem' }}>
              {s}
            </button>
          ))}
        </div>

        {openSection === 'Requirements' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Card>
              <SectionTitle>✅ Functional Requirements</SectionTitle>
              {design.sections.Requirements.functional.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: '.83rem', color: '#3d4e6b', lineHeight: 1.5 }}>
                  <span style={{ color: '#531697', fontWeight: 800 }}>{i + 1}.</span> {r}
                </div>
              ))}
            </Card>
            <Card>
              <SectionTitle>⚡ Non-Functional Requirements</SectionTitle>
              {design.sections.Requirements.nonFunctional.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: '.83rem', color: '#3d4e6b', lineHeight: 1.5 }}>
                  <span style={{ color: '#13a1a5', fontWeight: 800 }}>{i + 1}.</span> {r}
                </div>
              ))}
            </Card>
          </div>
        )}

        {openSection === 'Components' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
            {design.sections.Components.map((c, i) => (
              <Card key={i} style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#531697,#13a1a5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.72rem', fontWeight: 800, flexShrink: 0 }}>C{i + 1}</div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.85rem', color: '#0f1a2e' }}>{c.name}</div>
                </div>
                <div style={{ fontSize: '.78rem', color: '#7a8ba8', lineHeight: 1.5 }}>{c.desc}</div>
              </Card>
            ))}
          </div>
        )}

        {openSection === 'Flow' && (
          <Card>
            <SectionTitle>🔄 System Flow</SectionTitle>
            <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(83,22,151,0.04)', border: '1px solid rgba(83,22,151,0.1)', fontSize: '.85rem', color: '#3d4e6b', lineHeight: 2, whiteSpace: 'pre-wrap' }}>
              {design.sections.Flow}
            </div>
          </Card>
        )}

        {openSection === 'Diagram' && (
          <Card>
            <SectionTitle>🗺️ Architecture Diagram (Text-based)</SectionTitle>
            <div style={{ padding: '16px', borderRadius: 10, background: '#0f1a2e', color: '#47d372', fontSize: '.82rem', fontFamily: 'monospace', lineHeight: 2, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
              {design.sections.Diagram}
            </div>
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 9, background: 'rgba(19,161,165,0.06)', border: '1px solid rgba(19,161,165,0.15)', fontSize: '.78rem', color: '#0d7a7e' }}>
              💡 In a real interview, draw this on a whiteboard. Start with the client, then trace data flow through each component.
            </div>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Nunito',sans-serif" }}>
      <RoundHeader icon="🟤" title="System Design Practice" subtitle="Beginner-friendly design problems with architecture diagrams and flow explanations" />
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
        <button onClick={()=>setShowRes(r=>!r)}
          style={{ padding:'7px 16px', borderRadius:9, border:`1.5px solid ${showRes?'#78350f':'#d0d7e8'}`, background:showRes?'rgba(120,53,15,0.07)':'#fff', color:showRes?'#78350f':'#7a8ba8', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.78rem' }}>
          📚 {showRes?'Hide':'Resources'}
        </button>
      </div>
      {showRes && (
        <div style={{ background:'rgba(120,53,15,0.04)', border:'1px solid rgba(120,53,15,0.2)', borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
          <div style={{ fontSize:'.7rem', fontWeight:800, color:'#b0bec9', marginBottom:10 }}>BEST SYSTEM DESIGN RESOURCES</div>
          <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
            {ROUND_RESOURCES.SYSTEM_DESIGN.map((r,i)=>(
              <a key={i} href={r.url} target="_blank" rel="noreferrer"
                style={{ padding:'5px 11px', borderRadius:7, background:r.color+'18', color:r.color, fontSize:'.72rem', fontWeight:800, textDecoration:'none', border:`1px solid ${r.color}30` }}>
                {r.tag} — {r.name} ↗
              </a>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gap: 14 }}>
        {DESIGNS.map(d => (
          <Card key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.95rem', color: '#0f1a2e', marginBottom: 6 }}>{d.title}</div>
              <span style={{ padding: '2px 8px', borderRadius: 999, background: d.difficulty === 'Easy' ? 'rgba(71,211,114,0.1)' : 'rgba(245,158,11,0.1)', color: d.difficulty === 'Easy' ? '#166534' : '#92400e', fontSize: '.68rem', fontWeight: 700 }}>{d.difficulty}</span>
            </div>
            <button onClick={() => setSelected(d.id)}
              style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#531697,#13a1a5)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: "'Nunito',sans-serif", fontSize: '.8rem', flexShrink: 0 }}>
              Study →
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
