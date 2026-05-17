package com.pragati.model;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Structured data extracted from a resume file.
 * This is the JSON response returned by the parser to Node.js.
 */
@Data
@Builder
public class ParsedResume {

    /** Candidate's full name — extracted from the top of the resume */
    private String candidateName;

    /** Email address found in the resume */
    private String email;

    /** Phone number */
    private String phone;

    /** List of technical and soft skills identified */
    private List<String> skills;

    /** Detected education entries */
    private List<EducationEntry> education;

    /** Work experience / internship entries */
    private List<ExperienceEntry> experience;

    /** Project titles and descriptions */
    private List<String> projects;

    /** Certifications or courses listed */
    private List<String> certifications;

    /** Raw full text — passed to the Python ML service for NLP */
    private String rawText;

    /** Which sections were found (education, experience, skills, projects, ...) */
    private List<String> detectedSections;

    /** File format that was parsed: pdf or docx */
    private String fileFormat;

    // ── Nested DTOs ────────────────────────────────────────────────────────────

    @Data
    @Builder
    public static class EducationEntry {
        private String degree;
        private String institution;
        private String year;
        private String cgpa;
    }

    @Data
    @Builder
    public static class ExperienceEntry {
        private String company;
        private String role;
        private String duration;
        private String description;
    }
}
