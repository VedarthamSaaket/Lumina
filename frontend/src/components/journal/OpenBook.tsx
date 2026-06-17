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
    onDelete: (id: string) => Promise<void>
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

// Each style now also carries a `isBlock` flag so the textarea knows
// whether to auto-revert to default after a newline.
const FONT_STYLES = [
    { id: 'title', label: 'Title', weight: '700', style: 'normal', size: '22px', lh: '32px', isBlock: true },
    { id: 'heading', label: 'Heading', weight: '600', style: 'normal', size: '18px', lh: '28px', isBlock: true },
    { id: 'subheading', label: 'Sub', weight: '500', style: 'normal', size: '15px', lh: '24px', isBlock: true },
    { id: 'bold', label: 'Bold', weight: '700', style: 'normal', size: '14px', lh: '22px', isBlock: false },
    { id: 'regular', label: 'Regular', weight: '400', style: 'normal', size: '14px', lh: '24px', isBlock: false },
    { id: 'italic', label: 'Italic', weight: '400', style: 'italic', size: '14px', lh: '24px', isBlock: false },
    { id: 'light', label: 'Light', weight: '300', style: 'italic', size: '14px', lh: '24px', isBlock: false },
    { id: 'small', label: 'Caption', weight: '400', style: 'normal', size: '11px', lh: '18px', isBlock: false },
]

const DEFAULT_FONT_STYLE_ID = 'regular'

// Paper colors
const PAPER_BG = '#f5ead0'
const PAPER_TEXT = 'rgba(35,20,5,0.88)'
const PAPER_MUTED = 'rgba(100,70,30,0.5)'
const PAPER_BORDER = 'rgba(180,140,80,0.22)'
const PAPER_DOT = 'rgba(0,0,0,0.12)'

type ToolSection = 'font' | 'style' | 'stickers' | null

// Toolbar palette, adapts to theme
function useToolbarPalette() {
    const [isDark, setIsDark] = useState(true)
    useEffect(() => {
        const check = () => setIsDark(!document.documentElement.classList.contains('light'))
        check()
        const obs = new MutationObserver(check)
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
        return () => obs.disconnect()
    }, [])
    return isDark
}

