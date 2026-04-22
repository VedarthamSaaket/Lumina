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

const WRITING_FONTS = [
    { id: 'garamond', label: 'EB Garamond', family: "'EB Garamond', serif", style: 'italic' },
    { id: 'cormorant', label: 'Cormorant', family: "'Cormorant Garamond', serif", style: 'italic' },
    { id: 'playfair', label: 'Playfair Display', family: "'Playfair Display', serif", style: 'italic' },
    { id: 'baskerville', label: 'Baskerville', family: "'Baskerville Old Face', Baskerville, serif", style: 'italic' },
    { id: 'tangerine', label: 'Tangerine', family: "'Tangerine', cursive", style: 'normal' },
    { id: 'dancing', label: 'Dancing Script', family: "'Dancing Script', cursive", style: 'normal' },
    { id: 'josefin', label: 'Josefin Sans', family: "'Josefin Sans', sans-serif", style: 'normal' },
    { id: 'fraunces', label: 'Fraunces', family: "'Fraunces', serif", style: 'italic' },
    { id: 'crimson', label: 'Crimson Pro', family: "'Crimson Pro', serif", style: 'italic' },
    { id: 'philosopher', label: 'Philosopher', family: "'Philosopher', serif", style: 'italic' },
    { id: 'spectral', label: 'Spectral', family: "'Spectral', serif", style: 'italic' },
    { id: 'lora', label: 'Lora', family: "'Lora', serif", style: 'italic' },
]

// Font weight/style options instead of size
const FONT_STYLES = [
    { id: 'title', label: 'Title', weight: '700', style: 'normal', size: '22px', lh: '32px' },
    { id: 'heading', label: 'Heading', weight: '600', style: 'normal', size: '18px', lh: '28px' },
    { id: 'subheading', label: 'Sub', weight: '500', style: 'normal', size: '15px', lh: '24px' },
    { id: 'bold', label: 'Bold', weight: '700', style: 'normal', size: '14px', lh: '22px' },
    { id: 'regular', label: 'Regular', weight: '400', style: 'normal', size: '14px', lh: '24px' },
    { id: 'italic', label: 'Italic', weight: '400', style: 'italic', size: '14px', lh: '24px' },
    { id: 'light', label: 'Light', weight: '300', style: 'italic', size: '14px', lh: '24px' },
    { id: 'small', label: 'Caption', weight: '400', style: 'normal', size: '11px', lh: '18px' },
]

// Sticker pack names - folders are named "pack 1", "pack 2", etc. up to "pack 23"
const PACK_NAMES: Record<string, string> = {
    'pack 1': 'Animals',
    'pack 2': 'Art',
    'pack 3': 'Astrology',
    'pack 4': 'Books',
    'pack 5': 'Botanical',
    'pack 6': 'Café',
    'pack 7': 'Cats',
    'pack 8': 'Celestial',
    'pack 9': 'Cottagecore',
    'pack 10': 'Academia',
    'pack 11': 'Dreams',
    'pack 12': 'Emotions',
    'pack 13': 'Fantasy',
    'pack 14': 'Floral',
    'pack 15': 'Food',
    'pack 16': 'Gothic',
    'pack 17': 'Hearts',
    'pack 18': 'Kawaii',
    'pack 19': 'Mindful',
    'pack 20': 'Music',
    'pack 21': 'Nature',
    'pack 22': 'Stars',
    'pack 23': 'Vintage',
}

const PACK_COLORS: string[] = [
    '#7a9e7e', '#9b7fd4', '#8b7355', '#c4913a', '#7a9e7e',
    '#8b7355', '#c9897a', '#9b7fd4', '#7a9e7e', '#8b7355',
    '#9b7fd4', '#d4af37', '#9b7fd4', '#c9897a', '#c4913a',
    '#8b7355', '#c9897a', '#c9897a', '#9b7fd4', '#d4af37',
    '#7a9e7e', '#d4af37', '#8b7355',
]

