'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
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

interface Msg {
    id: string
    role: 'user' | 'assistant'
    content: string
    streaming?: boolean
    isNotification?: boolean
}

const StreamCursor = () => (
    <motion.span
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
        style={{ display: 'inline-block', marginLeft: '2px', color: '#5B9BD5' }}
    >▍</motion.span>
)

const QUICK_PROMPTS = [
    "What does my memory game data show?",
    "How can I improve my working memory?",
    "Tips for Number Sequence?",
    "Why do I keep failing reverse recall?",
    "What does pattern recognition train?",
    "Give me a thinking exercise",
]

interface OrionChatProps {
    isOpen: boolean
    onClose: () => void
}

export default function OrionChat({ isOpen, onClose }: OrionChatProps) {
    const { theme } = useThemeStore()
    const isDark = theme === 'dark'

    const color = '#5B9BD5'

    // Dark: deep indigo-navy complement to the dark parent theme
    // Light: soft sky-lavender complement to the warm cream parent theme
    const panelBg = isDark
        ? 'linear-gradient(160deg, rgba(6,8,22,0.98) 0%, rgba(10,14,32,0.98) 60%, rgba(8,10,26,0.98) 100%)'
        : 'linear-gradient(160deg, rgba(232,240,254,0.98) 0%, rgba(220,234,252,0.98) 60%, rgba(210,228,250,0.98) 100%)'
    const headerBg = isDark
        ? 'rgba(8,10,26,0.99)'
        : 'rgba(218,232,252,0.99)'
    const inputBg = isDark
        ? 'rgba(12,16,36,0.95)'
        : 'rgba(228,238,255,0.95)'
    const borderColor = isDark ? `${color}22` : `${color}28`
    const textPrimary = isDark ? 'rgba(210,228,255,0.93)' : 'rgba(18,38,80,0.92)'
    const textMuted = isDark ? 'rgba(130,165,215,0.50)' : 'rgba(50,80,130,0.50)'
    const userBubbleBg = isDark ? `${color}16` : `${color}12`
    const userBubbleBorder = isDark ? `${color}30` : `${color}22`
    const assistantBubbleBg = isDark ? 'rgba(14,20,48,0.72)' : 'rgba(205,222,250,0.65)'
    const assistantBubbleBorder = isDark ? `${color}10` : `${color}18`

    const [msgs, setMsgs] = useState<Msg[]>([{
        id: '0',
        role: 'assistant',
        content: "Hey! I'm Orion, your brain training companion. I'm here to help you understand your memory, improve your reasoning, and get more out of the games. What's on your mind?",
    }])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)
    const taRef = useRef<HTMLTextAreaElement>(null)
    const abortRef = useRef<AbortController | null>(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [msgs])

    useEffect(() => {
        if (isOpen) setTimeout(() => taRef.current?.focus(), 300)
    }, [isOpen])

    const resize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value)
        e.target.style.height = 'auto'
        e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
    }

    const send = useCallback(async (text?: string) => {
        const content = (text ?? input).trim()
        if (!content || loading) return

        const userMsg: Msg = { id: Date.now().toString(), role: 'user', content }
        setMsgs(prev => [...prev, userMsg])
        setInput('')
        if (taRef.current) taRef.current.style.height = 'auto'
        setLoading(true)

        const assistantId = String(Date.now() + 1)
        setMsgs(prev => [...prev, { id: assistantId, role: 'assistant', content: '', streaming: true }])

        abortRef.current?.abort()
        abortRef.current = new AbortController()

        const history = msgs.map(m => ({ role: m.role, content: m.content }))

        try {
            const res = await fetch(`${API}/api/orion/stream`, {
                method: 'POST',
                credentials: 'include',
                signal: abortRef.current.signal,
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                body: JSON.stringify({ content, history }),
            })

            if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let accumulated = ''

            while (true) {
                const { value, done } = await reader.read()
                if (done) break
                const chunk = decoder.decode(value, { stream: true })
                for (const line of chunk.split('\n')) {
                    if (line.startsWith('data: ')) {
                        const payload = line.slice(6).trim()
                        if (payload === '[DONE]') break
                        try {
                            const parsed = JSON.parse(payload)
                            if (parsed.text) {
                                accumulated += parsed.text
                                setMsgs(prev => prev.map(m =>
                                    m.id === assistantId ? { ...m, content: accumulated, streaming: true } : m
                                ))
                            }
                        } catch { }
                    }
                }
            }

            setMsgs(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: accumulated, streaming: false } : m
            ))
        } catch (err: any) {
            if (err?.name !== 'AbortError') {
                try {
                    const fallback = await fetch(`${API}/api/orion/message`, {
                        method: 'POST', credentials: 'include',
                        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                        body: JSON.stringify({ content, history }),
                    })
                    const data = await fallback.json()
                    setMsgs(prev => prev.map(m =>
                        m.id === assistantId ? { ...m, content: data.response || '', streaming: false } : m
                    ))
                } catch {
                    setMsgs(prev => prev.map(m =>
                        m.id === assistantId ? { ...m, content: 'Having a bit of trouble connecting, try again in a moment.', streaming: false } : m
                    ))
                }
            } else {
                setMsgs(prev => prev.map(m =>
                    m.id === assistantId ? { ...m, streaming: false } : m
                ))
            }
        } finally {
            setLoading(false)
        }
    }, [input, loading, msgs])

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 32, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 24, scale: 0.97 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                        position: 'fixed',
                        bottom: '80px',
                        right: '24px',
                        width: 'min(420px, calc(100vw - 32px))',
                        height: 'min(560px, calc(100vh - 120px))',
                        zIndex: 200,
                        display: 'flex', flexDirection: 'column',
                        borderRadius: '20px', overflow: 'hidden',
                        background: panelBg,
                        border: `1px solid ${borderColor}`,
                        boxShadow: isDark
                            ? `0 24px 64px rgba(0,0,0,0.50), 0 0 0 1px ${color}08`
                            : `0 24px 64px rgba(20,50,100,0.14), 0 0 0 1px ${color}08`,
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '14px 18px',
                        borderBottom: `1px solid ${borderColor}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        flexShrink: 0,
                        background: headerBg,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '50%',
                                background: `linear-gradient(135deg, ${color}28, ${color}0a)`,
                                border: `1.5px solid ${color}40`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '13px', color,
                                boxShadow: `0 0 12px ${color}28`,
                            }}>✦</div>
                            <div>
                                <p style={{ fontFamily: "'Cinzel', serif", fontSize: '11px', letterSpacing: '0.14em', color, margin: 0 }}>
                                    ORION
                                </p>
                                <p style={{ fontFamily: 'var(--font-jost)', fontSize: '10px', color: textMuted, margin: 0 }}>
                                    Brain training companion
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: textMuted, fontSize: '16px', padding: '4px', lineHeight: 1,
                            transition: 'color 0.15s',
                        }}
                            onMouseEnter={e => (e.currentTarget.style.color = textPrimary)}
                            onMouseLeave={e => (e.currentTarget.style.color = textMuted)}
                        >✕</button>
                    </div>

                    {/* Messages */}
                    <div style={{
                        flex: 1, overflowY: 'auto', padding: '14px',
                        scrollbarWidth: 'thin',
                        scrollbarColor: isDark ? `${color}18 transparent` : `${color}20 transparent`,
                    }}>
                        {msgs.length === 1 && (
                            <div style={{ marginBottom: '14px' }}>
                                <div style={{
                                    padding: '10px 12px',
                                    background: isDark ? `${color}08` : `${color}06`,
                                    border: `1px solid ${color}15`,
                                    borderRadius: '12px', marginBottom: '10px',
                                }}>
                                    <p style={{ fontFamily: 'var(--font-jost)', fontSize: '9px', letterSpacing: '0.1em', color: `${color}80`, textTransform: 'uppercase', marginBottom: '8px' }}>
                                        Quick questions
                                    </p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {QUICK_PROMPTS.map(q => (
                                            <button key={q} onClick={() => send(q)}
                                                style={{
                                                    padding: '5px 10px', borderRadius: '20px', cursor: 'pointer',
                                                    fontFamily: 'var(--font-jost)', fontSize: '11px',
                                                    background: isDark ? `${color}0a` : `${color}08`,
                                                    border: `1px solid ${color}22`,
                                                    color: `${color}cc`, transition: 'all 0.15s',
                                                }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.background = `${color}1a`
                                                    e.currentTarget.style.borderColor = `${color}45`
                                                    e.currentTarget.style.color = color
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.background = isDark ? `${color}0a` : `${color}08`
                                                    e.currentTarget.style.borderColor = `${color}22`
                                                    e.currentTarget.style.color = `${color}cc`
                                                }}
                                            >{q}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {msgs.map(msg => (
                            <motion.div key={msg.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                style={{
                                    display: 'flex',
                                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                    marginBottom: '10px',
                                }}
                            >
                                {msg.role === 'assistant' && (
                                    <div style={{
                                        width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                                        marginRight: '8px', marginTop: '2px',
                                        background: isDark ? 'rgba(10,15,38,1)' : 'rgba(198,218,252,1)',
                                        border: `1px solid ${color}35`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '9px', color,
                                    }}>✦</div>
                                )}
                                <div style={{
                                    maxWidth: '82%',
                                    padding: '9px 13px',
                                    borderRadius: msg.role === 'user' ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                                    background: msg.role === 'user' ? userBubbleBg : assistantBubbleBg,
                                    border: `1px solid ${msg.role === 'user' ? userBubbleBorder : assistantBubbleBorder}`,
                                    fontFamily: 'var(--font-jost)', fontSize: '13px',
                                    lineHeight: '1.65', color: textPrimary,
                                    whiteSpace: 'pre-wrap',
                                }}>
                                    {msg.content}
                                    {msg.streaming && msg.content === '' && (
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '2px 0' }}>
                                            {[0, 1, 2].map(i => (
                                                <motion.div key={i}
                                                    style={{ width: '5px', height: '5px', borderRadius: '50%', background: color }}
                                                    animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                                                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.16 }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                    {msg.streaming && msg.content !== '' && <StreamCursor />}
                                </div>
                            </motion.div>
                        ))}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div style={{
                        padding: '10px 12px',
                        borderTop: `1px solid ${borderColor}`,
                        flexShrink: 0,
                        background: inputBg,
                    }}>
                        <div style={{
                            display: 'flex', alignItems: 'flex-end', gap: '8px',
                            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(200,220,255,0.35)',
                            border: `1px solid ${color}18`,
                            borderRadius: '14px',
                            padding: '8px 10px 8px 14px',
                        }}>
                            <textarea
                                ref={taRef}
                                value={input}
                                onChange={resize}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
                                }}
                                rows={1}
                                placeholder="Ask Orion about memory, thinking, or brain training..."
                                style={{
                                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                                    resize: 'none', fontFamily: 'var(--font-jost)', fontSize: '12px',
                                    color: textPrimary, lineHeight: '1.5', maxHeight: '100px',
                                }}
                            />
                            <button onClick={() => send()} disabled={!input.trim() || loading}
                                style={{
                                    flexShrink: 0, padding: '6px 14px', borderRadius: '10px', cursor: 'pointer',
                                    fontFamily: 'var(--font-jost)', fontSize: '10px', fontWeight: 600,
                                    letterSpacing: '0.14em', textTransform: 'uppercase',
                                    background: `${color}20`, border: `1px solid ${color}35`,
                                    color: textPrimary,
                                    opacity: !input.trim() || loading ? 0.35 : 1,
                                    transition: 'all 0.2s',
                                }}
                            >Send</button>
                        </div>
                        <p style={{
                            textAlign: 'center', marginTop: '6px',
                            fontFamily: 'var(--font-jost)', fontSize: '9px',
                            color: textMuted, letterSpacing: '0.08em',
                        }}>
                            Orion focuses on thinking and memory, Lumina handles feelings
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}