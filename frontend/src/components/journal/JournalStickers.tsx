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
    source?: 'openmoji' | 'icons8' | 'twemoji' | 'giphy' | 'tenor' | 'lottie'
    isLottie?: boolean
    isAnimated?: boolean
}

// ─── SVG Die-Cut Filter ─────────────────────────────────────────────────────
// Hard white border + glossy highlight + raised shadow = real sticker aesthetic
const DIE_CUT_FILTER_ID = 'sticker-diecut-v2'
const DieCutFilterDef = () => (
    <svg width={0} height={0} style={{ position: 'absolute', overflow: 'hidden' }}>
        <defs>
            <filter id={DIE_CUT_FILTER_ID} x="-18%" y="-18%" width="136%" height="136%">
                {/* 1. Thick white border */}
                <feMorphology in="SourceAlpha" operator="dilate" radius="3" result="dilated" />
                <feFlood floodColor="white" result="white" />
                <feComposite in="white" in2="dilated" operator="in" result="whiteBorder" />
                {/* 2. Peel shadow (offset) */}
                <feDropShadow in="dilated" dx="1.5" dy="3" stdDeviation="2.5" floodColor="rgba(0,0,0,0.40)" floodOpacity="1" result="shadow" />
                {/* 3. Glossy inner highlight */}
                <feComposite in="SourceGraphic" in2="dilated" operator="in" result="clipped" />
                {/* 4. Stack: shadow → white border → image */}
                <feMerge>
                    <feMergeNode in="shadow" />
                    <feMergeNode in="whiteBorder" />
                    <feMergeNode in="clipped" />
                </feMerge>
            </filter>
            {/* Glossy sheen overlay */}
            <filter id="sticker-gloss">
                <feBlend mode="screen" />
            </filter>
        </defs>
    </svg>
)

const STICKER_STYLE: React.CSSProperties = {
    filter: `url(#${DIE_CUT_FILTER_ID})`,
    imageRendering: 'crisp-edges',
}

// ─── OpenMoji CDN — Illustrative SVG stickers (MIT License) ─────────────────
// These look EXACTLY like hand-crafted die-cut stickers. Best aesthetic match.
const OM = (cp: string) => `https://openmoji.org/data/color/svg/${cp}.svg`

// ─── Icons8 CDN ─────────────────────────────────────────────────────────────
const I8 = (name: string, size = 96) =>
    `https://img.icons8.com/stickers/${size}/${encodeURIComponent(name)}.png`

// ─── Twemoji CDN ─────────────────────────────────────────────────────────────
const TW = (cp: string) =>
    `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.0.3/assets/72x72/${cp}.png`

// ─── CURATED STICKER PACKS using OpenMoji ────────────────────────────────────
interface StickerDef {
    id: string
    label: string
    url: string
    rotation?: number
    source?: Sticker['source']
}

