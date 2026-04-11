'use client'
// src/app/page.tsx
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Navigation } from '@/components/layout/Navigation'
import { ParticleCanvas } from '@/components/ui/ParticleCanvas'
import { Disclaimer } from '@/components/ui/Disclaimer'
import DarkVeil from '@/components/DarkVeil'
import '@/components/DarkVeil.css'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } },
}
const item = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
}

const features = [
  {
    icon: '✦',
    title: 'AI Guidance',
    href: '/chat',
    desc: 'Compassionate conversation powered by local LLaMA 3. A private, non-judgmental space to explore your inner world.',
    color: 'var(--gold)',
    colorRaw: '#d4af37',
  },
  {
    icon: '◈',
    title: 'Inner Ledger',
    href: '/journal',
    desc: 'Track emotional patterns with beautiful visualisations. Your feelings become form, and form becomes understanding.',
    color: 'var(--feature-teal)',
    colorRaw: '#4fada0',
  },
  {
    icon: '❋',
    title: 'Inner Work',
    href: '/inner-work',
    desc: 'Evidence-based CBT modules for real transformation. Structured exercises that rebuild the architecture of thought.',
    color: 'var(--feature-rose)',
    colorRaw: '#c9897a',
  },
  {
    icon: '◎',
    title: 'Reflect',
    href: '/reflect',
    desc: 'PHQ-9, GAD-7 and Rosenberg screenings with instant interpretation. Understand where you stand with clarity.',
    color: 'var(--feature-sage)',
    colorRaw: '#7a9e7e',
  },
  {
    icon: '◬',
    title: 'Memory',
    href: '/memory',
    desc: 'Lumina remembers your journey. Context carried across sessions so every conversation builds on the last.',
    color: 'var(--feature-amber)',
    colorRaw: '#c4913a',
  },
]

