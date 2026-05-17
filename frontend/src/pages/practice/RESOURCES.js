// ─── Best internet resources for each round type ──────────────────────────────
export const ROUND_RESOURCES = {
  HR: [
    { name: 'InterviewBit HR Questions', url: 'https://www.interviewbit.com/hr-interview-questions/', tag: 'Top Pick', color: '#531697' },
    { name: 'AmbitionBox HR Guide', url: 'https://www.ambitionbox.com/interviews', tag: 'Real Reviews', color: '#13a1a5' },
    { name: 'Indeed Interview Tips', url: 'https://www.indeed.com/career-advice/interviewing/hr-interview-questions', tag: 'Career Advice', color: '#f59e0b' },
    { name: 'Glassdoor Interview Q&A', url: 'https://www.glassdoor.co.in/Interview/index.htm', tag: 'Company-Specific', color: '#47d372' },
    { name: 'Big Interview Practice', url: 'https://biginterview.com/', tag: 'Mock Practice', color: '#ef4444' },
  ],
  GD: [
    { name: 'Group Discussion Ideas', url: 'https://www.groupdiscussionideas.com/', tag: 'Top Pick', color: '#531697' },
    { name: 'MBA Rendezvous GD Topics', url: 'https://www.mbarendezvous.com/group-discussion/', tag: '500+ Topics', color: '#13a1a5' },
    { name: 'Jagranjosh GD Topics 2024', url: 'https://www.jagranjosh.com/articles/group-discussion-topics', tag: 'Latest', color: '#f59e0b' },
    { name: 'InsideIIM GD Preparation', url: 'https://insideiim.com/gd-preparation', tag: 'MBA Focus', color: '#47d372' },
    { name: 'GD Topics for Freshers', url: 'https://www.freshersnow.com/group-discussion-topics/', tag: 'Freshers', color: '#ef4444' },
  ],
  TECHNICAL: [
    { name: 'GeeksforGeeks Interview Prep', url: 'https://www.geeksforgeeks.org/company-interview-corner/', tag: 'Top Pick', color: '#531697' },
    { name: 'IndiaBix Technical', url: 'https://www.indiabix.com/technical/questions-and-answers/', tag: 'MCQ Practice', color: '#13a1a5' },
    { name: 'InterviewBit CS Fundamentals', url: 'https://www.interviewbit.com/courses/programming/', tag: 'Structured', color: '#f59e0b' },
    { name: 'Scaler Topics', url: 'https://www.scaler.com/topics/', tag: 'In-Depth', color: '#47d372' },
    { name: 'JavaTpoint Interview Questions', url: 'https://www.javatpoint.com/interview-questions-and-answers', tag: 'Multi-lang', color: '#ef4444' },
    { name: 'Tutorialspoint Tech Q&A', url: 'https://www.tutorialspoint.com/questions_and_answers.htm', tag: 'Reference', color: '#8b5cf6' },
  ],
  CASE_STUDY: [
    { name: 'Case Interview – PrepLounge', url: 'https://www.preplounge.com/en/case-interview', tag: 'Top Pick', color: '#531697' },
    { name: 'Harvard Business Cases', url: 'https://www.hbs.edu/faculty/case-based-curriculum', tag: 'Premium', color: '#13a1a5' },
    { name: 'CaseCoach Free Cases', url: 'https://casecoach.com/cases/', tag: 'Free Cases', color: '#f59e0b' },
    { name: 'Bain Case Interview Guide', url: 'https://www.bain.com/careers/interview-prep/', tag: 'Consulting', color: '#47d372' },
    { name: 'McKinsey Case Library', url: 'https://www.mckinsey.com/careers/interviewing', tag: 'McKinsey', color: '#ef4444' },
  ],
  SYSTEM_DESIGN: [
    { name: 'System Design Primer (GitHub)', url: 'https://github.com/donnemartin/system-design-primer', tag: '⭐ #1 Resource', color: '#531697' },
    { name: 'Grokking System Design', url: 'https://www.educative.io/courses/grokking-the-system-design-interview', tag: 'Best Course', color: '#13a1a5' },
    { name: 'ByteByteGo Blog', url: 'https://blog.bytebytego.com/', tag: 'Visual Guides', color: '#f59e0b' },
    { name: 'High Scalability Blog', url: 'http://highscalability.com/', tag: 'Real Systems', color: '#47d372' },
    { name: 'System Design Interview Book', url: 'https://www.amazon.in/System-Design-Interview-Insider-Guide/dp/B08CMF2CQF', tag: 'Alex Xu Book', color: '#ef4444' },
    { name: 'Exponent System Design', url: 'https://www.tryexponent.com/courses/system-design-interview', tag: 'Video Course', color: '#8b5cf6' },
  ],
  PROJECT: [
    { name: 'GitHub Explore Projects', url: 'https://github.com/explore', tag: 'Top Pick', color: '#531697' },
    { name: 'Dev.to Project Ideas', url: 'https://dev.to/t/beginners', tag: 'Beginner', color: '#13a1a5' },
    { name: 'InterviewBit Project Tips', url: 'https://www.interviewbit.com/blog/projects-for-resume/', tag: 'Resume Tips', color: '#f59e0b' },
    { name: 'ProjectIdeas.io', url: 'https://www.projectideas.io/', tag: 'Ideas', color: '#47d372' },
    { name: 'Roadmap.sh', url: 'https://roadmap.sh/', tag: 'Tech Roadmap', color: '#ef4444' },
  ],
  GAMING: [
    { name: 'HackerRank Games', url: 'https://www.hackerrank.com/', tag: 'Top Pick', color: '#531697' },
    { name: 'Brilliant.org Puzzles', url: 'https://brilliant.org/courses/logic-deduction/', tag: 'Brain Training', color: '#13a1a5' },
    { name: 'Human Benchmark', url: 'https://humanbenchmark.com/', tag: 'Cognitive Tests', color: '#f59e0b' },
    { name: 'Lumosity', url: 'https://www.lumosity.com/', tag: 'Brain Games', color: '#47d372' },
  ],
  PUZZLE: [
    { name: 'GeeksforGeeks Puzzles', url: 'https://www.geeksforgeeks.org/puzzles/', tag: '⭐ Top Pick', color: '#531697' },
    { name: 'IndiaBix Logical Reasoning', url: 'https://www.indiabix.com/logical-reasoning/questions-and-answers/', tag: 'MCQ Bank', color: '#13a1a5' },
    { name: 'Brilliant.org Logic', url: 'https://brilliant.org/courses/logic-deduction/', tag: 'Interactive', color: '#f59e0b' },
    { name: 'PuzzleFry Interview Puzzles', url: 'https://puzzlefry.com/interview-puzzles/', tag: 'Interview Specific', color: '#47d372' },
    { name: 'TCS NQT Puzzle Prep', url: 'https://www.geeksforgeeks.org/tcs-nqt-puzzles/', tag: 'TCS Specific', color: '#ef4444' },
  ],
  DEBUGGING: [
    { name: 'LeetCode Debug Challenges', url: 'https://leetcode.com/problemset/', tag: '⭐ Top Pick', color: '#531697' },
    { name: 'HackerRank Debugging', url: 'https://www.hackerrank.com/domains/tutorials/10-days-of-javascript', tag: 'Structured', color: '#13a1a5' },
    { name: 'Codewars Kata', url: 'https://www.codewars.com/', tag: 'Community', color: '#f59e0b' },
    { name: 'Exercism Debug Track', url: 'https://exercism.org/', tag: 'Mentored', color: '#47d372' },
    { name: 'Buggy Code Examples - GFG', url: 'https://www.geeksforgeeks.org/find-bug-in-code/', tag: 'Free', color: '#ef4444' },
  ],
};

