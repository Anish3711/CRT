import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { attemptId, type, description, violations } = await req.json()

    if (!attemptId || !type) {
      return NextResponse.json({ error: 'attemptId and type are required' }, { status: 400 })
    }

    const { data: attempt, error: fetchError } = await supabase
      .from('guest_attempts')
      .select('violations')
      .eq('id', attemptId)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 404 })
    }

    const existing = Array.isArray(attempt?.violations) ? [...attempt.violations] : []
    existing.push({
      id: `${type}-${Date.now()}`,
      type,
      description: description || `Monitoring event: ${type}`,
      timestamp: new Date().toISOString(),
      count: violations ?? null,
    })

    const { error: updateError } = await supabase
      .from('guest_attempts')
      .update({ violations: existing })
      .eq('id', attemptId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('monitoring route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
