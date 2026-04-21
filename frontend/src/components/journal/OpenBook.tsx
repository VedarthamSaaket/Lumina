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

// ── Fonts from free Google Fonts + native system fonts ─────────────────────
const WRITING_FONTS = [
    { id: 'garamond', label: 'EB Garamond', family: "'EB Garamond', serif", style: 'italic' },
    { id: 'cormorant', label: 'Cormorant', family: "'Cormorant Garamond', serif", style: 'italic' },
    { id: 'cinzel', label: 'Cinzel', family: "'Cinzel', serif", style: 'normal' },
    { id: 'playfair', label: 'Playfair Display', family: "'Playfair Display', serif", style: 'italic' },
    { id: 'crimson', label: 'Crimson Pro', family: "'Crimson Pro', serif", style: 'italic' },
    { id: 'fraunces', label: 'Fraunces', family: "'Fraunces', serif", style: 'italic' },
    { id: 'libre', label: 'Libre Baskerville', family: "'Libre Baskerville', serif", style: 'italic' },
    { id: 'philosopher', label: 'Philosopher', family: "'Philosopher', serif", style: 'italic' },
    { id: 'josefin', label: 'Josefin Sans', family: "'Jost', sans-serif", style: 'normal' },
    { id: 'spectral', label: 'Spectral', family: "Georgia, 'Times New Roman', serif", style: 'italic' },
    { id: 'palatino', label: 'Palatino', family: "Palatino, 'Palatino Linotype', 'Book Antiqua', serif", style: 'italic' },
    { id: 'garamond-native', label: 'Garamond (system)', family: "Garamond, 'Apple Garamond', serif", style: 'italic' },
    { id: 'baskerville', label: 'Baskerville (system)', family: "'Baskerville Old Face', Baskerville, serif", style: 'italic' },
    { id: 'didot', label: 'Didot', family: "Didot, 'GFS Didot', serif", style: 'italic' },
    { id: 'georgia', label: 'Georgia', family: "Georgia, serif", style: 'italic' },
    { id: 'rajdhani', label: 'Rajdhani', family: "'Rajdhani', sans-serif", style: 'normal' },
    { id: 'merriweather', label: 'Merriweather', family: "'Merriweather', serif", style: 'italic' },
    { id: 'lora', label: 'Lora', family: "'Lora', serif", style: 'italic' },
    { id: 'sourceserif', label: 'Source Serif', family: "'Source Serif 4', serif", style: 'normal' },
    { id: 'gentium', label: 'Gentium', family: "'Gentium Book Plus', serif", style: 'italic' },
    { id: 'dmserif', label: 'DM Serif Display', family: "'DM Serif Display', serif", style: 'italic' },
    { id: 'tangerine', label: 'Tangerine', family: "'Tangerine', cursive", style: 'normal' },
    { id: 'dancingscript', label: 'Dancing Script', family: "'Dancing Script', cursive", style: 'normal' },
    { id: 'greatvibes', label: 'Great Vibes', family: "'Great Vibes', cursive", style: 'normal' },
    { id: 'sacramento', label: 'Sacramento', family: "'Sacramento', cursive", style: 'normal' },
    { id: 'pacifico', label: 'Pacifico', family: "'Pacifico', cursive", style: 'normal' },
    { id: 'satisfy', label: 'Satisfy', family: "'Satisfy', cursive", style: 'normal' },
    { id: 'karla', label: 'Karla', family: "'Karla', sans-serif", style: 'normal' },
    { id: 'raleway', label: 'Raleway', family: "'Raleway', sans-serif", style: 'normal' },
    { id: 'josefinsans', label: 'Josefin Sans', family: "'Josefin Sans', sans-serif", style: 'normal' },
    { id: 'quattrocento', label: 'Quattrocento', family: "'Quattrocento', serif", style: 'normal' },
    { id: 'oldstandard', label: 'Old Standard TT', family: "'Old Standard TT', serif", style: 'italic' },
    { id: 'gfsdidot', label: 'GFS Didot', family: "'GFS Didot', serif", style: 'normal' },
    { id: 'cardo', label: 'Cardo', family: "'Cardo', serif", style: 'italic' },
]

