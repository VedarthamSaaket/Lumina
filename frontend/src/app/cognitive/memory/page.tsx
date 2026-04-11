'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navigation } from '@/components/layout/Navigation'
import { ParticleCanvas } from '@/components/ui/ParticleCanvas'
import DarkVeil from '@/components/DarkVeil'
import '@/components/DarkVeil.css'

type GameId = 'digit' | 'letter' | 'math' | 'color' | 'spatial' | 'spatial_reverse' | 'word' | 'matrix' | 'oddoneout' | 'series' | 'analogy' | 'paperfold'
type GamePhase = 'selector' | 'intro' | 'playing' | 'result' | 'puzzle-intro' | 'puzzle-playing' | 'puzzle-result'

type PuzzleGameId = 'matrix' | 'oddoneout' | 'series' | 'analogy' | 'paperfold'

interface BaseRound { level: number; correct: boolean }
const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5)

interface SeqRound extends BaseRound {
  type: 'sequence'
  mode: 'forward' | 'reverse' | 'ascending' | 'descending' | 'odd_only' | 'even_only'
  sequence: (number | string)[]
  given: (number | string)[]
}
interface SpatialRound extends BaseRound { type: 'spatial'; shown: number[]; selected: number[] }
interface WordRound extends BaseRound { type: 'word'; words: string[]; recalled: string[] }
interface ColorRound extends BaseRound { type: 'color'; sequence: string[]; given: string[] }
interface MathRound extends BaseRound { type: 'math'; sequence: number[]; answer: number; given: number | null; rule: string }

type AnyRound = SeqRound | SpatialRound | WordRound | ColorRound | MathRound

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
}

function isSameShape(s1: any, s2: any) {
  if (!s1 || !s2) return false
  return s1.type === s2.type &&
         s1.fill === s2.fill &&
         (s1.rotate || 0) === (s2.rotate || 0) &&
         (s1.color === s2.color)
}

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }
  return fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  })
}

const ROUNDS_PER_LEVEL = 5
const MAX_CONSEC = 3

const SAGE = '#7A9E7E'
const GOLD = '#D4AF37'
const MUTED = '#C9897A'
const STEEL = '#5B9BD5'
const WARM = '#C4913A'
const GOLD2 = '#B8860B'

const GAMES = {
  digit: {
    id: 'digit' as GameId, icon: '8', color: GOLD,
    title: 'Number Sequence',
    subtitle: 'Hold and recall sequences of digits',
    desc: 'A sequence of numbers appears one at a time. Each level has 5 rounds of increasing difficulty. Recall them in the requested order: forward, reverse, sorted, or filtered. Sequences grow longer and modes get harder across levels.',
    psych: 'Measures verbal working memory and mental manipulation of numeric sequences.',
    modes: ['forward', 'reverse', 'ascending', 'descending', 'odd_only', 'even_only'],
  },
  letter: {
    id: 'letter' as GameId, icon: 'A', color: '#9b7fd4',
    title: 'Letter Sequence',
    subtitle: 'Hold and recall sequences of letters',
    desc: 'Like Number Sequence, but with letters. Each level has 5 rounds of escalating length and mode complexity. Recall them forward, in reverse, or alphabetically sorted.',
    psych: 'Measures verbal working memory with semantic rather than numeric material.',
    modes: ['forward', 'reverse', 'ascending', 'descending'],
  },
  math: {
    id: 'math' as GameId, icon: '∑', color: SAGE,
    title: 'Math Patterns',
    subtitle: 'Spot the rule and predict the next number',
    desc: 'A sequence of numbers follows a hidden rule. Figure out the pattern and type what comes next. Each level has 5 rounds with increasing pattern complexity. No two sequences are ever alike.',
    psych: 'Measures pattern recognition, fluid reasoning, and numerical working memory.',
    modes: [],
  },
  color: {
    id: 'color' as GameId, icon: '◉', color: MUTED,
    title: 'Color Pattern',
    subtitle: 'Remember and reproduce a color sequence',
    desc: 'A sequence of colors flashes in order. Tap them back in the same order. Each level has 5 rounds growing longer and faster. Colors are never repeated in the same position across rounds.',
    psych: 'Measures visuospatial working memory with color-based encoding.',
    modes: [],
  },
  spatial: {
    id: 'spatial' as GameId, icon: '+', color: STEEL,
    title: 'Pattern Memory',
    subtitle: 'Remember which cells lit up and tap them back',
    desc: 'Cells on a grid light up one at a time. Tap the same cells in the same order. Each level has 5 rounds, patterns grow longer and flash faster. No pattern repeats.',
    psych: 'Measures visuospatial working memory - how your brain stores and retrieves spatial information.',
    modes: [],
  },
  spatial_reverse: {
    id: 'spatial_reverse' as GameId, icon: '⤢', color: WARM,
    title: 'Reverse Spatial',
    subtitle: 'Tap the cells back in reverse order',
    desc: 'Identical to Pattern Memory, but you must tap the cells back in reverse order. 5 rounds per level, escalating within each level.',
    psych: 'Measures visuospatial working memory with backward recall - a more demanding variant.',
    modes: [],
  },
  word: {
    id: 'word' as GameId, icon: 'W', color: WARM,
    title: 'Word Recall',
    subtitle: 'Build and recall a growing list of words',
    desc: 'Words appear one by one. Each round adds a new word to the previous list. Success requires recalling ONLY the exact words in the current set. Typing extra words or words from previous rounds that aren\'t currently shown will count as an error.',
    psych: 'Measures semantic memory and interference resolution.',
    modes: [],
  },
}

const PUZZLE_GAMES: Record<PuzzleGameId, {
  id: PuzzleGameId; icon: string; color: string; title: string; subtitle: string; desc: string; psych: string
}> = {
  matrix: { id: 'matrix', icon: '⊞', color: GOLD, title: 'Matrix Reasoning', subtitle: 'Find the missing piece in the pattern grid', desc: 'A 3×3 grid of shapes follows a hidden rule. The bottom-right cell is missing. Study the patterns across rows and columns to find what belongs there. 5 rounds per level, each round adds a new layer of rule complexity.', psych: 'Measures fluid intelligence and abstract pattern recognition.' },
  oddoneout: { id: 'oddoneout', icon: '◉', color: MUTED, title: 'Odd One Out', subtitle: 'Find the shape that doesn\'t belong', desc: 'Five shapes are shown. Four share something in common. One doesn\'t. 5 rounds per level, attributes compound as levels rise (shape, fill, size, rotation, color, multi-attribute).', psych: 'Measures perceptual discrimination and inductive reasoning.' },
  series: { id: 'series', icon: '→', color: STEEL, title: 'Series Completion', subtitle: 'What shape comes next in the sequence?', desc: 'A row of shapes follows a rule. Select what logically continues the sequence. 5 rounds per level, rules start simple (fill cycle) and escalate to triple-compound transformations.', psych: 'Measures sequential reasoning and rule induction.' },
  analogy: { id: 'analogy', icon: '∷', color: WARM, title: 'Visual Analogy', subtitle: 'B corresponds to A as D corresponds to C', desc: 'Two shapes share a relationship. Apply the same transformation to a third. 5 rounds per level, analogies escalate from single to triple-attribute transforms.', psych: 'Measures analogical reasoning and relational thinking.' },
  paperfold: { id: 'paperfold', icon: '◱', color: GOLD2, title: 'Paper Folding', subtitle: 'Where do the holes appear when unfolded?', desc: 'A square paper is folded and a hole is punched. When unfolded, which image shows the correct holes? Early levels: 1 fold. Later levels: 2 folds with tighter margins.', psych: 'Measures visuospatial transformation and mental folding ability.' },
}

const isPuzzleId = (id: string): id is PuzzleGameId => id in PUZZLE_GAMES

async function generateGptSummary(
  gameId: string,
  gameTitle: string,
  psych: string,
  stats: Record<string, number | string>,
  rounds: BaseRound[],
  type: 'memory' | 'puzzle'
): Promise<string> {
  const roundDetails = rounds.map((r, i) => {
    const base = `Round ${i + 1} (Lv${r.level}): ${r.correct ? 'CORRECT' : 'WRONG'}`
    const anyR = r as any
    if (type === 'memory') {
      if ('mode' in r && 'sequence' in r) return `${base} | mode: ${anyR.mode} | shown: [${anyR.sequence.join(', ')}] | given: [${anyR.given.join(', ')}]`
      if ('words' in r) return `${base} | words shown: [${anyR.words.join(', ')}] | recalled: [${anyR.recalled.join(', ')}]`
      if ('shown' in r) return `${base} | pattern length: ${anyR.shown.length} | correct cells: ${anyR.shown.join(',')} | tapped: ${anyR.selected.join(',')}`
      if ('answer' in r) return `${base} | rule: ${anyR.rule} | answer: ${anyR.answer} | given: ${anyR.given}`
      if ('sequence' in r && Array.isArray(anyR.sequence)) return `${base} | length: ${anyR.sequence.length} | given: [${anyR.given.join(', ')}]`
    }
    return base
  }).join('\n')

  const prompt = `Write a SHORT cognitive reflection in this exact format:

**What your results show**
- [One specific observation referencing their level progression or accuracy]
- [One observation about what this pattern suggests about their reasoning style]

**One thing to try**
- [One concrete, specific suggestion based on what you observed]

Rules: Each bullet under 20 words. No intro sentence. No em dashes. No clinical labels. Speak as "you". Warm tone.

Game: ${gameTitle}
What it measures: ${psych}
Aggregate stats:
${Object.entries(stats).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

${roundDetails ? `Round-by-round:\n${roundDetails}\n` : ''}

Write a warm, specific 2-paragraph reflection (under 160 words total):
Paragraph 1: Interpret the patterns in the results. Reference specific numbers. Use a metaphor if it fits.
Paragraph 2: One concrete, practical suggestion.

Rules: Speak as "you". No clinical labels. No em dashes. Warm and human tone.`

  try {
    const res = await apiFetch('/api/summary', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    })
    if (!res.ok) return ''
    const data = await res.json()
    return data.summary ?? ''
  } catch { return '' }
}

async function saveMemoryResult(
  gameId: string,
  stats: Record<string, number | string>,
  roundsData: any[],
  aiSummary?: string
) {
  const token = getToken()
  const solutions = roundsData.map((r, i) => {
    const base = { round: i + 1, level: r.level, correct: r.correct }
    if ('sequence' in r && 'mode' in r) return { ...base, type: 'sequence', sequence: r.sequence, mode: r.mode, given: r.given }
    if ('sequence' in r && 'answer' in r) return { ...base, type: 'math', sequence: r.sequence, rule: r.rule, answer: r.answer, given: r.given }
    if ('sequence' in r && Array.isArray(r.sequence)) return { ...base, type: 'color', sequence: r.sequence, given: r.given }
    if ('shown' in r) return { ...base, type: 'spatial', shown: r.shown, selected: r.selected }
    if ('words' in r) return { ...base, type: 'word', words: r.words, recalled: r.recalled }
    return base
  })

  try {
    await apiFetch('/api/cognitive/memory', {
      method: 'POST',
      body: JSON.stringify({ game_type: gameId, stats, rounds_data: roundsData, solutions, ai_summary: aiSummary || null, completed_at: new Date().toISOString() }),
    })
  } catch { }

  if (aiSummary && token) {
    try {
      const isPuzzle = ['matrix', 'oddoneout', 'series', 'analogy', 'paperfold'].includes(gameId)
      const game = isPuzzle ? PUZZLE_GAMES[gameId as PuzzleGameId] : (GAMES as any)[gameId as any]
      const topStat = Object.entries(stats)[0]
      const statLine = topStat ? ` · ${topStat[0]}: ${topStat[1]}` : ''
      await apiFetch('/api/dashboard/summaries', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: `${game?.title || gameId} - Level ${Math.max(...roundsData.map(r => r.level), 0)}${statLine}`,
          content: aiSummary,
          source: isPuzzle ? 'puzzle' : 'cognitive',
        }),
      })
    } catch { }
  }
}



// ── TIMER LOGIC ───────────────────────────────────────────────────────────────
// Easy levels (1-3): short time (pressure to think fast on simple things)
// Mid levels (4-6): medium time
// Hard levels (7-9): longer time (complex questions need thinking time)
// Very hard (10+): NO timer at all (pure cognition, no pressure)
function getTimeLimit(gameId: GameId, level: number, roundInLevel: number, itemCount?: number): number | null {
  // Very hard levels - no timer
  if (level >= 10) return null

  if (gameId === 'word') {
    // Each word needs ~6s for typing/recall + a 15s base buffer
    const listLen = itemCount || 1
    return 15 + (listLen * 6)
  }

  // Base times per game type (at level 1, round 1)
  const bases: Record<string, number> = {
    digit: 12,
    letter: 12,
    math: 18,
    color: 0,
    spatial: 0,
    spatial_reverse: 0,
  }
  const base = bases[gameId]
  if (!base) return null

  const levelBonus = (level - 1) * 3
  const roundPenalty = roundInLevel * 1
  const computed = base + levelBonus - roundPenalty
  return Math.max(8, computed)
}

