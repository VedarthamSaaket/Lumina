'use client'
import { motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ConsecutiveFailBar, LevelProgress } from '../components/LevelProgress'
import { Shape, ShapeCell } from '../components/Shape'
import { generateSeries, resetSeriesHistory } from '../lib/generators/series'
import { nextPuzzleState } from '../lib/utils'
import { BaseRound, MAX_CONSEC, PuzzleState, ROUNDS_PER_LEVEL, SAGE, SeriesPuzzle, STEEL } from '../types'

export function SeriesGame({ onQuit, onComplete }: {
  onQuit: (rounds: BaseRound[]) => void
  onComplete: (rounds: BaseRound[]) => void
}) {
  const color = STEEL
  const [ps, setPs] = useState<PuzzleState>({ level: 1, roundInLevel: 0 })
  const [puzzle, setPuzzle] = useState<SeriesPuzzle>(() => generateSeries(1, 0))
  const [selected, setSelected] = useState<number | null>(null)
  const [phase, setPhase] = useState<'play' | 'feedback'>('play')
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null)
  const [rounds, setRounds] = useState<BaseRound[]>([])
  const [consecutiveFails, setConsecutiveFails] = useState(0)
  const mountedRef = useRef(true)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])
  useEffect(() => { resetSeriesHistory() }, [])

  const next = useCallback((newPs: PuzzleState) => {
    setPuzzle(generateSeries(newPs.level, newPs.roundInLevel))
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

  const di = (ps.level - 1) * ROUNDS_PER_LEVEL + ps.roundInLevel

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

      <div className="flex items-center gap-2">
        <p className="font-jost text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Completion Series</p>
        {di >= 10 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-sage/10 text-sage border border-sage/20 uppercase">Interleaved</span>}
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-center px-4">
        {puzzle.sequence.map((item, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <ShapeCell size={54} color={color}>
              <Shape type={item.type} fill={item.fill} size={32} color={item.color || color} rotate={item.rotate || 0} />
            </ShapeCell>
            {di >= 10 && <span className="text-[9px] opacity-30 font-bold">{i % 2 === 0 ? '▲' : '●'}</span>}
          </div>
        ))}
        <span className="font-display text-xl mx-1" style={{ color: `${color}60` }}>→</span>
        <ShapeCell size={54} color={color} highlighted>
          <span className="font-display text-2xl font-light" style={{ color: `${color}60` }}>?</span>
        </ShapeCell>
      </div>
      <div className="w-full max-w-xs border-t" style={{ borderColor: `${color}20` }} />
      <div className="grid grid-cols-4 gap-2">
        {puzzle.choices.map((choice, i) => (
          <ShapeCell key={i} size={58} color={color}
            selected={selected === i && (lastCorrect === true || lastCorrect === null)}
            correctAnswer={phase === 'feedback' && !lastCorrect && i === puzzle.answerIdx}
            onClick={phase === 'play' ? () => submit(i) : undefined}>
            <Shape type={choice.type} fill={choice.fill} size={32} color={choice.color || color} rotate={choice.rotate || 0} />
          </ShapeCell>
        ))}
      </div>
      {phase === 'feedback' && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="text-3xl mb-1" style={{ color: lastCorrect ? SAGE : '#f87171' }}>{lastCorrect ? '+' : 'x'}</div>
          {!lastCorrect && <p className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>{puzzle.rule}</p>}
          {lastCorrect && ps.roundInLevel + 1 >= ROUNDS_PER_LEVEL && (
            <p className="font-jost text-xs tracking-widest uppercase" style={{ color }}>Level complete! -></p>
          )}
        </motion.div>
      )}
    </div>
  )
}
