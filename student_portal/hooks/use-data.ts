import useSWR from "swr"
import type {
  Exam,
  MCQQuestion,
  CodingProblem,
  StudentAttempt,
  CodingSubmission,
  DashboardStats,
} from "@/lib/api-client"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Fetch error: ${res.status}`)
  }
  return res.json()
}

// ---- Dashboard ----
export function useDashboardStats() {
  return useSWR<DashboardStats>("/api/dashboard/stats", fetcher, {
    refreshInterval: 10000, // refresh every 10s for real-time
    revalidateOnFocus: true,
  })
}

// ---- Exams ----
export function useExams() {
  return useSWR<Exam[]>("/api/exams", fetcher, {
    refreshInterval: 15000,
    revalidateOnFocus: true,
  })
}

export function useExam(id: string | null) {
  return useSWR<Exam>(id ? `/api/exams/${id}` : null, fetcher)
}

// ---- Questions (per-exam) ----
export function useExamQuestions(examId: string | null) {
  return useSWR<MCQQuestion[]>(
    examId ? `/api/exams/${examId}/questions` : null,
    fetcher,
    { refreshInterval: 10000 }
  )
}

// ---- Coding Problems (per-exam) ----
export function useExamCoding(examId: string | null) {
  return useSWR<CodingProblem[]>(
    examId ? `/api/exams/${examId}/coding` : null,
    fetcher,
    { refreshInterval: 10000 }
  )
}

// ---- Monitoring ----
export function useMonitoring(examId?: string) {
  const url = examId ? `/api/monitoring?examId=${examId}` : "/api/monitoring"
  return useSWR<StudentAttempt[]>(url, fetcher, {
    refreshInterval: 5000, // 5s for real-time monitoring
    revalidateOnFocus: true,
  })
}

// ---- Results ----
export function useResults(examId?: string) {
  const url = examId ? `/api/results?examId=${examId}` : "/api/results"
  return useSWR<StudentAttempt[]>(url, fetcher, {
    refreshInterval: 15000,
    revalidateOnFocus: true,
  })
}

export function useCodingSubmissions(examId?: string) {
  const url = examId
    ? `/api/results/coding?examId=${examId}`
    : "/api/results/coding"
  return useSWR<CodingSubmission[]>(url, fetcher, {
    refreshInterval: 15000,
    revalidateOnFocus: true,
  })
}