// ── SEQUENCE GENERATION with no-repeat guarantee ──────────────────────────────
// We track used sequences per session so nothing repeats

const usedSeqSignatures = new Set<string>()

function randSeqUnique(len: number, maxAttempts = 40): number[] {
  for (let i = 0; i < maxAttempts; i++) {
    const seq = Array.from({ length: len }, () => Math.floor(Math.random() * 9) + 1)
    const sig = seq.join(',')
    if (!usedSeqSignatures.has(sig)) {
      usedSeqSignatures.add(sig)
      return seq
    }
  }
  // Fallback: just return a new one (very unlikely collision at short lengths)
  return Array.from({ length: len }, () => Math.floor(Math.random() * 9) + 1)
}

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const usedLetterSignatures = new Set<string>()

function randLetterSeqUnique(len: number, maxAttempts = 40): string[] {
  for (let i = 0; i < maxAttempts; i++) {
    const seq = Array.from({ length: len }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)])
    const sig = seq.join(',')
    if (!usedLetterSignatures.has(sig)) {
      usedLetterSignatures.add(sig)
      return seq
    }
  }
  return Array.from({ length: len }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)])
}

// Reset used sets when a new game session starts
function resetSeqHistory() {
  usedSeqSignatures.clear()
  usedLetterSignatures.clear()
}

const COLORS = [
  { name: 'Crimson', hex: '#DC143C', text: '#fff' },
  { name: 'Cobalt', hex: '#0047AB', text: '#fff' },
  { name: 'Emerald', hex: '#009B77', text: '#fff' },
  { name: 'Amber', hex: '#FFBF00', text: '#1a1200' },
  { name: 'Violet', hex: '#7F00FF', text: '#fff' },
  { name: 'Tangerine', hex: '#F28500', text: '#fff' },
  { name: 'Rose', hex: '#FF007F', text: '#fff' },
  { name: 'Teal', hex: '#008080', text: '#fff' },
  { name: 'Gold', hex: '#D4AF37', text: '#1a1200' },
  { name: 'Indigo', hex: '#4B0082', text: '#fff' },
  { name: 'Jade', hex: '#00A878', text: '#fff' },
  { name: 'Scarlet', hex: '#FF2400', text: '#fff' },
]

const WORD_BANK = [
  'river', 'candle', 'mirror', 'window', 'silver', 'carpet', 'shadow', 'garden', 'forest', 'lantern',
  'bottle', 'pencil', 'bridge', 'anchor', 'velvet', 'marble', 'copper', 'feather', 'thunder', 'crystal',
  'bamboo', 'falcon', 'temple', 'harbor', 'mosaic', 'prism', 'ember', 'cipher', 'spiral', 'zenith',
  'dusk', 'echo', 'fable', 'gravel', 'hollow', 'jasper', 'kindle', 'lagoon', 'mantle', 'nectar',
  'obsidian', 'parchment', 'quartz', 'riddle', 'sunset', 'tallow', 'umber', 'vortex', 'willow', 'zephyr',
  'atlas', 'beacon', 'citadel', 'dagger', 'eclipse', 'fjord', 'glacier', 'haven', 'iris', 'jubilee',
  'karst', 'lupine', 'meridian', 'nova', 'oracle', 'phantom', 'relic', 'solstice', 'tundra', 'utopia',
  'verdi', 'warden', 'xenon', 'yonder', 'zonal', 'arbor', 'brume', 'cornice', 'deluge', 'effigy',
]

type SeqMode = 'forward' | 'reverse' | 'ascending' | 'descending' | 'odd_only' | 'even_only'
const MODE_LABELS: Record<SeqMode, string> = {
  forward: 'Forward order',
  reverse: 'Reverse order',
  ascending: 'Ascending (low → high)',
  descending: 'Descending (high → low)',
  odd_only: 'Odd digits only',
  even_only: 'Even digits only',
}

// Mode difficulty ranking: forward < reverse < ascending/descending < odd/even
function getModeForRound(level: number, roundInLevel: number, availableModes: SeqMode[]): SeqMode {
  if (availableModes.length === 0) return 'forward'
  // Within a level, rounds progress through harder modes
  // Level 1: all forward. Level 2: forward→reverse. Level 3+: all modes unlock gradually
  const modeProgression: SeqMode[] = ['forward', 'forward', 'reverse', 'ascending', 'descending', 'odd_only', 'even_only']
  const filtered = modeProgression.filter(m => availableModes.includes(m))

  // Global difficulty index: level * rounds_per_level + round
  const globalIdx = (level - 1) * ROUNDS_PER_LEVEL + roundInLevel
  // Modes unlock progressively - start simple, ramp up
  const modeUnlockThreshold = [0, 5, 10, 16, 22, 30, 40] // global round indices to unlock each mode tier
  let modeIdx = 0
  for (let i = modeUnlockThreshold.length - 1; i >= 0; i--) {
    if (globalIdx >= modeUnlockThreshold[i] && filtered[i] !== undefined) {
      modeIdx = i
      break
    }
  }
  return filtered[Math.min(modeIdx, filtered.length - 1)]
}

// Sequence length: grows with level AND within level
function getSeqLen(baseLen: number, level: number, roundInLevel: number): number {
  // base for level: baseLen + (level-1)*1
  // within level: each round adds 1 digit
  return baseLen + (level - 1) + roundInLevel
}

function applyMode(seq: number[], mode: SeqMode): number[] {
  switch (mode) {
    case 'reverse': return [...seq].reverse()
    case 'ascending': return [...seq].sort((a, b) => a - b)
    case 'descending': return [...seq].sort((a, b) => b - a)
    case 'odd_only': return seq.filter(n => n % 2 !== 0)
    case 'even_only': return seq.filter(n => n % 2 === 0)
    default: return seq
  }
}

function applyLetterMode(seq: string[], mode: 'forward' | 'reverse' | 'ascending' | 'descending'): string[] {
  switch (mode) {
    case 'reverse': return [...seq].reverse()
    case 'ascending': return [...seq].sort()
    case 'descending': return [...seq].sort().reverse()
    default: return seq
  }
}

// ── MATH SEQUENCE with uniqueness ─────────────────────────────────────────────
const usedMathAnswers = new Set<string>()

function resetMathHistory() { usedMathAnswers.clear() }

function generateMathSeq(level: number, roundInLevel: number): { sequence: number[]; answer: number; rule: string } {
  const difficulty = (level - 1) * ROUNDS_PER_LEVEL + roundInLevel + 1

  const makeSeq = (): { sequence: number[]; answer: number; rule: string } => {
    const len = Math.min(4 + Math.floor(difficulty / 4), 10) // shown elements (answer is NOT in sequence)

    if (difficulty <= 5) {
      // Simple arithmetic +step
      const start = Math.floor(Math.random() * 10) + 1
      const step = Math.floor(Math.random() * 4) + 1
      const seq = Array.from({ length: len }, (_, i) => start + i * step)
      return { sequence: seq, answer: seq[len - 1] + step, rule: `+${step}` }
    }

    if (difficulty <= 10) {
      const type = Math.floor(Math.random() * 3)
      if (type === 0) {
        // Subtraction
        const step = Math.floor(Math.random() * 4) + 2
        const start = step * len + Math.floor(Math.random() * 10) + 5
        const seq = Array.from({ length: len }, (_, i) => start - i * step)
        return { sequence: seq, answer: seq[len - 1] - step, rule: `-${step}` }
      }
      if (type === 1) {
        // Alternating +a +b pattern
        const step1 = Math.floor(Math.random() * 3) + 2
        const step2 = Math.floor(Math.random() * 5) + 4
        const start = Math.floor(Math.random() * 5) + 1
        const seq: number[] = [start]
        for (let i = 1; i < len; i++) seq.push(seq[i - 1] + (i % 2 === 1 ? step1 : step2))
        const answer = seq[len - 1] + (len % 2 === 1 ? step1 : step2)
        return { sequence: seq, answer, rule: `alt+${step1},+${step2}` }
      }
      // +step1 then -step2 alternating
      const s1 = Math.floor(Math.random() * 4) + 3
      const s2 = Math.floor(Math.random() * 2) + 1
      const start = Math.floor(Math.random() * 8) + 5
      const seq: number[] = [start]
      for (let i = 1; i < len; i++) seq.push(seq[i - 1] + (i % 2 === 1 ? s1 : -s2))
      const answer = seq[len - 1] + (len % 2 === 1 ? s1 : -s2)
      return { sequence: seq, answer, rule: `+${s1},-${s2}` }
    }

    if (difficulty <= 18) {
      const type = Math.floor(Math.random() * 4)
      if (type === 0) {
        // Geometric ×mult
        const mult = difficulty <= 14 ? 2 : [2, 3][Math.floor(Math.random() * 2)]
        const start = Math.floor(Math.random() * 3) + 1
        const seqLen = Math.min(len, 6)
        const seq = Array.from({ length: seqLen }, (_, i) => start * Math.pow(mult, i))
        return { sequence: seq, answer: seq[seqLen - 1] * mult, rule: `×${mult}` }
      }
      if (type === 1) {
        // Perfect squares: 1,4,9,16,...
        const offset = Math.floor(Math.random() * 3)
        const seqLen = Math.min(len, 7)
        const seq = Array.from({ length: seqLen }, (_, i) => Math.pow(i + 1 + offset, 2))
        return { sequence: seq, answer: Math.pow(seqLen + 1 + offset, 2), rule: 'squares' }
      }
      if (type === 2) {
        // n² + n pattern: 2, 6, 12, 20, 30...
        const seqLen = Math.min(len, 7)
        const seq = Array.from({ length: seqLen }, (_, i) => (i + 1) * (i + 2))
        return { sequence: seq, answer: (seqLen + 1) * (seqLen + 2), rule: 'n(n+1)' }
      }
      // Triangular numbers: 1,3,6,10,15...
      const seqLen = Math.min(len, 7)
      const seq = Array.from({ length: seqLen }, (_, i) => ((i + 1) * (i + 2)) / 2)
      return { sequence: seq, answer: ((seqLen + 1) * (seqLen + 2)) / 2, rule: 'triangular' }
    }

    if (difficulty <= 28) {
      const type = Math.floor(Math.random() * 3)
      if (type === 0) {
        // Fibonacci-like (random seed)
        const a = Math.floor(Math.random() * 4) + 1
        const b = a + Math.floor(Math.random() * 4) + 2
        const seqLen = Math.min(len, 8)
        const sq: number[] = [a, b]
        for (let i = 2; i < seqLen; i++) sq.push(sq[i - 1] + sq[i - 2])
        return { sequence: sq, answer: sq[seqLen - 1] + sq[seqLen - 2], rule: 'fibonacci-like' }
      }
      if (type === 1) {
        // Perfect cubes
        const offset = Math.floor(Math.random() * 2)
        const seqLen = Math.min(len, 6)
        const seq = Array.from({ length: seqLen }, (_, i) => Math.pow(i + 1 + offset, 3))
        return { sequence: seq, answer: Math.pow(seqLen + 1 + offset, 3), rule: 'cubes' }
      }
      // Double then +1 pattern: 1, 3, 7, 15, 31...
      const seqLen = Math.min(len, 7)
      const seq = Array.from({ length: seqLen }, (_, i) => Math.pow(2, i + 1) - 1)
      return { sequence: seq, answer: Math.pow(2, seqLen + 1) - 1, rule: '2^n−1' }
    }

    // Very hard: primes, exponential, compound
    const type = Math.floor(Math.random() * 3)
    if (type === 0) {
      const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43]
      const start = Math.floor(Math.random() * 5)
      const seqLen = Math.min(len, 7)
      const sq = primes.slice(start, start + seqLen)
      return { sequence: sq, answer: primes[start + seqLen], rule: 'primes' }
    }
    if (type === 1) {
      const base = Math.floor(Math.random() * 2) + 2
      const seqLen = Math.min(len, 6)
      const seq = Array.from({ length: seqLen }, (_, i) => Math.pow(base, i + 1))
      return { sequence: seq, answer: Math.pow(base, seqLen + 1), rule: `${base}^n` }
    }
    // Differences of differences (quadratic): 0,1,4,9,16 → diffs 1,3,5,7 → diffs 2,2,2
    const seqLen = Math.min(len, 7)
    const seq = Array.from({ length: seqLen }, (_, i) => i * i)
    return { sequence: seq, answer: seqLen * seqLen, rule: 'quadratic' }
  }

  for (let attempt = 0; attempt < 20; attempt++) {
    const result = makeSeq()
    const sig = `${result.rule}:${result.sequence.join(',')}`
    if (!usedMathAnswers.has(sig)) {
      usedMathAnswers.add(sig)
      return result
    }
  }
  return makeSeq()
}

