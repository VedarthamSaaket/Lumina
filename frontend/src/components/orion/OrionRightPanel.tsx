'use client'
import { useState, useEffect } from 'react'
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

const CONTENT_LABELS: Record<string, string> = {
    scenario: 'Thinking Scenario',
    exercise: 'Quick Exercise',
    fun_fact: 'Brain Fun Fact',
    curiosity_prompt: 'Make You Think',
    daily_challenge: "Today's Challenge",
}

const CONTENT_ICONS: Record<string, string> = {
    scenario: '◎',
    exercise: '◐',
    fun_fact: '✦',
    curiosity_prompt: '◈',
    daily_challenge: '❋',
}

interface OrionRightPanelProps {
    contentType: string
    gameType?: string
    onClose: () => void
}

export default function OrionRightPanel({ contentType, gameType, onClose }: OrionRightPanelProps) {
    const { theme } = useThemeStore()
    const isDark = theme === 'dark'
    const color = '#5B9BD5'

    const [content, setContent] = useState<Record<string, any> | null>(null)
    const [loading, setLoading] = useState(true)
    const [selectedOption, setSelectedOption] = useState<string | null>(null)
    const [revealed, setRevealed] = useState(false)

    useEffect(() => {
        setContent(null)
        setLoading(true)
        setSelectedOption(null)
        setRevealed(false)

        const params = new URLSearchParams({ content_type: contentType })
        if (gameType) params.set('game_type', gameType)

        fetch(`${API}/api/orion/right-panel-content?${params}`, {
            credentials: 'include',
            headers: getAuthHeader(),
        })
            .then(r => r.json())
            .then(data => {
                setContent(data)
                setLoading(false)
            })
            .catch(() => {
                setContent({ raw: 'Could not load content right now. Try refreshing.' })
                setLoading(false)
            })
    }, [contentType, gameType])

    const bgPanel = isDark
        ? 'linear-gradient(160deg, rgba(8,12,28,0.97) 0%, rgba(12,18,38,0.97) 100%)'
        : 'linear-gradient(160deg, rgba(235,240,252,0.97) 0%, rgba(220,232,248,0.97) 100%)'
    const borderColor = isDark ? `${color}22` : `${color}28`
    const textPrimary = isDark ? 'rgba(220,235,255,0.92)' : 'rgba(20,40,80,0.90)'
    const textSecondary = isDark ? 'rgba(160,185,220,0.70)' : 'rgba(40,70,120,0.70)'
    const textMuted = isDark ? 'rgba(120,150,200,0.50)' : 'rgba(60,90,140,0.50)'
    const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(210,225,248,0.4)'
    const cardBorder = isDark ? `1px solid ${color}15` : `1px solid ${color}20`
    const goldColor = isDark ? '#d4af37' : '#8b6410'

    const label = CONTENT_LABELS[contentType] || 'Experience'
    const icon = CONTENT_ICONS[contentType] || '✦'

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100%',
            borderRadius: '20px', overflow: 'hidden',
            background: bgPanel,
            border: `1px solid ${borderColor}`,
            boxShadow: isDark
                ? `0 8px 48px rgba(0,0,0,0.65), 0 0 0 1px ${color}08`
                : `0 8px 40px rgba(30,60,120,0.12), 0 0 0 1px ${color}08`,
        }}>
            {/* Header */}
            <div style={{
                padding: '14px 16px 12px',
                borderBottom: `1px solid ${borderColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexShrink: 0,
                background: isDark ? 'rgba(10,14,32,0.99)' : 'rgba(220,232,248,0.99)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', color }}>{icon}</span>
                    <p style={{
                        fontFamily: "'Cinzel', serif", fontSize: '10px',
                        letterSpacing: '0.14em', color, margin: 0,
                    }}>{label.toUpperCase()}</p>
                </div>
                <button onClick={onClose} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: textMuted, fontSize: '14px', padding: '4px',
                    transition: 'color 0.15s',
                }}
                    onMouseEnter={e => (e.currentTarget.style.color = textPrimary)}
                    onMouseLeave={e => (e.currentTarget.style.color = textMuted)}
                >✕ Back</button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {loading && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {[0, 1, 2].map(i => (
                                <motion.div key={i}
                                    style={{ width: '7px', height: '7px', borderRadius: '50%', background: color }}
                                    animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }}
                                />
                            ))}
                        </div>
                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '11px', color: textMuted }}>
                            Preparing your experience...
                        </p>
                    </div>
                )}

                {!loading && content && (
                    <AnimatePresence>
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
                        >
                            {/* SCENARIO */}
                            {contentType === 'scenario' && content.scenario && (
                                <>
                                    <div style={{ background: cardBg, border: cardBorder, borderRadius: '12px', padding: '16px' }}>
                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color, marginBottom: '8px' }}>
                                            The situation
                                        </p>
                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '13px', color: textPrimary, lineHeight: '1.7', margin: 0 }}>
                                            {content.scenario}
                                        </p>
                                    </div>

                                    {content.options && content.options.length > 0 && (
                                        <div>
                                            <p style={{ fontFamily: 'var(--font-jost)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: textMuted, marginBottom: '8px' }}>
                                                What would you do?
                                            </p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {content.options.map((opt: string, i: number) => (
                                                    <motion.button key={i}
                                                        onClick={() => { setSelectedOption(opt); setRevealed(false) }}
                                                        whileHover={{ x: 4 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        style={{
                                                            textAlign: 'left', padding: '10px 14px',
                                                            borderRadius: '10px', cursor: 'pointer',
                                                            background: selectedOption === opt
                                                                ? `${color}18`
                                                                : cardBg,
                                                            border: selectedOption === opt
                                                                ? `1px solid ${color}40`
                                                                : cardBorder,
                                                            fontFamily: 'var(--font-jost)',
                                                            fontSize: '12px', color: textPrimary,
                                                            lineHeight: '1.5',
                                                            transition: 'all 0.18s',
                                                        }}
                                                    >{opt}</motion.button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {selectedOption && content.think_about && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            style={{
                                                background: isDark ? 'rgba(212,175,55,0.06)' : 'rgba(212,175,55,0.08)',
                                                border: `1px solid ${goldColor}28`,
                                                borderRadius: '10px', padding: '14px',
                                            }}
                                        >
                                            <p style={{ fontFamily: 'var(--font-jost)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: goldColor, marginBottom: '6px' }}>
                                                Something to consider
                                            </p>
                                            <p style={{ fontFamily: 'var(--font-jost)', fontSize: '12px', color: textSecondary, lineHeight: '1.6', margin: 0, fontStyle: 'italic' }}>
                                                {content.think_about}
                                            </p>
                                        </motion.div>
                                    )}
                                </>
                            )}

                            {/* EXERCISE */}
                            {contentType === 'exercise' && (
                                <>
                                    {content.title && (
                                        <div>
                                            <p style={{
                                                fontFamily: "'Cormorant Garamond', serif",
                                                fontStyle: 'italic', fontWeight: 400,
                                                fontSize: '1.3rem', color: textPrimary,
                                                margin: '0 0 4px',
                                            }}>{content.title}</p>
                                            <div style={{ height: '1px', background: `linear-gradient(90deg, ${color}40, transparent)`, marginBottom: '14px' }} />
                                        </div>
                                    )}
                                    {content.instructions && (
                                        <div style={{ background: cardBg, border: cardBorder, borderRadius: '12px', padding: '16px' }}>
                                            <p style={{ fontFamily: 'var(--font-jost)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color, marginBottom: '8px' }}>
                                                How to do it
                                            </p>
                                            <p style={{ fontFamily: 'var(--font-jost)', fontSize: '13px', color: textPrimary, lineHeight: '1.8', margin: 0, whiteSpace: 'pre-line' }}>
                                                {content.instructions}
                                            </p>
                                        </div>
                                    )}
                                    {content.why && (
                                        <div style={{
                                            background: isDark ? 'rgba(212,175,55,0.05)' : 'rgba(212,175,55,0.07)',
                                            border: `1px solid ${goldColor}20`,
                                            borderRadius: '10px', padding: '12px',
                                        }}>
                                            <p style={{ fontFamily: 'var(--font-jost)', fontSize: '12px', color: textSecondary, lineHeight: '1.6', margin: 0, fontStyle: 'italic' }}>
                                                {content.why}
                                            </p>
                                        </div>
                                    )}
                                    {!content.title && content.raw && (
                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '13px', color: textPrimary, lineHeight: '1.8', whiteSpace: 'pre-line' }}>
                                            {content.raw}
                                        </p>
                                    )}
                                </>
                            )}

                            {/* FUN FACT */}
                            {contentType === 'fun_fact' && (
                                <>
                                    {content.hook && (
                                        <div style={{
                                            background: `${color}12`,
                                            border: `1px solid ${color}28`,
                                            borderRadius: '12px', padding: '18px',
                                            textAlign: 'center',
                                        }}>
                                            <span style={{ fontSize: '22px', display: 'block', marginBottom: '8px' }}>✦</span>
                                            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '1.15rem', color: textPrimary, lineHeight: '1.6', margin: 0 }}>
                                                {content.hook}
                                            </p>
                                        </div>
                                    )}
                                    {content.detail && (
                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '13px', color: textSecondary, lineHeight: '1.8', margin: 0 }}>
                                            {content.detail}
                                        </p>
                                    )}
                                    {content.connection && (
                                        <div style={{
                                            background: isDark ? 'rgba(212,175,55,0.05)' : 'rgba(212,175,55,0.07)',
                                            border: `1px solid ${goldColor}20`,
                                            borderRadius: '10px', padding: '12px',
                                        }}>
                                            <p style={{ fontFamily: 'var(--font-jost)', fontSize: '12px', color: textSecondary, lineHeight: '1.6', margin: 0, fontStyle: 'italic' }}>
                                                {content.connection}
                                            </p>
                                        </div>
                                    )}
                                    {!content.hook && content.raw && (
                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '13px', color: textPrimary, lineHeight: '1.8', whiteSpace: 'pre-line' }}>
                                            {content.raw}
                                        </p>
                                    )}
                                </>
                            )}

                            {/* CURIOSITY PROMPT */}
                            {contentType === 'curiosity_prompt' && content.raw && (
                                <div>
                                    {(() => {
                                        const questionIdx = content.raw.indexOf('QUESTION:')
                                        const exploreIdx = content.raw.indexOf('EXPLORE:')
                                        const takeIdx = content.raw.indexOf('YOUR_TAKE:')

                                        const question = questionIdx >= 0 ? content.raw.slice(questionIdx + 9, exploreIdx >= 0 ? exploreIdx : content.raw.length).trim() : ''
                                        const explore = exploreIdx >= 0 ? content.raw.slice(exploreIdx + 8, takeIdx >= 0 ? takeIdx : content.raw.length).trim() : ''
                                        const take = takeIdx >= 0 ? content.raw.slice(takeIdx + 10).trim() : ''

                                        return (
                                            <>
                                                {question && (
                                                    <div style={{
                                                        background: `${color}10`,
                                                        border: `1px solid ${color}25`,
                                                        borderRadius: '12px', padding: '18px', marginBottom: '14px',
                                                    }}>
                                                        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '1.2rem', color: textPrimary, lineHeight: '1.6', margin: 0 }}>
                                                            {question}
                                                        </p>
                                                    </div>
                                                )}
                                                {explore && (
                                                    <p style={{ fontFamily: 'var(--font-jost)', fontSize: '13px', color: textSecondary, lineHeight: '1.8', marginBottom: '12px' }}>
                                                        {explore}
                                                    </p>
                                                )}
                                                {take && (
                                                    <div style={{
                                                        background: isDark ? 'rgba(212,175,55,0.05)' : 'rgba(212,175,55,0.07)',
                                                        border: `1px solid ${goldColor}20`,
                                                        borderRadius: '10px', padding: '12px',
                                                    }}>
                                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '12px', color: textSecondary, lineHeight: '1.6', margin: 0, fontStyle: 'italic' }}>
                                                            {take}
                                                        </p>
                                                    </div>
                                                )}
                                                {!question && (
                                                    <p style={{ fontFamily: 'var(--font-jost)', fontSize: '13px', color: textPrimary, lineHeight: '1.8', whiteSpace: 'pre-line' }}>
                                                        {content.raw}
                                                    </p>
                                                )}
                                            </>
                                        )
                                    })()}
                                </div>
                            )}

                            {/* DAILY CHALLENGE */}
                            {contentType === 'daily_challenge' && content.raw && (
                                <div>
                                    {(() => {
                                        const challengeIdx = content.raw.indexOf('CHALLENGE:')
                                        const taskIdx = content.raw.indexOf('TASK:')
                                        const levelIdx = content.raw.indexOf('LEVEL:')
                                        const bonusIdx = content.raw.indexOf('BONUS:')

                                        const challenge = challengeIdx >= 0 ? content.raw.slice(challengeIdx + 10, taskIdx >= 0 ? taskIdx : content.raw.length).trim() : ''
                                        const task = taskIdx >= 0 ? content.raw.slice(taskIdx + 5, levelIdx >= 0 ? levelIdx : content.raw.length).trim() : ''
                                        const level = levelIdx >= 0 ? content.raw.slice(levelIdx + 6, bonusIdx >= 0 ? bonusIdx : content.raw.length).trim() : ''
                                        const bonus = bonusIdx >= 0 ? content.raw.slice(bonusIdx + 6).trim() : ''

                                        return (
                                            <>
                                                {challenge && (
                                                    <div>
                                                        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 400, fontSize: '1.3rem', color: textPrimary, margin: '0 0 4px' }}>
                                                            {challenge}
                                                        </p>
                                                        {level && (
                                                            <span style={{
                                                                fontFamily: 'var(--font-jost)', fontSize: '9px',
                                                                letterSpacing: '0.12em', textTransform: 'uppercase',
                                                                color: level.toLowerCase().includes('beginner') ? '#7a9e7e' : level.toLowerCase().includes('advanced') ? '#c9897a' : color,
                                                                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                                                                padding: '2px 8px', borderRadius: '10px',
                                                            }}>{level}</span>
                                                        )}
                                                        <div style={{ height: '1px', background: `linear-gradient(90deg, ${color}40, transparent)`, margin: '12px 0' }} />
                                                    </div>
                                                )}
                                                {task && (
                                                    <div style={{ background: cardBg, border: cardBorder, borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color, marginBottom: '8px' }}>
                                                            Your task today
                                                        </p>
                                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '13px', color: textPrimary, lineHeight: '1.8', margin: 0 }}>
                                                            {task}
                                                        </p>
                                                    </div>
                                                )}
                                                {bonus && (
                                                    <div style={{
                                                        background: isDark ? 'rgba(212,175,55,0.05)' : 'rgba(212,175,55,0.07)',
                                                        border: `1px solid ${goldColor}20`,
                                                        borderRadius: '10px', padding: '12px',
                                                    }}>
                                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: goldColor, marginBottom: '6px' }}>
                                                            Bonus level
                                                        </p>
                                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '12px', color: textSecondary, lineHeight: '1.6', margin: 0 }}>
                                                            {bonus}
                                                        </p>
                                                    </div>
                                                )}
                                                {!challenge && (
                                                    <p style={{ fontFamily: 'var(--font-jost)', fontSize: '13px', color: textPrimary, lineHeight: '1.8', whiteSpace: 'pre-line' }}>
                                                        {content.raw}
                                                    </p>
                                                )}
                                            </>
                                        )
                                    })()}
                                </div>
                            )}

                            {/* Refresh button */}
                            <button
                                onClick={() => {
                                    setLoading(true)
                                    setContent(null)
                                    setSelectedOption(null)
                                    const params = new URLSearchParams({ content_type: contentType })
                                    if (gameType) params.set('game_type', gameType)
                                    fetch(`${API}/api/orion/right-panel-content?${params}`, {
                                        credentials: 'include', headers: getAuthHeader(),
                                    }).then(r => r.json()).then(data => { setContent(data); setLoading(false) })
                                        .catch(() => setLoading(false))
                                }}
                                style={{
                                    marginTop: '4px', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer',
                                    fontFamily: 'var(--font-jost)', fontSize: '10px',
                                    letterSpacing: '0.1em', textTransform: 'uppercase',
                                    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                                    border: `1px solid ${borderColor}`,
                                    color: textMuted, transition: 'all 0.18s',
                                    alignSelf: 'flex-start',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.color = textPrimary)}
                                onMouseLeave={e => (e.currentTarget.style.color = textMuted)}
                            >
                                Try a new one
                            </button>
                        </motion.div>
                    </AnimatePresence>
                )}
            </div>
        </div>
    )
}