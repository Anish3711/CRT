import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { getExamMetadata } from '@/lib/app-config-store'
import { isAllowedCsmRollNumber, normalizeRollNumber } from '@/lib/attendance-roster'
import { saveStudentIntakeResponse } from '@/lib/student-intake-store'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, rollNo, year, section, mobile, examId, customFields } = body
    const normalizedRollNo = typeof rollNo === 'string' ? normalizeRollNumber(rollNo) : ''

    if (!name || !normalizedRollNo || !year || !section || !mobile || !examId) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    if (!isAllowedCsmRollNumber(normalizedRollNo)) {
      return NextResponse.json({
        error: 'Roll number is not part of the current CSM attendance roster.',
      }, { status: 400 })
    }

    const [metadata, attemptsResult] = await Promise.all([
      getExamMetadata(examId),
      supabase
      .from('guest_attempts')
      .select('id, status')
      .eq('exam_id', examId)
      .eq('roll_no', normalizedRollNo)
    ])

    if (attemptsResult.error) {
      return NextResponse.json({ error: attemptsResult.error.message }, { status: 500 })
    }

    const existingAttempts = attemptsResult.data || []
    const activeAttempt = existingAttempts.find((attempt) => attempt.status === 'ongoing')
    const completedAttempts = existingAttempts.filter((attempt) => attempt.status !== 'ongoing')
    const maxAttempts = Math.max(1, metadata.maxAttempts || 1)

    const configuredFields = Array.isArray(metadata.intakeFields) ? metadata.intakeFields : []
    const providedCustomFields = customFields && typeof customFields === 'object'
      ? customFields as Record<string, unknown>
      : {}

    const validatedCustomFields: Record<string, string> = {}

    for (const field of configuredFields) {
      const rawValue = providedCustomFields[field.id]
      const value = typeof rawValue === 'string' ? rawValue.trim() : ''

      if (field.required && !value) {
        return NextResponse.json({ error: `${field.label} is required.` }, { status: 400 })
      }

      if (!value) continue

      if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return NextResponse.json({ error: `Enter a valid email for ${field.label}.` }, { status: 400 })
      }

      if (field.type === 'number' && Number.isNaN(Number(value))) {
        return NextResponse.json({ error: `${field.label} must be a number.` }, { status: 400 })
      }

      if (field.type === 'select') {
        const options = Array.isArray(field.options) ? field.options : []
        if (options.length > 0 && !options.includes(value)) {
          return NextResponse.json({ error: `Invalid value for ${field.label}.` }, { status: 400 })
        }
      }

      validatedCustomFields[field.id] = value
    }

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
    const baseInsertPayload = {
      id: attemptId,
      name,
      roll_no: normalizedRollNo,
      year,
      section,
      mobile,
      exam_id: examId,
      start_time: startTime,
      status: 'ongoing',
      violations: [],
    }

    const payloadWithIntake = {
      ...baseInsertPayload,
      student_details: validatedCustomFields,
    }

    let insertError: { message: string } | null = null
    const withIntakeResult = await supabase
      .from('guest_attempts')
      .insert(payloadWithIntake)

    if (withIntakeResult.error) {
      const missingColumnError =
        withIntakeResult.error.message.includes("student_details") &&
        withIntakeResult.error.message.toLowerCase().includes('column')

      if (missingColumnError) {
        const fallbackResult = await supabase
          .from('guest_attempts')
          .insert(baseInsertPayload)

        if (fallbackResult.error) {
          insertError = { message: fallbackResult.error.message }
        }
      } else {
        insertError = { message: withIntakeResult.error.message }
      }
    }

    if (insertError) {
      console.error('guest_attempts insert error:', insertError.message)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    try {
      await saveStudentIntakeResponse({
        attemptId,
        examId,
        studentName: name,
        rollNo: normalizedRollNo,
        createdAt: startTime,
        responses: validatedCustomFields,
      })
    } catch (storeError) {
      console.error('Failed to persist custom intake fields:', storeError)
    }

    return NextResponse.json({ attemptId, startTime })
  } catch (err) {
    console.error('start-exam error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
