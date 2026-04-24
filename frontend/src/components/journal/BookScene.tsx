'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface BookScene3DProps {
    onBookClick: () => void
}

declare global {
    interface Window {
        THREE: any
        GLTFLoader: any
        __threeLoaded?: boolean
        __gltfLoaded?: boolean
    }
}

// Pre-load Three.js and GLTFLoader scripts before component mounts
function preloadScripts(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve()

    const threeUrl = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
    const gltfUrl = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js'

    const loadScript = (src: string, checkFn: () => boolean): Promise<void> => {
        return new Promise((resolve) => {
            if (checkFn()) { resolve(); return }
            const existing = document.querySelector(`script[src="${src}"]`)
            if (existing) {
                // Script tag exists - wait for it
                const checkInterval = setInterval(() => {
                    if (checkFn()) { clearInterval(checkInterval); resolve() }
                }, 50)
                setTimeout(() => { clearInterval(checkInterval); resolve() }, 5000)
                return
            }
            const s = document.createElement('script')
            s.src = src
            s.onload = () => resolve()
            s.onerror = () => resolve() // resolve even on error, we'll handle it
            document.head.appendChild(s)
        })
    }

    return loadScript(threeUrl, () => !!(window as any).THREE)
        .then(() => loadScript(gltfUrl, () => !!(window as any).THREE?.GLTFLoader))
}

// Start preloading immediately when this module loads
if (typeof window !== 'undefined') {
    preloadScripts()
}

