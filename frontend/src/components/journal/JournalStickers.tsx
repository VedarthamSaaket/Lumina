'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface Sticker {
    id: string
    emoji: string
    label: string
    category: string
    rotation?: number
    color?: string
    accent?: string
}

const STICKER_CATEGORIES: { key: string; label: string; icon: string }[] = [
    { key: 'telangana', label: 'Tella Stuff', icon: '🌶️' },
    { key: 'mood', label: 'Mood fr', icon: '💭' },
    { key: 'study', label: 'Grind SZN', icon: '📚' },
    { key: 'food', label: 'Food Feels', icon: '🍛' },
    { key: 'whatsapp', label: 'WA Certified', icon: '📱' },
    { key: 'love', label: 'Prem Vibes', icon: '💌' },
]

const STICKERS: Sticker[] = [
    // Telangana / South Indian
    { id: 't1', emoji: '😤', label: 'Ayyo!', category: 'telangana', rotation: -3, color: '#c9897a', accent: '#2a0800' },
    { id: 't2', emoji: '🤌', label: 'Enti ra', category: 'telangana', rotation: 2, color: '#d4af37', accent: '#1a0e00' },
    { id: 't3', emoji: '😌', label: 'Chill bro', category: 'telangana', rotation: -1, color: '#7a9e7e', accent: '#0a1800' },
    { id: 't4', emoji: '💀', label: 'Pani aipoyindi', category: 'telangana', rotation: 3, color: '#8b7355', accent: '#120800' },
    { id: 't5', emoji: '😩', label: 'Amma cheppu', category: 'telangana', rotation: -2, color: '#c9897a', accent: '#2a0800' },
    { id: 't6', emoji: '🔥', label: 'Tight ga undi', category: 'telangana', rotation: 1, color: '#c4913a', accent: '#1a0800' },
    { id: 't7', emoji: '😑', label: 'Pata ledu', category: 'telangana', rotation: -3, color: '#8b9e7a', accent: '#0a1200' },
    { id: 't8', emoji: '🙏', label: 'God ke cheppu', category: 'telangana', rotation: 2, color: '#d4af37', accent: '#1a0e00' },
    { id: 't9', emoji: '😭', label: 'Bagundi ledu', category: 'telangana', rotation: -1, color: '#5b9bd5', accent: '#00101a' },
    { id: 't10', emoji: '🥹', label: 'Baga feel avutundi', category: 'telangana', rotation: 3, color: '#c9897a', accent: '#2a0800' },
    { id: 't11', emoji: '🫠', label: 'Okati ledu', category: 'telangana', rotation: -2, color: '#b8a070', accent: '#180c00' },
    { id: 't12', emoji: '😎', label: 'Chala cool ra', category: 'telangana', rotation: 1, color: '#7a9e7e', accent: '#0a1800' },

    // Mood / Gen-Z
    { id: 'm1', emoji: '✨', label: 'Main character', category: 'mood', rotation: -2, color: '#d4af37', accent: '#1a0e00' },
    { id: 'm2', emoji: '🫂', label: 'Not okay', category: 'mood', rotation: 1, color: '#9b7fd4', accent: '#100020' },
    { id: 'm3', emoji: '💅', label: 'Unbothered', category: 'mood', rotation: -3, color: '#c9897a', accent: '#2a0800' },
    { id: 'm4', emoji: '😮‍💨', label: 'Sigh...', category: 'mood', rotation: 2, color: '#8b7355', accent: '#120800' },
    { id: 'm5', emoji: '🦋', label: 'Era change', category: 'mood', rotation: -1, color: '#7a9e7e', accent: '#0a1800' },
    { id: 'm6', emoji: '🫡', label: 'W energy only', category: 'mood', rotation: 3, color: '#5b9bd5', accent: '#00101a' },
    { id: 'm7', emoji: '🌙', label: '2AM thoughts', category: 'mood', rotation: -2, color: '#9b7fd4', accent: '#100020' },
    { id: 'm8', emoji: '👁️', label: 'Watching me', category: 'mood', rotation: 1, color: '#c4913a', accent: '#1a0800' },
    { id: 'm9', emoji: '🤡', label: 'Clown hours', category: 'mood', rotation: -3, color: '#c9897a', accent: '#2a0800' },
    { id: 'm10', emoji: '🌸', label: 'Soft launch', category: 'mood', rotation: 2, color: '#d4af37', accent: '#1a0e00' },
    { id: 'm11', emoji: '😶‍🌫️', label: 'Dissociating', category: 'mood', rotation: -1, color: '#8b9e7a', accent: '#0a1200' },
    { id: 'm12', emoji: '🫣', label: 'Caught in 4K', category: 'mood', rotation: 3, color: '#b8860b', accent: '#180c00' },

    // Study / Grind
    { id: 's1', emoji: '😤', label: 'Exam time da', category: 'study', rotation: -2, color: '#c9897a', accent: '#2a0800' },
    { id: 's2', emoji: '📖', label: 'Padali but...', category: 'study', rotation: 1, color: '#8b7355', accent: '#120800' },
    { id: 's3', emoji: '☕', label: 'Chai mode', category: 'study', rotation: -3, color: '#c4913a', accent: '#1a0800' },
    { id: 's4', emoji: '🌃', label: 'Raat bhar jaag', category: 'study', rotation: 2, color: '#9b7fd4', accent: '#100020' },
    { id: 's5', emoji: '🧠', label: 'Brain offline', category: 'study', rotation: -1, color: '#7a9e7e', accent: '#0a1800' },
    { id: 's6', emoji: '📝', label: 'Notes ledu', category: 'study', rotation: 3, color: '#d4af37', accent: '#1a0e00' },
    { id: 's7', emoji: '😴', label: 'Sleep > Marks', category: 'study', rotation: -2, color: '#5b9bd5', accent: '#00101a' },
    { id: 's8', emoji: '🏃', label: 'Deadline run', category: 'study', rotation: 1, color: '#c9897a', accent: '#2a0800' },

    // Food
    { id: 'f1', emoji: '🍛', label: 'Biryani mood', category: 'food', rotation: -1, color: '#d4af37', accent: '#1a0e00' },
    { id: 'f2', emoji: '🫖', label: 'Filter coffee', category: 'food', rotation: 2, color: '#c4913a', accent: '#1a0800' },
    { id: 'f3', emoji: '🥞', label: 'Pesarattu vibes', category: 'food', rotation: -3, color: '#7a9e7e', accent: '#0a1800' },
    { id: 'f4', emoji: '🍜', label: 'Maggi o\'clock', category: 'food', rotation: 1, color: '#b8860b', accent: '#180c00' },
    { id: 'f5', emoji: '🧋', label: 'Boba tho settle', category: 'food', rotation: -2, color: '#8b7355', accent: '#120800' },
    { id: 'f6', emoji: '🌶️', label: 'Spicy mood', category: 'food', rotation: 3, color: '#c9897a', accent: '#2a0800' },
    { id: 'f7', emoji: '🥤', label: 'Lassi break', category: 'food', rotation: -1, color: '#5b9bd5', accent: '#00101a' },
    { id: 'f8', emoji: '🍩', label: 'Meetha time', category: 'food', rotation: 2, color: '#d4af37', accent: '#1a0e00' },

    // WhatsApp style
    { id: 'w1', emoji: '👁️', label: 'Seen. No reply.', category: 'whatsapp', rotation: -2, color: '#5b9bd5', accent: '#00101a' },
    { id: 'w2', emoji: '🔇', label: 'Group muted', category: 'whatsapp', rotation: 1, color: '#8b7355', accent: '#120800' },
    { id: 'w3', emoji: '😭', label: 'Left on read', category: 'whatsapp', rotation: -3, color: '#c9897a', accent: '#2a0800' },
    { id: 'w4', emoji: '📤', label: 'Forward mat karo', category: 'whatsapp', rotation: 2, color: '#7a9e7e', accent: '#0a1800' },
    { id: 'w5', emoji: '🤐', label: 'Group lo silent', category: 'whatsapp', rotation: -1, color: '#9b7fd4', accent: '#100020' },
    { id: 'w6', emoji: '✅✅', label: 'Blue tick aa gaya', category: 'whatsapp', rotation: 3, color: '#5b9bd5', accent: '#00101a' },
    { id: 'w7', emoji: '📸', label: 'Screenshot chestha', category: 'whatsapp', rotation: -2, color: '#b8860b', accent: '#180c00' },
    { id: 'w8', emoji: '🙈', label: 'Status update', category: 'whatsapp', rotation: 1, color: '#c4913a', accent: '#1a0800' },

    // Love / Prem
    { id: 'l1', emoji: '💌', label: 'Secret feel', category: 'love', rotation: -2, color: '#c9897a', accent: '#2a0800' },
    { id: 'l2', emoji: '🥺', label: 'Senti avutunna', category: 'love', rotation: 1, color: '#d4af37', accent: '#1a0e00' },
    { id: 'l3', emoji: '💔', label: 'Poni ra', category: 'love', rotation: -3, color: '#c9897a', accent: '#2a0800' },
    { id: 'l4', emoji: '🫶', label: 'Ishtam', category: 'love', rotation: 2, color: '#7a9e7e', accent: '#0a1800' },
    { id: 'l5', emoji: '😳', label: 'Crush spotted', category: 'love', rotation: -1, color: '#9b7fd4', accent: '#100020' },
    { id: 'l6', emoji: '✨💕', label: 'Moment cherish', category: 'love', rotation: 3, color: '#d4af37', accent: '#1a0e00' },
    { id: 'l7', emoji: '🌹', label: 'Romantic feeling', category: 'love', rotation: -2, color: '#c9897a', accent: '#2a0800' },
    { id: 'l8', emoji: '😍', label: 'Besties forever', category: 'love', rotation: 1, color: '#5b9bd5', accent: '#00101a' },
]

