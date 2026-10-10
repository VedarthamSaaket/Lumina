'use client'
import { Suspense } from 'react'
import GoogleAuthCard from '@/components/auth/GoogleAuthCard'

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <GoogleAuthCard mode="signin" />
    </Suspense>
  )
}
