-- ═══════════════════════════════════════════════════════════════════════════
-- PRAGATI Resume Parser — MySQL Schema
-- Executed automatically by Spring Boot on service startup.
-- All statements are idempotent (IF NOT EXISTS) so restarts are safe.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Table 1: parsed_resumes ───────────────────────────────────────────────
-- Stores every successfully parsed resume with all extracted structured data.
-- PRIMARY KEY: id — BIGINT AUTO_INCREMENT (MySQL auto-generated PK)
CREATE TABLE IF NOT EXISTS parsed_resumes (
    id                    BIGINT          NOT NULL AUTO_INCREMENT,
    file_name             VARCHAR(255)    NOT NULL,
    file_format           VARCHAR(10)     NOT NULL  COMMENT 'pdf or docx',
    file_size_bytes       BIGINT,
    candidate_name        VARCHAR(255),
    email                 VARCHAR(255),
    phone                 VARCHAR(50),
    skills_json           LONGTEXT                  COMMENT 'JSON array of skill strings',
    education_json        LONGTEXT                  COMMENT 'JSON array of EducationEntry',
    experience_json       LONGTEXT                  COMMENT 'JSON array of ExperienceEntry',
    projects_json         LONGTEXT                  COMMENT 'JSON array of project strings',
    certifications_json   LONGTEXT                  COMMENT 'JSON array of certification strings',
    detected_sections_json LONGTEXT                 COMMENT 'JSON array of detected section names',
    skill_count           INT             DEFAULT 0,
    parsed_at             DATETIME        DEFAULT CURRENT_TIMESTAMP,
    parsing_duration_ms   BIGINT          COMMENT 'How long parsing took in milliseconds',
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Table 2: extracted_skills ─────────────────────────────────────────────
-- One row per skill per resume.
-- FOREIGN KEY → parsed_resumes.id (CASCADE DELETE)
-- Enables GROUP BY queries to find top skills across all parsed resumes.
CREATE TABLE IF NOT EXISTS extracted_skills (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    resume_id   BIGINT       NOT NULL,
    skill       VARCHAR(100) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (resume_id) REFERENCES parsed_resumes(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    INDEX idx_resume_id (resume_id),
    INDEX idx_skill     (skill)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Table 3: parse_audit_log ──────────────────────────────────────────────
-- Every call to POST /parse is recorded — success or failure.
-- FOREIGN KEY → parsed_resumes.id (SET NULL on delete — keeps the log even
--               if the resume record is deleted)
CREATE TABLE IF NOT EXISTS parse_audit_log (
    id             BIGINT        NOT NULL AUTO_INCREMENT,
    resume_id      BIGINT                 COMMENT 'NULL when parsing failed before DB insert',
    file_name      VARCHAR(255),
    file_format    VARCHAR(10),
    status         VARCHAR(20)   NOT NULL COMMENT 'SUCCESS or FAILURE',
    error_message  VARCHAR(1000),
    skills_found   INT           DEFAULT 0,
    duration_ms    BIGINT,
    client_ip      VARCHAR(50),
    called_at      DATETIME      DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (resume_id) REFERENCES parsed_resumes(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    INDEX idx_status    (status),
    INDEX idx_called_at (called_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Table 4: parser_stats ─────────────────────────────────────────────────
-- Single-row aggregate counters (id = 1 always).
-- Updated with every parse call — demonstrates UPDATE in JDBC.
CREATE TABLE IF NOT EXISTS parser_stats (
    id                      INT    NOT NULL DEFAULT 1,
    total_parses            BIGINT DEFAULT 0,
    total_success           BIGINT DEFAULT 0,
    total_failure           BIGINT DEFAULT 0,
    total_skills_extracted  BIGINT DEFAULT 0,
    last_updated            DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed the single stats row using MySQL syntax:
-- INSERT ... ON DUPLICATE KEY UPDATE means:
--   • If row with id=1 does NOT exist → INSERT it
--   • If it DOES exist → do nothing (update id=id is a no-op)
-- This is MySQL's equivalent of H2's MERGE / UPSERT.
INSERT INTO parser_stats (id, total_parses, total_success, total_failure, total_skills_extracted)
VALUES (1, 0, 0, 0, 0)
ON DUPLICATE KEY UPDATE id = id;
