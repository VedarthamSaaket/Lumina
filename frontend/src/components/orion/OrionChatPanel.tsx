'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

interface Msg {
    id: string
    role: 'user' | 'assistant'
    content: string
    streaming?: boolean
}

const StreamCursor = () => (
    <motion.span
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
        style={{ display: 'inline-block', marginLeft: '2px', color: '#5B9BD5' }}
    >▍</motion.span>
)

const QUICK_PROMPTS_GENERAL = [
    "What does my memory game data show?",
    "How can I get better at spotting patterns?",
    "Why do I keep losing focus mid-sequence?",
    "Give me a quick brain exercise",
    "What should I practise more?",
    "Tell me something interesting about memory",
]

const QUICK_PROMPTS_GAMES = [
    "Give me a hint for this type of game",
    "What skill does this game actually train?",
    "How am I doing so far today?",
    "What strategy should I try?",
    "Why is this particular game so hard?",
    "Show me a thinking challenge",
]

const RIGHT_PANEL_TRIGGERS = [
    { phrase: "thinking challenge", type: "scenario", label: "Open a thinking challenge" },
    { phrase: "brain exercise", type: "exercise", label: "Show me an exercise" },
    { phrase: "fun fact", type: "fun_fact", label: "Give me a fun fact" },
    { phrase: "daily challenge", type: "daily_challenge", label: "Today's challenge" },
    { phrase: "curious question", type: "curiosity_prompt", label: "Make me think" },
]

interface OrionChatPanelProps {
    onRequestRightPanel?: (contentType: string) => void
    gameType?: string
    isMemoryPage?: boolean
    compact?: boolean
}

