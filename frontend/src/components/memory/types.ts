// Memory Games Types
export type MemoryGameId = 'digit' | 'letter' | 'math' | 'color' | 'spatial' | 'spatial_reverse' | 'word'
export type PuzzleGameId = 'matrix' | 'oddoneout' | 'series' | 'analogy' | 'paperfold'
export type GameId = MemoryGameId | PuzzleGameId
export type GamePhase = 'selector' | 'intro' | 'playing' | 'result' | 'puzzle-intro' | 'puzzle-playing' | 'puzzle-result'
export type SeqMode = 'forward' | 'reverse' | 'ascending' | 'descending' | 'odd_only' | 'even_only'

export interface BaseRound {
  level: number
  correct: boolean
}

export interface SeqRound extends BaseRound {
  type: 'sequence'
  mode: SeqMode
  sequence: (number | string)[]
  given: (number | string)[]
}

export interface SpatialRound extends BaseRound {
  type: 'spatial'
  shown: number[]
  selected: number[]
}

export interface WordRound extends BaseRound {
  type: 'word'
  words: string[]
  recalled: string[]
}

export interface ColorRound extends BaseRound {
  type: 'color'
  sequence: string[]
  given: string[]
}

export interface MathRound extends BaseRound {
  type: 'math'
  sequence: number[]
  answer: number
  given: number | null
  rule: string
}

export type AnyRound = SeqRound | SpatialRound | WordRound | ColorRound | MathRound

export interface GameConfig {
  id: GameId
  icon: string
  color: string
  title: string
  subtitle: string
  desc: string
  psych: string
  modes: SeqMode[]
}

export interface PuzzleConfig {
  id: PuzzleGameId
  icon: string
  color: string
  title: string
  subtitle: string
  desc: string
  psych: string
}