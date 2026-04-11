/*
  CRISIS PAGE THEME - bloody red palette
  Paste these CSS variables into your globals.css or crisis page wrapper.
  Used in the crisis page component below.
*/

/*
  --crisis-bg:         #0d0000;
  --crisis-surface:    #1a0000;
  --crisis-border:     #3d0000;
  --crisis-primary:    #cc0000;
  --crisis-accent:     #ff2222;
  --crisis-glow:       #ff000030;
  --crisis-text:       #ffe0e0;
  --crisis-muted:      #cc8888;
*/

/* ─── CRISIS PAGE COMPONENT (app/crisis/page.tsx) ─────────────────────────── */
'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Navigation } from '@/components/layout/Navigation'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Resource {
  name: string
  number: string
  url: string
  country: string
}

// BLOODY RED palette - all colours defined inline for reliability
const C = {
  bg: '#0d0000',
  surface: '#1a0000',
  border: '#3d0000',
  primary: '#cc0000',
  accent: '#ff3333',
  glow: 'rgba(204,0,0,0.18)',
  text: '#ffe0e0',
  muted: '#cc8888',
  softRed: '#ff6666',
}

const BREATHING_STEPS = [
  { label: 'Breathe in', duration: 4, color: C.accent },
  { label: 'Hold', duration: 4, color: C.primary },
  { label: 'Breathe out', duration: 6, color: C.muted },
  { label: 'Hold', duration: 2, color: C.border },
]

function BreathingExercise() {
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!active) return
    const current = BREATHING_STEPS[step]
    if (count < current.duration) {
      const t = setTimeout(() => setCount(c => c + 1), 1000)
      return () => clearTimeout(t)
    } else {
      const nextStep = (step + 1) % BREATHING_STEPS.length
      setStep(nextStep)
      setCount(0)
    }
  }, [active, step, count])

  const current = BREATHING_STEPS[step]
  const progress = active ? (count / current.duration) * 100 : 0
  const scale = active ? (step === 0 ? 1 + (count / current.duration) * 0.3 : step === 2 ? 1.3 - (count / current.duration) * 0.3 : 1.3) : 1

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <motion.div
        className="w-32 h-32 rounded-full flex items-center justify-center cursor-pointer select-none"
        style={{
          background: `radial-gradient(circle, ${C.primary}40, ${C.surface})`,
          border: `2px solid ${C.primary}60`,
          boxShadow: active ? `0 0 40px ${C.primary}50` : 'none',
        }}
        animate={{ scale }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        onClick={() => { setActive(!active); setStep(0); setCount(0) }}
      >
        <div className="text-center">
          {active ? (
            <>
              <p className="font-display font-light text-2xl" style={{ color: C.accent }}>{current.duration - count}</p>
              <p className="font-jost text-xs tracking-widest" style={{ color: C.muted }}>{current.label}</p>
            </>
          ) : (
            <p className="font-jost text-xs tracking-widest uppercase" style={{ color: C.muted }}>tap to begin</p>
          )}
        </div>
      </motion.div>
      {active && (
        <div className="w-full max-w-xs">
          <div className="w-full h-1 rounded-full" style={{ background: C.border }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: C.accent, width: `${progress}%` }}
              transition={{ duration: 0.9 }}
            />
          </div>
          <p className="text-center font-jost text-xs mt-2 tracking-widest" style={{ color: C.muted }}>
            {current.label.toUpperCase()} · {count}/{current.duration}s
          </p>
        </div>
      )}
    </div>
  )
}

