'use client'
import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface Sticker {
    id: string
    label: string
    category: string
    url: string
    thumbUrl: string
    color: string
    rotation?: number
}

// ─── Twemoji (Apache 2.0) ─────────────────────────────────────────────────────
const EMOJI_CDN = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.0.3/assets/72x72'
function twemojiUrl(cp: string) { return `${EMOJI_CDN}/${cp}.png` }

// ─── Icons8 Stickers (free tier – attribution shown) ─────────────────────────
// Using their sticker style endpoint which returns aesthetic die-cut PNG stickers
function icons8Url(name: string, size = 100) {
    return `https://img.icons8.com/stickers/${size}/${encodeURIComponent(name)}.png`
}

// ─── Sticker Data ─────────────────────────────────────────────────────────────

type StickerItem = {
    id: string
    label: string
    url: string
    rotation?: number
    source: 'twemoji' | 'icons8'
}

const PACKS: Record<string, StickerItem[]> = {
    mood: [
        { id: 'mood-heartface', label: 'Heart Eyes', url: icons8Url('in-love'), source: 'icons8' },
        { id: 'mood-cool', label: 'Cool', url: icons8Url('cool'), source: 'icons8' },
        { id: 'mood-happy', label: 'Happy', url: icons8Url('happy'), source: 'icons8' },
        { id: 'mood-sad', label: 'Sad', url: icons8Url('sad'), source: 'icons8' },
        { id: 'mood-tired', label: 'Tired', url: icons8Url('sleeping'), source: 'icons8' },
        { id: 'mood-confused', label: 'Confused', url: icons8Url('confused'), source: 'icons8' },
        { id: 'mood-angry', label: 'Angry', url: icons8Url('angry'), source: 'icons8' },
        { id: 'mood-anxious', label: 'Anxious', url: icons8Url('anxious'), source: 'icons8' },
        { id: 'mood-excited', label: 'Excited', url: icons8Url('excited'), source: 'icons8' },
        { id: 'mood-relieved', label: 'Relieved', url: twemojiUrl('1f60c'), rotation: -3, source: 'twemoji' },
        { id: 'mood-melt', label: 'Melting', url: twemojiUrl('1fae0'), rotation: 3, source: 'twemoji' },
        { id: 'mood-ponder', label: 'Thinking', url: twemojiUrl('1f914'), source: 'twemoji' },
    ],
    nature: [
        { id: 'nat-flower', label: 'Flower', url: icons8Url('sakura'), source: 'icons8' },
        { id: 'nat-sun', label: 'Sun', url: icons8Url('sun'), source: 'icons8' },
        { id: 'nat-moon', label: 'Moon', url: icons8Url('crescent-moon'), source: 'icons8' },
        { id: 'nat-star', label: 'Star', url: icons8Url('star'), source: 'icons8' },
        { id: 'nat-leaf', label: 'Leaf', url: icons8Url('leaf'), rotation: 2, source: 'icons8' },
        { id: 'nat-wave', label: 'Wave', url: icons8Url('ocean-wave'), source: 'icons8' },
        { id: 'nat-mushroom', label: 'Mushroom', url: icons8Url('mushroom'), rotation: -2, source: 'icons8' },
        { id: 'nat-butterfly', label: 'Butterfly', url: icons8Url('butterfly'), source: 'icons8' },
        { id: 'nat-fire', label: 'Fire', url: icons8Url('fire-element'), source: 'icons8' },
        { id: 'nat-cloud', label: 'Cloud', url: icons8Url('cloud'), source: 'icons8' },
        { id: 'nat-rain', label: 'Rain', url: icons8Url('rain'), source: 'icons8' },
        { id: 'nat-snow', label: 'Snowflake', url: twemojiUrl('2744'), rotation: -2, source: 'twemoji' },
    ],
    mindful: [
        { id: 'mind-peace', label: 'Peace', url: icons8Url('peace-symbol'), source: 'icons8' },
        { id: 'mind-lotus', label: 'Lotus', url: icons8Url('lotus'), source: 'icons8' },
        { id: 'mind-crystal', label: 'Crystal', url: icons8Url('gem-stone'), rotation: -2, source: 'icons8' },
        { id: 'mind-heart', label: 'Heart', url: icons8Url('heart'), source: 'icons8' },
        { id: 'mind-rainbow', label: 'Rainbow', url: icons8Url('rainbow'), source: 'icons8' },
        { id: 'mind-eye', label: 'Third Eye', url: icons8Url('eye'), source: 'icons8' },
        { id: 'mind-yin', label: 'Yin Yang', url: icons8Url('yin-yang'), source: 'icons8' },
        { id: 'mind-prism', label: 'Prism', url: twemojiUrl('1f4ab'), source: 'twemoji' },
        { id: 'mind-droplet', label: 'Droplet', url: twemojiUrl('1f4a7'), rotation: 2, source: 'twemoji' },
        { id: 'mind-seedling', label: 'Seedling', url: twemojiUrl('1f331'), rotation: -2, source: 'twemoji' },
        { id: 'mind-yoga', label: 'Meditate', url: twemojiUrl('1f9d8-200d-2640-fe0f'), source: 'twemoji' },
        { id: 'mind-evileye', label: 'Evil Eye', url: twemojiUrl('1f9ff'), rotation: 3, source: 'twemoji' },
    ],
    celebrate: [
        { id: 'cel-party', label: 'Party', url: icons8Url('party-popper'), rotation: 2, source: 'icons8' },
        { id: 'cel-crown', label: 'Crown', url: icons8Url('crown'), rotation: -1, source: 'icons8' },
        { id: 'cel-trophy', label: 'Trophy', url: icons8Url('trophy'), source: 'icons8' },
        { id: 'cel-cake', label: 'Cake', url: icons8Url('birthday-cake'), source: 'icons8' },
        { id: 'cel-gift', label: 'Gift', url: icons8Url('gift'), source: 'icons8' },
        { id: 'cel-sparkle', label: 'Sparkles', url: icons8Url('sparkles'), source: 'icons8' },
        { id: 'cel-star2', label: 'Gold Star', url: icons8Url('gold-star'), source: 'icons8' },
        { id: 'cel-rocket', label: 'Rocket', url: twemojiUrl('1f680'), rotation: -30, source: 'twemoji' },
        { id: 'cel-confetti', label: 'Confetti', url: twemojiUrl('1f38a'), rotation: -3, source: 'twemoji' },
        { id: 'cel-boom', label: 'Boom', url: twemojiUrl('1f4a5'), source: 'twemoji' },
        { id: 'cel-art', label: 'Art', url: twemojiUrl('1f3a8'), rotation: -1, source: 'twemoji' },
        { id: 'cel-cheers', label: 'Cheers', url: twemojiUrl('1f942'), rotation: 3, source: 'twemoji' },
    ],
    luxe: [
        { id: 'lux-diamond', label: 'Diamond', url: icons8Url('diamond'), rotation: -2, source: 'icons8' },
        { id: 'lux-rose', label: 'Rose', url: icons8Url('rose'), rotation: 3, source: 'icons8' },
        { id: 'lux-ring', label: 'Ring', url: icons8Url('ring'), rotation: 3, source: 'icons8' },
        { id: 'lux-bottle', label: 'Perfume', url: icons8Url('perfume'), source: 'icons8' },
        { id: 'lux-lipstick', label: 'Lipstick', url: icons8Url('lipstick'), source: 'icons8' },
        { id: 'lux-candle', label: 'Candle', url: icons8Url('candle'), source: 'icons8' },
        { id: 'lux-watch', label: 'Watch', url: icons8Url('watch'), rotation: 2, source: 'icons8' },
        { id: 'lux-key', label: 'Key', url: twemojiUrl('1f5dd'), rotation: -1, source: 'twemoji' },
        { id: 'lux-hourglass', label: 'Hourglass', url: twemojiUrl('231b'), rotation: 2, source: 'twemoji' },
        { id: 'lux-feather', label: 'Feather', url: twemojiUrl('1fab6'), rotation: -2, source: 'twemoji' },
        { id: 'lux-scroll', label: 'Scroll', url: twemojiUrl('1f4dc'), rotation: 2, source: 'twemoji' },
        { id: 'lux-crystal2', label: 'Crystal Ball', url: twemojiUrl('1f52e'), rotation: -3, source: 'twemoji' },
    ],
    vintage: [
        { id: 'vint-camera', label: 'Camera', url: icons8Url('camera'), rotation: -2, source: 'icons8' },
        { id: 'vint-record', label: 'Record', url: icons8Url('vinyl'), source: 'icons8' },
        { id: 'vint-book', label: 'Book', url: icons8Url('open-book'), source: 'icons8' },
        { id: 'vint-pen', label: 'Fountain Pen', url: icons8Url('quill-pen'), rotation: -3, source: 'icons8' },
        { id: 'vint-lock', label: 'Lock', url: icons8Url('lock'), source: 'icons8' },
        { id: 'vint-lamp', label: 'Lamp', url: icons8Url('lamp'), source: 'icons8' },
        { id: 'vint-letter', label: 'Letter', url: icons8Url('love-letter'), source: 'icons8' },
        { id: 'vint-violin', label: 'Violin', url: twemojiUrl('1f3bb'), rotation: 3, source: 'twemoji' },
        { id: 'vint-frame', label: 'Frame', url: twemojiUrl('1f5bc'), rotation: 2, source: 'twemoji' },
        { id: 'vint-spool', label: 'Spool', url: twemojiUrl('1f9f5'), rotation: -3, source: 'twemoji' },
        { id: 'vint-amphora', label: 'Amphora', url: twemojiUrl('1f3fa'), source: 'twemoji' },
        { id: 'vint-inkpen', label: 'Ink Pen', url: twemojiUrl('1f58b'), rotation: -3, source: 'twemoji' },
    ],
    study: [
        { id: 'std-books', label: 'Books', url: icons8Url('books'), rotation: -2, source: 'icons8' },
        { id: 'std-pencil', label: 'Pencil', url: icons8Url('pencil'), rotation: 3, source: 'icons8' },
        { id: 'std-bulb', label: 'Idea', url: icons8Url('idea'), source: 'icons8' },
        { id: 'std-target', label: 'Target', url: icons8Url('target'), rotation: -1, source: 'icons8' },
        { id: 'std-coffee', label: 'Coffee', url: icons8Url('coffee'), rotation: 2, source: 'icons8' },
        { id: 'std-brain', label: 'Brain', url: icons8Url('brain'), source: 'icons8' },
        { id: 'std-chart', label: 'Chart', url: icons8Url('chart'), source: 'icons8' },
        { id: 'std-search', label: 'Search', url: icons8Url('search'), source: 'icons8' },
        { id: 'std-pin', label: 'Pin', url: twemojiUrl('1f4cc'), rotation: -3, source: 'twemoji' },
        { id: 'std-100', label: '100', url: twemojiUrl('1f4af'), rotation: 1, source: 'twemoji' },
        { id: 'std-memo', label: 'Memo', url: twemojiUrl('1f4dd'), source: 'twemoji' },
        { id: 'std-watch', label: 'Watch', url: twemojiUrl('231a'), source: 'twemoji' },
    ],
}

