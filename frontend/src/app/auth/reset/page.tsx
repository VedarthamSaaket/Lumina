'use client'
// src/app/auth/reset/page.tsx
import { Suspense, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { authAPI } from '@/lib/api'
import Grainient from '@/components/ui/Grainient'
import toast from 'react-hot-toast'

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="font-future"
      style={{
        display: 'block', fontSize: '10px', letterSpacing: '0.14em',
        textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '7px',
      }}
    >
      {children}
    </label>
  )
}

function ResetForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const codeInputRef = useRef<HTMLInputElement>(null)

  // Prefill email from the query string (sent here by /auth/forgot)
  useEffect(() => {
    const q = searchParams.get('email')
    if (q) setEmail(q)
    codeInputRef.current?.focus()
  }, [searchParams])

  // Resend cooldown ticker
  useEffect(() => {
    if (resendIn <= 0) return
    const t = setInterval(() => setResendIn(s => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [resendIn])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { toast.error('Enter your email'); return }
    if (code.trim().length !== 6) { toast.error('Enter the 6-digit code from your email'); return }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (password !== confirm) { toast.error('Passwords do not match'); return }

    setLoading(true)
    try {
      await authAPI.resetPassword(email.trim(), code.trim(), password)
      toast.success('Password updated. Please sign in.')
      router.push('/auth/signin')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Invalid or expired reset code')
    } finally {
      setLoading(false)
    }
  }

  const onResend = async () => {
    if (!email) { toast.error('Enter your email first'); return }
    if (resendIn > 0) return
    setResending(true)
    try {
      await authAPI.forgotPassword(email.trim())
      toast.success('If that email exists, a new code is on its way')
      setResendIn(30)
    } catch {
      toast.error('Could not resend the code')
    } finally {
      setResending(false)
    }
  }

  const inputStyle = {
    color: 'var(--text-primary)',
    background: 'var(--bg-glass)',
    border: '1px solid var(--border-medium)',
  }

  return (
    <main className="bg-chat min-h-screen flex items-center justify-center px-4 sm:px-6 py-20 relative overflow-hidden">

      {/* Hero-style Grainient background */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          <Grainient
            color1="#c4a882"
            color2="#f0dfc0"
            color3="#3a2a1e"
            timeSpeed={0.14}
            warpStrength={0.9}
            warpFrequency={3.5}
            warpSpeed={1.2}
            grainAmount={0.0}
            contrast={1.4}
            saturation={0.78}
            zoom={0.85}
          />
        </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="glass-strong rounded-3xl w-full relative z-10 auth-card-responsive"
        style={{ maxWidth: '400px', padding: '36px 40px' }}
      >
        {/* Header */}
        <div className="text-center" style={{ marginBottom: '28px' }}>
          <h1
            className="font-display font-light"
            style={{ fontSize: '2.6rem', letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '6px' }}
          >
            Reset password
          </h1>
          <p
            className="font-display italic"
            style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: 300 }}
          >
            Enter your code and a new password
          </p>
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="h-px w-12" style={{ background: 'linear-gradient(to right, transparent, var(--divider-color, #d4af37))', opacity: 0.4 }} />
            <span style={{ color: 'var(--gold)', fontSize: '11px', opacity: 0.6 }}>*</span>
            <div className="h-px w-12" style={{ background: 'linear-gradient(to left, transparent, var(--divider-color, #d4af37))', opacity: 0.4 }} />
          </div>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Email */}
          <div>
            <FieldLabel>Email</FieldLabel>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              className="lumina-input"
              style={inputStyle}
              placeholder="you@example.com"
            />
          </div>

          {/* Code */}
          <div>
            <FieldLabel>Verification Code</FieldLabel>
            <input
              ref={codeInputRef}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              className="lumina-input"
              style={{
                ...inputStyle,
                textAlign: 'center',
                fontFamily: 'var(--font-jost)',
                fontSize: '26px',
                letterSpacing: '0.5em',
                paddingLeft: '0.5em',
                fontWeight: 600,
              }}
              placeholder="••••••"
            />
          </div>

          {/* New password */}
          <div>
            <FieldLabel>New Password</FieldLabel>
            <div style={{ position: 'relative' }}>
              <input
                value={password}
                onChange={e => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                className="lumina-input"
                style={{ ...inputStyle, paddingRight: '56px' }}
                placeholder="Min. 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  fontFamily: 'var(--font-jost)', fontSize: '10px', letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: 'var(--text-muted)', opacity: 0.6,
                  background: 'none', border: 'none', cursor: 'pointer', transition: 'opacity 0.15s',
                  userSelect: 'none',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <FieldLabel>Confirm New Password</FieldLabel>
            <input
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              type={showPassword ? 'text' : 'password'}
              className="lumina-input"
              style={inputStyle}
              placeholder="••••••••"
            />
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            className="glass"
            style={{
              width: '100%', padding: '13px', borderRadius: '12px',
              fontFamily: 'var(--font-rajdhani)', fontWeight: 600, fontSize: '13px',
              letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: '6px',
              border: '1px solid var(--border-medium)', color: 'var(--text-primary)',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
              transition: 'all 0.25s',
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <motion.div
                  style={{
                    width: '14px', height: '14px', borderRadius: '50%',
                    border: '2px solid var(--border-medium)', borderTopColor: 'var(--text-primary)'
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                Updating...
              </span>
            ) : 'Update Password'}
          </motion.button>

          <button
            type="button"
            onClick={onResend}
            disabled={resending || resendIn > 0}
            style={{
              background: 'none', border: 'none',
              cursor: resendIn > 0 ? 'default' : 'pointer',
              textAlign: 'center', fontSize: '12px',
              fontFamily: 'var(--font-eb-garamond)',
              color: resendIn > 0 ? 'var(--text-muted)' : 'var(--gold)',
              textDecoration: resendIn > 0 ? 'none' : 'underline',
              opacity: resendIn > 0 ? 0.6 : 0.9,
            }}
          >
            {resendIn > 0 ? `Resend code in ${resendIn}s` : "Didn't get a code? Resend"}
          </button>
        </form>

        <p style={{
          textAlign: 'center', marginTop: '20px', fontSize: '13px',
          fontFamily: 'var(--font-eb-garamond)', color: 'var(--text-muted)'
        }}>
          Back to{' '}
          <Link
            href="/auth/signin"
            style={{ color: 'var(--gold)', textDecoration: 'none', transition: 'opacity 0.15s' }}
            onMouseEnter={e => ((e.target as HTMLElement).style.opacity = '0.75')}
            onMouseLeave={e => ((e.target as HTMLElement).style.opacity = '1')}
          >
            sign in
          </Link>
        </p>
      </motion.div>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="bg-chat min-h-screen" />}>
      <ResetForm />
    </Suspense>
  )
}
