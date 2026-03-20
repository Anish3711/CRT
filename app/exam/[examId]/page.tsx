'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useExam } from '@/app/contexts/exam-context'
import type { Question, MCQOption, CodingQuestion, TestCase, Exam } from '@/lib/supabase'
import { ExamTimer } from '@/components/exam/exam-timer'
import { QuestionNavigator } from '@/components/exam/question-navigator'
import { MCQQuestion } from '@/components/exam/mcq-question'
import { CodeEditor } from '@/components/exam/code-editor'
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
import { AlertCircle } from 'lucide-react'
import { useActivityDetection, useFullscreenEnforcement } from '@/app/hooks/use-exam-hooks'

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
  enableScreenRecording: false,
  enableWebcamMonitoring: false,
  randomizeQuestions: true,
  randomizeTestCases: false,
  maxTabSwitches: 3,
  warningMessage: 'Warning: Suspicious activity detected. Further violations will terminate your exam.',
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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({})
  const [selectedLanguages, setSelectedLanguages] = useState<Record<string, string>>({})
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const { containerRef, isFullscreen, requestFullscreen, exitFullscreen } = useFullscreenEnforcement(true)
  const { flushLogs, suspiciousActivities } = useActivityDetection(attemptId, true)

  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const autoSubmittedRef = useRef(false)

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
        const res = await fetch('/api/settings/security')
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
  }, [])

  useEffect(() => {
    if (!attemptId) return

    const initializeExam = async () => {
      try {
        const res = await fetch(`/api/exam-questions?examId=${examId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load exam')

        setQuestions(data.questions || [])
        setExamInfo(data.exam || null)
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
        setSelectedLanguages((prev) => {
          const next = { ...prev }
          for (const [questionId, codingQuestion] of Object.entries(codingMap)) {
            next[questionId] = prev[questionId] || codingQuestion.language
          }
          return next
        })

        const casesMap: Record<string, TestCase[]> = {}
        for (const [questionId, testCases] of Object.entries(data.testCases || {})) {
          casesMap[questionId] = testCases as TestCase[]
        }
        setTestCasesMap(casesMap)

        setLoading(false)
        if (securitySettings.forceFullscreen) {
          requestFullscreen()
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize exam')
        setLoading(false)
      }
    }

    initializeExam()
  }, [attemptId, examId, requestFullscreen, securitySettings.forceFullscreen, setCurrentExam])

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

  const saveAnswerLocally = (questionId: string, value: string) => {
    setStudentAnswers((prev) => ({ ...prev, [questionId]: value }))
    setAnsweredQuestions((prev) => new Set([...prev, questionId]))
  }

  const handleOptionSelect = (optionId: string) => {
    const questionId = questions[currentQuestionIndex].id
    saveAnswerLocally(questionId, optionId)
  }

  const handleCodeChange = (code: string) => {
    const questionId = questions[currentQuestionIndex].id
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
      alert('Please write code before validating your solution.')
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
          testCases: (testCasesMap[questionId] || []).map((testCase) => ({
            input_data: testCase.input_data || testCase.input || '',
            expected_output: testCase.expected_output,
          })),
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Validation failed')

      if (result.allPassed) {
        alert('All test cases passed. Your solution is correct.')
      } else {
        const passCount = result.results.filter((item: { passed: boolean }) => item.passed).length
        const totalCount = result.results.length
        alert(`${passCount}/${totalCount} test cases passed. Keep trying.`)
      }
    } catch (err) {
      alert(`Error validating code: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleTimeUp = async () => {
    await submitExam(false)
  }

  const handleQuestionSelect = (index: number) => {
    setCurrentQuestionIndex(index)
  }

  const clearAttemptStorage = () => {
    localStorage.removeItem('attemptId')
    localStorage.removeItem('studentName')
    localStorage.removeItem('examId')
  }

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
  }, [attemptId, examId, flushLogs, persistAnswers, router, selectedLanguages, studentAnswers])

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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading exam...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Alert className="max-w-md bg-red-900/50 border-red-700">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-200">{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">No questions available for this exam.</div>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const suspiciousCount = suspiciousActivities.length

  if (securitySettings.forceFullscreen && !isFullscreen) {
    return (
      <div ref={containerRef} className="min-h-screen bg-slate-900 p-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Fullscreen Mode Required</h2>
            <p className="text-slate-300 mb-6">
              To maintain exam integrity, you must enter fullscreen mode before continuing.
            </p>
            <Button
              onClick={requestFullscreen}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2"
              size="lg"
            >
              Enter Fullscreen
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-slate-900 p-4">
      {suspiciousCount > 0 && (
        <Alert className="mb-4 bg-yellow-900/50 border-yellow-700">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-yellow-200">
            {securitySettings.warningMessage} Current flags: {suspiciousCount}/{securitySettings.maxTabSwitches}.
          </AlertDescription>
        </Alert>
      )}

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {examInfo?.title || currentExam?.title || 'Exam'}
                </h1>
                <p className="text-slate-400 text-sm">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </p>
              </div>
              <Button
                onClick={isFullscreen ? exitFullscreen : requestFullscreen}
                variant="outline"
                className="border-slate-500 text-slate-100 hover:bg-slate-700 hover:border-slate-400 font-semibold"
              >
                {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              </Button>
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
            />
          )}

          <div className="flex gap-2 justify-between">
            <Button
              onClick={() => handleQuestionSelect(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
              variant="outline"
              className="border-slate-600 text-slate-200"
            >
              Previous
            </Button>
            <Button
              onClick={() => handleQuestionSelect(Math.min(questions.length - 1, currentQuestionIndex + 1))}
              disabled={currentQuestionIndex === questions.length - 1}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Next
            </Button>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-4">
          <ExamTimer
            durationMinutes={examInfo?.duration_minutes || currentExam?.duration_minutes || 60}
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
          <Alert className={`${statusMessage.includes('auto-submitted') ? 'bg-red-900/60 border-red-600 border-2' : 'bg-green-900/60 border-green-600 border-2'}`}>
            <AlertCircle className={`h-5 w-5 ${statusMessage.includes('auto-submitted') ? 'text-red-400' : 'text-green-400'}`} />
            <AlertDescription className={`font-semibold ${statusMessage.includes('auto-submitted') ? 'text-red-100' : 'text-green-100'}`}>
              {statusMessage}
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  )
}
