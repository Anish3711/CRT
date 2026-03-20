import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAdminSession, getAllowedAdmins } from '@/lib/admin-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user?.email) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    const normalizedEmail = data.user.email.toLowerCase()
    if (!getAllowedAdmins().includes(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Access denied. Your account is not authorized to access the admin panel.' },
        { status: 403 }
      )
    }

    const response = NextResponse.json({ success: true })
    const session = await createAdminSession(normalizedEmail)

    response.cookies.set(session.name, session.value, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: session.maxAge,
    })

    return response
  } catch (error) {
    console.error('Admin login failed:', error)
    return NextResponse.json({ error: 'Unable to sign in right now.' }, { status: 500 })
  }
}
