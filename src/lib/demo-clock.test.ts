import { describe, expect, it } from 'vitest'
import { sessionLabel } from './demo-clock'

describe('sessionLabel', () => {
  it('names the term that holds the date, so it never sits next to dates from another term', () => {
    expect(sessionLabel(new Date(2026, 5, 10))).toBe('Spring 2026')
    expect(sessionLabel(new Date(2026, 6, 15))).toBe('Summer 2026')
    expect(sessionLabel(new Date(2026, 10, 16))).toBe('Fall 2026')
    expect(sessionLabel(new Date(2027, 0, 5))).toBe('Spring 2027')
  })
})