interface JournalStickersProps {
    onSelect: (sticker: Sticker) => void
    onClose: () => void
}

export default function JournalStickers({ onSelect, onClose }: JournalStickersProps) {
    const [activeCategory, setActiveCategory] = useState('telangana')
    const [recentlyUsed, setRecentlyUsed] = useState<Sticker[]>([])

    const filtered = STICKERS.filter(s => s.category === activeCategory)

    const handleSelect = (sticker: Sticker) => {
        setRecentlyUsed(prev => {
            const without = prev.filter(s => s.id !== sticker.id)
            return [sticker, ...without].slice(0, 8)
        })
        onSelect(sticker)
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            style={{
                position: 'absolute',
                right: '48px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '240px',
                background: 'rgba(8, 3, 0, 0.95)',
                border: '1px solid rgba(212,175,55,0.25)',
                borderRadius: '16px',
                backdropFilter: 'blur(40px)',
                zIndex: 50,
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
        >
            <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid rgba(212,175,55,0.12)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-cinzel)', fontSize: '10px', letterSpacing: '0.15em', color: 'var(--gold)', textTransform: 'uppercase' }}>
                        Stickers
                    </span>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px' }}>✕</button>
                </div>

                {/* Category tabs */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {STICKER_CATEGORIES.map(cat => (
                        <button
                            key={cat.key}
                            onClick={() => setActiveCategory(cat.key)}
                            style={{
                                padding: '4px 8px',
                                borderRadius: '8px',
                                fontSize: '10px',
                                fontFamily: 'var(--font-jost)',
                                letterSpacing: '0.05em',
                                cursor: 'pointer',
                                border: activeCategory === cat.key ? '1px solid rgba(212,175,55,0.45)' : '1px solid rgba(212,175,55,0.12)',
                                background: activeCategory === cat.key ? 'rgba(212,175,55,0.15)' : 'transparent',
                                color: activeCategory === cat.key ? 'var(--gold)' : 'var(--text-muted)',
                                transition: 'all 0.15s',
                            }}
                        >
                            {cat.icon} {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Recently used */}
            {recentlyUsed.length > 0 && (
                <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(212,175,55,0.08)' }}>
                    <p style={{ fontFamily: 'var(--font-jost)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>Recent</p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {recentlyUsed.map(s => (
                            <motion.button
                                key={s.id}
                                onClick={() => handleSelect(s)}
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.9 }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '18px',
                                    lineHeight: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {s.emoji}
                            </motion.button>
                        ))}
                    </div>
                </div>
            )}

            {/* Sticker grid */}
            <div style={{ padding: '10px 12px 12px', maxHeight: '280px', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {filtered.map((sticker, i) => (
                        <motion.button
                            key={sticker.id}
                            onClick={() => handleSelect(sticker)}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.03 }}
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '8px 6px',
                                borderRadius: '12px',
                                background: `${sticker.color}14`,
                                border: `1px solid ${sticker.color}30`,
                                cursor: 'pointer',
                                transform: `rotate(${sticker.rotation || 0}deg)`,
                            }}
                        >
                            <span style={{ fontSize: '22px', lineHeight: 1, display: 'block' }}>{sticker.emoji}</span>
                            <span style={{
                                fontFamily: 'var(--font-jost)',
                                fontSize: '9px',
                                fontWeight: 500,
                                color: sticker.color,
                                textAlign: 'center',
                                lineHeight: 1.2,
                                letterSpacing: '0.02em',
                            }}>
                                {sticker.label}
                            </span>
                        </motion.button>
                    ))}
                </div>
            </div>
        </motion.div>
    )
}