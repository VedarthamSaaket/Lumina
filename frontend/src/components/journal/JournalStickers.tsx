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
    source?: string
    isAnimated?: boolean
}

// 23 local sticker pack folders under /public/stickers/
// Each folder name becomes the pack label
const LOCAL_PACKS: Record<string, { label: string; color: string }> = {
    'animals': { label: 'Animals', color: '#7a9e7e' },
    'art': { label: 'Art', color: '#9b7fd4' },
    'astrology': { label: 'Astrology', color: '#8b7355' },
    'books': { label: 'Books', color: '#c4913a' },
    'botanical': { label: 'Botanical', color: '#7a9e7e' },
    'cafe': { label: 'Cafe', color: '#8b7355' },
    'cats': { label: 'Cats', color: '#c9897a' },
    'celestial': { label: 'Celestial', color: '#9b7fd4' },
    'cottagecore': { label: 'Cottagecore', color: '#7a9e7e' },
    'dark_academia': { label: 'Academia', color: '#8b7355' },
    'dreams': { label: 'Dreams', color: '#9b7fd4' },
    'emotions': { label: 'Emotions', color: '#d4af37' },
    'fantasy': { label: 'Fantasy', color: '#9b7fd4' },
    'floral': { label: 'Floral', color: '#c9897a' },
    'food': { label: 'Food', color: '#c4913a' },
    'gothic': { label: 'Gothic', color: '#8b7355' },
    'hearts': { label: 'Hearts', color: '#c9897a' },
    'kawaii': { label: 'Kawaii', color: '#c9897a' },
    'mindful': { label: 'Mindful', color: '#9b7fd4' },
    'music': { label: 'Music', color: '#d4af37' },
    'nature': { label: 'Nature', color: '#7a9e7e' },
    'stars': { label: 'Stars', color: '#d4af37' },
    'vintage': { label: 'Vintage', color: '#8b7355' },
}

// Common image extensions to probe
const IMG_EXTS = ['png', 'svg', 'jpg', 'jpeg', 'webp', 'gif']

// We'll build a sticker list by probing paths
// Since we can't list directories in the browser, we try numbered filenames
// The stickers are expected at /stickers/{pack}/{1..30}.png etc.
// We use a manifest approach: try to load and detect 404s
function buildStickerUrl(pack: string, filename: string): string {
    return `/stickers/${pack}/${filename}`
}

// Probe for stickers in a pack by trying filenames 1..40
async function probePack(packName: string): Promise<Sticker[]> {
    const stickers: Sticker[] = []

    // Try numeric filenames first (1.png, 2.png, etc.)
    const probes: Promise<void>[] = []

    for (let i = 1; i <= 40; i++) {
        for (const ext of ['png', 'svg', 'jpg', 'jpeg', 'webp']) {
            const url = buildStickerUrl(packName, `${i}.${ext}`)
            const probe = fetch(url, { method: 'HEAD' }).then(r => {
                if (r.ok) {
                    stickers.push({
                        id: `${packName}-${i}-${ext}`,
                        label: `${packName} ${i}`,
                        category: packName,
                        url,
                        thumbUrl: url,
                        color: LOCAL_PACKS[packName]?.color || '#d4af37',
                        rotation: Math.floor(Math.random() * 7) - 3,
                        source: 'local',
                    })
                }
            }).catch(() => { })
            probes.push(probe)
        }
    }

    await Promise.all(probes)
    return stickers.sort((a, b) => {
        const na = parseInt(a.id.split('-')[1])
        const nb = parseInt(b.id.split('-')[1])
        return na - nb
    })
}

type Tab = 'local' | 'search'

interface Props {
    onSelect: (sticker: Sticker) => void
    onClose: () => void
}

// Cache so we don't re-probe on each open
const packCache: Record<string, Sticker[]> = {}

