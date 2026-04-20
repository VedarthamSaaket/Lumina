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

// ── All fonts available including Google Fonts + web-safe options ──
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
    { id: 'garamond-native', label: 'Garamond (native)', family: "Garamond, 'Apple Garamond', 'ITC Garamond Std', serif", style: 'italic' },
    { id: 'baskerville', label: 'Baskerville (native)', family: "'Baskerville Old Face', Baskerville, 'Baskerville MT', serif", style: 'italic' },
    { id: 'futura', label: 'Century Gothic', family: "'Century Gothic', CenturyGothic, AppleGothic, sans-serif", style: 'normal' },
    { id: 'didot', label: 'Didot', family: "Didot, 'GFS Didot', 'Modern No. 20', serif", style: 'italic' },
    { id: 'georgia', label: 'Georgia', family: "Georgia, serif", style: 'italic' },
    { id: 'rajdhani', label: 'Rajdhani', family: "'Rajdhani', sans-serif", style: 'normal' },
]

const FONT_SIZES = [
    { id: 'xs', label: 'XS', size: '11px', lineH: '24px' },
    { id: 'sm', label: 'SM', size: '13px', lineH: '26px' },
    { id: 'md', label: 'MD', size: '15px', lineH: '28px' },
    { id: 'lg', label: 'LG', size: '18px', lineH: '32px' },
    { id: 'xl', label: 'XL', size: '22px', lineH: '36px' },
    { id: 'heading', label: 'H', size: '28px', lineH: '40px' },
]

const PAPER_TEXTURES = [
    { id: 'parchment', label: 'Parchment', bg: '#f5ead0', lineColor: 'rgba(180,140,80,0.22)', marginColor: 'rgba(200,80,80,0.14)' },
    { id: 'cream', label: 'Cream', bg: '#fafaf4', lineColor: 'rgba(100,100,120,0.14)', marginColor: 'rgba(200,80,80,0.1)' },
    { id: 'blush', label: 'Blush', bg: '#f9eae8', lineColor: 'rgba(200,130,120,0.18)', marginColor: 'rgba(180,80,80,0.12)' },
    { id: 'sage', label: 'Sage', bg: '#e8f0e8', lineColor: 'rgba(80,120,80,0.16)', marginColor: 'rgba(80,180,80,0.1)' },
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

type ToolPanel = null | 'font' | 'stickers' | 'page' | 'mood'

function RulingLayer({ style, paper, pageHeight }: { style: string; paper: typeof PAPER_TEXTURES[0]; pageHeight: number }) {
    if (style === 'blank') return null

    const linesEvery = RULING_STYLES.find(r => r.id === style)?.linesEvery || 28
    const topOffset = 56

    if (style === 'dots') {
        return (
            <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width="100%" height="100%">
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
            <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width="100%" height="100%">
                <defs>
                    <pattern id="grid-pattern" x="0" y={topOffset} width={linesEvery} height={linesEvery} patternUnits="userSpaceOnUse">
                        <path d={`M ${linesEvery} 0 L 0 0 0 ${linesEvery}`} fill="none" stroke={paper.lineColor} strokeWidth="0.5" />
                    </pattern>
                </defs>
                <rect y={topOffset} width="100%" height={pageHeight} fill="url(#grid-pattern)" />
            </svg>
        )
    }

    const lineCount = Math.floor((pageHeight - topOffset) / linesEvery)
    return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {Array.from({ length: lineCount }, (_, i) => (
                <div key={i} style={{
                    position: 'absolute',
                    left: '48px', right: '14px',
                    top: `${topOffset + (i + 1) * linesEvery}px`,
                    height: '0.8px',
                    background: paper.lineColor,
                }} />
            ))}
            {/* Red margin line */}
            <div style={{
                position: 'absolute',
                top: `${topOffset}px`, bottom: '14px', left: '44px',
                width: '1px',
                background: paper.marginColor,
            }} />
        </div>
    )
}

