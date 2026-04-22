'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navigation } from '@/components/layout/Navigation'
import { ParticleCanvas } from '@/components/ui/ParticleCanvas'
import BookScene from '@/components/journal/BookScene'
import OpenBook from '@/components/journal/OpenBook'
import { journalAPI, moodAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import type { Sticker } from '@/components/journal/JournalStickers'

type Stage = 'scene' | 'open'

interface JournalEntry {
    id: string
    content: string
    mood_score?: number
    tags?: string[]
    created_at: string
    stickers?: (Sticker & { x: number; y: number; scale: number; stickerId: string })[]
}

export default function JournalPage() {
    const [stage, setStage] = useState<Stage>('scene')
    const [entries, setEntries] = useState<JournalEntry[]>([])
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
            if (reduced) setStage('open')
        }
        loadEntries()
    }, [])

    const loadEntries = async () => {
        try {
            const res = await journalAPI.list()
            const mapped = res.data.map((e: any) => ({
                ...e,
                created_at: e.created_at ?? e.createdAt,
            }))
            setEntries(mapped)
        } catch { }
    }

    const handleBookClick = () => setStage('open')

    const handleSave = async (content: string, mood: number, tags: string[], stickers: any[]) => {
        setIsSaving(true)
        try {
            await Promise.all([
                journalAPI.create(content, mood, tags),
                moodAPI.log(mood, '', tags),
            ])
            toast.success('Entry saved ✦', {
                style: {
                    background: 'rgba(20,10,0,0.95)',
                    color: '#d4af37',
                    border: '1px solid rgba(212,175,55,0.3)',
                    fontFamily: 'var(--font-cinzel)',
                    fontSize: '11px',
                    letterSpacing: '0.15em',
                },
            })
            await loadEntries()
        } catch (err: any) {
            const msg = err?.response?.data?.detail ?? 'Could not save. Are you signed in?'
            toast.error(msg)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <main style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }} className="bg-journal">
            <ParticleCanvas colors={['#d4af37', '#c9897a', '#b8860b', '#fef4e4']} count={stage === 'open' ? 18 : 0} />

            <AnimatePresence mode="wait">
                {stage === 'scene' && (
                    <motion.div
                        key="scene"
                        style={{ position: 'fixed', inset: 0, zIndex: 100 }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <BookScene onBookClick={handleBookClick} />
                    </motion.div>
                )}

                {stage === 'open' && (
                    <motion.div
                        key="open"
                        style={{ position: 'relative', zIndex: 10, width: '100%', minHeight: '100vh' }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Navigation />

                        {/* Heading - prominent, consistent with other pages */}
                        <div style={{
                            position: 'absolute',
                            top: '68px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 60,
                            textAlign: 'center',
                            pointerEvents: 'none',
                            whiteSpace: 'nowrap',
                        }}>
                            <h1 style={{
                                fontFamily: "'Libre Baskerville', 'Baskerville Old Face', Baskerville, Georgia, serif",
                                fontWeight: 400,
                                fontStyle: 'italic',
                                fontSize: 'clamp(1.4rem, 2.2vw, 1.9rem)',
                                margin: 0,
                                letterSpacing: '0.02em',
                                color: 'rgba(254,244,228,0.92)',
                                lineHeight: 1.2,
                            }}>
                                The Inner{' '}
                                <span style={{
                                    background: 'linear-gradient(90deg, #b8860b 0%, #d4af37 30%, #f9e07a 55%, #d4af37 78%, #b8860b 100%)',
                                    backgroundSize: '220% auto',
                                    WebkitBackgroundClip: 'text',
                                    backgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    animation: 'textShimmer 4s linear infinite',
                                }}>Ledger</span>
                            </h1>
                        </div>

                        <OpenBook
                            entries={entries}
                            onSave={handleSave}
                            onClose={() => setStage('scene')}
                            isSaving={isSaving}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    )
}