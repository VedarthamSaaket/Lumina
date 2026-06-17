'use client'
import { motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ConsecutiveFailBar, LevelProgress } from '../components/LevelProgress'
import { Shape, ShapeCell } from '../components/Shape'
import { generateMatrix, resetMatrixHistory } from '../lib/generators/matrix'
import { nextPuzzleState } from '../lib/utils'
import { BaseRound, GOLD, MAX_CONSEC, MatrixPuzzle, PuzzleState, SAGE } from '../types'

export function MatrixGame({ onQuit, onComplete }: {
  onQuit: (rounds: BaseRound[]) => void
  onComplete: (rounds: BaseRound[]) => void
}) {
  const color = GOLD
  const [ps, setPs] = useState<PuzzleState>({ level: 1, roundInLevel: 0 })
  const [puzzle, setPuzzle] = useState<MatrixPuzzle>(() => generateMatrix(1, 0))
  const [selected, setSelected] = useState<number | null>(null)
  const [phase, setPhase] = useState<'play' | 'feedback'>('play')
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null)
  const [rounds, setRounds] = useState<BaseRound[]>([])
  const [consecutiveFails, setConsecutiveFails] = useState(0)
  const mountedRef = useRef(true)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])
  useEffect(() => { resetMatrixHistory() }, [])

  const next = useCallback((newPs: PuzzleState) => {
    setPuzzle(generateMatrix(newPs.level, newPs.roundInLevel))
    setSelected(null); setPhase('play')
  }, [])

  const submit = (idx: number) => {
    if (phase !== 'play') return
    setSelected(idx)
    const correct = idx === puzzle.answerIdx && puzzle.answerIdx !== -1
    const newConsecFails = correct ? 0 : consecutiveFails + 1
    setConsecutiveFails(newConsecFails)
    const newRounds = [...rounds, { level: ps.level, correct }]
    setRounds(newRounds); setLastCorrect(correct); setPhase('feedback')
    if (newConsecFails >= MAX_CONSEC) {
      setTimeout(() => { if (mountedRef.current) onComplete(newRounds) }, 1600)
    } else {
      const newPs = nextPuzzleState(ps, correct)
      const delay = correct ? 1400 : 2800
      setTimeout(() => {
        if (!mountedRef.current) return
        setPs(newPs); next(newPs)
      }, delay)
    }
  }

  const gCols = puzzle.grid[0].length

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

      <div className="flex items-center gap-3">
        <p className="font-jost text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
          Matrix Reasoning · {gCols}×{gCols}
        </p>
        {gCols > 3 && (
          <span className="font-jost text-[10px] bg-gold/10 text-gold px-2 py-0.5 rounded-full border border-gold/20 uppercase tracking-tighter">Advanced Grid</span>
        )}
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${gCols}, 1fr)` }}>
        {puzzle.grid.map((row, r) =>
          row.map((cell, c) => (
            <ShapeCell key={`${r}-${c}`} size={gCols === 5 ? 52 : gCols === 4 ? 60 : 64} color={color}>
              {cell ? (
                <Shape type={cell.type} fill={cell.fill} size={gCols === 5 ? 28 : 34} color={cell.color || color} rotate={cell.rotate || 0} />
              ) : (
                <div className="flex items-center justify-center">
                  {phase === 'feedback' ? (
                    <span style={{ fontSize: 22, color: lastCorrect ? SAGE : '#f87171' }}>{lastCorrect ? '✓' : '✗'}</span>
                  ) : (
                    <span className="font-display text-2xl font-light" style={{ color: `${color}60` }}>?</span>
                  )}
                </div>
              )}
            </ShapeCell>
          ))
        )}
      </div>

      <div className="w-full max-w-xs border-t" style={{ borderColor: `${color}20` }} />
      <p className="font-jost text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Select the missing piece</p>
      <div className="grid grid-cols-4 gap-2">
        {puzzle.choices.map((choice, i) => (
          <ShapeCell key={i} size={gCols === 5 ? 56 : 60} color={color}
            selected={selected === i && (lastCorrect === true || lastCorrect === null)}
            correctAnswer={phase === 'feedback' && !lastCorrect && i === puzzle.answerIdx}
            onClick={phase === 'play' ? () => submit(i) : undefined}>
            {choice && <Shape type={choice.type} fill={choice.fill} size={gCols === 5 ? 30 : 34} color={choice.color || color} rotate={choice.rotate || 0} />}
          </ShapeCell>
        ))}
      </div>
      {phase === 'feedback' && !lastCorrect && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-center px-4">
          <p className="font-body text-[11px] leading-tight" style={{ color: 'var(--text-muted)' }}>Logic: {puzzle.rule}</p>
        </motion.div>
      )}
    </div>
  )
}
