import { ROUNDS_PER_LEVEL } from '../../types'

const usedMathAnswers = new Set<string>()

export function resetMathHistory() { usedMathAnswers.clear() }

export function generateMathSeq(level: number, roundInLevel: number): { sequence: number[]; answer: number; rule: string } {
  const difficulty = (level - 1) * ROUNDS_PER_LEVEL + roundInLevel + 1

  const makeSeq = (): { sequence: number[]; answer: number; rule: string } => {
    const len = Math.min(4 + Math.floor(difficulty / 4), 10)

    if (difficulty <= 5) {
      const start = Math.floor(Math.random() * 10) + 1
      const step = Math.floor(Math.random() * 4) + 1
      const seq = Array.from({ length: len }, (_, i) => start + i * step)
      return { sequence: seq, answer: seq[len - 1] + step, rule: `+${step}` }
    }

    if (difficulty <= 10) {
      const type = Math.floor(Math.random() * 3)
      if (type === 0) {
        const step = Math.floor(Math.random() * 4) + 2
        const start = step * len + Math.floor(Math.random() * 10) + 5
        const seq = Array.from({ length: len }, (_, i) => start - i * step)
        return { sequence: seq, answer: seq[len - 1] - step, rule: `-${step}` }
      }
      if (type === 1) {
        const step1 = Math.floor(Math.random() * 3) + 2
        const step2 = Math.floor(Math.random() * 5) + 4
        const start = Math.floor(Math.random() * 5) + 1
        const seq: number[] = [start]
        for (let i = 1; i < len; i++) seq.push(seq[i - 1] + (i % 2 === 1 ? step1 : step2))
        const answer = seq[len - 1] + (len % 2 === 1 ? step1 : step2)
        return { sequence: seq, answer, rule: `alt+${step1},+${step2}` }
      }
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
        const mult = difficulty <= 14 ? 2 : [2, 3][Math.floor(Math.random() * 2)]
        const start = Math.floor(Math.random() * 3) + 1
        const seqLen = Math.min(len, 6)
        const seq = Array.from({ length: seqLen }, (_, i) => start * Math.pow(mult, i))
        return { sequence: seq, answer: seq[seqLen - 1] * mult, rule: `×${mult}` }
      }
      if (type === 1) {
        const offset = Math.floor(Math.random() * 3)
        const seqLen = Math.min(len, 7)
        const seq = Array.from({ length: seqLen }, (_, i) => Math.pow(i + 1 + offset, 2))
        return { sequence: seq, answer: Math.pow(seqLen + 1 + offset, 2), rule: 'squares' }
      }
      if (type === 2) {
        const seqLen = Math.min(len, 7)
        const seq = Array.from({ length: seqLen }, (_, i) => (i + 1) * (i + 2))
        return { sequence: seq, answer: (seqLen + 1) * (seqLen + 2), rule: 'n(n+1)' }
      }
      const seqLen = Math.min(len, 7)
      const seq = Array.from({ length: seqLen }, (_, i) => ((i + 1) * (i + 2)) / 2)
      return { sequence: seq, answer: ((seqLen + 1) * (seqLen + 2)) / 2, rule: 'triangular' }
    }

    if (difficulty <= 28) {
      const type = Math.floor(Math.random() * 3)
      if (type === 0) {
        const a = Math.floor(Math.random() * 4) + 1
        const b = a + Math.floor(Math.random() * 4) + 2
        const seqLen = Math.min(len, 8)
        const sq: number[] = [a, b]
        for (let i = 2; i < seqLen; i++) sq.push(sq[i - 1] + sq[i - 2])
        return { sequence: sq, answer: sq[seqLen - 1] + sq[seqLen - 2], rule: 'fibonacci-like' }
      }
      if (type === 1) {
        const offset = Math.floor(Math.random() * 2)
        const seqLen = Math.min(len, 6)
        const seq = Array.from({ length: seqLen }, (_, i) => Math.pow(i + 1 + offset, 3))
        return { sequence: seq, answer: Math.pow(seqLen + 1 + offset, 3), rule: 'cubes' }
      }
      const seqLen = Math.min(len, 7)
      const seq = Array.from({ length: seqLen }, (_, i) => Math.pow(2, i + 1) - 1)
      return { sequence: seq, answer: Math.pow(2, seqLen + 1) - 1, rule: '2^n−1' }
    }

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
