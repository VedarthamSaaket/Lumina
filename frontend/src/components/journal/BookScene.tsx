'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface BookSceneProps {
    onBookClick: () => void
}

export default function BookScene({ onBookClick }: BookSceneProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [hovered, setHovered] = useState(false)
    const [clicked, setClicked] = useState(false)
    const [isLight, setIsLight] = useState(false)

    useEffect(() => {
        setIsLight(document.documentElement.classList.contains('light'))
        const obs = new MutationObserver(() => {
            setIsLight(document.documentElement.classList.contains('light'))
        })
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
        return () => obs.disconnect()
    }, [])

    // Full scene animation - stars, floating particles, ambient glow, candlelight
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        resize()
        window.addEventListener('resize', resize)

        // Stars - fixed background points, like the video
        type Star = { x: number; y: number; r: number; twinkle: number; phase: number }
        const stars: Star[] = Array.from({ length: 120 }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight * 0.85,
            r: Math.random() * 1.2 + 0.2,
            twinkle: Math.random() * 0.4 + 0.1,
            phase: Math.random() * Math.PI * 2,
        }))

        // Floating dust motes - slow drifting upward, like the video
        type Mote = { x: number; y: number; vx: number; vy: number; r: number; alpha: number; da: number; drift: number }
        const motes: Mote[] = Array.from({ length: 60 }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 0.12,
            vy: -(Math.random() * 0.18 + 0.03),
            r: Math.random() * 1.4 + 0.2,
            alpha: Math.random() * 0.45 + 0.05,
            da: (Math.random() - 0.5) * 0.002,
            drift: Math.random() * Math.PI * 2,
        }))

        let frame = 0
        let raf: number

        const draw = () => {
            const w = canvas.width
            const h = canvas.height
            ctx.clearRect(0, 0, w, h)

            // Background gradient - deep dark warm (video matching)
            if (!isLight) {
                const bgGrd = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.4, w * 0.7)
                bgGrd.addColorStop(0, '#1a0900')
                bgGrd.addColorStop(0.4, '#0f0500')
                bgGrd.addColorStop(1, '#050200')
                ctx.fillStyle = bgGrd
                ctx.fillRect(0, 0, w, h)
            } else {
                const bgGrd = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.4, w * 0.7)
                bgGrd.addColorStop(0, '#e8d8b0')
                bgGrd.addColorStop(0.5, '#f0e6cc')
                bgGrd.addColorStop(1, '#ece0c4')
                ctx.fillStyle = bgGrd
                ctx.fillRect(0, 0, w, h)
            }

            // Central warm book glow - the amber halo from the video
            const cx = w * 0.5
            const cy = h * 0.44
            const flicker = Math.sin(frame * 0.03) * 0.1 + Math.sin(frame * 0.07) * 0.05 + Math.sin(frame * 0.13) * 0.03
            const glowRadius = 420 + flicker * 100

            if (!isLight) {
                const bookGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius)
                bookGlow.addColorStop(0, `rgba(200, 110, 20, ${0.22 + flicker * 0.06})`)
                bookGlow.addColorStop(0.25, `rgba(180, 90, 10, ${0.15 + flicker * 0.04})`)
                bookGlow.addColorStop(0.55, `rgba(140, 60, 5, ${0.08 + flicker * 0.02})`)
                bookGlow.addColorStop(1, 'rgba(0,0,0,0)')
                ctx.fillStyle = bookGlow
                ctx.fillRect(0, 0, w, h)
            } else {
                const bookGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius)
                bookGlow.addColorStop(0, `rgba(139, 100, 16, ${0.14 + flicker * 0.04})`)
                bookGlow.addColorStop(0.4, `rgba(160, 120, 40, ${0.08 + flicker * 0.02})`)
                bookGlow.addColorStop(1, 'rgba(240,230,200,0)')
                ctx.fillStyle = bookGlow
                ctx.fillRect(0, 0, w, h)
            }

            // Stars - only in dark mode (like the video - scattered stars in background)
            if (!isLight) {
                stars.forEach(s => {
                    const t = Math.sin(frame * 0.012 + s.phase) * 0.5 + 0.5
                    const alpha = s.twinkle * t + 0.05
                    ctx.beginPath()
                    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
                    ctx.fillStyle = `rgba(212, 175, 55, ${alpha})`
                    ctx.fill()
                    // Occasional tiny cross glint on brighter stars
                    if (s.r > 0.9 && t > 0.8) {
                        const size = s.r * 3.5
                        ctx.strokeStyle = `rgba(240, 210, 100, ${alpha * 0.5})`
                        ctx.lineWidth = 0.4
                        ctx.beginPath()
                        ctx.moveTo(s.x - size, s.y)
                        ctx.lineTo(s.x + size, s.y)
                        ctx.moveTo(s.x, s.y - size)
                        ctx.lineTo(s.x, s.y + size)
                        ctx.stroke()
                    }
                })
            }

            // Floating dust/particle motes
            motes.forEach(m => {
                m.x += m.vx + Math.sin(frame * 0.008 + m.drift) * 0.06
                m.y += m.vy
                m.alpha += m.da
                if (m.alpha < 0.03) m.da = Math.abs(m.da)
                if (m.alpha > 0.45) m.da = -Math.abs(m.da)
                if (m.y < -5) {
                    m.y = canvas.height + 5
                    m.x = Math.random() * canvas.width
                    m.alpha = 0.05
                }
                if (m.x < -5) m.x = canvas.width + 5
                if (m.x > canvas.width + 5) m.x = -5

                const moteColor = isLight ? `rgba(139, 100, 16, ${m.alpha * 0.7})` : `rgba(212, 175, 55, ${m.alpha})`
                ctx.beginPath()
                ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2)
                ctx.fillStyle = moteColor
                ctx.fill()

                // soft halo
                const grd = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 5)
                grd.addColorStop(0, isLight ? `rgba(139,100,16,${m.alpha * 0.25})` : `rgba(212,175,55,${m.alpha * 0.3})`)
                grd.addColorStop(1, 'rgba(0,0,0,0)')
                ctx.beginPath()
                ctx.arc(m.x, m.y, m.r * 5, 0, Math.PI * 2)
                ctx.fillStyle = grd
                ctx.fill()
            })

            // Bottom desk surface - warm horizontal gradient like the video
            const deskY = h * 0.71
            const deskGrd = ctx.createLinearGradient(0, deskY, 0, deskY + 100)
            if (!isLight) {
                deskGrd.addColorStop(0, 'rgba(160, 100, 30, 0.22)')
                deskGrd.addColorStop(0.4, 'rgba(100, 55, 10, 0.15)')
                deskGrd.addColorStop(1, 'rgba(0,0,0,0)')
            } else {
                deskGrd.addColorStop(0, 'rgba(160, 120, 60, 0.18)')
                deskGrd.addColorStop(0.4, 'rgba(180, 140, 80, 0.1)')
                deskGrd.addColorStop(1, 'rgba(240,230,200,0)')
            }
            ctx.fillStyle = deskGrd
            ctx.fillRect(0, deskY, w, 100)

            frame++
            raf = requestAnimationFrame(draw)
        }

        draw()
        return () => {
            window.removeEventListener('resize', resize)
            cancelAnimationFrame(raf)
        }
    }, [isLight])

    const handleClick = () => {
        if (clicked) return
        setClicked(true)
        setTimeout(onBookClick, 400)
    }

    const goldColor = isLight ? '#8b6410' : '#d4af37'
    const goldDim = isLight ? 'rgba(139,100,16,0.6)' : 'rgba(212,175,55,0.6)'
    const goldGlow = isLight ? 'rgba(139,100,16,0.3)' : 'rgba(212,175,55,0.35)'
    const coverBg = isLight
        ? 'linear-gradient(135deg, #c8a060 0%, #8b5a20 30%, #6b3a10 55%, #7a4418 80%, #5a2a08 100%)'
        : 'linear-gradient(135deg, #1c0900 0%, #2a1200 20%, #331600 40%, #2a1000 60%, #1e0b00 80%, #150700 100%)'
    const spineBg = isLight
        ? 'linear-gradient(to right, #3a1800, #5a2a08, #3a1800)'
        : 'linear-gradient(to right, #0a0200, #1a0800, #0a0200)'
    const pageBg = isLight ? '#e8d5a8' : '#e8d5a8'

    return (
        <div
            style={{
                position: 'relative',
                width: '100%',
                height: '100vh',
                overflow: 'hidden',
                background: isLight ? '#f0e6cc' : '#050200',
                cursor: clicked ? 'default' : 'pointer',
            }}
            onClick={handleClick}
        >
            {/* Ambient canvas */}
            <canvas
                ref={canvasRef}
                style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
            />

            {/* Vignette */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: isLight
                    ? 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 30%, rgba(200,180,140,0.4) 100%)'
                    : 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 30%, rgba(2,1,0,0.7) 100%)',
            }} />

            {/* Book - centered, exactly matching the video */}
            <div style={{
                position: 'absolute',
                left: '50%', top: '44%',
                transform: 'translate(-50%, -50%)',
                perspective: '1400px',
                zIndex: 10,
            }}>
                <motion.div
                    onHoverStart={() => setHovered(true)}
                    onHoverEnd={() => setHovered(false)}
                    animate={clicked
                        ? { scale: 3.5, opacity: 0, filter: 'blur(8px)' }
                        : hovered
                            ? { scale: 1.05, filter: `drop-shadow(0 0 40px ${goldGlow})` }
                            : { scale: 1, filter: `drop-shadow(0 0 20px ${goldGlow})` }
                    }
                    transition={clicked
                        ? { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
                        : { duration: 0.35, ease: 'easeOut' }
                    }
                    style={{
                        transformStyle: 'preserve-3d',
                        transform: 'rotateX(8deg) rotateY(-22deg)',
                        position: 'relative',
                        width: '200px',
                        height: '265px',
                    }}
                >
                    {/* Shadow on desk */}
                    <motion.div
                        animate={{ opacity: hovered ? 0.7 : 0.5, scaleX: hovered ? 1.1 : 1 }}
                        style={{
                            position: 'absolute',
                            bottom: '-30px', left: '15px',
                            width: '175px', height: '35px',
                            background: 'radial-gradient(ellipse, rgba(0,0,0,0.6) 0%, transparent 70%)',
                            borderRadius: '50%',
                            pointerEvents: 'none',
                        }}
                    />

                    {/* Pages right edge */}
                    <div style={{
                        position: 'absolute',
                        top: '4px', right: '-16px',
                        width: '18px', height: '257px',
                        background: `linear-gradient(to right, ${pageBg}, #f5e8c8, #ede0b8, ${pageBg})`,
                        borderRadius: '0 3px 3px 0',
                        transformStyle: 'preserve-3d',
                        transform: 'rotateY(90deg)',
                        transformOrigin: 'left center',
                    }}>
                        {Array.from({ length: 22 }, (_, i) => (
                            <div key={i} style={{
                                position: 'absolute',
                                top: `${6 + i * 11}px`,
                                left: '2px', right: '2px',
                                height: '0.6px',
                                background: 'rgba(140, 110, 60, 0.2)',
                            }} />
                        ))}
                    </div>

                    {/* Spine */}
                    <div style={{
                        position: 'absolute',
                        top: 0, left: '-20px',
                        width: '20px', height: '265px',
                        background: spineBg,
                        borderRadius: '3px 0 0 3px',
                        transformStyle: 'preserve-3d',
                        transform: 'rotateY(-90deg)',
                        transformOrigin: 'right center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            writingMode: 'vertical-rl',
                            textOrientation: 'mixed',
                            transform: 'rotate(180deg)',
                            fontFamily: 'var(--font-cinzel)',
                            fontSize: '7px',
                            letterSpacing: '0.18em',
                            color: `${goldColor}70`,
                            textTransform: 'uppercase',
                            userSelect: 'none',
                        }}>
                            Inner Ledger
                        </div>
                        {/* Gold spine line */}
                        <div style={{ position: 'absolute', top: '15px', bottom: '15px', left: '50%', width: '0.5px', background: `${goldColor}30`, transform: 'translateX(-50%)' }} />
                    </div>

                    {/* Main cover - exactly matching the screenshot/video */}
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: coverBg,
                        borderRadius: '2px 5px 5px 2px',
                        boxShadow: hovered
                            ? `0 0 60px ${goldGlow}, 0 20px 50px rgba(0,0,0,0.5), inset 0 0 80px rgba(0,0,0,0.35)`
                            : `0 0 30px ${goldGlow}, 0 15px 40px rgba(0,0,0,0.4), inset 0 0 80px rgba(0,0,0,0.4)`,
                        overflow: 'hidden',
                        transition: 'box-shadow 0.35s',
                    }}>
                        {/* Leather texture */}
                        <div style={{
                            position: 'absolute', inset: 0, opacity: 0.5,
                            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.07'/%3E%3C/svg%3E")`,
                        }} />

                        {/* Outer border - thin gold */}
                        <div style={{
                            position: 'absolute', inset: '12px',
                            border: `1px solid ${goldColor}50`,
                            borderRadius: '1px',
                            pointerEvents: 'none',
                        }} />
                        {/* Inner border */}
                        <div style={{
                            position: 'absolute', inset: '17px',
                            border: `0.5px solid ${goldColor}28`,
                            borderRadius: '1px',
                            pointerEvents: 'none',
                        }} />

                        {/* Corner ornaments - square brackets like the screenshot */}
                        {[
                            { top: '14px', left: '14px', borderTop: true, borderLeft: true },
                            { top: '14px', right: '14px', borderTop: true, borderRight: true },
                            { bottom: '14px', left: '14px', borderBottom: true, borderLeft: true },
                            { bottom: '14px', right: '14px', borderBottom: true, borderRight: true },
                        ].map((corner, i) => {
                            const { borderTop, borderLeft, borderRight, borderBottom, ...pos } = corner as any
                            return (
                                <div key={i} style={{
                                    position: 'absolute', ...pos,
                                    width: '14px', height: '14px',
                                    borderTop: borderTop ? `1.5px solid ${goldColor}65` : 'none',
                                    borderLeft: borderLeft ? `1.5px solid ${goldColor}65` : 'none',
                                    borderRight: borderRight ? `1.5px solid ${goldColor}65` : 'none',
                                    borderBottom: borderBottom ? `1.5px solid ${goldColor}65` : 'none',
                                    pointerEvents: 'none',
                                }} />
                            )
                        })}

                        {/* Central emblem - exactly matching the video: 4-pointed star + title */}
                        <div style={{
                            position: 'absolute',
                            top: '50%', left: '50%',
                            transform: 'translate(-50%, -58%)',
                            textAlign: 'center',
                            userSelect: 'none',
                        }}>
                            {/* 4-pointed star SVG - exact match to the video */}
                            <motion.svg
                                width="28" height="28" viewBox="0 0 28 28"
                                animate={{ opacity: [0.75, 1, 0.75] }}
                                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                                style={{ display: 'block', margin: '0 auto 8px', filter: `drop-shadow(0 0 6px ${goldColor}80)` }}
                            >
                                <path
                                    d="M14 1 L15.8 11.8 L26 14 L15.8 16.2 L14 27 L12.2 16.2 L2 14 L12.2 11.8 Z"
                                    fill={goldColor}
                                    opacity="0.9"
                                />
                            </motion.svg>

                            <div style={{
                                fontFamily: 'var(--font-cinzel)',
                                fontSize: '9px',
                                letterSpacing: '0.25em',
                                color: `${goldColor}90`,
                                textTransform: 'uppercase',
                                lineHeight: 1.7,
                            }}>
                                The<br />Inner<br />Ledger
                            </div>

                            {/* Short horizontal rule under title */}
                            <div style={{
                                width: '38px', height: '0.5px',
                                background: `${goldColor}55`,
                                margin: '8px auto 0',
                            }} />
                        </div>

                        {/* Year at bottom */}
                        <div style={{
                            position: 'absolute',
                            bottom: '24px', left: 0, right: 0,
                            textAlign: 'center',
                            fontFamily: 'var(--font-cinzel)',
                            fontSize: '8px',
                            letterSpacing: '0.28em',
                            color: `${goldColor}50`,
                            textTransform: 'uppercase',
                            userSelect: 'none',
                        }}>
                            {new Date().getFullYear()}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Pulsing ring affordance - like the video's subtle glow ring */}
            <AnimatePresence>
                {!clicked && (
                    <div style={{
                        position: 'absolute',
                        left: '50%', top: '44%',
                        transform: 'translate(-50%, -50%)',
                        pointerEvents: 'none',
                        zIndex: 5,
                    }}>
                        {[0, 0.8, 1.6].map((delay, i) => (
                            <motion.div
                                key={i}
                                style={{
                                    position: 'absolute',
                                    width: '300px', height: '360px',
                                    left: '-150px', top: '-180px',
                                    borderRadius: '6px',
                                    border: `1px solid ${goldColor}20`,
                                }}
                                animate={{ scale: [1, 1.18, 1.42], opacity: [0.35, 0.14, 0] }}
                                transition={{ duration: 2.8, delay, repeat: Infinity, ease: 'easeOut' }}
                            />
                        ))}
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}