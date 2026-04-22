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
  const { theme, toggleTheme } = useThemeStore()
  const [menuOpen, setMenuOpen] = useState(false)
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

  // Reference screenshot colours — warm golden on cream/dark
  const bg = isDark
    ? 'rgba(10, 6, 2, 0.92)'
    : 'rgba(242, 228, 190, 0.97)'
  const border = isDark
    ? 'rgba(212,175,55,0.13)'
    : 'rgba(180,140,40,0.18)'
  const logoColor = isDark ? '#d4af37' : '#8b6410'
  const mutedText = isDark ? 'rgba(254,244,228,0.52)' : 'rgba(60,38,8,0.52)'
  const activeGold = isDark ? '#d4af37' : '#8b6410'

  return (
    <>
      {/* ── NAV BAR ─────────────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          height: '52px',
          display: 'flex', alignItems: 'center',
          padding: '0 20px',
          gap: '0',
          background: bg,
          backdropFilter: 'blur(32px) saturate(160%)',
          WebkitBackdropFilter: 'blur(32px) saturate(160%)',
          borderBottom: `1px solid ${border}`,
          transition: 'background 0.3s, border-color 0.3s',
        }}
      >

        {/* ── LOGO CIRCLE + WORDMARK ── */}
        <Link href="/" style={{ textDecoration: 'none', flexShrink: 0, marginRight: '20px', display: 'flex', alignItems: 'center', gap: '9px' }}>
          {/* Golden orb — matches reference screenshot exactly */}
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: isDark
              ? 'radial-gradient(circle at 38% 35%, #ffe484 0%, #d4af37 45%, #8b6010 100%)'
              : 'radial-gradient(circle at 38% 35%, #ffe97a 0%, #c9960a 45%, #7a5200 100%)',
            boxShadow: isDark
              ? '0 0 12px rgba(212,175,55,0.45), inset 0 1px 0 rgba(255,240,140,0.4)'
              : '0 0 10px rgba(180,130,0,0.30), inset 0 1px 0 rgba(255,240,140,0.5)',
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: 'var(--font-cormorant)',
            fontStyle: 'italic', fontWeight: 400,
            fontSize: '19px',
            color: isDark ? 'rgba(254,244,228,0.92)' : 'rgba(42,24,4,0.88)',
            letterSpacing: '0.04em',
          }}>
            LUMINA
          </span>
        </Link>

        {/* ── DESKTOP NAV LINKS ── */}
        <div
          className="hidden md:flex"
          style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1px' }}
        >
          {navLinks.map(link => {
            const active = isActive(link.href)
            const accent = link.orion
              ? '#5B9BD5'
              : activeGold

            return (
              <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
                <motion.div
                  whileHover={{ y: -1 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '4px 11px', borderRadius: '20px',
                    fontFamily: 'var(--font-jost)', fontSize: '10px',
                    fontWeight: 600, letterSpacing: '0.14em',
                    color: active ? accent : mutedText,
                    background: active
                      ? (link.orion
                        ? 'rgba(91,155,213,0.12)'
                        : (isDark ? 'rgba(212,175,55,0.12)' : 'rgba(139,100,16,0.10)'))
                      : 'transparent',
                    border: active
                      ? (link.orion
                        ? '1px solid rgba(91,155,213,0.30)'
                        : (isDark ? '1px solid rgba(212,175,55,0.25)' : '1px solid rgba(139,100,16,0.25)'))
                      : '1px solid transparent',
                    transition: 'all 0.18s',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{
                    fontSize: '8px',
                    color: active ? accent : (isDark ? 'rgba(254,244,228,0.25)' : 'rgba(42,26,8,0.22)'),
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: 'auto' }}>

          {/* THEME TOGGLE — pill / switch style matching reference screenshot */}
          <motion.button
            onClick={toggleTheme}
            whileTap={{ scale: 0.94 }}
            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            style={{
              position: 'relative',
              width: '48px', height: '26px', borderRadius: '13px',
              cursor: 'pointer',
              border: 'none', outline: 'none',
              background: isDark
                ? 'rgba(212,175,55,0.18)'
                : 'rgba(139,100,16,0.15)',
              boxShadow: isDark
                ? 'inset 0 0 0 1px rgba(212,175,55,0.28)'
                : 'inset 0 0 0 1px rgba(139,100,16,0.25)',
              transition: 'background 0.25s',
              flexShrink: 0,
            }}
          >
            {/* thumb */}
            <motion.div
              animate={{ x: isDark ? 24 : 2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                position: 'absolute', top: '3px',
                width: '20px', height: '20px', borderRadius: '50%',
                background: isDark
                  ? 'radial-gradient(circle at 38% 35%, #ffe484, #d4af37)'
                  : 'radial-gradient(circle at 38% 35%, #ffe97a, #c9960a)',
                boxShadow: isDark
                  ? '0 0 8px rgba(212,175,55,0.6)'
                  : '0 0 6px rgba(180,130,0,0.4)',
              }}
            />
            {/* sun/moon icon inside track */}
            <span style={{
              position: 'absolute',
              left: isDark ? '5px' : '28px',
              top: '50%', transform: 'translateY(-50%)',
              fontSize: '9px',
              color: isDark ? 'rgba(254,244,228,0.4)' : 'rgba(42,26,8,0.4)',
              pointerEvents: 'none',
              transition: 'left 0.25s',
            }}>
              {isDark ? '☽' : '☀'}
            </span>
          </motion.button>

          {isAuthed && (
            <>
              {/* CRISIS BUTTON — matches reference pill with dot */}
              <Link href="/crisis" className="hidden md:block" style={{ textDecoration: 'none' }}>
                <motion.div
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '4px 13px', borderRadius: '20px',
                    background: isDark
                      ? 'rgba(220, 60, 60, 0.13)'
                      : 'rgba(220, 60, 60, 0.10)',
                    border: isDark
                      ? '1px solid rgba(220,80,80,0.30)'
                      : '1px solid rgba(200,50,50,0.25)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-jost)', fontSize: '10px',
                    fontWeight: 600, letterSpacing: '0.14em',
                    color: isDark ? 'rgba(255,120,120,0.85)' : 'rgba(180,30,30,0.80)',
                  }}
                >
                  <span style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: isDark ? '#ff6060' : '#cc2222',
                    boxShadow: '0 0 6px rgba(255,60,60,0.6)',
                    display: 'inline-block', flexShrink: 0,
                  }} />
                  CRISIS
                </motion.div>
              </Link>

              {/* SETTINGS gear */}
              <Link href="/settings" style={{ textDecoration: 'none' }} className="hidden md:block">
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 20 }} whileTap={{ scale: 0.92 }}
                  title="Settings"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    width: '28px', height: '28px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    color: isDark ? 'rgba(254,244,228,0.32)' : 'rgba(42,26,8,0.32)',
                    fontSize: '15px', transition: 'color 0.2s', borderRadius: '50%',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = logoColor)}
                  onMouseLeave={e => (e.currentTarget.style.color = isDark ? 'rgba(254,244,228,0.32)' : 'rgba(42,26,8,0.32)')}
                >
                  ⚙
                </motion.button>
              </Link>

              {/* PROFILE — desktop */}
              <Link href="/dashboard" style={{ textDecoration: 'none' }} className="hidden md:block">
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  style={{
                    background: 'none',
                    border: `1px solid ${isDark ? 'rgba(212,175,55,0.20)' : 'rgba(139,100,16,0.20)'}`,
                    borderRadius: '20px', padding: '4px 13px', cursor: 'pointer',
                    fontFamily: 'var(--font-jost)', fontSize: '10px',
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: mutedText, transition: 'all 0.2s',
                  }}
                >
                  PROFILE
                </motion.button>
              </Link>

              {/* OUT (sign out) — matches reference screenshot "OUT" pill */}
              <button
                onClick={handleSignOut}
                className="hidden md:block"
                style={{
                  background: isDark ? 'rgba(254,244,228,0.04)' : 'rgba(42,26,8,0.04)',
                  border: `1px solid ${isDark ? 'rgba(254,244,228,0.10)' : 'rgba(42,26,8,0.10)'}`,
                  borderRadius: '20px', padding: '4px 12px', cursor: 'pointer',
                  fontFamily: 'var(--font-jost)', fontSize: '10px',
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: isDark ? 'rgba(254,244,228,0.30)' : 'rgba(42,26,8,0.30)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = isDark ? 'rgba(254,244,228,0.65)' : 'rgba(42,26,8,0.65)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = isDark ? 'rgba(254,244,228,0.30)' : 'rgba(42,26,8,0.30)'
                }}
              >
                OUT
              </button>
            </>
          )}

          {!isAuthed && (
            <Link href="/auth/signin" className="hidden md:block" style={{ textDecoration: 'none' }}>
              <button style={{
                background: isDark ? 'rgba(212,175,55,0.08)' : 'rgba(139,100,16,0.08)',
                border: `1px solid ${isDark ? 'rgba(212,175,55,0.22)' : 'rgba(139,100,16,0.22)'}`,
                borderRadius: '20px', padding: '4px 16px', cursor: 'pointer',
                fontFamily: 'var(--font-jost)', fontSize: '10px',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: isDark ? 'rgba(254,244,228,0.6)' : 'rgba(42,26,8,0.6)',
                transition: 'all 0.2s',
              }}>
                SIGN IN
              </button>
            </Link>
          )}

          {/* HAMBURGER — mobile only */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="md:hidden"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px', display: 'flex', flexDirection: 'column',
              gap: '4px', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                animate={menuOpen
                  ? i === 0 ? { rotate: 45, y: 8 } : i === 1 ? { opacity: 0 } : { rotate: -45, y: -8 }
                  : { rotate: 0, y: 0, opacity: 1 }
                }
                style={{
                  width: '18px', height: '1.5px',
                  background: isDark ? 'rgba(254,244,228,0.6)' : 'rgba(42,26,8,0.6)',
                  borderRadius: '1px', transformOrigin: 'center',
                }}
              />
            ))}
          </button>
        </div>
      </motion.nav>

      {/* ── MOBILE SLIDE-DOWN MENU ── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            style={{
              position: 'fixed', top: '52px', left: 0, right: 0, zIndex: 99,
              background: isDark ? 'rgba(8,4,1,0.97)' : 'rgba(240,228,192,0.97)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              borderBottom: `1px solid ${border}`,
              padding: '10px 16px 16px',
            }}
          >
            {navLinks.map(link => {
              const active = isActive(link.href)
              const accent = link.orion ? '#5B9BD5' : activeGold
              return (
                <Link key={link.href} href={link.href}
                  onClick={() => setMenuOpen(false)}
                  style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '11px 16px', borderRadius: '12px', marginBottom: '3px',
                    background: active
                      ? (link.orion ? 'rgba(91,155,213,0.10)' : (isDark ? 'rgba(212,175,55,0.08)' : 'rgba(139,100,16,0.08)'))
                      : 'transparent',
                    color: active ? accent : mutedText,
                    fontFamily: 'var(--font-jost)', fontSize: '11px',
                    letterSpacing: '0.13em', textTransform: 'uppercase',
                  }}>
                    <span style={{ fontSize: '11px', color: active ? accent : 'inherit' }}>{link.icon}</span>
                    {link.label}
                  </div>
                </Link>
              )
            })}

            {/* Mobile bottom actions */}
            <div style={{
              marginTop: '10px', paddingTop: '12px',
              borderTop: `1px solid ${isDark ? 'rgba(212,175,55,0.08)' : 'rgba(139,100,16,0.10)'}`,
              display: 'flex', gap: '8px', flexWrap: 'wrap',
            }}>
              {isAuthed ? (
                <>
                  <Link href="/dashboard" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', flex: 1 }}>
                    <button style={{
                      width: '100%', padding: '10px', borderRadius: '12px', cursor: 'pointer',
                      background: isDark ? 'rgba(212,175,55,0.06)' : 'rgba(139,100,16,0.06)',
                      border: `1px solid ${isDark ? 'rgba(212,175,55,0.15)' : 'rgba(139,100,16,0.15)'}`,
                      color: mutedText, fontFamily: 'var(--font-jost)', fontSize: '10px',
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                    }}>PROFILE</button>
                  </Link>
                  <Link href="/settings" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none' }}>
                    <button style={{
                      padding: '10px 16px', borderRadius: '12px', cursor: 'pointer',
                      background: 'none',
                      border: `1px solid ${isDark ? 'rgba(212,175,55,0.12)' : 'rgba(139,100,16,0.12)'}`,
                      color: mutedText, fontFamily: 'var(--font-jost)', fontSize: '15px',
                    }}>⚙</button>
                  </Link>
                  <button onClick={handleSignOut} style={{
                    flex: 1, padding: '10px', borderRadius: '12px', cursor: 'pointer',
                    background: 'none',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(42,26,8,0.08)'}`,
                    color: isDark ? 'rgba(254,244,228,0.35)' : 'rgba(42,26,8,0.40)',
                    fontFamily: 'var(--font-jost)', fontSize: '10px',
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                  }}>OUT</button>
                </>
              ) : (
                <Link href="/auth/signin" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', flex: 1 }}>
                  <button style={{
                    width: '100%', padding: '10px', borderRadius: '12px', cursor: 'pointer',
                    background: isDark ? 'rgba(212,175,55,0.08)' : 'rgba(139,100,16,0.08)',
                    border: `1px solid ${isDark ? 'rgba(212,175,55,0.2)' : 'rgba(139,100,16,0.2)'}`,
                    color: isDark ? 'rgba(254,244,228,0.7)' : 'rgba(42,26,8,0.7)',
                    fontFamily: 'var(--font-jost)', fontSize: '10px',
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                  }}>SIGN IN</button>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}