export type Exam = {
  id: string
  title: string
  description: string
  type: "mcq" | "coding" | "mixed"
  duration: number
  startTime: string
  endTime: string
  maxAttempts: number
  status: "draft" | "published" | "active" | "completed"
  questionCount: number
  security: SecuritySettings
  createdAt: string
}

export type SecuritySettings = {
  forceFullscreen: boolean
  cancelOnTabSwitch: boolean
  disableCopyPaste: boolean
  disableRightClick: boolean
  disableDevTools: boolean
  enableScreenRecording: boolean
  enableWebcamMonitoring: boolean
  randomizeQuestions: boolean
  randomizeTestCases: boolean
  maxTabSwitches: number
  warningMessage: string
}

export type MCQQuestion = {
  id: string
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctAnswer: "A" | "B" | "C" | "D"
  examId: string
  createdAt: string
}

export type TestCase = {
  id: string
  input: string
  expectedOutput: string
  isHidden: boolean
}

export type CodingProblem = {
  id: string
  title: string
  description: string
  inputFormat: string
  outputFormat: string
  constraints: string
  sampleInput: string
  sampleOutput: string
  testCases: TestCase[]
  allowedLanguages: string[]
  timeLimit: number
  memoryLimit: number
  examId: string
  createdAt: string
}

export type ActivityLog = {
  id: string
  type: "tab_switch" | "fullscreen_exit" | "copy_attempt" | "paste_attempt" | string
  timestamp: string
  description: string
}

export type StudentAttempt = {
  id: string
  studentName: string
  rollNumber: string
  examId: string
  examName: string
  currentQuestion: number
  totalQuestions: number
  suspiciousCount: number
  status: "active" | "completed" | "terminated"
  score: number
  correctAnswers: number
  wrongAnswers: number
  timeTaken: string
  submissionTime: string
  activityLogs: ActivityLog[]
  passingScore?: number
}

export type CodingSubmission = {
  id: string
  studentName: string
  problemTitle: string
  language: string
  code: string
  testCasesPassed: number
  testCasesFailed: number
  executionTime: string
  memoryUsage: string
}

export type AttendanceRecord = {
  department: "CSM"
  rollNumber: string
  studentName: string | null
  status: "present" | "absent"
  lastSeenAt: string | null
  attemptStatus: string | null
}

export type DashboardStats = {
  totalExams: number
  activeExams: number
  totalStudents: number
  averageScore: number
  recentExams: Exam[]
  recentAttempts: StudentAttempt[]
}

export const defaultSecurity: SecuritySettings = {
  forceFullscreen: true,
  cancelOnTabSwitch: true,
  disableCopyPaste: true,
  disableRightClick: true,
  disableDevTools: true,
  enableScreenRecording: true,
  enableWebcamMonitoring: true,
  randomizeQuestions: true,
  randomizeTestCases: false,
  maxTabSwitches: 2,
  warningMessage: "Warning: Suspicious activity detected. Further violations will terminate your exam.",
}