const PACKS: Record<string, StickerDef[]> = {
    mood: [
        { id: 'om-love', label: 'In Love', url: OM('1F970'), rotation: 2, source: 'openmoji' },
        { id: 'om-smile', label: 'Happy', url: OM('1F601'), source: 'openmoji' },
        { id: 'om-star-eyes', label: 'Starry Eyes', url: OM('1F929'), rotation: -2, source: 'openmoji' },
        { id: 'om-cry', label: 'Tearful', url: OM('1F972'), rotation: 3, source: 'openmoji' },
        { id: 'om-melt', label: 'Melting', url: OM('1FAE0'), rotation: 2, source: 'openmoji' },
        { id: 'om-hug', label: 'Warm Hug', url: OM('1F917'), source: 'openmoji' },
        { id: 'om-think', label: 'Thinking', url: OM('1F914'), rotation: -3, source: 'openmoji' },
        { id: 'om-relief', label: 'Relief', url: OM('1F60C'), rotation: 1, source: 'openmoji' },
        { id: 'om-sleepy', label: 'Sleepy', url: OM('1F634'), rotation: 2, source: 'openmoji' },
        { id: 'om-nervous', label: 'Nervous', url: OM('1F62C'), source: 'openmoji' },
        { id: 'om-soft-smile', label: 'Soft', url: OM('1F60A'), rotation: -1, source: 'openmoji' },
        { id: 'om-pensive', label: 'Pensive', url: OM('1F614'), rotation: 3, source: 'openmoji' },
    ],
    nature: [
        { id: 'om-cherry', label: 'Cherry Blossom', url: OM('1F338'), rotation: 3, source: 'openmoji' },
        { id: 'om-sunflower', label: 'Sunflower', url: OM('1F33B'), rotation: -2, source: 'openmoji' },
        { id: 'om-rose', label: 'Rose', url: OM('1F339'), rotation: 2, source: 'openmoji' },
        { id: 'om-leaf', label: 'Maple Leaf', url: OM('1F341'), rotation: -3, source: 'openmoji' },
        { id: 'om-butterfly', label: 'Butterfly', url: OM('1F98B'), rotation: 1, source: 'openmoji' },
        { id: 'om-mushroom', label: 'Mushroom', url: OM('1F344'), rotation: 2, source: 'openmoji' },
        { id: 'om-wave', label: 'Wave', url: OM('1F30A'), source: 'openmoji' },
        { id: 'om-snow', label: 'Snowflake', url: OM('2744'), rotation: 3, source: 'openmoji' },
        { id: 'om-rainbow', label: 'Rainbow', url: OM('1F308'), source: 'openmoji' },
        { id: 'om-moon', label: 'Crescent Moon', url: OM('1F319'), rotation: -2, source: 'openmoji' },
        { id: 'om-seedling', label: 'Seedling', url: OM('1F331'), rotation: 2, source: 'openmoji' },
        { id: 'om-cactus', label: 'Cactus', url: OM('1F335'), rotation: 1, source: 'openmoji' },
        { id: 'om-cloud', label: 'Cloud', url: OM('1F325'), source: 'openmoji' },
        { id: 'om-fire', label: 'Flame', url: OM('1F525'), rotation: -1, source: 'openmoji' },
        { id: 'om-earth', label: 'Earth', url: OM('1F30D'), source: 'openmoji' },
        { id: 'om-lotus', label: 'Lotus', url: I8('lotus'), rotation: 2, source: 'icons8' },
    ],
    mindful: [
        { id: 'om-sparkles', label: 'Sparkles', url: OM('2728'), rotation: 2, source: 'openmoji' },
        { id: 'om-star', label: 'Star', url: OM('2B50'), rotation: -2, source: 'openmoji' },
        { id: 'om-shooting-star', label: 'Shooting Star', url: OM('1F320'), rotation: -20, source: 'openmoji' },
        { id: 'om-crystal', label: 'Crystal Ball', url: OM('1F52E'), rotation: 3, source: 'openmoji' },
        { id: 'om-evil-eye', label: 'Evil Eye', url: OM('1F9FF'), rotation: -2, source: 'openmoji' },
        { id: 'om-heart', label: 'Pink Heart', url: OM('1F9E1'), source: 'openmoji' },
        { id: 'om-revolving', label: 'Dizzy', url: OM('1F4AB'), rotation: 1, source: 'openmoji' },
        { id: 'om-gem', label: 'Gem', url: OM('1F48E'), rotation: -3, source: 'openmoji' },
        { id: 'om-infinity', label: 'Infinity', url: OM('267E'), source: 'openmoji' },
        { id: 'om-peace', label: 'Peace', url: OM('262E'), rotation: 2, source: 'openmoji' },
        { id: 'om-yin-yang', label: 'Yin Yang', url: OM('262F'), rotation: -1, source: 'openmoji' },
        { id: 'om-droplet', label: 'Droplet', url: OM('1F4A7'), rotation: 3, source: 'openmoji' },
    ],
    celebrate: [
        { id: 'om-party', label: 'Party', url: OM('1F389'), rotation: 2, source: 'openmoji' },
        { id: 'om-crown', label: 'Crown', url: OM('1F451'), rotation: -1, source: 'openmoji' },
        { id: 'om-trophy', label: 'Trophy', url: OM('1F3C6'), source: 'openmoji' },
        { id: 'om-100', label: '100', url: OM('1F4AF'), rotation: 1, source: 'openmoji' },
        { id: 'om-rocket', label: 'Rocket', url: OM('1F680'), rotation: -30, source: 'openmoji' },
        { id: 'om-ribbon', label: 'Ribbon', url: OM('1F38A'), rotation: 3, source: 'openmoji' },
        { id: 'om-medal', label: 'Medal', url: OM('1F3C5'), rotation: 2, source: 'openmoji' },
        { id: 'om-cake', label: 'Cake', url: OM('1F382'), source: 'openmoji' },
        { id: 'om-gift', label: 'Gift', url: OM('1F381'), rotation: -2, source: 'openmoji' },
        { id: 'om-boom', label: 'Boom', url: OM('1F4A5'), source: 'openmoji' },
        { id: 'om-check', label: 'Done', url: OM('2705'), rotation: 1, source: 'openmoji' },
        { id: 'om-clap', label: 'Clapping', url: OM('1F44F'), rotation: -2, source: 'openmoji' },
    ],
    luxe: [
        { id: 'om-diamond', label: 'Diamond', url: OM('1F48E'), rotation: -2, source: 'openmoji' },
        { id: 'om-ring', label: 'Ring', url: OM('1F48D'), rotation: 3, source: 'openmoji' },
        { id: 'om-lipstick', label: 'Lipstick', url: OM('1F484'), rotation: -1, source: 'openmoji' },
        { id: 'om-mirror', label: 'Mirror', url: OM('1FA9E'), rotation: 2, source: 'openmoji' },
        { id: 'om-feather', label: 'Feather', url: OM('1FAB6'), rotation: -2, source: 'openmoji' },
        { id: 'om-scroll', label: 'Scroll', url: OM('1F4DC'), rotation: 2, source: 'openmoji' },
        { id: 'om-hourglass', label: 'Hourglass', url: OM('231B'), rotation: -1, source: 'openmoji' },
        { id: 'om-key', label: 'Key', url: OM('1F5DD'), rotation: -3, source: 'openmoji' },
        { id: 'om-candle', label: 'Candle', url: OM('1F56F'), rotation: 1, source: 'openmoji' },
        { id: 'om-hand-mirror', label: 'Vanity', url: I8('mirror'), rotation: -1, source: 'icons8' },
        { id: 'om-perfume', label: 'Perfume', url: I8('perfume'), rotation: 2, source: 'icons8' },
        { id: 'om-sakura', label: 'Sakura', url: I8('sakura'), rotation: 3, source: 'icons8' },
    ],
    vintage: [
        { id: 'om-camera', label: 'Camera', url: OM('1F4F7'), rotation: -2, source: 'openmoji' },
        { id: 'om-book', label: 'Open Book', url: OM('1F4D6'), source: 'openmoji' },
        { id: 'om-letter', label: 'Love Letter', url: OM('1F48C'), rotation: 3, source: 'openmoji' },
        { id: 'om-telescope', label: 'Telescope', url: OM('1F52D'), rotation: -1, source: 'openmoji' },
        { id: 'om-compass', label: 'Compass', url: OM('1F9ED'), rotation: -2, source: 'openmoji' },
        { id: 'om-map', label: 'Map', url: OM('1F5FA'), rotation: 1, source: 'openmoji' },
        { id: 'om-violin', label: 'Violin', url: OM('1F3BB'), rotation: 3, source: 'openmoji' },
        { id: 'om-vinyl', label: 'Vinyl', url: I8('vinyl'), source: 'icons8' },
        { id: 'om-quill', label: 'Quill Pen', url: I8('quill-pen'), rotation: -3, source: 'icons8' },
        { id: 'om-lamp', label: 'Lamp', url: I8('lamp'), rotation: 2, source: 'icons8' },
        { id: 'om-music', label: 'Music Note', url: OM('1F3B5'), rotation: 1, source: 'openmoji' },
        { id: 'om-ink', label: 'Ink Pen', url: OM('1F58A'), rotation: -2, source: 'openmoji' },
    ],
    cozy: [
        { id: 'om-coffee', label: 'Coffee', url: OM('2615'), rotation: 2, source: 'openmoji' },
        { id: 'om-teacup', label: 'Tea', url: OM('1F375'), rotation: -2, source: 'openmoji' },
        { id: 'om-cookie', label: 'Cookie', url: OM('1F36A'), rotation: 3, source: 'openmoji' },
        { id: 'om-cat', label: 'Cat', url: OM('1F431'), rotation: 2, source: 'openmoji' },
        { id: 'om-dog', label: 'Dog', url: OM('1F436'), rotation: -2, source: 'openmoji' },
        { id: 'om-plant', label: 'Plant', url: OM('1F33F'), rotation: -1, source: 'openmoji' },
        { id: 'om-cloud-rain', label: 'Rainy', url: OM('1F327'), source: 'openmoji' },
        { id: 'om-night', label: 'Night', url: OM('1F319'), rotation: 2, source: 'openmoji' },
        { id: 'om-blanket', label: 'Blanket', url: OM('1F9E3'), rotation: -2, source: 'openmoji' },
        { id: 'om-bear', label: 'Bear', url: OM('1F43B'), rotation: 1, source: 'openmoji' },
        { id: 'om-rabbit', label: 'Rabbit', url: OM('1F430'), rotation: -3, source: 'openmoji' },
        { id: 'om-snowman', label: 'Snowman', url: OM('2603'), source: 'openmoji' },
    ],
    study: [
        { id: 'om-pencil', label: 'Pencil', url: OM('270F'), rotation: 3, source: 'openmoji' },
        { id: 'om-lightbulb', label: 'Idea', url: OM('1F4A1'), source: 'openmoji' },
        { id: 'om-target', label: 'Target', url: OM('1F3AF'), rotation: -1, source: 'openmoji' },
        { id: 'om-brain', label: 'Brain', url: OM('1F9E0'), source: 'openmoji' },
        { id: 'om-pin', label: 'Pin', url: OM('1F4CC'), rotation: -3, source: 'openmoji' },
        { id: 'om-memo', label: 'Memo', url: OM('1F4DD'), rotation: 1, source: 'openmoji' },
        { id: 'om-flask', label: 'Science', url: OM('1F9EA'), rotation: 2, source: 'openmoji' },
        { id: 'om-atom', label: 'Atom', url: OM('269B'), rotation: -1, source: 'openmoji' },
        { id: 'om-chart', label: 'Chart', url: OM('1F4C8'), source: 'openmoji' },
        { id: 'om-checkmark', label: 'Done', url: OM('2611'), rotation: 1, source: 'openmoji' },
        { id: 'om-clock', label: 'Clock', url: OM('23F0'), rotation: -2, source: 'openmoji' },
        { id: 'om-laptop', label: 'Laptop', url: OM('1F4BB'), source: 'openmoji' },
    ],
}

