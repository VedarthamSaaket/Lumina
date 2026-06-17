'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useThemeStore } from '@/lib/themeStore'
import Grainient from '@/components/ui/Grainient'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getAuthHeader(): Record<string, string> {
  if (typeof document === 'undefined') return {}
  const cookie = document.cookie.split(';').map(c => c.trim())
    .find(c => c.startsWith('lumina_token='))
  const token = cookie ? cookie.split('=')[1] : localStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

interface OrionInsight {
  id: string
  title: string
  content: string
  created_at: string
}

interface OrionInsightCardProps {
  insights?: OrionInsight[]
  maxDisplay?: number
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  } catch {
    return d
  }
}

function GrainBox({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { theme } = useThemeStore()
  const isDark = theme === 'dark'
  const color = '#5B9BD5'

  return (
    <div className={`relative rounded-xl overflow-hidden ${className}`} style={{
      background: isDark
        ? 'linear-gradient(160deg, rgba(8,12,28,0.97) 0%, rgba(12,18,38,0.97) 100%)'
        : 'linear-gradient(160deg, rgba(235,240,252,0.97) 0%, rgba(220,232,248,0.97) 100%)',
      border: `1px solid ${isDark ? `${color}22` : `${color}28`}`,
      boxShadow: isDark
        ? '0 8px 48px rgba(0,0,0,0.65), 0 0 0 1px rgba(91,155,213,0.08)'
        : '0 8px 40px rgba(30,60,120,0.12), 0 0 0 1px rgba(91,155,213,0.08)',
    }}>
      {/* Grainient background - matching OrionChatPanel */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', borderRadius: 'inherit', width: '100%', height: '100%' }}>
        <Grainient
          color1={isDark ? '#1a2a4a' : '#a8c8e8'}
          color2={isDark ? '#0a1528' : '#c8d8f0'}
          color3={isDark ? '#050a14' : '#e8f0f8'}
          timeSpeed={0.12}
          grainAmount={0.06}
          grainScale={2.2}
          grainAnimated={true}
          contrast={1.25}
          saturation={0.75}
          zoom={0.95}
          warpStrength={0}
          warpFrequency={3.5}
          warpSpeed={1.0}
        />
      </div>
      {/* CSS grain overlay */}
      <div className="absolute inset-0 pointer-events-none z-10" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '180px',
        mixBlendMode: 'overlay',
        opacity: 0.36,
      }} />
      {/* Subtle inner glow at top */}
      <div className="absolute top-0 left-0 right-0 h-px pointer-events-none z-10" style={{
        background: 'linear-gradient(90deg, transparent, rgba(91,155,213,0.3), transparent)',
      }} />
      <div className="relative z-20">
        {children}
      </div>
    </div>
  )
}

function parseDebrief(text: string) {
  const result: Record<string, string> = { raw: text }
  const markers = [
    ['HEADLINE:', 'headline'],
    ['WHAT HAPPENED:', 'what_happened'],
    ['WHAT THIS TELLS YOU:', 'what_this_tells_you'],
    ['ONE THING TO TRY:', 'one_thing_to_try'],
  ] as const

  for (let i = 0; i < markers.length; i++) {
    const [label, key] = markers[i]
    const idx = text.indexOf(label)
    if (idx < 0) continue
    const nextIdx = markers.slice(i + 1).reduce((min, [nextLabel]) => {
      const pos = text.indexOf(nextLabel, idx + label.length)
      return pos > 0 && pos < min ? pos : min
    }, text.length)
    ;(result as any)[key] = text.slice(idx + label.length, nextIdx).trim()
  }

  return result
}

export function OrionInsightCard({ insights: initialInsights, maxDisplay = 3 }: OrionInsightCardProps) {
  const { theme } = useThemeStore()
  const isDark = theme === 'dark'
  const color = '#5B9BD5'

  const [insights, setInsights] = useState<OrionInsight[]>(initialInsights || [])
  const [loading, setLoading] = useState(!initialInsights)

  useEffect(() => {
    if (initialInsights) {
      setInsights(initialInsights)
      setLoading(false)
      return
    }

    fetch(`${API}/api/orion/debriefs`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setInsights(data)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [initialInsights])

  const textPrimary = isDark ? 'rgba(220,235,255,0.92)' : 'rgba(20,40,80,0.90)'
  const textMuted = isDark ? 'rgba(160,185,220,0.55)' : 'rgba(40,70,120,0.55)'

  if (loading) {
    return (
      <GrainBox>
        <div className="p-4 flex items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0" style={{ borderColor: `${color} transparent transparent transparent` }} />
          <span className="font-jost text-xs" style={{ color: textMuted }}>
            Loading Orion insights...
          </span>
        </div>
      </GrainBox>
    )
  }

  if (insights.length === 0) {
    return (
      <GrainBox>
        <div className="p-4 text-center">
          <p className="font-jost text-xs mb-2" style={{ color: textMuted }}>
            No Orion insights yet
          </p>
          <motion.button
            onClick={() => window.location.href = '/cognitive/memory'}
            whileHover={{ scale: 1.02 }}
            className="px-4 py-2 rounded-lg font-jost text-xs tracking-widest uppercase"
            style={{ background: `${color}12`, border: `1px solid ${color}25`, color }}
          >
            Play a game
          </motion.button>
        </div>
      </GrainBox>
    )
  }

  return (
    <div className="space-y-3">
      {insights.slice(0, maxDisplay).map((insight, index) => {
        const parsed = parseDebrief(insight.content)
        const dateStr = formatDate(insight.created_at || '')
        const gameMatch = insight.title?.match(/^(.+?)\s+-\s+/)

        return (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <GrainBox>
              <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-jost"
                      style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}
                    >
                      *
                    </div>
                    <div>
                      {gameMatch && (
                        <p className="font-jost text-xs" style={{ color, letterSpacing: '0.05em', margin: 0 }}>
                          {gameMatch[1]}
                        </p>
                      )}
                      <p className="font-jost text-[10px]" style={{ color: textMuted, margin: 0 }}>
                        {dateStr}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                {parsed.headline ? (
                  <div className="space-y-2.5">
                    <p
                      className="font-body text-sm leading-relaxed"
                      style={{ color: textPrimary, fontStyle: 'italic', margin: 0 }}
                    >
                      {parsed.headline}
                    </p>
                    {parsed.one_thing_to_try && (
                      <div
                        className="p-2.5 rounded-lg"
                        style={{ background: `${color}08`, border: `1px solid ${color}15` }}
                      >
                        <p className="font-jost text-[10px] tracking-widest uppercase mb-1" style={{ color, margin: 0 }}>
                          Try this
                        </p>
                        <p className="font-jost text-xs leading-relaxed" style={{ color: textMuted, margin: 0 }}>
                          {parsed.one_thing_to_try}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p
                    className="font-jost text-xs leading-relaxed whitespace-pre-line"
                    style={{ color: textMuted, margin: 0 }}
                  >
                    {insight.content.slice(0, 200)}{insight.content.length > 200 ? '...' : ''}
                  </p>
                )}
              </div>
            </GrainBox>
          </motion.div>
        )
      })}

      {insights.length > maxDisplay && (
        <button
          onClick={() => window.location.href = '/orion'}
          className="w-full py-2 text-center font-jost text-xs tracking-widest uppercase"
          style={{ color: textMuted }}
        >
          View {insights.length - maxDisplay} more insights
        </button>
      )}
    </div>
  )
}

export default OrionInsightCard