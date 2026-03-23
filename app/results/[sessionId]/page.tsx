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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,138,18,0.18),_transparent_20%),linear-gradient(180deg,_#0b1526_0%,_#13233b_55%,_#101827_100%)] p-4">
      <div className="max-w-2xl mx-auto">
        <SpecCrtBrand
          className="mb-8"
          subtitle="Your SPEC CRT session has been submitted successfully."
        />

        <Card className="bg-slate-800/82 border-2 border-green-600 mb-6">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-green-400" />
            </div>
            <CardTitle className="text-3xl text-green-400">
              Exam Submitted!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="text-slate-300 text-lg">
              Your exam has been submitted successfully.
            </p>
            <p className="text-slate-400 text-sm">
              Attempt ID: <span className="font-mono text-blue-400">{attemptId}</span>
            </p>
            <p className="text-slate-400 text-sm">
              Your instructor will review your responses and share the results.
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-4 justify-center">
          <Button
            onClick={() => router.push('/')}
            className="bg-[#7D1D2D] text-white hover:bg-[#671827] flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  )
}
