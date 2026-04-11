'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navigation } from '@/components/layout/Navigation'
import { ParticleCanvas } from '@/components/ui/ParticleCanvas'
import DarkVeil from '@/components/DarkVeil'
import '@/components/DarkVeil.css'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function fetchSummary(prompt: string): Promise<string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  try {
    const res = await fetch(`${API_BASE}/api/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      credentials: 'include',
      body: JSON.stringify({ prompt }),
    })
    if (!res.ok) return ''
    const data = await res.json()
    return data.summary ?? ''
  } catch { return '' }
}

interface AuthMe { id: string; email: string; theme?: string; created_at: string }
interface ScreeningRow { id: string; type: string; score: number; severity: string; completed_at: string }
interface MemoryRow {
  id?: string
  game_type: string
  display_name?: string
  completed_at: string
  scores: Record<string, number | string | undefined>
  rounds?: any[]
}
interface JournalRow { id: string; content: string; mood_score?: number; tags?: string[]; created_at: string }
interface MoodRow { id: string; score: number; note?: string; tags?: string[]; created_at: string }
interface CBTModule { id: string; completed: boolean }
interface SummaryRow { id: string; title: string; content: string; source: string; created_at: string }

const TEST_DISPLAY: Record<string, { name: string; color: string }> = {
  PHQ9: { name: 'Mood Check', color: '#d4af37' },
  GAD7: { name: 'Mind and Worry', color: '#c9897a' },
  RSES: { name: 'How You See Yourself', color: '#c4913a' },
  MOOD: { name: 'Mood Check', color: '#d4af37' },
  WORRY: { name: 'Mind and Worry', color: '#c9897a' },
  SELFWORTH: { name: 'How You See Yourself', color: '#c4913a' },
  BIGFIVE: { name: 'Who You Are', color: '#b8860b' },
  ATTACHMENT: { name: 'How You Connect', color: '#c9897a' },
  EQ: { name: 'Emotional Intelligence', color: '#8b9e7a' },
  CAREERVALUES: { name: 'What Work Means to You', color: '#7a9e7e' },
  WORKENVIRONMENT: { name: 'Where You Work Best', color: '#8b7355' },
  LEADERSHIP: { name: 'How You Lead and Contribute', color: '#b8a070' },
  BURNOUT: { name: 'Energy and Limits', color: '#c17a5a' },
}

// PATCH 1: Updated GAME_DISPLAY with 5 new fluid intelligence games
const GAME_DISPLAY: Record<string, { name: string; color: string; icon: string }> = {
  // Working memory
  digit: { name: 'Number Sequence', color: '#d4af37', icon: '8' },
  letter: { name: 'Letter Sequence', color: '#9b7fd4', icon: 'A' },
  math: { name: 'Math Patterns', color: '#7a9e7e', icon: '∑' },
  color: { name: 'Color Pattern', color: '#c9897a', icon: '◉' },
  spatial: { name: 'Pattern Memory', color: '#5b9bd5', icon: '+' },
  spatial_reverse: { name: 'Reverse Spatial', color: '#c4913a', icon: '⤢' },
  word: { name: 'Word Recall', color: '#c4913a', icon: 'W' },
  // Fluid intelligence (Cattell Culture Fair)
  matrix: { name: 'Matrix Reasoning', color: '#d4af37', icon: '⊞' },
  oddoneout: { name: 'Odd One Out', color: '#c9897a', icon: '◉' },
  series: { name: 'Series Completion', color: '#5b9bd5', icon: '→' },
  analogy: { name: 'Visual Analogy', color: '#8b7355', icon: '∷' },
  paperfold: { name: 'Paper Folding', color: '#d4af37', icon: '◱' },
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

async function apiFetch<T>(url: string): Promise<T | null> {
  const token = getToken()
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      credentials: 'include',
    })
    if (!res.ok) return null
    return await res.json() as T
  } catch { return null }
}

async function generateProfileSummary(
  screening: ScreeningRow[], memory: MemoryRow[], cbt: CBTModule[],
  moodCount: number, journalCount: number,
): Promise<string> {
  const screeningLines = screening.slice(0, 8).map(r => {
    const d = TEST_DISPLAY[r.type]
    return `- ${d?.name ?? r.type}: scored ${r.score}, described as "${r.severity}"`
  }).join('\n')

  const memoryLines = memory.slice(0, 6).map(r => {
    const s = r.scores
    const d = GAME_DISPLAY[r.game_type] || { name: r.game_type }
    const parts = Object.entries(s)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
    return `- ${d.name}: ${parts.join(', ')}`
  }).join('\n')

  const cbtDone = cbt.filter(m => m.completed)
  const prompt = `You are a warm, thoughtful psychological guide writing a personal profile reflection for someone based on everything they have engaged with.

Here is what they have completed:
${screeningLines ? `Self-reflection checks:\n${screeningLines}` : ''}
${memoryLines ? `\nCognitive memory games:\n${memoryLines}` : ''}
${cbtDone.length > 0 ? `\nInner work sessions completed: ${cbtDone.length}` : ''}
${moodCount > 0 ? `\nMood logs recorded: ${moodCount}` : ''}
${journalCount > 0 ? `\nJournal entries written: ${journalCount}` : ''}

Write a 3-paragraph personal profile reflection:
Paragraph 1: A warm, honest portrait of this person based on what their results suggest as a whole. Not a list of scores but a narrative of who they seem to be right now.
Paragraph 2: What their combined engagement suggests about how they move through the world and manage their inner life.
Paragraph 3: One or two gentle observations about what might be worth paying attention to, framed with curiosity. End on a note of agency.

Rules:
- No em dashes anywhere
- No clinical labels or diagnostic language
- Speak directly to them as "you"
- Warm, slightly literary tone
- Under 280 words
- No section headers, no bullet points, no bold text`
  return await fetchSummary(prompt)
}

function formatDate(d: string) {
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return d }
}
function formatDateShort(d: string) {
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }
  catch { return d }
}

function Card({ children, color, className = '' }: { children: React.ReactNode; color?: string; className?: string }) {
  return (
    <div className={`glass rounded-xl p-5 ${className}`}
      style={{ border: `1px solid ${color ? `${color}20` : 'var(--border-subtle)'}` }}>
      {children}
    </div>
  )
}
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="font-jost text-xs tracking-widest uppercase mb-1" style={{ color: 'var(--text-muted)' }}>{children}</p>
}
function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-block px-3 py-1 rounded-full font-jost text-xs"
      style={{ background: `${color}12`, border: `1px solid ${color}28`, color }}>
      {label}
    </span>
  )
}
function EmptyState({ message, cta, href }: { message: string; cta?: string; href?: string }) {
  return (
    <div className="py-10 text-center">
      <p className="font-body text-sm mb-4" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{message}</p>
      {cta && href && (
        <motion.button onClick={() => window.location.href = href} whileHover={{ scale: 1.03 }}
          className="px-5 py-2.5 rounded-xl font-jost text-xs tracking-widest uppercase glass"
          style={{ border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>
          {cta}
        </motion.button>
      )}
    </div>
  )
}
function MoodSparkline({ entries }: { entries: MoodRow[] }) {
  if (entries.length < 2) return null
  const recent = entries.slice(-14)
  const w = 280, h = 48
  const pts = recent.map((e, i) => {
    const x = (i / (recent.length - 1)) * w
    const y = h - (e.score / 10) * h
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ opacity: 0.7 }}>
      <polyline points={pts} fill="none" stroke="#d4af37" strokeWidth="1.5" strokeLinejoin="round" />
      {recent.map((e, i) => {
        const x = (i / (recent.length - 1)) * w
        const y = h - (e.score / 10) * h
        return <circle key={i} cx={x} cy={y} r="2.5" fill="#d4af37" />
      })}
    </svg>
  )
}

// ── Memory Tab: per-game-type summary cards ────────────────────────────────────
function MemoryTab({ memory }: { memory: MemoryRow[] }) {
  if (memory.length === 0) {
    return <EmptyState message="No memory games completed yet." cta="Play a game" href="/cognitive/memory" />
  }

  const byType: Record<string, MemoryRow[]> = {}
  for (const r of memory) {
    const gt = r.game_type || 'unknown'
    if (!byType[gt]) byType[gt] = []
    byType[gt].push(r)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="font-jost text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
          {memory.length} {memory.length === 1 ? 'session' : 'sessions'} across {Object.keys(byType).length} game{Object.keys(byType).length !== 1 ? 's' : ''}
        </p>
        <motion.button onClick={() => window.location.href = '/cognitive/memory'} whileHover={{ scale: 1.02 }}
          className="px-4 py-1.5 rounded-xl font-jost text-xs tracking-widest uppercase glass"
          style={{ border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>
          Play a game
        </motion.button>
      </div>

      {Object.entries(byType).map(([gameType, sessions], gi) => {
        const gd = GAME_DISPLAY[gameType] || { name: gameType, color: '#c9897a', icon: '?' }
        const latest = sessions[0]
        const allRounds: any[] = sessions.flatMap(s => s.rounds || [])
        const totalRounds = allRounds.length
        const correctRounds = allRounds.filter(r => r.correct).length
        const maxLevel = allRounds.length > 0 ? Math.max(...allRounds.map(r => r.level || 0)) : 0

        const keyStats: Array<{ label: string; value: string | number }> = []
        const s = latest.scores || {}

        if (gameType === 'digit' || gameType === 'letter') {
          if (s['Max forward span'] !== undefined) keyStats.push({ label: 'Max forward span', value: s['Max forward span'] })
          if (s['Max reverse span'] !== undefined) keyStats.push({ label: 'Max reverse span', value: s['Max reverse span'] })
          if (s['Modes attempted'] !== undefined) keyStats.push({ label: 'Modes tried', value: s['Modes attempted'] })
        } else if (gameType === 'math') {
          if (s['Max level'] !== undefined) keyStats.push({ label: 'Max level', value: s['Max level'] })
          if (s['Longest sequence'] !== undefined) keyStats.push({ label: 'Longest sequence', value: s['Longest sequence'] })
        } else if (gameType === 'color') {
          if (s['Longest pattern'] !== undefined) keyStats.push({ label: 'Longest pattern', value: s['Longest pattern'] })
        } else if (gameType === 'spatial' || gameType === 'spatial_reverse') {
          if (s['Max pattern length'] !== undefined) keyStats.push({ label: 'Max pattern', value: s['Max pattern length'] })
        } else if (gameType === 'word') {
          if (s['Recall accuracy'] !== undefined) keyStats.push({ label: 'Recall accuracy', value: s['Recall accuracy'] })
          if (s['Best list length'] !== undefined) keyStats.push({ label: 'Best list', value: s['Best list length'] })
        }

        keyStats.push({ label: 'Sessions', value: sessions.length })
        if (totalRounds > 0) keyStats.push({ label: 'Accuracy', value: `${Math.round(correctRounds / totalRounds * 100)}%` })

        return (
          <motion.div key={gameType} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.05 }}>
            <Card color={gd.color}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-display text-lg flex-shrink-0"
                    style={{ background: `${gd.color}12`, color: gd.color, border: `1.5px solid ${gd.color}28` }}>
                    {gd.icon}
                  </div>
                  <div>
                    <p className="font-gothic text-sm" style={{ color: 'var(--text-primary)', letterSpacing: '0.05em' }}>{gd.name}</p>
                    <p className="font-jost text-xs" style={{ color: 'var(--text-muted)' }}>Last played {formatDateShort(latest.completed_at)}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: `repeat(${Math.min(keyStats.length, 4)}, 1fr)` }}>
                {keyStats.map(({ label, value }) => (
                  <div key={label} className="rounded-lg p-2 text-center"
                    style={{ background: `${gd.color}08`, border: `1px solid ${gd.color}15` }}>
                    <p className="font-jost mb-0.5" style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                    <p className="font-display font-light text-xl" style={{ color: gd.color }}>{value}</p>
                  </div>
                ))}
              </div>

              {sessions.length > 1 && (
                <div>
                  <p className="font-jost text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Recent sessions</p>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {sessions.slice(0, 5).map((sess, si) => {
                      const sessRounds = sess.rounds || []
                      const sessCorrect = sessRounds.filter((r: any) => r.correct).length
                      const sessMax = sessRounds.length > 0 ? Math.max(...sessRounds.map((r: any) => r.level || 0)) : 0
                      return (
                        <div key={si} className="flex justify-between items-center text-xs font-jost py-1"
                          style={{ borderBottom: si < Math.min(sessions.length, 5) - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{formatDateShort(sess.completed_at)}</span>
                          <span style={{ color: 'var(--text-muted)' }}>
                            {sessRounds.length > 0 ? `${sessCorrect}/${sessRounds.length} · max level ${sessMax}` : Object.entries(sess.scores || {}).filter(([, v]) => v !== undefined).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join(', ') || 'played'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        )
      })}

      {/* PATCH 3: Updated allGameIds to include fluid intelligence games */}
      {(() => {
        const allGameIds = [
          'digit', 'letter', 'math', 'color', 'spatial', 'spatial_reverse', 'word',
          'matrix', 'oddoneout', 'series', 'analogy', 'paperfold',
        ]
        const playedIds = new Set(Object.keys(byType))
        const unplayed = allGameIds.filter(id => !playedIds.has(id))
        if (unplayed.length === 0) return null
        return (
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
            <p className="font-jost text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Not yet played</p>
            <div className="flex flex-wrap gap-2">
              {unplayed.map(id => {
                const gd = GAME_DISPLAY[id] || { name: id, color: '#888', icon: '?' }
                return (
                  <motion.button key={id} onClick={() => window.location.href = '/cognitive/memory'}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl font-jost text-xs"
                    style={{ background: `${gd.color}08`, border: `1px solid ${gd.color}20`, color: gd.color }}>
                    <span>{gd.icon}</span>
                    <span>{gd.name}</span>
                  </motion.button>
                )
              })}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

type Tab = 'overview' | 'screening' | 'memory' | 'wellbeing' | 'cbt'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [notAuthed, setNotAuthed] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [user, setUser] = useState<AuthMe | null>(null)
  const [screening, setScreening] = useState<ScreeningRow[]>([])
  const [memory, setMemory] = useState<MemoryRow[]>([])
  const [journal, setJournal] = useState<JournalRow[]>([])
  const [mood, setMood] = useState<MoodRow[]>([])
  const [cbt, setCbt] = useState<CBTModule[]>([])
  const [summaries, setSummaries] = useState<SummaryRow[]>([])
  const [profileSummary, setProfileSummary] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)

  // PATCH 2: lastViewed tracking for unseen-data dot badges
  const [lastViewed, setLastViewed] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return {}
    try {
      const stored = localStorage.getItem('lumina_dashboard_viewed')
      return stored ? JSON.parse(stored) : {}
    } catch { return {} }
  })

  const markTabViewed = (tab: Tab) => {
    const updated = { ...lastViewed, [tab]: Date.now() }
    setLastViewed(updated)
    try { localStorage.setItem('lumina_dashboard_viewed', JSON.stringify(updated)) } catch { }
    setActiveTab(tab)
  }

  const tabHasNew = (tab: Tab): boolean => {
    const lastView = lastViewed[tab] ?? 0
    if (tab === 'screening') return screening.some(r => new Date(r.completed_at).getTime() > lastView)
    if (tab === 'memory') return memory.some(r => new Date(r.completed_at).getTime() > lastView)
    if (tab === 'wellbeing') return [...journal, ...mood].some(r => new Date(r.created_at).getTime() > lastView)
    if (tab === 'cbt') return cbt.some(m => m.completed) && (lastViewed['cbt'] ?? 0) === 0
    return false
  }

  useEffect(() => {
    async function load() {
      const token = getToken()
      if (!token) { setNotAuthed(true); setLoading(false); return }
      const me = await apiFetch<AuthMe>('/api/auth/me')
      if (!me) { setNotAuthed(true); setLoading(false); return }
      setUser(me)
      const [sc, mem, jnl, md, cbtData, sumData] = await Promise.all([
        apiFetch<ScreeningRow[]>('/api/screening/history'),
        apiFetch<MemoryRow[]>('/api/cognitive/memory/history'),
        apiFetch<JournalRow[]>('/api/journal'),
        apiFetch<MoodRow[]>('/api/mood/history'),
        apiFetch<CBTModule[]>('/api/cbt/modules'),
        apiFetch<SummaryRow[]>('/api/dashboard/summaries'),
      ])
      const screeningRows = Array.isArray(sc) ? sc : []
      const memoryRows = Array.isArray(mem) ? mem : []
      const journalRows = Array.isArray(jnl) ? jnl : []
      const moodRows = Array.isArray(md) ? md : []
      const cbtModules = Array.isArray(cbtData) ? cbtData : []
      const summaryRows = Array.isArray(sumData) ? sumData : []
      setScreening(screeningRows); setMemory(memoryRows); setJournal(journalRows); setMood(moodRows); setCbt(cbtModules); setSummaries(summaryRows)
      setLoading(false)
      if (screeningRows.length > 0 || memoryRows.length > 0) {
        setSummaryLoading(true)
        generateProfileSummary(screeningRows, memoryRows, cbtModules, moodRows.length, journalRows.length)
          .then(s => { setProfileSummary(s); setSummaryLoading(false) })
      }
    }
    load()
  }, [])

  const cbtCompleted = cbt.filter(m => m.completed).length
  const latestMood = mood.length > 0 ? mood[mood.length - 1].score : null
  const avgMood = mood.length > 0 ? Math.round(mood.reduce((s, m) => s + m.score, 0) / mood.length * 10) / 10 : null

  // PATCH 2: Tabs without count, using dot badge instead
  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'screening', label: 'Reflections' },
    { key: 'memory', label: 'Memory' },
    { key: 'wellbeing', label: 'Wellbeing' },
    { key: 'cbt', label: 'Inner Work' },
  ]

  if (loading) {
    return (
      <main className="bg-screening min-h-screen relative overflow-hidden">
        <ParticleCanvas colors={['#d4af37', '#c9897a', '#b8860b', '#fef4e4']} count={14} />
        <Navigation />
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#d4af37 transparent transparent transparent' }} />
        </div>
      </main>
    )
  }

  if (notAuthed) {
    return (
      <main className="bg-screening min-h-screen relative overflow-hidden">
        <ParticleCanvas colors={['#d4af37', '#c9897a', '#b8860b', '#fef4e4']} count={14} />
        <Navigation />
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-5 text-center">
          <h2 className="font-display font-light text-4xl mb-3" style={{ color: 'var(--text-primary)' }}>
            Your <span className="font-display italic" style={{ fontWeight: 300 }}>Profile</span>
          </h2>
          <p className="font-body text-base mb-8" style={{ color: 'var(--text-secondary)' }}>Sign in to see your history and personal insights.</p>
          <motion.button onClick={() => window.location.href = '/auth/signin'} whileHover={{ scale: 1.03 }}
            className="px-8 py-3 rounded-xl font-jost text-sm tracking-widest uppercase glass"
            style={{ border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>Sign In</motion.button>
        </div>
      </main>
    )
  }

  return (
    <main className="bg-screening min-h-screen relative overflow-hidden">
      <ParticleCanvas colors={['#d4af37', '#c9897a', '#b8860b', '#fef4e4']} count={18} />
      <Navigation />
      <div className="relative z-10 pt-24 pb-20 px-5 max-w-3xl mx-auto">

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="font-display font-light mb-1"
            style={{ fontSize: 'clamp(2rem,5vw,4rem)', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Your <span className="font-display italic" style={{ fontWeight: 300 }}>Profile</span>
          </h1>
          {user?.email && (
            <p className="font-jost text-xs tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {user.email}
              {user.created_at && <span style={{ opacity: 0.5 }}> · member since {formatDate(user.created_at)}</span>}
            </p>
          )}
        </motion.div>

        {/* PATCH 2: Tab bar with gold dot badge for unseen new data */}
        <div className="flex gap-1 mb-8 p-1 rounded-xl overflow-x-auto"
          style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => markTabViewed(tab.key)}
              className="flex-shrink-0 flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-jost tracking-wide transition-all duration-200"
              style={{
                background: activeTab === tab.key ? 'var(--bg-glass)' : 'transparent',
                color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
                border: activeTab === tab.key ? '1px solid var(--border-subtle)' : '1px solid transparent',
              }}>
              {tab.label}
              {tab.key !== 'overview' && tabHasNew(tab.key) && activeTab !== tab.key && (
                <span style={{
                  width: '5px', height: '5px', borderRadius: '50%',
                  background: '#d4af37', display: 'inline-block', flexShrink: 0
                }} />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <motion.div key="ov" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Reflections', value: screening.length, color: '#d4af37' },
                  { label: 'Memory games', value: memory.length, color: '#c9897a' },
                  { label: 'Journal entries', value: journal.length, color: '#7a9e7e' },
                  { label: 'Mood logs', value: mood.length, color: '#b8860b' },
                ].map(s => (
                  <Card key={s.label}>
                    <SectionLabel>{s.label}</SectionLabel>
                    <p className="font-display font-light" style={{ fontSize: '2.6rem', lineHeight: 1, color: s.color }}>{s.value}</p>
                  </Card>
                ))}
              </div>

              {cbtCompleted > 0 && (
                <motion.div onClick={() => markTabViewed('cbt')}
                  className="rounded-xl px-5 py-4 cursor-pointer flex items-center gap-4"
                  style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)' }}
                  whileHover={{ borderColor: 'rgba(212,175,55,0.28)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(212,175,55,0.10)', border: '1px solid rgba(212,175,55,0.22)' }}>
                    <span style={{ fontSize: '14px' }}>❋</span>
                  </div>
                  <div>
                    <p className="font-gothic text-sm mb-0.5" style={{ color: 'var(--text-primary)', letterSpacing: '0.05em' }}>You have been doing the inner work.</p>
                    <p className="font-jost text-xs" style={{ color: 'var(--text-muted)' }}>{cbtCompleted} {cbtCompleted === 1 ? 'session' : 'sessions'} explored</p>
                  </div>
                </motion.div>
              )}

              {(screening.length > 0 || memory.length > 0) && (
                <Card>
                  <SectionLabel>Profile Reflection</SectionLabel>
                  {summaryLoading ? (
                    <div className="flex items-center gap-3 pt-2" style={{ color: 'var(--text-muted)' }}>
                      <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
                        style={{ borderColor: '#d4af37 transparent transparent transparent' }} />
                      <span className="font-body text-sm">Writing your profile reflection...</span>
                    </div>
                  ) : profileSummary ? (
                    <p className="font-body text-sm leading-relaxed whitespace-pre-line pt-1" style={{ color: 'var(--text-primary)' }}>{profileSummary}</p>
                  ) : null}
                </Card>
              )}

              {memory.length > 0 && (() => {
                const byType: Record<string, number> = {}
                for (const r of memory) { byType[r.game_type] = (byType[r.game_type] || 0) + 1 }
                return (
                  <motion.div onClick={() => markTabViewed('memory')}
                    className="rounded-xl p-4 cursor-pointer"
                    style={{ background: 'rgba(201,137,122,0.05)', border: '1px solid rgba(201,137,122,0.15)' }}
                    whileHover={{ borderColor: 'rgba(201,137,122,0.28)' }}>
                    <p className="font-jost text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Memory Games</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(byType).map(([gt, count]) => {
                        const gd = GAME_DISPLAY[gt] || { name: gt, color: '#c9897a', icon: '?' }
                        return (
                          <div key={gt} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                            style={{ background: `${gd.color}10`, border: `1px solid ${gd.color}22` }}>
                            <span style={{ color: gd.color, fontSize: '13px' }}>{gd.icon}</span>
                            <span className="font-jost text-xs" style={{ color: gd.color }}>{gd.name}</span>
                            <span className="font-jost text-xs" style={{ color: 'var(--text-muted)' }}>×{count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )
              })()}

              {screening.length === 0 && memory.length === 0 && journal.length === 0 && mood.length === 0 && (
                <Card>
                  <p className="font-body text-sm text-center py-4 mb-4" style={{ color: 'var(--text-secondary)' }}>
                    Nothing here yet. Complete a self-reflection check or a memory game and your profile will start taking shape.
                  </p>
                  <div className="flex gap-3 justify-center flex-wrap">
                    {[
                      { label: 'Self-reflection', href: '/screening', color: '#d4af37' },
                      { label: 'Memory games', href: '/cognitive/memory', color: '#c9897a' },
                      { label: 'Journal', href: '/journal', color: '#7a9e7e' },
                    ].map(b => (
                      <motion.button key={b.href} onClick={() => window.location.href = b.href} whileHover={{ scale: 1.03 }}
                        className="px-4 py-2 rounded-xl font-jost text-xs tracking-widest uppercase"
                        style={{ background: `${b.color}10`, border: `1px solid ${b.color}25`, color: b.color }}>
                        {b.label}
                      </motion.button>
                    ))}
                  </div>
                </Card>
              )}

              {screening.length > 0 && (
                <div>
                  <p className="font-jost text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Recent Reflections</p>
                  <div className="space-y-2">
                    {screening.slice(0, 3).map((r, i) => {
                      const d = TEST_DISPLAY[r.type] ?? { name: r.type, color: '#d4af37' }
                      return (
                        <motion.div key={r.id ?? i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                          <Card color={d.color}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-gothic text-sm mb-0.5" style={{ color: 'var(--text-primary)', letterSpacing: '0.05em' }}>{d.name}</p>
                                <p className="font-jost text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(r.completed_at)}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-display font-light text-3xl" style={{ color: d.color }}>{r.score}</p>
                                <Pill label={r.severity} color={d.color} />
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      )
                    })}
                  </div>
                  {screening.length > 3 && (
                    <button onClick={() => markTabViewed('screening')}
                      className="mt-2 w-full text-center py-2 text-xs font-jost tracking-widest uppercase opacity-50 hover:opacity-80 transition-opacity"
                      style={{ color: 'var(--text-muted)' }}>
                      View all {screening.length} reflections
                    </button>
                  )}
                </div>
              )}

              {mood.length > 0 && (
                <Card color="#d4af37">
                  <SectionLabel>Mood Over Time</SectionLabel>
                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <p className="font-display font-light text-3xl" style={{ color: '#d4af37' }}>
                        {latestMood}<span className="font-jost text-sm" style={{ color: 'var(--text-muted)' }}>/10</span>
                      </p>
                      <p className="font-jost text-xs" style={{ color: 'var(--text-muted)' }}>latest · avg {avgMood}/10 across {mood.length} logs</p>
                    </div>
                  </div>
                  <MoodSparkline entries={mood} />
                </Card>
              )}
            </motion.div>
          )}

          {/* REFLECTIONS */}
          {activeTab === 'screening' && (
            <motion.div key="sc" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {summaries.filter(s => s.source === 'screening').length > 0 && (
                <div>
                  <p className="font-jost text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Insights</p>
                  <div className="space-y-3">
                    {summaries.filter(s => s.source === 'screening').map(s => (
                      <Card key={s.id} color="#d4af37">
                        <div className="flex items-center justify-between mb-2">
                           <p className="font-gothic text-sm" style={{ color: 'var(--text-primary)' }}>{s.title}</p>
                           <p className="font-jost text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(s.created_at)}</p>
                        </div>
                        <p className="font-body text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>{s.content}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between mb-2">
                <p className="font-jost text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
                  {screening.length} {screening.length === 1 ? 'result' : 'results'} total
                </p>
                <motion.button onClick={() => window.location.href = '/screening'} whileHover={{ scale: 1.02 }}
                  className="px-4 py-1.5 rounded-xl font-jost text-xs tracking-widest uppercase glass"
                  style={{ border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>
                  New check
                </motion.button>
              </div>
              {screening.length === 0 ? (
                <EmptyState message="No self-reflection checks completed yet." cta="Take a check" href="/screening" />
              ) : screening.map((r, i) => {
                const d = TEST_DISPLAY[r.type] ?? { name: r.type, color: '#d4af37' }
                return (
                  <motion.div key={r.id ?? i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <Card color={d.color}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="font-gothic text-sm mb-0.5" style={{ color: 'var(--text-primary)', letterSpacing: '0.05em' }}>{d.name}</p>
                          <p className="font-jost text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(r.completed_at)}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-display font-light" style={{ fontSize: '2.2rem', lineHeight: 1, color: d.color }}>{r.score}</p>
                          <Pill label={r.severity} color={d.color} />
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                )
              })}
            </motion.div>
          )}

          {/* MEMORY */}
          {activeTab === 'memory' && (
            <motion.div key="mem" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <MemoryTab memory={memory} />
            </motion.div>
          )}

          {/* WELLBEING */}
          {activeTab === 'wellbeing' && (
            <motion.div key="wb" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-jost text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Mood · {mood.length} logs</p>
                  <motion.button onClick={() => window.location.href = '/journal'} whileHover={{ scale: 1.02 }}
                    className="px-4 py-1.5 rounded-xl font-jost text-xs tracking-widest uppercase glass"
                    style={{ border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>Log mood</motion.button>
                </div>
                {mood.length === 0 ? (
                  <EmptyState message="Write a journal entry to log your mood automatically." cta="Start writing" href="/journal" />
                ) : (
                  <>
                    <Card color="#d4af37" className="mb-3">
                      <div className="flex justify-between items-end mb-3">
                        <div>
                          <SectionLabel>Over Time</SectionLabel>
                          <p className="font-display font-light text-3xl" style={{ color: '#d4af37' }}>
                            {latestMood}
                            <span className="font-jost text-sm ml-1" style={{ color: 'var(--text-muted)' }}>latest · avg {avgMood}/10</span>
                          </p>
                        </div>
                      </div>
                      <MoodSparkline entries={mood} />
                    </Card>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {[...mood].reverse().slice(0, 20).map((m, i) => (
                        <div key={m.id ?? i} className="px-4 py-3 rounded-xl"
                          style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-display font-light text-2xl" style={{ color: '#d4af37' }}>{m.score}</span>
                            <p className="font-jost text-xs" style={{ color: 'var(--text-muted)' }}>{formatDateShort(m.created_at)}</p>
                          </div>
                          {m.tags && m.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {m.tags.map((tag, ti) => (
                                <span key={ti} className="font-jost text-xs px-2.5 py-1 rounded-full"
                                  style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.18)', color: 'var(--text-muted)' }}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-jost text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Journal · {journal.length} entries</p>
                  <motion.button onClick={() => window.location.href = '/journal'} whileHover={{ scale: 1.02 }}
                    className="px-4 py-1.5 rounded-xl font-jost text-xs tracking-widest uppercase glass"
                    style={{ border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>Open journal</motion.button>
                </div>
                {journal.length === 0 ? (
                  <EmptyState message="No journal entries yet." cta="Start writing" href="/journal" />
                ) : (
                  <div className="space-y-3">
                    {journal.slice(0, 8).map((e, i) => (
                      <motion.div key={e.id ?? i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                        <Card>
                          <p className="font-jost text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{formatDate(e.created_at)}</p>
                          <p className="font-body text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                            {e.content}
                          </p>
                        </Card>
                      </motion.div>
                    ))}
                    {journal.length > 8 && (
                      <button onClick={() => window.location.href = '/journal'}
                        className="w-full text-center py-2 text-xs font-jost tracking-widest uppercase opacity-50 hover:opacity-80 transition-opacity"
                        style={{ color: 'var(--text-muted)' }}>
                        View all {journal.length} entries in journal
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* INNER WORK */}
          {activeTab === 'cbt' && (
            <motion.div key="cbt" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {summaries.filter(s => s.source === 'cbt').length > 0 && (
                <div className="mb-4">
                  <p className="font-jost text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Insights</p>
                  <div className="space-y-3">
                    {summaries.filter(s => s.source === 'cbt').map(s => (
                      <Card key={s.id} color="#b8a070">
                        <div className="flex items-center justify-between mb-2">
                           <p className="font-gothic text-sm" style={{ color: 'var(--text-primary)' }}>{s.title}</p>
                           <p className="font-jost text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(s.created_at)}</p>
                        </div>
                        <p className="font-body text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>{s.content}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {cbtCompleted === 0 ? (
                <div className="py-12 text-center">
                  <p className="font-body text-sm mb-6 leading-relaxed"
                    style={{ color: 'var(--text-secondary)', fontStyle: 'italic', maxWidth: '28rem', margin: '0 auto 1.5rem' }}>
                    This is a quiet space for exploring patterns in how you think and feel. There is no curriculum to finish, no score to chase. Just small exercises when you feel ready for them.
                  </p>
                  <motion.button onClick={() => window.location.href = '/cbt'} whileHover={{ scale: 1.03 }}
                    className="px-6 py-3 rounded-xl font-jost text-sm tracking-widest uppercase glass"
                    style={{ border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>
                    Begin when ready
                  </motion.button>
                </div>
              ) : (
                <>
                  <div className="rounded-xl p-6" style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)' }}>
                    <p className="font-body text-sm leading-relaxed mb-4" style={{ color: 'var(--text-primary)', fontStyle: 'italic' }}>
                      {cbtCompleted === 1 ? "You have taken a first step inward. That is not a small thing."
                        : cbtCompleted <= 3 ? "You have been showing up for yourself. Each session is a small act of care."
                          : cbtCompleted <= 5 ? "There is a quiet consistency here. You keep coming back to this work."
                            : "You have spent real time with yourself in here. That says something."}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="font-jost text-xs" style={{ color: 'var(--text-muted)' }}>
                        {cbtCompleted} of {cbt.length} {cbtCompleted === 1 ? 'exercise' : 'exercises'} explored
                      </p>
                      <div className="flex gap-1">
                        {cbt.map((m, i) => (
                          <div key={i} className="w-2 h-2 rounded-full"
                            style={{ background: m.completed ? '#d4af37' : 'rgba(212,175,55,0.12)' }} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <motion.button onClick={() => window.location.href = '/cbt'} whileHover={{ scale: 1.02 }}
                    className="w-full py-4 rounded-xl font-jost text-sm tracking-widest uppercase"
                    style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.22)', color: 'var(--text-primary)' }}>
                    Continue inner work
                  </motion.button>
                </>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </main>
  )
}