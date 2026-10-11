'use client'
import { motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { dispatchOrionLiveEvent } from '@/components/orion/OrionLiveObserver'
import { ConsecutiveFailBar, LevelProgress } from '../components/LevelProgress'
import { Shape } from '../components/Shape'
import { generateOdd, resetOddHistory } from '../lib/generators/odd'
import { nextPuzzleState } from '../lib/utils'
import { BaseRound, MAX_CONSEC, MUTED, OddPuzzle, PuzzleState, ROUNDS_PER_LEVEL, SAGE } from '../types'

export function OddOneOutGame({ onQuit, onComplete, startLevel = 1 }: {
  startLevel?: number
  onQuit: (rounds: BaseRound[]) => void
  onComplete: (rounds: BaseRound[]) => void
}) {
  const color = MUTED
  const [ps, setPs] = useState<PuzzleState>({ level: startLevel, roundInLevel: 0 })
  const [puzzle, setPuzzle] = useState<OddPuzzle>(() => generateOdd(startLevel, 0))
  const [selected, setSelected] = useState<number | null>(null)
  const [phase, setPhase] = useState<'play' | 'feedback'>('play')
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null)
  const [rounds, setRounds] = useState<BaseRound[]>([])
  const [consecutiveFails, setConsecutiveFails] = useState(0)
  const mountedRef = useRef(true)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])
  useEffect(() => { dispatchOrionLiveEvent('session_start', { game_type: 'oddoneout' }) }, [])
  useEffect(() => { resetOddHistory() }, [])

  const next = useCallback((newPs: PuzzleState) => {
    setPuzzle(generateOdd(newPs.level, newPs.roundInLevel))
    setSelected(null); setPhase('play')
  }, [])

  const submit = (idx: number) => {
    if (phase !== 'play') return
    setSelected(idx)
    const correct = idx === puzzle.oddIdx && puzzle.oddIdx !== -1
    const newConsecFails = correct ? 0 : consecutiveFails + 1
    setConsecutiveFails(newConsecFails)
    const newRounds = [...rounds, { level: ps.level, correct }]
    if (correct) {
      dispatchOrionLiveEvent('correct', { game_type: 'oddoneout', level: ps.level, roundInLevel: ps.roundInLevel })
      if (ps.roundInLevel + 1 >= ROUNDS_PER_LEVEL) dispatchOrionLiveEvent('level_up', { game_type: 'oddoneout', level: ps.level + 1 })
    } else {
      dispatchOrionLiveEvent('wrong', { game_type: 'oddoneout', level: ps.level, roundInLevel: ps.roundInLevel })
      if (newConsecFails >= 2) dispatchOrionLiveEvent('consecutive_fails', { game_type: 'oddoneout', consecutive_fails: newConsecFails })
    }
    setRounds(newRounds); setLastCorrect(correct); setPhase('feedback')
    if (newConsecFails >= MAX_CONSEC) {
      setTimeout(() => { if (mountedRef.current) onComplete(newRounds) }, 1600)
    } else {
      const newPs = nextPuzzleState(ps, correct)
      setTimeout(() => {
        if (!mountedRef.current) return
        setPs(newPs); next(newPs)
      }, 1400)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 relative">
      <button onClick={() => onQuit(rounds)} className="absolute top-0 right-0 text-xs font-jost tracking-widest uppercase opacity-40 hover:opacity-80" style={{ color: 'var(--text-muted)' }}>Quit</button>
      <LevelProgress level={ps.level} roundInLevel={ps.roundInLevel} color={color} />
      <div className="flex flex-col items-center gap-2 mb-1">
        <div className="flex gap-1.5">
          {rounds.slice(-10).map((r, i) => <div key={i} className="w-2 h-2 rounded-full" style={{ background: r.correct ? SAGE : '#f87171', opacity: 0.7 }} />)}
        </div>
        <ConsecutiveFailBar count={consecutiveFails} color={color} />
      </div>
      <p className="font-jost text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Which one doesn't belong?</p>
      <div className="flex gap-3 flex-wrap justify-center px-4">
        {puzzle.shapes.map((shape, i) => (
          <motion.div key={i} whileTap={{ scale: 0.9 }}
            onClick={phase === 'play' ? () => submit(i) : undefined}
            className="flex items-center justify-center rounded-xl transition-all cursor-pointer relative"
            style={{
              width: 80, height: 80, overflow: 'visible',
              background: (phase === 'feedback' && !lastCorrect && i === puzzle.oddIdx)
                ? '#7a9e7e22'
                : selected === i ? (lastCorrect ? `${SAGE}20` : '#f8717120') : `${color}10`,
              border: (phase === 'feedback' && !lastCorrect && i === puzzle.oddIdx)
                ? `2px solid ${SAGE}`
                : selected === i ? `2px solid ${lastCorrect ? SAGE : '#f87171'}` : `1.5px solid ${color}28`,
              boxShadow: (phase === 'feedback' && !lastCorrect && i === puzzle.oddIdx)
                ? `0 0 18px ${SAGE}50`
                : selected === i ? `0 0 14px ${selected === i && lastCorrect ? SAGE : '#f87171'}40` : 'none',
            }}>
            <Shape type={shape.type} fill={shape.fill} size={shape.size || 42} color={shape.color || color} rotate={shape.rotate || 0} />
            {shape.size && (
              <div className="absolute -bottom-1 right-1 opacity-20 group-hover:opacity-100 transition-opacity">
                <div className="w-1 h-3 bg-white/20 rounded-full" />
              </div>
            )}
          </motion.div>
        ))}
      </div>
      {phase === 'feedback' && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-center flex flex-col items-center gap-1">
          <div className="text-3xl mb-1" style={{ color: lastCorrect ? SAGE : '#f87171' }}>{lastCorrect ? '+' : 'x'}</div>
          {!lastCorrect && <p className="font-body text-[11px]" style={{ color: 'var(--text-muted)' }}>Logic: {puzzle.rule}</p>}
          {lastCorrect && ps.roundInLevel + 1 >= ROUNDS_PER_LEVEL && (
            <p className="font-jost text-[10px] tracking-widest uppercase" style={{ color }}>Level complete! →</p>
          )}
        </motion.div>
      )}
    </div>
  )
}
