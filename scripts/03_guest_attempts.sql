-- 03_guest_attempts.sql
-- Table for storing student exam attempts (no auth required)

CREATE TABLE IF NOT EXISTS guest_attempts (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  roll_no TEXT NOT NULL,
  year TEXT NOT NULL,
  section TEXT NOT NULL,
  mobile TEXT NOT NULL,
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'submitted', 'terminated')),
  violations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Allow public (anon) access since students are not authenticated
ALTER TABLE guest_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert attempts" ON guest_attempts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update their attempt" ON guest_attempts FOR UPDATE USING (true);
CREATE POLICY "Admins can read all attempts" ON guest_attempts FOR SELECT USING (true);

-- Index for fast lookup by exam
CREATE INDEX idx_guest_attempts_exam_id ON guest_attempts(exam_id);
CREATE INDEX idx_guest_attempts_status ON guest_attempts(status);