function mathRuleHint(rule: string): string {
  if (rule.startsWith('+') && !rule.includes(',')) return `Each number increases by ${rule.slice(1)}.`
  if (rule.startsWith('-') && !rule.includes(',')) return `Each number decreases by ${rule.slice(1)}.`
  if (rule.startsWith('×')) return `Each number is multiplied by ${rule.slice(1)}.`
  if (rule.startsWith('alt+')) {
    const parts = rule.slice(4).split(',+')
    return `Steps alternate: +${parts[0]} then +${parts[1]}, repeating.`
  }
  if (rule.match(/^\+\d+,-\d+$/)) {
    const [add, sub] = rule.split(',')
    return `Steps alternate: ${add} then ${sub}, repeating.`
  }
  const HINTS: Record<string, string> = {
    'fibonacci-like': 'Each number is the sum of the two before it.',
    'squares': 'These are perfect squares: 1², 2², 3², 4²…',
    'cubes': 'These are perfect cubes: 1³, 2³, 3³, 4³…',
    'primes': 'These are prime numbers: 2, 3, 5, 7, 11, 13…',
    'triangular': 'Triangular numbers: 1, 3, 6, 10, 15… (add 1 more each step)',
    'n(n+1)': 'Each term is n×(n+1): 1×2, 2×3, 3×4, 4×5…',
    '2^n−1': 'Double the previous number then add 1: 1, 3, 7, 15, 31…',
    'quadratic': 'Perfect squares starting from 0: 0, 1, 4, 9, 16…',
  }
  if (rule.match(/^\d+\^n$/)) return `Each number is ${rule.split('^')[0]} raised to an increasing power.`
  return HINTS[rule] ?? 'Look for a pattern in the differences between consecutive numbers.'
}

// ── SPATIAL pattern uniqueness ────────────────────────────────────────────────
const usedSpatialPatterns = new Set<string>()

function resetSpatialHistory() { usedSpatialPatterns.clear() }

function generateSpatialPattern(count: number, gridSize: number): number[] {
  for (let attempt = 0; attempt < 30; attempt++) {
    const cells = shuffle(Array.from({ length: gridSize }, (_, i) => i)).slice(0, count)
    const sig = cells.slice().sort((a, b) => a - b).join(',')
    if (!usedSpatialPatterns.has(sig)) {
      usedSpatialPatterns.add(sig)
      return cells
    }
  }
  return shuffle(Array.from({ length: gridSize }, (_, i) => i)).slice(0, count)
}

// ── COLOR sequence uniqueness ─────────────────────────────────────────────────
const usedColorSeqs = new Set<string>()

function resetColorHistory() { usedColorSeqs.clear() }

function generateColorSeq(len: number): string[] {
  for (let attempt = 0; attempt < 30; attempt++) {
    const seq = Array.from({ length: len }, () => COLORS[Math.floor(Math.random() * COLORS.length)].name)
    const sig = seq.join(',')
    if (!usedColorSeqs.has(sig)) {
      usedColorSeqs.add(sig)
      return seq
    }
  }
  return Array.from({ length: len }, () => COLORS[Math.floor(Math.random() * COLORS.length)].name)
}

// ── WORD LIST uniqueness ──────────────────────────────────────────────────────

// ── LIVE TIMER HOOK ───────────────────────────────────────────────────────────
function useLiveTimer(
  active: boolean,
  initialSeconds: number | null,
  onExpire: () => void
): [number | null, (v: number | null) => void] {
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const onExpireRef = useRef(onExpire)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => { onExpireRef.current = onExpire })

  useEffect(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    if (!active || initialSeconds === null) { setTimeLeft(null); return }

    setTimeLeft(initialSeconds)
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null) return null
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          intervalRef.current = null
          setTimeout(() => onExpireRef.current(), 0)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null } }
  }, [active, initialSeconds])

  return [timeLeft, setTimeLeft]
}

// ── Consecutive Fail Indicator ────────────────────────────────────────────────
function ConsecutiveFailBar({ count, color }: { count: number; color: string }) {
  if (count === 0) return null
  return (
    <div className="flex items-center gap-2">
      <span className="font-jost text-xs" style={{ color: 'var(--text-muted)' }}>streak</span>
      <div className="flex gap-1">
        {Array.from({ length: MAX_CONSEC }, (_, i) => (
          <motion.div key={i}
            initial={{ scale: 0.6 }} animate={{ scale: i < count ? 1 : 0.8 }}
            className="w-3 h-3 rounded-full"
            style={{ background: i < count ? '#f87171' : 'rgba(248,113,113,0.15)', border: `1.5px solid ${i < count ? '#f87171' : 'rgba(248,113,113,0.3)'}` }} />
        ))}
      </div>
      {count >= 2 && <span className="font-jost text-xs" style={{ color: '#f87171' }}>one more ends game</span>}
    </div>
  )
}

// ── Level + Round Progress Bar ────────────────────────────────────────────────
function LevelProgress({ level, roundInLevel, color }: { level: number; roundInLevel: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 w-full max-w-xs">
      <div className="flex justify-between w-full text-xs font-jost" style={{ color: 'var(--text-muted)' }}>
        <span>Level {level}</span>
        <span>Round {roundInLevel + 1} / {ROUNDS_PER_LEVEL}</span>
      </div>
      <div className="flex gap-1 w-full">
        {Array.from({ length: ROUNDS_PER_LEVEL }, (_, i) => (
          <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ background: i < roundInLevel ? color : i === roundInLevel ? `${color}80` : `${color}20` }} />
        ))}
      </div>
    </div>
  )
}

