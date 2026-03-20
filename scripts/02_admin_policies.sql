-- 02_admin_policies.sql
-- These policies allow the Admin portal (using the public anon key or authenticated as an admin)
-- to bypass Row Level Security (RLS) and read/write all data, 
-- or you can simply disable RLS temporarily for development.

-- OPTION 1: For local development and testing, completely disable RLS on core tables:
-- (Uncomment these if you just want it to work immediately without setting up admin users)

/*
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE mcq_options DISABLE ROW LEVEL SECURITY;
ALTER TABLE coding_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases DISABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE screen_recordings DISABLE ROW LEVEL SECURITY;
*/


-- OPTION 2: Production Safe - Add bypass policies
-- Because the admin portal doesn't use Supabase Auth yet (it uses a fake /page.tsx login),
-- the calls are made "anonymously".
-- WARNING: This exposes data to ANYONE with the anon key. 
-- In a real app, create a "role = 'admin'" check setup.

CREATE POLICY "Allow anon admins to view all students" ON students FOR SELECT USING (true);
CREATE POLICY "Allow anon admins to update students" ON students FOR UPDATE USING (true);
CREATE POLICY "Allow anon admins to delete students" ON students FOR DELETE USING (true);

CREATE POLICY "Allow anon admins full access on exams" ON exams FOR ALL USING (true);
CREATE POLICY "Allow anon admins full access on questions" ON questions FOR ALL USING (true);
CREATE POLICY "Allow anon admins full access on mcq_options" ON mcq_options FOR ALL USING (true);
CREATE POLICY "Allow anon admins full access on coding_questions" ON coding_questions FOR ALL USING (true);
CREATE POLICY "Allow anon admins full access on test_cases" ON test_cases FOR ALL USING (true);

CREATE POLICY "Allow anon admins full access on exam_sessions" ON exam_sessions FOR ALL USING (true);
CREATE POLICY "Allow anon admins full access on student_answers" ON student_answers FOR ALL USING (true);
CREATE POLICY "Allow anon admins full access on exam_results" ON exam_results FOR ALL USING (true);
CREATE POLICY "Allow anon admins full access on activity_logs" ON activity_logs FOR ALL USING (true);
CREATE POLICY "Allow anon admins full access on screen_recordings" ON screen_recordings FOR ALL USING (true);
