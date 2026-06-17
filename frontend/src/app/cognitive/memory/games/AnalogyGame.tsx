'use client'
import { motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ConsecutiveFailBar, LevelProgress } from '../components/LevelProgress'
import { Shape, ShapeCell } from '../components/Shape'
import { generateAnalogy, resetAnalogyHistory } from '../lib/generators/analogy'
import { nextPuzzleState } from '../lib/utils'
import { AnalogyPuzzle, BaseRound, MAX_CONSEC, PuzzleState, ROUNDS_PER_LEVEL, SAGE, WARM } from '../types'

export function AnalogyGame({ onQuit, onComplete }: {
  onQuit: (rounds: BaseRound[]) => void
  onComplete: (rounds: BaseRound[]) => void
}) {
  const color = WARM
  const [ps, setPs] = useState<PuzzleState>({ level: 1, roundInLevel: 0 })
  const [puzzle, setPuzzle] = useState<AnalogyPuzzle>(() => generateAnalogy(1, 0))
  const [selected, setSelected] = useState<number | null>(null)
  const [phase, setPhase] = useState<'play' | 'feedback'>('play')
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null)
  const [rounds, setRounds] = useState<BaseRound[]>([])
  const [consecutiveFails, setConsecutiveFails] = useState(0)
  const mountedRef = useRef(true)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])
  useEffect(() => { resetAnalogyHistory() }, [])

  const next = useCallback((newPs: PuzzleState) => {
    setPuzzle(generateAnalogy(newPs.level, newPs.roundInLevel))
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
      <div className="flex items-center gap-3 flex-wrap justify-center">
        {[{ item: puzzle.a, label: 'A' }, { item: puzzle.b, label: 'B' }].map(({ item, label }, i) => (
          <div key={label} className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <ShapeCell size={62} color={color}>
                <Shape type={item.type} fill={item.fill} size={36} color={(item as any).color || color} rotate={(item as any).rotate || 0} />
              </ShapeCell>
              <span className="font-jost text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
            </div>
            {i === 0 && <span className="font-display text-2xl font-light" style={{ color: `${color}70` }}>:</span>}
          </div>
        ))}
        <span className="font-display text-2xl font-light" style={{ color: `${color}70` }}>∷</span>
        <div className="flex flex-col items-center gap-1">
          <ShapeCell size={62} color={color}>
            <Shape type={puzzle.c.type} fill={puzzle.c.fill} size={36} color={(puzzle.c as any).color || color} rotate={(puzzle.c as any).rotate || 0} />
          </ShapeCell>
          <span className="font-jost text-xs" style={{ color: 'var(--text-muted)' }}>C</span>
        </div>
        <span className="font-display text-2xl font-light" style={{ color: `${color}70` }}>:</span>
        <div className="flex flex-col items-center gap-1">
          <ShapeCell size={62} color={color} highlighted>
            {phase === 'feedback' && selected !== null && puzzle.choices[selected] ? (
              <Shape type={puzzle.choices[selected].type} fill={puzzle.choices[selected].fill} size={36}
                color={(puzzle.choices[selected] as any).color || color} rotate={(puzzle.choices[selected] as any).rotate || 0} />
            ) : (
              <span className="font-display text-2xl font-light" style={{ color: `${color}60` }}>?</span>
            )}
          </ShapeCell>
          <span className="font-jost text-xs" style={{ color: 'var(--text-muted)' }}>?</span>
        </div>
      </div>
      <div className="w-full max-w-xs border-t" style={{ borderColor: `${color}20` }} />
      <div className="grid grid-cols-4 gap-2">
        {puzzle.choices.map((choice, i) => (
          <ShapeCell key={i} size={60} color={color}
            selected={selected === i && (lastCorrect === true || lastCorrect === null)}
            correctAnswer={phase === 'feedback' && !lastCorrect && i === puzzle.answerIdx}
            onClick={phase === 'play' ? () => submit(i) : undefined}>
            <Shape type={choice.type} fill={choice.fill} size={34} color={(choice as any).color || color} rotate={(choice as any).rotate || 0} />
          </ShapeCell>
        ))}
      </div>
      {phase === 'feedback' && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="text-3xl mb-1" style={{ color: lastCorrect ? SAGE : '#f87171' }}>{lastCorrect ? '✓' : '✗'}</div>
          {!lastCorrect && <p className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>{puzzle.rule}</p>}
          {lastCorrect && ps.roundInLevel + 1 >= ROUNDS_PER_LEVEL && (
            <p className="font-jost text-xs tracking-widest uppercase" style={{ color }}>Level complete! →</p>
          )}
        </motion.div>
      )}
    </div>
  )
}
