'use client'
import { motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { dispatchOrionLiveEvent } from '@/components/orion/OrionLiveObserver'
import { ConsecutiveFailBar, LevelProgress } from '../components/LevelProgress'
import { generateColorSeq, resetColorHistory } from '../lib/generators/color'
import { COLORS, ColorRound, GAMES, MAX_CONSEC, ROUNDS_PER_LEVEL } from '../types'

export function ColorGame({
  startLevel = 1, onQuit, onComplete,
}: {
  startLevel?: number
  onQuit: (rounds: ColorRound[]) => void
  onComplete: (rounds: ColorRound[]) => void
}) {
  const color = GAMES.color.color
  type P = 'countdown' | 'show' | 'input' | 'feedback'

  const [phase, setPhase] = useState<P>('countdown')
  const [countdown, setCountdown] = useState(3)
  const [level, setLevel] = useState(startLevel)
  const [roundInLevel, setRoundInLevel] = useState(0)
  const [seq, setSeq] = useState<string[]>([])
  const [showIdx, setShowIdx] = useState(0)
  const [activeColor, setActiveColor] = useState<string | null>(null)
  const [given, setGiven] = useState<string[]>([])
  const [rounds, setRounds] = useState<ColorRound[]>([])
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null)
  const [consecutiveFails, setConsecutiveFails] = useState(0)
  const mountedRef = useRef(true)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  useEffect(() => { resetColorHistory() }, [])

  const getColorLen = (lvl: number, ril: number) => 3 + (lvl - 1) * 2 + ril

  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown > 0) {
      const t = setTimeout(() => { if (mountedRef.current) setCountdown(c => c - 1) }, 800)
      return () => clearTimeout(t)
    }
    const s = generateColorSeq(getColorLen(startLevel, 0))
    setSeq(s); setLevel(startLevel); setRoundInLevel(0); setShowIdx(0); setGiven([]); setPhase('show')
  }, [phase, countdown])

  const startRound = useCallback((lvl: number, ril: number) => {
    const s = generateColorSeq(getColorLen(lvl, ril))
    setSeq(s); setLevel(lvl); setRoundInLevel(ril); setShowIdx(0); setGiven([]); setPhase('show')
  }, [])

  const getFlashSpeed = (lvl: number, ril: number) => ({
    showDur: Math.max(300, 750 - lvl * 50 - ril * 20),
    blankDur: Math.max(120, 380 - lvl * 30 - ril * 10),
  })

  useEffect(() => {
    if (phase !== 'show') return
    const { showDur, blankDur } = getFlashSpeed(level, roundInLevel)

    if (showIdx < seq.length) {
      const c = COLORS.find(c => c.name === seq[showIdx])
      setActiveColor(c?.hex || null)
      const t = setTimeout(() => {
        if (!mountedRef.current) return
        setActiveColor(null)
        setTimeout(() => { if (mountedRef.current) setShowIdx(i => i + 1) }, blankDur)
      }, showDur)
      return () => clearTimeout(t)
    } else { setPhase('input') }
  }, [phase, showIdx, seq])

  const tapColor = (colorName: string) => {
    if (phase !== 'input') return
    const newGiven = [...given, colorName]
    setGiven(newGiven)
    if (newGiven.length === seq.length) {
      const correct = JSON.stringify(newGiven) === JSON.stringify(seq)
      const newConsecFails = correct ? 0 : consecutiveFails + 1
      setConsecutiveFails(newConsecFails)
      const round: ColorRound = { level, correct, sequence: seq, given: newGiven, type: 'color' }
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
        dispatchOrionLiveEvent('correct', { game_type: 'color', level, roundInLevel })
        if (roundInLevel + 1 >= ROUNDS_PER_LEVEL) dispatchOrionLiveEvent('level_up', { game_type: 'color', level: level + 1 })
      } else {
        dispatchOrionLiveEvent('wrong', { game_type: 'color', level, roundInLevel })
        if (newConsecFails >= 2) dispatchOrionLiveEvent('consecutive_fails', { game_type: 'color', consecutive_fails: newConsecFails })
      }
      if (newConsecFails < MAX_CONSEC) {
        setTimeout(() => {
          if (!mountedRef.current) return
          const nextRil = correct ? (roundInLevel + 1 >= ROUNDS_PER_LEVEL ? 0 : roundInLevel + 1) : roundInLevel
          const nextLvl = correct && roundInLevel + 1 >= ROUNDS_PER_LEVEL ? level + 1 : level
          startRound(nextLvl, nextRil)
        }, 1400)
      }
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
        <motion.div key={`ccd-${countdown}`} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-3 py-8">
          <div className="w-28 h-28 rounded-3xl flex items-center justify-center font-display font-light" style={{ fontSize: '3.5rem', color, background: `${color}10`, border: `2px solid ${color}30` }}>
            {countdown > 0 ? countdown : 'Go'}
          </div>
        </motion.div>
      )}

      {phase !== 'countdown' && (
        <>
          <p className="font-jost text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
            {seq.length} colors · {phase === 'show' ? 'Watch carefully' : phase === 'input' ? `Tap in order (${given.length}/${seq.length})` : ''}
          </p>
          {phase === 'show' && (
            <motion.div key={`cc-${showIdx}-${activeColor}`} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="w-44 h-44 rounded-3xl flex flex-col items-center justify-center gap-2"
              style={{
                background: activeColor || 'rgba(255,255,255,0.04)',
                border: `3px solid ${activeColor || 'rgba(255,255,255,0.1)'}`,
                boxShadow: activeColor ? `0 0 80px ${activeColor}aa, 0 0 40px ${activeColor}66, inset 0 0 30px ${activeColor}22` : 'none',
                transition: 'all 0.12s',
              }}>
              {activeColor && seq[showIdx] && (
                <span className="font-gothic text-lg tracking-widest uppercase" style={{
                  color: COLORS.find(c => c.hex === activeColor)?.text ?? '#fff',
                  textShadow: '0 1px 8px rgba(0,0,0,0.4)',
                  letterSpacing: '0.15em',
                }}>
                  {seq[showIdx]}
                </span>
              )}
            </motion.div>
          )}
          {phase === 'input' && (
            <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
              {COLORS.map(c => (
                <motion.button key={c.name} onClick={() => tapColor(c.name)} whileTap={{ scale: 0.88 }} whileHover={{ scale: 1.04 }}
                  className="h-24 rounded-2xl flex flex-col items-center justify-center gap-1.5 relative overflow-hidden"
                  style={{
                    background: c.hex,
                    border: `2px solid ${c.hex}`,
                    boxShadow: `0 4px 24px ${c.hex}70, 0 0 0 1px ${c.hex}30`,
                  }}>
                  <span className="font-gothic text-sm tracking-widest uppercase" style={{
                    color: c.text,
                    textShadow: '0 1px 6px rgba(0,0,0,0.5)',
                    letterSpacing: '0.12em',
                  }}>{c.name}</span>
                  <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.15) 0%,rgba(255,255,255,0) 60%)' }} />
                </motion.button>
              ))}
            </div>
          )}
          {phase === 'input' && given.length > 0 && (
            <div className="flex gap-2 flex-wrap justify-center">
              {given.map((g, i) => {
                const c = COLORS.find(c => c.name === g)
                return (
                  <div key={i} className="flex flex-col items-center gap-0.5">
                    <div className="w-7 h-7 rounded-full border-2" style={{ background: c?.hex || '#888', borderColor: 'rgba(255,255,255,0.4)', boxShadow: c ? `0 0 10px ${c.hex}80` : 'none' }} />
                    <span className="font-jost" style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>{i + 1}</span>
                  </div>
                )
              })}
            </div>
          )}
          {phase === 'feedback' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center flex flex-col items-center gap-3">
              <div className="text-4xl mb-1" style={{ color: lastCorrect ? '#7a9e7e' : '#f87171' }}>{lastCorrect ? '+' : 'x'}</div>
              {!lastCorrect && (
                <div className="flex flex-col items-center gap-2">
                  <p className="font-jost text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Correct sequence</p>
                  <div className="flex gap-2 flex-wrap justify-center">
                    {seq.map((name, i) => {
                      const c = COLORS.find(c => c.name === name)
                      return (
                        <div key={i} className="px-3 py-1.5 rounded-lg font-gothic text-xs tracking-wide" style={{
                          background: c?.hex ?? '#888',
                          color: c?.text ?? '#fff',
                          boxShadow: c ? `0 2px 12px ${c.hex}60` : 'none',
                        }}>{name}</div>
                      )
                    })}
                  </div>
                </div>
              )}
              {lastCorrect && roundInLevel + 1 >= ROUNDS_PER_LEVEL && (
                <p className="font-jost text-xs tracking-widest uppercase mt-1" style={{ color }}>Level complete! Moving up...</p>
              )}
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}