// Book paper
const PAPER_BG = '#f5ead0'
const PAPER_TEXT = 'rgba(35,20,5,0.88)'
const PAPER_MUTED = 'rgba(100,70,30,0.5)'
const PAPER_BORDER = 'rgba(180,140,80,0.22)'
const PAPER_DOT = 'rgba(0,0,0,0.12)'

type ToolSection = 'font' | 'style' | 'stickers' | null

export default function OpenBook({ entries, onSave, onClose, isSaving }: OpenBookProps) {
    const [currentPage, setCurrentPage] = useState(0)
    const [flipDirection, setFlipDirection] = useState<'forward' | 'backward'>('forward')
    const [isAnimating, setIsAnimating] = useState(false)
    // Toolbar open by default
    const [activeSection, setActiveSection] = useState<ToolSection>('font')

    const [content, setContent] = useState('')
    const [mood, setMood] = useState(5)
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [pageStickers, setPageStickers] = useState<PlacedSticker[]>([])
    const [activeStickerId, setActiveStickerId] = useState<string | null>(null)

    const [writingFontId, setWritingFontId] = useState('garamond')
    const [fontStyleId, setFontStyleId] = useState('regular')

    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const writingFont = WRITING_FONTS.find(f => f.id === writingFontId) || WRITING_FONTS[0]
    const fontStyle = FONT_STYLES.find(f => f.id === fontStyleId) || FONT_STYLES[4]
    const moodInfo = MOOD_LABELS[mood] || MOOD_LABELS[5]

    const isWritePage = currentPage === 0
    const totalEntries = entries.length

    const leftEntry = currentPage > 1 ? entries[currentPage - 2] : null
    const rightEntry = !isWritePage ? entries[currentPage - 1] : null

    const goForward = useCallback(() => {
        if (isAnimating || currentPage >= totalEntries) return
        setFlipDirection('forward')
        setIsAnimating(true)
        setTimeout(() => { setCurrentPage(p => p + 1); setIsAnimating(false) }, 400)
    }, [isAnimating, currentPage, totalEntries])

    const goBackward = useCallback(() => {
        if (isAnimating || currentPage <= 0) return
        setFlipDirection('backward')
        setIsAnimating(true)
        setTimeout(() => { setCurrentPage(p => p - 1); setIsAnimating(false) }, 400)
    }, [isAnimating, currentPage])

    const goToWritePage = useCallback(() => {
        if (isAnimating || currentPage === 0) return
        setFlipDirection('backward')
        setIsAnimating(true)
        setTimeout(() => { setCurrentPage(0); setIsAnimating(false) }, 400)
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
        setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
    }

    const handleStickerDrop = useCallback((sticker: Sticker) => {
        const id = `${sticker.id}-${Date.now()}`
        setPageStickers(prev => [...prev, {
            ...sticker, stickerId: id,
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

    const TOOLBAR_WIDTH = 280

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
                transition: 'color 0.2s', padding: '4px 8px',
            }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >← Close</button>

            {/* Main layout: nav strip | book (shifts left) | toolbar */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', alignItems: 'stretch' }}>

                {/* LEFT NAV STRIP */}
                <div style={{
                    width: '64px', flexShrink: 0,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: '12px', paddingBottom: '20px',
                }}>
                    <NavButton onClick={goBackward} disabled={currentPage <= 0 || isAnimating} label="←" title="Previous page" />
                    <NavButton onClick={goToWritePage} disabled={currentPage === 0 || isAnimating} label="✦" title="New entry" small />
                    <NavButton onClick={goForward} disabled={currentPage >= totalEntries || isAnimating} label="→" title="Next page" />
                    <div style={{
                        marginTop: '8px', textAlign: 'center',
                        fontFamily: 'var(--font-cinzel)', fontSize: '8px',
                        letterSpacing: '0.14em', color: 'var(--text-muted)', lineHeight: 1.6,
                    }}>
                        {isWritePage ? 'new' : `${currentPage} / ${totalEntries}`}
                    </div>
                </div>

                {/* BOOK — shifts left when toolbar open, maintaining full size */}
                <motion.div
                    animate={{ x: activeSection ? -40 : 0 }}
                    transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                    style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'visible', padding: '8px 0',
                        minWidth: 0,
                    }}
                >
                    <div style={{ perspective: '1800px', transformStyle: 'preserve-3d', width: '100%', maxWidth: '900px' }}>
                        <div style={{
                            display: 'flex', width: '100%',
                            height: 'min(560px, 74vh)',
                            boxShadow: '0 30px 80px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.4)',
                            borderRadius: '2px 5px 5px 2px', position: 'relative',
                        }}>
                            {/* Spine shadow */}
                            <div style={{
                                position: 'absolute', left: '50%', top: 0, bottom: 0,
                                width: '8px', transform: 'translateX(-50%)',
                                background: 'rgba(0,0,0,0.18)', zIndex: 10, pointerEvents: 'none',
                            }} />

                            {/* LEFT PAGE */}
                            <motion.div
                                key={`left-${currentPage}`}
                                initial={{ rotateY: flipDirection === 'forward' ? -8 : 8, opacity: 0.7 }}
                                animate={{ rotateY: 0, opacity: 1 }}
                                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                                style={{
                                    flex: 1, position: 'relative', overflow: 'hidden',
                                    borderRadius: '2px 0 0 2px',
                                    backgroundColor: PAPER_BG,
                                    backgroundImage: `radial-gradient(circle, ${PAPER_DOT} 1px, transparent 1px)`,
                                    backgroundSize: '18px 18px',
                                    transformOrigin: 'right center',
                                }}
                            >
                                <div style={{ padding: '22px 20px 16px 40px', height: '100%', overflow: 'hidden', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                                    {isWritePage ? (
                                        <IndexPage entries={entries} writingFont={writingFont}
                                            onEntryClick={(idx) => {
                                                if (isAnimating) return
                                                setFlipDirection('forward')
                                                setIsAnimating(true)
                                                setTimeout(() => { setCurrentPage(idx + 1); setIsAnimating(false) }, 400)
                                            }} />
                                    ) : leftEntry ? (
                                        <EntryContent entry={leftEntry} writingFont={writingFont} fontStyle={fontStyle} pageNum={currentPage - 1} />
                                    ) : <BlankPage />}
                                </div>
                            </motion.div>

                            {/* RIGHT PAGE */}
                            <motion.div
                                key={`right-${currentPage}`}
                                initial={{ rotateY: flipDirection === 'forward' ? 8 : -8, opacity: 0.7 }}
                                animate={{ rotateY: 0, opacity: 1 }}
                                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                                style={{
                                    flex: 1, position: 'relative', overflow: 'hidden',
                                    borderRadius: '0 5px 5px 0',
                                    backgroundColor: PAPER_BG,
                                    backgroundImage: `radial-gradient(circle, ${PAPER_DOT} 1px, transparent 1px)`,
                                    backgroundSize: '18px 18px',
                                    transformOrigin: 'left center',
                                }}
                            >
                                {isWritePage && pageStickers.map(s => (
                                    <DraggableSticker key={s.stickerId} sticker={s}
                                        isActive={activeStickerId === s.stickerId}
                                        onActivate={() => setActiveStickerId(s.stickerId)}
                                        onDeactivate={() => setActiveStickerId(null)}
                                        onRemove={() => removeSticker(s.stickerId)}
                                        onPositionChange={(x, y) => setPageStickers(prev => prev.map(ps => ps.stickerId === s.stickerId ? { ...ps, x, y } : ps))}
                                        onScaleChange={(scale) => setPageStickers(prev => prev.map(ps => ps.stickerId === s.stickerId ? { ...ps, scale } : ps))}
                                    />
                                ))}

                                <div style={{ padding: '22px 36px 16px 24px', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', position: 'relative', zIndex: 10 }}>
                                    {isWritePage ? (
                                        <WritePage
                                            content={content} setContent={setContent}
                                            mood={mood} moodInfo={moodInfo}
                                            selectedTags={selectedTags} toggleTag={toggleTag}
                                            writingFont={writingFont} fontStyle={fontStyle}
                                            isSaving={isSaving} onSave={handleSave}
                                            textareaRef={textareaRef}
                                        />
                                    ) : rightEntry ? (
                                        <EntryContent entry={rightEntry} writingFont={writingFont} fontStyle={fontStyle} pageNum={currentPage} />
                                    ) : <BlankPage />}
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>

                {/* RIGHT TOOLBAR — always present, sections toggle */}
                <div style={{
                    width: `${TOOLBAR_WIDTH}px`, flexShrink: 0,
                    display: 'flex', flexDirection: 'row', overflow: 'hidden',
                    borderLeft: '1px solid rgba(212,175,55,0.14)',
                    background: 'rgba(8,4,0,0.78)',
                    backdropFilter: 'blur(40px)',
                }}>
                    {/* Icon strip */}
                    <div style={{
                        width: '52px', flexShrink: 0,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: '4px',
                        padding: '20px 6px 10px',
                        borderRight: '1px solid rgba(212,175,55,0.08)',
                    }}>
                        {[
                            { id: 'font' as ToolSection, icon: 'Aa', title: 'Font' },
                            { id: 'style' as ToolSection, icon: 'Bb', title: 'Style' },
                            { id: 'stickers' as ToolSection, icon: '✦', title: 'Stickers' },
                        ].map(tool => (
                            <motion.button key={tool.id} onClick={() => toggleSection(tool.id)}
                                title={tool.title} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.93 }}
                                style={{
                                    width: '40px', height: '40px', display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center', gap: '2px',
                                    borderRadius: '10px', cursor: 'pointer',
                                    background: activeSection === tool.id ? 'rgba(212,175,55,0.18)' : 'transparent',
                                    border: activeSection === tool.id ? '1px solid rgba(212,175,55,0.38)' : '1px solid transparent',
                                    color: activeSection === tool.id ? 'rgba(212,175,55,0.95)' : 'rgba(212,175,55,0.42)',
                                    transition: 'all 0.15s',
                                }}>
                                <span style={{ fontSize: '11px', fontFamily: 'var(--font-jost)', fontWeight: 600 }}>{tool.icon}</span>
                                <span style={{ fontSize: '7px', fontFamily: 'var(--font-jost)', letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.7 }}>{tool.title}</span>
                            </motion.button>
                        ))}

                        {/* Mood indicator button (not a section, just shows current mood) */}
                        <div style={{
                            width: '40px', height: '40px', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', gap: '2px', borderRadius: '10px',
                            border: '1px solid transparent', marginTop: '4px',
                        }}>
                            <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: moodInfo.color, boxShadow: `0 0 8px ${moodInfo.color}80` }} />
                            <span style={{ fontSize: '7px', fontFamily: 'var(--font-jost)', letterSpacing: '0.06em', textTransform: 'uppercase', color: moodInfo.color, opacity: 0.8 }}>{mood}</span>
                        </div>
                    </div>

                    {/* Expanded panel */}
                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <AnimatePresence mode="wait">
                            {activeSection === 'font' && (
                                <motion.div key="font-panel"
                                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.18 }}
                                    style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                    <PanelHeader title="Typeface" onClose={() => setActiveSection(null)} />
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingTop: '4px' }}>
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
                                    </div>
                                </motion.div>
                            )}
                            {activeSection === 'style' && (
                                <motion.div key="style-panel"
                                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.18 }}
                                    style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                    <PanelHeader title="Text Style" onClose={() => setActiveSection(null)} />
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '6px' }}>
                                            {FONT_STYLES.map(fs => (
                                                <button key={fs.id} onClick={() => setFontStyleId(fs.id)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        padding: '9px 10px', borderRadius: '8px', cursor: 'pointer',
                                                        background: fontStyleId === fs.id ? 'rgba(212,175,55,0.14)' : 'transparent',
                                                        border: fontStyleId === fs.id ? '1px solid rgba(212,175,55,0.35)' : '1px solid transparent',
                                                        color: fontStyleId === fs.id ? 'rgba(212,175,55,0.95)' : 'rgba(254,244,228,0.45)',
                                                    }}>
                                                    <span style={{
                                                        fontFamily: writingFont.family,
                                                        fontWeight: fs.weight, fontStyle: fs.style as any,
                                                        fontSize: Math.min(parseInt(fs.size), 16) + 'px', lineHeight: 1,
                                                    }}>{fs.label}</span>
                                                    <span style={{ fontFamily: 'var(--font-jost)', fontSize: '9px', opacity: 0.4 }}>
                                                        {fs.weight === '700' ? 'Bold' : fs.weight === '300' ? 'Light' : 'Normal'} {fs.style === 'italic' ? '/ Italic' : ''}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            {activeSection === 'stickers' && (
                                <motion.div key="stickers-panel"
                                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.18 }}
                                    style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                    <PanelHeader title="Stickers" onClose={() => setActiveSection(null)} />
                                    <div style={{ padding: '8px 10px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                        <JournalStickers onSelect={handleStickerDrop} onClose={() => setActiveSection(null)} />
                                    </div>
                                </motion.div>
                            )}
                            {!activeSection && (
                                <motion.div key="empty-panel"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: 0.3 }}>
                                    <span style={{ fontSize: '20px', color: 'rgba(212,175,55,0.5)' }}>✦</span>
                                    <span style={{ fontFamily: 'var(--font-jost)', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(212,175,55,0.4)' }}>Tools</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* MOOD SLIDER — below the book */}
            {isWritePage && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    style={{
                        flexShrink: 0, padding: '10px 80px 14px 80px',
                        display: 'flex', alignItems: 'center', gap: '20px',
                        borderTop: '1px solid rgba(212,175,55,0.1)',
                        background: 'rgba(8,4,0,0.6)',
                        backdropFilter: 'blur(20px)',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                        <span style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(212,175,55,0.45)' }}>Mood</span>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: moodInfo.color, boxShadow: `0 0 8px ${moodInfo.color}80`, transition: 'background 0.3s' }} />
                        <span style={{ fontFamily: 'var(--font-jost)', fontSize: '11px', color: moodInfo.color, minWidth: '60px', transition: 'color 0.3s' }}>{moodInfo.label}</span>
                    </div>
                    <input type="range" min={1} max={10} value={mood}
                        onChange={e => setMood(+e.target.value)}
                        className="mood-slider"
                        style={{ flex: 1, cursor: 'pointer' }} />
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 300, color: moodInfo.color, minWidth: '24px', textAlign: 'right', lineHeight: 1, transition: 'color 0.3s' }}>{mood}</span>
                </motion.div>
            )}
        </div>
    )
}

function PanelHeader({ title, onClose }: { title: string; onClose: () => void }) {
    return (
        <div style={{
            padding: '12px 14px 8px', borderBottom: '1px solid rgba(212,175,55,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
            <span style={{ fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.18em', color: 'rgba(212,175,55,0.55)', textTransform: 'uppercase' }}>{title}</span>
            <button onClick={onClose} style={{
                background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.18)',
                borderRadius: '6px', cursor: 'pointer', width: '20px', height: '20px',
                color: 'rgba(212,175,55,0.5)', fontSize: '9px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
        </div>
    )
}

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
                <div style={{ fontFamily: writingFont.family, fontStyle: writingFont.style as any, fontSize: '14px', color: PAPER_MUTED, lineHeight: 1.8, marginTop: '18px' }}>
                    Your first entry awaits.<br />Begin writing on the right page →
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflow: 'hidden', maxHeight: 'calc(100% - 50px)' }}>
                    {entries.slice(0, 16).map((entry, i) => (
                        <motion.button key={entry.id} onClick={() => onEntryClick(i)}
                            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.025 }} whileHover={{ x: 3 }}
                            style={{
                                textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                                padding: '3px 6px', borderRadius: '3px', borderLeft: `2px solid ${PAPER_BORDER}`,
                            }}>
                            <div style={{ fontFamily: 'var(--font-cinzel)', fontSize: '7.5px', letterSpacing: '0.1em', color: PAPER_MUTED, marginBottom: '1px' }}>
                                {format(new Date(entry.created_at), 'MMM d, yyyy')}
                                {entry.mood_score && <span style={{ marginLeft: '6px', color: MOOD_LABELS[entry.mood_score]?.color }}>· {MOOD_LABELS[entry.mood_score]?.label}</span>}
                            </div>
                            <div style={{ fontFamily: writingFont.family, fontStyle: writingFont.style as any, fontSize: '12px', color: PAPER_TEXT, opacity: 0.75, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {entry.content.slice(0, 48)}…
                            </div>
                        </motion.button>
                    ))}
                </div>
            )}
            <div style={{ position: 'absolute', bottom: '14px', left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--font-cinzel)', fontSize: '8px', color: PAPER_MUTED }}>i</div>
        </>
    )
}

function WritePage({ content, setContent, mood, moodInfo, selectedTags, toggleTag, writingFont, fontStyle, isSaving, onSave, textareaRef }: {
    content: string
    setContent: (v: string) => void
    mood: number
    moodInfo: { label: string; color: string }
    selectedTags: string[]
    toggleTag: (tag: string) => void
    writingFont: typeof WRITING_FONTS[0]
    fontStyle: typeof FONT_STYLES[0]
    isSaving: boolean
    onSave: () => void
    textareaRef: React.RefObject<HTMLTextAreaElement>
}) {
    return (
        <>
            {/* Date line */}
            <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: `0.5px solid ${PAPER_BORDER}`, flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.18em', color: PAPER_MUTED, textTransform: 'uppercase' }}>
                    {format(new Date(), 'EEEE, MMMM d yyyy')}
                    <span style={{ marginLeft: '8px', color: moodInfo.color }}>· {moodInfo.label}</span>
                </div>
            </div>

            {/* Tags */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px', flexShrink: 0 }}>
                {['Anxious', 'Calm', 'Hopeful', 'Tired', 'Grateful', 'Overwhelmed', 'Content', 'Melancholy', 'Excited', 'Conflicted', 'Tender', 'Resolved'].map(t => {
                    const selected = selectedTags.includes(t)
                    return (
                        <button key={t} type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); toggleTag(t) }}
                            style={{
                                padding: '2px 7px', borderRadius: '10px', fontSize: '9px', fontFamily: 'var(--font-jost)',
                                cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none',
                                background: selected ? 'rgba(180,130,60,0.18)' : 'transparent',
                                border: selected ? '1px solid rgba(180,130,60,0.4)' : `1px solid ${PAPER_BORDER}`,
                                color: selected ? PAPER_TEXT : PAPER_MUTED, transition: 'all 0.14s',
                            }}>{t}</button>
                    )
                })}
            </div>

            {/* Textarea */}
            <textarea ref={textareaRef} value={content} onChange={e => setContent(e.target.value)}
                placeholder="Begin writing here…"
                style={{
                    flex: 1, width: '100%', minHeight: '80px',
                    background: 'transparent', border: 'none', outline: 'none', resize: 'none',
                    fontFamily: writingFont.family,
                    fontStyle: fontStyle.style as any,
                    fontWeight: fontStyle.weight as any,
                    fontSize: fontStyle.size,
                    lineHeight: fontStyle.lh,
                    color: PAPER_TEXT, caretColor: 'rgba(100,60,10,0.9)',
                    overflowY: 'auto', boxSizing: 'border-box',
                    WebkitUserSelect: 'text' as any, userSelect: 'text' as any, cursor: 'text',
                    zIndex: 20, position: 'relative',
                }} />

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '7px', borderTop: `0.5px solid ${PAPER_BORDER}`, flexShrink: 0 }}>
                <span style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', color: PAPER_MUTED, letterSpacing: '0.1em' }}>
                    {content.length > 0 ? `${content.split(/\s+/).filter(Boolean).length} words` : 'empty page'}
                </span>
                <motion.button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); onSave() }}
                    disabled={isSaving || !content.trim()} whileHover={{ scale: content.trim() && !isSaving ? 1.04 : 1 }}
                    whileTap={{ scale: content.trim() && !isSaving ? 0.96 : 1 }}
                    style={{
                        padding: '6px 18px', borderRadius: '22px', fontFamily: 'var(--font-cinzel)', fontSize: '9px',
                        letterSpacing: '0.16em', textTransform: 'uppercase',
                        cursor: content.trim() && !isSaving ? 'pointer' : 'not-allowed',
                        background: 'rgba(180,130,60,0.18)', border: '1px solid rgba(180,130,60,0.4)',
                        color: PAPER_TEXT, opacity: !content.trim() || isSaving ? 0.38 : 1,
                        transition: 'all 0.18s', userSelect: 'none',
                    }}>
                    {isSaving ? 'Saving…' : 'Save Entry ✦'}
                </motion.button>
            </div>
        </>
    )
}

