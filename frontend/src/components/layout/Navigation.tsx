'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { authAPI } from '@/lib/api'
import Cookies from 'js-cookie'

const NAV = [
  { href: '/chat', label: 'Lumina', icon: '✦' },
  { href: '/journal', label: 'Journal', icon: '◈' },
  { href: '/cbt', label: 'Inner Work', icon: '❋' },
  { href: '/screening', label: 'Reflect', icon: '◎' },
  { href: '/cognitive/memory', label: 'Memory', icon: '◉' },
  { href: '/crisis', label: 'Crisis', icon: '⚡', crisis: true },
  { href: '/dashboard', label: 'Profile', icon: '◉', profile: true },
]

export function Navigation() {
  const path = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const handleSignout = async () => {
    try { await authAPI.signout() } catch { /* ignore */ }
    Cookies.remove('lumina_token')
    localStorage.removeItem('access_token')
    setOpen(false)
    router.push('/auth/signin')
  }

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-6 py-3 md:py-4 glass no-select"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}>

        {/* Logo - gold spinning orb */}
        <Link href="/" className="flex items-center gap-2 md:gap-3" onClick={() => setOpen(false)}>
          <motion.div
            className="w-6 h-6 md:w-7 md:h-7 rounded-full"
            style={{ background: 'linear-gradient(135deg, #d4af37 0%, #f0d060 50%, #b8860b 100%)', opacity: 0.9 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 22, repeat: Infinity, ease: 'linear' }} />
          <span className="text-lg md:text-xl tracking-[0.28em] font-gothic" style={{ color: 'var(--text-primary)' }}>
            LUMINA
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-6">
          {NAV.filter(n => !n.crisis && !n.profile).map(({ href, label, icon }) => {
            const active = path === href || (href !== '/chat' && path.startsWith(href))
            return (
              <Link key={href} href={href}
                className="relative flex items-center gap-1.5 transition-all duration-300 pb-0.5"
                style={{ color: active ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                <span className="text-xs opacity-50">{icon}</span>
                <span className="text-xs tracking-[0.14em] font-jost font-medium uppercase">{label}</span>
                {active && (
                  <motion.div layoutId="nav-line"
                    className="absolute -bottom-0.5 left-0 right-0 h-px"
                    style={{ background: 'linear-gradient(90deg, #b8860b, #d4af37, #f0d060, #d4af37, #b8860b)' }} />
                )}
              </Link>
            )
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 md:gap-3">
          <ThemeToggle />

          {/* Crisis */}
          <Link href="/crisis"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-jost font-semibold tracking-widest uppercase transition-all duration-300 hover:scale-105"
            style={{ background: 'rgba(220,38,38,0.13)', border: '1px solid rgba(220,38,38,0.35)', color: '#fca5a5' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Crisis
          </Link>

          {/* Profile */}
          <Link href="/dashboard"
            className="hidden md:flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 hover:scale-105"
            style={{
              background: path.startsWith('/dashboard') ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.08)',
              border: path.startsWith('/dashboard') ? '1px solid rgba(212,175,55,0.5)' : '1px solid rgba(212,175,55,0.22)',
              color: 'var(--gold)',
            }}
            title="Your profile">
            <span className="text-xs font-jost">◉</span>
          </Link>

          {/* Sign out */}
          <button
            onClick={handleSignout}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-jost font-medium tracking-widest uppercase transition-all duration-300 hover:scale-105 hover:opacity-100 opacity-50"
            style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
            title="Sign out">
            Out
          </button>

          {/* Hamburger - mobile only */}
          <button
            onClick={() => setOpen(v => !v)}
            aria-label="Toggle menu"
            className="md:hidden flex flex-col justify-center items-center w-9 h-9 rounded-xl gap-1.5 transition-all"
            style={{
              background: open ? 'rgba(212,175,55,0.1)' : 'transparent',
              border: '1px solid var(--border-subtle)',
            }}>
            <motion.span animate={{ rotate: open ? 45 : 0, y: open ? 7 : 0 }}
              className="block w-4 h-px rounded-full"
              style={{ background: 'var(--text-primary)', transformOrigin: 'center' }} />
            <motion.span animate={{ opacity: open ? 0 : 1 }}
              className="block w-4 h-px rounded-full"
              style={{ background: 'var(--text-primary)' }} />
            <motion.span animate={{ rotate: open ? -45 : 0, y: open ? -7 : 0 }}
              className="block w-4 h-px rounded-full"
              style={{ background: 'var(--text-primary)', transformOrigin: 'center' }} />
          </button>
        </div>
      </motion.nav>

      {/* Mobile slide-down menu */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 md:hidden"
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />

            <motion.div
              initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-[57px] left-3 right-3 z-50 md:hidden rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(8,3,0,0.97)',
                border: '1px solid var(--border-medium)',
                backdropFilter: 'blur(40px)',
              }}>

              <div className="p-3 space-y-1">
                {NAV.map(({ href, label, icon, crisis }) => {
                  const active = path === href || (href !== '/chat' && path.startsWith(href))
                  return (
                    <Link key={href} href={href} onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                      style={{
                        background: active ? 'rgba(212,175,55,0.1)' : 'transparent',
                        border: `1px solid ${active ? 'rgba(212,175,55,0.22)' : 'transparent'}`,
                        color: crisis ? '#fca5a5' : active ? 'var(--text-primary)' : 'var(--text-secondary)',
                      }}>
                      <span style={{ fontSize: '13px', opacity: crisis ? 1 : 0.55 }}>{icon}</span>
                      <span className="font-jost text-sm tracking-widest uppercase">{label}</span>
                      {crisis && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse ml-auto" />}
                    </Link>
                  )
                })}

                <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />

                <button onClick={handleSignout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                  style={{ color: 'var(--text-muted)', background: 'transparent' }}>
                  <span style={{ fontSize: '13px', opacity: 0.4 }}>→</span>
                  <span className="font-jost text-sm tracking-widest uppercase">Sign Out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}