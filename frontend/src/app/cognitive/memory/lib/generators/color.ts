import { COLORS } from '../../types'

const usedColorSeqs = new Set<string>()

export function resetColorHistory() { usedColorSeqs.clear() }

export function generateColorSeq(len: number): string[] {
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
