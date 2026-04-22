'use client'
// frontend/src/app/orion/page.tsx
// Orion — Lumina's cognitive companion page
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Navigation } from '@/components/layout/Navigation'
import { ParticleCanvas } from '@/components/ui/ParticleCanvas'
import OrionChat from '@/components/orion/OrionChat'

const ORION_COLOR = '#5B9BD5'

const CAPABILITIES = [
    {
        icon: '◐',
        title: 'Memory Analysis',
        desc: 'Discuss your game results. Orion reads your actual scores and gives specific, research-backed coaching.',
    },
    {
        icon: '◈',
        title: 'Cognitive Science',
        desc: 'Deep knowledge of working memory, fluid intelligence, attention, and neuroplasticity from peer-reviewed research.',
    },
    {
        icon: '❋',
        title: 'Aptitude Training',
        desc: 'Strategies for pattern recognition, analogical reasoning, spatial thinking, and mental arithmetic.',
    },
    {
        icon: '✦',
        title: 'Brain Optimization',
        desc: 'Evidence-based tips on sleep, focus, cognitive load, spaced repetition, and mental performance.',
    },
]

const RESEARCH_HIGHLIGHTS = [
    { ref: 'Baddeley & Hitch (1974)', finding: 'Multicomponent working memory — phonological loop + visuospatial sketchpad + central executive' },
    { ref: 'Cattell (1963)', finding: 'Fluid vs crystallized intelligence — Gf can be trained, the basis for all puzzle games here' },
    { ref: 'Craik & Lockhart (1972)', finding: 'Levels of processing — deeper encoding dramatically improves recall' },
    { ref: 'Draganski et al. (2004)', finding: 'Structural brain plasticity from training — grey matter changes are measurable after weeks' },
    { ref: 'Roediger & Karpicke (2006)', finding: 'Testing effect — retrieval practice beats passive re-reading for long-term retention' },
    { ref: 'Miyake et al. (2000)', finding: 'Executive functions (updating, shifting, inhibition) are separable but correlated' },
]

