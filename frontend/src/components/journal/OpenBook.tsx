'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import JournalStickers, { type Sticker } from './JournalStickers'

interface PlacedSticker extends Sticker {
    stickerId: string
    x: number
    y: number
    scale: number
}

interface JournalEntry {
    id: string
    content: string
    mood_score?: number
    tags?: string[]
    created_at: string
    stickers?: PlacedSticker[]
}

interface OpenBookProps {
    entries: JournalEntry[]
    onSave: (content: string, mood: number, tags: string[], stickers: PlacedSticker[]) => Promise<void>
    onClose: () => void
    isSaving: boolean
}

const MOOD_LABELS: Record<number, { label: string; color: string }> = {
    1: { label: 'Desolate', color: '#8b4040' },
    2: { label: 'Heavy', color: '#9b5545' },
    3: { label: 'Low', color: '#a86050' },
    4: { label: 'Quiet', color: '#b87050' },
    5: { label: 'Still', color: '#b8a070' },
    6: { label: 'Gentle', color: '#8a9e7a' },
    7: { label: 'Light', color: '#7a9e7e' },
    8: { label: 'Bright', color: '#6aae7e' },
    9: { label: 'Radiant', color: '#d4af37' },
    10: { label: 'Luminous', color: '#f0d060' },
}

const TAGS = ['Anxious', 'Calm', 'Hopeful', 'Tired', 'Grateful', 'Overwhelmed', 'Content', 'Melancholy', 'Excited', 'Conflicted', 'Tender', 'Resolved']

const WRITING_FONTS = [
    { id: 'garamond', label: 'EB Garamond', family: "'EB Garamond', serif", style: 'italic' },
    { id: 'cormorant', label: 'Cormorant', family: "'Cormorant Garamond', serif", style: 'italic' },
    { id: 'playfair', label: 'Playfair Display', family: "'Playfair Display', serif", style: 'italic' },
    { id: 'philosopher', label: 'Philosopher', family: "'Philosopher', serif", style: 'italic' },
    { id: 'baskerville', label: 'Baskerville', family: "'Baskerville Old Face', Baskerville, serif", style: 'italic' },
    { id: 'tangerine', label: 'Tangerine', family: "'Tangerine', cursive", style: 'normal' },
    { id: 'dancing', label: 'Dancing Script', family: "'Dancing Script', cursive", style: 'normal' },
    { id: 'greatvibes', label: 'Great Vibes', family: "'Great Vibes', cursive", style: 'normal' },
    { id: 'josefin', label: 'Josefin Sans', family: "'Josefin Sans', sans-serif", style: 'normal' },
    { id: 'raleway', label: 'Raleway', family: "'Raleway', sans-serif", style: 'normal' },
]

const FONT_SIZES = [
    { id: 'sm', label: 'SM', px: '13px', lh: '26px' },
    { id: 'md', label: 'MD', px: '15px', lh: '30px' },
    { id: 'lg', label: 'LG', px: '18px', lh: '34px' },
    { id: 'xl', label: 'XL', px: '22px', lh: '40px' },
]

// Dot grid page background via CSS
const DOT_GRID_STYLE = (textColor: string): React.CSSProperties => ({
    backgroundImage: `radial-gradient(circle, ${textColor === 'light' ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.18)'} 1px, transparent 1px)`,
    backgroundSize: '18px 18px',
})

type PanelTool = 'font' | 'size' | 'stickers' | 'mood' | null

