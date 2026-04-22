'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
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

const TAGS = [
    'Anxious', 'Calm', 'Hopeful', 'Tired', 'Grateful',
    'Overwhelmed', 'Content', 'Melancholy', 'Excited',
    'Conflicted', 'Tender', 'Resolved'
]

const WRITING_FONTS = [
    { id: 'garamond', label: 'EB Garamond', family: "'EB Garamond', serif", style: 'italic' },
    { id: 'cormorant', label: 'Cormorant', family: "'Cormorant Garamond', serif", style: 'italic' },
    { id: 'playfair', label: 'Playfair Display', family: "'Playfair Display', serif", style: 'italic' },
    { id: 'baskerville', label: 'Baskerville', family: "'Baskerville Old Face', Baskerville, serif", style: 'italic' },
    { id: 'tangerine', label: 'Tangerine', family: "'Tangerine', cursive", style: 'normal' },
    { id: 'dancing', label: 'Dancing Script', family: "'Dancing Script', cursive", style: 'normal' },
    { id: 'josefin', label: 'Josefin Sans', family: "'Josefin Sans', sans-serif", style: 'normal' },
]

const FONT_SIZES = [
    { id: 'sm', label: 'Small', px: '13px', lh: '26px' },
    { id: 'md', label: 'Medium', px: '15px', lh: '30px' },
    { id: 'lg', label: 'Large', px: '18px', lh: '34px' },
    { id: 'xl', label: 'X-Large', px: '22px', lh: '40px' },
]

// Book paper is always warm parchment regardless of theme
const PAPER_BG = '#f5ead0'
const PAPER_TEXT = 'rgba(35,20,5,0.88)'
const PAPER_MUTED = 'rgba(100,70,30,0.5)'
const PAPER_BORDER = 'rgba(180,140,80,0.22)'
const PAPER_DOT = 'rgba(0,0,0,0.12)'

type ToolSection = 'font' | 'size' | 'stickers' | 'mood' | null