export default function OpenBook({ entries, onSave, onDelete, onClose, isSaving }: OpenBookProps) {
    const isDark = useToolbarPalette()

    // Toolbar palette, light theme gets warm parchment tones to complement the book
    const TB = isDark ? {
        bg: 'rgba(8,4,0,0.88)',
        border: 'rgba(212,175,55,0.14)',
        iconBorder: 'rgba(212,175,55,0.08)',
        activeItemBg: 'rgba(212,175,55,0.18)',
        activeItemBorder: 'rgba(212,175,55,0.38)',
        activeItemColor: 'rgba(212,175,55,0.95)',
        inactiveItemColor: 'rgba(212,175,55,0.42)',
        panelBtnActiveBg: 'rgba(212,175,55,0.14)',
        panelBtnActiveBorder: 'rgba(212,175,55,0.35)',
        panelBtnActiveColor: 'rgba(254,244,228,0.9)',
        panelBtnInactiveColor: 'rgba(254,244,228,0.45)',
        headerColor: 'rgba(212,175,55,0.55)',
        closeBtnBg: 'rgba(212,175,55,0.08)',
        closeBtnBorder: 'rgba(212,175,55,0.18)',
        closeBtnColor: 'rgba(212,175,55,0.5)',
        labelColor: 'rgba(212,175,55,0.38)',
        emptyColor: 'rgba(212,175,55,0.5)',
        emptyLabel: 'rgba(212,175,55,0.4)',
        scrollColor: 'rgba(212,175,55,0.18)',
    } : {
        bg: 'rgba(230,210,175,0.97)',
        border: 'rgba(140,95,30,0.18)',
        iconBorder: 'rgba(140,95,30,0.10)',
        activeItemBg: 'rgba(139,100,16,0.15)',
        activeItemBorder: 'rgba(139,100,16,0.38)',
        activeItemColor: 'rgba(60,35,5,0.95)',
        inactiveItemColor: 'rgba(60,35,5,0.40)',
        panelBtnActiveBg: 'rgba(139,100,16,0.12)',
        panelBtnActiveBorder: 'rgba(139,100,16,0.35)',
        panelBtnActiveColor: 'rgba(35,18,3,0.9)',
        panelBtnInactiveColor: 'rgba(35,18,3,0.42)',
        headerColor: 'rgba(100,65,12,0.65)',
        closeBtnBg: 'rgba(139,100,16,0.08)',
        closeBtnBorder: 'rgba(139,100,16,0.20)',
        closeBtnColor: 'rgba(100,65,12,0.55)',
        labelColor: 'rgba(100,65,12,0.42)',
        emptyColor: 'rgba(139,100,16,0.55)',
        emptyLabel: 'rgba(100,65,12,0.45)',
        scrollColor: 'rgba(139,100,16,0.18)',
    }

    // Nav button palette
    const NB = isDark ? {
        enabledBg: 'rgba(212,175,55,0.12)',
        enabledBorder: 'rgba(212,175,55,0.32)',
        enabledColor: 'rgba(212,175,55,0.85)',
        disabledBg: 'rgba(212,175,55,0.04)',
        disabledBorder: 'rgba(212,175,55,0.12)',
        disabledColor: 'rgba(212,175,55,0.22)',
    } : {
        enabledBg: 'rgba(60,38,12,0.82)',
        enabledBorder: 'rgba(40,24,6,0.9)',
        enabledColor: 'rgba(245,225,180,0.95)',
        disabledBg: 'rgba(90,68,30,0.28)',
        disabledBorder: 'rgba(90,68,30,0.32)',
        disabledColor: 'rgba(60,40,12,0.4)',
    }

    const [currentPage, setCurrentPage] = useState(0)
    const [flipDirection, setFlipDirection] = useState<'forward' | 'backward'>('forward')
    const [isAnimating, setIsAnimating] = useState(false)
    const [activeSection, setActiveSection] = useState<ToolSection>('font')

    const [content, setContent] = useState('')
    const [mood, setMood] = useState(5)
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [pageStickers, setPageStickers] = useState<PlacedSticker[]>([])
    const [activeStickerId, setActiveStickerId] = useState<string | null>(null)

    const [writingFontId, setWritingFontId] = useState('garamond')
    // The "active" style for the textarea, reverts to default after block-level newline
    const [fontStyleId, setFontStyleId] = useState(DEFAULT_FONT_STYLE_ID)
    // The style selected in the panel (persists for user preference display)
    const [panelFontStyleId, setPanelFontStyleId] = useState(DEFAULT_FONT_STYLE_ID)

    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const prevContentRef = useRef('')

    const writingFont = WRITING_FONTS.find(f => f.id === writingFontId) || WRITING_FONTS[0]
    const fontStyle = FONT_STYLES.find(f => f.id === fontStyleId) || FONT_STYLES[4]
    const moodInfo = MOOD_LABELS[mood] || MOOD_LABELS[5]

    const isWritePage = currentPage === 0
    const totalEntries = entries.length

    // Fix: correct page mapping
    // page 0 = write page (left=index, right=write)
    // page 1 = entries[0] on right, left blank
    // page 2 = entries[0] on left, entries[1] on right
    const leftEntry = currentPage >= 2 ? entries[currentPage - 2] : null
    const rightEntry = currentPage >= 1 ? entries[currentPage - 1] : null

    // Fix: swap direction, goForward increments, goBackward decrements
    const goForward = useCallback(() => {
        if (isAnimating || currentPage >= totalEntries) return
        setFlipDirection('forward')
        setIsAnimating(true)
        setTimeout(() => { setCurrentPage(p => p + 1); setIsAnimating(false) }, 500)
    }, [isAnimating, currentPage, totalEntries])

    const goBackward = useCallback(() => {
        if (isAnimating || currentPage <= 0) return
        setFlipDirection('backward')
        setIsAnimating(true)
        setTimeout(() => { setCurrentPage(p => p - 1); setIsAnimating(false) }, 500)
    }, [isAnimating, currentPage])

    const goToWritePage = useCallback(() => {
        if (isAnimating || currentPage === 0) return
        setFlipDirection('backward')
        setIsAnimating(true)
        setTimeout(() => { setCurrentPage(0); setIsAnimating(false) }, 500)
    }, [isAnimating, currentPage])

    const handleSave = async () => {
        if (!content.trim()) return
        await onSave(content, mood, selectedTags, pageStickers)
        setContent('')
        setSelectedTags([])
        setPageStickers([])
        setMood(5)
        prevContentRef.current = ''
        if (textareaRef.current) textareaRef.current.value = ''
    }

    const handleDeleteEntry = async (id: string) => {
        await onDelete(id)
        // The entry list just shrank by one, so step back a page to stay in
        // bounds and avoid landing on a now-empty spread.
        setCurrentPage(p => Math.max(0, p - 1))
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

    // Handle style panel selection, if block-level style, it stays active until newline
    const handleStyleSelect = (styleId: string) => {
        setFontStyleId(styleId)
        setPanelFontStyleId(styleId)
        textareaRef.current?.focus()
    }

    // Detect newline to revert block styles back to default (iPhone Notes behavior)
    const handleContentChange = (val: string) => {
        const prev = prevContentRef.current
        const isNewline = val.length > prev.length && val[val.length - 1] === '\n'
        if (isNewline) {
            const currentStyleDef = FONT_STYLES.find(f => f.id === fontStyleId)
            if (currentStyleDef?.isBlock) {
                setFontStyleId(DEFAULT_FONT_STYLE_ID)
            }
        }
        prevContentRef.current = val
        setContent(val)
    }

    const TOOLBAR_WIDTH = 280

    // Page flip variants
    const flipVariantsLeft = {
        forward: { rotateY: [-8, 0], opacity: [0.7, 1] },
        backward: { rotateY: [8, 0], opacity: [0.7, 1] },
    }
    const flipVariantsRight = {
        forward: { rotateY: [8, 0], opacity: [0.7, 1] },
        backward: { rotateY: [-8, 0], opacity: [0.7, 1] },
    }

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

            {/* Main layout */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', alignItems: 'stretch' }}>

                {/* LEFT NAV STRIP */}
                <div style={{
                    width: '72px', flexShrink: 0,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: '14px', paddingBottom: '20px',
                    zIndex: 20,
                }}>
                    {/* ← Previous (go backward) */}
                    <NavButton
                        onClick={goBackward}
                        disabled={currentPage <= 0 || isAnimating}
                        label="←"
                        title="Previous page"
                        nb={NB}
                    />
                    {/* ✦ New entry */}
                    <NavButton
                        onClick={goToWritePage}
                        disabled={currentPage === 0 || isAnimating}
                        label="✦"
                        title="New entry"
                        small
                        nb={NB}
                    />
                    {/* → Next (go forward) */}
                    <NavButton
                        onClick={goForward}
                        disabled={currentPage >= totalEntries || isAnimating}
                        label="→"
                        title="Next page"
                        nb={NB}
                    />
                    <div style={{
                        marginTop: '8px', textAlign: 'center',
                        fontFamily: 'var(--font-cinzel)', fontSize: '8px',
                        letterSpacing: '0.14em', color: 'var(--text-muted)', lineHeight: 1.6,
                    }}>
                        {isWritePage ? 'new' : `${currentPage} / ${totalEntries}`}
                    </div>
                </div>

                {/* BOOK */}
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
                                initial={false}
                                animate={flipVariantsLeft[flipDirection]}
                                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
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
                                                setTimeout(() => { setCurrentPage(idx + 1); setIsAnimating(false) }, 500)
                                            }} />
                                    ) : leftEntry ? (
                                        <EntryContent entry={leftEntry} writingFont={writingFont} fontStyle={fontStyle} pageNum={currentPage - 1} />
                                    ) : <BlankPage />}
                                </div>
                            </motion.div>

                            {/* RIGHT PAGE */}
                            <motion.div
                                key={`right-${currentPage}`}
                                initial={false}
                                animate={flipVariantsRight[flipDirection]}
                                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                                style={{
                                    flex: 1, position: 'relative', overflow: 'hidden',
                                    borderRadius: '0 5px 5px 0',
                                    backgroundColor: PAPER_BG,
                                    backgroundImage: `radial-gradient(circle, ${PAPER_DOT} 1px, transparent 1px)`,
                                    backgroundSize: '18px 18px',
                                    transformOrigin: 'left center',
                                }}
                                data-page="right"
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
                                            content={content} setContent={handleContentChange}
                                            mood={mood} moodInfo={moodInfo}
                                            selectedTags={selectedTags} toggleTag={toggleTag}
                                            writingFont={writingFont} fontStyle={fontStyle}
                                            isSaving={isSaving} onSave={handleSave}
                                            textareaRef={textareaRef}
                                        />
                                    ) : rightEntry ? (
                                        <EntryContent entry={rightEntry} writingFont={writingFont} fontStyle={fontStyle} pageNum={currentPage} onDelete={handleDeleteEntry} />
                                    ) : <BlankPage />}
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>

                {/* RIGHT TOOLBAR */}
                <div style={{
                    width: `${TOOLBAR_WIDTH}px`, flexShrink: 0,
                    display: 'flex', flexDirection: 'row', overflow: 'hidden',
                    borderLeft: `1px solid ${TB.border}`,
                    background: TB.bg,
                    backdropFilter: 'blur(40px)',
                    transition: 'background 0.3s',
                }}>
                    {/* Icon strip, only font, style, stickers */}
                    <div style={{
                        width: '52px', flexShrink: 0,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: '4px',
                        padding: '20px 6px 10px',
                        borderRight: `1px solid ${TB.iconBorder}`,
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
                                    background: activeSection === tool.id ? TB.activeItemBg : 'transparent',
                                    border: activeSection === tool.id ? `1px solid ${TB.activeItemBorder}` : '1px solid transparent',
                                    color: activeSection === tool.id ? TB.activeItemColor : TB.inactiveItemColor,
                                    transition: 'all 0.15s',
                                }}>
                                <span style={{ fontSize: '11px', fontFamily: 'var(--font-jost)', fontWeight: 600 }}>{tool.icon}</span>
                                <span style={{ fontSize: '7px', fontFamily: 'var(--font-jost)', letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.7 }}>{tool.title}</span>
                            </motion.button>
                        ))}
                    </div>

                    {/* Expanded panel */}
                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <AnimatePresence mode="wait">
                            {activeSection === 'font' && (
                                <motion.div key="font-panel"
                                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.18 }}
                                    style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                    <PanelHeader title="Typeface" onClose={() => setActiveSection(null)} tb={TB} />
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', scrollbarWidth: 'thin', scrollbarColor: `${TB.scrollColor} transparent` }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingTop: '4px' }}>
                                            {WRITING_FONTS.map(f => (
                                                <button key={f.id} onClick={() => setWritingFontId(f.id)}
                                                    style={{
                                                        textAlign: 'left', padding: '8px 10px', borderRadius: '8px',
                                                        fontFamily: f.family, fontStyle: f.style as any, fontSize: '14px',
                                                        cursor: 'pointer',
                                                        background: writingFontId === f.id ? TB.panelBtnActiveBg : 'transparent',
                                                        border: writingFontId === f.id ? `1px solid ${TB.panelBtnActiveBorder}` : '1px solid transparent',
                                                        color: writingFontId === f.id ? TB.panelBtnActiveColor : TB.panelBtnInactiveColor,
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
                                    <PanelHeader title="Text Style" onClose={() => setActiveSection(null)} tb={TB} />
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', scrollbarWidth: 'thin', scrollbarColor: `${TB.scrollColor} transparent` }}>
                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '9px', letterSpacing: '0.1em', color: TB.labelColor, textTransform: 'uppercase', marginBottom: '6px' }}>
                                            Applies to next typed paragraph
                                        </p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '2px' }}>
                                            {FONT_STYLES.map(fs => (
                                                <button key={fs.id} onClick={() => handleStyleSelect(fs.id)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        padding: '9px 10px', borderRadius: '8px', cursor: 'pointer',
                                                        background: panelFontStyleId === fs.id ? TB.panelBtnActiveBg : 'transparent',
                                                        border: panelFontStyleId === fs.id ? `1px solid ${TB.panelBtnActiveBorder}` : '1px solid transparent',
                                                        color: panelFontStyleId === fs.id ? TB.activeItemColor : TB.panelBtnInactiveColor,
                                                        transition: 'all 0.12s',
                                                    }}>
                                                    <span style={{
                                                        fontFamily: writingFont.family,
                                                        fontWeight: fs.weight, fontStyle: fs.style as any,
                                                        fontSize: Math.min(parseInt(fs.size), 16) + 'px', lineHeight: 1,
                                                    }}>{fs.label}</span>
                                                    <span style={{ fontFamily: 'var(--font-jost)', fontSize: '9px', opacity: 0.4 }}>
                                                        {fs.weight === '700' ? 'Bold' : fs.weight === '300' ? 'Light' : 'Normal'}{fs.style === 'italic' ? ' / Italic' : ''}
                                                        {fs.isBlock ? ' ¶' : ''}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '8px', color: TB.labelColor, marginTop: '8px', lineHeight: 1.5 }}>
                                            ¶ Block styles revert to Regular after a new line
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                            {activeSection === 'stickers' && (
                                <motion.div key="stickers-panel"
                                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.18 }}
                                    style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                    <PanelHeader title="Stickers" onClose={() => setActiveSection(null)} tb={TB} />
                                    <div style={{ padding: '8px 10px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                        <JournalStickers onSelect={handleStickerDrop} onClose={() => setActiveSection(null)} />
                                    </div>
                                </motion.div>
                            )}
                            {!activeSection && (
                                <motion.div key="empty-panel"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: 0.3 }}>
                                    <span style={{ fontSize: '20px', color: TB.emptyColor }}>✦</span>
                                    <span style={{ fontFamily: 'var(--font-jost)', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: TB.emptyLabel }}>Tools</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* MOOD SLIDER */}
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

