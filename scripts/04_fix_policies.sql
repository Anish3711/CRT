-- 04_fix_policies.sql
-- Replace overly permissive development policies with narrower ones.

-- Drop previous policies created by earlier iterations.
DROP POLICY IF EXISTS "Students can view their own record" ON students;
DROP POLICY IF EXISTS "Students can update their own record" ON students;
DROP POLICY IF EXISTS "Exams are readable by all authenticated users" ON exams;
DROP POLICY IF EXISTS "Students can view their own exam sessions" ON exam_sessions;
DROP POLICY IF EXISTS "Students can insert their own exam sessions" ON exam_sessions;
DROP POLICY IF EXISTS "Students can update their own exam sessions" ON exam_sessions;
DROP POLICY IF EXISTS "Students can view their own answers" ON student_answers;
DROP POLICY IF EXISTS "Students can insert their own answers" ON student_answers;
DROP POLICY IF EXISTS "Students can update their own answers" ON student_answers;
DROP POLICY IF EXISTS "Students can view their own activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Students can insert their own activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Students can view their own exam results" ON exam_results;
DROP POLICY IF EXISTS "Students can view their own recordings" ON screen_recordings;
DROP POLICY IF EXISTS "Students can insert their own recordings" ON screen_recordings;
DROP POLICY IF EXISTS "Anyone can insert attempts" ON guest_attempts;
DROP POLICY IF EXISTS "Anyone can update their attempt" ON guest_attempts;
DROP POLICY IF EXISTS "Admins can read all attempts" ON guest_attempts;
DROP POLICY IF EXISTS "full_access_students" ON students;
DROP POLICY IF EXISTS "full_access_exams" ON exams;
DROP POLICY IF EXISTS "full_access_questions" ON questions;
DROP POLICY IF EXISTS "full_access_mcq_options" ON mcq_options;
DROP POLICY IF EXISTS "full_access_coding_questions" ON coding_questions;
DROP POLICY IF EXISTS "full_access_test_cases" ON test_cases;
DROP POLICY IF EXISTS "full_access_exam_sessions" ON exam_sessions;
DROP POLICY IF EXISTS "full_access_student_answers" ON student_answers;
DROP POLICY IF EXISTS "full_access_exam_results" ON exam_results;
DROP POLICY IF EXISTS "full_access_activity_logs" ON activity_logs;
DROP POLICY IF EXISTS "full_access_screen_recordings" ON screen_recordings;
DROP POLICY IF EXISTS "full_access_guest_attempts" ON guest_attempts;

-- Public read access for exam delivery content.
CREATE POLICY "public_read_exams" ON exams FOR SELECT USING (true);
CREATE POLICY "public_read_questions" ON questions FOR SELECT USING (true);
CREATE POLICY "public_read_mcq_options" ON mcq_options FOR SELECT USING (true);
CREATE POLICY "public_read_coding_questions" ON coding_questions FOR SELECT USING (true);
CREATE POLICY "public_read_test_cases" ON test_cases FOR SELECT USING (true);

-- Guest exam attempt lifecycle.
CREATE POLICY "guest_attempt_insert" ON guest_attempts FOR INSERT WITH CHECK (true);
CREATE POLICY "guest_attempt_update" ON guest_attempts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "guest_attempt_read" ON guest_attempts FOR SELECT USING (true);

-- Supporting writes used by exam monitoring flows.
CREATE POLICY "activity_logs_insert" ON activity_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "screen_recordings_insert" ON screen_recordings FOR INSERT WITH CHECK (true);

-- Keep schema support columns in place for the current app behavior.
ALTER TABLE guest_attempts ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '{}'::jsonb;
ALTER TABLE guest_attempts ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;
ALTER TABLE guest_attempts ADD COLUMN IF NOT EXISTS total_questions INTEGER DEFAULT 0;
ALTER TABLE guest_attempts ADD COLUMN IF NOT EXISTS correct_answers INTEGER DEFAULT 0;
ALTER TABLE guest_attempts ADD COLUMN IF NOT EXISTS wrong_answers INTEGER DEFAULT 0;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
