'use client'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useThemeStore } from '@/lib/themeStore'
import Grainient from '@/components/ui/Grainient'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getAuthHeader(): Record<string, string> {
    if (typeof document === 'undefined') return {}
    const cookie = document.cookie.split(';').map(c => c.trim())
        .find(c => c.startsWith('lumina_token='))
    const token = cookie ? cookie.split('=')[1] : localStorage.getItem('access_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
}

interface OrionDebriefProps {
    gameId: string
    gameTitle: string
    rounds: any[]
    stats: Record<string, any>
    sessionStartMs: number
    onBack: () => void
    onRetake: () => void
    color: string
    icon: string
}

interface DebriefData {
    headline?: string
    what_happened?: string
    what_this_tells_you?: string
    one_thing_to_try?: string
    raw?: string
}

function parseDebrief(text: string): DebriefData {
    const result: DebriefData = { raw: text }
    const markers = [
        ['HEADLINE:', 'headline'],
        ['WHAT HAPPENED:', 'what_happened'],
        ['WHAT THIS TELLS YOU:', 'what_this_tells_you'],
        ['ONE THING TO TRY:', 'one_thing_to_try'],
    ] as const

    for (let i = 0; i < markers.length; i++) {
        const [label, key] = markers[i]
        const idx = text.indexOf(label)
        if (idx < 0) continue
        const nextIdx = markers.slice(i + 1).reduce((min, [nextLabel]) => {
            const pos = text.indexOf(nextLabel, idx + label.length)
            return pos > 0 && pos < min ? pos : min
        }, text.length)
            ; (result as any)[key] = text.slice(idx + label.length, nextIdx).trim()
    }

    return result
}

// Compute detailed live stats from round data
function computeDetailedStats(gameId: string, rounds: any[], sessionDurationMs: number) {
    const correct = rounds.filter(r => r.correct)
    const wrong = rounds.filter(r => !r.correct)
    const total = rounds.length
    const accuracy = total > 0 ? Math.round(correct.length / total * 100) : 0
    const maxLevel = Math.max(...rounds.map(r => r.level || 0), 0)

    // Response time analysis (if available)
    const timings = rounds.map(r => r.time_ms).filter(Boolean)
    const avgTime = timings.length > 0 ? Math.round(timings.reduce((a, b) => a + b, 0) / timings.length) : null

    // Streak analysis
    let maxStreak = 0, currentStreak = 0
    for (const r of rounds) {
        if (r.correct) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak) }
        else currentStreak = 0
    }

    // Error pattern analysis. Index wrong rounds by their original position so
    // first-half vs second-half is computed against actual round order.
    let firstHalfErrors = 0, secondHalfErrors = 0
    rounds.forEach((r, i) => {
        if (r.correct) return
        if (i < total / 2) firstHalfErrors++
        else secondHalfErrors++
    })
    // Fatigue requires: meaningful error count (>=3), the back half clearly
    // worse (>=2x first half AND at least 2 errors in the back), and accuracy
    // below 80%. Prevents 10/12 sessions from being labeled fatigued.
    const fatiguedPattern =
        wrong.length >= 3 &&
        secondHalfErrors >= 2 &&
        secondHalfErrors >= firstHalfErrors * 2 &&
        accuracy < 80

    // Game-specific analysis
    let gameSpecific: Record<string, any> = {}

    if (gameId === 'digit' || gameId === 'letter') {
        const forwardRounds = rounds.filter(r => r.mode === 'forward')
        const reverseRounds = rounds.filter(r => r.mode === 'reverse')
        const maxFwdSpan = Math.max(...correct.filter(r => r.mode === 'forward').map(r => r.sequence?.length || 0), 0)
        const maxRevSpan = Math.max(...correct.filter(r => r.mode === 'reverse').map(r => r.sequence?.length || 0), 0)
        const modesUsed = Array.from(new Set(rounds.map(r => r.mode).filter(Boolean)))
        const forwardAcc = forwardRounds.length > 0 ? Math.round(forwardRounds.filter(r => r.correct).length / forwardRounds.length * 100) : null
        const reverseAcc = reverseRounds.length > 0 ? Math.round(reverseRounds.filter(r => r.correct).length / reverseRounds.length * 100) : null

        gameSpecific = {
            maxFwdSpan: maxFwdSpan || '-',
            maxRevSpan: maxRevSpan > 0 ? maxRevSpan : '-',
            modesUsed: modesUsed.join(', ') || 'forward',
            forwardAcc: forwardAcc !== null ? `${forwardAcc}%` : null,
            reverseAcc: reverseAcc !== null ? `${reverseAcc}%` : null,
        }
    }

    if (gameId === 'spatial' || gameId === 'spatial_reverse') {
        const maxPattern = Math.max(...rounds.map(r => r.shown?.length || 0), 0)
        gameSpecific = { maxPattern }
    }

    if (gameId === 'word') {
        const allWords = rounds.flatMap(r => r.words || [])
        const recalled = rounds.flatMap(r => r.recalled || [])
        const recallRate = allWords.length > 0 ? Math.round(recalled.filter(w => allWords.includes(w)).length / allWords.length * 100) : 0
        gameSpecific = { recallRate: `${recallRate}%`, maxListLength: Math.max(...rounds.map(r => r.words?.length || 0), 0) }
    }

    if (['matrix', 'oddoneout', 'series', 'analogy', 'paperfold'].includes(gameId)) {
        gameSpecific = { maxLevel, levelsCompleted: Math.floor(total / 5) }
    }

    return {
        accuracy,
        correct: correct.length,
        total,
        maxLevel,
        maxStreak,
        avgTime,
        fatiguedPattern,
        sessionDurationSec: Math.round(sessionDurationMs / 1000),
        ...gameSpecific,
    } as Record<string, any>
}

