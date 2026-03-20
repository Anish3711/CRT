import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { getExamMetadata } from '@/lib/app-config-store'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, rollNo, year, section, mobile, examId } = body

    if (!name || !rollNo || !year || !section || !mobile || !examId) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    const [metadata, attemptsResult] = await Promise.all([
      getExamMetadata(examId),
      supabase
      .from('guest_attempts')
      .select('id, status')
      .eq('exam_id', examId)
      .eq('roll_no', rollNo)
    ])

    if (attemptsResult.error) {
      return NextResponse.json({ error: attemptsResult.error.message }, { status: 500 })
    }

    const existingAttempts = attemptsResult.data || []
    const activeAttempt = existingAttempts.find((attempt) => attempt.status === 'ongoing')
    const completedAttempts = existingAttempts.filter((attempt) => attempt.status !== 'ongoing')
    const maxAttempts = Math.max(1, metadata.maxAttempts || 1)

    if (activeAttempt) {
      return NextResponse.json({ 
        error: 'An active attempt already exists for this exam.' 
      }, { status: 403 })
    }

    if (completedAttempts.length >= maxAttempts) {
      return NextResponse.json({
        error: `Maximum attempts reached for this exam (${maxAttempts}).`,
      }, { status: 403 })
    }

    const attemptId = randomUUID()
    const startTime = new Date().toISOString()

    // Store in Supabase -- uses the exam_sessions table with a guest student_id
    // We store student details in the session metadata via a dedicated attempts table
    // For now we store it in a simple JSON column in a new `guest_attempts` concept.
    // Since we cannot alter the schema here, we store via upsert on a separate table.
    // If `guest_attempts` table doesn't exist yet, we fall back to in-memory response.
    const { error: insertError } = await supabase
      .from('guest_attempts')
      .insert({
        id: attemptId,
        name,
        roll_no: rollNo,
        year,
        section,
        mobile,
        exam_id: examId,
        start_time: startTime,
        status: 'ongoing',
        violations: [],
      })

    if (insertError) {
      console.error('guest_attempts insert error:', insertError.message)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ attemptId, startTime })
  } catch (err) {
    console.error('start-exam error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