export default function BookScene3D({ onBookClick }: BookScene3DProps) {
    const mountRef = useRef<HTMLDivElement>(null)
    const stateRef = useRef<{
        renderer: any; scene: any; camera: any; model: any
        mixer: any; clock: any; raf: number
        rotY: number; clicking: boolean; clickT: number; zoomT: number
        initScale: number; cancelled: boolean
    } | null>(null)
    const [phase, setPhase] = useState<'loading' | 'idle' | 'clicking' | 'flash'>('loading')
    const [headingRisen, setHeadingRisen] = useState(false)

    const setupScene = useCallback(async () => {
        if (!mountRef.current) return
        const container = mountRef.current

        // Wait for THREE to be available
        let attempts = 0
        while (!(window as any).THREE && attempts < 100) {
            await new Promise(r => setTimeout(r, 50))
            attempts++
        }

        const THREE = (window as any).THREE
        if (!THREE || stateRef.current?.cancelled) return

        const W = container.clientWidth || window.innerWidth
        const H = container.clientHeight || window.innerHeight

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.setSize(W, H)
        renderer.shadowMap.enabled = false // Disabled for better mobile perf
        renderer.outputEncoding = THREE.sRGBEncoding || 3001
        container.appendChild(renderer.domElement)

        const scene = new THREE.Scene()

        // Camera tilted slightly to see book from above and in front
        const camera = new THREE.PerspectiveCamera(42, W / H, 0.01, 500)
        camera.position.set(0, 0.6, 3.8)
        camera.lookAt(0, 0, 0)

        // Warm, moody lighting to make the book look aged and beautiful
        scene.add(new THREE.AmbientLight(0xfff0d0, 0.9))

        const key = new THREE.DirectionalLight(0xffc070, 2.8)
        key.position.set(2, 4, 3)
        scene.add(key)

        const fill = new THREE.DirectionalLight(0xd09060, 1.4)
        fill.position.set(-3, 1, 2)
        scene.add(fill)

        const rim = new THREE.DirectionalLight(0xffe0b0, 1.6)
        rim.position.set(0, -1.5, -4)
        scene.add(rim)

        const warmPt = new THREE.PointLight(0xd4af37, 3, 8)
        warmPt.position.set(1, 2, 2.5)
        scene.add(warmPt)

        const coolPt = new THREE.PointLight(0xc9897a, 1.8, 6)
        coolPt.position.set(-1.5, 0.5, 0.5)
        scene.add(coolPt)

        scene.add(new THREE.HemisphereLight(0xffe8cc, 0x2a1000, 0.7))

        const clock = new THREE.Clock()

        const s = {
            renderer, scene, camera,
            model: null as any, mixer: null as any, clock,
            raf: 0, rotY: -0.3, clicking: false, clickT: 0, zoomT: 0,
            initScale: 1, cancelled: false,
        }
        stateRef.current = s

        // Load GLTFLoader then GLB
        let gltfAttempts = 0
        while (!(window as any).THREE?.GLTFLoader && gltfAttempts < 100) {
            await new Promise(r => setTimeout(r, 50))
            gltfAttempts++
        }

        const Loader = THREE.GLTFLoader
        if (!Loader) {
            setPhase('idle')
            return
        }

        const loader = new Loader()
        loader.load(
            '/Hitem3d-1776860930240.glb',
            (gltf: any) => {
                if (s.cancelled) return
                const model = gltf.scene

                // Normalize size
                const box = new THREE.Box3().setFromObject(model)
                const center = box.getCenter(new THREE.Vector3())
                const size = box.getSize(new THREE.Vector3())
                const maxDim = Math.max(size.x, size.y, size.z)
                // Smaller scale — book should feel like it's resting on something
                const sc = 1.6 / maxDim
                model.scale.setScalar(sc)
                model.position.sub(center.multiplyScalar(sc))

                // Tilt backwards (around X axis) as if book is lying on a table
                // and slightly angled, not left/right
                model.rotation.x = 0.35  // tilt backwards
                model.rotation.y = s.rotY
                model.position.y -= 0.15

                s.initScale = sc
                s.model = model
                scene.add(model)

                if (gltf.animations?.length) {
                    s.mixer = new THREE.AnimationMixer(model)
                    gltf.animations.forEach((clip: any) => {
                        const action = s.mixer.clipAction(clip)
                        action.play()
                    })
                }

                if (!s.cancelled) setPhase('idle')
            },
            undefined,
            (err: any) => {
                console.warn('[BookScene] GLB load error:', err)
                if (!s.cancelled) setPhase('idle')
            }
        )

        const loop = () => {
            if (s.cancelled) return
            s.raf = requestAnimationFrame(loop)
            const dt = s.clock.getDelta()
            const el = s.clock.elapsedTime

            if (s.mixer) s.mixer.update(dt)

            if (s.model && !s.clicking) {
                // Slow, gentle rotation around Y, maintaining backward tilt
                s.rotY += dt * 0.25
                s.model.rotation.y = s.rotY
                s.model.position.y = -0.15 + Math.sin(el * 0.6) * 0.04
                // Very subtle rocking, no left/right tilt
                s.model.rotation.x = 0.35 + Math.sin(el * 0.4) * 0.02
            }

            if (s.model && s.clicking) {
                s.clickT = Math.min(s.clickT + dt * 2.5, 1)
                s.zoomT = Math.min(s.zoomT + dt * 2, 1)
                const ease = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
                // Open the book animation — tilt forward as if it's opening
                s.model.rotation.x = 0.35 - ease(s.clickT) * 0.55
                s.model.scale.setScalar(s.initScale * (1 + ease(s.zoomT) * 2.0))
                s.camera.position.z = 3.8 - ease(s.zoomT) * 3.2
                s.camera.lookAt(0, 0, 0)
            }

            renderer.render(scene, camera)
        }
        loop()

        const resize = () => {
            if (!container) return
            const w = container.clientWidth || window.innerWidth
            const h = container.clientHeight || window.innerHeight
            s.camera.aspect = w / h
            s.camera.updateProjectionMatrix()
            s.renderer.setSize(w, h)
        }
        window.addEventListener('resize', resize)

        return () => {
            window.removeEventListener('resize', resize)
        }
    }, [])

    useEffect(() => {
        let cleanupFn: (() => void) | undefined

        setupScene().then(fn => {
            cleanupFn = fn
        })

        return () => {
            if (stateRef.current) {
                stateRef.current.cancelled = true
                cancelAnimationFrame(stateRef.current.raf)
                try {
                    stateRef.current.renderer?.dispose()
                    const canvas = stateRef.current.renderer?.domElement
                    if (canvas?.parentNode) canvas.parentNode.removeChild(canvas)
                } catch { }
            }
            cleanupFn?.()
        }
    }, [setupScene])

    useEffect(() => {
        if (phase !== 'idle') return
        const t = setTimeout(() => setHeadingRisen(true), 1800)
        return () => clearTimeout(t)
    }, [phase])

    const handleClick = useCallback(() => {
        if (phase !== 'idle') return
        if (stateRef.current) stateRef.current.clicking = true
        setPhase('clicking')

        setTimeout(() => {
            setPhase('flash')
            setTimeout(() => onBookClick(), 750)
        }, 1100)
    }, [phase, onBookClick])

    return (
        <div
            onClick={handleClick}
            style={{
                position: 'fixed', inset: 0, zIndex: 100, overflow: 'hidden',
                cursor: phase === 'idle' ? 'pointer' : 'default',
                background: 'radial-gradient(ellipse 80% 70% at 50% 52%, #1c0e04 0%, #0d0501 55%, #050200 100%)',
            }}
        >
            <div ref={mountRef} style={{ position: 'absolute', inset: 0, zIndex: 2 }} />

            {/* Ambient glow */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
                background: 'radial-gradient(ellipse 60% 50% at 50% 55%, rgba(212,175,55,0.14) 0%, rgba(201,137,122,0.07) 45%, transparent 75%)',
            }} />

            {/* Vignette */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3,
                background: [
                    'linear-gradient(to bottom, rgba(5,2,0,0.78) 0%, rgba(5,2,0,0.14) 18%, transparent 35%, transparent 68%, rgba(5,2,0,0.65) 100%)',
                    'linear-gradient(to right, rgba(5,2,0,0.55) 0%, transparent 13%, transparent 87%, rgba(5,2,0,0.55) 100%)',
                ].join(', '),
            }} />

            {/* Loading */}
            {phase === 'loading' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 15 }}>
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                        style={{ width: '42px', height: '42px', borderRadius: '50%', border: '2px solid rgba(212,175,55,0.12)', borderTopColor: 'rgba(212,175,55,0.72)', marginBottom: '14px' }}
                    />
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(212,175,55,0.35)' }}>Opening the ledger...</span>
                </div>
            )}

            {/* Heading rises up as book settles */}
            <AnimatePresence>
                {(phase === 'idle' || phase === 'clicking') && (
                    <motion.div
                        key="heading"
                        initial={{ opacity: 0, y: 0 }}
                        animate={{ opacity: 1, y: headingRisen ? '-28vh' : 0 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{
                            opacity: { duration: 1.0, delay: 0.3 },
                            y: { duration: 1.4, ease: [0.25, 0.46, 0.45, 0.94] },
                        }}
                        style={{
                            position: 'absolute', top: '50%', left: 0, right: 0,
                            transform: 'translateY(-50%)',
                            textAlign: 'center', zIndex: 20, pointerEvents: 'none',
                            padding: '0 24px',
                        }}
                    >
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
                            fontWeight: 400, fontStyle: 'italic',
                            fontSize: 'clamp(3rem, 7vw, 5.5rem)',
                            margin: '0 0 12px', letterSpacing: '0.02em',
                            color: 'rgba(254,244,228,0.95)', lineHeight: 1.1,
                            textShadow: '0 2px 60px rgba(0,0,0,0.85)',
                        }}>
                            The Inner{' '}
                            <span style={{
                                background: 'linear-gradient(90deg, #b8860b 0%, #d4af37 30%, #f9e07a 55%, #d4af37 78%, #b8860b 100%)',
                                backgroundSize: '220% auto',
                                WebkitBackgroundClip: 'text', backgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                animation: 'textShimmer 4s linear infinite',
                            }}>Ledger</span>
                        </h1>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.1, duration: 0.9 }}
                            style={{
                                fontFamily: "'Cormorant Garamond', serif",
                                fontStyle: 'italic', fontWeight: 300,
                                fontSize: 'clamp(1rem, 2vw, 1.3rem)',
                                color: 'rgba(212,175,55,0.65)',
                                letterSpacing: '0.06em', margin: 0,
                                textShadow: '0 1px 28px rgba(0,0,0,0.75)',
                            }}
                        >
                            A sanctuary for the examined life
                        </motion.p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Click hint */}
            <AnimatePresence>
                {phase === 'idle' && headingRisen && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                        style={{
                            position: 'absolute', bottom: '9%', left: 0, right: 0,
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            pointerEvents: 'none', zIndex: 20,
                        }}
                    >
                        <motion.div
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                            style={{ fontFamily: "'Cinzel', serif", fontSize: '9px', letterSpacing: '0.32em', textTransform: 'uppercase', color: 'rgba(212,175,55,0.65)' }}
                        >
                            Click to open your journal
                        </motion.div>
                        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '5px' }}>
                            {[0, 0.4, 0.8].map((d, i) => (
                                <motion.div key={i}
                                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 1.6, delay: d, repeat: Infinity }}
                                    style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(212,175,55,0.55)' }}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Flash transition */}
            <AnimatePresence>
                {phase === 'flash' && (
                    <>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.2 }}
                            animate={{ opacity: [0, 0.85, 1], scale: [0.2, 1.5, 2.5] }}
                            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                            style={{
                                position: 'absolute', inset: 0, zIndex: 30, pointerEvents: 'none',
                                background: 'radial-gradient(ellipse 45% 40% at 50% 52%, #ffffff 0%, rgba(255,255,255,0.88) 38%, rgba(255,255,255,0) 72%)',
                            }}
                        />
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0, 0.92, 1] }}
                            transition={{ duration: 0.75, times: [0, 0.45, 0.82, 1] }}
                            style={{ position: 'absolute', inset: 0, zIndex: 31, background: '#ffffff', pointerEvents: 'none' }}
                        />
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}