package com.pragati.service;

import com.pragati.model.ParsedResume;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.*;
import java.util.regex.*;
import java.util.stream.Collectors;
import org.apache.pdfbox.Loader;

/**
 * ResumeParserService
 *
 * Core logic for PRAGATI's Java resume parser.
 * Steps:
 *   1. Extract raw text from the uploaded file (PDF via PDFBox, DOCX via POI)
 *   2. Detect document sections by heading keywords
 *   3. Run regex + keyword matching to pull out structured fields
 *   4. Return a ParsedResume object which is serialised to JSON
 *
 * This service is stateless — every call is independent.
 */
@Slf4j
@Service
public class ResumeParserService {

    // ── Tech skill keyword list (expand as needed) ─────────────────────────────
    private static final List<String> SKILL_KEYWORDS = Arrays.asList(
        // Languages
        "Java", "Python", "JavaScript", "TypeScript", "C", "C++", "C#", "Go",
        "Kotlin", "Swift", "Rust", "PHP", "Ruby", "Scala", "R", "MATLAB",
        // Frontend
        "React", "Angular", "Vue", "Next.js", "HTML", "CSS", "Tailwind",
        "Bootstrap", "jQuery", "Redux", "GraphQL",
        // Backend / Frameworks
        "Node.js", "Express", "Spring Boot", "Django", "Flask", "FastAPI",
        "Laravel", "ASP.NET", "Hibernate", "REST API",
        // Databases
        "MongoDB", "MySQL", "PostgreSQL", "SQLite", "Redis", "Cassandra",
        "Firebase", "Oracle", "SQL Server",
        // Cloud / DevOps
        "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Jenkins", "Terraform",
        "CI/CD", "GitHub Actions", "Linux", "Nginx",
        // ML / AI
        "TensorFlow", "PyTorch", "scikit-learn", "Pandas", "NumPy",
        "Keras", "OpenCV", "NLP", "Machine Learning", "Deep Learning",
        // Tools
        "Git", "GitHub", "Postman", "JIRA", "Figma", "VS Code", "IntelliJ",
        // Soft skills
        "Leadership", "Communication", "Teamwork", "Problem Solving"
    );

    // Patterns for common resume fields
    private static final Pattern EMAIL_PATTERN =
        Pattern.compile("[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}");

    private static final Pattern PHONE_PATTERN =
        Pattern.compile("(\\+91[\\-\\s]?)?[6-9]\\d{9}|\\(\\d{3}\\)[\\s\\-]\\d{3}[\\-\\s]\\d{4}|\\d{10}");

    private static final Pattern CGPA_PATTERN =
        Pattern.compile("(?i)(cgpa|gpa|percentage)[:\\s]*([0-9]{1,2}(?:\\.[0-9]{1,2})?)");

    // Section heading detection — order matters
    private static final Map<String, String> SECTION_HEADINGS = new LinkedHashMap<>() {{
        put("education",       "(?i)(education|academic|qualification)");
        put("experience",      "(?i)(experience|work experience|internship|employment)");
        put("skills",          "(?i)(skill|technical skill|technology|competenc)");
        put("projects",        "(?i)(project|personal project|academic project)");
        put("certifications",  "(?i)(certif|course|training|achievement|award)");
        put("objective",       "(?i)(objective|summary|profile|about)");
    }};

    // ── Public API ─────────────────────────────────────────────────────────────

    /**
     * Main entry point — parse an uploaded resume file.
     *
     * @param file  the uploaded PDF or DOCX file
     * @return      structured ParsedResume object
     */
    public ParsedResume parse(MultipartFile file) throws Exception {
        @SuppressWarnings("null")
        String filename = file.getOriginalFilename() != null
            ? file.getOriginalFilename().toLowerCase()
            : "";

        String rawText;
        String format;

        if (filename.endsWith(".pdf")) {
            rawText = extractFromPdf(file.getInputStream());
            format  = "pdf";
        } else if (filename.endsWith(".docx")) {
            rawText = extractFromDocx(file.getInputStream());
            format  = "docx";
        } else {
            throw new IllegalArgumentException("Unsupported file format. Only PDF and DOCX are accepted.");
        }

        log.info("Extracted {} characters from {} file", rawText.length(), format);
        return buildParsedResume(rawText, format);
    }