const CATEGORIES: { key: string; label: string; color: string }[] = [
    { key: 'mood', label: 'Mood', color: '#c9897a' },
    { key: 'nature', label: 'Nature', color: '#7a9e7e' },
    { key: 'mindful', label: 'Mindful', color: '#9b7fd4' },
    { key: 'celebrate', label: 'Celebrate', color: '#d4af37' },
    { key: 'luxe', label: 'Luxe', color: '#c4913a' },
    { key: 'vintage', label: 'Vintage', color: '#8b7355' },
    { key: 'study', label: 'Study', color: '#b8a070' },
]

// Die-cut sticker filter – white outline border + shadow
const STICKER_FILTER = [
    'drop-shadow(0 0 0px white)',
    'drop-shadow(0 0 1.5px white)',
    'drop-shadow(0 0 3px rgba(255,255,255,0.92))',
    'drop-shadow(0 2.5px 5px rgba(0,0,0,0.38))',
].join(' ')

interface Props {
    onSelect: (sticker: Sticker) => void
    onClose: () => void
}

export default function JournalStickers({ onSelect, onClose }: Props) {
    const [activeCat, setActiveCat] = useState('mood')
    const [recent, setRecent] = useState<Sticker[]>([])
    const [search, setSearch] = useState('')

    const cat = CATEGORIES.find(c => c.key === activeCat) || CATEGORIES[0]
    const pack = PACKS[activeCat] || []
    const filtered = search.trim()
        ? Object.values(PACKS).flat().filter(s =>
            s.label.toLowerCase().includes(search.toLowerCase())
        )
        : pack

    const handleSelect = useCallback((item: StickerItem) => {
        const sticker: Sticker = {
            id: item.id,
            label: item.label,
            category: activeCat,
            url: item.url,
            thumbUrl: item.url,
            color: cat.color,
            rotation: item.rotation || 0,
        }
        setRecent(prev => {
            const without = prev.filter(s => s.id !== sticker.id)
            return [sticker, ...without].slice(0, 8)
        })
        onSelect(sticker)
    }, [activeCat, cat.color, onSelect])

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{
                padding: '10px 12px 8px',
                borderBottom: '1px solid rgba(212,175,55,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexShrink: 0,
            }}>
                <span style={{ fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.18em', color: 'rgba(212,175,55,0.8)', textTransform: 'uppercase' }}>
                    Stickers
                </span>
                <button onClick={onClose} style={{
                    background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)',
                    borderRadius: '6px', cursor: 'pointer',
                    width: '22px', height: '22px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(212,175,55,0.6)', fontSize: '11px', fontWeight: 600,
                }}>
                    ✕
                </button>
            </div>

            {/* Search */}
            <div style={{ padding: '8px 10px 6px', flexShrink: 0 }}>
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search stickers…"
                    style={{
                        width: '100%', padding: '5px 10px', borderRadius: '8px',
                        background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)',
                        color: 'rgba(254,244,228,0.85)', fontFamily: 'var(--font-jost)', fontSize: '11px',
                        outline: 'none', boxSizing: 'border-box',
                    }}
                />
            </div>

            {/* Category tabs */}
            <div style={{
                display: 'flex', gap: '3px', padding: '4px 10px 6px',
                overflowX: 'auto', borderBottom: '1px solid rgba(212,175,55,0.08)', flexShrink: 0,
            }}>
                {CATEGORIES.map(c => (
                    <button key={c.key} onClick={() => { setActiveCat(c.key); setSearch('') }}
                        style={{
                            flexShrink: 0, padding: '4px 8px', borderRadius: '10px', cursor: 'pointer',
                            fontFamily: 'var(--font-jost)', fontSize: '9px', letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            background: activeCat === c.key ? `${c.color}20` : 'transparent',
                            border: activeCat === c.key ? `1px solid ${c.color}45` : '1px solid transparent',
                            color: activeCat === c.key ? c.color : 'rgba(212,175,55,0.38)',
                            transition: 'all 0.15s',
                        }}>
                        {c.label}
                    </button>
                ))}
            </div>

            {/* Recently used */}
            <AnimatePresence>
                {recent.length > 0 && !search && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        style={{ padding: '6px 12px', borderBottom: '1px solid rgba(212,175,55,0.06)', flexShrink: 0 }}>
                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(212,175,55,0.35)', marginBottom: '5px' }}>
                            Recent
                        </p>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {recent.slice(0, 8).map(s => (
                                <motion.button key={s.id} onClick={() => onSelect(s)}
                                    whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                                    style={{ width: '32px', height: '32px', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <img src={s.url} alt={s.label} width={28} height={28}
                                        style={{ filter: STICKER_FILTER, transform: `rotate(${s.rotation || 0}deg)` }}
                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Attribution */}
            <div style={{ padding: '2px 12px', flexShrink: 0 }}>
                <span style={{ fontFamily: 'var(--font-jost)', fontSize: '8px', color: 'rgba(212,175,55,0.22)', letterSpacing: '0.06em' }}>
                    Icons8 Stickers · Twemoji (Apache 2.0)
                </span>
            </div>

            {/* Grid */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px 12px' }}>
                {filtered.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: '20px 0', fontFamily: 'var(--font-jost)', fontSize: '11px', color: 'rgba(212,175,55,0.3)', fontStyle: 'italic' }}>
                        No stickers found
                    </p>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                        {filtered.map((item, i) => (
                            <motion.button key={item.id}
                                onClick={() => handleSelect(item)}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.02 }}
                                whileHover={{ scale: 1.12, y: -2 }}
                                whileTap={{ scale: 0.92 }}
                                title={item.label}
                                style={{
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    gap: '3px', padding: '7px 4px',
                                    borderRadius: '10px',
                                    background: `${cat.color}0c`,
                                    border: `1px solid ${cat.color}22`,
                                    cursor: 'pointer', minHeight: '62px',
                                    transition: 'background 0.15s, border-color 0.15s',
                                }}
                                onMouseEnter={e => {
                                    const el = e.currentTarget as HTMLElement
                                    el.style.background = `${cat.color}1e`
                                    el.style.borderColor = `${cat.color}45`
                                }}
                                onMouseLeave={e => {
                                    const el = e.currentTarget as HTMLElement
                                    el.style.background = `${cat.color}0c`
                                    el.style.borderColor = `${cat.color}22`
                                }}
                            >
                                <img
                                    src={item.url}
                                    alt={item.label}
                                    width={38}
                                    height={38}
                                    loading="lazy"
                                    style={{
                                        filter: STICKER_FILTER,
                                        transform: `rotate(${item.rotation || 0}deg)`,
                                        display: 'block',
                                        objectFit: 'contain',
                                    }}
                                    onError={e => {
                                        // Fallback to twemoji if Icons8 fails
                                        const img = e.target as HTMLImageElement
                                        img.style.opacity = '0.3'
                                    }}
                                />
                                <span style={{
                                    fontFamily: 'var(--font-jost)', fontSize: '7.5px',
                                    color: 'rgba(212,175,55,0.45)',
                                    textAlign: 'center', lineHeight: 1.2,
                                    overflow: 'hidden', textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap', width: '100%',
                                    paddingLeft: '2px', paddingRight: '2px',
                                }}>
                                    {item.label}
                                </span>
                            </motion.button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}