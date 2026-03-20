import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured in .env.local' }, { status: 500 })
    }

    const { topic, count = 5, difficulty = 'medium' } = await req.json()
    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
    }

    const prompt = `Generate exactly ${count} multiple choice questions about "${topic}" at ${difficulty} difficulty level.

Return ONLY a valid JSON array. Each object must have these exact keys:
- "questionText": the question string
- "optionA": first option
- "optionB": second option
- "optionC": third option
- "optionD": fourth option
- "correctAnswer": one of "A", "B", "C", or "D"

Do NOT include markdown, code blocks, or explanations. Return ONLY the JSON array.`

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

    // Extract JSON from the response (handle potential markdown wrapping)
    let jsonStr = text.trim()
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    const questions = JSON.parse(jsonStr)
    return NextResponse.json({ questions })
  } catch (err) {
    console.error('Gemini MCQ generation error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to generate questions' }, { status: 500 })
  }
}