function EntryContent({ entry, writingFont, fontStyle, pageNum }: {
    entry: JournalEntry
    writingFont: typeof WRITING_FONTS[0]
    fontStyle: typeof FONT_STYLES[0]
    pageNum: number
}) {
    const moodInfo = entry.mood_score ? MOOD_LABELS[entry.mood_score] : null
    return (
        <>
            <div style={{ marginBottom: '10px', paddingBottom: '8px', borderBottom: `0.5px solid ${PAPER_BORDER}`, flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.18em', color: PAPER_MUTED, textTransform: 'uppercase' }}>
                    {format(new Date(entry.created_at), 'EEEE, MMMM d yyyy')}
                    {moodInfo && <span style={{ marginLeft: '8px', color: moodInfo.color }}>· {moodInfo.label}</span>}
                </div>
                {entry.tags && entry.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                        {entry.tags.map(t => (
                            <span key={t} style={{ padding: '1px 6px', borderRadius: '8px', fontSize: '8px', fontFamily: 'var(--font-jost)', background: 'transparent', border: `1px solid ${PAPER_BORDER}`, color: PAPER_MUTED }}>{t}</span>
                        ))}
                    </div>
                )}
            </div>
            <div style={{
                fontFamily: writingFont.family, fontStyle: fontStyle.style as any,
                fontWeight: fontStyle.weight as any, fontSize: fontStyle.size,
                lineHeight: fontStyle.lh, color: PAPER_TEXT, overflow: 'auto', flex: 1,
                WebkitUserSelect: 'text' as any, userSelect: 'text' as any,
            }}>{entry.content}</div>
            <div style={{ position: 'absolute', bottom: '14px', right: '20px', fontFamily: 'var(--font-cinzel)', fontSize: '8px', color: PAPER_MUTED }}>{pageNum}</div>
        </>
    )
}

function BlankPage() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.1 }}>
            <span style={{ fontSize: '40px', color: PAPER_MUTED }}>✦</span>
        </div>
    )
}

