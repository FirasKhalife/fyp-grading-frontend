import { ASSESSMENTS, assessmentDef } from '@/domain/assessments'
import type {
  Activity,
  AppNotification,
  AssessmentKey,
  Evaluation,
  Level,
  Release,
  Reviewer,
  Rubric,
  Student,
  Team,
} from '@/domain/types'
import {
  fmtDay,
  fmtRelativeDays,
  fmtShort,
  fmtTime,
  isoAt,
  isoDay,
  isoMinutesAgo,
  now,
  parseLocal,
} from '@/lib/demo-clock'
import { formatScore } from '@/lib/scoring'
import { ACTIVITY, NOTIFICATIONS, type FeedSpec } from './seed/feed'
import { COMMENT_POOL, EVALUATIONS, RELEASES } from './seed/evaluations'
import { REVIEWERS, STUDENTS, seedTeams } from './seed/people'
import { SEED_RUBRICS } from './seed/rubrics'
import { solveLevels } from './seed/solver'
import { teamAssessment, teamFinal } from './logic'

/**
 * The in-memory demo copy. In mock mode this *is* the backend: one copy per demo session id, kept in
 * localStorage so a reload keeps what the visitor graded, and wiped by "Reset my demo".
 */
export interface DemoState {
  version: number
  createdAt: string
  reviewers: Reviewer[]
  students: Student[]
  teams: Team[]
  rubrics: Rubric[]
  /** Due date per assessment, ISO date. */
  dues: Record<AssessmentKey, string>
  evaluations: Evaluation[]
  releases: Release[]
  activity: Activity[]
  notifications: Record<string, AppNotification[]>
  seq: number
}

export const STATE_VERSION = 3

const ABBR: Record<AssessmentKey, string> = {
  PROPOSAL_PRESENTATION: 'pp',
  PROGRESS_REPORT: 'pr',
  ADVISOR_ASSESSMENT: 'aa',
  FINAL_REPORT: 'fr',
  FINAL_PRESENTATION: 'fp',
}

export function criterionId(a: AssessmentKey, index: number): string {
  return `${ABBR[a]}-${String(index + 1).padStart(2, '0')}`
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/**
 * A seeded time of day "today" may still be in the future when the visitor arrives early. Such times
 * are pulled back to just before now, keeping their order (later times stay more recent).
 */
function past(day: number, hhmm: string): string {
  const iso = isoAt(day, hhmm)
  if (day !== 0 || parseLocal(iso) <= now()) return iso
  const [h = 0, m = 0] = hhmm.split(':').map(Number)
  return isoMinutesAgo(Math.max(1, Math.round((24 * 60 - (h * 60 + m)) / 20)))
}

function at(spec: [number, string] | { minutesAgo: number }): string {
  return Array.isArray(spec) ? past(spec[0], spec[1]) : isoMinutesAgo(spec.minutesAgo)
}

export function createSeedState(): DemoState {
  const teams = seedTeams()
  const rubrics: Rubric[] = ASSESSMENTS.map((a) => ({
    assessment: a.key,
    criteria: SEED_RUBRICS[a.key].map((c, i) => ({
      id: criterionId(a.key, i),
      name: c.name,
      weight: c.weight,
      descriptions: [...c.d],
    })),
  }))
  const dues = Object.fromEntries(ASSESSMENTS.map((a) => [a.key, isoDay(a.dueOffset)])) as Record<AssessmentKey, string>

  const evaluations: Evaluation[] = []
  for (const [teamId, spec] of Object.entries(EVALUATIONS)) {
    for (const [key, list] of Object.entries(spec) as [AssessmentKey, NonNullable<(typeof spec)[AssessmentKey]>][]) {
      const rubric = rubrics.find((r) => r.assessment === key)!
      const weights = rubric.criteria.map((c) => c.weight)
      list.forEach((e, k) => {
        const levelsArr: (Level | null)[] =
          e.levels ?? solveLevels(weights, e.score ?? 0, e.prefer, hash(teamId + key + e.reviewer) % 997)
        const levels: Record<string, Level | null> = {}
        const comments: Record<string, string> = {}
        rubric.criteria.forEach((c, i) => {
          levels[c.id] = levelsArr[i] ?? null
          const explicit = e.comments?.[i]
          if (explicit) comments[c.id] = explicit
          else if (!e.comments && e.status === 'SUBMITTED' && hash(`${teamId}${key}${e.reviewer}${i}`) % 9 < 4) {
            comments[c.id] = COMMENT_POOL[key][i] ?? ''
          }
        })
        const stamp = past(e.at[0], e.at[1])
        evaluations.push({
          id: `e-${teamId.slice(2)}-${ABBR[key]}-${k + 1}`,
          teamId,
          assessment: key,
          reviewerId: e.reviewer,
          status: e.status,
          levels,
          comments,
          overallComment: e.overall ?? '',
          updatedAt: stamp,
          submittedAt: e.status === 'SUBMITTED' ? stamp : null,
          history: (e.history ?? []).map((h) => ({ at: past(h.at[0], h.at[1]), text: h.text })),
        })
      })
    }
  }

  const releases: Release[] = []
  for (const [key, list] of Object.entries(RELEASES) as [AssessmentKey, [string, number, string][]][]) {
    for (const [teamId, d, t] of list) releases.push({ assessment: key, teamId, at: past(d, t) })
  }

  const state: DemoState = {
    version: STATE_VERSION,
    createdAt: new Date().toISOString(),
    reviewers: structuredClone(REVIEWERS),
    students: structuredClone(STUDENTS),
    teams,
    rubrics,
    dues,
    evaluations,
    releases,
    activity: [],
    notifications: {},
    seq: 1000,
  }

  // Feed text placeholders need the grades, so resolve them after the evaluations exist.
  const fill = (text: string) => resolvePlaceholders(state, text)
  state.activity = ACTIVITY.map((a: FeedSpec, i) => ({ id: `a-${i}`, kind: a.kind, who: a.who, text: fill(a.text), at: at(a.at) }))
  state.notifications = Object.fromEntries(
    Object.entries(NOTIFICATIONS).map(([user, list]) => [
      user,
      list.map((n, i) => ({ id: `n-${user}-${i}`, kind: n.kind, text: fill(n.text), at: at(n.at), href: n.href, read: n.read })),
    ]),
  )
  return state
}

function resolvePlaceholders(state: DemoState, text: string): string {
  return text.replace(/\{(\w+):([\w-]+)(?::(\w+))?\}/g, (_, kind: string, a: string, b?: string) => {
    switch (kind) {
      case 'due':
        return fmtShort(state.dues[a as AssessmentKey])
      case 'dueday':
        return fmtDay(state.dues[a as AssessmentKey])
      case 'duerel':
        return fmtRelativeDays(state.dues[a as AssessmentKey])
      case 'defense': {
        const t = state.teams.find((x) => x.id === a)
        return t?.defense ? `${fmtDay(t.defense.start)} at ${fmtTime(t.defense.start)}` : ''
      }
      case 'grade': {
        const g = teamAssessment(state, a, b as AssessmentKey).grade
        return g === null ? '–' : formatScore(g)
      }
      case 'final': {
        const f = teamFinal(state, a)
        return f === null ? '–' : formatScore(f)
      }
      default:
        return ''
    }
  })
}

export function nextId(state: DemoState, prefix: string): string {
  state.seq += 1
  return `${prefix}-${state.seq}`
}

export function dueOf(state: DemoState, key: AssessmentKey): string {
  return state.dues[key] ?? isoDay(assessmentDef(key).dueOffset)
}
