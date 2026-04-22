'use client'
// frontend/src/components/orion/OrionChat.tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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
}

const WELCOME: Msg = {
    id: '0',
    role: 'assistant',
    content: "Hey! I'm Orion — Lumina's cognitive companion. I'm here to help you understand your brain, improve your memory, sharpen your reasoning, and get more out of the games. What's on your mind?",
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
    "What's the science behind Matrix Reasoning?",
    "Why do I keep failing reverse recall?",
    "Tips for Number Sequence?",
    "What does fluid intelligence mean?",
]

interface OrionChatProps {
    isOpen: boolean
    onClose: () => void
}

export default function OrionChat({ isOpen, onClose }: OrionChatProps) {
    const [msgs, setMsgs] = useState<Msg[]>([WELCOME])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)
    const taRef = useRef<HTMLTextAreaElement>(null)
    const abortRef = useRef<AbortController | null>(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [msgs])

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => taRef.current?.focus(), 300)
        }
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
            if (err?.name === 'AbortError') {
                setMsgs(prev => prev.map(m =>
                    m.id === assistantId ? { ...m, streaming: false } : m
                ))
            } else {
                try {
                    const fallback = await fetch(`${API}/api/orion/message`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                        body: JSON.stringify({ content, history }),
                    })
                    const data = await fallback.json()
                    setMsgs(prev => prev.map(m =>
                        m.id === assistantId ? { ...m, content: data.response || '', streaming: false } : m
                    ))
                } catch {
                    setMsgs(prev => prev.map(m =>
                        m.id === assistantId ? { ...m, content: 'Connection issue — please try again.', streaming: false } : m
                    ))
                }
            }
        } finally {
            setLoading(false)
        }
    }, [input, loading, msgs])

    const color = '#5B9BD5'

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
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        background: 'rgba(10, 12, 22, 0.97)',
                        backdropFilter: 'blur(40px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                        border: `1px solid ${color}28`,
                        boxShadow: `0 24px 64px rgba(0,0,0,0.45), 0 0 0 1px ${color}10`,
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '14px 18px',
                        borderBottom: `1px solid ${color}18`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexShrink: 0,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '50%',
                                background: `linear-gradient(135deg, ${color}30, ${color}10)`,
                                border: `1px solid ${color}40`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '14px', color,
                                boxShadow: `0 0 12px ${color}30`,
                            }}>
                                ✦
                            </div>
                            <div>
                                <p style={{ fontFamily: 'var(--font-gothic)', fontSize: '12px', letterSpacing: '0.1em', color: 'rgba(254,244,228,0.95)', margin: 0 }}>
                                    ORION
                                </p>
                                <p style={{ fontFamily: 'var(--font-jost)', fontSize: '10px', color: `${color}90`, margin: 0 }}>
                                    Cognitive Companion
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'rgba(254,244,228,0.4)', fontSize: '16px',
                                padding: '4px', lineHeight: 1,
                                transition: 'color 0.15s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(254,244,228,0.9)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(254,244,228,0.4)')}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Messages */}
                    <div style={{
                        flex: 1, overflowY: 'auto', padding: '14px',
                        scrollbarWidth: 'thin', scrollbarColor: `${color}20 transparent`,
                    }}>
                        {msgs.length === 1 && (
                            <div style={{ marginBottom: '14px' }}>
                                <div style={{
                                    padding: '10px 14px',
                                    background: `${color}08`,
                                    border: `1px solid ${color}15`,
                                    borderRadius: '12px',
                                    marginBottom: '10px',
                                }}>
                                    <p style={{ fontFamily: 'var(--font-jost)', fontSize: '10px', letterSpacing: '0.1em', color: `${color}80`, textTransform: 'uppercase', marginBottom: '8px' }}>
                                        Quick questions
                                    </p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {QUICK_PROMPTS.map(q => (
                                            <button key={q} onClick={() => send(q)}
                                                style={{
                                                    padding: '5px 10px', borderRadius: '20px', cursor: 'pointer',
                                                    fontFamily: 'var(--font-jost)', fontSize: '11px',
                                                    background: `${color}10`, border: `1px solid ${color}25`,
                                                    color: `${color}cc`, transition: 'all 0.15s',
                                                }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.background = `${color}20`
                                                    e.currentTarget.style.borderColor = `${color}50`
                                                    e.currentTarget.style.color = color
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.background = `${color}10`
                                                    e.currentTarget.style.borderColor = `${color}25`
                                                    e.currentTarget.style.color = `${color}cc`
                                                }}
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {msgs.map(msg => (
                            <motion.div
                                key={msg.id}
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
                                        width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                                        marginRight: '8px', marginTop: '2px',
                                        background: `${color}18`, border: `1px solid ${color}35`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '10px', color,
                                    }}>
                                        ✦
                                    </div>
                                )}
                                <div style={{
                                    maxWidth: '82%',
                                    padding: '9px 13px',
                                    borderRadius: msg.role === 'user' ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                                    background: msg.role === 'user' ? `${color}18` : 'rgba(255,255,255,0.04)',
                                    border: msg.role === 'user' ? `1px solid ${color}30` : '1px solid rgba(255,255,255,0.08)',
                                    fontFamily: 'var(--font-jost)',
                                    fontSize: '13px',
                                    lineHeight: '1.65',
                                    color: 'rgba(254,244,228,0.92)',
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
                        borderTop: `1px solid ${color}15`,
                        flexShrink: 0,
                    }}>
                        <div style={{
                            display: 'flex', alignItems: 'flex-end', gap: '8px',
                            background: 'rgba(255,255,255,0.04)',
                            border: `1px solid ${color}20`,
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
                                placeholder="Ask Orion about memory, reasoning, brain training..."
                                style={{
                                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                                    resize: 'none', fontFamily: 'var(--font-jost)', fontSize: '12px',
                                    color: 'rgba(254,244,228,0.90)', lineHeight: '1.5', maxHeight: '100px',
                                }}
                            />
                            <button
                                onClick={() => send()}
                                disabled={!input.trim() || loading}
                                style={{
                                    flexShrink: 0, padding: '6px 14px', borderRadius: '10px', cursor: 'pointer',
                                    fontFamily: 'var(--font-jost)', fontSize: '10px', fontWeight: 600,
                                    letterSpacing: '0.14em', textTransform: 'uppercase',
                                    background: `${color}22`, border: `1px solid ${color}38`,
                                    color: 'rgba(254,244,228,0.9)',
                                    opacity: !input.trim() || loading ? 0.35 : 1,
                                    transition: 'all 0.2s',
                                }}
                            >
                                Send
                            </button>
                        </div>
                        <p style={{
                            textAlign: 'center', marginTop: '6px',
                            fontFamily: 'var(--font-jost)', fontSize: '9px',
                            color: 'rgba(254,244,228,0.2)', letterSpacing: '0.08em',
                        }}>
                            Orion focuses on cognitive training · Lumina handles emotional support
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}