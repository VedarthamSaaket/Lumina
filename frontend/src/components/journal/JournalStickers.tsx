'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface Sticker {
    id: string
    label: string
    category: string
    url: string           // image URL from external source
    thumbUrl: string      // thumbnail URL
    color: string         // accent color for UI chrome
    rotation?: number
    width?: number
    height?: number
}

// ── External sticker sources ──────────────────────────────────────────────────
// Icons8, Freepik stickers, Noun Project, and open emoji/sticker CDNs
// Attribution: Icons8 credit shown in footer per their free-tier terms

const EMOJI_CDN = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.0.3/assets/72x72'
const OPENEMOJI_CDN = 'https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.0.1/img/apple/64'

// Curated sticker packs per category using Twemoji (fully free, Apache 2.0)
// Codepoints mapped to category aesthetics
const STICKER_PACKS: Record<string, Array<{ codepoint: string; label: string; rotation?: number }>> = {
    mood: [
        { codepoint: '1f970', label: 'Heart Eyes' },
        { codepoint: '1f60c', label: 'Relieved' },
        { codepoint: '1f62e-200d-1f4a8', label: 'Exhale' },
        { codepoint: '1f972', label: 'Sniff', rotation: -3 },
        { codepoint: '1f979', label: 'Teary', rotation: 2 },
        { codepoint: '1f60f', label: 'Smirk' },
        { codepoint: '1f974', label: 'Woozy', rotation: -2 },
        { codepoint: '1fae0', label: 'Melting', rotation: 3 },
        { codepoint: '1f9d8', label: 'Meditate' },
        { codepoint: '1fae3', label: 'Shush', rotation: -1 },
        { codepoint: '1f62c', label: 'Grimace' },
        { codepoint: '1f60e', label: 'Cool', rotation: 2 },
    ],
    nature: [
        { codepoint: '1f338', label: 'Cherry Blossom', rotation: -3 },
        { codepoint: '1f343', label: 'Leaf', rotation: 2 },
        { codepoint: '1f33b', label: 'Sunflower' },
        { codepoint: '1f344', label: 'Mushroom', rotation: -2 },
        { codepoint: '1fab8', label: 'Tree', rotation: 1 },
        { codepoint: '1f30a', label: 'Wave' },
        { codepoint: '2600', label: 'Sun', rotation: 3 },
        { codepoint: '1f319', label: 'Moon', rotation: -1 },
        { codepoint: '2b50', label: 'Star' },
        { codepoint: '1f30b', label: 'Volcano', rotation: 2 },
        { codepoint: '1f32a', label: 'Tornado' },
        { codepoint: '2744', label: 'Snowflake', rotation: -2 },
    ],
    study: [
        { codepoint: '1f4da', label: 'Books', rotation: -2 },
        { codepoint: '270f', label: 'Pencil', rotation: 3 },
        { codepoint: '1f4dd', label: 'Memo' },
        { codepoint: '1f4a1', label: 'Idea' },
        { codepoint: '1f3af', label: 'Bullseye', rotation: -1 },
        { codepoint: '231a', label: 'Watch' },
        { codepoint: '2615', label: 'Coffee', rotation: 2 },
        { codepoint: '1f9e0', label: 'Brain' },
        { codepoint: '1f4c8', label: 'Chart' },
        { codepoint: '1f4cc', label: 'Pin', rotation: -3 },
        { codepoint: '1f50d', label: 'Search' },
        { codepoint: '1f4af', label: '100', rotation: 1 },
    ],
    mindful: [
        { codepoint: '1fabb', label: 'Crystal Ball', rotation: -2 },
        { codepoint: '1f9d8-200d-2640-fe0f', label: 'Yoga' },
        { codepoint: '1f9ff', label: 'Evil Eye', rotation: 3 },
        { codepoint: '1f9e9', label: 'Puzzle', rotation: -1 },
        { codepoint: '1f4ab', label: 'Dizzy' },
        { codepoint: '1fae7', label: 'Bubbles' },
        { codepoint: '1f4a7', label: 'Droplet', rotation: 2 },
        { codepoint: '1f331', label: 'Seedling', rotation: -2 },
        { codepoint: '1f9f8', label: 'Teddy', rotation: 3 },
        { codepoint: '1fa77', label: 'Pink Heart' },
        { codepoint: '1f9f2', label: 'Magnet' },
        { codepoint: '1f4be', label: 'Floppy' },
    ],
    celebrate: [
        { codepoint: '1f38a', label: 'Confetti', rotation: -3 },
        { codepoint: '1f389', label: 'Party', rotation: 2 },
        { codepoint: '1f451', label: 'Crown', rotation: -1 },
        { codepoint: '1f31f', label: 'Glowing Star' },
        { codepoint: '1f3c6', label: 'Trophy' },
        { codepoint: '1f942', label: 'Cheers', rotation: 3 },
        { codepoint: '1f38e', label: 'Kite' },
        { codepoint: '1faa4', label: 'Mouse Trap', rotation: -2 },
        { codepoint: '1f4b5', label: 'Dollar', rotation: 1 },
        { codepoint: '1f4a5', label: 'Boom' },
        { codepoint: '1f3a8', label: 'Art', rotation: -1 },
        { codepoint: '1f680', label: 'Rocket', rotation: -30 },
    ],
    luxe: [
        { codepoint: '1f48e', label: 'Diamond', rotation: -2 },
        { codepoint: '1f339', label: 'Rose', rotation: 3 },
        { codepoint: '1f5dd', label: 'Key', rotation: -1 },
        { codepoint: '1f0cf', label: 'Joker' },
        { codepoint: '231b', label: 'Hourglass', rotation: 2 },
        { codepoint: '1fa9b', label: 'Knife' },
        { codepoint: '1f52e', label: 'Crystal Ball', rotation: -3 },
        { codepoint: '1f3f9', label: 'Bow', rotation: 1 },
        { codepoint: '1fab6', label: 'Feather', rotation: -2 },
        { codepoint: '1f48d', label: 'Ring', rotation: 3 },
        { codepoint: '1f96b', label: 'Canned', rotation: -1 },
        { codepoint: '1f4dc', label: 'Scroll', rotation: 2 },
    ],
    vintage: [
        { codepoint: '1f4f7', label: 'Camera', rotation: -2 },
        { codepoint: '1f3bb', label: 'Violin', rotation: 3 },
        { codepoint: '1f334', label: 'Palm Tree', rotation: -1 },
        { codepoint: '1f5bc', label: 'Frame', rotation: 2 },
        { codepoint: '1f9f5', label: 'Spool', rotation: -3 },
        { codepoint: '1f3fa', label: 'Amphora' },
        { codepoint: '1f9f6', label: 'Yarn', rotation: 1 },
        { codepoint: '1f3ba', label: 'Trumpet', rotation: -2 },
        { codepoint: '1f3b7', label: 'Saxophone', rotation: 3 },
        { codepoint: '1f4bc', label: 'Briefcase', rotation: -1 },
        { codepoint: '1fa87', label: 'Maracas', rotation: 2 },
        { codepoint: '1f58b', label: 'Fountain Pen', rotation: -3 },
    ],
}

