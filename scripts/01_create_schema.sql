-- SecureCRT Exam Portal Database Schema

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  enrollment_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create exams table
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  passing_score INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'coding')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  points INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create MCQ options table
CREATE TABLE IF NOT EXISTS mcq_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  option_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create coding questions details table
CREATE TABLE IF NOT EXISTS coding_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  language TEXT NOT NULL CHECK (language IN ('python', 'java', 'cpp', 'javascript')),
  starter_code TEXT,
  solution_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create test cases table
CREATE TABLE IF NOT EXISTS test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coding_question_id UUID NOT NULL REFERENCES coding_questions(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create exam sessions table (tracks student attempts)
CREATE TABLE IF NOT EXISTS exam_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'abandoned')) DEFAULT 'in_progress',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create student answers table
CREATE TABLE IF NOT EXISTS student_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  selected_mcq_option_id UUID REFERENCES mcq_options(id) ON DELETE SET NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create exam results table
CREATE TABLE IF NOT EXISTS exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL,
  earned_points INTEGER NOT NULL,
  percentage_score DECIMAL(5,2) NOT NULL,
  passed BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('tab_switch', 'fullscreen_exit', 'copy_attempt', 'paste_attempt', 'code_submission', 'answer_change', 'idle', 'other')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')) DEFAULT 'low',
  description TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create screen recordings metadata table
CREATE TABLE IF NOT EXISTS screen_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  blob_url TEXT,
  duration_seconds INTEGER,
  file_size_bytes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcq_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE coding_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE screen_recordings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for students table
CREATE POLICY "Students can view their own record" ON students
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Students can update their own record" ON students
  FOR UPDATE USING (auth.uid()::text = id::text);

-- RLS Policies for exams (read-only for students)
CREATE POLICY "Exams are readable by all authenticated users" ON exams
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for exam_sessions (students can only see their own)
CREATE POLICY "Students can view their own exam sessions" ON exam_sessions
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can insert their own exam sessions" ON exam_sessions
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their own exam sessions" ON exam_sessions
  FOR UPDATE USING (student_id = auth.uid());

-- RLS Policies for student_answers (students can see/modify their own answers)
CREATE POLICY "Students can view their own answers" ON student_answers
  FOR SELECT USING (
    exam_session_id IN (
      SELECT id FROM exam_sessions WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "Students can insert their own answers" ON student_answers
  FOR INSERT WITH CHECK (
    exam_session_id IN (
      SELECT id FROM exam_sessions WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "Students can update their own answers" ON student_answers
  FOR UPDATE USING (
    exam_session_id IN (
      SELECT id FROM exam_sessions WHERE student_id = auth.uid()
    )
  );

-- RLS Policies for activity_logs
CREATE POLICY "Students can view their own activity logs" ON activity_logs
  FOR SELECT USING (
    exam_session_id IN (
      SELECT id FROM exam_sessions WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "Students can insert their own activity logs" ON activity_logs
  FOR INSERT WITH CHECK (
    exam_session_id IN (
      SELECT id FROM exam_sessions WHERE student_id = auth.uid()
    )
  );

-- RLS Policies for exam_results
CREATE POLICY "Students can view their own exam results" ON exam_results
  FOR SELECT USING (
    exam_session_id IN (
      SELECT id FROM exam_sessions WHERE student_id = auth.uid()
    )
  );

-- RLS Policies for screen_recordings
CREATE POLICY "Students can view their own recordings" ON screen_recordings
  FOR SELECT USING (
    exam_session_id IN (
      SELECT id FROM exam_sessions WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "Students can insert their own recordings" ON screen_recordings
  FOR INSERT WITH CHECK (
    exam_session_id IN (
      SELECT id FROM exam_sessions WHERE student_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_questions_exam_id ON questions(exam_id);
CREATE INDEX idx_mcq_options_question_id ON mcq_options(question_id);
CREATE INDEX idx_coding_questions_question_id ON coding_questions(question_id);
CREATE INDEX idx_test_cases_coding_question_id ON test_cases(coding_question_id);
CREATE INDEX idx_exam_sessions_student_id ON exam_sessions(student_id);
CREATE INDEX idx_exam_sessions_exam_id ON exam_sessions(exam_id);
CREATE INDEX idx_student_answers_exam_session_id ON student_answers(exam_session_id);
CREATE INDEX idx_student_answers_question_id ON student_answers(question_id);
CREATE INDEX idx_activity_logs_exam_session_id ON activity_logs(exam_session_id);
CREATE INDEX idx_screen_recordings_exam_session_id ON screen_recordings(exam_session_id);
