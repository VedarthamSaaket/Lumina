'use client'

interface LevelProgressProps {
  level: number
  roundInLevel: number
  color: string
}

export function LevelProgress({ level, roundInLevel, color }: LevelProgressProps) {
  return (
    <div className="flex items-center gap-3">
      <span style={{ color: 'rgba(254,244,228,0.5)', fontSize: '12px', fontFamily: 'var(--font-jost)' }}>
        Level {level}
      </span>
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-1.5 w-4 rounded-full"
            style={{
              background: i < roundInLevel ? color : 'rgba(255,255,255,0.12)',
              boxShadow: i < roundInLevel ? `0 0 8px ${color}40` : 'none',
            }}
          />
        ))}
      </div>
    </div>
  )
}