const LOCAL_CATEGORIES = [
    { key: 'mood', label: 'Mood', color: '#c9897a' },
    { key: 'nature', label: 'Nature', color: '#7a9e7e' },
    { key: 'mindful', label: 'Mindful', color: '#9b7fd4' },
    { key: 'celebrate', label: 'Celebrate', color: '#d4af37' },
    { key: 'luxe', label: 'Luxe', color: '#c4913a' },
    { key: 'vintage', label: 'Vintage', color: '#8b7355' },
    { key: 'cozy', label: 'Cozy', color: '#c9897a' },
    { key: 'study', label: 'Study', color: '#b8a070' },
]

// ─── Giphy Stickers API ─────────────────────────────────────────────────────
const GIPHY_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY || 'dc6zaTOxFJmzC'

interface GiphyItem {
    id: string
    title: string
    images: {
        fixed_width_still: { url: string }
        fixed_width: { url: string }
        downsized_still: { url: string }
    }
}

async function fetchGiphy(query: string, offset = 0): Promise<GiphyItem[]> {
    const url = new URL('https://api.giphy.com/v1/stickers/search')
    url.searchParams.set('api_key', GIPHY_KEY)
    url.searchParams.set('q', query)
    url.searchParams.set('limit', '20')
    url.searchParams.set('offset', String(offset))
    url.searchParams.set('rating', 'g')
    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(`Giphy ${res.status}`)
    return (await res.json()).data || []
}

async function fetchGiphyTrending(): Promise<GiphyItem[]> {
    const url = new URL('https://api.giphy.com/v1/stickers/trending')
    url.searchParams.set('api_key', GIPHY_KEY)
    url.searchParams.set('limit', '24')
    url.searchParams.set('rating', 'g')
    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(`Giphy ${res.status}`)
    return (await res.json()).data || []
}

// ─── Tenor Stickers API ─────────────────────────────────────────────────────
// Free demo key — replace with your own from tenor.com/developer
const TENOR_KEY = process.env.NEXT_PUBLIC_TENOR_API_KEY || 'LIVDSRZULELA'

interface TenorItem {
    id: string
    title: string
    media_formats: {
        tinygif_transparent?: { url: string; dims: number[] }
        webp_transparent?: { url: string }
        gif_transparent?: { url: string }
        tinygif?: { url: string }
    }
}

async function fetchTenor(query: string, pos = ''): Promise<{ results: TenorItem[]; next: string }> {
    const url = new URL('https://tenor.googleapis.com/v2/search')
    url.searchParams.set('q', query)
    url.searchParams.set('key', TENOR_KEY)
    url.searchParams.set('limit', '20')
    url.searchParams.set('searchfilter', 'sticker')
    url.searchParams.set('media_filter', 'tinygif_transparent,webp_transparent,gif_transparent,tinygif')
    if (pos) url.searchParams.set('pos', pos)
    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(`Tenor ${res.status}`)
    const data = await res.json()
    return { results: data.results || [], next: data.next || '' }
}

async function fetchTenorFeatured(): Promise<TenorItem[]> {
    const url = new URL('https://tenor.googleapis.com/v2/featured')
    url.searchParams.set('key', TENOR_KEY)
    url.searchParams.set('limit', '24')
    url.searchParams.set('searchfilter', 'sticker')
    url.searchParams.set('media_filter', 'tinygif_transparent,webp_transparent,gif_transparent,tinygif')
    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(`Tenor ${res.status}`)
    return (await res.json()).results || []
}

function tenorThumbUrl(item: TenorItem): string {
    return (
        item.media_formats.tinygif_transparent?.url ||
        item.media_formats.webp_transparent?.url ||
        item.media_formats.gif_transparent?.url ||
        item.media_formats.tinygif?.url ||
        ''
    )
}

