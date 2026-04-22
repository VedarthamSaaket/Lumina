'use client'
// frontend/src/components/orion/OrionButton.tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import OrionChat from './OrionChat'

export default function OrionButton() {
    const [open, setOpen] = useState(false)
    const color = '#5B9BD5'

    return (
        <>
            <OrionChat isOpen={open} onClose={() => setOpen(false)} />

            {/* FAB */}
            <motion.button
                onClick={() => setOpen(v => !v)}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    zIndex: 190,
                    cursor: 'pointer',
                    background: open
                        ? `${color}30`
                        : `linear-gradient(135deg, ${color}28, ${color}10)`,
                    border: `1px solid ${color}${open ? '55' : '38'}`,
                    boxShadow: open
                        ? `0 0 30px ${color}35, 0 8px 32px rgba(0,0,0,0.35)`
                        : `0 8px 24px rgba(0,0,0,0.3), 0 0 0 1px ${color}12`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1px',
                    transition: 'background 0.25s, border-color 0.25s, box-shadow 0.25s',
                }}
                title="Talk to Orion — your cognitive companion"
            >
                <AnimatePresence mode="wait">
                    {open ? (
                        <motion.span
                            key="close"
                            initial={{ opacity: 0, rotate: -45, scale: 0.7 }}
                            animate={{ opacity: 1, rotate: 0, scale: 1 }}
                            exit={{ opacity: 0, rotate: 45, scale: 0.7 }}
                            transition={{ duration: 0.2 }}
                            style={{ fontSize: '16px', color: 'rgba(254,244,228,0.7)', lineHeight: 1 }}
                        >
                            ✕
                        </motion.span>
                    ) : (
                        <motion.div
                            key="icon"
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.7 }}
                            transition={{ duration: 0.2 }}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}
                        >
                            <span style={{ fontSize: '14px', color, lineHeight: 1, filter: `drop-shadow(0 0 4px ${color}60)` }}>
                                ✦
                            </span>
                            <span style={{
                                fontFamily: 'var(--font-gothic)',
                                fontSize: '8px', letterSpacing: '0.06em',
                                color: `${color}cc`, lineHeight: 1,
                            }}>
                                ORION
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>
        </>
    )
}