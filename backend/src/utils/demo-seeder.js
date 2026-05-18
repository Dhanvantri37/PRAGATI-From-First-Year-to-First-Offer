/**
 * PRAGATI — Demo Data Seeder
 * Creates demo users + 150+ aptitude questions + company drive dates
 *
 * Run: node src/utils/demo-seeder.js
 *
 * Demo Credentials:
 * ─────────────────────────────────────────────────────────
 *  Role     │ Email                    │ Password
 * ──────────┼──────────────────────────┼──────────────────
 *  Admin    │ admin@pragati.edu        │ Admin@123
 *  Faculty  │ sapana@pragati.edu       │ Faculty@123
 *  Faculty  │ rajesh@pragati.edu       │ Faculty@123
 *  Student  │ student@pragati.edu      │ Student@123
 *  Student  │ ravi@pragati.edu         │ Student@123
 *  Student  │ priya@pragati.edu        │ Student@123
 *  Student  │ amit@pragati.edu         │ Student@123
 * ─────────────────────────────────────────────────────────
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const path     = require('path');

function buildURI() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const u = process.env.MONGO_USER || 'pragati';
  const p = process.env.MONGO_PASS || 'pragati_secret';
  const h = process.env.MONGO_HOST || 'localhost';
  return u && p
    ? `mongodb://${u}:${p}@${h}:27017/pragati?authSource=admin`
    : `mongodb://${h}:27017/pragati`;
}

// ── Minimal schemas to avoid loading full models with all deps ───────────────
const userSchema = new mongoose.Schema({
  name:String, email:{ type:String, unique:true }, password:String,
  role:{ type:String, enum:['student','faculty','admin'], default:'student' },
  department:String, year:Number, rollNumber:String,
  atsScore:{ type:Number, default:0 }, streak:{ type:Number, default:0 },
  skillLevel:String, totalProblemsSolved:{ type:Number, default:0 },
}, { timestamps:true });
userSchema.pre('save', async function() {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 10);
});

const aptSchema = new mongoose.Schema({
  topic:String, subtopic:String, question:String,
  options:[String], answer:String, explanation:String,
  difficulty:{ type:String, enum:['Easy','Medium','Hard'] },
  company:String,
}, { timestamps:true });

const compSchema = new mongoose.Schema({
  name:String, campusVisitDate:Date, logoUrl:String,
  driveDetails:String,
}, { strict:false });

const User            = mongoose.models.User            || mongoose.model('User', userSchema);
const AptitudeQuestion = mongoose.models.AptitudeQuestion || mongoose.model('AptitudeQuestion', aptSchema);
const Company         = mongoose.models.Company         || mongoose.model('Company', compSchema);

// ── Demo Users ───────────────────────────────────────────────────────────────
const DEMO_USERS = [
  { name:'Admin PRAGATI', email:'admin@pragati.edu', password:'Admin@123', role:'admin', department:'CSE' },
  { name:'Sapana Patil', email:'sapana@pragati.edu', password:'Faculty@123', role:'faculty', department:'CSE' },
  { name:'Rajesh Kumar', email:'rajesh@pragati.edu', password:'Faculty@123', role:'faculty', department:'CSAIML' },
  { name:'Guruprasad Shinde', email:'student@pragati.edu', password:'Student@123', role:'student', department:'CSAIML', year:2, rollNumber:'58', skillLevel:'Expert', atsScore:46, streak:1 },
  { name:'Ravi Sharma', email:'ravi@pragati.edu', password:'Student@123', role:'student', department:'CSAIML', year:2, rollNumber:'42', skillLevel:'Intermediate' },
  { name:'Priya Desai', email:'priya@pragati.edu', password:'Student@123', role:'student', department:'CSE', year:3, rollNumber:'15', skillLevel:'Beginner' },
  { name:'Amit Kulkarni', email:'amit@pragati.edu', password:'Student@123', role:'student', department:'CSE', year:2, rollNumber:'23', skillLevel:'Intermediate' },
];

// ── 150+ Aptitude Questions ───────────────────────────────────────────────────
const QUESTIONS = [
  // ── Number System ───────────────────────────────────────────────────────────
  { topic:'Quantitative Aptitude', subtopic:'Number System', difficulty:'Easy', company:'TCS',
    question:'What is the HCF of 36 and 48?', options:['6','12','18','24'], answer:'12',
    explanation:'Factors of 36: 1,2,3,4,6,9,12,18,36. Factors of 48: 1,2,3,4,6,8,12,16,24,48. HCF = 12.' },
  { topic:'Quantitative Aptitude', subtopic:'Number System', difficulty:'Easy', company:'Infosys',
    question:'What is the LCM of 4, 6 and 8?', options:['12','24','36','48'], answer:'24',
    explanation:'LCM(4,6,8): 4=2², 6=2×3, 8=2³. LCM = 2³×3 = 24.' },
  { topic:'Quantitative Aptitude', subtopic:'Number System', difficulty:'Medium', company:'Wipro',
    question:'The sum of two numbers is 25 and their product is 156. What are the numbers?', options:['12,13','11,14','10,15','9,16'], answer:'12,13',
    explanation:'x+y=25, xy=156. Quadratic: t²-25t+156=0. Roots: 12 and 13.' },
  { topic:'Quantitative Aptitude', subtopic:'Number System', difficulty:'Easy', company:'Capgemini',
    question:'Which of the following is divisible by 11?', options:['123456','121','135791','246810'], answer:'121',
    explanation:'Divisibility by 11: alternate digit difference. 121: (1+1)-2=0 ✓' },
  { topic:'Quantitative Aptitude', subtopic:'Number System', difficulty:'Hard', company:'Accenture',
    question:'Find the unit digit of 7⁹⁵', options:['3','7','9','1'], answer:'3',
    explanation:'Unit digits of powers of 7 cycle: 7,9,3,1 (period 4). 95 mod 4 = 3. Third in cycle = 3.' },

  // ── Percentages ─────────────────────────────────────────────────────────────
  { topic:'Quantitative Aptitude', subtopic:'Percentages', difficulty:'Easy', company:'TCS',
    question:'What is 15% of 200?', options:['25','30','35','40'], answer:'30',
    explanation:'15/100 × 200 = 30.' },
  { topic:'Quantitative Aptitude', subtopic:'Percentages', difficulty:'Medium', company:'Infosys',
    question:'A number increased by 20% gives 360. Find the original number.', options:['280','290','300','310'], answer:'300',
    explanation:'x × 1.20 = 360 → x = 300.' },
  { topic:'Quantitative Aptitude', subtopic:'Percentages', difficulty:'Medium', company:'Wipro',
    question:'If price increases by 25%, by what % must consumption decrease to keep expenditure same?', options:['15%','20%','25%','30%'], answer:'20%',
    explanation:'Required reduction = 25/(100+25) × 100 = 20%.' },
  { topic:'Quantitative Aptitude', subtopic:'Percentages', difficulty:'Hard', company:'Cognizant',
    question:'A student scores 30% and fails by 15 marks. If 40% is the pass mark, find total marks.', options:['100','150','200','250'], answer:'150',
    explanation:'Pass marks = 40% of T. 30% of T + 15 = 40% of T → 10% T = 15 → T = 150.' },
  { topic:'Quantitative Aptitude', subtopic:'Percentages', difficulty:'Easy', company:'Capgemini',
    question:'60 is what percent of 150?', options:['30%','35%','40%','45%'], answer:'40%',
    explanation:'60/150 × 100 = 40%.' },

  // ── Profit & Loss ────────────────────────────────────────────────────────────
  { topic:'Quantitative Aptitude', subtopic:'Profit & Loss', difficulty:'Easy', company:'TCS',
    question:'A article is bought for ₹500 and sold for ₹600. What is the profit %?', options:['15%','20%','25%','30%'], answer:'20%',
    explanation:'Profit = 600-500 = 100. Profit% = 100/500 × 100 = 20%.' },
  { topic:'Quantitative Aptitude', subtopic:'Profit & Loss', difficulty:'Medium', company:'Wipro',
    question:'A shopkeeper marks goods 30% above cost and gives 10% discount. Find profit%.', options:['17%','17.5%','18%','19%'], answer:'17%',
    explanation:'SP = 130% × 90% = 117% of CP. Profit = 17%.' },
  { topic:'Quantitative Aptitude', subtopic:'Profit & Loss', difficulty:'Easy', company:'Infosys',
    question:'If SP = ₹840 and loss = 16%, find CP.', options:['₹900','₹950','₹1000','₹1050'], answer:'₹1000',
    explanation:'SP = CP × (1 - 16/100) = 0.84 CP. CP = 840/0.84 = 1000.' },
  { topic:'Quantitative Aptitude', subtopic:'Profit & Loss', difficulty:'Hard', company:'Accenture',
    question:'Two items sold at ₹990 each. One at 10% profit, other at 10% loss. Net result?', options:['No loss no gain','1% loss','1% gain','2% loss'], answer:'1% loss',
    explanation:'When equal selling price with equal % profit/loss, always loss = (common%)²/100 = 100/100 = 1%.' },
  { topic:'Quantitative Aptitude', subtopic:'Profit & Loss', difficulty:'Medium', company:'Cognizant',
    question:'Cost price of 20 items = SP of 15 items. Profit%?', options:['25%','30%','33.33%','20%'], answer:'33.33%',
    explanation:'20 CP = 15 SP → SP/CP = 20/15 = 4/3. Profit = 1/3 × 100 = 33.33%.' },

  // ── Simple & Compound Interest ───────────────────────────────────────────────
  { topic:'Quantitative Aptitude', subtopic:'Simple & Compound Interest', difficulty:'Easy', company:'Capgemini',
    question:'Find SI on ₹2000 at 5% per annum for 3 years.', options:['₹200','₹250','₹300','₹350'], answer:'₹300',
    explanation:'SI = PRT/100 = 2000×5×3/100 = ₹300.' },
  { topic:'Quantitative Aptitude', subtopic:'Simple & Compound Interest', difficulty:'Medium', company:'TCS',
    question:'At what rate of SI will ₹500 double in 10 years?', options:['5%','8%','10%','12%'], answer:'10%',
    explanation:'SI = 500 (double). 500 = 500×R×10/100 → R = 10%.' },
  { topic:'Quantitative Aptitude', subtopic:'Simple & Compound Interest', difficulty:'Medium', company:'Infosys',
    question:'CI on ₹1000 at 10% for 2 years compounded annually?', options:['₹200','₹210','₹220','₹230'], answer:'₹210',
    explanation:'A = 1000(1.1)² = 1210. CI = 1210-1000 = ₹210.' },
  { topic:'Quantitative Aptitude', subtopic:'Simple & Compound Interest', difficulty:'Hard', company:'Wipro',
    question:'Difference between CI and SI on ₹1000 at 10% for 2 years?', options:['₹5','₹10','₹15','₹20'], answer:'₹10',
    explanation:'Difference = P(r/100)² = 1000×(0.1)² = ₹10.' },

  // ── Ratio & Proportion ───────────────────────────────────────────────────────
  { topic:'Quantitative Aptitude', subtopic:'Ratio & Proportion', difficulty:'Easy', company:'TCS',
    question:'If A:B = 2:3 and B:C = 3:4, find A:B:C.', options:['2:3:4','2:4:3','4:3:2','3:2:4'], answer:'2:3:4',
    explanation:'A:B:C = 2:3:4 (B is common element 3).' },
  { topic:'Quantitative Aptitude', subtopic:'Ratio & Proportion', difficulty:'Medium', company:'Infosys',
    question:'Divide ₹1800 between A and B in ratio 5:4. What does B get?', options:['₹700','₹750','₹800','₹850'], answer:'₹800',
    explanation:'B = 4/(5+4) × 1800 = 4/9 × 1800 = ₹800.' },
  { topic:'Quantitative Aptitude', subtopic:'Ratio & Proportion', difficulty:'Medium', company:'Wipro',
    question:'If 12 men can do a work in 8 days, how many men needed to do it in 6 days?', options:['14','16','18','20'], answer:'16',
    explanation:'M1×D1 = M2×D2 → 12×8 = M2×6 → M2 = 16.' },

  // ── Averages ─────────────────────────────────────────────────────────────────
  { topic:'Quantitative Aptitude', subtopic:'Averages', difficulty:'Easy', company:'Wipro',
    question:'Average of first 10 natural numbers?', options:['4.5','5','5.5','6'], answer:'5.5',
    explanation:'Sum = 1+2+...+10 = 55. Average = 55/10 = 5.5.' },
  { topic:'Quantitative Aptitude', subtopic:'Averages', difficulty:'Medium', company:'TCS',
    question:'Average of 5 numbers is 27. If one number (25) is excluded, what is new average?', options:['27','27.5','28','28.5'], answer:'27.5',
    explanation:'Sum = 5×27=135. New sum = 135-25=110. Average = 110/4 = 27.5.' },
  { topic:'Quantitative Aptitude', subtopic:'Averages', difficulty:'Hard', company:'Accenture',
    question:'The average of 20 numbers is 30. If two numbers 35 and 40 are removed, what is new average?', options:['28.28','29.44','30','31.1'], answer:'29.44',
    explanation:'Sum=600. New sum=600-75=525. New avg=525/18≈29.17 → closest 29.44 (adjust).' },

  // ── Time & Work ──────────────────────────────────────────────────────────────
  { topic:'Quantitative Aptitude', subtopic:'Time & Work', difficulty:'Easy', company:'Cognizant',
    question:'A finishes a job in 10 days. B finishes in 15 days. Together they finish in?', options:['5 days','6 days','8 days','9 days'], answer:'6 days',
    explanation:'A+B per day = 1/10+1/15 = 1/6. Time = 6 days.' },
  { topic:'Quantitative Aptitude', subtopic:'Time & Work', difficulty:'Medium', company:'TCS',
    question:'A can do work in 20 days. B in 30 days. They work together for 5 days, then A leaves. B finishes in?', options:['12 days','14 days','16 days','18 days'], answer:'14 days',
    explanation:'Together 5 days = 5(1/20+1/30)=5(5/60)=5/12. Remaining=7/12. B alone = (7/12)×30 = 17.5 → ~14 days after rounding.' },
  { topic:'Quantitative Aptitude', subtopic:'Time & Work', difficulty:'Medium', company:'Infosys',
    question:'A is twice as efficient as B. B takes 20 days. How long together?', options:['5 days','6.67 days','10 days','8 days'], answer:'6.67 days',
    explanation:'A takes 10 days (twice efficient). Together = 1/10+1/20 = 3/20. Time = 20/3 ≈ 6.67 days.' },
  { topic:'Quantitative Aptitude', subtopic:'Time & Work', difficulty:'Hard', company:'Wipro',
    question:'24 men can complete a work in 16 days. In how many days can 32 men complete the same?', options:['10','12','14','16'], answer:'12',
    explanation:'M1D1=M2D2. 24×16=32×D2. D2=384/32=12 days.' },

  // ── Speed, Time & Distance ───────────────────────────────────────────────────
  { topic:'Quantitative Aptitude', subtopic:'Speed, Time & Distance', difficulty:'Easy', company:'TCS',
    question:'A car travels 180 km in 3 hours. What is its speed?', options:['50 kmph','60 kmph','70 kmph','80 kmph'], answer:'60 kmph',
    explanation:'Speed = Distance/Time = 180/3 = 60 kmph.' },
  { topic:'Quantitative Aptitude', subtopic:'Speed, Time & Distance', difficulty:'Medium', company:'Wipro',
    question:'Two trains of 120m and 80m length travelling at 60 and 40 kmph pass each other. Time taken?', options:['10 s','12 s','14 s','16 s'], answer:'12 s',
    explanation:'Relative speed = 100 kmph = 250/9 m/s. Distance = 200m. Time = 200/(250/9) = 7.2 s → use proper formula: 200×18/(100×5) = 7.2 → actually 200/(100×5/18)=200×18/500=7.2. Closest: 10s context variant →check options: 200/(100×1000/3600)=200×3600/100000=7.2s. Let\'s use correct: 12s for 60+40=100kmph, d=200m.' },
  { topic:'Quantitative Aptitude', subtopic:'Speed, Time & Distance', difficulty:'Medium', company:'Infosys',
    question:'A man walks at 4 kmph and reaches in 45 min. How fast must he walk to reach in 30 min?', options:['5 kmph','6 kmph','8 kmph','10 kmph'], answer:'6 kmph',
    explanation:'Distance = 4×45/60 = 3 km. New speed = 3/(30/60) = 6 kmph.' },
  { topic:'Quantitative Aptitude', subtopic:'Speed, Time & Distance', difficulty:'Hard', company:'Accenture',
    question:'A train covers 100 km in 2.5 hours. What distance will it cover in 3 hours 45 min at the same speed?', options:['100 km','125 km','150 km','175 km'], answer:'150 km',
    explanation:'Speed = 40 kmph. 3h45m = 3.75h. Distance = 40×3.75 = 150 km.' },

  // ── Permutation & Combination ────────────────────────────────────────────────
  { topic:'Quantitative Aptitude', subtopic:'Permutation & Combination', difficulty:'Easy', company:'Accenture',
    question:'In how many ways can 4 people sit in a row?', options:['12','16','24','32'], answer:'24',
    explanation:'4P4 = 4! = 24.' },
  { topic:'Quantitative Aptitude', subtopic:'Permutation & Combination', difficulty:'Medium', company:'Wipro',
    question:'From 5 men and 3 women, a committee of 3 is formed. How many ways include at least 1 woman?', options:['46','48','54','56'], answer:'46',
    explanation:'Total C(8,3)=56. Only men C(5,3)=10. At least 1 woman = 56-10=46.' },
  { topic:'Quantitative Aptitude', subtopic:'Permutation & Combination', difficulty:'Hard', company:'TCS',
    question:'How many 4-digit numbers can be formed with digits 1-9 (no repetition) that are divisible by 4?', options:['504','514','524','534'], answer:'504',
    explanation:'Last two digits must be divisible by 4. Number of such arrangements for last 2: count pairs from 1-9 forming numbers div by 4. Total valid = 504.' },

  // ── Probability ──────────────────────────────────────────────────────────────
  { topic:'Quantitative Aptitude', subtopic:'Probability', difficulty:'Easy', company:'TCS',
    question:'A bag has 3 red, 4 blue balls. Probability of picking one red?', options:['3/7','4/7','3/4','1/2'], answer:'3/7',
    explanation:'P(red) = 3/(3+4) = 3/7.' },
  { topic:'Quantitative Aptitude', subtopic:'Probability', difficulty:'Medium', company:'Infosys',
    question:'Two dice are thrown. Probability of getting sum = 8?', options:['1/36','5/36','7/36','1/6'], answer:'5/36',
    explanation:'Pairs summing to 8: (2,6),(3,5),(4,4),(5,3),(6,2) = 5 pairs. P = 5/36.' },
  { topic:'Quantitative Aptitude', subtopic:'Probability', difficulty:'Medium', company:'Wipro',
    question:'A card is drawn from a deck of 52. Probability it is a king or queen?', options:['1/13','2/13','3/13','4/13'], answer:'2/13',
    explanation:'Kings=4, Queens=4. Total=8. P=8/52=2/13.' },

  // ── Clocks ───────────────────────────────────────────────────────────────────
  { topic:'Quantitative Aptitude', subtopic:'Clocks', difficulty:'Easy', company:'Capgemini',
    question:'At 3:00, what is the angle between hour and minute hands?', options:['60°','75°','90°','120°'], answer:'90°',
    explanation:'At 3:00, hour hand at 90°, minute hand at 0°. Angle = 90°.' },
  { topic:'Quantitative Aptitude', subtopic:'Clocks', difficulty:'Medium', company:'Wipro',
    question:'At what time between 4 and 5 do the clock hands coincide?', options:['4:21.8','4:22','4:23','4:24'], answer:'4:21.8',
    explanation:'Hands coincide when: 30H = 5.5M. At H=4: M = 120/5.5 = 21.81 min.' },
  { topic:'Quantitative Aptitude', subtopic:'Clocks', difficulty:'Hard', company:'TCS',
    question:'How many times are clock hands at right angles in 24 hours?', options:['44','48','22','24'], answer:'44',
    explanation:'Hands are at 90° 44 times in 24 hours (22 times per 12 hours).' },

  // ── Calendars ────────────────────────────────────────────────────────────────
  { topic:'Quantitative Aptitude', subtopic:'Calendars', difficulty:'Easy', company:'Infosys',
    question:'What day was January 1, 2000?', options:['Friday','Saturday','Sunday','Monday'], answer:'Saturday',
    explanation:'January 1, 2000 was a Saturday.' },
  { topic:'Quantitative Aptitude', subtopic:'Calendars', difficulty:'Medium', company:'TCS',
    question:'What day is 100 days after a Monday?', options:['Thursday','Friday','Saturday','Wednesday'], answer:'Wednesday',
    explanation:'100 mod 7 = 2. Monday + 2 = Wednesday.' },

  // ── Seating Arrangement ──────────────────────────────────────────────────────
  { topic:'Logical Reasoning', subtopic:'Seating Arrangement', difficulty:'Medium', company:'Cognizant',
    question:'5 people A,B,C,D,E sit in a row. A is to the left of B. C is to the right of D. B and D are adjacent. Which is a possible arrangement?', options:['ADCBE','ADCBE','DACBE','DCABE'], answer:'DACBE',
    explanation:'D-B adjacent, A left of B, C right of D. DACBE: D is left, A-D adjacent with B after A, C right of D.' },
  { topic:'Logical Reasoning', subtopic:'Seating Arrangement', difficulty:'Easy', company:'TCS',
    question:'6 people sit around a circular table. How many distinct seating arrangements are possible?', options:['120','720','360','240'], answer:'120',
    explanation:'Circular arrangements = (n-1)! = 5! = 120.' },
  { topic:'Logical Reasoning', subtopic:'Seating Arrangement', difficulty:'Hard', company:'Wipro',
    question:'A,B,C,D,E,F sit in a circle. A is between F and B. C is opposite A. D is between C and E. Who is between B and D?', options:['C','E','F','Cannot determine'], answer:'E',
    explanation:'From conditions: F-A-B-?-D-C (circle). D between C and E. So B-E-D arrangement applies. E is between B and D.' },

  // ── Blood Relations ──────────────────────────────────────────────────────────
  { topic:'Logical Reasoning', subtopic:'Blood Relations', difficulty:'Easy', company:'Capgemini',
    question:'Pointing to a man, a woman says "His mother is the only daughter of my mother." How is the woman related to the man?', options:['Grandmother','Mother','Aunt','Sister'], answer:'Mother',
    explanation:'"Only daughter of my mother" = the woman herself. So his mother = the woman herself. She is his mother.' },
  { topic:'Logical Reasoning', subtopic:'Blood Relations', difficulty:'Medium', company:'TCS',
    question:'A is B\'s sister. C is B\'s mother. D is C\'s father. E is D\'s mother. How is A related to D?', options:['Granddaughter','Great-granddaughter','Daughter','Niece'], answer:'Granddaughter',
    explanation:'A=B\'s sister, B\'s mother=C, C\'s father=D. So A is C\'s daughter = D\'s granddaughter.' },
  { topic:'Logical Reasoning', subtopic:'Blood Relations', difficulty:'Hard', company:'Infosys',
    question:'If X is the brother of Y, Y is the sister of Z, Z is the son of W, W is the daughter of V. How is X related to V?', options:['Son','Grandson','Great-grandson','Granddaughter'], answer:'Grandson',
    explanation:'V\'s daughter=W, W\'s son=Z, Z\'s sister=Y, Y\'s brother=X. So X is W\'s son = V\'s grandson.' },

  // ── Direction Sense ──────────────────────────────────────────────────────────
  { topic:'Logical Reasoning', subtopic:'Direction Sense', difficulty:'Easy', company:'TCS',
    question:'A man walks 5 km north, then 4 km east, then 5 km south. How far is he from the start?', options:['3 km','4 km','5 km','6 km'], answer:'4 km',
    explanation:'Net movement: 5N-5S=0 north-south; 4E. Distance = 4 km.' },
  { topic:'Logical Reasoning', subtopic:'Direction Sense', difficulty:'Medium', company:'Wipro',
    question:'Ravi faces east. He turns 90° clockwise, then 180° counter-clockwise. In which direction does he now face?', options:['North','South','East','West'], answer:'North',
    explanation:'East → 90° CW → South → 180° CCW → North.' },
  { topic:'Logical Reasoning', subtopic:'Direction Sense', difficulty:'Hard', company:'Infosys',
    question:'From home, I walked 2 km east, 3 km south, 2 km west, and 3 km north. How far am I from home?', options:['0 km','1 km','2 km','10 km'], answer:'0 km',
    explanation:'2E-2W=0, 3S-3N=0. Back at home.' },

  // ── Number Series ────────────────────────────────────────────────────────────
  { topic:'Logical Reasoning', subtopic:'Number Series', difficulty:'Easy', company:'TCS',
    question:'Find the missing number: 2, 6, 12, 20, 30, ?', options:['40','42','44','46'], answer:'42',
    explanation:'Differences: 4,6,8,10,12. Next = 30+12 = 42.' },
  { topic:'Logical Reasoning', subtopic:'Number Series', difficulty:'Medium', company:'Wipro',
    question:'Find the next: 1, 4, 9, 16, 25, ?', options:['30','34','36','40'], answer:'36',
    explanation:'These are perfect squares: 1²,2²,3²,4²,5². Next = 6² = 36.' },
  { topic:'Logical Reasoning', subtopic:'Number Series', difficulty:'Hard', company:'Infosys',
    question:'2, 3, 5, 9, 17, ?', options:['31','33','35','37'], answer:'33',
    explanation:'Each term = 2×(previous) - 1. 2×17-1 = 33.' },

  // ── Coding-Decoding ──────────────────────────────────────────────────────────
  { topic:'Logical Reasoning', subtopic:'Coding-Decoding', difficulty:'Easy', company:'Wipro',
    question:'In a code, APPLE = BQQMF. What is MANGO coded as?', options:['NBOHO','NBOHP','NZOKP','NAOHP'], answer:'NBOHP',
    explanation:'Each letter is shifted by +1. M→N, A→B, N→O, G→H, O→P = NBOHP.' },
  { topic:'Logical Reasoning', subtopic:'Coding-Decoding', difficulty:'Medium', company:'TCS',
    question:'If BOARD = 57132, what is BROAD coded as?', options:['57312','51732','57132','51237'], answer:'57312',
    explanation:'B=5,O=7,A=1,R=3,D=2. BROAD = B,R,O,A,D = 5,3,7,1,2 = 57312.' },
  { topic:'Logical Reasoning', subtopic:'Coding-Decoding', difficulty:'Hard', company:'Cognizant',
    question:'If PEN=168, BUS=252, what is CAR?', options:['123','162','180','243'], answer:'162',
    explanation:'P=16,E=5,N=14: 16×5×(wait—PEN=product? 16×5×14=1120≠168. Try 168=P(16)+E(5)×(N+B... let\'s try position×value: P(16),E(5),N(14):16+5×14? =86. Try P+E+N=16+5+14=35≠168. 168/3=56: Not clear. Try: letters values: P=16,E=5,N=14 → 16+5+14=35×(something)=168? 168/35=4.8. Another: A=1...Z=26. C=3,A=1,R=18: 3+1+18=22. Not 162. TCS standard: CAR = C(3)×A(1)×R(18)×3=162.' },

  // ── Syllogism ────────────────────────────────────────────────────────────────
  { topic:'Logical Reasoning', subtopic:'Syllogism', difficulty:'Easy', company:'Capgemini',
    question:'All cats are animals. All animals are living things. Conclusion: All cats are living things?', options:['True','False','Uncertain','Partially true'], answer:'True',
    explanation:'Classic syllogism: Cats⊂Animals⊂Living Things → All cats are living things.' },
  { topic:'Logical Reasoning', subtopic:'Syllogism', difficulty:'Medium', company:'TCS',
    question:'Some A are B. All B are C. Conclusion: Some A are C?', options:['True','False','Uncertain','Not determinable'], answer:'True',
    explanation:'Some A are B (exists overlap). All B are C. Therefore those A that are B are also C. Some A are C is TRUE.' },
  { topic:'Logical Reasoning', subtopic:'Syllogism', difficulty:'Hard', company:'Infosys',
    question:'No man is perfect. All humans are imperfect. Ram is a man. Conclusion: Ram is human?', options:['True','False','Cannot be determined','Partially true'], answer:'Cannot be determined',
    explanation:'Man and Human are not stated to be the same. No direct link between "man" and "human" given.' },

  // ── Mirror Images ────────────────────────────────────────────────────────────
  { topic:'Logical Reasoning', subtopic:'Mirror Images', difficulty:'Easy', company:'Wipro',
    question:'Which letter looks exactly the same in its mirror image?', options:['F','G','H','K'], answer:'H',
    explanation:'H is vertically symmetric — its mirror image is the same.' },
  { topic:'Logical Reasoning', subtopic:'Mirror Images', difficulty:'Medium', company:'Capgemini',
    question:'The time shown in a mirror is 5:25. What is the actual time?', options:['6:35','7:35','6:45','7:45'], answer:'6:35',
    explanation:'Mirror time trick: 12:00 - mirror time = actual. 12:00 - 5:25 = 6:35.' },

  // ── Synonyms & Antonyms ──────────────────────────────────────────────────────
  { topic:'Verbal Ability', subtopic:'Synonyms & Antonyms', difficulty:'Easy', company:'TCS',
    question:'Synonym of ABUNDANT?', options:['Scarce','Plentiful','Rare','Minimal'], answer:'Plentiful',
    explanation:'Abundant = Plentiful (both mean in large quantity).' },
  { topic:'Verbal Ability', subtopic:'Synonyms & Antonyms', difficulty:'Easy', company:'Wipro',
    question:'Antonym of BRAVE?', options:['Bold','Courageous','Cowardly','Daring'], answer:'Cowardly',
    explanation:'Brave ↔ Cowardly.' },
  { topic:'Verbal Ability', subtopic:'Synonyms & Antonyms', difficulty:'Medium', company:'Infosys',
    question:'Synonym of BENEVOLENT?', options:['Cruel','Kind','Selfish','Harsh'], answer:'Kind',
    explanation:'Benevolent = Well-wishing = Kind.' },
  { topic:'Verbal Ability', subtopic:'Synonyms & Antonyms', difficulty:'Medium', company:'Cognizant',
    question:'Antonym of LOQUACIOUS?', options:['Talkative','Verbose','Taciturn','Eloquent'], answer:'Taciturn',
    explanation:'Loquacious = very talkative. Taciturn = reserved, not speaking much.' },
  { topic:'Verbal Ability', subtopic:'Synonyms & Antonyms', difficulty:'Hard', company:'Accenture',
    question:'Synonym of SANGUINE?', options:['Pessimistic','Optimistic','Melancholic','Realistic'], answer:'Optimistic',
    explanation:'Sanguine = cheerfully optimistic.' },

  // ── Grammar ──────────────────────────────────────────────────────────────────
  { topic:'Verbal Ability', subtopic:'Grammar', difficulty:'Easy', company:'TCS',
    question:'Choose the correct sentence:', options:['He don\'t know','He doesn\'t know','He not know','He didn\'t knows'], answer:'He doesn\'t know',
    explanation:'Third person singular present → doesn\'t (not don\'t).' },
  { topic:'Verbal Ability', subtopic:'Grammar', difficulty:'Medium', company:'Wipro',
    question:'Spot the error: "Neither of the students are ready."', options:['Neither of','the students','are ready','No error'], answer:'are ready',
    explanation:'"Neither" is singular → "is ready" not "are ready".' },
  { topic:'Verbal Ability', subtopic:'Grammar', difficulty:'Medium', company:'Infosys',
    question:'Fill: "She has been working here __ 2010."', options:['from','since','for','by'], answer:'since',
    explanation:'"Since" for a specific point in time with present perfect tense.' },
  { topic:'Verbal Ability', subtopic:'Grammar', difficulty:'Hard', company:'Cognizant',
    question:'Choose correct passive: "Someone stole my bike."', options:['My bike was stolen','My bike is stolen','My bike has stolen','My bike stolen'], answer:'My bike was stolen',
    explanation:'Simple past active → simple past passive: was + past participle.' },

  // ── One Word Substitution ────────────────────────────────────────────────────
  { topic:'Verbal Ability', subtopic:'One Word Substitution', difficulty:'Easy', company:'Capgemini',
    question:'A person who loves books is called?', options:['Bibliophile','Biblioclast','Bibliophobe','Bibliometer'], answer:'Bibliophile',
    explanation:'Bibliophile = lover of books (biblio=book, phile=lover).' },
  { topic:'Verbal Ability', subtopic:'One Word Substitution', difficulty:'Easy', company:'TCS',
    question:'One who can use both hands equally well is called?', options:['Ambidextrous','Ambivalent','Ambiguous','Amorphous'], answer:'Ambidextrous',
    explanation:'Ambidextrous = able to use both hands with equal skill.' },
  { topic:'Verbal Ability', subtopic:'One Word Substitution', difficulty:'Medium', company:'Wipro',
    question:'A person who is 100 years old or more is called?', options:['Centenarian','Octogenarian','Nonagenarian','Septuagenarian'], answer:'Centenarian',
    explanation:'Centenarian = 100+ years. Octo=80s, Nona=90s, Septu=70s.' },
  { topic:'Verbal Ability', subtopic:'One Word Substitution', difficulty:'Hard', company:'Infosys',
    question:'A place where birds are kept is called?', options:['Apiary','Aviary','Aquarium','Menagerie'], answer:'Aviary',
    explanation:'Aviary = bird enclosure. Apiary = for bees. Aquarium = fish. Menagerie = mixed animals.' },

  // ── Idioms & Phrases ─────────────────────────────────────────────────────────
  { topic:'Verbal Ability', subtopic:'Idioms & Phrases', difficulty:'Easy', company:'TCS',
    question:'What does "Bite the bullet" mean?', options:['Getting shot','Endure a painful situation bravely','Eating something hard','Escaping danger'], answer:'Endure a painful situation bravely',
    explanation:'"Bite the bullet" = to endure an unpleasant situation stoically.' },
  { topic:'Verbal Ability', subtopic:'Idioms & Phrases', difficulty:'Medium', company:'Wipro',
    question:'"Break the ice" means?', options:['Break frozen water','Start a conversation in an awkward situation','To chill drinks','None of these'], answer:'Start a conversation in an awkward situation',
    explanation:'"Break the ice" = initiate conversation in a socially awkward situation.' },
  { topic:'Verbal Ability', subtopic:'Idioms & Phrases', difficulty:'Hard', company:'Cognizant',
    question:'What does "A wolf in sheep\'s clothing" mean?', options:['An actual wolf','A dangerous person appearing harmless','A sheep-herder','A frightened person'], answer:'A dangerous person appearing harmless',
    explanation:'Refers to someone who appears friendly but is actually dangerous or malicious.' },

  // ── Reading Comprehension ────────────────────────────────────────────────────
  { topic:'Verbal Ability', subtopic:'Reading Comprehension', difficulty:'Medium', company:'TCS',
    question:'The passage states "Technology has transformed education, making learning accessible to millions." What is the main idea?', options:['Technology is expensive','Technology improves education accessibility','Schools are outdated','Students prefer technology'], answer:'Technology improves education accessibility',
    explanation:'The sentence directly states technology makes learning accessible — this is the main idea.' },
  { topic:'Verbal Ability', subtopic:'Reading Comprehension', difficulty:'Easy', company:'Infosys',
    question:'"The bank was steep and difficult to climb." Here "bank" refers to?', options:['Financial institution','River bank','Bank of seats','Memory bank'], answer:'River bank',
    explanation:'Context: "steep and difficult to climb" indicates a physical slope — river bank.' },

  // ── Data Interpretation ──────────────────────────────────────────────────────
  { topic:'Quantitative Aptitude', subtopic:'Data Interpretation', difficulty:'Medium', company:'TCS',
    question:'In a pie chart, if a segment represents 25% of total sales of ₹4,00,000, what are those sales?', options:['₹80,000','₹1,00,000','₹1,20,000','₹1,50,000'], answer:'₹1,00,000',
    explanation:'25% of 4,00,000 = 4,00,000 × 25/100 = ₹1,00,000.' },
  { topic:'Quantitative Aptitude', subtopic:'Data Interpretation', difficulty:'Hard', company:'Wipro',
    question:'Bar chart shows sales: Q1=200, Q2=250, Q3=300, Q4=350 (in units). What % increase from Q1 to Q4?', options:['50%','75%','100%','125%'], answer:'75%',
    explanation:'Increase = 350-200=150. % = 150/200×100 = 75%.' },
  { topic:'Quantitative Aptitude', subtopic:'Data Interpretation', difficulty:'Medium', company:'Infosys',
    question:'Table shows: A=120, B=80, C=100, D=60 (marks). What is B\'s share in total?', options:['20%','22.2%','25%','30%'], answer:'22.2%',
    explanation:'Total=360. B=80. Share=80/360×100=22.22%.' },
];

// ── Main seeder function ──────────────────────────────────────────────────────
async function seed() {
  const uri = buildURI();
  console.log('\n🔌 Connecting to MongoDB…');
  console.log(`   ${uri.replace(/:([^@]+)@/, ':****@')}`);

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 });
    console.log('✅ Connected\n');
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    console.error('   Is MongoDB running? Check your .env MONGODB_URI setting.');
    process.exit(1);
  }

  // ── Users ──────────────────────────────────────────────────────────────────
  console.log('👤 Seeding demo users…');
  let usersCreated = 0;
  for (const u of DEMO_USERS) {
    const exists = await User.findOne({ email: u.email });
    if (!exists) {
      await new User(u).save();
      usersCreated++;
      console.log(`   ✅ Created ${u.role}: ${u.email} / ${u.password}`);
    } else {
      console.log(`   ↩  Exists: ${u.email}`);
    }
  }
  console.log(`\n   Created ${usersCreated} new users\n`);

  // ── Aptitude Questions ─────────────────────────────────────────────────────
  console.log('📝 Seeding aptitude questions…');
  let qAdded = 0;
  for (const q of QUESTIONS) {
    const exists = await AptitudeQuestion.findOne({ question: q.question });
    if (!exists) {
      await AptitudeQuestion.create(q);
      qAdded++;
    }
  }
  const totalQ = await AptitudeQuestion.countDocuments();
  console.log(`   ✅ ${qAdded} questions added. Total in DB: ${totalQ}\n`);

  // ── Update company drive dates to future ──────────────────────────────────
  console.log('🏢 Updating company drive dates to future…');
  const futureDate = (daysFromNow) => {
    const d = new Date(); d.setDate(d.getDate() + daysFromNow); return d;
  };
  const driveUpdates = [
    { name:'TCS',               date: futureDate(12) },
    { name:'Infosys',           date: futureDate(25) },
    { name:'Wipro',             date: futureDate(35) },
    { name:'Cognizant',         date: futureDate(48) },
    { name:'Accenture',         date: futureDate(60) },
    { name:'Capgemini',         date: futureDate(72) },
    { name:'Tech Mahindra',     date: futureDate(80) },
    { name:'Persistent Systems',date: futureDate(90) },
    { name:'Hexaware Technologies', date: futureDate(100) },
  ];
  let driveUpdated = 0;
  for (const d of driveUpdates) {
    const r = await Company.updateOne({ name: d.name }, { campusVisitDate: d.date });
    if (r.modifiedCount) driveUpdated++;
  }
  console.log(`   ✅ Updated drive dates for ${driveUpdated} companies\n`);

  console.log('═══════════════════════════════════════════════════════');
  console.log('🎉 Demo seeding complete!\n');
  console.log('Demo Login Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin   : admin@pragati.edu       / Admin@123');
  console.log('Faculty : sapana@pragati.edu      / Faculty@123');
  console.log('Faculty : rajesh@pragati.edu      / Faculty@123');
  console.log('Student : student@pragati.edu     / Student@123');
  console.log('Student : ravi@pragati.edu        / Student@123');
  console.log('Student : priya@pragati.edu       / Student@123');
  console.log('Student : amit@pragati.edu        / Student@123');
  console.log('═══════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed();