"""
PRAGATI Aptitude DOCX Comprehensive Parser
Handles all 3 formats found in the document:
  Format A: "Company & Year: TCS NQT (2025)" / "Question:" / "Options:" / "Answer:" / "Solution:"
  Format B: "Q1 (TCS NQT 2026)" / "Question:" / "Options:" / "Answer:" / "Solution:"  [Logical Reasoning]
  Format C: "TCS NQT (2026): [Question text inline]" / "A) ..., B) ..., C) ..., D) ..." / "Answer: B" [Verbal inline]
"""
import docx, re, sys, json
sys.stdout.reconfigure(encoding='utf-8')

doc_path = r"d:\Hacker\Aptitude Sheet (1).docx"
doc = docx.Document(doc_path)

current_topic = "Quantitative"
current_subtopic = "General"
questions = []

citation_re = re.compile(r'\s*\[\d+(?:\s*,\s*\d+)*\]\s*$')

def clean(text):
    return citation_re.sub('', text.strip()).strip()

COMPANIES = [
    "TCS NQT","TCS","Infosys","Wipro","Capgemini","Accenture","HCLTech","HCL",
    "Cognizant","Zoho","Tech Mahindra","Deloitte","Mphasis","Amazon","LTIMindtree",
    "DXC","Virtusa","Hexaware","Persistent","IBM India","IBM","Oracle","Cisco",
    "Microsoft","Adobe","Google","Infosys BPM","Capgemini","NTT Data"
]

def parse_companies_year(raw):
    found = []
    for c in COMPANIES:
        if re.search(r'\b' + re.escape(c) + r'\b', raw, re.IGNORECASE):
            norm = {"HCLTech":"HCL","IBM India":"IBM","TCS NQT":"TCS NQT"}.get(c, c)
            if norm not in found:
                found.append(norm)
    if not found:
        found = ["General"]
    yr = re.search(r'\b(202\d(?:/\d{4})?)\b', raw)
    return found, (yr.group(1) if yr else "2025")

def parse_options(opts_text):
    opts_text = clean(opts_text)
    parts = re.split(r'\b[A-D]\)\s*', opts_text)
    options = [clean(p).rstrip(',') for p in parts if p.strip()]
    return options if len(options) == 4 else []

def answer_to_text(ans_raw, options):
    ans_raw = clean(ans_raw)
    # Strip leading letter: "A) C" -> "C", "B) Middle of a side" -> "Middle of a side"
    m = re.match(r'^([A-D])\)\s*(.*)', ans_raw)
    if m:
        letter, rest = m.groups()
        rest = rest.strip()
        # If rest is not empty, that IS the answer text
        if rest:
            return rest
        # Otherwise map letter to option index
        idx = ord(letter) - ord('A')
        if 0 <= idx < len(options):
            return options[idx]
    # Single letter "A", "B", "C", "D"
    if ans_raw in ['A','B','C','D']:
        idx = ord(ans_raw) - ord('A')
        if 0 <= idx < len(options):
            return options[idx]
    return ans_raw

paragraphs = [p.text for p in doc.paragraphs]
n = len(paragraphs)
i = 0

def read_question_block(start_i):
    """Read a standard Q block: Question / Options / Answer / Solution lines."""
    q_obj = {"question":"","options":[],"answer":"","explanation":""}
    j = start_i
    while j < n:
        t = paragraphs[j].strip()
        if not t:
            j += 1; continue
        # Stop at next question header
        if (t.startswith("Company & Year:") or
            re.match(r'^Q\d+\s*\(', t) or
            re.match(r'^[A-Za-z ]+\s*\(\d{4}\):', t) or
            (t.replace('\n',' ').strip().endswith(':') and any(x in t for x in ["Quantitative","Logical","Verbal"])) or
            re.match(r'^\d+\.\s+\S', t)):
            break
        j += 1
        if t.startswith("Question:"):
            q_obj["question"] = clean(t[len("Question:"):].strip())
        elif t.startswith("Options:"):
            q_obj["options"] = parse_options(t[len("Options:"):].strip())
        elif t.startswith("Answer:"):
            q_obj["answer"] = t[len("Answer:"):].strip()
        elif t.startswith("Solution:") or t.startswith("Explanation:"):
            key = "Solution:" if "Solution:" in t else "Explanation:"
            q_obj["explanation"] = clean(t[len(key):].strip())
    # Resolve answer text
    q_obj["answer"] = answer_to_text(q_obj["answer"], q_obj["options"])
    return q_obj, j

