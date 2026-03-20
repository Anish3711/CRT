-- 05_fix_admin_dashboard.sql
-- Fix schema to support admin dashboard data

-- Add missing fields to guest_attempts table
ALTER TABLE guest_attempts 
ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS correct_answers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS wrong_answers INTEGER DEFAULT 0;

-- Rename input column to input_data for consistency with API
ALTER TABLE test_cases 
RENAME COLUMN input TO input_data;

-- Create guest_attempt_answers table to track answers for guest students
CREATE TABLE IF NOT EXISTS guest_attempt_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_attempt_id UUID NOT NULL REFERENCES guest_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  selected_mcq_option_id UUID REFERENCES mcq_options(id) ON DELETE SET NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_guest_attempt_answers_attempt ON guest_attempt_answers(guest_attempt_id);
CREATE INDEX IF NOT EXISTS idx_guest_attempt_answers_question ON guest_attempt_answers(question_id);
