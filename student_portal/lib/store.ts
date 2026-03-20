// Re-export types from the API module for backward compatibility
export type {
  Exam,
  SecuritySettings,
  MCQQuestion,
  TestCase,
  CodingProblem,
  StudentAttempt,
  ActivityLog,
  CodingSubmission,
} from "@/lib/api-client"

export { defaultSecurity } from "@/lib/api-client"