export default function OpenBook({ entries, onSave, onClose, isSaving }: OpenBookProps) {
    // currentPage: 0 = write page, 1..n = view entry n
    const [currentPage, setCurrentPage] = useState(0)
    const [flipDirection, setFlipDirection] = useState<'forward' | 'backward'>('forward')
    const [isAnimating, setIsAnimating] = useState(false)
    const [activeSection, setActiveSection] = useState<ToolSection>(null)

    const [content, setContent] = useState('')
    const [mood, setMood] = useState(5)
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [pageStickers, setPageStickers] = useState<PlacedSticker[]>([])
    const [activeStickerId, setActiveStickerId] = useState<string | null>(null)

    const [writingFontId, setWritingFontId] = useState('garamond')
    const [fontSizeId, setFontSizeId] = useState('md')

    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const writingFont = WRITING_FONTS.find(f => f.id === writingFontId) || WRITING_FONTS[0]
    const fontSize = FONT_SIZES.find(f => f.id === fontSizeId) || FONT_SIZES[1]
    const moodInfo = MOOD_LABELS[mood] || MOOD_LABELS[5]

    const isWritePage = currentPage === 0
    const totalEntries = entries.length

    // LEFT page content: index page or previous entry
    const leftEntry = currentPage > 1 ? entries[currentPage - 2] : null
    // RIGHT page content: write page or current entry
    const rightEntry = !isWritePage ? entries[currentPage - 1] : null

    const goForward = useCallback(() => {
        if (isAnimating || currentPage >= totalEntries) return
        setFlipDirection('forward')
        setIsAnimating(true)
        setTimeout(() => {
            setCurrentPage(p => p + 1)
            setIsAnimating(false)
        }, 500)
    }, [isAnimating, currentPage, totalEntries])

    const goBackward = useCallback(() => {
        if (isAnimating || currentPage <= 0) return
        setFlipDirection('backward')
        setIsAnimating(true)
        setTimeout(() => {
            setCurrentPage(p => p - 1)
            setIsAnimating(false)
        }, 500)
    }, [isAnimating, currentPage])

    const goToWritePage = useCallback(() => {
        if (isAnimating || currentPage === 0) return
        setFlipDirection('backward')
        setIsAnimating(true)
        setTimeout(() => {
            setCurrentPage(0)
            setIsAnimating(false)
        }, 500)
    }, [isAnimating, currentPage])

    const handleSave = async () => {
        if (!content.trim()) return
        await onSave(content, mood, selectedTags, pageStickers)
        setContent('')
        setSelectedTags([])
        setPageStickers([])
        setMood(5)
        if (textareaRef.current) textareaRef.current.value = ''
    }

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        )
    }

    const handleStickerDrop = useCallback((sticker: Sticker) => {
        const id = `${sticker.id}-${Date.now()}`
        setPageStickers(prev => [...prev, {
            ...sticker,
            stickerId: id,
            x: 15 + Math.random() * 60,
            y: 20 + Math.random() * 50,
            scale: 1,
        }])
    }, [])

    const removeSticker = useCallback((stickerId: string) => {
        setPageStickers(prev => prev.filter(s => s.stickerId !== stickerId))
        setActiveStickerId(null)
    }, [])

    const toggleSection = (s: ToolSection) => {
        setActiveSection(prev => prev === s ? null : s)
    }

    const toolbarWidth = activeSection ? 260 : 52

    return (
        <div style={{
            position: 'relative', width: '100%', height: '100vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            paddingTop: '62px',
        }}>
            {/* Close button */}
            <button onClick={onClose} style={{
                position: 'absolute', top: '70px', left: '20px', zIndex: 60,
                fontFamily: 'var(--font-jost)', fontSize: '11px', letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'var(--text-muted)',
                background: 'none', border: 'none', cursor: 'pointer',
                transition: 'color 0.2s',
                padding: '4px 8px',
            }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >← Close</button>

            {/* Main layout: nav strip | book | toolbar */}
            <div style={{
                flex: 1, display: 'flex', flexDirection: 'row',
                overflow: 'hidden', alignItems: 'stretch',
            }}>

                {/* LEFT NAV STRIP */}
                <div style={{
                    width: '64px', flexShrink: 0,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: '12px', paddingBottom: '20px',
                }}>
                    <NavButton
                        onClick={goBackward}
                        disabled={currentPage <= 0 || isAnimating}
                        label="←"
                        title="Previous page"
                    />
                    <NavButton
                        onClick={goToWritePage}
                        disabled={currentPage === 0 || isAnimating}
                        label="✦"
                        title="New entry"
                        small
                    />
                    <NavButton
                        onClick={goForward}
                        disabled={currentPage >= totalEntries || isAnimating}
                        label="→"
                        title="Next page"
                    />
                    {/* Page counter */}
                    <div style={{
                        marginTop: '8px', textAlign: 'center',
                        fontFamily: 'var(--font-cinzel)', fontSize: '8px',
                        letterSpacing: '0.14em', color: 'var(--text-muted)',
                        lineHeight: 1.6,
                    }}>
                        {isWritePage ? 'new' : `${currentPage}\n/\n${totalEntries}`}
                    </div>
                </div>

                {/* BOOK */}
                <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', padding: '8px 0',
                    transition: 'flex 0.28s ease',
                }}>
                    <div style={{
                        perspective: '1800px', transformStyle: 'preserve-3d',
                        width: '100%', maxWidth: activeSection ? '640px' : '900px',
                        transition: 'max-width 0.28s ease',
                    }}>
                        <div style={{
                            display: 'flex', width: '100%',
                            height: 'min(560px, 74vh)',
                            boxShadow: '0 30px 80px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.4)',
                            borderRadius: '2px 5px 5px 2px',
                            position: 'relative',
                        }}>
                            {/* Spine shadow - subtle, not heavy */}
                            <div style={{
                                position: 'absolute', left: '50%', top: 0, bottom: 0,
                                width: '8px', transform: 'translateX(-50%)',
                                background: 'rgba(0,0,0,0.18)',
                                zIndex: 10, pointerEvents: 'none',
                            }} />

                            {/* LEFT PAGE */}
                            <motion.div
                                key={`left-${currentPage}`}
                                initial={{
                                    rotateY: flipDirection === 'forward' ? -8 : 8,
                                    opacity: 0.7,
                                }}
                                animate={{ rotateY: 0, opacity: 1 }}
                                transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                                style={{
                                    flex: 1, position: 'relative', overflow: 'hidden',
                                    borderRadius: '2px 0 0 2px',
                                    backgroundColor: PAPER_BG,
                                    backgroundImage: `radial-gradient(circle, ${PAPER_DOT} 1px, transparent 1px)`,
                                    backgroundSize: '18px 18px',
                                    transformOrigin: 'right center',
                                }}
                            >
                                <div style={{
                                    padding: '22px 20px 16px 40px', height: '100%',
                                    overflow: 'hidden', boxSizing: 'border-box',
                                    display: 'flex', flexDirection: 'column',
                                }}>
                                    {isWritePage ? (
                                        <IndexPage
                                            entries={entries}
                                            writingFont={writingFont}
                                            onEntryClick={(idx) => {
                                                if (isAnimating) return
                                                setFlipDirection('forward')
                                                setIsAnimating(true)
                                                setTimeout(() => {
                                                    setCurrentPage(idx + 1)
                                                    setIsAnimating(false)
                                                }, 400)
                                            }}
                                        />
                                    ) : leftEntry ? (
                                        <EntryContent entry={leftEntry} writingFont={writingFont} fontSize={fontSize} pageNum={currentPage - 1} />
                                    ) : (
                                        <BlankPage />
                                    )}
                                </div>
                            </motion.div>

                            {/* RIGHT PAGE */}
                            <motion.div
                                key={`right-${currentPage}`}
                                initial={{
                                    rotateY: flipDirection === 'forward' ? 8 : -8,
                                    opacity: 0.7,
                                }}
                                animate={{ rotateY: 0, opacity: 1 }}
                                transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                                style={{
                                    flex: 1, position: 'relative', overflow: 'hidden',
                                    borderRadius: '0 5px 5px 0',
                                    backgroundColor: PAPER_BG,
                                    backgroundImage: `radial-gradient(circle, ${PAPER_DOT} 1px, transparent 1px)`,
                                    backgroundSize: '18px 18px',
                                    transformOrigin: 'left center',
                                }}
                            >
                                {/* Stickers layer */}
                                {isWritePage && pageStickers.map(s => (
                                    <DraggableSticker
                                        key={s.stickerId}
                                        sticker={s}
                                        isActive={activeStickerId === s.stickerId}
                                        onActivate={() => setActiveStickerId(s.stickerId)}
                                        onDeactivate={() => setActiveStickerId(null)}
                                        onRemove={() => removeSticker(s.stickerId)}
                                        onPositionChange={(x, y) => {
                                            setPageStickers(prev => prev.map(ps =>
                                                ps.stickerId === s.stickerId ? { ...ps, x, y } : ps
                                            ))
                                        }}
                                        onScaleChange={(scale) => {
                                            setPageStickers(prev => prev.map(ps =>
                                                ps.stickerId === s.stickerId ? { ...ps, scale } : ps
                                            ))
                                        }}
                                    />
                                ))}

                                <div style={{
                                    padding: '22px 36px 16px 24px', height: '100%',
                                    display: 'flex', flexDirection: 'column',
                                    boxSizing: 'border-box', position: 'relative', zIndex: 10,
                                }}>
                                    {isWritePage ? (
                                        <WritePage
                                            content={content}
                                            setContent={setContent}
                                            mood={mood}
                                            moodInfo={moodInfo}
                                            selectedTags={selectedTags}
                                            toggleTag={toggleTag}
                                            writingFont={writingFont}
                                            fontSize={fontSize}
                                            isSaving={isSaving}
                                            onSave={handleSave}
                                            textareaRef={textareaRef}
                                        />
                                    ) : rightEntry ? (
                                        <EntryContent entry={rightEntry} writingFont={writingFont} fontSize={fontSize} pageNum={currentPage} />
                                    ) : (
                                        <BlankPage />
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* RIGHT TOOLBAR */}
                <div style={{
                    width: `${toolbarWidth}px`, flexShrink: 0,
                    display: 'flex', flexDirection: 'row',
                    overflow: 'hidden',
                    transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
                    borderLeft: '1px solid rgba(212,175,55,0.12)',
                    background: 'rgba(8,4,0,0.72)',
                    backdropFilter: 'blur(32px)',
                }}>
                    {/* Icon strip */}
                    <div style={{
                        width: '52px', flexShrink: 0,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: '4px',
                        padding: '20px 6px 10px',
                        borderRight: activeSection ? '1px solid rgba(212,175,55,0.08)' : 'none',
                    }}>
                        {[
                            { id: 'font' as ToolSection, icon: 'Aa', title: 'Font' },
                            { id: 'size' as ToolSection, icon: 'Sz', title: 'Size' },
                            { id: 'stickers' as ToolSection, icon: '✦', title: 'Stickers' },
                            { id: 'mood' as ToolSection, icon: '◉', title: 'Mood' },
                        ].map(tool => (
                            <motion.button
                                key={tool.id}
                                onClick={() => toggleSection(tool.id)}
                                title={tool.title}
                                whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.93 }}
                                style={{
                                    width: '40px', height: '40px',
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    gap: '2px',
                                    borderRadius: '10px', cursor: 'pointer',
                                    background: activeSection === tool.id ? 'rgba(212,175,55,0.18)' : 'transparent',
                                    border: activeSection === tool.id ? '1px solid rgba(212,175,55,0.38)' : '1px solid transparent',
                                    color: activeSection === tool.id ? 'rgba(212,175,55,0.95)' : 'rgba(212,175,55,0.42)',
                                    transition: 'all 0.15s',
                                }}
                            >
                                <span style={{ fontSize: '11px', fontFamily: 'var(--font-jost)', fontWeight: 600 }}>{tool.icon}</span>
                                <span style={{ fontSize: '7px', fontFamily: 'var(--font-jost)', letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.7 }}>{tool.title}</span>
                            </motion.button>
                        ))}
                    </div>

                    {/* Expanded panel */}
                    <AnimatePresence>
                        {activeSection && (
                            <motion.div
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 208 }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.22 }}
                                style={{
                                    overflow: 'hidden', display: 'flex',
                                    flexDirection: 'column', width: 208,
                                }}
                            >
                                {/* Panel header */}
                                <div style={{
                                    padding: '12px 14px 8px',
                                    borderBottom: '1px solid rgba(212,175,55,0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    flexShrink: 0,
                                }}>
                                    <span style={{
                                        fontFamily: 'var(--font-cinzel)', fontSize: '9px',
                                        letterSpacing: '0.18em', color: 'rgba(212,175,55,0.55)',
                                        textTransform: 'uppercase',
                                    }}>
                                        {activeSection === 'font' && 'Typeface'}
                                        {activeSection === 'size' && 'Text Size'}
                                        {activeSection === 'stickers' && 'Stickers'}
                                        {activeSection === 'mood' && 'Mood'}
                                    </span>
                                    <button onClick={() => setActiveSection(null)} style={{
                                        background: 'rgba(212,175,55,0.08)',
                                        border: '1px solid rgba(212,175,55,0.18)',
                                        borderRadius: '6px', cursor: 'pointer',
                                        width: '20px', height: '20px',
                                        color: 'rgba(212,175,55,0.5)', fontSize: '9px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>✕</button>
                                </div>

                                {/* Panel body */}
                                <div style={{ flex: 1, overflowY: 'auto', padding: activeSection === 'stickers' ? '0' : '8px 12px' }}>
                                    {activeSection === 'font' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingTop: '6px' }}>
                                            {WRITING_FONTS.map(f => (
                                                <button key={f.id} onClick={() => setWritingFontId(f.id)}
                                                    style={{
                                                        textAlign: 'left', padding: '8px 10px', borderRadius: '8px',
                                                        fontFamily: f.family, fontStyle: f.style as any, fontSize: '14px',
                                                        cursor: 'pointer',
                                                        background: writingFontId === f.id ? 'rgba(212,175,55,0.14)' : 'transparent',
                                                        border: writingFontId === f.id ? '1px solid rgba(212,175,55,0.35)' : '1px solid transparent',
                                                        color: writingFontId === f.id ? 'rgba(254,244,228,0.9)' : 'rgba(254,244,228,0.45)',
                                                        transition: 'all 0.12s',
                                                    }}>
                                                    {f.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {activeSection === 'size' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '8px' }}>
                                            {FONT_SIZES.map(fs => (
                                                <button key={fs.id} onClick={() => setFontSizeId(fs.id)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        padding: '9px 10px', borderRadius: '8px', cursor: 'pointer',
                                                        background: fontSizeId === fs.id ? 'rgba(212,175,55,0.14)' : 'transparent',
                                                        border: fontSizeId === fs.id ? '1px solid rgba(212,175,55,0.35)' : '1px solid transparent',
                                                        color: fontSizeId === fs.id ? 'rgba(212,175,55,0.95)' : 'rgba(254,244,228,0.45)',
                                                    }}>
                                                    <span style={{ fontFamily: writingFont.family, fontSize: fs.px, lineHeight: 1 }}>{fs.label}</span>
                                                    <span style={{ fontFamily: 'var(--font-jost)', fontSize: '9px', opacity: 0.5 }}>{fs.px}</span>
                                                </button>
                                            ))}
                                            <div style={{
                                                marginTop: '10px', padding: '10px', borderRadius: '10px',
                                                background: PAPER_BG, border: `1px solid ${PAPER_BORDER}`,
                                            }}>
                                                <p style={{
                                                    fontFamily: writingFont.family, fontStyle: writingFont.style as any,
                                                    fontSize: fontSize.px, lineHeight: fontSize.lh,
                                                    color: PAPER_TEXT, margin: 0,
                                                }}>The quick brown fox</p>
                                            </div>
                                        </div>
                                    )}
                                    {activeSection === 'stickers' && (
                                        <div style={{ padding: '8px 10px', height: '100%', minHeight: '380px', display: 'flex', flexDirection: 'column' }}>
                                            <JournalStickers onSelect={handleStickerDrop} onClose={() => setActiveSection(null)} />
                                        </div>
                                    )}
                                    {activeSection === 'mood' && (
                                        <div style={{ paddingTop: '10px' }}>
                                            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                                                <div style={{
                                                    fontFamily: writingFont.family, fontStyle: 'italic' as any,
                                                    fontSize: '3rem', color: moodInfo.color, lineHeight: 1, marginBottom: '4px',
                                                }}>{mood}</div>
                                                <div style={{
                                                    fontFamily: 'var(--font-cinzel)', fontSize: '9px',
                                                    letterSpacing: '0.2em', color: moodInfo.color, textTransform: 'uppercase',
                                                }}>{moodInfo.label}</div>
                                            </div>
                                            <input type="range" min={1} max={10} value={mood}
                                                onChange={e => setMood(+e.target.value)}
                                                className="mood-slider"
                                                style={{ width: '100%', marginBottom: '14px', cursor: 'pointer' }} />
                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                {Object.entries(MOOD_LABELS).map(([k, v]) => (
                                                    <button key={k}
                                                        onClick={() => setMood(Number(k))}
                                                        title={v.label}
                                                        style={{
                                                            width: '20px', height: '20px', borderRadius: '50%',
                                                            background: v.color, cursor: 'pointer',
                                                            border: mood === Number(k) ? '2.5px solid white' : '1.5px solid transparent',
                                                            transform: mood === Number(k) ? 'scale(1.22)' : 'scale(1)',
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

// ── INDEX PAGE ──────────────────────────────────────────────────────────────
function IndexPage({ entries, writingFont, onEntryClick }: {
    entries: JournalEntry[]
    writingFont: typeof WRITING_FONTS[0]
    onEntryClick: (idx: number) => void
}) {
    return (
        <>
            <div style={{
                fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.22em',
                color: PAPER_MUTED, textTransform: 'uppercase', marginBottom: '14px',
                paddingBottom: '8px', borderBottom: `0.5px solid ${PAPER_BORDER}`,
            }}>Index of Entries</div>

            {entries.length === 0 ? (
                <div style={{
                    fontFamily: writingFont.family, fontStyle: writingFont.style as any,
                    fontSize: '14px', color: PAPER_MUTED, lineHeight: 1.8, marginTop: '18px',
                }}>
                    Your first entry awaits.<br />Begin writing on the right page →
                </div>
            ) : (
                <div style={{
                    display: 'flex', flexDirection: 'column', gap: '6px',
                    overflow: 'hidden', maxHeight: 'calc(100% - 50px)',
                }}>
                    {entries.slice(0, 16).map((entry, i) => (
                        <motion.button
                            key={entry.id}
                            onClick={() => onEntryClick(i)}
                            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.025 }}
                            whileHover={{ x: 3 }}
                            style={{
                                textAlign: 'left', background: 'none', border: 'none',
                                cursor: 'pointer', padding: '3px 6px',
                                borderRadius: '3px',
                                borderLeft: `2px solid ${PAPER_BORDER}`,
                            }}>
                            <div style={{
                                fontFamily: 'var(--font-cinzel)', fontSize: '7.5px',
                                letterSpacing: '0.1em', color: PAPER_MUTED, marginBottom: '1px',
                            }}>
                                {format(new Date(entry.created_at), 'MMM d, yyyy')}
                                {entry.mood_score && (
                                    <span style={{ marginLeft: '6px', color: MOOD_LABELS[entry.mood_score]?.color }}>
                                        · {MOOD_LABELS[entry.mood_score]?.label}
                                    </span>
                                )}
                            </div>
                            <div style={{
                                fontFamily: writingFont.family, fontStyle: writingFont.style as any,
                                fontSize: '12px', color: PAPER_TEXT, opacity: 0.75,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{entry.content.slice(0, 48)}…</div>
                        </motion.button>
                    ))}
                </div>
            )}
            <div style={{
                position: 'absolute', bottom: '14px', left: '50%',
                transform: 'translateX(-50%)',
                fontFamily: 'var(--font-cinzel)', fontSize: '8px', color: PAPER_MUTED,
            }}>i</div>
        </>
    )
}

// ── WRITE PAGE ──────────────────────────────────────────────────────────────
function WritePage({
    content, setContent, mood, moodInfo, selectedTags, toggleTag,
    writingFont, fontSize, isSaving, onSave, textareaRef
}: {
    content: string
    setContent: (v: string) => void
    mood: number
    moodInfo: { label: string; color: string }
    selectedTags: string[]
    toggleTag: (tag: string) => void
    writingFont: typeof WRITING_FONTS[0]
    fontSize: typeof FONT_SIZES[0]
    isSaving: boolean
    onSave: () => void
    textareaRef: React.RefObject<HTMLTextAreaElement>
}) {
    return (
        <>
            {/* Date + mood line */}
            <div style={{
                marginBottom: '8px', paddingBottom: '8px',
                borderBottom: `0.5px solid ${PAPER_BORDER}`, flexShrink: 0,
            }}>
                <div style={{
                    fontFamily: 'var(--font-cinzel)', fontSize: '8px',
                    letterSpacing: '0.18em', color: PAPER_MUTED, textTransform: 'uppercase',
                }}>
                    {format(new Date(), 'EEEE, MMMM d yyyy')}
                    <span style={{ marginLeft: '8px', color: moodInfo.color }}>· {moodInfo.label}</span>
                </div>
            </div>

            {/* Tags */}
            <div style={{
                display: 'flex', gap: '4px', flexWrap: 'wrap',
                marginBottom: '8px', flexShrink: 0,
            }}>
                {(['Anxious', 'Calm', 'Hopeful', 'Tired', 'Grateful', 'Overwhelmed', 'Content', 'Melancholy', 'Excited', 'Conflicted', 'Tender', 'Resolved']).map(t => {
                    const selected = selectedTags.includes(t)
                    return (
                        <button
                            key={t}
                            type="button"
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                toggleTag(t)
                            }}
                            style={{
                                padding: '2px 7px', borderRadius: '10px',
                                fontSize: '9px', fontFamily: 'var(--font-jost)',
                                cursor: 'pointer',
                                userSelect: 'none',
                                WebkitUserSelect: 'none',
                                background: selected ? 'rgba(180,130,60,0.18)' : 'transparent',
                                border: selected
                                    ? `1px solid rgba(180,130,60,0.4)`
                                    : `1px solid ${PAPER_BORDER}`,
                                color: selected ? PAPER_TEXT : PAPER_MUTED,
                                transition: 'all 0.14s',
                            }}
                        >{t}</button>
                    )
                })}
            </div>

            {/* Textarea */}
            <textarea
                ref={textareaRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Begin writing here…"
                style={{
                    flex: 1, width: '100%', minHeight: '80px',
                    background: 'transparent', border: 'none', outline: 'none',
                    resize: 'none',
                    fontFamily: writingFont.family,
                    fontStyle: writingFont.style as any,
                    fontSize: fontSize.px, lineHeight: fontSize.lh,
                    color: PAPER_TEXT,
                    caretColor: 'rgba(100,60,10,0.9)',
                    overflowY: 'auto',
                    boxSizing: 'border-box',
                    WebkitUserSelect: 'text' as any,
                    userSelect: 'text' as any,
                    cursor: 'text',
                    zIndex: 20, position: 'relative',
                }}
            />

            {/* Footer bar */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginTop: '8px', paddingTop: '7px',
                borderTop: `0.5px solid ${PAPER_BORDER}`, flexShrink: 0,
            }}>
                <span style={{
                    fontFamily: 'var(--font-cinzel)', fontSize: '8px',
                    color: PAPER_MUTED, letterSpacing: '0.1em',
                }}>
                    {content.length > 0
                        ? `${content.split(/\s+/).filter(Boolean).length} words`
                        : 'empty page'}
                </span>

                <motion.button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onSave()
                    }}
                    disabled={isSaving || !content.trim()}
                    whileHover={{ scale: content.trim() && !isSaving ? 1.04 : 1 }}
                    whileTap={{ scale: content.trim() && !isSaving ? 0.96 : 1 }}
                    style={{
                        padding: '6px 18px', borderRadius: '22px',
                        fontFamily: 'var(--font-cinzel)', fontSize: '9px',
                        letterSpacing: '0.16em', textTransform: 'uppercase',
                        cursor: content.trim() && !isSaving ? 'pointer' : 'not-allowed',
                        background: 'rgba(180,130,60,0.18)',
                        border: '1px solid rgba(180,130,60,0.4)',
                        color: PAPER_TEXT,
                        opacity: !content.trim() || isSaving ? 0.38 : 1,
                        transition: 'all 0.18s',
                        userSelect: 'none',
                    }}
                >
                    {isSaving ? 'Saving…' : 'Save Entry ✦'}
                </motion.button>
            </div>
        </>
    )
}

// ── ENTRY CONTENT PAGE ──────────────────────────────────────────────────────
function EntryContent({ entry, writingFont, fontSize, pageNum }: {
    entry: JournalEntry
    writingFont: typeof WRITING_FONTS[0]
    fontSize: typeof FONT_SIZES[0]
    pageNum: number
}) {
    const moodInfo = entry.mood_score ? MOOD_LABELS[entry.mood_score] : null
    return (
        <>
            <div style={{
                marginBottom: '10px', paddingBottom: '8px',
                borderBottom: `0.5px solid ${PAPER_BORDER}`, flexShrink: 0,
            }}>
                <div style={{
                    fontFamily: 'var(--font-cinzel)', fontSize: '8px',
                    letterSpacing: '0.18em', color: PAPER_MUTED, textTransform: 'uppercase',
                }}>
                    {format(new Date(entry.created_at), 'EEEE, MMMM d yyyy')}
                    {moodInfo && (
                        <span style={{ marginLeft: '8px', color: moodInfo.color }}>
                            · {moodInfo.label}
                        </span>
                    )}
                </div>
                {entry.tags && entry.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                        {entry.tags.map(t => (
                            <span key={t} style={{
                                padding: '1px 6px', borderRadius: '8px', fontSize: '8px',
                                fontFamily: 'var(--font-jost)',
                                background: 'transparent', border: `1px solid ${PAPER_BORDER}`,
                                color: PAPER_MUTED,
                            }}>{t}</span>
                        ))}
                    </div>
                )}
            </div>
            <div style={{
                fontFamily: writingFont.family, fontStyle: writingFont.style as any,
                fontSize: fontSize.px, lineHeight: fontSize.lh, color: PAPER_TEXT,
                overflow: 'auto', flex: 1,
                WebkitUserSelect: 'text' as any, userSelect: 'text' as any,
            }}>{entry.content}</div>
            <div style={{
                position: 'absolute', bottom: '14px', right: '20px',
                fontFamily: 'var(--font-cinzel)', fontSize: '8px', color: PAPER_MUTED,
            }}>{pageNum}</div>
        </>
    )
}

// ── BLANK PAGE ──────────────────────────────────────────────────────────────
function BlankPage() {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', opacity: 0.1,
        }}>
            <span style={{ fontSize: '40px', color: PAPER_MUTED }}>✦</span>
        </div>
    )
}

