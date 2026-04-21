'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface Sticker {
    id: string
    label: string
    category: string
    url: string
    thumbUrl: string
    color: string
    rotation?: number
    source?: 'local' | 'giphy' | 'tenor'
}

// ─── SVG Die-Cut Filter ────────────────────────────────────────────────────
// feMorphology dilates the alpha channel → creates a true white stroke border
// This looks like a real physical die-cut sticker, not just a glow
const DIE_CUT_FILTER_ID = 'sticker-diecut'
const DieCutFilterDef = () => (
    <svg width={0} height={0} style={{ position: 'absolute' }}>
        <defs>
            <filter id={DIE_CUT_FILTER_ID} x="-15%" y="-15%" width="130%" height="130%">
                {/* Dilate alpha to get border shape */}
                <feMorphology in="SourceAlpha" operator="dilate" radius="2.5" result="dilated" />
                {/* Fill border white */}
                <feFlood floodColor="white" result="white" />
                <feComposite in="white" in2="dilated" operator="in" result="whiteBorder" />
                {/* Stack: white border → peel shadow → original image */}
                <feMerge>
                    <feMergeNode in="whiteBorder" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
                {/* Subtle drop shadow for peel/depth */}
                <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="rgba(0,0,0,0.35)" />
            </filter>
        </defs>
    </svg>
)

const STICKER_STYLE = { filter: `url(#${DIE_CUT_FILTER_ID})` } as const

// ─── CDN sources ──────────────────────────────────────────────────────────
const TW = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.0.3/assets/72x72'
function tw(cp: string) { return `${TW}/${cp}.png` }
function i8(name: string, size = 96) {
    return `https://img.icons8.com/stickers/${size}/${encodeURIComponent(name)}.png`
}

// ─── Giphy Stickers API ────────────────────────────────────────────────────
// Free public beta key — replace with your own from developers.giphy.com
// (free tier: 100 req/hr, no CC required)
const GIPHY_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY || 'dc6zaTOxFJmzC'

async function searchGiphyStickers(query: string, offset = 0): Promise<GiphySticker[]> {
    const url = new URL('https://api.giphy.com/v1/stickers/search')
    url.searchParams.set('api_key', GIPHY_KEY)
    url.searchParams.set('q', query)
    url.searchParams.set('limit', '20')
    url.searchParams.set('offset', String(offset))
    url.searchParams.set('rating', 'g')
    url.searchParams.set('lang', 'en')

    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(`Giphy ${res.status}`)
    const json = await res.json()
    return json.data || []
}

async function getTrendingGiphyStickers(): Promise<GiphySticker[]> {
    const url = new URL('https://api.giphy.com/v1/stickers/trending')
    url.searchParams.set('api_key', GIPHY_KEY)
    url.searchParams.set('limit', '24')
    url.searchParams.set('rating', 'g')

    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(`Giphy ${res.status}`)
    const json = await res.json()
    return json.data || []
}

interface GiphySticker {
    id: string
    title: string
    images: {
        fixed_width_still: { url: string; width: string; height: string }
        fixed_width: { url: string }
        downsized_still: { url: string }
        original_still: { url: string }
    }
}

function giphyToSticker(g: GiphySticker): Sticker {
    return {
        id: `giphy-${g.id}`,
        label: g.title || 'Sticker',
        category: 'giphy',
        // Use still (non-animated) PNG for performance; swap to fixed_width.url for animated GIF
        url: g.images.fixed_width_still?.url || g.images.downsized_still?.url || '',
        thumbUrl: g.images.fixed_width_still?.url || '',
        color: '#c9897a',
        rotation: Math.floor(Math.random() * 7) - 3,
        source: 'giphy',
    }
}