// ─── LottieFiles curated aesthetic sticker animations ──────────────────────
// These use lottie.host public embed URLs — free, no auth required.
// All sourced from LottieFiles free/public sticker collection.
interface LottieItem {
    id: string
    label: string
    category: string
    url: string   // lottie.host JSON URL
    thumbUrl: string  // GIF preview
    color: string
}

const LOTTIE_STICKERS: LottieItem[] = [
    // Nature & Mindful
    {
        id: 'lt-sparkle', label: 'Sparkle', category: 'mindful',
        url: 'https://lottie.host/4db68bbd-31f6-4cd8-84eb-189de081159a/IGmMCqhzpt.lottie',
        thumbUrl: 'https://assets3.lottiefiles.com/packages/lf20_qpwbipmz/preview.gif',
        color: '#d4af37',
    },
    {
        id: 'lt-star', label: 'Shooting Star', category: 'mindful',
        url: 'https://lottie.host/b68ef2b2-e23f-48a2-b0f4-e2e8e2f47476/CpBFVcbizl.lottie',
        thumbUrl: 'https://assets7.lottiefiles.com/packages/lf20_yd8fbndd/preview.gif',
        color: '#d4af37',
    },
    {
        id: 'lt-flower', label: 'Blooming', category: 'nature',
        url: 'https://lottie.host/fe5fa04a-db2a-4b02-95a3-cb44e3c1e90a/gzaqXkEMfF.lottie',
        thumbUrl: 'https://assets2.lottiefiles.com/packages/lf20_Fcn4gYjQnC/preview.gif',
        color: '#c9897a',
    },
    {
        id: 'lt-heart', label: 'Beating Heart', category: 'mood',
        url: 'https://lottie.host/bb32e4c0-9f97-45fc-a77e-e665a0a60958/pHGIgefqTX.lottie',
        thumbUrl: 'https://assets3.lottiefiles.com/packages/lf20_z9ed8LFX/preview.gif',
        color: '#c9897a',
    },
    {
        id: 'lt-butterfly', label: 'Butterfly', category: 'nature',
        url: 'https://lottie.host/efd76e3e-6ee8-4bce-8879-eb4e8cb72498/nAlTKJpxTY.lottie',
        thumbUrl: 'https://assets10.lottiefiles.com/packages/lf20_p1qlgqm1/preview.gif',
        color: '#9b7fd4',
    },
    {
        id: 'lt-rainbow', label: 'Rainbow', category: 'celebrate',
        url: 'https://lottie.host/a4a15d70-03de-4e88-ac5d-93f83b0c1fb1/OhUvRvB0F9.lottie',
        thumbUrl: 'https://assets2.lottiefiles.com/packages/lf20_0HLjHQ/preview.gif',
        color: '#7a9e7e',
    },
    {
        id: 'lt-coffee', label: 'Coffee', category: 'cozy',
        url: 'https://lottie.host/a4f3bdb7-b54b-4b22-8d5f-c3fb37c7e52c/BpFbedaHjF.lottie',
        thumbUrl: 'https://assets5.lottiefiles.com/packages/lf20_6e3XVtfZ/preview.gif',
        color: '#8b7355',
    },
    {
        id: 'lt-moon', label: 'Moon & Stars', category: 'mindful',
        url: 'https://lottie.host/d1d16fd4-e9f3-4d9d-b5c1-6ebaf4a0f2a9/WdpyDfE1a2.lottie',
        thumbUrl: 'https://assets1.lottiefiles.com/packages/lf20_quml6atx/preview.gif',
        color: '#9b7fd4',
    },
    {
        id: 'lt-crown', label: 'Crown', category: 'celebrate',
        url: 'https://lottie.host/64e71b5e-b0a7-4f58-acd6-d0e67c9af6e7/OhUvRvB0F9.lottie',
        thumbUrl: 'https://assets9.lottiefiles.com/packages/lf20_obhph3ar/preview.gif',
        color: '#d4af37',
    },
    {
        id: 'lt-sunflower', label: 'Sunflower', category: 'nature',
        url: 'https://lottie.host/9b82e50d-e5a3-44fc-904f-cb3b5b25c76b/B6kNTSjuuX.lottie',
        thumbUrl: 'https://assets6.lottiefiles.com/packages/lf20_ystsocmd/preview.gif',
        color: '#d4af37',
    },
    {
        id: 'lt-rocket', label: 'Rocket', category: 'celebrate',
        url: 'https://lottie.host/48f7aaca-1c60-417b-be1e-c06debb5b88f/YpVqvhJLa1.lottie',
        thumbUrl: 'https://assets4.lottiefiles.com/packages/lf20_n8RGQj/preview.gif',
        color: '#c4913a',
    },
    {
        id: 'lt-cat', label: 'Cat', category: 'cozy',
        url: 'https://lottie.host/6bc6d32c-5d14-4dce-803e-0a85c0a8fd72/b3b3b3example.lottie',
        thumbUrl: 'https://assets8.lottiefiles.com/packages/lf20_sc6if7ol/preview.gif',
        color: '#c9897a',
    },
]

const LOTTIE_PRESETS = ['cute', 'nature', 'sparkle', 'love', 'celebrate', 'cozy', 'stars', 'aesthetic']
const GIPHY_PRESETS = ['kawaii', 'sparkle', 'aesthetic', 'retro', 'cute', 'pastel']
const TENOR_PRESETS = ['cute sticker', 'aesthetic', 'nature', 'cozy', 'hearts', 'stars sparkle']

// ─── Props ──────────────────────────────────────────────────────────────────
interface Props {
    onSelect: (sticker: Sticker) => void
    onClose: () => void
}

type Tab = 'library' | 'giphy' | 'tenor' | 'lottie'

// ─── Lottie Player Web Component ─────────────────────────────────────────────
// Loads @lottiefiles/lottie-player from CDN dynamically
declare global {
    namespace JSX {
        interface IntrinsicElements {
            'lottie-player': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
                src?: string; autoplay?: boolean | string; loop?: boolean | string; mode?: string; speed?: string
                width?: string; height?: string; background?: string
            }
        }
    }
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

