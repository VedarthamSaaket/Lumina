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
    const [isLight, setIsLight] = useState(false)

    useEffect(() => {
        setIsLight(document.documentElement.classList.contains('light'))
        const obs = new MutationObserver(() =>
            setIsLight(document.documentElement.classList.contains('light'))
        )
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
        return () => obs.disconnect()
    }, [])

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
        }, 900)
    }

    return (
        <div
            onClick={handleClick}
            style={{
                position: 'fixed', inset: 0, zIndex: 100, overflow: 'hidden',
                cursor: phase === 'idle' ? 'pointer' : 'default',
                background: isLight ? '#f0e6cc' : '#050200',
            }}
        >
            {/* VIDEO - no scale transform at all */}
            <div style={{ position: 'absolute', inset: 0 }}>
                <video
                    ref={videoRef}
                    src="/BookOpening.mp4"
                    autoPlay loop muted playsInline preload="auto"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
            </div>

            {/* Vignette */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: isLight
                    ? 'radial-gradient(ellipse 72% 65% at 50% 50%, transparent 30%, rgba(200,180,140,0.5) 100%)'
                    : 'radial-gradient(ellipse 72% 65% at 50% 50%, transparent 30%, rgba(2,1,0,0.65) 100%)',
            }} />

            {/* Click hint */}
            <AnimatePresence>
                {phase === 'idle' && videoReady && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ delay: 1.4, duration: 0.7 }}
                        style={{
                            position: 'absolute', bottom: '11%', left: '50%',
                            transform: 'translateX(-50%)', pointerEvents: 'none', textAlign: 'center',
                        }}
                    >
                        <motion.div
                            animate={{ opacity: [0.45, 1, 0.45] }}
                            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                            style={{
                                fontFamily: 'var(--font-cinzel)', fontSize: '10px', letterSpacing: '0.32em',
                                textTransform: 'uppercase', color: isLight ? 'rgba(139,100,16,0.7)' : 'rgba(212,175,55,0.65)',
                            }}
                        >Click to Open Your Journal</motion.div>
                        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '5px' }}>
                            {[0, 0.4, 0.8].map((d, i) => (
                                <motion.div key={i}
                                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 1.6, delay: d, repeat: Infinity }}
                                    style={{
                                        width: '4px', height: '4px', borderRadius: '50%',
                                        background: isLight ? 'rgba(139,100,16,0.5)' : 'rgba(212,175,55,0.5)',
                                    }} />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Loading state */}
            {!videoReady && (
                <div style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isLight ? '#f0e6cc' : '#050200', zIndex: 5,
                }}>
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity }}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            border: '2px solid transparent',
                            borderTopColor: isLight ? 'rgba(139,100,16,0.6)' : 'rgba(212,175,55,0.6)',
                            animation: 'spin 1s linear infinite',
                        }} />
                        <span style={{
                            fontFamily: 'var(--font-cinzel)', fontSize: '9px', letterSpacing: '0.24em', textTransform: 'uppercase',
                            color: isLight ? 'rgba(139,100,16,0.5)' : 'rgba(212,175,55,0.4)',
                        }}>Opening...</span>
                    </motion.div>
                    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                </div>
            )}

            {/* Bright radial white flash from center - no zoom */}
            <AnimatePresence>
                {phase === 'flash' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.6, 1, 1] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.85, times: [0, 0.3, 0.65, 1] }}
                        style={{
                            position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none',
                            background: 'radial-gradient(ellipse 55% 50% at 50% 52%, #ffffff 0%, #fffde0 30%, #f9e07a 55%, rgba(212,175,55,0) 80%)',
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Full white cover at end */}
            <AnimatePresence>
                {phase === 'flash' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0, 0.5, 1] }}
                        transition={{ duration: 0.85, times: [0, 0.5, 0.75, 1] }}
                        style={{ position: 'absolute', inset: 0, zIndex: 21, background: '#ffffff', pointerEvents: 'none' }}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}