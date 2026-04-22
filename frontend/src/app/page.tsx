'use client'
// src/app/page.tsx
// SPECIAL PAGE — no theme switching. Combines dark + light aesthetics.
// Background palette: milk, chocolate, latte, espresso, coffee decoction.
// Uses Grainient for immersive section backgrounds.

import Link from 'next/link'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import { useRef } from 'react'
import Grainient from '@/components/ui/Grainient'

// ── Grainient color palettes ─────────────────────────────────────────────
// Hero: espresso + dark roast warmth
const HERO_GRAIN = { color1: '#3B1A08', color2: '#7C3A10', color3: '#1A0A03' }
// Mid-section: latte milk foam
const LATTE_GRAIN = { color1: '#F5DEB3', color2: '#C4923A', color3: '#8B5E2C' }
// Features: coffee decoction deep amber
const DECOCTION_GRAIN = { color1: '#5C2A0E', color2: '#2C0F04', color3: '#8B4513' }
// Closing: milk + cream
const MILK_GRAIN = { color1: '#FFF8F0', color2: '#E8C99A', color3: '#C4923A' }

// ── Motion variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 48 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } },
}
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.11, delayChildren: 0.2 } },
}

// ── InView wrapper ───────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.85, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

const FEATURES = [
  {
    icon: '✦',
    title: 'Lumina',
    subtitle: 'AI Companion',
    href: '/chat',
    desc: 'A compassionate, private AI conversation that feels like talking to a brilliant friend who actually listens.',
    accent: '#D4AF37',
    bg: 'rgba(212,175,55,0.06)',
    border: 'rgba(212,175,55,0.20)',
  },
  {
    icon: '◈',
    title: 'Inner Ledger',
    subtitle: 'Journal',
    href: '/journal',
    desc: 'A sanctuary for the examined life. Beautiful journaling with mood tracking and a 3D book that opens just for you.',
    accent: '#C4923A',
    bg: 'rgba(196,146,58,0.07)',
    border: 'rgba(196,146,58,0.22)',
  },
  {
    icon: '❋',
    title: 'Inner Work',
    subtitle: 'Inner Work',
    href: '/cbt',
    desc: 'Eight guided exercises grounded in decades of cognitive research. Each one is a small act of care for yourself.',
    accent: '#C9897A',
    bg: 'rgba(201,137,122,0.07)',
    border: 'rgba(201,137,122,0.22)',
  },
  {
    icon: '◎',
    title: 'Reflect',
    subtitle: 'Self-checks',
    href: '/screening',
    desc: 'Thirteen research-validated checks across wellbeing, personality, and career — with warm, personal reflections.',
    accent: '#7A9E7E',
    bg: 'rgba(122,158,126,0.07)',
    border: 'rgba(122,158,126,0.22)',
  },
  {
    icon: '◉',
    title: 'Memory Games',
    subtitle: 'Cognitive Training',
    href: '/cognitive/memory',
    desc: 'Twelve games targeting working memory, pattern recognition, and fluid intelligence. Rooted in 50+ research papers.',
    accent: '#5B9BD5',
    bg: 'rgba(91,155,213,0.07)',
    border: 'rgba(91,155,213,0.22)',
  },
  {
    icon: '✦',
    title: 'Orion',
    subtitle: 'Brain Companion',
    href: '/orion',
    desc: 'Your cognitive training companion. Orion watches your sessions and gives you specific coaching drawn from neuroscience.',
    accent: '#9B7FD4',
    bg: 'rgba(155,127,212,0.07)',
    border: 'rgba(155,127,212,0.22)',
  },
]

const STATS = [
  { n: '12', label: 'Memory Games' },
  { n: '13', label: 'Self-Reflections' },
  { n: '8', label: 'Inner Work' },
  { n: '50+', label: 'Research Works' },
]

