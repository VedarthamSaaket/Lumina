'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navigation } from '@/components/layout/Navigation'
import { ParticleCanvas } from '@/components/ui/ParticleCanvas'
import { GoldHeading } from '@/components/ui/GoldHeading'
import Grainient from '@/components/ui/Grainient'
import OrionChatPanel from '@/components/orion/OrionChatPanel'
import OrionRightPanel from '@/components/orion/OrionRightPanel'
import { useThemeStore } from '@/lib/themeStore'

const ORION_COLOR = '#5B9BD5'

const CAPABILITIES = [
    {
        icon: '?',
        title: 'Memory Analysis',
        desc: 'Orion reads your actual game scores and gives you specific coaching based on what it sees in your results.',
    },
    {
        icon: '?',
        title: 'Brain Science',
        desc: 'Deep knowledge of how memory, focus, and reasoning work, explained in plain everyday language.',
    },
    {
        icon: '?',
        title: 'Thinking Skills',
        desc: 'Pattern spotting, analogical thinking, spatial reasoning, mental arithmetic, and more, all trainable.',
    },
    {
        icon: '?',
        title: 'Personal Coaching',
        desc: 'Orion remembers your journey across sessions and adapts its advice to how you specifically think and improve.',
    },
]

const RESEARCH_HIGHLIGHTS = [
    { finding: 'Your brain holds roughly 4 chunks of information in active use at once. Grouping things helps you hold more.' },
    { finding: 'Testing yourself is dramatically stronger practice than re-reading. The act of trying to remember builds the memory.' },
    { finding: 'The brain physically changes in response to sustained practice. Grey matter grows in areas being used.' },
    { finding: 'Sleep is when the brain sorts and stores what you practised. Consistent sleep dramatically improves learning.' },
    { finding: 'The sweet spot for learning is when a task is challenging but not overwhelming, not too easy and not too hard.' },
    { finding: 'Abstract pattern recognition, finding the rule in situations you have never seen before, is one of the core trainable thinking skills.' },
]