// ─── Local packs ──────────────────────────────────────────────────────────
interface StickerDef {
    id: string
    label: string
    url: string
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
        { id: 'vint-compass', label: 'Compass', url: tw('1f9ed'), rotation: -2 },
        { id: 'vint-map', label: 'Map', url: tw('1f5fa'), rotation: 1 },
        { id: 'vint-music', label: 'Music', url: tw('1f3b5'), rotation: 2 },
    ],
    cozy: [
        { id: 'cozy-coffee', label: 'Coffee', url: i8('coffee'), rotation: 2 },
        { id: 'cozy-tea', label: 'Tea', url: tw('1f375'), rotation: -2 },
        { id: 'cozy-book', label: 'Books', url: i8('books') },
        { id: 'cozy-cat', label: 'Cat', url: tw('1f431'), rotation: 2 },
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
        { id: 'std-memo', label: 'Memo', url: tw('1f4dd') },
        { id: 'std-lab', label: 'Science', url: tw('1f9ea'), rotation: 2 },
        { id: 'std-telescope', label: 'Stars', url: tw('1f52d'), rotation: -1 },
        { id: 'std-medal', label: 'Medal', url: tw('1f3c5'), rotation: 2 },
        { id: 'std-check', label: 'Done', url: tw('2705') },
    ],
}

const LOCAL_CATEGORIES: { key: string; label: string; color: string }[] = [
    { key: 'mood', label: 'Mood', color: '#c9897a' },
    { key: 'nature', label: 'Nature', color: '#7a9e7e' },
    { key: 'mindful', label: 'Mindful', color: '#9b7fd4' },
    { key: 'celebrate', label: 'Celebrate', color: '#d4af37' },
    { key: 'luxe', label: 'Luxe', color: '#c4913a' },
    { key: 'vintage', label: 'Vintage', color: '#8b7355' },
    { key: 'cozy', label: 'Cozy', color: '#c9897a' },
    { key: 'study', label: 'Study', color: '#b8a070' },
]

const GIPHY_PRESETS = ['cute', 'sparkle', 'love', 'aesthetic', 'kawaii', 'nature', 'stars', 'cozy']

// ─── Props ────────────────────────────────────────────────────────────────
interface Props {
    onSelect: (sticker: Sticker) => void
    onClose: () => void
}

type Tab = 'local' | 'giphy'

