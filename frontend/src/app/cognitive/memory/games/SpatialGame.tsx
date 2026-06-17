'use client'
import { motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { dispatchOrionLiveEvent } from '@/components/orion/OrionLiveObserver'
import { ConsecutiveFailBar, LevelProgress } from '../components/LevelProgress'
import { generateSpatialPattern, resetSpatialHistory } from '../lib/generators/spatial'
import { GAMES, MAX_CONSEC, ROUNDS_PER_LEVEL, SAGE, SpatialRound } from '../types'

export function SpatialGame({
  reverse, onQuit, onComplete,
}: {
  reverse?: boolean
  onQuit: (rounds: SpatialRound[]) => void
  onComplete: (rounds: SpatialRound[]) => void
}) {
  const gameId = reverse ? 'spatial_reverse' : 'spatial'
  const color = GAMES[gameId].color

  type P = 'countdown' | 'show' | 'input' | 'feedback'

  const [phase, setPhase] = useState<P>('countdown')
  const [countdown, setCountdown] = useState(3)
  const [level, setLevel] = useState(1)
  const [roundInLevel, setRoundInLevel] = useState(0)
  const [pattern, setPattern] = useState<number[]>([])
  const [showStep, setShowStep] = useState(0)
  const [lit, setLit] = useState<number[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [rounds, setRounds] = useState<SpatialRound[]>([])
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null)
  const [consecutiveFails, setConsecutiveFails] = useState(0)
  const mountedRef = useRef(true)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const lastTapRef = useRef(0)
  useEffect(() => { resetSpatialHistory() }, [])

  const getPatternCount = (lvl: number, ril: number) => 3 + (lvl - 1) * 2 + ril
  const getGridCols = (lvl: number) => lvl >= 8 ? 6 : lvl >= 5 ? 5 : 4
  const gridCols = getGridCols(level)
  const gridSize = gridCols * gridCols

  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown > 0) {
      const t = setTimeout(() => { if (mountedRef.current) setCountdown(c => c - 1) }, 800)
      return () => clearTimeout(t)
    }
    const count = getPatternCount(1, 0)
    const gSize = getGridCols(1) * getGridCols(1)
    const cells = generateSpatialPattern(count, gSize)
    setPattern(cells); setLevel(1); setRoundInLevel(0); setShowStep(0); setSelected([]); setLit([]); setPhase('show')
  }, [phase, countdown])

  const startRound = useCallback((lvl: number, ril: number) => {
    const cols = getGridCols(lvl)
    const gSize = cols * cols
    const count = getPatternCount(lvl, ril)
    const cells = generateSpatialPattern(count, gSize)
    setPattern(cells); setLevel(lvl); setRoundInLevel(ril); setShowStep(0); setSelected([]); setLit([]); setPhase('show')
  }, [])

  const getFlashSpeed = (lvl: number, ril: number) => ({
    showDur: Math.max(250, 650 - lvl * 50 - ril * 20),
    blankDur: Math.max(100, 380 - lvl * 30 - ril * 10),
  })

  useEffect(() => {
    if (phase !== 'show') return
    const { showDur, blankDur } = getFlashSpeed(level, roundInLevel)

    if (showStep < pattern.length) {
      setLit([pattern[showStep]])
      const t = setTimeout(() => {
        if (!mountedRef.current) return
        setLit([])
        setTimeout(() => { if (mountedRef.current) setShowStep(i => i + 1) }, blankDur)
      }, showDur)
      return () => clearTimeout(t)
    } else { setPhase('input') }
  }, [phase, showStep, pattern])

  const toggle = (idx: number) => {
    if (phase !== 'input') return
    const now = Date.now()
    if (now - lastTapRef.current < 80) return
    lastTapRef.current = now
    setSelected(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])
  }

  const submitSpatial = () => {
    const expected = reverse ? [...pattern].reverse() : pattern
    const correct = JSON.stringify(selected) === JSON.stringify(expected)
    const newConsecFails = correct ? 0 : consecutiveFails + 1
    setConsecutiveFails(newConsecFails)
    const round: SpatialRound = { level, correct, shown: pattern, selected, type: 'spatial' }
    setRounds(prev => {
      const newRounds = [...prev, round]
      if (newConsecFails >= MAX_CONSEC) {
        setTimeout(() => { if (mountedRef.current) onComplete(newRounds) }, 1600)
      }
      return newRounds
    })
    setLastCorrect(correct)
    setPhase('feedback')
    if (correct) {
      dispatchOrionLiveEvent('correct', { game_type: 'spatial', level, roundInLevel })
      if (roundInLevel + 1 >= ROUNDS_PER_LEVEL) dispatchOrionLiveEvent('level_up', { game_type: 'spatial', level: level + 1 })
    } else {
      dispatchOrionLiveEvent('wrong', { game_type: 'spatial', level, roundInLevel })
      if (newConsecFails >= 2) dispatchOrionLiveEvent('consecutive_fails', { game_type: 'spatial', consecutive_fails: newConsecFails })
    }
    if (newConsecFails < MAX_CONSEC) {
      const delay = correct ? 1400 : 2800
      setTimeout(() => {
        if (!mountedRef.current) return
        const nextRil = correct ? (roundInLevel + 1 >= ROUNDS_PER_LEVEL ? 0 : roundInLevel + 1) : roundInLevel
        const nextLvl = correct && roundInLevel + 1 >= ROUNDS_PER_LEVEL ? level + 1 : level
        startRound(nextLvl, nextRil)
      }, delay)
    }
  }

  return (
    <div className="flex flex-col items-center gap-5 relative">
      <button onClick={() => onQuit(rounds)} className="absolute top-0 right-0 text-xs font-jost tracking-widest uppercase opacity-40 hover:opacity-80 transition-opacity" style={{ color: 'var(--text-muted)' }}>Quit</button>

      <LevelProgress level={level} roundInLevel={roundInLevel} color={color} />

      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-1.5">
          {rounds.slice(-10).map((r, i) => <div key={i} className="w-2 h-2 rounded-full" style={{ background: r.correct ? color : '#f87171', opacity: 0.7 }} />)}
        </div>
        <ConsecutiveFailBar count={consecutiveFails} color={color} />
      </div>

      {phase === 'countdown' && (
        <motion.div key={`scd-${countdown}`} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-3 py-8">
          <div className="w-28 h-28 rounded-3xl flex items-center justify-center font-display font-light" style={{ fontSize: '3.5rem', color, background: `${color}10`, border: `2px solid ${color}30` }}>
            {countdown > 0 ? countdown : 'Go'}
          </div>
        </motion.div>
      )}

      {phase !== 'countdown' && (
        <>
          <p className="font-jost text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
            {pattern.length} cells · {gridCols}×{gridCols} grid · {phase === 'show' ? 'Watch the pattern' : phase === 'input' ? (reverse ? 'Tap in REVERSE order' : 'Tap the cells in order') : ''}
          </p>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)`, width: 'min(320px, 80vw)' }}>
            {Array.from({ length: gridSize }, (_, i) => {
              const isLit = lit.includes(i)
              const isSelected = selected.includes(i)
              const isCorrectTarget = pattern.includes(i)
              const isWrongTap = phase === 'feedback' && isSelected && !isCorrectTarget

              const selIdx = selected.indexOf(i)
              return (
                <motion.button key={i} onClick={() => toggle(i)} whileTap={{ scale: 0.92 }}
                  className="rounded-xl aspect-square transition-all duration-200 relative"
                  style={{
                    background: isLit ? color : (phase === 'feedback' && isCorrectTarget) ? SAGE : isWrongTap ? '#f87171' : isSelected ? `${color}28` : 'rgba(212,175,55,0.04)',
                    border: isLit ? `2px solid ${color}` : (phase === 'feedback' && isCorrectTarget) ? `2px solid ${SAGE}` : isSelected ? `2px solid ${isWrongTap ? '#f87171' : color}70` : '2px solid rgba(212,175,55,0.12)',
                    boxShadow: isLit ? `0 0 20px ${color}50` : (phase === 'feedback' && isCorrectTarget) ? `0 0 15px ${SAGE}40` : 'none',
                  }}>
                  {isSelected && selIdx >= 0 && (
                    <span className="absolute inset-0 flex items-center justify-center font-jost text-xs font-bold" style={{ color: isWrongTap ? '#fff' : (phase === 'feedback' && isCorrectTarget) ? '#fff' : color }}>
                      {selIdx + 1}
                    </span>
                  )}
                </motion.button>
              )
            })}
          </div>
          {phase === 'feedback' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center">
              <div className="text-4xl mb-1" style={{ color: lastCorrect ? SAGE : '#f87171' }}>{lastCorrect ? '✓' : '✗'}</div>
              <p className="font-jost text-xs tracking-widest uppercase" style={{ color: lastCorrect ? SAGE : 'var(--text-muted)' }}>
                {lastCorrect ? 'Correct!' : 'Incorrect sequence'}
              </p>
              {lastCorrect && roundInLevel + 1 >= ROUNDS_PER_LEVEL && (
                <p className="font-jost text-xs tracking-widest uppercase mt-1" style={{ color }}>Level complete! Moving up →</p>
              )}
            </motion.div>
          )}
          {phase === 'input' && (
            <motion.button onClick={submitSpatial} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} disabled={selected.length < pattern.length}
              className="px-8 py-3 rounded-xl font-jost text-sm tracking-widest uppercase disabled:opacity-30"
              style={{ background: `${color}18`, border: `1px solid ${color}38`, color: 'var(--text-primary)' }}>
              Confirm ({selected.length}/{pattern.length})
            </motion.button>
          )}
        </>
      )}
    </div>
  )
}