function PanelHeader({ title, onClose, tb }: { title: string; onClose: () => void; tb: any }) {
    return (
        <div style={{
            padding: '12px 14px 8px', borderBottom: `1px solid ${tb.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
            <span style={{ fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.18em', color: tb.headerColor, textTransform: 'uppercase' }}>{title}</span>
            <button onClick={onClose} style={{
                background: tb.closeBtnBg, border: `1px solid ${tb.closeBtnBorder}`,
                borderRadius: '6px', cursor: 'pointer', width: '20px', height: '20px',
                color: tb.closeBtnColor, fontSize: '9px',
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
            <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: `0.5px solid ${PAPER_BORDER}`, flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.18em', color: PAPER_MUTED, textTransform: 'uppercase' }}>
                    {format(new Date(), 'EEEE, MMMM d yyyy')}
                    <span style={{ marginLeft: '8px', color: moodInfo.color }}>· {moodInfo.label}</span>
                </div>
            </div>

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

function EntryContent({ entry, writingFont, fontStyle, pageNum, onDelete }: {
    entry: JournalEntry
    writingFont: typeof WRITING_FONTS[0]
    fontStyle: typeof FONT_STYLES[0]
    pageNum: number
    onDelete?: (id: string) => void
}) {
    const moodInfo = entry.mood_score ? MOOD_LABELS[entry.mood_score] : null
    const [confirming, setConfirming] = useState(false)
    return (
        <>
            {/* Saved stickers, rendered on top of the page */}
            {entry.stickers && entry.stickers.length > 0 && (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5, overflow: 'hidden' }}>
                    {entry.stickers.map((s: any) => (
                        <img key={s.stickerId || s.id + '-' + Math.random()}
                            src={s.url} alt={s.label || ''}
                            style={{
                                position: 'absolute',
                                left: `${s.x}%`, top: `${s.y}%`,
                                width: `${60 * (s.scale || 1)}px`,
                                height: `${60 * (s.scale || 1)}px`,
                                objectFit: 'contain',
                                transform: `rotate(${s.rotation || 0}deg)`,
                                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.35)) drop-shadow(0 0 3px white)',
                                pointerEvents: 'none',
                                userSelect: 'none',
                            }}
                            draggable={false}
                        />
                    ))}
                </div>
            )}
            <div style={{ marginBottom: '10px', paddingBottom: '8px', borderBottom: `0.5px solid ${PAPER_BORDER}`, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ minWidth: 0 }}>
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
                {onDelete && (
                    <div style={{ flexShrink: 0, zIndex: 25 }}>
                        {!confirming ? (
                            <motion.button type="button"
                                onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirming(true) }}
                                whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
                                title="Delete this entry"
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    width: '24px', height: '24px', borderRadius: '50%', padding: 0,
                                    background: 'rgba(120,72,30,0.07)', border: `1px solid ${PAPER_BORDER}`,
                                    cursor: 'pointer', userSelect: 'none',
                                }}>
                                <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                                    <path d="M2.5 3.5h9M5.5 3.5V2.4c0-.4.3-.7.7-.7h1.6c.4 0 .7.3.7.7v1.1M3.4 3.5l.5 8c0 .5.4.9.9.9h4.4c.5 0 .9-.4.9-.9l.5-8"
                                        stroke="#9c6b3f" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </motion.button>
                        ) : (
                            <motion.div initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }}
                                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <button type="button"
                                    onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirming(false); onDelete(entry.id) }}
                                    style={{
                                        padding: '3px 10px', borderRadius: '12px', cursor: 'pointer',
                                        fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase',
                                        background: 'rgba(150,55,40,0.16)', border: '1px solid rgba(150,55,40,0.45)', color: '#8a3a2a',
                                        userSelect: 'none',
                                    }}>Delete</button>
                                <button type="button"
                                    onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirming(false) }}
                                    style={{
                                        padding: '3px 9px', borderRadius: '12px', cursor: 'pointer',
                                        fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase',
                                        background: 'transparent', border: `1px solid ${PAPER_BORDER}`, color: PAPER_MUTED,
                                        userSelect: 'none',
                                    }}>Keep</button>
                            </motion.div>
                        )}
                    </div>
                )}
            </div>
            {/* Entry content uses the font family only, NOT the currently-selected style
                so that switching style in the toolbar doesn't reformat old entries */}
            <div style={{
                fontFamily: writingFont.family,
                fontStyle: 'normal',
                fontWeight: '400',
                fontSize: '14px',
                lineHeight: '24px',
                color: PAPER_TEXT, overflow: 'auto', flex: 1,
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

function NavButton({ onClick, disabled, label, title, small, nb }: {
    onClick: () => void; disabled: boolean; label: string; title: string; small?: boolean; nb: any
}) {
    return (
        <motion.button type="button" onClick={onClick} disabled={disabled} title={title}
            whileHover={{ scale: disabled ? 1 : 1.10 }} whileTap={{ scale: disabled ? 1 : 0.90 }}
            style={{
                width: small ? '36px' : '46px', height: small ? '36px' : '46px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-cinzel)', fontSize: small ? '12px' : '20px',
                cursor: disabled ? 'default' : 'pointer',
                background: disabled ? nb.disabledBg : nb.enabledBg,
                border: disabled ? `1.5px solid ${nb.disabledBorder}` : `1.5px solid ${nb.enabledBorder}`,
                color: disabled ? nb.disabledColor : nb.enabledColor,
                transition: 'all 0.18s',
                userSelect: 'none',
                boxShadow: disabled ? 'none' : '0 2px 8px rgba(0,0,0,0.18)',
            }}>{label}</motion.button>
    )
}

function DraggableSticker({ sticker, isActive, onActivate, onDeactivate, onRemove, onPositionChange, onScaleChange }: {
    sticker: PlacedSticker; isActive: boolean; onActivate: () => void; onDeactivate: () => void
    onRemove: () => void; onPositionChange: (x: number, y: number) => void; onScaleChange: (scale: number) => void
}) {
    const ref = useRef<HTMLDivElement>(null)
    const [dragging, setDragging] = useState(false)
    const [hovered, setHovered] = useState(false)
    const dragStart = useRef<{ mx: number; my: number; sx: number; sy: number; moved: boolean } | null>(null)
    const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Auto-hide the remove control after a short idle period. The countdown is
    // paused while the sticker is hovered so it never vanishes as the user
    // reaches for the X. Any fresh interaction restarts it.
    const clearIdleTimer = useCallback(() => {
        if (idleTimer.current) { clearTimeout(idleTimer.current); idleTimer.current = null }
    }, [])

    const armIdleTimer = useCallback(() => {
        clearIdleTimer()
        idleTimer.current = setTimeout(() => onDeactivate(), 2500)
    }, [clearIdleTimer, onDeactivate])

    useEffect(() => {
        if (!isActive) { clearIdleTimer(); return }
        if (hovered) { clearIdleTimer(); return }  // pause countdown while hovered
        armIdleTimer()
        return clearIdleTimer
    }, [isActive, hovered, armIdleTimer, clearIdleTimer])

    useEffect(() => clearIdleTimer, [clearIdleTimer])

    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault(); e.stopPropagation(); setDragging(true)
        dragStart.current = { mx: e.clientX, my: e.clientY, sx: sticker.x, sy: sticker.y, moved: false }
        const handleMove = (ev: PointerEvent) => {
            if (!dragStart.current || !ref.current) return
            const parent = ref.current.closest('[data-page="right"]') as HTMLElement
            if (!parent) return
            const rect = parent.getBoundingClientRect()
            const totalDx = ev.clientX - dragStart.current.mx
            const totalDy = ev.clientY - dragStart.current.my
            // Treat tiny pointer travel as a click, not a drag.
            if (Math.abs(totalDx) > 4 || Math.abs(totalDy) > 4) dragStart.current.moved = true
            const dx = (totalDx / rect.width) * 100
            const dy = (totalDy / rect.height) * 100
            onPositionChange(Math.max(2, Math.min(88, dragStart.current.sx + dx)), Math.max(2, Math.min(88, dragStart.current.sy + dy)))
        }
        const handleUp = () => {
            setDragging(false)
            // A click (no meaningful movement) toggles the remove control.
            // A real drag leaves activation state untouched.
            if (dragStart.current && !dragStart.current.moved) {
                if (isActive) onDeactivate(); else onActivate()
            } else if (isActive) {
                armIdleTimer()  // restart countdown after a drag
            }
            dragStart.current = null
            document.removeEventListener('pointermove', handleMove)
            document.removeEventListener('pointerup', handleUp)
        }
        document.addEventListener('pointermove', handleMove); document.addEventListener('pointerup', handleUp)
    }

    return (
        <div ref={ref} data-sticker-id={sticker.stickerId} onPointerDown={handlePointerDown}
            onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
            onWheel={e => { e.stopPropagation(); onScaleChange(Math.max(0.3, Math.min(3, sticker.scale + (e.deltaY > 0 ? -0.1 : 0.1)))) }}
            style={{ position: 'absolute', left: `${sticker.x}%`, top: `${sticker.y}%`, zIndex: isActive ? 50 : 15, cursor: dragging ? 'grabbing' : 'grab', userSelect: 'none', touchAction: 'none' }}>
            <div style={{ position: 'relative', display: 'inline-flex' }}>
                <img src={sticker.url} alt={sticker.label} width={60 * sticker.scale} height={60 * sticker.scale}
                    style={{ display: 'block', objectFit: 'contain', transform: `rotate(${sticker.rotation || 0}deg)`, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.35)) drop-shadow(0 0 3px white)', pointerEvents: 'none', userSelect: 'none' }}
                    draggable={false} />
                <AnimatePresence>
                    {isActive && (
                        <motion.button
                            key="remove"
                            initial={{ opacity: 0, scale: 0.4 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.4 }}
                            transition={{ type: 'spring', stiffness: 520, damping: 28 }}
                            whileHover={{ scale: 1.12, boxShadow: '0 3px 14px rgba(212,175,55,0.45)' }}
                            whileTap={{ scale: 0.9 }}
                            onPointerDown={e => { e.stopPropagation(); e.preventDefault() }}
                            onClick={e => { e.stopPropagation(); e.preventDefault(); clearIdleTimer(); onRemove() }}
                            title="Remove sticker"
                            style={{
                                position: 'absolute', top: '-11px', right: '-11px',
                                width: '22px', height: '22px', borderRadius: '50%',
                                background: 'linear-gradient(145deg, rgba(38,22,9,0.96), rgba(20,11,4,0.96))',
                                border: '1px solid rgba(212,175,55,0.65)',
                                cursor: 'pointer', zIndex: 100, padding: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.5), inset 0 0 6px rgba(212,175,55,0.12)',
                                backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
                                userSelect: 'none',
                            }}>
                            <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                                <path d="M1.5 1.5 L8.5 8.5 M8.5 1.5 L1.5 8.5"
                                    stroke="#e8c869" strokeWidth="1.6" strokeLinecap="round" />
                            </svg>
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}