import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAllCodingQuestionMetadata } from '@/lib/app-config-store'

type McqOptionRow = {
  id: string
  question_id: string
  option_text: string
  option_key: string
}

type CodingQuestionRow = {
  id: string
  question_id: string
  language: 'python' | 'java' | 'cpp' | 'javascript'
  allowed_languages?: string[]
  starter_code: string | null
  title: string | null
  description: string | null
  input_format: string | null
  output_format: string | null
  constraints: string | null
  time_limit: number | null
  memory_limit: number | null
}

type SafeTestCaseRow = {
  id: string
  input_data: string
  expected_output: string
  is_visible: true
  created_at: string
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const examId = req.nextUrl.searchParams.get('examId')
    if (!examId) {
      return NextResponse.json({ error: 'examId is required' }, { status: 400 })
    }

    // 1. Get exam info
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single()

    if (examError) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }

    // 2. Get all questions for this exam
    const { data: questions, error: qError } = await supabase
      .from('questions')
      .select('id, exam_id, question_text, question_type, difficulty, points, order_index')
      .eq('exam_id', examId)
      .order('order_index', { ascending: true })

    if (qError) throw qError

    // 3. Get MCQ options for MCQ questions
    const mcqQuestionIds = questions.filter(q => q.question_type === 'mcq').map(q => q.id)
    const mcqOptions: Record<string, McqOptionRow[]> = {}

    if (mcqQuestionIds.length > 0) {
      const { data: opts, error: optsError } = await supabase
        .from('mcq_options')
        .select('id, question_id, option_text, option_key')
        .in('question_id', mcqQuestionIds)
        .order('option_key', { ascending: true })

      if (!optsError && opts) {
        for (const opt of opts) {
          if (!mcqOptions[opt.question_id]) mcqOptions[opt.question_id] = []
          mcqOptions[opt.question_id].push(opt)
        }
      }
    }

    // 4. Get coding questions and test cases
    const codingQuestionIds = questions.filter(q => q.question_type === 'coding').map(q => q.id)
    const codingQuestions: Record<string, CodingQuestionRow> = {}
    const testCases: Record<string, SafeTestCaseRow[]> = {}
    const codingMetadata = await getAllCodingQuestionMetadata()

    if (codingQuestionIds.length > 0) {
      let { data: cqs, error: cqError } = await supabase
        .from('coding_questions')
        .select('id, question_id, language, starter_code, title, description, input_format, output_format, constraints, time_limit, memory_limit')
        .in('question_id', codingQuestionIds)

      if (cqError) {
        const fallbackResult = await supabase
          .from('coding_questions')
          .select('id, question_id, language, starter_code')
          .in('question_id', codingQuestionIds)

        if (!fallbackResult.error && fallbackResult.data) {
          cqError = null
          cqs = fallbackResult.data.map((row) => ({
            ...row,
            title: null,
            description: null,
            input_format: null,
            output_format: null,
            constraints: null,
            time_limit: null,
            memory_limit: null,
          }))
        }
      }

      if (!cqError && cqs && cqs.length > 0) {
        for (const cq of cqs) {
          codingQuestions[cq.question_id] = {
            id: cq.id,
            question_id: cq.question_id,
            language: cq.language,
            allowed_languages: codingMetadata[cq.question_id]?.allowedLanguages || [cq.language],
            starter_code: cq.starter_code,
            title: cq.title || '',
            description: cq.description || '',
            input_format: cq.input_format || '',
            output_format: cq.output_format || '',
            constraints: cq.constraints || '',
            time_limit: cq.time_limit || 2,
            memory_limit: cq.memory_limit || 256,
          }

          // Fetch test cases for this coding question
          const { data: tcs, error: tcError } = await supabase
            .from('test_cases')
            .select('id, input_data, input, expected_output, is_hidden, is_visible, created_at')
            .eq('coding_question_id', cq.id)
            .order('created_at', { ascending: true })

          if (!tcError) {
            testCases[cq.question_id] = (tcs || [])
              .filter(tc => tc.is_hidden !== true && tc.is_visible !== false)
              .map(tc => ({
                id: tc.id,
                input_data: tc.input_data || tc.input || '',
                expected_output: tc.expected_output || '',
                is_visible: true,
                created_at: tc.created_at,
              }))
          } else {
            console.error('Error fetching test cases:', tcError)
            testCases[cq.question_id] = []
          }
        }
      } else if (cqError) {
        console.error('Error fetching coding questions:', cqError)
      }

      for (const questionId of codingQuestionIds) {
        if (!codingQuestions[questionId]) {
          codingQuestions[questionId] = {
            id: questionId,
            question_id: questionId,
            language: 'python',
            allowed_languages: codingMetadata[questionId]?.allowedLanguages || ['python'],
            starter_code: '',
            title: '',
            description: '',
            input_format: '',
            output_format: '',
            constraints: '',
            time_limit: 2,
            memory_limit: 256,
          }
          testCases[questionId] = testCases[questionId] || []
        }
      }
    }

    return NextResponse.json({
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        duration_minutes: exam.duration_minutes,
        total_questions: questions.length,
      },
      questions: questions.map(q => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        difficulty: q.difficulty,
        points: q.points,
        order_index: q.order_index,
      })),
      mcqOptions,
      codingQuestions,
      testCases,
    })
  } catch (err) {
    console.error('exam-questions error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
