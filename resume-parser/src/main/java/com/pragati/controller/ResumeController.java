package com.pragati.controller;

import com.pragati.model.ParsedResume;
import com.pragati.service.ResumeParserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * ResumeController
 *
 * Exposes HTTP endpoints for PRAGATI's resume parsing microservice.
 *
 * Endpoints:
 *   GET  /health          → liveness check (used by Docker healthcheck)
 *   POST /parse           → accepts multipart resume, returns structured JSON
 *
 * Called by PRAGATI's Node.js backend at RESUME_PARSER_URL/parse
 * before passing raw text to the Python ML service.
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = "*")    // allow calls from Node.js backend in same Docker network
public class ResumeController {

    private final ResumeParserService parserService;

    /** Simple health check — Docker and Node.js backend poll this */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
            "status",  "ok",
            "service", "PRAGATI Resume Parser",
            "version", "1.0.0"
        ));
    }

    /**
     * Parse a resume file.
     *
     * Accepts: multipart/form-data with field name "resume" (PDF or DOCX)
     * Returns: JSON — ParsedResume structure
     *
     * Example curl:
     *   curl -F "resume=@myresume.pdf" http://localhost:8080/parse
     */
    @PostMapping(value = "/parse", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> parseResume(@RequestParam("resume") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(
                Map.of("error", "Resume file is required")
            );
        }

        @SuppressWarnings("null")
        String filename = file.getOriginalFilename() != null
            ? file.getOriginalFilename().toLowerCase()
            : "";

        if (!filename.endsWith(".pdf") && !filename.endsWith(".docx")) {
            return ResponseEntity.badRequest().body(
                Map.of("error", "Only PDF and DOCX files are supported")
            );
        }

        log.info("Parsing resume: {} ({} bytes)", file.getOriginalFilename(), file.getSize());

        try {
            ParsedResume result = parserService.parse(file);
            log.info("Parsed successfully — found {} skills, {} education entries",
                result.getSkills().size(), result.getEducation().size());
            return ResponseEntity.ok(result);

        } catch (IllegalArgumentException e) {
            log.warn("Bad request: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));

        } catch (Exception e) {
            log.error("Parse failed: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(
                Map.of("error", "Failed to parse resume: " + e.getMessage())
            );
        }
    }
}
