'use client'

import React, { createContext, useContext, useState } from 'react'
import { type Exam, type ExamSession, type StudentAnswer } from '@/lib/supabase'

type ExamContextType = {
  currentExam: Exam | null
  currentSession: ExamSession | null
  answers: Map<string, StudentAnswer>
  setCurrentExam: (exam: Exam | null) => void
  setCurrentSession: (session: ExamSession | null) => void
  setAnswer: (questionId: string, answer: StudentAnswer) => void
  getAnswer: (questionId: string) => StudentAnswer | undefined
  clearAnswers: () => void
}

const ExamContext = createContext<ExamContextType | undefined>(undefined)

export function ExamProvider({ children }: { children: React.ReactNode }) {
  const [currentExam, setCurrentExam] = useState<Exam | null>(null)
  const [currentSession, setCurrentSession] = useState<ExamSession | null>(null)
  const [answers, setAnswers] = useState<Map<string, StudentAnswer>>(new Map())

  const setAnswer = (questionId: string, answer: StudentAnswer) => {
    setAnswers((prev) => {
      const newAnswers = new Map(prev)
      newAnswers.set(questionId, answer)
      return newAnswers
    })
  }

  const getAnswer = (questionId: string) => {
    return answers.get(questionId)
  }

  const clearAnswers = () => {
    setAnswers(new Map())
  }

  return (
    <ExamContext.Provider
      value={{
        currentExam,
        currentSession,
        answers,
        setCurrentExam,
        setCurrentSession,
        setAnswer,
        getAnswer,
        clearAnswers,
      }}
    >
      {children}
    </ExamContext.Provider>
  )
}

export function useExam() {
  const context = useContext(ExamContext)
  if (context === undefined) {
    throw new Error('useExam must be used within an ExamProvider')
  }
  return context
}