// ── Sequence Game ─────────────────────────────────────────────────────────────
function SequenceGame({
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

  // Reset uniqueness tracking on mount
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
  }, [phase, countdown])

  const startRound = useCallback((lvl: number, ril: number) => {
    const len = getSeqLen(3, lvl, ril)
    const s = gameId === 'digit' ? randSeqUnique(len) : randLetterSeqUnique(len)
    const md = getModeForRound(lvl, ril, availableModes)
    setSeq(s); setLevel(lvl); setRoundInLevel(ril); setMode(md); setShowIdx(0); setInput(''); setPhase('show')
  }, [gameId, availableModes])

  // Flash speed: levels 1-3 slow, 4-6 medium, 7+ fast
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
    setPhase('feedback')

    if (newConsecFails < MAX_CONSEC) {
      setTimeout(() => {
        if (!mountedRef.current) return
        // Advance round within level or move to next level
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

// ── Math Pattern Game ─────────────────────────────────────────────────────────
function MathGame({
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

// ── Color Pattern Game ────────────────────────────────────────────────────────
function ColorGame({
  onQuit, onComplete,
}: {
  onQuit: (rounds: ColorRound[]) => void
  onComplete: (rounds: ColorRound[]) => void
}) {
  const color = GAMES.color.color
  type P = 'countdown' | 'show' | 'input' | 'feedback'

  const [phase, setPhase] = useState<P>('countdown')
  const [countdown, setCountdown] = useState(3)
  const [level, setLevel] = useState(1)
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

  // Color length: level 1 round 0 = 3, grows each round and level
  const getColorLen = (lvl: number, ril: number) => 3 + (lvl - 1) * 2 + ril

  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown > 0) {
      const t = setTimeout(() => { if (mountedRef.current) setCountdown(c => c - 1) }, 800)
      return () => clearTimeout(t)
    }
    const s = generateColorSeq(getColorLen(1, 0))
    setSeq(s); setLevel(1); setRoundInLevel(0); setShowIdx(0); setGiven([]); setPhase('show')
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
              <div className="text-4xl mb-1" style={{ color: lastCorrect ? '#7a9e7e' : '#f87171' }}>{lastCorrect ? '✓' : '✗'}</div>
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
                <p className="font-jost text-xs tracking-widest uppercase mt-1" style={{ color }}>Level complete! Moving up →</p>
              )}
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}

// ── Spatial Game ──────────────────────────────────────────────────────────────
function SpatialGame({
  reverse, onQuit, onComplete,
}: {
  reverse?: boolean
  onQuit: (rounds: SpatialRound[]) => void
  onComplete: (rounds: SpatialRound[]) => void
}) {
  const gameId = reverse ? 'spatial_reverse' : 'spatial'
  const color = GAMES[gameId].color

  type P = 'countdown' | 'show' | 'input' | 'feedback'

  const [phase, setPhase] = useState<P>('countdown')
  const [countdown, setCountdown] = useState(3)
  const [level, setLevel] = useState(1)
  const [roundInLevel, setRoundInLevel] = useState(0)
  const [pattern, setPattern] = useState<number[]>([])
  const [showStep, setShowStep] = useState(0)
  const [lit, setLit] = useState<number[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [rounds, setRounds] = useState<SpatialRound[]>([])
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null)
  const [consecutiveFails, setConsecutiveFails] = useState(0)
  const mountedRef = useRef(true)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const lastTapRef = useRef(0)
  useEffect(() => { resetSpatialHistory() }, [])

  // Pattern count: starts at 3, grows within level and between levels
  const getPatternCount = (lvl: number, ril: number) => 3 + (lvl - 1) * 2 + ril
  // Grid size grows with level
  const getGridCols = (lvl: number) => lvl >= 8 ? 6 : lvl >= 5 ? 5 : 4
  const gridCols = getGridCols(level)
  const gridSize = gridCols * gridCols

  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown > 0) {
      const t = setTimeout(() => { if (mountedRef.current) setCountdown(c => c - 1) }, 800)
      return () => clearTimeout(t)
    }
    const count = getPatternCount(1, 0)
    const gSize = getGridCols(1) * getGridCols(1)
    const cells = generateSpatialPattern(count, gSize)
    setPattern(cells); setLevel(1); setRoundInLevel(0); setShowStep(0); setSelected([]); setLit([]); setPhase('show')
  }, [phase, countdown])

  const startRound = useCallback((lvl: number, ril: number) => {
    const cols = getGridCols(lvl)
    const gSize = cols * cols
    const count = getPatternCount(lvl, ril)
    const cells = generateSpatialPattern(count, gSize)
    setPattern(cells); setLevel(lvl); setRoundInLevel(ril); setShowStep(0); setSelected([]); setLit([]); setPhase('show')
  }, [])

  const getFlashSpeed = (lvl: number, ril: number) => ({
    showDur: Math.max(250, 650 - lvl * 50 - ril * 20),
    blankDur: Math.max(100, 380 - lvl * 30 - ril * 10),
  })

  useEffect(() => {
    if (phase !== 'show') return
    const { showDur, blankDur } = getFlashSpeed(level, roundInLevel)

    if (showStep < pattern.length) {
      setLit([pattern[showStep]])
      const t = setTimeout(() => {
        if (!mountedRef.current) return
        setLit([])
        setTimeout(() => { if (mountedRef.current) setShowStep(i => i + 1) }, blankDur)
      }, showDur)
      return () => clearTimeout(t)
    } else { setPhase('input') }
  }, [phase, showStep, pattern])

  const toggle = (idx: number) => {
    if (phase !== 'input') return
    const now = Date.now()
    if (now - lastTapRef.current < 80) return // Debounce rapid taps
    lastTapRef.current = now
    setSelected(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])
  }

  const submitSpatial = () => {
    const expected = reverse ? [...pattern].reverse() : pattern
    const correct = JSON.stringify(selected) === JSON.stringify(expected)
    const newConsecFails = correct ? 0 : consecutiveFails + 1
    setConsecutiveFails(newConsecFails)
    const round: SpatialRound = { level, correct, shown: pattern, selected, type: 'spatial' }
    setRounds(prev => {
      const newRounds = [...prev, round]
      if (newConsecFails >= MAX_CONSEC) {
        setTimeout(() => { if (mountedRef.current) onComplete(newRounds) }, 1600)
      }
      return newRounds
    })
    setLastCorrect(correct)
    setPhase('feedback')
    if (newConsecFails < MAX_CONSEC) {
      const delay = correct ? 1400 : 2800
      setTimeout(() => {
        if (!mountedRef.current) return
        const nextRil = correct ? (roundInLevel + 1 >= ROUNDS_PER_LEVEL ? 0 : roundInLevel + 1) : roundInLevel
        const nextLvl = correct && roundInLevel + 1 >= ROUNDS_PER_LEVEL ? level + 1 : level
        startRound(nextLvl, nextRil)
      }, delay)
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
        <motion.div key={`scd-${countdown}`} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-3 py-8">
          <div className="w-28 h-28 rounded-3xl flex items-center justify-center font-display font-light" style={{ fontSize: '3.5rem', color, background: `${color}10`, border: `2px solid ${color}30` }}>
            {countdown > 0 ? countdown : 'Go'}
          </div>
        </motion.div>
      )}

      {phase !== 'countdown' && (
        <>
          <p className="font-jost text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
            {pattern.length} cells · {gridCols}×{gridCols} grid · {phase === 'show' ? 'Watch the pattern' : phase === 'input' ? (reverse ? 'Tap in REVERSE order' : 'Tap the cells in order') : ''}
          </p>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)`, width: 'min(320px, 80vw)' }}>
            {Array.from({ length: gridSize }, (_, i) => {
              const isLit = lit.includes(i)
              const isSelected = selected.includes(i)
              const isCorrectTarget = pattern.includes(i)
              const isWrongTap = phase === 'feedback' && isSelected && !isCorrectTarget

              const selIdx = selected.indexOf(i)
              return (
                <motion.button key={i} onClick={() => toggle(i)} whileTap={{ scale: 0.92 }}
                  className="rounded-xl aspect-square transition-all duration-200 relative"
                  style={{
                    background: isLit ? color : (phase === 'feedback' && isCorrectTarget) ? SAGE : isWrongTap ? '#f87171' : isSelected ? `${color}28` : 'rgba(212,175,55,0.04)',
                    border: isLit ? `2px solid ${color}` : (phase === 'feedback' && isCorrectTarget) ? `2px solid ${SAGE}` : isSelected ? `2px solid ${isWrongTap ? '#f87171' : color}70` : '2px solid rgba(212,175,55,0.12)',
                    boxShadow: isLit ? `0 0 20px ${color}50` : (phase === 'feedback' && isCorrectTarget) ? `0 0 15px ${SAGE}40` : 'none',
                  }}>
                  {isSelected && selIdx >= 0 && (
                    <span className="absolute inset-0 flex items-center justify-center font-jost text-xs font-bold" style={{ color: isWrongTap ? '#fff' : (phase === 'feedback' && isCorrectTarget) ? '#fff' : color }}>
                      {selIdx + 1}
                    </span>
                  )}
                </motion.button>
              )
            })}
          </div>
          {phase === 'feedback' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center">
              <div className="text-4xl mb-1" style={{ color: lastCorrect ? SAGE : '#f87171' }}>{lastCorrect ? '✓' : '✗'}</div>
              <p className="font-jost text-xs tracking-widest uppercase" style={{ color: lastCorrect ? SAGE : 'var(--text-muted)' }}>
                {lastCorrect ? 'Correct!' : 'Incorrect sequence'}
              </p>
              {lastCorrect && roundInLevel + 1 >= ROUNDS_PER_LEVEL && (
                <p className="font-jost text-xs tracking-widest uppercase mt-1" style={{ color }}>Level complete! Moving up →</p>
              )}
            </motion.div>
          )}
          {phase === 'input' && (
            <motion.button onClick={submitSpatial} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} disabled={selected.length < pattern.length}
              className="px-8 py-3 rounded-xl font-jost text-sm tracking-widest uppercase disabled:opacity-30"
              style={{ background: `${color}18`, border: `1px solid ${color}38`, color: 'var(--text-primary)' }}>
              Confirm ({selected.length}/{pattern.length})
            </motion.button>
          )}
        </>
      )}
    </div>
  )
}

// ── Word Game ─────────────────────────────────────────────────────────────────
function WordGame({
  onQuit, onComplete,
}: {
  onQuit: (rounds: WordRound[]) => void
  onComplete: (rounds: WordRound[]) => void
}) {
  const color = GAMES.word.color
  type P = 'countdown' | 'show' | 'input' | 'feedback'

  const [phase, setPhase] = useState<P>('countdown')
  const [countdown, setCountdown] = useState(3)
  const [level, setLevel] = useState(1)
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
    setCumulativeList([list[0]])
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
    // Strict recall: must match exactly the list length (penalizes extra/wrong words)
    const pass = filteredRecalled.length === cumulativeList.length && recalled.length === cumulativeList.length
    const score = filteredRecalled.length
    const newConsecFails = pass ? 0 : consecutiveFails + 1
    setConsecutiveFails(newConsecFails)
    const round: WordRound = { level, correct: pass, words: [...cumulativeList], recalled, type: 'word' }
    const newRounds = [...rounds, round]
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
                  {recalled ? '✓' : '✗'} {w}
                </span>
              )
            })}
            {(rounds[rounds.length - 1] as WordRound)?.recalled
              .filter(w => !cumulativeList.map(x => x.toLowerCase()).includes(w.toLowerCase()))
              .map((w, i) => (
                <span key={`extra-${i}`} className="px-3 py-1.5 rounded-xl font-jost text-xs tracking-wide"
                  style={{ background: '#f8717118', border: '1px solid #f8717144', color: '#f87171' }}>
                  ⚠ {w}
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
async function generateMemorySummary(gameId: GameId, stats: Record<string, number | string>, rounds: AnyRound[]): Promise<string> {

  const game = (GAMES as any)[gameId]
  return generateGptSummary(gameId, game.title, game.psych, stats, rounds, 'memory')
}

function ResultScreen({ gameId, rounds, onRetake, onBack }: {
  gameId: GameId; rounds: AnyRound[]; onRetake: () => void; onBack: () => void
}) {
  const game = isPuzzleId(gameId) ? (PUZZLE_GAMES as any)[gameId] : (GAMES as any)[gameId]
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(true)

  const stats = (() => {
    const correct = rounds.filter(r => r.correct).length
    const maxLevel = Math.max(...rounds.map(r => r.level), 0)
    const total = rounds.length
    const accuracy = total ? `${Math.round((correct / total) * 100)}%` : '0%'
    const levelsCompleted = Math.floor(total / ROUNDS_PER_LEVEL)

    if (gameId === 'digit' || gameId === 'letter') {
      const sr = rounds as SeqRound[]
      const maxFwd = Math.max(...sr.filter(r => r.mode === 'forward' && r.correct).map(r => r.sequence.length), 0)
      const maxRev = Math.max(...sr.filter(r => r.mode === 'reverse' && r.correct).map(r => r.sequence.length), 0)
      const modesUsed = Array.from(new Set(sr.map(r => r.mode))).join(', ')
      return {
        'Rounds played': total, 'Accuracy': accuracy,
        'Levels completed': levelsCompleted, 'Peak level': maxLevel,
        'Peak forward span': maxFwd || '-',
        ...(maxRev > 0 ? { 'Peak reverse span': maxRev } : {}),
        'Modes practiced': modesUsed || 'forward',
      }
    }
    if (gameId === 'math') {
      return { 'Rounds played': total, 'Accuracy': accuracy, 'Levels completed': levelsCompleted, 'Peak level': maxLevel }
    }
    if (gameId === 'color') {
      const cr = rounds as ColorRound[]
      const maxLen = Math.max(...cr.map(r => r.sequence.length), 0)
      return { 'Rounds played': total, 'Accuracy': accuracy, 'Levels completed': levelsCompleted, 'Longest sequence': maxLen }
    }
    if (gameId === 'spatial' || gameId === 'spatial_reverse') {
      const sr = rounds as SpatialRound[]
      const maxPattern = Math.max(...sr.map(r => r.shown.length), 0)
      return { 'Rounds played': total, 'Accuracy': accuracy, 'Levels completed': levelsCompleted, 'Max pattern length': maxPattern }
    }
    if (gameId === 'word') {
      const wr = rounds as WordRound[]
      const totalShown = wr.reduce((s, r) => s + r.words.length, 0)
      const totalRecalled = wr.reduce((s, r) => s + r.recalled.filter(w => r.words.includes(w)).length, 0)
      const pct = totalShown ? Math.round(totalRecalled / totalShown * 100) : 0
      return { 'Rounds played': total, 'Levels completed': levelsCompleted, 'Words shown': totalShown, 'Recall accuracy': `${pct}%` }
    }
    return { 'Rounds played': total, 'Accuracy': accuracy, 'Levels completed': levelsCompleted, 'Peak level': maxLevel }
  })()

  const savedRef = useRef(false)
  useEffect(() => {
    if (savedRef.current) return
    savedRef.current = true
    const numStats: Record<string, number | string> = { ...stats }
    generateMemorySummary(gameId, numStats, rounds as AnyRound[]).then(s => {
      setSummary(s)
      setLoading(false)
      saveMemoryResult(gameId, numStats, rounds, s)
    }).catch(() => {
      setLoading(false)
      saveMemoryResult(gameId, numStats, rounds)
    })
  }, [])

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="glass-strong rounded-2xl p-7" style={{ border: `1px solid ${game.color}28` }}>
      <div className="text-center mb-6">
        <div className="text-4xl mb-2" style={{ color: game.color, filter: `drop-shadow(0 0 8px ${game.color}50)` }}>{game.icon}</div>
        <h2 className="font-gothic text-xl mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '0.08em' }}>{game.title}</h2>
        <p className="font-display italic text-sm" style={{ color: 'var(--text-muted)', fontWeight: 300 }}>{game.psych}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        {Object.entries(stats).map(([label, value]) => (
          <div key={label} className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
            <p className="font-jost text-xs tracking-wide uppercase mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
            <p className="font-display font-light text-2xl" style={{ color: game.color }}>{value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl p-5 mb-5" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
        <p className="font-jost text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Your Cognitive Reflection</p>
        {loading ? (
          <div className="flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
            <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${game.color} transparent transparent transparent` }} />
            <span className="font-body text-sm">Writing your reflection...</span>
          </div>
        ) : (
          <p className="font-body text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-primary)' }}>
            {summary || 'Your results have been saved to your dashboard.'}
          </p>
        )}
      </div>
      <div className="rounded-xl p-4 mb-5" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
        <p className="font-jost text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Round by Round</p>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {rounds.map((r, i) => {
            const ril = i % ROUNDS_PER_LEVEL
            const lvl = Math.floor(i / ROUNDS_PER_LEVEL) + 1
            const extra = (() => {
              if ('mode' in r) return ` · ${r.mode}`
              if ('sequence' in r && Array.isArray((r as ColorRound).sequence)) return ` · ${(r as ColorRound).sequence.length} colors`
              if ('words' in r) return ` · ${(r as WordRound).words.length} words`
              if ('shown' in r) return ` · ${(r as SpatialRound).shown.length} cells`
              return ''
            })()
            return (
              <div key={i} className="flex justify-between items-center text-xs font-jost py-1 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Lv{lvl} R{ril + 1}{extra}</span>
                <span style={{ color: r.correct ? '#7a9e7e' : '#f87171' }}>{r.correct ? '✓' : '✗'}</span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex gap-3 justify-center flex-wrap">
        <motion.button onClick={onBack} whileHover={{ scale: 1.02 }}
          className="px-6 py-3 rounded-xl font-jost text-sm tracking-widest uppercase glass"
          style={{ border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>All Games</motion.button>
        <motion.button onClick={onRetake} whileHover={{ scale: 1.02 }}
          className="px-6 py-3 rounded-xl font-jost text-sm tracking-widest uppercase"
          style={{ background: `${game.color}18`, border: `1px solid ${game.color}38`, color: 'var(--text-primary)' }}>Play Again</motion.button>
      </div>
    </motion.div>
  )
}


type Fill = 'full' | 'half' | 'empty' | 'dots'
type ShapeType = 'circle' | 'square' | 'triangle' | 'diamond' | 'pentagon' | 'cross' | 'star' | 'hexagon'

interface ShapeProps {
  type: ShapeType
  fill: Fill
  size?: number
  color?: string
  rotate?: number
  strokeWidth?: number
}

function Shape({ type, fill, size = 40, color = GOLD, rotate = 0, strokeWidth = 2 }: ShapeProps) {
  const c = size / 2
  const r = size * 0.38

  const fillColor = fill === 'full' ? color : fill === 'half' ? color : 'none'
  const fillOpacity = fill === 'full' ? 1 : fill === 'half' ? 0.45 : 0
  const dotsPattern = fill === 'dots'

  const paths: Record<ShapeType, string> = {
    circle: '',
    square: `M${c - r},${c - r} h${r * 2} v${r * 2} h${-r * 2}Z`,
    triangle: `M${c},${c - r} L${c + r * 0.9},${c + r * 0.7} L${c - r * 0.9},${c + r * 0.7}Z`,
    diamond: `M${c},${c - r} L${c + r * 0.7},${c} L${c},${c + r} L${c - r * 0.7},${c}Z`,
    pentagon: (() => {
      const pts = Array.from({ length: 5 }, (_, i) => {
        const a = (i * 72 - 90) * Math.PI / 180
        return `${c + r * Math.cos(a)},${c + r * Math.sin(a)}`
      })
      return `M${pts[0]} L${pts.slice(1).join(' L')}Z`
    })(),
    cross: `M${c - r * 0.28},${c - r} h${r * 0.56} v${r * 0.72} h${r * 0.72} v${r * 0.56} h${-r * 0.72} v${r * 0.72} h${-r * 0.56} v${-r * 0.72} h${-r * 0.72} v${-r * 0.56} h${r * 0.72}Z`,
    star: (() => {
      const pts = Array.from({ length: 10 }, (_, i) => {
        const a = (i * 36 - 90) * Math.PI / 180
        const rad = i % 2 === 0 ? r : r * 0.45
        return `${c + rad * Math.cos(a)},${c + rad * Math.sin(a)}`
      })
      return `M${pts[0]} L${pts.slice(1).join(' L')}Z`
    })(),
    hexagon: (() => {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (i * 60 - 30) * Math.PI / 180
        return `${c + r * Math.cos(a)},${c + r * Math.sin(a)}`
      })
      return `M${pts[0]} L${pts.slice(1).join(' L')}Z`
    })(),
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ transform: `rotate(${rotate}deg)`, display: 'block', flexShrink: 0 }}>
      {dotsPattern && (
        <defs>
          <pattern id={`dots-${color.replace('#', '')}`} x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.2" fill={color} />
          </pattern>
        </defs>
      )}
      {type === 'circle' ? (
        <circle cx={c} cy={c} r={r}
          fill={dotsPattern ? `url(#dots-${color.replace('#', '')})` : fillColor}
          fillOpacity={dotsPattern ? 1 : fillOpacity}
          stroke={color} strokeWidth={strokeWidth} />
      ) : (
        <path d={paths[type]}
          fill={dotsPattern ? `url(#dots-${color.replace('#', '')})` : fillColor}
          fillOpacity={dotsPattern ? 1 : fillOpacity}
          stroke={color} strokeWidth={strokeWidth} />
      )}
      {fill === 'half' && type !== 'circle' && (
        <line x1={c} y1={c - r} x2={c} y2={c + r} stroke={color} strokeWidth={strokeWidth * 0.7} opacity={0.4} />
      )}
    </svg>
  )
}

