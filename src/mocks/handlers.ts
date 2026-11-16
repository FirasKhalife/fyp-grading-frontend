import { delay, http, HttpResponse, sse, type JsonBodyType } from 'msw'
import { ASSESSMENTS } from '@/domain/assessments'
import type { AssessmentKey, Criterion, Level, NotificationKind, Reviewer, ReviewerRole, Student } from '@/domain/types'
import { realNow, toIsoDateTime } from '@/lib/demo-clock'
import { parisToUtc, parisWall, utcToParis } from '@/lib/tz'
import type { DemoState } from './db'
import {
  assessmentDto,
  compositionDto,
  dueInstant,
  defenseSlot,
  lateFor,
  evaluationDto,
  finalState,
  historyDto,
  linkOf,
  person,
  personOrLabel,
  rubricDto,
  student,
  teamDto,
  teamRef,
  teamReviewers,
  type S,
} from './dto'
import * as logic from './logic'
import { DemoError } from './logic'
import * as store from './store'

/**
 * MSW handlers for every operation of contract/openapi.yaml, served from the visitor's demo copy.
 * Identity comes from the bearer token (mock tokens are "mock.<username>"), never from the body.
 */

const API = '*/api'

/* ---------- simulation switches for demos and tests: ?simulate=error|empty|slow ---------- */

type Simulation = 'none' | 'error' | 'empty' | 'slow'
let simulation: Simulation = 'none'
if (typeof window !== 'undefined') {
  const q = new URLSearchParams(window.location.search).get('simulate')
  if (q === 'error' || q === 'empty' || q === 'slow') simulation = q
}
export function setSimulation(s: Simulation) {
  simulation = s
}
let latency = import.meta.env.MODE === 'test' ? 0 : 200
export function setMockLatency(ms: number) {
  latency = ms
}

/* ---------- problems ---------- */

function problem(status: number, code: string, detail: string, extra: Record<string, unknown> = {}) {
  return HttpResponse.json(
    { type: `https://assay.dev/problems/${code}`, title: code.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()), status, code, detail, ...extra } as JsonBodyType,
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )
}

class Problem extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(message)
  }
}

/* ---------- identity and session ---------- */

type User = { kind: 'reviewer'; r: Reviewer } | { kind: 'student'; s: Student }

function usernameOf(email: string) {
  return email.split('@')[0]!
}

function identify(request: Request, state: DemoState): User {
  const auth = request.headers.get('Authorization') ?? ''
  const m = auth.match(/^Bearer mock\.(.+)$/)
  if (!m) throw new Problem(401, 'unauthenticated', 'Sign in again.')
  const username = m[1]!
  const r = state.reviewers.find((x) => usernameOf(x.email) === username)
  if (r) return { kind: 'reviewer', r }
  const s = state.students.find((x) => usernameOf(x.email) === username)
  if (s) return { kind: 'student', s }
  throw new Problem(401, 'unauthenticated', 'Unknown user. Sign in again.')
}

function sessionOf(request: Request): string {
  const id = request.headers.get('X-Demo-Session') ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(id) && !/^[a-z0-9]{12,}$/i.test(id)) throw new Problem(400, 'demo-session-required', 'The X-Demo-Session header is missing.')
  if (id !== store.demoSessionId()) store.selectSession(id)
  return id
}

function requireCopy() {
  if (!store.hasCopy()) throw new Problem(404, 'demo-session-not-found', 'Your demo copy was reset. Pick a role to start a fresh one.')
}

const isAdmin = (u: User) => u.kind === 'reviewer' && u.r.isAdmin
const userId = (u: User) => (u.kind === 'reviewer' ? u.r.id : u.s.id)

function requireAdmin(u: User) {
  if (!isAdmin(u)) throw new Problem(403, 'forbidden', 'This is for coordinators.')
}
function requireReviewer(u: User): Reviewer {
  if (u.kind !== 'reviewer') throw new Problem(403, 'forbidden', 'This is for reviewers.')
  return u.r
}
function requireStudent(u: User): Student {
  if (u.kind !== 'student') throw new Problem(403, 'forbidden', 'This is for students.')
  return u.s
}

function code(v: string | readonly string[] | undefined): AssessmentKey {
  const c = String(v) as AssessmentKey
  if (!ASSESSMENTS.some((a) => a.key === c)) throw new Problem(404, 'not-found', 'Unknown assessment.')
  return c
}

type Ctx = { request: Request; params: Record<string, string | readonly string[] | undefined>; user: User; read: () => DemoState }

