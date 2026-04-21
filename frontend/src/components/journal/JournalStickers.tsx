'use client'
import { useState, useCallback } from 'react'
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

// ─── CDN sources ─────────────────────────────────────────────────────────────
// Twemoji (Apache 2.0) - very reliable
const TW = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.0.3/assets/72x72'
function tw(cp: string) { return `${TW}/${cp}.png` }

// Icons8 sticker style - free tier with attribution
function i8(name: string, size = 96) {
    return `https://img.icons8.com/stickers/${size}/${encodeURIComponent(name)}.png`
}

// Flaticon sticker-style (using their CDN for popular ones)
// Using a reliable hosted source for aesthetic stickers
function flatSticker(name: string) {
    return `https://img.icons8.com/color/${96}/${name}.png`
}

// LottieFiles static preview URLs (for their sticker-quality assets)
// Using their CDN for static previews
function lottie(slug: string) {
    return `https://assets9.lottiefiles.com/datafiles/${slug}/preview.png`
}

interface StickerDef {
    id: string
    label: string
    url: string
    fallback?: string
    rotation?: number
}

const PACKS: Record<string, StickerDef[]> = {
    mood: [
        { id: 'mood-love', label: 'In Love', url: i8('in-love'), rotation: 2 },
        { id: 'mood-cool', label: 'Cool', url: i8('cool') },
        { id: 'mood-happy', label: 'Happy', url: i8('happy') },
        { id: 'mood-sad', label: 'Sad', url: i8('sad'), rotation: -2 },
        { id: 'mood-tired', label: 'Tired', url: i8('sleeping'), rotation: 1 },
        { id: 'mood-confused', label: 'Confused', url: i8('confused') },
        { id: 'mood-angry', label: 'Angry', url: i8('angry'), rotation: -1 },
        { id: 'mood-excited', label: 'Excited', url: i8('excited') },
        { id: 'mood-think', label: 'Thinking', url: tw('1f914'), rotation: 3 },
        { id: 'mood-melt', label: 'Melting', url: tw('1fae0'), rotation: 2 },
        { id: 'mood-relief', label: 'Relieved', url: tw('1f60c'), rotation: -2 },
        { id: 'mood-yawn', label: 'Tired', url: tw('1f971'), rotation: 1 },
    ],
    nature: [
        { id: 'nat-sakura', label: 'Cherry Blossom', url: i8('sakura'), rotation: 3 },
        { id: 'nat-sun', label: 'Sun', url: i8('sun') },
        { id: 'nat-moon', label: 'Moon', url: i8('crescent-moon'), rotation: -2 },
        { id: 'nat-star', label: 'Star', url: i8('star'), rotation: 1 },
        { id: 'nat-leaf', label: 'Leaf', url: i8('leaf'), rotation: -3 },
        { id: 'nat-wave', label: 'Wave', url: i8('ocean-wave') },
        { id: 'nat-mush', label: 'Mushroom', url: i8('mushroom'), rotation: 2 },
        { id: 'nat-butterfly', label: 'Butterfly', url: i8('butterfly'), rotation: -1 },
        { id: 'nat-fire', label: 'Fire', url: i8('fire-element') },
        { id: 'nat-cloud', label: 'Cloud', url: i8('cloud') },
        { id: 'nat-snow', label: 'Snowflake', url: tw('2744'), rotation: 3 },
        { id: 'nat-rainbow', label: 'Rainbow', url: i8('rainbow') },
        { id: 'nat-cactus', label: 'Cactus', url: tw('1f335'), rotation: 2 },
        { id: 'nat-tulip', label: 'Tulip', url: tw('1f337'), rotation: -2 },
        { id: 'nat-maple', label: 'Maple Leaf', url: tw('1f341'), rotation: 3 },
        { id: 'nat-earth', label: 'Earth', url: tw('1f30d') },
    ],
    mindful: [
        { id: 'mind-peace', label: 'Peace', url: i8('peace-symbol') },
        { id: 'mind-lotus', label: 'Lotus', url: i8('lotus') },
        { id: 'mind-crystal', label: 'Crystal', url: i8('gem-stone'), rotation: -2 },
        { id: 'mind-heart', label: 'Heart', url: i8('heart') },
        { id: 'mind-eye', label: 'Third Eye', url: i8('eye') },
        { id: 'mind-yin', label: 'Yin Yang', url: i8('yin-yang') },
        { id: 'mind-yoga', label: 'Meditate', url: tw('1f9d8-200d-2640-fe0f') },
        { id: 'mind-sparkle', label: 'Sparkles', url: tw('2728'), rotation: 2 },
        { id: 'mind-droplet', label: 'Droplet', url: tw('1f4a7'), rotation: 2 },
        { id: 'mind-seed', label: 'Seedling', url: tw('1f331'), rotation: -2 },
        { id: 'mind-evil-eye', label: 'Evil Eye', url: tw('1f9ff'), rotation: 3 },
        { id: 'mind-dizzy', label: 'Dizzy Star', url: tw('1f4ab'), rotation: -1 },
    ],
    celebrate: [
        { id: 'cel-party', label: 'Party', url: i8('party-popper'), rotation: 2 },
        { id: 'cel-crown', label: 'Crown', url: i8('crown'), rotation: -1 },
        { id: 'cel-trophy', label: 'Trophy', url: i8('trophy') },
        { id: 'cel-cake', label: 'Cake', url: i8('birthday-cake') },
        { id: 'cel-gift', label: 'Gift', url: i8('gift') },
        { id: 'cel-sparkle', label: 'Sparkles', url: i8('sparkles') },
        { id: 'cel-gold-star', label: 'Gold Star', url: i8('gold-star') },
        { id: 'cel-rocket', label: 'Rocket', url: tw('1f680'), rotation: -30 },
        { id: 'cel-confetti', label: 'Confetti', url: tw('1f38a'), rotation: -3 },
        { id: 'cel-boom', label: 'Boom', url: tw('1f4a5') },
        { id: 'cel-artist', label: 'Art', url: tw('1f3a8'), rotation: -1 },
        { id: 'cel-100', label: '100', url: tw('1f4af'), rotation: 1 },
    ],
    luxe: [
        { id: 'lux-diamond', label: 'Diamond', url: i8('diamond'), rotation: -2 },
        { id: 'lux-rose', label: 'Rose', url: i8('rose'), rotation: 3 },
        { id: 'lux-ring', label: 'Ring', url: i8('ring'), rotation: 3 },
        { id: 'lux-perfume', label: 'Perfume', url: i8('perfume') },
        { id: 'lux-lipstick', label: 'Lipstick', url: i8('lipstick') },
        { id: 'lux-candle', label: 'Candle', url: i8('candle') },
        { id: 'lux-watch', label: 'Watch', url: i8('watch'), rotation: 2 },
        { id: 'lux-key', label: 'Key', url: tw('1f5dd'), rotation: -1 },
        { id: 'lux-hourglass', label: 'Hourglass', url: tw('231b'), rotation: 2 },
        { id: 'lux-feather', label: 'Feather', url: tw('1fab6'), rotation: -2 },
        { id: 'lux-scroll', label: 'Scroll', url: tw('1f4dc'), rotation: 2 },
        { id: 'lux-crystal-ball', label: 'Crystal Ball', url: tw('1f52e'), rotation: -3 },
        { id: 'lux-necklace', label: 'Necklace', url: tw('1f48e'), rotation: 1 },
        { id: 'lux-lipstick2', label: 'Mirror', url: tw('1f48b'), rotation: -1 },
    ],
    vintage: [
        { id: 'vint-camera', label: 'Camera', url: i8('camera'), rotation: -2 },
        { id: 'vint-vinyl', label: 'Vinyl', url: i8('vinyl') },
        { id: 'vint-book', label: 'Open Book', url: i8('open-book') },
        { id: 'vint-quill', label: 'Quill Pen', url: i8('quill-pen'), rotation: -3 },
        { id: 'vint-lock', label: 'Lock', url: i8('lock') },
        { id: 'vint-lamp', label: 'Lamp', url: i8('lamp') },
        { id: 'vint-letter', label: 'Love Letter', url: i8('love-letter') },
        { id: 'vint-violin', label: 'Violin', url: tw('1f3bb'), rotation: 3 },
        { id: 'vint-picture', label: 'Frame', url: tw('1f5bc'), rotation: 2 },
        { id: 'vint-thread', label: 'Thread', url: tw('1f9f5'), rotation: -3 },
        { id: 'vint-amphora', label: 'Amphora', url: tw('1f3fa') },
        { id: 'vint-compass', label: 'Compass', url: tw('1f9ed'), rotation: -2 },
        { id: 'vint-map', label: 'Map', url: tw('1f5fa'), rotation: 1 },
        { id: 'vint-music', label: 'Music', url: tw('1f3b5'), rotation: 2 },
    ],
    cozy: [
        { id: 'cozy-coffee', label: 'Coffee', url: i8('coffee'), rotation: 2 },
        { id: 'cozy-tea', label: 'Tea', url: tw('1f375'), rotation: -2 },
        { id: 'cozy-book', label: 'Books', url: i8('books') },
        { id: 'cozy-cat', label: 'Cat', url: tw('1f431'), rotation: 2 },
        { id: 'cozy-pillow', label: 'Pillow', url: tw('1f6cc'), rotation: -1 },
        { id: 'cozy-candle', label: 'Candle', url: tw('1f56f'), rotation: 1 },
        { id: 'cozy-blanket', label: 'Blanket', url: tw('1f9e3'), rotation: -2 },
        { id: 'cozy-cookie', label: 'Cookie', url: tw('1f36a'), rotation: 3 },
        { id: 'cozy-plant', label: 'Plant', url: tw('1f33f'), rotation: -1 },
        { id: 'cozy-rain', label: 'Rainy Day', url: i8('rain') },
        { id: 'cozy-star', label: 'Night Star', url: tw('1f319'), rotation: 2 },
        { id: 'cozy-dog', label: 'Dog', url: tw('1f436'), rotation: -2 },
    ],
    study: [
        { id: 'std-pencil', label: 'Pencil', url: i8('pencil'), rotation: 3 },
        { id: 'std-idea', label: 'Idea', url: i8('idea') },
        { id: 'std-target', label: 'Target', url: i8('target'), rotation: -1 },
        { id: 'std-brain', label: 'Brain', url: i8('brain') },
        { id: 'std-chart', label: 'Chart', url: i8('chart') },
        { id: 'std-pin', label: 'Pin', url: tw('1f4cc'), rotation: -3 },
        { id: 'std-100', label: '100pts', url: tw('1f4af'), rotation: 1 },
        { id: 'std-memo', label: 'Memo', url: tw('1f4dd') },
        { id: 'std-lab', label: 'Science', url: tw('1f9ea'), rotation: 2 },
        { id: 'std-telescope', label: 'Stars', url: tw('1f52d'), rotation: -1 },
        { id: 'std-medal', label: 'Medal', url: tw('1f3c5'), rotation: 2 },
        { id: 'std-check', label: 'Done', url: tw('2705') },
    ],
}

