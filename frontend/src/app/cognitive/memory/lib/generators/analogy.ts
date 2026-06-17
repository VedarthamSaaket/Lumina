import { AnalogyPuzzle, Fill, GOLD, MUTED, ROUNDS_PER_LEVEL, SAGE, ShapeType, STEEL, WARM } from '../../types'
import { shuffle } from '../utils'

const usedAnalogySigs = new Set<string>()
export function resetAnalogyHistory() { usedAnalogySigs.clear() }

export function dedupeChoices(answer: any, choices: any[]) {
  const seen = new Set()
  seen.add(JSON.stringify(answer))
  return choices.filter(c => {
    const s = JSON.stringify(c)
    if (seen.has(s)) return false
    seen.add(s)
    return true
  })
}

export function generateAnalogy(level: number, roundInLevel: number): AnalogyPuzzle {
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

  const pickShapes = () => {
    const sA = ALL_SHAPES[Math.floor(rng() * ALL_SHAPES.length)]
    const sC = ALL_SHAPES.filter(s => s !== sA)[Math.floor(rng() * (ALL_SHAPES.length - 1))]
    return [sA, sC] as [ShapeType, ShapeType]
  }

  const rules = [
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
      return { a, b, c, choices, answerIdx, rule: 'Empty -> full fill' }
    },
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
      return { a, b, c, choices, answerIdx, rule: 'Full -> empty fill' }
    },
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
      return { a, b, c, choices, answerIdx, rule: `${srcFill} -> half fill` }
    },
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
        { type: sC, fill: fillB, color: colA },
        { type: sC, fill: fillA, color: colB },
        { type: sA, fill: fillB, color: colB },
      ]
      const { choices, answerIdx } = makeChoices(answer, wrongs)
      return { a, b, c, choices, answerIdx, rule: 'Fill and color both change together' }
    },
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
        { type: sC, fill, rotate: rot, color: colA },
        { type: sC, fill, rotate: 0, color: colB },
        { type: sA, fill, rotate: rot, color: colB },
      ]
      const { choices, answerIdx } = makeChoices(answer, wrongs)
      return { a, b, c, choices, answerIdx, rule: 'Rotation and color both transform' }
    },
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
        { type: sC, fill: fillB, rotate: 0, color: colB },
        { type: sC, fill: fillA, rotate: rot, color: colB },
        { type: sC, fill: fillB, rotate: rot, color: colA },
      ]
      const { choices, answerIdx } = makeChoices(answer, wrongs)
      return { a, b, c, choices, answerIdx, rule: 'Fill, rotation, and color all transform' }
    },
    () => {
      const col = PAIR_COLORS[Math.floor(rng() * PAIR_COLORS.length)]
      const fill: Fill = ['empty', 'half', 'full'][Math.floor(rng() * 3)] as Fill
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
    () => {
      const nonSym = ALL_SHAPES.filter(s => s !== 'circle' && s !== 'hexagon')
      const sA = nonSym[Math.floor(rng() * nonSym.length)]
      const sC = nonSym.filter(s => s !== sA)[Math.floor(rng() * (nonSym.length - 1))]
      const colA = PAIR_COLORS[Math.floor(rng() * PAIR_COLORS.length)]
      const colB = PAIR_COLORS.filter(c => c !== colA)[Math.floor(rng() * (PAIR_COLORS.length - 1))]
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

  const availableRuleCount = di < 3 ? 2 : di < 8 ? 3 : di < 15 ? 5 : di < 22 ? 7 : di < 30 ? 9 : 10
  const ruleIdx = Math.floor(rng() * Math.min(availableRuleCount, rules.length))

  for (let attempt = 0; attempt < 15; attempt++) {
    const r = Math.floor(rng() * Math.min(availableRuleCount, rules.length))
    const puzzle = rules[r]()
    const sig = `${puzzle.rule}:${puzzle.a.type}->${puzzle.b.type}::${puzzle.c.type}->${puzzle.choices[puzzle.answerIdx]?.type}`
    if (!usedAnalogySigs.has(sig)) {
      usedAnalogySigs.add(sig)
      return puzzle
    }
  }
  return rules[ruleIdx]()
}
