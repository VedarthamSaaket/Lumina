'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { STICKER_PACKS, LOTTIE_STICKERS } from './stickerPacks'

export interface Sticker {
    id: string
    label: string
    category: string
    url: string
    thumbUrl: string
    color: string
    rotation?: number
    source?: 'openmoji' | 'icons8' | 'twemoji' | 'giphy' | 'tenor' | 'lottie'
    isLottie?: boolean
    isAnimated?: boolean
}

const DIE_CUT_FILTER_ID = 'sticker-diecut-v3'
const DieCutFilterDef = () => (
    <svg width={0} height={0} style={{ position: 'absolute', overflow: 'hidden' }}>
        <defs>
            <filter id={DIE_CUT_FILTER_ID} x="-18%" y="-18%" width="136%" height="136%">
                <feMorphology in="SourceAlpha" operator="dilate" radius="3" result="dilated" />
                <feFlood floodColor="white" result="white" />
                <feComposite in="white" in2="dilated" operator="in" result="whiteBorder" />
                <feDropShadow in="dilated" dx="1.5" dy="3" stdDeviation="2.5" floodColor="rgba(0,0,0,0.40)" floodOpacity="1" result="shadow" />
                <feComposite in="SourceGraphic" in2="dilated" operator="in" result="clipped" />
                <feMerge>
                    <feMergeNode in="shadow" />
                    <feMergeNode in="whiteBorder" />
                    <feMergeNode in="clipped" />
                </feMerge>
            </filter>
        </defs>
    </svg>
)

const GIPHY_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY || 'dc6zaTOxFJmzC'

interface GiphyItem {
    id: string
    title: string
    images: { fixed_width_still: { url: string }; fixed_width: { url: string } }
}

async function fetchGiphy(query: string): Promise<GiphyItem[]> {
    const url = new URL('https://api.giphy.com/v1/stickers/search')
    url.searchParams.set('api_key', GIPHY_KEY)
    url.searchParams.set('q', query)
    url.searchParams.set('limit', '24')
    url.searchParams.set('rating', 'g')
    const res = await fetch(url.toString())
    if (!res.ok) return []
    return (await res.json()).data || []
}

async function fetchGiphyTrending(): Promise<GiphyItem[]> {
    const url = new URL('https://api.giphy.com/v1/stickers/trending')
    url.searchParams.set('api_key', GIPHY_KEY)
    url.searchParams.set('limit', '24')
    url.searchParams.set('rating', 'g')
    const res = await fetch(url.toString())
    if (!res.ok) return []
    return (await res.json()).data || []
}

function useLottiePlayer() {
    const [loaded, setLoaded] = useState(false)
    useEffect(() => {
        if (typeof window === 'undefined') return
        if (document.querySelector('script[data-lottie-player]')) { setLoaded(true); return }
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js'
        script.setAttribute('data-lottie-player', 'true')
        script.onload = () => setLoaded(true)
        document.head.appendChild(script)
    }, [])
    return loaded
}

type Tab = 'packs' | 'animated' | 'search'

interface Props {
    onSelect: (sticker: Sticker) => void
    onClose: () => void
}

