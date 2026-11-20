/**
 * How an assessment's weight in the final grade is shown. Every screen goes through here, so a weight of 0
 * (the progress report: required, but it doesn't count) never reads as "0% of final grade".
 */

/** True when the assessment adds to the final grade. */
export function countsTowardFinal(weight: number): boolean {
  return weight > 0
}

/**
 * - `long`: "30% of final grade", or "Required · not counted in the final grade".
 * - `short`, for tight places such as a grid header: "30%", or "Required".
 */
export function weightLabel(weight: number, form: 'long' | 'short' = 'long'): string {
  if (countsTowardFinal(weight)) return form === 'short' ? `${weight}%` : `${weight}% of final grade`
  return form === 'short' ? 'Required' : 'Required · not counted in the final grade'
}
