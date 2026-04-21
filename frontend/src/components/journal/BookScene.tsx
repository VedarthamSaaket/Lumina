'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface BookSceneProps {
    onBookClick: () => void
}

export default function BookScene({ onBookClick }: BookSceneProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [phase, setPhase] = useState<'idle' | 'zooming' | 'flash' | 'done'>('idle')
    const [videoLoaded, setVideoLoaded] = useState(false)
    const [isLight, setIsLight] = useState(false)

    useEffect(() => {
        setIsLight(document.documentElement.classList.contains('light'))
        const obs = new MutationObserver(() =>
            setIsLight(document.documentElement.classList.contains('light'))
        )
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
        return () => obs.disconnect()
    }, [])

    // Autoplay video on mount
    useEffect(() => {
        const v = videoRef.current
        if (!v) return
        v.play().catch(() => {
            // autoplay blocked — user interaction will start it
        })
    }, [videoLoaded])

    const handleClick = () => {
        if (phase !== 'idle') return
        setPhase('zooming')

        // Phase 1: zoom in (600ms)
        // Phase 2: bright flash (400ms)
        // Phase 3: done → open journal
        setTimeout(() => setPhase('flash'), 600)
        setTimeout(() => {
            setPhase('done')
            onBookClick()
        }, 1100)
    }

    return (
        <div
            onClick={handleClick}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 100,
                overflow: 'hidden',
                cursor: phase === 'idle' ? 'pointer' : 'default',
                background: isLight ? '#f0e6cc' : '#050200',
            }}
        >
            {/* ── VIDEO ── */}
            <motion.div
                animate={
                    phase === 'zooming' || phase === 'flash'
                        ? { scale: 2.8, opacity: phase === 'flash' ? 0 : 1 }
                        : { scale: 1, opacity: 1 }
                }
                transition={{
                    scale: { duration: 0.65, ease: [0.4, 0, 0.2, 1] },
                    opacity: { duration: 0.35, delay: phase === 'flash' ? 0 : 0 },
                }}
                style={{
                    position: 'absolute',
                    inset: 0,
                    transformOrigin: 'center center',
                }}
            >
                <video
                    ref={videoRef}
                    src="/BookOpening.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    onLoadedData={() => setVideoLoaded(true)}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                    }}
                />
            </motion.div>

            {/* ── VIGNETTE ── */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    background: isLight
                        ? 'radial-gradient(ellipse 72% 65% at 50% 50%, transparent 30%, rgba(200,180,140,0.5) 100%)'
                        : 'radial-gradient(ellipse 72% 65% at 50% 50%, transparent 30%, rgba(2,1,0,0.65) 100%)',
                }}
            />

            {/* ── CLICK HINT ── */}
            <AnimatePresence>
                {phase === 'idle' && videoLoaded && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ delay: 1.2, duration: 0.6 }}
                        style={{
                            position: 'absolute',
                            bottom: '11%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            pointerEvents: 'none',
                            textAlign: 'center',
                        }}
                    >
                        <motion.div
                            animate={{ opacity: [0.45, 1, 0.45] }}
                            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                            style={{
                                fontFamily: 'var(--font-cinzel)',
                                fontSize: '10px',
                                letterSpacing: '0.32em',
                                textTransform: 'uppercase',
                                color: isLight ? 'rgba(139,100,16,0.7)' : 'rgba(212,175,55,0.65)',
                            }}
                        >
                            Click to Open
                        </motion.div>
                        {/* Small pulsing rings below hint */}
                        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '5px' }}>
                            {[0, 0.4, 0.8].map((d, i) => (
                                <motion.div
                                    key={i}
                                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 1.6, delay: d, repeat: Infinity }}
                                    style={{
                                        width: '4px', height: '4px', borderRadius: '50%',
                                        background: isLight ? 'rgba(139,100,16,0.5)' : 'rgba(212,175,55,0.5)',
                                    }}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── WHITE FLASH on click ── */}
            <AnimatePresence>
                {(phase === 'zooming' || phase === 'flash') && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={
                            phase === 'zooming'
                                ? { opacity: 0 }
                                : { opacity: [0, 1, 1] }
                        }
                        exit={{ opacity: 0 }}
                        transition={
                            phase === 'flash'
                                ? { duration: 0.5, times: [0, 0.4, 1] }
                                : { duration: 0.3 }
                        }
                        style={{
                            position: 'absolute',
                            inset: 0,
                            zIndex: 20,
                            pointerEvents: 'none',
                            background: `radial-gradient(ellipse at center, #ffffff 0%, #f9e07a 35%, #d4af37 60%, rgba(212,175,55,0) 100%)`,
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Fallback if video not loaded */}
            {!videoLoaded && (
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isLight ? '#f0e6cc' : '#050200',
                }}>
                    <motion.div
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{
                            fontFamily: 'var(--font-cinzel)',
                            fontSize: '14px',
                            letterSpacing: '0.28em',
                            textTransform: 'uppercase',
                            color: isLight ? 'rgba(139,100,16,0.6)' : 'rgba(212,175,55,0.5)',
                        }}
                    >
                        Loading…
                    </motion.div>
                </div>
            )}
        </div>
    )
}