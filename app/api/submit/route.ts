import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateMaximumScore, getQuestionPoints } from '@/lib/scoring'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { attemptId, answers, examId, codingLanguages } = body

    if (!attemptId) {
      return NextResponse.json({ error: 'attemptId is required' }, { status: 400 })
    }

    let earnedPoints = 0
    let percentageScore = 0
    let correctAnswers = 0
    let wrongAnswers = 0
    let totalQuestions = 0
    let maxPoints = 0

    if (answers && examId) {
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('id, question_type, points')
        .eq('exam_id', examId)

      if (questionsError) {
        return NextResponse.json({ error: questionsError.message }, { status: 500 })
      }

      if (questions && questions.length > 0) {
        totalQuestions = questions.length
        maxPoints = calculateMaximumScore(questions)

        const questionPoints = new Map<string, number>()
        for (const question of questions) {
          questionPoints.set(question.id, getQuestionPoints(question.question_type))
        }

        const mcqIds = questions.filter((question) => question.question_type === 'mcq').map((question) => question.id)
        if (mcqIds.length > 0) {
          const { data: allOptions, error: optionsError } = await supabase
            .from('mcq_options')
            .select('id, is_correct')
            .in('question_id', mcqIds)

          if (optionsError) {
            return NextResponse.json({ error: optionsError.message }, { status: 500 })
          }

          const optionCorrectMap: Record<string, boolean> = {}
          for (const option of allOptions || []) {
            optionCorrectMap[option.id] = option.is_correct
          }

          for (const questionId of mcqIds) {
            const studentAnswerId = answers[questionId]
            if (studentAnswerId && optionCorrectMap[studentAnswerId]) {
              correctAnswers++
              earnedPoints += questionPoints.get(questionId) || 0
            } else {
              wrongAnswers++
            }
          }
        }

        const codingIds = questions.filter((question) => question.question_type === 'coding').map((question) => question.id)
        for (const questionId of codingIds) {
          const studentCode = answers[questionId]
          if (!studentCode) {
            wrongAnswers++
            continue
          }

          try {
            const baseUrl = req.headers.get('host') || 'localhost:3000'
            const protocol = req.headers.get('x-forwarded-proto') || 'http'
            const validationResponse = await fetch(`${protocol}://${baseUrl}/api/validate-code`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                code: studentCode,
                questionId,
                language: codingLanguages?.[questionId],
              }),
            })

            const validationData = await validationResponse.json()
            if (validationResponse.ok && validationData.allPassed) {
              correctAnswers++
              earnedPoints += questionPoints.get(questionId) || 0
            } else {
              wrongAnswers++
            }
          } catch (validationError) {
            console.error('Error validating code:', validationError)
            wrongAnswers++
          }
        }

        percentageScore = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 0
      }
    }

    const { error } = await supabase
      .from('guest_attempts')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        answers: answers || {},
        score: percentageScore,
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
        wrong_answers: wrongAnswers,
      })
      .eq('id', attemptId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Exam submitted successfully',
      score: percentageScore,
      earnedPoints,
      maxPoints,
      correctAnswers,
      wrongAnswers,
      totalQuestions,
    })
  } catch (err) {
    console.error('submit route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
