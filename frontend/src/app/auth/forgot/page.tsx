'use client'
// src/app/auth/forgot/page.tsx
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { authAPI } from '@/lib/api'
import Grainient from '@/components/ui/Grainient'
import toast from 'react-hot-toast'

interface FormData { email: string }

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>()

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      await authAPI.forgotPassword(data.email)
      // Generic response regardless of whether the email exists (no enumeration).
      toast.success('If that email exists, a reset code is on its way')
      router.push(`/auth/reset?email=${encodeURIComponent(data.email)}`)
    } catch {
      toast.error('Something went wrong. Please try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    color: 'var(--text-primary)',
    background: 'var(--bg-glass)',
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
            Forgot password
          </h1>
          <p
            className="font-display italic"
            style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: 300 }}
          >
            We&rsquo;ll send a code to reset it
          </p>
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="h-px w-12" style={{ background: 'linear-gradient(to right, transparent, var(--divider-color, #d4af37))', opacity: 0.4 }} />
            <span style={{ color: 'var(--gold)', fontSize: '11px', opacity: 0.6 }}>*</span>
            <div className="h-px w-12" style={{ background: 'linear-gradient(to left, transparent, var(--divider-color, #d4af37))', opacity: 0.4 }} />
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <p style={{
            fontSize: '13px', lineHeight: '1.7',
            fontFamily: 'var(--font-eb-garamond)',
            color: 'var(--text-muted)', textAlign: 'center', marginBottom: '2px',
          }}>
            Enter the email tied to your sanctuary. If we find it, you&rsquo;ll
            receive a 6-digit code to set a new password.
          </p>

          {/* Email */}
          <div>
            <label
              className="font-future"
              style={{
                display: 'block', fontSize: '10px', letterSpacing: '0.14em',
                textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '7px'
              }}
            >
              Email
            </label>
            <input
              {...register('email', { required: true })}
              type="email"
              className="lumina-input"
              style={{
                ...inputStyle,
                border: errors.email ? '1px solid #dc2626' : '1px solid var(--border-medium)',
              }}
              placeholder="you@example.com"
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
                Sending...
              </span>
            ) : 'Send Reset Code'}
          </motion.button>
        </form>

        <p style={{
          textAlign: 'center', marginTop: '20px', fontSize: '13px',
          fontFamily: 'var(--font-eb-garamond)', color: 'var(--text-muted)'
        }}>
          Remembered it?{' '}
          <Link
            href="/auth/signin"
            style={{ color: 'var(--gold)', textDecoration: 'none', transition: 'opacity 0.15s' }}
            onMouseEnter={e => ((e.target as HTMLElement).style.opacity = '0.75')}
            onMouseLeave={e => ((e.target as HTMLElement).style.opacity = '1')}
          >
            Back to sign in
          </Link>
        </p>
      </motion.div>
    </main>
  )
}
