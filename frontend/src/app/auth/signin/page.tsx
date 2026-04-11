'use client'
// src/app/auth/signin/page.tsx
import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import Cookies from 'js-cookie'
import { authAPI } from '@/lib/api'
import { ParticleCanvas } from '@/components/ui/ParticleCanvas'
import toast from 'react-hot-toast'

interface FormData { email: string; password: string }

export default function SignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>()

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const res = await authAPI.signin(data.email, data.password)
      const token = res.data?.access_token ?? res.data?.token
      if (token) {
        Cookies.set('lumina_token', token, { expires: 7, sameSite: 'lax' })
        localStorage.setItem('access_token', token)
      }
      toast.success('Welcome back to Lumina')
      const next = searchParams.get('next') || '/chat'
      router.push(next)
    } catch {
      toast.error('Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    color: 'var(--text-primary)',
    background: 'var(--bg-glass)',
  }

  return (
    <main className="bg-chat min-h-screen flex items-center justify-center px-4 sm:px-6 relative overflow-hidden">
      <ParticleCanvas colors={['#d4af37', '#c9897a', '#b8860b', '#fef4e4']} count={30} />

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
            Welcome back
          </h1>
          {/* Cormorant Garamond italic subtitle */}
          <p
            className="font-display italic"
            style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: 300 }}
          >
            Continue your journey inward
          </p>
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="h-px w-12" style={{ background: 'linear-gradient(to right, transparent, var(--divider-color, #d4af37))', opacity: 0.4 }} />
            <span style={{ color: 'var(--gold)', fontSize: '11px', opacity: 0.6 }}>✦</span>
            <div className="h-px w-12" style={{ background: 'linear-gradient(to left, transparent, var(--divider-color, #d4af37))', opacity: 0.4 }} />
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

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

          {/* Password */}
          <div>
            <label
              className="font-future"
              style={{
                display: 'block', fontSize: '10px', letterSpacing: '0.14em',
                textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '7px'
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                {...register('password', { required: true })}
                type={showPassword ? 'text' : 'password'}
                className="lumina-input"
                style={{
                  ...inputStyle,
                  paddingRight: '56px',
                  border: errors.password ? '1px solid #dc2626' : '1px solid var(--border-medium)',
                }}
                placeholder="••••••••"
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

          <motion.button
            type="submit"
            disabled={loading}
            className="glass"
            style={{
              width: '100%', padding: '13px', borderRadius: '12px',
              fontFamily: 'var(--font-rajdhani)', fontWeight: 600, fontSize: '13px',
              letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: '6px',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-primary)',
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
                Entering...
              </span>
            ) : 'Enter Lumina'}
          </motion.button>
        </form>

        <p style={{
          textAlign: 'center', marginTop: '20px', fontSize: '13px',
          fontFamily: 'var(--font-eb-garamond)', color: 'var(--text-muted)'
        }}>
          New to Lumina?{' '}
          <Link
            href="/auth/signup"
            style={{ color: 'var(--gold)', textDecoration: 'none', transition: 'opacity 0.15s' }}
            onMouseEnter={e => ((e.target as HTMLElement).style.opacity = '0.75')}
            onMouseLeave={e => ((e.target as HTMLElement).style.opacity = '1')}
          >
            Create your sanctuary
          </Link>
        </p>
      </motion.div>
    </main>
  )
}