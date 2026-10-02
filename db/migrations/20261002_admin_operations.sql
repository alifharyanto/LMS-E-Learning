ALTER TABLE users
  ADD COLUMN account_status ENUM('active', 'suspended') NOT NULL DEFAULT 'active',
  ADD COLUMN session_version INT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN last_active_at DATETIME NULL,
  ADD INDEX idx_users_account_activity (account_status, last_active_at);

ALTER TABLE materials
  ADD COLUMN publication_status ENUM('draft', 'published') NOT NULL DEFAULT 'published';

ALTER TABLE contacts
  ADD COLUMN workflow_status ENUM('new', 'in_progress', 'resolved') NOT NULL DEFAULT 'new',
  ADD COLUMN admin_notes TEXT NULL;

CREATE TABLE admin_audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id BIGINT UNSIGNED NULL,
  details JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_admin_audit_created (created_at),
  KEY idx_admin_audit_entity (entity_type, entity_id),
  KEY idx_admin_audit_actor (actor_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE quiz_question_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  result_id BIGINT UNSIGNED NOT NULL,
  question_id BIGINT UNSIGNED NOT NULL,
  selected_index TINYINT UNSIGNED NOT NULL,
  is_correct TINYINT(1) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_quiz_attempt_question (result_id, question_id),
  KEY idx_quiz_attempt_question (question_id, is_correct),
  KEY idx_quiz_attempt_result (result_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE student_roster (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  no_absen SMALLINT UNSIGNED NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  class_name VARCHAR(100) NOT NULL DEFAULT 'XI RPL',
  gender ENUM('L', 'P') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_student_roster_class_attendance (class_name, no_absen),
  KEY idx_student_roster_class_name (class_name, full_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
