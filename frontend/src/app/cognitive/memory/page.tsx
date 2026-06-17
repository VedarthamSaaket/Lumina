'use client'
import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Navigation } from '@/components/layout/Navigation'
import { ParticleCanvas } from '@/components/ui/ParticleCanvas'
import { GoldHeading } from '@/components/ui/GoldHeading'
import OrionLiveObserver from '@/components/orion/OrionLiveObserver'
import OrionDebrief from '@/components/orion/OrionDebrief'
import OrionRightPanel from '@/components/orion/OrionRightPanel'
import { useThemeStore } from '@/lib/themeStore'
import Grainient from '@/components/ui/Grainient'

import { AnyRound, BaseRound, GAMES, GameId, GamePhase, GOLD, MODE_LABELS, PUZZLE_GAMES, PuzzleGameId, SeqMode } from './types'
import { SequenceGame } from './games/SequenceGame'
import { MathGame } from './games/MathGame'
import { ColorGame } from './games/ColorGame'
import { SpatialGame } from './games/SpatialGame'
import { WordGame } from './games/WordGame'
import { MatrixGame } from './games/MatrixGame'
import { OddOneOutGame } from './games/OddOneOutGame'
import { SeriesGame } from './games/SeriesGame'
import { AnalogyGame } from './games/AnalogyGame'
import { PaperFoldGame } from './games/PaperFoldGame'
import { PuzzleResultScreen } from './components/PuzzleResultScreen'

