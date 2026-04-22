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

// Folder names are "pack 1", "pack 2", ... "pack 23"
// Display labels mapped from folder names
const LOCAL_PACKS: Record<string, { label: string; color: string }> = {
    'pack 1': { label: 'Animals', color: '#7a9e7e' },
    'pack 2': { label: 'Art', color: '#9b7fd4' },
    'pack 3': { label: 'Astrology', color: '#8b7355' },
    'pack 4': { label: 'Books', color: '#c4913a' },
    'pack 5': { label: 'Botanical', color: '#7a9e7e' },
    'pack 6': { label: 'Café', color: '#8b7355' },
    'pack 7': { label: 'Cats', color: '#c9897a' },
    'pack 8': { label: 'Celestial', color: '#9b7fd4' },
    'pack 9': { label: 'Cottagecore', color: '#7a9e7e' },
    'pack 10': { label: 'Academia', color: '#8b7355' },
    'pack 11': { label: 'Dreams', color: '#9b7fd4' },
    'pack 12': { label: 'Emotions', color: '#d4af37' },
    'pack 13': { label: 'Fantasy', color: '#9b7fd4' },
    'pack 14': { label: 'Floral', color: '#c9897a' },
    'pack 15': { label: 'Food', color: '#c4913a' },
    'pack 16': { label: 'Gothic', color: '#8b7355' },
    'pack 17': { label: 'Hearts', color: '#c9897a' },
    'pack 18': { label: 'Kawaii', color: '#c9897a' },
    'pack 19': { label: 'Mindful', color: '#9b7fd4' },
    'pack 20': { label: 'Music', color: '#d4af37' },
    'pack 21': { label: 'Nature', color: '#7a9e7e' },
    'pack 22': { label: 'Stars', color: '#d4af37' },
    'pack 23': { label: 'Vintage', color: '#8b7355' },
}

// Build sticker URL using the correct pack folder name
function buildStickerUrl(packName: string, filename: string): string {
    return `/stickers/${encodeURIComponent(packName)}/${filename}`
}

