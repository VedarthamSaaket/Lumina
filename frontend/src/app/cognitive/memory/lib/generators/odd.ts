import { Fill, FILLS, GOLD, MUTED, OddPuzzle, ROUNDS_PER_LEVEL, SAGE, SHAPE_TYPES, STEEL, WARM } from '../../types'
import { shuffle } from '../utils'

const usedOddSigs = new Set<string>()
export function resetOddHistory() { usedOddSigs.clear() }

export function generateOdd(level: number, roundInLevel: number): OddPuzzle {
  const rng = Math.random
  const di = (level - 1) * ROUNDS_PER_LEVEL + roundInLevel

  const rules = [
    () => {
      const base = SHAPE_TYPES[Math.floor(rng() * SHAPE_TYPES.length)]
      const odd = SHAPE_TYPES.filter(s => s !== base)[Math.floor(rng() * (SHAPE_TYPES.length - 1))]
      const fill: Fill = FILLS[Math.floor(rng() * FILLS.length)]
      const oddIdx = Math.floor(rng() * 5)
      return { shapes: Array.from({ length: 5 }, (_, i) => ({ type: i === oddIdx ? odd : base, fill, color: GOLD })), oddIdx, rule: `Four share the same shape` }
    },
    () => {
      const baseFill: Fill = FILLS[Math.floor(rng() * FILLS.length)]
      const oddFill: Fill = FILLS.filter(f => f !== baseFill)[Math.floor(rng() * (FILLS.length - 1))]
      const shape = SHAPE_TYPES[Math.floor(rng() * SHAPE_TYPES.length)]
      const oddIdx = Math.floor(rng() * 5)
      return { shapes: Array.from({ length: 5 }, (_, i) => ({ type: shape, fill: i === oddIdx ? oddFill : baseFill, color: GOLD })), oddIdx, rule: `Four share the same fill style` }
    },
    () => {
      const baseSize = 36; const oddSize = rng() > 0.5 ? 20 : 54
      const shape = SHAPE_TYPES[Math.floor(rng() * SHAPE_TYPES.length)]
      const oddIdx = Math.floor(rng() * 5)
      const shapes = Array.from({ length: 5 }, (_, i) => ({ type: shape, fill: 'empty' as Fill, size: i === oddIdx ? oddSize : baseSize, color: GOLD }))
      return { shapes, oddIdx, rule: `One shape is significantly different in size` }
    },
    () => {
      const shape = SHAPE_TYPES.filter(s => s !== 'circle' && s !== 'hexagon')[Math.floor(rng() * (SHAPE_TYPES.length - 2))]
      const baseRot = [0, 45, 90, 135][Math.floor(rng() * 4)]
      const oddRot = [0, 45, 90, 135, 180].filter(r => r !== baseRot)[Math.floor(rng() * 4)]
      const oddIdx = Math.floor(rng() * 5)
      const shapes = Array.from({ length: 5 }, (_, i) => ({ type: shape, fill: 'empty' as Fill, rotate: i === oddIdx ? oddRot : baseRot, color: GOLD }))
      return { shapes, oddIdx, rule: `Four share the same orientation` }
    },
    () => {
      const colors = [GOLD, MUTED, SAGE, STEEL, WARM]
      const baseColor = colors[Math.floor(rng() * colors.length)]
      const oddColor = colors.filter(c => c !== baseColor)[Math.floor(rng() * (colors.length - 1))]
      const oddIdx = Math.floor(rng() * 5)
      const shapeList = shuffle([...SHAPE_TYPES]).slice(0, 5)
      const shapes = shapeList.map((type, i) => ({ type, fill: 'full' as Fill, color: i === oddIdx ? oddColor : baseColor }))
      return { shapes, oddIdx, rule: `Four share the same color` }
    },
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