export const ROUND_META = {
  HR:           { icon: '🟣', label: 'HR Round',          color: '#7c3aed', bg: 'rgba(124,58,237,0.08)',  desc: 'Behavioral, situational & HR screening questions' },
  GD:           { icon: '🔵', label: 'Group Discussion',  color: '#2563eb', bg: 'rgba(37,99,235,0.08)',   desc: "Do's & Don'ts, topics, timed practice with model answers" },
  TECHNICAL:    { icon: '🟠', label: 'Technical Round',   color: '#ea580c', bg: 'rgba(234,88,12,0.08)',   desc: 'DBMS, OS, CN, OOPs, DSA, Java, Python, C++ & more' },
  CASE_STUDY:   { icon: '🟡', label: 'Case Study',        color: '#ca8a04', bg: 'rgba(202,138,4,0.08)',   desc: 'Business problems with structured analysis format' },
  SYSTEM_DESIGN:{ icon: '🟤', label: 'System Design',     color: '#78350f', bg: 'rgba(120,53,15,0.08)',   desc: 'Architecture, scalability & design problem walkthroughs' },
  PROJECT:      { icon: '⚫', label: 'Project Round',     color: '#374151', bg: 'rgba(55,65,81,0.08)',    desc: 'Mock interviewer questions about your projects' },
  GAMING:       { icon: '🎮', label: 'Gaming Round',      color: '#059669', bg: 'rgba(5,150,105,0.08)',   desc: 'Memory match, pattern recognition & reaction tests' },
  PUZZLE:       { icon: '🧩', label: 'Puzzle Round',      color: '#dc2626', bg: 'rgba(220,38,38,0.08)',   desc: 'Logical & analytical puzzles with hints & explanations' },
  DEBUGGING:    { icon: '🐞', label: 'Debugging Round',   color: '#16a34a', bg: 'rgba(22,163,74,0.08)',   desc: 'Find bugs in code snippets across multiple languages' },
};
