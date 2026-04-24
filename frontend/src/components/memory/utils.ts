import { GameId, SeqMode } from './types'
import { ROUNDS_PER_LEVEL, LETTERS, COLORS, WORD_BANK } from './constants'

// ── Utility Functions ─────────────────────────────────────────────────────────

export function getToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
}

export function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  return fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  })
}

export const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5)

export function isSameShape(s1: unknown, s2: unknown): boolean {
  if (!s1 || !s2) return false
  const a = s1 as { type?: string; fill?: string; rotate?: number; color?: string }
  const b = s2 as { type?: string; fill?: string; rotate?: number; color?: string }
  return a.type === b.type && a.fill === b.fill && (a.rotate || 0) === (b.rotate || 0) && a.color === b.color
}

// ── Timer Logic ───────────────────────────────────────────────────────────────
// Easy levels (1-3): short time (pressure to think fast on simple things)
// Mid levels (4-6): medium time
// Hard levels (7-9): longer time (complex questions need thinking time)
// Very hard (10+): NO timer at all (pure cognition, no pressure)
export function getTimeLimit(gameId: GameId, level: number, roundInLevel: number, itemCount?: number): number | null {
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

// ── Sequence Generation with no-repeat guarantee ─────────────────────────────
const usedSeqSignatures = new Set<string>()
const usedLetterSignatures = new Set<string>()
const usedMathAnswers = new Set<string>()

export function resetSeqHistory() {
  usedSeqSignatures.clear()
  usedLetterSignatures.clear()
}

export function resetMathHistory() {
  usedMathAnswers.clear()
}

export function randSeqUnique(len: number, maxAttempts = 40): number[] {
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

export function randLetterSeqUnique(len: number, maxAttempts = 40): string[] {
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

// Mode difficulty ranking: forward < reverse < ascending/descending < odd/even
export function getModeForRound(level: number, roundInLevel: number, availableModes: SeqMode[]): SeqMode {
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
export function getSeqLen(baseLen: number, level: number, roundInLevel: number): number {
  // base for level: baseLen + (level-1)*1
  // within level: each round adds 1 digit
  return baseLen + (level - 1) + roundInLevel
}

export function applyMode(seq: number[], mode: SeqMode): number[] {
  switch (mode) {
    case 'reverse': return [...seq].reverse()
    case 'ascending': return [...seq].sort((a, b) => a - b)
    case 'descending': return [...seq].sort((a, b) => b - a)
    case 'odd_only': return seq.filter(n => n % 2 !== 0)
    case 'even_only': return seq.filter(n => n % 2 === 0)
    default: return seq
  }
}

export function applyLetterMode(seq: string[], mode: 'forward' | 'reverse' | 'ascending' | 'descending'): string[] {
  switch (mode) {
    case 'reverse': return [...seq].reverse()
    case 'ascending': return [...seq].sort()
    case 'descending': return [...seq].sort().reverse()
    default: return seq
  }
}

// ── Math Sequence with uniqueness ───────────────────────────────────────────

export function generateMathSeq(level: number, roundInLevel: number): { sequence: number[]; answer: number; rule: string } {
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

export function mathRuleHint(rule: string): string {
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

// Color/Word helpers
export function getRandomColors(count: number): Array<{ name: string; hex: string; text: string }> {
  const shuffled = shuffle([...COLORS])
  return shuffled.slice(0, count)
}

export function getRandomWords(count: number): string[] {
  const shuffled = shuffle([...WORD_BANK])
  return shuffled.slice(0, count)
}