'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navigation } from '@/components/layout/Navigation'
import { ParticleCanvas } from '@/components/ui/ParticleCanvas'
import toast from 'react-hot-toast'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('access_token')
}

async function apiFetch(endpoint: string, options: RequestInit = {}) {
    const token = getToken()
    return fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
        credentials: 'include',
    })
}

interface Settings {
    preferred_name: string
    pronouns: string
    about_me: string
    ai_tone: string
    response_length: string
    use_name_in_chat: boolean
    use_mood_context: boolean
    use_screening_context: boolean
    use_cbt_context: boolean
    use_memory_context: boolean
    use_journal_context: boolean
    crisis_sensitivity: string
    focus_areas: string[]
}

const DEFAULT_SETTINGS: Settings = {
    preferred_name: '',
    pronouns: '',
    about_me: '',
    ai_tone: 'warm',
    response_length: 'medium',
    use_name_in_chat: true,
    use_mood_context: true,
    use_screening_context: true,
    use_cbt_context: true,
    use_memory_context: true,
    use_journal_context: true,
    crisis_sensitivity: 'standard',
    focus_areas: [],
}

const TONE_OPTIONS = [
    {
        id: 'warm',
        label: 'Warm & Gentle',
        desc: 'Soft, caring responses. Lumina meets you with patience.',
        icon: '◌',
        color: '#c9897a',
    },
    {
        id: 'direct',
        label: 'Direct & Clear',
        desc: 'Honest and concise. No filler, no over-softening.',
        icon: '◈',
        color: '#d4af37',
    },
    {
        id: 'clinical',
        label: 'Structured',
        desc: 'CBT-framed, methodical. More like a tool than a friend.',
        icon: '◎',
        color: '#5b9bd5',
    },
    {
        id: 'playful',
        label: 'Casual & Light',
        desc: 'Relaxed and conversational. Less formal, more human.',
        icon: '◑',
        color: '#7a9e7e',
    },
]

const LENGTH_OPTIONS = [
    { id: 'short', label: 'Concise', desc: '2–3 sentences max', icon: '–' },
    { id: 'medium', label: 'Balanced', desc: 'Short for simple things, longer for deeper ones', icon: '≡' },
    { id: 'long', label: 'Thorough', desc: 'Full reflections and detailed responses', icon: '≣' },
]

const CRISIS_OPTIONS = [
    {
        id: 'low',
        label: 'Relaxed',
        desc: 'Only flag genuine emergencies. Less interruption.',
        color: '#7a9e7e',
    },
    {
        id: 'standard',
        label: 'Standard',
        desc: 'Default sensitivity. Balanced.',
        color: '#d4af37',
    },
    {
        id: 'high',
        label: 'Vigilant',
        desc: 'Flag distress signals earlier. More check-ins.',
        color: '#c9897a',
    },
]

const FOCUS_SUGGESTIONS = [
    'Anxiety', 'Depression', 'Work stress', 'Sleep', 'Relationships',
    'Self-esteem', 'Grief', 'Burnout', 'Identity', 'Loneliness',
    'Anger', 'Procrastination', 'Perfectionism', 'Social anxiety', 'Trauma',
]

const PRONOUN_OPTIONS = [
    'he/him', 'she/her', 'they/them', 'he/they', 'she/they', 'any pronouns', 'prefer not to say',
]

type Section = 'identity' | 'tone' | 'context' | 'crisis' | 'privacy'

const SECTIONS: { id: Section; label: string; icon: string; color: string; desc: string }[] = [
    { id: 'identity', label: 'About You', icon: '◉', color: '#d4af37', desc: 'How Lumina knows you' },
    { id: 'tone', label: 'AI Tone', icon: '◈', color: '#c9897a', desc: 'How Lumina speaks to you' },
    { id: 'context', label: 'AI Memory', icon: '◎', color: '#7a9e7e', desc: 'What Lumina remembers' },
    { id: 'crisis', label: 'Sensitivity', icon: '◌', color: '#c4913a', desc: 'Crisis detection tuning' },
    { id: 'privacy', label: 'Privacy', icon: '◑', color: '#9b7fd4', desc: 'Your data, your control' },
]

