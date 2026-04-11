'use client'
// src/components/ui/ParticleCanvas.tsx
import { useEffect, useRef } from 'react'
import { useThemeStore } from '@/lib/themeStore'

interface Particle {
  x: number; y: number; vx: number; vy: number
  size: number; opacity: number; color: string; life: number
}

interface Props {
  colors?: string[]
  count?: number
}

/** Resolves a CSS variable string like 'var(--particle-a)' to its computed hex/rgb value.
 *  Falls back to the input string if it is already a raw colour. */
function resolveCssVar(value: string): string {
  if (!value.startsWith('var(')) return value
  const name = value.slice(4, -1).trim()           // '--particle-a'
  const resolved = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
  return resolved || value
}

export function ParticleCanvas({
  colors = ['#d4af37', '#f0d060', '#b8860b', '#fef4e4'],
  count = 40,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { theme } = useThemeStore()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Resolve all colour values once per theme change (after paint so CSS vars are live)
    const resolvedColors = colors.map(resolveCssVar)

    const particles: Particle[] = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -Math.random() * 0.5 - 0.1,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.1,
      color: resolvedColors[Math.floor(Math.random() * resolvedColors.length)],
      life: Math.random(),
    }))

    let raf: number

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        p.life += 0.002

        if (p.y < -10) {
          p.y = canvas.height + 10
          p.x = Math.random() * canvas.width
          // Re-resolve colour on reset so theme changes propagate gradually
          p.color = colors.map(resolveCssVar)[Math.floor(Math.random() * colors.length)]
        }

        // Light theme: more visible than 0.35 so cream bg doesn't swallow them
        const alpha = theme === 'dark' ? p.opacity : p.opacity * 0.55

        // Core dot
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = hexAlpha(p.color, alpha)
        ctx.fill()

        // Soft glow halo
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4)
        grd.addColorStop(0, hexAlpha(p.color, alpha * 0.4))
        grd.addColorStop(1, hexAlpha(p.color, 0))
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2)
        ctx.fillStyle = grd
        ctx.fill()
      })

      raf = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [theme, colors, count])

  return (
    <canvas
      ref={canvasRef}
      className="particles-canvas"
      style={{ opacity: theme === 'dark' ? 0.6 : 0.45 }}
    />
  )
}

/**
 * Appends an alpha channel to a colour string.
 * Handles hex (#rrggbb / #rgb), rgb(), and named colours.
 */
function hexAlpha(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha))
  const hex2 = Math.round(a * 255).toString(16).padStart(2, '0')

  // Already a 6-digit hex
  if (/^#[0-9a-f]{6}$/i.test(color)) return color + hex2

  // 3-digit hex
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    const [, r, g, b] = color
    return `#${r}${r}${g}${g}${b}${b}${hex2}`
  }

  // rgb(r, g, b) or rgb(r g b)
  const rgb = color.match(/rgb\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/)
  if (rgb) {
    const [, r, g, b] = rgb
    return `rgba(${r},${g},${b},${a})`
  }

  // Fallback: just append and hope for the best
  return color + hex2
}