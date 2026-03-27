'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { SpecCrtBrand } from '@/components/branding/spec-crt-brand'

type StudentCustomField = {
  id: string
  label: string
  type: 'text' | 'email' | 'number' | 'tel' | 'select'
  required: boolean
  placeholder: string
  options: string[]
}

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
  const [customFields, setCustomFields] = useState<StudentCustomField[]>([])
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!examId) {
      setError('No exam selected. Please get a valid exam link from your instructor.')
    } else {
      setError('')
    }
  }, [examId])

  useEffect(() => {
    if (!examId) return

    const loadCustomFields = async () => {
      try {
        const response = await fetch(`/api/exam-entry-config?examId=${examId}`, { cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Failed to load exam entry form')

        const fields = Array.isArray(data.fields) ? data.fields : []
        setCustomFields(fields)
        setCustomFieldValues((prev) => {
          const next: Record<string, string> = {}
          for (const field of fields) {
            next[field.id] = prev[field.id] || ''
          }
          return next
        })
      } catch (fetchError) {
        console.error(fetchError)
        setCustomFields([])
      }
    }

    loadCustomFields()
  }, [examId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    const normalizedValue =
      name === 'rollNo' || name === 'section'
        ? value.toUpperCase()
        : value

    setForm(prev => ({ ...prev, [name]: normalizedValue }))
  }

  const validate = (): string => {
    if (!form.name.trim() || form.name.trim().length < 2) return 'Full name must be at least 2 characters.'
    if (!form.rollNo.trim()) return 'Roll number is required.'
    if (!form.year) return 'Year is required.'
    if (!form.section.trim()) return 'Section is required.'
    if (!/^[6-9]\d{9}$/.test(form.mobile)) return 'Enter a valid 10-digit Indian mobile number.'

    for (const field of customFields) {
      const value = (customFieldValues[field.id] || '').trim()

      if (field.required && !value) {
        return `${field.label} is required.`
      }

      if (!value) continue

      if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return `Enter a valid email for ${field.label}.`
      }

      if (field.type === 'number' && Number.isNaN(Number(value))) {
        return `${field.label} must be a number.`
      }
    }

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
        body: JSON.stringify({ ...form, examId, customFields: customFieldValues }),
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
    <div className="min-h-screen bg-zinc-50 p-4">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center py-8">
        <div className="w-full space-y-8">
          <SpecCrtBrand
            subtitle="Enter your student details to begin the SPEC CRT assessment."
          />

          <Card className="border-zinc-200 bg-white shadow-sm">
            <CardHeader className="space-y-2">
              <CardTitle className="text-zinc-950">Student Details</CardTitle>
              <CardDescription className="text-zinc-500">Fill in your details to start the exam</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert className="border-zinc-900 bg-zinc-100">
                    <AlertCircle className="h-4 w-4 text-zinc-900" />
                    <AlertDescription className="text-zinc-900">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-900">Full Name *</label>
                  <Input
                    name="name"
                    placeholder="Enter your full name"
                    value={form.name}
                    onChange={handleChange}
                    className="border-zinc-300 bg-white text-zinc-950 placeholder:text-zinc-400"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-900">Roll Number *</label>
                  <Input
                    name="rollNo"
                    placeholder="e.g. 23BK1A6601"
                    value={form.rollNo}
                    onChange={handleChange}
                    className="border-zinc-300 bg-white text-zinc-950 placeholder:text-zinc-400"
                    required
                  />
                  <p className="text-xs text-zinc-500">Current attendance roster is limited to approved CSM roll numbers.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-900">Year *</label>
                    <select
                      name="year"
                      value={form.year}
                      onChange={handleChange}
                      className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-900"
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
                    <label className="text-sm font-medium text-zinc-900">Section *</label>
                    <Input
                      name="section"
                      placeholder="e.g. A"
                      value={form.section}
                      onChange={handleChange}
                      className="border-zinc-300 bg-white text-zinc-950 placeholder:text-zinc-400"
                      maxLength={5}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-900">Mobile Number *</label>
                  <Input
                    name="mobile"
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={form.mobile}
                    onChange={handleChange}
                    className="border-zinc-300 bg-white text-zinc-950 placeholder:text-zinc-400"
                    maxLength={10}
                    required
                  />
                </div>

                {customFields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <label className="text-sm font-medium text-zinc-900">
                      {field.label} {field.required ? '*' : ''}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={customFieldValues[field.id] || ''}
                        onChange={(e) => {
                          const value = e.target.value
                          setCustomFieldValues((prev) => ({ ...prev, [field.id]: value }))
                        }}
                        className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                        required={field.required}
                      >
                        <option value="" disabled>
                          {field.placeholder || `Select ${field.label}`}
                        </option>
                        {field.options.map((option) => (
                          <option key={`${field.id}-${option}`} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        type={field.type}
                        placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                        value={customFieldValues[field.id] || ''}
                        onChange={(e) => {
                          const value = e.target.value
                          setCustomFieldValues((prev) => ({ ...prev, [field.id]: value }))
                        }}
                        className="border-zinc-300 bg-white text-zinc-950 placeholder:text-zinc-400"
                        required={field.required}
                      />
                    )}
                  </div>
                ))}

                <Button
                  type="submit"
                  disabled={isLoading || !examId}
                  className="w-full bg-zinc-950 text-white hover:bg-zinc-800"
                >
                  {isLoading ? 'Starting Exam...' : examId ? 'Start Exam' : 'No Exam Selected'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Suspense wrapper required for useSearchParams in Next.js App Router
export default function ExamEntryPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-zinc-900">Loading...</div>
      </div>
    }>
      <ExamEntryForm />
    </Suspense>
  )
}