export default function JournalStickers({ onSelect, onClose }: Props) {
    const [tab, setTab] = useState<Tab>('local')
    const [activePack, setActivePack] = useState(Object.keys(LOCAL_PACKS)[0])
    const [packStickers, setPackStickers] = useState<Sticker[]>([])
    const [loading, setLoading] = useState(false)
    const [recent, setRecent] = useState<Sticker[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [searchLoading, setSearchLoading] = useState(false)
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Load pack stickers
    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setPackStickers([])

        if (packCache[activePack]) {
            setPackStickers(packCache[activePack])
            setLoading(false)
            return
        }

        probePack(activePack).then(stickers => {
            if (!cancelled) {
                packCache[activePack] = stickers
                setPackStickers(stickers)
                setLoading(false)
            }
        })

        return () => { cancelled = true }
    }, [activePack])

    // Giphy search fallback
    useEffect(() => {
        if (tab !== 'search') return
        setSearchLoading(true)
        const GIPHY_KEY = 'dc6zaTOxFJmzC'
        fetch(`https://api.giphy.com/v1/stickers/trending?api_key=${GIPHY_KEY}&limit=20&rating=g`)
            .then(r => r.json())
            .then(d => { setSearchResults(d.data || []); setSearchLoading(false) })
            .catch(() => setSearchLoading(false))
    }, [tab])

    const handleSearch = (q: string) => {
        setSearchQuery(q)
        if (searchTimeout.current) clearTimeout(searchTimeout.current)
        const GIPHY_KEY = 'dc6zaTOxFJmzC'
        if (!q.trim()) {
            setSearchLoading(true)
            fetch(`https://api.giphy.com/v1/stickers/trending?api_key=${GIPHY_KEY}&limit=20&rating=g`)
                .then(r => r.json())
                .then(d => { setSearchResults(d.data || []); setSearchLoading(false) })
                .catch(() => setSearchLoading(false))
            return
        }
        searchTimeout.current = setTimeout(() => {
            setSearchLoading(true)
            fetch(`https://api.giphy.com/v1/stickers/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=20&rating=g`)
                .then(r => r.json())
                .then(d => { setSearchResults(d.data || []); setSearchLoading(false) })
                .catch(() => setSearchLoading(false))
        }, 480)
    }

    const handleSelect = useCallback((sticker: Sticker) => {
        setRecent(prev => [sticker, ...prev.filter(s => s.id !== sticker.id)].slice(0, 8))
        onSelect(sticker)
    }, [onSelect])

    const packs = Object.entries(LOCAL_PACKS)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0, overflow: 'hidden' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', paddingBottom: '8px', borderBottom: '1px solid rgba(212,175,55,0.1)', flexShrink: 0 }}>
                {([['local', '✦ Packs'], ['search', '◎ Giphy']] as [Tab, string][]).map(([id, label]) => (
                    <button key={id} onClick={() => setTab(id)} style={{
                        flex: 1, padding: '6px 4px', borderRadius: '8px', cursor: 'pointer',
                        fontFamily: 'var(--font-jost)', fontSize: '9px', letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        background: tab === id ? 'rgba(212,175,55,0.15)' : 'transparent',
                        border: tab === id ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent',
                        color: tab === id ? 'rgba(212,175,55,0.95)' : 'rgba(212,175,55,0.38)',
                    }}>{label}</button>
                ))}
            </div>

            {/* Recent row */}
            <AnimatePresence>
                {recent.length > 0 && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden', paddingBottom: '6px', borderBottom: '1px solid rgba(212,175,55,0.07)', flexShrink: 0 }}>
                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '7px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(212,175,55,0.3)', margin: '5px 0 4px' }}>Recent</p>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {recent.map(s => (
                                <motion.button key={s.id} onClick={() => onSelect(s)} whileHover={{ scale: 1.18 }} whileTap={{ scale: 0.85 }}
                                    style={{ width: '30px', height: '30px', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                                    <img src={s.thumbUrl} alt={s.label} width={26} height={26}
                                        style={{ objectFit: 'contain', display: 'block' }} />
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* LOCAL PACKS */}
            {tab === 'local' && (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', paddingTop: '6px' }}>
                    {/* Pack selector scrollable pills */}
                    <div style={{
                        display: 'flex', gap: '3px', flexWrap: 'wrap',
                        marginBottom: '8px', flexShrink: 0,
                        maxHeight: '80px', overflowY: 'auto',
                    }}>
                        {packs.map(([key, pack]) => (
                            <button key={key} onClick={() => setActivePack(key)} style={{
                                padding: '3px 8px', borderRadius: '10px', cursor: 'pointer',
                                fontFamily: 'var(--font-jost)', fontSize: '8px', letterSpacing: '0.06em',
                                textTransform: 'uppercase',
                                background: activePack === key ? `${pack.color}22` : 'transparent',
                                border: activePack === key ? `1px solid ${pack.color}45` : '1px solid rgba(212,175,55,0.12)',
                                color: activePack === key ? pack.color : 'rgba(212,175,55,0.38)',
                                transition: 'all 0.12s',
                            }}>{pack.label}</button>
                        ))}
                    </div>

                    {/* Sticker grid */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {loading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80px', color: 'rgba(212,175,55,0.38)', fontFamily: 'var(--font-jost)', fontSize: '10px' }}>
                                Loading...
                            </div>
                        ) : packStickers.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100px', gap: '8px' }}>
                                <span style={{ color: 'rgba(212,175,55,0.3)', fontSize: '24px' }}>◈</span>
                                <p style={{ color: 'rgba(212,175,55,0.28)', fontFamily: 'var(--font-jost)', fontSize: '9px', textAlign: 'center', lineHeight: 1.5, maxWidth: '160px' }}>
                                    Place PNG files in<br />/public/stickers/{activePack}/
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px' }}>
                                {packStickers.map((sticker, i) => (
                                    <LocalStickerTile
                                        key={sticker.id}
                                        sticker={sticker}
                                        index={i}
                                        color={LOCAL_PACKS[activePack]?.color || '#d4af37'}
                                        onClick={() => handleSelect(sticker)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* GIPHY SEARCH */}
            {tab === 'search' && (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', paddingTop: '6px' }}>
                    <input
                        value={searchQuery}
                        onChange={e => handleSearch(e.target.value)}
                        placeholder="Search stickers…"
                        style={{
                            width: '100%', padding: '6px 10px', borderRadius: '8px', marginBottom: '7px',
                            background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.18)',
                            color: 'rgba(254,244,228,0.85)', fontFamily: 'var(--font-jost)', fontSize: '11px',
                            outline: 'none', boxSizing: 'border-box', flexShrink: 0,
                        }}
                    />
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {searchLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80px', color: 'rgba(212,175,55,0.38)', fontFamily: 'var(--font-jost)', fontSize: '10px' }}>
                                Searching...
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px' }}>
                                {searchResults.map((g: any, i) => (
                                    <motion.button key={g.id}
                                        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: Math.min(i * 0.02, 0.3) }}
                                        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.88 }}
                                        onClick={() => handleSelect({
                                            id: `giphy-${g.id}`, label: g.title || 'Sticker',
                                            category: 'search',
                                            url: g.images?.fixed_width?.url || g.images?.fixed_width_still?.url || '',
                                            thumbUrl: g.images?.fixed_width_still?.url || '',
                                            color: '#c9897a', rotation: Math.floor(Math.random() * 7) - 3,
                                            source: 'giphy', isAnimated: true,
                                        })}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            padding: '3px', borderRadius: '8px', minHeight: '60px',
                                            background: 'rgba(201,137,122,0.06)',
                                            border: '1px solid rgba(201,137,122,0.18)',
                                            cursor: 'pointer', overflow: 'hidden',
                                        }}>
                                        <img
                                            src={g.images?.fixed_width_still?.url || ''}
                                            alt={g.title}
                                            style={{ maxWidth: '54px', maxHeight: '54px', objectFit: 'contain', display: 'block', borderRadius: '5px' }}
                                        />
                                    </motion.button>
                                ))}
                            </div>
                        )}
                        <p style={{ textAlign: 'center', padding: '6px', fontFamily: 'var(--font-jost)', fontSize: '7px', color: 'rgba(212,175,55,0.2)' }}>Powered by GIPHY</p>
                    </div>
                </div>
            )}
        </div>
    )
}

function LocalStickerTile({ sticker, index, color, onClick }: {
    sticker: Sticker
    index: number
    color: string
    onClick: () => void
}) {
    const [failed, setFailed] = useState(false)
    const [loaded, setLoaded] = useState(false)

    if (failed) return null

    return (
        <motion.button
            onClick={onClick}
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: loaded ? 1 : 0.3, scale: 1 }}
            transition={{ delay: Math.min(index * 0.012, 0.3) }}
            whileHover={{ scale: 1.12, y: -2 }}
            whileTap={{ scale: 0.88 }}
            style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '2px', padding: '6px 3px', borderRadius: '10px', minHeight: '58px',
                background: `${color}0c`, border: `1px solid ${color}20`, cursor: 'pointer',
                transition: 'background 0.12s',
            }}
        >
            <img
                src={sticker.url}
                alt={sticker.label}
                width={38}
                height={38}
                style={{
                    objectFit: 'contain', display: 'block',
                    transform: `rotate(${sticker.rotation || 0}deg)`,
                    filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.2))',
                }}
                onLoad={() => setLoaded(true)}
                onError={() => setFailed(true)}
            />
        </motion.button>
    )
}