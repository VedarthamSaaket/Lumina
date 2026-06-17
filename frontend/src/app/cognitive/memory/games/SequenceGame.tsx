'use client'
import { motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { dispatchOrionLiveEvent } from '@/components/orion/OrionLiveObserver'
import { orion } from '@/lib/orionBridge'
import { ConsecutiveFailBar, LevelProgress } from '../components/LevelProgress'
import { generateMemorySummary } from '../lib/api'
import { applyLetterMode, applyMode, getModeForRound, getSeqLen, randLetterSeqUnique, randSeqUnique, resetSeqHistory } from '../lib/generators/sequence'
import { getTimeLimit, useLiveTimer } from '../lib/timer'
import { GAMES, MAX_CONSEC, MODE_LABELS, ROUNDS_PER_LEVEL, SeqMode, SeqRound } from '../types'

export function SequenceGame({
  gameId, onQuit, onComplete,
}: {
  gameId: 'digit' | 'letter'
  onQuit: (rounds: SeqRound[]) => void
  onComplete: (rounds: SeqRound[]) => void
}) {
  const game = GAMES[gameId]
  const color = game.color
  const availableModes = game.modes as SeqMode[]
  type P = 'countdown' | 'show' | 'input' | 'feedback'

  const [phase, setPhase] = useState<P>('countdown')
  const [countdown, setCountdown] = useState(3)
  const [level, setLevel] = useState(1)
  const [roundInLevel, setRoundInLevel] = useState(0)
  const [mode, setMode] = useState<SeqMode>('forward')
  const [seq, setSeq] = useState<(number | string)[]>([])
  const [showIdx, setShowIdx] = useState(0)
  const [showItem, setShowItem] = useState<number | string | null>(null)
  const [input, setInput] = useState('')
  const [rounds, setRounds] = useState<SeqRound[]>([])
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null)
  const [consecutiveFails, setConsecutiveFails] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const mountedRef = useRef(true)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  useEffect(() => { resetSeqHistory() }, [])

  const submitRef = useRef<() => void>(() => { })

  const tl = phase === 'input' ? getTimeLimit(gameId, level, roundInLevel) : null
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
    const len = getSeqLen(3, 1, 0)
    const s = gameId === 'digit' ? randSeqUnique(len) : randLetterSeqUnique(len)
    setSeq(s); setShowIdx(0); setMode(getModeForRound(1, 0, availableModes)); setPhase('show')
    orion.gameStart(GAMES[gameId].title, 1)
    dispatchOrionLiveEvent('session_start', { game_type: gameId })
  }, [phase, countdown])

  const startRound = useCallback((lvl: number, ril: number) => {
    const len = getSeqLen(3, lvl, ril)
    const s = gameId === 'digit' ? randSeqUnique(len) : randLetterSeqUnique(len)
    const md = getModeForRound(lvl, ril, availableModes)
    setSeq(s); setLevel(lvl); setRoundInLevel(ril); setMode(md); setShowIdx(0); setInput(''); setPhase('show')
  }, [gameId, availableModes])

  const getFlashSpeed = (lvl: number, ril: number) => {
    const base = Math.max(300, 800 - lvl * 60 - ril * 20)
    const blank = Math.max(120, 300 - lvl * 20 - ril * 10)
    return { showDuration: base, blankDuration: blank }
  }

  useEffect(() => {
    if (phase !== 'show') return
    const { showDuration, blankDuration } = getFlashSpeed(level, roundInLevel)

    if (showIdx < seq.length) {
      setShowItem(seq[showIdx])
      const t = setTimeout(() => {
        if (!mountedRef.current) return
        setShowItem(null)
        setTimeout(() => { if (mountedRef.current) setShowIdx(i => i + 1) }, blankDuration)
      }, showDuration)
      return () => clearTimeout(t)
    } else {
      setPhase('input')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [phase, showIdx, seq])

  const submit = useCallback(() => {
    const parts = input.trim().split(/[\s,]+/).filter(Boolean)
    const given = gameId === 'digit' ? parts.map(Number).filter(n => !isNaN(n)) : parts.map(s => s.toUpperCase())
    const numSeq = seq as number[]
    const strSeq = seq as string[]
    let expected: (number | string)[]
    if (gameId === 'digit') {
      expected = applyMode(numSeq, mode)
    } else {
      expected = applyLetterMode(strSeq, mode as 'forward' | 'reverse' | 'ascending' | 'descending')
    }
    const correct = JSON.stringify(given) === JSON.stringify(expected)
    const round: SeqRound = { level, mode, correct, sequence: seq, given, type: 'sequence' }
    const newConsecFails = correct ? 0 : consecutiveFails + 1
    setConsecutiveFails(newConsecFails)
    setRounds(prev => {
      const newRounds = [...prev, round]
      if (newConsecFails >= MAX_CONSEC) {
        setTimeout(() => { if (mountedRef.current) onComplete(newRounds) }, 1600)
      }
      return newRounds
    })
    setLastCorrect(correct)
    if (correct) {
      dispatchOrionLiveEvent('correct', { game_type: gameId, level, roundInLevel })
      if (roundInLevel + 1 >= ROUNDS_PER_LEVEL) dispatchOrionLiveEvent('level_up', { game_type: gameId, level: level + 1 })
    } else {
      dispatchOrionLiveEvent('wrong', { game_type: gameId, level, roundInLevel })
      if (newConsecFails >= 2) dispatchOrionLiveEvent('consecutive_fails', { game_type: gameId, consecutive_fails: newConsecFails })
    }
    setPhase('feedback')

    if (newConsecFails < MAX_CONSEC) {
      setTimeout(() => {
        if (!mountedRef.current) return
        const nextRil = correct ? (roundInLevel + 1 >= ROUNDS_PER_LEVEL ? 0 : roundInLevel + 1) : roundInLevel
        const nextLvl = correct && roundInLevel + 1 >= ROUNDS_PER_LEVEL ? level + 1 : level
        startRound(nextLvl, nextRil)
      }, 1400)
    }
  }, [input, seq, mode, level, roundInLevel, gameId, consecutiveFails, startRound, onComplete])

  useEffect(() => { submitRef.current = submit }, [submit])

  const timerPct = timeLeft !== null && tl ? (timeLeft / tl) * 100 : 100
  const modeLabel = MODE_LABELS[mode] || mode

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
        <motion.div key={`cd-${countdown}`} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-3">
          <div className="w-36 h-36 rounded-3xl flex items-center justify-center font-display font-light" style={{ fontSize: '4rem', color, background: `${color}10`, border: `2px solid ${color}30` }}>
            {countdown > 0 ? countdown : 'Go'}
          </div>
          <p className="font-jost text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Get ready...</p>
        </motion.div>
      )}

      {phase === 'show' && (
        <>
          <p className="font-jost text-xs tracking-widest uppercase text-center" style={{ color: 'var(--text-muted)' }}>
            Sequence length: {seq.length} · Recall: {modeLabel}
          </p>
          <motion.div key={`item-${showIdx}-${showItem}`} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }}
            className="w-36 h-36 rounded-3xl flex items-center justify-center font-display font-light"
            style={{ fontSize: '5rem', lineHeight: 1, color: showItem !== null ? color : 'transparent', background: `${color}10`, border: `2px solid ${color}30`, boxShadow: showItem !== null ? `0 0 40px ${color}25` : 'none' }}>
            {showItem ?? '.'}
          </motion.div>
        </>
      )}

      {phase === 'input' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-4 w-full max-w-sm">
          <p className="font-body text-base text-center" style={{ color: 'var(--text-primary)' }}>{modeLabel}</p>
          {(mode === 'odd_only' || mode === 'even_only') && (
            <p className="font-jost text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              Only type the {mode === 'odd_only' ? 'odd' : 'even'} digits you saw
            </p>
          )}
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
            <p className="font-jost text-xs tracking-widest" style={{ color: `${color}70` }}>No time limit · think it through</p>
          ) : null}
          <p className="font-jost text-xs" style={{ color: 'var(--text-muted)' }}>Separate each with a space</p>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
            className="w-full text-center text-3xl font-display bg-transparent outline-none py-3 tracking-widest border-b-2"
            style={{ color: 'var(--text-primary)', borderColor: `${color}50` }} placeholder={gameId === 'digit' ? 'e.g. 4 7 2' : 'e.g. B K X'} />
          <motion.button onClick={submit} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="px-8 py-3 rounded-xl font-jost text-sm tracking-widest uppercase"
            style={{ background: `${color}18`, border: `1px solid ${color}38`, color: 'var(--text-primary)' }}>Submit</motion.button>
        </motion.div>
      )}

      {phase === 'feedback' && (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center flex flex-col items-center gap-2">
          <div className="text-5xl mb-1" style={{ color: lastCorrect ? '#7a9e7e' : '#f87171' }}>{lastCorrect ? '✓' : '✗'}</div>
          {!lastCorrect && (
            <>
              <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>
                Expected: {
                  gameId === 'digit'
                    ? applyMode(seq as number[], mode).join(' ')
                    : applyLetterMode(seq as string[], mode as 'forward' | 'reverse' | 'ascending' | 'descending').join(' ')
                }
              </p>
              {consecutiveFails >= MAX_CONSEC && (
                <p className="font-jost text-xs mt-1 tracking-widest uppercase" style={{ color: '#f87171' }}>3 in a row - wrapping up…</p>
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

// Re-export for symmetry; not strictly used externally.
export { generateMemorySummary }
