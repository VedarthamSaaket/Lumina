import { shuffle } from '../utils'

const usedSpatialPatterns = new Set<string>()

export function resetSpatialHistory() { usedSpatialPatterns.clear() }

export function generateSpatialPattern(count: number, gridSize: number): number[] {
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