while i < n:
    text = paragraphs[i].strip()
    i += 1
    if not text:
        continue

    # ── Topic heading ──────────────────────────────────────────────────────────
    clean_t = text.replace('\n',' ').strip()
    if clean_t.endswith(':') and any(x in clean_t for x in ["Quantitative","Logical","Verbal"]):
        current_topic = clean_t.rstrip(':').strip()
        if "Verbal" in current_topic:
            current_topic = "Verbal Ability"
        elif "Logical" in current_topic:
            current_topic = "Logical Reasoning"
        current_subtopic = "General"
        continue

    # ── Subtopic heading ──────────────────────────────────────────────────────
    m_sub = re.match(r'^\((.+?)\)$', text) or re.match(r'^Subtopic\s+\d+:\s*(.+)$', text)
    if m_sub:
        current_subtopic = m_sub.group(1).strip()
        continue
    # Numbered subtopic titles (no company info): "1. Seating Arrangement"
    if re.match(r'^\d+\.\s+[A-Za-z]', text) and not re.search(r'Company|Question|Option|Answer|Solution', text):
        current_subtopic = re.sub(r'^\d+\.\s+', '', text).strip()
        continue

    # ── FORMAT A: "Company & Year: ..." ────────────────────────────────────────
    if text.startswith("Company & Year:"):
        val = clean(text[len("Company & Year:"):].strip())
        companies, year = parse_companies_year(val)
        block, i = read_question_block(i)
        if len(block["options"]) == 4 and block["question"]:
            questions.append({
                "topic": current_topic, "subtopic": current_subtopic,
                "companies": companies, "year": year,
                "question": block["question"], "options": block["options"],
                "answer": block["answer"], "explanation": block["explanation"],
                "difficulty": "Medium"
            })
        continue

    # ── FORMAT B: "Q1 (TCS NQT 2026)" ─────────────────────────────────────────
    m_qn = re.match(r'^Q\d+\s*\((.+?)\)$', text)
    if m_qn:
        companies, year = parse_companies_year(m_qn.group(1))
        block, i = read_question_block(i)
        if len(block["options"]) == 4 and block["question"]:
            questions.append({
                "topic": current_topic, "subtopic": current_subtopic,
                "companies": companies, "year": year,
                "question": block["question"], "options": block["options"],
                "answer": block["answer"], "explanation": block["explanation"],
                "difficulty": "Medium"
            })
        continue

    # ── FORMAT C: "Company (Year): Question text" inline ──────────────────────
    m_inline = re.match(r'^([A-Za-z][\w\s]+?)\s*\((\d{4}(?:/\d{4})?)\):\s*(.+)$', text)
    if m_inline:
        co_raw, yr, q_text = m_inline.groups()
        companies, year = parse_companies_year(co_raw)
        
        q_obj = {
            "topic": current_topic, "subtopic": current_subtopic,
            "companies": companies, "year": yr,
            "question": clean(q_text), "options": [], "answer": "", "explanation": "",
            "difficulty": "Medium"
        }
        
        # Try sentence-correction split: "(A) / (B) / (C) / (D)"
        sc_parts = re.split(r'\s*\([A-D]\)\s*[/,]?\s*', q_obj["question"])
        if len(sc_parts) >= 4:
            q_obj["options"] = [p.strip().rstrip(',/').strip() for p in sc_parts[:4] if p.strip()]

        # Read following lines for options/answer/solution
        while i < n:
            nt = paragraphs[i].strip()
            if not nt:
                i += 1; continue
            if (nt.startswith("Company & Year:") or
                re.match(r'^Q\d+\s*\(', nt) or
                re.match(r'^[A-Za-z][\w\s]+?\s*\(\d{4}\):', nt) or
                (nt.replace('\n',' ').strip().endswith(':') and any(x in nt for x in ["Quantitative","Logical","Verbal"]))):
                break
            i += 1
            if re.match(r'^A\)\s*', nt):
                q_obj["options"] = parse_options(nt)
            elif nt.startswith("Answer:"):
                q_obj["answer"] = nt[len("Answer:"):].strip()
            elif nt.startswith("Solution:") or nt.startswith("Explanation:"):
                key = "Solution:" if "Solution:" in nt else "Explanation:"
                q_obj["explanation"] = clean(nt[len(key):].strip())

        q_obj["answer"] = answer_to_text(q_obj["answer"], q_obj["options"])
        if len(q_obj["options"]) == 4 and q_obj["question"]:
            questions.append(q_obj)
        continue

print(f"Total parsed: {len(questions)}")
topics = {}
for q in questions:
    topics[q["topic"]] = topics.get(q["topic"], 0) + 1
print("Topics:", topics)

# Save
out_path = r"d:\Hacker\PRAGATI\backend\src\utils\parsed-questions.json"
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(questions, f, indent=2, ensure_ascii=False)
print(f"Saved {len(questions)} questions → {out_path}")