function NavButton({ onClick, disabled, label, title, small }: { onClick: () => void; disabled: boolean; label: string; title: string; small?: boolean }) {
    return (
        <motion.button type="button" onClick={onClick} disabled={disabled} title={title}
            whileHover={{ scale: disabled ? 1 : 1.08 }} whileTap={{ scale: disabled ? 1 : 0.92 }}
            style={{
                width: small ? '36px' : '44px', height: small ? '36px' : '44px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-cinzel)', fontSize: small ? '12px' : '18px',
                cursor: disabled ? 'default' : 'pointer',
                background: disabled ? 'rgba(212,175,55,0.04)' : 'rgba(212,175,55,0.1)',
                border: disabled ? '1px solid rgba(212,175,55,0.1)' : '1px solid rgba(212,175,55,0.28)',
                color: disabled ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.8)',
                transition: 'all 0.18s', userSelect: 'none',
            }}>{label}</motion.button>
    )
}

function DraggableSticker({ sticker, isActive, onActivate, onDeactivate, onRemove, onPositionChange, onScaleChange }: {
    sticker: PlacedSticker; isActive: boolean; onActivate: () => void; onDeactivate: () => void
    onRemove: () => void; onPositionChange: (x: number, y: number) => void; onScaleChange: (scale: number) => void
}) {
    const ref = useRef<HTMLDivElement>(null)
    const [dragging, setDragging] = useState(false)
    const dragStart = useRef<{ mx: number; my: number; sx: number; sy: number } | null>(null)

    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault(); e.stopPropagation(); onActivate(); setDragging(true)
        dragStart.current = { mx: e.clientX, my: e.clientY, sx: sticker.x, sy: sticker.y }
        const handleMove = (ev: PointerEvent) => {
            if (!dragStart.current || !ref.current) return
            const parent = ref.current.closest('[data-page]') as HTMLElement
            if (!parent) return
            const rect = parent.getBoundingClientRect()
            const dx = ((ev.clientX - dragStart.current.mx) / rect.width) * 100
            const dy = ((ev.clientY - dragStart.current.my) / rect.height) * 100
            onPositionChange(Math.max(2, Math.min(88, dragStart.current.sx + dx)), Math.max(2, Math.min(88, dragStart.current.sy + dy)))
        }
        const handleUp = () => { setDragging(false); dragStart.current = null; document.removeEventListener('pointermove', handleMove); document.removeEventListener('pointerup', handleUp) }
        document.addEventListener('pointermove', handleMove); document.addEventListener('pointerup', handleUp)
    }

    return (
        <div ref={ref} data-sticker-id={sticker.stickerId} onPointerDown={handlePointerDown}
            onWheel={e => { e.stopPropagation(); onScaleChange(Math.max(0.3, Math.min(3, sticker.scale + (e.deltaY > 0 ? -0.1 : 0.1)))) }}
            style={{ position: 'absolute', left: `${sticker.x}%`, top: `${sticker.y}%`, zIndex: isActive ? 50 : 15, cursor: dragging ? 'grabbing' : 'grab', userSelect: 'none', touchAction: 'none' }}>
            <div style={{ position: 'relative', display: 'inline-flex' }}>
                <img src={sticker.url} alt={sticker.label} width={60 * sticker.scale} height={60 * sticker.scale}
                    style={{ display: 'block', objectFit: 'contain', transform: `rotate(${sticker.rotation || 0}deg)`, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.35)) drop-shadow(0 0 3px white)', pointerEvents: 'none', userSelect: 'none' }}
                    draggable={false} />
                <button onPointerDown={e => { e.stopPropagation(); e.preventDefault() }}
                    onClick={e => { e.stopPropagation(); e.preventDefault(); onRemove() }}
                    style={{ position: 'absolute', top: '-12px', right: '-12px', width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(220,38,38,0.92)', border: '2px solid white', cursor: 'pointer', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'white', fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.4)', userSelect: 'none' }} title="Remove sticker">✕</button>
            </div>
        </div>
    )
}