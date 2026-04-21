'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import JournalStickers, { type Sticker } from './JournalStickers'

interface JournalEntry {
    id: string
    content: string
    mood_score?: number
    tags?: string[]
    created_at: string
    stickers?: Array<Sticker & { x: number; y: number; scale: number; stickerId: string }>
}

interface OpenBookProps {
    entries: JournalEntry[]
    onSave: (content: string, mood: number, tags: string[], stickers: any[]) => Promise<void>
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
    { id: 'cinzel', label: 'Cinzel', family: "'Cinzel', serif", style: 'normal' },
    { id: 'playfair', label: 'Playfair Display', family: "'Playfair Display', serif", style: 'italic' },
    { id: 'crimson', label: 'Crimson Pro', family: "'Crimson Pro', serif", style: 'italic' },
    { id: 'fraunces', label: 'Fraunces', family: "'Fraunces', serif", style: 'italic' },
    { id: 'libre', label: 'Libre Baskerville', family: "'Libre Baskerville', serif", style: 'italic' },
    { id: 'philosopher', label: 'Philosopher', family: "'Philosopher', serif", style: 'italic' },
    { id: 'spectral', label: 'Georgia Classic', family: "Georgia, 'Times New Roman', serif", style: 'italic' },
    { id: 'palatino', label: 'Palatino', family: "Palatino, 'Palatino Linotype', serif", style: 'italic' },
    { id: 'garamond-sys', label: 'Garamond System', family: "Garamond, 'Apple Garamond', serif", style: 'italic' },
    { id: 'baskerville', label: 'Baskerville', family: "'Baskerville Old Face', Baskerville, serif", style: 'italic' },
    { id: 'didot', label: 'Didot', family: "Didot, 'GFS Didot', serif", style: 'italic' },
    { id: 'georgia', label: 'Georgia', family: "Georgia, serif", style: 'italic' },
    { id: 'rajdhani', label: 'Rajdhani', family: "'Rajdhani', sans-serif", style: 'normal' },
    { id: 'merriweather', label: 'Merriweather', family: "'Merriweather', serif", style: 'italic' },
    { id: 'lora', label: 'Lora', family: "'Lora', serif", style: 'italic' },
    { id: 'dm-serif', label: 'DM Serif Display', family: "'DM Serif Display', serif", style: 'italic' },
    { id: 'tangerine', label: 'Tangerine', family: "'Tangerine', cursive", style: 'normal' },
    { id: 'dancing', label: 'Dancing Script', family: "'Dancing Script', cursive", style: 'normal' },
    { id: 'greatvibes', label: 'Great Vibes', family: "'Great Vibes', cursive", style: 'normal' },
    { id: 'sacramento', label: 'Sacramento', family: "'Sacramento', cursive", style: 'normal' },
    { id: 'karla', label: 'Karla', family: "'Karla', sans-serif", style: 'normal' },
    { id: 'raleway', label: 'Raleway', family: "'Raleway', sans-serif", style: 'normal' },
    { id: 'josefin', label: 'Josefin Sans', family: "'Josefin Sans', sans-serif", style: 'normal' },
    { id: 'quattrocento', label: 'Quattrocento', family: "'Quattrocento', serif", style: 'normal' },
    { id: 'oldstandard', label: 'Old Standard TT', family: "'Old Standard TT', serif", style: 'italic' },
    { id: 'cardo', label: 'Cardo', family: "'Cardo', serif", style: 'italic' },
    { id: 'jost', label: 'Jost', family: "'Jost', sans-serif", style: 'normal' },
    { id: 'pacifico', label: 'Pacifico', family: "'Pacifico', cursive", style: 'normal' },
    { id: 'satisfy', label: 'Satisfy', family: "'Satisfy', cursive", style: 'normal' },
]

const FONT_SIZES = [
    { id: 'xs', label: 'XS', px: '11px', lh: '22px' },
    { id: 'sm', label: 'SM', px: '13px', lh: '24px' },
    { id: 'md', label: 'MD', px: '15px', lh: '28px' },
    { id: 'lg', label: 'LG', px: '18px', lh: '32px' },
    { id: 'xl', label: 'XL', px: '22px', lh: '38px' },
    { id: 'heading', label: 'H1', px: '28px', lh: '44px' },
    { id: 'display', label: 'H2', px: '22px', lh: '38px' },
    { id: 'caption', label: 'XS', px: '10px', lh: '18px' },
]

