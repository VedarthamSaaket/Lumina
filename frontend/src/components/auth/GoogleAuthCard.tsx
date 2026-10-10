'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Cookies from 'js-cookie'
import toast from 'react-hot-toast'
import { authAPI } from '@/lib/api'
import { firebaseConfigured, signInWithGoogle } from '@/lib/firebase'
import Grainient from '@/components/ui/Grainient'

type Mode = 'signin' | 'signup'

const COPY: Record<Mode, { title: string; subtitle: string; button: string; switchText: string; switchLink: string; switchHref: string }> = {
  signin: {
    title: 'Welcome back',
    subtitle: 'Continue your journey inward',
    button: 'Continue with Google',
    switchText: 'New to Lumina?',
    switchLink: 'Create your sanctuary',
    switchHref: '/auth/signup',
  },
  signup: {
    title: 'Begin here',
    subtitle: 'Your sanctuary, one step away',
    button: 'Sign up with Google',
    switchText: 'Already have a sanctuary?',
    switchLink: 'Sign in',
    switchHref: '/auth/signin',
  },
}

const SIGNIN_ERRORS: Record<string, string> = {
  'auth/operation-not-allowed': 'Google sign-in is not switched on in the Firebase console (Authentication, Sign-in method).',
  'auth/configuration-not-found': 'Firebase Authentication is not set up for this project yet. Open Authentication in the console and press Get started.',
  'auth/unauthorized-domain': 'This address is not in Firebase authorized domains (Authentication, Settings).',
  'auth/invalid-api-key': 'The Firebase API key in the frontend env file is not valid.',
  'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'The Firebase API key in the frontend env file is not valid.',
  'auth/popup-blocked': 'The browser blocked the Google popup. Allow popups for this site and try again.',
  'auth/network-request-failed': 'Could not reach Google. Check your connection and try again.',
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

export default function GoogleAuthCard({ mode }: { mode: Mode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const copy = COPY[mode]

  const handleGoogle = async () => {
    if (!firebaseConfigured) {
      toast.error('Sign-in is not set up yet. Add the Firebase keys to the frontend env file.')
      return
    }
    setLoading(true)
    try {
      const idToken = await signInWithGoogle()
      const res = await authAPI.firebaseSignin(idToken)
      const token = res.data?.access_token
      if (token) {
        Cookies.set('lumina_token', token, { expires: 30, sameSite: 'lax' })
        localStorage.setItem('access_token', token)
      }
      const next = searchParams.get('next') || '/chat'
      if (res.data?.is_new) {
        toast.success('Welcome to Lumina')
        router.push(`/auth/welcome?next=${encodeURIComponent(next)}`)
      } else {
        toast.success('Welcome back to Lumina')
        router.push(next)
      }
    } catch (err) {
      const code = (err as { code?: string })?.code || ''
      const status = (err as { response?: { status?: number } })?.response?.status
      console.error('[auth] Google sign-in failed', code || status || err)
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        toast.error(SIGNIN_ERRORS[code] || (status ? `Lumina's server refused the sign-in (${status}).` : `Could not sign you in with Google${code ? ` (${code})` : ''}.`), { duration: 9000 })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="bg-chat min-h-screen flex items-center justify-center px-4 sm:px-6 py-20 relative overflow-hidden">
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <Grainient
          color1="#c9a06a"
          color2="#ecd2a4"
          color3="#3b2c1c"
          timeSpeed={0.14}
          warpStrength={0.9}
          warpFrequency={3.5}
          warpSpeed={1.2}
          grainAmount={0.0}
          contrast={1.4}
          saturation={0.85}
          zoom={0.85}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="glass-strong rounded-3xl w-full relative z-10 auth-card-responsive"
        style={{ maxWidth: '400px', padding: '40px 40px 34px' }}
      >
        <div className="text-center" style={{ marginBottom: '30px' }}>
          <h1
            className="font-display font-light"
            style={{ fontSize: '2.6rem', letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '6px' }}
          >
            {copy.title}
          </h1>
          <p
            className="font-display italic"
            style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: 300 }}
          >
            {copy.subtitle}
          </p>
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="h-px w-12" style={{ background: 'linear-gradient(to right, transparent, var(--divider-color, #d4af37))', opacity: 0.4 }} />
            <span style={{ color: 'var(--gold)', fontSize: '11px', opacity: 0.6 }}>*</span>
            <div className="h-px w-12" style={{ background: 'linear-gradient(to left, transparent, var(--divider-color, #d4af37))', opacity: 0.4 }} />
          </div>
        </div>

        <motion.button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="glass"
          style={{
            width: '100%', padding: '14px', borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
            fontFamily: 'var(--font-rajdhani)', fontWeight: 600, fontSize: '13px',
            letterSpacing: '0.14em', textTransform: 'uppercase',
            border: '1px solid var(--border-medium)', color: 'var(--text-primary)',
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
            transition: 'all 0.25s',
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {loading ? (
            <>
              <motion.div
                style={{
                  width: '14px', height: '14px', borderRadius: '50%',
                  border: '2px solid var(--border-medium)', borderTopColor: 'var(--text-primary)',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              Entering...
            </>
          ) : (
            <>
              <GoogleMark />
              {copy.button}
            </>
          )}
        </motion.button>

        <p style={{
          textAlign: 'center', marginTop: '16px', fontSize: '12.5px', lineHeight: 1.6,
          fontFamily: 'var(--font-eb-garamond)', color: 'var(--text-muted)',
        }}>
          Lumina never sees or stores a password. Your Google account only tells us your name and email.
        </p>

        <p style={{
          textAlign: 'center', marginTop: '20px', fontSize: '13px',
          fontFamily: 'var(--font-eb-garamond)', color: 'var(--text-muted)',
        }}>
          {copy.switchText}{' '}
          <Link href={copy.switchHref} style={{ color: 'var(--gold)', textDecoration: 'none' }}>
            {copy.switchLink}
          </Link>
        </p>
      </motion.div>
    </main>
  )
}
