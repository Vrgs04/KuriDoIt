ALTER TABLE questions ADD COLUMN special_type TEXT
  CHECK(special_type IS NULL OR special_type = 'EXACT_SCORE');