export default function JournalStickers({ onSelect, onClose }: Props) {
    // ── Tab
    const [tab, setTab] = useState<Tab>('local')

    // ── Local state
    const [activeCat, setActiveCat] = useState('mood')
    const [localSearch, setLocalSearch] = useState('')
    const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set())

    // ── Giphy state
    const [giphyQuery, setGiphyQuery] = useState('')
    const [giphyResults, setGiphyResults] = useState<Sticker[]>([])
    const [giphyLoading, setGiphyLoading] = useState(false)
    const [giphyError, setGiphyError] = useState<string | null>(null)
    const [giphyOffset, setGiphyOffset] = useState(0)
    const [hasMore, setHasMore] = useState(false)
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

    // ── Shared
    const [recent, setRecent] = useState<Sticker[]>([])

    const cat = LOCAL_CATEGORIES.find(c => c.key === activeCat) || LOCAL_CATEGORIES[0]

    // ── Fetch Giphy trending on mount / tab switch
    useEffect(() => {
        if (tab !== 'giphy') return
        if (giphyResults.length > 0) return   // already loaded
        loadTrending()
    }, [tab])

    const loadTrending = async () => {
        setGiphyLoading(true)
        setGiphyError(null)
        try {
            const data = await getTrendingGiphyStickers()
            setGiphyResults(data.map(giphyToSticker))
            setHasMore(false)
        } catch (e) {
            setGiphyError('Could not load stickers. Check your API key.')
        } finally {
            setGiphyLoading(false)
        }
    }

    // ── Giphy search (debounced)
    const handleGiphySearch = useCallback((q: string) => {
        setGiphyQuery(q)
        if (searchTimeout.current) clearTimeout(searchTimeout.current)
        if (!q.trim()) {
            loadTrending()
            return
        }
        searchTimeout.current = setTimeout(async () => {
            setGiphyLoading(true)
            setGiphyError(null)
            setGiphyOffset(0)
            try {
                const data = await searchGiphyStickers(q, 0)
                setGiphyResults(data.map(giphyToSticker))
                setHasMore(data.length === 20)
            } catch {
                setGiphyError('Search failed. Try again.')
            } finally {
                setGiphyLoading(false)
            }
        }, 500)
    }, [])

    // ── Load more Giphy results
    const loadMore = async () => {
        if (!giphyQuery.trim() || giphyLoading) return
        const nextOffset = giphyOffset + 20
        setGiphyLoading(true)
        try {
            const data = await searchGiphyStickers(giphyQuery, nextOffset)
            setGiphyResults(prev => [...prev, ...data.map(giphyToSticker)])
            setGiphyOffset(nextOffset)
            setHasMore(data.length === 20)
        } catch { /* ignore */ }
        finally { setGiphyLoading(false) }
    }

    const handleImgError = useCallback((url: string) => {
        setFailedUrls(prev => new Set([...prev, url]))
    }, [])

    const handleSelect = useCallback((sticker: Sticker) => {
        setRecent(prev => {
            const without = prev.filter(s => s.id !== sticker.id)
            return [sticker, ...without].slice(0, 8)
        })
        onSelect(sticker)
    }, [onSelect])

    const handleLocalSelect = useCallback((item: StickerDef) => {
        handleSelect({
            id: item.id,
            label: item.label,
            category: activeCat,
            url: item.url,
            thumbUrl: item.url,
            color: cat.color,
            rotation: item.rotation || 0,
            source: 'local',
        })
    }, [activeCat, cat.color, handleSelect])

    // ── Local filtered list
    const localFiltered = localSearch.trim()
        ? Object.values(PACKS).flat().filter(s =>
            s.label.toLowerCase().includes(localSearch.toLowerCase())
        )
        : (PACKS[activeCat] || [])

    const accentColor = tab === 'giphy' ? '#c9897a' : cat.color

    return (
        <>
            {/* Inject the SVG filter once */}
            <DieCutFilterDef />

            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* ── Tab bar ─────────────────────────────────────── */}
                <div style={{ display: 'flex', gap: '2px', padding: '0 0 8px', flexShrink: 0 }}>
                    {(['local', 'giphy'] as Tab[]).map(t => (
                        <button key={t} onClick={() => setTab(t)} style={{
                            flex: 1, padding: '5px 0', borderRadius: '8px', cursor: 'pointer',
                            fontFamily: 'var(--font-jost)', fontSize: '9px', letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            background: tab === t ? 'rgba(212,175,55,0.12)' : 'transparent',
                            border: tab === t ? '1px solid rgba(212,175,55,0.25)' : '1px solid transparent',
                            color: tab === t ? 'rgba(212,175,55,0.9)' : 'rgba(212,175,55,0.3)',
                            transition: 'all 0.15s',
                        }}>
                            {t === 'local' ? '✦ Library' : '✦ Giphy'}
                        </button>
                    ))}
                </div>

                {/* ── Recently used ───────────────────────────────── */}
                <AnimatePresence>
                    {recent.length > 0 && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{ overflow: 'hidden', flexShrink: 0 }}
                        >
                            <div style={{ padding: '0 0 6px', borderBottom: '1px solid rgba(212,175,55,0.06)' }}>
                                <p style={{
                                    fontFamily: 'var(--font-jost)', fontSize: '7px', letterSpacing: '0.12em',
                                    textTransform: 'uppercase', color: 'rgba(212,175,55,0.32)', marginBottom: '5px',
                                }}>
                                    Recent
                                </p>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    {recent.slice(0, 8).map(s => (
                                        <motion.button key={s.id} onClick={() => onSelect(s)}
                                            whileHover={{ scale: 1.18 }} whileTap={{ scale: 0.88 }}
                                            style={{
                                                width: '32px', height: '32px', background: 'transparent',
                                                border: 'none', cursor: 'pointer', padding: 0,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                            <img
                                                src={s.url} alt={s.label} width={26} height={26}
                                                style={{ ...STICKER_STYLE, transform: `rotate(${s.rotation || 0}deg)`, display: 'block' }}
                                            />
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ════════════════════ LOCAL TAB ══════════════════ */}
                {tab === 'local' && (
                    <>
                        {/* Search */}
                        <div style={{ padding: '6px 0 5px', flexShrink: 0 }}>
                            <input
                                value={localSearch}
                                onChange={e => setLocalSearch(e.target.value)}
                                placeholder="Search library…"
                                style={{
                                    width: '100%', padding: '5px 10px', borderRadius: '8px',
                                    background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)',
                                    color: 'rgba(254,244,228,0.85)', fontFamily: 'var(--font-jost)', fontSize: '11px',
                                    outline: 'none', boxSizing: 'border-box',
                                }}
                            />
                        </div>

                        {/* Category tabs */}
                        {!localSearch && (
                            <div style={{
                                display: 'flex', gap: '3px', flexWrap: 'wrap',
                                padding: '0 0 6px', borderBottom: '1px solid rgba(212,175,55,0.08)', flexShrink: 0,
                            }}>
                                {LOCAL_CATEGORIES.map(c => (
                                    <button key={c.key} onClick={() => { setActiveCat(c.key) }}
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
                        )}

                        {/* Attribution */}
                        <div style={{ padding: '3px 0 1px', flexShrink: 0 }}>
                            <span style={{ fontFamily: 'var(--font-jost)', fontSize: '7px', color: 'rgba(212,175,55,0.2)', letterSpacing: '0.06em' }}>
                                Icons8 Stickers · Twemoji (Apache 2.0)
                            </span>
                        </div>

                        {/* Grid */}
                        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '4px' }}>
                            {localFiltered.length === 0 ? (
                                <p style={{ textAlign: 'center', padding: '20px 0', fontFamily: 'var(--font-jost)', fontSize: '11px', color: 'rgba(212,175,55,0.3)', fontStyle: 'italic' }}>
                                    No stickers found
                                </p>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px' }}>
                                    {localFiltered.map((item, i) => (
                                        <StickerCell
                                            key={item.id}
                                            url={item.url}
                                            label={item.label}
                                            rotation={item.rotation || 0}
                                            accentColor={cat.color}
                                            index={i}
                                            failed={failedUrls.has(item.url)}
                                            onError={() => handleImgError(item.url)}
                                            onClick={() => handleLocalSelect(item)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ════════════════════ GIPHY TAB ══════════════════ */}
                {tab === 'giphy' && (
                    <>
                        {/* Search */}
                        <div style={{ padding: '6px 0 5px', flexShrink: 0 }}>
                            <input
                                value={giphyQuery}
                                onChange={e => handleGiphySearch(e.target.value)}
                                placeholder="Search Giphy stickers…"
                                style={{
                                    width: '100%', padding: '5px 10px', borderRadius: '8px',
                                    background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)',
                                    color: 'rgba(254,244,228,0.85)', fontFamily: 'var(--font-jost)', fontSize: '11px',
                                    outline: 'none', boxSizing: 'border-box',
                                }}
                            />
                        </div>

                        {/* Preset tags */}
                        <div style={{
                            display: 'flex', gap: '3px', flexWrap: 'wrap',
                            padding: '0 0 6px', borderBottom: '1px solid rgba(212,175,55,0.08)', flexShrink: 0,
                        }}>
                            {GIPHY_PRESETS.map(preset => (
                                <button key={preset} onClick={() => handleGiphySearch(preset)}
                                    style={{
                                        flexShrink: 0, padding: '3px 7px', borderRadius: '10px', cursor: 'pointer',
                                        fontFamily: 'var(--font-jost)', fontSize: '8px', letterSpacing: '0.06em',
                                        textTransform: 'capitalize',
                                        background: giphyQuery === preset ? 'rgba(201,137,122,0.2)' : 'transparent',
                                        border: giphyQuery === preset ? '1px solid rgba(201,137,122,0.4)' : '1px solid rgba(212,175,55,0.1)',
                                        color: giphyQuery === preset ? '#c9897a' : 'rgba(212,175,55,0.35)',
                                        transition: 'all 0.15s',
                                    }}>
                                    {preset}
                                </button>
                            ))}
                        </div>

                        {/* Attribution */}
                        <div style={{ padding: '3px 0 1px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <img
                                src="https://developers.giphy.com/branch/master/static/header-logo-8974b8ae658f704a5b48a2d039b8ad4b.gif"
                                alt="Powered by Giphy" height={12}
                                style={{ opacity: 0.5 }}
                            />
                            <span style={{ fontFamily: 'var(--font-jost)', fontSize: '7px', color: 'rgba(212,175,55,0.2)', letterSpacing: '0.06em' }}>
                                Powered by Giphy · Add NEXT_PUBLIC_GIPHY_API_KEY to .env
                            </span>
                        </div>

                        {/* Results */}
                        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '4px' }}>
                            {giphyLoading && giphyResults.length === 0 ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                        style={{
                                            width: '20px', height: '20px', borderRadius: '50%',
                                            border: '2px solid rgba(212,175,55,0.1)',
                                            borderTopColor: 'rgba(212,175,55,0.6)',
                                        }}
                                    />
                                </div>
                            ) : giphyError ? (
                                <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                                    <p style={{ fontFamily: 'var(--font-jost)', fontSize: '10px', color: 'rgba(201,137,122,0.7)', marginBottom: '8px' }}>
                                        {giphyError}
                                    </p>
                                    <p style={{ fontFamily: 'var(--font-jost)', fontSize: '8px', color: 'rgba(212,175,55,0.3)', lineHeight: 1.6 }}>
                                        Get a free key at developers.giphy.com<br />
                                        Add to .env: NEXT_PUBLIC_GIPHY_API_KEY=your_key
                                    </p>
                                </div>
                            ) : giphyResults.length === 0 ? (
                                <p style={{ textAlign: 'center', padding: '20px 0', fontFamily: 'var(--font-jost)', fontSize: '11px', color: 'rgba(212,175,55,0.3)', fontStyle: 'italic' }}>
                                    No stickers found
                                </p>
                            ) : (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px' }}>
                                        {giphyResults.map((sticker, i) => (
                                            <StickerCell
                                                key={sticker.id}
                                                url={sticker.url}
                                                label={sticker.label}
                                                rotation={sticker.rotation || 0}
                                                accentColor="#c9897a"
                                                index={i}
                                                failed={failedUrls.has(sticker.url)}
                                                onError={() => handleImgError(sticker.url)}
                                                onClick={() => handleSelect(sticker)}
                                            />
                                        ))}
                                    </div>
                                    {hasMore && (
                                        <button
                                            onClick={loadMore}
                                            disabled={giphyLoading}
                                            style={{
                                                width: '100%', marginTop: '8px', padding: '8px',
                                                background: 'rgba(212,175,55,0.06)',
                                                border: '1px solid rgba(212,175,55,0.15)',
                                                borderRadius: '8px', cursor: 'pointer',
                                                fontFamily: 'var(--font-jost)', fontSize: '9px',
                                                letterSpacing: '0.1em', textTransform: 'uppercase',
                                                color: 'rgba(212,175,55,0.5)',
                                            }}>
                                            {giphyLoading ? 'Loading…' : 'Load more'}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>
        </>
    )
}

// ─── Shared sticker cell ───────────────────────────────────────────────────
interface CellProps {
    url: string
    label: string
    rotation: number
    accentColor: string
    index: number
    failed: boolean
    onError: () => void
    onClick: () => void
}
function StickerCell({ url, label, rotation, accentColor, index, failed, onError, onClick }: CellProps) {
    return (
        <motion.button
            onClick={onClick}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(index * 0.015, 0.3) }}
            whileHover={{ scale: 1.14, y: -2 }}
            whileTap={{ scale: 0.9 }}
            title={label}
            style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: '3px', padding: '7px 3px',
                borderRadius: '10px',
                background: `${accentColor}0d`,
                border: `1px solid ${accentColor}22`,
                cursor: 'pointer', minHeight: '60px',
                transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = `${accentColor}1e`
                el.style.borderColor = `${accentColor}45`
            }}
            onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = `${accentColor}0d`
                el.style.borderColor = `${accentColor}22`
            }}
        >
            {failed ? (
                <span style={{ fontSize: '28px', lineHeight: 1 }}>✨</span>
            ) : (
                <img
                    src={url}
                    alt={label}
                    width={36} height={36}
                    loading="lazy"
                    style={{
                        ...STICKER_STYLE,
                        transform: `rotate(${rotation}deg)`,
                        display: 'block',
                        objectFit: 'contain',
                    }}
                    onError={onError}
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
                {label}
            </span>
        </motion.button>
    )
}