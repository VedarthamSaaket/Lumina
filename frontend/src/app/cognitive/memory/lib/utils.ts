import { PuzzleState, ROUNDS_PER_LEVEL } from '../types'

export const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5)

export function isSameShape(s1: any, s2: any) {
  if (!s1 || !s2) return false
  return s1.type === s2.type &&
    s1.fill === s2.fill &&
    (s1.rotate || 0) === (s2.rotate || 0) &&
    (s1.color === s2.color)
}

export function nextPuzzleState({ level, roundInLevel }: PuzzleState, correct: boolean): PuzzleState {
  if (!correct) return { level, roundInLevel }
  const nextRil = roundInLevel + 1 >= ROUNDS_PER_LEVEL ? 0 : roundInLevel + 1
  const nextLvl = roundInLevel + 1 >= ROUNDS_PER_LEVEL ? level + 1 : level
  return { level: nextLvl, roundInLevel: nextRil }
}