const PAPER_TEXTURES = [
    { id: 'parchment', label: 'Parchment', bg: '#f5ead0', lineColor: 'rgba(180,140,80,0.22)', marginColor: 'rgba(200,80,80,0.14)' },
    { id: 'cream', label: 'Cream', bg: '#fafaf4', lineColor: 'rgba(100,100,120,0.14)', marginColor: 'rgba(200,80,80,0.1)' },
    { id: 'blush', label: 'Blush', bg: '#f9eae8', lineColor: 'rgba(200,130,120,0.18)', marginColor: 'rgba(180,80,80,0.12)' },
    { id: 'sage', label: 'Sage', bg: '#e8f0e8', lineColor: 'rgba(80,120,80,0.16)', marginColor: 'rgba(80,180,80,0.1)' },
    { id: 'lavender', label: 'Lavender', bg: '#ece8f5', lineColor: 'rgba(120,80,180,0.14)', marginColor: 'rgba(100,60,180,0.12)' },
    { id: 'sky', label: 'Sky', bg: '#e8f2f8', lineColor: 'rgba(60,100,160,0.14)', marginColor: 'rgba(60,100,200,0.12)' },
    { id: 'midnight', label: 'Midnight', bg: '#1a1428', lineColor: 'rgba(160,140,200,0.12)', marginColor: 'rgba(100,80,160,0.18)' },
    { id: 'onyx', label: 'Onyx', bg: '#141010', lineColor: 'rgba(212,175,55,0.1)', marginColor: 'rgba(180,60,60,0.15)' },
]

const RULING_STYLES = [
    { id: 'college', label: 'College Ruled', linesEvery: 26 },
    { id: 'wide', label: 'Wide Ruled', linesEvery: 32 },
    { id: 'narrow', label: 'Narrow Ruled', linesEvery: 20 },
    { id: 'dots', label: 'Dotted', linesEvery: 24 },
    { id: 'grid', label: 'Grid', linesEvery: 24 },
    { id: 'blank', label: 'Blank', linesEvery: 0 },
]

type ToolId = 'font' | 'size' | 'stickers' | 'page' | 'ruling' | 'mood' | null

// SVG icons - no emojis
const ToolIcons: Record<string, React.ReactNode> = {
    font: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <text x="1" y="14" fontFamily="serif" fontSize="12" fill="currentColor" fontStyle="italic" fontWeight="400">A</text>
            <text x="10" y="13" fontFamily="sans-serif" fontSize="7" fill="currentColor" opacity="0.7">a</text>
        </svg>
    ),
    size: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <text x="1" y="10" fontSize="8" fontFamily="serif" fill="currentColor" opacity="0.6">S</text>
            <text x="7" y="15" fontSize="13" fontFamily="serif" fill="currentColor">M</text>
        </svg>
    ),
    stickers: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.2" />
            <path d="M5 11.5 C6.5 13.5 11.5 13.5 13 11.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            <circle cx="6.5" cy="7.5" r="1" fill="currentColor" />
            <circle cx="11.5" cy="7.5" r="1" fill="currentColor" />
            <path d="M9 2 L9 4 M13 3.5 L11.5 5" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
        </svg>
    ),
    page: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="3" y="2" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="6" cy="6.5" r="1.2" fill="currentColor" opacity="0.5" />
            <circle cx="12" cy="6.5" r="1.2" fill="currentColor" opacity="0.5" />
            <circle cx="6" cy="11.5" r="1.2" fill="currentColor" opacity="0.5" />
            <circle cx="12" cy="11.5" r="1.2" fill="currentColor" opacity="0.5" />
            <circle cx="9" cy="9" r="1.2" fill="currentColor" opacity="0.8" />
        </svg>
    ),
    ruling: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <line x1="3" y1="6" x2="15" y2="6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
            <line x1="3" y1="10" x2="15" y2="10" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
            <line x1="3" y1="14" x2="11" y2="14" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.5" />
        </svg>
    ),
    mood: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.2" />
            <path d="M6 11 C7 12.5 11 12.5 12 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="7" cy="7.5" r="1" fill="currentColor" />
            <circle cx="11" cy="7.5" r="1" fill="currentColor" />
        </svg>
    ),
}

const TOOLBAR_TOOLS: { id: ToolId; label: string }[] = [
    { id: 'font', label: 'Font' },
    { id: 'size', label: 'Size' },
    { id: 'stickers', label: 'Stickers' },
    { id: 'page', label: 'Paper' },
    { id: 'ruling', label: 'Ruling' },
    { id: 'mood', label: 'Mood' },
]