const CATEGORY_META: { key: string; label: string; color: string }[] = [
    { key: 'mood', label: 'Mood', color: '#c9897a' },
    { key: 'nature', label: 'Nature', color: '#7a9e7e' },
    { key: 'study', label: 'Focus', color: '#b8a070' },
    { key: 'mindful', label: 'Mindful', color: '#9b7fd4' },
    { key: 'celebrate', label: 'Celebrate', color: '#d4af37' },
    { key: 'luxe', label: 'Luxe', color: '#c4913a' },
    { key: 'vintage', label: 'Vintage', color: '#8b7355' },
]

function codeToUrl(codepoint: string): string {
    // Twemoji uses hyphen-joined codepoints, files are svg but we use png via jsdelivr
    return `${EMOJI_CDN}/${codepoint}.png`
}

// Die-cut sticker CSS filter: white outline + shadow = physical sticker look
const STICKER_FILTER = [
    'drop-shadow(0 0 0px white)',
    'drop-shadow(0 0 1px white)',
    'drop-shadow(0 0 2px white)',
    'drop-shadow(0 0 3px rgba(255,255,255,0.9))',
    'drop-shadow(0 2px 4px rgba(0,0,0,0.35))',
].join(' ')

interface JournalStickersProps {
    onSelect: (sticker: Sticker) => void
    onClose: () => void
}

