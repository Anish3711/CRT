import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured in .env.local' }, { status: 500 })
    }

    const { topic, difficulty = 'medium' } = await req.json()
    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
    }

    const prompt = `Generate a single coding problem about "${topic}" at ${difficulty} difficulty level.

Return ONLY a valid JSON object with these exact keys:
- "title": short title for the problem
- "description": detailed problem description (2-4 sentences)
- "inputFormat": description of input format
- "outputFormat": description of output format
- "constraints": any constraints
- "sampleInput": a sample input string
- "sampleOutput": the corresponding expected output  
- "testCases": an array of 3 test case objects, each with "input", "expectedOutput", and "isHidden" (boolean, make the last one hidden)
- "allowedLanguages": an array containing exactly one item: "python"

Do NOT include markdown, code blocks, or explanations. Return ONLY the JSON object.`

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          },
        }),
      }
    )

    const data = await res.json()

    if (data.error) {
      return NextResponse.json({ error: data.error.message || 'Gemini API error' }, { status: 500 })
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    let jsonStr = text.trim()
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const problem = JSON.parse(jsonStr)
    return NextResponse.json({ problem })
  } catch (err) {
    console.error('Gemini coding generation error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to generate coding problem' }, { status: 500 })
  }
}