/** Wraps a resolver with session, auth, latency, simulation and error mapping. */
function route(fn: (c: Ctx) => Response | Promise<Response>, opts: { write?: boolean; needsCopy?: boolean } = {}) {
  return async ({ request, params }: { request: Request; params: Record<string, string | readonly string[] | undefined> }) => {
    await delay(simulation === 'slow' ? 2500 : latency)
    try {
      sessionOf(request)
      if (opts.needsCopy !== false) requireCopy()
      const user = identify(request, store.getState())
      const path = new URL(request.url).pathname
      if (simulation === 'error' && !opts.write && path !== '/api/me' && !path.startsWith('/api/demo') && !path.startsWith('/api/notifications')) {
        throw new Problem(503, 'service-unavailable', "The server didn't respond.")
      }
      return await fn({ request, params, user, read: () => store.getState() })
    } catch (e) {
      if (e instanceof Problem) return problem(e.status, e.code, e.message, e.extra)
      if (e instanceof DemoError) return problem(e.status, e.code, e.message)
      throw e
    }
  }
}

const json = (body: unknown, status = 200) => HttpResponse.json(body as JsonBodyType, { status })
const page = <T,>(content: T[], number = 0, size = 100) => ({
  content,
  page: { size, number, totalElements: content.length, totalPages: content.length ? 1 : 0 },
})

function demoSessionDto(): S<'DemoSession'> {
  const s = store.getState()
  const wall = parisWall(realNow())
  const tomorrow = new Date(wall.getFullYear(), wall.getMonth(), wall.getDate() + 1)
  return {
    id: store.demoSessionId(),
    createdAt: s.createdAt,
    resetsAt: parisToUtc(toIsoDateTime(tomorrow)),
    today: toIsoDateTime(wall).slice(0, 10),
    timeZone: 'Europe/Paris',
  }
}

/* ---------- mapping helpers for the app's kinds ---------- */

function notificationType(kind: NotificationKind, text: string): S<'NotificationType'> {
  switch (kind) {
    case 'due':
      return /overdue/i.test(text) ? 'OVERDUE' : 'DUE_SOON'
    case 'schedule':
      return 'DEFENSE_SCHEDULED'
    case 'final':
      return /final grade/i.test(text) ? 'FINAL_GRADE_COMPUTED' : 'GRADE_FINAL'
    case 'team':
      return 'ASSIGNED'
    case 'release':
      return 'RESULTS_RELEASED'
  }
}

function activityKind(kind: DemoState['activity'][number]['kind'], text: string): S<'ActivityEntry'>['kind'] {
  switch (kind) {
    case 'submit':
      return 'SUBMITTED'
    case 'edit':
      return 'LEVEL_CHANGED'
    case 'schedule':
      return 'SCHEDULE'
    case 'final':
      return /final grade/i.test(text) ? 'FINAL_GRADE_COMPUTED' : 'GRADE_FINAL'
    case 'release':
      return 'RELEASED'
  }
}

function notificationDto(n: DemoState['notifications'][string][number]): S<'Notification'> {
  return { id: n.id, type: notificationType(n.kind, n.text), text: n.text, createdAt: parisToUtc(n.at), read: n.read, link: linkOf(n.href) }
}

function activityDto(state: DemoState, a: DemoState['activity'][number]): S<'ActivityEntry'> {
  return { id: a.id, kind: activityKind(a.kind, a.text), actor: personOrLabel(state, a.who), text: a.text, at: parisToUtc(a.at) }
}

/** Contract draft body → the mock's full-state patch. */
function draftPatch(body: S<'EvaluationDraft'> | null): logic.DraftPatch {
  if (!body) return {}
  const levels: Record<string, Level | null> = {}
  const comments: Record<string, string> = {}
  for (const c of body.criteria ?? []) {
    if ('level' in c) levels[c.criterionId] = (c.level ?? null) as Level | null
    if ('comment' in c) comments[c.criterionId] = c.comment ?? ''
  }
  return { levels, comments, overallComment: body.overallComment ?? undefined }
}

async function body<T>(request: Request): Promise<T | null> {
  const text = await request.text()
  if (!text) return null
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Problem(400, 'validation-failed', 'The request body is not valid JSON.')
  }
}

/* ---------- handlers ---------- */