// Coffee bar divider
function CoffeeDivider({ flip = false }: { flip?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '20px',
      justifyContent: 'center',
      transform: flip ? 'scaleX(-1)' : undefined,
    }}>
      <div style={{ height: '1px', width: '80px', background: 'linear-gradient(to right, transparent, rgba(196,146,58,0.5))' }} />
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(196,146,58,0.6)', display: 'inline-block' }} />
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'rgba(212,175,55,0.8)', display: 'inline-block' }} />
        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(196,146,58,0.6)', display: 'inline-block' }} />
      </div>
      <div style={{ height: '1px', width: '80px', background: 'linear-gradient(to left, transparent, rgba(196,146,58,0.5))' }} />
    </div>
  )
}

export default function HomePage() {
  const containerRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] })
  const parallaxY = useTransform(scrollYProgress, [0, 1], ['0%', '18%'])

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: '100vh',
        background: '#0D0703',
        color: '#F5ECD7',
        overflowX: 'hidden',
        position: 'relative',
      }}
    >
      {/* ── HERO SECTION ─────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Grainient — espresso dark */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <Grainient
            color1={HERO_GRAIN.color1}
            color2={HERO_GRAIN.color2}
            color3={HERO_GRAIN.color3}
            timeSpeed={0.18}
            colorBalance={-0.1}
            warpStrength={1.2}
            warpFrequency={4.0}
            warpSpeed={1.5}
            warpAmplitude={60.0}
            blendAngle={12}
            blendSoftness={0.08}
            rotationAmount={380}
            noiseScale={2.2}
            grainAmount={0.12}
            grainScale={1.8}
            grainAnimated={false}
            contrast={1.6}
            gamma={0.95}
            saturation={1.1}
            centerX={0.05}
            centerY={-0.05}
            zoom={0.88}
          />
        </div>

        {/* Overlay gradient — milk poured into espresso */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'linear-gradient(160deg, rgba(13,7,3,0.72) 0%, rgba(28,12,5,0.50) 40%, rgba(13,7,3,0.78) 100%)',
        }} />

        {/* Top navigation */}
        <nav style={{
          position: 'relative', zIndex: 10, padding: '28px 48px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '50%',
              background: 'radial-gradient(circle at 38% 35%, #FFE484, #D4AF37, #8B6010)',
              boxShadow: '0 0 18px rgba(212,175,55,0.55)',
            }} />
            <span style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: 'italic', fontWeight: 400, fontSize: '22px',
              color: 'rgba(254,244,228,0.92)', letterSpacing: '0.28em',
            }}>LUMINA</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link href="/auth/signin" style={{ textDecoration: 'none' }}>
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                style={{
                  padding: '9px 22px', borderRadius: '24px', cursor: 'pointer',
                  fontFamily: "'Jost', sans-serif", fontSize: '11px',
                  fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase',
                  background: 'rgba(212,175,55,0.09)',
                  border: '1px solid rgba(212,175,55,0.28)',
                  color: 'rgba(254,244,228,0.75)',
                  transition: 'all 0.2s',
                }}
              >Sign In</motion.button>
            </Link>
            <Link href="/auth/signup" style={{ textDecoration: 'none' }}>
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                style={{
                  padding: '9px 22px', borderRadius: '24px', cursor: 'pointer',
                  fontFamily: "'Jost', sans-serif", fontSize: '11px',
                  fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
                  background: 'linear-gradient(135deg, rgba(196,146,58,0.35), rgba(212,175,55,0.22))',
                  border: '1px solid rgba(212,175,55,0.48)',
                  color: '#F5DEB3',
                  boxShadow: '0 0 24px rgba(212,175,55,0.15)',
                  transition: 'all 0.22s',
                }}
              >Begin</motion.button>
            </Link>
          </div>
        </nav>

        {/* Hero content */}
        <div style={{
          flex: 1, position: 'relative', zIndex: 10,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', textAlign: 'center',
          padding: '80px 32px 120px',
        }}>
          <motion.div
            initial="hidden" animate="show" variants={stagger}
            style={{ maxWidth: '820px' }}
          >
            {/* Eyebrow */}
            <motion.div variants={fadeUp} style={{ marginBottom: '28px' }}>
              <span style={{
                fontFamily: "'Jost', sans-serif", fontSize: '10px',
                letterSpacing: '0.42em', textTransform: 'uppercase',
                color: 'rgba(212,175,55,0.65)',
                background: 'rgba(212,175,55,0.07)',
                border: '1px solid rgba(212,175,55,0.18)',
                padding: '7px 20px', borderRadius: '30px',
                display: 'inline-block',
              }}>
                AI-Assisted Psychological Guidance
              </span>
            </motion.div>

            {/* Title */}
            <motion.h1 variants={fadeUp} style={{
              fontFamily: "'Libre Baskerville', Baskerville, Georgia, serif",
              fontWeight: 400, fontStyle: 'italic',
              fontSize: 'clamp(4.5rem, 13vw, 10rem)',
              lineHeight: 0.92, letterSpacing: '-0.025em',
              margin: '0 0 20px',
              background: 'linear-gradient(180deg, #F5DEB3 0%, #D4AF37 40%, #8B6010 100%)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 60px rgba(212,175,55,0.3))',
            }}>Lumina</motion.h1>

            {/* Subtitle */}
            <motion.p variants={fadeUp} style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: 'italic', fontWeight: 300,
              fontSize: 'clamp(1.1rem, 2.5vw, 1.55rem)',
              color: 'rgba(245,222,179,0.70)',
              lineHeight: 1.65, margin: '0 0 48px',
              maxWidth: '620px', marginLeft: 'auto', marginRight: 'auto',
            }}>
              Where the light of awareness meets the architecture of the mind.
              A private sanctuary for the examined life.
            </motion.p>

            {/* CTA */}
            <motion.div variants={fadeUp} style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/auth/signup" style={{ textDecoration: 'none' }}>
                <motion.button
                  whileHover={{ scale: 1.04, boxShadow: '0 0 40px rgba(212,175,55,0.28)' }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    padding: '16px 40px', borderRadius: '40px', cursor: 'pointer',
                    fontFamily: "'Jost', sans-serif", fontSize: '12px',
                    fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase',
                    background: 'linear-gradient(135deg, #5C2A0E, #8B4513)',
                    border: '1px solid rgba(212,175,55,0.40)',
                    color: '#F5DEB3',
                    boxShadow: '0 0 24px rgba(140,69,20,0.35)',
                    transition: 'all 0.25s',
                  }}
                >Begin Your Journey</motion.button>
              </Link>
              <Link href="/chat" style={{ textDecoration: 'none' }}>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    padding: '16px 40px', borderRadius: '40px', cursor: 'pointer',
                    fontFamily: "'Jost', sans-serif", fontSize: '12px',
                    fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase',
                    background: 'rgba(245,222,179,0.06)',
                    border: '1px solid rgba(245,222,179,0.22)',
                    color: 'rgba(245,222,179,0.70)',
                    transition: 'all 0.22s',
                  }}
                >Talk to Lumina →</motion.button>
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          style={{
            position: 'absolute', bottom: '36px', left: '50%', transform: 'translateX(-50%)',
            zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
          }}
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: '1px', height: '48px', background: 'linear-gradient(to bottom, rgba(212,175,55,0.6), transparent)' }}
          />
          <span style={{ fontFamily: "'Jost', sans-serif", fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(212,175,55,0.40)' }}>
            Explore
          </span>
        </motion.div>
      </section>

      {/* ── STATS BAR — espresso band ────────────────────────────────────── */}
      <section style={{
        position: 'relative', overflow: 'hidden',
        padding: '0',
        background: 'linear-gradient(180deg, #0D0703 0%, #1A0A03 100%)',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '0',
          flexWrap: 'wrap',
          borderTop: '1px solid rgba(196,146,58,0.18)',
          borderBottom: '1px solid rgba(196,146,58,0.14)',
        }}>
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <div style={{
                padding: '40px 60px', textAlign: 'center',
                borderRight: i < STATS.length - 1 ? '1px solid rgba(196,146,58,0.14)' : 'none',
              }}>
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 300, fontStyle: 'italic',
                  fontSize: 'clamp(3rem, 6vw, 5rem)',
                  color: '#D4AF37', lineHeight: 1,
                  marginBottom: '8px',
                }}>{s.n}</div>
                <div style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: '10px', letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'rgba(245,222,179,0.45)',
                }}>{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── LATTE SECTION — milk poured over espresso ────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', minHeight: '520px' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <Grainient
            color1={LATTE_GRAIN.color1}
            color2={LATTE_GRAIN.color2}
            color3={LATTE_GRAIN.color3}
            timeSpeed={0.12}
            colorBalance={0.15}
            warpStrength={0.8}
            warpFrequency={3.5}
            warpSpeed={1.2}
            warpAmplitude={70}
            blendAngle={-15}
            blendSoftness={0.10}
            rotationAmount={320}
            noiseScale={1.8}
            grainAmount={0.09}
            grainScale={2.4}
            grainAnimated={false}
            contrast={1.4}
            gamma={1.05}
            saturation={0.9}
            zoom={0.92}
          />
        </div>
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'linear-gradient(160deg, rgba(13,7,3,0.82) 0%, rgba(28,12,5,0.62) 50%, rgba(13,7,3,0.85) 100%)',
        }} />
        <div style={{
          position: 'relative', zIndex: 2,
          maxWidth: '900px', margin: '0 auto',
          padding: '100px 40px',
          textAlign: 'center',
        }}>
          <Reveal>
            <CoffeeDivider />
            <h2 style={{
              fontFamily: "'Libre Baskerville', Baskerville, Georgia, serif",
              fontWeight: 400, fontStyle: 'italic',
              fontSize: 'clamp(2.2rem, 5vw, 4rem)',
              color: '#F5DEB3',
              letterSpacing: '-0.01em', lineHeight: 1.15,
              margin: '32px 0 20px',
            }}>
              Your Sanctuary of Mind
            </h2>
            <p style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: 'italic', fontWeight: 300,
              fontSize: 'clamp(1.05rem, 2.2vw, 1.35rem)',
              color: 'rgba(245,222,179,0.65)',
              lineHeight: 1.75, maxWidth: '620px',
              margin: '0 auto 40px',
            }}>
              A complete system of psychological tools, beautifully integrated.
              Not clinical. Not cold. A place that feels like home.
            </p>
            <CoffeeDivider flip />
          </Reveal>
        </div>
      </section>

      {/* ── FEATURES GRID — coffee decoction darkness ─────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <Grainient
            color1={DECOCTION_GRAIN.color1}
            color2={DECOCTION_GRAIN.color2}
            color3={DECOCTION_GRAIN.color3}
            timeSpeed={0.20}
            colorBalance={-0.05}
            warpStrength={1.4}
            warpFrequency={5.5}
            warpSpeed={1.8}
            warpAmplitude={55}
            blendAngle={20}
            blendSoftness={0.07}
            rotationAmount={440}
            noiseScale={2.0}
            grainAmount={0.13}
            grainScale={2.0}
            grainAnimated={false}
            contrast={1.7}
            gamma={0.92}
            saturation={1.15}
            zoom={0.86}
          />
        </div>
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'linear-gradient(175deg, rgba(13,7,3,0.88) 0%, rgba(18,8,3,0.78) 50%, rgba(13,7,3,0.90) 100%)',
        }} />
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '1200px', margin: '0 auto', padding: '100px 40px' }}>
          <Reveal style={{ marginBottom: '60px', textAlign: 'center' }}>
            <span style={{
              fontFamily: "'Jost', sans-serif", fontSize: '9px',
              letterSpacing: '0.38em', textTransform: 'uppercase',
              color: 'rgba(196,146,58,0.65)',
            }}>What's inside</span>
          </Reveal>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px',
          }}>
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.07}>
                <Link href={f.href} style={{ textDecoration: 'none' }}>
                  <motion.div
                    whileHover={{ y: -6, scale: 1.016 }}
                    whileTap={{ scale: 0.99 }}
                    style={{
                      padding: '28px',
                      borderRadius: '16px',
                      background: f.bg,
                      border: `1px solid ${f.border}`,
                      cursor: 'pointer',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      transition: 'all 0.25s',
                      height: '100%',
                    }}
                  >
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      marginBottom: '14px',
                    }}>
                      <span style={{
                        fontSize: '18px', color: f.accent,
                        filter: `drop-shadow(0 0 6px ${f.accent}60)`,
                      }}>{f.icon}</span>
                      <div>
                        <div style={{
                          fontFamily: "'Cinzel', serif",
                          fontSize: '12px', fontWeight: 600,
                          letterSpacing: '0.12em', textTransform: 'uppercase',
                          color: f.accent,
                        }}>{f.title}</div>
                        <div style={{
                          fontFamily: "'Jost', sans-serif",
                          fontSize: '9px', letterSpacing: '0.16em',
                          textTransform: 'uppercase',
                          color: 'rgba(245,222,179,0.35)',
                          marginTop: '1px',
                        }}>{f.subtitle}</div>
                      </div>
                    </div>
                    <div style={{ height: '1px', background: `linear-gradient(90deg, ${f.accent}35, transparent)`, marginBottom: '14px' }} />
                    <p style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontStyle: 'italic', fontWeight: 300,
                      fontSize: '1.05rem', lineHeight: 1.65,
                      color: 'rgba(245,222,179,0.62)',
                      margin: '0 0 16px',
                    }}>{f.desc}</p>
                    <span style={{
                      fontFamily: "'Jost', sans-serif",
                      fontSize: '10px', letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      color: `${f.accent}80`,
                    }}>Explore →</span>
                  </motion.div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── ORION HIGHLIGHT — dark roast */}
      <section style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(180deg, #0D0703 0%, #090402 100%)',
      }}>
        <div style={{
          maxWidth: '900px', margin: '0 auto',
          padding: '100px 40px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          textAlign: 'center',
        }}>
          <Reveal>
            <div style={{
              width: '60px', height: '60px', borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(91,155,213,0.22), rgba(91,155,213,0.06))',
              border: '1.5px solid rgba(91,155,213,0.42)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', color: '#5B9BD5',
              boxShadow: '0 0 32px rgba(91,155,213,0.28)',
              marginBottom: '24px',
            }}>✦</div>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 style={{
              fontFamily: "'Libre Baskerville', Baskerville, Georgia, serif",
              fontWeight: 400, fontStyle: 'italic',
              fontSize: 'clamp(2rem, 4.5vw, 3.5rem)',
              color: '#B8D4EE',
              margin: '0 0 16px',
              letterSpacing: '-0.01em',
            }}>Meet Orion</h2>
          </Reveal>
          <Reveal delay={0.18}>
            <p style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: 'italic', fontWeight: 300,
              fontSize: 'clamp(1rem, 2.2vw, 1.3rem)',
              color: 'rgba(184,212,238,0.55)',
              lineHeight: 1.75, maxWidth: '580px',
              margin: '0 0 40px',
            }}>
              Lumina's close friend who specialises in memory, reasoning, and how people get smarter.
              While Lumina handles feelings, Orion handles thinking.
            </p>
          </Reveal>
          <Reveal delay={0.26}>
            <Link href="/orion" style={{ textDecoration: 'none' }}>
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(91,155,213,0.22)' }}
                whileTap={{ scale: 0.97 }}
                style={{
                  padding: '14px 36px', borderRadius: '30px', cursor: 'pointer',
                  fontFamily: "'Jost', sans-serif", fontSize: '11px',
                  fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase',
                  background: 'rgba(91,155,213,0.12)',
                  border: '1px solid rgba(91,155,213,0.38)',
                  color: '#5B9BD5',
                  transition: 'all 0.22s',
                }}
              >Talk to Orion</motion.button>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── CLOSING — milk and cream ─────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', minHeight: '440px' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <Grainient
            color1={MILK_GRAIN.color1}
            color2={MILK_GRAIN.color2}
            color3={MILK_GRAIN.color3}
            timeSpeed={0.10}
            colorBalance={0.20}
            warpStrength={0.6}
            warpFrequency={3.0}
            warpSpeed={1.0}
            warpAmplitude={80}
            blendAngle={-8}
            blendSoftness={0.12}
            rotationAmount={280}
            noiseScale={1.6}
            grainAmount={0.07}
            grainScale={2.8}
            grainAnimated={false}
            contrast={1.3}
            gamma={1.1}
            saturation={0.85}
            zoom={0.94}
          />
        </div>
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          background: 'linear-gradient(160deg, rgba(13,7,3,0.88) 0%, rgba(22,10,4,0.72) 50%, rgba(13,7,3,0.88) 100%)',
        }} />

        <div style={{
          position: 'relative', zIndex: 2,
          maxWidth: '760px', margin: '0 auto',
          padding: '100px 40px',
          textAlign: 'center',
        }}>
          <Reveal>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '48px' }}>
              <div style={{ height: '1px', width: '100px', background: 'linear-gradient(to right, transparent, rgba(196,146,58,0.45))' }} />
              <span style={{ color: 'rgba(196,146,58,0.55)', fontSize: '14px' }}>◆</span>
              <div style={{ height: '1px', width: '100px', background: 'linear-gradient(to left, transparent, rgba(196,146,58,0.45))' }} />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <blockquote style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: 'italic', fontWeight: 300,
              fontSize: 'clamp(1.1rem, 2.4vw, 1.5rem)',
              color: 'rgba(245,222,179,0.65)',
              lineHeight: 1.78, margin: '0 0 48px',
              letterSpacing: '0.01em',
            }}>
              Lumina is not a substitute for licensed therapy or medical care.
              It is a companion for the examined life — a lantern held gently beside the path you choose to walk.
            </blockquote>
          </Reveal>
          <Reveal delay={0.2}>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/auth/signup" style={{ textDecoration: 'none' }}>
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  style={{
                    padding: '13px 32px', borderRadius: '30px', cursor: 'pointer',
                    fontFamily: "'Jost', sans-serif", fontSize: '11px',
                    fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
                    background: 'linear-gradient(135deg, rgba(92,42,14,0.8), rgba(139,69,19,0.7))',
                    border: '1px solid rgba(212,175,55,0.38)',
                    color: '#F5DEB3',
                    transition: 'all 0.22s',
                  }}
                >Create Your Sanctuary</motion.button>
              </Link>
              <Link href="/auth/signin" style={{ textDecoration: 'none' }}>
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  style={{
                    padding: '13px 32px', borderRadius: '30px', cursor: 'pointer',
                    fontFamily: "'Jost', sans-serif", fontSize: '11px',
                    fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase',
                    background: 'rgba(245,222,179,0.05)',
                    border: '1px solid rgba(245,222,179,0.18)',
                    color: 'rgba(245,222,179,0.55)',
                    transition: 'all 0.2s',
                  }}
                >Sign In</motion.button>
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.3}>
            <p style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: '9px', letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'rgba(245,222,179,0.25)',
              marginTop: '40px',
            }}>Private · Local · 16+ Only</p>
          </Reveal>
        </div>
      </section>
    </div>
  )
}