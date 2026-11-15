import type { Level } from './types'

export const LEVELS: readonly Level[] = [4, 3, 2, 1, 0]

export const LEVEL_NAMES: Record<Level, string> = {
  4: 'Exemplary',
  3: 'Accomplished',
  2: 'Developing',
  1: 'Beginning',
  0: 'Not demonstrated',
}

export const LEVEL_ZERO_DESCRIPTION = 'Not addressed.'

/**
 * Score bands: any 0–100 score uses the mark of its band.
 * 0–12.4 → 0, 12.5–37.4 → 1, 37.5–62.4 → 2, 62.5–87.4 → 3, 87.5–100 → 4.
 * Bands are applied to the score as displayed (one decimal), so 87.45 shows "87.5" and the mark 4.
 */
export function bandOf(score: number): Level {
  const s = roundTo1(score)
  if (s < 12.5) return 0
  if (s < 37.5) return 1
  if (s < 62.5) return 2
  if (s < 87.5) return 3
  return 4
}

export function roundTo1(n: number): number {
  return Math.round((n + Number.EPSILON) * 10) / 10
}

export function isLevel(n: unknown): n is Level {
  return n === 0 || n === 1 || n === 2 || n === 3 || n === 4
}