function ShapeCell({ children, size = 56, highlighted = false, selected = false, correctAnswer = false, onClick, color = GOLD }:
  { children: React.ReactNode; size?: number; highlighted?: boolean; selected?: boolean; correctAnswer?: boolean; onClick?: () => void; color?: string }) {
  return (
    <motion.div
      onClick={onClick}
      whileTap={onClick ? { scale: 0.93 } : undefined}
      className="flex items-center justify-center rounded-xl transition-all"
      style={{
        width: size, height: size,
        background: correctAnswer ? '#7a9e7e22' : selected ? `${color}22` : highlighted ? `${color}10` : 'var(--bg-glass)',
        border: correctAnswer ? `2px solid #7a9e7e` : selected ? `2px solid ${color}80` : `1.5px solid ${color}28`,
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: correctAnswer ? `0 0 18px #7a9e7e50` : selected ? `0 0 12px ${color}30` : 'none',
      }}>
      {children}
    </motion.div>
  )
}

// ── PUZZLE GAMES (Matrix, OddOneOut, Series, Analogy, PaperFold) ──────────────
// These now also track round-in-level (5 rounds each) and get genuinely harder

// ── Puzzle round tracking helper ──────────────────────────────────────────────
interface PuzzleState {
  level: number
  roundInLevel: number
}

function nextPuzzleState({ level, roundInLevel }: PuzzleState, correct: boolean): PuzzleState {
  if (!correct) return { level, roundInLevel }
  const nextRil = roundInLevel + 1 >= ROUNDS_PER_LEVEL ? 0 : roundInLevel + 1
  const nextLvl = roundInLevel + 1 >= ROUNDS_PER_LEVEL ? level + 1 : level
  return { level: nextLvl, roundInLevel: nextRil }
}

// ── Matrix Reasoning ──────────────────────────────────────────────────────────
type MatrixCell = { type: ShapeType; fill: Fill; rotate?: number; color?: string } | null

interface MatrixPuzzle {
  grid: MatrixCell[][]
  choices: MatrixCell[]
  answerIdx: number
  rule: string
}

const SHAPE_TYPES: ShapeType[] = ['circle', 'square', 'triangle', 'diamond', 'pentagon', 'hexagon', 'cross', 'star']
const FILLS: Fill[] = ['empty', 'half', 'full']

// Track used matrix signatures
const usedMatrixSigs = new Set<string>()
function resetMatrixHistory() { usedMatrixSigs.clear() }

// Difficulty increases: level 3 = 4x4, level 6 = 5x5. Missing cell randomized at level 5.
function generateMatrix(level: number, roundInLevel: number): MatrixPuzzle {
  const rng = Math.random
  const di = (level - 1) * ROUNDS_PER_LEVEL + roundInLevel

  const gridSize = di >= 25 ? 5 : di >= 10 ? 4 : 3
  const missingPos = di >= 20 ? Math.floor(rng() * (gridSize * gridSize)) : (gridSize * gridSize - 1)
  const missingR = Math.floor(missingPos / gridSize)
  const missingC = missingPos % gridSize

  const rules = [
    // Rule 0: Fill rotation per Row (Classic)
    () => {
      const type = SHAPE_TYPES[Math.floor(rng() * SHAPE_TYPES.length)]
      const grid: MatrixCell[][] = Array.from({ length: gridSize }, (_, r) =>
        Array.from({ length: gridSize }, (_, c) => ({
          type,
          fill: FILLS[(r + c) % FILLS.length],
          color: GOLD,
        }))
      )
      const answer = grid[missingR][missingC]!
      grid[missingR][missingC] = null
      const wrongs = shuffle(FILLS.filter(f => f !== answer.fill).map(f => ({ type, fill: f, color: GOLD }))).slice(0, 3)
      const choices = shuffle([answer, ...wrongs])
      return { grid, choices, answerIdx: choices.indexOf(answer) ?? 0, rule: 'Fill style rotates periodically across rows and columns' }
    },
    // Rule 1: Shape column + color row (Coordinate)
    () => {
      const colShapes = shuffle([...SHAPE_TYPES]).slice(0, gridSize)
      const rowColors = [GOLD, MUTED, SAGE, STEEL, WARM].slice(0, gridSize)
      const grid: MatrixCell[][] = Array.from({ length: gridSize }, (_, r) =>
        Array.from({ length: gridSize }, (_, c) => ({
          type: colShapes[c % colShapes.length],
          fill: 'empty' as Fill,
          color: rowColors[r % rowColors.length],
        }))
      )
      const answer = grid[missingR][missingC]!
      grid[missingR][missingC] = null
      const wrongs = shuffle([
        { type: colShapes[0], fill: 'empty' as Fill, color: rowColors[0] },
        { type: colShapes[1 % gridSize], fill: 'empty' as Fill, color: rowColors[1 % gridSize] },
        { type: colShapes[missingC], fill: 'full' as Fill, color: rowColors[missingR] },
      ].filter(w => !(w.type === answer.type && w.color === answer.color && w.fill === answer.fill))).slice(0, 3)
      const choices = shuffle([answer, ...wrongs])
      return { grid, choices, answerIdx: choices.indexOf(answer) ?? 0, rule: 'Shape indicates column; color indicates row' }
    },
    // Rule 2: Shape rotation progression
    () => {
      const type = SHAPE_TYPES.filter(s => s !== 'circle')[Math.floor(rng() * (SHAPE_TYPES.length - 1))]
      const step = (Math.floor(rng() * 2) + 1) * 45
      const grid: MatrixCell[][] = Array.from({ length: gridSize }, (_, r) =>
        Array.from({ length: gridSize }, (_, c) => ({
          type,
          fill: 'empty' as Fill,
          rotate: (r * gridSize + c) * step,
          color: GOLD,
        }))
      )
      const answer = grid[missingR][missingC]!
      grid[missingR][missingC] = null
      const wrongs = [45, 90, 180].map(deg => ({ type, fill: 'empty' as Fill, rotate: (answer.rotate || 0) + deg, color: GOLD })).slice(0, 3)
      const choices = shuffle([answer, ...wrongs])
      return { grid, choices, answerIdx: choices.indexOf(answer) ?? 0, rule: 'Each cell rotates by a fixed increment from the last' }
    },
  ]

  const ruleIdx = Math.floor(rng() * rules.length)
  for (let attempt = 0; attempt < 10; attempt++) {
    const res = rules[ruleIdx]()
    const sig = `${res.rule}:${gridSize}:${missingPos}:${JSON.stringify(res.choices)}`
    if (!usedMatrixSigs.has(sig)) { usedMatrixSigs.add(sig); return res }
  }
  return rules[ruleIdx]()
}