export default function OrionPage() {
    const [chatOpen, setChatOpen] = useState(true)
    const [rightContent, setRightContent] = useState<string | null>(null)
    const [rightPanelActive, setRightPanelActive] = useState<any>(null)
    const [showInfo, setShowInfo] = useState(true)
    const { theme } = useThemeStore()
    const isDark = theme === 'dark'

    const textPrimary = isDark ? 'rgba(254,244,228,0.95)' : 'rgba(42,26,8,0.92)'
    const textSecondary = isDark ? 'rgba(254,244,228,0.60)' : 'rgba(42,26,8,0.62)'
    const textMuted = isDark ? 'rgba(254,244,228,0.38)' : 'rgba(42,26,8,0.38)'
    const glassBg = isDark ? 'rgba(255,210,160,0.055)' : 'rgba(255,245,220,0.58)'
    const cardBorder = isDark ? `1px solid ${ORION_COLOR}18` : `1px solid rgba(91,155,213,0.22)`

    const handleRightPanelRequest = useCallback((contentType: string) => {
        setRightContent(contentType)
        setShowInfo(false)
    }, [])

    const handleCloseRightPanel = useCallback(() => {
        setRightContent(null)
  setRightPanelActive(null)
        setShowInfo(true)
    }, [])

    const handleContentLoaded = useCallback((content: { type: string; data: Record<string, any> }) => {
        setRightPanelActive(content)
    }, [])

    return (
<main className="bg-screening min-h-screen relative overflow-hidden">
    {/* Grainient blue grain background */}
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <Grainient
        grainAmount={0.04}
        grainScale={2.5}
        grainAnimated={true}
        timeSpeed={0.18}
        colorBalance={isDark ? 0.22 : -0.12}
        warpStrength={0}
        rotationAmount={0}
        color1={isDark ? '#1a2a3a' : '#a8c8d8'}
        color2={isDark ? '#0a1520' : '#c8d8e8'}
        color3={isDark ? '#050a10' : '#e8f0f8'}
      />
    </div>
    <div style={{ position: 'relative', zIndex: 1 }}><ParticleCanvas colors={[ORION_COLOR, '#3a7abd', '#1a5a9e', '#7bb8f0']} count={18} /></div>
    <Navigation />

            <div className="relative z-10 pt-20 pb-20 px-5" style={{ maxWidth: '1200px', margin: '0 auto' }}>

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div style={{
                            width: '44px', height: '44px', borderRadius: '50%',
                            background: `linear-gradient(135deg, ${ORION_COLOR}28, ${ORION_COLOR}08)`,
                            border: `1.5px solid ${ORION_COLOR}45`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '18px', color: ORION_COLOR,
                            boxShadow: `0 0 24px ${ORION_COLOR}30`,
                        }}>
                            ?
                        </div>
                        <GoldHeading prefix="" gold="Orion" size="clamp(2rem, 5vw, 3.5rem)" />
                    </div>
                    <p style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontStyle: 'italic', fontWeight: 300,
                        fontSize: '1.1rem',
                        color: `${ORION_COLOR}cc`,
                        margin: 0,
                    }}>
                        Your brain training companion
                    </p>
                </motion.div>

                {/* Main two-column layout */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '20px',
                    alignItems: 'start',
                    minHeight: '70vh',
                }}>
                    {/* LEFT: Chat */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        style={{ height: '70vh', minHeight: '500px' }}
                    >
                        <OrionChatPanel
                            onRequestRightPanel={handleRightPanelRequest}
        rightPanelContext={rightPanelActive}
                        />
                    </motion.div>

                    {/* RIGHT: Info or interactive panel */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 }}
                        style={{ height: '70vh', minHeight: '500px', overflowY: 'auto' }}
                    >
                        <AnimatePresence mode="wait">
                            {rightContent ? (
                                <motion.div
                                    key={`panel-${rightContent}`}
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -16 }}
                                    transition={{ duration: 0.3 }}
                                    style={{ height: '100%' }}
                                >
                                    <OrionRightPanel
                                        contentType={rightContent}
                                        onClose={handleCloseRightPanel}
        onContentLoaded={handleContentLoaded}
                                    />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="info"
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -16 }}
                                    transition={{ duration: 0.3 }}
                                    style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflowY: 'auto' }}
                                >
                                    {/* What Orion does */}
                                    <div style={{
                                        background: glassBg,
                                        border: cardBorder,
                                        borderRadius: '16px',
                                        padding: '20px',
                                    }}>
                                        <p style={{
                                            fontFamily: 'var(--font-jost)', fontSize: '10px',
                                            letterSpacing: '0.16em', textTransform: 'uppercase',
                                            color: ORION_COLOR, marginBottom: '14px',
                                        }}>
                                            What Orion does
                                        </p>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            {CAPABILITIES.map((c, i) => (
                                                <motion.div
                                                    key={c.title}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.2 + i * 0.06 }}
                                                    style={{
                                                        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,245,220,0.6)',
                                                        border: cardBorder,
                                                        borderRadius: '10px',
                                                        padding: '14px',
                                                    }}
                                                >
                                                    <div style={{ fontSize: '15px', color: ORION_COLOR, marginBottom: '6px' }}>{c.icon}</div>
                                                    <p style={{
                                                        fontFamily: 'var(--font-jost)', fontSize: '11px',
                                                        fontWeight: 600, color: textPrimary,
                                                        marginBottom: '4px', letterSpacing: '0.04em',
                                                    }}>{c.title}</p>
                                                    <p style={{
                                                        fontFamily: 'var(--font-jost)', fontSize: '11px',
                                                        color: textSecondary, lineHeight: '1.55', margin: 0,
                                                    }}>{c.desc}</p>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* How your brain works (research, no citations) */}
                                    <div style={{
                                        background: glassBg,
                                        border: cardBorder,
                                        borderRadius: '16px',
                                        padding: '20px',
                                    }}>
                                        <p style={{
                                            fontFamily: 'var(--font-jost)', fontSize: '10px',
                                            letterSpacing: '0.16em', textTransform: 'uppercase',
                                            color: ORION_COLOR, marginBottom: '14px',
                                        }}>
                                            Things worth knowing about your brain
                                        </p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {RESEARCH_HIGHLIGHTS.map((r, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, x: -8 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.3 + i * 0.05 }}
                                                    style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}
                                                >
                                                    <span style={{ color: ORION_COLOR, fontSize: '8px', marginTop: '5px', flexShrink: 0 }}>?</span>
                                                    <p style={{
                                                        fontFamily: 'var(--font-jost)', fontSize: '12px',
                                                        color: textSecondary, lineHeight: '1.6', margin: 0,
                                                    }}>{r.finding}</p>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Orion + Lumina note */}
                                    <div style={{
                                        borderRadius: '12px',
                                        padding: '16px',
                                        background: isDark ? 'rgba(212,175,55,0.04)' : 'rgba(212,175,55,0.06)',
                                        border: isDark ? '1px solid rgba(212,175,55,0.12)' : '1px solid rgba(139,100,16,0.15)',
                                    }}>
                                        <p style={{
                                            fontFamily: 'var(--font-jost)', fontSize: '12px',
                                            color: textSecondary, lineHeight: '1.65', margin: 0,
                                        }}>
                                            Orion handles everything on the thinking and memory side. Lumina handles feelings, journaling, and emotional support. They are designed to work together, and if Orion cannot help with something, it will point you to Lumina.
                                        </p>
                                    </div>

                                    {/* Try asking prompts */}
                                    <div style={{
                                        background: glassBg,
                                        border: cardBorder,
                                        borderRadius: '16px',
                                        padding: '20px',
                                    }}>
                                        <p style={{
                                            fontFamily: 'var(--font-jost)', fontSize: '10px',
                                            letterSpacing: '0.16em', textTransform: 'uppercase',
                                            color: ORION_COLOR, marginBottom: '12px',
                                        }}>
                                            Try asking Orion
                                        </p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {[
                                                "What do my game results actually say about how I think?",
                                                "Why do I keep losing focus in the middle of a sequence?",
                                                "What is the fastest way to get better at spotting patterns?",
                                                "Give me a quick brain exercise I can do right now",
                                                "What should I practise more based on my results?",
                                            ].map((q, i) => (
                                                <div key={i} style={{
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    background: isDark ? 'rgba(91,155,213,0.06)' : 'rgba(91,155,213,0.06)',
                                                    border: `1px solid ${ORION_COLOR}18`,
                                                    fontFamily: 'var(--font-jost)',
                                                    fontSize: '12px',
                                                    color: textMuted,
                                                    fontStyle: 'italic',
                                                }}>
                                                    "{q}"
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>
        </main>
    )
}