function Toggle({ on, onToggle, color = '#d4af37' }: { on: boolean; onToggle: () => void; color?: string }) {
    return (
        <motion.button
            onClick={onToggle}
            style={{
                width: '48px', height: '26px', borderRadius: '13px', cursor: 'pointer',
                background: on ? color : 'rgba(255,255,255,0.08)',
                border: on ? `1px solid ${color}80` : '1px solid rgba(255,255,255,0.12)',
                position: 'relative', flexShrink: 0,
                transition: 'background 0.25s, border-color 0.25s',
            }}
            whileTap={{ scale: 0.94 }}
        >
            <motion.div
                animate={{ x: on ? 24 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                style={{
                    position: 'absolute', top: '3px',
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: on ? '#fff' : 'rgba(255,255,255,0.4)',
                    boxShadow: on ? `0 0 8px ${color}80` : 'none',
                }}
            />
        </motion.button>
    )
}

function SectionCard({ children, color }: { children: React.ReactNode; color: string }) {
    return (
        <div className="glass rounded-2xl p-6" style={{ border: `1px solid ${color}20` }}>
            {children}
        </div>
    )
}

function ContextRow({
    label, desc, on, onToggle, color,
}: { label: string; desc: string; on: boolean; onToggle: () => void; color: string }) {
    return (
        <div className="flex items-center justify-between gap-4 py-3"
            style={{ borderBottom: '1px solid rgba(212,175,55,0.08)' }}>
            <div>
                <p className="font-jost text-sm" style={{ color: 'var(--text-primary)' }}>{label}</p>
                <p className="font-body text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{desc}</p>
            </div>
            <Toggle on={on} onToggle={onToggle} color={color} />
        </div>
    )
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
    const [activeSection, setActiveSection] = useState<Section>('identity')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [focusInput, setFocusInput] = useState('')
    const [confirmClear, setConfirmClear] = useState(false)
    const [clearingChat, setClearingChat] = useState(false)

    // Load settings localStorage first for instant load, then backend
    useEffect(() => {
        const loadSettings = async () => {
            const local = localStorage.getItem('lumina_settings')
            if (local) {
                try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(local) }) } catch { /* */ }
            }
            try {
                const res = await apiFetch('/api/settings')
                if (res.ok) {
                    const data = await res.json()
                    const merged = { ...DEFAULT_SETTINGS, ...data }
                    setSettings(merged)
                    localStorage.setItem('lumina_settings', JSON.stringify(merged))
                }
            } catch { /* offline use local */ }
            setLoading(false)
        }
        loadSettings()
    }, [])

    const save = useCallback(async (updated: Settings) => {
        setSaving(true)
        localStorage.setItem('lumina_settings', JSON.stringify(updated))
        try {
            await apiFetch('/api/settings', {
                method: 'POST',
                body: JSON.stringify(updated),
            })
            toast.success('Settings saved ✦', {
                style: {
                    background: 'rgba(20,10,0,0.95)', color: '#d4af37',
                    border: '1px solid rgba(212,175,55,0.3)',
                    fontFamily: 'var(--font-cinzel)', fontSize: '11px', letterSpacing: '0.15em',
                },
            })
        } catch {
            toast.error('Saved locally will sync when online')
        } finally {
            setSaving(false)
        }
    }, [])

    const update = useCallback((patch: Partial<Settings>) => {
        setSettings(prev => ({ ...prev, ...patch }))
    }, [])

    const handleSave = () => save(settings)

    const toggleFocus = (area: string) => {
        const has = settings.focus_areas.includes(area)
        update({ focus_areas: has ? settings.focus_areas.filter(f => f !== area) : [...settings.focus_areas, area] })
    }

    const addCustomFocus = () => {
        const trimmed = focusInput.trim()
        if (!trimmed || settings.focus_areas.includes(trimmed)) return
        update({ focus_areas: [...settings.focus_areas, trimmed] })
        setFocusInput('')
    }

    const clearChatHistory = async () => {
        setClearingChat(true)
        try {
            const res = await apiFetch('/api/settings/chat-history', { method: 'DELETE' })
            if (res.ok) {
                toast.success('Chat history cleared')
                setConfirmClear(false)
            } else {
                toast.error('Could not clear history')
            }
        } catch {
            toast.error('Could not connect')
        } finally {
            setClearingChat(false)
        }
    }

    if (loading) {
        return (
            <main className="bg-screening min-h-screen relative overflow-hidden">
                <ParticleCanvas colors={['#d4af37', '#c9897a', '#b8860b', '#fef4e4']} count={14} />
                <Navigation />
                <div className="flex items-center justify-center min-h-screen">
                    <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                        style={{ borderColor: '#d4af37 transparent transparent transparent' }} />
                </div>
            </main>
        )
    }

    const activeColor = SECTIONS.find(s => s.id === activeSection)?.color || '#d4af37'

    return (
        <main className="bg-screening min-h-screen relative overflow-hidden">
            <ParticleCanvas colors={['#d4af37', '#c9897a', '#b8860b', '#fef4e4']} count={16} />
            <Navigation />

            <div className="relative z-10 pt-24 pb-20 px-5 max-w-4xl mx-auto">

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
                    <h1 style={{
                        fontFamily: "'Libre Baskerville', Baskerville, Georgia, serif",
                        fontWeight: 400, fontStyle: 'italic',
                        fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
                        color: 'var(--text-primary)', letterSpacing: '-0.01em', lineHeight: 1.12,
                        marginBottom: '6px',
                    }}>
                        Your{' '}
                        <span style={{
                            background: 'linear-gradient(90deg, #b8860b 0%, #d4af37 30%, #f9e07a 55%, #d4af37 78%, #b8860b 100%)',
                            backgroundSize: '220% auto', WebkitBackgroundClip: 'text', backgroundClip: 'text',
                            WebkitTextFillColor: 'transparent', animation: 'textShimmer 4s linear infinite',
                        }}>Settings</span>
                    </h1>
                    <p className="font-display italic" style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', fontWeight: 300 }}>
                        Shape how Lumina sees you and speaks to you.
                    </p>
                </motion.div>

                <div className="flex gap-6 flex-col md:flex-row">

                    {/* Sidebar */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                        className="flex-shrink-0 md:w-52">
                        <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
                            {SECTIONS.map((s, i) => (
                                <motion.button key={s.id}
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                    onClick={() => setActiveSection(s.id)}
                                    className="flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                                    style={{
                                        background: activeSection === s.id ? `${s.color}14` : 'transparent',
                                        border: `1px solid ${activeSection === s.id ? `${s.color}38` : 'transparent'}`,
                                        minWidth: '140px',
                                    }}
                                    whileHover={{ x: activeSection === s.id ? 0 : 3 }}
                                >
                                    <span style={{ color: s.color, fontSize: '16px', flexShrink: 0 }}>{s.icon}</span>
                                    <div>
                                        <p className="font-jost text-xs tracking-wide" style={{
                                            color: activeSection === s.id ? 'var(--text-primary)' : 'var(--text-muted)',
                                            textTransform: 'uppercase', letterSpacing: '0.1em',
                                        }}>
                                            {s.label}
                                        </p>
                                        <p className="font-body text-xs mt-0.5 hidden md:block" style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '11px' }}>
                                            {s.desc}
                                        </p>
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>

                    {/* Content panel */}
                    <div className="flex-1 min-w-0">
                        <AnimatePresence mode="wait">

                            {/* IDENTITY */}
                            {activeSection === 'identity' && (
                                <motion.div key="identity" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className="space-y-5">
                                    <SectionCard color="#d4af37">
                                        <p className="font-jost text-xs tracking-widest uppercase mb-5" style={{ color: '#d4af37' }}>How Lumina Knows You</p>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="font-jost text-xs tracking-widest uppercase mb-2 block" style={{ color: 'var(--text-muted)' }}>
                                                    Preferred Name
                                                </label>
                                                <input
                                                    value={settings.preferred_name}
                                                    onChange={e => update({ preferred_name: e.target.value })}
                                                    placeholder="What should Lumina call you?"
                                                    className="lumina-input"
                                                    style={{ border: '1px solid rgba(212,175,55,0.22)' }}
                                                />
                                                <p className="font-body text-xs mt-1.5 italic" style={{ color: 'var(--text-muted)' }}>
                                                    Overrides your account name in chat just for how Lumina addresses you.
                                                </p>
                                            </div>
                                            <div>
                                                <label className="font-jost text-xs tracking-widest uppercase mb-2 block" style={{ color: 'var(--text-muted)' }}>
                                                    Pronouns
                                                </label>
                                                <div className="flex flex-wrap gap-2">
                                                    {PRONOUN_OPTIONS.map(p => (
                                                        <button key={p} onClick={() => update({ pronouns: settings.pronouns === p ? '' : p })}
                                                            className="px-3 py-1.5 rounded-full font-jost text-xs transition-all"
                                                            style={{
                                                                background: settings.pronouns === p ? 'rgba(212,175,55,0.18)' : 'var(--bg-glass)',
                                                                border: settings.pronouns === p ? '1px solid rgba(212,175,55,0.45)' : '1px solid var(--border-subtle)',
                                                                color: settings.pronouns === p ? '#d4af37' : 'var(--text-muted)',
                                                            }}>
                                                            {p}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between py-2">
                                                <div>
                                                    <p className="font-jost text-sm" style={{ color: 'var(--text-primary)' }}>Use my name in chat</p>
                                                    <p className="font-body text-xs italic mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                                        Lumina will occasionally address you by name naturally
                                                    </p>
                                                </div>
                                                <Toggle on={settings.use_name_in_chat} onToggle={() => update({ use_name_in_chat: !settings.use_name_in_chat })} />
                                            </div>
                                        </div>
                                    </SectionCard>

                                    <SectionCard color="#d4af37">
                                        <p className="font-jost text-xs tracking-widest uppercase mb-2" style={{ color: '#d4af37' }}>About Me</p>
                                        <p className="font-body text-sm italic mb-3" style={{ color: 'var(--text-muted)' }}>
                                            Anything you want Lumina to carry into every conversation your situation, what you're working through, what matters to you.
                                        </p>
                                        <textarea
                                            value={settings.about_me}
                                            onChange={e => update({ about_me: e.target.value })}
                                            rows={5}
                                            placeholder="e.g. I'm going through a career change and dealing with a lot of anxiety about the future. I've been in therapy before but stopped last year. I find it hard to talk about my childhood..."
                                            className="w-full p-4 rounded-xl resize-none font-body focus:outline-none"
                                            style={{
                                                background: 'var(--bg-glass)', border: '1px solid rgba(212,175,55,0.2)',
                                                color: 'var(--text-primary)', lineHeight: '1.65', fontSize: '14px',
                                            }}
                                        />
                                        <p className="font-jost text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                                            {settings.about_me.length} chars · Injected into every chat session as context.
                                        </p>
                                    </SectionCard>

                                    <SectionCard color="#d4af37">
                                        <p className="font-jost text-xs tracking-widest uppercase mb-3" style={{ color: '#d4af37' }}>Focus Areas</p>
                                        <p className="font-body text-sm italic mb-4" style={{ color: 'var(--text-muted)' }}>
                                            What do you want Lumina to be most aware of? These shape the lens it brings to your conversations.
                                        </p>
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {FOCUS_SUGGESTIONS.map(area => {
                                                const active = settings.focus_areas.includes(area)
                                                return (
                                                    <button key={area} onClick={() => toggleFocus(area)}
                                                        className="px-3 py-1.5 rounded-full font-jost text-xs transition-all"
                                                        style={{
                                                            background: active ? 'rgba(212,175,55,0.18)' : 'var(--bg-glass)',
                                                            border: active ? '1px solid rgba(212,175,55,0.45)' : '1px solid var(--border-subtle)',
                                                            color: active ? '#d4af37' : 'var(--text-muted)',
                                                        }}>
                                                        {active ? '✓ ' : ''}{area}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                value={focusInput}
                                                onChange={e => setFocusInput(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && addCustomFocus()}
                                                placeholder="Add your own..."
                                                className="flex-1 px-4 py-2.5 rounded-xl font-jost text-sm focus:outline-none"
                                                style={{
                                                    background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)',
                                                    color: 'var(--text-primary)',
                                                }}
                                            />
                                            <button onClick={addCustomFocus}
                                                className="px-4 py-2.5 rounded-xl font-jost text-xs tracking-widest uppercase"
                                                style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.28)', color: '#d4af37' }}>
                                                Add
                                            </button>
                                        </div>
                                        {settings.focus_areas.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-3">
                                                {settings.focus_areas.map(area => (
                                                    <span key={area} className="flex items-center gap-1 px-2.5 py-1 rounded-full font-jost text-xs"
                                                        style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.28)', color: '#d4af37' }}>
                                                        {area}
                                                        <button onClick={() => toggleFocus(area)} style={{ opacity: 0.6, fontSize: '10px' }}>✕</button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </SectionCard>
                                </motion.div>
                            )}

                            {/* TONE */}
                            {activeSection === 'tone' && (
                                <motion.div key="tone" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className="space-y-5">
                                    <SectionCard color="#c9897a">
                                        <p className="font-jost text-xs tracking-widest uppercase mb-5" style={{ color: '#c9897a' }}>Communication Style</p>
                                        <p className="font-body text-sm italic mb-4" style={{ color: 'var(--text-muted)' }}>
                                            How should Lumina speak to you? This shapes the texture of every response.
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {TONE_OPTIONS.map(opt => {
                                                const active = settings.ai_tone === opt.id
                                                return (
                                                    <motion.button key={opt.id} onClick={() => update({ ai_tone: opt.id })}
                                                        whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
                                                        className="text-left p-4 rounded-xl transition-all"
                                                        style={{
                                                            background: active ? `${opt.color}14` : 'var(--bg-glass)',
                                                            border: active ? `1px solid ${opt.color}45` : '1px solid var(--border-subtle)',
                                                        }}>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span style={{ color: opt.color, fontSize: '18px' }}>{opt.icon}</span>
                                                            <p className="font-gothic text-xs tracking-widest" style={{ color: active ? opt.color : 'var(--text-primary)', letterSpacing: '0.08em' }}>
                                                                {opt.label}
                                                            </p>
                                                        </div>
                                                        <p className="font-body text-sm italic" style={{ color: 'var(--text-muted)' }}>{opt.desc}</p>
                                                        {active && (
                                                            <div className="mt-2 h-px" style={{ background: `linear-gradient(90deg, ${opt.color}60, transparent)` }} />
                                                        )}
                                                    </motion.button>
                                                )
                                            })}
                                        </div>
                                    </SectionCard>

                                    <SectionCard color="#c9897a">
                                        <p className="font-jost text-xs tracking-widest uppercase mb-4" style={{ color: '#c9897a' }}>Response Length</p>
                                        <div className="flex gap-3 flex-col sm:flex-row">
                                            {LENGTH_OPTIONS.map(opt => {
                                                const active = settings.response_length === opt.id
                                                return (
                                                    <motion.button key={opt.id} onClick={() => update({ response_length: opt.id })}
                                                        whileTap={{ scale: 0.97 }}
                                                        className="flex-1 p-4 rounded-xl text-center transition-all"
                                                        style={{
                                                            background: active ? 'rgba(201,137,122,0.14)' : 'var(--bg-glass)',
                                                            border: active ? '1px solid rgba(201,137,122,0.45)' : '1px solid var(--border-subtle)',
                                                        }}>
                                                        <div className="font-display font-light mb-1" style={{ fontSize: '28px', color: active ? '#c9897a' : 'var(--text-muted)' }}>
                                                            {opt.icon}
                                                        </div>
                                                        <p className="font-jost text-xs tracking-wide uppercase" style={{ color: active ? '#c9897a' : 'var(--text-primary)' }}>
                                                            {opt.label}
                                                        </p>
                                                        <p className="font-body text-xs mt-1 italic" style={{ color: 'var(--text-muted)' }}>{opt.desc}</p>
                                                    </motion.button>
                                                )
                                            })}
                                        </div>
                                    </SectionCard>
                                </motion.div>
                            )}

                            {/* CONTEXT */}
                            {activeSection === 'context' && (
                                <motion.div key="context" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className="space-y-5">
                                    <SectionCard color="#7a9e7e">
                                        <p className="font-jost text-xs tracking-widest uppercase mb-2" style={{ color: '#7a9e7e' }}>What Lumina Remembers</p>
                                        <p className="font-body text-sm italic mb-5" style={{ color: 'var(--text-muted)' }}>
                                            Control which parts of your history Lumina draws on when talking to you. Toggle off anything you'd rather keep separate.
                                        </p>
                                        <ContextRow label="Mood Logs" desc="Your recent mood scores and patterns"
                                            on={settings.use_mood_context} color="#7a9e7e"
                                            onToggle={() => update({ use_mood_context: !settings.use_mood_context })} />
                                        <ContextRow label="Self-Reflection Results" desc="Your check scores anxiety, mood, personality"
                                            on={settings.use_screening_context} color="#7a9e7e"
                                            onToggle={() => update({ use_screening_context: !settings.use_screening_context })} />
                                        <ContextRow label="Inner Work Sessions" desc="Which CBT modules you've completed"
                                            on={settings.use_cbt_context} color="#7a9e7e"
                                            onToggle={() => update({ use_cbt_context: !settings.use_cbt_context })} />
                                        <ContextRow label="Memory & Cognitive Games" desc="Your game performance and patterns"
                                            on={settings.use_memory_context} color="#7a9e7e"
                                            onToggle={() => update({ use_memory_context: !settings.use_memory_context })} />
                                        <ContextRow label="Journal Activity" desc="Entry count and recent themes from your journal"
                                            on={settings.use_journal_context} color="#7a9e7e"
                                            onToggle={() => update({ use_journal_context: !settings.use_journal_context })} />
                                        <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(122,158,126,0.08)', border: '1px solid rgba(122,158,126,0.18)' }}>
                                            <p className="font-body text-xs italic" style={{ color: 'var(--text-muted)' }}>
                                                Lumina uses your data only to speak more personally to you it is never shared or stored outside this app.
                                            </p>
                                        </div>
                                    </SectionCard>
                                </motion.div>
                            )}

                            {/* CRISIS */}
                            {activeSection === 'crisis' && (
                                <motion.div key="crisis" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className="space-y-5">
                                    <SectionCard color="#c4913a">
                                        <p className="font-jost text-xs tracking-widest uppercase mb-2" style={{ color: '#c4913a' }}>Crisis Detection Sensitivity</p>
                                        <p className="font-body text-sm italic mb-5" style={{ color: 'var(--text-muted)' }}>
                                            How quickly should Lumina notice signs of distress and offer support? Adjust if the default interrupts too often or not enough.
                                        </p>
                                        <div className="space-y-3">
                                            {CRISIS_OPTIONS.map(opt => {
                                                const active = settings.crisis_sensitivity === opt.id
                                                return (
                                                    <motion.button key={opt.id} onClick={() => update({ crisis_sensitivity: opt.id })}
                                                        whileHover={{ x: 3 }} whileTap={{ scale: 0.98 }}
                                                        className="w-full flex items-start gap-4 p-4 rounded-xl text-left transition-all"
                                                        style={{
                                                            background: active ? `${opt.color}12` : 'var(--bg-glass)',
                                                            border: active ? `1px solid ${opt.color}40` : '1px solid var(--border-subtle)',
                                                        }}>
                                                        <div className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0 transition-all"
                                                            style={{
                                                                background: active ? opt.color : 'transparent',
                                                                border: `2px solid ${active ? opt.color : 'var(--border-medium)'}`,
                                                                boxShadow: active ? `0 0 10px ${opt.color}60` : 'none',
                                                            }} />
                                                        <div>
                                                            <p className="font-gothic text-xs tracking-widest mb-0.5" style={{ color: active ? opt.color : 'var(--text-primary)', letterSpacing: '0.1em' }}>
                                                                {opt.label}
                                                            </p>
                                                            <p className="font-body text-sm italic" style={{ color: 'var(--text-muted)' }}>{opt.desc}</p>
                                                        </div>
                                                    </motion.button>
                                                )
                                            })}
                                        </div>
                                        <div className="mt-5 p-3 rounded-lg" style={{ background: 'rgba(196,145,58,0.08)', border: '1px solid rgba(196,145,58,0.18)' }}>
                                            <p className="font-body text-xs italic" style={{ color: 'var(--text-muted)' }}>
                                                This affects how Lumina interprets your words, not whether crisis resources are available. iCall (9152987821) is always at /crisis.
                                            </p>
                                        </div>
                                    </SectionCard>
                                </motion.div>
                            )}

                            {/* PRIVACY */}
                            {activeSection === 'privacy' && (
                                <motion.div key="privacy" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                    className="space-y-5">
                                    <SectionCard color="#9b7fd4">
                                        <p className="font-jost text-xs tracking-widest uppercase mb-2" style={{ color: '#9b7fd4' }}>Your Data</p>
                                        <p className="font-body text-sm italic mb-5" style={{ color: 'var(--text-muted)' }}>
                                            Everything lives in your account. The only external call is AI inference (Groq/LLaMA), which processes only the current message thread.
                                        </p>
                                        <div className="space-y-3">
                                            <div className="p-4 rounded-xl" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <p className="font-jost text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Clear Chat History</p>
                                                        <p className="font-body text-xs italic" style={{ color: 'var(--text-muted)' }}>
                                                            Deletes all conversations. Journal, mood logs, and other data are untouched.
                                                        </p>
                                                    </div>
                                                    {!confirmClear ? (
                                                        <motion.button onClick={() => setConfirmClear(true)}
                                                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                                            className="flex-shrink-0 px-4 py-2 rounded-xl font-jost text-xs tracking-widest uppercase"
                                                            style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.28)', color: '#f87171' }}>
                                                            Clear
                                                        </motion.button>
                                                    ) : (
                                                        <div className="flex gap-2 flex-shrink-0">
                                                            <button onClick={() => setConfirmClear(false)}
                                                                className="px-3 py-2 rounded-xl font-jost text-xs"
                                                                style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                                                                Cancel
                                                            </button>
                                                            <motion.button onClick={clearChatHistory} disabled={clearingChat}
                                                                whileTap={{ scale: 0.97 }}
                                                                className="px-3 py-2 rounded-xl font-jost text-xs tracking-wide uppercase"
                                                                style={{ background: 'rgba(248,113,113,0.2)', border: '1px solid rgba(248,113,113,0.5)', color: '#f87171' }}>
                                                                {clearingChat ? 'Clearing...' : 'Confirm'}
                                                            </motion.button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="p-4 rounded-xl" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <p className="font-jost text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Reset These Settings</p>
                                                        <p className="font-body text-xs italic" style={{ color: 'var(--text-muted)' }}>
                                                            Restores all settings on this page to their defaults.
                                                        </p>
                                                    </div>
                                                    <motion.button
                                                        onClick={() => {
                                                            setSettings(DEFAULT_SETTINGS)
                                                            localStorage.removeItem('lumina_settings')
                                                            apiFetch('/api/settings', { method: 'POST', body: JSON.stringify(DEFAULT_SETTINGS) }).catch(() => { })
                                                            toast.success('Settings reset to defaults')
                                                        }}
                                                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                                        className="flex-shrink-0 px-4 py-2 rounded-xl font-jost text-xs tracking-widest uppercase"
                                                        style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                                                        Reset
                                                    </motion.button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-5 p-3 rounded-lg" style={{ background: 'rgba(155,127,212,0.08)', border: '1px solid rgba(155,127,212,0.18)' }}>
                                            <p className="font-body text-xs italic" style={{ color: 'var(--text-muted)' }}>
                                                AI inference uses Groq's API. Message content is processed to generate responses per Groq's data policy. Lumina does not log or store inference calls separately.
                                            </p>
                                        </div>
                                    </SectionCard>
                                </motion.div>
                            )}

                        </AnimatePresence>

                        {/* Save button not shown on privacy tab (actions are immediate) */}
                        {activeSection !== 'privacy' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                                className="mt-6 flex justify-end">
                                <motion.button onClick={handleSave} disabled={saving}
                                    whileHover={{ scale: saving ? 1 : 1.03 }} whileTap={{ scale: saving ? 1 : 0.97 }}
                                    className="px-8 py-3.5 rounded-xl font-jost font-semibold text-sm tracking-widest uppercase"
                                    style={{
                                        background: `linear-gradient(135deg, ${activeColor}22, ${activeColor}0d)`,
                                        border: `1px solid ${activeColor}45`,
                                        color: 'var(--text-primary)',
                                        opacity: saving ? 0.6 : 1,
                                    }}>
                                    {saving ? (
                                        <span className="flex items-center gap-2">
                                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                                style={{ width: '14px', height: '14px', borderRadius: '50%', border: `2px solid ${activeColor}40`, borderTopColor: activeColor }} />
                                            Saving...
                                        </span>
                                    ) : 'Save Changes'}
                                </motion.button>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    )
}