/**
 * seedAlumni.js — Seeds mock alumni for KIT's College of Engineering Kolhapur
 * Run this to quickly populate the Alumni tab for testing.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Alumni = require('../models/Alumni.model');
const { upsertDoc } = require('../utils/ragService');

const MOCK_ALUMNI = [
  {
    name: "Amit Deshmukh",
    email: "amit.deshmukh@gmail.com",
    batch: 2022,
    department: "CSE",
    company: "Google",
    role: "Software Engineer III",
    location: "Bengaluru, India",
    skills: ["Java", "Python", "Go", "Kubernetes", "System Design"],
    linkedinUrl: "https://www.linkedin.com/in/amit-deshmukh-kit",
    bio: "KIT Kolhapur CSE Alumnus. Working on Google Cloud infrastructure. Happy to mentor junior students on DSA and backend systems.",
    mentorshipAreas: ["Resume Review", "Mock Interview", "Job Referrals"],
    availableFor: "chat",
    isVerified: true,
    isOptedIn: true,
    source: "manual"
  },
  {
    name: "Snehal Patil",
    email: "snehal.patil@outlook.com",
    batch: 2021,
    department: "IT",
    company: "TCS",
    role: "Systems Engineer",
    location: "Pune, India",
    skills: ["React", "JavaScript", "CSS", "Node.js", "Redux"],
    linkedinUrl: "https://www.linkedin.com/in/snehal-patil-kit",
    bio: "IT graduate from Kolhapur Institute of Technology. 3+ years experience in front-end development at TCS Digital. Reach out for resume tips.",
    mentorshipAreas: ["Resume Review", "General Connect"],
    availableFor: "chat",
    isVerified: true,
    isOptedIn: true,
    source: "manual"
  },
  {
    name: "Rahul Kulkarni",
    email: "rahul.k@nvidia.com",
    batch: 2023,
    department: "AIML",
    company: "NVIDIA",
    role: "Deep Learning Engineer",
    location: "Bengaluru, India",
    skills: ["PyTorch", "Python", "TensorFlow", "C++", "CUDA"],
    linkedinUrl: "https://www.linkedin.com/in/rahul-kulkarni-kit",
    bio: "AIML graduate from KIT's College of Engineering. Building computer vision and LLM models at NVIDIA. Let's discuss AI/ML careers.",
    mentorshipAreas: ["Mock Interview", "Job Referrals"],
    availableFor: "chat",
    isVerified: true,
    isOptedIn: true,
    source: "manual"
  },
  {
    name: "Priyanka Jadhav",
    email: "priyanka.j@capgemini.com",
    batch: 2020,
    department: "ENTC",
    company: "Capgemini",
    role: "Senior Consultant",
    location: "Mumbai, India",
    skills: ["Embedded C", "IoT", "Microcontrollers", "RTOS"],
    linkedinUrl: "https://www.linkedin.com/in/priyanka-jadhav-kit",
    bio: "Electronics & Telecommunication graduate from KIT Kolhapur. Working on automotive software and IoT embedded systems.",
    mentorshipAreas: ["General Connect", "Mock Interview"],
    availableFor: "chat",
    isVerified: true,
    isOptedIn: true,
    source: "manual"
  },
  {
    name: "Aditya Shinde",
    email: "aditya.shinde@infosys.com",
    batch: 2022,
    department: "CSE",
    company: "Infosys",
    role: "Power Programmer",
    location: "Pune, India",
    skills: ["Java", "Spring Boot", "Angular", "AWS", "Docker"],
    linkedinUrl: "https://www.linkedin.com/in/aditya-shinde-kit",
    bio: "CSE batch of 2022. Working as a Power Programmer at Infosys. Specialized in full-stack Java development and cloud migration.",
    mentorshipAreas: ["Resume Review", "Job Referrals"],
    availableFor: "chat",
    isVerified: true,
    isOptedIn: true,
    source: "manual"
  },
  {
    name: "Siddharth Kamble",
    email: "siddharth.kamble@accenture.com",
    batch: 2021,
    department: "ME",
    company: "Accenture",
    role: "Business Analyst",
    location: "Pune, India",
    skills: ["SQL", "PowerBI", "Python", "Excel", "Data Analysis"],
    linkedinUrl: "https://www.linkedin.com/in/siddharth-kamble-kit",
    bio: "Mechanical Engineering graduate from KIT Kolhapur. Shifted from core engineering to tech consulting at Accenture. Happy to help others transition.",
    mentorshipAreas: ["General Connect", "Resume Review"],
    availableFor: "chat",
    isVerified: true,
    isOptedIn: true,
    source: "manual"
  }
];

async function seed() {
  try {
    const dbUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pragati';
    const localUri = 'mongodb://127.0.0.1:27017/pragati';

    console.log('[Seeder] Connecting to database...');
    try {
      await mongoose.connect(dbUri, { serverSelectionTimeoutMS: 5000 });
      console.log('[Seeder] Connected to MongoDB Atlas ✅');
    } catch {
      console.log('[Seeder] Fallback: Connected to Local MongoDB ✅');
      await mongoose.connect(localUri, { serverSelectionTimeoutMS: 5000 });
    }

    console.log('[Seeder] Deleting existing mock alumni...');
    await Alumni.deleteMany({ source: 'manual' });

    console.log('[Seeder] Seeding mock alumni & vectorizing for RAG...');
    for (const a of MOCK_ALUMNI) {
      const doc = await Alumni.create(a);
      const textToEmbed = `${doc.name} ${doc.department} batch ${doc.batch} ${doc.company} ${doc.role} ${(doc.skills || []).join(' ')} ${doc.bio}`;
      await upsertDoc('pragati_alumni', {
        _key: `alumni_${doc._id}`,
        type: 'alumni',
        name: doc.name,
        department: doc.department,
        batch: doc.batch,
        company: doc.company,
        role: doc.role,
        bio: doc.bio,
        skills: doc.skills,
      }, textToEmbed, '_key');
      console.log(` - Seeded ${doc.name} (${doc.company})`);
    }

    console.log('[Seeder] Seeding completed successfully 🎉');
  } catch (err) {
    console.error('[Seeder] Error seeding:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
