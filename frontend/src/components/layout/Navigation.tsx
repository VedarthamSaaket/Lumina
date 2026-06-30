'use client'
// frontend/src/components/layout/Navigation.tsx
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useThemeStore } from '@/lib/themeStore'
import { authAPI } from '@/lib/api'

export function Navigation() {
  const pathname = usePathname()
  const { theme } = useThemeStore()
  const [isAuthed, setIsAuthed] = useState(false)
  const [isCompact, setIsCompact] = useState(false)   // viewport ≤ 900px
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 900px)')
    const sync = () => setIsCompact(mql.matches)
    sync()
    mql.addEventListener('change', sync)
    return () => mql.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) setIsAuthed(true)
  }, [])

  // Close drawer on route change.
  useEffect(() => { setDrawerOpen(false) }, [pathname])

  // Lock body scroll while drawer is open.
  useEffect(() => {
    if (!drawerOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [drawerOpen])

  const handleSignOut = async () => {
    try { await authAPI.signout() } catch { }
    localStorage.removeItem('access_token')
    document.cookie = 'lumina_token=; Max-Age=0; path=/'
    window.location.href = '/'
  }

  const navLinks = [
    { href: '/chat',             label: 'LUMINA',     icon: '*', orion: false },
    { href: '/journal',          label: 'JOURNAL',    icon: '◈', orion: false },
    { href: '/screening',        label: 'REFLECT',    icon: '◎', orion: false },
    { href: '/cbt',              label: 'INNER WORK', icon: '❋', orion: false },
    { href: '/cognitive/memory', label: 'MEMORY',     icon: '◐', orion: false },
    { href: '/orion',            label: 'ORION',      icon: '*', orion: true  },
  ]

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname?.startsWith(href)

  const isDark    = theme === 'dark'
  const bg        = isDark ? 'rgba(10, 6, 2, 0.95)' : 'rgba(242, 228, 190, 0.97)'
  const border    = isDark ? 'rgba(212, 175, 55, 0.13)' : 'rgba(180, 140, 40, 0.18)'
  const logoColor = isDark ? '#d4af37' : '#8b6410'
  const mutedText = isDark ? 'rgba(254, 244, 228, 0.52)' : 'rgba(60, 38, 8, 0.52)'
  const activeGold = isDark ? '#d4af37' : '#8b6410'
  const drawerBg   = isDark ? 'rgba(15, 8, 5, 0.98)' : 'rgba(240, 230, 204, 0.99)'

  const renderNavLink = (link: typeof navLinks[number], inDrawer = false) => {
    const active = isActive(link.href)
    const accent = link.orion ? '#5B9BD5' : activeGold
    return (
      <Link key={link.href} href={link.href} style={{ textDecoration: 'none', flexShrink: 0 }}>
        <motion.div
          whileHover={{ y: -1 }}
          style={{
            display:       'flex',
            alignItems:    'center',
            gap:           '5px',
            padding:       inDrawer ? '14px 18px' : '5px 13px',
            borderRadius:  inDrawer ? '12px' : '20px',
            fontFamily:    'var(--font-jost)',
            fontSize:      inDrawer ? '14px' : '11px',
            fontWeight:    600,
            letterSpacing: '0.13em',
            color:         active ? accent : mutedText,
            background:    active
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
            cursor:      'pointer',
            whiteSpace:  'nowrap',
          }}
        >
          <span style={{
            fontSize: inDrawer ? '11px' : '8px',
            color:    active ? accent : (isDark ? 'rgba(254,244,228,0.25)' : 'rgba(42,26,8,0.22)'),
            filter:   active && link.orion ? 'drop-shadow(0 0 4px #5B9BD560)' : 'none',
          }}>
            {link.icon}
          </span>
          {link.label}
        </motion.div>
      </Link>
    )
  }

  return (
    <>
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position:    'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          height:      '64px',
          display:     'flex',
          alignItems:  'center',
          padding:     isCompact ? '0 16px' : '0 28px',
          gap:         '0',
          background:  bg,
          backdropFilter:       'blur(32px) saturate(160%)',
          WebkitBackdropFilter: 'blur(32px) saturate(160%)',
          borderBottom: `1px solid ${border}`,
          transition:   'background 0.3s, border-color 0.3s',
        }}
      >
        {/* ── LOGO ── */}
        <Link
          href="/"
          style={{
            textDecoration: 'none', flexShrink: 0,
            marginRight:    isCompact ? 'auto' : '32px',
            display:        'flex', alignItems: 'center', gap: '11px',
          }}
        >
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
          <span style={{
            fontFamily:    'var(--font-cormorant)',
            fontStyle:     'italic', fontWeight: 400,
            fontSize:      '20px',
            color:         isDark ? 'rgba(254,244,228,0.92)' : 'rgba(42,24,4,0.88)',
            letterSpacing: '0.30em',
            textTransform: 'uppercase',
          }}>
            LUMINA
          </span>
        </Link>

        {/* ── DESKTOP NAV LINKS (hidden on compact) ── */}
        {!isCompact && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '2px' }}>
            {navLinks.map(l => renderNavLink(l))}
          </div>
        )}

        {/* ── DESKTOP RIGHT CONTROLS ── */}
        {!isCompact && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0, marginLeft: 'auto' }}>
            {isAuthed && (
              <>
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
                  >⚙</motion.button>
                </Link>
                <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    style={{
                      background: 'none',
                      border: `1px solid ${isDark ? 'rgba(212,175,55,0.20)' : 'rgba(139,100,16,0.20)'}`,
                      borderRadius: '20px', padding: '5px 14px', cursor: 'pointer',
                      fontFamily: 'var(--font-jost)', fontSize: '11px',
                      letterSpacing: '0.12em', textTransform: 'uppercase',
                      color: mutedText, transition: 'all 0.2s', whiteSpace: 'nowrap',
                    }}
                  >PROFILE</motion.button>
                </Link>
                <button
                  onClick={handleSignOut}
                  style={{
                    background: isDark ? 'rgba(254,244,228,0.04)' : 'rgba(42,26,8,0.04)',
                    border: `1px solid ${isDark ? 'rgba(254,244,228,0.10)' : 'rgba(42,26,8,0.10)'}`,
                    borderRadius: '20px', padding: '5px 14px', cursor: 'pointer',
                    fontFamily: 'var(--font-jost)', fontSize: '11px',
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: isDark ? 'rgba(254,244,228,0.30)' : 'rgba(42,26,8,0.30)',
                    transition: 'all 0.2s', whiteSpace: 'nowrap',
                  }}
                >OUT</button>
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
                }}>SIGN IN</button>
              </Link>
            )}
          </div>
        )}

        {/* ── HAMBURGER (compact only) ── */}
        {isCompact && (
          <button
            onClick={() => setDrawerOpen(o => !o)}
            aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={drawerOpen}
            style={{
              marginLeft: 'auto',
              background: 'none', border: 'none', cursor: 'pointer',
              width: '44px', height: '44px',
              display: 'flex', flexDirection: 'column',
              justifyContent: 'center', alignItems: 'center', gap: '5px',
              padding: 0,
            }}
          >
            <span style={{
              display: 'block', width: '22px', height: '1.5px',
              background: logoColor, borderRadius: '1px',
              transform: drawerOpen ? 'translateY(6px) rotate(45deg)' : 'none',
              transition: 'transform 0.25s ease',
            }} />
            <span style={{
              display: 'block', width: '22px', height: '1.5px',
              background: logoColor, borderRadius: '1px',
              opacity: drawerOpen ? 0 : 1,
              transition: 'opacity 0.15s ease',
            }} />
            <span style={{
              display: 'block', width: '22px', height: '1.5px',
              background: logoColor, borderRadius: '1px',
              transform: drawerOpen ? 'translateY(-7px) rotate(-45deg)' : 'none',
              transition: 'transform 0.25s ease',
            }} />
          </button>
        )}
      </motion.nav>

      {/* ── MOBILE DRAWER ── */}
      <AnimatePresence>
        {isCompact && drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 98,
                background: 'rgba(0,0,0,0.45)',
              }}
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 99,
                width: 'min(86vw, 360px)',
                background: drawerBg,
                backdropFilter:       'blur(28px) saturate(150%)',
                WebkitBackdropFilter: 'blur(28px) saturate(150%)',
                borderLeft: `1px solid ${border}`,
                display: 'flex', flexDirection: 'column',
                paddingTop:    'calc(64px + env(safe-area-inset-top))',
                paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
                paddingLeft:   '1rem', paddingRight: '1rem',
                gap:           '8px',
                overflowY:     'auto',
              }}
            >
              {navLinks.map(l => renderNavLink(l, true))}

              <div style={{
                marginTop: '1rem',
                borderTop: `1px solid ${border}`,
                paddingTop: '1rem',
                display: 'flex', flexDirection: 'column', gap: '8px',
              }}>
                {isAuthed ? (
                  <>
                    <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                      <div style={{
                        padding: '14px 18px', borderRadius: '12px',
                        fontFamily: 'var(--font-jost)', fontSize: '13px',
                        letterSpacing: '0.12em', textTransform: 'uppercase',
                        color: mutedText,
                        border: `1px solid ${isDark ? 'rgba(212,175,55,0.20)' : 'rgba(139,100,16,0.20)'}`,
                      }}>PROFILE</div>
                    </Link>
                    <Link href="/settings" style={{ textDecoration: 'none' }}>
                      <div style={{
                        padding: '14px 18px', borderRadius: '12px',
                        fontFamily: 'var(--font-jost)', fontSize: '13px',
                        letterSpacing: '0.12em', textTransform: 'uppercase',
                        color: mutedText,
                        border: `1px solid ${isDark ? 'rgba(212,175,55,0.18)' : 'rgba(139,100,16,0.18)'}`,
                      }}>SETTINGS</div>
                    </Link>
                    <button
                      onClick={handleSignOut}
                      style={{
                        textAlign: 'left', cursor: 'pointer',
                        background: isDark ? 'rgba(254,244,228,0.04)' : 'rgba(42,26,8,0.04)',
                        border: `1px solid ${isDark ? 'rgba(254,244,228,0.10)' : 'rgba(42,26,8,0.10)'}`,
                        padding: '14px 18px', borderRadius: '12px',
                        fontFamily: 'var(--font-jost)', fontSize: '13px',
                        letterSpacing: '0.12em', textTransform: 'uppercase',
                        color: isDark ? 'rgba(254,244,228,0.55)' : 'rgba(42,26,8,0.55)',
                      }}
                    >SIGN OUT</button>
                  </>
                ) : (
                  <Link href="/auth/signin" style={{ textDecoration: 'none' }}>
                    <div style={{
                      padding: '14px 18px', borderRadius: '12px',
                      fontFamily: 'var(--font-jost)', fontSize: '13px',
                      letterSpacing: '0.12em', textTransform: 'uppercase',
                      color: logoColor, textAlign: 'center',
                      border: `1px solid ${isDark ? 'rgba(212,175,55,0.30)' : 'rgba(139,100,16,0.30)'}`,
                    }}>SIGN IN</div>
                  </Link>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
