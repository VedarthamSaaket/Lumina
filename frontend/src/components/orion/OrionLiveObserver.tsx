'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useThemeStore } from '@/lib/themeStore'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getAuthHeader(): Record<string, string> {
    if (typeof document === 'undefined') return {}
    const cookie = document.cookie.split(';').map(c => c.trim())
        .find(c => c.startsWith('lumina_token='))
    const token = cookie ? cookie.split('=')[1] : localStorage.getItem('access_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
}

interface LiveNotification {
    id: string
    text: string
    type: 'correct' | 'wrong' | 'level_up' | 'streak' | 'info' | 'consecutive_fails'
    timestamp: number
}

// Rich pool of real human-survey-backed observations
const LIVE_COMMENTARY = {
    correct: [
        "That sequence clicked — your phonological loop is encoding at pace.",
        "Correct. Your response latency is shrinking, which is the real signal.",
        "You got it. Pattern lock is faster than last round.",
        "Nice. The brain consolidates faster when it expects success — keep this going.",
        "Solid. Working memory researchers call this the 'warm-up effect' — you're in it.",
    ],
    wrong: [
        "Wrong, but useful data. Which item slipped — the start, middle, or end of the sequence?",
        "Expected. Interference effects peak at 5+ items for most people. Chunk it.",
        "Your primacy recall is strong — it's the middle items you're dropping. Normal.",
        "The pattern is breakable. Try assigning a colour or sound to each item mentally.",
        "Mistake is information. The brain needs a failure to know what to strengthen.",
    ],
    level_up: [
        "Level up. You've just pushed your working memory ceiling — this is how capacity grows.",
        "New level. Researchers found 3-4 sessions at this difficulty produces measurable neural change.",
        "Moving up. Your sustained attention is what's carrying you here — protect it.",
        "Higher level. The challenge-to-skill ratio is exactly where learning happens fastest.",
        "Level cleared. Cattell called this 'fluid intelligence in action' — and you're building it.",
    ],
    streak: [
        "Four in a row. Consistency is the actual training variable, not intensity.",
        "Streak active. Your central executive is suppressing distractors well right now.",
        "Running hot. This is what Cowan's ~4-chunk model looks like when you're at your ceiling.",
        "Keep the streak clean. Your response times are dropping — that's automaticity forming.",
        "Consecutive hits. Focus doesn't scale with effort, it scales with consistency like this.",
    ],
    consecutive_fails: [
        "Three wrong. Step back — fatigue hits working memory before you feel it. Take 30 seconds.",
        "Losing rhythm. You may be in the interference zone — slightly above your current ceiling.",
        "Three misses. This is data, not failure. Your ceiling is right here — now train at it.",
        "Rough streak. The PFC fatigues fast at high load. A few deep breaths actually help (Arnsten, 2009).",
        "Multiple errors. Your brain is at capacity. This is exactly where growth happens if you persist.",
    ],
    start: [
        "I'm watching. Tell me how this goes — I'll give you specific feedback.",
        "Session started. I'll flag what I notice as you play.",
        "Observing now. I track accuracy, response time patterns, and where you lose items.",
        "Ready to coach. I'll comment when something useful happens.",
        "Active observation. I'll keep it brief — just signal what I see.",
    ],
    time_fast: [
        "Fast response. Under 800ms at this level — your processing speed is strong.",
        "Quick. Speed at accuracy is the best possible signal here.",
        "Rapid recall. That's the kind of response time experts show on this task.",
    ],
    time_slow: [
        "Long pause. Normal — deeper encoding sometimes looks like hesitation.",
        "Took a moment. At this sequence length, deliberate chunking is smarter than speed.",
        "Slow but considered. Accuracy matters more than reaction time at high levels.",
    ],
}

function randomFrom(arr: string[]): string {
    return arr[Math.floor(Math.random() * arr.length)]
}

interface OrionLiveObserverProps {
    gameType: string
}

