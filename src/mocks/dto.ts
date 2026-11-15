import type { components } from '@/api/schema'
import { ASSESSMENTS } from '@/domain/assessments'
import { LEVEL_NAMES, LEVELS } from '@/domain/levels'
import type { AssessmentKey, Criterion, Evaluation, Level, Reviewer, Student, Team } from '@/domain/types'
import { addMinutes } from '@/lib/demo-clock'
import { parisToUtc } from '@/lib/tz'
import { DemoError, composition, conflicts, personRef, scoreOf, team as teamOf, teamAssessment, teamFinal, assessment as assessmentOf } from './logic'
import type { DemoState } from './db'

/** Maps the in-memory demo copy to the contract's DTOs, exactly as the backend would serve them. */

export type S<K extends keyof components['schemas']> = components['schemas'][K]

const utc = (wall: string | null | undefined) => (wall ? parisToUtc(wall) : null)
const r1 = (n: number) => Math.round((n + Number.EPSILON) * 10) / 10
const score = (n: number | null | undefined) => (n === null || n === undefined ? null : r1(n))

/** Due dates are dates in the app; the contract carries the end of that day in Paris. */
export const dueInstant = (isoDate: string) => parisToUtc(`${isoDate}T23:59:00`)

export function person(p: Reviewer | Student | { id: string; firstName: string; lastName: string; email?: string }): S<'Person'> {
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    displayName: `${p.firstName} ${p.lastName}`,
    initials: `${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`,
    email: 'email' in p ? p.email : undefined,
  }
}

function reviewerById(state: DemoState, id: string): Reviewer {
  const r = state.reviewers.find((x) => x.id === id)
  if (!r) throw new DemoError(404, 'Reviewer not found')
  return r
}

export function teamRef(t: Team): S<'TeamRef'> {
  return { id: t.id, name: t.name, projectTitle: t.projectTitle }
}

export function student(s: Student): S<'Student'> {
  return { ...person(s), teamId: s.teamId }
}

export function compositionDto(t: Team): S<'Composition'> {
  const c = composition(t)
  const problems: S<'CompositionProblem'>[] = []
  if (c.total === 0) problems.push({ code: 'NO_REVIEWERS', message: 'Needs at least 1 reviewer.' })
  if (c.total > 5) problems.push({ code: 'TOO_MANY_REVIEWERS', message: 'Has more than 5 reviewers.' })
  if (c.jury < 1) problems.push({ code: 'NO_JURY', message: 'Needs at least 1 jury member.' })
  if (c.advisors < 1) problems.push({ code: 'NO_ADVISOR', message: 'Needs at least 1 advisor.' })
  return { valid: problems.length === 0, reviewerCount: c.total, maxReviewers: 5, juryCount: c.jury, advisorCount: c.advisors, problems }
}

export function teamReviewers(state: DemoState, t: Team): S<'TeamReviewer'>[] {
  return [...t.members]
    .sort((a, b) => (a.role === b.role ? 0 : a.role === 'ADVISOR' ? -1 : 1))
    .map((m) => ({ reviewer: person(reviewerById(state, m.reviewerId)), role: m.role }))
}

export function defenseSlot(state: DemoState, t: Team): S<'DefenseSlot'> | null {
  if (!t.defense) return null
  const mine = conflicts(state).filter((c) => c.teams.some((x) => x.id === t.id))
  return {
    team: teamRef(t),
    startsAt: parisToUtc(t.defense.start),
    endsAt: parisToUtc(addMinutes(t.defense.start, t.defense.minutes)),
    room: t.defense.room,
    jury: t.members.filter((m) => m.role === 'JURY').map((m) => person(reviewerById(state, m.reviewerId))),
    conflicts: mine.map((c) => ({ reviewer: person(reviewerById(state, c.reviewer.id)), otherTeam: teamRef(c.teams.find((x) => x.id !== t.id)!) })),
  }
}

