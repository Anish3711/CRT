import { NextRequest, NextResponse } from 'next/server'

// Piston API uses specific language versions and names
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

export async function POST(req: NextRequest) {
  try {
    const { code, language, input = '' } = await req.json()

    if (!code || !language) {
      return NextResponse.json({ error: 'Code and language are required' }, { status: 400 })
    }

    const pistonLang = LANGUAGE_MAP[language.toLowerCase()]
    if (!pistonLang) {
      return NextResponse.json({ error: `Unsupported language: ${language}` }, { status: 400 })
    }

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
        stdin: input,
      }),
    })

    const data = await response.json()

    if (data.message) {
      return NextResponse.json({ error: data.message }, { status: 500 })
    }

    return NextResponse.json({
      output: data.run.stdout,
      error: data.run.stderr,
      exitCode: data.run.code,
    })
  } catch (error) {
    console.error('Compilation error:', error)
    return NextResponse.json({ error: 'Failed to compile code' }, { status: 500 })
  }
}