function MatrixGame({ onQuit, onComplete }: {
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

// ── Odd One Out ───────────────────────────────────────────────────────────────
interface OddPuzzle {
  shapes: Array<{ type: ShapeType; fill: Fill; color?: string; rotate?: number; size?: number }>
  oddIdx: number
  rule: string
}

const usedOddSigs = new Set<string>()
function resetOddHistory() { usedOddSigs.clear() }

function generateOdd(level: number, roundInLevel: number): OddPuzzle {
  const rng = Math.random
  const di = (level - 1) * ROUNDS_PER_LEVEL + roundInLevel

  const rules = [
    // Rule 0: shape difference (easiest)
    () => {
      const base = SHAPE_TYPES[Math.floor(rng() * SHAPE_TYPES.length)]
      const odd = SHAPE_TYPES.filter(s => s !== base)[Math.floor(rng() * (SHAPE_TYPES.length - 1))]
      const fill: Fill = FILLS[Math.floor(rng() * FILLS.length)]
      const oddIdx = Math.floor(rng() * 5)
      return { shapes: Array.from({ length: 5 }, (_, i) => ({ type: i === oddIdx ? odd : base, fill, color: GOLD })), oddIdx, rule: `Four share the same shape` }
    },
    // Rule 1: fill difference
    () => {
      const baseFill: Fill = FILLS[Math.floor(rng() * FILLS.length)]
      const oddFill: Fill = FILLS.filter(f => f !== baseFill)[Math.floor(rng() * (FILLS.length - 1))]
      const shape = SHAPE_TYPES[Math.floor(rng() * SHAPE_TYPES.length)]
      const oddIdx = Math.floor(rng() * 5)
      return { shapes: Array.from({ length: 5 }, (_, i) => ({ type: shape, fill: i === oddIdx ? oddFill : baseFill, color: GOLD })), oddIdx, rule: `Four share the same fill style` }
    },
    // Rule 2: size difference
    () => {
      const baseSize = 36; const oddSize = rng() > 0.5 ? 20 : 54
      const shape = SHAPE_TYPES[Math.floor(rng() * SHAPE_TYPES.length)]
      const oddIdx = Math.floor(rng() * 5)
      const shapes = Array.from({ length: 5 }, (_, i) => ({ type: shape, fill: 'empty' as Fill, size: i === oddIdx ? oddSize : baseSize, color: GOLD }))
      return { shapes, oddIdx, rule: `One shape is significantly different in size` }
    },
    // Rule 3: rotation difference
    () => {
      const shape = SHAPE_TYPES.filter(s => s !== 'circle' && s !== 'hexagon')[Math.floor(rng() * (SHAPE_TYPES.length - 2))]
      const baseRot = [0, 45, 90, 135][Math.floor(rng() * 4)]
      const oddRot = [0, 45, 90, 135, 180].filter(r => r !== baseRot)[Math.floor(rng() * 4)]
      const oddIdx = Math.floor(rng() * 5)
      const shapes = Array.from({ length: 5 }, (_, i) => ({ type: shape, fill: 'empty' as Fill, rotate: i === oddIdx ? oddRot : baseRot, color: GOLD }))
      return { shapes, oddIdx, rule: `Four share the same orientation` }
    },
    // Rule 4: color difference (harder - all different shapes, same color except one)
    () => {
      const colors = [GOLD, MUTED, SAGE, STEEL, WARM]
      const baseColor = colors[Math.floor(rng() * colors.length)]
      const oddColor = colors.filter(c => c !== baseColor)[Math.floor(rng() * (colors.length - 1))]
      const oddIdx = Math.floor(rng() * 5)
      const shapeList = shuffle([...SHAPE_TYPES]).slice(0, 5)
      const shapes = shapeList.map((type, i) => ({ type, fill: 'full' as Fill, color: i === oddIdx ? oddColor : baseColor }))
      return { shapes, oddIdx, rule: `Four share the same color` }
    },
    // Rule 5: compound (shape + fill mismatch - very hard)
    () => {
      const baseShape = SHAPE_TYPES[Math.floor(rng() * SHAPE_TYPES.length)]
      const baseFill: Fill = FILLS[Math.floor(rng() * FILLS.length)]
      const oddShape = SHAPE_TYPES.filter(s => s !== baseShape)[Math.floor(rng() * (SHAPE_TYPES.length - 1))]
      const oddFill: Fill = FILLS.filter(f => f !== baseFill)[Math.floor(rng() * (FILLS.length - 1))]
      const oddIdx = Math.floor(rng() * 5)
      const shapes = Array.from({ length: 5 }, (_, i) => ({
        type: i === oddIdx ? oddShape : baseShape,
        fill: i === oddIdx ? oddFill : baseFill,
        color: GOLD,
      }))
      return { shapes, oddIdx, rule: `The odd one differs in both shape and fill` }
    },
  ]

  const availableRuleCount = di < 5 ? 2 : di < 12 ? 3 : di < 20 ? 4 : di < 30 ? 5 : 6
  const ruleIdx = Math.floor(rng() * availableRuleCount)

  for (let attempt = 0; attempt < 10; attempt++) {
    const result = rules[ruleIdx]()
    const sig = `${result.rule}:${result.oddIdx}:${result.shapes.map(s => s.type + s.fill).join('-')}`
    if (!usedOddSigs.has(sig)) {
      usedOddSigs.add(sig)
      return result
    }
  }
  return rules[ruleIdx]()
}

function OddOneOutGame({ onQuit, onComplete }: {
  onQuit: (rounds: BaseRound[]) => void
  onComplete: (rounds: BaseRound[]) => void
}) {
  const color = MUTED
  const [ps, setPs] = useState<PuzzleState>({ level: 1, roundInLevel: 0 })
  const [puzzle, setPuzzle] = useState<OddPuzzle>(() => generateOdd(1, 0))
  const [selected, setSelected] = useState<number | null>(null)
  const [phase, setPhase] = useState<'play' | 'feedback'>('play')
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null)
  const [rounds, setRounds] = useState<BaseRound[]>([])
  const [consecutiveFails, setConsecutiveFails] = useState(0)
  const mountedRef = useRef(true)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])
  useEffect(() => { resetOddHistory() }, [])

  const next = useCallback((newPs: PuzzleState) => {
    setPuzzle(generateOdd(newPs.level, newPs.roundInLevel))
    setSelected(null); setPhase('play')
  }, [])

  const submit = (idx: number) => {
    if (phase !== 'play') return
    setSelected(idx)
    const correct = idx === puzzle.oddIdx && puzzle.oddIdx !== -1
    const newConsecFails = correct ? 0 : consecutiveFails + 1
    setConsecutiveFails(newConsecFails)
    const newRounds = [...rounds, { level: ps.level, correct }]
    setRounds(newRounds); setLastCorrect(correct); setPhase('feedback')
    if (newConsecFails >= MAX_CONSEC) {
      setTimeout(() => { if (mountedRef.current) onComplete(newRounds) }, 1600)
    } else {
      const newPs = nextPuzzleState(ps, correct)
      setTimeout(() => {
        if (!mountedRef.current) return
        setPs(newPs); next(newPs)
      }, 1400)
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
      <p className="font-jost text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Which one doesn't belong?</p>
      <div className="flex gap-3 flex-wrap justify-center px-4">
        {puzzle.shapes.map((shape, i) => (
          <motion.div key={i} whileTap={{ scale: 0.9 }}
            onClick={phase === 'play' ? () => submit(i) : undefined}
            className="flex items-center justify-center rounded-xl transition-all cursor-pointer relative"
            style={{
              width: 80, height: 80, overflow: 'visible',
              background: (phase === 'feedback' && !lastCorrect && i === puzzle.oddIdx)
                ? '#7a9e7e22'
                : selected === i ? (lastCorrect ? `${SAGE}20` : '#f8717120') : `${color}10`,
              border: (phase === 'feedback' && !lastCorrect && i === puzzle.oddIdx)
                ? `2px solid ${SAGE}`
                : selected === i ? `2px solid ${lastCorrect ? SAGE : '#f87171'}` : `1.5px solid ${color}28`,
              boxShadow: (phase === 'feedback' && !lastCorrect && i === puzzle.oddIdx)
                ? `0 0 18px ${SAGE}50`
                : selected === i ? `0 0 14px ${selected === i && lastCorrect ? SAGE : '#f87171'}40` : 'none',
            }}>
            <Shape type={shape.type} fill={shape.fill} size={shape.size || 42} color={shape.color || color} rotate={shape.rotate || 0} />
            {shape.size && (
              <div className="absolute -bottom-1 right-1 opacity-20 group-hover:opacity-100 transition-opacity">
                <div className="w-1 h-3 bg-white/20 rounded-full" />
              </div>
            )}
          </motion.div>
        ))}
      </div>
      {phase === 'feedback' && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-center flex flex-col items-center gap-1">
          <div className="text-3xl mb-1" style={{ color: lastCorrect ? SAGE : '#f87171' }}>{lastCorrect ? '✓' : '✗'}</div>
          {!lastCorrect && <p className="font-body text-[11px]" style={{ color: 'var(--text-muted)' }}>Logic: {puzzle.rule}</p>}
          {lastCorrect && ps.roundInLevel + 1 >= ROUNDS_PER_LEVEL && (
            <p className="font-jost text-[10px] tracking-widest uppercase" style={{ color }}>Level complete! →</p>
          )}
        </motion.div>
      )}
    </div>
  )
}

// ── Series Completion ─────────────────────────────────────────────────────────
interface SeriesPuzzle {
  sequence: Array<{ type: ShapeType; fill: Fill; rotate?: number; color?: string }>
  choices: Array<{ type: ShapeType; fill: Fill; rotate?: number; color?: string }>
  answerIdx: number
  rule: string
}

const usedSeriesSigs = new Set<string>()
function resetSeriesHistory() { usedSeriesSigs.clear() }

function generateSeries(level: number, roundInLevel: number): SeriesPuzzle {
  const rng = Math.random
  const di = (level - 1) * ROUNDS_PER_LEVEL + roundInLevel

  const makeDeceptiveWrongs = (answer: any, sequence: any[]) => {
    const wrongs = [
      { ...answer, fill: answer.fill === 'full' ? 'empty' : (answer.fill === 'empty' ? 'full' : 'half') },
      { ...answer, rotate: (answer.rotate || 0) + 45 },
      { ...answer, type: SHAPE_TYPES.find(s => s !== answer.type) },
    ].filter(w => !isSameShape(w, answer))
    return shuffle(wrongs).slice(0, 3)
  }

  // Tier 1: Single Attribute Cycles (Lv 1-2)
  const tier1 = () => {
    const shape = SHAPE_TYPES[Math.floor(rng() * SHAPE_TYPES.length)]
    const fillCycle: Fill[] = ['empty', 'half', 'full']
    const start = Math.floor(rng() * 3)
    const sequence = Array.from({ length: 5 }, (_, i) => ({ type: shape, fill: fillCycle[(start + i) % 3], color: STEEL }))
    const answer = { type: shape, fill: fillCycle[(start + 5) % 3], color: STEEL }
    const choices = shuffle([answer, ...makeDeceptiveWrongs(answer, sequence)])
    return { sequence, choices, answerIdx: choices.findIndex(c => isSameShape(c, answer)), rule: 'Fill pattern cycles (Empty-Half-Full)' }
  }

  // Tier 2: Arithmetic Rotation (Lv 3-4)
  const tier2 = () => {
    const type = SHAPE_TYPES.filter(s => s !== 'circle')[Math.floor(rng() * (SHAPE_TYPES.length - 1))]
    const step = (Math.floor(rng() * 2) + 1) * 45
    const sequence = Array.from({ length: 5 }, (_, i) => ({ type, fill: 'empty' as Fill, rotate: i * step, color: STEEL }))
    const answer = { type, fill: 'empty' as Fill, rotate: 5 * step, color: STEEL }
    const choices = shuffle([answer, ...makeDeceptiveWrongs(answer, sequence)])
    return { sequence, choices, answerIdx: choices.findIndex(c => isSameShape(c, answer)), rule: `Shape rotates ${step}° each step` }
  }

  // Tier 3: Interleaved Dual Sequences (Lv 5+)
  const tier3 = () => {
    const [s1, s2] = shuffle([...SHAPE_TYPES]).slice(0, 2)
    const sequence = Array.from({ length: 5 }, (_, i) => ({
      type: i % 2 === 0 ? s1 : s2,
      fill: i % 2 === 0 ? 'full' : 'empty' as Fill,
      color: i % 2 === 0 ? SAGE : GOLD,
      rotate: i % 2 === 0 ? 0 : 45,
    }))
    const answer = {
      type: 5 % 2 === 0 ? s1 : s2,
      fill: 5 % 2 === 0 ? 'full' : 'empty' as Fill,
      color: 5 % 2 === 0 ? SAGE : GOLD,
      rotate: 5 % 2 === 0 ? 0 : 45,
    }
    const choices = shuffle([answer, ...makeDeceptiveWrongs(answer, sequence)])
    return { sequence, choices, answerIdx: choices.findIndex(c => isSameShape(c, answer)), rule: 'Interleaved patterns: two distinct sequences merging' }
  }

  // Tier 4: Progressive Compound (Lv 8+)
  const tier4 = () => {
    const shape = SHAPE_TYPES[Math.floor(rng() * SHAPE_TYPES.length)]
    const sequence = Array.from({ length: 5 }, (_, i) => ({
      type: shape,
      fill: i < 2 ? 'empty' : (i < 4 ? 'half' : 'full') as Fill,
      rotate: i * 90,
      color: STEEL,
    }))
    const answer = { type: shape, fill: 'full' as Fill, rotate: 5 * 90, color: STEEL }
    const choices = shuffle([answer, ...makeDeceptiveWrongs(answer, sequence)])
    return { sequence, choices, answerIdx: choices.findIndex(c => isSameShape(c, answer)), rule: 'Compound: fill stays for 2 rounds while rotation constant' }
  }

  const rules = [tier1, tier2, tier3, tier4]
  const envRuleIdx = di < 5 ? 0 : di < 12 ? 1 : di < 22 ? 2 : 3
  
  for (let attempt = 0; attempt < 15; attempt++) {
    const res = rules[envRuleIdx]()
    if (res.answerIdx !== -1) {
      const sig = `${res.rule}:${res.sequence.map(s => s.type + s.fill).join('-')}`
      if (!usedSeriesSigs.has(sig)) { usedSeriesSigs.add(sig); return res }
    }
  }
  return rules[envRuleIdx]()
}