export default function MemoryPage() {
  const { theme } = useThemeStore()
  const isLight = theme === 'light'
  const [phase, setPhase] = useState<GamePhase>('selector')
  const [selected, setSelected] = useState<GameId | null>(null)
  const [rounds, setRounds] = useState<AnyRound[]>([])
  const [puzzleSelected, setPuzzleSelected] = useState<PuzzleGameId | null>(null)
  const [puzzleRounds, setPuzzleRounds] = useState<BaseRound[]>([])
  const [orionRightContent, setOrionRightContent] = useState<string | null>(null)
  const [activeGameType, setActiveGameType] = useState<string | null>(null)
  const sessionStartRef = useRef<number>(Date.now())

  const selectGame = (id: GameId) => {
    setSelected(id)
    setActiveGameType(id)
    sessionStartRef.current = Date.now()
    setPhase('intro')
  }
  const startGame = () => setPhase('playing')
  const retake = () => setPhase('intro')
  const back = () => { setSelected(null); setPhase('selector'); setRounds([]) }
  const game = selected ? (GAMES as any)[selected] : null

  const quitMemoryGame = (r: AnyRound[]) => {
    if (r.length > 0) { setRounds(r); setPhase('result') }
    else { setPhase('selector') }
  }
  const completeMemoryGame = (r: AnyRound[]) => {
    setRounds(r); setPhase('result')
  }

  const quitPuzzleGame = (r: BaseRound[]) => {
    if (r.length > 0) { setPuzzleRounds(r); setPhase('puzzle-result') }
    else { setPhase('selector') }
  }
  const completePuzzleGame = (r: BaseRound[]) => {
    setPuzzleRounds(r); setPhase(r.length > 0 ? 'puzzle-result' : 'selector')
  }

  const gameGroups = [
    { label: 'Sequence Memory', ids: ['digit', 'letter', 'math'] as (keyof typeof GAMES)[] },
    { label: 'Visual Memory', ids: ['color', 'spatial', 'spatial_reverse'] as (keyof typeof GAMES)[] },
    { label: 'Verbal Memory', ids: ['word'] as (keyof typeof GAMES)[] },
  ]

  return (
    <main className="bg-chat min-h-screen relative overflow-hidden">
      <ParticleCanvas colors={['#d4af37', '#f5ead8', '#b8860b']} count={18} />
      {isLight && <Grainient color1="#c4a882" color2="#f5e6c8" color3="#7a5c38" timeSpeed={0.12} grainAmount={0.07} contrast={1.3} saturation={0.8} className="grainient-background" />}
      <Navigation />
      <div className="relative z-10 pt-24 pb-20 px-5 max-w-3xl mx-auto">

        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <GoldHeading prefix="Memory" gold="Games" size="clamp(2.5rem,6vw,5rem)" />
          <p className="font-display italic text-lg" style={{ color: 'var(--text-secondary)', fontWeight: 300 }}>Memory, reasoning, and fluid intelligence, all in one place.</p>
          <div className="mt-4 mx-auto max-w-lg text-xs font-jost tracking-wide px-4 py-2 rounded-full"
            style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
            12 games · 5 rounds per level · no repeated questions · timer adapts to difficulty
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {phase === 'selector' && (
            <motion.div key="sel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              {gameGroups.map(group => (
                <div key={group.label}>
                  <p className="font-jost text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)' }}>{group.label}</p>
                  <div className="space-y-3">
                    {group.ids.map((id, i) => {
                      const g = GAMES[id]
                      return (
                        <motion.button key={g.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                          whileHover={{ x: 5 }} whileTap={{ scale: 0.98 }} onClick={() => selectGame(g.id)}
                          className="glass rounded-xl p-5 w-full text-left flex items-center gap-5" style={{ border: `1px solid ${g.color}28` }}>
                          <div className="w-14 h-14 rounded-full flex items-center justify-center font-display text-2xl flex-shrink-0"
                            style={{ background: `${g.color}12`, color: g.color, border: `1.5px solid ${g.color}28`, filter: `drop-shadow(0 0 6px ${g.color}40)` }}>
                            {g.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="font-gothic text-sm" style={{ color: 'var(--text-primary)', letterSpacing: '0.06em' }}>{g.title}</h3>
                              <span className="font-jost text-xs px-2 py-0.5 rounded-full" style={{ background: `${g.color}12`, color: g.color, border: `1px solid ${g.color}28` }}>
                                5 rounds/lvl
                              </span>
                            </div>
                            <p className="font-body text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{g.subtitle}</p>
                            <p className="font-jost text-xs" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{g.psych}</p>
                            <p className="font-jost text-xs mt-2 tracking-widest uppercase" style={{ color: g.color }}>PLAY →</p>
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              ))}

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <p className="font-jost text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Fluid Intelligence</p>
                  <span className="font-jost text-xs px-2 py-0.5 rounded-full" style={{ background: `${GOLD}12`, color: GOLD, border: `1px solid ${GOLD}28` }}>
                    Cattell Culture Fair
                  </span>
                </div>
                <div className="space-y-3">
                  {(Object.values(PUZZLE_GAMES) as typeof PUZZLE_GAMES[PuzzleGameId][]).map((g, i) => (
                    <motion.button key={g.id}
                      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                      whileHover={{ x: 5 }} whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setPuzzleSelected(g.id)
                        setActiveGameType(g.id)
                        sessionStartRef.current = Date.now()
                        setPhase('puzzle-intro')
                      }}
                      className="glass rounded-xl p-5 w-full text-left flex items-center gap-5"
                      style={{ border: `1px solid ${g.color}28` }}>
                      <div className="w-14 h-14 rounded-full flex items-center justify-center font-display text-2xl flex-shrink-0"
                        style={{ background: `${g.color}12`, color: g.color, border: `1.5px solid ${g.color}28`, filter: `drop-shadow(0 0 6px ${g.color}40)` }}>
                        {g.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-gothic text-sm" style={{ color: 'var(--text-primary)', letterSpacing: '0.06em' }}>{g.title}</h3>
                          <span className="font-jost text-xs px-2 py-0.5 rounded-full" style={{ background: `${g.color}12`, color: g.color, border: `1px solid ${g.color}28` }}>
                            5 rounds/lvl
                          </span>
                        </div>
                        <p className="font-body text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{g.subtitle}</p>
                        <p className="font-jost text-xs" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{g.psych}</p>
                        <p className="font-jost text-xs mt-2 tracking-widest uppercase" style={{ color: g.color }}>PLAY →</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {phase === 'intro' && game && (
            <motion.div key="intro" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
              <button onClick={back} className="mb-6 text-sm font-jost tracking-widest uppercase opacity-55 hover:opacity-100 transition-opacity" style={{ color: 'var(--text-primary)' }}>Back</button>
              <div className="glass-strong rounded-2xl p-7" style={{ border: `1px solid ${game.color}18` }}>
                <div className="flex items-center gap-4 mb-5">
                  <div className="text-4xl" style={{ color: game.color, filter: `drop-shadow(0 0 10px ${game.color}55)` }}>{game.icon}</div>
                  <div>
                    <h2 className="font-gothic text-xl" style={{ color: 'var(--text-primary)', letterSpacing: '0.07em' }}>{game.title}</h2>
                    <p className="font-display italic text-sm" style={{ color: 'var(--text-secondary)', fontWeight: 300 }}>{game.subtitle}</p>
                  </div>
                </div>
                <div className="mb-5 p-4 rounded-xl" style={{ background: `${game.color}07`, border: `1px solid ${game.color}12` }}>
                  <p className="font-body text-base leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>{game.desc}</p>
                  <p className="font-jost text-xs" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{game.psych}</p>
                </div>
                {game.modes.length > 0 && (
                  <div className="mb-5 p-4 rounded-xl" style={{ background: `${game.color}05`, border: `1px solid ${game.color}10` }}>
                    <p className="font-jost text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Recall modes you will encounter</p>
                    <div className="flex flex-wrap gap-2">
                      {(game.modes as SeqMode[]).map(m => (
                        <span key={m} className="font-jost text-xs px-3 py-1 rounded-full"
                          style={{ background: `${game.color}10`, border: `1px solid ${game.color}22`, color: game.color }}>
                          {MODE_LABELS[m] || m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-6 text-xs font-jost" style={{ color: 'var(--text-muted)' }}>
                  <span>5 rounds per level</span><span>·</span><span>No repeated questions</span><span>·</span>
                  <span>Timer adapts to difficulty</span><span>·</span><span>No timer at level 10+</span><span>·</span><span>Quit anytime for results</span>
                </div>
                <motion.button onClick={startGame} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  className="w-full py-4 rounded-xl font-jost font-semibold text-sm tracking-widest uppercase"
                  style={{ background: `linear-gradient(135deg,${game.color}22,${game.color}0d)`, border: `1px solid ${game.color}38`, color: 'var(--text-primary)' }}>
                  Begin Game →
                </motion.button>
              </div>
            </motion.div>
          )}

          {phase === 'playing' && selected && (
            <motion.div key="play" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
              <div className="glass-strong rounded-2xl p-7" style={{ border: `1px solid ${GAMES[selected].color}18` }}>
                {selected === 'digit' && <SequenceGame gameId="digit" onQuit={r => quitMemoryGame(r as AnyRound[])} onComplete={r => completeMemoryGame(r as AnyRound[])} />}
                {selected === 'letter' && <SequenceGame gameId="letter" onQuit={r => quitMemoryGame(r as AnyRound[])} onComplete={r => completeMemoryGame(r as AnyRound[])} />}
                {selected === 'math' && <MathGame onQuit={r => quitMemoryGame(r as AnyRound[])} onComplete={r => completeMemoryGame(r as AnyRound[])} />}
                {selected === 'color' && <ColorGame onQuit={r => quitMemoryGame(r as AnyRound[])} onComplete={r => completeMemoryGame(r as AnyRound[])} />}
                {selected === 'spatial' && <SpatialGame reverse={false} onQuit={r => quitMemoryGame(r as AnyRound[])} onComplete={r => completeMemoryGame(r as AnyRound[])} />}
                {selected === 'spatial_reverse' && <SpatialGame reverse={true} onQuit={r => quitMemoryGame(r as AnyRound[])} onComplete={r => completeMemoryGame(r as AnyRound[])} />}
                {selected === 'word' && <WordGame onQuit={r => quitMemoryGame(r as AnyRound[])} onComplete={r => completeMemoryGame(r as AnyRound[])} />}
              </div>
            </motion.div>
          )}

          {phase === 'result' && selected && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
            >
              <OrionDebrief
                gameId={selected}
                gameTitle={GAMES[selected as keyof typeof GAMES]?.title || selected}
                rounds={rounds}
                stats={{
                  'Rounds played': rounds.length,
                  'Accuracy': rounds.length ? `${Math.round((rounds.filter(r => r.correct).length / rounds.length) * 100)}%` : '0%',
                  'Max level': Math.max(...rounds.map(r => r.level || 0), 0),
                  'Correct answers': rounds.filter(r => r.correct).length
                }}
                sessionStartMs={sessionStartRef.current}
                onBack={back}
                onRetake={retake}
                color={GAMES[selected as keyof typeof GAMES]?.color || GOLD}
                icon={GAMES[selected as keyof typeof GAMES]?.icon || 'O'}
              />
            </motion.div>
          )}

          {phase === 'puzzle-intro' && puzzleSelected && (
            <motion.div key="puzzle-intro" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
              <button onClick={back} className="mb-6 text-sm font-jost tracking-widest uppercase opacity-55 hover:opacity-100 transition-opacity" style={{ color: 'var(--text-primary)' }}>Back</button>
              {(() => {
                const g = PUZZLE_GAMES[puzzleSelected]
                return (
                  <div className="glass-strong rounded-2xl p-7" style={{ border: `1px solid ${g.color}18` }}>
                    <div className="flex items-center gap-4 mb-5">
                      <div className="text-4xl" style={{ color: g.color, filter: `drop-shadow(0 0 10px ${g.color}55)` }}>{g.icon}</div>
                      <div>
                        <h2 className="font-gothic text-xl" style={{ color: 'var(--text-primary)', letterSpacing: '0.07em' }}>{g.title}</h2>
                        <p className="font-display italic text-sm" style={{ color: 'var(--text-secondary)', fontWeight: 300 }}>{g.subtitle}</p>
                      </div>
                    </div>
                    <div className="mb-5 p-4 rounded-xl" style={{ background: `${g.color}07`, border: `1px solid ${g.color}12` }}>
                      <p className="font-body text-base leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>{g.desc}</p>
                      <p className="font-jost text-xs italic" style={{ color: 'var(--text-muted)' }}>{g.psych}</p>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-6 text-xs font-jost" style={{ color: 'var(--text-muted)' }}>
                      <span>5 rounds per level</span><span>·</span><span>No repeated questions</span><span>·</span><span>Quit anytime for results</span>
                    </div>
                    <motion.button onClick={() => setPhase('puzzle-playing')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      className="w-full py-4 rounded-xl font-jost font-semibold text-sm tracking-widest uppercase"
                      style={{ background: `linear-gradient(135deg,${g.color}22,${g.color}0d)`, border: `1px solid ${g.color}38`, color: 'var(--text-primary)' }}>
                      Begin Puzzle
                    </motion.button>
                  </div>
                )
              })()}
            </motion.div>
          )}

          {phase === 'puzzle-playing' && puzzleSelected && (
            <motion.div key="puzzle-play" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
              <div className="glass-strong rounded-2xl p-7" style={{ border: `1px solid ${PUZZLE_GAMES[puzzleSelected].color}18` }}>
                {puzzleSelected === 'matrix' && <MatrixGame onQuit={quitPuzzleGame} onComplete={completePuzzleGame} />}
                {puzzleSelected === 'oddoneout' && <OddOneOutGame onQuit={quitPuzzleGame} onComplete={completePuzzleGame} />}
                {puzzleSelected === 'series' && <SeriesGame onQuit={quitPuzzleGame} onComplete={completePuzzleGame} />}
                {puzzleSelected === 'analogy' && <AnalogyGame onQuit={quitPuzzleGame} onComplete={completePuzzleGame} />}
                {puzzleSelected === 'paperfold' && <PaperFoldGame onQuit={quitPuzzleGame} onComplete={completePuzzleGame} />}
              </div>
            </motion.div>
          )}

          {phase === 'puzzle-result' && puzzleSelected && puzzleRounds.length > 0 && (
            <motion.div key="puzzle-result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PuzzleResultScreen
                gameId={puzzleSelected}
                rounds={puzzleRounds}
                onRetake={() => setPhase('puzzle-intro')}
                onBack={() => { setPuzzleSelected(null); setPuzzleRounds([]); setPhase('selector') }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {(phase === 'playing' || phase === 'puzzle-playing') && activeGameType && (
        <OrionLiveObserver gameType={activeGameType} />
      )}

      {phase === 'selector' && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            position: 'fixed', left: '20px', bottom: '20px',
            zIndex: 100, display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 14px', borderRadius: '24px',
            background: 'rgba(91,155,213,0.08)',
            border: '1px solid rgba(91,155,213,0.25)',
            cursor: 'default',
          }}
        >
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: '#5B9BD5',
              boxShadow: '0 0 12px rgba(91,155,213,0.7)',
            }}
          />
          <span style={{
            fontFamily: 'var(--font-jost)', fontSize: '10px',
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'rgba(91,155,213,0.85)',
          }}>
            Orion watching
          </span>
        </motion.div>
      )}

      {orionRightContent && (
        <div style={{
          position: 'fixed', right: '16px', bottom: '16px',
          width: '320px', height: '420px', zIndex: 100,
        }}>
          <OrionRightPanel
            contentType={orionRightContent}
            gameType={activeGameType || undefined}
            onClose={() => setOrionRightContent(null)}
          />
        </div>
      )}
    </main>
  )
}
