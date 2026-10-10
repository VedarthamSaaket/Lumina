'use client'
import { Suspense } from 'react'
import GoogleAuthCard from '@/components/auth/GoogleAuthCard'

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <GoogleAuthCard mode="signup" />
    </Suspense>
  )
}
