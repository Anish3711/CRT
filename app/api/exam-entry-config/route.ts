import { NextResponse } from 'next/server'
import { getExamMetadata, type StudentIntakeField } from '@/lib/app-config-store'

type StudentEntryField = {
  id: string
  label: string
  type: 'text' | 'email' | 'number' | 'tel' | 'select'
  required: boolean
  placeholder: string
  options: string[]
}

function sanitizeEntryFields(fields: StudentIntakeField[]): StudentEntryField[] {
  return (fields || [])
    .map((field) => ({
      id: typeof field.id === 'string' && field.id.trim() ? field.id.trim() : '',
      label: typeof field.label === 'string' ? field.label.trim() : '',
      type: ['text', 'email', 'number', 'tel', 'select'].includes(field.type) ? field.type : 'text',
      required: Boolean(field.required),
      placeholder: typeof field.placeholder === 'string' ? field.placeholder : '',
      options: Array.isArray(field.options)
        ? field.options.map((option) => String(option).trim()).filter(Boolean)
        : [],
    }))
    .filter((field) => field.id.length > 0 && field.label.length > 0)
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const examId = (url.searchParams.get('examId') || '').trim()

    if (!examId) {
      return NextResponse.json({ error: 'examId is required' }, { status: 400 })
    }

    const metadata = await getExamMetadata(examId)
    return NextResponse.json({
      fields: sanitizeEntryFields(metadata.intakeFields || []),
    })
  } catch (error) {
    console.error('Failed to load exam entry config:', error)
    return NextResponse.json({ fields: [] }, { status: 500 })
  }
}