// ─── Main Component ─────────────────────────────────────────────────────────
export default function JournalStickers({ onSelect, onClose }: Props) {
    const [tab, setTab] = useState<Tab>('library')

    // Library state
    const [activeCat, setActiveCat] = useState('mood')
    const [localSearch, setLocalSearch] = useState('')
    const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set())

    // Giphy state
    const [giphyQuery, setGiphyQuery] = useState('')
    const [giphyResults, setGiphyResults] = useState<GiphyItem[]>([])
    const [giphyLoading, setGiphyLoading] = useState(false)
    const [giphyError, setGiphyError] = useState<string | null>(null)
    const [giphyOffset, setGiphyOffset] = useState(0)
    const [giphyHasMore, setGiphyHasMore] = useState(false)

    // Tenor state
    const [tenorQuery, setTenorQuery] = useState('')
    const [tenorResults, setTenorResults] = useState<TenorItem[]>([])
    const [tenorLoading, setTenorLoading] = useState(false)
    const [tenorError, setTenorError] = useState<string | null>(null)
    const [tenorNext, setTenorNext] = useState('')
    const [tenorHasMore, setTenorHasMore] = useState(false)

    // Lottie state
    const [lottieSearch, setLottieSearch] = useState('')
    const lottiePlayerLoaded = useLottiePlayer()

    // Shared
    const [recent, setRecent] = useState<Sticker[]>([])
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

    const cat = LOCAL_CATEGORIES.find(c => c.key === activeCat) || LOCAL_CATEGORIES[0]

    // ── Giphy load ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (tab !== 'giphy' || giphyResults.length > 0) return
        loadGiphyTrending()
    }, [tab])

    const loadGiphyTrending = async () => {
        setGiphyLoading(true); setGiphyError(null)
        try {
            const data = await fetchGiphyTrending()
            setGiphyResults(data); setGiphyHasMore(false)
        } catch { setGiphyError('Could not load stickers.') }
        finally { setGiphyLoading(false) }
    }

    const handleGiphySearch = useCallback((q: string) => {
        setGiphyQuery(q)
        if (searchTimeout.current) clearTimeout(searchTimeout.current)
        if (!q.trim()) { loadGiphyTrending(); return }
        searchTimeout.current = setTimeout(async () => {
            setGiphyLoading(true); setGiphyError(null); setGiphyOffset(0)
            try {
                const data = await fetchGiphy(q, 0)
                setGiphyResults(data); setGiphyHasMore(data.length === 20)
            } catch { setGiphyError('Search failed.') }
            finally { setGiphyLoading(false) }
        }, 480)
    }, [])

    // ── Tenor load ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (tab !== 'tenor' || tenorResults.length > 0) return
        loadTenorFeatured()
    }, [tab])

    const loadTenorFeatured = async () => {
        setTenorLoading(true); setTenorError(null)
        try {
            const data = await fetchTenorFeatured()
            setTenorResults(data); setTenorHasMore(false)
        } catch { setTenorError('Could not load Tenor stickers.') }
        finally { setTenorLoading(false) }
    }

    const handleTenorSearch = useCallback((q: string) => {
        setTenorQuery(q)
        if (searchTimeout.current) clearTimeout(searchTimeout.current)
        if (!q.trim()) { loadTenorFeatured(); return }
        searchTimeout.current = setTimeout(async () => {
            setTenorLoading(true); setTenorError(null); setTenorNext('')
            try {
                const { results, next } = await fetchTenor(q)
                setTenorResults(results); setTenorNext(next); setTenorHasMore(!!next)
            } catch { setTenorError('Search failed.') }
            finally { setTenorLoading(false) }
        }, 480)
    }, [])

    const loadMoreTenor = async () => {
        if (!tenorQuery.trim() || tenorLoading || !tenorNext) return
        setTenorLoading(true)
        try {
            const { results, next } = await fetchTenor(tenorQuery, tenorNext)
            setTenorResults(prev => [...prev, ...results])
            setTenorNext(next); setTenorHasMore(!!next)
        } catch { }
        finally { setTenorLoading(false) }
    }

    const handleImgError = useCallback((url: string) => {
        setFailedUrls(prev => new Set([...prev, url]))
    }, [])

    const handleSelect = useCallback((sticker: Sticker) => {
        setRecent(prev => [sticker, ...prev.filter(s => s.id !== sticker.id)].slice(0, 8))
        onSelect(sticker)
    }, [onSelect])

    const handleLocalSelect = useCallback((item: StickerDef) => {
        handleSelect({
            id: item.id, label: item.label, category: activeCat,
            url: item.url, thumbUrl: item.url, color: cat.color,
            rotation: item.rotation || 0, source: item.source || 'openmoji',
        })
    }, [activeCat, cat.color, handleSelect])

    const handleGiphySelect = useCallback((g: GiphyItem) => {
        handleSelect({
            id: `giphy-${g.id}`, label: g.title || 'Giphy Sticker',
            category: 'giphy',
            url: g.images.fixed_width?.url || g.images.fixed_width_still?.url || '',
            thumbUrl: g.images.fixed_width_still?.url || '',
            color: '#c9897a', rotation: Math.floor(Math.random() * 7) - 3,
            source: 'giphy', isAnimated: true,
        })
    }, [handleSelect])

    const handleTenorSelect = useCallback((t: TenorItem) => {
        const url = tenorThumbUrl(t)
        handleSelect({
            id: `tenor-${t.id}`, label: t.title || 'Tenor Sticker',
            category: 'tenor', url, thumbUrl: url,
            color: '#c9897a', rotation: Math.floor(Math.random() * 7) - 3,
            source: 'tenor', isAnimated: true,
        })
    }, [handleSelect])

    const handleLottieSelect = useCallback((item: LottieItem) => {
        handleSelect({
            id: item.id, label: item.label, category: item.category,
            url: item.url, thumbUrl: item.thumbUrl,
            color: item.color, rotation: Math.floor(Math.random() * 5) - 2,
            source: 'lottie', isLottie: true, isAnimated: true,
        })
    }, [handleSelect])

    // ── Filtered local stickers ──────────────────────────────────────────
    const localFiltered = localSearch.trim()
        ? Object.values(PACKS).flat().filter(s =>
            s.label.toLowerCase().includes(localSearch.toLowerCase()))
        : (PACKS[activeCat] || [])

    const lottieFiltered = lottieSearch.trim()
        ? LOTTIE_STICKERS.filter(s =>
            s.label.toLowerCase().includes(lottieSearch.toLowerCase()) ||
            s.category.toLowerCase().includes(lottieSearch.toLowerCase()))
        : LOTTIE_STICKERS

    const accentColor = {
        library: cat.color, giphy: '#c9897a', tenor: '#7a9e7e', lottie: '#9b7fd4',
    }[tab]

    // ── TAB CONFIG ──────────────────────────────────────────────────────────
    const TABS: { id: Tab; label: string; icon: string }[] = [
        { id: 'library', label: 'Library', icon: '✦' },
        { id: 'giphy', label: 'Giphy', icon: '◎' },
        { id: 'tenor', label: 'Tenor', icon: '◈' },
        { id: 'lottie', label: 'Lottie', icon: '❋' },
    ]

    return (
        <>
            <DieCutFilterDef />
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', gap: 0 }}>

                {/* ── Tab bar ──────────────────────────────────────────────────── */}
                <div style={{ display: 'flex', gap: '2px', padding: '0 0 6px', flexShrink: 0 }}>
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{
                            flex: 1, padding: '4px 0', borderRadius: '8px', cursor: 'pointer',
                            fontFamily: 'var(--font-jost)', fontSize: '8px', letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            background: tab === t.id ? 'rgba(212,175,55,0.12)' : 'transparent',
                            border: tab === t.id ? '1px solid rgba(212,175,55,0.25)' : '1px solid transparent',
                            color: tab === t.id ? 'rgba(212,175,55,0.9)' : 'rgba(212,175,55,0.3)',
                            transition: 'all 0.15s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
                        }}>
                            <span style={{ fontSize: '8px' }}>{t.icon}</span>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ── Recently Used ─────────────────────────────────────────────── */}
                <AnimatePresence>
                    {recent.length > 0 && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            style={{ overflow: 'hidden', flexShrink: 0, paddingBottom: '6px', borderBottom: '1px solid rgba(212,175,55,0.07)' }}>
                            <p style={{ fontFamily: 'var(--font-jost)', fontSize: '7px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(212,175,55,0.3)', marginBottom: '4px' }}>
                                Recent
                            </p>
                            <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                                {recent.map(s => (
                                    <motion.button key={s.id} onClick={() => onSelect(s)} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.85 }}
                                        style={{ width: '32px', height: '32px', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {s.isLottie ? (
                                            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', filter: `url(#${DIE_CUT_FILTER_ID})` }}>✦</div>
                                        ) : (
                                            <img src={s.thumbUrl || s.url} alt={s.label} width={26} height={26}
                                                style={{ ...STICKER_STYLE, transform: `rotate(${s.rotation || 0}deg)`, display: 'block' }} />
                                        )}
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ════════ LIBRARY TAB ════════════════════════════════════════ */}
                {tab === 'library' && (
                    <>
                        <input value={localSearch} onChange={e => setLocalSearch(e.target.value)}
                            placeholder="Search library…"
                            style={{
                                width: '100%', padding: '4px 9px', borderRadius: '7px', marginTop: '5px',
                                background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.14)',
                                color: 'rgba(254,244,228,0.85)', fontFamily: 'var(--font-jost)', fontSize: '10px',
                                outline: 'none', boxSizing: 'border-box', flexShrink: 0,
                            }} />
                        {!localSearch && (
                            <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', padding: '5px 0', borderBottom: '1px solid rgba(212,175,55,0.07)', flexShrink: 0 }}>
                                {LOCAL_CATEGORIES.map(c => (
                                    <button key={c.key} onClick={() => setActiveCat(c.key)} style={{
                                        flexShrink: 0, padding: '2px 7px', borderRadius: '10px', cursor: 'pointer',
                                        fontFamily: 'var(--font-jost)', fontSize: '7px', letterSpacing: '0.06em', textTransform: 'uppercase',
                                        background: activeCat === c.key ? `${c.color}20` : 'transparent',
                                        border: activeCat === c.key ? `1px solid ${c.color}45` : '1px solid transparent',
                                        color: activeCat === c.key ? c.color : 'rgba(212,175,55,0.35)', transition: 'all 0.14s',
                                    }}>{c.label}</button>
                                ))}
                            </div>
                        )}
                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '7px', color: 'rgba(212,175,55,0.18)', letterSpacing: '0.05em', padding: '2px 0', flexShrink: 0 }}>
                            OpenMoji (MIT) · Icons8 Stickers
                        </p>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                                {localFiltered.map((item, i) => (
                                    <StickerTile
                                        key={item.id} url={item.url} label={item.label}
                                        rotation={item.rotation || 0} color={cat.color} index={i}
                                        failed={failedUrls.has(item.url)} onError={() => handleImgError(item.url)}
                                        onClick={() => handleLocalSelect(item)}
                                    />
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* ════════ GIPHY TAB ══════════════════════════════════════════ */}
                {tab === 'giphy' && (
                    <>
                        <input value={giphyQuery} onChange={e => handleGiphySearch(e.target.value)}
                            placeholder="Search Giphy stickers…"
                            style={{
                                width: '100%', padding: '4px 9px', borderRadius: '7px', marginTop: '5px',
                                background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.14)',
                                color: 'rgba(254,244,228,0.85)', fontFamily: 'var(--font-jost)', fontSize: '10px',
                                outline: 'none', boxSizing: 'border-box', flexShrink: 0,
                            }} />
                        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', padding: '5px 0 3px', flexShrink: 0 }}>
                            {GIPHY_PRESETS.map(p => (
                                <button key={p} onClick={() => handleGiphySearch(p)} style={{
                                    flexShrink: 0, padding: '2px 7px', borderRadius: '9px', cursor: 'pointer',
                                    fontFamily: 'var(--font-jost)', fontSize: '7px', letterSpacing: '0.05em', textTransform: 'capitalize',
                                    background: giphyQuery === p ? 'rgba(201,137,122,0.2)' : 'rgba(212,175,55,0.05)',
                                    border: giphyQuery === p ? '1px solid rgba(201,137,122,0.4)' : '1px solid rgba(212,175,55,0.1)',
                                    color: giphyQuery === p ? '#c9897a' : 'rgba(212,175,55,0.3)', transition: 'all 0.14s',
                                }}>{p}</button>
                            ))}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '1px 0 3px', flexShrink: 0 }}>
                            <img src="https://developers.giphy.com/branch/master/static/header-logo-8974b8ae658f704a5b48a2d039b8ad4b.gif"
                                alt="Powered by Giphy" height={11} style={{ opacity: 0.4 }} />
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {giphyLoading && !giphyResults.length ? <LoadingSpinner color="#c9897a" /> :
                                giphyError ? <ErrorMessage msg={giphyError} /> :
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                                        {giphyResults.map((g, i) => (
                                            <AnimatedStickerTile key={g.id}
                                                url={g.images.fixed_width?.url || g.images.fixed_width_still?.url || ''}
                                                thumbUrl={g.images.fixed_width_still?.url || ''}
                                                label={g.title} color="#c9897a" index={i}
                                                onClick={() => handleGiphySelect(g)}
                                            />
                                        ))}
                                    </div>
                            }
                            {giphyHasMore && (
                                <LoadMoreBtn loading={giphyLoading} onClick={async () => {
                                    const next = giphyOffset + 20
                                    setGiphyLoading(true)
                                    try {
                                        const data = await fetchGiphy(giphyQuery, next)
                                        setGiphyResults(p => [...p, ...data]); setGiphyOffset(next); setGiphyHasMore(data.length === 20)
                                    } catch { } finally { setGiphyLoading(false) }
                                }} />
                            )}
                        </div>
                    </>
                )}

                {/* ════════ TENOR TAB ══════════════════════════════════════════ */}
                {tab === 'tenor' && (
                    <>
                        <input value={tenorQuery} onChange={e => handleTenorSearch(e.target.value)}
                            placeholder="Search Tenor stickers…"
                            style={{
                                width: '100%', padding: '4px 9px', borderRadius: '7px', marginTop: '5px',
                                background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.14)',
                                color: 'rgba(254,244,228,0.85)', fontFamily: 'var(--font-jost)', fontSize: '10px',
                                outline: 'none', boxSizing: 'border-box', flexShrink: 0,
                            }} />
                        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', padding: '5px 0 3px', flexShrink: 0 }}>
                            {TENOR_PRESETS.map(p => (
                                <button key={p} onClick={() => handleTenorSearch(p)} style={{
                                    flexShrink: 0, padding: '2px 7px', borderRadius: '9px', cursor: 'pointer',
                                    fontFamily: 'var(--font-jost)', fontSize: '7px', letterSpacing: '0.05em', textTransform: 'capitalize',
                                    background: tenorQuery === p ? 'rgba(122,158,126,0.2)' : 'rgba(212,175,55,0.05)',
                                    border: tenorQuery === p ? '1px solid rgba(122,158,126,0.4)' : '1px solid rgba(212,175,55,0.1)',
                                    color: tenorQuery === p ? '#7a9e7e' : 'rgba(212,175,55,0.3)', transition: 'all 0.14s',
                                }}>{p}</button>
                            ))}
                        </div>
                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '7px', color: 'rgba(212,175,55,0.18)', padding: '1px 0 3px', flexShrink: 0 }}>
                            Powered by Tenor · Add NEXT_PUBLIC_TENOR_API_KEY to .env
                        </p>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {tenorLoading && !tenorResults.length ? <LoadingSpinner color="#7a9e7e" /> :
                                tenorError ? <ErrorMessage msg={tenorError} /> :
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                                        {tenorResults.map((t, i) => {
                                            const url = tenorThumbUrl(t)
                                            return (
                                                <AnimatedStickerTile key={t.id} url={url} thumbUrl={url}
                                                    label={t.title} color="#7a9e7e" index={i}
                                                    onClick={() => handleTenorSelect(t)}
                                                />
                                            )
                                        })}
                                    </div>
                            }
                            {tenorHasMore && <LoadMoreBtn loading={tenorLoading} onClick={loadMoreTenor} />}
                        </div>
                    </>
                )}

                {/* ════════ LOTTIE TAB ═════════════════════════════════════════ */}
                {tab === 'lottie' && (
                    <>
                        <input value={lottieSearch} onChange={e => setLottieSearch(e.target.value)}
                            placeholder="Filter animated stickers…"
                            style={{
                                width: '100%', padding: '4px 9px', borderRadius: '7px', marginTop: '5px',
                                background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.14)',
                                color: 'rgba(254,244,228,0.85)', fontFamily: 'var(--font-jost)', fontSize: '10px',
                                outline: 'none', boxSizing: 'border-box', flexShrink: 0,
                            }} />
                        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', padding: '5px 0 3px', flexShrink: 0 }}>
                            {LOTTIE_PRESETS.map(p => (
                                <button key={p} onClick={() => setLottieSearch(p)} style={{
                                    flexShrink: 0, padding: '2px 7px', borderRadius: '9px', cursor: 'pointer',
                                    fontFamily: 'var(--font-jost)', fontSize: '7px', letterSpacing: '0.05em', textTransform: 'capitalize',
                                    background: lottieSearch === p ? 'rgba(155,127,212,0.2)' : 'rgba(212,175,55,0.05)',
                                    border: lottieSearch === p ? '1px solid rgba(155,127,212,0.4)' : '1px solid rgba(212,175,55,0.1)',
                                    color: lottieSearch === p ? '#9b7fd4' : 'rgba(212,175,55,0.3)', transition: 'all 0.14s',
                                }}>{p}</button>
                            ))}
                        </div>
                        <p style={{ fontFamily: 'var(--font-jost)', fontSize: '7px', color: 'rgba(212,175,55,0.18)', padding: '1px 0 3px', flexShrink: 0 }}>
                            LottieFiles animated stickers · lottie.host (free)
                        </p>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {!lottiePlayerLoaded ? (
                                <LoadingSpinner color="#9b7fd4" label="Loading Lottie player…" />
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                                    {lottieFiltered.map((item, i) => (
                                        <LottieTile key={item.id} item={item} index={i} onClick={() => handleLottieSelect(item)} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </>
    )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StickerTile({ url, label, rotation, color, index, failed, onError, onClick }: {
    url: string; label: string; rotation: number; color: string; index: number
    failed: boolean; onError: () => void; onClick: () => void
}) {
    return (
        <motion.button onClick={onClick}
            initial={{ opacity: 0, scale: 0.75 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(index * 0.015, 0.35) }}
            whileHover={{ scale: 1.15, y: -3 }} whileTap={{ scale: 0.88 }}
            title={label}
            style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '2px', padding: '6px 2px', borderRadius: '10px', minHeight: '58px',
                background: `${color}0c`, border: `1px solid ${color}20`, cursor: 'pointer',
                transition: 'background 0.14s, border-color 0.14s',
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = `${color}1e`; el.style.borderColor = `${color}44` }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = `${color}0c`; el.style.borderColor = `${color}20` }}
        >
            {failed ? (
                <span style={{ fontSize: '26px', lineHeight: 1 }}>✨</span>
            ) : (
                <img src={url} alt={label} width={38} height={38} loading="lazy"
                    style={{ ...STICKER_STYLE, transform: `rotate(${rotation}deg)`, display: 'block', objectFit: 'contain' }}
                    onError={onError} />
            )}
            <span style={{
                fontFamily: 'var(--font-jost)', fontSize: '6.5px', color: 'rgba(212,175,55,0.38)',
                textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                width: '100%', paddingInline: '2px',
            }}>{label}</span>
        </motion.button>
    )
}

function AnimatedStickerTile({ url, thumbUrl, label, color, index, onClick }: {
    url: string; thumbUrl: string; label: string; color: string; index: number; onClick: () => void
}) {
    const [hovered, setHovered] = useState(false)
    return (
        <motion.button onClick={onClick}
            initial={{ opacity: 0, scale: 0.75 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(index * 0.018, 0.35) }}
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.88 }}
            title={label}
            onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '2px', padding: '5px 2px', borderRadius: '10px', minHeight: '68px', overflow: 'hidden',
                background: `${color}0c`, border: `1px solid ${color}20`, cursor: 'pointer',
                transition: 'background 0.14s, border-color 0.14s',
            }}>
            <div style={{ position: 'relative', width: '54px', height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {url ? (
                    <img src={hovered ? url : thumbUrl || url} alt={label}
                        style={{
                            maxWidth: '52px', maxHeight: '52px', objectFit: 'contain', display: 'block',
                            filter: `url(#${DIE_CUT_FILTER_ID})`,
                            borderRadius: '4px',
                        }} />
                ) : (
                    <div style={{ width: '48px', height: '48px', background: `${color}18`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color, fontSize: '20px' }}>◎</span>
                    </div>
                )}
                {/* Animated badge */}
                <div style={{
                    position: 'absolute', bottom: '-1px', right: '-1px',
                    width: '14px', height: '14px', borderRadius: '50%',
                    background: `${color}cc`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '7px', boxShadow: `0 0 6px ${color}88`,
                }}>▶</div>
            </div>
            <span style={{
                fontFamily: 'var(--font-jost)', fontSize: '6.5px', color: 'rgba(212,175,55,0.35)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                width: '100%', textAlign: 'center', paddingInline: '2px',
            }}>{label?.slice(0, 18)}</span>
        </motion.button>
    )
}