export function assessmentDto(state: DemoState, key: AssessmentKey): S<'Assessment'> {
  const a = assessmentOf(state, key)
  const infos = state.teams.map((t) => teamAssessment(state, t.id, key))
  const def = ASSESSMENTS.findIndex((x) => x.key === key)
  return {
    code: key,
    name: a.name,
    shortName: a.shortName,
    position: def + 1,
    weight: a.weight,
    required: true,
    reviewerRole: a.role,
    dueAt: dueInstant(a.due),
    teamCount: state.teams.length,
    finalTeamCount: infos.filter((i) => i.grade !== null).length,
    releasedTeamCount: infos.filter((i) => i.release).length,
  }
}

function stateOf(i: ReturnType<typeof teamAssessment>): S<'TeamAssessmentState'> {
  return i.release ? 'RELEASED' : i.grade !== null ? 'FINAL' : i.submitted > 0 ? 'WAITING' : 'NOT_STARTED'
}

export function teamAssessmentDto(state: DemoState, teamId: string, key: AssessmentKey, revealScores = true): S<'TeamAssessment'> {
  const i = teamAssessment(state, teamId, key)
  const r = state.rubrics.find((x) => x.assessment === key)!
  return {
    assessment: key,
    weight: i.assessment.weight,
    reviewerRole: i.assessment.role,
    dueAt: dueInstant(i.assessment.due),
    state: stateOf(i),
    grade: score(i.grade),
    submittedCount: i.submitted,
    expectedCount: i.expected,
    spread: score(i.spread),
    overdue: i.overdue,
    finalizedAt: i.grade !== null ? utc(i.reviewers.map((x) => x.evaluation?.submittedAt ?? '').sort().pop()) : null,
    releasedAt: utc(i.release?.at),
    reviewers: i.reviewers.map((x) => ({
      reviewer: person(reviewerById(state, x.reviewer.id)),
      status: x.state,
      overdue: x.state !== 'SUBMITTED' && i.overdue,
      score: revealScores && x.state === 'SUBMITTED' ? score(x.score) : null,
      submittedAt: utc(x.evaluation?.submittedAt),
      evaluationId: x.evaluation?.id ?? null,
      scoredCount: x.evaluation ? r.criteria.filter((c) => x.evaluation!.levels[c.id] !== null && x.evaluation!.levels[c.id] !== undefined).length : null,
      criteriaCount: r.criteria.length,
    })),
  }
}

export function finalState(state: DemoState, teamId: string): S<'FinalState'> {
  if (teamFinal(state, teamId) === null) return 'IN_PROGRESS'
  return ASSESSMENTS.every((a) => state.releases.some((r) => r.teamId === teamId && r.assessment === a.key)) ? 'VISIBLE' : 'COMPUTED'
}

export function teamDto(state: DemoState, teamId: string, viewerIsAdmin = true): S<'Team'> {
  const t = teamOf(state, teamId)
  return {
    ...teamRef(t),
    description: t.description || null,
    students: state.students.filter((s) => s.teamId === t.id).map(student),
    reviewers: teamReviewers(state, t),
    composition: compositionDto(t),
    defenseSlot: defenseSlot(state, t),
    assessments: ASSESSMENTS.map((a) => {
      const dto = teamAssessmentDto(state, teamId, a.key, true)
      // Reviewers see other reviewers' scores only once the team assessment is final.
      if (!viewerIsAdmin && dto.grade === null) dto.reviewers = dto.reviewers.map((r) => ({ ...r, score: null }))
      return dto
    }),
    finalGrade: score(teamFinal(state, teamId)),
    finalState: finalState(state, teamId),
  }
}

function descriptions(c: Criterion): S<'LevelDescriptions'> {
  return { '1': c.descriptions[0], '2': c.descriptions[1], '3': c.descriptions[2], '4': c.descriptions[3] }
}

