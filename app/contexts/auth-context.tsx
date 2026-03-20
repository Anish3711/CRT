'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { loginAction, registerAction, logoutAction, getSessionAction } from '@/app/actions/auth'

export type Student = {
  id: string
  email: string
  full_name: string
  enrollment_id: string | null
}

type AuthContextType = {
  student: Student | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string, enrollmentId: string) => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check for existing session on mount
    const checkSession = async () => {
      try {
        const result = await getSessionAction()
        if (result.success && result.student) {
          setStudent(result.student)
        }
      } catch (err) {
        console.error('Session check error:', err)
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [])

  const login = async (email: string, password: string) => {
    setError(null)
    try {
      const result = await loginAction(email, password)
      
      if (!result.success) {
        throw new Error(result.error || 'Login failed')
      }
      
      if (result.student) {
        setStudent(result.student)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      throw err
    }
  }

  const register = async (email: string, password: string, fullName: string, enrollmentId: string) => {
    setError(null)
    try {
      const result = await registerAction(email, password, fullName, enrollmentId)
      
      if (!result.success) {
        throw new Error(result.error || 'Registration failed')
      }
      
      if (result.student) {
        setStudent(result.student)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      setError(message)
      throw err
    }
  }

  const logout = async () => {
    setError(null)
    try {
      await logoutAction()
      setStudent(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed'
      setError(message)
      throw err
    }
  }

  return (
    <AuthContext.Provider
      value={{
        student,
        loading,
        error,
        login,
        register,
        logout,
        isAuthenticated: !!student,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