export const handlers = [
  // Demo
  http.get(`${API}/demo/personas`, async () => {
    await delay(latency)
    const p = (key: string, username: string, displayName: string, roleLabel: string, roles: S<'UserRole'>[], tryThings: string[]) => ({
      key,
      username,
      displayName,
      roleLabel,
      roles,
      tryThings,
    })
    return json([
      p('coordinator', 'rania.haddad', 'Rania Haddad', 'Coordinator', ['ADMIN', 'REVIEWER'], ['Release the advisor assessment results', 'Fix the defense conflict on day 3', "Open Team Beta's reviewer spread"]),
      p('jury', 'jane.smith', 'Jane Smith', 'Jury member', ['REVIEWER'], ['Finish the Team Beta final report draft', "Grade Team Epsilon's final presentation"]),
      p('advisor', 'karim.nassar', 'Karim Nassar', 'Advisor', ['REVIEWER'], ['Submit the overdue advisor assessment for Team Delta']),
      p('student', 'nour.khoury', 'Nour Khoury', 'Student', ['STUDENT'], ["Read the jury's comments on your final presentation"]),
    ])
  }),
  http.get(`${API}/demo/session`, route(() => json(demoSessionDto()))),
  http.put(
    `${API}/demo/session`,
    route(
      () => {
        if (store.hasCopy()) return json(demoSessionDto(), 200)
        store.createCopy()
        return json(demoSessionDto(), 201)
      },
      { needsCopy: false, write: true },
    ),
  ),
  http.post(
    `${API}/demo/session/reset`,
    route(
      async () => {
        await delay(latency ? 1200 : 0)
        store.resetCopy()
        return json(demoSessionDto())
      },
      { needsCopy: false, write: true },
    ),
  ),

  // Me
  http.get(
    `${API}/me`,
    route(({ user }) => {
      const p = user.kind === 'reviewer' ? user.r : user.s
      const personas: Record<string, NonNullable<S<'Me'>['personaKey']>> = { 'r-rania': 'coordinator', 'r-jane': 'jury', 'r-karim': 'advisor', 's-nour': 'student' }
      const persona = personas[p.id] ?? null
      return json({
        ...person(p),
        email: p.email,
        roles: user.kind === 'student' ? ['STUDENT'] : user.r.isAdmin ? ['ADMIN', 'REVIEWER'] : ['REVIEWER'],
        personaKey: persona,
        studentTeamId: user.kind === 'student' ? user.s.teamId : null,
      } satisfies S<'Me'>)
    }),
  ),
  http.get(
    `${API}/me/assignments`,
    route(({ user, read }) => {
      const r = requireReviewer(user)
      const state = read()
      if (simulation === 'empty') return json({ summary: { expected: 0, submitted: 0, drafts: 0, overdue: 0 }, teams: [] })
      const v = logic.myTeamsView(state, r.id)
      const body: S<'MyAssignments'> = {
        summary: { expected: v.summary.expected, submitted: v.summary.submitted, drafts: v.summary.drafts, overdue: v.summary.overdue },
        teams: v.cards.map((c) => ({
          team: teamRef(c.team),
          role: c.role,
          reviewers: teamReviewers(state, c.team),
          defenseSlot: defenseSlot(state, c.team),
          tasks: c.rows.map((row) => {
            const e = state.evaluations.find((x) => x.teamId === c.team.id && x.assessment === row.assessment.key && x.reviewerId === r.id) ?? null
            return {
              assessment: row.assessment.key,
              name: row.assessment.name,
              weight: row.assessment.weight,
              dueAt: dueInstant(row.assessment.due),
              status: row.state,
              overdue: row.overdue,
              score: row.score === null ? null : Math.round(row.score * 10) / 10,
              scoredCount: row.scored,
              criteriaCount: row.total,
              evaluationId: e?.id ?? null,
              updatedAt: e ? parisToUtc(e.updatedAt) : null,
              submittedAt: e?.submittedAt ? parisToUtc(e.submittedAt) : null,
              submittedLate: lateFor(e?.submittedAt, row.assessment.due),
            }
          }),
        })),
      }
      return json(body)
    }),
  ),
  http.get(
    `${API}/me/team`,
    route(({ user, read }) => {
      const s = requireStudent(user)
      const state = read()
      const v = logic.studentHomeView(state, s.id)
      const body: S<'StudentHome'> = {
        team: { ...teamRef(v.team), description: v.team.description || null },
        me: student(v.me),
        teammates: v.teammates.filter((x) => x.id !== v.me.id).map(student),
        reviewers: teamReviewers(state, v.team),
        defenseSlot: defenseSlot(state, v.team),
        timeline: v.results.map((r) => ({
          assessment: r.assessment.key,
          name: r.assessment.name,
          weight: r.assessment.weight,
          dueAt: dueInstant(r.assessment.due),
          status: r.state === 'RELEASED' || r.state === 'GRADED' ? 'GRADED' : r.state,
          released: r.released,
          releasedAt: r.release ? parisToUtc(r.release.at) : null,
          grade: r.grade === null ? null : Math.round(r.grade * 10) / 10,
        })),
        finalGradeVisible: v.final !== null,
        finalGrade: v.final === null ? null : Math.round(v.final * 10) / 10,
      }
      return json(body)
    }),
  ),
  http.get(
    `${API}/me/team/results/:assessment`,
    route(({ user, read, params }) => {
      const s = requireStudent(user)
      const key = code(params.assessment)
      const v = logic.studentHomeView(read(), s.id)
      const r = v.results.find((x) => x.assessment.key === key)!
      if (!r.released || r.grade === null) throw new Problem(404, 'results-not-released', 'Results will appear here once the coordinator releases them.')
      const body: S<'ReleasedResults'> = {
        assessment: key,
        name: r.assessment.name,
        weight: r.assessment.weight,
        grade: Math.round(r.grade * 10) / 10,
        releasedAt: parisToUtc(r.release!.at),
        reviewers: r.reviewers.map((x) => ({
          reviewer: person(read().reviewers.find((y) => y.id === x.reviewer.id)!),
          score: Math.round((x.score ?? 0) * 10) / 10,
          overallComment: r.overall.find((o) => o.reviewer.id === x.reviewer.id)?.text ?? null,
        })),
        criteria: r.criteria.map((c) => ({
          criterionId: c.criterion.id,
          name: c.criterion.name,
          weight: c.criterion.weight,
          levels: c.levels.map((l) => ({
            reviewerId: l.reviewer.id,
            level: (l.level ?? 0) as Level,
            comment: c.comments.find((q) => q.reviewer.id === l.reviewer.id)?.text ?? null,
          })),
        })),
      }
      return json(body)
    }),
  ),

  // Assessments
  http.get(`${API}/assessments`, route(({ read }) => json(ASSESSMENTS.map((a) => assessmentDto(read(), a.key))))),
  http.patch(
    `${API}/assessments/:assessment`,
    route(
      async ({ user, request, params }) => {
        requireAdmin(user)
        const key = code(params.assessment)
        const b = await body<S<'AssessmentPatch'>>(request)
        if (!b?.dueAt) throw new Problem(400, 'validation-failed', 'Pick a due date.', { errors: [{ field: 'dueAt', message: 'is required' }] })
        store.mutate((s) => logic.setDue(s, key, utcToParis(b.dueAt).slice(0, 10)))
        return json(assessmentDto(store.getState(), key))
      },
      { write: true },
    ),
  ),
  http.post(
    `${API}/assessments/:assessment/release`,
    route(
      ({ user, params }) => {
        requireAdmin(user)
        const key = code(params.assessment)
        const before = store.getState()
        const already = before.releases.filter((r) => r.assessment === key).map((r) => r.teamId)
        const notFinal = before.teams.filter((t) => logic.teamAssessment(before, t.id, key).grade === null).map((t) => t.id)
        const out = store.mutate((s) => logic.releaseAssessment(s, key))
        return json({
          assessment: key,
          releasedAt: new Date().toISOString(),
          releasedTeamIds: out.released.map((t) => t.id),
          alreadyReleasedTeamIds: already,
          notFinalTeamIds: notFinal,
        } satisfies S<'ReleaseResult'>)
      },
      { write: true },
    ),
  ),

  // Overview
  http.get(
    `${API}/overview`,
    route(({ user, read }) => {
      requireAdmin(user)
      const state = read()
      const teams = simulation === 'empty' ? [] : [...state.teams].sort((a, b) => a.name.localeCompare(b.name))
      const rows: S<'OverviewRow'>[] = teams.map((t) => {
        const cells = ASSESSMENTS.map((a) => {
          const i = logic.teamAssessment(state, t.id, a.key)
          return {
            assessment: a.key,
            state: i.release ? 'RELEASED' : i.grade !== null ? 'FINAL' : i.submitted > 0 ? 'WAITING' : 'NOT_STARTED',
            grade: i.grade === null ? null : Math.round(i.grade * 10) / 10,
            submittedCount: i.submitted,
            expectedCount: i.expected,
            draftCount: i.reviewers.filter((r) => r.state === 'DRAFT').length,
            overdue: i.overdue,
            spread: i.spread === null ? null : Math.round(i.spread * 10) / 10,
            releasedAt: i.release ? parisToUtc(i.release.at) : null,
          } satisfies S<'OverviewCell'>
        })
        const fin = logic.teamFinal(state, t.id)
        return {
          team: teamRef(t),
          cells,
          finalGrade: fin === null ? null : Math.round(fin * 10) / 10,
          finalState: finalState(state, t.id),
          pendingEvaluations: cells.reduce((s, c) => s + (c.expectedCount - c.submittedCount), 0),
          composition: compositionDto(t),
          defenseSlot: defenseSlot(state, t),
        }
      })
      const v = logic.overviewView(state)
      return json({
        kpis: {
          evaluationsSubmitted: simulation === 'empty' ? 0 : v.kpis.submitted,
          evaluationsExpected: simulation === 'empty' ? 0 : v.kpis.expected,
          overdue: simulation === 'empty' ? 0 : v.kpis.overdue.count,
          finalGradesComputed: simulation === 'empty' ? 0 : v.kpis.finals.count,
          teamCount: rows.length,
          resultsReleased: simulation === 'empty' ? 0 : state.releases.length,
          resultsReleasable: v.releases.reduce((s, r) => s + r.pendingTeams.length, 0),
          averageFinalGrade: v.kpis.average === null || simulation === 'empty' ? null : Math.round(v.kpis.average * 10) / 10,
        },
        assessments: ASSESSMENTS.map((a) => assessmentDto(state, a.key)),
        teams: rows,
      } satisfies S<'Overview'>)
    }),
  ),
  http.get(
    `${API}/overview/export`,
    route(({ user, read }) => {
      requireAdmin(user)
      const state = read()
      const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
      const head = ['team', 'project title', ...ASSESSMENTS.map((a) => a.name), 'final grade', 'final state']
      const lines = state.teams.map((t) =>
        [
          t.name,
          t.projectTitle,
          ...ASSESSMENTS.map((a) => {
            const g = logic.teamAssessment(state, t.id, a.key).grade
            return g === null ? '' : (Math.round(g * 10) / 10).toFixed(1)
          }),
          (() => {
            const f = logic.teamFinal(state, t.id)
            return f === null ? '' : (Math.round(f * 10) / 10).toFixed(1)
          })(),
          finalState(state, t.id),
        ]
          .map(esc)
          .join(','),
      )
      return new HttpResponse([head.join(','), ...lines].join('\n'), {
        headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="assay-results.csv"' },
      })
    }),
  ),

  // Teams and people
  http.get(
    `${API}/teams`,
    route(({ user, read }) => {
      requireAdmin(user)
      const state = read()
      const teams = simulation === 'empty' ? [] : [...state.teams].sort((a, b) => a.name.localeCompare(b.name))
      return json(
        page(
          teams.map((t) => ({
            ...teamRef(t),
            studentCount: state.students.filter((s) => s.teamId === t.id).length,
            composition: compositionDto(t),
            finalGrade: (() => {
              const f = logic.teamFinal(state, t.id)
              return f === null ? null : Math.round(f * 10) / 10
            })(),
            finalState: finalState(state, t.id),
          })),
        ),
      )
    }),
  ),
  http.post(
    `${API}/teams`,
    route(
      async ({ user, request }) => {
        requireAdmin(user)
        const b = await body<S<'TeamCreate'>>(request)
        if (!b?.name?.trim() || !b.projectTitle?.trim()) {
          throw new Problem(400, 'validation-failed', 'Give the team a name and a project title.', {
            errors: [!b?.name?.trim() && { field: 'name', message: 'is required' }, !b?.projectTitle?.trim() && { field: 'projectTitle', message: 'is required' }].filter(Boolean),
          })
        }
        const t = store.mutate((s) => {
          const t = logic.createTeam(s, b.name, b.projectTitle)
          if (b.description) logic.updateTeam(s, t.id, { description: b.description })
          return t
        })
        return HttpResponse.json(teamDto(store.getState(), t.id) as JsonBodyType, { status: 201, headers: { Location: `/api/teams/${t.id}` } })
      },
      { write: true },
    ),
  ),
  http.get(
    `${API}/teams/:teamId`,
    route(({ user, read, params }) => {
      const state = read()
      const t = logic.team(state, String(params.teamId))
      if (!isAdmin(user) && !(user.kind === 'reviewer' && t.members.some((m) => m.reviewerId === user.r.id))) throw new Problem(403, 'forbidden', 'This team is not yours.')
      return json(teamDto(state, t.id, isAdmin(user)))
    }),
  ),
  http.patch(
    `${API}/teams/:teamId`,
    route(
      async ({ user, request, params }) => {
        requireAdmin(user)
        const b = (await body<S<'TeamPatch'>>(request)) ?? {}
        const id = String(params.teamId)
        store.mutate((s) => {
          if (b.name && s.teams.some((t) => t.id !== id && t.name.toLowerCase() === b.name!.trim().toLowerCase())) {
            throw new DemoError(409, `There is already a Team ${b.name.trim()}.`, 'team-name-taken')
          }
          logic.updateTeam(s, id, { name: b.name, projectTitle: b.projectTitle, description: b.description ?? undefined })
        })
        return json(teamDto(store.getState(), id))
      },
      { write: true },
    ),
  ),
  http.delete(
    `${API}/teams/:teamId`,
    route(
      ({ user, params }) => {
        requireAdmin(user)
        store.mutate((s) => {
          logic.team(s, String(params.teamId))
          logic.deleteTeam(s, String(params.teamId))
        })
        return new HttpResponse(null, { status: 204 })
      },
      { write: true },
    ),
  ),
  http.get(
    `${API}/teams/:teamId/students`,
    route(({ user, read, params }) => {
      requireAdmin(user)
      const state = read()
      logic.team(state, String(params.teamId))
      return json(
        state.students
          .filter((s) => s.teamId === params.teamId)
          .sort((a, b) => a.lastName.localeCompare(b.lastName))
          .map(student),
      )
    }),
  ),
  http.post(
    `${API}/teams/:teamId/students`,
    route(
      async ({ user, request, params }) => {
        requireAdmin(user)
        const b = await body<S<'StudentCreate'>>(request)
        const id = String(params.teamId)
        const created = store.mutate((s) => {
          if (s.students.some((x) => x.email.toLowerCase() === b?.email?.toLowerCase())) {
            throw new DemoError(409, 'That email is already on a team.', 'student-email-taken')
          }
          logic.addStudent(s, id, b?.firstName ?? '', b?.lastName ?? '', b?.email ?? '')
          return s.students[s.students.length - 1]!
        })
        return HttpResponse.json(student(created) as JsonBodyType, { status: 201, headers: { Location: `/api/teams/${id}/students/${created.id}` } })
      },
      { write: true },
    ),
  ),
  http.patch(
    `${API}/teams/:teamId/students/:studentId`,
    route(
      async ({ user, request, params }) => {
        requireAdmin(user)
        const b = (await body<S<'StudentPatch'>>(request)) ?? {}
        const updated = store.mutate((s) => {
          const st = s.students.find((x) => x.id === params.studentId && x.teamId === params.teamId)
          if (!st) throw new DemoError(404, 'Student not found')
          if (b.teamId) logic.team(s, b.teamId)
          Object.assign(st, Object.fromEntries(Object.entries(b).filter(([, v]) => v !== undefined)))
          return st
        })
        return json(student(updated))
      },
      { write: true },
    ),
  ),
  http.delete(
    `${API}/teams/:teamId/students/:studentId`,
    route(
      ({ user, params }) => {
        requireAdmin(user)
        store.mutate((s) => {
          if (!s.students.some((x) => x.id === params.studentId && x.teamId === params.teamId)) throw new DemoError(404, 'Student not found')
          logic.removeStudent(s, String(params.studentId))
        })
        return new HttpResponse(null, { status: 204 })
      },
      { write: true },
    ),
  ),
  http.get(
    `${API}/teams/:teamId/reviewers`,
    route(({ user, read, params }) => {
      const state = read()
      const t = logic.team(state, String(params.teamId))
      if (!isAdmin(user) && !(user.kind === 'reviewer' && t.members.some((m) => m.reviewerId === user.r.id))) throw new Problem(403, 'forbidden', 'This team is not yours.')
      return json({ reviewers: teamReviewers(state, t), composition: compositionDto(t) } satisfies S<'TeamReviewers'>)
    }),
  ),
  http.put(
    `${API}/teams/:teamId/reviewers`,
    route(
      async ({ user, request, params }) => {
        requireAdmin(user)
        const b = await body<S<'TeamReviewersPut'>>(request)
        const id = String(params.teamId)
        const next = b?.assignments ?? []
        store.mutate((s) => {
          const t = logic.team(s, id)
          const problems: S<'CompositionProblem'>[] = []
          if (next.length === 0) problems.push({ code: 'NO_REVIEWERS', message: 'Needs at least 1 reviewer.' })
          if (next.length > 5) problems.push({ code: 'TOO_MANY_REVIEWERS', message: 'A team can have at most 5 reviewers.' })
          if (!next.some((a) => a.role === 'JURY')) problems.push({ code: 'NO_JURY', message: 'Needs at least 1 jury member.' })
          if (!next.some((a) => a.role === 'ADVISOR')) problems.push({ code: 'NO_ADVISOR', message: 'Needs at least 1 advisor.' })
          if (new Set(next.map((a) => a.reviewerId)).size !== next.length) problems.push({ code: 'DUPLICATE_REVIEWER', message: 'A reviewer is listed twice.' })
          if (next.some((a) => !s.reviewers.some((r) => r.id === a.reviewerId))) problems.push({ code: 'UNKNOWN_REVIEWER', message: 'Unknown reviewer.' })
          if (problems.length) throw new Problem(422, 'composition-invalid', problems.map((p) => p.message).join(' '), { problems })
          for (const m of t.members) {
            const after = next.find((a) => a.reviewerId === m.reviewerId)
            const submitted = s.evaluations.some((e) => e.teamId === id && e.reviewerId === m.reviewerId && e.status === 'SUBMITTED')
            if (submitted && (!after || after.role !== m.role)) {
              const r = s.reviewers.find((x) => x.id === m.reviewerId)!
              throw new DemoError(409, `${r.firstName} ${r.lastName} has submitted evaluations for this team, so they stay on it with the same role.`, 'reviewer-has-submissions')
            }
          }
          const added = next.filter((a) => !t.members.some((m) => m.reviewerId === a.reviewerId))
          const removed = t.members.filter((m) => !next.some((a) => a.reviewerId === m.reviewerId))
          t.members = next.map((a) => ({ reviewerId: a.reviewerId, role: a.role as ReviewerRole }))
          s.evaluations = s.evaluations.filter((e) => !(e.teamId === id && removed.some((r) => r.reviewerId === e.reviewerId)))
          for (const a of added) {
            ;(s.notifications[a.reviewerId] ??= []).unshift({
              id: logic.nextNotificationId(s),
              kind: 'team',
              text: `You were assigned to Team ${t.name} as ${a.role === 'JURY' ? 'a jury member' : 'the advisor'}.`,
              at: toIsoDateTime(parisWall(realNow())),
              href: '/my-teams',
              read: false,
            })
          }
        })
        const t = logic.team(store.getState(), id)
        return json({ reviewers: teamReviewers(store.getState(), t), composition: compositionDto(t) } satisfies S<'TeamReviewers'>)
      },
      { write: true },
    ),
  ),
  http.put(
    `${API}/teams/:teamId/defense-slot`,
    route(
      async ({ user, request, params }) => {
        requireAdmin(user)
        const b = await body<S<'DefenseSlotPut'>>(request)
        if (!b?.startsAt || !b.room) throw new Problem(400, 'validation-failed', 'Pick a start time and a room.')
        const id = String(params.teamId)
        store.mutate((s) => {
          logic.moveDefense(s, id, utcToParis(b.startsAt), b.room)
          const t = logic.team(s, id)
          if (t.defense && b.durationMinutes) t.defense.minutes = b.durationMinutes
        })
        const state = store.getState()
        return json(defenseSlot(state, logic.team(state, id)))
      },
      { write: true },
    ),
  ),
  http.delete(
    `${API}/teams/:teamId/defense-slot`,
    route(
      ({ user, params }) => {
        requireAdmin(user)
        store.mutate((s) => {
          logic.team(s, String(params.teamId)).defense = null
        })
        return new HttpResponse(null, { status: 204 })
      },
      { write: true },
    ),
  ),
  http.get(
    `${API}/reviewers`,
    route(({ user, read }) => {
      requireAdmin(user)
      const state = read()
      return json(
        page(
          [...state.reviewers]
            .sort((a, b) => a.lastName.localeCompare(b.lastName))
            .map((r) => ({ ...person(r), coordinator: r.isAdmin, teamCount: state.teams.filter((t) => t.members.some((m) => m.reviewerId === r.id)).length })),
        ),
      )
    }),
  ),

  // Schedule
  http.get(
    `${API}/schedule`,
    route(({ user, read }) => {
      const state = read()
      const v = logic.scheduleView(state, { id: userId(user), kind: isAdmin(user) ? 'admin' : user.kind === 'student' ? 'student' : 'reviewer' })
      const body: S<'Schedule'> = {
        timeZone: 'Europe/Paris',
        defenseDays: v.days,
        dueDates: ASSESSMENTS.map((a) => ({ assessment: a.key, name: a.name, dueAt: dueInstant(state.dues[a.key]) })),
        slots: v.slots.map((s) => defenseSlot(state, s.team)!),
        conflicts: v.conflicts.map((c) => ({
          reviewer: person(state.reviewers.find((r) => r.id === c.reviewer.id)!),
          startsAt: parisToUtc(c.start),
          teams: c.teams.map(teamRef),
        })),
      }
      return json(body)
    }),
  ),

  // Evaluations
  http.get(
    `${API}/my-evaluations/:teamId/:assessment`,
    route(({ user, read, params }) => {
      const r = requireReviewer(user)
      const key = code(params.assessment)
      const v = logic.gradingView(read(), r.id, String(params.teamId), key)
      return json(evaluationDto(read(), v.team.id, key, r.id, v.evaluation))
    }),
  ),
  http.put(
    `${API}/my-evaluations/:teamId/:assessment`,
    route(
      async ({ user, request, params }) => {
        const r = requireReviewer(user)
        const key = code(params.assessment)
        const b = await body<S<'EvaluationDraft'>>(request)
        if (!b?.criteria) throw new Problem(400, 'validation-failed', 'Send every criterion of the form.')
        const e = store.mutate((s) => logic.saveDraft(s, r.id, String(params.teamId), key, draftPatch(b)))
        return json(evaluationDto(store.getState(), String(params.teamId), key, r.id, e))
      },
      { write: true },
    ),
  ),
  http.post(
    `${API}/my-evaluations/:teamId/:assessment/submit`,
    route(
      async ({ user, request, params }) => {
        const r = requireReviewer(user)
        const key = code(params.assessment)
        const teamId = String(params.teamId)
        const b = await body<S<'EvaluationDraft'>>(request)
        const existing = logic.gradingView(store.getState(), r.id, teamId, key).evaluation
        if (existing?.status === 'SUBMITTED') return json(evaluationDto(store.getState(), teamId, key, r.id, existing))
        try {
          const e = store.mutate((s) => {
            if (b) logic.saveDraft(s, r.id, teamId, key, draftPatch(b))
            return logic.submitEvaluation(s, r.id, teamId, key)
          })
          return json(evaluationDto(store.getState(), teamId, key, r.id, e))
        } catch (x) {
          if (x instanceof DemoError && x.code === 'criteria-unscored') {
            const st = store.getState()
            const ev = logic.gradingView(st, r.id, teamId, key)
            const missing = ev.rubric.criteria.filter((c) => (b?.criteria.find((y) => y.criterionId === c.id)?.level ?? ev.evaluation?.levels[c.id] ?? null) === null)
            throw new Problem(422, 'criteria-unscored', x.message, { errors: missing.map((c) => ({ field: `criteria[${c.id}].level`, message: 'must be scored' })) })
          }
          throw x
        }
      },
      { write: true },
    ),
  ),
  http.get(
    `${API}/evaluations`,
    route(({ user, read, request }) => {
      const url = new URL(request.url)
      const teamId = url.searchParams.get('teamId') ?? ''
      const key = code(url.searchParams.get('assessment') ?? '')
      const state = read()
      const t = logic.team(state, teamId)
      const info = logic.teamAssessment(state, teamId, key)
      let list = state.evaluations.filter((e) => e.teamId === teamId && e.assessment === key)
      if (!isAdmin(user)) {
        if (!(user.kind === 'reviewer' && t.members.some((m) => m.reviewerId === user.r.id))) throw new Problem(403, 'forbidden', 'This team is not yours.')
        list = info.grade === null ? [] : list.filter((e) => e.status === 'SUBMITTED')
      }
      return json(list.map((e) => evaluationDto(state, teamId, key, e.reviewerId, e)))
    }),
  ),
  http.get(
    `${API}/evaluations/:evaluationId/history`,
    route(({ user, read, params }) => {
      requireAdmin(user)
      const state = read()
      const e = state.evaluations.find((x) => x.id === params.evaluationId)
      if (!e) throw new Problem(404, 'not-found', 'Evaluation not found.')
      return json(historyDto(state, e))
    }),
  ),

  // Rubrics
  http.get(`${API}/rubrics`, route(({ read }) => json(ASSESSMENTS.map((a) => rubricDto(read(), a.key))))),
  http.get(`${API}/rubrics/:assessment`, route(({ read, params }) => json(rubricDto(read(), code(params.assessment))))),
  http.put(
    `${API}/rubrics/:assessment`,
    route(
      async ({ user, request, params }) => {
        requireAdmin(user)
        const key = code(params.assessment)
        const b = await body<S<'RubricPut'>>(request)
        const criteria: Criterion[] = (b?.criteria ?? []).map((c) => ({
          id: c.id ?? '',
          name: c.name,
          weight: c.weight,
          descriptions: [c.descriptions['1'], c.descriptions['2'], c.descriptions['3'], c.descriptions['4']],
        }))
        store.mutate((s) => logic.saveRubric(s, key, criteria))
        return json(rubricDto(store.getState(), key))
      },
      { write: true },
    ),
  ),

  // Notifications
  http.get(
    `${API}/notifications`,
    route(({ user, read, request }) => {
      const url = new URL(request.url)
      const onlyUnread = url.searchParams.get('unread') === 'true'
      const v = logic.notificationsView(read(), userId(user))
      const items = (onlyUnread ? v.items.filter((n) => !n.read) : v.items).map(notificationDto)
      return json({ ...page(items), unreadCount: v.unread } satisfies S<'NotificationPage'>)
    }),
  ),
  http.patch(
    `${API}/notifications/:notificationId`,
    route(
      async ({ user, request, params }) => {
        const b = await body<{ read: boolean }>(request)
        const n = store.mutate((s) => {
          const item = (s.notifications[userId(user)] ?? []).find((x) => x.id === params.notificationId)
          if (!item) throw new DemoError(404, 'Notification not found')
          item.read = b?.read ?? true
          return item
        })
        return json(notificationDto(n))
      },
      { write: true },
    ),
  ),
  http.post(
    `${API}/notifications/read-all`,
    route(
      ({ user }) => {
        store.mutate((s) => logic.markRead(s, userId(user), 'all'))
        return new HttpResponse(null, { status: 204 })
      },
      { write: true },
    ),
  ),
  // jsdom has no EventSource: tests get an open, silent stream instead.
  typeof EventSource === 'undefined'
    ? http.get(`${API}/notifications/stream`, () => new HttpResponse(new ReadableStream({ start() {} }), { headers: { 'Content-Type': 'text/event-stream' } }))
    : sse(`${API}/notifications/stream`, ({ client, request }) => {
    let user: User
    try {
      sessionOf(request)
      user = identify(request, store.getState())
    } catch {
      client.error()
      return
    }
    const id = userId(user)
    const admin = isAdmin(user)
    const seenN = new Set((store.getState().notifications[id] ?? []).map((n) => n.id))
    const seenA = new Set(store.getState().activity.map((a) => a.id))
    let unread = logic.notificationsView(store.getState(), id).unread
    const off = store.subscribe(() => {
      if (!store.hasCopy()) return
      const state = store.getState()
      for (const n of [...(state.notifications[id] ?? [])].reverse()) {
        if (seenN.has(n.id)) continue
        seenN.add(n.id)
        client.send({ event: 'notification', id: n.id, data: JSON.stringify(notificationDto(n)) } as never)
      }
      if (admin) {
        for (const a of [...state.activity].reverse()) {
          if (seenA.has(a.id)) continue
          seenA.add(a.id)
          client.send({ event: 'activity', id: a.id, data: JSON.stringify(activityDto(state, a)) } as never)
        }
      }
      const u = logic.notificationsView(state, id).unread
      if (u !== unread) {
        unread = u
        client.send({ event: 'unread-count', data: JSON.stringify({ unreadCount: u }) } as never)
      }
    })
    request.signal.addEventListener('abort', off)
  }),
  http.get(
    `${API}/activity`,
    route(({ user, read }) => {
      requireAdmin(user)
      const state = read()
      const items = simulation === 'empty' ? [] : [...state.activity].sort((a, b) => b.at.localeCompare(a.at)).map((a) => activityDto(state, a))
      return json(page(items))
    }),
  ),
]
