import { FoldPuzzle } from '../../types'
import { shuffle } from '../utils'

const usedFoldSigs = new Set<string>()
export function resetFoldHistory() { usedFoldSigs.clear() }

export function generateFold(level: number, roundInLevel: number): FoldPuzzle {
  const rng = Math.random
  const numFolds = level <= 2 ? 1 : level <= 4 ? (roundInLevel >= 3 ? 2 : 1) : 2

  const folds: FoldPuzzle['folds'] = Array.from({ length: numFolds }, () => {
    const axis = rng() > 0.5 ? 'v' : 'h'
    const dir: 'top' | 'bottom' | 'left' | 'right' = axis === 'v'
      ? (rng() > 0.5 ? 'left' : 'right')
      : (rng() > 0.5 ? 'top' : 'bottom')
    return { axis, dir }
  })

  const margin = Math.max(0.1, 0.3 - (level - 1) * 0.03 - roundInLevel * 0.01)
  const hx = margin + rng() * (1 - 2 * margin)
  const hy = margin + rng() * (1 - 2 * margin)

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
