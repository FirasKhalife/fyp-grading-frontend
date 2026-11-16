import { describe, expect, it } from 'vitest'
import { parisToUtc, utcToParis } from './tz'

describe('Europe/Paris conversions across daylight saving', () => {
  it.each([
    ['2026-03-28T09:00:00', '2026-03-28T08:00:00.000Z'], // winter, UTC+1
    ['2026-03-29T09:00:00', '2026-03-29T07:00:00.000Z'], // summer time starts that night, UTC+2
    ['2026-10-24T09:00:00', '2026-10-24T07:00:00.000Z'], // still summer
    ['2026-10-25T09:00:00', '2026-10-25T08:00:00.000Z'], // back to winter
  ])('%s Paris is %s', (wall, utc) => {
    expect(parisToUtc(wall)).toBe(utc)
    expect(utcToParis(utc)).toBe(wall)
  })
})
