'use client'
// frontend/src/components/layout/Navigation.tsx
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { useThemeStore } from '@/lib/themeStore'
import { authAPI } from '@/lib/api'

export function Navigation() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useThemeStore()
  const [scrolled, setScrolled] = useState(false)
  const [isAuthed, setIsAuthed] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) setIsAuthed(true)
  }, [])

  const handleSignOut = async () => {
    try { await authAPI.signout() } catch { }
    localStorage.removeItem('access_token')
    document.cookie = 'lumina_token=; Max-Age=0; path=/'
    window.location.href = '/auth/signin'
  }

  const navLinks = [
    { href: '/chat', label: 'LUMINA', icon: '✦', orion: false },
    { href: '/journal', label: 'JOURNAL', icon: '◈', orion: false },
    { href: '/screening', label: 'REFLECT', icon: '◎', orion: false },
    { href: '/cbt', label: 'INNER WORK', icon: '❋', orion: false },
    { href: '/cognitive/memory', label: 'MEMORY', icon: '◐', orion: false },
    { href: '/orion', label: 'ORION', icon: '✦', orion: true },
  ]

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname?.startsWith(href)

  const isDark = theme === 'dark'

  const bg = isDark
    ? 'rgba(10, 6, 2, 0.95)'
    : 'rgba(242, 228, 190, 0.97)'
  const border = isDark
    ? 'rgba(212, 175, 55, 0.13)'
    : 'rgba(180, 140, 40, 0.18)'
  const logoColor = isDark ? '#d4af37' : '#8b6410'
  const mutedText = isDark ? 'rgba(254, 244, 228, 0.52)' : 'rgba(60, 38, 8, 0.52)'
  const activeGold = isDark ? '#d4af37' : '#8b6410'

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: '64px',                       // ← thicker bar
        display: 'flex', alignItems: 'center',
        padding: '0 28px',
        gap: '0',
        background: bg,
        backdropFilter: 'blur(32px) saturate(160%)',
        WebkitBackdropFilter: 'blur(32px) saturate(160%)',
        borderBottom: `1px solid ${border}`,
        transition: 'background 0.3s, border-color 0.3s',
      }}
    >
      {/* ── LOGO CIRCLE + WORDMARK ── */}
      <Link
        href="/"
        style={{
          textDecoration: 'none', flexShrink: 0,
          marginRight: '32px',
          display: 'flex', alignItems: 'center', gap: '11px',
        }}
      >
        {/* Golden orb */}
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle at 38% 35%, #ffe484 0%, #d4af37 45%, #8b6010 100%)'
            : 'radial-gradient(circle at 38% 35%, #ffe97a 0%, #c9960a 45%, #7a5200 100%)',
          boxShadow: isDark
            ? '0 0 14px rgba(212,175,55,0.50), inset 0 1px 0 rgba(255,240,140,0.4)'
            : '0 0 12px rgba(180,130,0,0.32), inset 0 1px 0 rgba(255,240,140,0.5)',
          flexShrink: 0,
        }} />

        {/* L U M I N A, wide letter-spacing to match screenshot */}
        <span style={{
          fontFamily: 'var(--font-cormorant)',
          fontStyle: 'italic', fontWeight: 400,
          fontSize: '20px',
          color: isDark ? 'rgba(254,244,228,0.92)' : 'rgba(42,24,4,0.88)',
          letterSpacing: '0.30em',             // ← wide spaced as in screenshot
          textTransform: 'uppercase',
        }}>
          LUMINA
        </span>
      </Link>

      {/* ── NAV LINKS ── */}
      <div style={{
        flex: 1,
        display: 'flex', alignItems: 'center',
        gap: '2px',
      }}>
        {navLinks.map(link => {
          const active = isActive(link.href)
          const accent = link.orion ? '#5B9BD5' : activeGold

          return (
            <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
              <motion.div
                whileHover={{ y: -1 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '5px 13px', borderRadius: '20px',
                  fontFamily: 'var(--font-jost)',
                  fontSize: '11px',              // ← slightly larger to match screenshot
                  fontWeight: 600,
                  letterSpacing: '0.13em',
                  color: active ? accent : mutedText,
                  background: active
                    ? (link.orion
                      ? 'rgba(91,155,213,0.12)'
                      : (isDark ? 'rgba(212,175,55,0.12)' : 'rgba(139,100,16,0.10)'))
                    : 'transparent',
                  border: active
                    ? (link.orion
                      ? '1px solid rgba(91,155,213,0.30)'
                      : (isDark ? '1px solid rgba(212,175,55,0.28)' : '1px solid rgba(139,100,16,0.28)'))
                    : '1px solid transparent',
                  transition: 'all 0.18s',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{
                  fontSize: '8px',
                  color: active
                    ? accent
                    : (isDark ? 'rgba(254,244,228,0.25)' : 'rgba(42,26,8,0.22)'),
                  filter: active && link.orion ? 'drop-shadow(0 0 4px #5B9BD560)' : 'none',
                }}>
                  {link.icon}
                </span>
                {link.label}
              </motion.div>
            </Link>
          )
        })}
      </div>

      {/* ── RIGHT CONTROLS ── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: '7px', flexShrink: 0, marginLeft: 'auto',
      }}>

        {/* Theme toggle removed, now in settings page */}

        {isAuthed && (
          <>
            {/* CRISIS BUTTON */}
            <Link href="/crisis" style={{ textDecoration: 'none' }}>
              <motion.div
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '5px 14px', borderRadius: '20px',
                  background: isDark
                    ? 'rgba(220, 60, 60, 0.13)'
                    : 'rgba(220, 60, 60, 0.10)',
                  border: isDark
                    ? '1px solid rgba(220,80,80,0.30)'
                    : '1px solid rgba(200,50,50,0.25)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-jost)', fontSize: '11px',
                  fontWeight: 600, letterSpacing: '0.14em',
                  color: isDark ? 'rgba(255,120,120,0.85)' : 'rgba(180,30,30,0.80)',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: isDark ? '#ff6060' : '#cc2222',
                  boxShadow: '0 0 6px rgba(255,60,60,0.6)',
                  display: 'inline-block', flexShrink: 0,
                }} />
                CRISIS
              </motion.div>
            </Link>

            {/* SETTINGS gear */}
            <Link href="/settings" style={{ textDecoration: 'none' }}>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 20 }}
                whileTap={{ scale: 0.92 }}
                title="Settings"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  width: '30px', height: '30px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isDark ? 'rgba(254,244,228,0.32)' : 'rgba(42,26,8,0.32)',
                  fontSize: '16px', transition: 'color 0.2s', borderRadius: '50%',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = logoColor)}
                onMouseLeave={e => (e.currentTarget.style.color = isDark ? 'rgba(254,244,228,0.32)' : 'rgba(42,26,8,0.32)')}
              >
                ⚙
              </motion.button>
            </Link>

            {/* PROFILE */}
            <Link href="/dashboard" style={{ textDecoration: 'none' }}>
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                style={{
                  background: 'none',
                  border: `1px solid ${isDark ? 'rgba(212,175,55,0.20)' : 'rgba(139,100,16,0.20)'}`,
                  borderRadius: '20px', padding: '5px 14px', cursor: 'pointer',
                  fontFamily: 'var(--font-jost)', fontSize: '11px',
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: mutedText, transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}
              >
                PROFILE
              </motion.button>
            </Link>

            {/* OUT (sign out) */}
            <button
              onClick={handleSignOut}
              style={{
                background: isDark ? 'rgba(254,244,228,0.04)' : 'rgba(42,26,8,0.04)',
                border: `1px solid ${isDark ? 'rgba(254,244,228,0.10)' : 'rgba(42,26,8,0.10)'}`,
                borderRadius: '20px', padding: '5px 14px', cursor: 'pointer',
                fontFamily: 'var(--font-jost)', fontSize: '11px',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: isDark ? 'rgba(254,244,228,0.30)' : 'rgba(42,26,8,0.30)',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.color =
                  isDark ? 'rgba(254,244,228,0.65)' : 'rgba(42,26,8,0.65)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.color =
                  isDark ? 'rgba(254,244,228,0.30)' : 'rgba(42,26,8,0.30)'
              }}
            >
              OUT
            </button>
          </>
        )}

        {!isAuthed && (
          <Link href="/auth/signin" style={{ textDecoration: 'none' }}>
            <button style={{
              background: isDark ? 'rgba(212,175,55,0.08)' : 'rgba(139,100,16,0.08)',
              border: `1px solid ${isDark ? 'rgba(212,175,55,0.22)' : 'rgba(139,100,16,0.22)'}`,
              borderRadius: '20px', padding: '5px 18px', cursor: 'pointer',
              fontFamily: 'var(--font-jost)', fontSize: '11px',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: isDark ? 'rgba(254,244,228,0.6)' : 'rgba(42,26,8,0.6)',
              transition: 'all 0.2s',
            }}>
              SIGN IN
            </button>
          </Link>
        )}
      </div>
    </motion.nav>
  )
}