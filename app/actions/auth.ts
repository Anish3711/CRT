'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Create server-side Supabase client
function getServerSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(supabaseUrl, supabaseAnonKey)
}

export type AuthResult = {
  success: boolean
  error?: string
  user?: {
    id: string
    email: string
  }
  student?: {
    id: string
    email: string
    full_name: string
    enrollment_id: string | null
  }
}

export async function loginAction(email: string, password: string): Promise<AuthResult> {
  try {
    const supabase = getServerSupabase()
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      return { 
        success: false, 
        error: error.message === 'Invalid login credentials' 
          ? 'Invalid email or password. Please check your credentials and try again.'
          : error.message 
      }
    }
    
    if (!data.user) {
      return { success: false, error: 'Login failed' }
    }
    
    // Fetch student profile
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle()
    
    if (studentError) {
      return { success: false, error: 'Failed to fetch student profile' }
    }
    
    if (!studentData) {
      return { success: false, error: 'Student profile not found. Please register first.' }
    }
    
    // Store session token in cookie for client-side use
    const cookieStore = await cookies()
    cookieStore.set('sb-access-token', data.session?.access_token || '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
    cookieStore.set('sb-refresh-token', data.session?.refresh_token || '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
    cookieStore.set('sb-user-id', data.user.id, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
    
    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email || '',
      },
      student: {
        id: studentData.id,
        email: studentData.email,
        full_name: studentData.full_name,
        enrollment_id: studentData.enrollment_id,
      },
    }
  } catch (err) {
    console.error('Login error:', err)
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Login failed' 
    }
  }
}

export async function registerAction(
  email: string, 
  password: string, 
  fullName: string, 
  enrollmentId: string
): Promise<AuthResult> {
  try {
    const supabase = getServerSupabase()
    
    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          enrollment_id: enrollmentId,
        },
      },
    })
    
    if (authError) {
      return { success: false, error: authError.message }
    }
    
    if (!authData.user) {
      return { success: false, error: 'Failed to create account' }
    }
    
    // If email confirmation is required and no session, try signing in
    if (!authData.session) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (signInError) {
        return { 
          success: false, 
          error: 'Account created! Please check your email to verify your account, then log in.' 
        }
      }
      
      // Create student profile with sign-in user
      const { error: insertError } = await supabase.from('students').insert({
        id: signInData.user.id,
        email,
        full_name: fullName,
        enrollment_id: enrollmentId,
        password_hash: 'supabase_managed',
      })
      
      if (insertError) {
        console.error('Student profile insert error:', insertError)
        return { 
          success: false, 
          error: 'Account created but failed to set up student profile. Please contact support.' 
        }
      }
      
      // Store session
      const cookieStore = await cookies()
      cookieStore.set('sb-access-token', signInData.session?.access_token || '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      })
      cookieStore.set('sb-refresh-token', signInData.session?.refresh_token || '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      })
      cookieStore.set('sb-user-id', signInData.user.id, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      })
      
      return {
        success: true,
        user: {
          id: signInData.user.id,
          email: signInData.user.email || '',
        },
        student: {
          id: signInData.user.id,
          email,
          full_name: fullName,
          enrollment_id: enrollmentId,
        },
      }
    }
    
    // Session is available, create student profile directly
    const { error: insertError } = await supabase.from('students').insert({
      id: authData.user.id,
      email,
      full_name: fullName,
      enrollment_id: enrollmentId,
      password_hash: 'supabase_managed',
    })
    
    if (insertError) {
      console.error('Student profile insert error:', insertError)
      return { 
        success: false, 
        error: 'Account created but failed to set up student profile. Please contact support.' 
      }
    }
    
    // Store session
    const cookieStore = await cookies()
    cookieStore.set('sb-access-token', authData.session?.access_token || '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    })
    cookieStore.set('sb-refresh-token', authData.session?.refresh_token || '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    })
    cookieStore.set('sb-user-id', authData.user.id, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    })
    
    return {
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email || '',
      },
      student: {
        id: authData.user.id,
        email,
        full_name: fullName,
        enrollment_id: enrollmentId,
      },
    }
  } catch (err) {
    console.error('Registration error:', err)
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Registration failed' 
    }
  }
}

export async function logoutAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const cookieStore = await cookies()
    cookieStore.delete('sb-access-token')
    cookieStore.delete('sb-refresh-token')
    cookieStore.delete('sb-user-id')
    
    return { success: true }
  } catch (err) {
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Logout failed' 
    }
  }
}

export async function getSessionAction(): Promise<AuthResult> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('sb-access-token')?.value
    const userId = cookieStore.get('sb-user-id')?.value
    
    if (!accessToken || !userId) {
      return { success: false }
    }
    
    const supabase = getServerSupabase()

    const { data: authUser, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || authUser.user?.id !== userId) {
      return { success: false }
    }
    
    // Fetch student profile
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    
    if (studentError || !studentData) {
      return { success: false }
    }
    
    return {
      success: true,
      user: {
        id: userId,
        email: studentData.email,
      },
      student: {
        id: studentData.id,
        email: studentData.email,
        full_name: studentData.full_name,
        enrollment_id: studentData.enrollment_id,
      },
    }
  } catch {
    return { success: false }
  }
}
