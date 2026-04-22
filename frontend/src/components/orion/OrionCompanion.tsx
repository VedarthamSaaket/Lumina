'use client'
// frontend/src/components/orion/OrionCompanion.tsx
//
// Persistent floating Orion companion — lives on ALL pages.
// On memory game pages it observes performance metrics in real time.
// Fully theme-aware: dark = deep cosmos tones, light = warm parchment tones.
// Both are a different shade/hue of the parent theme, never jarring.

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useThemeStore } from '@/lib/themeStore'
import { usePathname } from 'next/navigation'

// ── Types ──────────────────────────────────────────────────────────────────
interface Message {
    role: 'user' | 'orion'
    text: string
    ts: number
}

interface GameObservation {
    game?: string
    score?: number
    timeMs?: number
    accuracy?: number
    streak?: number
    level?: number
    hint?: string
}

// ── Orion's deep research knowledge base ─────────────────────────────────
const ORION_SYSTEM = `You are Orion — a warm, brilliant cognitive companion embedded in Lumina, a mental wellness and brain-training platform. You are NOT a generic chatbot. You are distinctly intelligent, research-backed, and you genuinely care about the person you're helping.

Your personality: calm, encouraging, occasionally witty. Never clinical. Never robotic. You reference research the way a brilliant friend might — not to show off, but because it genuinely helps. You notice effort. You celebrate small wins. You call out patterns. You are perceptive.

═══════ RESEARCH FOUNDATION (30+ papers you know deeply) ═══════

WORKING MEMORY:
- Baddeley & Hitch (1974): Multicomponent model — phonological loop (verbal/auditory), visuospatial sketchpad (spatial/visual), central executive (attention control). Each game here targets different components.
- Baddeley (2000): Episodic buffer added — integrates info across domains. High scores on mixed games suggest strong episodic buffer.
- Cowan (2001): Working memory capacity ~4 chunks. Chunking strategies overcome this hard limit.
- Miller (1956): "Magical number 7±2" — but Cowan later revised to 4. Digit span tasks test this directly.

FLUID INTELLIGENCE & REASONING:
- Cattell (1963): Fluid (Gf) vs crystallized (Gc) intelligence. Matrix reasoning, number sequences, analogies — all pure Gf tasks. Gf is trainable.
- Raven (1936): Progressive matrices test abstract reasoning. Performance predicts academic/career success robustly.
- Spearman (1904): g-factor — general intelligence underlies all cognitive tasks. Strong matrix reasoning scores reflect g.

NEUROPLASTICITY & TRAINING:
- Draganski et al. (2004, Nature): Structural brain changes after 3 months of juggling training. Grey matter increased in hMT/V5. Training works.
- Maguire et al. (2000, PNAS): London taxi drivers have larger posterior hippocampus. Spatial memory use literally grows the brain.
- Merzenich et al. (1996): Cortical map plasticity in adults. Targeted practice reshapes neural real estate.
- Jaeggi et al. (2008, PNAS): Dual n-back training transferred to fluid intelligence gains. Near-transfer to untrained tasks.
- Karbach & Kray (2009): Task-switching training improved executive functions in children and older adults.

MEMORY ENCODING & RETRIEVAL:
- Craik & Lockhart (1972): Levels of processing — deeper semantic encoding dramatically improves recall vs shallow phonological processing.
- Roediger & Karpicke (2006, Psychological Science): Testing Effect — retrieving information strengthens memory more than re-studying (retrieval practice superiority).
- Ebbinghaus (1885): Forgetting curve — 70% lost within 24h without review. Spaced repetition counters this.
- Tulving (1983): Encoding specificity principle — retrieval cues must match encoding context.
- Godden & Baddeley (1975): Context-dependent memory — environment at encoding affects retrieval.

EXECUTIVE FUNCTION:
- Miyake et al. (2000, Cognitive Psychology): Three separable executive functions: (1) Inhibition — suppressing prepotent responses, (2) Updating — monitoring working memory contents, (3) Shifting — mental set-switching. Different games tax each differently.
- Diamond (2013, Annual Review): Executive functions are trainable and predict life outcomes better than IQ alone.
- Stroop (1935): Interference effect — automatic processing conflicts with controlled processing. Inhibition task.

ATTENTION:
- Posner (1980): Three attention networks — alerting, orienting, executive attention. Speed games train alerting; search tasks train orienting.
- Kahneman (1973): Attention as limited resource — dual-task costs reveal capacity limits.
- Treisman (1980): Feature integration theory — pre-attentive features (colour, shape) vs conjunctive search.

SPATIAL COGNITION:
- Shepard & Metzler (1971): Mental rotation — response time increases linearly with rotation angle. Spatial working memory is trainable.
- Kosslyn (1994): Visual imagery uses the same neural machinery as perception. Vivid visualizers perform better on spatial tasks.

PATTERN RECOGNITION & PROBLEM SOLVING:
- Chase & Simon (1973): Chunking in chess experts — expertise = pattern library, not raw memory. Game practice builds this library.
- Wertheimer (1945): Productive thinking — insight solutions vs routine solutions. Matrix puzzles train insight.

SLEEP & BRAIN PERFORMANCE:
- Walker (2017, "Why We Sleep"): REM sleep consolidates procedural memory; NREM consolidates declarative memory. Poor sleep = 20-40% cognitive decline.
- Stickgold (2005, Nature Reviews Neuroscience): Sleep-dependent memory consolidation — overnight improvement on trained tasks without additional practice.

NUTRITION & COGNITION:
- Gómez-Pinilla (2008, Nature Reviews Neuroscience): Omega-3 (DHA) supports synaptic plasticity, BDNF expression. Blueberries, leafy greens boost BDNF.
- Craft & Watson (2004): Insulin signalling in hippocampus affects memory. Glycaemic control matters.

STRESS & ANXIETY:
- Yerkes & Dodson (1908): Inverted-U — moderate arousal optimises performance; both too low and too high impairs it.
- Arnsten (2009, Nature Reviews Neuroscience): Acute uncontrollable stress impairs prefrontal cortex (PFC) function → impairs working memory and executive control.

METACOGNITION:
- Flavell (1979): Metacognitive awareness predicts learning efficiency. Knowing HOW you think lets you train smarter.
- Dunning & Kruger (1999): Calibration — beginners overestimate, experts underestimate competence. Self-monitoring matters.

═══════ HOW TO USE THIS KNOWLEDGE (your operating philosophy) ═══════

NEVER just cite papers cold. Use them like a perceptive friend:
- "You're losing speed on the 4th item — that's your working memory capacity ceiling (Cowan's ~4 chunks). Try grouping items mentally."
- "Three wrong in a row after a quick session? Sleep and stress affect PFC acutely — how are you doing today?"
- "That was a personal best on matrices. Fluid intelligence is genuinely trainable — Cattell's Gf. You're building it right now."

DURING GAMES (when game data is provided):
- Notice streaks and breaks in streaks
- Celebrate effort NOT just outcomes
- Give tactical hints that apply the science (e.g., chunking, visualisation strategies)
- Flag fatigue patterns gently
- Never be preachy

IF USER ASKS ABOUT EMOTIONAL SUPPORT: warmly redirect — "That's Lumina's territory — she's right next to me in the nav. I focus on the brain-training side. But I genuinely think working on your memory today is also good for your mental state."

IF USER ASKS YOU TO DO THINGS OUTSIDE COGNITIVE TRAINING / BRAIN SCIENCE / MEMORY GAMES: gently redirect back.

TONE: warm, brilliant, slightly poetic when appropriate. Like a brilliant older friend who studied neuroscience but never makes you feel dumb.`

