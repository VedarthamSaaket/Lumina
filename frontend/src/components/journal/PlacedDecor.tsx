'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Sticker } from './JournalStickers'
import { TAPE_CLIP, WASHI } from './ledgerLooks'

export interface PlacedSticker extends Sticker {
    stickerId: string
    x: number
    y: number
    scale: number
    length?: number
}

const TAPE_MIN = 60
const TAPE_MAX = 900

const tapeTile = (sticker: PlacedSticker) => WASHI.find(w => w.id === sticker.id)?.tile

function StickerArt({ sticker, flat }: { sticker: PlacedSticker; flat?: boolean }) {
    const scale = sticker.scale || 1
    const tile = tapeTile(sticker)
    if (!tile) {
        return (
            <img src={sticker.url} alt={sticker.label || ''} width={60 * scale} height={60 * scale}
                style={{ display: 'block', objectFit: 'contain', transform: `rotate(${sticker.rotation || 0}deg)`, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.35)) drop-shadow(0 0 3px white)', pointerEvents: 'none', userSelect: 'none' }}
                draggable={false} />
        )
    }
    return (
        <div style={{
            margin: sticker.length ? 0 : `${22 * scale}px 0`,
            transform: flat ? 'none' : `rotate(${sticker.rotation || 0}deg)`,
            transformOrigin: 'left center',
            filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.3))',
            pointerEvents: 'none',
        }}>
            <div style={{
                width: `${sticker.length ?? 60 * scale}px`, height: `${16 * scale}px`,
                backgroundImage: `url("${tile}")`, backgroundSize: 'auto 100%', backgroundRepeat: 'repeat-x',
                clipPath: TAPE_CLIP,
            }} />
        </div>
    )
}

function RemoveDot({ onRemove }: { onRemove: () => void }) {
    return (
        <motion.button
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.4 }}
            transition={{ type: 'spring', stiffness: 520, damping: 28 }}
            whileHover={{ scale: 1.12, boxShadow: '0 3px 14px rgba(212,175,55,0.45)' }}
            whileTap={{ scale: 0.9 }}
            onPointerDown={e => { e.stopPropagation(); e.preventDefault() }}
            onClick={e => { e.stopPropagation(); e.preventDefault(); onRemove() }}
            title="Remove"
            style={{
                position: 'absolute', top: '-11px', right: '-11px',
                width: '22px', height: '22px', borderRadius: '50%',
                background: 'linear-gradient(145deg, rgba(38,22,9,0.96), rgba(20,11,4,0.96))',
                border: '1px solid rgba(212,175,55,0.65)',
                cursor: 'pointer', zIndex: 100, padding: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(0,0,0,0.5), inset 0 0 6px rgba(212,175,55,0.12)',
                backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
                userSelect: 'none',
            }}>
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path d="M1.5 1.5 L8.5 8.5 M8.5 1.5 L1.5 8.5"
                    stroke="#e8c869" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
        </motion.button>
    )
}

