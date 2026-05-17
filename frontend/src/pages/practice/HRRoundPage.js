import React, { useState } from 'react';
import { RoundHeader, Card, SectionTitle, AnswerBox, FeedbackPanel, QuestionCard } from './PracticeComponents';
import { ROUND_RESOURCES } from './RESOURCES';

const HR_QUESTIONS = [
  { id:'hr1', question:'Tell me about yourself.', category:'Introduction',
    sampleAnswer:`I am a final-year Computer Science student at [College Name] with strong skills in Java, Python, and full-stack web development. I've built a real-time collaborative code editor and an e-commerce platform as academic projects, which refined my problem-solving and teamwork abilities. I'm passionate about scalable software and eager to contribute meaningfully to your organization from day one.`,
    keywords:['technical skills','project','passion','contribution','background'] },
  { id:'hr2', question:'Why do you want to work at this company?', category:'Motivation',
    sampleAnswer:`I've researched your company extensively. Your culture of innovation, impactful products, and employee mentorship programs align with my goals. My skills in software development will be a good fit, and I'm excited to solve real-world problems at scale here.`,
    keywords:['research','culture','innovation','skills','growth','impact'] },
  { id:'hr3', question:'What are your strengths and weaknesses?', category:'Self-Assessment',
    sampleAnswer:`My greatest strength is my ability to learn quickly — I picked up React.js in two weeks for a critical project. I'm also persistent under pressure. My weakness was time management when multitasking; I addressed this by adopting Notion for task prioritization, which significantly improved my output.`,
    keywords:['strength','weakness','improvement','learning','example'] },
  { id:'hr4', question:'Where do you see yourself in 5 years?', category:'Goals',
    sampleAnswer:`In five years, I see myself as a senior software engineer specializing in cloud architecture, leading small teams, mentoring junior developers, and contributing to architectural decisions. I'd also like to have obtained an AWS Solutions Architect certification to strengthen my technical leadership.`,
    keywords:['senior','growth','leadership','expertise','mentor','certification'] },
  { id:'hr5', question:'Describe a challenging situation and how you handled it.', category:'Behavioral - STAR',
    sampleAnswer:`During my third-year project, we had a critical database race condition bug two days before the demo. I took ownership, analyzed logs, identified the ORM layer issue, implemented transaction isolation, worked overnight, added tests, and we delivered a flawless demo. I learned the importance of database transactions and staying calm under pressure.`,
    keywords:['situation','action','result','team','challenge','learned'] },
  { id:'hr6', question:'How do you handle conflict with a team member?', category:'Teamwork',
    sampleAnswer:`I believe conflicts arise from miscommunication. I first have a calm one-on-one conversation, listen actively, then express my viewpoint with data. During a group project, I disagreed with a teammate's architecture choice — we presented both approaches to our professor, chose the better one, and maintained our working relationship.`,
    keywords:['communication','listen','perspective','resolve','collaboration'] },
  { id:'hr7', question:'Are you comfortable with relocation or different shifts?', category:'Logistics',
    sampleAnswer:`Yes, I'm open to relocation and understand that opportunity may require it. Regarding shifts, I'm flexible and willing to adjust to meet team requirements, including collaborating across time zones, while maintaining productivity.`,
    keywords:['flexible','relocation','shifts','willing','productivity'] },
  { id:'hr8', question:'Do you have any questions for us?', category:'Closing',
    sampleAnswer:`Yes. What does the onboarding process look like? How does the team measure success for someone in this role in the first 90 days? What are the growth and skill development opportunities within the team?`,
    keywords:['onboarding','success','growth','team','culture','expectation'] },
  { id:'hr9', question:'Why should we hire you over other candidates?', category:'Motivation',
    sampleAnswer:`I bring a combination of strong technical skills, practical project experience, and a growth mindset. I don't just write code — I think about the problem, consider edge cases, and deliver clean, maintainable solutions. I've demonstrated this in my projects, and I'm confident I can contribute meaningfully from the first week.`,
    keywords:['unique','skills','experience','contribute','evidence','technical'] },
  { id:'hr10', question:'What do you know about our company?', category:'Research',
    sampleAnswer:`I know that your company [specific details]. You are known for [product/service], your mission is [X], and you recently [recent news/achievement]. I admire how you approach [specific aspect]. I've also used your products/services and understand the value they deliver to customers.`,
    keywords:['research','products','mission','recent news','value','impressed'] },
  { id:'hr11', question:'How do you prioritize tasks when you have multiple deadlines?', category:'Work Style',
    sampleAnswer:`I use a priority matrix — evaluating tasks by urgency and importance. High urgency + high importance gets done first. I communicate proactively if a deadline is at risk. During exam season while managing project work, I broke tasks into daily milestones and tracked them in Notion, ensuring nothing slipped.`,
    keywords:['priority','urgency','communication','plan','organize','deadline'] },
  { id:'hr12', question:'Describe your experience with teamwork and collaboration.', category:'Teamwork',
    sampleAnswer:`In my final-year project, I worked in a team of four across different timezones (one remote member). We used GitHub for version control, Jira for task tracking, and had weekly stand-ups. I took the role of tech lead — made architecture decisions, reviewed pull requests, and helped teammates debug issues. We delivered the project on time with all features.`,
    keywords:['team','collaborate','tools','communication','deliver','role'] },
  { id:'hr13', question:'What is your biggest achievement so far?', category:'Achievement',
    sampleAnswer:`My biggest achievement was winning first place in our college hackathon with a team of three. We built a real-time disaster alert system in 24 hours using Node.js, React, and Twilio SMS API. Beyond the win, the achievement was learning to build and deploy a complete working system under extreme time pressure.`,
    keywords:['achievement','built','team','result','impact','learned'] },
  { id:'hr14', question:'How do you keep your technical skills updated?', category:'Learning',
    sampleAnswer:`I follow a structured learning habit: I spend 30 minutes daily on LeetCode, subscribe to newsletters like TLDR and ByteByteGo, follow tech YouTube channels, take courses on Udemy, and contribute to open-source projects. I also build small side projects to apply new concepts practically.`,
    keywords:['learning','habit','resources','practice','side project','follow'] },
  { id:'hr15', question:'Are you comfortable working in an Agile/Scrum environment?', category:'Work Style',
    sampleAnswer:`Yes, I'm familiar with Agile methodology. In my project team we followed Scrum — two-week sprints, daily stand-ups, sprint planning, and retrospectives. I understand the value of iterative development, continuous feedback, and adapting to changing requirements. I'm also familiar with tools like Jira and Trello.`,
    keywords:['agile','scrum','sprint','stand-up','iterative','jira'] },
  { id:'hr16', question:'What motivates you at work?', category:'Motivation',
    sampleAnswer:`I'm motivated by solving difficult problems that create real impact. When I write code that makes someone's task easier or builds something genuinely useful, that gives me deep satisfaction. I'm also motivated by continuous learning — every new technical challenge feels like an opportunity to grow.`,
    keywords:['problem-solving','impact','learning','satisfaction','growth','challenge'] },
  { id:'hr17', question:'How do you handle failure or setbacks?', category:'Behavioral - STAR',
    sampleAnswer:`I view failure as feedback. When my first startup idea failed because I built without validating user needs, I didn't give up — I analyzed what went wrong (no market research), documented lessons, and applied them to my next project. That project had 200+ active users. Failure taught me to validate before building.`,
    keywords:['failure','learn','analyse','bounce back','apply','next time'] },
  { id:'hr18', question:'Describe your ideal work environment.', category:'Culture Fit',
    sampleAnswer:`My ideal environment has clear goals, technical challenges, and a culture of continuous learning. I thrive in teams where feedback is open and honest, mistakes are learning opportunities, and people care about the quality of their work. I also appreciate flexibility to experiment with new approaches.`,
    keywords:['learning','feedback','team','culture','quality','challenge'] },
  { id:'hr19', question:'What is your expected salary package?', category:'Logistics',
    sampleAnswer:`Based on my research of industry standards for a fresher with my skills and location, I'd expect a package in the range of [X–Y LPA]. However, I'm open to discussion, and I'm more focused on the growth opportunities, the work culture, and what I can learn in the role rather than just the salary.`,
    keywords:['research','range','flexible','growth','open','negotiate'] },
  { id:'hr20', question:'How do you manage stress during tight deadlines?', category:'Work Style',
    sampleAnswer:`I break the problem down into smaller tasks, focus on what's in my control, and prioritize ruthlessly. I also make sure to take short breaks to maintain focus — the Pomodoro technique works well for me. Communicating early if I see a risk to the deadline helps avoid last-minute crises.`,
    keywords:['break down','prioritize','communicate','pomodoro','focus','calm'] },
  { id:'hr21', question:'Tell me about a time you took initiative.', category:'Behavioral - STAR',
    sampleAnswer:`During my internship, I noticed our deployment process was entirely manual and prone to errors. Without being asked, I set up a basic CI/CD pipeline using GitHub Actions that automated builds and deployments. This reduced deployment time from 2 hours to 10 minutes and eliminated human errors. My manager appreciated the initiative and it was adopted company-wide.`,
    keywords:['initiative','identify','action','result','impact','without being asked'] },
  { id:'hr22', question:'Are you a leader or a follower?', category:'Leadership',
    sampleAnswer:`I believe in situational leadership — I can be both. When I have domain expertise or have been assigned responsibility, I naturally take the lead, communicate direction, and ensure the team is unblocked. When working with someone with more experience in a domain, I listen, learn, and contribute actively as a team member. Good teams need both qualities.`,
    keywords:['situational','lead','follow','team','adaptable','expert'] },
  { id:'hr23', question:'Describe your communication style.', category:'Communication',
    sampleAnswer:`I communicate in a clear, concise, and direct manner, adapting my style to the audience — more technical with engineers, more outcome-focused with managers. I believe in over-communicating progress on important tasks, documenting decisions, and asking clarifying questions rather than making assumptions.`,
    keywords:['clear','concise','adapt','audience','document','ask'] },
  { id:'hr24', question:'What are your hobbies or interests outside of work?', category:'Personal',
    sampleAnswer:`Outside of coding, I enjoy competitive programming on Codeforces, contributing to open-source projects on GitHub, and reading about system design and architecture. I also play chess regularly, which helps me think strategically. These activities keep my mind sharp and often give me new perspectives on technical problems.`,
    keywords:['hobby','coding','chess','reading','open-source','balance'] },
  { id:'hr25', question:'Why did you choose computer science/engineering?', category:'Introduction',
    sampleAnswer:`From childhood, I was fascinated by how software could solve real-world problems. When I was 14, I wrote a small Python script to automate a repetitive task for my parents' small business, and seeing it work gave me immense satisfaction. That experience confirmed my interest in CS. I chose this field because it's at the intersection of creativity, logic, and impact.`,
    keywords:['passion','origin story','problem-solving','impact','chosen','motivated'] },
];

