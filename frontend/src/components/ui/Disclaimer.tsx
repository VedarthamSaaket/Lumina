'use client'
// src/components/ui/Disclaimer.tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function Disclaimer() {
  const [visible, setVisible] = useState(true)

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-2xl px-6 py-3 flex items-center gap-4 max-w-xl w-[90vw]"
          style={{
            background: 'var(--bg-glass)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            border: '1px solid rgba(212,175,55,0.2)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}
        >
          <span style={{ color: '#d4af37', fontSize: '16px', flexShrink: 0, opacity: 0.8 }}>⚕</span>
          <p className="text-xs leading-relaxed" style={{
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-eb-garamond)',
            margin: 0,
          }}>
            Lumina is not a substitute for licensed therapy or medical care. If you are in immediate danger, please call emergency services.
          </p>
          <button
            onClick={() => setVisible(false)}
            className="flex-shrink-0 transition-opacity hover:opacity-100"
            style={{ color: 'var(--text-muted)', opacity: 0.5, fontSize: '12px', padding: '2px' }}
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}