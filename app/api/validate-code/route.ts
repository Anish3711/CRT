import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { executeCodeLocally } from '@/lib/local-code-execution'
import { normalizeStdin } from '@/lib/code-input-normalizer'
import { normalizeJudgeOutput } from '@/lib/code-output-normalizer'

// Piston API language mapping
const LANGUAGE_MAP: Record<string, { language: string, version: string }> = {
  javascript: { language: 'javascript', version: '18.15.0' },
  python: { language: 'python', version: '3.10.0' },
  java: { language: 'java', version: '15.0.2' },
  cpp: { language: 'c++', version: '10.2.0' },
  c: { language: 'c', version: '10.2.0' },
  go: { language: 'go', version: '1.16.2' },
  ruby: { language: 'ruby', version: '3.0.1' },
  rust: { language: 'rust', version: '1.68.2' },
  typescript: { language: 'typescript', version: '5.0.3' },
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Validates code against multiple test cases
 * Returns: { allPassed: boolean, results: [{ testCaseId, passed, actual, expected }] }
 */
export async function POST(req: NextRequest) {
  try {
    const { code, language, testCases, questionId } = await req.json()

    let resolvedLanguage = language
    let resolvedTestCases = testCases

    if (questionId && (!resolvedLanguage || !Array.isArray(resolvedTestCases))) {
      const { data: codingQuestion, error: codingError } = await supabase
        .from('coding_questions')
        .select('id, language')
        .eq('question_id', questionId)
        .single()

      if (codingError || !codingQuestion) {
        return NextResponse.json({ error: 'Coding question not found' }, { status: 404 })
      }

      let fetchedTestCases: Array<Record<string, unknown>> = []
      let testCaseError: { message?: string } | null = null

      const selectVariants = [
        'id, input_data, expected_output',
        'id, input, expected_output',
      ]

      for (const selectClause of selectVariants) {
        const result = await supabase
          .from('test_cases')
          .select(selectClause)
          .eq('coding_question_id', codingQuestion.id)

        if (!result.error) {
          fetchedTestCases = (result.data || []) as unknown as Array<Record<string, unknown>>
          testCaseError = null
          break
        }

        const message = result.error.message.toLowerCase()
        const isSchemaMismatch =
          message.includes("column test_cases.input does not exist") ||
          message.includes("column test_cases.input_data does not exist") ||
          message.includes("could not find the 'input' column") ||
          message.includes("could not find the 'input_data' column")

        if (!isSchemaMismatch) {
          testCaseError = result.error
          break
        }

        testCaseError = result.error
      }

      if (testCaseError) {
        return NextResponse.json({ error: 'Failed to load test cases' }, { status: 500 })
      }

      resolvedLanguage = codingQuestion.language
      resolvedTestCases = fetchedTestCases || []
    }

    if (!code || !resolvedLanguage || !resolvedTestCases || !Array.isArray(resolvedTestCases)) {
      return NextResponse.json(
        { error: 'Code plus either questionId or language/testCases are required' },
        { status: 400 }
      )
    }

    if (resolvedTestCases.length === 0) {
      return NextResponse.json(
        { error: 'No test cases are configured for this coding question.' },
        { status: 400 }
      )
    }

    const pistonLang = LANGUAGE_MAP[resolvedLanguage.toLowerCase()]
    if (!pistonLang) {
      return NextResponse.json(
        { error: `Unsupported language: ${resolvedLanguage}` },
        { status: 400 }
      )
    }

    // Run tests against each test case
    const results = []
    let allPassed = true

    for (const testCase of resolvedTestCases) {
      try {
        const stdin = normalizeStdin(
          code,
          resolvedLanguage,
          String(testCase.input_data || testCase.input || '').trim()
        )
        const expectedOutput = String(testCase.expected_output || '')
        let actualOutput = ''
        let runtimeError: string | null = null
        let exitCode = 0

        try {
          const localResult = await executeCodeLocally({
            code,
            language: resolvedLanguage,
            stdin,
          })
          actualOutput = localResult.stdout || ''
          runtimeError = localResult.stderr || null
          exitCode = localResult.exitCode
        } catch (localError) {
          const response = await fetch('https://emkc.org/api/v2/piston/execute', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              language: pistonLang.language,
              version: pistonLang.version,
              files: [
                {
                  content: code,
                },
              ],
              stdin,
            }),
          })

          const data = await response.json()

          if (data.message) {
            results.push({
              testCaseId: testCase.id || testCase.input_data,
              passed: false,
              actual: '',
              expected: expectedOutput,
              error: `${data.message} Local fallback also failed: ${localError instanceof Error ? localError.message : String(localError)}`,
            })
            allPassed = false
            continue
          }

          actualOutput = data.run.stdout || ''
          runtimeError = data.run.stderr || null
          exitCode = data.run.code || 0
        }

        const hasRuntimeError = Boolean(runtimeError && runtimeError.trim())
        const normalizedActualOutput = normalizeJudgeOutput(actualOutput)
        const normalizedExpectedOutput = normalizeJudgeOutput(expectedOutput)
        const passed = !hasRuntimeError && exitCode === 0 && normalizedActualOutput === normalizedExpectedOutput

        results.push({
          testCaseId: testCase.id || testCase.input_data,
          passed,
          actual: normalizedActualOutput,
          expected: normalizedExpectedOutput,
          error: runtimeError,
          exitCode,
        })

        if (!passed) {
          allPassed = false
        }
      } catch (testError) {
        results.push({
          testCaseId: testCase.id || testCase.input_data,
          passed: false,
          actual: '',
          expected: testCase.expected_output,
          error: testError instanceof Error ? testError.message : 'Unknown error',
        })
        allPassed = false
      }
    }

    return NextResponse.json({
      allPassed,
      results,
    })
  } catch (error) {
    console.error('Code validation error:', error)
    return NextResponse.json(
      { error: 'Failed to validate code' },
      { status: 500 }
    )
  }
}