export default function HomePage() {
  return (
    <main className="bg-landing min-h-screen relative overflow-hidden">
      <ParticleCanvas colors={['var(--particle-a)', 'var(--particle-b)', 'var(--particle-c)']} count={45} />
      <Navigation />

      {/* Age gate */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="fixed top-20 right-8 z-40 glass rounded-full px-4 py-2 text-xs font-future tracking-widest"
        style={{ color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
      >
        16+ ONLY
      </motion.div>

      {/* ── HERO ── */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="max-w-5xl mx-auto"
        >
          {/* Eyebrow */}
          <motion.div variants={item} className="mb-8">
            <span
              className="text-xs tracking-[0.4em] font-future font-medium uppercase px-6 py-2 rounded-full glass"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
            >
              AI-Assisted Psychological Guidance
            </span>
          </motion.div>

          {/* Main heading */}
          <motion.h1
            variants={item}
            className="font-display font-light leading-none mb-6 select-none"
            style={{ fontSize: 'clamp(4rem, 12vw, 10rem)', letterSpacing: '-0.02em' }}
          >
            <span className="text-shimmer">Lumina</span>
          </motion.h1>

          {/* Subtitle, Cormorant Garamond italic, matching Inner Ledger style */}
          <motion.p
            variants={item}
            className="font-display italic mb-4 max-w-2xl mx-auto"
            style={{
              fontSize: 'clamp(1.15rem, 2.5vw, 1.5rem)',
              color: 'var(--text-secondary)',
              lineHeight: 1.65,
              fontWeight: 300,
              letterSpacing: '0.01em',
            }}
          >
            Where the light of awareness meets the architecture of the mind.
          </motion.p>

          {/* Ornamental divider, gold/teal, no blue */}
          <motion.div variants={item} className="flex items-center justify-center gap-4 mb-10">
            <div className="h-px w-24" style={{ background: 'linear-gradient(to right, transparent, var(--divider-color))' }} />
            <span style={{ color: 'var(--divider-color)', opacity: 0.7 }} className="text-lg">✦</span>
            <div className="h-px w-24" style={{ background: 'linear-gradient(to left, transparent, var(--divider-color))' }} />
          </motion.div>

          {/* CTA Buttons */}
          <motion.div variants={item} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link href="/auth/signup">
              <motion.button
                className="group relative px-10 py-4 rounded-full font-future font-semibold text-sm tracking-widest uppercase overflow-hidden transition-all duration-300 glass"
                style={{
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-medium)',
                }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="relative z-10">Begin Your Journey</span>
              </motion.button>
            </Link>
            <Link href="/auth/signin">
              <motion.button
                className="px-10 py-4 rounded-full font-future font-medium text-sm tracking-widest uppercase glass transition-all duration-300"
                style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-medium)' }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.98 }}
              >
                Sign In
              </motion.button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, 8, 0] }}
          transition={{ delay: 1.5, duration: 2, repeat: Infinity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          style={{ color: 'var(--text-muted)' }}
        >
          <span className="text-xs font-future tracking-widest">EXPLORE</span>
          <div className="w-px h-12" style={{ background: 'linear-gradient(to bottom, var(--divider-color), transparent)' }} />
        </motion.div>
      </section>

      {/* ── FEATURES ── */}
      <section className="relative z-10 px-6 pb-20 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <h2
            className="font-gothic text-3xl md:text-4xl mb-5"
            style={{ color: 'var(--text-primary)', letterSpacing: '0.15em' }}
          >
            YOUR SANCTUARY OF MIND
          </h2>
          {/* Section subtitle also in Cormorant italic */}
          <p
            className="font-display italic"
            style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', fontWeight: 300 }}
          >
            A complete system of psychological tools, beautifully integrated.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.09, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -6, scale: 1.015 }}
              className="glass rounded-2xl p-7 cursor-default"
              style={{ border: `1px solid ${f.colorRaw}22` }}
            >
              <div
                className="text-2xl mb-4"
                style={{ color: f.colorRaw, filter: `drop-shadow(0 0 6px ${f.colorRaw}50)` }}
              >
                {f.icon}
              </div>
              <h3
                className="font-gothic text-sm mb-3"
                style={{ color: 'var(--text-primary)', letterSpacing: '0.12em' }}
              >
                {f.title}
              </h3>
              {/* Feature descriptions in Cormorant italic */}
              <p
                className="font-display italic leading-relaxed"
                style={{ fontSize: '0.98rem', color: 'var(--text-secondary)', fontWeight: 300 }}
              >
                {f.desc}
              </p>
              <div
                className="mt-5 h-px w-full"
                style={{ background: `linear-gradient(90deg, ${f.colorRaw}50, transparent)` }}
              />
              <Link href={f.href}>
                <motion.span
                  className="inline-flex items-center gap-2 mt-4 font-future text-xs tracking-widest uppercase cursor-pointer"
                  style={{ color: f.colorRaw, opacity: 0.75 }}
                  whileHover={{ opacity: 1, x: 4 }}
                  transition={{ duration: 0.2 }}
                >
                  Explore {f.title} <span style={{ fontSize: '0.7rem' }}>&#8594;</span>
                </motion.span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── PHILOSOPHY STRIP ── */}
      <section className="relative z-10 px-6 pb-32 max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center justify-center gap-4 mb-10">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, var(--divider-color))' }} />
            <span style={{ color: 'var(--divider-color)', opacity: 0.5 }} className="text-sm">◆</span>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, var(--divider-color))' }} />
          </div>
          <blockquote
            className="font-display italic"
            style={{ fontSize: 'clamp(1.1rem, 2.2vw, 1.4rem)', color: 'var(--text-secondary)', fontWeight: 300, lineHeight: 1.75, letterSpacing: '0.01em' }}
          >
            Lumina is not a substitute for licensed therapy or medical care. It is a companion for the examined life, a lantern held gently beside the path you choose to walk.
          </blockquote>
          <p
            className="font-future text-xs tracking-widest mt-6"
            style={{ color: 'var(--text-muted)' }}
          >
            PRIVATE. LOCAL. YOURS.
          </p>
        </motion.div>
      </section>

      <Disclaimer />
    </main>
  )
}