export default function OrionPage() {
    const [chatOpen, setChatOpen] = useState(false)

    return (
        <main className="bg-screening min-h-screen relative overflow-hidden">
            <ParticleCanvas colors={[ORION_COLOR, '#3a7abd', '#1a5a9e', '#7bb8f0']} count={22} />
            <Navigation />
            <OrionChat isOpen={chatOpen} onClose={() => setChatOpen(false)} />

            <div className="relative z-10 pt-24 pb-20 px-5 max-w-3xl mx-auto">

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-14">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginBottom: '18px' }}>
                        <div style={{
                            width: '56px', height: '56px', borderRadius: '50%',
                            background: `linear-gradient(135deg, ${ORION_COLOR}28, ${ORION_COLOR}08)`,
                            border: `1.5px solid ${ORION_COLOR}45`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '22px', color: ORION_COLOR,
                            boxShadow: `0 0 30px ${ORION_COLOR}30`,
                        }}>
                            ✦
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <h1 style={{
                                fontFamily: "'Cinzel', serif",
                                fontWeight: 400,
                                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                                color: 'rgba(254,244,228,0.95)',
                                letterSpacing: '0.12em',
                                margin: 0, lineHeight: 1,
                            }}>
                                ORION
                            </h1>
                            <p style={{
                                fontFamily: 'var(--font-cormorant)',
                                fontStyle: 'italic', fontWeight: 300,
                                fontSize: '1.1rem',
                                color: `${ORION_COLOR}cc`,
                                margin: 0, letterSpacing: '0.05em',
                            }}>
                                Lumina's cognitive companion
                            </p>
                        </div>
                    </div>

                    <p style={{
                        fontFamily: 'var(--font-jost)',
                        fontSize: '14px', lineHeight: '1.7',
                        color: 'rgba(254,244,228,0.60)',
                        maxWidth: '520px', margin: '0 auto 8px',
                    }}>
                        Orion and Lumina are close mates. While Lumina focuses on your emotional wellbeing,
                        Orion is your dedicated brain training expert — backed by 30+ peer-reviewed papers in
                        cognitive neuroscience, memory science, and fluid intelligence research.
                    </p>

                    <motion.button
                        onClick={() => setChatOpen(true)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        style={{
                            marginTop: '20px',
                            padding: '13px 32px',
                            borderRadius: '28px',
                            fontFamily: 'var(--font-jost)', fontWeight: 600,
                            fontSize: '12px', letterSpacing: '0.16em', textTransform: 'uppercase',
                            background: `linear-gradient(135deg, ${ORION_COLOR}28, ${ORION_COLOR}10)`,
                            border: `1px solid ${ORION_COLOR}45`,
                            color: 'rgba(254,244,228,0.92)',
                            cursor: 'pointer',
                            boxShadow: `0 0 24px ${ORION_COLOR}20`,
                        }}
                    >
                        ✦ Chat with Orion
                    </motion.button>
                </motion.div>

                {/* Capabilities */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
                    {CAPABILITIES.map((c, i) => (
                        <motion.div key={c.title}
                            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }}
                            className="glass rounded-xl p-5"
                            style={{ border: `1px solid ${ORION_COLOR}18` }}>
                            <div style={{ fontSize: '18px', color: ORION_COLOR, marginBottom: '8px', filter: `drop-shadow(0 0 5px ${ORION_COLOR}40)` }}>
                                {c.icon}
                            </div>
                            <h3 style={{
                                fontFamily: 'var(--font-gothic)', fontSize: '11px',
                                letterSpacing: '0.1em', color: 'rgba(254,244,228,0.90)',
                                marginBottom: '6px',
                            }}>
                                {c.title}
                            </h3>
                            <p style={{
                                fontFamily: 'var(--font-jost)', fontSize: '12px',
                                color: 'rgba(254,244,228,0.50)', lineHeight: '1.6',
                            }}>
                                {c.desc}
                            </p>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Research foundation */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="glass rounded-2xl p-6"
                    style={{ border: `1px solid ${ORION_COLOR}18` }}>
                    <p style={{
                        fontFamily: 'var(--font-jost)', fontSize: '10px',
                        letterSpacing: '0.16em', textTransform: 'uppercase',
                        color: ORION_COLOR, marginBottom: '14px',
                    }}>
                        Research Foundation
                    </p>
                    <p style={{
                        fontFamily: 'var(--font-cormorant)', fontStyle: 'italic', fontWeight: 300,
                        fontSize: '1rem', color: 'rgba(254,244,228,0.55)', marginBottom: '16px', lineHeight: '1.6',
                    }}>
                        Orion's knowledge is grounded in 30+ peer-reviewed papers from cognitive psychology, neuroscience, and educational psychology.
                    </p>
                    <div className="space-y-3">
                        {RESEARCH_HIGHLIGHTS.map((r, i) => (
                            <motion.div key={i}
                                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.06 }}
                                style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', paddingBottom: '10px', borderBottom: '1px solid rgba(91,155,213,0.08)' }}>
                                <span style={{ color: ORION_COLOR, fontSize: '8px', marginTop: '5px', flexShrink: 0 }}>●</span>
                                <div>
                                    <p style={{
                                        fontFamily: 'var(--font-jost)', fontSize: '11px', fontWeight: 500,
                                        color: `${ORION_COLOR}cc`, marginBottom: '2px',
                                    }}>
                                        {r.ref}
                                    </p>
                                    <p style={{ fontFamily: 'var(--font-jost)', fontSize: '12px', color: 'rgba(254,244,228,0.50)', lineHeight: '1.5' }}>
                                        {r.finding}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                    <p style={{
                        fontFamily: 'var(--font-jost)', fontSize: '11px',
                        color: `${ORION_COLOR}55`, marginTop: '12px', fontStyle: 'italic',
                    }}>
                        + 24 more papers on spatial cognition, mathematical thinking, neuroplasticity, aging, and executive function
                    </p>
                </motion.div>

                {/* Relationship with Lumina */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="mt-6 rounded-2xl p-5"
                    style={{ background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.12)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <span style={{ color: '#d4af37', fontSize: '14px' }}>✦</span>
                        <p style={{
                            fontFamily: 'var(--font-gothic)', fontSize: '11px',
                            letterSpacing: '0.1em', color: 'rgba(254,244,228,0.70)',
                        }}>
                            Orion + Lumina
                        </p>
                    </div>
                    <p style={{
                        fontFamily: 'var(--font-jost)', fontSize: '12px',
                        color: 'rgba(254,244,228,0.45)', lineHeight: '1.65',
                    }}>
                        Orion handles everything cognitive — memory, reasoning, aptitude, brain training.
                        Lumina handles everything emotional — wellbeing, journaling, CBT, inner work.
                        They're designed to complement each other. If Orion can't help with something, he'll send you to Lumina — and vice versa.
                    </p>
                </motion.div>
            </div>
        </main>
    )
}