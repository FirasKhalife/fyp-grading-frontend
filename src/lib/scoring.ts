import { roundTo1 } from '@/domain/levels'
import type { Level } from '@/domain/types'

/**
 * Score maths from PRODUCT-BRIEF.md section 4.2. Every function is pure so the rules are unit-tested
 * in one place, and the mock backend uses the same functions as the screens.
 */

export interface WeightedLevel {
  level: Level | null
  /** Criterion weight in %. */
  weight: number
}

/**
 * Reviewer's score = Σ (level × criterion weight %) ÷ 4, from 0 to 100.
 * Unscored criteria count as 0 (the live score shown while drafting).
 */
export function reviewerScore(items: readonly WeightedLevel[]): number {
  let total = 0
  for (const { level, weight } of items) total += (level ?? 0) * weight
  return total / 4
}

/** Points one criterion contributes: level × weight ÷ 4. */
export function criterionPoints(level: Level, weight: number): number {
  return (level * weight) / 4
}

export function isComplete(items: readonly WeightedLevel[]): boolean {
  return items.every((i) => i.level !== null)
}

/** Team assessment grade = plain average of all reviewers' scores. Null if anyone is missing. */
export function teamAssessmentGrade(scores: readonly (number | null)[]): number | null {
  if (scores.length === 0 || scores.some((s) => s === null)) return null
  const list = scores as number[]
  return list.reduce((a, b) => a + b, 0) / list.length
}

export interface WeightedGrade {
  grade: number | null
  /** Assessment weight in the final grade, in %. */
  weight: number
}

/**
 * Team final grade = Σ (team assessment grade × assessment weight %). Computed only once all five
 * assessments are final, including the 0% progress report, which is mandatory.
 */
export function finalGrade(grades: readonly WeightedGrade[]): number | null {
  if (grades.length === 0 || grades.some((g) => g.grade === null)) return null
  return grades.reduce((sum, g) => sum + ((g.grade as number) * g.weight) / 100, 0)
}

/** Largest minus smallest reviewer score: the informational spread indicator. */
export function spread(scores: readonly number[]): number {
  if (scores.length < 2) return 0
  return Math.max(...scores) - Math.min(...scores)
}

/** Reviewers more than this many points apart are flagged (contract `Insights.disagreementThreshold`). */
export const DISAGREEMENT_THRESHOLD = 15

/** True when the spread, as displayed (one decimal), is above the threshold. Informational only. */
export function disagrees(spreadValue: number | null, threshold = DISAGREEMENT_THRESHOLD): boolean {
  return spreadValue !== null && Math.round(spreadValue * 10) / 10 > threshold
}

/** Final grades in ten 10-point bands: [0, 10), [10, 20) … [90, 100]. */
export function gradeDistribution(grades: readonly number[]): { from: number; to: number; count: number }[] {
  const bands = Array.from({ length: 10 }, (_, i) => ({ from: i * 10, to: i * 10 + 10, count: 0 }))
  for (const g of grades) bands[Math.min(9, Math.max(0, Math.floor(Math.round(g * 10) / 100)))]!.count += 1
  return bands
}

/** Scores are shown to one decimal place, on 0–100. */
export function formatScore(n: number): string {
  return roundTo1(n).toFixed(1)
}

export function weightsTotal(weights: readonly (number | string)[]): number {
  return weights.reduce<number>((a, w) => a + (Number(w) || 0), 0)
}
