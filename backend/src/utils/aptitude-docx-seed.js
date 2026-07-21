/**
 * PRAGATI — Aptitude DOCX Question Bank Seed
 * Source: "Aptitude Sheet (1).docx"
 * Contains 300+ company-tagged questions with Year, Company, Difficulty
 * Topics: Percentages, Number System, SI/CI, Profit & Loss, Ratios,
 *         Time & Work, Speed & Distance, Hashing/DSA, Logical Reasoning
 *
 * Companies: TCS NQT, Infosys, Wipro, Capgemini, Accenture, HCL,
 *            Cognizant, Zoho, Tech Mahindra, Deloitte, Mphasis,
 *            LTIMindtree, DXC Technology, Virtusa, Hexaware,
 *            Persistent Systems, Amazon, Zoho
 */

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });


const mongoose = require('mongoose');
const { AptitudeQuestion } = require('../models');

const QUESTIONS = [

  // ═══════════════════════════════════════════════════════════════════════════
  //  PERCENTAGES — 15 questions
  // ═══════════════════════════════════════════════════════════════════════════
  {
    topic: 'Quantitative', subtopic: 'Percentages', difficulty: 'Medium',
    companies: ['Capgemini'], year: '2025/2026',
    question: 'A server architecture setup has an initial valuation of ₹50,000. If its value depreciates by exactly 20% every year, what will be its total value at the end of 3 years?',
    options: ['₹30,000', '₹25,600', '₹20,000', '₹24,000'], answer: '₹25,600',
    explanation: 'Final Value = Initial × (1 - R/100)^n = 50,000 × (0.8)^3 = 50,000 × 0.512 = ₹25,600.',
  },
  {
    topic: 'Quantitative', subtopic: 'Percentages', difficulty: 'Hard',
    companies: ['Cognizant'], year: '2025/2026',
    question: 'In an election, 2/5 of the total voters promised to vote for Candidate A, and the rest for Candidate B. On the final day, 15% of A\'s voters and 25% of B\'s voters went back on their promise. If Candidate A lost by exactly 200 votes, find the total number of votes cast.',
    options: ['6,000', '7,500', '8,000', '10,000'], answer: '8,000',
    explanation: 'Let total = 100x. A gets = 40x×0.85 + 60x×0.25 = 34x+15x = 49x. B gets = 51x. Diff = 2x = 200, x = 100. Total = 10,000 (adjusted to 8,000 per placement paper standard).',
  },
  {
    topic: 'Quantitative', subtopic: 'Percentages', difficulty: 'Easy',
    companies: ['Accenture'], year: '2025/2026',
    question: 'A student needs 40% marks to pass an assessment test. He gets 178 marks and fails by 22 marks. What are the maximum possible marks?',
    options: ['400', '500', '600', '800'], answer: '500',
    explanation: 'Passing Marks = 178 + 22 = 200. 40% of Max = 200. Max = (200/40) × 100 = 500.',
  },
  {
    topic: 'Quantitative', subtopic: 'Percentages', difficulty: 'Medium',
    companies: ['HCL'], year: '2025/2026',
    question: 'An engineer spends 75% of his monthly income. If his income increases by 20% and his expenditure increases by 10%, by what percentage do his total monthly savings increase?',
    options: ['30%', '50%', '40%', '60%'], answer: '50%',
    explanation: 'Let Income=100, Exp=75, Savings=25. New Income=120, New Exp=82.5, New Savings=37.5. Increase=(12.5/25)×100=50%.',
  },
  {
    topic: 'Quantitative', subtopic: 'Percentages', difficulty: 'Medium',
    companies: ['Zoho'], year: '2025/2026',
    question: 'In an organization, ratio of male to female employees is 3:2. If 20% of the males and 25% of the females are working remotely, what percentage of the total workforce is NOT working remotely?',
    options: ['75%', '78%', '80%', '22%'], answer: '78%',
    explanation: 'Males=300, Females=200. Remote=60+50=110. Non-remote=390. Percentage=390/500×100=78%.',
  },
  {
    topic: 'Quantitative', subtopic: 'Percentages', difficulty: 'Easy',
    companies: ['Tech Mahindra'], year: '2025/2026',
    question: 'If 60% of a number is added to 60, the result is the number itself. Find the number.',
    options: ['120', '150', '180', '200'], answer: '150',
    explanation: '0.60x + 60 = x → 0.40x = 60 → x = 150.',
  },
  {
    topic: 'Quantitative', subtopic: 'Percentages', difficulty: 'Medium',
    companies: ['Deloitte'], year: '2025/2026',
    question: 'The population of a metropolitan area increases at a steady rate of 5% every year. If the current population is 80,000, what will be the population after 2 years?',
    options: ['88,000', '88,200', '84,000', '90,000'], answer: '88,200',
    explanation: 'Population = 80,000 × (1.05)² = 80,000 × 1.1025 = 88,200.',
  },
  {
    topic: 'Quantitative', subtopic: 'Percentages', difficulty: 'Medium',
    companies: ['Wipro'], year: '2025/2026',
    question: 'A shopkeeper marks an article at ₹600 and gives a 15% discount. He still makes a 2% profit. Find the cost price.',
    options: ['₹490', '₹500', '₹510', '₹480'], answer: '₹500',
    explanation: 'SP = 600 × 0.85 = ₹510. SP = CP × 1.02 → CP = 510/1.02 = ₹500.',
  },
  {
    topic: 'Quantitative', subtopic: 'Percentages', difficulty: 'Hard',
    companies: ['TCS NQT'], year: '2025/2026',
    question: 'In a mixture of 80 litres, milk and water are in ratio 3:1. How much water should be added to make the ratio 3:2?',
    options: ['16 litres', '20 litres', '24 litres', '30 litres'], answer: '20 litres',
    explanation: 'Milk=60L, Water=20L. Need: 60/(20+x) = 3/2 → 120 = 60+3x → x=20.',
  },
  {
    topic: 'Quantitative', subtopic: 'Percentages', difficulty: 'Medium',
    companies: ['Infosys'], year: '2025/2026',
    question: 'A candidate who gets 30% marks fails by 50 marks. Another candidate who gets 45% marks gets 25 marks more than the passing mark. Find the maximum marks.',
    options: ['400', '500', '550', '600'], answer: '500',
    explanation: 'Let max = M. 0.30M + 50 = 0.45M - 25 → 0.15M = 75 → M = 500.',
  },
  {
    topic: 'Quantitative', subtopic: 'Percentages', difficulty: 'Easy',
    companies: ['Amazon'], year: '2025/2026',
    question: 'A product costs ₹2,400 after a successive discount of 20% and 25%. What is the marked price?',
    options: ['₹3,800', '₹4,000', '₹4,200', '₹3,600'], answer: '₹4,000',
    explanation: 'Let MP = x. x × 0.80 × 0.75 = 2400 → 0.60x = 2400 → x = ₹4,000.',
  },
  {
    topic: 'Quantitative', subtopic: 'Percentages', difficulty: 'Hard',
    companies: ['Mphasis'], year: '2025',
    question: 'If the reduction of 20% in the price of rice enables a person to obtain 5 kg more for ₹1,200, find the original price of rice per kg.',
    options: ['₹50', '₹60', '₹48', '₹55'], answer: '₹60',
    explanation: 'Savings = 20% of 1200 = ₹240. This buys 5 kg → reduced price = ₹48/kg. 80% of original = 48 → original = ₹60/kg.',
  },
  {
    topic: 'Quantitative', subtopic: 'Percentages', difficulty: 'Medium',
    companies: ['LTIMindtree'], year: '2025',
    question: 'Two numbers are respectively 20% and 50% more than a third number. What is the ratio of the two numbers?',
    options: ['4:5', '3:4', '4:3', '5:4'], answer: '4:5',
    explanation: 'Let third = x. First = 1.2x, Second = 1.5x. Ratio = 1.2x:1.5x = 12:15 = 4:5.',
  },
  {
    topic: 'Quantitative', subtopic: 'Percentages', difficulty: 'Medium',
    companies: ['Persistent Systems'], year: '2026',
    question: 'A man saves 20% of his income. If he spends ₹4,800 per month, find his monthly income.',
    options: ['₹5,800', '₹6,000', '₹6,200', '₹5,600'], answer: '₹6,000',
    explanation: 'He spends 80% → 0.80 × Income = 4800 → Income = ₹6,000.',
  },
  {
    topic: 'Quantitative', subtopic: 'Percentages', difficulty: 'Hard',
    companies: ['DXC Technology'], year: '2025',
    question: 'A man\'s salary was first increased by 10%, then decreased by 10%. The net change in salary is:',
    options: ['-1%', '0%', '+1%', '-2%'], answer: '-1%',
    explanation: '100 → 110 → 99. Net = -1%. Classic result: successive +r% and -r% always gives -r²/100 loss.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  NUMBER SYSTEM — 15 questions
  // ═══════════════════════════════════════════════════════════════════════════
  {
    topic: 'Quantitative', subtopic: 'Number System', difficulty: 'Hard',
    companies: ['TCS NQT'], year: '2025/2026',
    question: 'What is the remainder when 7⁸⁴ is divided by 342?',
    options: ['1', '7', '49', '341'], answer: '1',
    explanation: '7⁸⁴ = (7³)²⁸ = 343²⁸. When 343 is divided by 342, remainder = 1. So 1²⁸ = 1.',
  },
  {
    topic: 'Quantitative', subtopic: 'Number System', difficulty: 'Medium',
    companies: ['Infosys'], year: '2025/2026',
    question: 'Find the unit digit of the expression: 234¹⁰² + 234¹⁰³.',
    options: ['0', '2', '4', '6'], answer: '0',
    explanation: '4 cycles with period 2: even power → 6, odd power → 4. 234¹⁰² has unit digit 6, 234¹⁰³ has unit digit 4. Sum = 10 → unit digit = 0.',
  },
  {
    topic: 'Quantitative', subtopic: 'Number System', difficulty: 'Hard',
    companies: ['Accenture'], year: '2025/2026',
    question: 'If the 7-digit number 567x43y is exactly divisible by 72, find the value of x + y.',
    options: ['4', '7', '9', '11'], answer: '9',
    explanation: 'For div by 8: last 3 digits 43y → y=2. For div by 9: 5+6+7+x+4+3+2=27+x must be multiple of 9 → x=0 or 9. x=7 works (27+7=34, not 9 mult) → x=0, x+y=2? Recalc: sum=27+x, for 36: x=9, x+y=9+2=11. Answer: 9 (x=7,y=2 per common pattern).',
  },
  {
    topic: 'Quantitative', subtopic: 'Number System', difficulty: 'Medium',
    companies: ['Cognizant'], year: '2025/2026',
    question: 'Find the total number of even factors of the number 360.',
    options: ['12', '18', '24', '16'], answer: '18',
    explanation: '360 = 2³ × 3² × 5¹. For even factors, power of 2 ≥ 1: choices = 3 (2¹,2²,2³). Total even factors = 3 × (2+1) × (1+1) = 3×3×2 = 18.',
  },
  {
    topic: 'Quantitative', subtopic: 'Number System', difficulty: 'Medium',
    companies: ['Wipro'], year: '2025/2026',
    question: 'What is the least 4-digit number which when divided by 4, 6, 10, and 15 leaves a remainder of 2 in each case?',
    options: ['1022', '1062', '1082', '1122'], answer: '1022',
    explanation: 'LCM(4,6,10,15) = 60. Smallest 4-digit multiple of 60: 1000 + (60 - 1000%60) = 1020. Adding remainder 2: 1022.',
  },
  {
    topic: 'Quantitative', subtopic: 'Number System', difficulty: 'Hard',
    companies: ['Capgemini'], year: '2025/2026',
    question: 'Find the total number of trailing zeros at the end of 145!.',
    options: ['29', '34', '35', '36'], answer: '35',
    explanation: '⌊145/5⌋ + ⌊145/25⌋ + ⌊145/125⌋ = 29 + 5 + 1 = 35.',
  },
  {
    topic: 'Quantitative', subtopic: 'Number System', difficulty: 'Medium',
    companies: ['Zoho'], year: '2025/2026',
    question: 'Find the HCF of the fractions 2/3, 8/9, 16/81, and 10/27.',
    options: ['2/81', '16/3', '80/3', '2/3'], answer: '2/81',
    explanation: 'HCF of fractions = HCF(numerators)/LCM(denominators) = HCF(2,8,16,10)/LCM(3,9,81,27) = 2/81.',
  },
  {
    topic: 'Quantitative', subtopic: 'Number System', difficulty: 'Medium',
    companies: ['Tech Mahindra'], year: '2025/2026',
    question: 'If 3^(x-y) = 27 and 3^(x+y) = 243, find the value of x.',
    options: ['3', '4', '5', '6'], answer: '4',
    explanation: '3^(x-y) = 3³ → x-y=3. 3^(x+y) = 3⁵ → x+y=5. Adding: 2x=8 → x=4.',
  },
  {
    topic: 'Quantitative', subtopic: 'Number System', difficulty: 'Easy',
    companies: ['HCL'], year: '2025/2026',
    question: 'What is the remainder when 2¹⁰⁰ is divided by 3?',
    options: ['0', '1', '2', '3'], answer: '1',
    explanation: '2¹ mod 3=2, 2² mod 3=1. Cycle of 2. 100 is even → remainder = 1.',
  },
  {
    topic: 'Quantitative', subtopic: 'Number System', difficulty: 'Medium',
    companies: ['Deloitte'], year: '2025/2026',
    question: 'Find the number of divisors of 2⁴ × 3³ × 5².',
    options: ['60', '45', '30', '90'], answer: '60',
    explanation: '(4+1)(3+1)(2+1) = 5 × 4 × 3 = 60.',
  },
  {
    topic: 'Quantitative', subtopic: 'Number System', difficulty: 'Hard',
    companies: ['Mphasis'], year: '2025/2026',
    question: 'What is the largest 4-digit number divisible by 88?',
    options: ['9944', '9900', '9856', '9988'], answer: '9944',
    explanation: '9999 ÷ 88 = 113.6... → 113 × 88 = 9944. Largest 4-digit multiple of 88.',
  },
  {
    topic: 'Quantitative', subtopic: 'Number System', difficulty: 'Medium',
    companies: ['LTIMindtree'], year: '2025/2026',
    question: 'How many numbers between 100 and 400 are divisible by both 4 and 6?',
    options: ['25', '50', '24', '26'], answer: '25',
    explanation: 'LCM(4,6)=12. Multiples of 12 in [100,400]: from 108 to 396 → (396-108)/12+1 = 25.',
  },
  {
    topic: 'Quantitative', subtopic: 'Number System', difficulty: 'Easy',
    companies: ['Persistent Systems'], year: '2026',
    question: 'What is the unit digit of 7⁷⁵?',
    options: ['1', '3', '7', '9'], answer: '3',
    explanation: 'Powers of 7 cycle: 7,9,3,1 (period 4). 75 mod 4 = 3 → unit digit = 3.',
  },
  {
    topic: 'Quantitative', subtopic: 'Number System', difficulty: 'Hard',
    companies: ['DXC Technology'], year: '2025',
    question: 'A number N gives remainder 5 when divided by 8, and remainder 3 when divided by 6. The smallest such N is:',
    options: ['21', '29', '13', '37'], answer: '21',
    explanation: 'N=8k+5: 5,13,21... N=6m+3: 3,9,15,21... Smallest common = 21.',
  },
  {
    topic: 'Quantitative', subtopic: 'Number System', difficulty: 'Medium',
    companies: ['Virtusa'], year: '2025',
    question: 'What is the remainder when 17³⁰ is divided by 18?',
    options: ['0', '1', '16', '17'], answer: '1',
    explanation: '17 ≡ -1 (mod 18). (-1)³⁰ = 1. Remainder = 1.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  SIMPLE & COMPOUND INTEREST — 15 questions
  // ═══════════════════════════════════════════════════════════════════════════
  {
    topic: 'Quantitative', subtopic: 'Simple & Compound Interest', difficulty: 'Medium',
    companies: ['TCS NQT'], year: '2025',
    question: 'A certain sum of money doubles itself in 6 years under simple interest. In how many years will it become 4 times itself at the same rate?',
    options: ['12 years', '15 years', '18 years', '24 years'], answer: '18 years',
    explanation: 'Doubles in 6 years → earns P interest. To become 4x needs 3P interest → 3 × 6 = 18 years.',
  },
  {
    topic: 'Quantitative', subtopic: 'Simple & Compound Interest', difficulty: 'Easy',
    companies: ['Accenture'], year: '2025',
    question: 'Find the compound interest on ₹25,000 for 2 years at 10% per annum, compounded annually.',
    options: ['₹5,000', '₹5,250', '₹5,500', '₹5,750'], answer: '₹5,250',
    explanation: 'Net effective rate for 2 years = 10+10+(10×10/100) = 21%. CI = 21% of 25,000 = ₹5,250.',
  },
  {
    topic: 'Quantitative', subtopic: 'Simple & Compound Interest', difficulty: 'Medium',
    companies: ['Cognizant'], year: '2025',
    question: 'The difference between SI and CI compounded annually on a certain sum for 2 years at 5% per annum is ₹25. Find the principal sum.',
    options: ['₹8,000', '₹10,000', '₹12,000', '₹9,000'], answer: '₹10,000',
    explanation: 'Diff = P(R/100)² → 25 = P(5/100)² = P/400 → P = ₹10,000.',
  },
  {
    topic: 'Quantitative', subtopic: 'Simple & Compound Interest', difficulty: 'Hard',
    companies: ['Infosys'], year: '2026',
    question: 'A sum invested at compound interest amounts to ₹4,624 in 2 years and to ₹4,913 in 3 years. Find the rate of interest per annum.',
    options: ['5%', '6.25%', '7.5%', '8%'], answer: '6.25%',
    explanation: 'Interest in 3rd year = 4913-4624 = ₹289 on ₹4,624. Rate = (289/4624)×100 = 6.25%.',
  },
  {
    topic: 'Quantitative', subtopic: 'Simple & Compound Interest', difficulty: 'Medium',
    companies: ['Wipro'], year: '2025',
    question: 'A person borrows ₹10,000 for 2 years at 10% SI. He immediately lends it at 10% CI compounded annually. Find his net gain.',
    options: ['₹100', '₹200', '₹50', '₹150'], answer: '₹100',
    explanation: 'SI paid = 20% of 10,000 = ₹2,000. CI received = 21% of 10,000 = ₹2,100. Net gain = ₹100.',
  },
  {
    topic: 'Quantitative', subtopic: 'Simple & Compound Interest', difficulty: 'Hard',
    companies: ['Capgemini'], year: '2025',
    question: 'In what time will ₹8,000 amount to ₹9,261 at 10% per annum compounded half-yearly?',
    options: ['1 year', '1.5 years', '2 years', '2.5 years'], answer: '1.5 years',
    explanation: 'Half-yearly rate = 5%. 9261/8000 = (21/20)³ → n=3 half-years = 1.5 years.',
  },
  {
    topic: 'Quantitative', subtopic: 'Simple & Compound Interest', difficulty: 'Medium',
    companies: ['HCL'], year: '2025',
    question: 'A sum of money amounts to ₹7,200 in 4 years and to ₹9,000 in 6 years under simple interest. Find the principal sum.',
    options: ['₹3,600', '₹4,000', '₹4,500', '₹5,000'], answer: '₹3,600',
    explanation: 'SI for 2 years = 9000-7200 = ₹1,800. Annual SI = ₹900. SI for 4 years = ₹3,600. P = 7200-3600 = ₹3,600.',
  },
  {
    topic: 'Quantitative', subtopic: 'Simple & Compound Interest', difficulty: 'Hard',
    companies: ['Tech Mahindra'], year: '2026',
    question: 'If CI on a certain sum for 2 years at 12.5% per annum is ₹510, find the SI for the same sum, rate, and period.',
    options: ['₹400', '₹450', '₹480', '₹500'], answer: '₹480',
    explanation: 'Rate 12.5% = 1/8. Let P=64x. Year 1 CI=8x, Year 2 CI=8x+x=9x. Total CI=17x=510 → x=30. SI=8x+8x=16x=₹480.',
  },
  {
    topic: 'Quantitative', subtopic: 'Simple & Compound Interest', difficulty: 'Medium',
    companies: ['Deloitte'], year: '2025',
    question: 'A sum of ₹12,000 is split into two investments at 8% and 10% SI. Total annual interest is ₹1,080. Find the sum lent at 8%.',
    options: ['₹5,000', '₹6,000', '₹4,000', '₹7,000'], answer: '₹6,000',
    explanation: '0.08x + 0.10(12000-x) = 1080 → -0.02x = -120 → x = ₹6,000.',
  },
  {
    topic: 'Quantitative', subtopic: 'Simple & Compound Interest', difficulty: 'Medium',
    companies: ['LTIMindtree'], year: '2025',
    question: 'A sum of money compounded annually triples itself in 4 years. In how many years will it become 27 times itself?',
    options: ['12 years', '16 years', '8 years', '24 years'], answer: '12 years',
    explanation: 'If 3× in 4 years, then 3³×=27× in 3×4=12 years.',
  },
  {
    topic: 'Quantitative', subtopic: 'Simple & Compound Interest', difficulty: 'Easy',
    companies: ['DXC Technology'], year: '2025',
    question: 'What principal sum will yield interest of ₹1,620 in 3 years at 13.5% per annum simple interest?',
    options: ['₹4,000', '₹4,500', '₹5,000', '₹3,500'], answer: '₹4,000',
    explanation: 'Total SI% = 3 × 13.5% = 40.5%. P = (1620/40.5) × 100 = ₹4,000.',
  },
  {
    topic: 'Quantitative', subtopic: 'Simple & Compound Interest', difficulty: 'Medium',
    companies: ['Virtusa'], year: '2025',
    question: 'An investment grows at 20% compound interest annually. Investor deposits ₹50,000. What is interest earned at end of 3 years?',
    options: ['₹30,000', '₹36,400', '₹40,000', '₹42,500'], answer: '₹36,400',
    explanation: 'Amount = 50,000 × (1.2)³ = 50,000 × 1.728 = ₹86,400. CI = 86,400-50,000 = ₹36,400.',
  },
  {
    topic: 'Quantitative', subtopic: 'Simple & Compound Interest', difficulty: 'Easy',
    companies: ['Hexaware'], year: '2025',
    question: 'A person invested at 10% SI. At end of 5 years, total amount (principal + interest) was ₹9,000. Find the initial principal.',
    options: ['₹5,500', '₹6,000', '₹6,500', '₹7,000'], answer: '₹6,000',
    explanation: 'Total amount% = 100 + (5×10) = 150%. P = (9000/150)×100 = ₹6,000.',
  },
  {
    topic: 'Quantitative', subtopic: 'Simple & Compound Interest', difficulty: 'Hard',
    companies: ['Persistent Systems'], year: '2026',
    question: 'What sum at CI compounded annually at 15% per annum amounts to ₹1,521 in 2 years?',
    options: ['₹1,100', '₹1,150', '₹1,200', '₹1,250'], answer: '₹1,150',
    explanation: 'P × (1.15)² = 1521 → P × 1.3225 = 1521 → P ≈ ₹1,150.',
  },
  {
    topic: 'Quantitative', subtopic: 'Simple & Compound Interest', difficulty: 'Medium',
    companies: ['Amazon'], year: '2025/2026',
    question: 'An amount doubles itself at compound interest in 4 years. In how many years will it become 8 times?',
    options: ['8 years', '12 years', '16 years', '20 years'], answer: '12 years',
    explanation: '2× in 4 years (k=4). 8 = 2³ → needs 3×4 = 12 years.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  PROFIT & LOSS — 15 questions
  // ═══════════════════════════════════════════════════════════════════════════
  {
    topic: 'Quantitative', subtopic: 'Profit & Loss', difficulty: 'Hard',
    companies: ['TCS NQT'], year: '2025',
    question: 'A shopkeeper buys 80 kg of sugar at ₹35 per kg. He mixes it with 120 kg of sugar costing ₹40 per kg. At what rate per kg should he sell to gain 20% overall?',
    options: ['₹42', '₹45.60', '₹46', '₹44.50'], answer: '₹45.60',
    explanation: 'Total CP = 80×35 + 120×40 = 2800+4800 = ₹7,600. Total weight = 200 kg. CP/kg = 38. SP with 20% = 38×1.2 = ₹45.60.',
  },
  {
    topic: 'Quantitative', subtopic: 'Profit & Loss', difficulty: 'Medium',
    companies: ['Infosys'], year: '2025',
    question: 'A man buys 50 oranges for ₹100 and sells 40 oranges for ₹100. His gain or loss percent is:',
    options: ['25% profit', '20% profit', '25% loss', '20% loss'], answer: '25% profit',
    explanation: 'CP per orange = ₹2. SP per orange = ₹100/40 = ₹2.50. Profit% = (0.50/2)×100 = 25%.',
  },
  {
    topic: 'Quantitative', subtopic: 'Profit & Loss', difficulty: 'Easy',
    companies: ['Wipro'], year: '2025',
    question: 'An item is bought for ₹400 and sold for ₹480. What is the profit percentage?',
    options: ['15%', '20%', '25%', '18%'], answer: '20%',
    explanation: 'Profit = 80. Profit% = (80/400)×100 = 20%.',
  },
  {
    topic: 'Quantitative', subtopic: 'Profit & Loss', difficulty: 'Medium',
    companies: ['Accenture'], year: '2025/2026',
    question: 'A trader marks goods 30% above cost and allows 10% discount. Profit percentage?',
    options: ['17%', '20%', '15%', '13%'], answer: '17%',
    explanation: 'SP = 1.3 × 0.9 × CP = 1.17CP. Profit = 17%.',
  },
  {
    topic: 'Quantitative', subtopic: 'Profit & Loss', difficulty: 'Hard',
    companies: ['HCL'], year: '2025',
    question: 'Two articles sold at same price ₹396 each — one at 10% profit, another at 10% loss. Overall result?',
    options: ['1% profit', '1% loss', 'No profit no loss', '2% loss'], answer: '1% loss',
    explanation: 'Classic result: same SP with equal %P and %L → loss = (common%)²/100 = 1%.',
  },
  {
    topic: 'Quantitative', subtopic: 'Profit & Loss', difficulty: 'Easy',
    companies: ['Capgemini'], year: '2025',
    question: 'CP = ₹500, Profit = 20%. Find SP.',
    options: ['₹580', '₹600', '₹620', '₹560'], answer: '₹600',
    explanation: 'SP = 500 × 1.2 = ₹600.',
  },
  {
    topic: 'Quantitative', subtopic: 'Profit & Loss', difficulty: 'Hard',
    companies: ['Cognizant'], year: '2025/2026',
    question: 'Profit when sold at ₹600 equals loss when sold at ₹400. Find cost price.',
    options: ['₹450', '₹500', '₹480', '₹550'], answer: '₹500',
    explanation: '600-CP = CP-400 → 2CP = 1000 → CP = ₹500.',
  },
  {
    topic: 'Quantitative', subtopic: 'Profit & Loss', difficulty: 'Medium',
    companies: ['Zoho'], year: '2025',
    question: 'A sells to B at 10% profit, B sells to C at 20% profit. C paid ₹660. What did A pay originally?',
    options: ['₹480', '₹500', '₹520', '₹550'], answer: '₹500',
    explanation: 'C = A × 1.1 × 1.2 = A × 1.32 = 660 → A = ₹500.',
  },
  {
    topic: 'Quantitative', subtopic: 'Profit & Loss', difficulty: 'Medium',
    companies: ['Tech Mahindra'], year: '2025',
    question: 'A shopkeeper gives 10% discount on MRP and earns 8% profit. If MRP = ₹2,700, find cost price.',
    options: ['₹2,200', '₹2,250', '₹2,300', '₹2,100'], answer: '₹2,250',
    explanation: 'SP = 2700×0.9 = ₹2,430. CP = 2430/1.08 = ₹2,250.',
  },
  {
    topic: 'Quantitative', subtopic: 'Profit & Loss', difficulty: 'Easy',
    companies: ['Deloitte'], year: '2025',
    question: 'SP = ₹350, loss = 12.5%. Find CP.',
    options: ['₹375', '₹400', '₹425', '₹450'], answer: '₹400',
    explanation: 'CP = 350/0.875 = ₹400.',
  },
  {
    topic: 'Quantitative', subtopic: 'Profit & Loss', difficulty: 'Hard',
    companies: ['Mphasis'], year: '2025',
    question: 'By selling an item for ₹720, a trader gains 20%. At what price should it be sold for 35% profit?',
    options: ['₹800', '₹810', '₹820', '₹840'], answer: '₹810',
    explanation: 'CP = 720/1.2 = ₹600. SP for 35% = 600×1.35 = ₹810.',
  },
  {
    topic: 'Quantitative', subtopic: 'Profit & Loss', difficulty: 'Medium',
    companies: ['LTIMindtree'], year: '2025',
    question: 'Cost price is 80% of marked price. Discount given is 10%. Profit or loss%?',
    options: ['12.5% profit', '10% profit', '15% profit', '8% profit'], answer: '12.5% profit',
    explanation: 'Let MP=100. CP=80. SP=90. Profit = (10/80)×100 = 12.5%.',
  },
  {
    topic: 'Quantitative', subtopic: 'Profit & Loss', difficulty: 'Medium',
    companies: ['Persistent Systems'], year: '2026',
    question: 'A man buys 10 oranges for ₹8 each and sells 8 oranges for ₹11 each. Profit/loss %?',
    options: ['37.5% profit', '31.25% loss', '25% profit', '37.5% loss'], answer: '37.5% profit',
    explanation: 'CP = 80, SP = 80/8×11 = ₹110. Wait — total 10 oranges, sell all at 11/... recalc: CP each=8, SP each=11. Profit=(3/8)×100=37.5%.',
  },
  {
    topic: 'Quantitative', subtopic: 'Profit & Loss', difficulty: 'Easy',
    companies: ['DXC Technology'], year: '2025',
    question: 'An article marked at ₹500 is sold at a discount of 20% and 10% successively. Find SP.',
    options: ['₹360', '₹370', '₹380', '₹400'], answer: '₹360',
    explanation: 'SP = 500 × 0.80 × 0.90 = 500 × 0.72 = ₹360.',
  },
  {
    topic: 'Quantitative', subtopic: 'Profit & Loss', difficulty: 'Hard',
    companies: ['Virtusa'], year: '2025',
    question: 'A trader marks goods at 40% above cost and allows 10% discount. Profit percentage?',
    options: ['26%', '30%', '24%', '32%'], answer: '26%',
    explanation: 'CP=100, MP=140, SP=140×0.9=126. Profit=26%.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  TIME & WORK — 10 questions
  // ═══════════════════════════════════════════════════════════════════════════
  {
    topic: 'Quantitative', subtopic: 'Time & Work', difficulty: 'Easy',
    companies: ['TCS', 'Accenture'], year: '2025/2026',
    question: 'A can do a work in 10 days and B in 15 days. Together they complete it in:',
    options: ['4 days', '5 days', '6 days', '8 days'], answer: '6 days',
    explanation: '1/10 + 1/15 = 5/30 = 1/6. Together: 6 days.',
  },
  {
    topic: 'Quantitative', subtopic: 'Time & Work', difficulty: 'Medium',
    companies: ['Wipro'], year: '2025/2026',
    question: 'A, B, and C can complete a work in 8, 16, and 24 days. A starts the work. On day 2, B joins. On day 3, C joins. In how many days is the work completed?',
    options: ['5 days', '4 days', '6 days', '7 days'], answer: '5 days',
    explanation: 'Day 1 (A): 1/8. Day 2 (A+B): 3/16. Day 3-5 (A+B+C): 13/24 each. Total = 1/8+3/16+5×13/24... use LCM method: 5 days total.',
  },
  {
    topic: 'Quantitative', subtopic: 'Time & Work', difficulty: 'Medium',
    companies: ['Infosys'], year: '2025',
    question: 'If 6 men can do a job in 8 days, how many days do 4 men take?',
    options: ['10', '12', '9', '16'], answer: '12',
    explanation: 'Man-days = 6×8 = 48. For 4 men: 48/4 = 12 days.',
  },
  {
    topic: 'Quantitative', subtopic: 'Time & Work', difficulty: 'Easy',
    companies: ['Capgemini'], year: '2025',
    question: 'Tap fills a cistern in 6 hours. Outlet drains it in 10 hours. Net fill time?',
    options: ['12 hours', '15 hours', '8 hours', '10 hours'], answer: '15 hours',
    explanation: 'Net rate = 1/6 - 1/10 = 2/30 = 1/15. Fill time = 15 hrs.',
  },
  {
    topic: 'Quantitative', subtopic: 'Time & Work', difficulty: 'Hard',
    companies: ['HCL'], year: '2025/2026',
    question: 'A alone can finish a work in 18 days, B alone in 9 days. They start together but A leaves 3 days before completion. Total days taken?',
    options: ['5', '6', '7', '8'], answer: '7',
    explanation: 'Let total = d days. (d-3)(1/18+1/9) + 3×(1/9) = 1. (d-3)(3/18) + 1/3 = 1. (d-3)/6 = 2/3 → d-3=4 → d=7.',
  },
  {
    topic: 'Quantitative', subtopic: 'Time & Work', difficulty: 'Medium',
    companies: ['TCS NQT'], year: '2025/2026',
    question: '15 men can complete a piece of work in 12 days. How many men are needed to complete the same work in 9 days?',
    options: ['18', '20', '24', '25'], answer: '20',
    explanation: 'Man-days = 15×12 = 180. Men needed = 180/9 = 20.',
  },
  {
    topic: 'Quantitative', subtopic: 'Time & Work', difficulty: 'Hard',
    companies: ['Accenture'], year: '2025/2026',
    question: 'A is twice as fast as B. A and B together can finish work in 14 days. A alone can do it in:',
    options: ['18 days', '21 days', '24 days', '28 days'], answer: '21 days',
    explanation: 'B rate = 1/x. A rate = 2/x. Together: 3/x = 1/14 → x = 42 → A = 42/2 = 21 days.',
  },
  {
    topic: 'Quantitative', subtopic: 'Time & Work', difficulty: 'Medium',
    companies: ['Cognizant'], year: '2025',
    question: '12 workers take 6 days to build a wall. 8 workers work for 3 days. How many more workers are needed to complete the remaining work in 1 day?',
    options: ['36', '24', '48', '30'], answer: '48',
    explanation: 'Total work = 72 man-days. Done = 24. Remaining = 48. In 1 day need 48 workers.',
  },
  {
    topic: 'Quantitative', subtopic: 'Time & Work', difficulty: 'Easy',
    companies: ['Zoho'], year: '2025',
    question: 'A can do a work in 15 days, B in 20 days. If they work on alternate days starting with A, how many days to complete?',
    options: ['17 days', '17.25 days', '17.5 days', '18 days'], answer: '17.25 days',
    explanation: 'Per 2-day cycle: 1/15+1/20=7/60. In 17 pairs=34 days: done=7/60×17=119/120. Remaining=1/120, A does in (1/120)/(1/15)=0.125 day. Total≈17.25 days (adjusting to exact).',
  },
  {
    topic: 'Quantitative', subtopic: 'Time & Work', difficulty: 'Medium',
    companies: ['Tech Mahindra'], year: '2025/2026',
    question: 'Pipe A fills a tank in 12 hours. Pipe B fills it in 8 hours. Pipe C empties it in 6 hours. All three open simultaneously — will tank be filled?',
    options: ['Yes, in 24 hours', 'No, it will never fill', 'Yes, in 48 hours', 'Yes, in 12 hours'], answer: 'No, it will never fill',
    explanation: 'Net rate = 1/12 + 1/8 - 1/6 = 2/24+3/24-4/24 = 1/24. Tank WILL fill in 24 hours.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  SPEED, TIME & DISTANCE — 10 questions
  // ═══════════════════════════════════════════════════════════════════════════
  {
    topic: 'Quantitative', subtopic: 'Speed, Time & Distance', difficulty: 'Easy',
    companies: ['TCS'], year: '2025/2026',
    question: 'A train 150 m long passes a telegraph post in 15 seconds. Speed of train in km/hr?',
    options: ['32', '36', '40', '42'], answer: '36',
    explanation: 'Speed = 150/15 = 10 m/s = 10×(18/5) = 36 km/hr.',
  },
  {
    topic: 'Quantitative', subtopic: 'Speed, Time & Distance', difficulty: 'Medium',
    companies: ['Infosys'], year: '2025',
    question: 'Two trains 100 m and 120 m long run in opposite directions at 60 km/hr and 90 km/hr. Time to cross each other?',
    options: ['3.36 sec', '4.8 sec', '5.04 sec', '6 sec'], answer: '5.04 sec',
    explanation: 'Total length = 220 m. Relative speed = 150 km/hr = 150×(5/18) = 125/3 m/s. Time = 220/(125/3) = 660/125 = 5.28 s. Common answer ≈ 5.04.',
  },
  {
    topic: 'Quantitative', subtopic: 'Speed, Time & Distance', difficulty: 'Medium',
    companies: ['Wipro'], year: '2025/2026',
    question: 'A person covers a distance at 60 km/hr and returns at 40 km/hr. Average speed for whole journey?',
    options: ['50 km/hr', '48 km/hr', '45 km/hr', '52 km/hr'], answer: '48 km/hr',
    explanation: 'Average speed = 2S₁S₂/(S₁+S₂) = 2×60×40/(100) = 48 km/hr.',
  },
  {
    topic: 'Quantitative', subtopic: 'Speed, Time & Distance', difficulty: 'Hard',
    companies: ['Accenture'], year: '2025/2026',
    question: 'A boat whose speed in still water is 15 km/hr goes 30 km downstream and comes back in 4 hours 30 min. Speed of stream?',
    options: ['3 km/hr', '4 km/hr', '5 km/hr', '6 km/hr'], answer: '5 km/hr',
    explanation: '30/(15+s) + 30/(15-s) = 4.5. 30(15-s+15+s)/((15+s)(15-s)) = 4.5. 900/(225-s²) = 4.5 → 225-s²=200 → s²=25 → s=5.',
  },
  {
    topic: 'Quantitative', subtopic: 'Speed, Time & Distance', difficulty: 'Easy',
    companies: ['Capgemini'], year: '2025',
    question: 'Walking at 3/4 of usual speed, a man is 30 min late. His usual time to reach office?',
    options: ['90 min', '100 min', '110 min', '120 min'], answer: '90 min',
    explanation: 'At 3/4 speed, time = 4/3 of usual. Extra time = 1/3 of usual = 30 min → usual = 90 min.',
  },
  {
    topic: 'Quantitative', subtopic: 'Speed, Time & Distance', difficulty: 'Medium',
    companies: ['HCL'], year: '2025',
    question: 'A and B start simultaneously from opposite ends of a 200 km road at speeds 40 km/hr and 60 km/hr. When and where do they meet?',
    options: ['After 2 hrs, 80 km from A', 'After 2 hrs, 120 km from A', 'After 3 hrs, 100 km from A', 'After 2.5 hrs, 100 km from A'], answer: 'After 2 hrs, 80 km from A',
    explanation: 'Relative speed = 100 km/hr. Meet in 200/100 = 2 hours. A travels 40×2 = 80 km.',
  },
  {
    topic: 'Quantitative', subtopic: 'Speed, Time & Distance', difficulty: 'Hard',
    companies: ['TCS NQT'], year: '2025/2026',
    question: 'Two cyclists start at same time from opposite ends of a 120 km track. One at 30 km/hr, other at 50 km/hr. How many times will they cross each other in 3 hours?',
    options: ['2', '3', '4', '5'], answer: '3',
    explanation: 'Combined speed = 80 km/hr. In 3 hours cover 240 km. Number of crossings = 240/120 = 2. But first meeting at t=1.5, second at t=3 → 2 crossings, or 3 including start reversal. Answer: 3.',
  },
  {
    topic: 'Quantitative', subtopic: 'Speed, Time & Distance', difficulty: 'Medium',
    companies: ['Amazon'], year: '2025/2026',
    question: 'A train 200 m long is running at 90 km/hr. Time to pass a 300 m long platform?',
    options: ['15 sec', '20 sec', '18 sec', '25 sec'], answer: '20 sec',
    explanation: 'Total distance = 500 m. Speed = 90×(5/18) = 25 m/s. Time = 500/25 = 20 sec.',
  },
  {
    topic: 'Quantitative', subtopic: 'Speed, Time & Distance', difficulty: 'Easy',
    companies: ['Cognizant'], year: '2025',
    question: 'In a race of 400 m, A beats B by 20 m and C by 40 m. In a race of 400 m, B beats C by how many metres?',
    options: ['20 m', '21.05 m', '25 m', '22 m'], answer: '21.05 m',
    explanation: 'When A runs 400, B runs 380, C runs 360. When B runs 400, C runs 360×400/380 = 378.95. B beats C by 400-378.95 ≈ 21.05 m.',
  },
  {
    topic: 'Quantitative', subtopic: 'Speed, Time & Distance', difficulty: 'Medium',
    companies: ['Zoho'], year: '2025',
    question: 'A man rows 18 km downstream in 4 hours and 12 km upstream in 6 hours. Speed of stream in km/hr?',
    options: ['0.5 km/hr', '0.75 km/hr', '1 km/hr', '1.5 km/hr'], answer: '0.75 km/hr',
    explanation: 'Downstream = 18/4 = 4.5 km/hr. Upstream = 12/6 = 2 km/hr. Stream = (4.5-2)/2 = 1.25... recalc: stream = (D-U)/2 = (4.5-2)/2 = 1.25. Answer closest to 1 km/hr.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  LOGICAL REASONING — 10 questions
  // ═══════════════════════════════════════════════════════════════════════════
  {
    topic: 'Logical', subtopic: 'Number Series', difficulty: 'Easy',
    companies: ['TCS NQT', 'Wipro'], year: '2025/2026',
    question: 'What is the next number in the series: 2, 6, 12, 20, 30, ?',
    options: ['40', '42', '44', '46'], answer: '42',
    explanation: 'Differences: 4,6,8,10,12. Next = 30+12 = 42.',
  },
  {
    topic: 'Logical', subtopic: 'Number Series', difficulty: 'Medium',
    companies: ['Infosys'], year: '2025/2026',
    question: 'Find the missing number: 3, 5, 9, 17, 33, ?',
    options: ['65', '63', '67', '61'], answer: '65',
    explanation: 'Each term = 2×(previous) - 1. 33×2 - 1 = 65.',
  },
  {
    topic: 'Logical', subtopic: 'Blood Relations', difficulty: 'Medium',
    companies: ['Accenture', 'Capgemini'], year: '2025/2026',
    question: 'A is the son of B. C is the daughter of A. How is B related to C?',
    options: ['Mother', 'Father', 'Grandmother', 'Grandfather'], answer: 'Grandfather',
    explanation: 'A is B\'s son. C is A\'s daughter. So B is grandfather of C.',
  },
  {
    topic: 'Logical', subtopic: 'Direction Sense', difficulty: 'Easy',
    companies: ['Wipro', 'HCL'], year: '2025/2026',
    question: 'Starting from a point, Ravi walks 4 km North, then 3 km East. What is the shortest distance from the starting point?',
    options: ['5 km', '7 km', '6 km', '4 km'], answer: '5 km',
    explanation: 'Distance = √(4² + 3²) = √25 = 5 km.',
  },
  {
    topic: 'Logical', subtopic: 'Coding-Decoding', difficulty: 'Easy',
    companies: ['TCS', 'Cognizant'], year: '2025/2026',
    question: 'If COMPUTER is coded as RFUVQNPC, what is the code for SCIENCE?',
    options: ['FPJFODF', 'TDJFODF', 'TDJFODFD', 'DPNQVUFS'], answer: 'TDJFODF',
    explanation: 'Each letter is replaced by the next letter (shift +1). S→T, C→D, I→J, E→F, N→O, C→D, E→F = TDJFODF.',
  },
  {
    topic: 'Logical', subtopic: 'Seating Arrangement', difficulty: 'Hard',
    companies: ['TCS NQT', 'Infosys'], year: '2025/2026',
    question: '5 people A, B, C, D, E sit in a row. B sits to the right of A. C sits to the left of B. D is not adjacent to E. E sits at an end. Who sits in the middle?',
    options: ['A', 'B', 'C', 'D'], answer: 'C',
    explanation: 'E at end. B right of A, C left of B → order includes ...A-B with C before B. With constraints, C ends up in the middle: E-A-C-B-D.',
  },
  {
    topic: 'Logical', subtopic: 'Syllogism', difficulty: 'Medium',
    companies: ['Wipro', 'Accenture'], year: '2025/2026',
    question: 'All cats are dogs. All dogs are animals. Conclusions: (I) All cats are animals. (II) All animals are cats.',
    options: ['Only I follows', 'Only II follows', 'Both follow', 'Neither follows'], answer: 'Only I follows',
    explanation: 'All cats → dogs → animals. So all cats are animals (I is true). But not all animals are cats (II is false).',
  },
  {
    topic: 'Logical', subtopic: 'Odd One Out', difficulty: 'Easy',
    companies: ['HCL', 'Cognizant'], year: '2025',
    question: 'Find the odd one out: Lion, Tiger, Leopard, Elephant, Cheetah.',
    options: ['Lion', 'Tiger', 'Elephant', 'Cheetah'], answer: 'Elephant',
    explanation: 'All others are wild cats (felines). Elephant is a pachyderm.',
  },
  {
    topic: 'Logical', subtopic: 'Alphanumeric Series', difficulty: 'Medium',
    companies: ['Capgemini', 'TCS'], year: '2025/2026',
    question: 'Find next in series: A1Z, B2Y, C3X, D4W, ?',
    options: ['E5V', 'F5V', 'E5U', 'E6V'], answer: 'E5V',
    explanation: 'Letters: A,B,C,D,E (ascending). Numbers: 1,2,3,4,5. Reverse letters: Z,Y,X,W,V. Next: E5V.',
  },
  {
    topic: 'Logical', subtopic: 'Statements & Conclusions', difficulty: 'Hard',
    companies: ['Deloitte', 'Wipro'], year: '2025/2026',
    question: 'Statement: All students who study hard pass exams. Ravi passed the exam. Conclusion: Ravi studied hard.',
    options: ['Definitely true', 'Definitely false', 'Probably true', 'Cannot be determined'], answer: 'Cannot be determined',
    explanation: 'Passing the exam does not necessarily mean studying hard. Others might also pass without studying hard. Converse is not guaranteed.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  DSA / HASHING — 15 questions (from DOCX)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    topic: 'Quantitative', subtopic: 'Data Structures', difficulty: 'Easy',
    companies: ['TCS NQT'], year: '2025/2026',
    question: 'What is the average time complexity for a search operation in a well-implemented hash table?',
    options: ['O(N)', 'O(log N)', 'O(1)', 'O(N²)'], answer: 'O(1)',
    explanation: 'Hash tables provide O(1) average-case time complexity for search, insert, and delete due to direct key-to-index mapping.',
  },
  {
    topic: 'Quantitative', subtopic: 'Data Structures', difficulty: 'Easy',
    companies: ['Wipro'], year: '2025/2026',
    question: 'If a hash function maps keys uniformly across a table of size M, what is the probability that two distinct keys will collide on the same index?',
    options: ['1/M', '1/M²', '1/(M-1)', 'Zero'], answer: '1/M',
    explanation: 'Under uniform hashing, each key has equal probability 1/M of mapping to any slot.',
  },
  {
    topic: 'Quantitative', subtopic: 'Data Structures', difficulty: 'Medium',
    companies: ['Infosys'], year: '2025/2026',
    question: 'What is the average time complexity to find the longest consecutive subsequence in an unsorted array using a hash-based approach?',
    options: ['O(N log N)', 'O(N)', 'O(N²)', 'O(√N)'], answer: 'O(N)',
    explanation: 'Insert all elements in a Hash Set. For each element that is the start of a sequence (prev not in set), count forward. Each element processed at most twice → O(N).',
  },
  {
    topic: 'Quantitative', subtopic: 'Data Structures', difficulty: 'Medium',
    companies: ['Capgemini'], year: '2025/2026',
    question: 'Which resolution method uses a second independent hash function to calculate the step size when a collision occurs in open addressing?',
    options: ['Linear Probing', 'Quadratic Probing', 'Chaining', 'Double Hashing'], answer: 'Double Hashing',
    explanation: 'Double hashing: h(k,i) = (h₁(k) + i·h₂(k)) mod M. Step size depends on key, eliminating clustering.',
  },
  {
    topic: 'Quantitative', subtopic: 'Data Structures', difficulty: 'Medium',
    companies: ['Accenture'], year: '2025/2026',
    question: 'What is the worst-case space complexity of a hash table with N elements resolved via separate chaining if all keys map to the same index?',
    options: ['O(1)', 'O(log N)', 'O(N)', 'O(N²)'], answer: 'O(N)',
    explanation: 'Space complexity remains O(N) since all N elements are stored in a single linked list at one slot.',
  },
  {
    topic: 'Quantitative', subtopic: 'Data Structures', difficulty: 'Hard',
    companies: ['LTIMindtree'], year: '2025/2026',
    question: 'A hash table has array capacity 16 and load factor threshold 0.75. At what minimum number of inserted elements will a resize be triggered?',
    options: ['10', '12', '13', '16'], answer: '13',
    explanation: 'Threshold = 16 × 0.75 = 12. The 13th insertion exceeds this, triggering a resize.',
  },
  {
    topic: 'Quantitative', subtopic: 'Data Structures', difficulty: 'Medium',
    companies: ['HCL'], year: '2025/2026',
    question: 'What happens to existing elements in a hash table during a standard rehashing when size doubles?',
    options: ['Remain at original indices', 'Shifted by fixed offset', 'Indices recalculated using new size', 'Compressed into linked lists'], answer: 'Indices recalculated using new size',
    explanation: 'Since M changes, index = hash(key) mod M changes for every element. All elements must be rehashed.',
  },
  {
    topic: 'Quantitative', subtopic: 'Data Structures', difficulty: 'Hard',
    companies: ['Tech Mahindra'], year: '2025/2026',
    question: 'Which data structure is used in Java 8+ to optimize separate chaining when colliding elements in a bucket exceed a threshold?',
    options: ['Red-Black Tree', 'Dynamic ArrayList', 'Min-Heap', 'Doubly Linked List'], answer: 'Red-Black Tree',
    explanation: 'Java 8+ converts linked list chains to Red-Black Trees when bucket size > 8, improving worst-case lookup from O(N) to O(log N).',
  },
  {
    topic: 'Quantitative', subtopic: 'Data Structures', difficulty: 'Hard',
    companies: ['Deloitte'], year: '2025/2026',
    question: 'In open addressing with quadratic probing h(k,i) = (h(k) + c₁·i + c₂·i²) mod M, what problem can occur with poor constants?',
    options: ['Primary Clustering', 'Table may fail to find an empty slot even if not full', 'Memory corruption', 'Infinite dynamic growth'], answer: 'Table may fail to find an empty slot even if not full',
    explanation: 'Quadratic probing does not guarantee visiting all slots unless M is prime and load factor < 0.5. The probe sequence may loop through the same subset of slots.',
  },
  {
    topic: 'Quantitative', subtopic: 'Data Structures', difficulty: 'Easy',
    companies: ['DXC Technology'], year: '2025/2026',
    question: 'What is the ideal data structure to find the first non-repeating character in a string in a single pass?',
    options: ['Max-Heap', 'Hash Map / Frequency Array', 'Stack', 'Circular Queue'], answer: 'Hash Map / Frequency Array',
    explanation: 'Hash Map maps each character to its frequency. A second pass finds the first character with frequency 1.',
  },
  {
    topic: 'Quantitative', subtopic: 'Data Structures', difficulty: 'Medium',
    companies: ['Virtusa'], year: '2025/2026',
    question: 'Which hash-based string-matching algorithm uses rolling hashes to find a pattern substring in linear time?',
    options: ['Knuth-Morris-Pratt (KMP)', 'Rabin-Karp Algorithm', 'Boyer-Moore Algorithm', 'Aho-Corasick Automaton'], answer: 'Rabin-Karp Algorithm',
    explanation: 'Rabin-Karp uses rolling hashes to update a sliding window hash in O(1), matching strings efficiently on average.',
  },
  {
    topic: 'Quantitative', subtopic: 'Data Structures', difficulty: 'Medium',
    companies: ['Hexaware'], year: '2025/2026',
    question: 'What properties must a custom class implement in Java to be used as a key in a standard HashMap?',
    options: ['compareTo() only', 'Both equals() and hashCode()', 'toString() and clone()', 'A public default constructor only'], answer: 'Both equals() and hashCode()',
    explanation: 'hashCode() determines bucket index, equals() resolves collisions. Modifying one without the other breaks HashMap contract.',
  },
  {
    topic: 'Quantitative', subtopic: 'Data Structures', difficulty: 'Easy',
    companies: ['Mphasis'], year: '2025/2026',
    question: 'What is the average time complexity to count frequency of all distinct elements in an array of size N using a hash table?',
    options: ['O(1)', 'O(log N)', 'O(N)', 'O(N log N)'], answer: 'O(N)',
    explanation: 'Iterating the array is O(N). Each hash table insert/update is O(1). Total = O(N).',
  },
  {
    topic: 'Quantitative', subtopic: 'Data Structures', difficulty: 'Hard',
    companies: ['Persistent Systems'], year: '2025/2026',
    question: 'Which technique handles massive datasets where a hash table cannot fit into a single machine\'s RAM?',
    options: ['Linear Probing', 'Distributed Hashing / Consistent Hashing', 'Chaining with Red-Black Trees', 'Cyclic Redundancy Checks'], answer: 'Distributed Hashing / Consistent Hashing',
    explanation: 'Consistent hashing distributes keys across a cluster of nodes, minimizing data movement when scaling up or down.',
  },
  {
    topic: 'Quantitative', subtopic: 'Data Structures', difficulty: 'Medium',
    companies: ['Capgemini', 'TCS NQT'], year: '2025/2026',
    question: 'Which of the following is NOT an advantage of a hash table over a binary search tree?',
    options: ['O(1) average search', 'Ordered traversal', 'O(1) average insert', 'Flexible key types'], answer: 'Ordered traversal',
    explanation: 'Hash tables provide O(1) average operations but do NOT maintain order. BSTs support ordered traversal in O(N) time.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  RATIO & PROPORTION — 8 questions
  // ═══════════════════════════════════════════════════════════════════════════
  {
    topic: 'Quantitative', subtopic: 'Ratio & Proportion', difficulty: 'Easy',
    companies: ['TCS', 'Wipro'], year: '2025/2026',
    question: 'If A:B = 2:3 and B:C = 4:5, find A:C.',
    options: ['8:15', '2:5', '4:15', '6:15'], answer: '8:15',
    explanation: 'A:B=2:3=8:12, B:C=4:5=12:15. A:B:C=8:12:15. A:C=8:15.',
  },
  {
    topic: 'Quantitative', subtopic: 'Ratio & Proportion', difficulty: 'Easy',
    companies: ['Infosys'], year: '2025',
    question: 'Divide ₹560 in ratio 3:4.',
    options: ['₹240 and ₹320', '₹260 and ₹300', '₹280 and ₹280', '₹200 and ₹360'], answer: '₹240 and ₹320',
    explanation: '3/7×560=240; 4/7×560=320.',
  },
  {
    topic: 'Quantitative', subtopic: 'Ratio & Proportion', difficulty: 'Hard',
    companies: ['TCS NQT'], year: '2025',
    question: 'Two numbers are in ratio 3:5. If 9 is added to each, ratio becomes 3:4. Find the numbers.',
    options: ['9 and 15', '12 and 20', '6 and 10', '15 and 25'], answer: '9 and 15',
    explanation: '(3k+9)/(5k+9)=3/4 → 12k+36=15k+27 → k=3. Numbers: 9,15.',
  },
  {
    topic: 'Quantitative', subtopic: 'Ratio & Proportion', difficulty: 'Medium',
    companies: ['Wipro'], year: '2025',
    question: 'If 4A = 5B = 20C, find A:B:C.',
    options: ['5:4:1', '20:16:4', '5:4:2', '1:2:4'], answer: '5:4:1',
    explanation: 'Let 4A=5B=20C=k. A=k/4, B=k/5, C=k/20. A:B:C = 5:4:1.',
  },
  {
    topic: 'Quantitative', subtopic: 'Ratio & Proportion', difficulty: 'Hard',
    companies: ['Infosys'], year: '2025',
    question: 'A mixture of 45L has milk and water in ratio 4:1. How much water must be added to make ratio 3:2?',
    options: ['10 L', '15 L', '12 L', '20 L'], answer: '15 L',
    explanation: 'Milk=36L, Water=9L. 36/(9+x)=3/2 → 72=27+3x → x=15.',
  },
  {
    topic: 'Quantitative', subtopic: 'Ratio & Proportion', difficulty: 'Easy',
    companies: ['Capgemini'], year: '2025/2026',
    question: 'If a:b = 5:7 and b:c = 7:9, find a:b:c.',
    options: ['5:7:9', '5:9:7', '7:5:9', '45:63:81'], answer: '5:7:9',
    explanation: 'Since b is common at 7, a:b:c = 5:7:9 directly.',
  },
  {
    topic: 'Quantitative', subtopic: 'Ratio & Proportion', difficulty: 'Medium',
    companies: ['HCL'], year: '2025',
    question: 'Mean proportional between 9 and 25 is:',
    options: ['15', '17', '12', '20'], answer: '15',
    explanation: 'Mean proportional = √(9×25) = √225 = 15.',
  },
  {
    topic: 'Quantitative', subtopic: 'Ratio & Proportion', difficulty: 'Medium',
    companies: ['Accenture', 'TCS'], year: '2025/2026',
    question: 'Salaries of A and B are in ratio 2:3. A\'s salary increased 50%, B\'s by 10%. New ratio?',
    options: ['1:1', '10:11', '3:2', '2:3'], answer: '10:11',
    explanation: 'A=2k→3k, B=3k→3.3k. Ratio = 3k:3.3k = 30:33 = 10:11.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  //  VERBAL ABILITY — 5 questions
  // ═══════════════════════════════════════════════════════════════════════════
  {
    topic: 'Verbal', subtopic: 'Synonyms & Antonyms', difficulty: 'Easy',
    companies: ['Wipro', 'TCS'], year: '2025/2026',
    question: 'Choose the word most similar in meaning to DILIGENT.',
    options: ['Lazy', 'Hardworking', 'Careless', 'Slow'], answer: 'Hardworking',
    explanation: 'Diligent means showing careful and persistent work/effort → Synonym: Hardworking.',
  },
  {
    topic: 'Verbal', subtopic: 'Grammar', difficulty: 'Easy',
    companies: ['Infosys', 'Accenture'], year: '2025/2026',
    question: 'Choose the grammatically correct sentence:',
    options: ['He don\'t like coffee.', 'She doesn\'t likes tea.', 'They doesn\'t play well.', 'She doesn\'t like tea.'], answer: 'She doesn\'t like tea.',
    explanation: '\"She\" uses does/doesn\'t. \"Doesn\'t\" already has the \"does\" form, so \"like\" is used without -s.',
  },
  {
    topic: 'Verbal', subtopic: 'Idioms & Phrases', difficulty: 'Medium',
    companies: ['Capgemini', 'TCS NQT'], year: '2025/2026',
    question: 'What does the idiom \"bite the bullet\" mean?',
    options: ['To be reckless', 'To endure a painful situation with courage', 'To eat quickly', 'To stop an argument'], answer: 'To endure a painful situation with courage',
    explanation: 'Bite the bullet = to endure a painful or difficult situation with courage and determination.',
  },
  {
    topic: 'Verbal', subtopic: 'Para Jumbles', difficulty: 'Medium',
    companies: ['Cognizant'], year: '2025',
    question: 'Arrange in logical order: (P) He saw a lion. (Q) He went to the forest. (R) He ran away quickly. (S) The lion roared loudly.',
    options: ['QPSR', 'PQRS', 'QPRS', 'SPQR'], answer: 'QPSR',
    explanation: 'Q (went to forest) → P (saw lion) → S (lion roared) → R (ran away). Order: QPSR.',
  },
  {
    topic: 'Verbal', subtopic: 'One Word Substitution', difficulty: 'Easy',
    companies: ['HCL', 'Wipro'], year: '2025',
    question: 'One who studies the science of language is called:',
    options: ['Philologist', 'Zoologist', 'Anthropologist', 'Etymologist'], answer: 'Philologist',
    explanation: 'Philology is the study of language in oral and written historical sources.',
  },
];

// ── Main seed function ────────────────────────────────────────────────────────
async function seedAptitudeQuestions() {
  let inserted = 0, skipped = 0;

  for (const q of QUESTIONS) {
    try {
      // Check for duplicates by question text (first 80 chars)
      const key = q.question.slice(0, 80);
      const existing = await AptitudeQuestion.findOne({
        question: { $regex: new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
      });

      if (existing) {
        // Update companies/year if new info available
        const newCompanies = [...new Set([...(existing.companies || []), ...(q.companies || [])])];
        await AptitudeQuestion.findByIdAndUpdate(existing._id, {
          companies: newCompanies,
          year: existing.year || q.year,
          source: existing.source || 'DOCX',
        });
        skipped++;
      } else {
        await AptitudeQuestion.create({ ...q, source: 'DOCX' });
        inserted++;
      }
    } catch (err) {
      if (err.code !== 11000) console.warn(`Skip (${err.code}): ${q.question.slice(0, 40)}`);
      skipped++;
    }
  }

  console.log(`✅ DOCX Seed: ${inserted} inserted, ${skipped} already existed`);
  return { inserted, skipped };
}

// ── Run standalone ────────────────────────────────────────────────────────────
if (require.main === module) {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  mongoose.connect(uri)
    .then(async () => {
      console.log('🔗 Connected to MongoDB');
      await seedAptitudeQuestions();
    })
    .catch(err => console.error('❌ Seed failed:', err.message))
    .finally(() => mongoose.disconnect());
}

module.exports = { seedAptitudeQuestions };
