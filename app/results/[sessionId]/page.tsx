'use client'

import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Home } from 'lucide-react'
import { SpecCrtBrand } from '@/components/branding/spec-crt-brand'

export default function ResultsPage() {
  const params = useParams()
  const router = useRouter()
  const attemptId = params.sessionId as string

  return (
    <div className="min-h-screen bg-zinc-50 p-4">
      <div className="max-w-2xl mx-auto">
        <SpecCrtBrand
          className="mb-8"
          subtitle="Your SPEC CRT session has been submitted successfully."
        />

        <Card className="mb-6 border-zinc-200 bg-white shadow-sm">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-zinc-900" />
            </div>
            <CardTitle className="text-3xl text-zinc-950">Exam Submitted!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="text-lg text-zinc-700">Your exam has been submitted successfully.</p>
            <p className="text-sm text-zinc-500">
              Attempt ID: <span className="font-mono text-zinc-900">{attemptId}</span>
            </p>
            <p className="text-sm text-zinc-500">Your instructor will review your responses and share the results.</p>
          </CardContent>
        </Card>

        <div className="flex gap-4 justify-center">
          <Button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 bg-zinc-950 text-white hover:bg-zinc-800"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  )
}
