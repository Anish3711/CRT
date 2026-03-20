'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Student login page removed — students use exam-entry form instead
export default function LoginPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/exam-entry') }, [router])
  return null
}
