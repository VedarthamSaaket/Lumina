'use client'
import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navigation } from '@/components/layout/Navigation'
import { GoldHeading } from '@/components/ui/GoldHeading'
import OrionChatPanel from '@/components/orion/OrionChatPanel'
import OrionRightPanel from '@/components/orion/OrionRightPanel'
import { useThemeStore } from '@/lib/themeStore'
import { usePsychWarmup } from '@/lib/usePsychWarmup'
import Grainient from '@/components/ui/Grainient'
import LandscapePrompt from '@/components/ui/LandscapePrompt'

const ORION_COLOR = '#5B9BD5'

const GRAIN_STYLE = `
@keyframes orion-grain-shift {
0%, 100% { transform: translate(0,0) }
10% { transform: translate(-2%,-3%) }
20% { transform: translate(3%,2%) }
30% { transform: translate(-1%,4%) }
40% { transform: translate(4%,-1%) }
50% { transform: translate(-3%,1%) }
60% { transform: translate(2%,3%) }
70% { transform: translate(-4%,-2%) }
80% { transform: translate(1%,-4%) }
90% { transform: translate(-2%,2%) }
}
.orion-grain::before {
content: '';
position: absolute;
inset: -50%;
width: 200%;
height: 200%;
pointer-events: none;
opacity: 0.36;
background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
background-size: 180px;
mix-blend-mode: overlay;
animation: orion-grain-shift 0.4s steps(1) infinite;
border-radius: inherit;
z-index: 0;
}`

const CAPABILITIES = [
  {
    icon: '*',
    title: 'Memory Analysis',
    desc: 'Orion reads your actual game scores and gives you specific coaching based on what it sees in your results.',
  },
  {
    icon: '◈',
    title: 'Brain Science',
    desc: 'Deep knowledge of how memory, focus, and reasoning work, explained in plain everyday language.',
  },
  {
    icon: '◐',
    title: 'Thinking Skills',
    desc: 'Pattern spotting, analogical thinking, spatial reasoning, mental arithmetic, and more, all trainable.',
  },
  {
    icon: '◎',
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
  usePsychWarmup('orion')
  const [chatOpen, setChatOpen] = useState(true)
  const [rightContent, setRightContent] = useState<string | null>(null)
  const [rightPanelActive, setRightPanelActive] = useState<any>(null)
  const [showInfo, setShowInfo] = useState(true)
  const [seedQuestion, setSeedQuestion] = useState<string | null>(null)
  const { theme } = useThemeStore()
  const isDark = theme === 'dark'

  const textPrimary = isDark ? 'rgba(254,244,228,0.95)' : 'rgba(42,26,8,0.92)'
  const textSecondary = isDark ? 'rgba(254,244,228,0.60)' : 'rgba(42,26,8,0.62)'
  const textMuted = isDark ? 'rgba(254,244,228,0.38)' : 'rgba(42,26,8,0.38)'
  const glassBg = isDark ? 'rgba(255,210,160,0.055)' : 'rgba(255,245,220,0.58)'
  const cardBorder = isDark ? `1px solid ${ORION_COLOR}18` : `1px solid rgba(91,155,213,0.22)`
  const bgPanel = isDark
    ? 'linear-gradient(160deg, rgba(8,12,28,0.97) 0%, rgba(12,18,38,0.97) 100%)'
    : 'linear-gradient(160deg, rgba(235,240,252,0.97) 0%, rgba(220,232,248,0.97) 100%)'

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

  const handleOptionSelected = useCallback((option: string) => {
    if (rightPanelActive) {
      setRightPanelActive({
        ...rightPanelActive,
        data: {
          ...rightPanelActive.data,
          selected_option: option,
        },
      })
    }
  }, [rightPanelActive])

  return (
    <>
      <LandscapePrompt surface="Orion" />
      <style>{GRAIN_STYLE}</style>
      <main className="orion-grain min-h-screen relative overflow-hidden" style={{ background: bgPanel }}>
        {/* Grainient background */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          <Grainient
            color1={isDark ? '#1a2a4a' : '#a8c8e8'}
            color2={isDark ? '#0a1528' : '#c8d8f0'}
            color3={isDark ? '#050a14' : '#e8f0f8'}
            timeSpeed={0.12}
            grainAmount={0.06}
            grainScale={2.2}
            grainAnimated={true}
            contrast={1.25}
            saturation={0.75}
            zoom={0.95}
            warpStrength={0}
            warpFrequency={3.5}
            warpSpeed={1.0}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}></div>
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
                color: ORION_COLOR,
                boxShadow: `0 0 24px ${ORION_COLOR}30`,
                flexShrink: 0,
              }}>
                {/* Orion star — inline SVG so it stays perfectly centered and crisp,
                    instead of a top-aligned text asterisk that renders off-centre */}
                <svg
                  width="22" height="22" viewBox="0 0 24 24"
                  fill="none" aria-hidden="true"
                  style={{ display: 'block', filter: `drop-shadow(0 0 6px ${ORION_COLOR}99)` }}
                >
                  <path
                    d="M12 1.5c.5 4.4 2.1 8 4.5 10.5C14.1 14.4 12.5 18 12 22.5 11.5 18 9.9 14.4 7.5 12 9.9 9.5 11.5 5.9 12 1.5Z"
                    fill="currentColor"
                  />
                  <path
                    d="M21.5 12c-2.7.3-4.9 1.3-6.4 2.9 1.5 1.6 3.7 2.6 6.4 2.9-.3-2-.3-3.8 0-5.8ZM2.5 12c2.7.3 4.9 1.3 6.4 2.9-1.5 1.6-3.7 2.6-6.4 2.9.3-2 .3-3.8 0-5.8Z"
                    fill="currentColor" opacity="0.55"
                  />
                </svg>
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
                seedMessage={seedQuestion}
                onSeedConsumed={() => setSeedQuestion(null)}
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
                      onOptionSelected={handleOptionSelected}
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
                            <span style={{ color: ORION_COLOR, fontSize: '8px', marginTop: '5px', flexShrink: 0 }}>*</span>
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
                          <button
                            key={i}
                            onClick={() => setSeedQuestion(q)}
                            style={{
                              textAlign: 'left',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              background: isDark ? 'rgba(91,155,213,0.06)' : 'rgba(91,155,213,0.06)',
                              border: `1px solid ${ORION_COLOR}18`,
                              fontFamily: 'var(--font-jost)', fontSize: '12px',
                              color: textMuted, fontStyle: 'italic',
                              cursor: 'pointer', transition: 'all 0.18s',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = isDark ? 'rgba(91,155,213,0.14)' : 'rgba(91,155,213,0.12)'
                              e.currentTarget.style.color = textPrimary
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = isDark ? 'rgba(91,155,213,0.06)' : 'rgba(91,155,213,0.06)'
                              e.currentTarget.style.color = textMuted
                            }}
                          >
                            "{q}"
                          </button>
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
    </>
  )
}