export default function OpenBook({ entries, onSave, onClose, isSaving }: OpenBookProps) {
    const [currentPage, setCurrentPage] = useState(0)
    const [isFlipping, setIsFlipping] = useState(false)
    const [flipDir, setFlipDir] = useState<'fwd' | 'bwd'>('fwd')
    const [activeTool, setActiveTool] = useState<PanelTool>(null)

    const [content, setContent] = useState('')
    const [mood, setMood] = useState(5)
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [pageStickers, setPageStickers] = useState<PlacedSticker[]>([])
    const [activeStickerId, setActiveStickerId] = useState<string | null>(null)

    const [writingFontId, setWritingFontId] = useState('garamond')
    const [fontSizeId, setFontSizeId] = useState('md')

    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const [isLight, setIsLight] = useState(false)

    useEffect(() => {
        setIsLight(document.documentElement.classList.contains('light'))
        const obs = new MutationObserver(() => setIsLight(document.documentElement.classList.contains('light')))
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
        return () => obs.disconnect()
    }, [])

    const writingFont = WRITING_FONTS.find(f => f.id === writingFontId) || WRITING_FONTS[0]
    const fontSize = FONT_SIZES.find(f => f.id === fontSizeId) || FONT_SIZES[1]
    const isDarkPaper = !isLight
    const paperBg = isLight ? '#f5ead0' : '#1a1000'
    const textColor = isLight ? 'rgba(35,20,5,0.88)' : 'rgba(254,240,210,0.9)'
    const textMuted = isLight ? 'rgba(100,70,30,0.5)' : 'rgba(254,220,150,0.4)'
    const borderColor = isLight ? 'rgba(180,140,80,0.22)' : 'rgba(212,175,55,0.15)'

    const moodInfo = MOOD_LABELS[mood] || MOOD_LABELS[5]
    const isWritePage = currentPage === 0
    const currentEntry = !isWritePage ? entries[currentPage - 1] : null
    const prevEntry = currentPage > 1 ? entries[currentPage - 2] : null

    const goTo = useCallback((dir: 'fwd' | 'bwd') => {
        if (isFlipping) return
        setIsFlipping(true)
        setFlipDir(dir)
        setTimeout(() => {
            setCurrentPage(p => {
                if (dir === 'fwd') return Math.min(p + 1, entries.length)
                return Math.max(p - 1, 0)
            })
            setIsFlipping(false)
        }, 400)
    }, [isFlipping, entries.length])

    const handleStickerDrop = useCallback((sticker: Sticker) => {
        const id = `${sticker.id}-${Date.now()}`
        setPageStickers(prev => [...prev, {
            ...sticker,
            stickerId: id,
            x: 20 + Math.random() * 55,
            y: 15 + Math.random() * 55,
            scale: 1,
        }])
        setActiveTool(null)
    }, [])

    const removeSticker = useCallback((stickerId: string) => {
        setPageStickers(prev => prev.filter(s => s.stickerId !== stickerId))
        setActiveStickerId(null)
    }, [])

    const handleSave = async () => {
        if (!content.trim()) return
        await onSave(content, mood, selectedTags, pageStickers)
        setContent('')
        setSelectedTags([])
        setPageStickers([])
        setMood(5)
    }

    const toggleTool = (id: PanelTool) => setActiveTool(prev => prev === id ? null : id)

    const BOOK_HEIGHT = 'min(560px, 76vh)'

    // Toolbar icons
    const ToolIcons: Record<string, React.ReactNode> = {
        font: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><text x="1" y="14" fontFamily="serif" fontSize="12" fill="currentColor" fontStyle="italic" fontWeight="400">A</text><text x="10" y="13" fontFamily="sans-serif" fontSize="7" fill="currentColor" opacity="0.7">a</text></svg>,
        size: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><text x="1" y="10" fontSize="8" fontFamily="serif" fill="currentColor" opacity="0.6">S</text><text x="7" y="15" fontSize="13" fontFamily="serif" fill="currentColor">M</text></svg>,
        stickers: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.2" /><path d="M5 11.5 C6.5 13.5 11.5 13.5 13 11.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" /><circle cx="6.5" cy="7.5" r="1" fill="currentColor" /><circle cx="11.5" cy="7.5" r="1" fill="currentColor" /></svg>,
        mood: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.2" /><path d="M6 11 C7 12.5 11 12.5 12 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><circle cx="7" cy="7.5" r="1" fill="currentColor" /><circle cx="11" cy="7.5" r="1" fill="currentColor" /></svg>,
    }

    const TOOLBAR_TOOLS: { id: PanelTool; label: string }[] = [
        { id: 'font', label: 'Font' },
        { id: 'size', label: 'Size' },
        { id: 'stickers', label: 'Stickers' },
        { id: 'mood', label: 'Mood' },
    ]

    // Panel width: stickers panel is wide (360px), others are narrow (200px)
    const panelWidth = activeTool === 'stickers' ? 360 : activeTool ? 210 : 0

    return (
        <div style={{
            position: 'relative', width: '100%', height: '100vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingTop: '62px',
        }}>
            <button
                onClick={onClose}
                style={{
                    position: 'absolute', top: '70px', left: '20px', zIndex: 60,
                    fontFamily: 'var(--font-jost)', fontSize: '11px', letterSpacing: '0.12em',
                    textTransform: 'uppercase', color: 'var(--text-muted)',
                    background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >← Close</button>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', padding: '0 0 0 8px', gap: 0 }}>
                {/* Book area */}
                <div style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', minWidth: 0, paddingRight: '4px',
                }}>
                    <motion.div
                        initial={{ scale: 0.6, opacity: 0, rotateX: 18 }}
                        animate={{ scale: 1, opacity: 1, rotateX: 0 }}
                        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                        style={{ perspective: '1800px', transformStyle: 'preserve-3d', width: '100%', maxWidth: '900px' }}
                    >
                        <div style={{
                            display: 'flex', width: '100%', height: BOOK_HEIGHT,
                            transformStyle: 'preserve-3d', transform: 'rotateX(1.5deg)',
                            boxShadow: '0 40px 100px rgba(0,0,0,0.65), 0 10px 30px rgba(0,0,0,0.45)',
                            borderRadius: '2px 5px 5px 2px', position: 'relative',
                        }}>
                            {/* Spine */}
                            <div style={{
                                position: 'absolute', left: '50%', top: 0, bottom: 0, width: '14px',
                                transform: 'translateX(-50%)',
                                background: 'linear-gradient(to right, rgba(0,0,0,0.35), rgba(50,25,5,0.55), rgba(0,0,0,0.35))',
                                zIndex: 20, boxShadow: '0 0 16px rgba(0,0,0,0.42)',
                            }} />

                            {/* LEFT PAGE */}
                            <motion.div
                                key={`L-${currentPage}`}
                                initial={{ opacity: 0, rotateY: flipDir === 'fwd' ? -90 : 90 }}
                                animate={{ opacity: 1, rotateY: 0 }}
                                transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
                                style={{
                                    flex: 1, position: 'relative', overflow: 'hidden',
                                    borderRadius: '2px 0 0 2px',
                                    boxShadow: 'inset -8px 0 24px rgba(0,0,0,0.12)',
                                    transformOrigin: 'right center',
                                    ...DOT_GRID_STYLE(isLight ? 'light' : 'dark'),
                                    backgroundColor: paperBg,
                                }}
                            >
                                <div style={{ position: 'relative', zIndex: 1, padding: '24px 24px 16px 44px', height: '100%', overflow: 'hidden' }}>
                                    {isWritePage ? (
                                        <>
                                            <div style={{
                                                fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.22em',
                                                color: textMuted, textTransform: 'uppercase', marginBottom: '14px',
                                                paddingBottom: '8px', borderBottom: `0.5px solid ${borderColor}`,
                                            }}>Index of Entries</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', overflow: 'hidden', maxHeight: 'calc(100% - 60px)' }}>
                                                {entries.length === 0 ? (
                                                    <div style={{
                                                        fontFamily: writingFont.family, fontStyle: writingFont.style as any,
                                                        fontSize: '14px', color: textMuted, lineHeight: 1.8, marginTop: '18px',
                                                    }}>
                                                        Your first entry awaits.<br />Begin writing on the right page →
                                                    </div>
                                                ) : entries.slice(0, 14).map((entry, i) => (
                                                    <motion.button
                                                        key={entry.id}
                                                        onClick={() => { setFlipDir('fwd'); setCurrentPage(i + 1) }}
                                                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: i * 0.03 }}
                                                        style={{
                                                            textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                                                            padding: '4px 7px', borderRadius: '3px',
                                                            borderLeft: `2px solid ${borderColor}`,
                                                        }}>
                                                        <div style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.1em', color: textMuted, marginBottom: '2px' }}>
                                                            {format(new Date(entry.created_at), 'MMM d, yyyy')}
                                                            {entry.mood_score && (
                                                                <span style={{ marginLeft: '6px', color: MOOD_LABELS[entry.mood_score]?.color }}>
                                                                    · {MOOD_LABELS[entry.mood_score]?.label}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{
                                                            fontFamily: writingFont.family, fontStyle: writingFont.style as any,
                                                            fontSize: '12px', color: textColor, opacity: 0.8,
                                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                        }}>{entry.content.slice(0, 50)}…</div>
                                                    </motion.button>
                                                ))}
                                            </div>
                                            <div style={{ position: 'absolute', bottom: '14px', left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--font-cinzel)', fontSize: '8px', color: textMuted }}>i</div>
                                        </>
                                    ) : prevEntry ? (
                                        <>
                                            <div style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.16em', color: textMuted, marginBottom: '10px' }}>
                                                {format(new Date(prevEntry.created_at), 'EEEE, MMMM d')}
                                            </div>
                                            <div style={{
                                                fontFamily: writingFont.family, fontStyle: writingFont.style as any,
                                                fontSize: fontSize.px, lineHeight: fontSize.lh, color: textColor,
                                                overflow: 'hidden', maxHeight: 'calc(100% - 72px)',
                                            }}>{prevEntry.content}</div>
                                            <div style={{ position: 'absolute', bottom: '14px', left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--font-cinzel)', fontSize: '8px', color: textMuted }}>
                                                {currentPage - 1}
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.1 }}>
                                            <span style={{ fontSize: '40px', color: textMuted }}>✦</span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>

                            {/* RIGHT PAGE */}
                            <motion.div
                                key={`R-${currentPage}`}
                                initial={{ opacity: 0, rotateY: flipDir === 'bwd' ? 90 : -90 }}
                                animate={{ opacity: 1, rotateY: 0 }}
                                transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
                                style={{
                                    flex: 1, position: 'relative', overflow: 'hidden',
                                    borderRadius: '0 5px 5px 0',
                                    boxShadow: 'inset 6px 0 20px rgba(0,0,0,0.07)',
                                    transformOrigin: 'left center',
                                    ...DOT_GRID_STYLE(isLight ? 'light' : 'dark'),
                                    backgroundColor: paperBg,
                                }}
                            >
                                {/* Stickers layer */}
                                {isWritePage && pageStickers.map(s => (
                                    <DraggableSticker
                                        key={s.stickerId}
                                        sticker={s}
                                        isActive={activeStickerId === s.stickerId}
                                        onActivate={() => setActiveStickerId(s.stickerId)}
                                        onRemove={() => removeSticker(s.stickerId)}
                                        onScaleChange={(scale) => setPageStickers(prev => prev.map(ps => ps.stickerId === s.stickerId ? { ...ps, scale } : ps))}
                                    />
                                ))}

                                <div style={{
                                    position: 'relative', zIndex: 10,
                                    padding: '24px 20px 14px 28px', height: '100%',
                                    display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
                                }}>
                                    {isWritePage ? (
                                        <>
                                            <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: `0.5px solid ${borderColor}`, flexShrink: 0 }}>
                                                <div style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.18em', color: textMuted, textTransform: 'uppercase' }}>
                                                    {format(new Date(), 'EEEE, MMMM d yyyy')}
                                                    <span style={{ marginLeft: '8px', color: moodInfo.color, opacity: 0.9 }}>· {moodInfo.label}</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px', flexShrink: 0 }}>
                                                {TAGS.map(t => (
                                                    <button key={t} onClick={() => setSelectedTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t])}
                                                        style={{
                                                            padding: '2px 7px', borderRadius: '10px', fontSize: '9px',
                                                            fontFamily: 'var(--font-jost)', cursor: 'pointer',
                                                            background: selectedTags.includes(t) ? `${isDarkPaper ? 'rgba(212,175,55,0.16)' : 'rgba(180,130,60,0.16)'}` : 'transparent',
                                                            border: selectedTags.includes(t) ? `1px solid ${isDarkPaper ? 'rgba(212,175,55,0.4)' : 'rgba(180,130,60,0.4)'}` : `1px solid ${borderColor}`,
                                                            color: selectedTags.includes(t) ? textColor : textMuted, transition: 'all 0.14s',
                                                        }}>{t}</button>
                                                ))}
                                            </div>
                                            <textarea
                                                ref={textareaRef}
                                                value={content}
                                                onChange={e => setContent(e.target.value)}
                                                placeholder="Begin writing here…"
                                                style={{
                                                    flex: 1, width: '100%', minHeight: '120px',
                                                    background: 'transparent', border: 'none', outline: 'none',
                                                    resize: 'none',
                                                    fontFamily: writingFont.family, fontStyle: writingFont.style as any,
                                                    fontSize: fontSize.px, lineHeight: fontSize.lh, color: textColor,
                                                    caretColor: isDarkPaper ? 'rgba(212,175,55,0.9)' : 'rgba(100,60,10,0.9)',
                                                    overflowY: 'auto', paddingLeft: '6px', paddingRight: '6px',
                                                    boxSizing: 'border-box',
                                                    WebkitUserSelect: 'text', userSelect: 'text', cursor: 'text',
                                                    zIndex: 20, position: 'relative',
                                                }}
                                                onClick={e => e.currentTarget.focus()}
                                            />
                                            <div style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                marginTop: '8px', paddingTop: '7px', borderTop: `0.5px solid ${borderColor}`, flexShrink: 0,
                                            }}>
                                                <span style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', color: textMuted, letterSpacing: '0.1em' }}>
                                                    {content.length > 0 ? `${content.split(/\s+/).filter(Boolean).length} words` : 'empty page'}
                                                </span>
                                                <motion.button
                                                    onClick={handleSave}
                                                    disabled={isSaving || !content.trim()}
                                                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                                    style={{
                                                        padding: '6px 18px', borderRadius: '22px',
                                                        fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase',
                                                        cursor: content.trim() && !isSaving ? 'pointer' : 'not-allowed',
                                                        background: isDarkPaper ? 'rgba(212,175,55,0.14)' : 'rgba(180,130,60,0.16)',
                                                        border: isDarkPaper ? '1px solid rgba(212,175,55,0.38)' : '1px solid rgba(180,130,60,0.38)',
                                                        color: textColor, opacity: !content.trim() || isSaving ? 0.35 : 1, transition: 'all 0.18s',
                                                    }}>
                                                    {isSaving ? 'Saving…' : 'Save Entry ✦'}
                                                </motion.button>
                                            </div>
                                        </>
                                    ) : currentEntry ? (
                                        <>
                                            <div style={{ marginBottom: '10px', paddingBottom: '8px', borderBottom: `0.5px solid ${borderColor}`, flexShrink: 0 }}>
                                                <div style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.18em', color: textMuted, textTransform: 'uppercase' }}>
                                                    {format(new Date(currentEntry.created_at), 'EEEE, MMMM d yyyy')}
                                                    {currentEntry.mood_score && (
                                                        <span style={{ marginLeft: '8px', color: MOOD_LABELS[currentEntry.mood_score]?.color }}>
                                                            · {MOOD_LABELS[currentEntry.mood_score]?.label}
                                                        </span>
                                                    )}
                                                </div>
                                                {currentEntry.tags && currentEntry.tags.length > 0 && (
                                                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                                                        {currentEntry.tags.map(t => (
                                                            <span key={t} style={{
                                                                padding: '1px 6px', borderRadius: '8px', fontSize: '8px', fontFamily: 'var(--font-jost)',
                                                                background: `${borderColor}`, border: `1px solid ${borderColor}`, color: textMuted,
                                                            }}>{t}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{
                                                fontFamily: writingFont.family, fontStyle: writingFont.style as any,
                                                fontSize: fontSize.px, lineHeight: fontSize.lh, color: textColor,
                                                overflow: 'auto', flex: 1, paddingLeft: '6px',
                                                WebkitUserSelect: 'text', userSelect: 'text',
                                            }}>{currentEntry.content}</div>
                                            <div style={{ position: 'absolute', bottom: '14px', right: '20px', fontFamily: 'var(--font-cinzel)', fontSize: '8px', color: textMuted }}>
                                                {currentPage}
                                            </div>
                                        </>
                                    ) : null}
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* Navigation */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '14px' }}>
                        <motion.button onClick={() => goTo('bwd')} disabled={currentPage === 0 || isFlipping}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.93 }}
                            style={{
                                padding: '6px 18px', borderRadius: '22px',
                                fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase',
                                cursor: currentPage === 0 ? 'default' : 'pointer',
                                background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.2)',
                                color: currentPage === 0 ? 'rgba(212,175,55,0.18)' : 'rgba(212,175,55,0.6)', transition: 'all 0.18s',
                            }}>← Prev</motion.button>
                        <div style={{ textAlign: 'center', minWidth: '80px' }}>
                            <span style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.15em', color: 'rgba(212,175,55,0.3)', display: 'block' }}>
                                {isWritePage ? 'New Entry' : `${currentPage} / ${entries.length}`}
                            </span>
                            {!isWritePage && (
                                <button onClick={() => { setFlipDir('bwd'); setCurrentPage(0) }}
                                    style={{
                                        marginTop: '3px', background: 'none', border: 'none', cursor: 'pointer',
                                        fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.1em',
                                        color: 'rgba(212,175,55,0.38)', textDecoration: 'underline', textTransform: 'uppercase',
                                    }}>New Entry</button>
                            )}
                        </div>
                        <motion.button onClick={() => goTo('fwd')} disabled={currentPage >= entries.length || isFlipping}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.93 }}
                            style={{
                                padding: '6px 18px', borderRadius: '22px',
                                fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase',
                                cursor: currentPage >= entries.length ? 'default' : 'pointer',
                                background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.2)',
                                color: currentPage >= entries.length ? 'rgba(212,175,55,0.18)' : 'rgba(212,175,55,0.6)', transition: 'all 0.18s',
                            }}>Next →</motion.button>
                    </div>
                </div>

                {/* RIGHT SIDE: icon strip + expandable panel */}
                <div style={{
                    width: panelWidth > 0 ? `${panelWidth + 52}px` : '52px',
                    flexShrink: 0, display: 'flex', flexDirection: 'row', overflow: 'hidden',
                    transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
                    borderLeft: '1px solid rgba(212,175,55,0.1)',
                    background: isLight ? 'rgba(240,228,200,0.5)' : 'rgba(8,4,0,0.65)',
                    backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
                }}>
                    {/* Icon strip */}
                    <div style={{
                        width: '52px', flexShrink: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        gap: '2px', padding: '16px 6px 10px',
                        borderRight: activeTool ? '1px solid rgba(212,175,55,0.1)' : 'none',
                    }}>
                        {TOOLBAR_TOOLS.map(tool => (
                            <motion.button
                                key={tool.id}
                                onClick={() => toggleTool(tool.id)}
                                title={tool.label}
                                whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                                style={{
                                    width: '40px', height: '40px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    borderRadius: '10px',
                                    background: activeTool === tool.id ? 'rgba(212,175,55,0.18)' : 'transparent',
                                    border: activeTool === tool.id ? '1px solid rgba(212,175,55,0.4)' : '1px solid transparent',
                                    cursor: 'pointer',
                                    color: activeTool === tool.id ? 'rgba(212,175,55,0.95)' : 'rgba(212,175,55,0.4)',
                                    transition: 'all 0.15s', flexShrink: 0,
                                }}
                                onMouseEnter={e => { if (activeTool !== tool.id) { (e.currentTarget as HTMLElement).style.color = 'rgba(212,175,55,0.75)'; (e.currentTarget as HTMLElement).style.background = 'rgba(212,175,55,0.08)' } }}
                                onMouseLeave={e => { if (activeTool !== tool.id) { (e.currentTarget as HTMLElement).style.color = 'rgba(212,175,55,0.4)'; (e.currentTarget as HTMLElement).style.background = 'transparent' } }}
                            >
                                {ToolIcons[tool.id!]}
                            </motion.button>
                        ))}
                    </div>

                    {/* Expandable panel */}
                    <AnimatePresence>
                        {activeTool && (
                            <motion.div
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: `${panelWidth}px` }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.22 }}
                                style={{ flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', width: `${panelWidth}px` }}
                            >
                                <div style={{
                                    padding: '10px 14px 8px', borderBottom: '1px solid rgba(212,175,55,0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
                                }}>
                                    <span style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.18em', color: 'rgba(212,175,55,0.45)', textTransform: 'uppercase' }}>
                                        {TOOLBAR_TOOLS.find(t => t.id === activeTool)?.label}
                                    </span>
                                    <button onClick={() => setActiveTool(null)} style={{
                                        background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)',
                                        borderRadius: '6px', cursor: 'pointer', width: '22px', height: '22px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'rgba(212,175,55,0.5)', fontSize: '10px', fontWeight: 600,
                                    }}>✕</button>
                                </div>

                                <div style={{ flex: 1, overflowY: 'auto', padding: activeTool === 'stickers' ? '0' : '8px 12px' }}>
                                    {activeTool === 'font' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingTop: '8px' }}>
                                            {WRITING_FONTS.map(f => (
                                                <button key={f.id} onClick={() => setWritingFontId(f.id)}
                                                    style={{
                                                        textAlign: 'left', padding: '7px 10px', borderRadius: '8px',
                                                        fontFamily: f.family, fontStyle: f.style as any, fontSize: '14px',
                                                        cursor: 'pointer',
                                                        background: writingFontId === f.id ? 'rgba(212,175,55,0.14)' : 'transparent',
                                                        border: writingFontId === f.id ? '1px solid rgba(212,175,55,0.35)' : '1px solid transparent',
                                                        color: writingFontId === f.id ? 'rgba(254,244,228,0.9)' : 'rgba(254,244,228,0.4)',
                                                        transition: 'all 0.12s', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                    }}>{f.label}</button>
                                            ))}
                                        </div>
                                    )}
                                    {activeTool === 'size' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '8px' }}>
                                            {FONT_SIZES.map(fs => (
                                                <button key={fs.id} onClick={() => setFontSizeId(fs.id)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '10px',
                                                        padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                                                        background: fontSizeId === fs.id ? 'rgba(212,175,55,0.14)' : 'transparent',
                                                        border: fontSizeId === fs.id ? '1px solid rgba(212,175,55,0.35)' : '1px solid transparent',
                                                        color: fontSizeId === fs.id ? 'rgba(212,175,55,0.95)' : 'rgba(254,244,228,0.4)',
                                                        transition: 'all 0.12s',
                                                    }}>
                                                    <span style={{ fontFamily: writingFont.family, fontSize: fs.px, lineHeight: 1, minWidth: '28px', textAlign: 'right' }}>{fs.label}</span>
                                                    <span style={{ fontFamily: 'var(--font-jost)', fontSize: '10px', opacity: 0.6 }}>{fs.px}</span>
                                                </button>
                                            ))}
                                            <div style={{ padding: '10px', borderRadius: '10px', background: `${paperBg}cc`, border: `1px solid ${borderColor}`, marginTop: '8px' }}>
                                                <p style={{ fontFamily: writingFont.family, fontStyle: writingFont.style as any, fontSize: fontSize.px, lineHeight: fontSize.lh, color: textColor, margin: 0 }}>
                                                    The quick brown fox
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {activeTool === 'stickers' && (
                                        <div style={{ height: '100%', padding: '10px 12px', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                                            <JournalStickers onSelect={handleStickerDrop} onClose={() => setActiveTool(null)} />
                                        </div>
                                    )}
                                    {activeTool === 'mood' && (
                                        <div style={{ paddingTop: '8px' }}>
                                            <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                                                <div style={{ fontFamily: writingFont.family, fontStyle: 'italic' as any, fontSize: '40px', color: moodInfo.color, lineHeight: 1, marginBottom: '4px' }}>{mood}</div>
                                                <div style={{ fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.2em', color: moodInfo.color, textTransform: 'uppercase' }}>{moodInfo.label}</div>
                                            </div>
                                            <input type="range" min={1} max={10} value={mood}
                                                onChange={e => setMood(+e.target.value)}
                                                className="mood-slider" style={{ width: '100%', marginBottom: '12px' }} />
                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                {Object.entries(MOOD_LABELS).map(([k, v]) => (
                                                    <button key={k} onClick={() => setMood(Number(k))} title={v.label}
                                                        style={{
                                                            width: '20px', height: '20px', borderRadius: '50%',
                                                            background: v.color, cursor: 'pointer',
                                                            border: mood === Number(k) ? '2.5px solid rgba(255,255,255,0.65)' : '1.5px solid transparent',
                                                            transform: mood === Number(k) ? 'scale(1.2)' : 'scale(1)',
                                                            transition: 'all 0.14s', padding: 0,
                                                        }} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}

// Draggable sticker with visible delete button
function DraggableSticker({ sticker, isActive, onActivate, onRemove, onScaleChange }: {
    sticker: PlacedSticker
    isActive: boolean
    onActivate: () => void
    onRemove: () => void
    onScaleChange: (scale: number) => void
}) {
    const [isHovered, setIsHovered] = useState(false)
    const [isDragging, setIsDragging] = useState(false)

    return (
        <motion.div
            drag
            dragMomentum={false}
            dragElastic={0}
            onDragStart={() => { setIsDragging(true); onActivate() }}
            onDragEnd={() => setIsDragging(false)}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            onClick={onActivate}
            whileWheel={{}}
            onWheel={(e) => {
                e.stopPropagation()
                const delta = e.deltaY > 0 ? -0.1 : 0.1
                const newScale = Math.max(0.4, Math.min(3, sticker.scale + delta))
                onScaleChange(newScale)
            }}
            style={{
                position: 'absolute',
                left: `${sticker.x}%`,
                top: `${sticker.y}%`,
                zIndex: isActive || isDragging ? 50 : (isHovered ? 30 : 15),
                cursor: isDragging ? 'grabbing' : 'grab',
                userSelect: 'none',
                touchAction: 'none',
            }}
        >
            <div style={{ position: 'relative', display: 'inline-flex' }}>
                {sticker.isLottie ? (
                    // @ts-ignore
                    <lottie-player src={sticker.url} autoplay loop
                        style={{ width: `${68 * sticker.scale}px`, height: `${68 * sticker.scale}px`, transform: `rotate(${sticker.rotation || 0}deg)` }}
                        background="transparent" />
                ) : (
                    <img
                        src={sticker.url}
                        alt={sticker.label}
                        width={68 * sticker.scale}
                        height={68 * sticker.scale}
                        style={{
                            display: 'block',
                            objectFit: 'contain',
                            transform: `rotate(${sticker.rotation || 0}deg)`,
                            filter: 'drop-shadow(0 0 0px white) drop-shadow(0 0 2px white) drop-shadow(0 0 4px rgba(255,255,255,0.9)) drop-shadow(0 3px 6px rgba(0,0,0,0.4))',
                            pointerEvents: 'none',
                            userSelect: 'none',
                        }}
                        draggable={false}
                    />
                )}
                {/* Delete button */}
                <AnimatePresence>
                    {(isHovered || isActive) && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.6 }}
                            onClick={(e) => { e.stopPropagation(); onRemove() }}
                            style={{
                                position: 'absolute', top: '-10px', right: '-10px',
                                width: '20px', height: '20px', borderRadius: '50%',
                                background: 'rgba(220,38,38,0.9)',
                                border: '1.5px solid white',
                                cursor: 'pointer', zIndex: 100,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '10px', color: 'white', fontWeight: 700, lineHeight: 1,
                                boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                            }}>✕</motion.button>
                    )}
                </AnimatePresence>
                {/* Scale hint */}
                <AnimatePresence>
                    {isActive && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            style={{
                                position: 'absolute', bottom: '-18px', left: '50%', transform: 'translateX(-50%)',
                                fontFamily: 'var(--font-jost)', fontSize: '7px', color: 'rgba(212,175,55,0.7)',
                                whiteSpace: 'nowrap', letterSpacing: '0.06em',
                                pointerEvents: 'none',
                            }}>scroll to resize</motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}