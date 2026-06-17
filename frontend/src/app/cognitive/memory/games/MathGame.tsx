'use client'
import { motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { dispatchOrionLiveEvent } from '@/components/orion/OrionLiveObserver'
import { ConsecutiveFailBar, LevelProgress } from '../components/LevelProgress'
import { generateMathSeq, mathRuleHint, resetMathHistory } from '../lib/generators/math'
import { getTimeLimit, useLiveTimer } from '../lib/timer'
import { GAMES, MAX_CONSEC, MathRound, ROUNDS_PER_LEVEL } from '../types'

export function MathGame({
  onQuit, onComplete,
}: {
  onQuit: (rounds: MathRound[]) => void
  onComplete: (rounds: MathRound[]) => void
}) {
  const color = GAMES.math.color
  type P = 'countdown' | 'show' | 'input' | 'feedback'

  const [phase, setPhase] = useState<P>('countdown')
  const [countdown, setCountdown] = useState(3)
  const [level, setLevel] = useState(1)
  const [roundInLevel, setRoundInLevel] = useState(0)
  const [mathData, setMathData] = useState<{ sequence: number[]; answer: number; rule: string } | null>(null)
  const [input, setInput] = useState('')
  const [rounds, setRounds] = useState<MathRound[]>([])
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null)
  const [consecutiveFails, setConsecutiveFails] = useState(0)
  const [lastRule, setLastRule] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const mountedRef = useRef(true)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  useEffect(() => { resetMathHistory() }, [])

  const submitRef = useRef<() => void>(() => { })
  const tl = phase === 'input' ? getTimeLimit('math', level, roundInLevel) : null
  const [timeLeft] = useLiveTimer(
    phase === 'input' && tl !== null,
    tl,
    () => { if (mountedRef.current) submitRef.current() }
  )

  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown > 0) {
      const t = setTimeout(() => { if (mountedRef.current) setCountdown(c => c - 1) }, 800)
      return () => clearTimeout(t)
    }
    const d = generateMathSeq(1, 0)
    setMathData(d); setLevel(1); setRoundInLevel(0); setInput(''); setPhase('show')
  }, [phase, countdown])

  const startRound = useCallback((lvl: number, ril: number) => {
    const d = generateMathSeq(lvl, ril)
    setMathData(d); setLevel(lvl); setRoundInLevel(ril); setInput('')
    setPhase('show')
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  const submit = useCallback(() => {
    if (!mathData) return
    const given = parseInt(input.trim())
    const correct = given === mathData.answer
    const round: MathRound = { level, correct, sequence: mathData.sequence, answer: mathData.answer, given: isNaN(given) ? null : given, rule: mathData.rule, type: 'math' }
    const newConsecFails = correct ? 0 : consecutiveFails + 1
    setConsecutiveFails(newConsecFails)
    setLastRule(mathData.rule)
    setRounds(prev => {
      const newRounds = [...prev, round]
      if (newConsecFails >= MAX_CONSEC) {
        setTimeout(() => { if (mountedRef.current) onComplete(newRounds) }, 2000)
      }
      return newRounds
    })
    setLastCorrect(correct)
    setPhase('feedback')
    if (correct) {
      dispatchOrionLiveEvent('correct', { game_type: 'math', level, roundInLevel })
      if (roundInLevel + 1 >= ROUNDS_PER_LEVEL) dispatchOrionLiveEvent('level_up', { game_type: 'math', level: level + 1 })
    } else {
      dispatchOrionLiveEvent('wrong', { game_type: 'math', level, roundInLevel })
      if (newConsecFails >= 2) dispatchOrionLiveEvent('consecutive_fails', { game_type: 'math', consecutive_fails: newConsecFails })
    }
    if (newConsecFails < MAX_CONSEC) {
      setTimeout(() => {
        if (!mountedRef.current) return
        const nextRil = correct ? (roundInLevel + 1 >= ROUNDS_PER_LEVEL ? 0 : roundInLevel + 1) : roundInLevel
        const nextLvl = correct && roundInLevel + 1 >= ROUNDS_PER_LEVEL ? level + 1 : level
        startRound(nextLvl, nextRil)
      }, 2000)
    }
  }, [mathData, input, level, roundInLevel, consecutiveFails, startRound, onComplete])

  useEffect(() => { submitRef.current = submit }, [submit])

  const timerPct = timeLeft !== null && tl ? (timeLeft / tl) * 100 : 100

  return (
    <div className="flex flex-col min-h-[60vh] items-center justify-center gap-5 relative">
      <button onClick={() => onQuit(rounds)} className="absolute top-0 right-0 text-xs font-jost tracking-widest uppercase opacity-40 hover:opacity-80 transition-opacity" style={{ color: 'var(--text-muted)' }}>Quit</button>

      <LevelProgress level={level} roundInLevel={roundInLevel} color={color} />

      <div className="flex flex-col items-center gap-2 mb-1">
        <div className="flex gap-1.5">
          {rounds.slice(-10).map((r, i) => <div key={i} className="w-2 h-2 rounded-full" style={{ background: r.correct ? color : '#f87171', opacity: 0.7 }} />)}
        </div>
        <ConsecutiveFailBar count={consecutiveFails} color={color} />
      </div>

      {phase === 'countdown' && (
        <motion.div key={`mcd-${countdown}`} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-3">
          <div className="w-36 h-36 rounded-3xl flex items-center justify-center font-display font-light" style={{ fontSize: '4rem', color, background: `${color}10`, border: `2px solid ${color}30` }}>
            {countdown > 0 ? countdown : 'Go'}
          </div>
          <p className="font-jost text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Get ready...</p>
        </motion.div>
      )}

      {(phase === 'show' || phase === 'input') && mathData && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-5 w-full max-w-sm">
          <p className="font-jost text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Find the pattern</p>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            {mathData.sequence.map((n, i) => (
              <div key={i} className="w-14 h-14 rounded-xl flex items-center justify-center font-display font-light text-2xl"
                style={{ color, background: `${color}10`, border: `1.5px solid ${color}28` }}>
                {n}
              </div>
            ))}
            <div className="w-14 h-14 rounded-xl flex items-center justify-center font-display font-light text-3xl"
              style={{ color: `${color}60`, background: `${color}06`, border: `1.5px dashed ${color}40` }}>?</div>
          </div>
          <p className="font-body text-sm" style={{ color: 'var(--text-secondary)' }}>What comes next?</p>
          {timeLeft !== null && tl !== null ? (
            <div className="w-full">
              <div className="flex justify-between text-xs font-jost mb-1" style={{ color: timeLeft <= 5 ? '#f87171' : color }}>
                <span>Time</span><span>{timeLeft}s</span>
              </div>
              <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--border-subtle)' }}>
                <motion.div className="h-full rounded-full" animate={{ width: `${timerPct}%` }} transition={{ duration: 0.95, ease: 'linear' }}
                  style={{ background: timeLeft <= 5 ? '#f87171' : color }} />
              </div>
            </div>
          ) : level >= 10 ? (
            <p className="font-jost text-xs tracking-widest" style={{ color: `${color}70` }}>No time limit · deep reasoning mode</p>
          ) : null}
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
            className="w-32 text-center text-3xl font-display bg-transparent outline-none py-3 tracking-widest border-b-2"
            style={{ color: 'var(--text-primary)', borderColor: `${color}50` }} placeholder="?" autoFocus />
          <motion.button onClick={submit} disabled={!input.trim()} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="px-8 py-3 rounded-xl font-jost text-sm tracking-widest uppercase disabled:opacity-30"
            style={{ background: `${color}18`, border: `1px solid ${color}38`, color: 'var(--text-primary)' }}>Submit</motion.button>
        </motion.div>
      )}

      {phase === 'feedback' && (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center flex flex-col items-center gap-2">
          <div className="text-5xl mb-1" style={{ color: lastCorrect ? '#7a9e7e' : '#f87171' }}>{lastCorrect ? '✓' : '✗'}</div>
          {!lastCorrect && mathData && (
            <>
              <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>Answer was <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{mathData.answer}</span></p>
              <p className="font-jost text-xs mt-1 max-w-xs" style={{ color: 'var(--text-muted)' }}>💡 {mathRuleHint(lastRule)}</p>
              {consecutiveFails >= MAX_CONSEC && (
                <p className="font-jost text-xs mt-2 tracking-widest uppercase" style={{ color: '#f87171' }}>3 in a row - wrapping up…</p>
              )}
            </>
          )}
          {lastCorrect && roundInLevel + 1 >= ROUNDS_PER_LEVEL && (
            <p className="font-jost text-xs tracking-widest uppercase" style={{ color }}>Level complete! Moving up →</p>
          )}
        </motion.div>
      )}
    </div>
  )
}