export default function JournalStickers({ onSelect, onClose }: JournalStickersProps) {
    const [activeCategory, setActiveCategory] = useState('mood')
    const [recentlyUsed, setRecentlyUsed] = useState<Sticker[]>([])
    const [search, setSearch] = useState('')
    const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())

    const currentCat = CATEGORY_META.find(c => c.key === activeCategory) || CATEGORY_META[0]
    const pack = STICKER_PACKS[activeCategory] || []

    const filtered = search.trim()
        ? pack.filter(s => s.label.toLowerCase().includes(search.toLowerCase()))
        : pack

    const handleSelect = useCallback((item: typeof pack[0]) => {
        const url = codeToUrl(item.codepoint)
        const sticker: Sticker = {
            id: item.codepoint,
            label: item.label,
            category: activeCategory,
            url,
            thumbUrl: url,
            color: currentCat.color,
            rotation: item.rotation || 0,
        }
        setRecentlyUsed(prev => {
            const without = prev.filter(s => s.id !== sticker.id)
            return [sticker, ...without].slice(0, 8)
        })
        onSelect(sticker)
    }, [activeCategory, currentCat.color, onSelect])

    return (
        <motion.div
            initial={{ opacity: 0, x: 12, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 12, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <div style={{
                padding: '10px 12px 8px',
                borderBottom: '1px solid rgba(212,175,55,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexShrink: 0,
            }}>
                <span style={{
                    fontFamily: 'var(--font-cinzel)', fontSize: '9px',
                    letterSpacing: '0.18em', color: 'rgba(212,175,55,0.8)',
                    textTransform: 'uppercase',
                }}>
                    Stickers
                </span>
                <button
                    onClick={onClose}
                    style={{
                        background: 'rgba(212,175,55,0.08)',
                        border: '1px solid rgba(212,175,55,0.18)',
                        borderRadius: '6px', cursor: 'pointer',
                        width: '20px', height: '20px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'rgba(212,175,55,0.55)', fontSize: '10px',
                        transition: 'all 0.15s',
                    }}
                >
                    ✕
                </button>
            </div>

            {/* Search */}
            <div style={{ padding: '8px 12px 6px', flexShrink: 0 }}>
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search stickers…"
                    style={{
                        width: '100%', padding: '5px 10px', borderRadius: '8px',
                        background: 'rgba(212,175,55,0.06)',
                        border: '1px solid rgba(212,175,55,0.15)',
                        color: 'rgba(254,244,228,0.8)',
                        fontFamily: 'var(--font-jost)', fontSize: '11px',
                        outline: 'none', boxSizing: 'border-box',
                    }}
                />
            </div>

            {/* Category tabs */}
            <div style={{
                display: 'flex', gap: '4px', padding: '4px 10px 6px',
                overflowX: 'auto', borderBottom: '1px solid rgba(212,175,55,0.08)',
                flexShrink: 0,
            }}>
                {CATEGORY_META.map(cat => (
                    <button
                        key={cat.key}
                        onClick={() => { setActiveCategory(cat.key); setSearch('') }}
                        style={{
                            flexShrink: 0,
                            padding: '4px 9px', borderRadius: '10px', cursor: 'pointer',
                            fontFamily: 'var(--font-jost)', fontSize: '9px', letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            background: activeCategory === cat.key ? `${cat.color}20` : 'transparent',
                            border: activeCategory === cat.key
                                ? `1px solid ${cat.color}45`
                                : '1px solid transparent',
                            color: activeCategory === cat.key ? cat.color : 'rgba(212,175,55,0.38)',
                            transition: 'all 0.15s',
                        }}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Recently used */}
            <AnimatePresence>
                {recentlyUsed.length > 0 && !search && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        style={{
                            padding: '6px 12px',
                            borderBottom: '1px solid rgba(212,175,55,0.06)',
                            flexShrink: 0,
                        }}
                    >
                        <p style={{
                            fontFamily: 'var(--font-jost)', fontSize: '8px',
                            letterSpacing: '0.12em', textTransform: 'uppercase',
                            color: 'rgba(212,175,55,0.35)', marginBottom: '5px',
                        }}>
                            Recent
                        </p>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {recentlyUsed.slice(0, 8).map(s => (
                                <motion.button
                                    key={s.id}
                                    onClick={() => onSelect(s)}
                                    whileHover={{ scale: 1.15 }}
                                    whileTap={{ scale: 0.9 }}
                                    style={{
                                        width: '32px', height: '32px',
                                        background: 'transparent', border: 'none', cursor: 'pointer',
                                        padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}
                                >
                                    <img
                                        src={s.url}
                                        alt={s.label}
                                        width={28}
                                        height={28}
                                        style={{
                                            filter: STICKER_FILTER,
                                            transform: `rotate(${s.rotation || 0}deg)`,
                                            imageRendering: 'crisp-edges',
                                        }}
                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                                    />
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Attribution */}
            <div style={{
                padding: '3px 12px',
                flexShrink: 0,
            }}>
                <span style={{
                    fontFamily: 'var(--font-jost)', fontSize: '8px',
                    color: 'rgba(212,175,55,0.22)', letterSpacing: '0.06em',
                }}>
                    Stickers by Icons8 · Twemoji (Apache 2.0)
                </span>
            </div>

            {/* Sticker grid */}
            <div style={{
                flex: 1, overflowY: 'auto', padding: '6px 10px 12px',
            }}>
                {filtered.length === 0 ? (
                    <p style={{
                        textAlign: 'center', padding: '20px 0',
                        fontFamily: 'var(--font-jost)', fontSize: '11px',
                        color: 'rgba(212,175,55,0.3)', fontStyle: 'italic',
                    }}>
                        No stickers found
                    </p>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '6px',
                    }}>
                        {filtered.map((item, i) => {
                            const url = codeToUrl(item.codepoint)
                            return (
                                <motion.button
                                    key={item.codepoint}
                                    onClick={() => handleSelect(item)}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.025 }}
                                    whileHover={{ scale: 1.12, y: -2 }}
                                    whileTap={{ scale: 0.92 }}
                                    title={item.label}
                                    style={{
                                        display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', justifyContent: 'center',
                                        gap: '3px', padding: '6px 4px',
                                        borderRadius: '10px',
                                        background: `${currentCat.color}0c`,
                                        border: `1px solid ${currentCat.color}22`,
                                        cursor: 'pointer',
                                        transition: 'background 0.15s, border-color 0.15s',
                                        minHeight: '58px',
                                    }}
                                    onMouseEnter={e => {
                                        const el = e.currentTarget as HTMLElement
                                        el.style.background = `${currentCat.color}1e`
                                        el.style.borderColor = `${currentCat.color}45`
                                    }}
                                    onMouseLeave={e => {
                                        const el = e.currentTarget as HTMLElement
                                        el.style.background = `${currentCat.color}0c`
                                        el.style.borderColor = `${currentCat.color}22`
                                    }}
                                >
                                    <img
                                        src={url}
                                        alt={item.label}
                                        width={36}
                                        height={36}
                                        loading="lazy"
                                        style={{
                                            // Die-cut sticker effect: white outline layers + shadow
                                            filter: STICKER_FILTER,
                                            transform: `rotate(${item.rotation || 0}deg)`,
                                            display: 'block',
                                            imageRendering: 'crisp-edges',
                                        }}
                                        onError={e => {
                                            const el = e.target as HTMLImageElement
                                            el.style.display = 'none'
                                        }}
                                    />
                                    <span style={{
                                        fontFamily: 'var(--font-jost)',
                                        fontSize: '8px',
                                        color: 'rgba(212,175,55,0.45)',
                                        textAlign: 'center',
                                        lineHeight: 1.2,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        width: '100%',
                                        paddingLeft: '2px',
                                        paddingRight: '2px',
                                    }}>
                                        {item.label}
                                    </span>
                                </motion.button>
                            )
                        })}
                    </div>
                )}
            </div>
        </motion.div>
    )
}