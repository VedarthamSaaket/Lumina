'use client'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useThemeStore } from '@/lib/themeStore'

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
    stats?: Record<string, any>
}

function parseDebrief(text: string): DebriefData {
    const result: DebriefData = { raw: text }
    const sections = ['HEADLINE', 'WHAT HAPPENED', 'WHAT THIS TELLS YOU', 'ONE THING TO TRY']
    const keys = ['headline', 'what_happened', 'what_this_tells_you', 'one_thing_to_try']

    for (let i = 0; i < sections.length; i++) {
        const label = sections[i] + ':'
        const idx = text.indexOf(label)
        if (idx < 0) continue
        const nextIdx = sections.slice(i + 1).reduce((min, s) => {
            const pos = text.indexOf(s + ':', idx + label.length)
            return pos > 0 && pos < min ? pos : min
        }, text.length)
        const value = text.slice(idx + label.length, nextIdx).trim()
            ; (result as any)[keys[i]] = value
    }

    return result
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

    const bgPanel = isDark
        ? 'linear-gradient(160deg, rgba(6,8,22,0.96) 0%, rgba(10,14,32,0.96) 100%)'
        : 'linear-gradient(160deg, rgba(232,240,254,0.97) 0%, rgba(220,234,252,0.97) 100%)'
    const borderColor = isDark ? `${orionColor}22` : `${orionColor}28`
    const textPrimary = isDark ? 'rgba(210,228,255,0.93)' : 'rgba(18,38,80,0.92)'
    const textSecondary = isDark ? 'rgba(155,185,225,0.70)' : 'rgba(40,70,130,0.70)'
    const textMuted = isDark ? 'rgba(110,148,200,0.50)' : 'rgba(50,80,130,0.50)'
    const cardBg = isDark ? 'rgba(14,20,48,0.50)' : 'rgba(205,222,250,0.45)'
    const cardBorder = isDark ? `1px solid ${orionColor}15` : `1px solid ${orionColor}20`

    const correct = rounds.filter(r => r.correct).length
    const total = rounds.length
    const accuracy = total ? Math.round(correct / total * 100) : 0
    const maxLevel = Math.max(...rounds.map(r => r.level || 0), 0)
    const durationMs = Date.now() - sessionStartMs

    useEffect(() => {
        if (fetchedRef.current) return
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
                stats,
                session_duration_ms: durationMs,
            }),
        })
            .then(r => r.json())
            .then(data => {
                if (data.debrief) {
                    setDebrief(parseDebrief(data.debrief))
                }
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [])

    const statItems = [
        { label: 'Accuracy', value: `${accuracy}%` },
        { label: 'Correct', value: `${correct}/${total}` },
        { label: 'Max level', value: maxLevel },
        ...Object.entries(stats).slice(0, 2).map(([k, v]) => ({ label: k, value: String(v) })),
    ].slice(0, 4)

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
                borderRadius: '20px',
                overflow: 'hidden',
                background: bgPanel,
                border: `1px solid ${borderColor}`,
                boxShadow: isDark
                    ? '0 12px 56px rgba(0,0,0,0.60)'
                    : '0 12px 48px rgba(20,50,120,0.14)',
            }}
        >
            {/* Header */}
            <div style={{
                padding: '20px 24px 16px',
                background: isDark ? 'rgba(8,10,26,0.99)' : 'rgba(218,232,252,0.99)',
                borderBottom: `1px solid ${borderColor}`,
                display: 'flex', alignItems: 'center', gap: '14px',
            }}>
                <div style={{ fontSize: '28px', color, filter: `drop-shadow(0 0 8px ${color}50)` }}>{icon}</div>
                <div>
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.14em', color: orionColor, margin: '0 0 2px' }}>
                        ORION DEBRIEF
                    </p>
                    <p style={{
                        fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 400,
                        fontSize: '1.1rem', color: textPrimary, margin: 0,
                    }}>{gameTitle}</p>
                </div>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${statItems.length}, 1fr)`, gap: '10px' }}>
                    {statItems.map(({ label, value }) => (
                        <div key={label} style={{
                            background: cardBg, border: cardBorder,
                            borderRadius: '10px', padding: '12px', textAlign: 'center',
                        }}>
                            <p style={{ fontFamily: 'var(--font-jost)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: textMuted, margin: '0 0 4px' }}>
                                {label}
                            </p>
                            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: '1.8rem', color, lineHeight: 1, margin: 0 }}>
                                {value}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Debrief content */}
                <div style={{
                    background: cardBg, border: cardBorder,
                    borderRadius: '14px', padding: '18px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                        <div style={{
                            width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                            background: `${orionColor}18`, border: `1px solid ${orionColor}35`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '8px', color: orionColor,
                        }}>✦</div>
                        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.14em', color: orionColor, margin: 0 }}>
                            ORION'S NOTES
                        </p>
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
                            <p style={{ fontFamily: 'var(--font-jost)', fontSize: '12px', color: textMuted, margin: 0 }}>
                                Writing your debrief...
                            </p>
                        </div>
                    )}

                    {!loading && debrief && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {debrief.headline && (
                                <p style={{
                                    fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 400,
                                    fontSize: '1.1rem', color: textPrimary, lineHeight: '1.5', margin: 0,
                                }}>{debrief.headline}</p>
                            )}
                            {debrief.what_happened && (
                                <div>
                                    <p style={{ fontFamily: 'var(--font-jost)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: orionColor, marginBottom: '5px' }}>
                                        What happened
                                    </p>
                                    <p style={{ fontFamily: 'var(--font-jost)', fontSize: '12.5px', color: textSecondary, lineHeight: '1.7', margin: 0 }}>
                                        {debrief.what_happened}
                                    </p>
                                </div>
                            )}
                            {debrief.what_this_tells_you && (
                                <div style={{
                                    background: isDark ? 'rgba(212,175,55,0.05)' : 'rgba(212,175,55,0.07)',
                                    border: `1px solid ${isDark ? 'rgba(212,175,55,0.15)' : 'rgba(139,100,16,0.18)'}`,
                                    borderRadius: '10px', padding: '12px',
                                }}>
                                    <p style={{ fontFamily: 'var(--font-jost)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: isDark ? '#d4af37' : '#8b6410', marginBottom: '5px' }}>
                                        What this tells you
                                    </p>
                                    <p style={{ fontFamily: 'var(--font-jost)', fontSize: '12.5px', color: textSecondary, lineHeight: '1.7', margin: 0 }}>
                                        {debrief.what_this_tells_you}
                                    </p>
                                </div>
                            )}
                            {debrief.one_thing_to_try && (
                                <div>
                                    <p style={{ fontFamily: 'var(--font-jost)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: orionColor, marginBottom: '5px' }}>
                                        One thing to try next time
                                    </p>
                                    <p style={{ fontFamily: 'var(--font-jost)', fontSize: '12.5px', color: textSecondary, lineHeight: '1.7', margin: 0 }}>
                                        {debrief.one_thing_to_try}
                                    </p>
                                </div>
                            )}
                            {!debrief.headline && debrief.raw && (
                                <p style={{ fontFamily: 'var(--font-jost)', fontSize: '12.5px', color: textSecondary, lineHeight: '1.7', margin: 0, whiteSpace: 'pre-line' }}>
                                    {debrief.raw}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Round log */}
                <div style={{ background: cardBg, border: cardBorder, borderRadius: '12px', padding: '14px' }}>
                    <p style={{ fontFamily: 'var(--font-jost)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: textMuted, marginBottom: '10px' }}>
                        Round by round
                    </p>
                    <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {rounds.map((r, i) => {
                            const ril = i % 5
                            const lvl = Math.floor(i / 5) + 1
                            const extra = r.mode ? ` / ${r.mode}` : r.sequence ? ` / ${r.sequence.length} items` : ''
                            return (
                                <div key={i} style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    fontFamily: 'var(--font-jost)', fontSize: '11px',
                                    padding: '3px 0',
                                    borderBottom: `1px solid ${borderColor}`,
                                    color: textMuted,
                                }}>
                                    <span>Lv{lvl} R{ril + 1}{extra}</span>
                                    <span style={{ color: r.correct ? '#7a9e7e' : '#c9897a' }}>{r.correct ? '✓' : '✗'}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <motion.button onClick={onBack} whileHover={{ scale: 1.02 }}
                        style={{
                            padding: '11px 22px', borderRadius: '12px',
                            fontFamily: 'var(--font-jost)', fontSize: '11px',
                            letterSpacing: '0.12em', textTransform: 'uppercase',
                            background: cardBg, border: cardBorder,
                            color: textPrimary, cursor: 'pointer',
                        }}>All games</motion.button>
                    <motion.button onClick={onRetake} whileHover={{ scale: 1.02 }}
                        style={{
                            padding: '11px 22px', borderRadius: '12px',
                            fontFamily: 'var(--font-jost)', fontSize: '11px',
                            letterSpacing: '0.12em', textTransform: 'uppercase',
                            background: `${color}18`, border: `1px solid ${color}38`,
                            color: textPrimary, cursor: 'pointer',
                        }}>Play again</motion.button>
                </div>
            </div>
        </motion.div>
    )
}