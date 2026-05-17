package com.pragati;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * PRAGATI Resume Parser Service
 *
 * Stateless Spring Boot microservice that:
 *  - Accepts PDF or DOCX resume file uploads
 *  - Extracts raw text using Apache PDFBox / Apache POI
 *  - Identifies skills, education, experience sections via regex + keyword matching
 *  - Returns structured JSON — no state, no database
 *
 * Called by the Node.js backend before forwarding to the Python ML service.
 * Port: 8080
 */
@SpringBootApplication
public class ResumeParserApplication {

    public static void main(String[] args) {
        SpringApplication.run(ResumeParserApplication.class, args);
    }
}
