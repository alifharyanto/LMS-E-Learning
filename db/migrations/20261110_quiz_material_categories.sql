ALTER TABLE quiz_categories
  ADD COLUMN material_category VARCHAR(100) NULL AFTER name,
  ADD COLUMN description TEXT NULL AFTER material_category,
  ADD KEY idx_quiz_categories_material_category (material_category);