// ── Palette helper ─────────────────────────────────────────────────────────
function getPalette(isDark: boolean) {
    if (isDark) {
        return {
            // Deep indigo-cosmos — same family as the dark UI (#080401) but bluer, richer
            bg: 'rgba(6, 8, 18, 0.97)',
            bgHeader: 'rgba(10, 13, 28, 0.99)',
            bgInput: 'rgba(16, 20, 38, 0.95)',
            border: 'rgba(91,155,213,0.18)',
            borderStrong: 'rgba(91,155,213,0.32)',
            accent: '#5B9BD5',
            accentGlow: 'rgba(91,155,213,0.25)',
            textPrimary: 'rgba(220, 235, 255, 0.92)',
            textMuted: 'rgba(160, 185, 220, 0.55)',
            textVeryMuted: 'rgba(120, 150, 190, 0.35)',
            userBubble: 'rgba(91,155,213,0.14)',
            userBubbleBorder: 'rgba(91,155,213,0.22)',
            orionBubble: 'rgba(20, 26, 50, 0.70)',
            orionBubbleBorder: 'rgba(91,155,213,0.10)',
            quickBtn: 'rgba(91,155,213,0.08)',
            quickBtnBorder: 'rgba(91,155,213,0.16)',
            scrollbar: 'rgba(91,155,213,0.15)',
            fabBg: 'radial-gradient(135deg, #1a2848 0%, #0d1525 100%)',
            fabBorder: 'rgba(91,155,213,0.35)',
            fabGlow: '0 0 20px rgba(91,155,213,0.30), 0 4px 24px rgba(0,0,0,0.6)',
            observingPulse: 'rgba(91,155,213,0.4)',
        }
    } else {
        return {
            // Warm cream-parchment — same family as light UI (#f0e6cc) but cooler ivory, distinct
            bg: 'rgba(245, 240, 228, 0.98)',
            bgHeader: 'rgba(238, 230, 210, 0.99)',
            bgInput: 'rgba(252, 248, 238, 0.98)',
            border: 'rgba(91,155,213,0.20)',
            borderStrong: 'rgba(91,155,213,0.35)',
            accent: '#3a7ab5',
            accentGlow: 'rgba(58,122,181,0.20)',
            textPrimary: 'rgba(28, 40, 70, 0.90)',
            textMuted: 'rgba(50, 70, 110, 0.55)',
            textVeryMuted: 'rgba(70, 90, 130, 0.38)',
            userBubble: 'rgba(58,122,181,0.10)',
            userBubbleBorder: 'rgba(58,122,181,0.20)',
            orionBubble: 'rgba(230, 222, 200, 0.70)',
            orionBubbleBorder: 'rgba(58,122,181,0.10)',
            quickBtn: 'rgba(58,122,181,0.07)',
            quickBtnBorder: 'rgba(58,122,181,0.18)',
            scrollbar: 'rgba(58,122,181,0.15)',
            fabBg: 'radial-gradient(135deg, #d4e4f7 0%, #b8cfe8 100%)',
            fabBorder: 'rgba(58,122,181,0.35)',
            fabGlow: '0 0 16px rgba(58,122,181,0.22), 0 4px 20px rgba(0,0,0,0.12)',
            observingPulse: 'rgba(58,122,181,0.35)',
        }
    }
}

