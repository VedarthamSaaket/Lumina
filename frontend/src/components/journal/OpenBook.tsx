'use client'
import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import JournalStickers, { type Sticker } from './JournalStickers'

interface JournalEntry {
    id: string
    content: string
    mood_score?: number
    tags?: string[]
    created_at: string
    stickers?: Sticker[]
}

interface OpenBookProps {
    entries: JournalEntry[]
    onSave: (content: string, mood: number, tags: string[], stickers: Sticker[]) => Promise<void>
    onClose: () => void
    isSaving: boolean
}

const TAGS = ['Anxious', 'Calm', 'Hopeful', 'Tired', 'Grateful', 'Overwhelmed', 'Content', 'Sad', 'Excited', 'Confused']
const EMOJI: Record<number, string> = { 1: '😔', 2: '😟', 3: '😕', 4: '😐', 5: '🙂', 6: '😊', 7: '😄', 8: '😁', 9: '🌟', 10: '✨' }

const RULING_STYLES = [
    { id: 'lines', label: 'Ruled', icon: '≡' },
    { id: 'dots', label: 'Dotted', icon: '⠿' },
    { id: 'grid', label: 'Grid', icon: '⊞' },
    { id: 'blank', label: 'Blank', icon: '□' },
]

const PAPER_TEXTURES = [
    { id: 'cream', label: 'Parchment', color: '#f5ead0' },
    { id: 'white', label: 'White', color: '#fafaf8' },
    { id: 'pink', label: 'Blush', color: '#f9eae8' },
    { id: 'sage', label: 'Sage', color: '#e8f0e8' },
]

const WRITING_FONTS = [
    { id: 'garamond', label: 'Garamond', family: 'var(--font-eb-garamond)' },
    { id: 'cormorant', label: 'Cormorant', family: 'var(--font-cormorant)' },
    { id: 'fraunces', label: 'Fraunces', family: 'var(--font-fraunces)' },
    { id: 'crimson', label: 'Crimson', family: 'var(--font-crimson)' },
]

type ToolPanel = null | 'text' | 'stickers' | 'page' | 'mood'

function RulingLines({ style, paperColor }: { style: string; paperColor: string }) {
    const lineColor = paperColor === '#f5ead0' ? 'rgba(180,140,80,0.2)'
        : paperColor === '#fafaf8' ? 'rgba(100,100,120,0.15)'
            : paperColor === '#f9eae8' ? 'rgba(200,130,120,0.18)'
                : 'rgba(80,120,80,0.18)'

    if (style === 'blank') return null

    if (style === 'dots') {
        return (
            <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width="100%" height="100%">
                <defs>
                    <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                        <circle cx="12" cy="12" r="1" fill={lineColor} />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dots)" />
            </svg>
        )
    }

    if (style === 'grid') {
        return (
            <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width="100%" height="100%">
                <defs>
                    <pattern id="grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                        <path d="M 24 0 L 0 0 0 24" fill="none" stroke={lineColor} strokeWidth="0.5" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
        )
    }

    // default: ruled lines
    return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', paddingTop: '48px' }}>
            {Array.from({ length: 22 }, (_, i) => (
                <div key={i} style={{
                    position: 'absolute',
                    left: '12px', right: '12px',
                    top: `${48 + i * 28}px`,
                    height: '1px',
                    background: lineColor,
                }} />
            ))}
            {/* Red margin line */}
            <div style={{
                position: 'absolute',
                top: 0, bottom: 0, left: '42px',
                width: '1px',
                background: 'rgba(200,80,80,0.15)',
            }} />
        </div>
    )
}