    // ── Text extraction ────────────────────────────────────────────────────────

    /**
     * Extract plain text from a PDF using Apache PDFBox.
     * PDFTextStripper handles multi-column layouts reasonably well.
     */
   private String extractFromPdf(InputStream inputStream) throws Exception {
    byte[] pdfBytes = inputStream.readAllBytes();

    try (PDDocument document = Loader.loadPDF(pdfBytes)) {
        PDFTextStripper stripper = new PDFTextStripper();
        stripper.setSortByPosition(true);   // preserves reading order
        return stripper.getText(document);
    }
}

    /**
     * Extract plain text from a DOCX using Apache POI.
     * Iterates all paragraphs and joins with newlines.
     */
    private String extractFromDocx(InputStream inputStream) throws Exception {
        try (XWPFDocument document = new XWPFDocument(inputStream)) {
            StringBuilder sb = new StringBuilder();
            for (XWPFParagraph paragraph : document.getParagraphs()) {
                String text = paragraph.getText();
                if (text != null && !text.isBlank()) {
                    sb.append(text).append("\n");
                }
            }
            return sb.toString();
        }
    }

    // ── Structured extraction ──────────────────────────────────────────────────

    /**
     * Given the raw text of a resume, extract all structured fields.
     */
    private ParsedResume buildParsedResume(String rawText, String format) {
        return ParsedResume.builder()
            .rawText(rawText)
            .fileFormat(format)
            .candidateName(extractName(rawText))
            .email(extractEmail(rawText))
            .phone(extractPhone(rawText))
            .skills(extractSkills(rawText))
            .education(extractEducation(rawText))
            .experience(extractExperience(rawText))
            .projects(extractProjects(rawText))
            .certifications(extractCertifications(rawText))
            .detectedSections(detectSections(rawText))
            .build();
    }

    /** Extract candidate name — usually first non-empty line in the resume */
    private String extractName(String text) {
        String[] lines = text.split("\n");
        for (String line : lines) {
            String trimmed = line.trim();
            // Name lines: 2-5 words, all letters/spaces, not all caps (avoid headers)
            if (trimmed.matches("[A-Za-z]+(\\s[A-Za-z]+){1,4}")
                && trimmed.length() > 3
                && !trimmed.toUpperCase().equals(trimmed)) {
                return trimmed;
            }
        }
        return "Unknown";
    }

    /** Extract email using regex */
    private String extractEmail(String text) {
        Matcher m = EMAIL_PATTERN.matcher(text);
        return m.find() ? m.group() : "";
    }

    /** Extract phone number using regex */
    private String extractPhone(String text) {
        Matcher m = PHONE_PATTERN.matcher(text);
        return m.find() ? m.group().replaceAll("[\\s\\-]", "") : "";
    }

    /**
     * Match skill keywords against the resume text.
     * Case-insensitive whole-word matching to avoid false positives.
     */
    private List<String> extractSkills(String text) {
        String lowerText = text.toLowerCase();
        return SKILL_KEYWORDS.stream()
            .filter(skill -> {
                // Build a pattern like \bpython\b for whole-word match
                String pattern = "(?i)\\b" + Pattern.quote(skill) + "\\b";
                return Pattern.compile(pattern).matcher(lowerText).find();
            })
            .collect(Collectors.toList());
    }

