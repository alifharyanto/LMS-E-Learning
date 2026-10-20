ALTER TABLE quiz_results
  ADD COLUMN questions_snapshot JSON NULL,
  ADD COLUMN answers JSON NULL;