// ── NAV BUTTON ──────────────────────────────────────────────────────────────
function NavButton({ onClick, disabled, label, title, small }: {
    onClick: () => void
    disabled: boolean
    label: string
    title: string
    small?: boolean
}) {
    return (
        <motion.button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            whileHover={{ scale: disabled ? 1 : 1.08 }}
            whileTap={{ scale: disabled ? 1 : 0.92 }}
            style={{
                width: small ? '36px' : '44px',
                height: small ? '36px' : '44px',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-cinzel)',
                fontSize: small ? '12px' : '18px',
                cursor: disabled ? 'default' : 'pointer',
                background: disabled ? 'rgba(212,175,55,0.04)' : 'rgba(212,175,55,0.1)',
                border: disabled ? '1px solid rgba(212,175,55,0.1)' : '1px solid rgba(212,175,55,0.28)',
                color: disabled ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.8)',
                transition: 'all 0.18s',
                userSelect: 'none',
            }}
        >
            {label}
        </motion.button>
    )
}

// ── DRAGGABLE STICKER ───────────────────────────────────────────────────────
function DraggableSticker({ sticker, isActive, onActivate, onDeactivate, onRemove, onPositionChange, onScaleChange }: {
    sticker: PlacedSticker
    isActive: boolean
    onActivate: () => void
    onDeactivate: () => void
    onRemove: () => void
    onPositionChange: (x: number, y: number) => void
    onScaleChange: (scale: number) => void
}) {
    const ref = useRef<HTMLDivElement>(null)
    const [dragging, setDragging] = useState(false)
    const dragStart = useRef<{ mx: number; my: number; sx: number; sy: number } | null>(null)

    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault()
        e.stopPropagation()
        onActivate()
        setDragging(true)
        dragStart.current = { mx: e.clientX, my: e.clientY, sx: sticker.x, sy: sticker.y }

        const handleMove = (ev: PointerEvent) => {
            if (!dragStart.current || !ref.current) return
            const parent = ref.current.closest('[data-page]') as HTMLElement
            if (!parent) return
            const rect = parent.getBoundingClientRect()
            const dx = ((ev.clientX - dragStart.current.mx) / rect.width) * 100
            const dy = ((ev.clientY - dragStart.current.my) / rect.height) * 100
            const newX = Math.max(2, Math.min(88, dragStart.current.sx + dx))
            const newY = Math.max(2, Math.min(88, dragStart.current.sy + dy))
            onPositionChange(newX, newY)
        }

        const handleUp = () => {
            setDragging(false)
            dragStart.current = null
            document.removeEventListener('pointermove', handleMove)
            document.removeEventListener('pointerup', handleUp)
        }

        document.addEventListener('pointermove', handleMove)
        document.addEventListener('pointerup', handleUp)
    }

    return (
        <div
            ref={ref}
            data-sticker-id={sticker.stickerId}
            onPointerDown={handlePointerDown}
            onWheel={(e) => {
                e.stopPropagation()
                const delta = e.deltaY > 0 ? -0.1 : 0.1
                onScaleChange(Math.max(0.3, Math.min(3, sticker.scale + delta)))
            }}
            style={{
                position: 'absolute',
                left: `${sticker.x}%`,
                top: `${sticker.y}%`,
                zIndex: isActive ? 50 : 15,
                cursor: dragging ? 'grabbing' : 'grab',
                userSelect: 'none',
                touchAction: 'none',
                WebkitUserSelect: 'none',
            }}
        >
            <div style={{ position: 'relative', display: 'inline-flex' }}>
                <img
                    src={sticker.url}
                    alt={sticker.label}
                    width={60 * sticker.scale}
                    height={60 * sticker.scale}
                    style={{
                        display: 'block',
                        objectFit: 'contain',
                        transform: `rotate(${sticker.rotation || 0}deg)`,
                        filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.35)) drop-shadow(0 0 3px white)',
                        pointerEvents: 'none',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                    }}
                    draggable={false}
                />
                {/* Delete button - always visible, large, obvious */}
                <button
                    onPointerDown={(e) => { e.stopPropagation(); e.preventDefault() }}
                    onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        onRemove()
                    }}
                    style={{
                        position: 'absolute', top: '-12px', right: '-12px',
                        width: '24px', height: '24px', borderRadius: '50%',
                        background: 'rgba(220,38,38,0.92)',
                        border: '2px solid white',
                        cursor: 'pointer', zIndex: 100,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', color: 'white', fontWeight: 700,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                        userSelect: 'none',
                    }}
                    title="Remove sticker"
                >✕</button>
                {/* Scroll hint */}
                {isActive && (
                    <div style={{
                        position: 'absolute', bottom: '-18px', left: '50%',
                        transform: 'translateX(-50%)',
                        fontFamily: 'var(--font-jost)', fontSize: '7px',
                        color: 'rgba(100,60,10,0.6)', whiteSpace: 'nowrap',
                        pointerEvents: 'none', background: 'rgba(255,245,220,0.8)',
                        padding: '1px 5px', borderRadius: '4px',
                    }}>scroll to resize</div>
                )}
            </div>
        </div>
    )
}