const FONT_SIZES = [
    { id: 'xs', label: 'XS', size: '11px', lineH: '22px' },
    { id: 'sm', label: 'SM', size: '13px', lineH: '24px' },
    { id: 'md', label: 'MD', size: '15px', lineH: '28px' },
    { id: 'lg', label: 'LG', size: '18px', lineH: '32px' },
    { id: 'xl', label: 'XL', size: '22px', lineH: '36px' },
    { id: 'heading', label: 'H', size: '28px', lineH: '42px' },
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

// ── Toolbar tool IDs ─────────────────────────────────────────────────────────
type ToolId = 'font' | 'size' | 'stickers' | 'page' | 'ruling' | 'mood' | null

// ── SVG icon paths for toolbar (no emojis) ──────────────────────────────────
const TOOL_ICONS: Record<string, React.ReactNode> = {
    font: (
        <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
            <text x="2" y="15" fontFamily="serif" fontSize="13" fill="currentColor" fontStyle="italic">A</text>
            <text x="11" y="15" fontFamily="sans-serif" fontSize="8" fill="currentColor">a</text>
        </svg>
    ),
    size: (
        <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
            <text x="2" y="13" fontFamily="serif" fontSize="9" fill="currentColor">S</text>
            <text x="8" y="17" fontFamily="serif" fontSize="13" fill="currentColor">M</text>
        </svg>
    ),
    stickers: (
        <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
            <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.2" />
            <path d="M10 10 C10 6 16 6 16 10 C16 14 10 16 10 16 C10 16 10 14 10 10Z" fill="currentColor" fillOpacity="0.35" />
            <circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" />
        </svg>
    ),
    page: (
        <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
            <rect x="4" y="3" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="7" cy="7" r="1.5" fill="currentColor" fillOpacity="0.5" />
            <circle cx="13" cy="7" r="1.5" fill="currentColor" fillOpacity="0.5" />
            <circle cx="7" cy="13" r="1.5" fill="currentColor" fillOpacity="0.5" />
            <circle cx="13" cy="13" r="1.5" fill="currentColor" fillOpacity="0.5" />
        </svg>
    ),
    ruling: (
        <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
            <line x1="4" y1="7" x2="16" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="4" y1="11" x2="16" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="4" y1="15" x2="12" y2="15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.5" />
        </svg>
    ),
    mood: (
        <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
            <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.2" />
            <path d="M7 12.5 C8 13.8 12 13.8 13 12.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            <circle cx="7.5" cy="8.5" r="1" fill="currentColor" />
            <circle cx="12.5" cy="8.5" r="1" fill="currentColor" />
        </svg>
    ),
}

const TOOLBAR_TOOLS: { id: ToolId; label: string }[] = [
    { id: 'font', label: 'Font Family' },
    { id: 'size', label: 'Font Size' },
    { id: 'stickers', label: 'Stickers' },
    { id: 'page', label: 'Paper' },
    { id: 'ruling', label: 'Ruling' },
    { id: 'mood', label: 'Mood' },
]

// ── Ruling SVG layer ─────────────────────────────────────────────────────────
function RulingLayer({ style, paper, pageHeight }: { style: string; paper: typeof PAPER_TEXTURES[0]; pageHeight: number }) {
    if (style === 'blank') return null
    const linesEvery = RULING_STYLES.find(r => r.id === style)?.linesEvery || 28
    const topOffset = 54

    if (style === 'dots') {
        return (
            <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width="100%" height="100%">
                <defs>
                    <pattern id="dp" x="0" y="0" width={linesEvery} height={linesEvery} patternUnits="userSpaceOnUse">
                        <circle cx={linesEvery / 2} cy={linesEvery / 2} r="1.1" fill={paper.lineColor} />
                    </pattern>
                </defs>
                <rect y={topOffset} width="100%" height={pageHeight} fill="url(#dp)" />
            </svg>
        )
    }
    if (style === 'grid') {
        return (
            <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width="100%" height="100%">
                <defs>
                    <pattern id="gp" x="0" y={topOffset} width={linesEvery} height={linesEvery} patternUnits="userSpaceOnUse">
                        <path d={`M${linesEvery} 0L0 0 0 ${linesEvery}`} fill="none" stroke={paper.lineColor} strokeWidth="0.5" />
                    </pattern>
                </defs>
                <rect y={topOffset} width="100%" height={pageHeight} fill="url(#gp)" />
            </svg>
        )
    }
    const lineCount = Math.floor((pageHeight - topOffset) / linesEvery)
    return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
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
    const [currentPage, setCurrentPage] = useState(0)
    const [isFlipping, setIsFlipping] = useState(false)
    const [flipDir, setFlipDir] = useState<'fwd' | 'bwd'>('fwd')
    const [activeTool, setActiveTool] = useState<ToolId>(null)
    const [isLight, setIsLight] = useState(false)

    // Write state
    const [content, setContent] = useState('')
    const [mood, setMood] = useState(5)
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [pageStickers, setPageStickers] = useState<Array<Sticker & { x: number; y: number; scale: number; stickerId: string }>>([])

    // Page style
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
    const lineHeight = fontSize.lineH

    const isWritePage = currentPage === 0
    const currentEntry = !isWritePage ? entries[currentPage - 1] : null
    const prevEntry = currentPage > 1 ? entries[currentPage - 2] : null
    const moodInfo = MOOD_LABELS[mood] || MOOD_LABELS[5]

    // Derived toolbar panel bg from light/dark
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
        }, 420)
    }, [isFlipping, entries.length])

    const handleStickerDrop = useCallback((sticker: Sticker) => {
        const id = `${sticker.id}-${Date.now()}`
        setPageStickers(prev => [...prev, {
            ...sticker,
            stickerId: id,
            x: 25 + Math.random() * 50,
            y: 18 + Math.random() * 55,
            scale: 1,
        }])
        setActiveTool(null)
    }, [])

    const handleSave = async () => {
        if (!content.trim()) return
        await onSave(content, mood, selectedTags, pageStickers)
        setContent(''); setSelectedTags([]); setPageStickers([]); setMood(5)
    }

    const toggleTool = (id: ToolId) => setActiveTool(prev => prev === id ? null : id)

    // ── RENDER ───────────────────────────────────────────────────────────────
    return (
        <div style={{
            position: 'relative',
            width: '100%',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            paddingTop: '58px', // nav height
        }}>
            {/* Back button */}
            <button onClick={onClose} style={{
                position: 'absolute', top: '68px', left: '20px', zIndex: 60,
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

            {/* ── MAIN FLEX ROW ── */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'row',
                overflow: 'hidden',
                padding: '0 16px 0 16px',
            }}>
                {/* ════════════════════════════════════════════════════════
                    LEFT COLUMN — 68% — Book + mood slider
                ════════════════════════════════════════════════════════ */}
                <div style={{
                    flex: '0 0 68%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingRight: '12px',
                    overflow: 'hidden',
                }}>
                    {/* Book */}
                    <motion.div
                        initial={{ scale: 0.6, opacity: 0, rotateX: 22 }}
                        animate={{ scale: 1, opacity: 1, rotateX: 0 }}
                        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                            perspective: '1800px',
                            transformStyle: 'preserve-3d',
                            width: '100%',
                            maxWidth: '820px',
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            width: '100%',
                            height: 'min(540px, 76vh)',
                            transformStyle: 'preserve-3d',
                            transform: 'rotateX(2deg)',
                            boxShadow: '0 40px 100px rgba(0,0,0,0.65), 0 10px 30px rgba(0,0,0,0.45)',
                            borderRadius: '2px 5px 5px 2px',
                            position: 'relative',
                        }}>
                            {/* Spine */}
                            <div style={{
                                position: 'absolute',
                                left: '50%', top: 0, bottom: 0,
                                width: '14px',
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
                                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                                style={{
                                    flex: 1, background: paper.bg, position: 'relative',
                                    overflow: 'hidden', borderRadius: '2px 0 0 2px',
                                    boxShadow: 'inset -8px 0 24px rgba(0,0,0,0.12)',
                                    transformOrigin: 'right center',
                                }}
                            >
                                <RulingLayer style={rulingStyle} paper={paper} pageHeight={540} />
                                <div style={{ position: 'relative', zIndex: 1, padding: '24px 26px 16px 46px', height: '100%', overflow: 'hidden' }}>
                                    {isWritePage ? (
                                        <>
                                            <div style={{
                                                fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.22em',
                                                color: textMuted, textTransform: 'uppercase', marginBottom: '14px',
                                                paddingBottom: '8px', borderBottom: `0.5px solid ${borderColor}`,
                                            }}>
                                                Index of Entries
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', overflow: 'hidden', maxHeight: 'calc(100% - 58px)' }}>
                                                {entries.length === 0 ? (
                                                    <div style={{
                                                        fontFamily: writingFont.family, fontStyle: 'italic',
                                                        fontSize: '14px', color: textMuted, lineHeight: 1.8, marginTop: '20px',
                                                    }}>
                                                        Your first entry awaits.<br />Begin on the facing page →
                                                    </div>
                                                ) : entries.slice(0, 10).map((entry, i) => (
                                                    <motion.button
                                                        key={entry.id}
                                                        onClick={() => { setFlipDir('fwd'); setCurrentPage(i + 1) }}
                                                        initial={{ opacity: 0, x: -8 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: i * 0.035 }}
                                                        style={{
                                                            textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                                                            padding: '4px 7px', borderRadius: '3px',
                                                            borderLeft: `2px solid ${isDarkPaper ? 'rgba(160,140,200,0.22)' : 'rgba(180,130,60,0.28)'}`,
                                                            transition: 'all 0.14s',
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
                                                            fontFamily: writingFont.family, fontStyle: writingFont.style,
                                                            fontSize: '12px', color: textColor, opacity: 0.8,
                                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                        }}>
                                                            {entry.content.slice(0, 52)}…
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
                                                fontFamily: writingFont.family, fontStyle: writingFont.style,
                                                fontSize: fontSize.size, lineHeight,
                                                color: textColor, overflow: 'hidden', maxHeight: 'calc(100% - 72px)',
                                            }}>
                                                {prevEntry.content}
                                            </div>
                                            <div style={{ position: 'absolute', bottom: '14px', left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--font-cinzel)', fontSize: '8px', color: textMuted }}>
                                                {currentPage - 1}
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.18 }}>
                                            <svg width="36" height="36" viewBox="0 0 36 36"><path d="M18 3 L20 13 L30 13 L22 19 L24.5 29 L18 23 L11.5 29 L14 19 L6 13 L16 13Z" fill={textMuted} /></svg>
                                        </div>
                                    )}
                                </div>
                            </motion.div>

                            {/* RIGHT PAGE - active writing/reading page */}
                            <motion.div
                                key={`R-${currentPage}`}
                                initial={{ opacity: 0, rotateY: flipDir === 'bwd' ? 90 : -90 }}
                                animate={{ opacity: 1, rotateY: 0 }}
                                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                                style={{
                                    flex: 1, background: paper.bg, position: 'relative',
                                    overflow: 'hidden', borderRadius: '0 5px 5px 0',
                                    boxShadow: 'inset 6px 0 20px rgba(0,0,0,0.07)',
                                    transformOrigin: 'left center',
                                }}
                            >
                                <RulingLayer style={rulingStyle} paper={paper} pageHeight={540} />

                                {/* Draggable stickers */}
                                {isWritePage && pageStickers.map(s => (
                                    <motion.div
                                        key={s.stickerId}
                                        drag dragMomentum={false}
                                        style={{
                                            position: 'absolute',
                                            left: `${s.x}%`, top: `${s.y}%`,
                                            transform: `rotate(${s.rotation || 0}deg) scale(${s.scale})`,
                                            zIndex: 15, cursor: 'grab',
                                            width: '64px', height: '64px',
                                            userSelect: 'none',
                                        }}
                                        whileDrag={{ cursor: 'grabbing', scale: 1.1 }}
                                        onDoubleClick={() => setPageStickers(prev => prev.filter(x => x.stickerId !== s.stickerId))}
                                    >
                                        <img
                                            src={s.url}
                                            alt={s.label}
                                            width={60}
                                            height={60}
                                            style={{
                                                // Die-cut sticker rendering effect
                                                filter: [
                                                    'drop-shadow(0 0 0px white)',
                                                    'drop-shadow(0 0 1.5px white)',
                                                    'drop-shadow(0 0 3px rgba(255,255,255,0.85))',
                                                    'drop-shadow(0 2px 5px rgba(0,0,0,0.4))',
                                                ].join(' '),
                                                pointerEvents: 'none',
                                            }}
                                        />
                                    </motion.div>
                                ))}

                                <div style={{ position: 'relative', zIndex: 10, padding: '24px 20px 16px 28px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    {isWritePage ? (
                                        <>
                                            {/* Page header */}
                                            <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: `0.5px solid ${borderColor}` }}>
                                                <div style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.18em', color: textMuted, textTransform: 'uppercase' }}>
                                                    {format(new Date(), 'EEEE, MMMM d yyyy')}
                                                    <span style={{ marginLeft: '8px', color: moodInfo.color, opacity: 0.9 }}>· {moodInfo.label}</span>
                                                </div>
                                            </div>

                                            {/* Tags */}
                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                                {TAGS.map(t => (
                                                    <button key={t} onClick={() => setSelectedTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t])}
                                                        style={{
                                                            padding: '2px 7px', borderRadius: '10px', fontSize: '9px',
                                                            fontFamily: 'var(--font-jost)', cursor: 'pointer',
                                                            background: selectedTags.includes(t)
                                                                ? (isDarkPaper ? 'rgba(160,140,200,0.2)' : 'rgba(180,130,60,0.16)')
                                                                : 'transparent',
                                                            border: selectedTags.includes(t)
                                                                ? (isDarkPaper ? '1px solid rgba(160,140,200,0.45)' : '1px solid rgba(180,130,60,0.4)')
                                                                : (isDarkPaper ? '1px solid rgba(160,140,200,0.14)' : '1px solid rgba(180,130,60,0.16)'),
                                                            color: selectedTags.includes(t) ? textColor : textMuted,
                                                            transition: 'all 0.14s',
                                                        }}>
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Textarea */}
                                            <textarea
                                                ref={textareaRef}
                                                value={content}
                                                onChange={e => setContent(e.target.value)}
                                                placeholder="Begin writing…"
                                                style={{
                                                    flex: 1,
                                                    background: 'transparent', border: 'none', outline: 'none',
                                                    resize: 'none',
                                                    fontFamily: writingFont.family,
                                                    fontStyle: writingFont.style as any,
                                                    fontSize: fontSize.size,
                                                    lineHeight,
                                                    color: textColor,
                                                    caretColor: isDarkPaper ? 'rgba(212,175,55,0.9)' : 'rgba(100,60,10,0.9)',
                                                    overflowY: 'auto',
                                                    paddingLeft: '6px',
                                                }}
                                            />

                                            {/* Bottom row */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '7px', borderTop: `0.5px solid ${borderColor}` }}>
                                                <span style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', color: textMuted, letterSpacing: '0.1em' }}>
                                                    {content.length > 0 ? `${content.split(/\s+/).filter(Boolean).length} words` : 'empty'}
                                                </span>
                                                <motion.button
                                                    onClick={handleSave}
                                                    disabled={isSaving || !content.trim()}
                                                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                                    style={{
                                                        padding: '6px 18px', borderRadius: '22px',
                                                        fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.16em',
                                                        textTransform: 'uppercase', cursor: content.trim() ? 'pointer' : 'not-allowed',
                                                        background: isDarkPaper ? 'rgba(160,140,200,0.16)' : 'rgba(180,130,60,0.16)',
                                                        border: isDarkPaper ? '1px solid rgba(160,140,200,0.38)' : '1px solid rgba(180,130,60,0.38)',
                                                        color: textColor,
                                                        opacity: !content.trim() || isSaving ? 0.35 : 1,
                                                        transition: 'all 0.18s',
                                                    }}
                                                >
                                                    {isSaving ? 'Saving…' : 'Save ✦'}
                                                </motion.button>
                                            </div>
                                        </>
                                    ) : currentEntry ? (
                                        <>
                                            <div style={{ marginBottom: '10px', paddingBottom: '8px', borderBottom: `0.5px solid ${borderColor}` }}>
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
                                                            <span key={t} style={{ padding: '1px 6px', borderRadius: '8px', fontSize: '8px', fontFamily: 'var(--font-jost)', background: isDarkPaper ? 'rgba(160,140,200,0.1)' : 'rgba(180,130,60,0.1)', border: isDarkPaper ? '1px solid rgba(160,140,200,0.2)' : '1px solid rgba(180,130,60,0.2)', color: textMuted }}>{t}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{
                                                fontFamily: writingFont.family, fontStyle: writingFont.style as any,
                                                fontSize: fontSize.size, lineHeight,
                                                color: textColor, overflow: 'auto', flex: 1, paddingLeft: '6px',
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

                    {/* Navigation */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '14px',
                        marginTop: '14px',
                    }}>
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
                                <button onClick={() => { setFlipDir('bwd'); setCurrentPage(0) }}
                                    style={{ marginTop: '3px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.1em', color: 'rgba(212,175,55,0.38)', textDecoration: 'underline', textTransform: 'uppercase' }}>
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

                {/* ════════════════════════════════════════════════════════
                    RIGHT COLUMN — 32% — Toolbar (always visible) + Panels
                    The book NEVER moves when panels open. Everything stays
                    inside this right column.
                ════════════════════════════════════════════════════════ */}
                <div style={{
                    flex: '0 0 32%',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    borderLeft: '1px solid rgba(212,175,55,0.1)',
                    background: isLight ? 'rgba(240,228,200,0.35)' : 'rgba(8,4,0,0.55)',
                    backdropFilter: 'blur(32px)',
                    WebkitBackdropFilter: 'blur(32px)',
                }}>
                    {/* ── Toolbar icon strip (always visible, top of right column) ── */}
                    <div style={{
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        padding: '16px 10px 10px',
                        borderBottom: '1px solid rgba(212,175,55,0.1)',
                    }}>
                        {TOOLBAR_TOOLS.map(tool => (
                            <motion.button
                                key={tool.id}
                                onClick={() => toggleTool(tool.id)}
                                title={tool.label}
                                whileHover={{ scale: 1.06 }}
                                whileTap={{ scale: 0.93 }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '8px 12px', borderRadius: '10px',
                                    background: activeTool === tool.id
                                        ? 'rgba(212,175,55,0.16)'
                                        : 'transparent',
                                    border: activeTool === tool.id
                                        ? '1px solid rgba(212,175,55,0.38)'
                                        : '1px solid transparent',
                                    cursor: 'pointer',
                                    color: activeTool === tool.id
                                        ? 'rgba(212,175,55,0.95)'
                                        : 'rgba(212,175,55,0.42)',
                                    transition: 'all 0.15s',
                                    textAlign: 'left',
                                }}
                                onMouseEnter={e => {
                                    if (activeTool !== tool.id) {
                                        const el = e.currentTarget as HTMLElement
                                        el.style.color = 'rgba(212,175,55,0.75)'
                                        el.style.background = 'rgba(212,175,55,0.07)'
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (activeTool !== tool.id) {
                                        const el = e.currentTarget as HTMLElement
                                        el.style.color = 'rgba(212,175,55,0.42)'
                                        el.style.background = 'transparent'
                                    }
                                }}
                            >
                                <span style={{ flexShrink: 0 }}>{TOOL_ICONS[tool.id!]}</span>
                                <span style={{
                                    fontFamily: 'var(--font-jost)', fontSize: '10px',
                                    letterSpacing: '0.1em', textTransform: 'uppercase',
                                }}>
                                    {tool.label}
                                </span>
                                <span style={{ marginLeft: 'auto', fontSize: '10px', opacity: 0.4 }}>
                                    {activeTool === tool.id ? '▾' : '▸'}
                                </span>
                            </motion.button>
                        ))}
                    </div>

                    {/* ── Panel area — expands below icon strip, fills remaining height ── */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                    }}>
                        <AnimatePresence mode="wait">
                            {activeTool === 'font' && (
                                <motion.div
                                    key="font"
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.18 }}
                                    style={{ padding: '12px 10px' }}
                                >
                                    <p style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', color: panelMuted, marginBottom: '8px' }}>
                                        Font Family
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
                                        {WRITING_FONTS.map(f => (
                                            <button key={f.id} onClick={() => setWritingFontId(f.id)}
                                                style={{
                                                    textAlign: 'left', padding: '6px 10px', borderRadius: '8px',
                                                    fontFamily: f.family, fontStyle: f.style as any, fontSize: '14px',
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
                                </motion.div>
                            )}

                            {activeTool === 'size' && (
                                <motion.div
                                    key="size"
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.18 }}
                                    style={{ padding: '12px 10px' }}
                                >
                                    <p style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', color: panelMuted, marginBottom: '8px' }}>
                                        Font Size
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {FONT_SIZES.map(fs => (
                                            <button key={fs.id} onClick={() => setFontSizeId(fs.id)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '10px',
                                                    padding: '8px 12px', borderRadius: '9px', cursor: 'pointer',
                                                    background: fontSizeId === fs.id ? 'rgba(212,175,55,0.14)' : 'transparent',
                                                    border: fontSizeId === fs.id ? '1px solid rgba(212,175,55,0.35)' : '1px solid transparent',
                                                    color: fontSizeId === fs.id ? 'rgba(212,175,55,0.95)' : panelMuted,
                                                    transition: 'all 0.12s',
                                                }}>
                                                <span style={{ fontFamily: writingFont.family, fontSize: fs.size, lineHeight: 1, minWidth: '28px', textAlign: 'right' }}>
                                                    {fs.label}
                                                </span>
                                                <span style={{ fontFamily: 'var(--font-jost)', fontSize: '10px', letterSpacing: '0.08em', opacity: 0.6 }}>
                                                    {fs.size}
                                                </span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Live preview */}
                                    <div style={{
                                        marginTop: '14px', padding: '10px 12px', borderRadius: '10px',
                                        background: isDarkPaper ? paper.bg + '22' : paper.bg + '88',
                                        border: `1px solid ${borderColor}`,
                                    }}>
                                        <p style={{
                                            fontFamily: writingFont.family, fontStyle: writingFont.style as any,
                                            fontSize: fontSize.size, lineHeight, color: textColor,
                                            margin: 0,
                                        }}>
                                            The quick brown fox
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            {activeTool === 'stickers' && (
                                <motion.div
                                    key="stickers"
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.18 }}
                                    style={{ height: 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column' }}
                                >
                                    <JournalStickers
                                        onSelect={handleStickerDrop}
                                        onClose={() => setActiveTool(null)}
                                    />
                                </motion.div>
                            )}

                            {activeTool === 'page' && (
                                <motion.div
                                    key="page"
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.18 }}
                                    style={{ padding: '12px 10px' }}
                                >
                                    <p style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', color: panelMuted, marginBottom: '8px' }}>
                                        Paper Colour
                                    </p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '7px', marginBottom: '16px' }}>
                                        {PAPER_TEXTURES.map(p => (
                                            <button key={p.id} onClick={() => setPaperTextureId(p.id)}
                                                title={p.label}
                                                style={{
                                                    aspectRatio: '1', borderRadius: '9px', cursor: 'pointer',
                                                    background: p.bg, position: 'relative', overflow: 'hidden',
                                                    border: paperTextureId === p.id
                                                        ? '2.5px solid rgba(212,175,55,0.75)'
                                                        : '1.5px solid rgba(212,175,55,0.18)',
                                                    boxShadow: paperTextureId === p.id ? '0 0 10px rgba(212,175,55,0.3)' : 'none',
                                                    transition: 'all 0.14s',
                                                }}>
                                                {/* Line preview */}
                                                <div style={{ position: 'absolute', left: '4px', right: '4px', top: '50%', height: '0.5px', background: p.lineColor, transform: 'translateY(-50%)' }} />
                                            </button>
                                        ))}
                                    </div>
                                    <p style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: panelMuted, marginBottom: '4px' }}>
                                        Selected: <span style={{ color: 'rgba(212,175,55,0.7)' }}>{PAPER_TEXTURES.find(p => p.id === paperTextureId)?.label}</span>
                                    </p>
                                </motion.div>
                            )}

                            {activeTool === 'ruling' && (
                                <motion.div
                                    key="ruling"
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.18 }}
                                    style={{ padding: '12px 10px' }}
                                >
                                    <p style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', color: panelMuted, marginBottom: '8px' }}>
                                        Page Ruling
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {RULING_STYLES.map(r => (
                                            <button key={r.id} onClick={() => setRulingStyle(r.id)}
                                                style={{
                                                    textAlign: 'left', padding: '8px 12px', borderRadius: '9px',
                                                    fontFamily: 'var(--font-jost)', fontSize: '12px', cursor: 'pointer',
                                                    background: rulingStyle === r.id ? 'rgba(212,175,55,0.14)' : 'transparent',
                                                    border: rulingStyle === r.id ? '1px solid rgba(212,175,55,0.35)' : '1px solid transparent',
                                                    color: rulingStyle === r.id ? 'rgba(212,175,55,0.95)' : panelMuted,
                                                    transition: 'all 0.12s',
                                                }}>
                                                {r.label}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {activeTool === 'mood' && (
                                <motion.div
                                    key="mood"
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.18 }}
                                    style={{ padding: '14px 12px' }}
                                >
                                    <p style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.16em', textTransform: 'uppercase', color: panelMuted, marginBottom: '10px' }}>
                                        Mood
                                    </p>
                                    <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                                        <div style={{ fontFamily: 'var(--font-playfair)', fontStyle: 'italic', fontSize: '36px', color: moodInfo.color, lineHeight: 1, marginBottom: '4px' }}>
                                            {mood}
                                        </div>
                                        <div style={{ fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.22em', color: moodInfo.color, textTransform: 'uppercase' }}>
                                            {moodInfo.label}
                                        </div>
                                    </div>
                                    <input type="range" min={1} max={10} value={mood}
                                        onChange={e => setMood(+e.target.value)}
                                        className="mood-slider" style={{ width: '100%', marginBottom: '12px' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-cinzel)', fontSize: '8px', color: panelMuted, marginBottom: '14px' }}>
                                        <span>low</span><span>high</span>
                                    </div>
                                    {/* Mood swatches */}
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
                                </motion.div>
                            )}

                            {/* Placeholder when no tool active */}
                            {activeTool === null && (
                                <motion.div
                                    key="idle"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    style={{ padding: '20px 12px', textAlign: 'center' }}
                                >
                                    <p style={{
                                        fontFamily: 'var(--font-eb-garamond)', fontStyle: 'italic',
                                        fontSize: '13px', color: 'rgba(212,175,55,0.25)',
                                        lineHeight: 1.7,
                                    }}>
                                        Select a tool above to customise your page.
                                    </p>

                                    {/* Mood slider quick access */}
                                    <div style={{ marginTop: '20px', padding: '12px', borderRadius: '12px', background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.1)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(212,175,55,0.45)' }}>
                                                Mood
                                            </span>
                                            <span style={{ fontFamily: 'var(--font-playfair)', fontStyle: 'italic', fontSize: '20px', color: moodInfo.color, lineHeight: 1 }}>
                                                {mood}
                                            </span>
                                        </div>
                                        <input type="range" min={1} max={10} value={mood}
                                            onChange={e => setMood(+e.target.value)}
                                            className="mood-slider" style={{ width: '100%' }} />
                                        <div style={{ textAlign: 'center', marginTop: '6px', fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: moodInfo.color, opacity: 0.8 }}>
                                            {moodInfo.label}
                                        </div>
                                    </div>

                                    {/* Current settings summary */}
                                    <div style={{ marginTop: '14px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(212,175,55,0.04)', border: '1px solid rgba(212,175,55,0.08)', textAlign: 'left' }}>
                                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '9px', color: 'rgba(212,175,55,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Current Style</p>
                                        {[
                                            ['Font', WRITING_FONTS.find(f => f.id === writingFontId)?.label],
                                            ['Size', FONT_SIZES.find(f => f.id === fontSizeId)?.label],
                                            ['Paper', PAPER_TEXTURES.find(p => p.id === paperTextureId)?.label],
                                            ['Ruling', RULING_STYLES.find(r => r.id === rulingStyle)?.label],
                                        ].map(([k, v]) => (
                                            <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                                <span style={{ fontFamily: 'var(--font-jost)', fontSize: '10px', color: 'rgba(212,175,55,0.28)' }}>{k}</span>
                                                <span style={{ fontFamily: 'var(--font-jost)', fontSize: '10px', color: 'rgba(212,175,55,0.55)' }}>{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    )
}