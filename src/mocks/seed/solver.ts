import type { Level } from '@/domain/types'

/**
 * Picks one level (0–4) per criterion so that Σ level × weight ÷ 4 equals the target score exactly.
 * The demo data states reviewer scores (e.g. Beta proposal 85.0 / 63.8 / 73.8); the levels behind
 * them are derived here under the seed's real weights, so every displayed score is the real maths.
 *
 * `preferred` levels (from the design boards) are kept where possible and nudged to hit the target.
 * `seed` varies which criteria move, so different reviewers don't get identical patterns.
 */
export function solveLevels(weights: readonly number[], target: number, preferred?: readonly Level[], seed = 1): Level[] {
  const goal = Math.round(target * 4)
  if (Math.abs(goal - target * 4) > 1e-6) throw new Error(`Target ${target} is not reachable (× 4 must be whole)`)
  const base = Math.max(0, Math.min(4, Math.round(target / 25))) as Level
  const levels: number[] = weights.map((_, i) => preferred?.[i] ?? base)
  const order = weights.map((_, i) => i)
  // Deterministic shuffle so the moved criteria differ per reviewer.
  let x = seed * 9301 + 49297
  for (let i = order.length - 1; i > 0; i--) {
    x = (x * 9301 + 49297) % 233280
    const j = x % (i + 1)
    ;[order[i], order[j]] = [order[j]!, order[i]!]
  }
  const sum = () => levels.reduce((a, l, i) => a + l * weights[i]!, 0)
  for (let guard = 0; guard < 400; guard++) {
    const diff = goal - sum()
    if (diff === 0) return levels as Level[]
    const dir = diff > 0 ? 1 : -1
    const movable = order.filter((i) => {
      const l = levels[i]! + dir
      return l >= 0 && l <= 4
    })
    // Largest weight that doesn't overshoot; otherwise overshoot with the smallest and correct after.
    const fit = movable.filter((i) => weights[i]! <= Math.abs(diff)).sort((a, b) => weights[b]! - weights[a]!)
    const pick = fit[0] ?? movable.sort((a, b) => weights[a]! - weights[b]!)[0]
    if (pick === undefined) break
    levels[pick] = levels[pick]! + dir
  }
  throw new Error(`Could not reach ${target} with weights ${weights.join('/')}`)
}
