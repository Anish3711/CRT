-- 06_extend_coding_questions.sql
-- Extend coding_questions table with additional metadata fields

ALTER TABLE coding_questions
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS input_format TEXT,
ADD COLUMN IF NOT EXISTS output_format TEXT,
ADD COLUMN IF NOT EXISTS constraints TEXT,
ADD COLUMN IF NOT EXISTS time_limit INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS memory_limit INTEGER DEFAULT 256;

-- Set default values for existing records
UPDATE coding_questions SET
  title = 'Untitled',
  description = '',
  input_format = '',
  output_format = '',
  constraints = '',
  time_limit = 2,
  memory_limit = 256
WHERE title IS NULL;