export default function OpenBook({ entries, onSave, onClose, isSaving }: OpenBookProps) {
    const [currentPage, setCurrentPage] = useState(0)
    const [isFlipping, setIsFlipping] = useState(false)
    const [flipDir, setFlipDir] = useState<'fwd' | 'bwd'>('fwd')
    const [activePanel, setActivePanel] = useState<ToolPanel>(null)
    const [isLight, setIsLight] = useState(false)

    // Write state
    const [content, setContent] = useState('')
    const [mood, setMood] = useState(5)
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [pageStickers, setPageStickers] = useState<Array<Sticker & { x: number; y: number; scale: number; stickerId: string }>>([])

    // Page customisation
    const [rulingStyle, setRulingStyle] = useState('college')
    const [paperTextureId, setPaperTextureId] = useState('parchment')
    const [writingFontId, setWritingFontId] = useState('garamond')
    const [fontSizeId, setFontSizeId] = useState('md')

    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const pageRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setIsLight(document.documentElement.classList.contains('light'))
        const obs = new MutationObserver(() => setIsLight(document.documentElement.classList.contains('light')))
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
        return () => obs.disconnect()
    }, [])

    const paper = PAPER_TEXTURES.find(p => p.id === paperTextureId) || PAPER_TEXTURES[0]
    const writingFont = WRITING_FONTS.find(f => f.id === writingFontId) || WRITING_FONTS[0]
    const fontSize = FONT_SIZES.find(f => f.id === fontSizeId) || FONT_SIZES[2]
    const currentRuling = RULING_STYLES.find(r => r.id === rulingStyle) || RULING_STYLES[0]

    const isWritePage = currentPage === 0
    const currentEntry = !isWritePage ? entries[currentPage - 1] : null
    const prevEntry = currentPage > 1 ? entries[currentPage - 2] : null

    // Text color for page (dark papers need light text)
    const isDarkPaper = paperTextureId === 'midnight' || paperTextureId === 'onyx'
    const textColor = isDarkPaper ? 'rgba(220,200,240,0.9)' : 'rgba(35,20,5,0.88)'
    const textMuted = isDarkPaper ? 'rgba(220,200,240,0.5)' : 'rgba(100,70,30,0.5)'
    const borderColor = isDarkPaper ? 'rgba(160,140,200,0.18)' : 'rgba(180,140,80,0.2)'

    // Line height driven by ruling style AND font size
    const lineHeight = Math.max(
        parseInt(fontSize.lineH),
        (currentRuling.linesEvery || 28)
    ) + 'px'

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

    const handleStickerDrop = (sticker: Sticker) => {
        const id = `${sticker.id}-${Date.now()}`
        setPageStickers(prev => [...prev, {
            ...sticker,
            stickerId: id,
            x: 30 + Math.random() * 50,
            y: 20 + Math.random() * 55,
            scale: 1,
        }])
        setActivePanel(null)
    }

    const handleSave = async () => {
        if (!content.trim()) return
        await onSave(content, mood, selectedTags, pageStickers)
        setContent(''); setSelectedTags([]); setPageStickers([]); setMood(5)
    }

    const moodInfo = MOOD_LABELS[mood] || MOOD_LABELS[5]

    // ── TOOLBAR SVG ICONS (no emojis) ──
    const TOOLBAR_ITEMS: { id: ToolPanel; svgIcon: string; tooltip: string }[] = [
        {
            id: 'font', tooltip: 'Typography',
            svgIcon: `<svg viewBox="0 0 20 20" fill="none"><text x="3" y="14" font-family="serif" font-size="11" fill="currentColor" font-style="italic">A</text><text x="10" y="16" font-family="sans-serif" font-size="8" fill="currentColor">a</text><line x1="2" y1="17" x2="18" y2="17" stroke="currentColor" stroke-width="0.8" opacity="0.4"/></svg>`,
        },
        {
            id: 'stickers', tooltip: 'Stickers',
            svgIcon: `<svg viewBox="0 0 20 20" fill="none"><path d="M10 3 C13.9 3 17 6.1 17 10 C17 12.5 15.5 13.5 14 13 C13 12.7 13 11 11 11 L10 17 C6.7 16.4 3 13.5 3 10 C3 6.1 6.1 3 10 3Z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/><circle cx="9" cy="8" r="1" fill="currentColor"/><circle cx="13" cy="7" r="0.8" fill="currentColor" opacity="0.7"/></svg>`,
        },
        {
            id: 'page', tooltip: 'Page Style',
            svgIcon: `<svg viewBox="0 0 20 20" fill="none"><rect x="4" y="3" width="12" height="14" rx="1.2" stroke="currentColor" stroke-width="1.1"/><line x1="6" y1="7" x2="14" y2="7" stroke="currentColor" stroke-width="0.9" opacity="0.7"/><line x1="6" y1="10" x2="14" y2="10" stroke="currentColor" stroke-width="0.9" opacity="0.7"/><line x1="6" y1="13" x2="11" y2="13" stroke="currentColor" stroke-width="0.9" opacity="0.5"/></svg>`,
        },
        {
            id: 'mood', tooltip: 'Mood',
            svgIcon: `<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.1"/><path d="M7 12 C7.8 13.5 12.2 13.5 13 12" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><circle cx="7.5" cy="8.5" r="1" fill="currentColor"/><circle cx="12.5" cy="8.5" r="1" fill="currentColor"/></svg>`,
        },
    ]

    const accentGold = 'rgba(212,175,55,0.7)'
    const panelBg = isLight ? 'rgba(245,235,210,0.97)' : 'rgba(12,6,1,0.96)'
    const panelBorder = isLight ? 'rgba(180,140,60,0.32)' : 'rgba(212,175,55,0.25)'
    const panelText = isLight ? 'rgba(42,26,8,0.9)' : 'rgba(254,244,228,0.9)'
    const panelMuted = isLight ? 'rgba(100,70,30,0.55)' : 'rgba(254,244,228,0.4)'

    return (
        <div style={{
            position: 'relative',
            width: '100%', height: '100vh',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
        }}>
            {/* Back button */}
            <button onClick={onClose} style={{
                position: 'absolute', top: '80px', left: '24px', zIndex: 60,
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

            {/* ── Book Container ── */}
            <motion.div
                initial={{ scale: 0.55, opacity: 0, rotateX: 22 }}
                animate={{ scale: 1, opacity: 1, rotateX: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                style={{ perspective: '1800px', transformStyle: 'preserve-3d' }}
            >
                <div style={{
                    display: 'flex',
                    width: 'min(920px, 96vw)',
                    height: 'min(600px, 88vh)',
                    transformStyle: 'preserve-3d',
                    transform: 'rotateX(3deg)',
                    boxShadow: '0 50px 120px rgba(0,0,0,0.72), 0 12px 35px rgba(0,0,0,0.5)',
                    borderRadius: '2px 5px 5px 2px',
                    position: 'relative',
                }}>
                    {/* Spine */}
                    <div style={{
                        position: 'absolute',
                        left: '50%', top: 0, bottom: 0,
                        width: '16px',
                        transform: 'translateX(-50%)',
                        background: 'linear-gradient(to right, rgba(0,0,0,0.35), rgba(50,25,5,0.55), rgba(0,0,0,0.35))',
                        zIndex: 20,
                        boxShadow: '0 0 18px rgba(0,0,0,0.45)',
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
                            boxShadow: 'inset -8px 0 24px rgba(0,0,0,0.14)',
                            transformOrigin: 'right center',
                        }}
                    >
                        <RulingLayer style={rulingStyle} paper={paper} pageHeight={600} />

                        <div style={{ position: 'relative', zIndex: 1, padding: '28px 30px 20px 50px', height: '100%', overflow: 'hidden' }}>
                            {isWritePage ? (
                                // Table of contents / recent entries
                                <>
                                    <div style={{
                                        fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.22em',
                                        color: textMuted, textTransform: 'uppercase', marginBottom: '18px',
                                        paddingBottom: '10px', borderBottom: `0.5px solid ${borderColor}`,
                                    }}>
                                        Index of Entries
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden', maxHeight: 'calc(100% - 60px)' }}>
                                        {entries.length === 0 ? (
                                            <div style={{
                                                fontFamily: writingFont.family, fontStyle: 'italic',
                                                fontSize: '14px', color: textMuted, lineHeight: 1.8, marginTop: '24px',
                                            }}>
                                                Your first entry awaits.<br />Begin on the facing page →
                                            </div>
                                        ) : entries.slice(0, 10).map((entry, i) => (
                                            <motion.button
                                                key={entry.id}
                                                onClick={() => { setFlipDir('fwd'); setCurrentPage(i + 1) }}
                                                initial={{ opacity: 0, x: -8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.04 }}
                                                style={{
                                                    textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                                                    padding: '5px 8px', borderRadius: '3px',
                                                    borderLeft: `2px solid ${isDarkPaper ? 'rgba(160,140,200,0.25)' : 'rgba(180,130,60,0.3)'}`,
                                                    transition: 'all 0.15s',
                                                }}
                                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = isDarkPaper ? 'rgba(160,140,200,0.07)' : 'rgba(180,130,60,0.07)'; (e.currentTarget as HTMLElement).style.borderLeftColor = isDarkPaper ? 'rgba(160,140,200,0.5)' : 'rgba(180,130,60,0.6)' }}
                                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.borderLeftColor = isDarkPaper ? 'rgba(160,140,200,0.25)' : 'rgba(180,130,60,0.3)' }}
                                            >
                                                <div style={{
                                                    fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.1em',
                                                    color: textMuted, marginBottom: '2px',
                                                }}>
                                                    {format(new Date(entry.created_at), 'MMM d, yyyy')}
                                                    {entry.mood_score && (
                                                        <span style={{ marginLeft: '6px', color: MOOD_LABELS[entry.mood_score]?.color || textMuted }}>
                                                            · {MOOD_LABELS[entry.mood_score]?.label}
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{
                                                    fontFamily: writingFont.family, fontStyle: writingFont.style,
                                                    fontSize: '12px', color: textColor, opacity: 0.82,
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                }}>
                                                    {entry.content.slice(0, 55)}…
                                                </div>
                                            </motion.button>
                                        ))}
                                    </div>
                                    {/* Page number */}
                                    <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--font-cinzel)', fontSize: '8px', color: textMuted, letterSpacing: '0.12em' }}>i</div>
                                </>
                            ) : prevEntry ? (
                                <>
                                    <div style={{
                                        fontFamily: 'var(--font-cinzel)', fontSize: '8.5px', letterSpacing: '0.16em',
                                        color: textMuted, marginBottom: '12px',
                                    }}>
                                        {format(new Date(prevEntry.created_at), 'EEEE, MMMM d')}
                                    </div>
                                    <div style={{
                                        fontFamily: writingFont.family, fontStyle: writingFont.style,
                                        fontSize: fontSize.size, lineHeight: lineHeight,
                                        color: textColor, overflow: 'hidden',
                                        maxHeight: 'calc(100% - 80px)',
                                    }}>
                                        {prevEntry.content}
                                    </div>
                                    <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--font-cinzel)', fontSize: '8px', color: textMuted, letterSpacing: '0.12em' }}>
                                        {currentPage - 1}
                                    </div>
                                </>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.2 }}>
                                    <svg width="40" height="40" viewBox="0 0 40 40">
                                        <path d="M20 4 L22.2 14.4 L32.4 14.4 L24.2 20.4 L26.4 30.8 L20 24.8 L13.6 30.8 L15.8 20.4 L7.6 14.4 L17.8 14.4Z" fill={textMuted} />
                                    </svg>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* RIGHT PAGE */}
                    <motion.div
                        key={`R-${currentPage}`}
                        ref={pageRef}
                        initial={{ opacity: 0, rotateY: flipDir === 'bwd' ? 90 : -90 }}
                        animate={{ opacity: 1, rotateY: 0 }}
                        transition={{ duration: 0.42, ease: [0.4, 0, 0.2, 1] }}
                        style={{
                            flex: 1, background: paper.bg, position: 'relative',
                            overflow: 'hidden', borderRadius: '0 5px 5px 0',
                            boxShadow: 'inset 6px 0 22px rgba(0,0,0,0.08)',
                            transformOrigin: 'left center',
                        }}
                    >
                        <RulingLayer style={rulingStyle} paper={paper} pageHeight={600} />

                        {/* Stickers layer */}
                        {isWritePage && pageStickers.map(s => (
                            <motion.div
                                key={s.stickerId}
                                drag dragMomentum={false}
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
                                dangerouslySetInnerHTML={{ __html: s.svgContent }}
                            />
                        ))}

                        <div style={{ position: 'relative', zIndex: 10, padding: '28px 55px 20px 30px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                            {isWritePage ? (
                                <>
                                    {/* Page header */}
                                    <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: `0.5px solid ${borderColor}` }}>
                                        <div style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8.5px', letterSpacing: '0.18em', color: textMuted, textTransform: 'uppercase' }}>
                                            {format(new Date(), 'EEEE, MMMM d yyyy')}
                                            <span style={{ marginLeft: '8px', color: moodInfo.color, opacity: 0.85 }}>· {moodInfo.label}</span>
                                        </div>
                                    </div>

                                    {/* Tags */}
                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                        {TAGS.map(t => (
                                            <button key={t} onClick={() => setSelectedTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t])}
                                                style={{
                                                    padding: '2px 8px', borderRadius: '10px', fontSize: '9px',
                                                    fontFamily: 'var(--font-jost)', cursor: 'pointer',
                                                    background: selectedTags.includes(t)
                                                        ? (isDarkPaper ? 'rgba(160,140,200,0.22)' : 'rgba(180,130,60,0.18)')
                                                        : 'transparent',
                                                    border: selectedTags.includes(t)
                                                        ? (isDarkPaper ? '1px solid rgba(160,140,200,0.5)' : '1px solid rgba(180,130,60,0.45)')
                                                        : (isDarkPaper ? '1px solid rgba(160,140,200,0.15)' : '1px solid rgba(180,130,60,0.18)'),
                                                    color: selectedTags.includes(t) ? textColor : textMuted,
                                                    transition: 'all 0.15s',
                                                }}>
                                                {t}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Textarea - text should sit on the ruling lines */}
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
                                            fontStyle: writingFont.style,
                                            fontSize: fontSize.size,
                                            lineHeight: lineHeight,
                                            color: textColor,
                                            caretColor: isDarkPaper ? 'rgba(212,175,55,0.9)' : 'rgba(100,60,10,0.9)',
                                            overflowY: 'auto',
                                            // Indent to sit after the margin line
                                            paddingLeft: '6px',
                                        }}
                                    />

                                    {/* Bottom row */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: `0.5px solid ${borderColor}` }}>
                                        <span style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', color: textMuted, letterSpacing: '0.1em' }}>
                                            {content.length > 0 ? `${content.length} chars` : 'empty'}
                                        </span>
                                        <motion.button
                                            onClick={handleSave}
                                            disabled={isSaving || !content.trim()}
                                            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                            style={{
                                                padding: '7px 20px', borderRadius: '22px',
                                                fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.18em',
                                                textTransform: 'uppercase', cursor: content.trim() ? 'pointer' : 'not-allowed',
                                                background: isDarkPaper ? 'rgba(160,140,200,0.18)' : 'rgba(180,130,60,0.18)',
                                                border: isDarkPaper ? '1px solid rgba(160,140,200,0.4)' : '1px solid rgba(180,130,60,0.4)',
                                                color: textColor,
                                                opacity: !content.trim() || isSaving ? 0.38 : 1,
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            {isSaving ? 'Saving…' : 'Save ✦'}
                                        </motion.button>
                                    </div>
                                </>
                            ) : currentEntry ? (
                                <>
                                    <div style={{ marginBottom: '12px', paddingBottom: '10px', borderBottom: `0.5px solid ${borderColor}` }}>
                                        <div style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8.5px', letterSpacing: '0.18em', color: textMuted, textTransform: 'uppercase' }}>
                                            {format(new Date(currentEntry.created_at), 'EEEE, MMMM d yyyy')}
                                            {currentEntry.mood_score && (
                                                <span style={{ marginLeft: '8px', color: MOOD_LABELS[currentEntry.mood_score]?.color }}>
                                                    · {MOOD_LABELS[currentEntry.mood_score]?.label}
                                                </span>
                                            )}
                                        </div>
                                        {currentEntry.tags && currentEntry.tags.length > 0 && (
                                            <div style={{ display: 'flex', gap: '4px', marginTop: '5px', flexWrap: 'wrap' }}>
                                                {currentEntry.tags.map(t => (
                                                    <span key={t} style={{ padding: '1px 7px', borderRadius: '8px', fontSize: '8px', fontFamily: 'var(--font-jost)', background: isDarkPaper ? 'rgba(160,140,200,0.1)' : 'rgba(180,130,60,0.1)', border: isDarkPaper ? '1px solid rgba(160,140,200,0.22)' : '1px solid rgba(180,130,60,0.22)', color: textMuted }}>{t}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{
                                        fontFamily: writingFont.family, fontStyle: writingFont.style,
                                        fontSize: fontSize.size, lineHeight: lineHeight,
                                        color: textColor, overflow: 'auto', flex: 1,
                                        paddingLeft: '6px',
                                    }}>
                                        {currentEntry.content}
                                    </div>
                                    <div style={{ position: 'absolute', bottom: '16px', right: '60px', fontFamily: 'var(--font-cinzel)', fontSize: '8px', color: textMuted, letterSpacing: '0.12em' }}>
                                        {currentPage}
                                    </div>
                                </>
                            ) : null}
                        </div>

                        {/* ── TOOLBAR - outside the page, on the far right ── */}
                        <div style={{
                            position: 'absolute', right: 0, top: 0, bottom: 0,
                            width: '44px',
                            background: isDarkPaper
                                ? 'rgba(8,4,0,0.65)'
                                : 'rgba(240,225,185,0.6)',
                            backdropFilter: 'blur(20px)',
                            borderLeft: isDarkPaper ? '1px solid rgba(212,175,55,0.12)' : '1px solid rgba(180,140,60,0.2)',
                            borderRadius: '0 5px 5px 0',
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            paddingTop: '20px', gap: '4px', zIndex: 25,
                        }}>
                            {TOOLBAR_ITEMS.map(tool => (
                                <div key={tool.id} style={{ position: 'relative' }}>
                                    <motion.button
                                        onClick={() => setActivePanel(prev => prev === tool.id ? null : tool.id)}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        title={tool.tooltip}
                                        style={{
                                            width: '32px', height: '32px', borderRadius: '8px',
                                            background: activePanel === tool.id
                                                ? (isDarkPaper ? 'rgba(212,175,55,0.2)' : 'rgba(180,130,60,0.2)')
                                                : 'transparent',
                                            border: activePanel === tool.id
                                                ? (isDarkPaper ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(180,130,60,0.4)')
                                                : '1px solid transparent',
                                            cursor: 'pointer',
                                            color: activePanel === tool.id
                                                ? (isDarkPaper ? 'rgba(212,175,55,0.95)' : 'rgba(120,80,20,0.95)')
                                                : (isDarkPaper ? 'rgba(212,175,55,0.45)' : 'rgba(120,80,20,0.4)'),
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'all 0.15s',
                                            padding: '5px',
                                        }}
                                    >
                                        <div
                                            style={{ width: '20px', height: '20px' }}
                                            dangerouslySetInnerHTML={{ __html: tool.svgIcon }}
                                        />
                                    </motion.button>
                                </div>
                            ))}
                        </div>

                        {/* ── PANEL DROPDOWNS ── */}
                        <AnimatePresence>
                            {/* FONT panel */}
                            {activePanel === 'font' && (
                                <motion.div
                                    key="font-panel"
                                    initial={{ opacity: 0, x: 18, scale: 0.96 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: 18, scale: 0.96 }}
                                    transition={{ duration: 0.2 }}
                                    style={{
                                        position: 'absolute', right: '52px', top: '16px',
                                        width: '230px', background: panelBg,
                                        border: `1px solid ${panelBorder}`, borderRadius: '16px',
                                        padding: '14px', zIndex: 60,
                                        boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
                                        backdropFilter: 'blur(40px)',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <span style={{ fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.16em', color: panelMuted, textTransform: 'uppercase' }}>
                                            Typography
                                        </span>
                                        <button onClick={() => setActivePanel(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: panelMuted, fontSize: '12px' }}>✕</button>
                                    </div>

                                    {/* Font size */}
                                    <p style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.14em', color: panelMuted, textTransform: 'uppercase', marginBottom: '6px' }}>Size</p>
                                    <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                                        {FONT_SIZES.map(fs => (
                                            <button key={fs.id} onClick={() => setFontSizeId(fs.id)}
                                                style={{
                                                    padding: '4px 8px', borderRadius: '6px', cursor: 'pointer',
                                                    fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.08em',
                                                    background: fontSizeId === fs.id ? `rgba(212,175,55,0.18)` : 'transparent',
                                                    border: fontSizeId === fs.id ? '1px solid rgba(212,175,55,0.4)' : `1px solid ${panelBorder}`,
                                                    color: fontSizeId === fs.id ? 'rgba(212,175,55,0.95)' : panelMuted,
                                                    transition: 'all 0.12s',
                                                }}>
                                                {fs.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Font family */}
                                    <p style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.14em', color: panelMuted, textTransform: 'uppercase', marginBottom: '6px' }}>Font</p>
                                    <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                        {WRITING_FONTS.map(f => (
                                            <button key={f.id} onClick={() => setWritingFontId(f.id)}
                                                style={{
                                                    textAlign: 'left', padding: '6px 10px', borderRadius: '8px',
                                                    fontFamily: f.family, fontStyle: f.style, fontSize: '13px',
                                                    cursor: 'pointer',
                                                    background: writingFontId === f.id ? 'rgba(212,175,55,0.14)' : 'transparent',
                                                    border: writingFontId === f.id ? '1px solid rgba(212,175,55,0.35)' : '1px solid transparent',
                                                    color: panelText,
                                                    transition: 'all 0.12s',
                                                }}>
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* STICKERS panel */}
                            {activePanel === 'stickers' && isWritePage && (
                                <JournalStickers onSelect={handleStickerDrop} onClose={() => setActivePanel(null)} />
                            )}

                            {/* PAGE panel */}
                            {activePanel === 'page' && (
                                <motion.div
                                    key="page-panel"
                                    initial={{ opacity: 0, x: 18, scale: 0.96 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: 18, scale: 0.96 }}
                                    transition={{ duration: 0.2 }}
                                    style={{
                                        position: 'absolute', right: '52px', top: '90px',
                                        width: '220px', background: panelBg,
                                        border: `1px solid ${panelBorder}`, borderRadius: '16px',
                                        padding: '14px', zIndex: 60,
                                        boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
                                        backdropFilter: 'blur(40px)',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <span style={{ fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.16em', color: panelMuted, textTransform: 'uppercase' }}>Page Style</span>
                                        <button onClick={() => setActivePanel(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: panelMuted, fontSize: '12px' }}>✕</button>
                                    </div>

                                    {/* Paper texture */}
                                    <p style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.14em', color: panelMuted, textTransform: 'uppercase', marginBottom: '8px' }}>Paper</p>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                                        {PAPER_TEXTURES.map(p => (
                                            <button key={p.id} onClick={() => setPaperTextureId(p.id)}
                                                title={p.label}
                                                style={{
                                                    width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer',
                                                    background: p.bg,
                                                    border: paperTextureId === p.id ? '2.5px solid rgba(212,175,55,0.7)' : `1.5px solid ${panelBorder}`,
                                                    boxShadow: paperTextureId === p.id ? '0 0 10px rgba(212,175,55,0.35)' : 'none',
                                                    transition: 'all 0.15s',
                                                    overflow: 'hidden', position: 'relative',
                                                }}
                                            >
                                                {/* Line preview inside swatch */}
                                                <div style={{ position: 'absolute', left: '4px', right: '4px', top: '50%', height: '0.5px', background: p.lineColor, transform: 'translateY(-50%)' }} />
                                            </button>
                                        ))}
                                    </div>

                                    {/* Ruling style */}
                                    <p style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.14em', color: panelMuted, textTransform: 'uppercase', marginBottom: '8px' }}>Ruling</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {RULING_STYLES.map(r => (
                                            <button key={r.id} onClick={() => setRulingStyle(r.id)}
                                                style={{
                                                    textAlign: 'left', padding: '6px 10px', borderRadius: '8px',
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
                                </motion.div>
                            )}

                            {/* MOOD panel */}
                            {activePanel === 'mood' && (
                                <motion.div
                                    key="mood-panel"
                                    initial={{ opacity: 0, x: 18, scale: 0.96 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: 18, scale: 0.96 }}
                                    transition={{ duration: 0.2 }}
                                    style={{
                                        position: 'absolute', right: '52px', top: '130px',
                                        width: '200px', background: panelBg,
                                        border: `1px solid ${panelBorder}`, borderRadius: '16px',
                                        padding: '14px', zIndex: 60,
                                        boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
                                        backdropFilter: 'blur(40px)',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <span style={{ fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.16em', color: panelMuted, textTransform: 'uppercase' }}>Mood</span>
                                        <button onClick={() => setActivePanel(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: panelMuted, fontSize: '12px' }}>✕</button>
                                    </div>

                                    <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                                        <div style={{ fontFamily: 'var(--font-playfair)', fontStyle: 'italic', fontSize: '28px', color: moodInfo.color, marginBottom: '2px', lineHeight: 1 }}>
                                            {mood}
                                        </div>
                                        <div style={{ fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.2em', color: moodInfo.color, textTransform: 'uppercase' }}>
                                            {moodInfo.label}
                                        </div>
                                    </div>

                                    <input type="range" min={1} max={10} value={mood}
                                        onChange={e => setMood(+e.target.value)}
                                        className="mood-slider" style={{ width: '100%', marginBottom: '8px' }} />

                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-cinzel)', fontSize: '8px', color: panelMuted }}>
                                        <span>low</span><span>high</span>
                                    </div>

                                    {/* Mood color swatches legend */}
                                    <div style={{ display: 'flex', gap: '3px', marginTop: '10px', justifyContent: 'center' }}>
                                        {Object.entries(MOOD_LABELS).map(([k, v]) => (
                                            <div
                                                key={k}
                                                onClick={() => setMood(Number(k))}
                                                title={v.label}
                                                style={{
                                                    width: '14px', height: '14px', borderRadius: '50%',
                                                    background: v.color,
                                                    border: mood === Number(k) ? '2px solid rgba(255,255,255,0.6)' : '1px solid transparent',
                                                    cursor: 'pointer', transition: 'transform 0.12s',
                                                    transform: mood === Number(k) ? 'scale(1.25)' : 'scale(1)',
                                                }}
                                            />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </motion.div>

            {/* ── Navigation buttons (outside book, bottom center) ── */}
            <div style={{
                position: 'absolute', bottom: '28px', left: '50%', transform: 'translateX(-50%)',
                display: 'flex', alignItems: 'center', gap: '16px', zIndex: 40,
            }}>
                <motion.button
                    onClick={() => goTo('bwd')}
                    disabled={currentPage === 0 || isFlipping}
                    whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.93 }}
                    style={{
                        padding: '8px 20px', borderRadius: '22px',
                        fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.14em',
                        textTransform: 'uppercase', cursor: currentPage === 0 ? 'default' : 'pointer',
                        background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.22)',
                        color: currentPage === 0 ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.65)',
                        transition: 'all 0.2s',
                    }}
                >
                    ← Prev
                </motion.button>

                <div style={{ textAlign: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.15em', color: 'rgba(212,175,55,0.3)', display: 'block' }}>
                        {isWritePage ? 'New Entry' : `${currentPage} / ${entries.length}`}
                    </span>
                    {!isWritePage && (
                        <button onClick={() => { setFlipDir('bwd'); setCurrentPage(0) }}
                            style={{
                                marginTop: '4px', background: 'none', border: 'none', cursor: 'pointer',
                                fontFamily: 'var(--font-cinzel)', fontSize: '8px', letterSpacing: '0.12em',
                                color: 'rgba(212,175,55,0.4)', textDecoration: 'underline', textTransform: 'uppercase',
                                transition: 'color 0.15s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(212,175,55,0.75)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(212,175,55,0.4)')}
                        >
                            New Entry
                        </button>
                    )}
                </div>

                <motion.button
                    onClick={() => goTo('fwd')}
                    disabled={currentPage >= entries.length || isFlipping}
                    whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.93 }}
                    style={{
                        padding: '8px 20px', borderRadius: '22px',
                        fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        cursor: currentPage >= entries.length ? 'default' : 'pointer',
                        background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.22)',
                        color: currentPage >= entries.length ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.65)',
                        transition: 'all 0.2s',
                    }}
                >
                    Next →
                </motion.button>
            </div>
        </div>
    )
}