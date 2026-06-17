import { Fill, GOLD, ROUNDS_PER_LEVEL, SAGE, SHAPE_TYPES, SeriesPuzzle, STEEL } from '../../types'
import { isSameShape, shuffle } from '../utils'

const usedSeriesSigs = new Set<string>()
export function resetSeriesHistory() { usedSeriesSigs.clear() }

export function generateSeries(level: number, roundInLevel: number): SeriesPuzzle {
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

  const tier1 = () => {
    const shape = SHAPE_TYPES[Math.floor(rng() * SHAPE_TYPES.length)]
    const fillCycle: Fill[] = ['empty', 'half', 'full']
    const start = Math.floor(rng() * 3)
    const sequence = Array.from({ length: 5 }, (_, i) => ({ type: shape, fill: fillCycle[(start + i) % 3], color: STEEL }))
    const answer = { type: shape, fill: fillCycle[(start + 5) % 3], color: STEEL }
    const choices = shuffle([answer, ...makeDeceptiveWrongs(answer, sequence)])
    return { sequence, choices, answerIdx: choices.findIndex(c => isSameShape(c, answer)), rule: 'Fill pattern cycles (Empty-Half-Full)' }
  }

  const tier2 = () => {
    const type = SHAPE_TYPES.filter(s => s !== 'circle')[Math.floor(rng() * (SHAPE_TYPES.length - 1))]
    const step = (Math.floor(rng() * 2) + 1) * 45
    const sequence = Array.from({ length: 5 }, (_, i) => ({ type, fill: 'empty' as Fill, rotate: i * step, color: STEEL }))
    const answer = { type, fill: 'empty' as Fill, rotate: 5 * step, color: STEEL }
    const choices = shuffle([answer, ...makeDeceptiveWrongs(answer, sequence)])
    return { sequence, choices, answerIdx: choices.findIndex(c => isSameShape(c, answer)), rule: `Shape rotates ${step}° each step` }
  }

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
