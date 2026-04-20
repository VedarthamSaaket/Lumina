'use client'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

interface BookSceneProps {
    onBookClick: () => void
    onSkip: () => void
}

export default function BookScene({ onBookClick, onSkip }: BookSceneProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [hovered, setHovered] = useState(false)
    const [clicked, setClicked] = useState(false)

    // Ambient particle canvas (dust motes, candlelight feel)
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

        type Mote = { x: number; y: number; vx: number; vy: number; r: number; alpha: number; da: number }

        const motes: Mote[] = Array.from({ length: 55 }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 0.18,
            vy: -(Math.random() * 0.22 + 0.04),
            r: Math.random() * 1.5 + 0.3,
            alpha: Math.random() * 0.35 + 0.05,
            da: (Math.random() - 0.5) * 0.003,
        }))

        let frame = 0
        let raf: number

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            // Ambient warm glow - candlelight
            const cx = canvas.width * 0.5
            const cy = canvas.height * 0.42
            const flicker = Math.sin(frame * 0.04) * 0.08 + Math.sin(frame * 0.07) * 0.04
            const glowRadius = 380 + flicker * 80

            const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius)
            grd.addColorStop(0, `rgba(200, 120, 30, ${0.12 + flicker * 0.04})`)
            grd.addColorStop(0.4, `rgba(180, 100, 20, ${0.07 + flicker * 0.02})`)
            grd.addColorStop(1, 'rgba(0,0,0,0)')
            ctx.fillStyle = grd
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            // Dust motes
            for (const m of motes) {
                m.x += m.vx + Math.sin(frame * 0.01 + m.x * 0.01) * 0.04
                m.y += m.vy
                m.alpha += m.da
                if (m.alpha < 0.03) m.da = Math.abs(m.da)
                if (m.alpha > 0.4) m.da = -Math.abs(m.da)
                if (m.y < -5) { m.y = canvas.height + 5; m.x = Math.random() * canvas.width }

                ctx.beginPath()
                ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(212, 175, 55, ${m.alpha})`
                ctx.fill()
            }

            // Subtle desk surface line
            const deskY = canvas.height * 0.72
            const deskGrd = ctx.createLinearGradient(0, deskY - 2, 0, deskY + 80)
            deskGrd.addColorStop(0, 'rgba(180, 130, 60, 0.18)')
            deskGrd.addColorStop(0.3, 'rgba(120, 80, 30, 0.12)')
            deskGrd.addColorStop(1, 'rgba(0,0,0,0)')
            ctx.fillStyle = deskGrd
            ctx.fillRect(0, deskY, canvas.width, 80)

            frame++
            raf = requestAnimationFrame(draw)
        }

        draw()
        return () => {
            window.removeEventListener('resize', resize)
            cancelAnimationFrame(raf)
        }
    }, [])

    const handleClick = () => {
        setClicked(true)
        setTimeout(onBookClick, 320)
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', background: '#070300' }}>
            {/* Ambient canvas */}
            <canvas
                ref={canvasRef}
                style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
            />

            {/* Vignette overlay */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 30%, rgba(4,2,0,0.7) 100%)',
            }} />

            {/* The 3D Book - center of scene */}
            <div style={{
                position: 'absolute',
                left: '50%', top: '44%',
                transform: 'translate(-50%, -50%)',
                perspective: '1200px',
                zIndex: 10,
            }}>
                <motion.div
                    onClick={handleClick}
                    onHoverStart={() => setHovered(true)}
                    onHoverEnd={() => setHovered(false)}
                    animate={clicked ? { scale: 2.8, opacity: 0 } : hovered ? { scale: 1.04 } : { scale: 1 }}
                    transition={clicked ? { duration: 0.35, ease: [0.4, 0, 0.2, 1] } : { duration: 0.3 }}
                    style={{
                        cursor: 'pointer',
                        transformStyle: 'preserve-3d',
                        transform: 'rotateX(12deg) rotateY(-28deg)',
                        position: 'relative',
                        width: '180px',
                        height: '240px',
                    }}
                >
                    {/* Book shadow on desk */}
                    <div style={{
                        position: 'absolute',
                        bottom: '-28px', left: '10px',
                        width: '160px', height: '32px',
                        background: 'radial-gradient(ellipse, rgba(0,0,0,0.55) 0%, transparent 70%)',
                        transform: 'rotateX(-90deg) rotateY(0deg)',
                        transformOrigin: 'top center',
                        borderRadius: '50%',
                    }} />

                    {/* Book pages (right/bottom edge - cream stack) */}
                    <div style={{
                        position: 'absolute',
                        top: '3px', right: '-12px',
                        width: '14px', height: '234px',
                        background: 'linear-gradient(to right, #e8d8b0, #f0e6cc, #ece0c4, #e8d8b0)',
                        borderRadius: '0 2px 2px 0',
                        transformStyle: 'preserve-3d',
                        transform: 'rotateY(90deg)',
                        transformOrigin: 'left center',
                        boxShadow: 'inset -1px 0 4px rgba(0,0,0,0.15)',
                    }}>
                        {/* Page lines texture */}
                        {Array.from({ length: 18 }, (_, i) => (
                            <div key={i} style={{
                                position: 'absolute',
                                top: `${8 + i * 12}px`,
                                left: '2px', right: '2px',
                                height: '0.5px',
                                background: 'rgba(160, 120, 60, 0.22)',
                            }} />
                        ))}
                    </div>

                    {/* Book spine */}
                    <div style={{
                        position: 'absolute',
                        top: 0, left: '-18px',
                        width: '18px', height: '240px',
                        background: 'linear-gradient(to right, #1a0900, #2a1200, #1f0e00)',
                        borderRadius: '2px 0 0 2px',
                        transformStyle: 'preserve-3d',
                        transform: 'rotateY(-90deg)',
                        transformOrigin: 'right center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <div style={{
                            writingMode: 'vertical-rl',
                            textOrientation: 'mixed',
                            transform: 'rotate(180deg)',
                            fontFamily: 'var(--font-cinzel)',
                            fontSize: '8px',
                            letterSpacing: '0.15em',
                            color: 'rgba(212,175,55,0.6)',
                            textTransform: 'uppercase',
                        }}>
                            Inner Ledger
                        </div>
                    </div>

                    {/* Main cover - front face */}
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: `linear-gradient(135deg, 
              #1c0900 0%, 
              #2a1200 20%, 
              #331600 40%,
              #2a1000 60%,
              #1e0b00 80%,
              #150700 100%)`,
                        borderRadius: '2px 4px 4px 2px',
                        boxShadow: hovered
                            ? '0 0 40px rgba(212,175,55,0.22), inset 0 0 60px rgba(0,0,0,0.4)'
                            : 'inset 0 0 60px rgba(0,0,0,0.5)',
                        overflow: 'hidden',
                        transition: 'box-shadow 0.3s',
                    }}>
                        {/* Leather texture grain overlay */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
                            opacity: 0.6,
                        }} />

                        {/* Gold border frame */}
                        <div style={{
                            position: 'absolute',
                            inset: '10px',
                            border: '1px solid rgba(212,175,55,0.35)',
                            borderRadius: '2px',
                        }} />
                        <div style={{
                            position: 'absolute',
                            inset: '14px',
                            border: '0.5px solid rgba(212,175,55,0.18)',
                            borderRadius: '1px',
                        }} />

                        {/* Corner ornaments */}
                        {[
                            { top: '13px', left: '13px' },
                            { top: '13px', right: '13px' },
                            { bottom: '13px', left: '13px' },
                            { bottom: '13px', right: '13px' },
                        ].map((pos, i) => (
                            <div key={i} style={{
                                position: 'absolute', ...pos,
                                width: '12px', height: '12px',
                                border: '1px solid rgba(212,175,55,0.5)',
                                borderRadius: '1px',
                            }} />
                        ))}

                        {/* Central emblem */}
                        <div style={{
                            position: 'absolute',
                            top: '50%', left: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center',
                        }}>
                            <div style={{
                                fontFamily: 'var(--font-cinzel)',
                                fontSize: '28px',
                                color: 'rgba(212,175,55,0.7)',
                                marginBottom: '6px',
                                textShadow: '0 0 20px rgba(212,175,55,0.4)',
                                lineHeight: 1,
                            }}>✦</div>
                            <div style={{
                                fontFamily: 'var(--font-cinzel)',
                                fontSize: '9px',
                                letterSpacing: '0.25em',
                                color: 'rgba(212,175,55,0.65)',
                                textTransform: 'uppercase',
                                lineHeight: 1.4,
                            }}>
                                The<br />Inner<br />Ledger
                            </div>
                            <div style={{
                                marginTop: '6px',
                                width: '40px',
                                height: '0.5px',
                                background: 'rgba(212,175,55,0.4)',
                                margin: '6px auto 0',
                            }} />
                        </div>

                        {/* Bottom year text */}
                        <div style={{
                            position: 'absolute',
                            bottom: '22px', left: 0, right: 0,
                            textAlign: 'center',
                            fontFamily: 'var(--font-cinzel)',
                            fontSize: '7px',
                            letterSpacing: '0.3em',
                            color: 'rgba(212,175,55,0.4)',
                            textTransform: 'uppercase',
                        }}>
                            {new Date().getFullYear()}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Pulse ring affordance */}
            {!clicked && (
                <div style={{
                    position: 'absolute',
                    left: '50%', top: '44%',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 5,
                }}>
                    {[0, 0.6, 1.2].map(delay => (
                        <motion.div
                            key={delay}
                            style={{
                                position: 'absolute',
                                width: '280px', height: '320px',
                                left: '-140px', top: '-160px',
                                borderRadius: '4px',
                                border: '1px solid rgba(212,175,55,0.25)',
                            }}
                            animate={{ scale: [1, 1.2, 1.5], opacity: [0.4, 0.15, 0] }}
                            transition={{ duration: 2.5, delay, repeat: Infinity, ease: 'easeOut' }}
                        />
                    ))}
                </div>
            )}

            {/* Hint text */}
            {!clicked && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5, duration: 0.8 }}
                    style={{
                        position: 'absolute',
                        left: '50%', bottom: '22%',
                        transform: 'translateX(-50%)',
                        textAlign: 'center',
                        zIndex: 20,
                    }}
                >
                    <motion.p
                        animate={{ opacity: [0.4, 0.8, 0.4] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                            fontFamily: 'var(--font-eb-garamond)',
                            fontStyle: 'italic',
                            fontSize: '14px',
                            color: 'rgba(212,175,55,0.65)',
                            letterSpacing: '0.08em',
                        }}
                    >
                        Open your journal
                    </motion.p>
                    <motion.div
                        animate={{ y: [0, 5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ marginTop: '6px', fontSize: '16px', color: 'rgba(212,175,55,0.4)' }}
                    >
                        ↓
                    </motion.div>
                </motion.div>
            )}

            {/* Skip button */}
            <button
                onClick={() => { setClicked(true); setTimeout(onSkip, 200) }}
                style={{
                    position: 'absolute',
                    top: '80px', right: '24px',
                    fontFamily: 'var(--font-jost)',
                    fontSize: '11px',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'rgba(212,175,55,0.35)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'color 0.2s',
                    zIndex: 30,
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(212,175,55,0.7)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(212,175,55,0.35)')}
            >
                Skip →
            </button>
        </div>
    )
}