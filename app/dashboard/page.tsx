'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useExam } from '@/app/contexts/exam-context'
import { createClient } from '@/lib/supabase/client'
import type { Exam } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SpecCrtBrand } from '@/components/branding/spec-crt-brand'
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,138,18,0.18),_transparent_20%),linear-gradient(180deg,_#0b1526_0%,_#13233b_55%,_#101827_100%)]">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-4 py-10 sm:py-14">
        {error && (
          <Alert className="mb-6 w-full max-w-3xl border-red-700 bg-red-900/50">
            <AlertDescription className="text-red-200">{error}</AlertDescription>
          </Alert>
        )}

        <section className="w-full max-w-5xl rounded-[32px] border border-white/10 bg-slate-950/35 px-4 py-8 shadow-[0_24px_80px_rgba(2,6,23,0.35)] backdrop-blur sm:px-8 sm:py-10">
          <SpecCrtBrand
            className="mx-auto"
            subtitle="Secure Coding and Recruitment Test platform for monitored examinations. Select your exam and continue from the center of the portal."
          />

          <div className="mx-auto mt-10 max-w-3xl text-center">
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">Available Exams</h2>
            <p className="mt-2 text-sm text-slate-300 sm:text-base">
              Choose an exam to begin
            </p>
          </div>

          <div className="mt-8">
            {loading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse border-slate-700 bg-slate-800/70">
                    <CardHeader>
                      <div className="mb-2 h-6 w-3/4 rounded bg-slate-700"></div>
                      <div className="h-4 w-1/2 rounded bg-slate-700"></div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : exams.length === 0 ? (
              <Card className="mx-auto max-w-xl border-slate-700 bg-slate-800/80">
                <CardContent className="pt-6 text-center">
                  <BookOpen className="mx-auto mb-4 h-12 w-12 text-[#f2b270]" />
                  <p className="text-slate-200">No exams available at this time</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {exams.map((exam) => (
                  <Card
                    key={exam.id}
                    className="border-slate-700 bg-slate-800/75 transition-colors hover:border-[#f2b270]"
                  >
                    <CardHeader>
                      <CardTitle className="text-white">{exam.title}</CardTitle>
                      <CardDescription className="text-slate-300">{exam.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 text-sm text-slate-200">
                        <div className="flex justify-between">
                          <span>Duration:</span>
                          <span className="font-semibold text-[#f2b270]">{exam.duration_minutes} minutes</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Questions:</span>
                          <span className="font-semibold text-[#f2b270]">{exam.total_questions}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Passing Score:</span>
                          <span className="font-semibold text-[#f2b270]">{exam.passing_score}%</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleStartExam(exam)}
                        className="w-full bg-[#7D1D2D] text-white hover:bg-[#671827]"
                      >
                        Start Exam
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
