import { LETTERS, ROUNDS_PER_LEVEL, SeqMode } from '../../types'

const usedSeqSignatures = new Set<string>()
const usedLetterSignatures = new Set<string>()

export function randSeqUnique(len: number, maxAttempts = 40): number[] {
  for (let i = 0; i < maxAttempts; i++) {
    const seq = Array.from({ length: len }, () => Math.floor(Math.random() * 9) + 1)
    const sig = seq.join(',')
    if (!usedSeqSignatures.has(sig)) {
      usedSeqSignatures.add(sig)
      return seq
    }
  }
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

export function resetSeqHistory() {
  usedSeqSignatures.clear()
  usedLetterSignatures.clear()
}

// Mode difficulty ranking: forward < reverse < ascending/descending < odd/even
export function getModeForRound(level: number, roundInLevel: number, availableModes: SeqMode[]): SeqMode {
  if (availableModes.length === 0) return 'forward'
  const modeProgression: SeqMode[] = ['forward', 'forward', 'reverse', 'ascending', 'descending', 'odd_only', 'even_only']
  const filtered = modeProgression.filter(m => availableModes.includes(m))

  const globalIdx = (level - 1) * ROUNDS_PER_LEVEL + roundInLevel
  const modeUnlockThreshold = [0, 5, 10, 16, 22, 30, 40]
  let modeIdx = 0
  for (let i = modeUnlockThreshold.length - 1; i >= 0; i--) {
    if (globalIdx >= modeUnlockThreshold[i] && filtered[i] !== undefined) {
      modeIdx = i
      break
    }
  }
  return filtered[Math.min(modeIdx, filtered.length - 1)]
}

export function getSeqLen(baseLen: number, level: number, roundInLevel: number): number {
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