function SeriesGame({ onQuit, onComplete }: {
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

// ── Visual Analogy ────────────────────────────────────────────────────────────
interface AnalogyPuzzle {
  a: { type: ShapeType; fill: Fill; rotate?: number; color?: string }
  b: { type: ShapeType; fill: Fill; rotate?: number; color?: string }
  c: { type: ShapeType; fill: Fill; rotate?: number; color?: string }
  choices: Array<{ type: ShapeType; fill: Fill; rotate?: number; color?: string }>
  answerIdx: number
  rule: string
}



const usedAnalogySigs = new Set<string>()
function resetAnalogyHistory() { usedAnalogySigs.clear() }

function dedupeChoices(answer: any, choices: any[]) {
  const seen = new Set()
  seen.add(JSON.stringify(answer))
  return choices.filter(c => {
    const s = JSON.stringify(c)
    if (seen.has(s)) return false
    seen.add(s)
    return true
  })
}

function generateAnalogy(level: number, roundInLevel: number): AnalogyPuzzle {
  const rng = Math.random
  const di = (level - 1) * ROUNDS_PER_LEVEL + roundInLevel

  const makeChoices = (answer: any, wrongs: any[]) => {
    const deduped = dedupeChoices(answer, wrongs).slice(0, 3)
    const all = [answer, ...deduped]
    const shuffled = shuffle(all)
    return { choices: shuffled, answerIdx: shuffled.indexOf(answer) }
  }

  const ALL_SHAPES: ShapeType[] = ['circle', 'square', 'triangle', 'diamond', 'pentagon', 'cross', 'star', 'hexagon']
  const PAIR_COLORS = [GOLD, MUTED, SAGE, STEEL, WARM]

  // Pick two distinct shapes for A and C
  const pickShapes = () => {
    const sA = ALL_SHAPES[Math.floor(rng() * ALL_SHAPES.length)]
    const sC = ALL_SHAPES.filter(s => s !== sA)[Math.floor(rng() * (ALL_SHAPES.length - 1))]
    return [sA, sC] as [ShapeType, ShapeType]
  }

  const rules = [
    // Rule 0: empty → full (fill transform)
    () => {
      const [sA, sC] = pickShapes()
      const col = PAIR_COLORS[Math.floor(rng() * PAIR_COLORS.length)]
      const a = { type: sA, fill: 'empty' as Fill, color: col }
      const b = { type: sA, fill: 'full' as Fill, color: col }
      const c = { type: sC, fill: 'empty' as Fill, color: col }
      const answer = { type: sC, fill: 'full' as Fill, color: col }
      const wrongs = [
        { type: sC, fill: 'half' as Fill, color: col },
        { type: sA, fill: 'full' as Fill, color: col },
        { type: sC, fill: 'empty' as Fill, color: MUTED },
      ]
      const { choices, answerIdx } = makeChoices(answer, wrongs)
      return { a, b, c, choices, answerIdx, rule: 'Empty → full fill' }
    },
    // Rule 1: full → empty (opposite direction)
    () => {
      const [sA, sC] = pickShapes()
      const col = PAIR_COLORS[Math.floor(rng() * PAIR_COLORS.length)]
      const a = { type: sA, fill: 'full' as Fill, color: col }
      const b = { type: sA, fill: 'empty' as Fill, color: col }
      const c = { type: sC, fill: 'full' as Fill, color: col }
      const answer = { type: sC, fill: 'empty' as Fill, color: col }
      const wrongs = [
        { type: sC, fill: 'half' as Fill, color: col },
        { type: sA, fill: 'empty' as Fill, color: col },
        { type: sC, fill: 'full' as Fill, color: SAGE },
      ]
      const { choices, answerIdx } = makeChoices(answer, wrongs)
      return { a, b, c, choices, answerIdx, rule: 'Full → empty fill' }
    },
    // Rule 2: fill → half
    () => {
      const [sA, sC] = pickShapes()
      const col = PAIR_COLORS[Math.floor(rng() * PAIR_COLORS.length)]
      const srcFill: Fill = rng() > 0.5 ? 'empty' : 'full'
      const a = { type: sA, fill: srcFill, color: col }
      const b = { type: sA, fill: 'half' as Fill, color: col }
      const c = { type: sC, fill: srcFill, color: col }
      const answer = { type: sC, fill: 'half' as Fill, color: col }
      const otherFill: Fill = srcFill === 'empty' ? 'full' : 'empty'
      const wrongs = [
        { type: sC, fill: otherFill, color: col },
        { type: sA, fill: 'half' as Fill, color: col },
        { type: sC, fill: 'half' as Fill, color: STEEL },
      ]
      const { choices, answerIdx } = makeChoices(answer, wrongs)
      return { a, b, c, choices, answerIdx, rule: `${srcFill} → half fill` }
    },
    // Rule 3: rotation transform
    () => {
      const nonSymmetric = ALL_SHAPES.filter(s => s !== 'circle' && s !== 'star')
      const sA = nonSymmetric[Math.floor(rng() * nonSymmetric.length)]
      const sC = nonSymmetric.filter(s => s !== sA)[Math.floor(rng() * (nonSymmetric.length - 1))]
      const rot = [45, 90, 135, 180][Math.floor(rng() * 4)]
      const col = PAIR_COLORS[Math.floor(rng() * PAIR_COLORS.length)]
      const fill: Fill = ['empty', 'half', 'full'][Math.floor(rng() * 3)] as Fill
      const a = { type: sA, fill, rotate: 0, color: col }
      const b = { type: sA, fill, rotate: rot, color: col }
      const c = { type: sC, fill, rotate: 0, color: col }
      const answer = { type: sC, fill, rotate: rot, color: col }
      const altRot = [45, 90, 135, 180].filter(r => r !== rot)[Math.floor(rng() * 3)]
      const wrongs = [
        { type: sC, fill, rotate: 0, color: col },
        { type: sA, fill, rotate: rot, color: col },
        { type: sC, fill, rotate: altRot, color: col },
      ]
      const { choices, answerIdx } = makeChoices(answer, wrongs)
      return { a, b, c, choices, answerIdx, rule: `Shape rotates ${rot}°` }
    },
    // Rule 4: color transform
    () => {
      const [sA, sC] = pickShapes()
      const colA = PAIR_COLORS[Math.floor(rng() * PAIR_COLORS.length)]
      const colB = PAIR_COLORS.filter(c => c !== colA)[Math.floor(rng() * (PAIR_COLORS.length - 1))]
      const fill: Fill = ['empty', 'full'][Math.floor(rng() * 2)] as Fill
      const a = { type: sA, fill, color: colA }
      const b = { type: sA, fill, color: colB }
      const c = { type: sC, fill, color: colA }
      const answer = { type: sC, fill, color: colB }
      const colC = PAIR_COLORS.filter(c => c !== colA && c !== colB)[Math.floor(rng() * 3)]
      const wrongs = [
        { type: sC, fill, color: colA },
        { type: sA, fill, color: colB },
        { type: sC, fill, color: colC },
      ]
      const { choices, answerIdx } = makeChoices(answer, wrongs)
      return { a, b, c, choices, answerIdx, rule: 'Color transforms the same way' }
    },
    // Rule 5: fill + color compound
    () => {
      const [sA, sC] = pickShapes()
      const colA = PAIR_COLORS[Math.floor(rng() * PAIR_COLORS.length)]
      const colB = PAIR_COLORS.filter(c => c !== colA)[Math.floor(rng() * (PAIR_COLORS.length - 1))]
      const fillA: Fill = 'empty'
      const fillB: Fill = 'full'
      const a = { type: sA, fill: fillA, color: colA }
      const b = { type: sA, fill: fillB, color: colB }
      const c = { type: sC, fill: fillA, color: colA }
      const answer = { type: sC, fill: fillB, color: colB }
      const wrongs = [
        { type: sC, fill: fillB, color: colA },   // wrong color
        { type: sC, fill: fillA, color: colB },   // wrong fill
        { type: sA, fill: fillB, color: colB },   // wrong shape
      ]
      const { choices, answerIdx } = makeChoices(answer, wrongs)
      return { a, b, c, choices, answerIdx, rule: 'Fill and color both change together' }
    },
    // Rule 6: rotation + color compound
    () => {
      const nonSym = ALL_SHAPES.filter(s => s !== 'circle')
      const sA = nonSym[Math.floor(rng() * nonSym.length)]
      const sC = nonSym.filter(s => s !== sA)[Math.floor(rng() * (nonSym.length - 1))]
      const rot = [90, 180][Math.floor(rng() * 2)]
      const colA = PAIR_COLORS[Math.floor(rng() * PAIR_COLORS.length)]
      const colB = PAIR_COLORS.filter(c => c !== colA)[Math.floor(rng() * (PAIR_COLORS.length - 1))]
      const fill: Fill = ['empty', 'half'][Math.floor(rng() * 2)] as Fill
      const a = { type: sA, fill, rotate: 0, color: colA }
      const b = { type: sA, fill, rotate: rot, color: colB }
      const c = { type: sC, fill, rotate: 0, color: colA }
      const answer = { type: sC, fill, rotate: rot, color: colB }
      const wrongs = [
        { type: sC, fill, rotate: rot, color: colA },   // wrong color
        { type: sC, fill, rotate: 0, color: colB },     // wrong rotation
        { type: sA, fill, rotate: rot, color: colB },   // wrong shape
      ]
      const { choices, answerIdx } = makeChoices(answer, wrongs)
      return { a, b, c, choices, answerIdx, rule: 'Rotation and color both transform' }
    },
    // Rule 7: fill + rotation + color (triple compound - very hard)
    () => {
      const nonSym = ALL_SHAPES.filter(s => s !== 'circle')
      const sA = nonSym[Math.floor(rng() * nonSym.length)]
      const sC = nonSym.filter(s => s !== sA)[Math.floor(rng() * (nonSym.length - 1))]
      const rot = [90, 135, 180][Math.floor(rng() * 3)]
      const colA = PAIR_COLORS[Math.floor(rng() * PAIR_COLORS.length)]
      const colB = PAIR_COLORS.filter(c => c !== colA)[Math.floor(rng() * (PAIR_COLORS.length - 1))]
      const fillA: Fill = 'empty'
      const fillB: Fill = 'full'
      const a = { type: sA, fill: fillA, rotate: 0, color: colA }
      const b = { type: sA, fill: fillB, rotate: rot, color: colB }
      const c = { type: sC, fill: fillA, rotate: 0, color: colA }
      const answer = { type: sC, fill: fillB, rotate: rot, color: colB }
      const wrongs = [
        { type: sC, fill: fillB, rotate: 0, color: colB },       // wrong rotation
        { type: sC, fill: fillA, rotate: rot, color: colB },     // wrong fill
        { type: sC, fill: fillB, rotate: rot, color: colA },     // wrong color
      ]
      const { choices, answerIdx } = makeChoices(answer, wrongs)
      return { a, b, c, choices, answerIdx, rule: 'Fill, rotation, and color all transform' }
    },
    // Rule 8: shape swap (harder - shape itself changes in a systematic way)
    () => {
      const col = PAIR_COLORS[Math.floor(rng() * PAIR_COLORS.length)]
      const fill: Fill = ['empty', 'half', 'full'][Math.floor(rng() * 3)] as Fill
      // A→B: round shape → pointy shape; C→? same transform
      const roundShapes: ShapeType[] = ['circle', 'hexagon']
      const pointyShapes: ShapeType[] = ['triangle', 'star', 'diamond']
      const squareShapes: ShapeType[] = ['square', 'cross', 'pentagon']
      const fromGroup = [roundShapes, pointyShapes, squareShapes][Math.floor(rng() * 3)]
      const toGroup = [roundShapes, pointyShapes, squareShapes].filter(g => g !== fromGroup)[Math.floor(rng() * 2)]
      const sA = fromGroup[Math.floor(rng() * fromGroup.length)]
      const sB = toGroup[Math.floor(rng() * toGroup.length)]
      const sC = fromGroup.filter(s => s !== sA)[Math.floor(rng() * Math.max(1, fromGroup.length - 1))] || fromGroup[0]
      const answer = { type: sB, fill, color: col }
      const wrongShape1 = ALL_SHAPES.filter(s => s !== sB && !toGroup.includes(s))[Math.floor(rng() * 3)] || 'square'
      const wrongs = [
        { type: sA, fill, color: col },
        { type: sC, fill, color: col },
        { type: wrongShape1 as ShapeType, fill, color: col },
      ]
      const { choices, answerIdx } = makeChoices(answer, wrongs)
      return { a: { type: sA, fill, color: col }, b: { type: sB, fill, color: col }, c: { type: sC, fill, color: col }, choices, answerIdx, rule: 'Shape category transforms' }
    },
    // Rule 9: fill negation + rotation (very hard compound)
    () => {
      const nonSym = ALL_SHAPES.filter(s => s !== 'circle' && s !== 'hexagon')
      const sA = nonSym[Math.floor(rng() * nonSym.length)]
      const sC = nonSym.filter(s => s !== sA)[Math.floor(rng() * (nonSym.length - 1))]
      const colA = PAIR_COLORS[Math.floor(rng() * PAIR_COLORS.length)]
      const colB = PAIR_COLORS.filter(c => c !== colA)[Math.floor(rng() * (PAIR_COLORS.length - 1))]
      // Fill inverts: empty↔full, half stays half→full
      const fillPairs: [Fill, Fill][] = [['empty', 'full'], ['full', 'empty'], ['half', 'full']]
      const [fillA, fillB] = fillPairs[Math.floor(rng() * fillPairs.length)]
      const rot = [45, 90, 180][Math.floor(rng() * 3)]
      const a = { type: sA, fill: fillA, rotate: 0, color: colA }
      const b = { type: sA, fill: fillB, rotate: rot, color: colB }
      const c = { type: sC, fill: fillA, rotate: 0, color: colA }
      const answer = { type: sC, fill: fillB, rotate: rot, color: colB }
      const wrongs = [
        { type: sC, fill: fillA, rotate: rot, color: colB },
        { type: sC, fill: fillB, rotate: 0, color: colA },
        { type: sA, fill: fillB, rotate: rot, color: colB },
      ]
      const { choices, answerIdx } = makeChoices(answer, wrongs)
      return { a, b, c, choices, answerIdx, rule: 'Fill inverts and shape rotates while color changes' }
    },
  ]

  // Unlock more rules as difficulty increases
  const availableRuleCount = di < 3 ? 2 : di < 8 ? 3 : di < 15 ? 5 : di < 22 ? 7 : di < 30 ? 9 : 10
  const ruleIdx = Math.floor(rng() * Math.min(availableRuleCount, rules.length))

  for (let attempt = 0; attempt < 15; attempt++) {
    const r = Math.floor(rng() * Math.min(availableRuleCount, rules.length))
    const puzzle = rules[r]()
    const sig = `${puzzle.rule}:${puzzle.a.type}→${puzzle.b.type}::${puzzle.c.type}→${puzzle.choices[puzzle.answerIdx]?.type}`
    if (!usedAnalogySigs.has(sig)) {
      usedAnalogySigs.add(sig)
      return puzzle
    }
  }
  return rules[ruleIdx]()
}

function AnalogyGame({ onQuit, onComplete }: {
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

// ── Paper Folding ─────────────────────────────────────────────────────────────
interface FoldPuzzle {
  folds: Array<{ axis: 'h' | 'v'; dir: 'top' | 'bottom' | 'left' | 'right' }>
  holePos: { x: number; y: number }
  answerIdx: number
  choices: Array<Array<{ x: number; y: number }>>
}

function PaperFoldSVG({ size = 120, dots, highlighted = false, color = GOLD2 }:
  { size?: number; dots: Array<{ x: number; y: number }>; highlighted?: boolean; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect x="5" y="5" width="90" height="90" rx="4"
        fill={highlighted ? `${color}14` : 'rgba(212,175,55,0.06)'}
        stroke={color} strokeWidth={highlighted ? 2 : 1.5} strokeOpacity={0.5} />
      <line x1="50" y1="5" x2="50" y2="95" stroke={color} strokeWidth={0.5} strokeOpacity={0.2} strokeDasharray="3,3" />
      <line x1="5" y1="50" x2="95" y2="50" stroke={color} strokeWidth={0.5} strokeOpacity={0.2} strokeDasharray="3,3" />
      {dots.map((dot, i) => (
        <circle key={i} cx={5 + dot.x * 90} cy={5 + dot.y * 90} r="7"
          fill={color} fillOpacity={0.85} stroke={color} strokeWidth={1.5} />
      ))}
    </svg>
  )
}

function FoldedPaperSVG({ folds, holeDot, color = GOLD2 }:
  { folds: Array<{ axis: 'h' | 'v'; dir: string }>; holeDot: { x: number; y: number }; color?: string }) {
  return (
    <svg width="200" height="120" viewBox="-10 0 220 110">
      {folds.map((fold, fi) => {
        const x = fi * 90 + 5
        return (
          <g key={fi}>
            <rect x={x} y={5} width={70} height={70} rx={3}
              fill={`${color}08`} stroke={color} strokeWidth={1.5} strokeOpacity={0.5} />
            {fold.axis === 'v' ? (
              <>
                <line x1={x + 35} y1={5} x2={x + 35} y2={75} stroke={color} strokeWidth={2} strokeOpacity={0.6} strokeDasharray="4,2" />
                <rect x={fold.dir === 'left' ? x : x + 35} y={5} width={35} height={70} rx={2}
                  fill={`${color}18`} stroke={color} strokeWidth={1.5} strokeOpacity={0.7} />
              </>
            ) : (
              <>
                <line x1={x} y1={40} x2={x + 70} y2={40} stroke={color} strokeWidth={2} strokeOpacity={0.6} strokeDasharray="4,2" />
                <rect x={x} y={fold.dir === 'top' ? 5 : 40} width={70} height={35} rx={2}
                  fill={`${color}18`} stroke={color} strokeWidth={1.5} strokeOpacity={0.7} />
              </>
            )}
            <text x={x + 35} y={90} textAnchor="middle" fill={color} fillOpacity={0.5} fontSize="8" fontFamily="serif">
              fold {fi + 1}
            </text>
            {fi < folds.length - 1 && (
              <text x={x + 78} y={42} fill={color} fillOpacity={0.6} fontSize="16">→</text>
            )}
          </g>
        )
      })}
      <g transform={`translate(${folds.length * 90 + 5}, 0)`}>
        <rect x={0} y={5} width={70} height={70} rx={3}
          fill={`${color}08`} stroke={color} strokeWidth={1.5} strokeOpacity={0.5} />
        <circle cx={holeDot.x * 70} cy={5 + holeDot.y * 70} r={6} fill={color} fillOpacity={0.9} />
        <text x={35} y={90} textAnchor="middle" fill={color} fillOpacity={0.5} fontSize="8" fontFamily="serif">punch</text>
      </g>
    </svg>
  )
}

const usedFoldSigs = new Set<string>()
function resetFoldHistory() { usedFoldSigs.clear() }

function generateFold(level: number, roundInLevel: number): FoldPuzzle {
  const rng = Math.random
  // More folds = harder. level 1-2: 1 fold; level 3-5: 1-2 folds; level 6+: 2 folds
  const numFolds = level <= 2 ? 1 : level <= 4 ? (roundInLevel >= 3 ? 2 : 1) : 2

  const folds: FoldPuzzle['folds'] = Array.from({ length: numFolds }, () => {
    const axis = rng() > 0.5 ? 'v' : 'h'
    const dir: 'top' | 'bottom' | 'left' | 'right' = axis === 'v'
      ? (rng() > 0.5 ? 'left' : 'right')
      : (rng() > 0.5 ? 'top' : 'bottom')
    return { axis, dir }
  })

  // Hole position: higher levels push hole closer to fold line (harder)
  const margin = Math.max(0.1, 0.3 - (level - 1) * 0.03 - roundInLevel * 0.01)
  const hx = margin + rng() * (1 - 2 * margin)
  const hy = margin + rng() * (1 - 2 * margin)

  // Compute mirror dots based on folds
  let dots: { x: number; y: number }[] = [{ x: hx, y: hy }]

  for (const fold of folds) {
    const newDots: { x: number; y: number }[] = [...dots]
    for (const dot of dots) {
      if (fold.axis === 'v') {
        newDots.push({ x: 1 - dot.x, y: dot.y })
      } else {
        newDots.push({ x: dot.x, y: 1 - dot.y })
      }
    }
    dots = newDots
  }

  // Remove duplicates
  const unique = dots.filter((d, i, arr) =>
    arr.findIndex(x => Math.abs(x.x - d.x) < 0.01 && Math.abs(x.y - d.y) < 0.01) === i
  )

  const answer = unique
  const wrongs = [
    [{ x: hx, y: hy }],
    unique.slice(0, 1),
    unique.map(d => ({ x: 1 - d.x, y: d.y })),
    [{ x: rng() * 0.4 + 0.1, y: rng() * 0.4 + 0.1 }, { x: rng() * 0.4 + 0.5, y: rng() * 0.4 + 0.1 }],
  ].filter(w => JSON.stringify(w) !== JSON.stringify(answer))

  const choices = shuffle([answer, ...wrongs.slice(0, 3)])

  for (let attempt = 0; attempt < 10; attempt++) {
    const sig = `${folds.map(f => f.axis + f.dir).join('-')}:${Math.round(hx * 10)}:${Math.round(hy * 10)}`
    if (!usedFoldSigs.has(sig)) {
      usedFoldSigs.add(sig)
      return { folds, holePos: { x: hx, y: hy }, answerIdx: choices.indexOf(answer), choices }
    }
  }
  return { folds, holePos: { x: hx, y: hy }, answerIdx: choices.indexOf(answer), choices }
}

function PaperFoldGame({ onQuit, onComplete }: {
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
          <div className="text-3xl" style={{ color: lastCorrect ? SAGE : '#f87171' }}>{lastCorrect ? '✓' : '✗'}</div>
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

// ── Puzzle result + registry ──────────────────────────────────────────────────

async function generatePuzzleSummary(gameId: string, stats: Record<string, number | string>, rounds?: BaseRound[]): Promise<string> {
  const game = PUZZLE_GAMES[gameId as PuzzleGameId]
  return generateGptSummary(gameId, game.title, game.psych, stats, rounds || [], 'puzzle')
}

function PuzzleResultScreen({ gameId, rounds, onRetake, onBack }: {
  gameId: PuzzleGameId; rounds: BaseRound[]; onRetake: () => void; onBack: () => void
}) {
  const game = PUZZLE_GAMES[gameId]
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(true)

  const correct = rounds.filter(r => r.correct).length
  const total = rounds.length
  const maxLevel = Math.max(...rounds.map(r => r.level), 0)
  const accuracy = total ? `${Math.round((correct / total) * 100)}%` : '0%'
  const levelsCompleted = Math.floor(total / ROUNDS_PER_LEVEL)
  const stats = { 'Rounds played': total, 'Accuracy': accuracy, 'Levels completed': levelsCompleted, 'Max level reached': maxLevel, 'Correct answers': correct }

  const savedRef = useRef(false)
  useEffect(() => {
    if (savedRef.current) return
    savedRef.current = true
    const numStats: Record<string, number | string> = { ...stats }
    generateGptSummary(gameId, game.title, game.psych, stats as Record<string, any>, rounds, 'puzzle').then(s => {
      setSummary(s); setLoading(false)
      saveMemoryResult(gameId, stats, rounds, s)
    }).catch(() => { setLoading(false); saveMemoryResult(gameId, stats, rounds) })
  }, [])

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className="glass-strong rounded-2xl p-7" style={{ border: `1px solid ${game.color}28` }}>
      <div className="text-center mb-6">
        <div className="text-4xl mb-2" style={{ color: game.color, filter: `drop-shadow(0 0 8px ${game.color}50)` }}>{game.icon}</div>
        <h2 className="font-gothic text-xl mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '0.08em' }}>{game.title}</h2>
        <p className="font-display italic text-sm" style={{ color: 'var(--text-muted)', fontWeight: 300 }}>{game.psych}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        {Object.entries(stats).map(([label, value]) => (
          <div key={label} className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
            <p className="font-jost text-xs tracking-wide uppercase mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
            <p className="font-display font-light text-2xl" style={{ color: game.color }}>{value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl p-5 mb-5" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
        <p className="font-jost text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Your Cognitive Reflection</p>
        {loading ? (
          <div className="flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
            <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${game.color} transparent transparent transparent` }} />
            <span className="font-body text-sm">Writing your reflection...</span>
          </div>
        ) : (
          <p className="font-body text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
            {summary || 'Your results have been saved to your dashboard.'}
          </p>
        )}
      </div>
      <div className="rounded-xl p-4 mb-5" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
        <p className="font-jost text-xs tracking-widest uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Round by Round</p>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {rounds.map((r, i) => {
            const ril = i % ROUNDS_PER_LEVEL
            const lvl = Math.floor(i / ROUNDS_PER_LEVEL) + 1
            return (
              <div key={i} className="flex justify-between items-center text-xs font-jost py-1 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Lv{lvl} R{ril + 1}</span>
                <span style={{ color: r.correct ? '#7a9e7e' : '#f87171' }}>{r.correct ? '✓' : '✗'}</span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex gap-3 justify-center flex-wrap">
        <motion.button onClick={onBack} whileHover={{ scale: 1.02 }}
          className="px-6 py-3 rounded-xl font-jost text-sm tracking-widest uppercase glass"
          style={{ border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>All Games</motion.button>
        <motion.button onClick={onRetake} whileHover={{ scale: 1.02 }}
          className="px-6 py-3 rounded-xl font-jost text-sm tracking-widest uppercase"
          style={{ background: `${game.color}18`, border: `1px solid ${game.color}38`, color: 'var(--text-primary)' }}>Play Again</motion.button>
      </div>
    </motion.div>
  )
}


// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MemoryPage() {
  const [phase, setPhase] = useState<GamePhase>('selector')
  const [selected, setSelected] = useState<GameId | null>(null)
  const [rounds, setRounds] = useState<AnyRound[]>([])
  const [puzzleSelected, setPuzzleSelected] = useState<PuzzleGameId | null>(null)
  const [puzzleRounds, setPuzzleRounds] = useState<BaseRound[]>([])

  const selectGame = (id: GameId) => { setSelected(id); setPhase('intro') }
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
    { label: 'Sequence Memory', ids: ['digit', 'letter', 'math'] as GameId[] },
    { label: 'Visual Memory', ids: ['color', 'spatial', 'spatial_reverse'] as GameId[] },
    { label: 'Verbal Memory', ids: ['word'] as GameId[] },
  ]

  return (
    <main className="bg-screening min-h-screen relative overflow-hidden">
      <ParticleCanvas colors={['#d4af37', '#c9897a', '#c4913a', '#b8860b']} count={22} />
      <Navigation />
      <div className="relative z-10 pt-24 pb-20 px-5 max-w-3xl mx-auto">

        <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="font-display font-light mb-3" style={{ fontSize: 'clamp(2.5rem,6vw,5rem)', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Memory <span className="font-display italic" style={{ fontWeight: 300 }}>Games</span>
          </h1>
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
                      onClick={() => { setPuzzleSelected(g.id); setPhase('puzzle-intro') }}
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
              <button onClick={back} className="mb-6 text-sm font-jost tracking-widest uppercase opacity-55 hover:opacity-100 transition-opacity" style={{ color: 'var(--text-primary)' }}>← Back</button>
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
                  Begin Game
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
            <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ResultScreen gameId={selected} rounds={rounds} onRetake={retake} onBack={back} />
            </motion.div>
          )}

          {phase === 'puzzle-intro' && puzzleSelected && (
            <motion.div key="puzzle-intro" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
              <button onClick={back} className="mb-6 text-sm font-jost tracking-widest uppercase opacity-55 hover:opacity-100 transition-opacity" style={{ color: 'var(--text-primary)' }}>← Back</button>
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
    </main>
  )
}