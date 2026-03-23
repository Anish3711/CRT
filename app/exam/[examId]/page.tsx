'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useExam } from '@/app/contexts/exam-context'
import type { Question, MCQOption, CodingQuestion, TestCase, Exam } from '@/lib/supabase'
import { ExamTimer } from '@/components/exam/exam-timer'
import { QuestionNavigator } from '@/components/exam/question-navigator'
import { MCQQuestion } from '@/components/exam/mcq-question'
import { CodeEditor, type CodeValidationFeedback } from '@/components/exam/code-editor'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Camera, Monitor, ShieldAlert } from 'lucide-react'
import {
  useActivityDetection,
  useFullscreenEnforcement,
  useMediaProctoring,
  type SuspiciousActivity,
} from '@/app/hooks/use-exam-hooks'

type SecuritySettings = {
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

const defaultSecuritySettings: SecuritySettings = {
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
  warningMessage: 'Warning: Suspicious activity detected. Further violations will terminate your exam.',
}

function getAttemptStorageKey(attemptId: string, key: string) {
  return `exam:${attemptId}:${key}`
}

function readJsonFromStorage<T>(key: string, fallback: T) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function isAnswerMap(value: unknown): value is Record<string, string> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function mapStoredViolation(value: unknown): SuspiciousActivity | null {
  if (!value || typeof value !== 'object') return null

  const violation = value as Record<string, unknown>
  const type = typeof violation.type === 'string' ? violation.type : 'other'
  const timestamp = typeof violation.timestamp === 'string' ? violation.timestamp : new Date().toISOString()
  const severity = violation.severity === 'low' || violation.severity === 'medium' || violation.severity === 'high'
    ? violation.severity
    : 'medium'

  return {
    id: typeof violation.id === 'string' ? violation.id : `${type}-${timestamp}`,
    activity_type: type,
    severity,
    description: typeof violation.description === 'string' ? violation.description : null,
    timestamp,
  }
}

type SecuritySetupItem = {
  label: string
  ready: boolean
}

export default function ExamPage() {
  const params = useParams()
  const router = useRouter()
  const { currentExam, setCurrentExam } = useExam()
  const examId = params.examId as string

  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [examInfo, setExamInfo] = useState<Exam | null>(currentExam)
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(defaultSecuritySettings)
  const [questions, setQuestions] = useState<Question[]>([])
  const [mcqOptions, setMcqOptions] = useState<Record<string, MCQOption[]>>({})
  const [codingQuestionsMap, setCodingQuestionsMap] = useState<Record<string, CodingQuestion>>({})
  const [testCasesMap, setTestCasesMap] = useState<Record<string, TestCase[]>>({})
  const [initialTimeRemainingSeconds, setInitialTimeRemainingSeconds] = useState(60 * 60)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({})
  const [selectedLanguages, setSelectedLanguages] = useState<Record<string, string>>({})
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set())
  const [initialSuspiciousActivities, setInitialSuspiciousActivities] = useState<SuspiciousActivity[]>([])
  const [isAttemptStateHydrated, setIsAttemptStateHydrated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [securityNotice, setSecurityNotice] = useState('')
  const [codeValidationFeedback, setCodeValidationFeedback] = useState<CodeValidationFeedback | null>(null)

  const { containerRef, isFullscreen, requestFullscreen, exitFullscreen } = useFullscreenEnforcement(true)
  const { flushLogs, suspiciousActivities, recordActivity } = useActivityDetection(
    attemptId,
    true,
    initialSuspiciousActivities,
    {
      disableCopyPaste: securitySettings.disableCopyPaste,
      disableRightClick: securitySettings.disableRightClick,
    }
  )

  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const autoSubmittedRef = useRef(false)
  const fullscreenViolationLoggedRef = useRef(false)
  const secureSessionActivatedRef = useRef(false)
  const webcamPreviewRef = useRef<HTMLVideoElement | null>(null)

  const handleProctoringIncident = useCallback((message: string, activityType: string) => {
    setSecurityNotice(message)
    recordActivity({
      type: activityType,
      severity: 'high',
      description: message,
      timestamp: new Date().toISOString(),
    })
  }, [recordActivity])

  const {
    isRecording: isScreenRecording,
    error: screenRecordingError,
    startRecording: startScreenRecording,
    stopRecording: stopScreenRecording,
  } = useMediaProctoring({
    sessionId: attemptId,
    enabled: securitySettings.enableScreenRecording,
    kind: 'screen',
    onIncident: (incident) => {
      handleProctoringIncident(incident.message, 'screen_recording_stopped')
    },
  })

  const {
    isRecording: isWebcamRecording,
    error: webcamMonitoringError,
    previewStream: webcamPreviewStream,
    startRecording: startWebcamMonitoring,
    stopRecording: stopWebcamMonitoring,
  } = useMediaProctoring({
    sessionId: attemptId,
    enabled: securitySettings.enableWebcamMonitoring,
    kind: 'webcam',
    onIncident: (incident) => {
      handleProctoringIncident(incident.message, 'webcam_monitoring_stopped')
    },
  })

  const securitySetupItems: SecuritySetupItem[] = [
    {
      label: 'Fullscreen lock',
      ready: !securitySettings.forceFullscreen || isFullscreen,
    },
    {
      label: 'Screen recording',
      ready: !securitySettings.enableScreenRecording || isScreenRecording,
    },
    {
      label: 'Face recording',
      ready: !securitySettings.enableWebcamMonitoring || isWebcamRecording,
    },
  ]

  const isSecurityReady = securitySetupItems.every((item) => item.ready)

  useEffect(() => {
    const storedAttemptId = localStorage.getItem('attemptId')
    const storedExamId = localStorage.getItem('examId')

    if (!storedAttemptId || storedExamId !== examId) {
      router.push(`/exam-entry?examId=${examId}`)
      return
    }

    setAttemptId(storedAttemptId)
  }, [examId, router])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch(`/api/settings/security?examId=${examId}`)
        if (!res.ok) return
        const data = await res.json()
        if (data) {
          setSecuritySettings((prev) => ({ ...prev, ...data }))
        }
      } catch {
        // keep defaults
      }
    }

    loadSettings()
  }, [examId])

  useEffect(() => {
    if (!attemptId) return

    const initializeExam = async () => {
      try {
        setIsAttemptStateHydrated(false)
        const res = await fetch(`/api/exam-questions?examId=${examId}&attemptId=${attemptId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load exam')

        const questionList = data.questions || []
        setQuestions(questionList)
        setExamInfo(data.exam || null)
        setInitialTimeRemainingSeconds(
          typeof data.attemptState?.secondsRemaining === 'number'
            ? data.attemptState.secondsRemaining
            : (data.exam?.duration_minutes || 60) * 60
        )
        if (data.exam) {
          setCurrentExam(data.exam)
        }

        const optsMap: Record<string, MCQOption[]> = {}
        for (const [questionId, opts] of Object.entries(data.mcqOptions || {})) {
          optsMap[questionId] = (opts as MCQOption[]) || []
        }
        setMcqOptions(optsMap)

        const codingMap: Record<string, CodingQuestion> = {}
        for (const [questionId, codingQuestion] of Object.entries(data.codingQuestions || {})) {
          codingMap[questionId] = codingQuestion as CodingQuestion
        }
        setCodingQuestionsMap(codingMap)
        const restoredLanguages = readJsonFromStorage<Record<string, string>>(
          getAttemptStorageKey(attemptId, 'languages'),
          {}
        )

        setSelectedLanguages((prev) => {
          const next = { ...prev, ...restoredLanguages }
          for (const [questionId, codingQuestion] of Object.entries(codingMap)) {
            next[questionId] = next[questionId] || codingQuestion.language
          }
          return next
        })

        const casesMap: Record<string, TestCase[]> = {}
        for (const [questionId, testCases] of Object.entries(data.testCases || {})) {
          casesMap[questionId] = testCases as TestCase[]
        }
        setTestCasesMap(casesMap)

        const serverAnswers = isAnswerMap(data.attemptState?.answers)
          ? data.attemptState.answers
          : {}
        const localAnswers = readJsonFromStorage<Record<string, string>>(
          getAttemptStorageKey(attemptId, 'answers'),
          {}
        )
        const restoredAnswers = {
          ...serverAnswers,
          ...localAnswers,
        }

        setStudentAnswers(restoredAnswers)
        setAnsweredQuestions(
          new Set(
            Object.entries(restoredAnswers)
              .filter(([, answer]) => typeof answer === 'string' && answer.trim().length > 0)
              .map(([questionId]) => questionId)
          )
        )

        const restoredViolations = Array.isArray(data.attemptState?.violations)
          ? data.attemptState.violations
              .map((violation: unknown) => mapStoredViolation(violation))
              .filter((violation: SuspiciousActivity | null): violation is SuspiciousActivity => Boolean(violation))
          : []
        setInitialSuspiciousActivities(restoredViolations)

        const storedQuestionIndex = Number(localStorage.getItem(getAttemptStorageKey(attemptId, 'questionIndex')))
        if (Number.isInteger(storedQuestionIndex) && storedQuestionIndex >= 0) {
          setCurrentQuestionIndex(Math.min(storedQuestionIndex, Math.max(questionList.length - 1, 0)))
        } else {
          setCurrentQuestionIndex(0)
        }

        setIsAttemptStateHydrated(true)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize exam')
        setLoading(false)
      }
    }

    initializeExam()
  }, [attemptId, examId, setCurrentExam])

  useEffect(() => {
    if (!attemptId || loading || !securitySettings.forceFullscreen) return

    requestFullscreen()
  }, [attemptId, loading, requestFullscreen, securitySettings.forceFullscreen])

  useEffect(() => {
    const previewElement = webcamPreviewRef.current
    if (!previewElement) return

    previewElement.srcObject = webcamPreviewStream

    return () => {
      previewElement.srcObject = null
    }
  }, [webcamPreviewStream])

  useEffect(() => {
    if (!attemptId || !isAttemptStateHydrated) return
    localStorage.setItem(getAttemptStorageKey(attemptId, 'answers'), JSON.stringify(studentAnswers))
  }, [attemptId, isAttemptStateHydrated, studentAnswers])

  useEffect(() => {
    if (!attemptId || !isAttemptStateHydrated) return
    localStorage.setItem(getAttemptStorageKey(attemptId, 'languages'), JSON.stringify(selectedLanguages))
  }, [attemptId, isAttemptStateHydrated, selectedLanguages])

  useEffect(() => {
    if (!attemptId || !isAttemptStateHydrated) return
    localStorage.setItem(getAttemptStorageKey(attemptId, 'questionIndex'), String(currentQuestionIndex))
  }, [attemptId, currentQuestionIndex, isAttemptStateHydrated])

  const persistAnswers = useCallback(async () => {
    if (!attemptId) return

    const res = await fetch('/api/save-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attemptId, answers: studentAnswers }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      throw new Error(data?.error || 'Failed to save progress')
    }
  }, [attemptId, studentAnswers])

  useEffect(() => {
    if (!attemptId) return

    if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current)

    autoSaveIntervalRef.current = setInterval(async () => {
      try {
        await Promise.all([persistAnswers(), flushLogs()])
      } catch (err) {
        console.error('Auto-save failed:', err)
      }
    }, 5000)

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current)
      }
    }
  }, [attemptId, flushLogs, persistAnswers])

  useEffect(() => {
    setCodeValidationFeedback(null)
  }, [currentQuestionIndex])

  useEffect(() => {
    if (!attemptId || !isAttemptStateHydrated) return

    if (isSecurityReady) {
      secureSessionActivatedRef.current = true
      fullscreenViolationLoggedRef.current = false
    }
  }, [attemptId, isAttemptStateHydrated, isSecurityReady])

  useEffect(() => {
    if (!attemptId || !isAttemptStateHydrated || !securitySettings.forceFullscreen) return

    if (isFullscreen) {
      fullscreenViolationLoggedRef.current = false
      return
    }

    if (!secureSessionActivatedRef.current || fullscreenViolationLoggedRef.current) {
      return
    }

    fullscreenViolationLoggedRef.current = true
    handleProctoringIncident(
      'Fullscreen mode was exited during the exam. Re-enter secure mode to continue.',
      'fullscreen_exit'
    )
  }, [
    attemptId,
    handleProctoringIncident,
    isAttemptStateHydrated,
    isFullscreen,
    securitySettings.forceFullscreen,
  ])

  const handleSecureSetup = useCallback(async () => {
    setSecurityNotice('')

    const setupResults = await Promise.all([
      securitySettings.forceFullscreen ? requestFullscreen() : Promise.resolve(true),
      securitySettings.enableScreenRecording ? startScreenRecording() : Promise.resolve(true),
      securitySettings.enableWebcamMonitoring ? startWebcamMonitoring() : Promise.resolve(true),
    ])

    const success = setupResults.every(Boolean)

    if (success) {
      secureSessionActivatedRef.current = true
      setSecurityNotice('')
      return
    }

    setSecurityNotice(
      'Secure mode could not be completed. Allow fullscreen, screen sharing, and webcam access to continue the exam.'
    )
  }, [
    requestFullscreen,
    securitySettings.enableScreenRecording,
    securitySettings.enableWebcamMonitoring,
    securitySettings.forceFullscreen,
    startScreenRecording,
    startWebcamMonitoring,
  ])

  const saveAnswerLocally = (questionId: string, value: string) => {
    setStudentAnswers((prev) => ({ ...prev, [questionId]: value }))
    setAnsweredQuestions((prev) => {
      const next = new Set(prev)
      if (value.trim()) {
        next.add(questionId)
      } else {
        next.delete(questionId)
      }
      return next
    })
  }

  const handleOptionSelect = (optionId: string) => {
    const questionId = questions[currentQuestionIndex].id
    saveAnswerLocally(questionId, optionId)
  }

  const handleCodeChange = (code: string) => {
    const questionId = questions[currentQuestionIndex].id
    setCodeValidationFeedback(null)
    saveAnswerLocally(questionId, code)
  }

  const handleLanguageChange = (questionId: string, language: string) => {
    setSelectedLanguages((prev) => ({ ...prev, [questionId]: language }))
  }

  const handleCodeSubmit = async () => {
    const questionId = questions[currentQuestionIndex].id
    const code = studentAnswers[questionId]
    const codingQuestion = codingQuestionsMap[questionId]

    if (!code || !codingQuestion) {
      setCodeValidationFeedback({
        status: 'warning',
        title: 'Write your solution first',
        message: 'Enter code before checking it against the hidden evaluator cases.',
      })
      return
    }

    try {
      const res = await fetch('/api/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          questionId,
          language: selectedLanguages[questionId] || codingQuestion.language,
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Validation failed')

      if (result.allPassed) {
        setCodeValidationFeedback({
          status: 'success',
          title: 'All test cases passed',
          message: 'Your solution matched every evaluator case for this problem.',
        })
      } else {
        const passCount = result.results.filter((item: { passed: boolean }) => item.passed).length
        const totalCount = result.results.length
        setCodeValidationFeedback({
          status: 'warning',
          title: 'Some test cases still failed',
          message: `${passCount}/${totalCount} test cases passed. Refine the solution and run the check again.`,
        })
      }
    } catch (err) {
      setCodeValidationFeedback({
        status: 'error',
        title: 'Validation failed',
        message: err instanceof Error ? err.message : 'Unknown error while validating your code.',
      })
    }
  }

  const handleTimeUp = async () => {
    await submitExam(false)
  }

  const handleQuestionSelect = (index: number) => {
    setCurrentQuestionIndex(index)
  }

  const clearAttemptStorage = useCallback(() => {
    if (attemptId) {
      localStorage.removeItem(getAttemptStorageKey(attemptId, 'answers'))
      localStorage.removeItem(getAttemptStorageKey(attemptId, 'languages'))
      localStorage.removeItem(getAttemptStorageKey(attemptId, 'questionIndex'))
    }
    localStorage.removeItem('attemptId')
    localStorage.removeItem('studentName')
    localStorage.removeItem('examId')
  }, [attemptId])

  const submitExam = useCallback(async (autoSubmitted: boolean) => {
    if (!attemptId) return

    setShowSubmitDialog(false)

    try {
      await Promise.all([persistAnswers(), flushLogs()])

      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId, answers: studentAnswers, examId, codingLanguages: selectedLanguages }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit exam')
      }

      secureSessionActivatedRef.current = false
      setSecurityNotice('')

      await Promise.allSettled([
        stopScreenRecording(),
        stopWebcamMonitoring(),
        exitFullscreen(),
      ])

      clearAttemptStorage()

      if (autoSubmitted) {
        setStatusMessage(`Exam auto-submitted. Score: ${data.score}% (${data.earnedPoints}/${data.maxPoints} points).`)
      } else {
        setStatusMessage(`Exam submitted. Score: ${data.score}% (${data.earnedPoints}/${data.maxPoints} points).`)
      }

      setTimeout(() => {
        router.push(`/results/${attemptId}`)
      }, 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit exam')
    }
  }, [
    attemptId,
    clearAttemptStorage,
    examId,
    exitFullscreen,
    flushLogs,
    persistAnswers,
    router,
    selectedLanguages,
    stopScreenRecording,
    studentAnswers,
    stopWebcamMonitoring,
  ])

  const handleAutoSubmitViolation = useCallback(async () => {
    if (!attemptId) return

    setStatusMessage(`${securitySettings.warningMessage} Auto-submitting in 3 seconds...`)

    try {
      await fetch('/api/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          type: 'auto_submit_trigger',
          description: 'Exam auto-submitted after repeated suspicious activity.',
          violations: suspiciousActivities.length,
        }),
      })

      await new Promise((resolve) => setTimeout(resolve, 3000))
      await submitExam(true)
    } catch (err) {
      console.error('Auto-submit error:', err)
      router.push('/dashboard')
    }
  }, [attemptId, router, securitySettings.warningMessage, submitExam, suspiciousActivities.length])

  useEffect(() => {
    if (
      securitySettings.cancelOnTabSwitch &&
      suspiciousActivities.length >= securitySettings.maxTabSwitches &&
      !autoSubmittedRef.current
    ) {
      autoSubmittedRef.current = true
      handleAutoSubmitViolation()
    }
  }, [handleAutoSubmitViolation, securitySettings.cancelOnTabSwitch, securitySettings.maxTabSwitches, suspiciousActivities.length])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-lg text-zinc-900">Loading exam...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
        <Alert className="max-w-md border-zinc-900 bg-white shadow-sm">
          <AlertCircle className="h-4 w-4 text-zinc-900" />
          <AlertDescription className="text-zinc-900">{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-zinc-900">No questions available for this exam.</div>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const suspiciousCount = suspiciousActivities.length
  const setupMessage = securityNotice || screenRecordingError || webcamMonitoringError

  if (!isSecurityReady) {
    return (
      <div ref={containerRef} className="flex min-h-screen items-center justify-center overflow-y-auto bg-zinc-50 p-4">
        <div className="max-w-lg w-full">
          <div className="rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
              <ShieldAlert className="h-8 w-8 text-zinc-900" />
            </div>
            <h2 className="mb-2 text-center text-xl font-bold text-zinc-950">Secure Exam Mode Required</h2>
            <p className="mb-6 text-center text-zinc-600">
              Complete every security requirement before the exam can continue. The timer keeps running until submission.
            </p>

            <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              {securitySetupItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2">
                  <span className="text-sm text-zinc-900">{item.label}</span>
                  <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${item.ready ? 'text-zinc-900' : 'text-zinc-500'}`}>
                    {item.ready ? 'Ready' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>

            {setupMessage && (
              <Alert className="mt-4 border-zinc-900 bg-zinc-100">
                <AlertCircle className="h-4 w-4 text-zinc-900" />
                <AlertDescription className="text-zinc-900">{setupMessage}</AlertDescription>
              </Alert>
            )}

            {securitySettings.enableWebcamMonitoring && webcamPreviewStream && (
              <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-white">
                <div className="border-b border-zinc-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
                  Webcam Preview
                </div>
                <video
                  ref={webcamPreviewRef}
                  className="h-40 w-full object-cover"
                  autoPlay
                  muted
                  playsInline
                />
              </div>
            )}

            <Button
              onClick={handleSecureSetup}
              className="mt-6 w-full bg-zinc-950 py-2 font-semibold text-white hover:bg-zinc-800"
              size="lg"
            >
              Continue Secure Exam
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="min-h-screen overflow-y-auto bg-zinc-50 p-4 sm:p-6">
      {suspiciousCount > 0 && (
        <Alert className="mb-4 border-zinc-900 bg-zinc-100">
          <AlertCircle className="h-4 w-4 text-zinc-900" />
          <AlertDescription className="text-zinc-900">
            {securitySettings.warningMessage} Current flags: {suspiciousCount}/{securitySettings.maxTabSwitches}.
          </AlertDescription>
        </Alert>
      )}

      {securityNotice && (
        <Alert className="mb-4 border-zinc-300 bg-white shadow-sm">
          <AlertCircle className="h-4 w-4 text-zinc-700" />
          <AlertDescription className="text-zinc-700">{securityNotice}</AlertDescription>
        </Alert>
      )}

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 lg:grid-cols-4 lg:items-start">
        <div className="space-y-4 lg:col-span-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-2xl font-bold text-zinc-950">
                  {examInfo?.title || currentExam?.title || 'Exam'}
                </h1>
                <p className="text-sm text-zinc-500">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </p>
              </div>
              {securitySettings.forceFullscreen ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-zinc-950 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white">
                  <Monitor className="h-3.5 w-3.5" />
                  Secure Lock Active
                </div>
              ) : (
                <Button
                  onClick={isFullscreen ? exitFullscreen : requestFullscreen}
                  variant="outline"
                  className="border-zinc-300 bg-white font-semibold text-zinc-900 hover:bg-zinc-100 disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:opacity-100"
                >
                  {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-zinc-700">
              {securitySettings.enableScreenRecording && (
                <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1">
                  <Monitor className="h-3.5 w-3.5 text-zinc-900" />
                  <span>{isScreenRecording ? 'Screen Recording Active' : 'Screen Recording Pending'}</span>
                </div>
              )}
              {securitySettings.enableWebcamMonitoring && (
                <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1">
                  <Camera className="h-3.5 w-3.5 text-zinc-900" />
                  <span>{isWebcamRecording ? 'Face Recording Active' : 'Face Recording Pending'}</span>
                </div>
              )}
            </div>
          </div>

          {currentQuestion.question_type === 'mcq' ? (
            <MCQQuestion
              question={currentQuestion}
              options={mcqOptions[currentQuestion.id] || []}
              selectedOptionId={studentAnswers[currentQuestion.id]}
              onOptionSelect={handleOptionSelect}
              onAutoSave={persistAnswers}
            />
          ) : (
            <CodeEditor
              question={currentQuestion}
              codingQuestion={codingQuestionsMap[currentQuestion.id]}
              testCases={testCasesMap[currentQuestion.id] || []}
              code={studentAnswers[currentQuestion.id] || ''}
              selectedLanguage={selectedLanguages[currentQuestion.id] || codingQuestionsMap[currentQuestion.id]?.language || 'python'}
              onCodeChange={handleCodeChange}
              onLanguageChange={(language) => handleLanguageChange(currentQuestion.id, language)}
              onSubmit={handleCodeSubmit}
              onAutoSave={persistAnswers}
              validationFeedback={codeValidationFeedback}
            />
          )}

          <div className="flex gap-2 justify-between">
            <Button
              onClick={() => handleQuestionSelect(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
              variant="outline"
              className="border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100 disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:opacity-100"
            >
              Previous
            </Button>
            <Button
              onClick={() => handleQuestionSelect(Math.min(questions.length - 1, currentQuestionIndex + 1))}
              disabled={currentQuestionIndex === questions.length - 1}
              className="bg-zinc-950 text-white hover:bg-zinc-800"
            >
              Next
            </Button>
          </div>
        </div>

        <div className="space-y-4 lg:col-span-1">
          <ExamTimer
            initialTimeRemainingSeconds={initialTimeRemainingSeconds}
            onTimeUp={handleTimeUp}
            isActive={true}
          />

          <QuestionNavigator
            questions={questions}
            currentQuestionIndex={currentQuestionIndex}
            answeredQuestions={answeredQuestions}
            onSelectQuestion={handleQuestionSelect}
            onSubmitExam={() => setShowSubmitDialog(true)}
          />
        </div>
      </div>

      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit exam?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {answeredQuestions.size} out of {questions.length} questions. You will not be able to return after submitting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => submitExam(false)}>Submit</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {statusMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md">
          <Alert className={`${statusMessage.includes('auto-submitted') ? 'border-zinc-950 bg-zinc-950' : 'border-zinc-900 bg-white'} border-2 shadow-sm`}>
            <AlertCircle className={`h-5 w-5 ${statusMessage.includes('auto-submitted') ? 'text-white' : 'text-zinc-900'}`} />
            <AlertDescription className={`font-semibold ${statusMessage.includes('auto-submitted') ? 'text-white' : 'text-zinc-900'}`}>
              {statusMessage}
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  )
}