export default function OrionDebrief({
    gameId, gameTitle, rounds, stats, sessionStartMs,
    onBack, onRetake, color, icon,
}: OrionDebriefProps) {
    const { theme } = useThemeStore()
    const isDark = theme === 'dark'
    const orionColor = '#5B9BD5'

    const [debrief, setDebrief] = useState<DebriefData | null>(null)
    const [loading, setLoading] = useState(true)
    const fetchedRef = useRef(false)

    const durationMs = Date.now() - sessionStartMs
    const detailedStats = computeDetailedStats(gameId, rounds, durationMs)

    const bgPanel = isDark
        ? 'linear-gradient(160deg, rgba(6,8,22,0.96) 0%, rgba(10,14,32,0.96) 100%)'
        : 'linear-gradient(160deg, rgba(232,240,254,0.97) 0%, rgba(220,234,252,0.97) 100%)'
    const borderColor = isDark ? `${orionColor}22` : `${orionColor}28`
    const textPrimary = isDark ? 'rgba(210,228,255,0.93)' : 'rgba(18,38,80,0.92)'
    const textSecondary = isDark ? 'rgba(155,185,225,0.70)' : 'rgba(40,70,130,0.70)'
    const textMuted = isDark ? 'rgba(110,148,200,0.50)' : 'rgba(50,80,130,0.50)'
    const cardBg = isDark ? 'rgba(14,20,48,0.50)' : 'rgba(205,222,250,0.45)'
    const cardBorder = isDark ? `1px solid ${orionColor}15` : `1px solid ${orionColor}20`

    useEffect(() => {
        if (fetchedRef.current || rounds.length === 0) { setLoading(false); return }
        fetchedRef.current = true

        fetch(`${API}/api/orion/debrief`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            body: JSON.stringify({
                game_type: gameId,
                rounds: rounds.map(r => ({
                    correct: r.correct,
                    level: r.level,
                    mode: r.mode,
                    sequence: r.sequence,
                    given: r.given,
                    words: r.words,
                    shown: r.shown,
                    answer: r.answer,
                    rule: r.rule,
                    time_ms: r.time_ms,
                })),
                stats: detailedStats,
                session_duration_ms: durationMs,
            }),
        })
            .then(r => r.json())
            .then(data => {
                if (data.debrief) setDebrief(parseDebrief(data.debrief))
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [])

    // Build stat cards from actual observed data
    const statCards = (() => {
        const base = [
            { label: 'Accuracy', value: `${detailedStats.accuracy}%` },
            { label: 'Correct / Total', value: `${detailedStats.correct}/${detailedStats.total}` },
            { label: 'Max level', value: detailedStats.maxLevel },
            { label: 'Best streak', value: detailedStats.maxStreak },
        ]

        // Add game-specific observed stats
        if (detailedStats.maxFwdSpan && detailedStats.maxFwdSpan !== '-') {
            base.push({ label: 'Forward span', value: detailedStats.maxFwdSpan })
        }
        if (detailedStats.maxRevSpan && detailedStats.maxRevSpan !== '-') {
            base.push({ label: 'Reverse span', value: detailedStats.maxRevSpan })
        }
        if (detailedStats.recallRate) {
            base.push({ label: 'Recall rate', value: detailedStats.recallRate })
        }
        if (detailedStats.avgTime) {
            base.push({ label: 'Avg response', value: `${detailedStats.avgTime}ms` })
        }
        if (detailedStats.sessionDurationSec) {
            const mins = Math.floor(detailedStats.sessionDurationSec / 60)
            const secs = detailedStats.sessionDurationSec % 60
            base.push({ label: 'Session time', value: mins > 0 ? `${mins}m ${secs}s` : `${secs}s` })
        }

        return base.slice(0, 6)
    })()

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ borderRadius: '20px', overflow: 'hidden', background: bgPanel, border: `1px solid ${borderColor}`, boxShadow: isDark ? '0 12px 56px rgba(0,0,0,0.60)' : '0 12px 48px rgba(20,50,120,0.14)', position: 'relative' }}
        >
            {/* Grainient overlay - matching OrionChatPanel */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
                <Grainient
                    color1={isDark ? '#1a2a4a' : '#c0d0e8'}
                    color2={isDark ? '#0a1528' : '#d0ddf0'}
                    color3={isDark ? '#050a14' : '#e0edf8'}
                    timeSpeed={0.10}
                    grainAmount={0.05}
                    grainScale={2.0}
                    grainAnimated={true}
                    contrast={1.2}
                    saturation={0.7}
                    zoom={0.95}
                    warpStrength={0}
                    warpFrequency={3.5}
                    warpSpeed={1.0}
                />
            </div>
            {/* CSS grain overlay */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                backgroundSize: '180px',
                mixBlendMode: 'overlay',
                opacity: 0.30,
            }} />

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 2 }}>
                {/* Header */}
                <div style={{ padding: '20px 24px 16px', background: isDark ? 'rgba(8,10,26,0.99)' : 'rgba(218,232,252,0.99)', borderBottom: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ fontSize: '28px', color, filter: `drop-shadow(0 0 8px ${color}50)` }}>{icon}</div>
                    <div>
                        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.14em', color: orionColor, margin: '0 0 2px' }}>ORION DEBRIEF</p>
                        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 400, fontSize: '1.1rem', color: textPrimary, margin: 0 }}>{gameTitle}</p>
                    </div>
                    {detailedStats.fatiguedPattern && (
                        <div style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: '8px', background: 'rgba(201,137,122,0.12)', border: '1px solid rgba(201,137,122,0.28)' }}>
                            <p style={{ fontFamily: 'var(--font-jost)', fontSize: '9px', letterSpacing: '0.1em', color: '#c9897a', margin: 0, textTransform: 'uppercase' }}>Fatigue pattern detected</p>
                        </div>
                    )}
                </div>

                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Live-observed stats grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(statCards.length, 3)}, 1fr)`, gap: '10px' }}>
                        {statCards.map(({ label, value }) => (
                            <div key={label} style={{ background: cardBg, border: cardBorder, borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                                <p style={{ fontFamily: 'var(--font-jost)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: textMuted, margin: '0 0 4px' }}>{label}</p>
                                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: '1.8rem', color, lineHeight: 1, margin: 0 }}>{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Mode breakdown for sequence games */}
                    {(gameId === 'digit' || gameId === 'letter') && detailedStats.forwardAcc && (
                        <div style={{ background: cardBg, border: cardBorder, borderRadius: '12px', padding: '14px' }}>
                            <p style={{ fontFamily: 'var(--font-jost)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: orionColor, marginBottom: '10px' }}>Mode breakdown (live observed)</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                {detailedStats.forwardAcc && (
                                    <div style={{ padding: '8px 12px', borderRadius: '8px', background: isDark ? 'rgba(122,158,126,0.10)' : 'rgba(122,158,126,0.12)', border: '1px solid rgba(122,158,126,0.25)' }}>
                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '10px', color: '#7a9e7e', margin: '0 0 2px' }}>Forward accuracy</p>
                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '1.4rem', fontWeight: 600, color: '#7a9e7e', margin: 0 }}>{detailedStats.forwardAcc}</p>
                                    </div>
                                )}
                                {detailedStats.reverseAcc && (
                                    <div style={{ padding: '8px 12px', borderRadius: '8px', background: isDark ? 'rgba(201,137,122,0.10)' : 'rgba(201,137,122,0.12)', border: '1px solid rgba(201,137,122,0.25)' }}>
                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '10px', color: '#c9897a', margin: '0 0 2px' }}>Reverse accuracy</p>
                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '1.4rem', fontWeight: 600, color: '#c9897a', margin: 0 }}>{detailedStats.reverseAcc}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Orion debrief text */}
                    <div style={{ background: cardBg, border: cardBorder, borderRadius: '14px', padding: '18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0, background: `${orionColor}18`, border: `1px solid ${orionColor}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: orionColor }}>*</div>
                            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.14em', color: orionColor, margin: 0 }}>ORION'S ANALYSIS</p>
                        </div>

                        {loading && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    {[0, 1, 2].map(i => (
                                        <motion.div key={i}
                                            style={{ width: '6px', height: '6px', borderRadius: '50%', background: orionColor }}
                                            animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                                            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.18 }}
                                        />
                                    ))}
                                </div>
                                <p style={{ fontFamily: 'var(--font-jost)', fontSize: '12px', color: textMuted, margin: 0 }}>Analysing your live session data...</p>
                            </div>
                        )}

                        {!loading && debrief && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {debrief.headline && (
                                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 400, fontSize: '1.1rem', color: textPrimary, lineHeight: '1.55', margin: 0 }}>{debrief.headline}</p>
                                )}
                                {debrief.what_happened && (
                                    <div>
                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: orionColor, marginBottom: '5px' }}>What happened</p>
                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '12.5px', color: textSecondary, lineHeight: '1.75', margin: 0 }}>{debrief.what_happened}</p>
                                    </div>
                                )}
                                {debrief.what_this_tells_you && (
                                    <div style={{ background: isDark ? 'rgba(212,175,55,0.05)' : 'rgba(212,175,55,0.07)', border: `1px solid ${isDark ? 'rgba(212,175,55,0.15)' : 'rgba(139,100,16,0.18)'}`, borderRadius: '10px', padding: '12px' }}>
                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: isDark ? '#d4af37' : '#8b6410', marginBottom: '5px' }}>What this tells you about your brain today</p>
                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '12.5px', color: textSecondary, lineHeight: '1.75', margin: 0 }}>{debrief.what_this_tells_you}</p>
                                    </div>
                                )}
                                {debrief.one_thing_to_try && (
                                    <div>
                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: orionColor, marginBottom: '5px' }}>One thing to try next time</p>
                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '12.5px', color: textSecondary, lineHeight: '1.75', margin: 0 }}>{debrief.one_thing_to_try}</p>
                                    </div>
                                )}
                                {!debrief.headline && debrief.raw && (
                                    <p style={{ fontFamily: 'var(--font-jost)', fontSize: '12.5px', color: textSecondary, lineHeight: '1.75', margin: 0, whiteSpace: 'pre-line' }}>{debrief.raw}</p>
                                )}
                            </div>
                        )}

                        {!loading && !debrief && rounds.length > 0 && (
                            <p style={{ fontFamily: 'var(--font-jost)', fontSize: '12px', color: textMuted, margin: 0 }}>Your session data has been saved. Orion will have more to say after your next session.</p>
                        )}
                    </div>

                    {/* Round log */}
                    <div style={{ background: cardBg, border: cardBorder, borderRadius: '12px', padding: '14px' }}>
                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: textMuted, marginBottom: '10px' }}>Round by round</p>
                        <div style={{ maxHeight: '130px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {rounds.map((r, i) => {
                                const ril = i % 5
                                const lvl = Math.floor(i / 5) + 1
                                const extra = r.mode ? ` · ${r.mode}` : r.sequence ? ` · ${r.sequence.length} items` : r.shown ? ` · ${r.shown.length} cells` : ''
                                const timeStr = r.time_ms ? ` · ${r.time_ms}ms` : ''
                                return (
                                    <div key={i} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        fontFamily: 'var(--font-jost)', fontSize: '11px', padding: '3px 0',
                                        borderBottom: `1px solid ${borderColor}`, color: textMuted,
                                    }}>
                                        <span>Lv{lvl} R{ril + 1}{extra}{timeStr}</span>
                                        <span style={{ color: r.correct ? '#7a9e7e' : '#c9897a', fontWeight: 600 }}>{r.correct ? '+' : 'x'}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <motion.button onClick={onBack} whileHover={{ scale: 1.02 }}
                            style={{ padding: '11px 22px', borderRadius: '12px', fontFamily: 'var(--font-jost)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', background: cardBg, border: cardBorder, color: textPrimary, cursor: 'pointer' }}>
                            All games
                        </motion.button>
                        <motion.button onClick={onRetake} whileHover={{ scale: 1.02 }}
                            style={{ padding: '11px 22px', borderRadius: '12px', fontFamily: 'var(--font-jost)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', background: `${color}18`, border: `1px solid ${color}38`, color: textPrimary, cursor: 'pointer' }}>
                            Play again
                        </motion.button>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}