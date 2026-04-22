'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface BookSceneProps {
    onBookClick: () => void
}

export default function BookScene({ onBookClick }: BookSceneProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [phase, setPhase] = useState<'idle' | 'flash' | 'done'>('idle')
    const [videoReady, setVideoReady] = useState(false)

    useEffect(() => {
        const v = videoRef.current
        if (!v) return
        const tryPlay = () => {
            v.play().then(() => setVideoReady(true)).catch(() => setVideoReady(true))
        }
        if (v.readyState >= 2) { tryPlay() }
        else { v.addEventListener('canplay', tryPlay, { once: true }) }
        return () => { v.removeEventListener('canplay', tryPlay) }
    }, [])

    const handleClick = () => {
        if (phase !== 'idle') return
        if (videoRef.current?.paused) videoRef.current.play().catch(() => { })
        setPhase('flash')
        setTimeout(() => {
            setPhase('done')
            onBookClick()
        }, 1100)
    }

    return (
        <div
            onClick={handleClick}
            style={{
                position: 'fixed', inset: 0, zIndex: 100, overflow: 'hidden',
                cursor: phase === 'idle' ? 'pointer' : 'default',
                background: '#050200',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
        >
            {/* VIDEO - slightly inset so corners/edges of the room/scene are visible */}
            <div style={{
                position: 'absolute',
                inset: '-2% -3%',  // slightly oversized to fill all edges
                overflow: 'hidden',
            }}>
                <video
                    ref={videoRef}
                    src="/BookOpening.mp4"
                    autoPlay loop muted playsInline preload="auto"
                    style={{
                        width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                        opacity: 0.88,
                    }}
                />
            </div>

            {/* Vignette - softer so video edges show */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(ellipse 80% 70% at 50% 55%, transparent 25%, rgba(2,1,0,0.5) 100%)',
            }} />

            {/* Dark corners to frame the scene beautifully */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: `
                    linear-gradient(to bottom, rgba(2,1,0,0.6) 0%, transparent 18%, transparent 80%, rgba(2,1,0,0.7) 100%),
                    linear-gradient(to right, rgba(2,1,0,0.35) 0%, transparent 12%, transparent 88%, rgba(2,1,0,0.35) 100%)
                `,
            }} />

            {/* HEADING - centered in the page, then animates upward when ready */}
            <AnimatePresence>
                {phase === 'idle' && videoReady && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ delay: 0.6, duration: 1.0 }}
                        style={{
                            position: 'absolute',
                            top: '50%', left: '50%',
                            transform: 'translate(-50%, -50%)',
                            pointerEvents: 'none', textAlign: 'center',
                            zIndex: 20, width: '100%', padding: '0 20px',
                        }}
                    >
                        {/* Subtle decorative line above */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '12px' }}>
                            <div style={{ height: '1px', width: '60px', background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.4))' }} />
                            <span style={{ color: 'rgba(212,175,55,0.5)', fontSize: '10px' }}>✦</span>
                            <div style={{ height: '1px', width: '60px', background: 'linear-gradient(to left, transparent, rgba(212,175,55,0.4))' }} />
                        </div>

                        <h1 style={{
                            fontFamily: "'Libre Baskerville', 'Baskerville Old Face', Baskerville, Georgia, serif",
                            fontWeight: 400,
                            fontStyle: 'italic',
                            fontSize: 'clamp(2.8rem, 6vw, 5rem)',
                            margin: '0 0 8px',
                            letterSpacing: '0.02em',
                            color: 'rgba(254,244,228,0.92)',
                            lineHeight: 1.15,
                            textShadow: '0 2px 40px rgba(0,0,0,0.6)',
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

                        <p style={{
                            fontFamily: "'Cormorant Garamond', serif",
                            fontStyle: 'italic', fontWeight: 300,
                            fontSize: 'clamp(0.9rem, 1.8vw, 1.1rem)',
                            color: 'rgba(212,175,55,0.55)',
                            letterSpacing: '0.06em', margin: 0,
                            textShadow: '0 1px 20px rgba(0,0,0,0.5)',
                        }}>
                            A sanctuary for the examined life
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Click hint - bottom center */}
            <AnimatePresence>
                {phase === 'idle' && videoReady && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ delay: 1.8, duration: 0.7 }}
                        style={{
                            position: 'absolute', bottom: '9%', left: '50%',
                            transform: 'translateX(-50%)', pointerEvents: 'none', textAlign: 'center',
                        }}
                    >
                        <motion.div
                            animate={{ opacity: [0.45, 1, 0.45] }}
                            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                            style={{
                                fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.32em',
                                textTransform: 'uppercase', color: 'rgba(212,175,55,0.6)',
                            }}
                        >Click to Open Your Journal</motion.div>
                        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '5px' }}>
                            {[0, 0.4, 0.8].map((d, i) => (
                                <motion.div key={i}
                                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 1.6, delay: d, repeat: Infinity }}
                                    style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(212,175,55,0.5)' }} />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Loading state */}
            {!videoReady && (
                <div style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#050200', zIndex: 5,
                }}>
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity }}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            border: '2px solid transparent', borderTopColor: 'rgba(212,175,55,0.6)',
                            animation: 'spin 1s linear infinite',
                        }} />
                        <span style={{ fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(212,175,55,0.4)' }}>Opening...</span>
                    </motion.div>
                    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                </div>
            )}

            {/* Flash */}
            <AnimatePresence>
                {phase === 'flash' && (
                    <>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.3 }}
                            animate={{ opacity: [0, 0.7, 1], scale: [0.3, 1.2, 2] }}
                            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
                            style={{
                                position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none',
                                background: 'radial-gradient(ellipse 50% 45% at 50% 52%, #ffffff 0%, rgba(255,255,255,0.9) 40%, rgba(255,255,255,0) 75%)',
                            }}
                        />
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 0.85, 1] }}
                            transition={{ duration: 1.0, times: [0, 0.5, 0.8, 1] }}
                            style={{ position: 'absolute', inset: 0, zIndex: 21, background: '#ffffff', pointerEvents: 'none' }}
                        />
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}