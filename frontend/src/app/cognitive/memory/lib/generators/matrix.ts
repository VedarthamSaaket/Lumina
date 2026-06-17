import { Fill, GOLD, MUTED, MatrixCell, MatrixPuzzle, ROUNDS_PER_LEVEL, SAGE, SHAPE_TYPES, STEEL, WARM, FILLS } from '../../types'
import { shuffle } from '../utils'

const usedMatrixSigs = new Set<string>()
export function resetMatrixHistory() { usedMatrixSigs.clear() }

export function generateMatrix(level: number, roundInLevel: number): MatrixPuzzle {
  const rng = Math.random
  const di = (level - 1) * ROUNDS_PER_LEVEL + roundInLevel

  const gridSize = di >= 25 ? 5 : di >= 10 ? 4 : 3
  const missingPos = di >= 20 ? Math.floor(rng() * (gridSize * gridSize)) : (gridSize * gridSize - 1)
  const missingR = Math.floor(missingPos / gridSize)
  const missingC = missingPos % gridSize

  const rules = [
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
