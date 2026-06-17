import { motion } from 'framer-motion'
import { MAX_CONSEC, ROUNDS_PER_LEVEL } from '../types'

export function ConsecutiveFailBar({ count, color }: { count: number; color: string }) {
  if (count === 0) return null
  return (
    <div className="flex items-center gap-2">
      <span className="font-jost text-xs" style={{ color: 'var(--text-muted)' }}>streak</span>
      <div className="flex gap-1">
        {Array.from({ length: MAX_CONSEC }, (_, i) => (
          <motion.div key={i}
            initial={{ scale: 0.6 }} animate={{ scale: i < count ? 1 : 0.8 }}
            className="w-3 h-3 rounded-full"
            style={{ background: i < count ? '#f87171' : 'rgba(248,113,113,0.15)', border: `1.5px solid ${i < count ? '#f87171' : 'rgba(248,113,113,0.3)'}` }} />
        ))}
      </div>
      {count >= 2 && <span className="font-jost text-xs" style={{ color: '#f87171' }}>one more ends game</span>}
    </div>
  )
}

export function LevelProgress({ level, roundInLevel, color }: { level: number; roundInLevel: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 w-full max-w-xs">
      <div className="flex justify-between w-full text-xs font-jost" style={{ color: 'var(--text-muted)' }}>
        <span>Level {level}</span>
        <span>Round {roundInLevel + 1} / {ROUNDS_PER_LEVEL}</span>
      </div>
      <div className="flex gap-1 w-full">
        {Array.from({ length: ROUNDS_PER_LEVEL }, (_, i) => (
          <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ background: i < roundInLevel ? color : i === roundInLevel ? `${color}80` : `${color}20` }} />
        ))}
      </div>
    </div>
  )
}
