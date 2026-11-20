import { describe, expect, it } from 'vitest'
import { countsTowardFinal, weightLabel } from './weight'

describe('weightLabel', () => {
  it('shows a counted weight as a percentage', () => {
    expect(weightLabel(30)).toBe('30% of final grade')
    expect(weightLabel(15, 'short')).toBe('15%')
  })

  it('shows a weight of 0 as required, never as 0%', () => {
    expect(weightLabel(0)).toBe('Required · not counted in the final grade')
    expect(weightLabel(0, 'short')).toBe('Required')
    expect(weightLabel(0)).not.toContain('0%')
  })

  it('knows which weights count', () => {
    expect(countsTowardFinal(25)).toBe(true)
    expect(countsTowardFinal(0)).toBe(false)
  })
})