function RulingLayer({ style, paper, pageHeight }: { style: string; paper: typeof PAPER_TEXTURES[0]; pageHeight: number }) {
    if (style === 'blank') return null
    const ruling = RULING_STYLES.find(r => r.id === style)
    const linesEvery = ruling?.linesEvery || 28
    const topOffset = 52

    if (style === 'dots') {
        return (
            <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }} width="100%" height="100%">
                <defs>
                    <pattern id="dot-pattern" x="0" y="0" width={linesEvery} height={linesEvery} patternUnits="userSpaceOnUse">
                        <circle cx={linesEvery / 2} cy={linesEvery / 2} r="1.1" fill={paper.lineColor} />
                    </pattern>
                </defs>
                <rect y={topOffset} width="100%" height={pageHeight} fill="url(#dot-pattern)" />
            </svg>
        )
    }
    if (style === 'grid') {
        return (
            <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }} width="100%" height="100%">
                <defs>
                    <pattern id="grid-pattern" x="0" y={topOffset} width={linesEvery} height={linesEvery} patternUnits="userSpaceOnUse">
                        <path d={`M${linesEvery} 0L0 0 0 ${linesEvery}`} fill="none" stroke={paper.lineColor} strokeWidth="0.5" />
                    </pattern>
                </defs>
                <rect y={topOffset} width="100%" height={pageHeight} fill="url(#grid-pattern)" />
            </svg>
        )
    }
    const lineCount = Math.floor((pageHeight - topOffset) / linesEvery)
    return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
            {Array.from({ length: lineCount }, (_, i) => (
                <div key={i} style={{
                    position: 'absolute',
                    left: '44px', right: '12px',
                    top: `${topOffset + (i + 1) * linesEvery}px`,
                    height: '0.7px',
                    background: paper.lineColor,
                }} />
            ))}
            <div style={{
                position: 'absolute',
                top: `${topOffset}px`, bottom: '12px', left: '40px',
                width: '1px', background: paper.marginColor,
            }} />
        </div>
    )
}

