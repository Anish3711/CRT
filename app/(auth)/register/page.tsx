'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Student register page removed — students use exam-entry form instead
export default function RegisterPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/exam-entry') }, [router])
  return null
}
