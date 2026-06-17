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
    }
}

// Returns a promise that resolves once a script is loaded, injecting it if needed.
// No cap on retries, polls until the check passes or the script fires onload.
function loadScript(src: string, check: () => boolean): Promise<void> {
    return new Promise((resolve) => {
        if (check()) { resolve(); return }

        // If the tag already exists, just wait for it
        const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null
        if (existing) {
            if (check()) { resolve(); return }
            const poll = setInterval(() => { if (check()) { clearInterval(poll); resolve() } }, 100)
            return
        }

        const s = document.createElement('script')
        s.src = src
        s.onload = () => {
            // Give the script a tick to execute before resolving
            setTimeout(resolve, 0)
        }
        s.onerror = () => {
            console.error('[BookScene] Failed to load script:', src)
            resolve() // resolve anyway so we can show an error state
        }
        document.head.appendChild(s)
    })
}

async function loadThreeAndGLTF(): Promise<boolean> {
    await loadScript(
        'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
        () => !!(window as any).THREE
    )
    if (!(window as any).THREE) return false

    await loadScript(
        'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js',
        () => !!(window as any).THREE?.GLTFLoader
    )
    return !!(window as any).THREE?.GLTFLoader
}

// Kick off loading immediately when module is parsed (best-effort preload)
let preloadPromise: Promise<boolean> | null = null
if (typeof window !== 'undefined') {
    preloadPromise = loadThreeAndGLTF()
}

export default function BookScene3D({ onBookClick }: BookScene3DProps) {
    const mountRef = useRef<HTMLDivElement>(null)
    const stateRef = useRef<{
        renderer: any; scene: any; camera: any; model: any
        clock: any; raf: number
        clicking: boolean; clickT: number; zoomT: number
        initScale: number; cancelled: boolean
    } | null>(null)
    const [phase, setPhase] = useState<'loading' | 'idle' | 'clicking' | 'flash'>('loading')
    const [headingRisen, setHeadingRisen] = useState(false)

    const setupScene = useCallback(async (getIsCancelled: () => boolean) => {
        if (!mountRef.current) return
        const container = mountRef.current

        // Wait for THREE + GLTFLoader, reuse the preload promise if it exists,
        // otherwise kick off a fresh load. This handles the first-visit case where
        // the module-level preload may not have run yet (SSR, cold cache, etc.)
        const ready = preloadPromise
            ? await preloadPromise
            : await loadThreeAndGLTF()

        if (getIsCancelled()) return

        if (!ready) {
            setPhase('idle')
            return
        }

        const THREE = (window as any).THREE
        if (!THREE) { setPhase('idle'); return }

        const W = container.clientWidth || window.innerWidth
        const H = container.clientHeight || window.innerHeight

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.setSize(W, H)
        renderer.shadowMap.enabled = false
        renderer.outputEncoding = THREE.sRGBEncoding || 3001
        container.appendChild(renderer.domElement)

        const scene = new THREE.Scene()

        const camera = new THREE.PerspectiveCamera(42, W / H, 0.01, 500)
        // Raised and pulled back so we look DOWN onto the open book, as if it
        // were lying open on an invisible surface and we're reading over it.
        camera.position.set(0, 2.6, 3.2)
        camera.lookAt(0, -0.1, 0)

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
            model: null as any, clock,
            raf: 0, clicking: false, clickT: 0, zoomT: 0,
            initScale: 1, cancelled: false,
        }
        stateRef.current = s

        const loader = new THREE.GLTFLoader()
        loader.load(
            '/Hitem3d-1776860930240.glb',
            (gltf: any) => {
                if (s.cancelled) return
                const model = gltf.scene

                const box = new THREE.Box3().setFromObject(model)
                const center = box.getCenter(new THREE.Vector3())
                const size = box.getSize(new THREE.Vector3())
                const maxDim = Math.max(size.x, size.y, size.z)
                const sc = 1.6 / maxDim
                model.scale.setScalar(sc)
                model.position.sub(center.multiplyScalar(sc))

                // Book pages face +Z (toward camera) in local space.
                // To make it read as an open book lying flat and FACING UPWARD,
                // we tip it back ~90deg around X so the open spread points at the
                // sky. The camera (raised above) then looks down onto the pages.
                // Math.PI / 2 = exactly flat; we ease it just under so the far
                // page edge stays visible and the spine reads with depth.
                model.rotation.x = Math.PI / 2 - 0.18   // ~80deg back -> faces up
                model.rotation.y = 0                     // squared to the viewer
                model.rotation.z = 0
                model.position.y -= 0.1

                s.initScale = sc
                s.model = model
                scene.add(model)

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

            // Base orientation: book lies open, facing up toward the camera.
            const baseRotX = Math.PI / 2 - 0.18

            if (s.model && !s.clicking) {
                // No carousel spin. Just a gentle float + breathing sway so the
                // open pages stay facing up and never turn edge-on to the viewer.
                s.model.position.y = -0.1 + Math.sin(el * 0.7) * 0.05
                s.model.rotation.x = baseRotX + Math.sin(el * 0.45) * 0.025
                s.model.rotation.y = Math.sin(el * 0.32) * 0.06
                s.model.rotation.z = Math.sin(el * 0.5) * 0.015
            }

            if (s.model && s.clicking) {
                s.clickT = Math.min(s.clickT + dt * 2.5, 1)
                s.zoomT = Math.min(s.zoomT + dt * 2, 1)
                const ease = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
                // On click, lift the spread upright toward the lens and zoom in,
                // as if the book is opening straight into the reader's face.
                s.model.rotation.x = baseRotX - ease(s.clickT) * (baseRotX - 0.15)
                s.model.rotation.y = 0
                s.model.rotation.z = 0
                s.model.scale.setScalar(s.initScale * (1 + ease(s.zoomT) * 2.0))
                s.camera.position.y = 2.6 - ease(s.zoomT) * 2.5
                s.camera.position.z = 3.2 - ease(s.zoomT) * 2.6
                s.camera.lookAt(0, -0.1, 0)
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

        return () => { window.removeEventListener('resize', resize) }
    }, [])

    useEffect(() => {
        let isCancelled = false
        const getIsCancelled = () => isCancelled

        let cleanupFn: (() => void) | undefined
        
        setupScene(getIsCancelled).then(fn => { 
            if (isCancelled && fn) {
                fn()
            } else {
                cleanupFn = fn 
            }
        })

        return () => {
            isCancelled = true
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

            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
                background: 'radial-gradient(ellipse 60% 50% at 50% 55%, rgba(212,175,55,0.14) 0%, rgba(201,137,122,0.07) 45%, transparent 75%)',
            }} />

            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3,
                background: [
                    'linear-gradient(to bottom, rgba(5,2,0,0.78) 0%, rgba(5,2,0,0.14) 18%, transparent 35%, transparent 68%, rgba(5,2,0,0.65) 100%)',
                    'linear-gradient(to right, rgba(5,2,0,0.55) 0%, transparent 13%, transparent 87%, rgba(5,2,0,0.55) 100%)',
                ].join(', '),
            }} />

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