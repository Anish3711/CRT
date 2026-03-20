import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

      const { data: fetchedTestCases, error: testCaseError } = await supabase
        .from('test_cases')
        .select('id, input_data, input, expected_output')
        .eq('coding_question_id', codingQuestion.id)

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
            stdin: (testCase.input_data || testCase.input || '').trim(),
          }),
        })

        const data = await response.json()

        if (data.message) {
          results.push({
            testCaseId: testCase.id || testCase.input_data,
            passed: false,
            actual: '',
            expected: testCase.expected_output,
            error: data.message,
          })
          allPassed = false
          continue
        }

        const actualOutput = (data.run.stdout || '').trim()
        const expectedOutput = (testCase.expected_output || '').trim()
        const passed = actualOutput === expectedOutput

        results.push({
          testCaseId: testCase.id || testCase.input_data,
          passed,
          actual: actualOutput,
          expected: expectedOutput,
          error: data.run.stderr || null,
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
