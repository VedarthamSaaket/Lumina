'use client'
// src/components/ui/ThemeToggle.tsx
import { useThemeStore } from '@/lib/themeStore'
import { motion } from 'framer-motion'

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore()
  const isDark = theme === 'dark'

  return (
    <motion.button
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      whileTap={{ scale: 0.92 }}
      style={{
        position: 'relative',
        width: '52px',
        height: '28px',
        borderRadius: '14px',
        border: '1px solid rgba(212,175,55,0.35)',
        background: isDark
          ? 'linear-gradient(135deg, rgba(20,8,0,0.9), rgba(40,18,2,0.9))'
          : 'linear-gradient(135deg, rgba(180,110,30,0.85), rgba(140,80,10,0.85))',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        padding: '3px',
        flexShrink: 0,
        boxShadow: isDark
          ? 'inset 0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.08)'
          : 'inset 0 1px 3px rgba(0,0,0,0.3), 0 0 12px rgba(212,175,55,0.2)',
        transition: 'background 0.3s ease, box-shadow 0.3s ease',
      }}
    >
      {/* Track stars (dark) or sun rays (light) - subtle bg detail */}
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '14px',
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {isDark ? (
          /* tiny star dots for dark track */
          <>
            <span style={{ position: 'absolute', top: '5px', left: '8px', width: '2px', height: '2px', borderRadius: '50%', background: 'rgba(212,175,55,0.5)' }} />
            <span style={{ position: 'absolute', top: '9px', left: '14px', width: '1.5px', height: '1.5px', borderRadius: '50%', background: 'rgba(212,175,55,0.35)' }} />
            <span style={{ position: 'absolute', top: '6px', left: '18px', width: '1px', height: '1px', borderRadius: '50%', background: 'rgba(212,175,55,0.4)' }} />
          </>
        ) : (
          /* warm glow for light track */
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, rgba(255,200,80,0.2), rgba(255,160,30,0.1))',
          }} />
        )}
      </motion.div>

      {/* Thumb */}
      <motion.div
        animate={{ x: isDark ? 0 : 24 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        style={{
          position: 'relative',
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isDark
            ? 'radial-gradient(circle at 35% 35%, #f0d060, #d4af37, #b8860b)'
            : 'radial-gradient(circle at 35% 35%, #fef4e4, #f0d060, #d4af37)',
          boxShadow: isDark
            ? '0 1px 4px rgba(0,0,0,0.5), 0 0 8px rgba(212,175,55,0.4)'
            : '0 1px 4px rgba(0,0,0,0.3), 0 0 12px rgba(245,208,60,0.6)',
          flexShrink: 0,
        }}
      >
        <motion.span
          key={theme}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
          style={{ fontSize: '11px', lineHeight: 1, userSelect: 'none' }}
        >
          {isDark ? '🌙' : '☀️'}
        </motion.span>
      </motion.div>
    </motion.button>
  )
}