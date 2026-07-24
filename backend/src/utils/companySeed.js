const path = require('path');
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
const mongoose = require('mongoose');

async function seed() {
  const uri = process.env.MONGODB_URI;
  let retries = 5;
  while (retries > 0) {
    try {
      await mongoose.connect(uri);
      console.log('✅ Connected to MongoDB\n');
      break;
    } catch (err) {
      retries--;
      console.warn(`⚠️ Connection failed. Retries left: ${retries}. Error: ${err.message}`);
      if (retries === 0) throw err;
      await new Promise(r => setTimeout(r, 4000));
    }
  }

  const { Company } = require('../models/index');

  // Reset Companies
  await Company.deleteMany({});
  console.log('🧹 Old Companies reset\n');

  const companies = [
    {
      name: "Bentley Systems",
      logoUrl: "https://www.google.com/s2/favicons?sz=128&domain=bentley.com",
      sector: "Software & CAD Engineering",
      website: "https://bentley.com",
      status: "visited",
      campusVisitDate: "2024-09-20",
      ctc: "10.00 LPA",
      difficulty: "Medium-Hard",
      eligibilityCriteria: { minCGPA: 7.0, allowedBranches: ["CSE", "CSAIML", "IT", "ECE"], backlogs: false },
      roles: ["Associate Software Engineer", "Quality Analyst"],
      recruitmentRounds: [
        "Online Assessment (Aptitude, OOPS MCQs, and 2 Coding Questions)",
        "Technical Interview 1 (OOPs, DBMS, Operating Systems, C++, and Project walkthrough)",
        "Technical Interview 2 (DSA Coding - Trees, Dynamic Programming, Strings, and memory layout)",
        "Managerial & Behavioral Fitment Interview",
        "HR Interview"
      ],
      aptitudePatterns: "Quant: Permutations & Combinations, Probability, Work & Time, Coordinate Geometry\nLogical: Data Sufficiency, Matrix/Seating Arrangements\nVerbal: Sentence Completion, Grammatical Corrections, Para Jumbles\nCoding: 2-3 standard DSA problems (HackerRank) focusing on dynamic programming, arrays, and string parsing.",
      interviewPatterns: "DSA: Heavy emphasis on dynamic programming, trees, and hash maps.\nOOP: Deep dive in C++ or C# specific memory allocation, pointer arithmetic, structures vs classes, virtual functions, and garbage collection.\nSystem Design: Simple API endpoint structures and SQL database design.\nResume Defense: Exhaustive walkthrough of your academic projects and individual contributions.",
      jdText: "Bentley Systems is a leading global infrastructure engineering software company. Hires for engineering roles in digital twin cloud platforms, desktop CAD engines, and virtualization stacks.",
      prepTips: "Practice medium/hard coding challenges on HackerRank.\nBe extremely thorough with C++ concepts like smart pointers, templates, and memory layouts.\nPrepare a clear 5-minute architectural diagram explanation of your major project.",
      tags: ["product-based", "infrastructure", "software-engineering", "high-package"],
      companyOverview: "Infrastructure engineering software developer founded in 1984. Provides CAD, cloud, and GIS solutions to infrastructure professionals worldwide, employing over 5,000 workers.",
      techStack: ["C++", "C#", ".NET", "TypeScript", "React", "Azure"],
      workCulture: "Excellent work-life balance, collaborative engineering teams, structured mentorship programs.",
      growthPath: "Associate Software Engineer → Software Engineer → Senior Software Engineer → Technical Lead",
      interviewDifficulty: "Medium to Hard",
      bondDetails: "No service bond.",
      hiringMode: "On-Campus",
      testPlatform: "HackerRank",
      bond: "None",
      packageBreakdown: "Base Package: ₹9.00 LPA, Retainers/Allowances: ₹1.00 LPA",
      resources: [
        "https://www.ambitionbox.com/interviews/bentley-systems-interview-questions",
        "https://www.glassdoor.co.in/Interview/Bentley-Systems-Interview-Questions-E8314.htm"
      ]
    },
    {
      name: "Jaro Education",
      logoUrl: "https://www.google.com/s2/favicons?sz=128&domain=jaroeducation.com",
      sector: "EdTech & Business Services",
      website: "https://jaroeducation.com",
      status: "visited",
      campusVisitDate: "2024-09-28",
      ctc: "10.00 LPA",
      difficulty: "Medium",
      eligibilityCriteria: { minCGPA: 6.0, allowedBranches: ["CSE", "CSAIML", "IT", "ECE", "EEE", "Mechanical", "Civil"], backlogs: true },
      roles: ["Graduate Engineer Trainee (GET)", "Business Development Executive"],
      recruitmentRounds: [
        "Introductory Screening & Resume Review",
        "Group Discussion (Topics like EdTech, Online Education vs Traditional Education)",
        "Personal Interview with Manager (Sales pitch simulation - 'Sell a course/product to us')",
        "HR Interview"
      ],
      aptitudePatterns: "Logical: Syllogism, Blood Relations, Seating Arrangement\nVerbal: Synonyms, Reading Comprehension\nCase Study: Live business situation analysis and presentation",
      interviewPatterns: "Group Discussion: Standard topics like 'Online Education vs Traditional Classroom' or 'AI Threat to Human Jobs'.\nSales Simulation: Selling a specific product or premium training program to a strict customer.\nTechnical Panel: General web systems logic, database schemas, and client deployment setups.\nHR Round: Culture fitment, relocate check, target handling potential.",
      jdText: "Jaro Education is a pioneer in the executive education space. Hires tech graduates for core product development, customer success engineering, and enterprise solution architect roles.",
      prepTips: "Work heavily on spoken English, tone, and confidence.\nPrepare for sales pitch challenges by studying Jaro's executive programs.\nPrepare a solid explanation of why you are interested in a high-growth career path.",
      tags: ["edtech", "sales-alignment", "high-incentive", "growth-driven"],
      companyOverview: "Leading online higher education provider in India. Partners with top tier universities (IIMs, IITs) to deliver premium executive programs. Over 2,000 employees.",
      techStack: ["PHP", "Laravel", "MySQL", "JavaScript", "React", "Node.js"],
      workCulture: "Fast-paced corporate sales and business development alignment. High growth, target-oriented environment.",
      growthPath: "Management Trainee → Assistant Manager → Manager → Senior Manager",
      interviewDifficulty: "Medium",
      bondDetails: "No service bond.",
      hiringMode: "On-Campus",
      testPlatform: "Internal Assessment",
      bond: "None",
      packageBreakdown: "Fixed Component: ₹7.00 LPA, Performance Incentives: ₹3.00 LPA",
      resources: [
        "https://www.glassdoor.co.in/Interview/Jaro-Education-Business-Development-Executive-Interview-Questions-EI_IE427536.0,14_KO15,45.htm",
        "https://www.glassdoor.com/Interview/Jaro-Education-Interview-Questions-E427536.htm"
      ]
    },
    {
      name: "Cogitate",
      logoUrl: "https://www.google.com/s2/favicons?sz=128&domain=cogitate.us",
      sector: "InsurTech & Cloud Computing",
      website: "https://cogitate.us",
      status: "visited",
      campusVisitDate: "2024-10-02",
      ctc: "8.00 LPA",
      difficulty: "Medium",
      eligibilityCriteria: { minCGPA: 6.5, allowedBranches: ["CSE", "CSAIML", "IT", "ECE"], backlogs: false },
      roles: ["Software Engineer Trainee", "Database Engineer"],
      recruitmentRounds: [
        "Online Assessment (Aptitude, Logical Reasoning, and basic programming MCQs)",
        "Technical Interview 1 (In-depth SQL queries, database normalizations, triggers, and joints)",
        "Technical Interview 2 (OOPs, programming code snippets, and C#/.NET Core)",
        "Managerial & HR Round"
      ],
      aptitudePatterns: "Quant: Ratios, Percentages, Profit & Loss, Logarithms\nLogical: Venn Diagrams, Logical deductions, Coding-Decoding\nTechnical Quiz: SQL indices, HTML/CSS structure questions.",
      interviewPatterns: "DBMS: Heavy focus on relational databases, writing complex SQL queries, triggers, joins, indexing, and normalization (1NF-3NF).\nOOP: Real-world class structure designs, interface vs abstract classes, inheritance paradigms.\nProgramming: Language-specific basics (.NET Core C# or Java), exception handling, and GC execution.",
      jdText: "Cogitate develops modern cloud-native insurance technologies and claims management platforms. Hires freshers for application development, API integrations, and database operations.",
      prepTips: "Practice advanced SQL query construction (Joins, Window functions, CTEs).\nRevise core OOP theories with clean coding examples in C# or Java.\nUnderstand client-server architecture basics.",
      tags: ["insurtech", "cloud-native", "database-heavy", "stable"],
      companyOverview: "Global provider of modern technology solutions for the insurance industry. Builds complex SaaS architectures designed to accelerate digital transformation for carriers and brokers.",
      techStack: ["C#", ".NET Core", "SQL Server", "AWS", "Angular", "REST APIs"],
      workCulture: "Highly technical workspace focusing on cloud systems. Flat structure with flexible working hours.",
      growthPath: "Engineer Trainee → Software Engineer → Senior Engineer → Team Lead",
      interviewDifficulty: "Medium",
      bondDetails: "2-year mandatory service agreement. Penalty of ₹1,00,000 for early exit.",
      hiringMode: "On-Campus",
      testPlatform: "CoCubes",
      bond: "2 years",
      packageBreakdown: "Base Component: ₹7.20 LPA, Variable Bonus: ₹0.80 LPA",
      resources: [
        "https://www.glassdoor.co.in/Interview/Cogitate-Technology-Interview-Questions-E1439268.htm"
      ]
    },
    {
      name: "Jibe",
      logoUrl: "https://www.google.com/s2/favicons?sz=128&domain=jibe.com.sg",
      sector: "Maritime Software & Tech",
      website: "https://jibe.com.sg",
      status: "visited",
      campusVisitDate: "2024-10-10",
      ctc: "5.00–7.00 LPA",
      difficulty: "Medium",
      eligibilityCriteria: { minCGPA: 6.0, allowedBranches: ["CSE", "CSAIML", "IT", "ECE"], backlogs: false },
      roles: ["Associate Software Developer", "QA Automation Engineer"],
      recruitmentRounds: [
        "Online Assessment (Javascript MCQs, logical thinking, and basic database checks)",
        "Technical Interview 1 (Javascript depth, MERN stack structure, and React hooks)",
        "Technical Interview 2 (Live coding challenge on Express routing and Mongo aggregations)",
        "Behavioral & HR Interview"
      ],
      aptitudePatterns: "Aptitude: Basic reasoning, data interpretation\nJavascript: Scope, closures, ES6 features, promises, asynchronous execution flows.",
      interviewPatterns: "MERN Stack: React components, state hooks, Node routing, Express middlewares, MongoDB collections and aggregation.\nLive Code: Writing a backend controller or custom hooks on screen.\nQA: Selenium WebDriver scripts, API testing, automated tests design.",
      jdText: "JiBe Technologies is a shipping software provider specializing in cloud platforms for shipowners. Core development includes real-time vessel monitoring, API connections, and offline synchronization engines.",
      prepTips: "Be highly fluent in Javascript (async-await, closures, ES6 syntax).\nPractice designing backend server controllers with Express and Mongo.\nReview offline data synchronisation strategies.",
      tags: ["saas", "maritime-tech", "javascript-heavy", "growth"],
      companyOverview: "Fast-growing SaaS provider for the maritime transport industry. Offers unified ERP solutions covering crew management, procurement, vessel maintenance, and marine analytics.",
      techStack: ["JavaScript", "Node.js", "React.js", "MongoDB", "Express", "Docker"],
      workCulture: "Product-focused development with extreme ownership. High collaboration across global offices.",
      growthPath: "Associate Developer → Full Stack Developer → Module Owner → Project Lead",
      interviewDifficulty: "Medium",
      bondDetails: "No service bond.",
      hiringMode: "On-Campus",
      testPlatform: "HackerEarth",
      bond: "None",
      packageBreakdown: "Base Package: ₹5.00 LPA – ₹7.00 LPA (Performance-based placement tier)",
      resources: [
        "https://www.glassdoor.co.in/Interview/Jibe-Technologies-Interview-Questions-E1005615.htm"
      ]
    },
    {
      name: "Atlas Copco",
      logoUrl: "https://www.google.com/s2/favicons?sz=128&domain=atlascopco.com",
      sector: "Industrial Engineering & Automation",
      website: "https://atlascopco.com",
      status: "visited",
      campusVisitDate: "2024-10-15",
      ctc: "6.50 LPA",
      difficulty: "Medium",
      eligibilityCriteria: { minCGPA: 6.5, allowedBranches: ["CSE", "CSAIML", "IT", "ECE", "Mechanical", "Electrical"], backlogs: false },
      roles: ["Graduate Engineer Trainee (GET)", "Embedded Systems Developer"],
      recruitmentRounds: [
        "Online Assessment (Aptitude & core embedded C programming)",
        "Technical Interview 1 (Embedded systems C, pointers, interrupts, and microcontroller memory maps)",
        "Technical Interview 2 (IoT system design, serial communication protocol layouts like SPI/I2C/UART)",
        "Behavioral & HR Interview"
      ],
      aptitudePatterns: "Quant: Speed-Distance, Time-Work, Permutations\nEmbedded: C pointer arithmetic, bitwise masking, memory-mapped I/O, interrupt vectors.",
      interviewPatterns: "C Language: Struct alignments, pointer sizes, dynamic allocation, storage classes.\nEmbedded: RTOS scheduling, semaphores, SPI/I2C/UART differences.\nIndustrial: Basics of Industry 4.0, sensor configurations, and IoT networking protocols.",
      jdText: "Atlas Copco is a world-leading provider of industrial productivity solutions. Hires IT/Electronics engineers for industrial IoT systems, compressor control software, and digital factory initiatives.",
      prepTips: "Practice embedded C questions, focusing on bit manipulation and memory pointer tracing.\nRevise serial communication protocols (SPI, I2C, UART).\nUnderstand the basics of IoT hardware-software stacks.",
      tags: ["multinational", "industrial-iot", "embedded-systems", "stable"],
      companyOverview: "Swedish multinational industrial manufacturer founded in 1873. Operates globally in compressors, vacuum systems, power tools, and assembly systems. Large technical center in Pune.",
      techStack: ["C", "C++", "Python", "Linux", "Embedded Systems", "IoT Protocols"],
      workCulture: "Highly structured industrial engineering culture. Safety-first, research-driven environment with excellent training.",
      growthPath: "Graduate Trainee → Design Engineer → Senior Design Engineer → Project Manager",
      interviewDifficulty: "Medium",
      bondDetails: "No service bond.",
      hiringMode: "On-Campus",
      testPlatform: "Internal Assessment",
      bond: "None",
      packageBreakdown: "Base Component: ₹6.00 LPA, Performance/Retention Bonus: ₹0.50 LPA",
      resources: [
        "https://www.glassdoor.co.in/Interview/Atlas-Copco-Interview-Questions-E10368.htm"
      ]
    },
    {
      name: "Nonstop IO Technologies Pvt. Ltd.",
      logoUrl: "https://www.google.com/s2/favicons?sz=128&domain=nonstopio.com",
      sector: "Product Engineering Services",
      website: "https://nonstopio.com",
      status: "visited",
      campusVisitDate: "2024-10-22",
      ctc: "5.00 LPA",
      difficulty: "Medium",
      eligibilityCriteria: { minCGPA: 6.0, allowedBranches: ["CSE", "CSAIML", "IT"], backlogs: false },
      roles: ["Software Engineer Trainee", "QA Engineer"],
      recruitmentRounds: [
        "Take-home Assignment (Standard coding task or CRUD project design sent to email)",
        "Technical Interview 1 (Assignment walkthrough, JavaScript depth, OOP, and DBMS normalizations)",
        "Technical Interview 2 (Advanced logic, live coding on screen, and database indexing)",
        "HR & Core Values Round (Empathy, Creativity, Collaboration, Clean Code)"
      ],
      aptitudePatterns: "Coding Assessment: 2 problems (HashMaps, sliding windows, string formatting).\nWeb Quiz: React hook triggers, CSS layouts, and basic REST operations.",
      interviewPatterns: "Technical 1: JS ES6 features, OOP class implementations, and basic API structures.\nLive Code: Writing a clean React module or Node controller on a shared IDE.\nValues Round: Focuses on core principles (Empathy, Clean Code, Collaboration, Creativity).",
      jdText: "Nonstop IO is a product design and development studio. Hires freshers to work on modern mobile and web products for global startups using Flutter, React, Node.js, and Java.",
      prepTips: "Emphasize writing clean, readable code with comments.\nBuild a robust React/Node app portfolio before the drive.\nPractice explain-as-you-code sessions.",
      tags: ["boutique-studio", "product-dev", "startup-vibe", "learning"],
      companyOverview: "Specialized boutique product consulting firm based in Pune. Builds custom end-to-end cloud platforms and mobile applications with high aesthetic and UX focus.",
      techStack: ["React.js", "Node.js", "Java", "Spring Boot", "Flutter", "PostgreSQL", "MongoDB"],
      workCulture: "Startup vibe, highly collaborative. Flat organization, fast-paced learning and active dev meetups.",
      growthPath: "Intern → Software Engineer → Senior Software Engineer → Tech Lead",
      interviewDifficulty: "Medium",
      bondDetails: "1.5-year service agreement. Penalty fee of ₹1,00,000 for early exit.",
      hiringMode: "On-Campus",
      testPlatform: "TestGorilla",
      bond: "1.5 years",
      packageBreakdown: "Fixed Package: ₹4.50 LPA, Performance/Retention Bonus: ₹0.50 LPA",
      resources: [
        "https://www.glassdoor.co.in/Interview/NonStop-io-Technologies-Interview-Questions-E1528646.htm"
      ]
    },
    {
      name: "Cognizant Technologies",
      logoUrl: "https://www.google.com/s2/favicons?sz=128&domain=cognizant.com",
      sector: "IT Services & Consulting",
      website: "https://cognizant.com",
      status: "visited",
      campusVisitDate: "2024-11-01",
      ctc: "4.00–6.75 LPA",
      difficulty: "Easy-Medium",
      eligibilityCriteria: { minCGPA: 6.0, allowedBranches: ["CSE", "CSAIML", "IT", "ECE", "EEE"], backlogs: false },
      roles: ["GenC (Programmer Analyst Trainee)", "GenC Elevate", "GenC Next"],
      recruitmentRounds: [
        "Online Assessment (AMCAT - Quant, Logical Reasoning, and Verbal Ability)",
        "Technical Interview (OOP concepts, DBMS normalization, simple SQL query construction, and basic DSA)",
        "HR Interview"
      ],
      aptitudePatterns: "Aptitude (AMCAT): Quantitative (ratios, times, percentages), Logical reasoning (arrangements, coding-decoding), and English verbal sections.\nCoding (Elevate/Next): 2 questions (Arrays, strings, matrix manipulations).",
      interviewPatterns: "OOP: Fundamental concepts (abstraction, inheritance types), code snippets, and polymorphism applications.\nDBMS: Relational schemas, keys (primary vs foreign), normalizations (1NF-3NF), and simple SQL JOIN writes.\nOS: Thread vs Process, Paging, Virtual memory basics.\nProject: 5-minute explanation highlighting tools used and your contribution.",
      jdText: "Cognizant hires freshers for Programmer Analyst roles. Work domains: application development, cloud maintenance, testing, and business intelligence. Service agreement applies.",
      prepTips: "Practice basic quantitative puzzles on platforms like IndiaBIX.\nSolve 50+ Easy arrays & strings coding questions.\nUnderstand core academic concepts of OOP, DBMS, and OS.",
      tags: ["mass-recruiter", "multi-track", "service-based", "career-entry"],
      companyOverview: "American multinational technology company. Revenue: $19B+. Over 340,000 employees globally. One of the largest recruiters of engineering talent in India.",
      techStack: ["Java", "SQL", "Spring Boot", "Python", "React", "Cloud Foundations", "Salesforce"],
      workCulture: "Structured operational hierarchy, large project team environments, flexible training opportunities.",
      growthPath: "Programmer Analyst Trainee → Programmer Analyst → Associate → Senior Associate",
      interviewDifficulty: "Easy to Medium",
      bondDetails: "No service bond.",
      hiringMode: "On-Campus / National Drive",
      testPlatform: "AMCAT / Mettl",
      bond: "None",
      packageBreakdown: "GenC Tier: ₹4.00 LPA, GenC Elevate: ₹4.25–4.50 LPA, GenC Next: ₹6.75 LPA",
      resources: [
        "https://www.glassdoor.co.in/Interview/Cognizant-Technology-Solutions-Interview-Questions-E2295.htm"
      ]
    },
    {
      name: "Hexaware",
      logoUrl: "https://www.google.com/s2/favicons?sz=128&domain=hexaware.com",
      sector: "IT Services",
      website: "https://hexaware.com",
      status: "visited",
      campusVisitDate: "2024-11-05",
      ctc: "4.20 LPA",
      difficulty: "Easy-Medium",
      eligibilityCriteria: { minCGPA: 6.0, allowedBranches: ["CSE", "CSAIML", "IT", "ECE"], backlogs: false },
      roles: ["Graduate Engineer Trainee (GET)", "Software Engineer Trainee"],
      recruitmentRounds: [
        "Online Assessment (CoCubes - Quantitative, Logical, Verbal, and Pseudo-code execution)",
        "Coding Assessment (2 coding questions on recursion, arrays, or strings)",
        "Technical Interview (Programming logic, database queries, and Core CS)",
        "HR Interview"
      ],
      aptitudePatterns: "Aptitude (CoCubes): Quantitative logic, reasoning puzzles, and English grammar.\nTechnical: Pseudo-code execution and tracing logic questions.\nCoding: 2 problems focusing on recursion, arrays, or strings.",
      interviewPatterns: "Coding: Writing basic snippets on paper (e.g. reverse an array, check palindrome).\nDBMS: Primary SQL updates, JOINS, and ACID properties definition.\nOOP: Static vs Dynamic polymorphism, abstract class vs interfaces.\nHR: Teamwork instances, relocation preferences, and technology adaptability.",
      jdText: "Hexaware hires engineering freshers for digital IT services. Focus areas include web technologies, cloud integration, software testing, and business application support.",
      prepTips: "Practice flowcharts and pseudo-code tracing questions.\nPrepare standard DBMS answers (indexing, normal forms, transaction ACID properties).\nEnsure comfortable communication in English.",
      tags: ["it-services", "automation", "consulting", "structured-training"],
      companyOverview: "Global provider of IT, BPO, and consulting services. Founded in 1990, employing over 30,000 professionals across 30+ countries. Fast-growing automation-led consulting services.",
      techStack: ["Java", "Python", "SQL", "HTML/CSS", "JavaScript", "AWS"],
      workCulture: "Highly inclusive work culture, strong emphasis on continuous learning and technology certifications.",
      growthPath: "Trainee → Software Engineer → Senior Software Engineer → Technical Lead",
      interviewDifficulty: "Easy-Medium",
      bondDetails: "2-year service bond. Penalty: ₹1,00,000.",
      hiringMode: "On-Campus",
      testPlatform: "CoCubes",
      bond: "2 years",
      packageBreakdown: "Base Package: ₹4.20 LPA (inclusive of all allowances)",
      resources: [
        "https://www.glassdoor.co.in/Interview/Hexaware-Technologies-Interview-Questions-E11456.htm"
      ]
    },
    {
      name: "Sankey Solutions",
      logoUrl: "https://www.google.com/s2/favicons?sz=128&domain=sankeysolutions.com",
      sector: "Technology Consulting",
      website: "https://sankeysolutions.com",
      status: "visited",
      campusVisitDate: "2024-11-12",
      ctc: "4.00 LPA",
      difficulty: "Medium",
      eligibilityCriteria: { minCGPA: 6.0, allowedBranches: ["CSE", "CSAIML", "IT", "ECE"], backlogs: false },
      roles: ["Software Analyst", "Junior Developer"],
      recruitmentRounds: [
        "Logical & Quantitative Online Test",
        "Coding & Algorithm Assessment (Recursion, array sorting, string parsing)",
        "Technical Interview (Algorithmic reasoning, live puzzle solving, and database mapping)",
        "Practical Task / Pair Programming assessment",
        "HR Interview"
      ],
      aptitudePatterns: "Written Test: 5-8 logical/analytical puzzles, mathematical sequence problems.\nProgramming OA: Algorithmic problems focusing on efficient custom parsing and array search.",
      interviewPatterns: "Problem Solving: You will solve puzzles live on a whiteboard while explaining your logic step-by-step.\nTechnical: Javascript scope/closures, API integrations, and database table designs.",
      jdText: "Sankey Solutions offers technology solutions, analytics and design services. Hires freshers for technology consulting roles specializing in high-speed backend integrations and data modeling.",
      prepTips: "Practice solving logical puzzles on GeeksforGeeks.\nFocus on explaining your thought process out loud to show problem-solving patterns.\nBe prepared to write code for basic recursive algorithms.",
      tags: ["consulting", "startup", "problem-solving", "analytical"],
      companyOverview: "Tech consulting and solutions provider specializing in business automation. Features a unique learning-driven model designed to build multi-functional architects.",
      techStack: ["Python", "Django", "JavaScript", "React.js", "Node.js", "PostgreSQL"],
      workCulture: "Startup atmosphere. Emphasis on learning, logic validation, and independent problem-solving skills.",
      growthPath: "Junior Analyst → Tech Consultant → Senior Consultant → Solution Architect",
      interviewDifficulty: "Medium",
      bondDetails: "No service bond.",
      hiringMode: "On-Campus",
      testPlatform: "Internal Assessment",
      bond: "None",
      packageBreakdown: "Base Package: ₹4.00 LPA",
      resources: [
        "https://www.glassdoor.co.in/Interview/Sankey-Solutions-Interview-Questions-E1624639.htm"
      ]
    },
    {
      name: "Neeyamo Enterprises Solutions",
      logoUrl: "https://www.google.com/s2/favicons?sz=128&domain=neeyamo.com",
      sector: "HR Tech & Global Payroll",
      website: "https://neeyamo.com",
      status: "visited",
      campusVisitDate: "2024-11-18",
      ctc: "4.00 LPA",
      difficulty: "Easy-Medium",
      eligibilityCriteria: { minCGPA: 6.0, allowedBranches: ["CSE", "CSAIML", "IT", "ECE", "EEE", "Mechanical", "Civil"], backlogs: false },
      roles: ["Product Engineer Trainee", "Implementation Engineer"],
      recruitmentRounds: [
        "Aptitude & English Online Test",
        "Technical Interview (DBMS/SQL queries, data schemas, relational models, and CSS layouts)",
        "HR & Managerial Interview"
      ],
      aptitudePatterns: "Online Test: English verbal ability, reading comprehensions, mathematical fractions.\nDomain Quiz: Basic HTML, SQL tags, database keys.",
      interviewPatterns: "Technical: Relational schemas, writing SQL queries (SELECT, GROUP BY, aggregations, JOINs).\nFrontend: Responsive HTML/CSS UI layouts.\nHR: Work hours adaptability, relocate, communication check.",
      jdText: "Neeyamo is a leading provider of global payroll and HR technology solutions. Hires freshers for application support, payroll automation tool developer and custom platform configuration roles.",
      prepTips: "Be highly prepared in DBMS concepts and writing queries.\nUnderstand basic client-server structures.\nShow adaptability in behavioral discussions.",
      tags: ["hr-tech", "payroll-systems", "saas", "global"],
      companyOverview: "Specialized technology services firm focused exclusively on global payroll and HR systems. Headquartered in Chennai, serving organizations in over 150 countries.",
      techStack: ["Java", "SQL Server", "HTML/CSS", "JavaScript", "ERP Frameworks"],
      workCulture: "Global operational structure. Diverse team projects, customer-centric product environment.",
      growthPath: "Engineer Trainee → Senior Engineer → Project Manager",
      interviewDifficulty: "Easy to Medium",
      bondDetails: "No service bond.",
      hiringMode: "On-Campus",
      testPlatform: "Mettl",
      bond: "None",
      packageBreakdown: "Base Package: ₹4.00 LPA",
      resources: [
        "https://www.glassdoor.co.in/Interview/Neeyamo-Enterprise-Solutions-Interview-Questions-E598363.htm"
      ]
    },
    {
      name: "Rsquaresoft Technologies",
      logoUrl: "https://www.google.com/s2/favicons?sz=128&domain=rsquaresoft.com",
      sector: "Enterprise Software Services",
      website: "https://rsquaresoft.com",
      status: "visited",
      campusVisitDate: "2024-11-25",
      ctc: "4.00 LPA",
      difficulty: "Easy-Medium",
      eligibilityCriteria: { minCGPA: 6.0, allowedBranches: ["CSE", "CSAIML", "IT", "ECE"], backlogs: true },
      roles: ["Junior Software Developer", "QA Intern"],
      recruitmentRounds: [
        "Aptitude & Technical Online Assessment (Python syntax, data types, basic SQL selects)",
        "Technical Face-to-Face Interview (Python lists/dictionaries, REST API calls, DOM events, and basic databases)",
        "HR Interview"
      ],
      aptitudePatterns: "Online Test: standard math arithmetic, logic sequencing, code-output predictions for Python variables, loops, functions.",
      interviewPatterns: "Python: Lists, dictionaries, scope resolution, file operations, basic class declarations.\nWeb: API request lifecycle, GET/POST routes, DOM interactions.\nDatabase: Simple table designs and query selections.",
      jdText: "Rsquaresoft Technologies provides customized software, mobile applications, and web services. Hires freshers to develop RESTful APIs, responsive web interfaces, and backend databases.",
      prepTips: "Practice intermediate coding exercises in Python.\nRevise Javascript frontend API integrations.\nLearn RESTful service guidelines.",
      tags: ["web-development", "consulting", "small-teams", "direct-client"],
      companyOverview: "Boutique software engineering house building custom business intelligence applications and CRM systems for global clients.",
      techStack: ["Python", "Flask", "React.js", "SQL", "HTML/CSS", "JavaScript"],
      workCulture: "Supportive, small-team environment. Encourages project ownership and direct client communications.",
      growthPath: "Junior Dev → Developer → Senior Developer → Lead Architect",
      interviewDifficulty: "Easy-Medium",
      bondDetails: "1-year service bond. Penalty of ₹50,000.",
      hiringMode: "On-Campus",
      testPlatform: "Internal Assessment",
      bond: "1 year",
      packageBreakdown: "Base Package: ₹4.00 LPA",
      resources: [
        "https://www.glassdoor.co.in/Interview/Rsquaresoft-Technologies-Interview-Questions-E2834612.htm"
      ]
    },
    {
      name: "Infosys",
      logoUrl: "https://www.google.com/s2/favicons?sz=128&domain=infosys.com",
      sector: "IT Services & Consulting",
      website: "https://infosys.com",
      status: "visited",
      campusVisitDate: "2024-09-15",
      ctc: "3.60 LPA",
      difficulty: "Easy-Medium",
      eligibilityCriteria: { minCGPA: 6.0, allowedBranches: ["CSE", "CSAIML", "IT", "ECE", "EEE", "Mechanical", "Civil"], backlogs: false },
      roles: ["Systems Engineer (SE)"],
      recruitmentRounds: [
        "Infosys Online Assessment (Aptitude, Pseudocode tracing, mathematical logic, and puzzle solving)",
        "Technical Interview (Projects defense, basic coding logic, OOPs, and SQL joins)",
        "HR Interview"
      ],
      aptitudePatterns: "Assessment: Mathematical ability, Logical reasoning, Verbal, Pseudocode tracing, and Puzzle solving.",
      interviewPatterns: "Technical: Project structure walkthrough and logic defense, writing basic array/string routines (reverse, bubble sort, palindrome), and simple SQL JOIN queries.",
      jdText: "Infosys is a global leader in next-generation digital services and consulting. Hires for the Systems Engineer role to build and support enterprise applications, cloud infrastructure, and databases.",
      prepTips: "Practice pseudocode tracing puzzles on sites like IndiaBIX.\nPrepare basic OOP definitions and code snippets in Java / Python.\nFocus on explaining your academic projects structure.",
      tags: ["mass-recruiter", "training-program", "global-it", "stable-career"],
      companyOverview: "Indian multinational IT services corporation founded in 1981. Over $18B+ in revenue. Features the legendary Mysuru training campus.",
      techStack: ["Java", "Python", "SQL", "Spring Boot", "Cloud Basics", "Angular", "React"],
      workCulture: "Structured operational hierarchy. Robust initial training, large cross-functional teams.",
      growthPath: "Systems Engineer → Senior SE → Technology Lead → Project Manager",
      interviewDifficulty: "Easy-Medium",
      bondDetails: "1-year training service agreement. Penalty: ₹50,000.",
      hiringMode: "On-Campus",
      testPlatform: "Infosys Assessment Platform",
      bond: "1 year",
      packageBreakdown: "Base Package: ₹3.60 LPA",
      resources: [
        "https://www.glassdoor.co.in/Interview/Infosys-Interview-Questions-E7924.htm"
      ]
    },
    {
      name: "Thinkloud",
      logoUrl: "https://www.google.com/s2/favicons?sz=128&domain=thinkloud.in",
      sector: "Cloud Consulting & DevOps",
      website: "https://thinkloud.in",
      status: "visited",
      campusVisitDate: "2024-12-05",
      ctc: "3.60 LPA",
      difficulty: "Easy-Medium",
      eligibilityCriteria: { minCGPA: 6.0, allowedBranches: ["CSE", "CSAIML", "IT", "ECE"], backlogs: false },
      roles: ["DevOps Trainee", "Cloud Support Engineer"],
      recruitmentRounds: [
        "Online Test (Linux commands, basic networking components, and basic aptitude)",
        "Technical Panel Interview (Docker containerization, Kubernetes configurations, Unix commands like chmod/grep, and Git pipelines)",
        "HR Interview"
      ],
      aptitudePatterns: "Written: Linux command outputs, HTTP status codes, basic server configurations, and standard reasoning.",
      interviewPatterns: "Linux: Commands (chmod, grep, awk, systemctl, netstat).\nDocker: Containerization lifecycle, write Dockerfiles, volume mappings, and network configs.\nCI/CD: Basic Git pipelines automation, commit/rebase differences.",
      jdText: "Thinkloud specializes in DevOps pipeline construction, cloud migrations, and managed cloud services. Hires freshers to build CI/CD pipelines, configure Kubernetes clusters, and automate cloud scripts.",
      prepTips: "Practice intermediate commands in Linux terminal.\nLearn how to Dockerize a simple React / Node application.\nUnderstand structural Git processes.",
      tags: ["cloud-native", "devops", "aws", "automation"],
      companyOverview: "Boutique cloud-native consulting firm offering AWS, GCP, and Azure cloud solutions and automation advisory.",
      techStack: ["AWS", "GCP", "Linux", "Docker", "Kubernetes", "Shell Scripting", "Python"],
      workCulture: "Cloud infrastructure-focused workspace. Encourages AWS/GCP certifications and active automation practices.",
      growthPath: "Cloud Associate → Cloud Engineer → Senior DevOps Engineer → Architect",
      interviewDifficulty: "Easy-Medium",
      bondDetails: "No service bond.",
      hiringMode: "On-Campus",
      testPlatform: "Internal Assessment",
      bond: "None",
      packageBreakdown: "Base Package: ₹3.60 LPA",
      resources: [
        "https://www.glassdoor.co.in/Interview/Thinkloud-Technologies-Interview-Questions-E2938471.htm"
      ]
    },
    {
      name: "Quantbit Technologies",
      logoUrl: "https://www.google.com/s2/favicons?sz=128&domain=quantbittech.com",
      sector: "ERP & Enterprise Integrations",
      website: "https://quantbittech.com",
      status: "visited",
      campusVisitDate: "2024-12-10",
      ctc: "3.00 LPA",
      difficulty: "Easy",
      eligibilityCriteria: { minCGPA: 6.0, allowedBranches: ["CSE", "CSAIML", "IT", "ECE", "EEE"], backlogs: true },
      roles: ["Associate Odoo/ERP Developer", "Software Support Analyst"],
      recruitmentRounds: [
        "Online Aptitude & Python basics quiz",
        "Technical Face-to-Face Interview (Python programming constructs, loops, lists, Odoo ERP architectures, and PostgreSQL schemas)",
        "HR Interview"
      ],
      aptitudePatterns: "Written Test: Python coding syntax (functions, variables, indentation, dictionaries), simple relational table schemas, and basic math.",
      interviewPatterns: "Python: Basic lists, dictionaries, loops, functions.\nDBMS: Database schemas, SELECT commands, indexing.\nHR: Interest in enterprise resource planning software, communication checks.",
      jdText: "Quantbit Technologies provides ERP implementation and customization services, specializing in ERP systems like Odoo and SAP. Hires freshers to develop custom modules in Python and configure SQL databases.",
      prepTips: "Practice fundamental Python exercises.\nLearn about the concept of ERP platforms and database models.\nRevise SQL table design.",
      tags: ["erp-systems", "python-development", "odoo", "enterprise"],
      companyOverview: "Fast-growing ERP implementation agency delivering customized digital transformation software to mid-sized manufacturing and retail firms.",
      techStack: ["Python", "Odoo ERP", "PostgreSQL", "HTML/CSS", "JavaScript", "Git"],
      workCulture: "Practical, project-centric startup atmosphere. Offers deep hands-on learning in enterprise ERP modules.",
      growthPath: "ERP Trainee → ERP Developer → Module Lead → Project Lead",
      interviewDifficulty: "Easy",
      bondDetails: "1-year service agreement. Penalty: ₹30,000.",
      hiringMode: "On-Campus",
      testPlatform: "Internal Assessment",
      bond: "1 year",
      packageBreakdown: "Base Package: ₹3.00 LPA",
      resources: [
        "https://www.glassdoor.co.in/Interview/Quantbit-Technologies-Interview-Questions-E2738411.htm"
      ]
    }
  ];

  await Company.insertMany(companies);
  console.log(`✅ ${companies.length} AIML recruiter companies seeded\n`);
}

seed()
  .then(() => {
    console.log("🌱 Seeding completed");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Seeding error:", err);
    process.exit(1);
  });