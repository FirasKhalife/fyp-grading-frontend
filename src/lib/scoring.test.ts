import { describe, expect, it } from 'vitest'
import { bandOf } from '@/domain/levels'
import {
  criterionPoints,
  finalGrade,
  formatScore,
  isComplete,
  reviewerScore,
  spread,
  teamAssessmentGrade,
  weightsTotal,
} from './scoring'

describe('reviewerScore', () => {
  it('matches the brief: levels 4, 3, 2 on weights 20/40/40 give 70.0', () => {
    const score = reviewerScore([
      { level: 4, weight: 20 },
      { level: 3, weight: 40 },
      { level: 2, weight: 40 },
    ])
    expect(score).toBe(70)
    expect(formatScore(score)).toBe('70.0')
  })

  it('runs from 0 (all Not demonstrated) to 100 (all Exemplary)', () => {
    const w = [10, 20, 20, 10, 15, 10, 10, 5]
    expect(reviewerScore(w.map((weight) => ({ level: 0, weight })))).toBe(0)
    expect(reviewerScore(w.map((weight) => ({ level: 4, weight })))).toBe(100)
  })

  it('counts unscored criteria as 0 while drafting', () => {
    expect(
      reviewerScore([
        { level: 4, weight: 50 },
        { level: null, weight: 50 },
      ]),
    ).toBe(50)
  })

  it("reproduces Jane's Beta final report draft: 8 of 13 scored, 53.8 so far", () => {
    const weights = [10, 10, 10, 10, 10, 10, 10, 5, 5, 5, 5, 5, 5]
    const levels = [3, 3, 4, 2, 3, 2, 3, null, null, null, null, 3, null] as const
    const items = weights.map((weight, i) => ({ level: levels[i] ?? null, weight }))
    expect(formatScore(reviewerScore(items))).toBe('53.8')
    expect(isComplete(items)).toBe(false)
  })

  it('gives criterion points as level × weight ÷ 4', () => {
    expect(criterionPoints(3, 10)).toBe(7.5)
  })
})

describe('teamAssessmentGrade', () => {
  it('is the plain average of the reviewers', () => {
    expect(formatScore(teamAssessmentGrade([85, 63.75, 73.75])!)).toBe('74.2')
  })
  it('waits until every reviewer has submitted', () => {
    expect(teamAssessmentGrade([80, null, 70])).toBeNull()
    expect(teamAssessmentGrade([])).toBeNull()
  })
})

describe('finalGrade', () => {
  it("weights the five assessments 15/0/25/30/30 (Team Alpha's 88.0)", () => {
    const g = finalGrade([
      { grade: 86.6667, weight: 15 },
      { grade: 83.3333, weight: 0 },
      { grade: 90, weight: 25 },
      { grade: 87.5, weight: 30 },
      { grade: 87.5, weight: 30 },
    ])
    expect(formatScore(g!)).toBe('88.0')
  })
  it('needs the 0% progress report before it can be computed', () => {
    expect(
      finalGrade([
        { grade: 80, weight: 15 },
        { grade: null, weight: 0 },
        { grade: 80, weight: 25 },
        { grade: 80, weight: 30 },
        { grade: 80, weight: 30 },
      ]),
    ).toBeNull()
  })
})

describe('bandOf', () => {
  it.each([
    [0, 0],
    [12.4, 0],
    [12.5, 1],
    [37.4, 1],
    [37.5, 2],
    [62.4, 2],
    [62.5, 3],
    [87.4, 3],
    [87.5, 4],
    [88, 4],
    [100, 4],
  ])('score %s is in band %s', (score, band) => {
    expect(bandOf(score)).toBe(band)
  })
  it('bands the displayed value, so 87.46 (shown 87.5) is Exemplary', () => {
    expect(bandOf(87.46)).toBe(4)
  })
})

describe('helpers', () => {
  it('spread is max minus min', () => {
    expect(formatScore(spread([85, 63.75, 73.75]))).toBe('21.3')
    expect(spread([90])).toBe(0)
  })
  it('weightsTotal ignores blanks', () => {
    expect(weightsTotal([10, '', 20, '5'])).toBe(35)
  })
})

describe('disagreement and distribution (contract 1.2.0)', () => {
  it('flags a spread above 15 points, on the displayed value', async () => {
    const { disagrees } = await import('./scoring')
    expect(disagrees(null)).toBe(false)
    expect(disagrees(15)).toBe(false)
    expect(disagrees(15.04)).toBe(false)
    expect(disagrees(15.05)).toBe(true)
    expect(disagrees(21.3)).toBe(true)
  })

  it('puts final grades in ten 10-point bands, 100 in the last one', async () => {
    const { gradeDistribution } = await import('./scoring')
    const d = gradeDistribution([0, 9.94, 9.96, 70, 79.9, 100])
    expect(d).toHaveLength(10)
    expect(d.map((b) => b.count)).toEqual([2, 1, 0, 0, 0, 0, 0, 2, 0, 1])
    expect(d[9]).toEqual({ from: 90, to: 100, count: 1 })
  })
})