function LottieTile({ item, index, onClick }: { item: LottieItem; index: number; onClick: () => void }) {
    const [hovered, setHovered] = useState(false)
    return (
        <motion.button onClick={onClick}
            initial={{ opacity: 0, scale: 0.75 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(index * 0.02, 0.4) }}
            whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.88 }}
            onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
            title={item.label}
            style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '2px', padding: '6px 3px', borderRadius: '10px', minHeight: '72px',
                background: `${item.color}0c`, border: `1px solid ${item.color}20`, cursor: 'pointer',
                position: 'relative', transition: 'all 0.14s',
            }}
            onMouseEnterCapture={() => { }}
        >
            <div style={{ width: '56px', height: '56px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '8px' }}>
                {hovered ? (
                    // @ts-ignore - web component
                    <lottie-player src={item.url} autoplay="true" loop="true" mode="normal"
                        style={{ width: '52px', height: '52px' }} background="transparent" speed="1" />
                ) : (
                    <div style={{
                        width: '52px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: `${item.color}14`, borderRadius: '8px',
                        filter: `url(#${DIE_CUT_FILTER_ID})`,
                    }}>
                        <span style={{ fontSize: '28px', lineHeight: 1 }}>
                            {({ mindful: '✨', nature: '🌿', mood: '💫', celebrate: '🎉', cozy: '☕', study: '📚', luxe: '💎', vintage: '📷' } as Record<string, string>)[item.category] || '✦'}
                        </span>
                    </div>
                )}
                {/* Lottie badge */}
                <div style={{
                    position: 'absolute', bottom: '0', right: '0',
                    background: `${item.color}dd`, borderRadius: '4px',
                    padding: '1px 3px', fontFamily: 'var(--font-jost)', fontSize: '5.5px',
                    color: '#fff', letterSpacing: '0.05em', textTransform: 'uppercase',
                }}>GIF</div>
            </div>
            <span style={{
                fontFamily: 'var(--font-jost)', fontSize: '6.5px', color: 'rgba(212,175,55,0.38)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                width: '100%', textAlign: 'center', paddingInline: '2px',
            }}>{item.label}</span>
        </motion.button>
    )
}

function LoadingSpinner({ color, label }: { color: string; label?: string }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 0', gap: '8px' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid transparent', borderTopColor: color }} />
            {label && <span style={{ fontFamily: 'var(--font-jost)', fontSize: '8px', color: 'rgba(212,175,55,0.3)' }}>{label}</span>}
        </div>
    )
}

function ErrorMessage({ msg }: { msg: string }) {
    return <p style={{ textAlign: 'center', padding: '16px 8px', fontFamily: 'var(--font-jost)', fontSize: '9px', color: 'rgba(201,137,122,0.7)' }}>{msg}</p>
}

function LoadMoreBtn({ loading, onClick }: { loading: boolean; onClick: () => void }) {
    return (
        <button onClick={onClick} disabled={loading} style={{
            width: '100%', marginTop: '6px', padding: '6px',
            background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.14)', borderRadius: '7px',
            cursor: 'pointer', fontFamily: 'var(--font-jost)', fontSize: '8px',
            letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(212,175,55,0.45)',
        }}>
            {loading ? '…' : 'Load more'}
        </button>
    )
}