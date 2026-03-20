// Re-export the client creator function for backwards compatibility
export { createClient } from './supabase/client'

// Create a singleton instance for use in contexts (client-side only)
import { createClient as createBrowserClient } from './supabase/client'

let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null

export function getSupabase() {
  if (typeof window === 'undefined') {
    // Server-side: always create a new instance
    return createBrowserClient()
  }
  // Client-side: use singleton
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient()
  }
  return supabaseInstance
}

// For backwards compatibility - use getSupabase() in new code
export const supabase: ReturnType<typeof createBrowserClient> | null =
  typeof window !== 'undefined' ? createBrowserClient() : null

export type Student = {
  id: string
  email: string
  full_name: string
  enrollment_id: string | null
  created_at: string
}

export type Exam = {
  id: string
  title: string
  description: string | null
  duration_minutes: number
  total_questions: number
  passing_score: number
  created_at: string
}

export type Question = {
  id: string
  exam_id: string
  question_text: string
  question_type: 'mcq' | 'coding'
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
  order_index: number
  created_at: string
}

export type MCQOption = {
  id: string
  question_id: string
  option_text: string
  is_correct: boolean
  option_key: string
  created_at: string
}

export type CodingQuestion = {
  id: string
  question_id: string
  language: 'python' | 'java' | 'cpp' | 'javascript'
  allowed_languages?: string[]
  starter_code: string | null
  solution_code: string | null
  created_at: string
}

export type TestCase = {
  id: string
  coding_question_id: string
  input: string
  input_data?: string
  expected_output: string
  is_visible: boolean
  created_at: string
}

export type ExamSession = {
  id: string
  student_id: string
  exam_id: string
  started_at: string
  completed_at: string | null
  status: 'in_progress' | 'completed' | 'abandoned'
  created_at: string
}

export type StudentAnswer = {
  id: string
  exam_session_id: string
  question_id: string
  answer_text: string | null
  selected_mcq_option_id: string | null
  submitted_at: string
  created_at: string
}

export type ExamResult = {
  id: string
  exam_session_id: string
  total_points: number
  earned_points: number
  percentage_score: number
  passed: boolean
  created_at: string
}

export type ActivityLog = {
  id: string
  exam_session_id: string
  activity_type: 'tab_switch' | 'fullscreen_exit' | 'copy_attempt' | 'paste_attempt' | 'code_submission' | 'answer_change' | 'idle' | 'other'
  severity: 'low' | 'medium' | 'high'
  description: string | null
  timestamp: string
  created_at: string
}

export type ScreenRecording = {
  id: string
  exam_session_id: string
  blob_url: string | null
  duration_seconds: number | null
  file_size_bytes: number | null
  created_at: string
}
