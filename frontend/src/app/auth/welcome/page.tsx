'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { authAPI } from '@/lib/api'
import Grainient from '@/components/ui/Grainient'

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer-not-say', label: 'Prefer not to say' },
]

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '10px', letterSpacing: '0.14em',
  textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '7px',
}

export default function WelcomePage() {
  return (
    <Suspense fallback={null}>
      <WelcomeForm />
    </Suspense>
  )
}

function WelcomeForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/chat'
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    authAPI.me()
      .then(res => { if (res.data?.full_name) setName(res.data.full_name) })
      .catch(() => router.push('/auth/signin'))
  }, [router])

  const save = async () => {
    const parsedAge = age.trim() ? Number(age) : undefined
    if (parsedAge !== undefined && (!Number.isInteger(parsedAge) || parsedAge < 13 || parsedAge > 120)) {
      toast.error('Please enter a valid age, or leave it empty.')
      return
    }
    setSaving(true)
    try {
      await authAPI.updateProfile({
        fullName: name.trim() || undefined,
        age: parsedAge,
        gender: gender || undefined,
      })
      toast.success('Lumina knows you a little better now')
      router.push(next)
    } catch {
      toast.error('Could not save that. You can add it later.')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    color: 'var(--text-primary)',
    background: 'var(--bg-glass)',
    border: '1px solid var(--border-medium)',
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
        style={{ maxWidth: '440px', padding: '38px 40px 32px' }}
      >
        <div className="text-center" style={{ marginBottom: '26px' }}>
          <h1
            className="font-display font-light"
            style={{ fontSize: '2.3rem', letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '8px' }}
          >
            You are in
          </h1>
          <p
            className="font-display italic"
            style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', fontWeight: 300, lineHeight: 1.4 }}
          >
            A few optional details help Lumina speak to you, not to a stranger. Skip anything you like.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label className="font-future" style={labelStyle}>What should Lumina call you</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="lumina-input"
              style={inputStyle}
              placeholder="Your name"
              maxLength={80}
            />
          </div>

          <div>
            <label className="font-future" style={labelStyle}>Age</label>
            <input
              value={age}
              onChange={e => setAge(e.target.value.replace(/[^0-9]/g, ''))}
              className="lumina-input"
              style={inputStyle}
              placeholder="Optional"
              inputMode="numeric"
              maxLength={3}
            />
          </div>

          <div>
            <label className="font-future" style={labelStyle}>Gender</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {GENDER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setGender(gender === opt.value ? '' : opt.value)}
                  style={{
                    padding: '10px 12px', borderRadius: '10px', textAlign: 'left',
                    fontFamily: 'var(--font-eb-garamond)', fontSize: '14px',
                    color: gender === opt.value ? 'var(--text-primary)' : 'var(--text-secondary)',
                    background: gender === opt.value ? 'var(--bg-glass)' : 'transparent',
                    border: gender === opt.value ? '1px solid var(--gold)' : '1px solid var(--border-medium)',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <motion.button
            type="button"
            onClick={save}
            disabled={saving}
            className="glass"
            style={{
              width: '100%', padding: '13px', borderRadius: '12px', marginTop: '4px',
              fontFamily: 'var(--font-rajdhani)', fontWeight: 600, fontSize: '13px',
              letterSpacing: '0.16em', textTransform: 'uppercase',
              border: '1px solid var(--border-medium)', color: 'var(--text-primary)',
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {saving ? 'Saving...' : 'Save and enter'}
          </motion.button>

          <button
            type="button"
            onClick={() => router.push(next)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-eb-garamond)', fontSize: '14px', color: 'var(--gold)',
            }}
          >
            Skip for now
          </button>
        </div>
      </motion.div>
    </main>
  )
}