export default function OrionChatPanel({
    onRequestRightPanel,
    gameType,
    isMemoryPage = false,
    compact = false,
}: OrionChatPanelProps) {
    const { theme } = useThemeStore()
    const isDark = theme === 'dark'
    const color = '#5B9BD5'

    const [msgs, setMsgs] = useState<Msg[]>([{
        id: '0',
        role: 'assistant',
        content: isMemoryPage
            ? "I'm watching your session. Play a game and I'll give you coaching based on what I see. You can also ask me anything about memory, reasoning, or how to get smarter."
            : "Hey! I'm Orion, your brain training companion. I know how memory and thinking skills work, and I'm here to help you get better at them. What's on your mind?",
    }])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)
    const taRef = useRef<HTMLTextAreaElement>(null)
    const abortRef = useRef<AbortController | null>(null)

    const quickPrompts = isMemoryPage ? QUICK_PROMPTS_GAMES : QUICK_PROMPTS_GENERAL

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [msgs])

    const resize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value)
        e.target.style.height = 'auto'
        e.target.style.height = Math.min(e.target.scrollHeight, compact ? 80 : 100) + 'px'
    }

    const detectRightPanelTrigger = (text: string): string | null => {
        const lower = text.toLowerCase()
        for (const t of RIGHT_PANEL_TRIGGERS) {
            if (lower.includes(t.phrase)) return t.type
        }
        return null
    }

    const send = useCallback(async (text?: string) => {
        const content = (text ?? input).trim()
        if (!content || loading) return

        const rightPanelType = detectRightPanelTrigger(content)

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

            if (rightPanelType && onRequestRightPanel) {
                setTimeout(() => onRequestRightPanel(rightPanelType), 800)
            }

        } catch (err: any) {
            if (err?.name !== 'AbortError') {
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
    }, [input, loading, msgs, onRequestRightPanel])

    const bgPanel = isDark
        ? 'linear-gradient(160deg, rgba(8,12,28,0.97) 0%, rgba(12,18,38,0.97) 100%)'
        : 'linear-gradient(160deg, rgba(235,240,252,0.97) 0%, rgba(220,232,248,0.97) 100%)'
    const borderColor = isDark ? `${color}22` : `${color}28`
    const headerBg = isDark ? 'rgba(10,14,32,0.99)' : 'rgba(220,232,248,0.99)'
    const inputBg = isDark ? 'rgba(16,22,44,0.95)' : 'rgba(240,246,255,0.95)'
    const textPrimary = isDark ? 'rgba(220,235,255,0.92)' : 'rgba(20,40,80,0.90)'
    const textMuted = isDark ? 'rgba(160,185,220,0.55)' : 'rgba(40,70,120,0.55)'
    const userBubbleBg = isDark ? `${color}18` : `${color}12`
    const userBubbleBorder = isDark ? `${color}30` : `${color}22`
    const assistantBubbleBg = isDark ? 'rgba(20,26,54,0.70)' : 'rgba(210,225,248,0.70)'
    const assistantBubbleBorder = isDark ? `${color}10` : `${color}15`
    const quickBtnBg = isDark ? `${color}0a` : `${color}08`
    const quickBtnBorder = isDark ? `${color}20` : `${color}18`

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
 {/* Grain overlay */}
 <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', borderRadius: '20px', overflow: 'hidden' }}>
 <Grainient grainAmount={0.05} grainScale={2} grainAnimated={true} timeSpeed={0.12} colorBalance={isDark ? 0.18 : -0.08} warpStrength={0} rotationAmount={0} color1={isDark ? '#2d1a0a' : '#a8bfc8'} color2={isDark ? '#120a05' : '#d8d2c6'} color3={isDark ? '#080402' : '#ebe6de'} />
 </div>
            {/* Header */}
            <div style={{
                padding: '14px 16px 12px',
                borderBottom: `1px solid ${borderColor}`,
                display: 'flex', alignItems: 'center', gap: '10px',
                flexShrink: 0,
                background: headerBg,
            }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: `linear-gradient(135deg, ${color}25, ${color}08)`,
                    border: `1.5px solid ${color}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', color,
                    boxShadow: `0 0 12px ${color}28`,
                }}>✦</div>
                <div>
                    <p style={{
                        fontFamily: "'Cinzel', serif", fontSize: '11px',
                        letterSpacing: '0.14em', color, margin: 0,
                    }}>ORION</p>
                    <p style={{
                        fontFamily: 'var(--font-jost)', fontSize: '10px',
                        color: textMuted, margin: 0,
                    }}>
                        {isMemoryPage ? (gameType ? `Watching: ${gameType}` : 'Ready to observe your session') : 'Brain training companion'}
                    </p>
                </div>
            </div>

            {/* Messages */}
            <div style={{
                flex: 1, overflowY: 'auto', padding: '12px',
                scrollbarWidth: 'thin', scrollbarColor: `${color}18 transparent`,
            }}>
                {msgs.length === 1 && (
                    <div style={{ marginBottom: '12px' }}>
                        <p style={{
                            fontFamily: 'var(--font-jost)', fontSize: '9px',
                            letterSpacing: '0.1em', color: textMuted,
                            textTransform: 'uppercase', marginBottom: '8px',
                        }}>Quick questions</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                            {quickPrompts.map(q => (
                                <button key={q} onClick={() => send(q)}
                                    style={{
                                        padding: '5px 10px', borderRadius: '18px', cursor: 'pointer',
                                        fontFamily: 'var(--font-jost)', fontSize: '11px',
                                        background: quickBtnBg,
                                        border: `1px solid ${quickBtnBorder}`,
                                        color: `${color}cc`, transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = `${color}18`
                                        e.currentTarget.style.borderColor = `${color}45`
                                        e.currentTarget.style.color = color
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = quickBtnBg
                                        e.currentTarget.style.borderColor = quickBtnBorder
                                        e.currentTarget.style.color = `${color}cc`
                                    }}
                                >{q}</button>
                            ))}
                        </div>
                        {onRequestRightPanel && (
                            <div style={{ marginTop: '10px' }}>
                                <p style={{
                                    fontFamily: 'var(--font-jost)', fontSize: '9px',
                                    letterSpacing: '0.1em', color: textMuted,
                                    textTransform: 'uppercase', marginBottom: '6px',
                                }}>Interactive experiences</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                    {RIGHT_PANEL_TRIGGERS.map(t => (
                                        <button key={t.type} onClick={() => onRequestRightPanel(t.type)}
                                            style={{
                                                padding: '5px 10px', borderRadius: '18px', cursor: 'pointer',
                                                fontFamily: 'var(--font-jost)', fontSize: '11px',
                                                background: 'rgba(212,175,55,0.06)',
                                                border: '1px solid rgba(212,175,55,0.18)',
                                                color: isDark ? 'rgba(212,175,55,0.7)' : 'rgba(139,100,16,0.7)',
                                                transition: 'all 0.15s',
                                            }}
                                        >{t.label}</button>
                                    ))}
                                </div>
                            </div>
                        )}
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
                                marginRight: '7px', marginTop: '2px',
                                background: isDark ? 'rgba(16,22,44,1)' : 'rgba(200,220,248,1)',
                                border: `1.5px solid ${color}38`,
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
                            fontFamily: 'var(--font-jost)',
                            fontSize: '12.5px',
                            lineHeight: '1.65',
                            color: textPrimary,
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
                    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(220,235,255,0.5)',
                    border: `1px solid ${color}18`,
                    borderRadius: '12px',
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
                        placeholder="Ask Orion anything about memory, thinking, or brain training..."
                        style={{
                            flex: 1, background: 'transparent', border: 'none', outline: 'none',
                            resize: 'none', fontFamily: 'var(--font-jost)', fontSize: '12px',
                            color: textPrimary, lineHeight: '1.5', maxHeight: compact ? '80px' : '100px',
                        }}
                    />
                    <button onClick={() => send()} disabled={!input.trim() || loading}
                        style={{
                            flexShrink: 0, padding: '6px 14px', borderRadius: '8px', cursor: 'pointer',
                            fontFamily: 'var(--font-jost)', fontSize: '10px', fontWeight: 600,
                            letterSpacing: '0.12em', textTransform: 'uppercase',
                            background: `${color}20`, border: `1px solid ${color}35`,
                            color: textPrimary,
                            opacity: !input.trim() || loading ? 0.35 : 1,
                            transition: 'all 0.2s',
                        }}
                    >Send</button>
                </div>
                <p style={{
                    textAlign: 'center', marginTop: '5px',
                    fontFamily: 'var(--font-jost)', fontSize: '9px',
                    color: textMuted, letterSpacing: '0.06em',
                }}>
                    Orion handles thinking and memory, Lumina handles feelings
                </p>
            </div>
        </div>
    )
}