async function probePack(packName: string): Promise<Sticker[]> {
    const stickers: Sticker[] = []
    const probes: Promise<void>[] = []

    for (let i = 1; i <= 40; i++) {
        for (const ext of ['png', 'svg', 'jpg', 'jpeg', 'webp']) {
            const url = buildStickerUrl(packName, `${i}.${ext}`)
            const probe = fetch(url, { method: 'HEAD' }).then(r => {
                if (r.ok) {
                    stickers.push({
                        id: `${packName}-${i}-${ext}`,
                        label: `${LOCAL_PACKS[packName]?.label || packName} ${i}`,
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

const packCache: Record<string, Sticker[]> = {}

// Giphy API key
const GIPHY_KEY = 'dc6zaTOxFJmzC'

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

    // Load trending stickers when switching to search tab
    const loadTrending = useCallback(() => {
        setSearchLoading(true)
        fetch(`https://api.giphy.com/v1/stickers/trending?api_key=${GIPHY_KEY}&limit=24&rating=g`)
            .then(r => r.json())
            .then(d => {
                setSearchResults(Array.isArray(d?.data) ? d.data : [])
                setSearchLoading(false)
            })
            .catch(() => { setSearchResults([]); setSearchLoading(false) })
    }, [])

    useEffect(() => {
        if (tab === 'search' && searchResults.length === 0) {
            loadTrending()
        }
    }, [tab, loadTrending, searchResults.length])

    const handleSearch = useCallback((q: string) => {
        setSearchQuery(q)
        if (searchTimeout.current) clearTimeout(searchTimeout.current)

        if (!q.trim()) {
            loadTrending()
            return
        }

        searchTimeout.current = setTimeout(() => {
            setSearchLoading(true)
            fetch(`https://api.giphy.com/v1/stickers/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q.trim())}&limit=24&rating=g&lang=en`)
                .then(r => r.json())
                .then(d => {
                    setSearchResults(Array.isArray(d?.data) ? d.data : [])
                    setSearchLoading(false)
                })
                .catch(() => { setSearchResults([]); setSearchLoading(false) })
        }, 400)
    }, [loadTrending])

    const handleSelect = useCallback((sticker: Sticker) => {
        setRecent(prev => [sticker, ...prev.filter(s => s.id !== sticker.id)].slice(0, 8))
        onSelect(sticker)
    }, [onSelect])

    const packs = Object.entries(LOCAL_PACKS)

    const giphyToSticker = (g: any): Sticker => ({
        id: `giphy-${g.id}`,
        label: g.title || 'Sticker',
        category: 'search',
        url: g?.images?.fixed_width?.url || g?.images?.fixed_width_still?.url || '',
        thumbUrl: g?.images?.fixed_width_still?.url || g?.images?.preview_gif?.url || '',
        color: '#c9897a',
        rotation: Math.floor(Math.random() * 7) - 3,
        source: 'giphy',
        isAnimated: true,
    })

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0, overflow: 'hidden' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', paddingBottom: '8px', borderBottom: '1px solid rgba(212,175,55,0.1)', flexShrink: 0 }}>
                {([['local', '✦ Packs'], ['search', '◎ Giphy']] as [Tab, string][]).map(([id, label]) => (
                    <button key={id} onClick={() => setTab(id as Tab)} style={{
                        flex: 1, padding: '6px 4px', borderRadius: '8px', cursor: 'pointer',
                        fontFamily: 'var(--font-jost)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase',
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
                                    <img src={s.thumbUrl} alt={s.label} width={26} height={26} style={{ objectFit: 'contain', display: 'block' }} />
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* LOCAL PACKS */}
            {tab === 'local' && (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', paddingTop: '6px' }}>
                    {/* Pack selector */}
                    <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginBottom: '8px', flexShrink: 0, maxHeight: '80px', overflowY: 'auto' }}>
                        {packs.map(([key, pack]) => (
                            <button key={key} onClick={() => setActivePack(key)} style={{
                                padding: '3px 8px', borderRadius: '10px', cursor: 'pointer',
                                fontFamily: 'var(--font-jost)', fontSize: '8px', letterSpacing: '0.06em', textTransform: 'uppercase',
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
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80px', color: 'rgba(212,175,55,0.38)', fontFamily: 'var(--font-jost)', fontSize: '10px' }}>Loading…</div>
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
                                    <LocalStickerTile key={sticker.id} sticker={sticker} index={i}
                                        color={LOCAL_PACKS[activePack]?.color || '#d4af37'}
                                        onClick={() => handleSelect(sticker)} />
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
                        placeholder="Search Giphy stickers…"
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
                                {searchQuery ? 'Searching…' : 'Loading trending…'}
                            </div>
                        ) : searchResults.length === 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80px', color: 'rgba(212,175,55,0.28)', fontFamily: 'var(--font-jost)', fontSize: '9px' }}>
                                No results found
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px' }}>
                                {searchResults.map((g: any, i) => (
                                    <motion.button key={g.id || i}
                                        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: Math.min(i * 0.02, 0.3) }}
                                        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.88 }}
                                        onClick={() => handleSelect(giphyToSticker(g))}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            padding: '3px', borderRadius: '8px', minHeight: '60px',
                                            background: 'rgba(201,137,122,0.06)',
                                            border: '1px solid rgba(201,137,122,0.18)',
                                            cursor: 'pointer', overflow: 'hidden',
                                        }}>
                                        <img
                                            src={g?.images?.fixed_width_still?.url || g?.images?.preview_gif?.url || ''}
                                            alt={g.title || 'sticker'}
                                            style={{ maxWidth: '54px', maxHeight: '54px', objectFit: 'contain', display: 'block', borderRadius: '5px' }}
                                            loading="lazy"
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

function LocalStickerTile({ sticker, index, color, onClick }: { sticker: Sticker; index: number; color: string; onClick: () => void }) {
    const [failed, setFailed] = useState(false)
    const [loaded, setLoaded] = useState(false)
    if (failed) return null
    return (
        <motion.button onClick={onClick}
            initial={{ opacity: 0, scale: 0.75 }} animate={{ opacity: loaded ? 1 : 0.3, scale: 1 }}
            transition={{ delay: Math.min(index * 0.012, 0.3) }}
            whileHover={{ scale: 1.12, y: -2 }} whileTap={{ scale: 0.88 }}
            style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '2px', padding: '6px 3px', borderRadius: '10px', minHeight: '58px',
                background: `${color}0c`, border: `1px solid ${color}20`, cursor: 'pointer',
            }}>
            <img src={sticker.url} alt={sticker.label} width={38} height={38}
                style={{ objectFit: 'contain', display: 'block', transform: `rotate(${sticker.rotation || 0}deg)`, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.2))' }}
                onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
        </motion.button>
    )
}