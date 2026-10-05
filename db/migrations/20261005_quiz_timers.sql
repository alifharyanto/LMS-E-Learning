ALTER TABLE quiz_categories
  ADD COLUMN time_limit_minutes SMALLINT UNSIGNED NULL DEFAULT NULL;

CREATE TABLE quiz_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  time_limit_minutes SMALLINT UNSIGNED NOT NULL,
  questions_snapshot JSON NOT NULL,
  answers JSON NOT NULL,
  status ENUM('in_progress', 'submitted', 'expired') NOT NULL DEFAULT 'in_progress',
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  submitted_at DATETIME NULL,
  result_id BIGINT UNSIGNED NULL,
  PRIMARY KEY (id),
  KEY idx_quiz_attempts_user_category (user_id, category_id, id),
  KEY idx_quiz_attempts_status_expiration (status, expires_at),
  KEY idx_quiz_attempts_result (result_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;