export function DraggableSticker({ sticker, isActive, onActivate, onDeactivate, onRemove, onPositionChange, onScaleChange, onLengthChange, onRotationChange }: {
    sticker: PlacedSticker; isActive: boolean; onActivate: () => void; onDeactivate: () => void
    onRemove: () => void; onPositionChange: (x: number, y: number) => void; onScaleChange: (scale: number) => void
    onLengthChange: (length: number) => void
    onRotationChange: (rotation: number) => void
}) {
    const ref = useRef<HTMLDivElement>(null)
    const [dragging, setDragging] = useState(false)
    const [extending, setExtending] = useState(false)
    const [turning, setTurning] = useState(false)
    const [hovered, setHovered] = useState(false)
    const dragStart = useRef<{ mx: number; my: number; sx: number; sy: number; moved: boolean } | null>(null)
    const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const isTape = Boolean(tapeTile(sticker))

    const clearIdleTimer = useCallback(() => {
        if (idleTimer.current) { clearTimeout(idleTimer.current); idleTimer.current = null }
    }, [])

    const armIdleTimer = useCallback(() => {
        clearIdleTimer()
        idleTimer.current = setTimeout(() => onDeactivate(), 2500)
    }, [clearIdleTimer, onDeactivate])

    useEffect(() => {
        if (!isActive) { clearIdleTimer(); return }
        if (hovered) { clearIdleTimer(); return }
        armIdleTimer()
        return clearIdleTimer
    }, [isActive, hovered, armIdleTimer, clearIdleTimer])

    useEffect(() => clearIdleTimer, [clearIdleTimer])

    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault(); e.stopPropagation(); setDragging(true)
        dragStart.current = { mx: e.clientX, my: e.clientY, sx: sticker.x, sy: sticker.y, moved: false }
        const handleMove = (ev: PointerEvent) => {
            if (!dragStart.current || !ref.current) return
            const parent = ref.current.closest('[data-page="right"]') as HTMLElement
            if (!parent) return
            const rect = parent.getBoundingClientRect()
            const totalDx = ev.clientX - dragStart.current.mx
            const totalDy = ev.clientY - dragStart.current.my
            if (Math.abs(totalDx) > 4 || Math.abs(totalDy) > 4) dragStart.current.moved = true
            const dx = (totalDx / rect.width) * 100
            const dy = (totalDy / rect.height) * 100
            onPositionChange(Math.max(2, Math.min(88, dragStart.current.sx + dx)), Math.max(2, Math.min(88, dragStart.current.sy + dy)))
        }
        const handleUp = () => {
            setDragging(false)
            if (dragStart.current && !dragStart.current.moved) {
                if (isActive) onDeactivate(); else onActivate()
            } else if (isActive) {
                armIdleTimer()
            }
            dragStart.current = null
            document.removeEventListener('pointermove', handleMove)
            document.removeEventListener('pointerup', handleUp)
        }
        document.addEventListener('pointermove', handleMove); document.addEventListener('pointerup', handleUp)
    }

    const handleExtendDown = (e: React.PointerEvent) => {
        e.preventDefault(); e.stopPropagation(); setExtending(true)
        const startX = e.clientX
        const startY = e.clientY
        const startLength = sticker.length ?? 60 * sticker.scale
        const angle = ((sticker.rotation || 0) * Math.PI) / 180
        const handleMove = (ev: PointerEvent) => {
            const along = (ev.clientX - startX) * Math.cos(angle) + (ev.clientY - startY) * Math.sin(angle)
            onLengthChange(Math.max(TAPE_MIN, Math.min(TAPE_MAX, startLength + along)))
        }
        const handleUp = () => {
            setExtending(false)
            document.removeEventListener('pointermove', handleMove)
            document.removeEventListener('pointerup', handleUp)
        }
        document.addEventListener('pointermove', handleMove); document.addEventListener('pointerup', handleUp)
    }

    const handleTurnDown = (e: React.PointerEvent) => {
        e.preventDefault(); e.stopPropagation()
        if (!ref.current) return
        setTurning(true)
        const rect = ref.current.getBoundingClientRect()
        const originX = rect.left
        const originY = rect.top + rect.height / 2
        const angleAt = (ev: { clientX: number; clientY: number }) => (Math.atan2(ev.clientY - originY, ev.clientX - originX) * 180) / Math.PI
        const startAngle = angleAt(e)
        const startRotation = sticker.rotation || 0
        const handleMove = (ev: PointerEvent) => {
            const next = startRotation + angleAt(ev) - startAngle
            onRotationChange(Math.round(((next + 540) % 360) - 180))
        }
        const handleUp = () => {
            setTurning(false)
            document.removeEventListener('pointermove', handleMove)
            document.removeEventListener('pointerup', handleUp)
        }
        document.addEventListener('pointermove', handleMove); document.addEventListener('pointerup', handleUp)
    }

    const showGrips = isTape && (hovered || isActive || extending || turning)

    return (
        <div ref={ref} data-sticker-id={sticker.stickerId} onPointerDown={handlePointerDown}
            onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
            onWheel={e => { e.stopPropagation(); onScaleChange(Math.max(0.3, Math.min(3, sticker.scale + (e.deltaY > 0 ? -0.1 : 0.1)))) }}
            style={{ position: 'absolute', left: `${sticker.x}%`, top: `${sticker.y}%`, zIndex: isActive || extending || turning ? 50 : 15, cursor: dragging ? 'grabbing' : 'grab', userSelect: 'none', touchAction: 'none' }}>
            <div style={{ position: 'relative', display: 'inline-flex', transform: isTape ? `rotate(${sticker.rotation || 0}deg)` : 'none', transformOrigin: 'left center' }}>
                <StickerArt sticker={sticker} flat={isTape} />
                {showGrips && (
                    <div onPointerDown={handleExtendDown} title="Drag to extend"
                        style={{
                            position: 'absolute', top: '50%', right: '-10px', transform: 'translateY(-50%)',
                            width: '14px', height: '26px', borderRadius: '7px',
                            background: 'linear-gradient(145deg, rgba(38,22,9,0.96), rgba(20,11,4,0.96))',
                            border: '1px solid rgba(212,175,55,0.65)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
                            cursor: 'ew-resize', zIndex: 90, touchAction: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                        <svg width="6" height="12" viewBox="0 0 6 12" fill="none" aria-hidden="true">
                            <path d="M1.5 1.5 V10.5 M4.5 1.5 V10.5" stroke="#e8c869" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                    </div>
                )}
                {showGrips && (
                    <div onPointerDown={handleTurnDown} title="Drag to tilt"
                        style={{
                            position: 'absolute', bottom: '-16px', right: '-12px',
                            width: '20px', height: '20px', borderRadius: '50%',
                            background: 'linear-gradient(145deg, rgba(38,22,9,0.96), rgba(20,11,4,0.96))',
                            border: '1px solid rgba(212,175,55,0.65)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
                            cursor: turning ? 'grabbing' : 'grab', zIndex: 90, touchAction: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                            <path d="M10 6 A4 4 0 1 1 8.2 2.7" stroke="#e8c869" strokeWidth="1.3" strokeLinecap="round" />
                            <path d="M8 0.8 L8.5 3 L6.3 3.4" stroke="#e8c869" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                )}
                <AnimatePresence>
                    {isActive && <RemoveDot key="remove" onRemove={() => { clearIdleTimer(); onRemove() }} />}
                </AnimatePresence>
            </div>
        </div>
    )
}

export function SavedStickers({ stickers, onRemove }: {
    stickers: PlacedSticker[]
    onRemove?: (index: number) => void
}) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null)
    return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5, overflow: 'hidden' }}>
            {stickers.map((s, i) => (
                <div key={s.stickerId || `${s.id}-${i}`}
                    onClick={() => setActiveIndex(activeIndex === i ? null : i)}
                    style={{
                        position: 'absolute', left: `${s.x}%`, top: `${s.y}%`,
                        zIndex: activeIndex === i ? 50 : 'auto',
                        pointerEvents: onRemove ? 'auto' : 'none',
                        cursor: onRemove ? 'pointer' : 'default', userSelect: 'none',
                    }}>
                    <div style={{ position: 'relative', display: 'inline-flex' }}>
                        <StickerArt sticker={s} />
                        <AnimatePresence>
                            {onRemove && activeIndex === i && (
                                <RemoveDot key="remove" onRemove={() => { setActiveIndex(null); onRemove(i) }} />
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            ))}
        </div>
    )
}
