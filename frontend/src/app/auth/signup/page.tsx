'use client'
// src/app/auth/signup/page.tsx
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import Cookies from 'js-cookie'
import { authAPI } from '@/lib/api'
import { ParticleCanvas } from '@/components/ui/ParticleCanvas'
import toast from 'react-hot-toast'

interface StepOneData {
  email: string
  password: string
  confirmPassword: string
  ageConfirmed: boolean
}

interface StepTwoData {
  fullName: string
  age: string
  gender: string
}

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer-not-say', label: 'Prefer not to say' },
]

const inputStyle = (hasError: boolean) => ({
  color: 'var(--text-primary)',
  background: 'var(--bg-glass)',
  border: hasError ? '1px solid #dc2626' : '1px solid var(--border-medium)',
})

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

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '28px' }}>
      {[1, 2].map(n => (
        <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <motion.div
            animate={{
              background: step >= n
                ? 'linear-gradient(135deg, #d4af37, #c4913a)'
                : 'rgba(212, 175, 55, 0.08)',
              border: step >= n
                ? '1px solid rgba(212,175,55,0.6)'
                : '1px solid rgba(212,175,55,0.2)',
            }}
            transition={{ duration: 0.3 }}
            style={{
              width: '28px', height: '28px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontFamily: 'var(--font-rajdhani)', fontWeight: 700,
              color: step >= n ? '#1a0e04' : 'var(--text-muted)',
            }}
          >
            {n}
          </motion.div>
          {n === 1 && (
            <div style={{
              width: '40px', height: '1px',
              background: step > 1
                ? 'linear-gradient(90deg, #d4af37, #c4913a)'
                : 'rgba(212,175,55,0.15)',
              transition: 'background 0.4s',
            }} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function SignUpPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [stepOneCache, setStepOneCache] = useState<StepOneData | null>(null)

  const {
    register: reg1, handleSubmit: handle1,
    formState: { errors: err1 },
  } = useForm<StepOneData>()

  const {
    register: reg2, handleSubmit: handle2,
    formState: { errors: err2 },
  } = useForm<StepTwoData>()

  const onStep1 = (data: StepOneData) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setStepOneCache(data)
    setStep(2)
  }

  const onStep2 = async (data: StepTwoData) => {
    if (!stepOneCache) return
    setLoading(true)
    try {
      const res = await authAPI.signup(
        stepOneCache.email,
        stepOneCache.password,
        stepOneCache.ageConfirmed,
        {
          fullName: data.fullName || undefined,
          age: data.age ? parseInt(data.age, 10) : undefined,
          gender: data.gender || undefined,
        }
      )
      const token = res.data?.access_token ?? res.data?.token
      if (token) {
        Cookies.set('lumina_token', token, { expires: 7, sameSite: 'lax' })
        localStorage.setItem('access_token', token)
      }
      toast.success('Your sanctuary awaits')
      router.push('/chat')
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const toggleBtn = (visible: boolean, toggle: () => void) => (
    <button
      type="button"
      onClick={toggle}
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
      {visible ? 'Hide' : 'Show'}
    </button>
  )

  return (
    <main className="bg-landing min-h-screen flex items-center justify-center px-4 sm:px-6 py-20 relative overflow-hidden">
      <ParticleCanvas colors={['#d4af37', '#c9897a', '#b8860b', '#fef4e4']} count={40} />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="glass-strong rounded-3xl w-full relative z-10 auth-card-responsive"
        style={{ maxWidth: '512px', padding: '40px 44px' }}
      >
        {/* Header */}
        <div className="text-center" style={{ marginBottom: '28px' }}>
          <h1
            className="font-display font-light"
            style={{ fontSize: '3.5rem', letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '8px' }}
          >
            {step === 1 ? 'Begin Here' : 'About You'}
          </h1>
          {/* Cormorant Garamond italic subtitle */}
          <p
            className="font-display italic"
            style={{ fontSize: '1.15rem', fontWeight: 300, color: 'var(--text-secondary)' }}
          >
            {step === 1
              ? 'Every journey starts with a single step inward'
              : 'Help us personalise your experience'}
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="h-px w-16" style={{ background: 'linear-gradient(to right, transparent, var(--divider-color, #d4af37))', opacity: 0.4 }} />
            <span style={{ color: 'var(--gold)', opacity: 0.6 }}>✦</span>
            <div className="h-px w-16" style={{ background: 'linear-gradient(to left, transparent, var(--divider-color, #d4af37))', opacity: 0.4 }} />
          </div>
        </div>

        <StepIndicator step={step} />

        <AnimatePresence mode="wait">
          {/* STEP 1 */}
          {step === 1 && (
            <motion.form
              key="step1"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.35 }}
              onSubmit={handle1(onStep1)}
              style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
            >
              <div>
                <FieldLabel>Email</FieldLabel>
                <input
                  {...reg1('email', { required: true })}
                  type="email"
                  className="lumina-input"
                  style={inputStyle(!!err1.email)}
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <FieldLabel>Password</FieldLabel>
                <div style={{ position: 'relative' }}>
                  <input
                    {...reg1('password', { required: true, minLength: 8 })}
                    type={showPassword ? 'text' : 'password'}
                    className="lumina-input"
                    style={{ ...inputStyle(!!err1.password), paddingRight: '56px' }}
                    placeholder="Min. 8 characters"
                  />
                  {toggleBtn(showPassword, () => setShowPassword(v => !v))}
                </div>
                {err1.password?.type === 'minLength' && (
                  <p style={{ fontSize: '11px', color: '#f87171', fontFamily: 'var(--font-jost)', marginTop: '4px' }}>
                    Must be at least 8 characters
                  </p>
                )}
              </div>

              <div>
                <FieldLabel>Confirm Password</FieldLabel>
                <div style={{ position: 'relative' }}>
                  <input
                    {...reg1('confirmPassword', { required: true })}
                    type={showConfirm ? 'text' : 'password'}
                    className="lumina-input"
                    style={{ ...inputStyle(!!err1.confirmPassword), paddingRight: '56px' }}
                    placeholder="••••••••"
                  />
                  {toggleBtn(showConfirm, () => setShowConfirm(v => !v))}
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                <input
                  {...reg1('ageConfirmed', { required: true })}
                  type="checkbox"
                  style={{
                    marginTop: '3px', width: '16px', height: '16px',
                    borderRadius: '4px', flexShrink: 0,
                    accentColor: 'var(--gold)',
                  }}
                />
                <span style={{ fontSize: '13px', fontFamily: 'var(--font-eb-garamond)', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                  I confirm that I am{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>16 years of age or older</strong>{' '}
                  and understand that Lumina is not a replacement for professional therapy.
                </span>
              </label>
              {err1.ageConfirmed && (
                <p style={{ fontSize: '11px', color: '#f87171', fontFamily: 'var(--font-jost)', marginTop: '-8px' }}>
                  You must confirm your age to continue
                </p>
              )}

              <motion.button
                type="submit"
                className="glass"
                style={{
                  width: '100%', padding: '13px', borderRadius: '12px',
                  fontFamily: 'var(--font-rajdhani)', fontWeight: 600, fontSize: '13px',
                  letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: '6px',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer', transition: 'all 0.25s',
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Continue
              </motion.button>
            </motion.form>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <motion.form
              key="step2"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.35 }}
              onSubmit={handle2(onStep2)}
              style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
            >
              {/* Optional note */}
              <p style={{
                fontSize: '12px', lineHeight: '1.7',
                fontFamily: 'var(--font-eb-garamond)',
                color: 'var(--text-muted)',
                background: 'rgba(212,175,55,0.06)',
                border: '1px solid rgba(212,175,55,0.15)',
                borderRadius: '10px', padding: '10px 14px',
              }}>
                These details help Lumina tailor your experience. All fields are{' '}
                <strong style={{ color: 'var(--text-secondary)' }}>optional</strong>.
              </p>

              <div>
                <FieldLabel>Full Name</FieldLabel>
                <input
                  {...reg2('fullName')}
                  type="text"
                  className="lumina-input"
                  style={inputStyle(false)}
                  placeholder="e.g. Alex Morgan"
                />
              </div>

              <div>
                <FieldLabel>Age</FieldLabel>
                <input
                  {...reg2('age', {
                    min: { value: 16, message: 'Must be 16 or older' },
                    max: { value: 120, message: 'Please enter a valid age' },
                    validate: v => !v || !isNaN(parseInt(v, 10)) || 'Must be a number',
                  })}
                  type="number"
                  min={16} max={120}
                  className="lumina-input"
                  style={inputStyle(!!err2.age)}
                  placeholder="e.g. 24"
                />
                {err2.age && (
                  <p style={{ fontSize: '11px', color: '#f87171', fontFamily: 'var(--font-jost)', marginTop: '4px' }}>
                    {err2.age.message as string}
                  </p>
                )}
              </div>

              <div>
                <FieldLabel>Gender</FieldLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {GENDER_OPTIONS.map(opt => (
                    <label
                      key={opt.value}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                        background: 'var(--bg-glass)',
                        border: '1px solid var(--border-medium)',
                        transition: 'border-color 0.2s, background 0.2s',
                        fontSize: '13px', fontFamily: 'var(--font-eb-garamond)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <input
                        {...reg2('gender')}
                        type="radio"
                        value={opt.value}
                        style={{ width: '14px', height: '14px', flexShrink: 0, accentColor: 'var(--gold)' }}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="glass"
                  style={{
                    flex: '0 0 auto', padding: '13px 20px', borderRadius: '12px',
                    fontFamily: 'var(--font-rajdhani)', fontWeight: 600, fontSize: '12px',
                    letterSpacing: '0.14em', textTransform: 'uppercase',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)', cursor: 'pointer', transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                >
                  Back
                </button>

                <motion.button
                  type="submit"
                  disabled={loading}
                  className="glass"
                  style={{
                    flex: 1, padding: '13px', borderRadius: '12px',
                    fontFamily: 'var(--font-rajdhani)', fontWeight: 600, fontSize: '13px',
                    letterSpacing: '0.16em', textTransform: 'uppercase',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1, transition: 'all 0.25s',
                  }}
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                >
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <motion.div
                        style={{
                          width: '14px', height: '14px', borderRadius: '50%',
                          border: '2px solid var(--border-medium)', borderTopColor: 'var(--text-primary)',
                        }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                      Creating your sanctuary...
                    </span>
                  ) : 'Create Account'}
                </motion.button>
              </div>

              <button
                type="submit"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'center', fontSize: '12px',
                  fontFamily: 'var(--font-eb-garamond)',
                  color: 'var(--text-muted)', textDecoration: 'underline',
                  opacity: 0.7,
                }}
              >
                Skip for now
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <p style={{
          textAlign: 'center', marginTop: '20px', fontSize: '13px',
          fontFamily: 'var(--font-eb-garamond)', color: 'var(--text-muted)'
        }}>
          Already have an account?{' '}
          <Link
            href="/auth/signin"
            style={{ color: 'var(--gold)', textDecoration: 'none', transition: 'opacity 0.15s' }}
            onMouseEnter={e => ((e.target as HTMLElement).style.opacity = '0.75')}
            onMouseLeave={e => ((e.target as HTMLElement).style.opacity = '1')}
          >
            Sign in
          </Link>
        </p>
      </motion.div>
    </main>
  )
}