export default function CrisisPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [activeSection, setActiveSection] = useState<'breathe' | 'ground' | 'resources' | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/crisis/resources`)
      .then(r => r.json())
      .then(setResources)
      .catch(() => { })
  }, [])

  const GROUNDING = [
    { n: 5, sense: 'see', prompt: 'Name 5 things you can see right now. Look around slowly.' },
    { n: 4, sense: 'touch', prompt: 'Name 4 things you can physically feel, the chair, the air, your clothes.' },
    { n: 3, sense: 'hear', prompt: 'Name 3 sounds you can hear. Near ones, far ones.' },
    { n: 2, sense: 'smell', prompt: 'Name 2 things you can smell. Or remember a smell that feels safe.' },
    { n: 1, sense: 'taste', prompt: 'Name 1 thing you can taste, or notice what is already in your mouth.' },
  ]

  const sections = [
    { key: 'breathe' as const, label: 'Breathing', icon: '◌', desc: 'A slow 4-4-6-2 pattern to calm your nervous system' },
    { key: 'ground' as const, label: 'Grounding', icon: '◎', desc: '5-4-3-2-1, anchor yourself to the present moment' },
    { key: 'resources' as const, label: 'Get Support', icon: '◈', desc: 'Talk to someone who can help right now' },
  ]

  return (
    <main style={{ background: C.bg, minHeight: '100vh' }} className="relative overflow-hidden">
      {/* Subtle red particle glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse at 50% 0%, ${C.primary}12 0%, transparent 60%)`,
      }} />
      <Navigation />

      <div className="relative z-10 pt-24 pb-20 px-5 max-w-2xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="text-5xl mb-4" style={{ filter: `drop-shadow(0 0 12px ${C.primary})` }}>♥</div>
          <h1 className="font-display font-light mb-3" style={{ fontSize: 'clamp(2.2rem,5vw,4rem)', color: C.text, letterSpacing: '-0.02em' }}>
            You are not alone
          </h1>
          <p className="font-body text-base leading-relaxed max-w-md mx-auto" style={{ color: C.muted }}>
            Whatever you are feeling right now is real. This page is here to help you get through the next few minutes.
          </p>
        </motion.div>

        {/* Immediate grounding statement */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="rounded-2xl p-5 mb-8 text-center"
          style={{ background: C.surface, border: `1px solid ${C.border}`, boxShadow: `0 0 30px ${C.glow}` }}>
          <p className="font-display italic text-lg" style={{ color: C.softRed, fontWeight: 300 }}>
            You are safe right now. This moment will pass.
          </p>
        </motion.div>

        {/* Tool sections */}
        <div className="space-y-3 mb-8">
          {sections.map((sec, i) => (
            <motion.div key={sec.key} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <button
                onClick={() => setActiveSection(activeSection === sec.key ? null : sec.key)}
                className="w-full rounded-xl p-5 text-left flex items-center gap-4 transition-all"
                style={{
                  background: activeSection === sec.key ? `${C.primary}14` : C.surface,
                  border: `1px solid ${activeSection === sec.key ? C.primary : C.border}`,
                  boxShadow: activeSection === sec.key ? `0 0 20px ${C.glow}` : 'none',
                }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-display text-xl"
                  style={{ background: `${C.primary}18`, color: C.accent, border: `1.5px solid ${C.primary}40` }}>
                  {sec.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-gothic text-sm mb-0.5" style={{ color: C.text, letterSpacing: '0.08em' }}>{sec.label}</h3>
                  <p className="font-body text-sm" style={{ color: C.muted }}>{sec.desc}</p>
                </div>
                <span style={{ color: C.muted, fontSize: '1.2rem' }}>{activeSection === sec.key ? '-' : '+'}</span>
              </button>

              {/* Breathing section */}
              {activeSection === 'breathe' && sec.key === 'breathe' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl p-6 mt-2" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                  <p className="font-body text-sm text-center mb-4" style={{ color: C.muted }}>
                    Breathe slowly with the circle. Let your body follow.
                  </p>
                  <BreathingExercise />
                </motion.div>
              )}

              {/* Grounding section */}
              {activeSection === 'ground' && sec.key === 'ground' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  className="rounded-xl p-6 mt-2 space-y-4" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                  <p className="font-body text-sm" style={{ color: C.muted }}>
                    This exercise brings you back to the present. Go through each sense slowly.
                  </p>
                  {GROUNDING.map((g) => (
                    <div key={g.n} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: `${C.primary}08`, border: `1px solid ${C.border}` }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-display font-light text-lg"
                        style={{ background: `${C.primary}20`, color: C.accent, border: `1px solid ${C.primary}40` }}>
                        {g.n}
                      </div>
                      <div>
                        <p className="font-jost text-xs tracking-widest uppercase mb-1" style={{ color: C.primary }}>{g.sense}</p>
                        <p className="font-body text-sm" style={{ color: C.text }}>{g.prompt}</p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Resources section */}
              {activeSection === 'resources' && sec.key === 'resources' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  className="rounded-xl p-6 mt-2 space-y-3" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                  <p className="font-body text-sm mb-4" style={{ color: C.muted }}>
                    Real people are available right now. You do not have to go through this alone.
                  </p>
                  {resources.map((r, i) => (
                    <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 rounded-xl transition-all hover:scale-[1.01]"
                      style={{ background: `${C.primary}10`, border: `1px solid ${C.primary}30`, textDecoration: 'none' }}>
                      <div>
                        <p className="font-gothic text-sm" style={{ color: C.text, letterSpacing: '0.05em' }}>{r.name}</p>
                        <p className="font-jost text-xs mt-0.5" style={{ color: C.muted }}>{r.country}</p>
                        {r.number && (
                          <p className="font-display font-light text-lg mt-1" style={{ color: C.accent }}>{r.number}</p>
                        )}
                      </div>
                      <span style={{ color: C.primary, fontSize: '1.2rem' }}>→</span>
                    </a>
                  ))}
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Closing note */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="text-center p-6 rounded-2xl"
          style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <p className="font-body text-sm leading-relaxed" style={{ color: C.muted }}>
            If you are in immediate danger, please call your local emergency number. Everything on this page is here to support you, not replace professional care.
          </p>
        </motion.div>

      </div>
    </main>
  )
}