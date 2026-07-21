import docx
import re
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

doc_path = r"d:\Hacker\Aptitude Sheet (1).docx"
doc = docx.Document(doc_path)

current_topic = "Quantitative"
current_subtopic = "General"

questions = []
current_q = None

# Regex to clean citation tags like [1], [4, 5], [1, 2, 3] at the end
citation_re = re.compile(r'\s*\[\d+(?:\s*,\s*\d+)*\]\s*$')

def clean_text(text):
    text = text.strip()
    text = citation_re.sub('', text)
    return text.strip()

for i, p in enumerate(doc.paragraphs):
    text = p.text.strip()
    if not text:
        continue
    
    # Detect Topic
    clean_topic_candidate = text.replace('\n', ' ').strip()
    if clean_topic_candidate.endswith(":") and any(x in clean_topic_candidate for x in ["Quantitative", "Logical", "Verbal"]):
        current_topic = clean_topic_candidate.replace(":", "").strip()
        continue
        
    # Detect Subtopic: e.g. "(Percentage)", "(Number System)"
    m_sub = re.match(r'^\((.*?)\)$', text)
    if m_sub:
        current_subtopic = m_sub.group(1).strip()
        continue

    # Detect Company & Year
    if text.startswith("Company & Year:"):
        if current_q:
            questions.append(current_q)
        val = text.replace("Company & Year:", "").strip()
        val = clean_text(val)
        
        # Parse companies (e.g. TCS NQT, Infosys, Zoho etc.)
        companies_list = ["TCS NQT", "TCS", "Infosys", "Wipro", "Capgemini", "Accenture", "HCL", "Cognizant", "Zoho", "Tech Mahindra", "Deloitte", "Mphasis", "Amazon", "LTIMindtree", "DXC", "Virtusa", "Hexaware", "Persistent"]
        found_companies = []
        for c in companies_list:
            if re.search(r'\b' + re.escape(c) + r'\b', val, re.IGNORECASE):
                found_companies.append(c)
        if not found_companies:
            found_companies = ["General"]
            
        # Parse Year
        year_match = re.search(r'\b(202\d(?:/\d+)?)\b', val)
        year = year_match.group(1) if year_match else "2025"

        current_q = {
            "topic": current_topic,
            "subtopic": current_subtopic,
            "companies": found_companies,
            "year": year,
            "question": "",
            "options": [],
            "answer": "",
            "explanation": "",
            "difficulty": "Medium"
        }
        continue

    if current_q is not None:
        if text.startswith("Question:"):
            q_text = text.replace("Question:", "").strip()
            current_q["question"] = clean_text(q_text)
        elif text.startswith("Options:"):
            opts_text = text.replace("Options:", "").strip()
            opts_text = clean_text(opts_text)
            
            # Split options like A) ..., B) ..., C) ..., D) ...
            parts = re.split(r'\b[A-D]\)\s*', opts_text)
            options = [clean_text(p).rstrip(',') for p in parts if p.strip()]
            
            # If split failed, try another format
            if len(options) != 4:
                parts = re.split(r'\s*[A-D]\)\s*', opts_text)
                options = [clean_text(p).rstrip(',') for p in parts if p.strip()]
                
            current_q["options"] = options
        elif text.startswith("Answer:"):
            ans_text = text.replace("Answer:", "").strip()
            ans_text = clean_text(ans_text)
            
            # Clean up option prefix if present (e.g. "C) 16% decrease" -> "16% decrease")
            ans_clean = re.sub(r'^[A-D]\)\s*', '', ans_text).strip()
            current_q["answer"] = ans_clean
        elif text.startswith("Solution:") or text.startswith("Explanation:"):
            sol_text = re.sub(r'^(?:Solution|Explanation):\s*', '', text)
            current_q["explanation"] = clean_text(sol_text)

# Add last question
if current_q:
    questions.append(current_q)

print(f"Total parsed questions: {len(questions)}")

# Verify first 3 parsed questions
print("\n--- First 3 Questions ---")
print(json.dumps(questions[:3], indent=2, ensure_ascii=False))

# Count difficulty distribution or topics
topics = {}
for q in questions:
    topics[q["topic"]] = topics.get(q["topic"], 0) + 1
print("\nTopic distribution:", topics)
