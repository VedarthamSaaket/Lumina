'use client'
import { useState, useEffect, useRef } from 'react'

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