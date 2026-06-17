import { useEffect, useRef, useState } from 'react'
import { GameId } from '../types'

// Easy levels (1-3): short time (pressure to think fast on simple things)
// Mid levels (4-6): medium time
// Hard levels (7-9): longer time (complex questions need thinking time)
// Very hard (10+): NO timer at all (pure cognition, no pressure)
export function getTimeLimit(gameId: GameId, level: number, roundInLevel: number, itemCount?: number): number | null {
  if (level >= 10) return null

  if (gameId === 'word') {
    const listLen = itemCount || 1
    return 15 + (listLen * 6)
  }

  const bases: Record<string, number> = {
    digit: 12,
    letter: 12,
    math: 18,
    color: 0,
    spatial: 0,
    spatial_reverse: 0,
  }
  const base = bases[gameId]
  if (!base) return null

  const levelBonus = (level - 1) * 3
  const roundPenalty = roundInLevel * 1
  const computed = base + levelBonus - roundPenalty
  return Math.max(8, computed)
}

export function useLiveTimer(
  active: boolean,
  initialSeconds: number | null,
  onExpire: () => void
): [number | null, (v: number | null) => void] {
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const onExpireRef = useRef(onExpire)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => { onExpireRef.current = onExpire })

  useEffect(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    if (!active || initialSeconds === null) { setTimeLeft(null); return }

    setTimeLeft(initialSeconds)
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null) return null
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          intervalRef.current = null
          setTimeout(() => onExpireRef.current(), 0)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null } }
  }, [active, initialSeconds])

  return [timeLeft, setTimeLeft]
}