export function criterionDto(c: Criterion, i: number): S<'Criterion'> {
  return { id: c.id, position: i + 1, name: c.name, weight: c.weight, descriptions: descriptions(c) }
}

export function rubricDto(state: DemoState, key: AssessmentKey): S<'Rubric'> {
  const r = state.rubrics.find((x) => x.assessment === key)!
  return {
    assessment: key,
    name: assessmentOf(state, key).name,
    criteria: r.criteria.map(criterionDto),
    totalWeight: r.criteria.reduce((s, c) => s + c.weight, 0),
    levels: LEVELS.map((l) => ({ value: l, name: LEVEL_NAMES[l] as S<'Rubric'>['levels'][number]['name'] })),
    updatedAt: null,
  }
}

export function evaluationDto(state: DemoState, teamId: string, key: AssessmentKey, reviewerId: string, e: Evaluation | null): S<'Evaluation'> {
  const t = teamOf(state, teamId)
  const a = assessmentOf(state, key)
  const r = state.rubrics.find((x) => x.assessment === key)!
  const scored = e ? r.criteria.filter((c) => e.levels[c.id] !== null && e.levels[c.id] !== undefined).length : 0
  return {
    id: e?.id ?? null,
    teamId,
    teamName: t.name,
    assessment: key,
    reviewer: person(reviewerById(state, reviewerId)),
    reviewerRole: a.role,
    status: e ? e.status : 'NOT_STARTED',
    criteria: r.criteria.map((c, i) => ({
      criterionId: c.id,
      position: i + 1,
      name: c.name,
      weight: c.weight,
      descriptions: descriptions(c),
      level: (e?.levels[c.id] ?? null) as Level | null,
      comment: e?.comments[c.id] || null,
    })),
    overallComment: e?.overallComment || null,
    score: e && scored > 0 ? r1(scoreOf(state, e)) : null,
    scoredCount: scored,
    criteriaCount: r.criteria.length,
    dueAt: dueInstant(a.due),
    overdue: e?.status !== 'SUBMITTED' && teamAssessment(state, teamId, key).overdue,
    createdAt: utc(e?.history[0]?.at ?? e?.updatedAt),
    updatedAt: utc(e?.updatedAt),
    submittedAt: utc(e?.submittedAt),
  }
}

export function historyDto(state: DemoState, e: Evaluation): S<'EvaluationHistoryEntry'>[] {
  const actor = person(reviewerById(state, e.reviewerId))
  return [...e.history].reverse().map((h) => ({
    at: parisToUtc(h.at),
    actor,
    kind: h.kind,
    criterionId: h.criterionId ?? null,
    criterionName: h.criterionName ?? null,
    from: h.from ?? null,
    to: h.to ?? null,
  }))
}

/** In-app paths are stored on seeded items; the contract carries a structured link. */
export function linkOf(href: string): S<'Link'> {
  const g = href.match(/^\/grade\/([^/]+)\/([^/]+)/)
  if (g) return { kind: 'EVALUATION', teamId: g[1]!, assessment: g[2]!.toUpperCase().replace(/-/g, '_') as AssessmentKey }
  const t = href.match(/^\/teams\/([^/#]+)/)
  if (t) return { kind: 'TEAM', teamId: t[1]!, assessment: null }
  if (href.startsWith('/schedule')) return { kind: 'SCHEDULE', teamId: null, assessment: null }
  if (href.startsWith('/student')) return { kind: 'STUDENT_RESULTS', teamId: null, assessment: null }
  if (href.startsWith('/overview')) return { kind: 'OVERVIEW', teamId: null, assessment: null }
  return { kind: 'MY_TEAMS', teamId: null, assessment: null }
}

export function personOrLabel(state: DemoState, who: string): S<'ActivityEntry'>['actor'] {
  const r = state.reviewers.find((x) => `${x.firstName} ${x.lastName}` === who)
  return { id: r?.id ?? null, displayName: who }
}

export { personRef }
