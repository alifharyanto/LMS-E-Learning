ALTER TABLE quiz_categories
  ADD COLUMN question_type ENUM('pilihan', 'essay') NOT NULL DEFAULT 'pilihan';

ALTER TABLE quiz_questions
  ADD COLUMN question_type ENUM('pilihan', 'essay') NOT NULL DEFAULT 'pilihan' AFTER category_id,
  MODIFY answer_index TINYINT UNSIGNED NULL DEFAULT NULL,
  MODIFY option_a VARCHAR(255) NULL DEFAULT NULL,
  MODIFY option_b VARCHAR(255) NULL DEFAULT NULL,
  MODIFY option_c VARCHAR(255) NULL DEFAULT NULL,
  MODIFY option_d VARCHAR(255) NULL DEFAULT NULL;

ALTER TABLE quiz_question_attempts
  MODIFY selected_index TINYINT UNSIGNED NULL DEFAULT NULL,
  MODIFY is_correct TINYINT(1) NULL DEFAULT NULL;
