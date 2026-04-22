'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface BookSceneProps {
    onBookClick: () => void
}

export default function BookScene({ onBookClick }: BookSceneProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [phase, setPhase] = useState<'idle' | 'rising' | 'flash' | 'done'>('idle')
    const [videoReady, setVideoReady] = useState(false)
    const [headingRisen, setHeadingRisen] = useState(false)

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

    // Heading rises up after appearing in center
    useEffect(() => {
        if (!videoReady) return
        const t = setTimeout(() => setHeadingRisen(true), 2200)
        return () => clearTimeout(t)
    }, [videoReady])

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
            {/* VIDEO — slightly inset so edges/corners of scene are visible */}
            <div style={{
                position: 'absolute',
                inset: 0,
                overflow: 'hidden',
            }}>
                <video
                    ref={videoRef}
                    src="/BookOpening.mp4"
                    autoPlay loop muted playsInline preload="auto"
                    style={{
                        width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                        opacity: 0.82,
                        transform: 'scale(0.92)',
                        transformOrigin: 'center center',
                    }}
                />
            </div>

            {/* Corner & edge vignette to frame the video scene */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: `
                    linear-gradient(to bottom, rgba(2,1,0,0.72) 0%, rgba(2,1,0,0.18) 14%, transparent 30%, transparent 72%, rgba(2,1,0,0.55) 100%),
                    linear-gradient(to right, rgba(2,1,0,0.55) 0%, transparent 12%, transparent 88%, rgba(2,1,0,0.55) 100%)
                `,
            }} />

            {/* Center radial vignette */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(ellipse 70% 65% at 50% 52%, transparent 30%, rgba(2,1,0,0.45) 100%)',
            }} />

            {/* HEADING — starts centered, then rises to top third */}
            <AnimatePresence>
                {phase === 'idle' && videoReady && (
                    <motion.div
                        key="heading"
                        initial={{ opacity: 0, y: 0 }}
                        animate={{
                            opacity: 1,
                            y: headingRisen ? '-28vh' : 0,
                        }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{
                            opacity: { duration: 1.1, delay: 0.3 },
                            y: { duration: 1.4, ease: [0.25, 0.46, 0.45, 0.94] },
                        }}
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            pointerEvents: 'none',
                            textAlign: 'center',
                            zIndex: 20,
                            width: '100%',
                            padding: '0 24px',
                        }}
                    >
                        {/* Ornamental line above */}
                        <motion.div
                            initial={{ opacity: 0, scaleX: 0 }}
                            animate={{ opacity: 1, scaleX: 1 }}
                            transition={{ delay: 0.8, duration: 0.9 }}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '16px' }}
                        >
                            <div style={{ height: '1px', width: '80px', background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.5))' }} />
                            <span style={{ color: 'rgba(212,175,55,0.6)', fontSize: '12px' }}>✦</span>
                            <div style={{ height: '1px', width: '80px', background: 'linear-gradient(to left, transparent, rgba(212,175,55,0.5))' }} />
                        </motion.div>

                        <h1 style={{
                            fontFamily: "'Libre Baskerville', 'Baskerville Old Face', Baskerville, Georgia, serif",
                            fontWeight: 400,
                            fontStyle: 'italic',
                            fontSize: 'clamp(3.2rem, 7vw, 6rem)',
                            margin: '0 0 10px',
                            letterSpacing: '0.02em',
                            color: 'rgba(254,244,228,0.94)',
                            lineHeight: 1.1,
                            textShadow: '0 2px 48px rgba(0,0,0,0.7)',
                        }}>
                            The Inner{' '}
                            <span style={{
                                background: 'linear-gradient(90deg, #b8860b 0%, #d4af37 30%, #f9e07a 55%, #d4af37 78%, #b8860b 100%)',
                                backgroundSize: '220% auto',
                                WebkitBackgroundClip: 'text',
                                backgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                animation: 'textShimmer 4s linear infinite',
                                display: 'inline',
                            }}>Ledger</span>
                        </h1>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.2, duration: 0.9 }}
                            style={{
                                fontFamily: "'Cormorant Garamond', serif",
                                fontStyle: 'italic', fontWeight: 300,
                                fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                                color: 'rgba(212,175,55,0.6)',
                                letterSpacing: '0.06em', margin: 0,
                                textShadow: '0 1px 24px rgba(0,0,0,0.6)',
                            }}
                        >
                            A sanctuary for the examined life
                        </motion.p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Click hint — appears after heading rises */}
            <AnimatePresence>
                {phase === 'idle' && videoReady && headingRisen && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
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
                                textTransform: 'uppercase', color: 'rgba(212,175,55,0.65)',
                            }}
                        >Click to Open Your Journal</motion.div>
                        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '5px' }}>
                            {[0, 0.4, 0.8].map((d, i) => (
                                <motion.div key={i}
                                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 1.6, delay: d, repeat: Infinity }}
                                    style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(212,175,55,0.55)' }} />
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
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '50%', margin: '0 auto 16px',
                                border: '2px solid transparent', borderTopColor: 'rgba(212,175,55,0.6)',
                                animation: 'spin 1s linear infinite',
                            }} />
                            <span style={{ fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(212,175,55,0.4)' }}>Opening...</span>
                        </div>
                    </motion.div>
                    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                </div>
            )}

            {/* Flash on click */}
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