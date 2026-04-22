'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useThemeStore } from '@/lib/themeStore'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getAuthHeader(): Record<string, string> {
    if (typeof document === 'undefined') return {}
    const cookie = document.cookie.split(';').map(c => c.trim())
        .find(c => c.startsWith('lumina_token='))
    const token = cookie ? cookie.split('=')[1] : localStorage.getItem('access_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
}

interface LiveNotification {
    id: string
    text: string
    type: 'correct' | 'wrong' | 'level_up' | 'streak' | 'info'
    timestamp: number
}

interface OrionLiveObserverProps {
    gameType: string
    onDebriefReady?: (debrief: any) => void
}

export default function OrionLiveObserver({ gameType, onDebriefReady }: OrionLiveObserverProps) {
    const { theme } = useThemeStore()
    const isDark = theme === 'dark'
    const color = '#5B9BD5'

    const [notifications, setNotifications] = useState<LiveNotification[]>([])
    const [liveNotes, setLiveNotes] = useState<string[]>([])
    const notifIdRef = useRef(0)
    const pendingEventsRef = useRef<Array<{ type: string; data: any }>>([])
    const processingRef = useRef(false)
    const roundTimesRef = useRef<number[]>([])
    const roundStartRef = useRef<number>(Date.now())

    const pushNotification = useCallback((text: string, type: LiveNotification['type']) => {
        const id = String(++notifIdRef.current)
        setNotifications(prev => [...prev.slice(-2), { id, text, type, timestamp: Date.now() }])
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id))
        }, 6000)
    }, [])

    const sendLiveEvent = useCallback(async (eventType: string, data: Record<string, any>) => {
        try {
            const res = await fetch(`${API}/api/orion/live-event`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                body: JSON.stringify({
                    game_type: gameType,
                    event_type: eventType,
                    data,
                }),
            })
            if (!res.ok) return
            const result = await res.json()
            if (result.notification) {
                const typeMap: Record<string, LiveNotification['type']> = {
                    correct: 'correct', wrong: 'wrong', level_up: 'level_up',
                    streak: 'streak', session_start: 'info', time_taken: 'info',
                    consecutive_fails: 'wrong',
                }
                pushNotification(result.notification, typeMap[eventType] || 'info')
                if (eventType !== 'time_taken') {
                    setLiveNotes(prev => [...prev.slice(-9), result.notification])
                }
            }
        } catch { }
    }, [gameType, pushNotification])

    // Expose a global event bus for memory games to fire events
    useEffect(() => {
        const handleOrionEvent = async (e: CustomEvent) => {
            const { type, data } = e.detail
            if (!processingRef.current) {
                processingRef.current = true
                await sendLiveEvent(type, data)
                processingRef.current = false
            } else {
                pendingEventsRef.current.push({ type, data })
            }
        }

        window.addEventListener('orion:live', handleOrionEvent as EventListener)
        sendLiveEvent('session_start', { game_type: gameType })
        roundStartRef.current = Date.now()

        return () => {
            window.removeEventListener('orion:live', handleOrionEvent as EventListener)
        }
    }, [gameType, sendLiveEvent])

    const textColor = isDark ? 'rgba(210,228,255,0.92)' : 'rgba(18,38,80,0.88)'
    const bgNotif = isDark
        ? 'linear-gradient(135deg, rgba(8,12,28,0.96), rgba(12,18,38,0.96))'
        : 'linear-gradient(135deg, rgba(228,238,255,0.96), rgba(215,230,255,0.96))'

    const notifColors = {
        correct: '#7a9e7e',
        wrong: '#c9897a',
        level_up: '#d4af37',
        streak: color,
        info: color,
    }

    return (
        <>
            {/* Live notifications - float over the game */}
            <div style={{
                position: 'fixed', bottom: '90px', left: '24px',
                zIndex: 150, display: 'flex', flexDirection: 'column', gap: '8px',
                maxWidth: '300px', pointerEvents: 'none',
            }}>
                <AnimatePresence>
                    {notifications.map(notif => (
                        <motion.div
                            key={notif.id}
                            initial={{ opacity: 0, x: -20, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -20, scale: 0.95 }}
                            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            style={{
                                background: bgNotif,
                                border: `1px solid ${notifColors[notif.type]}28`,
                                borderLeft: `3px solid ${notifColors[notif.type]}`,
                                borderRadius: '12px',
                                padding: '10px 14px',
                                display: 'flex', alignItems: 'flex-start', gap: '8px',
                                boxShadow: isDark
                                    ? '0 4px 24px rgba(0,0,0,0.45)'
                                    : '0 4px 20px rgba(20,50,100,0.12)',
                            }}
                        >
                            <div style={{
                                width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                                marginTop: '1px',
                                background: `${notifColors[notif.type]}18`,
                                border: `1px solid ${notifColors[notif.type]}35`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '8px', color: notifColors[notif.type],
                            }}>✦</div>
                            <p style={{
                                fontFamily: 'var(--font-jost)', fontSize: '12px',
                                color: textColor, lineHeight: '1.55', margin: 0,
                            }}>{notif.text}</p>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Orion FAB indicator while observing */}
            <div style={{
                position: 'fixed', bottom: '82px', right: '88px',
                zIndex: 150,
            }}>
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: color,
                        boxShadow: `0 0 8px ${color}80`,
                    }}
                />
            </div>
        </>
    )
}

// Helper function to dispatch Orion live events from game components
export function dispatchOrionLiveEvent(type: string, data: Record<string, any> = {}) {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('orion:live', { detail: { type, data } }))
}