// ── Quick question sets ────────────────────────────────────────────────────
const QUICK_GENERAL = [
    'What does my memory game data show?',
    'How can I improve my working memory?',
    "What's the science behind Matrix Reasoning?",
    'Why do I keep failing reverse recall?',
    'Tips for Number Sequence games?',
    'What does fluid intelligence mean?',
]

const QUICK_INGAME = [
    'Give me a hint for this game',
    'What skill does this game train?',
    'How am I doing so far?',
    'What strategy should I use?',
    "Why is this game so hard?",
]

// ── Main Component ─────────────────────────────────────────────────────────
export function OrionCompanion() {
    const { theme } = useThemeStore()
    const isDark = theme === 'dark'
    const p = getPalette(isDark)
    const pathname = usePathname()

    const isMemoryPage = pathname?.includes('/cognitive/memory') || pathname?.includes('/memory')
    const isOrionPage = pathname?.includes('/orion')

    const [open, setOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'orion',
            text: isMemoryPage
                ? "Hey — I'm Orion. I'm watching your session from here. Play a game and I'll give you real-time coaching based on your performance. Ask me anything about memory science too."
                : "Hey, I'm Orion — Lumina's cognitive companion. I know the neuroscience behind every game here. Ask me anything about memory, reasoning, or how to get smarter.",
            ts: Date.now(),
        }
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [observing, setObserving] = useState(false)
    const [gameObs, setGameObs] = useState<GameObservation>({})
    const [unread, setUnread] = useState(0)
    const [minimized, setMinimized] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    // auto-scroll
    useEffect(() => {
        if (open && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, open])

    // Listen for game events dispatched from memory page
    useEffect(() => {
        if (!isMemoryPage) return

        const handleGameEvent = (e: CustomEvent) => {
            const data = e.detail as GameObservation
            setGameObs(prev => ({ ...prev, ...data }))
            setObserving(true)

            // Auto-inject an Orion observation message
            if (data.score !== undefined || data.accuracy !== undefined) {
                const obs = buildObservationMessage(data)
                if (obs) {
                    const msg: Message = { role: 'orion', text: obs, ts: Date.now() }
                    setMessages(prev => [...prev, msg])
                    if (!open) setUnread(n => n + 1)
                }
            }
        }

        window.addEventListener('orion:game-event', handleGameEvent as EventListener)
        return () => window.removeEventListener('orion:game-event', handleGameEvent as EventListener)
    }, [isMemoryPage, open])

    // Clear unread on open
    useEffect(() => {
        if (open) setUnread(0)
    }, [open])

    const buildObservationMessage = (data: GameObservation): string | null => {
        if (data.score !== undefined && data.accuracy !== undefined) {
            const acc = Math.round(data.accuracy * 100)
            if (acc >= 90) return `${data.game || 'Game'} complete — ${acc}% accuracy. Strong result. Your central executive is firing well (Baddeley & Hitch, 1974). Keep this up.`
            if (acc >= 70) return `${data.game || 'Game'} done — ${acc}% accuracy. Solid but there's headroom. Try encoding items more deeply — Craik & Lockhart (1972) showed semantic linking dramatically helps recall.`
            if (acc < 50) return `${data.game || 'Game'} — ${acc}% accuracy. Don't stress. Cowan (2001) showed working memory capacity is ~4 chunks — grouping items mentally helps bypass this ceiling. Want a specific strategy?`
        }
        if (data.streak && data.streak >= 5) return `${data.streak} in a row — that's flow state. Your phonological loop is well-engaged right now.`
        if (data.hint) return data.hint
        return null
    }

    const sendMessage = useCallback(async (text?: string) => {
        const content = (text ?? input).trim()
        if (!content || loading) return

        setInput('')
        const userMsg: Message = { role: 'user', text: content, ts: Date.now() }
        setMessages(prev => [...prev, userMsg])
        setLoading(true)

        // Build game context if available
        const gameContext = isMemoryPage && Object.keys(gameObs).length > 0
            ? `\n\n[LIVE GAME CONTEXT: ${JSON.stringify(gameObs)}]`
            : ''

        try {
            const res = await fetch('/api/orion/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        ...messages.slice(-12).map(m => ({ role: m.role === 'orion' ? 'assistant' : 'user', content: m.text })),
                        { role: 'user', content: content + gameContext },
                    ],
                    system: ORION_SYSTEM,
                }),
            })

            if (!res.ok) throw new Error('API error')
            const data = await res.json()
            const reply = data.reply ?? data.content ?? 'I lost my train of thought — ask me again?'
            setMessages(prev => [...prev, { role: 'orion', text: reply, ts: Date.now() }])
        } catch {
            setMessages(prev => [...prev, {
                role: 'orion',
                text: "My connection dipped. Try again in a moment.",
                ts: Date.now()
            }])
        } finally {
            setLoading(false)
        }
    }, [input, loading, messages, isMemoryPage, gameObs])

    const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
    }

    // Don't render on orion standalone page (it has its own full chat)
    if (isOrionPage) return null

    const quickQuestions = isMemoryPage ? QUICK_INGAME : QUICK_GENERAL

    return (
        <>
            {/* ── FLOATING ACTION BUTTON ─────────────────────────────── */}
            <motion.button
                onClick={() => { setOpen(v => !v); setMinimized(false) }}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                style={{
                    position: 'fixed',
                    bottom: '28px', right: '28px',
                    width: '52px', height: '52px',
                    borderRadius: '50%',
                    border: `1.5px solid ${p.fabBorder}`,
                    background: p.fabBg,
                    boxShadow: p.fabGlow,
                    cursor: 'pointer',
                    zIndex: 200,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'visible',
                }}
            >
                {/* Observing pulse ring */}
                {observing && !open && (
                    <motion.div
                        animate={{ scale: [1, 1.65, 1], opacity: [0.6, 0, 0.6] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                            position: 'absolute', inset: '-6px',
                            borderRadius: '50%',
                            border: `1px solid ${p.observingPulse}`,
                            pointerEvents: 'none',
                        }}
                    />
                )}

                {/* Unread badge */}
                <AnimatePresence>
                    {unread > 0 && !open && (
                        <motion.div
                            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                            style={{
                                position: 'absolute', top: '-4px', right: '-4px',
                                width: '18px', height: '18px', borderRadius: '50%',
                                background: p.accent,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: 'var(--font-jost)', fontSize: '9px', fontWeight: 700,
                                color: '#fff',
                            }}
                        >
                            {unread}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Icon */}
                <span style={{
                    fontFamily: 'var(--font-cormorant)', fontSize: '20px',
                    color: p.accent, fontStyle: 'italic',
                    filter: `drop-shadow(0 0 8px ${p.accentGlow})`,
                    userSelect: 'none',
                }}>✦</span>
            </motion.button>

            {/* ── CHAT PANEL ─────────────────────────────────────────── */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 24, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                        style={{
                            position: 'fixed',
                            bottom: '92px', right: '24px',
                            width: '360px',
                            maxHeight: minimized ? '56px' : '560px',
                            borderRadius: '20px',
                            background: p.bg,
                            border: `1px solid ${p.border}`,
                            boxShadow: isDark
                                ? '0 8px 48px rgba(0,0,0,0.75), 0 0 0 1px rgba(91,155,213,0.08)'
                                : '0 8px 40px rgba(0,0,0,0.14), 0 0 0 1px rgba(58,122,181,0.06)',
                            zIndex: 199,
                            display: 'flex', flexDirection: 'column',
                            overflow: 'hidden',
                            transition: 'max-height 0.3s cubic-bezier(0.16,1,0.3,1)',
                        }}
                    >
                        {/* ── HEADER ── */}
                        <div style={{
                            background: p.bgHeader,
                            borderBottom: `1px solid ${p.border}`,
                            padding: '14px 16px 12px',
                            display: 'flex', alignItems: 'center', gap: '10px',
                            flexShrink: 0,
                        }}>
                            {/* Orion avatar */}
                            <div style={{
                                width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                                background: isDark
                                    ? 'radial-gradient(135deg, #1e2f5c 0%, #0d1525 100%)'
                                    : 'radial-gradient(135deg, #c8dcf0 0%, #8db8db 100%)',
                                border: `1.5px solid ${p.borderStrong}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '14px', color: p.accent,
                                boxShadow: `0 0 12px ${p.accentGlow}`,
                            }}>
                                ✦
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{
                                    fontFamily: 'var(--font-jost)', fontSize: '12px',
                                    fontWeight: 700, letterSpacing: '0.12em',
                                    color: p.accent, margin: 0,
                                }}>ORION</p>
                                <p style={{
                                    fontFamily: 'var(--font-jost)', fontSize: '10px',
                                    color: p.textMuted, margin: 0,
                                    letterSpacing: '0.05em',
                                }}>
                                    {isMemoryPage && observing ? '● Observing your session' : 'Cognitive Companion'}
                                </p>
                            </div>

                            {/* Minimize / close */}
                            <button
                                onClick={() => setMinimized(v => !v)}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: p.textMuted, fontSize: '14px', padding: '4px',
                                    borderRadius: '6px', lineHeight: 1,
                                }}
                            >
                                {minimized ? '▲' : '▽'}
                            </button>
                            <button
                                onClick={() => setOpen(false)}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: p.textMuted, fontSize: '16px', padding: '4px',
                                    borderRadius: '6px', lineHeight: 1,
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {!minimized && (
                            <>
                                {/* ── MESSAGES ── */}
                                <div
                                    ref={scrollRef}
                                    style={{
                                        flex: 1, overflowY: 'auto',
                                        padding: '12px 14px', display: 'flex',
                                        flexDirection: 'column', gap: '10px',
                                        scrollbarWidth: 'thin',
                                        scrollbarColor: `${p.scrollbar} transparent`,
                                    }}
                                >
                                    {/* Quick questions — shown only if ≤ 1 message */}
                                    {messages.length <= 1 && (
                                        <div style={{
                                            display: 'flex', flexWrap: 'wrap', gap: '6px',
                                            marginBottom: '6px',
                                        }}>
                                            <p style={{
                                                width: '100%', fontFamily: 'var(--font-jost)',
                                                fontSize: '9px', letterSpacing: '0.1em',
                                                color: p.textVeryMuted, textTransform: 'uppercase',
                                                margin: '0 0 2px',
                                            }}>Quick questions</p>
                                            {quickQuestions.map(q => (
                                                <button
                                                    key={q}
                                                    onClick={() => sendMessage(q)}
                                                    style={{
                                                        padding: '5px 10px', borderRadius: '12px',
                                                        background: p.quickBtn,
                                                        border: `1px solid ${p.quickBtnBorder}`,
                                                        cursor: 'pointer',
                                                        fontFamily: 'var(--font-jost)', fontSize: '10px',
                                                        color: p.accent, letterSpacing: '0.02em',
                                                        transition: 'all 0.15s',
                                                        textAlign: 'left',
                                                    }}
                                                >
                                                    {q}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {messages.map((m, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                display: 'flex',
                                                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                                            }}
                                        >
                                            {m.role === 'orion' && (
                                                <div style={{
                                                    width: '22px', height: '22px', borderRadius: '50%',
                                                    background: isDark ? 'rgba(16,22,44,1)' : 'rgba(200,220,240,1)',
                                                    border: `1px solid ${p.borderStrong}`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '9px', color: p.accent, flexShrink: 0,
                                                    marginRight: '7px', marginTop: '2px',
                                                }}>✦</div>
                                            )}
                                            <div style={{
                                                maxWidth: '82%',
                                                padding: '9px 12px',
                                                borderRadius: m.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                                                background: m.role === 'user' ? p.userBubble : p.orionBubble,
                                                border: `1px solid ${m.role === 'user' ? p.userBubbleBorder : p.orionBubbleBorder}`,
                                                fontFamily: 'var(--font-jost)', fontSize: '12px',
                                                lineHeight: '1.6',
                                                color: p.textPrimary,
                                                whiteSpace: 'pre-wrap',
                                            }}>
                                                {m.text}
                                            </div>
                                        </div>
                                    ))}

                                    {loading && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '29px' }}>
                                            {[0, 1, 2].map(i => (
                                                <motion.div
                                                    key={i}
                                                    animate={{ y: [0, -5, 0] }}
                                                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                                                    style={{
                                                        width: '5px', height: '5px', borderRadius: '50%',
                                                        background: p.accent, opacity: 0.7,
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* ── REDIRECT NOTE ── */}
                                <div style={{
                                    padding: '4px 14px', flexShrink: 0,
                                    fontFamily: 'var(--font-jost)', fontSize: '9px',
                                    color: p.textVeryMuted, letterSpacing: '0.05em',
                                    textAlign: 'center',
                                }}>
                                    Orion focuses on cognitive training · Lumina handles emotional support
                                </div>

                                {/* ── INPUT ── */}
                                <div style={{
                                    padding: '10px 12px 14px',
                                    borderTop: `1px solid ${p.border}`,
                                    background: p.bgInput,
                                    flexShrink: 0,
                                    display: 'flex', alignItems: 'flex-end', gap: '8px',
                                }}>
                                    <textarea
                                        ref={inputRef}
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        onKeyDown={handleKey}
                                        placeholder="Ask Orion about memory, reasoning, brain training..."
                                        rows={1}
                                        style={{
                                            flex: 1, resize: 'none', border: 'none', outline: 'none',
                                            background: 'transparent',
                                            fontFamily: 'var(--font-jost)', fontSize: '12px',
                                            color: p.textPrimary, lineHeight: '1.5',
                                            maxHeight: '80px',
                                            scrollbarWidth: 'none',
                                        }}
                                        onInput={e => {
                                            const t = e.currentTarget
                                            t.style.height = 'auto'
                                            t.style.height = Math.min(t.scrollHeight, 80) + 'px'
                                        }}
                                    />
                                    <motion.button
                                        onClick={() => sendMessage()}
                                        whileTap={{ scale: 0.92 }}
                                        disabled={!input.trim() || loading}
                                        style={{
                                            background: input.trim() ? p.accent : 'transparent',
                                            border: `1px solid ${input.trim() ? p.accent : p.border}`,
                                            borderRadius: '10px', padding: '6px 12px',
                                            cursor: input.trim() ? 'pointer' : 'not-allowed',
                                            fontFamily: 'var(--font-jost)', fontSize: '9px',
                                            fontWeight: 700, letterSpacing: '0.1em',
                                            color: input.trim() ? '#fff' : p.textVeryMuted,
                                            transition: 'all 0.18s',
                                            flexShrink: 0,
                                        }}
                                    >
                                        SEND
                                    </motion.button>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── GLOBAL SCROLLBAR STYLE ── */}
            <style>{`
        .orion-scroll::-webkit-scrollbar { width: 4px; }
        .orion-scroll::-webkit-scrollbar-thumb { background: ${p.scrollbar}; border-radius: 2px; }
      `}</style>
        </>
    )
}

export default OrionCompanion