'use client'
import { motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ConsecutiveFailBar, LevelProgress } from '../components/LevelProgress'
import { FoldedPaperSVG, PaperFoldSVG } from '../components/PaperFoldSVG'
import { generateFold, resetFoldHistory } from '../lib/generators/fold'
import { nextPuzzleState } from '../lib/utils'
import { BaseRound, FoldPuzzle, GOLD2, MAX_CONSEC, PuzzleState, ROUNDS_PER_LEVEL, SAGE } from '../types'

export function PaperFoldGame({ onQuit, onComplete }: {
  onQuit: (rounds: BaseRound[]) => void
  onComplete: (rounds: BaseRound[]) => void
}) {
  const color = GOLD2
  const [ps, setPs] = useState<PuzzleState>({ level: 1, roundInLevel: 0 })
  const [puzzle, setPuzzle] = useState<FoldPuzzle>(() => generateFold(1, 0))
  const [selected, setSelected] = useState<number | null>(null)
  const [phase, setPhase] = useState<'play' | 'feedback'>('play')
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null)
  const [rounds, setRounds] = useState<BaseRound[]>([])
  const [consecutiveFails, setConsecutiveFails] = useState(0)
  const mountedRef = useRef(true)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])
  useEffect(() => { resetFoldHistory() }, [])

  const next = useCallback((newPs: PuzzleState) => {
    setPuzzle(generateFold(newPs.level, newPs.roundInLevel))
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
      <p className="font-jost text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Paper Folding · {puzzle.folds.length === 2 ? '2 folds' : '1 fold'}</p>
      <p className="font-body text-sm text-center max-w-xs" style={{ color: 'var(--text-secondary)' }}>
        The paper is folded and a hole is punched. Which shows the correct hole pattern?
      </p>
      <div className="overflow-x-auto w-full flex justify-center pb-1">
        <FoldedPaperSVG folds={puzzle.folds} holeDot={puzzle.holePos} color={color} />
      </div>
      <div className="w-full max-w-xs border-t" style={{ borderColor: `${color}20` }} />
      <div className="grid grid-cols-4 gap-2">
        {puzzle.choices.map((dots, i) => (
          <motion.div key={i} whileTap={{ scale: 0.9 }}
            onClick={phase === 'play' ? () => submit(i) : undefined}
            className="rounded-xl overflow-hidden transition-all cursor-pointer"
            style={{
              border: (phase === 'feedback' && !lastCorrect && i === puzzle.answerIdx)
                ? `2px solid ${SAGE}`
                : selected === i ? `2px solid ${lastCorrect ? SAGE : '#f87171'}` : `1.5px solid ${color}28`,
              boxShadow: (phase === 'feedback' && !lastCorrect && i === puzzle.answerIdx)
                ? `0 0 18px ${SAGE}50`
                : selected === i ? `0 0 12px ${selected === i && lastCorrect ? SAGE : '#f87171'}30` : 'none',
            }}>
            <PaperFoldSVG size={72} dots={dots}
              highlighted={(phase === 'feedback' && !lastCorrect && i === puzzle.answerIdx) || selected === i}
              color={(phase === 'feedback' && !lastCorrect && i === puzzle.answerIdx) ? SAGE : color} />
          </motion.div>
        ))}
      </div>
      {phase === 'feedback' && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="text-3xl" style={{ color: lastCorrect ? SAGE : '#f87171' }}>{lastCorrect ? '+' : 'x'}</div>
          {!lastCorrect && (
            <p className="font-body text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Logic: {puzzle.folds.length === 2 ? 'Mirror holes across both axes' : 'Mirror hole on other half'}
            </p>
          )}
          {lastCorrect && ps.roundInLevel + 1 >= ROUNDS_PER_LEVEL && (
            <p className="font-jost text-xs tracking-widest uppercase mt-1" style={{ color }}>Level complete! →</p>
          )}
        </motion.div>
      )}
    </div>
  )
}
