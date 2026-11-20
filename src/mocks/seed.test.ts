import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { setDemoNow } from '@/lib/demo-clock'
import { formatScore } from '@/lib/scoring'
import { createSeedState } from './db'
import { conflicts, myTeamsView, overviewView, releaseAssessment, saveDraft, studentHomeView, submitEvaluation, teamAssessment, teamFinal } from './logic'

beforeAll(() => setDemoNow(new Date(2030, 2, 13, 14, 30)))
afterAll(() => setDemoNow(null))

describe('demo seed', () => {
  it('reproduces the final grades of Alpha (88.0) and Gamma (92.2)', () => {
    const s = createSeedState()
    expect(formatScore(teamFinal(s, 't-alpha')!)).toBe('88.0')
    expect(formatScore(teamFinal(s, 't-gamma')!)).toBe('92.2')
    for (const t of ['t-beta', 't-delta', 't-epsilon', 't-zeta']) expect(teamFinal(s, t)).toBeNull()
  })

  it('keeps the Beta proposal spread and the Delta progress outlier', () => {
    const s = createSeedState()
    const beta = teamAssessment(s, 't-beta', 'PROPOSAL_PRESENTATION')
    const byName = Object.fromEntries(beta.reviewers.map((r) => [r.reviewer.name, formatScore(r.score!)]))
    expect(byName).toEqual({ 'John Doe': '85.0', 'Michael Johnson': '63.8', 'Jane Smith': '73.8' })
    expect(formatScore(beta.grade!)).toBe('74.2')
    expect(formatScore(beta.spread!)).toBe('21.3')
    const delta = teamAssessment(s, 't-delta', 'PROGRESS_REPORT')
    expect(delta.reviewers.map((r) => r.score)).toContain(35)
  })

  it("has Jane's Beta final report draft at 8 of 13, 53.8", () => {
    const s = createSeedState()
    const fr = teamAssessment(s, 't-beta', 'FINAL_REPORT')
    const jane = fr.reviewers.find((r) => r.reviewer.id === 'r-jane')!
    expect(jane.state).toBe('DRAFT')
    expect(formatScore(jane.score!)).toBe('53.8')
    expect(fr.submitted).toBe(2)
  })

  it('matches the overview KPIs of the design', () => {
    const o = overviewView(createSeedState())
    expect(o.kpis.submitted).toBe(62)
    expect(o.kpis.expected).toBe(74)
    expect(o.kpis.overdue.count).toBe(2)
    expect(o.kpis.finals.names).toEqual(['Alpha', 'Gamma'])
    expect(o.kpis.released).toBe(17)
    expect(formatScore(o.kpis.average!)).toBe('90.1')
    expect(o.rows.filter((r) => r.attention).map((r) => r.team.name)).toEqual(['Beta', 'Delta', 'Zeta'])
    expect(o.releases.map((r) => [r.assessment.key, r.pendingTeams.map((t) => t.name)])).toEqual([
      ['ADVISOR_ASSESSMENT', ['Beta', 'Epsilon']],
      ['FINAL_REPORT', ['Epsilon', 'Zeta']],
      ['FINAL_PRESENTATION', ['Gamma', 'Zeta']],
    ])
  })

  it('gives Jane 3 teams: 9 of 12 submitted, 1 draft, 2 not started', () => {
    const v = myTeamsView(createSeedState(), 'r-jane')
    expect(v.cards.map((c) => c.team.name)).toEqual(['Beta', 'Epsilon', 'Alpha'])
    expect(v.summary).toMatchObject({ expected: 12, submitted: 9, drafts: 1, notStarted: 2, overdue: 0 })
    expect(v.nextUp?.team.name).toBe('Beta')
    expect(v.nextUp?.row.assessment.key).toBe('FINAL_REPORT')
  })

  it('gives Karim an overdue advisor draft for Delta', () => {
    const v = myTeamsView(createSeedState(), 'r-karim')
    const delta = v.cards.find((c) => c.team.name === 'Delta')!
    expect(delta.role).toBe('ADVISOR')
    expect(delta.rows).toHaveLength(1)
    expect(delta.rows[0]).toMatchObject({ state: 'DRAFT', overdue: true })
  })

  it('has exactly one defense conflict: John Doe, Beta and Delta', () => {
    const c = conflicts(createSeedState())
    expect(c).toHaveLength(1)
    expect(c[0]!.reviewer.name).toBe('John Doe')
    expect(c[0]!.teams.map((t) => t.name).sort()).toEqual(['Beta', 'Delta'])
  })

  it('shows Nour every result and the final grade', () => {
    const v = studentHomeView(createSeedState(), 's-nour')
    expect(v.releasedCount).toBe(5)
    expect(formatScore(v.final!)).toBe('88.0')
  })

  it('runs the key demo moment: Jane submits, Beta turns final, Rania releases, students are told', () => {
    const s = createSeedState()
    const fr = teamAssessment(s, 't-beta', 'FINAL_REPORT')
    const draft = fr.reviewers.find((r) => r.reviewer.id === 'r-jane')!.evaluation!
    const levels = Object.fromEntries(Object.keys(draft.levels).map((k) => [k, draft.levels[k] ?? 3]))
    saveDraft(s, 'r-jane', 't-beta', 'FINAL_REPORT', { levels })
    submitEvaluation(s, 'r-jane', 't-beta', 'FINAL_REPORT')
    expect(teamAssessment(s, 't-beta', 'FINAL_REPORT').grade).not.toBeNull()
    expect(s.notifications['r-rania']![0]!.text).toMatch(/Final report for Team Beta is final/)
    const { released } = releaseAssessment(s, 'FINAL_REPORT')
    expect(released.map((t) => t.name)).toEqual(['Beta', 'Epsilon', 'Zeta'])
    expect(s.notifications['s-ahmad']![0]!.text).toBe('Your Final report results are available.')
  })

  it('never shows students a grade before release', () => {
    const s = createSeedState()
    s.students.push({ id: 's-x', firstName: 'X', lastName: 'Y', email: 'x@y.z', teamId: 't-gamma' })
    const v = studentHomeView(s, 's-x')
    const fp = v.results.find((r) => r.assessment.key === 'FINAL_PRESENTATION')!
    expect(fp.released).toBe(false)
    expect(fp.grade).toBeNull()
    expect(fp.criteria).toEqual([])
    expect(v.final).toBeNull()
  })
})