const CATEGORIES: { key: string; label: string; color: string }[] = [
    { key: 'mood', label: 'Mood', color: '#c9897a' },
    { key: 'nature', label: 'Nature', color: '#7a9e7e' },
    { key: 'mindful', label: 'Mindful', color: '#9b7fd4' },
    { key: 'celebrate', label: 'Celebrate', color: '#d4af37' },
    { key: 'luxe', label: 'Luxe', color: '#c4913a' },
    { key: 'vintage', label: 'Vintage', color: '#8b7355' },
    { key: 'cozy', label: 'Cozy', color: '#c9897a' },
    { key: 'study', label: 'Study', color: '#b8a070' },
]

// Die-cut sticker filter - white outline + shadow
const STICKER_FILTER = [
    'drop-shadow(0 0 0px white)',
    'drop-shadow(0 0 2px white)',
    'drop-shadow(0 0 4px rgba(255,255,255,0.9))',
    'drop-shadow(0 3px 6px rgba(0,0,0,0.4))',
].join(' ')

interface Props {
    onSelect: (sticker: Sticker) => void
    onClose: () => void
}

export default function JournalStickers({ onSelect, onClose }: Props) {
    const [activeCat, setActiveCat] = useState('mood')
    const [recent, setRecent] = useState<Sticker[]>([])
    const [search, setSearch] = useState('')
    const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set())

    const cat = CATEGORIES.find(c => c.key === activeCat) || CATEGORIES[0]
    const pack = PACKS[activeCat] || []
    const filtered = search.trim()
        ? Object.values(PACKS).flat().filter(s =>
            s.label.toLowerCase().includes(search.toLowerCase())
        )
        : pack

    const handleImgError = useCallback((url: string) => {
        setFailedUrls(prev => new Set([...prev, url]))
    }, [])

    const handleSelect = useCallback((item: StickerDef) => {
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

            {/* Search */}
            <div style={{ padding: '8px 0 6px', flexShrink: 0 }}>
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
                display: 'flex', gap: '3px', flexWrap: 'wrap',
                padding: '0 0 6px',
                borderBottom: '1px solid rgba(212,175,55,0.08)', flexShrink: 0,
            }}>
                {CATEGORIES.map(c => (
                    <button key={c.key} onClick={() => { setActiveCat(c.key); setSearch('') }}
                        style={{
                            flexShrink: 0, padding: '3px 7px', borderRadius: '10px', cursor: 'pointer',
                            fontFamily: 'var(--font-jost)', fontSize: '8px', letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            background: activeCat === c.key ? `${c.color}20` : 'transparent',
                            border: activeCat === c.key ? `1px solid ${c.color}45` : '1px solid transparent',
                            color: activeCat === c.key ? c.color : 'rgba(212,175,55,0.35)',
                            transition: 'all 0.15s',
                        }}>
                        {c.label}
                    </button>
                ))}
            </div>

            {/* Recently used */}
            <AnimatePresence>
                {recent.length > 0 && !search && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        style={{ padding: '5px 0', borderBottom: '1px solid rgba(212,175,55,0.06)', flexShrink: 0 }}
                    >
                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '7px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(212,175,55,0.32)', marginBottom: '5px' }}>
                            Recent
                        </p>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {recent.slice(0, 8).map(s => (
                                <motion.button key={s.id} onClick={() => onSelect(s)}
                                    whileHover={{ scale: 1.18 }} whileTap={{ scale: 0.88 }}
                                    style={{ width: '30px', height: '30px', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <img
                                        src={s.url}
                                        alt={s.label}
                                        width={26} height={26}
                                        style={{ filter: STICKER_FILTER, transform: `rotate(${s.rotation || 0}deg)`, display: 'block' }}
                                        onError={() => handleImgError(s.url)}
                                    />
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Attribution */}
            <div style={{ padding: '2px 0', flexShrink: 0 }}>
                <span style={{ fontFamily: 'var(--font-jost)', fontSize: '7px', color: 'rgba(212,175,55,0.2)', letterSpacing: '0.06em' }}>
                    Icons8 Stickers · Twemoji (Apache 2.0)
                </span>
            </div>

            {/* Grid */}
            <div style={{ flex: 1, overflowY: 'auto', paddingTop: '4px' }}>
                {filtered.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: '20px 0', fontFamily: 'var(--font-jost)', fontSize: '11px', color: 'rgba(212,175,55,0.3)', fontStyle: 'italic' }}>
                        No stickers found
                    </p>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px' }}>
                        {filtered.map((item, i) => (
                            <motion.button
                                key={item.id}
                                onClick={() => handleSelect(item)}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.015 }}
                                whileHover={{ scale: 1.14, y: -2 }}
                                whileTap={{ scale: 0.9 }}
                                title={item.label}
                                style={{
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    gap: '3px', padding: '7px 3px',
                                    borderRadius: '10px',
                                    background: `${cat.color}0d`,
                                    border: `1px solid ${cat.color}22`,
                                    cursor: 'pointer', minHeight: '60px',
                                    transition: 'background 0.15s, border-color 0.15s',
                                }}
                                onMouseEnter={e => {
                                    const el = e.currentTarget as HTMLElement
                                    el.style.background = `${cat.color}1e`
                                    el.style.borderColor = `${cat.color}45`
                                }}
                                onMouseLeave={e => {
                                    const el = e.currentTarget as HTMLElement
                                    el.style.background = `${cat.color}0d`
                                    el.style.borderColor = `${cat.color}22`
                                }}
                            >
                                {failedUrls.has(item.url) ? (
                                    // Fallback emoji if image fails
                                    <span style={{ fontSize: '28px', lineHeight: 1 }}>✨</span>
                                ) : (
                                    <img
                                        src={item.url}
                                        alt={item.label}
                                        width={36} height={36}
                                        loading="lazy"
                                        style={{
                                            filter: STICKER_FILTER,
                                            transform: `rotate(${item.rotation || 0}deg)`,
                                            display: 'block',
                                            objectFit: 'contain',
                                        }}
                                        onError={() => handleImgError(item.url)}
                                    />
                                )}
                                <span style={{
                                    fontFamily: 'var(--font-jost)', fontSize: '7px',
                                    color: 'rgba(212,175,55,0.42)',
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