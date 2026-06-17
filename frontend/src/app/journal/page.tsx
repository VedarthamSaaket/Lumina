'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navigation } from '@/components/layout/Navigation'
import { useThemeStore } from '@/lib/themeStore'
import { ParticleCanvas } from '@/components/ui/ParticleCanvas'
import dynamic from 'next/dynamic'
import { journalAPI, moodAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import type { Sticker } from '@/components/journal/JournalStickers'
import Grainient from '@/components/ui/Grainient'
import { GoldHeading } from '@/components/ui/GoldHeading'

const OpenBook = dynamic(() => import('@/components/journal/OpenBook'), { ssr: false })

type Stage = 'scene' | 'open'

interface JournalEntry {
    id: string
    content: string
    mood_score?: number
    tags?: string[]
    created_at: string
    stickers?: (Sticker & { x: number; y: number; scale: number; stickerId: string })[]
}

// ─── BOOK SCENE ──────────────────────────────────────────────────────────────
function BookScene({ onBookClick }: { onBookClick: () => void }) {
    const [phase, setPhase] = useState<'loading' | 'idle' | 'clicking' | 'flash'>('loading')
    const [headingRisen, setHeadingRisen] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const isHoveredRef = useRef(false)
    const mountRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        let cancelled = false
        const container = mountRef.current
        if (!container) { setPhase('idle'); return }

        const loadScript = (src: string): Promise<void> =>
            new Promise((resolve, reject) => {
                if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
                const s = document.createElement('script')
                s.src = src
                s.onload = () => resolve()
                s.onerror = reject
                document.head.appendChild(s)
            })

        const bootstrap = async () => {
            try {
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js')
                if (cancelled) return
                const THREE = (window as any).THREE
                if (!THREE) { setPhase('idle'); return }

                const W = container.clientWidth || window.innerWidth
                const H = container.clientHeight || window.innerHeight

                const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
                renderer.setSize(W, H)
                renderer.shadowMap.enabled = true
                container.appendChild(renderer.domElement)

                const scene = new THREE.Scene()
                // Slightly below front, looking up a little, since the book now tips
                // its TOP edge toward the viewer (bottom leans away).
                const camera = new THREE.PerspectiveCamera(42, W / H, 0.01, 500)
                camera.position.set(0, -0.6, 5.0)
                camera.lookAt(0, 0.1, 0)

                // Warm amber/gold lighting for aged book look
                scene.add(new THREE.AmbientLight(0xfff0d0, 1.2))
                const key = new THREE.DirectionalLight(0xffc070, 3.2)
                key.position.set(2, 5, 4); scene.add(key)
                const fill = new THREE.DirectionalLight(0xd09060, 1.6)
                fill.position.set(-3, 1, 2); scene.add(fill)
                const rim = new THREE.DirectionalLight(0xffe0b0, 1.8)
                rim.position.set(0, -2, -5); scene.add(rim)
                const warmPt = new THREE.PointLight(0xd4af37, 4, 10)
                warmPt.position.set(1.5, 3, 2.5); scene.add(warmPt)
                scene.add(new THREE.HemisphereLight(0xffe8cc, 0x2a1000, 0.8))

                const clock = new THREE.Clock()
                let model: any = null
                let mixer: any = null
                let clicking = false
                let clickT = 0
                let zoomT = 0
                let initScale = 1
                let raf = 0

                const loadGLB = async () => {
                    try {
                        await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js')
                        if (cancelled) return
                        const Loader = (window as any).THREE?.GLTFLoader
                        if (!Loader) { setPhase('idle'); return }

                        const loader = new Loader()
                        loader.load(
                            '/Hitem3d-1776860930240.glb',
                            (gltf: any) => {
                                if (cancelled) return
                                const m = gltf.scene
                                const box = new THREE.Box3().setFromObject(m)
                                const center = box.getCenter(new THREE.Vector3())
                                const size = box.getSize(new THREE.Vector3())
                                const maxDim = Math.max(size.x, size.y, size.z)
                                const sc = 1.4 / maxDim
                                m.scale.setScalar(sc)
                                m.position.sub(center.multiplyScalar(sc))
                                // Open book with its TOP edge pulled toward the viewer
                                // (bottom tips back), opening the spread down to the
                                // slightly-lowered camera. ~-30deg.
                                m.rotation.x = -30 * (Math.PI / 180)
                                m.rotation.y = 0
                                m.rotation.z = 0
                                m.position.y -= 0.1
                                initScale = sc
                                model = m
                                scene.add(model)
                                if (gltf.animations?.length) {
                                    mixer = new THREE.AnimationMixer(model)
                                    gltf.animations.forEach((clip: any) => mixer.clipAction(clip).play())
                                }
                                if (!cancelled) setPhase('idle')
                            },
                            undefined,
                            () => { if (!cancelled) setPhase('idle') }
                        )
                    } catch { if (!cancelled) setPhase('idle') }
                }

                loadGLB()

                // Open book with its TOP edge pulled toward the viewer (bottom tips
                // back). Single source of truth for its resting orientation.
                const baseRotX = -30 * (Math.PI / 180)

                const loop = () => {
                    if (cancelled) return
                    raf = requestAnimationFrame(loop)
                    const dt = clock.getDelta()
                    const el = clock.elapsedTime
                    if (mixer) mixer.update(dt)
                    if (model && !clicking) {
                        // No carousel spin and NO hover reaction, the book holds its
                        // upward-facing pose. Only a gentle float + breathing sway so
                        // it stays alive without ever turning edge-on to the viewer.
                        model.position.y = -0.1 + Math.sin(el * 0.7) * 0.05
                        model.rotation.x = baseRotX + Math.sin(el * 0.45) * 0.025
                        model.rotation.y = Math.sin(el * 0.32) * 0.06
                        model.rotation.z = Math.sin(el * 0.5) * 0.015
                        model.scale.setScalar(initScale)
                    }
                    if (model && clicking) {
                        clickT = Math.min(clickT + dt * 2.8, 1)
                        zoomT = Math.min(zoomT + dt * 2.0, 1)
                        const ease = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
                        // Lift the spread upright toward the lens and zoom in, as if
                        // the book is opening straight into the reader's hands.
                        model.rotation.x = baseRotX - ease(clickT) * (baseRotX - 0.15)
                        model.rotation.y = 0
                        model.rotation.z = 0
                        model.scale.setScalar(initScale * (1 + ease(zoomT) * 4.2))
                        camera.position.y = -0.6 + ease(zoomT) * 0.6
                        camera.position.z = 5.0 - ease(zoomT) * 4.2
                        camera.lookAt(0, 0, 0)
                    }
                    renderer.render(scene, camera)
                }
                loop()

                const resize = () => {
                    if (!container) return
                    const w = container.clientWidth, h = container.clientHeight
                    camera.aspect = w / h; camera.updateProjectionMatrix()
                    renderer.setSize(w, h)
                }
                window.addEventListener('resize', resize)

                return () => {
                    window.removeEventListener('resize', resize)
                    cancelAnimationFrame(raf)
                    renderer.dispose()
                    const canvas = renderer.domElement
                    if (canvas?.parentNode) canvas.parentNode.removeChild(canvas)
                }
            } catch { if (!cancelled) setPhase('idle') }
        }

        let cleanup: (() => void) | undefined
        bootstrap().then(fn => { cleanup = fn })
        return () => {
            cancelled = true
            cleanup?.()
        }
    }, [])

    // Heading rises UP when book settles - after 1.5s idle
    useEffect(() => {
        if (phase !== 'idle') return
        const t = setTimeout(() => setHeadingRisen(true), 1400)
        return () => clearTimeout(t)
    }, [phase])

    const handleClick = () => {
        if (phase !== 'idle') return
        setPhase('clicking')
        setTimeout(() => {
            setPhase('flash')
            setTimeout(() => onBookClick(), 750)
        }, 1000)
    }

    return (
        <div 
            onClick={handleClick} 
            onMouseEnter={() => { setIsHovered(true); isHoveredRef.current = true; }}
            onMouseLeave={() => { setIsHovered(false); isHoveredRef.current = false; }}
            style={{
                position: 'fixed', inset: 0, zIndex: 100, overflow: 'hidden',
                cursor: phase === 'idle' ? 'pointer' : 'default',
                perspective: '1000px',
                transformStyle: 'preserve-3d',
            }}
        >
            <div ref={mountRef} style={{ position: 'absolute', inset: 0, zIndex: 2 }} />

            {/* Dynamic soft shadow shift beneath the book */}
            <div style={{
                position: 'absolute', left: '50%', top: '65%',
                width: '340px', height: '40px',
                transform: `translate(-50%, -50%) scale(${isHovered ? 1.05 : 1})`,
                background: 'radial-gradient(ellipse at center, rgba(10,5,0,0.6) 0%, rgba(10,5,0,0) 70%)',
                pointerEvents: 'none', zIndex: 1,
                opacity: phase === 'idle' ? (isHovered ? 0.8 : 0.4) : 0,
                transition: 'all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)',
                willChange: 'transform, opacity'
            }} />

            {/* Loading spinner */}
            {phase === 'loading' && (
                <div style={{
                    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', zIndex: 15,
                }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                        style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            border: '2px solid rgba(212,175,55,0.12)',
                            borderTopColor: 'rgba(212,175,55,0.65)', marginBottom: '14px',
                        }} />
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(212,175,55,0.32)' }}>Loading</span>
                </div>
            )}

            {/* HEADING, displays at top and animates down */}
            <AnimatePresence>
                {(phase === 'idle' || phase === 'clicking') && (
                    <div className="relative z-10 pt-24 pb-20 px-5 max-w-3xl mx-auto pointer-events-none">
                        <motion.div
                            key="heading"
                            initial={{ opacity: 0, y: 28 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="text-center mb-12 pointer-events-auto"
                        >
                            <GoldHeading prefix="The Inner" gold="Ledger" size="clamp(2.5rem,6vw,5rem)" />
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1.2, duration: 0.8 }}
                                className="font-display italic text-lg mt-3"
                                style={{
                                    color: 'var(--text-secondary)', 
                                    fontWeight: 300,
                                    textShadow: '0 1px 24px rgba(0,0,0,0.8)',
                                }}
                            >
                                A sanctuary for the examined life
                            </motion.p>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Click hint, appears below the book */}
            <AnimatePresence>
                {phase === 'idle' && headingRisen && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                        style={{
                            position: 'absolute', bottom: '8%', left: 0, right: 0,
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            pointerEvents: 'none', zIndex: 20,
                        }}
                    >
                        <motion.div
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                            style={{
                                fontFamily: "'Cinzel', serif", fontSize: '9px',
                                letterSpacing: '0.32em', textTransform: 'uppercase',
                                color: 'rgba(212,175,55,0.60)',
                            }}
                        >
                            Click to Open Your Journal
                        </motion.div>
                        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '5px' }}>
                            {[0, 0.4, 0.8].map((d, i) => (
                                <motion.div key={i}
                                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 1.6, delay: d, repeat: Infinity }}
                                    style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(212,175,55,0.52)' }}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Flash overlay */}
            <AnimatePresence>
                {phase === 'flash' && (
                    <>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: [0, 1, 1], scale: [0.5, 2.5, 4] }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            style={{
                                position: 'absolute', inset: 0, zIndex: 998, pointerEvents: 'none',
                                background: 'radial-gradient(circle at 50% 50%, #ffffff 0%, rgba(255,255,255,0.9) 40%, rgba(255,255,255,0) 80%)',
                            }}
                        />
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            style={{ position: 'fixed', inset: 0, zIndex: 999, background: '#ffffff', pointerEvents: 'none' }}
                        />
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}

export default function JournalPage() {
    const [stage, setStage] = useState<Stage>('scene')
    const [entries, setEntries] = useState<JournalEntry[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const { theme } = useThemeStore()
    const isDark = theme === 'dark'

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

    const handleDelete = async (id: string) => {
        try {
            await journalAPI.delete(id)
            setEntries(prev => prev.filter(e => e.id !== id))
            toast.success('Entry removed', {
                style: {
                    background: 'rgba(20,10,0,0.95)',
                    color: '#d4af37',
                    border: '1px solid rgba(212,175,55,0.3)',
                    fontFamily: 'var(--font-cinzel)',
                    fontSize: '11px',
                    letterSpacing: '0.15em',
                },
            })
        } catch (err: any) {
            const msg = err?.response?.data?.detail ?? 'Could not delete entry.'
            toast.error(msg)
        }
    }

    const handleSave = async (content: string, mood: number, tags: string[], stickers: any[]) => {
        setIsSaving(true)
        try {
            await Promise.all([
                journalAPI.create(content, mood, tags, stickers),
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
        <main className="bg-chat min-h-screen relative overflow-hidden">
            <ParticleCanvas colors={['#d4af37', '#f5ead8', '#b8860b']} count={18} />
            {!isDark && <Grainient color1="#c4a882" color2="#f5e6c8" color3="#7a5c38" timeSpeed={0.12} grainAmount={0.07} contrast={1.3} saturation={0.8} className="grainient-background" />}

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

                        {/* Centered heading - properly positioned below Navigation */}
                        <div style={{
                            position: 'absolute',
                            top: '12px',
                            left: 0,
                            right: 0,
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
                            onDelete={handleDelete}
                            onClose={() => setStage('scene')}
                            isSaving={isSaving}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    )
}