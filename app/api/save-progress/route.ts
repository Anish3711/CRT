import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { attemptId, answers } = await req.json()

    if (!attemptId) {
      return NextResponse.json({ error: 'attemptId is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('guest_attempts')
      .update({ answers: answers || {} })
      .eq('id', attemptId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('save-progress route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