const CATEGORIES = ['All', ...new Set(HR_QUESTIONS.map(q => q.category))];

export default function HRRoundPage() {
  const [answers, setAnswers]   = useState({});
  const [filterCat, setFilter]  = useState('All');
  const [showRes, setShowRes]   = useState(false);
  const resources               = ROUND_RESOURCES.HR;

  const filtered = filterCat === 'All' ? HR_QUESTIONS : HR_QUESTIONS.filter(q => q.category === filterCat);
  const answered = HR_QUESTIONS.filter(q => (answers[q.id]||'').trim().length > 0).length;

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif" }}>
      <RoundHeader icon="🟣" title="HR Round Practice"
        subtitle={`${HR_QUESTIONS.length} questions · Keyword-based feedback · Sample answers`} />

      {/* Stats + Resources bar */}
      <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:16, flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:16, padding:'10px 16px', background:'#fff', borderRadius:10, border:'1px solid #e8edf5' }}>
          {[['Answered', answered, '#531697'], ['Total', HR_QUESTIONS.length, '#13a1a5'], ['Progress', `${Math.round((answered/HR_QUESTIONS.length)*100)}%`, '#47d372']].map(([l,v,c])=>(
            <div key={l}><span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1rem', color:c }}>{v}</span><span style={{ fontSize:'.68rem', color:'#7a8ba8', marginLeft:4 }}>{l}</span></div>
          ))}
        </div>
        <div style={{ flex:1 }}/>
        <button onClick={()=>setShowRes(r=>!r)}
          style={{ padding:'8px 16px', borderRadius:9, border:`1.5px solid ${showRes?'#531697':'#d0d7e8'}`, background:showRes?'rgba(83,22,151,0.07)':'#fff', color:showRes?'#531697':'#7a8ba8', fontWeight:800, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.8rem' }}>
          📚 {showRes?'Hide':'Resources'}
        </button>
      </div>

      {/* Resources panel */}
      {showRes && (
        <Card style={{ marginBottom:16, background:'rgba(124,58,237,0.03)', border:'1px solid rgba(124,58,237,0.12)' }}>
          <SectionTitle>📚 Best HR Preparation Resources</SectionTitle>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:8 }}>
            {resources.map((r,i)=>(
              <a key={i} href={r.url} target="_blank" rel="noreferrer"
                style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:9, background:'#fff', border:'1px solid #e8edf5', textDecoration:'none', transition:'all .15s' }}
                onMouseOver={e=>{e.currentTarget.style.borderColor='#7c3aed';e.currentTarget.style.background='rgba(124,58,237,0.04)';}}
                onMouseOut={e=>{e.currentTarget.style.borderColor='#e8edf5';e.currentTarget.style.background='#fff';}}>
                <span style={{ fontSize:'.62rem', fontWeight:800, padding:'2px 6px', borderRadius:5, background:r.color+'18', color:r.color, whiteSpace:'nowrap', flexShrink:0 }}>{r.tag}</span>
                <span style={{ fontSize:'.8rem', color:'#0f1a2e', fontWeight:600, flex:1 }}>{r.name}</span>
                <span style={{ color:'#b0bec9', fontSize:'.75rem' }}>↗</span>
              </a>
            ))}
          </div>
        </Card>
      )}

      {/* Category filter */}
      <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:16 }}>
        {CATEGORIES.map(cat=>(
          <button key={cat} onClick={()=>setFilter(cat)}
            style={{ padding:'5px 12px', borderRadius:999, border:`1.5px solid ${filterCat===cat?'#7c3aed':'#d0d7e8'}`, background:filterCat===cat?'rgba(124,58,237,0.08)':'#fff', color:filterCat===cat?'#7c3aed':'#7a8ba8', fontWeight:700, cursor:'pointer', fontFamily:"'Nunito',sans-serif", fontSize:'.74rem' }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Questions */}
      {filtered.map((q, i) => (
        <QuestionCard key={q.id} num={i+1} total={filtered.length} question={q.question}>
          <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:999, background:'rgba(124,58,237,0.07)', color:'#7c3aed', fontSize:'.67rem', fontWeight:700, marginBottom:10 }}>{q.category}</span>
          <AnswerBox value={answers[q.id]||''} onChange={v=>setAnswers(a=>({...a,[q.id]:v}))} placeholder="Type your answer here (practice mode)…" rows={4}/>
          <div style={{ marginTop:10 }}>
            <FeedbackPanel sampleAnswer={q.sampleAnswer} keywords={q.keywords} userAnswer={answers[q.id]||''}/>
          </div>
        </QuestionCard>
      ))}
    </div>
  );
}
