'use client'
import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { BaseRound, PUZZLE_GAMES, PuzzleGameId, ROUNDS_PER_LEVEL } from '../types'
import { generateGptSummary, saveMemoryResult } from '../lib/api'

export function PuzzleResultScreen({ gameId, rounds, onRetake, onBack }: {
  gameId: PuzzleGameId; rounds: BaseRound[]; onRetake: () => void; onBack: () => void
}) {
  const game = PUZZLE_GAMES[gameId]
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(true)

  const correct = rounds.filter(r => r.correct).length
  const total = rounds.length
  const maxLevel = Math.max(...rounds.map(r => r.level), 0)
  const accuracy = total ? `${Math.round((correct / total) * 100)}%` : '0%'
  const levelsCompleted = Math.floor(total / ROUNDS_PER_LEVEL)
  const stats = { 'Rounds played': total, 'Accuracy': accuracy, 'Levels completed': levelsCompleted, 'Max level reached': maxLevel, 'Correct answers': correct }

  const savedRef = useRef(false)
  useEffect(() => {
    if (savedRef.current) return
    savedRef.current = true
    generateGptSummary(gameId, game.title, game.psych, stats as Record<string, any>, rounds, 'puzzle').then(s => {
      setSummary(s); setLoading(false)
      saveMemoryResult(gameId, stats, rounds, s)
    }).catch(() => { setLoading(false); saveMemoryResult(gameId, stats, rounds) })
  }, [])

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className="glass-strong rounded-2xl p-7" style={{ border: `1px solid ${game.color}28` }}>
      <div className="text-center mb-6">
        <div className="text-4xl mb-2" style={{ color: game.color, filter: `drop-shadow(0 0 8px ${game.color}50)` }}>{game.icon}</div>
        <h2 className="font-gothic text-xl mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '0.08em' }}>{game.title}</h2>
        <p className="font-display italic text-sm" style={{ color: 'var(--text-muted)', fontWeight: 300 }}>{game.psych}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        {Object.entries(stats).map(([label, value]) => (
          <div key={label} className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
            <p className="font-jost text-xs tracking-wide uppercase mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
            <p className="font-display font-light text-2xl" style={{ color: game.color }}>{value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl p-5 mb-5" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
        <p className="font-jost text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Your Cognitive Reflection</p>
        {loading ? (
          <div className="flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
            <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${game.color} transparent transparent transparent` }} />
            <span className="font-body text-sm">Writing your reflection...</span>
          </div>
        ) : (
          <p className="font-body text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
            {summary || 'Your results have been saved to your dashboard.'}
          </p>
        )}
      </div>
      <div className="rounded-xl p-4 mb-5" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
        <p className="font-jost text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Round by Round</p>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {rounds.map((r, i) => {
            const ril = i % ROUNDS_PER_LEVEL
            const lvl = Math.floor(i / ROUNDS_PER_LEVEL) + 1
            return (
              <div key={i} className="flex justify-between items-center text-xs font-jost py-1 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Lv{lvl} R{ril + 1}</span>
                <span style={{ color: r.correct ? '#7a9e7e' : '#f87171' }}>{r.correct ? '+' : 'x'}</span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex gap-3 justify-center flex-wrap">
        <motion.button onClick={onBack} whileHover={{ scale: 1.02 }}
          className="px-6 py-3 rounded-xl font-jost text-sm tracking-widest uppercase glass"
          style={{ border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>All Games</motion.button>
        <motion.button onClick={onRetake} whileHover={{ scale: 1.02 }}
          className="px-6 py-3 rounded-xl font-jost text-sm tracking-widest uppercase"
          style={{ background: `${game.color}18`, border: `1px solid ${game.color}38`, color: 'var(--text-primary)' }}>Play Again →</motion.button>
      </div>
    </motion.div>
  )
}
