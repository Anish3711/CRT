'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, BookOpen } from 'lucide-react'

function ExamEntryForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const examId = searchParams.get('examId') || ''

  const [form, setForm] = useState({
    name: '',
    rollNo: '',
    year: '',
    section: '',
    mobile: '',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!examId) {
      setError('No exam selected. Please get a valid exam link from your instructor.')
    } else {
      setError('')
    }
  }, [examId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const validate = (): string => {
    if (!form.name.trim() || form.name.trim().length < 2) return 'Full name must be at least 2 characters.'
    if (!form.rollNo.trim()) return 'Roll number is required.'
    if (!form.year) return 'Year is required.'
    if (!form.section.trim()) return 'Section is required.'
    if (!/^[6-9]\d{9}$/.test(form.mobile)) return 'Enter a valid 10-digit Indian mobile number.'
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    if (!examId) {
      setError('No exam ID. Please use a valid exam link.')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/start-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, examId }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start exam')

      // Store attemptId in localStorage (Task 4)
      localStorage.setItem('attemptId', data.attemptId)
      localStorage.setItem('studentName', form.name)
      localStorage.setItem('examId', examId)

      router.push(`/exam/${examId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start exam')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 rounded-full p-3">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">SecureCRT</h1>
          <p className="text-slate-300">Secure Exam Portal</p>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="space-y-2">
            <CardTitle className="text-white">Student Details</CardTitle>
            <CardDescription className="text-slate-300">
              Fill in your details to start the exam
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert className="bg-red-900/50 border-red-700">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <AlertDescription className="text-red-200">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Full Name *</label>
                <Input
                  name="name"
                  placeholder="Enter your full name"
                  value={form.name}
                  onChange={handleChange}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Roll Number *</label>
                <Input
                  name="rollNo"
                  placeholder="e.g. 21BCI0001"
                  value={form.rollNo}
                  onChange={handleChange}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-200">Year *</label>
                  <select
                    name="year"
                    value={form.year}
                    onChange={handleChange}
                    className="w-full h-9 rounded-md border border-slate-600 bg-slate-700 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="" disabled>Select year</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-200">Section *</label>
                  <Input
                    name="section"
                    placeholder="e.g. A"
                    value={form.section}
                    onChange={handleChange}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    maxLength={5}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Mobile Number *</label>
                <Input
                  name="mobile"
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={form.mobile}
                  onChange={handleChange}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  maxLength={10}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || !examId}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? 'Starting Exam...' : examId ? 'Start Exam' : 'No Exam Selected'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Suspense wrapper required for useSearchParams in Next.js App Router
export default function ExamEntryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <ExamEntryForm />
    </Suspense>
  )
}
