'use client'
import { motion } from 'framer-motion'

export default function MemoryOrionBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-xl p-4 mb-6 flex items-center gap-3"
      style={{
        background: 'rgba(91,155,213,0.06)',
        border: '1px solid rgba(91,155,213,0.18)',
      }}
    >
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        flexShrink: 0,
        background: 'rgba(91,155,213,0.12)',
        border: '1px solid rgba(91,155,213,0.28)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        color: '#5B9BD5',
      }}>
        ✦
      </div>
      <div style={{ flex: 1 }}>
        <p style={{
          fontFamily: 'var(--font-jost)',
          fontSize: '11px',
          letterSpacing: '0.08em',
          color: '#5B9BD5',
          marginBottom: '2px',
        }}>
          Orion is here
        </p>
        <p style={{
          fontFamily: 'var(--font-jost)',
          fontSize: '12px',
          color: 'rgba(254,244,228,0.45)',
          lineHeight: '1.5',
        }}>
          After your games, tap the Orion button (bottom right) to discuss your results, get coaching, and understand the science behind your scores.
        </p>
      </div>
    </motion.div>
  )
}