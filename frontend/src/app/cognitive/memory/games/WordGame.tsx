'use client'
import { motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { dispatchOrionLiveEvent } from '@/components/orion/OrionLiveObserver'
import { ConsecutiveFailBar, LevelProgress } from '../components/LevelProgress'
import { getTimeLimit, useLiveTimer } from '../lib/timer'
import { shuffle } from '../lib/utils'
import { GAMES, MAX_CONSEC, ROUNDS_PER_LEVEL, SAGE, WORD_BANK, WordRound } from '../types'

export function WordGame({
  startLevel = 1, onQuit, onComplete,
}: {
  startLevel?: number
  onQuit: (rounds: WordRound[]) => void
  onComplete: (rounds: WordRound[]) => void
}) {
  const color = GAMES.word.color
  type P = 'countdown' | 'show' | 'input' | 'feedback'

  const [phase, setPhase] = useState<P>('countdown')
  const [countdown, setCountdown] = useState(3)
  const [level, setLevel] = useState(startLevel)
  const [roundInLevel, setRoundInLevel] = useState(0)
  const [fullPool, setFullPool] = useState<string[]>([])
  const [cumulativeList, setCumulativeList] = useState<string[]>([])
  const [showIdx, setShowIdx] = useState(0)
  const [showWord, setShowWord] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [rounds, setRounds] = useState<WordRound[]>([])
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null)
  const [lastScore, setLastScore] = useState(0)
  const [consecutiveFails, setConsecutiveFails] = useState(0)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const mountedRef = useRef(true)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  useEffect(() => {
    const list = shuffle(WORD_BANK)
    setFullPool(list)
    setCumulativeList(list.slice(0, 1 + (startLevel - 1) * ROUNDS_PER_LEVEL))
    dispatchOrionLiveEvent('session_start', { game_type: 'word' })
  }, [])

  const submitRef = useRef<() => void>(() => { })
  const tl = phase === 'input' ? getTimeLimit('word', level, roundInLevel, cumulativeList.length) : null
  const [timeLeft] = useLiveTimer(
    phase === 'input' && tl !== null,
    tl,
    () => { if (mountedRef.current) submitRef.current() }
  )

  const getFlashSpeed = (lvl: number, ril: number) => ({
    showDur: Math.max(700, 1100 - lvl * 50 - ril * 20),
    blankDur: Math.max(300, 500 - lvl * 20 - ril * 10),
  })

  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown > 0) {
      const t = setTimeout(() => { if (mountedRef.current) setCountdown(c => c - 1) }, 800)
      return () => clearTimeout(t)
    }
    setPhase('show')
  }, [phase, countdown])

  const startRound = useCallback((lvl: number, ril: number, correct: boolean) => {
    setLastCorrect(null)
    setPhase('show')
    setShowIdx(0)
    setInput('')
    setCumulativeList(prev => {
      if (correct) return fullPool.slice(0, prev.length + 1)
      return fullPool.slice(0, Math.max(1, prev.length - 1))
    })
    setLevel(lvl); setRoundInLevel(ril)
  }, [fullPool])

  useEffect(() => {
    if (phase !== 'show' || cumulativeList.length === 0) return
    const { showDur, blankDur } = getFlashSpeed(level, roundInLevel)
    if (showIdx < cumulativeList.length) {
      setShowWord(cumulativeList[showIdx])
      const t = setTimeout(() => {
        if (!mountedRef.current) return
        setShowWord(null)
        setTimeout(() => { if (mountedRef.current) setShowIdx(i => i + 1) }, blankDur)
      }, showDur)
      return () => clearTimeout(t)
    } else {
      setPhase('input')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [phase, showIdx, cumulativeList, level, roundInLevel])

  const submit = useCallback(() => {
    const recalled = input.toLowerCase().trim().split(/[\s,]+/).filter(Boolean)
    const filteredRecalled = recalled.filter(w => cumulativeList.map(x => x.toLowerCase()).includes(w))
    const pass = filteredRecalled.length === cumulativeList.length && recalled.length === cumulativeList.length
    const score = filteredRecalled.length
    const newConsecFails = pass ? 0 : consecutiveFails + 1
    setConsecutiveFails(newConsecFails)
    const round: WordRound = { level, correct: pass, words: [...cumulativeList], recalled, type: 'word' }
    const newRounds = [...rounds, round]
    if (pass) {
      dispatchOrionLiveEvent('correct', { game_type: 'word', level, roundInLevel })
      if (roundInLevel + 1 >= ROUNDS_PER_LEVEL) dispatchOrionLiveEvent('level_up', { game_type: 'word', level: level + 1 })
    } else {
      dispatchOrionLiveEvent('wrong', { game_type: 'word', level, roundInLevel })
      if (newConsecFails >= 2) dispatchOrionLiveEvent('consecutive_fails', { game_type: 'word', consecutive_fails: newConsecFails })
    }
    setRounds(newRounds); setLastCorrect(pass); setLastScore(score); setPhase('feedback')
    if (newConsecFails >= MAX_CONSEC) {
      setTimeout(() => { if (mountedRef.current) onComplete(newRounds) }, 2200)
    } else {
      setTimeout(() => {
        if (!mountedRef.current) return
        const nextRil = pass ? (roundInLevel + 1 >= ROUNDS_PER_LEVEL ? 0 : roundInLevel + 1) : roundInLevel
        const nextLvl = pass && roundInLevel + 1 >= ROUNDS_PER_LEVEL ? level + 1 : level
        startRound(nextLvl, nextRil, pass)
      }, 2000)
    }
  }, [input, cumulativeList, level, roundInLevel, consecutiveFails, rounds, startRound, onComplete])

  useEffect(() => { submitRef.current = submit }, [submit])
  const timerPct = timeLeft !== null && tl ? (timeLeft / tl) * 100 : 100

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
        <motion.div key={`wcd-${countdown}`} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-3 py-8">
          <div className="w-28 h-28 rounded-3xl flex items-center justify-center font-display font-light" style={{ fontSize: '3.5rem', color, background: `${color}10`, border: `2px solid ${color}30` }}>
            {countdown > 0 ? countdown : 'Go'}
          </div>
        </motion.div>
      )}
      <p className="font-jost text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
        {phase === 'show' ? `Round ${rounds.length + 1} · ${cumulativeList.length} words` : phase === 'input' ? `Recall all words to advance` : 'Round done'}
      </p>
      {phase === 'show' && (
        <motion.div key={`w-${showWord ?? 'blank'}`} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
          className="w-72 h-32 rounded-2xl flex items-center justify-center" style={{ background: `${color}10`, border: `1px solid ${color}28` }}>
          <span className="font-display font-light text-5xl" style={{ color: showWord ? color : 'transparent' }}>{showWord ?? '.'}</span>
        </motion.div>
      )}
      {phase === 'input' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 w-full max-w-sm">
          <p className="font-body text-sm text-center" style={{ color: 'var(--text-secondary)' }}>Type the words you saw, in any order</p>
          {timeLeft !== null && tl !== null ? (
            <div className="w-full">
              <div className="flex justify-between text-xs font-jost mb-1" style={{ color: timeLeft <= 5 ? '#f87171' : color }}>
                <span>Recall window</span><span>{timeLeft}s</span>
              </div>
              <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--border-subtle)' }}>
                <motion.div className="h-full rounded-full" animate={{ width: `${timerPct}%` }} transition={{ duration: 0.95, ease: 'linear' }}
                  style={{ background: timeLeft <= 5 ? '#f87171' : color }} />
              </div>
            </div>
          ) : level >= 10 ? (
            <p className="font-jost text-xs tracking-widest text-center" style={{ color: `${color}70` }}>No time limit</p>
          ) : null}
          <textarea ref={inputRef} rows={3} value={input} onChange={e => setInput(e.target.value)}
            className="w-full p-5 rounded-2xl resize-none font-body text-xl text-center focus:outline-none"
            style={{ background: 'var(--bg-glass)', border: `2px solid ${color}38`, color: 'var(--text-primary)', lineHeight: '1.4' }}
            placeholder="word1 word2..." />
          <motion.button onClick={submit} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} disabled={!input.trim()}
            className="py-4 rounded-xl font-jost text-sm tracking-widest uppercase disabled:opacity-30"
            style={{ background: `linear-gradient(135deg, ${color}22, ${color}0d)`, border: `1px solid ${color}38`, color: 'var(--text-primary)' }}>Submit</motion.button>
        </motion.div>
      )}
      {phase === 'feedback' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center flex flex-col items-center gap-3 w-full max-w-sm">
          <div className="text-5xl mb-1" style={{ color: lastCorrect ? SAGE : '#f87171' }}>
            {lastScore}/{cumulativeList.length}
          </div>
          <p className="font-jost text-xs tracking-widest uppercase" style={{ color: lastCorrect ? SAGE : '#f87171' }}>
            {lastCorrect ? 'Perfect Recall!' : 'Mistake detected'}
          </p>
          {!lastCorrect && <p className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>List rolled back by 1</p>}
          <div className="flex flex-wrap gap-2 justify-center w-full mt-2">
            {cumulativeList.map((w, i) => {
              const recalled = (rounds[rounds.length - 1] as WordRound)?.recalled?.map(r => r.toLowerCase()).includes(w.toLowerCase())
              return (
                <span key={i} className="px-3 py-1.5 rounded-xl font-jost text-xs tracking-wide"
                  style={{
                    background: recalled ? `${SAGE}18` : '#f8717118',
                    border: `1px solid ${recalled ? SAGE : '#f87171'}44`,
                    color: recalled ? SAGE : '#f87171',
                  }}>
                  {recalled ? '+' : 'x'} {w}
                </span>
              )
            })}
            {(rounds[rounds.length - 1] as WordRound)?.recalled
              .filter(w => !cumulativeList.map(x => x.toLowerCase()).includes(w.toLowerCase()))
              .map((w, i) => (
                <span key={`extra-${i}`} className="px-3 py-1.5 rounded-xl font-jost text-xs tracking-wide"
                  style={{ background: '#f8717118', border: '1px solid #f8717144', color: '#f87171' }}>
                  ! {w}
                </span>
              ))
            }
          </div>
          {lastCorrect && roundInLevel + 1 >= ROUNDS_PER_LEVEL && (
            <p className="font-jost text-xs tracking-widest uppercase mt-1" style={{ color }}>Level complete! Moving up →</p>
          )}
        </motion.div>
      )}
    </div>
  )
}
