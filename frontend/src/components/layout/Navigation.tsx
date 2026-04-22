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
    { href: '/chat', label: 'Lumina', icon: '✦' },
    { href: '/journal', label: 'Journal', icon: '◈' },
    { href: '/screening', label: 'Reflect', icon: '◎' },
    { href: '/cbt', label: 'Inner Work', icon: '❋' },
    { href: '/cognitive/memory', label: 'Memory', icon: '◐' },
    { href: '/orion', label: 'Orion', icon: '✦', orion: true },
  ]

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname?.startsWith(href)

  return (
    <>
      <motion.nav
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          height: '58px', display: 'flex', alignItems: 'center',
          padding: '0 24px',
          background: scrolled
            ? 'rgba(8, 4, 1, 0.85)'
            : 'transparent',
          backdropFilter: scrolled ? 'blur(28px) saturate(180%)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(28px) saturate(180%)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(212,175,55,0.10)' : 'none',
          transition: 'background 0.3s, border-color 0.3s, backdrop-filter 0.3s',
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <span style={{
            fontFamily: 'var(--font-cormorant)',
            fontStyle: 'italic', fontWeight: 300,
            fontSize: '22px',
            color: 'rgba(254,244,228,0.95)',
            letterSpacing: '0.02em',
          }}>
            Lumina
          </span>
        </Link>

        {/* Desktop nav */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '4px' }}
          className="hidden md:flex">
          {navLinks.map(link => {
            const active = isActive(link.href)
            return (
              <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
                <motion.div
                  whileHover={{ y: -1 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '5px 12px', borderRadius: '20px',
                    fontFamily: 'var(--font-jost)', fontSize: '11px',
                    fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: active
                      ? (link.orion ? '#5B9BD5' : '#d4af37')
                      : 'rgba(254,244,228,0.52)',
                    background: active
                      ? (link.orion ? 'rgba(91,155,213,0.12)' : 'rgba(212,175,55,0.10)')
                      : 'transparent',
                    border: active
                      ? (link.orion ? '1px solid rgba(91,155,213,0.28)' : '1px solid rgba(212,175,55,0.22)')
                      : '1px solid transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{
                    fontSize: '10px',
                    color: active
                      ? (link.orion ? '#5B9BD5' : '#d4af37')
                      : 'rgba(254,244,228,0.3)',
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

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
              color: 'rgba(254,244,228,0.4)',
              fontFamily: 'var(--font-jost)', fontSize: '10px',
              letterSpacing: '0.1em', textTransform: 'uppercase',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(254,244,228,0.85)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(254,244,228,0.4)')}
          >
            {theme === 'dark' ? '◑' : '◐'}
          </button>

          {isAuthed ? (
            <>
              <Link href="/dashboard" style={{ textDecoration: 'none' }}
                className="hidden md:block">
                <button style={{
                  background: 'none',
                  border: '1px solid rgba(212,175,55,0.22)',
                  borderRadius: '20px', padding: '5px 14px', cursor: 'pointer',
                  fontFamily: 'var(--font-jost)', fontSize: '10px',
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: 'rgba(254,244,228,0.55)', transition: 'all 0.2s',
                }}>
                  Profile
                </button>
              </Link>
              <button
                onClick={handleSignOut}
                className="hidden md:block"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
                  fontFamily: 'var(--font-jost)', fontSize: '10px',
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: 'rgba(254,244,228,0.32)',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(254,244,228,0.7)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(254,244,228,0.32)')}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link href="/auth/signin" className="hidden md:block" style={{ textDecoration: 'none' }}>
              <button style={{
                background: 'rgba(212,175,55,0.08)',
                border: '1px solid rgba(212,175,55,0.22)',
                borderRadius: '20px', padding: '5px 16px', cursor: 'pointer',
                fontFamily: 'var(--font-jost)', fontSize: '10px',
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'rgba(254,244,228,0.6)', transition: 'all 0.2s',
              }}>
                Sign in
              </button>
            </Link>
          )}

          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="md:hidden"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '6px',
              display: 'flex', flexDirection: 'column', gap: '4px',
            }}
          >
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: '18px', height: '1.5px',
                background: 'rgba(254,244,228,0.55)',
                borderRadius: '1px', transition: 'all 0.2s',
              }} />
            ))}
          </button>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed', top: '58px', left: 0, right: 0,
              zIndex: 99,
              background: 'rgba(8,4,1,0.97)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              borderBottom: '1px solid rgba(212,175,55,0.10)',
              padding: '12px 16px 16px',
            }}
          >
            {navLinks.map(link => {
              const active = isActive(link.href)
              return (
                <Link key={link.href} href={link.href}
                  onClick={() => setMenuOpen(false)}
                  style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '11px 16px', borderRadius: '12px', marginBottom: '4px',
                    background: active
                      ? (link.orion ? 'rgba(91,155,213,0.10)' : 'rgba(212,175,55,0.08)')
                      : 'transparent',
                    color: active
                      ? (link.orion ? '#5B9BD5' : '#d4af37')
                      : 'rgba(254,244,228,0.60)',
                    fontFamily: 'var(--font-jost)', fontSize: '12px',
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                  }}>
                    <span style={{ fontSize: '12px' }}>{link.icon}</span>
                    {link.label}
                  </div>
                </Link>
              )
            })}
            <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid rgba(212,175,55,0.08)' }}>
              {isAuthed ? (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Link href="/dashboard" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', flex: 1 }}>
                    <button style={{
                      width: '100%', padding: '10px', borderRadius: '12px', cursor: 'pointer',
                      background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)',
                      color: 'rgba(254,244,228,0.6)',
                      fontFamily: 'var(--font-jost)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase',
                    }}>Profile</button>
                  </Link>
                  <button onClick={handleSignOut} style={{
                    flex: 1, padding: '10px', borderRadius: '12px', cursor: 'pointer',
                    background: 'none', border: '1px solid rgba(255,255,255,0.06)',
                    color: 'rgba(254,244,228,0.35)',
                    fontFamily: 'var(--font-jost)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase',
                  }}>Sign out</button>
                </div>
              ) : (
                <Link href="/auth/signin" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none' }}>
                  <button style={{
                    width: '100%', padding: '10px', borderRadius: '12px', cursor: 'pointer',
                    background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)',
                    color: 'rgba(254,244,228,0.7)',
                    fontFamily: 'var(--font-jost)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase',
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