export default function OpenBook({ entries, onSave, onClose, isSaving }: OpenBookProps) {
    const [currentPage, setCurrentPage] = useState(0) // 0 = write mode, >0 = entry index
    const [pageFlipDir, setPageFlipDir] = useState<'left' | 'right'>('right')
    const [isFlipping, setIsFlipping] = useState(false)
    const [activePanel, setActivePanel] = useState<ToolPanel>(null)

    // Write state
    const [content, setContent] = useState('')
    const [mood, setMood] = useState(5)
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [pageStickers, setPageStickers] = useState<Array<Sticker & { x: number; y: number; scale: number; stickerId: string }>>([])

    // Paper customisation
    const [rulingStyle, setRulingStyle] = useState('lines')
    const [paperTexture, setPaperTexture] = useState('cream')
    const [writingFont, setWritingFont] = useState('garamond')

    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const paperColor = PAPER_TEXTURES.find(p => p.id === paperTexture)?.color ?? '#f5ead0'
    const fontFamily = WRITING_FONTS.find(f => f.id === writingFont)?.family ?? 'var(--font-eb-garamond)'
    const totalPages = entries.length + 1 // +1 for write mode

    const flipTo = useCallback((dir: 'left' | 'right') => {
        if (isFlipping) return
        setIsFlipping(true)
        setPageFlipDir(dir)
        setTimeout(() => {
            setCurrentPage(p => {
                if (dir === 'right') return Math.min(p + 1, entries.length)
                return Math.max(p - 1, 0)
            })
            setIsFlipping(false)
        }, 380)
    }, [isFlipping, entries.length])

    const handleStickerDrop = (sticker: Sticker) => {
        setPageStickers(prev => [...prev, {
            ...sticker,
            stickerId: `${sticker.id}-${Date.now()}`,
            x: 40 + Math.random() * 45,
            y: 35 + Math.random() * 45,
            scale: 1,
        }])
        setActivePanel(null)
    }

    const handleSave = async () => {
        if (!content.trim()) return
        await onSave(content, mood, selectedTags, pageStickers)
        setContent('')
        setSelectedTags([])
        setPageStickers([])
        setMood(5)
    }

    const currentEntry = currentPage > 0 ? entries[currentPage - 1] : null
    const prevEntry = currentPage > 1 ? entries[currentPage - 2] : null
    const isWritePage = currentPage === 0

    const ToolIcons = [
        { id: 'text' as ToolPanel, icon: 'Aa', label: 'Text' },
        { id: 'stickers' as ToolPanel, icon: '✦', label: 'Stickers' },
        { id: 'page' as ToolPanel, icon: '◫', label: 'Page' },
        { id: 'mood' as ToolPanel, icon: EMOJI[mood], label: 'Mood' },
    ]

    return (
        <div style={{
            position: 'relative',
            width: '100%',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
        }}>
            {/* Back button */}
            <button
                onClick={onClose}
                style={{
                    position: 'absolute', top: '80px', left: '24px', zIndex: 60,
                    fontFamily: 'var(--font-jost)', fontSize: '11px', letterSpacing: '0.12em',
                    textTransform: 'uppercase', color: 'rgba(212,175,55,0.5)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    transition: 'color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(212,175,55,0.9)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(212,175,55,0.5)')}
            >
                ← Close
            </button>

            {/* Open Book Container */}
            <motion.div
                initial={{ scale: 0.6, opacity: 0, rotateX: 20 }}
                animate={{ scale: 1, opacity: 1, rotateX: 0 }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                style={{
                    perspective: '1800px',
                    transformStyle: 'preserve-3d',
                }}
            >
                <div style={{
                    display: 'flex',
                    width: 'min(880px, 96vw)',
                    height: 'min(580px, 90vh)',
                    transformStyle: 'preserve-3d',
                    transform: 'rotateX(4deg)',
                    boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 10px 30px rgba(0,0,0,0.5)',
                    borderRadius: '2px 4px 4px 2px',
                    position: 'relative',
                }}>

                    {/* Book Spine (center divider) */}
                    <div style={{
                        position: 'absolute',
                        left: '50%', top: 0, bottom: 0,
                        width: '14px',
                        transform: 'translateX(-50%)',
                        background: 'linear-gradient(to right, rgba(0,0,0,0.3), rgba(60,30,10,0.5), rgba(0,0,0,0.3))',
                        zIndex: 20,
                        boxShadow: '0 0 12px rgba(0,0,0,0.4)',
                    }} />

                    {/* LEFT PAGE */}
                    <motion.div
                        key={`left-${currentPage}`}
                        initial={{ rotateY: pageFlipDir === 'right' ? -90 : 90, opacity: 0 }}
                        animate={{ rotateY: 0, opacity: 1 }}
                        exit={{ rotateY: 90, opacity: 0 }}
                        transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
                        style={{
                            flex: 1,
                            background: paperColor,
                            position: 'relative',
                            overflow: 'hidden',
                            borderRadius: '2px 0 0 2px',
                            boxShadow: 'inset -6px 0 20px rgba(0,0,0,0.12)',
                            transformOrigin: 'right center',
                        }}
                    >
                        <RulingLines style={rulingStyle} paperColor={paperColor} />

                        <div style={{ position: 'relative', zIndex: 1, padding: '28px 32px 20px 32px', height: '100%', overflow: 'hidden' }}>
                            {isWritePage ? (
                                // Left page when writing: entry index / recent entries
                                <>
                                    <div style={{
                                        fontFamily: 'var(--font-cinzel)',
                                        fontSize: '10px',
                                        letterSpacing: '0.2em',
                                        color: 'rgba(100,70,30,0.55)',
                                        textTransform: 'uppercase',
                                        marginBottom: '20px',
                                        paddingBottom: '10px',
                                        borderBottom: '0.5px solid rgba(180,140,80,0.25)',
                                    }}>
                                        Recent Entries
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {entries.slice(0, 8).map((entry, i) => (
                                            <motion.button
                                                key={entry.id}
                                                onClick={() => { setPageFlipDir('right'); setCurrentPage(i + 1) }}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.04 }}
                                                style={{
                                                    textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                                                    padding: '6px 8px', borderRadius: '4px',
                                                    borderLeft: '2px solid rgba(180,130,60,0.3)',
                                                    transition: 'all 0.15s',
                                                }}
                                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(180,130,60,0.07)'; (e.currentTarget as HTMLElement).style.borderLeftColor = 'rgba(180,130,60,0.6)' }}
                                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.borderLeftColor = 'rgba(180,130,60,0.3)' }}
                                            >
                                                <div style={{ fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.1em', color: 'rgba(100,70,30,0.55)', marginBottom: '3px' }}>
                                                    {format(new Date(entry.created_at), 'MMM d, yyyy')}
                                                    {entry.mood_score && <span style={{ marginLeft: '6px' }}>{EMOJI[entry.mood_score]}</span>}
                                                </div>
                                                <div style={{
                                                    fontFamily: fontFamily, fontSize: '13px', color: 'rgba(50,30,10,0.8)',
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                    fontStyle: 'italic',
                                                }}>
                                                    {entry.content.slice(0, 60)}...
                                                </div>
                                            </motion.button>
                                        ))}
                                        {entries.length === 0 && (
                                            <div style={{ fontFamily: fontFamily, fontStyle: 'italic', color: 'rgba(100,70,30,0.4)', fontSize: '14px', lineHeight: 1.7, marginTop: '20px' }}>
                                                Your story begins here.<br />Write your first entry →
                                            </div>
                                        )}
                                    </div>

                                    {/* Page number */}
                                    <div style={{ position: 'absolute', bottom: '18px', left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--font-cinzel)', fontSize: '9px', color: 'rgba(100,70,30,0.4)', letterSpacing: '0.15em' }}>
                                        i
                                    </div>
                                </>
                            ) : (
                                // Left page showing previous entry
                                prevEntry ? (
                                    <>
                                        <div style={{ fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.15em', color: 'rgba(100,70,30,0.5)', marginBottom: '14px' }}>
                                            {format(new Date(prevEntry.created_at), 'EEEE, MMMM d')}
                                            {prevEntry.mood_score && <span style={{ marginLeft: '8px' }}>{EMOJI[prevEntry.mood_score]}</span>}
                                        </div>
                                        <div style={{ fontFamily: fontFamily, fontSize: '14px', lineHeight: 1.9, color: 'rgba(40,25,8,0.85)', overflow: 'hidden', maxHeight: 'calc(100% - 80px)', fontStyle: 'italic' }}>
                                            {prevEntry.content}
                                        </div>
                                        <div style={{ position: 'absolute', bottom: '18px', left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--font-cinzel)', fontSize: '9px', color: 'rgba(100,70,30,0.4)', letterSpacing: '0.15em' }}>
                                            {currentPage - 1}
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.3 }}>
                                        <span style={{ fontFamily: 'var(--font-cinzel)', fontSize: '32px', color: 'rgba(100,70,30,0.3)' }}>✦</span>
                                    </div>
                                )
                            )}
                        </div>
                    </motion.div>

                    {/* RIGHT PAGE */}
                    <motion.div
                        key={`right-${currentPage}`}
                        initial={{ rotateY: pageFlipDir === 'left' ? 90 : -90, opacity: 0 }}
                        animate={{ rotateY: 0, opacity: 1 }}
                        exit={{ rotateY: -90, opacity: 0 }}
                        transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
                        style={{
                            flex: 1,
                            background: paperColor,
                            position: 'relative',
                            overflow: 'hidden',
                            borderRadius: '0 4px 4px 0',
                            boxShadow: 'inset 6px 0 20px rgba(0,0,0,0.08)',
                            transformOrigin: 'left center',
                        }}
                    >
                        <RulingLines style={rulingStyle} paperColor={paperColor} />

                        {/* Dropped stickers layer */}
                        {isWritePage && pageStickers.map(s => (
                            <motion.div
                                key={s.stickerId}
                                drag
                                dragMomentum={false}
                                style={{
                                    position: 'absolute',
                                    left: `${s.x}%`, top: `${s.y}%`,
                                    transform: `rotate(${s.rotation || 0}deg) scale(${s.scale})`,
                                    zIndex: 15, cursor: 'grab',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                                    padding: '6px 8px', borderRadius: '8px',
                                    background: `${s.color}18`, border: `1px solid ${s.color}35`,
                                    userSelect: 'none',
                                }}
                                whileDrag={{ cursor: 'grabbing', scale: 1.15 }}
                                onDoubleClick={() => setPageStickers(prev => prev.filter(x => x.stickerId !== s.stickerId))}
                            >
                                <span style={{ fontSize: '20px', lineHeight: 1 }}>{s.emoji}</span>
                                <span style={{ fontFamily: 'var(--font-jost)', fontSize: '7px', color: s.color, fontWeight: 500 }}>{s.label}</span>
                            </motion.div>
                        ))}

                        <div style={{ position: 'relative', zIndex: 10, padding: '28px 44px 20px 28px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                            {isWritePage ? (
                                // WRITE MODE
                                <>
                                    {/* Page header */}
                                    <div style={{ marginBottom: '12px', paddingBottom: '10px', borderBottom: `0.5px solid rgba(180,140,80,0.2)` }}>
                                        <div style={{ fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.18em', color: 'rgba(100,70,30,0.5)', textTransform: 'uppercase' }}>
                                            {format(new Date(), 'EEEE, MMMM d yyyy')} &nbsp;·&nbsp; {EMOJI[mood]}
                                        </div>
                                    </div>

                                    {/* Tags */}
                                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                        {TAGS.map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setSelectedTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t])}
                                                style={{
                                                    padding: '2px 8px', borderRadius: '10px', fontSize: '10px',
                                                    fontFamily: 'var(--font-jost)', cursor: 'pointer',
                                                    background: selectedTags.includes(t) ? 'rgba(180,130,60,0.2)' : 'transparent',
                                                    border: selectedTags.includes(t) ? '1px solid rgba(180,130,60,0.45)' : '1px solid rgba(180,130,60,0.18)',
                                                    color: selectedTags.includes(t) ? 'rgba(120,80,20,0.9)' : 'rgba(100,70,30,0.45)',
                                                    transition: 'all 0.15s',
                                                }}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Textarea */}
                                    <textarea
                                        ref={textareaRef}
                                        value={content}
                                        onChange={e => setContent(e.target.value)}
                                        placeholder="Start writing..."
                                        style={{
                                            flex: 1, background: 'transparent', border: 'none', outline: 'none',
                                            resize: 'none', fontFamily: fontFamily, fontSize: '15px', lineHeight: 1.85,
                                            color: 'rgba(35,20,5,0.88)', fontStyle: 'italic',
                                            placeholder: 'rgba(140,100,50,0.4)',
                                        }}
                                    />

                                    {/* Bottom bar */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                        <span style={{ fontFamily: 'var(--font-cinzel)', fontSize: '9px', color: 'rgba(100,70,30,0.4)', letterSpacing: '0.1em' }}>
                                            {content.length} chars
                                        </span>
                                        <motion.button
                                            onClick={handleSave}
                                            disabled={isSaving || !content.trim()}
                                            whileHover={{ scale: 1.04 }}
                                            whileTap={{ scale: 0.96 }}
                                            style={{
                                                padding: '6px 18px', borderRadius: '10px',
                                                fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.15em',
                                                textTransform: 'uppercase', cursor: content.trim() ? 'pointer' : 'not-allowed',
                                                background: 'rgba(180,130,60,0.18)', border: '1px solid rgba(180,130,60,0.4)',
                                                color: 'rgba(120,80,20,0.9)', opacity: (!content.trim() || isSaving) ? 0.4 : 1,
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            {isSaving ? 'Saving…' : 'Save Entry ✦'}
                                        </motion.button>
                                    </div>
                                </>
                            ) : currentEntry ? (
                                // VIEW MODE
                                <>
                                    <div style={{ marginBottom: '12px', paddingBottom: '10px', borderBottom: `0.5px solid rgba(180,140,80,0.2)` }}>
                                        <div style={{ fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.18em', color: 'rgba(100,70,30,0.5)', textTransform: 'uppercase' }}>
                                            {format(new Date(currentEntry.created_at), 'EEEE, MMMM d yyyy')}
                                            {currentEntry.mood_score && <span style={{ marginLeft: '8px' }}>{EMOJI[currentEntry.mood_score]}</span>}
                                        </div>
                                        {currentEntry.tags && currentEntry.tags.length > 0 && (
                                            <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                                                {currentEntry.tags.map(t => (
                                                    <span key={t} style={{ padding: '1px 7px', borderRadius: '8px', fontSize: '9px', fontFamily: 'var(--font-jost)', background: 'rgba(180,130,60,0.12)', border: '1px solid rgba(180,130,60,0.25)', color: 'rgba(120,80,20,0.7)' }}>{t}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ fontFamily: fontFamily, fontSize: '14px', lineHeight: 1.9, color: 'rgba(35,20,5,0.85)', overflow: 'auto', flex: 1, fontStyle: 'italic' }}>
                                        {currentEntry.content}
                                    </div>
                                    <div style={{ position: 'absolute', bottom: '18px', right: '50px', fontFamily: 'var(--font-cinzel)', fontSize: '9px', color: 'rgba(100,70,30,0.4)', letterSpacing: '0.15em' }}>
                                        {currentPage}
                                    </div>
                                </>
                            ) : null}
                        </div>

                        {/* RIGHT SIDE TOOLBAR */}
                        <div style={{
                            position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                            width: '36px', background: 'rgba(180,130,60,0.08)',
                            borderLeft: '0.5px solid rgba(180,130,60,0.2)',
                            borderRadius: '0 4px 4px 0',
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            padding: '10px 0', gap: '4px', zIndex: 25,
                        }}>
                            {ToolIcons.map(tool => (
                                <motion.button
                                    key={tool.id}
                                    onClick={() => setActivePanel(prev => prev === tool.id ? null : tool.id)}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    title={tool.label}
                                    style={{
                                        width: '28px', height: '28px', borderRadius: '6px',
                                        background: activePanel === tool.id ? 'rgba(180,130,60,0.25)' : 'transparent',
                                        border: activePanel === tool.id ? '1px solid rgba(180,130,60,0.4)' : '1px solid transparent',
                                        cursor: 'pointer', fontSize: '12px',
                                        color: activePanel === tool.id ? 'rgba(120,80,20,0.9)' : 'rgba(120,80,20,0.5)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontFamily: tool.id === 'text' ? 'var(--font-cinzel)' : 'inherit',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {tool.icon}
                                </motion.button>
                            ))}
                        </div>

                        {/* Tool Panels */}
                        <AnimatePresence>
                            {activePanel === 'stickers' && isWritePage && (
                                <JournalStickers onSelect={handleStickerDrop} onClose={() => setActivePanel(null)} />
                            )}

                            {activePanel === 'text' && (
                                <motion.div
                                    initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }}
                                    style={{
                                        position: 'absolute', right: '48px', top: '50%', transform: 'translateY(-50%)',
                                        width: '190px', background: 'rgba(250,240,215,0.97)',
                                        border: '1px solid rgba(180,130,60,0.3)', borderRadius: '12px',
                                        padding: '14px', zIndex: 50, boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                                    }}
                                >
                                    <p style={{ fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.15em', color: 'rgba(100,70,30,0.6)', marginBottom: '10px', textTransform: 'uppercase' }}>Font</p>
                                    {WRITING_FONTS.map(f => (
                                        <button key={f.id} onClick={() => setWritingFont(f.id)}
                                            style={{
                                                width: '100%', textAlign: 'left', padding: '6px 8px', borderRadius: '6px',
                                                fontFamily: f.family, fontSize: '13px', cursor: 'pointer',
                                                background: writingFont === f.id ? 'rgba(180,130,60,0.15)' : 'transparent',
                                                border: writingFont === f.id ? '1px solid rgba(180,130,60,0.35)' : '1px solid transparent',
                                                color: 'rgba(60,35,10,0.85)', marginBottom: '3px', fontStyle: 'italic',
                                            }}>{f.label}</button>
                                    ))}
                                </motion.div>
                            )}

                            {activePanel === 'page' && (
                                <motion.div
                                    initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }}
                                    style={{
                                        position: 'absolute', right: '48px', top: '50%', transform: 'translateY(-50%)',
                                        width: '200px', background: 'rgba(250,240,215,0.97)',
                                        border: '1px solid rgba(180,130,60,0.3)', borderRadius: '12px',
                                        padding: '14px', zIndex: 50, boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                                    }}
                                >
                                    <p style={{ fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.15em', color: 'rgba(100,70,30,0.6)', marginBottom: '8px', textTransform: 'uppercase' }}>Ruling</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '12px' }}>
                                        {RULING_STYLES.map(r => (
                                            <button key={r.id} onClick={() => setRulingStyle(r.id)}
                                                style={{
                                                    padding: '5px', borderRadius: '6px', cursor: 'pointer', fontSize: '16px',
                                                    background: rulingStyle === r.id ? 'rgba(180,130,60,0.18)' : 'rgba(180,130,60,0.04)',
                                                    border: rulingStyle === r.id ? '1px solid rgba(180,130,60,0.4)' : '1px solid rgba(180,130,60,0.12)',
                                                    color: 'rgba(100,70,30,0.7)',
                                                }}
                                                title={r.label}>{r.icon}</button>
                                        ))}
                                    </div>
                                    <p style={{ fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.15em', color: 'rgba(100,70,30,0.6)', marginBottom: '8px', textTransform: 'uppercase' }}>Paper</p>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        {PAPER_TEXTURES.map(p => (
                                            <button key={p.id} onClick={() => setPaperTexture(p.id)}
                                                style={{
                                                    width: '32px', height: '32px', borderRadius: '6px', cursor: 'pointer',
                                                    background: p.color,
                                                    border: paperTexture === p.id ? '2px solid rgba(180,130,60,0.6)' : '1.5px solid rgba(180,130,60,0.2)',
                                                    boxShadow: paperTexture === p.id ? '0 0 8px rgba(180,130,60,0.3)' : 'none',
                                                }}
                                                title={p.label}
                                            />
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {activePanel === 'mood' && (
                                <motion.div
                                    initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }}
                                    style={{
                                        position: 'absolute', right: '48px', top: '50%', transform: 'translateY(-50%)',
                                        width: '180px', background: 'rgba(250,240,215,0.97)',
                                        border: '1px solid rgba(180,130,60,0.3)', borderRadius: '12px',
                                        padding: '14px', zIndex: 50, boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                                    }}
                                >
                                    <p style={{ fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.15em', color: 'rgba(100,70,30,0.6)', marginBottom: '10px', textTransform: 'uppercase' }}>Mood</p>
                                    <div style={{ textAlign: 'center', fontSize: '36px', marginBottom: '10px', lineHeight: 1 }}>{EMOJI[mood]}</div>
                                    <input type="range" min={1} max={10} value={mood} onChange={e => setMood(+e.target.value)}
                                        className="mood-slider" style={{ width: '100%' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontFamily: 'var(--font-cinzel)', fontSize: '8px', color: 'rgba(100,70,30,0.5)' }}>
                                        <span>low</span><span style={{ fontWeight: 600 }}>{mood}/10</span><span>high</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Page corners / navigation hint */}
                    {currentPage < entries.length && (
                        <motion.div
                            onClick={() => flipTo('right')}
                            animate={{ rotate: [0, 3, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                            style={{
                                position: 'absolute', bottom: '8px', right: '14px', zIndex: 25,
                                width: '32px', height: '32px', cursor: 'pointer',
                                borderBottom: '2px solid rgba(180,130,60,0.45)',
                                borderRight: '2px solid rgba(180,130,60,0.45)',
                                transformOrigin: 'bottom right',
                            }}
                        />
                    )}
                </div>
            </motion.div>

            {/* Navigation arrows (outside book) */}
            <div style={{
                position: 'absolute', bottom: '28px', left: '50%', transform: 'translateX(-50%)',
                display: 'flex', alignItems: 'center', gap: '20px', zIndex: 40,
            }}>
                <motion.button
                    onClick={() => flipTo('left')}
                    disabled={currentPage === 0}
                    whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                    style={{
                        padding: '8px 18px', borderRadius: '20px',
                        fontFamily: 'var(--font-cinzel)', fontSize: '10px', letterSpacing: '0.12em',
                        textTransform: 'uppercase', cursor: currentPage === 0 ? 'default' : 'pointer',
                        background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)',
                        color: currentPage === 0 ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.6)',
                        transition: 'all 0.2s',
                    }}
                >
                    ← Prev
                </motion.button>

                <span style={{ fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.15em', color: 'rgba(212,175,55,0.35)' }}>
                    {isWritePage ? 'New Entry' : `${currentPage} / ${entries.length}`}
                </span>

                {currentPage > 0 && (
                    <motion.button
                        onClick={() => { setPageFlipDir('left'); setCurrentPage(0) }}
                        whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                        style={{
                            padding: '8px 18px', borderRadius: '20px',
                            fontFamily: 'var(--font-cinzel)', fontSize: '10px', letterSpacing: '0.12em',
                            textTransform: 'uppercase', cursor: 'pointer',
                            background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.28)',
                            color: 'rgba(212,175,55,0.7)', transition: 'all 0.2s',
                        }}
                    >

                    </motion.button>
                )}
            </div>
        </div>
    )
}