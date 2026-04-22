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

  return (
    <>
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          height: '58px', display: 'flex', alignItems: 'center',
          padding: '0 24px', gap: '0',
          background: scrolled
            ? (isDark ? 'rgba(8, 4, 1, 0.88)' : 'rgba(240, 230, 204, 0.92)')
            : 'transparent',
          backdropFilter: scrolled ? 'blur(28px) saturate(180%)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(28px) saturate(180%)' : 'none',
          borderBottom: scrolled
            ? (isDark ? '1px solid rgba(212,175,55,0.10)' : '1px solid rgba(160,120,50,0.15)')
            : 'none',
          transition: 'background 0.3s, border-color 0.3s, backdrop-filter 0.3s',
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', flexShrink: 0, marginRight: '28px' }}>
          <span style={{
            fontFamily: 'var(--font-cormorant)',
            fontStyle: 'italic', fontWeight: 300,
            fontSize: '22px',
            color: isDark ? 'rgba(254,244,228,0.95)' : 'rgba(42,26,8,0.92)',
            letterSpacing: '0.02em',
          }}>
            Lumina
          </span>
        </Link>

        {/* Desktop nav links — inline, no hamburger on desktop */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: '2px',
        }}
          className="hidden md:flex"
        >
          {navLinks.map(link => {
            const active = isActive(link.href)
            const accentColor = link.orion ? '#5B9BD5' : (isDark ? '#d4af37' : '#8b6410')
            return (
              <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
                <motion.div
                  whileHover={{ y: -1 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '5px 10px', borderRadius: '20px',
                    fontFamily: 'var(--font-jost)', fontSize: '10px',
                    fontWeight: 500, letterSpacing: '0.13em',
                    color: active
                      ? accentColor
                      : (isDark ? 'rgba(254,244,228,0.50)' : 'rgba(42,26,8,0.50)'),
                    background: active
                      ? (link.orion ? 'rgba(91,155,213,0.12)' : (isDark ? 'rgba(212,175,55,0.10)' : 'rgba(139,100,16,0.08)'))
                      : 'transparent',
                    border: active
                      ? (link.orion ? '1px solid rgba(91,155,213,0.28)' : (isDark ? '1px solid rgba(212,175,55,0.22)' : '1px solid rgba(139,100,16,0.22)'))
                      : '1px solid transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{
                    fontSize: '9px',
                    color: active
                      ? accentColor
                      : (isDark ? 'rgba(254,244,228,0.28)' : 'rgba(42,26,8,0.28)'),
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

        {/* Right controls — theme toggle, profile, sign out, settings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: 'auto' }}>

          {/* Theme toggle - simple icon button */}
          <motion.button
            onClick={toggleTheme}
            whileTap={{ scale: 0.9 }}
            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            style={{
              background: 'none',
              border: `1px solid ${isDark ? 'rgba(212,175,55,0.22)' : 'rgba(139,100,16,0.22)'}`,
              borderRadius: '50%', width: '32px', height: '32px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isDark ? 'rgba(212,175,55,0.7)' : 'rgba(139,100,16,0.7)',
              fontSize: '13px', transition: 'all 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(212,175,55,0.1)' : 'rgba(139,100,16,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            {isDark ? '◑' : '◐'}
          </motion.button>

          {isAuthed && (
            <>
              {/* Profile button — desktop only */}
              <Link href="/dashboard" style={{ textDecoration: 'none' }} className="hidden md:block">
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  style={{
                    background: 'none',
                    border: `1px solid ${isDark ? 'rgba(212,175,55,0.22)' : 'rgba(139,100,16,0.22)'}`,
                    borderRadius: '20px', padding: '5px 14px', cursor: 'pointer',
                    fontFamily: 'var(--font-jost)', fontSize: '10px',
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: isDark ? 'rgba(254,244,228,0.55)' : 'rgba(42,26,8,0.55)',
                    transition: 'all 0.2s',
                  }}
                >
                  PROFILE
                </motion.button>
              </Link>

              {/* Sign out — desktop only */}
              <button
                onClick={handleSignOut}
                className="hidden md:block"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
                  fontFamily: 'var(--font-jost)', fontSize: '10px',
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: isDark ? 'rgba(254,244,228,0.32)' : 'rgba(42,26,8,0.32)',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = isDark ? 'rgba(254,244,228,0.7)' : 'rgba(42,26,8,0.7)')}
                onMouseLeave={e => (e.currentTarget.style.color = isDark ? 'rgba(254,244,228,0.32)' : 'rgba(42,26,8,0.32)')}
              >
                SIGN OUT
              </button>

              {/* Settings icon — desktop */}
              <Link href="/settings" style={{ textDecoration: 'none' }} className="hidden md:block">
                <motion.button
                  whileHover={{ scale: 1.08, rotate: 18 }} whileTap={{ scale: 0.92 }}
                  title="Settings"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isDark ? 'rgba(254,244,228,0.35)' : 'rgba(42,26,8,0.35)',
                    fontSize: '14px', transition: 'color 0.2s',
                    borderRadius: '50%',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = isDark ? 'rgba(212,175,55,0.8)' : 'rgba(139,100,16,0.8)')}
                  onMouseLeave={e => (e.currentTarget.style.color = isDark ? 'rgba(254,244,228,0.35)' : 'rgba(42,26,8,0.35)')}
                >
                  ⚙
                </motion.button>
              </Link>
            </>
          )}

          {!isAuthed && (
            <Link href="/auth/signin" className="hidden md:block" style={{ textDecoration: 'none' }}>
              <button style={{
                background: isDark ? 'rgba(212,175,55,0.08)' : 'rgba(139,100,16,0.08)',
                border: `1px solid ${isDark ? 'rgba(212,175,55,0.22)' : 'rgba(139,100,16,0.22)'}`,
                borderRadius: '20px', padding: '5px 16px', cursor: 'pointer',
                fontFamily: 'var(--font-jost)', fontSize: '10px',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: isDark ? 'rgba(254,244,228,0.6)' : 'rgba(42,26,8,0.6)',
                transition: 'all 0.2s',
              }}>
                SIGN IN
              </button>
            </Link>
          )}

          {/* Hamburger — mobile only */}
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

      {/* Mobile slide-down menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            style={{
              position: 'fixed', top: '58px', left: 0, right: 0, zIndex: 99,
              background: isDark ? 'rgba(8,4,1,0.97)' : 'rgba(240,230,204,0.97)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              borderBottom: `1px solid ${isDark ? 'rgba(212,175,55,0.10)' : 'rgba(139,100,16,0.15)'}`,
              padding: '10px 16px 16px',
            }}
          >
            {navLinks.map(link => {
              const active = isActive(link.href)
              const accentColor = link.orion ? '#5B9BD5' : (isDark ? '#d4af37' : '#8b6410')
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
                    color: active ? accentColor : (isDark ? 'rgba(254,244,228,0.60)' : 'rgba(42,26,8,0.60)'),
                    fontFamily: 'var(--font-jost)', fontSize: '11px',
                    letterSpacing: '0.13em', textTransform: 'uppercase',
                  }}>
                    <span style={{ fontSize: '11px', color: active ? accentColor : 'inherit' }}>{link.icon}</span>
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
                      color: isDark ? 'rgba(254,244,228,0.6)' : 'rgba(42,26,8,0.6)',
                      fontFamily: 'var(--font-jost)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase',
                    }}>Profile</button>
                  </Link>
                  <Link href="/settings" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none' }}>
                    <button style={{
                      padding: '10px 16px', borderRadius: '12px', cursor: 'pointer',
                      background: 'none',
                      border: `1px solid ${isDark ? 'rgba(212,175,55,0.12)' : 'rgba(139,100,16,0.12)'}`,
                      color: isDark ? 'rgba(254,244,228,0.5)' : 'rgba(42,26,8,0.5)',
                      fontFamily: 'var(--font-jost)', fontSize: '14px',
                    }}>⚙</button>
                  </Link>
                  <button onClick={handleSignOut} style={{
                    flex: 1, padding: '10px', borderRadius: '12px', cursor: 'pointer',
                    background: 'none',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(42,26,8,0.08)'}`,
                    color: isDark ? 'rgba(254,244,228,0.35)' : 'rgba(42,26,8,0.40)',
                    fontFamily: 'var(--font-jost)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase',
                  }}>Sign out</button>
                </>
              ) : (
                <Link href="/auth/signin" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', flex: 1 }}>
                  <button style={{
                    width: '100%', padding: '10px', borderRadius: '12px', cursor: 'pointer',
                    background: isDark ? 'rgba(212,175,55,0.08)' : 'rgba(139,100,16,0.08)',
                    border: `1px solid ${isDark ? 'rgba(212,175,55,0.2)' : 'rgba(139,100,16,0.2)'}`,
                    color: isDark ? 'rgba(254,244,228,0.7)' : 'rgba(42,26,8,0.7)',
                    fontFamily: 'var(--font-jost)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase',
                  }}>Sign in</button>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}