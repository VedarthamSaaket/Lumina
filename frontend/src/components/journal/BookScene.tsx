'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface BookScene3DProps {
    onBookClick: () => void
}

declare global {
    interface Window {
        THREE: any
        __threeLoaded?: boolean
    }
}

function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
        const s = document.createElement('script')
        s.src = src
        s.onload = () => resolve()
        s.onerror = reject
        document.head.appendChild(s)
    })
}

export default function BookScene3D({ onBookClick }: BookScene3DProps) {
    const mountRef = useRef<HTMLDivElement>(null)
    const stateRef = useRef<{
        renderer: any; scene: any; camera: any; model: any
        mixer: any; clock: any; raf: number
        rotY: number; clicking: boolean; clickT: number; zoomT: number
        bobT: number; initScale: number
    } | null>(null)
    const [phase, setPhase] = useState<'loading' | 'idle' | 'clicking' | 'flash' | 'done'>('loading')
    const [headingRisen, setHeadingRisen] = useState(false)

    useEffect(() => {
        let cancelled = false

        const bootstrap = async () => {
            try {
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js')
                if (cancelled) return
                const THREE = window.THREE
                if (!THREE || !mountRef.current) return

                const container = mountRef.current
                const W = container.clientWidth || window.innerWidth
                const H = container.clientHeight || window.innerHeight

                const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
                renderer.setSize(W, H)
                renderer.shadowMap.enabled = true
                container.appendChild(renderer.domElement)

                const scene = new THREE.Scene()
                const camera = new THREE.PerspectiveCamera(45, W / H, 0.01, 500)
                camera.position.set(0, 0.4, 4.5)
                camera.lookAt(0, 0, 0)

                scene.add(new THREE.AmbientLight(0xfff8e7, 1.4))
                const key = new THREE.DirectionalLight(0xffd080, 3.8)
                key.position.set(3, 5, 4)
                scene.add(key)
                const fill = new THREE.DirectionalLight(0xc8a060, 1.8)
                fill.position.set(-4, 2, 3)
                scene.add(fill)
                const rim = new THREE.DirectionalLight(0xffe4b5, 2.0)
                rim.position.set(0, -2, -5)
                scene.add(rim)
                const pt1 = new THREE.PointLight(0xd4af37, 5, 10)
                pt1.position.set(1.5, 2, 3)
                scene.add(pt1)
                const pt2 = new THREE.PointLight(0xc9897a, 3, 8)
                pt2.position.set(-2, 1, 1)
                scene.add(pt2)
                scene.add(new THREE.HemisphereLight(0xfff0cc, 0x3d2008, 0.9))

                const clock = new THREE.Clock()

                const s: typeof stateRef.current = {
                    renderer, scene, camera, model: null,
                    mixer: null, clock, raf: 0,
                    rotY: 0, clicking: false, clickT: 0, zoomT: 0,
                    bobT: 0, initScale: 1
                }
                stateRef.current = s

                const glbUrl = '/Hitem3d-1776860930240.glb'

                const loadGLB = async () => {
                    const loaderSrc = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js'
                    await loadScript(loaderSrc)
                    if (cancelled) return

                    const Loader = (window as any).THREE?.GLTFLoader
                    if (!Loader) {
                        setPhase('idle')
                        return
                    }

                    const loader = new Loader()
                    loader.load(
                        glbUrl,
                        (gltf: any) => {
                            if (cancelled || !s) return
                            const model = gltf.scene

                            const box = new THREE.Box3().setFromObject(model)
                            const center = box.getCenter(new THREE.Vector3())
                            const size = box.getSize(new THREE.Vector3())
                            const maxDim = Math.max(size.x, size.y, size.z)
                            const sc = 2.4 / maxDim
                            model.scale.setScalar(sc)
                            model.position.sub(center.multiplyScalar(sc))
                            model.position.y -= 0.05

                            s.initScale = sc
                            s.model = model
                            scene.add(model)

                            if (gltf.animations?.length) {
                                s.mixer = new THREE.AnimationMixer(model)
                                gltf.animations.forEach((clip: any) => s.mixer.clipAction(clip).play())
                            }

                            if (!cancelled) setPhase('idle')
                        },
                        undefined,
                        () => { if (!cancelled) setPhase('idle') }
                    )
                }

                loadGLB()

                const loop = () => {
                    if (!s) return
                    s.raf = requestAnimationFrame(loop)
                    const dt = s.clock.getDelta()
                    const el = s.clock.elapsedTime

                    if (s.mixer) s.mixer.update(dt)

                    if (s.model && !s.clicking) {
                        s.rotY += dt * 0.5
                        s.model.rotation.y = s.rotY
                        s.model.position.y = -0.05 + Math.sin(el * 0.8) * 0.05
                        s.model.rotation.x = Math.sin(el * 0.55) * 0.04
                        s.model.rotation.z = Math.sin(el * 0.35) * 0.015
                    }

                    if (s.model && s.clicking) {
                        s.clickT = Math.min(s.clickT + dt * 3, 1)
                        s.zoomT = Math.min(s.zoomT + dt * 2.2, 1)
                        const ease = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
                        const tilt = ease(s.clickT)
                        const zoom = ease(s.zoomT)
                        s.model.rotation.x = tilt * 0.85
                        const newScale = s.initScale * (1 + zoom * 2.2)
                        s.model.scale.setScalar(newScale)
                        s.camera.position.z = 4.5 - zoom * 3.8
                        s.camera.lookAt(0, 0, 0)
                    }

                    renderer.render(scene, camera)
                }
                loop()

                const resize = () => {
                    if (!container || !s) return
                    const w = container.clientWidth, h = container.clientHeight
                    s.camera.aspect = w / h
                    s.camera.updateProjectionMatrix()
                    s.renderer.setSize(w, h)
                }
                window.addEventListener('resize', resize)

                return () => { window.removeEventListener('resize', resize) }

            } catch (e) {
                if (!cancelled) setPhase('idle')
            }
        }

        const cleanup = bootstrap()

        return () => {
            cancelled = true
            if (stateRef.current) {
                cancelAnimationFrame(stateRef.current.raf)
                stateRef.current.renderer?.dispose()
                const canvas = stateRef.current.renderer?.domElement
                if (canvas?.parentNode) canvas.parentNode.removeChild(canvas)
            }
            cleanup.then(fn => fn?.())
        }
    }, [])

    useEffect(() => {
        if (phase !== 'idle') return
        const t = setTimeout(() => setHeadingRisen(true), 1800)
        return () => clearTimeout(t)
    }, [phase])

    const handleClick = useCallback(() => {
        if (phase !== 'idle') return
        if (stateRef.current) {
            stateRef.current.clicking = true
        }
        setPhase('clicking')

        setTimeout(() => {
            setPhase('flash')
            setTimeout(() => {
                setPhase('done')
                onBookClick()
            }, 750)
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

            {/* Loading */}
            {phase === 'loading' && (
                <div style={{
                    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', zIndex: 15,
                }}>
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                        style={{
                            width: '42px', height: '42px', borderRadius: '50%',
                            border: '2px solid rgba(212,175,55,0.12)',
                            borderTopColor: 'rgba(212,175,55,0.72)',
                            marginBottom: '14px',
                        }}
                    />
                    <span style={{
                        fontFamily: "'Cinzel', serif", fontSize: '9px',
                        letterSpacing: '0.28em', textTransform: 'uppercase',
                        color: 'rgba(212,175,55,0.35)',
                    }}>Loading</span>
                </div>
            )}

            {/* Heading */}
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
                            position: 'absolute', top: '50%', left: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center', zIndex: 20,
                            pointerEvents: 'none', width: '100%', padding: '0 24px',
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
                            position: 'absolute', bottom: '9%', left: '50%',
                            transform: 'translateX(-50%)',
                            pointerEvents: 'none', textAlign: 'center', zIndex: 20,
                        }}
                    >
                        <motion.div
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                            style={{
                                fontFamily: "'Cinzel', serif", fontSize: '9px',
                                letterSpacing: '0.32em', textTransform: 'uppercase',
                                color: 'rgba(212,175,55,0.65)',
                            }}
                        >
                            Click to Open Your Journal
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

            {/* Flash */}
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