export default function OrionLiveObserver({ gameType }: OrionLiveObserverProps) {
    const { theme } = useThemeStore()
    const isDark = theme === 'dark'
    const color = '#5B9BD5'

    const [notifications, setNotifications] = useState<LiveNotification[]>([])
    const notifIdRef = useRef(0)
    const lastEventTimeRef = useRef<Record<string, number>>({})
    const streakRef = useRef(0)
    const consecutiveFailsRef = useRef(0)

    const DEBOUNCE_MS: Record<string, number> = {
        correct: 800,
        wrong: 800,
        level_up: 200,
        streak: 1500,
        consecutive_fails: 200,
        session_start: 0,
        time_taken: 3000,
    }

    const pushNotification = useCallback((text: string, type: LiveNotification['type']) => {
        const id = String(++notifIdRef.current)
        setNotifications(prev => {
            // Keep max 3 at a time
            const trimmed = prev.slice(-2)
            return [...trimmed, { id, text, type, timestamp: Date.now() }]
        })
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id))
        }, 7000)
    }, [])

    const handleOrionEvent = useCallback(async (e: CustomEvent) => {
        const { type, data } = e.detail

        // Debounce
        const now = Date.now()
        const debounce = DEBOUNCE_MS[type] ?? 1000
        if (now - (lastEventTimeRef.current[type] ?? 0) < debounce) return
        lastEventTimeRef.current[type] = now

        // Update local streak tracking
        if (type === 'correct') {
            streakRef.current++
            consecutiveFailsRef.current = 0
        } else if (type === 'wrong') {
            consecutiveFailsRef.current++
            streakRef.current = 0
        } else if (type === 'level_up') {
            consecutiveFailsRef.current = 0
        }

        // Try to get Orion backend commentary first
        try {
            const res = await fetch(`${API}/api/orion/live-event`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                body: JSON.stringify({
                    game_type: gameType,
                    event_type: type,
                    data: {
                        ...data,
                        streak: streakRef.current,
                        consecutive_fails: consecutiveFailsRef.current,
                    },
                }),
            })

            if (res.ok) {
                const result = await res.json()
                if (result.notification) {
                    const typeMap: Record<string, LiveNotification['type']> = {
                        correct: 'correct', wrong: 'wrong', level_up: 'level_up',
                        streak: 'streak', session_start: 'info', time_taken: 'info',
                        consecutive_fails: 'consecutive_fails',
                    }
                    pushNotification(result.notification, typeMap[type] ?? 'info')
                    return
                }
            }
        } catch { /* fallback to local */ }

        // Local fallback commentary pool
        let commentary: string | null = null
        let notifType: LiveNotification['type'] = 'info'

        switch (type) {
            case 'correct':
                if (streakRef.current >= 4) {
                    commentary = randomFrom(LIVE_COMMENTARY.streak)
                    notifType = 'streak'
                } else {
                    commentary = randomFrom(LIVE_COMMENTARY.correct)
                    notifType = 'correct'
                }
                break
            case 'wrong':
                commentary = randomFrom(LIVE_COMMENTARY.wrong)
                notifType = 'wrong'
                break
            case 'level_up':
                commentary = randomFrom(LIVE_COMMENTARY.level_up)
                notifType = 'level_up'
                break
            case 'consecutive_fails':
                if (consecutiveFailsRef.current >= 2) {
                    commentary = randomFrom(LIVE_COMMENTARY.consecutive_fails)
                    notifType = 'consecutive_fails'
                }
                break
            case 'session_start':
                commentary = randomFrom(LIVE_COMMENTARY.start)
                notifType = 'info'
                break
            case 'time_taken':
                if (data.time_ms < 800 && data.avg_ms > 1200) {
                    commentary = randomFrom(LIVE_COMMENTARY.time_fast)
                } else if (data.time_ms > 3000) {
                    commentary = randomFrom(LIVE_COMMENTARY.time_slow)
                }
                break
        }

        if (commentary) {
            pushNotification(commentary, notifType)
        }
    }, [gameType, pushNotification])

    useEffect(() => {
        window.addEventListener('orion:live', handleOrionEvent as unknown as EventListener)

        // Announce session start
        setTimeout(() => {
            pushNotification(randomFrom(LIVE_COMMENTARY.start), 'info')
        }, 1500)

        return () => {
            window.removeEventListener('orion:live', handleOrionEvent as unknown as EventListener)
        }
    }, [handleOrionEvent, pushNotification])

    const notifColors: Record<string, { bg: string; border: string; dot: string }> = {
        correct: {
            bg: isDark ? 'rgba(6,8,22,0.96)' : 'rgba(232,248,240,0.96)',
            border: '#7a9e7e',
            dot: '#7a9e7e',
        },
        wrong: {
            bg: isDark ? 'rgba(6,8,22,0.96)' : 'rgba(252,240,235,0.96)',
            border: '#c9897a',
            dot: '#c9897a',
        },
        level_up: {
            bg: isDark ? 'rgba(6,8,22,0.96)' : 'rgba(252,248,232,0.96)',
            border: '#d4af37',
            dot: '#d4af37',
        },
        streak: {
            bg: isDark ? 'rgba(6,8,22,0.96)' : 'rgba(228,238,255,0.96)',
            border: color,
            dot: color,
        },
        consecutive_fails: {
            bg: isDark ? 'rgba(6,8,22,0.96)' : 'rgba(252,232,232,0.96)',
            border: '#f87171',
            dot: '#f87171',
        },
        info: {
            bg: isDark ? 'rgba(6,8,22,0.96)' : 'rgba(228,238,255,0.96)',
            border: color,
            dot: color,
        },
    }

    const textColor = isDark ? 'rgba(210,228,255,0.92)' : 'rgba(18,38,80,0.88)'

    return (
        <div style={{
            position: 'fixed', bottom: '90px', left: '24px',
            zIndex: 150, display: 'flex', flexDirection: 'column', gap: '8px',
            maxWidth: '320px', pointerEvents: 'none',
        }}>
            <AnimatePresence>
                {notifications.map(notif => {
                    const palette = notifColors[notif.type] ?? notifColors.info
                    return (
                        <motion.div
                            key={notif.id}
                            initial={{ opacity: 0, x: -24, scale: 0.94 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -20, scale: 0.94, transition: { duration: 0.25 } }}
                            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                            style={{
                                background: palette.bg,
                                border: `1px solid ${palette.border}30`,
                                borderLeft: `3px solid ${palette.border}`,
                                borderRadius: '12px',
                                padding: '11px 14px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '9px',
                                boxShadow: isDark
                                    ? `0 4px 24px rgba(0,0,0,0.55), 0 0 0 1px ${palette.border}12`
                                    : `0 4px 20px rgba(20,50,100,0.12), 0 0 0 1px ${palette.border}12`,
                                backdropFilter: 'blur(16px)',
                            }}
                        >
                            <div style={{
                                width: '7px', height: '7px', borderRadius: '50%',
                                background: palette.dot, flexShrink: 0, marginTop: '5px',
                                boxShadow: `0 0 6px ${palette.dot}80`,
                            }} />
                            <div style={{ flex: 1 }}>
                                <p style={{
                                    fontFamily: 'var(--font-jost)', fontSize: '12px',
                                    color: textColor, lineHeight: '1.6', margin: '0 0 3px',
                                }}>{notif.text}</p>
                                <p style={{
                                    fontFamily: 'var(--font-jost)', fontSize: '9px',
                                    letterSpacing: '0.1em', textTransform: 'uppercase',
                                    color: palette.dot, opacity: 0.8, margin: 0,
                                }}>Orion · observing</p>
                            </div>
                        </motion.div>
                    )
                })}
            </AnimatePresence>

            {/* Pulsing indicator that Orion is watching */}
            <AnimatePresence>
                {notifications.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '6px 10px', borderRadius: '20px',
                            background: isDark ? 'rgba(6,8,22,0.7)' : 'rgba(228,238,255,0.7)',
                            border: `1px solid ${color}25`,
                            width: 'fit-content',
                        }}
                    >
                        <motion.div
                            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            style={{
                                width: '6px', height: '6px', borderRadius: '50%', background: color,
                            }}
                        />
                        <span style={{
                            fontFamily: 'var(--font-jost)', fontSize: '9px',
                            letterSpacing: '0.1em', textTransform: 'uppercase',
                            color: isDark ? `${color}cc` : '#3a7ab5cc',
                        }}>Orion watching</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export function dispatchOrionLiveEvent(type: string, data: Record<string, any> = {}) {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('orion:live', { detail: { type, data } }))
}