export default function OpenBook({ entries, onSave, onClose, isSaving }: OpenBookProps) {
    const [currentPage, setCurrentPage] = useState(0) // 0 = new entry page
    const [isFlipping, setIsFlipping] = useState(false)
    const [flipDir, setFlipDir] = useState<'fwd' | 'bwd'>('fwd')
    const [activeTool, setActiveTool] = useState<ToolId>(null)
    const [isLight, setIsLight] = useState(false)

    // Write state
    const [content, setContent] = useState('')
    const [mood, setMood] = useState(5)
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [pageStickers, setPageStickers] = useState<Array<Sticker & { x: number; y: number; scale: number; stickerId: string }>>([])

    // Style state
    const [rulingStyle, setRulingStyle] = useState('college')
    const [paperTextureId, setPaperTextureId] = useState('parchment')
    const [writingFontId, setWritingFontId] = useState('garamond')
    const [fontSizeId, setFontSizeId] = useState('md')

    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        setIsLight(document.documentElement.classList.contains('light'))
        const obs = new MutationObserver(() => setIsLight(document.documentElement.classList.contains('light')))
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
        return () => obs.disconnect()
    }, [])

    const paper = PAPER_TEXTURES.find(p => p.id === paperTextureId) || PAPER_TEXTURES[0]
    const writingFont = WRITING_FONTS.find(f => f.id === writingFontId) || WRITING_FONTS[0]
    const fontSize = FONT_SIZES.find(f => f.id === fontSizeId) || FONT_SIZES[2]
    const isDarkPaper = paperTextureId === 'midnight' || paperTextureId === 'onyx'
    const textColor = isDarkPaper ? 'rgba(220,200,240,0.9)' : 'rgba(35,20,5,0.88)'
    const textMuted = isDarkPaper ? 'rgba(220,200,240,0.45)' : 'rgba(100,70,30,0.48)'
    const borderColor = isDarkPaper ? 'rgba(160,140,200,0.18)' : 'rgba(180,140,80,0.2)'

    const isWritePage = currentPage === 0
    const currentEntry = !isWritePage ? entries[currentPage - 1] : null
    const prevEntry = currentPage > 1 ? entries[currentPage - 2] : null
    const moodInfo = MOOD_LABELS[mood] || MOOD_LABELS[5]

    const panelBg = isLight ? 'rgba(245,235,210,0.98)' : 'rgba(14,7,1,0.97)'
    const panelBorder = isLight ? 'rgba(180,140,60,0.32)' : 'rgba(212,175,55,0.2)'
    const panelText = isLight ? 'rgba(42,26,8,0.9)' : 'rgba(254,244,228,0.9)'
    const panelMuted = isLight ? 'rgba(100,70,30,0.55)' : 'rgba(254,244,228,0.38)'

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
        }, 440)
    }, [isFlipping, entries.length])

    const handleStickerDrop = useCallback((sticker: Sticker) => {
        const id = `${sticker.id}-${Date.now()}`
        setPageStickers(prev => [...prev, {
            ...sticker,
            stickerId: id,
            x: 22 + Math.random() * 52,
            y: 16 + Math.random() * 56,
            scale: 1,
        }])
        setActiveTool(null)
    }, [])

    const handleSave = async () => {
        if (!content.trim()) return
        await onSave(content, mood, selectedTags, pageStickers)
        setContent('')
        setSelectedTags([])
        setPageStickers([])
        setMood(5)
    }

    const toggleTool = (id: ToolId) => setActiveTool(prev => prev === id ? null : id)

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value)
    }

    const BOOK_HEIGHT = 'min(540px, 74vh)'
    const PAGE_HEIGHT_PX = 540

    return (
        <div style={{
            position: 'relative',
            width: '100%',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            paddingTop: '62px',
        }}>
            {/* Back button */}
            <button
                onClick={onClose}
                style={{
                    position: 'absolute', top: '70px', left: '20px', zIndex: 60,
                    fontFamily: 'var(--font-jost)', fontSize: '11px', letterSpacing: '0.12em',
                    textTransform: 'uppercase', color: 'var(--text-muted)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    transition: 'color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
                ← Close
            </button>

            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'row',
                overflow: 'hidden',
                padding: '0 0 0 8px',
                gap: 0,
            }}>
                {/* ═══════════════════════════════════════════════════
                    LEFT — Book + navigation
                ═══════════════════════════════════════════════════ */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingRight: '0',
                    overflow: 'hidden',
                    minWidth: 0,
                }}>
                    {/* Book spread */}
                    <motion.div
                        initial={{ scale: 0.6, opacity: 0, rotateX: 22 }}
                        animate={{ scale: 1, opacity: 1, rotateX: 0 }}
                        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                            perspective: '1800px',
                            transformStyle: 'preserve-3d',
                            width: '100%',
                            maxWidth: '900px',
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            width: '100%',
                            height: BOOK_HEIGHT,
                            transformStyle: 'preserve-3d',
                            transform: 'rotateX(2deg)',
                            boxShadow: '0 40px 100px rgba(0,0,0,0.65), 0 10px 30px rgba(0,0,0,0.45)',
                            borderRadius: '2px 5px 5px 2px',
                            position: 'relative',
                        }}>
                            {/* Spine */}
                            <div style={{
                                position: 'absolute',
                                left: '50%', top: 0, bottom: 0, width: '14px',
                                transform: 'translateX(-50%)',
                                background: 'linear-gradient(to right, rgba(0,0,0,0.35), rgba(50,25,5,0.55), rgba(0,0,0,0.35))',
                                zIndex: 20,
                                boxShadow: '0 0 16px rgba(0,0,0,0.42)',
                            }} />

                            {/* LEFT PAGE */}
                            <motion.div
                                key={`L-${currentPage}`}
                                initial={{ opacity: 0, rotateY: flipDir === 'fwd' ? -90 : 90 }}
                                animate={{ opacity: 1, rotateY: 0 }}
                                transition={{ duration: 0.42, ease: [0.4, 0, 0.2, 1] }}
                                style={{
                                    flex: 1, background: paper.bg, position: 'relative',
                                    overflow: 'hidden', borderRadius: '2px 0 0 2px',
                                    boxShadow: 'inset -8px 0 24px rgba(0,0,0,0.12)',
                                    transformOrigin: 'right center',
                                }}
                            >
                                <RulingLayer style={rulingStyle} paper={paper} pageHeight={PAGE_HEIGHT_PX} />
                                <div style={{ position: 'relative', zIndex: 1, padding: '24px 24px 16px 44px', height: '100%', overflow: 'hidden' }}>
                                    {isWritePage ? (
                                        <>
                                            <div style={{
                                                fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.22em',
                                                color: textMuted, textTransform: 'uppercase', marginBottom: '14px',
                                                paddingBottom: '8px', borderBottom: `0.5px solid ${borderColor}`,
                                            }}>
                                                Index of Entries
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', overflow: 'hidden', maxHeight: 'calc(100% - 60px)' }}>
                                                {entries.length === 0 ? (
                                                    <div style={{
                                                        fontFamily: writingFont.family, fontStyle: writingFont.style as any,
                                                        fontSize: '14px', color: textMuted, lineHeight: 1.8, marginTop: '18px',
                                                    }}>
                                                        Your first entry awaits.<br />Begin writing on the right page →
                                                    </div>
                                                ) : entries.slice(0, 12).map((entry, i) => (
                                                    <motion.button
                                                        key={entry.id}
                                                        onClick={() => { setFlipDir('fwd'); setCurrentPage(i + 1) }}
                                                        initial={{ opacity: 0, x: -8 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: i * 0.03 }}
                                                        style={{
                                                            textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                                                            padding: '4px 7px', borderRadius: '3px',
                                                            borderLeft: `2px solid ${isDarkPaper ? 'rgba(160,140,200,0.22)' : 'rgba(180,130,60,0.28)'}`,
                                                        }}
                                                    >
                                                        <div style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.1em', color: textMuted, marginBottom: '2px' }}>
                                                            {format(new Date(entry.created_at), 'MMM d, yyyy')}
                                                            {entry.mood_score && (
                                                                <span style={{ marginLeft: '6px', color: MOOD_LABELS[entry.mood_score]?.color || textMuted }}>
                                                                    · {MOOD_LABELS[entry.mood_score]?.label}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{
                                                            fontFamily: writingFont.family, fontStyle: writingFont.style as any,
                                                            fontSize: '12px', color: textColor, opacity: 0.8,
                                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                        }}>
                                                            {entry.content.slice(0, 54)}…
                                                        </div>
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
                                                fontSize: fontSize.px, lineHeight: fontSize.lh,
                                                color: textColor, overflow: 'hidden', maxHeight: 'calc(100% - 72px)',
                                            }}>
                                                {prevEntry.content}
                                            </div>
                                            <div style={{ position: 'absolute', bottom: '14px', left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--font-cinzel)', fontSize: '8px', color: textMuted }}>
                                                {currentPage - 1}
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.15 }}>
                                            <svg width="40" height="40" viewBox="0 0 40 40"><path d="M20 3L22.5 14H34L24.5 21L27.5 32L20 26L12.5 32L15.5 21L6 14H17.5Z" fill={textMuted} /></svg>
                                        </div>
                                    )}
                                </div>
                            </motion.div>

                            {/* RIGHT PAGE — Writing / Reading */}
                            <motion.div
                                key={`R-${currentPage}`}
                                initial={{ opacity: 0, rotateY: flipDir === 'bwd' ? 90 : -90 }}
                                animate={{ opacity: 1, rotateY: 0 }}
                                transition={{ duration: 0.42, ease: [0.4, 0, 0.2, 1] }}
                                style={{
                                    flex: 1, background: paper.bg, position: 'relative',
                                    overflow: 'hidden', borderRadius: '0 5px 5px 0',
                                    boxShadow: 'inset 6px 0 20px rgba(0,0,0,0.07)',
                                    transformOrigin: 'left center',
                                }}
                            >
                                <RulingLayer style={rulingStyle} paper={paper} pageHeight={PAGE_HEIGHT_PX} />

                                {/* Draggable stickers layer */}
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
                                            width: '68px', height: '68px',
                                            userSelect: 'none',
                                        }}
                                        whileDrag={{ cursor: 'grabbing', scale: 1.12 }}
                                        onDoubleClick={() => setPageStickers(prev => prev.filter(x => x.stickerId !== s.stickerId))}
                                    >
                                        <img
                                            src={s.url}
                                            alt={s.label}
                                            width={62}
                                            height={62}
                                            style={{
                                                filter: 'drop-shadow(0 0 0px white) drop-shadow(0 0 1.5px white) drop-shadow(0 0 3px rgba(255,255,255,0.9)) drop-shadow(0 2.5px 5px rgba(0,0,0,0.38))',
                                                pointerEvents: 'none',
                                                display: 'block',
                                            }}
                                        />
                                    </motion.div>
                                ))}

                                {/* Content */}
                                <div style={{
                                    position: 'relative', zIndex: 10,
                                    padding: '24px 20px 14px 28px',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    boxSizing: 'border-box',
                                }}>
                                    {isWritePage ? (
                                        <>
                                            {/* Header */}
                                            <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: `0.5px solid ${borderColor}`, flexShrink: 0 }}>
                                                <div style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.18em', color: textMuted, textTransform: 'uppercase' }}>
                                                    {format(new Date(), 'EEEE, MMMM d yyyy')}
                                                    <span style={{ marginLeft: '8px', color: moodInfo.color, opacity: 0.9 }}>· {moodInfo.label}</span>
                                                </div>
                                            </div>

                                            {/* Tags */}
                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px', flexShrink: 0 }}>
                                                {TAGS.map(t => (
                                                    <button
                                                        key={t}
                                                        onClick={() => setSelectedTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t])}
                                                        style={{
                                                            padding: '2px 7px', borderRadius: '10px', fontSize: '9px',
                                                            fontFamily: 'var(--font-jost)', cursor: 'pointer',
                                                            background: selectedTags.includes(t)
                                                                ? (isDarkPaper ? 'rgba(160,140,200,0.2)' : 'rgba(180,130,60,0.16)')
                                                                : 'transparent',
                                                            border: selectedTags.includes(t)
                                                                ? `1px solid ${isDarkPaper ? 'rgba(160,140,200,0.45)' : 'rgba(180,130,60,0.4)'}`
                                                                : `1px solid ${isDarkPaper ? 'rgba(160,140,200,0.14)' : 'rgba(180,130,60,0.16)'}`,
                                                            color: selectedTags.includes(t) ? textColor : textMuted,
                                                            transition: 'all 0.14s',
                                                        }}
                                                    >
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* *** TEXTAREA - the key fix *** */}
                                            <textarea
                                                ref={textareaRef}
                                                value={content}
                                                onChange={handleTextareaChange}
                                                placeholder="Begin writing here…"
                                                style={{
                                                    flex: 1,
                                                    width: '100%',
                                                    minHeight: '120px',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    outline: 'none',
                                                    resize: 'none',
                                                    fontFamily: writingFont.family,
                                                    fontStyle: writingFont.style as any,
                                                    fontSize: fontSize.px,
                                                    lineHeight: fontSize.lh,
                                                    color: textColor,
                                                    caretColor: isDarkPaper ? 'rgba(212,175,55,0.9)' : 'rgba(100,60,10,0.9)',
                                                    overflowY: 'auto',
                                                    paddingLeft: '6px',
                                                    paddingRight: '6px',
                                                    boxSizing: 'border-box',
                                                    WebkitUserSelect: 'text',
                                                    userSelect: 'text',
                                                    cursor: 'text',
                                                    zIndex: 20,
                                                    position: 'relative',
                                                }}
                                                autoFocus={false}
                                                onClick={(e) => e.currentTarget.focus()}
                                            />

                                            {/* Bottom row */}
                                            <div style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                marginTop: '8px', paddingTop: '7px',
                                                borderTop: `0.5px solid ${borderColor}`,
                                                flexShrink: 0,
                                            }}>
                                                <span style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', color: textMuted, letterSpacing: '0.1em' }}>
                                                    {content.length > 0 ? `${content.split(/\s+/).filter(Boolean).length} words` : 'empty page'}
                                                </span>
                                                <motion.button
                                                    onClick={handleSave}
                                                    disabled={isSaving || !content.trim()}
                                                    whileHover={{ scale: 1.04 }}
                                                    whileTap={{ scale: 0.96 }}
                                                    style={{
                                                        padding: '6px 18px', borderRadius: '22px',
                                                        fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.16em',
                                                        textTransform: 'uppercase',
                                                        cursor: content.trim() && !isSaving ? 'pointer' : 'not-allowed',
                                                        background: isDarkPaper ? 'rgba(160,140,200,0.16)' : 'rgba(180,130,60,0.16)',
                                                        border: isDarkPaper ? '1px solid rgba(160,140,200,0.38)' : '1px solid rgba(180,130,60,0.38)',
                                                        color: textColor,
                                                        opacity: !content.trim() || isSaving ? 0.35 : 1,
                                                        transition: 'all 0.18s',
                                                    }}
                                                >
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
                                                                padding: '1px 6px', borderRadius: '8px', fontSize: '8px',
                                                                fontFamily: 'var(--font-jost)',
                                                                background: isDarkPaper ? 'rgba(160,140,200,0.1)' : 'rgba(180,130,60,0.1)',
                                                                border: isDarkPaper ? '1px solid rgba(160,140,200,0.2)' : '1px solid rgba(180,130,60,0.2)',
                                                                color: textMuted,
                                                            }}>{t}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{
                                                fontFamily: writingFont.family, fontStyle: writingFont.style as any,
                                                fontSize: fontSize.px, lineHeight: fontSize.lh,
                                                color: textColor, overflow: 'auto', flex: 1, paddingLeft: '6px',
                                                WebkitUserSelect: 'text', userSelect: 'text',
                                            }}>
                                                {currentEntry.content}
                                            </div>
                                            <div style={{ position: 'absolute', bottom: '14px', right: '20px', fontFamily: 'var(--font-cinzel)', fontSize: '8px', color: textMuted }}>
                                                {currentPage}
                                            </div>
                                        </>
                                    ) : null}
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* Page navigation */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '14px' }}>
                        <motion.button
                            onClick={() => goTo('bwd')}
                            disabled={currentPage === 0 || isFlipping}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.93 }}
                            style={{
                                padding: '6px 18px', borderRadius: '22px',
                                fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.14em',
                                textTransform: 'uppercase', cursor: currentPage === 0 ? 'default' : 'pointer',
                                background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.2)',
                                color: currentPage === 0 ? 'rgba(212,175,55,0.18)' : 'rgba(212,175,55,0.6)',
                                transition: 'all 0.18s',
                            }}
                        >
                            ← Prev
                        </motion.button>

                        <div style={{ textAlign: 'center', minWidth: '80px' }}>
                            <span style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.15em', color: 'rgba(212,175,55,0.3)', display: 'block' }}>
                                {isWritePage ? 'New Entry' : `${currentPage} / ${entries.length}`}
                            </span>
                            {!isWritePage && (
                                <button
                                    onClick={() => { setFlipDir('bwd'); setCurrentPage(0) }}
                                    style={{
                                        marginTop: '3px', background: 'none', border: 'none', cursor: 'pointer',
                                        fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.1em',
                                        color: 'rgba(212,175,55,0.38)', textDecoration: 'underline', textTransform: 'uppercase',
                                    }}
                                >
                                    New Entry
                                </button>
                            )}
                        </div>

                        <motion.button
                            onClick={() => goTo('fwd')}
                            disabled={currentPage >= entries.length || isFlipping}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.93 }}
                            style={{
                                padding: '6px 18px', borderRadius: '22px',
                                fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.14em',
                                textTransform: 'uppercase',
                                cursor: currentPage >= entries.length ? 'default' : 'pointer',
                                background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.2)',
                                color: currentPage >= entries.length ? 'rgba(212,175,55,0.18)' : 'rgba(212,175,55,0.6)',
                                transition: 'all 0.18s',
                            }}
                        >
                            Next →
                        </motion.button>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════
                    RIGHT — Toolbar strip + expandable panel
                    Panel opens within this column, book never shifts
                ═══════════════════════════════════════════════════ */}
                <div style={{
                    width: activeTool ? '280px' : '52px',
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'row',
                    overflow: 'hidden',
                    transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
                    borderLeft: '1px solid rgba(212,175,55,0.1)',
                    background: isLight ? 'rgba(240,228,200,0.5)' : 'rgba(8,4,0,0.65)',
                    backdropFilter: 'blur(32px)',
                    WebkitBackdropFilter: 'blur(32px)',
                }}>
                    {/* Icon strip */}
                    <div style={{
                        width: '52px',
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        padding: '16px 6px 10px',
                        borderRight: activeTool ? '1px solid rgba(212,175,55,0.1)' : 'none',
                    }}>
                        {TOOLBAR_TOOLS.map(tool => (
                            <motion.button
                                key={tool.id}
                                onClick={() => toggleTool(tool.id)}
                                title={tool.label}
                                whileHover={{ scale: 1.08 }}
                                whileTap={{ scale: 0.92 }}
                                style={{
                                    width: '40px', height: '40px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    borderRadius: '10px',
                                    background: activeTool === tool.id ? 'rgba(212,175,55,0.18)' : 'transparent',
                                    border: activeTool === tool.id ? '1px solid rgba(212,175,55,0.4)' : '1px solid transparent',
                                    cursor: 'pointer',
                                    color: activeTool === tool.id ? 'rgba(212,175,55,0.95)' : 'rgba(212,175,55,0.4)',
                                    transition: 'all 0.15s',
                                    flexShrink: 0,
                                }}
                                onMouseEnter={e => {
                                    if (activeTool !== tool.id) {
                                        (e.currentTarget as HTMLElement).style.color = 'rgba(212,175,55,0.75)'
                                            ; (e.currentTarget as HTMLElement).style.background = 'rgba(212,175,55,0.08)'
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (activeTool !== tool.id) {
                                        (e.currentTarget as HTMLElement).style.color = 'rgba(212,175,55,0.4)'
                                            ; (e.currentTarget as HTMLElement).style.background = 'transparent'
                                    }
                                }}
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
                                animate={{ opacity: 1, width: '228px' }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.22 }}
                                style={{
                                    width: '228px',
                                    flexShrink: 0,
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column',
                                }}
                            >
                                <div style={{
                                    padding: '10px 12px 8px',
                                    borderBottom: '1px solid rgba(212,175,55,0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    flexShrink: 0,
                                }}>
                                    <span style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.18em', color: panelMuted, textTransform: 'uppercase' }}>
                                        {TOOLBAR_TOOLS.find(t => t.id === activeTool)?.label}
                                    </span>
                                    <button
                                        onClick={() => setActiveTool(null)}
                                        style={{
                                            background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)',
                                            borderRadius: '6px', cursor: 'pointer',
                                            width: '22px', height: '22px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: panelMuted, fontSize: '10px', fontWeight: 600,
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>

                                    {/* FONT PANEL */}
                                    {activeTool === 'font' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            {WRITING_FONTS.map(f => (
                                                <button key={f.id} onClick={() => setWritingFontId(f.id)}
                                                    style={{
                                                        textAlign: 'left', padding: '6px 10px', borderRadius: '8px',
                                                        fontFamily: f.family, fontStyle: f.style as any, fontSize: '13px',
                                                        cursor: 'pointer',
                                                        background: writingFontId === f.id ? 'rgba(212,175,55,0.14)' : 'transparent',
                                                        border: writingFontId === f.id ? '1px solid rgba(212,175,55,0.35)' : '1px solid transparent',
                                                        color: writingFontId === f.id ? panelText : panelMuted,
                                                        transition: 'all 0.12s',
                                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                    }}>
                                                    {f.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* SIZE PANEL */}
                                    {activeTool === 'size' && (
                                        <div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                                                {FONT_SIZES.map(fs => (
                                                    <button key={fs.id} onClick={() => setFontSizeId(fs.id)}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: '10px',
                                                            padding: '7px 10px', borderRadius: '8px', cursor: 'pointer',
                                                            background: fontSizeId === fs.id ? 'rgba(212,175,55,0.14)' : 'transparent',
                                                            border: fontSizeId === fs.id ? '1px solid rgba(212,175,55,0.35)' : '1px solid transparent',
                                                            color: fontSizeId === fs.id ? 'rgba(212,175,55,0.95)' : panelMuted,
                                                            transition: 'all 0.12s',
                                                        }}>
                                                        <span style={{ fontFamily: writingFont.family, fontSize: fs.px, lineHeight: 1, minWidth: '28px', textAlign: 'right' }}>
                                                            {fs.label}
                                                        </span>
                                                        <span style={{ fontFamily: 'var(--font-jost)', fontSize: '10px', opacity: 0.6 }}>
                                                            {fs.px}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                            <div style={{ padding: '10px', borderRadius: '10px', background: `${paper.bg}cc`, border: `1px solid ${borderColor}` }}>
                                                <p style={{ fontFamily: writingFont.family, fontStyle: writingFont.style as any, fontSize: fontSize.px, lineHeight: fontSize.lh, color: textColor, margin: 0 }}>
                                                    The quick brown fox
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* STICKERS PANEL */}
                                    {activeTool === 'stickers' && (
                                        <div style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
                                            <JournalStickers
                                                onSelect={handleStickerDrop}
                                                onClose={() => setActiveTool(null)}
                                            />
                                        </div>
                                    )}

                                    {/* PAGE / PAPER PANEL */}
                                    {activeTool === 'page' && (
                                        <div>
                                            <p style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: panelMuted, marginBottom: '8px' }}>
                                                Paper Colour
                                            </p>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '14px' }}>
                                                {PAPER_TEXTURES.map(p => (
                                                    <button key={p.id} onClick={() => setPaperTextureId(p.id)}
                                                        title={p.label}
                                                        style={{
                                                            aspectRatio: '1', borderRadius: '9px', cursor: 'pointer',
                                                            background: p.bg, position: 'relative', overflow: 'hidden',
                                                            border: paperTextureId === p.id ? '2.5px solid rgba(212,175,55,0.75)' : '1.5px solid rgba(212,175,55,0.18)',
                                                            boxShadow: paperTextureId === p.id ? '0 0 10px rgba(212,175,55,0.3)' : 'none',
                                                        }}>
                                                        <div style={{ position: 'absolute', left: '3px', right: '3px', top: '50%', height: '0.5px', background: p.lineColor, transform: 'translateY(-50%)' }} />
                                                    </button>
                                                ))}
                                            </div>
                                            <p style={{ fontFamily: 'var(--font-jost)', fontSize: '9px', color: panelMuted }}>
                                                {PAPER_TEXTURES.find(p => p.id === paperTextureId)?.label}
                                            </p>
                                        </div>
                                    )}

                                    {/* RULING PANEL */}
                                    {activeTool === 'ruling' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {RULING_STYLES.map(r => (
                                                <button key={r.id} onClick={() => setRulingStyle(r.id)}
                                                    style={{
                                                        textAlign: 'left', padding: '8px 10px', borderRadius: '8px',
                                                        fontFamily: 'var(--font-jost)', fontSize: '11px', cursor: 'pointer',
                                                        background: rulingStyle === r.id ? 'rgba(212,175,55,0.14)' : 'transparent',
                                                        border: rulingStyle === r.id ? '1px solid rgba(212,175,55,0.35)' : '1px solid transparent',
                                                        color: rulingStyle === r.id ? 'rgba(212,175,55,0.95)' : panelMuted,
                                                        transition: 'all 0.12s',
                                                    }}>
                                                    {r.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* MOOD PANEL */}
                                    {activeTool === 'mood' && (
                                        <div>
                                            <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                                                <div style={{ fontFamily: writingFont.family, fontStyle: 'italic' as any, fontSize: '38px', color: moodInfo.color, lineHeight: 1, marginBottom: '4px' }}>
                                                    {mood}
                                                </div>
                                                <div style={{ fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.2em', color: moodInfo.color, textTransform: 'uppercase' }}>
                                                    {moodInfo.label}
                                                </div>
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