    /**
     * Extract education entries — looks for degree + institution patterns
     * in the vicinity of section headings like "Education".
     */
    private List<ParsedResume.EducationEntry> extractEducation(String text) {
        List<ParsedResume.EducationEntry> entries = new ArrayList<>();
        String section = extractSection(text, "education");

        if (section.isEmpty()) return entries;

        // Patterns for degrees
        Pattern degreePattern = Pattern.compile(
            "(?i)(B\\.?Tech|B\\.?E|M\\.?Tech|MBA|BCA|MCA|B\\.?Sc|M\\.?Sc|B\\.?Com|Ph\\.?D)[^\\n]*"
        );
        Matcher m = degreePattern.matcher(section);
        while (m.find()) {
            String line = m.group().trim();

            // Try to extract CGPA from the same vicinity
            String cgpa = "";
            Matcher cgpaMatcher = CGPA_PATTERN.matcher(line);
            if (cgpaMatcher.find()) cgpa = cgpaMatcher.group(2);

            entries.add(ParsedResume.EducationEntry.builder()
                .degree(line)
                .institution("")     // hard to extract reliably without more context
                .cgpa(cgpa)
                .build());
        }

        return entries;
    }

    /**
     * Extract experience / internship entries.
     * Looks for company names and role titles near the experience section.
     */
    private List<ParsedResume.ExperienceEntry> extractExperience(String text) {
        List<ParsedResume.ExperienceEntry> entries = new ArrayList<>();
        String section = extractSection(text, "experience");
        if (section.isEmpty()) return entries;

        // Simple heuristic: split by lines, look for role-like patterns
        Pattern durationPattern = Pattern.compile(
            "(?i)(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\\s,]+\\d{4}"
        );

        String[] lines = section.split("\n");
        for (String line : lines) {
            if (durationPattern.matcher(line).find() || line.matches(".*(?i)(intern|engineer|developer|analyst|trainee).*")) {
                entries.add(ParsedResume.ExperienceEntry.builder()
                    .role(line.trim())
                    .company("")
                    .duration("")
                    .description("")
                    .build());
                if (entries.size() >= 5) break;    // cap at 5 to avoid noise
            }
        }
        return entries;
    }

    /** Extract project names — lines near "Projects" section heading */
    private List<String> extractProjects(String text) {
        String section = extractSection(text, "projects");
        if (section.isEmpty()) return Collections.emptyList();

        List<String> projects = new ArrayList<>();
        // Projects usually start with a title on its own line (title-cased, not too long)
        for (String line : section.split("\n")) {
            String trimmed = line.trim();
            if (!trimmed.isEmpty() && trimmed.length() > 5 && trimmed.length() < 80
                && !trimmed.matches("(?i)(project|description|tech|stack|tool).*")) {
                projects.add(trimmed);
                if (projects.size() >= 6) break;
            }
        }
        return projects;
    }

    /** Extract certifications / courses */
    private List<String> extractCertifications(String text) {
        String section = extractSection(text, "certifications");
        if (section.isEmpty()) return Collections.emptyList();

        List<String> certs = new ArrayList<>();
        for (String line : section.split("\n")) {
            String trimmed = line.trim();
            if (!trimmed.isEmpty() && trimmed.length() > 5) {
                certs.add(trimmed);
                if (certs.size() >= 8) break;
            }
        }
        return certs;
    }

    /** Returns which standard sections were detected in the resume */
    private List<String> detectSections(String text) {
        String lower = text.toLowerCase();
        return SECTION_HEADINGS.entrySet().stream()
            .filter(e -> Pattern.compile(e.getValue()).matcher(lower).find())
            .map(Map.Entry::getKey)
            .collect(Collectors.toList());
    }

    /**
     * Helper: extract the text content belonging to a named section.
     * Finds the section heading, then captures text until the next heading.
     */
    private String extractSection(String text, String sectionKey) {
        String headingRegex = SECTION_HEADINGS.get(sectionKey);
        if (headingRegex == null) return "";

        String[] lines = text.split("\n");
        boolean inSection = false;
        StringBuilder sb = new StringBuilder();

        for (String line : lines) {
            if (Pattern.compile(headingRegex).matcher(line).find()) {
                inSection = true;
                continue;
            }
            // Stop when another section heading appears
            if (inSection) {
                boolean isNewSection = SECTION_HEADINGS.values().stream()
                    .filter(r -> !r.equals(headingRegex))
                    .anyMatch(r -> Pattern.compile(r).matcher(line).find());
                if (isNewSection) break;
                sb.append(line).append("\n");
            }
        }
        return sb.toString();
    }
}
