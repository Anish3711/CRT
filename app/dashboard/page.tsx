'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useExam } from '@/app/contexts/exam-context'
import { createClient } from '@/lib/supabase/client'
import type { Exam } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BookOpen } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const { setCurrentExam } = useExam()
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const supabase = createClient()
        const { data, error: fetchError } = await supabase
          .from('exams')
          .select('*')
          .order('created_at', { ascending: false })

        if (fetchError) throw fetchError
        setExams(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch exams')
      } finally {
        setLoading(false)
      }
    }

    fetchExams()
  }, [])

  const handleStartExam = (exam: Exam) => {
    setCurrentExam(exam)
    router.push(`/exam-entry?examId=${exam.id}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <header className="bg-slate-900 border-b border-slate-700 sticky top-0">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-white">SecureCRT Dashboard</h1>
          <p className="text-slate-400 text-sm">Select an exam to begin</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <Alert className="mb-6 bg-red-900/50 border-red-700">
            <AlertDescription className="text-red-200">{error}</AlertDescription>
          </Alert>
        )}

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-2">Available Exams</h2>
          <p className="text-slate-400">Choose an exam to begin</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="bg-slate-800 border-slate-700 animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-slate-700 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-slate-700 rounded w-1/2"></div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : exams.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6 text-center">
              <BookOpen className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-300">No exams available at this time</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((exam) => (
              <Card key={exam.id} className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-colors">
                <CardHeader>
                  <CardTitle className="text-white">{exam.title}</CardTitle>
                  <CardDescription className="text-slate-400">{exam.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm text-slate-300">
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span className="text-blue-400 font-semibold">{exam.duration_minutes} minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Questions:</span>
                      <span className="text-blue-400 font-semibold">{exam.total_questions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Passing Score:</span>
                      <span className="text-blue-400 font-semibold">{exam.passing_score}%</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleStartExam(exam)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Start Exam
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