export default function JournalStickers({ onSelect, onClose }: Props) {
    const [tab, setTab] = useState<Tab>('packs')
    const [activePack, setActivePack] = useState('kawaii')
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<GiphyItem[]>([])
    const [searchLoading, setSearchLoading] = useState(false)
    const [recent, setRecent] = useState<Sticker[]>([])
    const lottiePlayerLoaded = useLottiePlayer()
    const [hoveredLottie, setHoveredLottie] = useState<string | null>(null)
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (tab === 'search' && !searchQuery) {
            setSearchLoading(true)
            fetchGiphyTrending().then(d => { setSearchResults(d); setSearchLoading(false) })
        }
    }, [tab])

    const handleSearch = useCallback((q: string) => {
        setSearchQuery(q)
        if (searchTimeout.current) clearTimeout(searchTimeout.current)
        if (!q.trim()) {
            setSearchLoading(true)
            fetchGiphyTrending().then(d => { setSearchResults(d); setSearchLoading(false) })
            return
        }
        searchTimeout.current = setTimeout(async () => {
            setSearchLoading(true)
            const data = await fetchGiphy(q)
            setSearchResults(data)
            setSearchLoading(false)
        }, 480)
    }, [])

    const handleSelect = useCallback((sticker: Sticker) => {
        setRecent(prev => [sticker, ...prev.filter(s => s.id !== sticker.id)].slice(0, 8))
        onSelect(sticker)
    }, [onSelect])

    const pack = STICKER_PACKS[activePack]
    const packKeys = Object.keys(STICKER_PACKS)

    return (
        <>
            <DieCutFilterDef />
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
                gap: 0,
                overflow: 'hidden',
            }}>
                {/* Tab bar */}
                <div style={{
                    display: 'flex',
                    gap: '4px',
                    padding: '0 0 10px',
                    flexShrink: 0,
                    borderBottom: '1px solid rgba(212,175,55,0.1)',
                }}>
                    {([['packs', '✦ Packs'], ['animated', '❋ Animated'], ['search', '◎ Search']] as [Tab, string][]).map(([id, label]) => (
                        <button key={id} onClick={() => setTab(id)} style={{
                            flex: 1, padding: '7px 4px', borderRadius: '10px', cursor: 'pointer',
                            fontFamily: 'var(--font-jost)', fontSize: '9px', letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                            background: tab === id ? 'rgba(212,175,55,0.15)' : 'transparent',
                            border: tab === id ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent',
                            color: tab === id ? 'rgba(212,175,55,0.95)' : 'rgba(212,175,55,0.35)',
                            transition: 'all 0.15s',
                        }}>{label}</button>
                    ))}
                </div>

                {/* Recent row */}
                <AnimatePresence>
                    {recent.length > 0 && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            style={{ overflow: 'hidden', paddingBottom: '8px', borderBottom: '1px solid rgba(212,175,55,0.07)', flexShrink: 0 }}>
                            <p style={{ fontFamily: 'var(--font-jost)', fontSize: '7px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(212,175,55,0.3)', marginBottom: '5px', marginTop: '6px' }}>Recent</p>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {recent.map(s => (
                                    <motion.button key={s.id} onClick={() => onSelect(s)} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.85 }}
                                        style={{ width: '34px', height: '34px', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {s.isLottie ? (
                                            <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>✦</div>
                                        ) : (
                                            <img src={s.thumbUrl || s.url} alt={s.label} width={28} height={28}
                                                style={{ filter: `url(#${DIE_CUT_FILTER_ID})`, transform: `rotate(${s.rotation || 0}deg)`, display: 'block', objectFit: 'contain' }} />
                                        )}
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* PACKS TAB */}
                {tab === 'packs' && (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', paddingTop: '8px' }}>
                        {/* Category pills */}
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px', flexShrink: 0 }}>
                            {packKeys.map(key => {
                                const p = STICKER_PACKS[key]
                                return (
                                    <button key={key} onClick={() => setActivePack(key)} style={{
                                        padding: '4px 10px', borderRadius: '12px', cursor: 'pointer',
                                        fontFamily: 'var(--font-jost)', fontSize: '9px', letterSpacing: '0.08em',
                                        textTransform: 'uppercase',
                                        background: activePack === key ? `${p.color}20` : 'transparent',
                                        border: activePack === key ? `1px solid ${p.color}45` : '1px solid rgba(212,175,55,0.12)',
                                        color: activePack === key ? p.color : 'rgba(212,175,55,0.35)',
                                        transition: 'all 0.15s',
                                    }}>
                                        {p.label}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Sticker grid */}
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                                {pack.stickers.map((sticker, i) => (
                                    <StickerTile
                                        key={sticker.id}
                                        url={sticker.url}
                                        label={sticker.label}
                                        rotation={sticker.rotation || 0}
                                        color={pack.color}
                                        index={i}
                                        onClick={() => handleSelect({
                                            id: sticker.id, label: sticker.label, category: sticker.category,
                                            url: sticker.url, thumbUrl: sticker.url, color: pack.color,
                                            rotation: sticker.rotation || 0, source: 'openmoji',
                                        })}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ANIMATED TAB */}
                {tab === 'animated' && (
                    <div style={{ flex: 1, overflowY: 'auto', paddingTop: '8px' }}>
                        {!lottiePlayerLoaded ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', color: 'rgba(212,175,55,0.4)', fontFamily: 'var(--font-jost)', fontSize: '11px' }}>
                                Loading animations...
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                {LOTTIE_STICKERS.map((item, i) => (
                                    <motion.button key={item.id}
                                        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.04 }}
                                        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.9 }}
                                        onMouseEnter={() => setHoveredLottie(item.id)}
                                        onMouseLeave={() => setHoveredLottie(null)}
                                        onClick={() => handleSelect({
                                            id: item.id, label: item.label, category: 'animated',
                                            url: item.url, thumbUrl: item.url, color: item.color,
                                            rotation: 0, source: 'lottie', isLottie: true, isAnimated: true,
                                        })}
                                        style={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                            gap: '4px', padding: '8px 4px', borderRadius: '12px',
                                            background: `${item.color}0c`, border: `1px solid ${item.color}22`,
                                            cursor: 'pointer', minHeight: '76px',
                                        }}>
                                        <div style={{ width: '54px', height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {hoveredLottie === item.id ? (
                                                // @ts-ignore
                                                <lottie-player src={item.url} autoplay loop style={{ width: '50px', height: '50px' }} background="transparent" />
                                            ) : (
                                                <div style={{
                                                    width: '48px', height: '48px', borderRadius: '10px',
                                                    background: `${item.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '24px', lineHeight: 1,
                                                }}>✦</div>
                                            )}
                                        </div>
                                        <span style={{ fontFamily: 'var(--font-jost)', fontSize: '7px', color: 'rgba(212,175,55,0.38)', textAlign: 'center', lineHeight: 1.2 }}>{item.label}</span>
                                    </motion.button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* SEARCH TAB */}
                {tab === 'search' && (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', paddingTop: '8px' }}>
                        <input
                            value={searchQuery}
                            onChange={e => handleSearch(e.target.value)}
                            placeholder="Search Giphy stickers…"
                            style={{
                                width: '100%', padding: '6px 10px', borderRadius: '8px', marginBottom: '8px',
                                background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.18)',
                                color: 'rgba(254,244,228,0.85)', fontFamily: 'var(--font-jost)', fontSize: '11px',
                                outline: 'none', boxSizing: 'border-box', flexShrink: 0,
                            }}
                        />
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {searchLoading ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80px', color: 'rgba(212,175,55,0.4)', fontFamily: 'var(--font-jost)', fontSize: '11px' }}>
                                    Searching...
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                                    {searchResults.map((g, i) => (
                                        <motion.button key={g.id}
                                            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: Math.min(i * 0.02, 0.3) }}
                                            whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.88 }}
                                            onClick={() => handleSelect({
                                                id: `giphy-${g.id}`, label: g.title || 'Sticker',
                                                category: 'search',
                                                url: g.images.fixed_width?.url || g.images.fixed_width_still?.url || '',
                                                thumbUrl: g.images.fixed_width_still?.url || '',
                                                color: '#c9897a', rotation: Math.floor(Math.random() * 7) - 3,
                                                source: 'giphy', isAnimated: true,
                                            })}
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                padding: '4px', borderRadius: '10px', minHeight: '68px',
                                                background: 'rgba(201,137,122,0.06)', border: '1px solid rgba(201,137,122,0.18)',
                                                cursor: 'pointer', overflow: 'hidden',
                                            }}>
                                            <img
                                                src={g.images.fixed_width_still?.url || ''}
                                                alt={g.title}
                                                style={{ maxWidth: '60px', maxHeight: '60px', objectFit: 'contain', display: 'block', borderRadius: '6px' }}
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
        </>
    )
}

function StickerTile({ url, label, rotation, color, index, onClick }: {
    url: string; label: string; rotation: number; color: string; index: number; onClick: () => void
}) {
    const [failed, setFailed] = useState(false)
    return (
        <motion.button
            onClick={onClick}
            initial={{ opacity: 0, scale: 0.75 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(index * 0.015, 0.3) }}
            whileHover={{ scale: 1.14, y: -3 }} whileTap={{ scale: 0.88 }}
            title={label}
            style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '3px', padding: '8px 4px', borderRadius: '12px', minHeight: '64px',
                background: `${color}0c`, border: `1px solid ${color}20`, cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${color}1e`; (e.currentTarget as HTMLElement).style.borderColor = `${color}44` }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${color}0c`; (e.currentTarget as HTMLElement).style.borderColor = `${color}20` }}
        >
            {failed ? (
                <span style={{ fontSize: '28px', lineHeight: 1 }}>✨</span>
            ) : (
                <img
                    src={url} alt={label} width={40} height={40} loading="lazy"
                    style={{
                        filter: `url(#${DIE_CUT_FILTER_ID})`,
                        transform: `rotate(${rotation}deg)`,
                        display: 'block', objectFit: 'contain',
                    }}
                    onError={() => setFailed(true)}
                />
            )}
            <span style={{
                fontFamily: 'var(--font-jost)', fontSize: '7px', color: 'rgba(212,175,55,0.38)',
                textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                width: '100%', paddingInline: '2px',
            }}>{label}</span>
        </motion.button>
    )
}