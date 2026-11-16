import { assessmentDef, assessmentSlug } from '@/domain/assessments'
import type {
  Activity,
  ActivityKind,
  AppNotification,
  Assessment,
  AssessmentKey,
  Criterion,
  DefenseSlot,
  Evaluation,
  Level,
  NotificationKind,
  Reviewer,
  ReviewerRole,
  Rubric,
  Student,
  Team,
} from '@/domain/types'
import { now, parseLocal, setSessionToday } from '@/lib/demo-clock'
import { markCopyCreated, setBrowserDemoSessionId } from '@/auth/demo-session'
import { parisToUtc, utcToParis } from '@/lib/tz'
import { api, ApiError } from './client'
import type { components } from './schema'
import type {
  CompositionCheck,
  Conflict,
  EvalState,
  GradingView,
  GridRow,
  MyEvalRow,
  MyTeamsView,
  NotificationsView,
  OverviewView,
  PersonRef,
  ReleaseCandidate,
  RubricsView,
  ScheduleView,
  StudentHomeView,
  StudentResult,
  TeamAssessmentInfo,
  TeamDetailView,
  TeamsListView,
} from './views'

/**
 * The repository the screens use, built on contract/openapi.yaml (types in schema.d.ts). It maps the
 * API's DTOs onto the screens' read models. In the offline demo and in tests, MSW answers these calls
 * from the visitor's demo copy; against the real gateway, the Spring services do.
 */

type S<K extends keyof components['schemas']> = components['schemas'][K]

export interface Viewer {
  userId: string
  kind: 'admin' | 'reviewer' | 'student'
}

export interface DraftState {
  levels: Record<string, Level | null>
  comments: Record<string, string>
  overall: string
}

/* ---------- small mappers ---------- */

const wall = (instant: string) => utcToParis(instant)
const day = (instant: string) => utcToParis(instant).slice(0, 10)
const minutesBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60_000)

function ref(p: S<'Person'>): PersonRef {
  return { id: p.id, name: p.displayName, initials: p.initials }
}

function reviewerOf(p: S<'Person'>, isAdmin = false): Reviewer {
  return { id: p.id, firstName: p.firstName, lastName: p.lastName, email: p.email ?? '', isAdmin }
}

function studentOf(s: S<'Student'>): Student {
  return { id: s.id, firstName: s.firstName, lastName: s.lastName, email: s.email ?? '', teamId: s.teamId }
}

function slotOf(s: S<'DefenseSlot'> | null | undefined): DefenseSlot | null {
  return s ? { start: wall(s.startsAt), minutes: minutesBetween(s.startsAt, s.endsAt), room: s.room } : null
}

function teamOf(t: S<'TeamRef'> & { description?: string | null }, reviewers: S<'TeamReviewer'>[] = [], slot?: S<'DefenseSlot'> | null): Team {
  return {
    id: t.id,
    name: t.name,
    projectTitle: t.projectTitle,
    description: t.description ?? '',
    members: reviewers.map((r) => ({ reviewerId: r.reviewer.id, role: r.role })),
    defense: slotOf(slot),
  }
}

function assessmentOf(key: AssessmentKey, dueAt: string, weight?: number, role?: ReviewerRole): Assessment {
  const d = assessmentDef(key)
  return { key, name: d.name, shortName: d.shortName, weight: weight ?? d.weight, role: role ?? d.role, due: day(dueAt) }
}

function descriptionsOf(d: S<'LevelDescriptions'>): [string, string, string, string] {
  return [d['1'], d['2'], d['3'], d['4']]
}

function criterionOf(c: S<'Criterion'> | S<'EvaluatedCriterion'>): Criterion {
  return { id: 'id' in c ? c.id : c.criterionId, name: c.name, weight: c.weight, descriptions: descriptionsOf(c.descriptions) }
}

function evaluationOf(e: S<'Evaluation'>): Evaluation | null {
  if (!e.id || e.status === 'NOT_STARTED') return null
  return {
    id: e.id,
    teamId: e.teamId,
    assessment: e.assessment,
    reviewerId: e.reviewer.id,
    status: e.status,
    levels: Object.fromEntries(e.criteria.map((c) => [c.criterionId, (c.level ?? null) as Level | null])),
    comments: Object.fromEntries(e.criteria.filter((c) => c.comment).map((c) => [c.criterionId, c.comment!])),
    overallComment: e.overallComment ?? '',
    updatedAt: e.updatedAt ? wall(e.updatedAt) : wall(new Date().toISOString()),
    submittedAt: e.submittedAt ? wall(e.submittedAt) : null,
    history: [],
  }
}

function compositionOf(c: S<'Composition'>): CompositionCheck {
  const head = `${c.reviewerCount} of ${c.maxReviewers} reviewers · ${c.juryCount} jury · ${c.advisorCount} advisor${c.advisorCount === 1 ? '' : 's'}`
  return {
    ok: c.valid,
    total: c.reviewerCount,
    jury: c.juryCount,
    advisors: c.advisorCount,
    text: c.valid ? `${head}. Meets the team rules.` : `${head} · ${c.problems.map((p) => p.message.replace(/\.$/, '').replace(/^./, (x) => x.toLowerCase())).join(', ')}`,
  }
}

const NOTIF_KIND: Record<S<'NotificationType'>, NotificationKind> = {
  GRADE_FINAL: 'final',
  FINAL_GRADE_COMPUTED: 'final',
  RESULTS_RELEASED: 'release',
  DUE_SOON: 'due',
  OVERDUE: 'due',
  ASSIGNED: 'team',
  ROLE_CHANGED: 'team',
  DEFENSE_SCHEDULED: 'schedule',
}

const ACTIVITY_KIND: Record<S<'ActivityEntry'>['kind'], ActivityKind> = {
  SUBMITTED: 'submit',
  DRAFT_SAVED: 'edit',
  LEVEL_CHANGED: 'edit',
  SCHEDULE: 'schedule',
  GRADE_FINAL: 'final',
  FINAL_GRADE_COMPUTED: 'final',
  RELEASED: 'release',
  ASSIGNMENT: 'assignment',
}

/** The API's structured link, as a route for the signed-in role. */
export function hrefOf(link: S<'Link'>, v: Viewer): string {
  switch (link.kind) {
    case 'EVALUATION':
      return link.teamId && link.assessment ? `/grade/${link.teamId}/${assessmentSlug(link.assessment)}` : '/my-teams'
    case 'TEAM':
      return v.kind === 'admin' && link.teamId ? `/teams/${link.teamId}${link.assessment ? `#${link.assessment.toLowerCase()}` : ''}` : v.kind === 'student' ? '/student' : '/my-teams'
    case 'SCHEDULE':
      return '/schedule'
    case 'STUDENT_RESULTS':
      return '/student'
    case 'OVERVIEW':
      return v.kind === 'admin' ? '/overview' : '/my-teams'
    case 'MY_TEAMS':
      return '/my-teams'
  }
}

function evalState(s: S<'EvaluationStatus'>): EvalState {
  return s
}

/* ---------- team assessment (P5 cells, P6 rows) ---------- */

function teamAssessmentOf(t: S<'TeamAssessment'>, evaluations: Evaluation[] = [], draftScores: Record<string, number | null> = {}): TeamAssessmentInfo {
  const reviewers = t.reviewers.map((r) => {
    const e = evaluations.find((x) => x.reviewerId === r.reviewer.id) ?? null
    return {
      reviewer: ref(r.reviewer),
      state: evalState(r.status),
      submittedLate: r.submittedLate ?? false,
      score: r.status === 'SUBMITTED' ? (r.score ?? null) : r.evaluationId ? (draftScores[r.evaluationId] ?? null) : null,
      evaluation: e,
    }
  })
  return {
    assessment: assessmentOf(t.assessment, t.dueAt, t.weight, t.reviewerRole),
    expected: t.expectedCount,
    submitted: t.submittedCount,
    drafts: t.reviewers.filter((r) => r.status === 'DRAFT').length,
    grade: t.grade ?? null,
    release: t.releasedAt ? { assessment: t.assessment, teamId: '', at: wall(t.releasedAt) } : null,
    reviewers,
    overdue: t.overdue,
    spread: t.spread ?? null,
    disagreement: t.disagreement,
  }
}

function activityOf(x: S<'ActivityEntry'>): Activity {
  return { id: x.id, kind: ACTIVITY_KIND[x.kind], who: x.actor.displayName, text: x.text, at: wall(x.at) }
}

/* ---------- the repository ---------- */

export const httpRepository = {
  async demoSession() {
    return api.get<S<'DemoSession'>>('/api/demo/session')
  },
  async ensureDemoSession() {
    return api.put<S<'DemoSession'>>('/api/demo/session')
  },
  /** The fresh copy has a NEW id (contract 1.3.0): use it from now on; the old one answers 404. */
  async resetDemo(): Promise<S<'DemoSession'>> {
    const s = await api.post<S<'DemoSession'>>('/api/demo/session/reset')
    setBrowserDemoSessionId(s.id)
    setSessionToday(s.today)
    markCopyCreated()
    return s
  },
  async me() {
    return api.get<S<'Me'>>('/api/me')
  },

  async myTeams(): Promise<MyTeamsView> {
    const m = await api.get<S<'MyAssignments'>>('/api/me/assignments')
    const cards = m.teams.map((t) => {
      const team = teamOf(t.team, t.reviewers, t.defenseSlot)
      const rows: MyEvalRow[] = t.tasks.map((k) => ({
        assessment: assessmentOf(k.assessment, k.dueAt, k.weight, t.role),
        state: evalState(k.status),
        overdue: k.overdue,
        submittedLate: k.submittedLate ?? false,
        score: k.status === 'SUBMITTED' ? (k.score ?? null) : null,
        scored: k.scoredCount ?? 0,
        total: k.criteriaCount,
      }))
      return {
        team,
        role: t.role,
        advisors: t.reviewers.filter((r) => r.role === 'ADVISOR').map((r) => ref(r.reviewer)),
        jury: t.reviewers.filter((r) => r.role === 'JURY').map((r) => ref(r.reviewer)),
        rows,
      }
    })
    const pending = cards
      .flatMap((c) => c.rows.map((row) => ({ team: c.team, row })))
      .filter((x) => x.row.state !== 'SUBMITTED')
      .sort((a, b) => {
        const rank = (x: MyEvalRow) => (x.overdue ? 0 : x.state === 'DRAFT' ? 1 : 2)
        return rank(a.row) - rank(b.row) || a.row.assessment.due.localeCompare(b.row.assessment.due)
      })
    return {
      cards,
      summary: {
        expected: m.summary.expected,
        submitted: m.summary.submitted,
        drafts: m.summary.drafts,
        notStarted: Math.max(0, m.summary.expected - m.summary.submitted - m.summary.drafts),
        overdue: m.summary.overdue,
      },
      nextUp: pending[0] ?? null,
    }
  },

  async grading(teamId: string, a: AssessmentKey): Promise<GradingView> {
    const [e, t] = await Promise.all([
      api.get<S<'Evaluation'>>(`/api/my-evaluations/${teamId}/${a}`),
      api.get<S<'Team'>>(`/api/teams/${teamId}`),
    ])
    const ta = t.assessments.find((x) => x.assessment === a)!
    const rubric: Rubric = { assessment: a, criteria: e.criteria.map(criterionOf) }
    const peers = ta.reviewers
      .map((r) => ({ reviewer: ref(r.reviewer), you: r.reviewer.id === e.reviewer.id, state: evalState(r.status), at: r.submittedAt ? wall(r.submittedAt) : null }))
      .sort((x, y) => Number(x.you) - Number(y.you))
    return {
      team: teamOf(t, t.reviewers, t.defenseSlot),
      assessment: assessmentOf(a, e.dueAt ?? ta.dueAt, ta.weight, ta.reviewerRole),
      rubric,
      evaluation: evaluationOf(e),
      role: ta.reviewerRole,
      peers,
      overdue: e.overdue,
      submittedLate: e.submittedLate ?? false,
    }
  },

  async saveDraft(teamId: string, a: AssessmentKey, d: DraftState): Promise<Evaluation> {
    const e = await api.put<S<'Evaluation'>>(`/api/my-evaluations/${teamId}/${a}`, draftBody(d))
    return evaluationOf(e)!
  },

  async submit(teamId: string, a: AssessmentKey, d?: DraftState): Promise<Evaluation> {
    const e = await api.post<S<'Evaluation'>>(`/api/my-evaluations/${teamId}/${a}/submit`, d ? draftBody(d) : undefined)
    return evaluationOf(e)!
  },

  async overview(): Promise<OverviewView> {
    const [o, act, reviewers] = await Promise.all([
      api.get<S<'Overview'>>('/api/overview'),
      api.get<S<'ActivityPage'>>('/api/activity?size=12'),
      api.get<S<'ReviewerPage'>>('/api/reviewers?size=100'),
    ])
    const rows: GridRow[] = o.teams.map((r) => {
      const team = teamOf(r.team, [], r.defenseSlot)
      const cells: TeamAssessmentInfo[] = r.cells.map((c) => {
        const col = o.assessments.find((x) => x.code === c.assessment)!
        return {
          assessment: assessmentOf(c.assessment, col.dueAt, col.weight, col.reviewerRole),
          expected: c.expectedCount,
          submitted: c.submittedCount,
          drafts: c.draftCount,
          grade: c.grade ?? null,
          release: c.releasedAt ? { assessment: c.assessment, teamId: r.team.id, at: wall(c.releasedAt) } : null,
          reviewers: [],
          overdue: c.overdue,
          spread: c.spread ?? null,
          disagreement: c.disagreement,
        }
      })
      const missing = cells.filter((c) => c.grade === null)
      return {
        team,
        cells,
        final: r.finalGrade ?? null,
        finalVisible: r.finalState === 'VISIBLE',
        needs: r.finalGrade != null ? '' : missing.length === 1 && missing[0]!.assessment.role === 'ADVISOR' ? 'Needs advisor' : `Needs ${missing.length} more`,
        attention: cells.some((c) => c.overdue || c.disagreement) || (r.defenseSlot?.conflicts.length ?? 0) > 0,
      }
    })
    const overdueBy = new Map<string, string[]>()
    for (const r of rows) for (const c of r.cells.filter((x) => x.overdue)) overdueBy.set(c.assessment.shortName, [...(overdueBy.get(c.assessment.shortName) ?? []), r.team.name])
    const finals = rows.filter((r) => r.final !== null)
    const releases: ReleaseCandidate[] = o.assessments.map((a, i) => ({
      assessment: assessmentOf(a.code, a.dueAt, a.weight, a.reviewerRole),
      finalTeams: rows.filter((r) => r.cells[i]?.grade !== null).map((r) => r.team),
      pendingTeams: rows.filter((r) => r.cells[i]?.grade !== null && !r.cells[i]?.release).map((r) => r.team),
      releasedCount: a.releasedTeamCount,
    }))
    return {
      teamCount: o.kpis.teamCount,
      reviewerCount: reviewers.page.totalElements,
      kpis: {
        submitted: o.kpis.evaluationsSubmitted,
        expected: o.kpis.evaluationsExpected,
        overdue: { count: o.kpis.overdue, label: [...overdueBy.entries()].map(([k, v]) => `${k}: ${v.join(', ')}`).join(' · ') },
        finals: { count: o.kpis.finalGradesComputed, names: finals.map((r) => r.team.name) },
        released: o.kpis.resultsReleased,
        releasable: o.kpis.teamCount * o.assessments.length,
        readyToRelease: o.kpis.resultsReleasable,
        teamCount: o.kpis.teamCount,
        average: o.kpis.averageFinalGrade ?? null,
      },
      rows,
      releases: releases.filter((r) => r.pendingTeams.length > 0),
      releaseCounts: Object.fromEntries(o.assessments.map((a) => [a.code, a.releasedTeamCount])),
      activity: act.content.map(activityOf),
      insights: {
        threshold: o.insights.disagreementThreshold,
        distribution: o.insights.finalGradeDistribution,
        disagreements: o.insights.disagreements.map((d) => {
          const col = o.assessments.find((x) => x.code === d.assessment)!
          return {
            team: { id: d.team.id, name: d.team.name },
            assessment: assessmentOf(d.assessment, col.dueAt, col.weight, col.reviewerRole),
            spread: d.spread,
            submitted: d.submittedCount,
          }
        }),
      },
    }
  },

  /** P6: one team's history, newest first (contract 1.2.0 `GET /api/activity?teamId=`). */
  async teamHistory(teamId: string): Promise<Activity[]> {
    const p = await api.get<S<'ActivityPage'>>(`/api/activity?teamId=${encodeURIComponent(teamId)}&size=50`)
    return p.content.map(activityOf)
  },

  async exportCsv(): Promise<string> {
    return api.text('/api/overview/export')
  },

  async release(a: AssessmentKey): Promise<{ released: string[] }> {
    const r = await api.post<S<'ReleaseResult'>>(`/api/assessments/${a}/release`)
    return { released: r.releasedTeamIds }
  },

  async teamDetail(teamId: string): Promise<TeamDetailView> {
    const [t, rubrics] = await Promise.all([api.get<S<'Team'>>(`/api/teams/${teamId}`), api.get<S<'Rubric'>[]>('/api/rubrics')])
    const started = t.assessments.filter((x) => x.reviewers.some((r) => r.status !== 'NOT_STARTED'))
    const evals = await Promise.all(started.map((x) => api.get<S<'Evaluation'>[]>(`/api/evaluations?teamId=${teamId}&assessment=${x.assessment}`)))
    const byKey = new Map(started.map((x, i) => [x.assessment, evals[i]!]))
    const drafts = evals.flat().filter((e) => e.status === 'DRAFT' && e.id)
    const histories = await Promise.all(drafts.map((e) => api.get<S<'EvaluationHistoryEntry'>[]>(`/api/evaluations/${e.id}/history`).catch(() => [])))
    const team = teamOf(t, t.reviewers, t.defenseSlot)
    const assessments = t.assessments.map((x) => {
      const list = byKey.get(x.assessment) ?? []
      const domain = list.map(evaluationOf).filter((e): e is Evaluation => e !== null)
      const draftScores = Object.fromEntries(list.filter((e) => e.id).map((e) => [e.id!, e.score ?? null]))
      const info = teamAssessmentOf(x, domain, draftScores)
      info.release = info.release ? { ...info.release, teamId } : null
      const r = rubrics.find((y) => y.assessment === x.assessment)!
      const snapshot = list[0]?.criteria.map(criterionOf)
      const history = list
        .filter((e) => e.status === 'DRAFT' && e.id)
        .map((e) => ({
          reviewer: ref(e.reviewer),
          entries: (histories[drafts.findIndex((d) => d.id === e.id)] ?? []).map((h) => ({
            at: wall(h.at),
            kind: h.kind,
            criterionId: h.criterionId ?? null,
            criterionName: h.criterionName ?? null,
            from: (h.from ?? null) as Level | null,
            to: (h.to ?? null) as Level | null,
          })),
        }))
        .filter((h) => h.entries.length)
      return { ...info, rubric: { assessment: x.assessment, criteria: snapshot ?? r.criteria.map(criterionOf) }, history }
    })
    const submittedBy = new Set(t.assessments.flatMap((x) => x.reviewers.filter((r) => r.status === 'SUBMITTED').map((r) => r.reviewer.id)))
    const conflicts: Conflict[] = (t.defenseSlot?.conflicts ?? []).map((c) => ({
      reviewer: ref(c.reviewer),
      teams: [team, { ...teamOf(c.otherTeam), defense: null }],
      start: wall(t.defenseSlot!.startsAt),
    }))
    // The other team's slot isn't in this payload; the schedule shows the full picture.
    if (conflicts.length) {
      const sch = await api.get<S<'Schedule'>>('/api/schedule').catch(() => null)
      for (const c of conflicts) {
        const other = c.teams[1]!
        const s = sch?.slots.find((x) => x.team.id === other.id)
        if (s) c.teams[1] = { ...other, defense: slotOf(s) }
      }
    }
    return {
      team,
      students: t.students.map(studentOf),
      reviewers: t.reviewers.map((r) => ({ reviewer: reviewerOf(r.reviewer), role: r.role, canRemove: !submittedBy.has(r.reviewer.id) })),
      composition: compositionOf(t.composition),
      conflicts,
      assessments,
      final: t.finalGrade ?? null,
      finalCount: t.assessments.filter((x) => x.grade != null).length,
    }
  },

  async rubrics(v: Viewer): Promise<RubricsView> {
    const [rubrics, assessments, overview] = await Promise.all([
      api.get<S<'Rubric'>[]>('/api/rubrics'),
      api.get<S<'Assessment'>[]>('/api/assessments'),
      v.kind === 'admin' ? api.get<S<'Overview'>>('/api/overview').catch(() => null) : Promise.resolve(null),
    ])
    const submittedCount: RubricsView['submittedCount'] = {}
    for (const a of assessments) {
      const byTeam = (overview?.teams ?? [])
        .map((r) => ({ team: r.team.name, count: r.cells.find((c) => c.assessment === a.code)?.submittedCount ?? 0 }))
        .filter((x) => x.count > 0)
      submittedCount[a.code] = { total: byTeam.reduce((s, x) => s + x.count, 0), byTeam }
    }
    return {
      assessments: assessments.map((a) => assessmentOf(a.code, a.dueAt, a.weight, a.reviewerRole)),
      rubrics: rubrics.map((r) => ({ assessment: r.assessment, criteria: r.criteria.map(criterionOf) })),
      edited: Object.fromEntries(rubrics.map((r) => [r.assessment, r.updatedBy ? { at: r.updatedAt ? wall(r.updatedAt) : null, by: r.updatedBy.displayName } : null])),
      submittedCount,
    }
  },

  async saveRubric(a: AssessmentKey, criteria: Criterion[]): Promise<void> {
    await api.put<S<'Rubric'>>(`/api/rubrics/${a}`, {
      criteria: criteria.map((c) => ({
        id: c.id || null,
        name: c.name,
        weight: c.weight,
        descriptions: { '1': c.descriptions[0], '2': c.descriptions[1], '3': c.descriptions[2], '4': c.descriptions[3] },
      })),
    } satisfies S<'RubricPut'>)
  },

  async schedule(v: Viewer): Promise<ScheduleView> {
    const admin = v.kind === 'admin'
    const [s, overview, teams] = await Promise.all([
      api.get<S<'Schedule'>>('/api/schedule'),
      admin ? api.get<S<'Overview'>>('/api/overview').catch(() => null) : Promise.resolve(null),
      admin ? api.get<S<'TeamSummaryPage'>>('/api/teams?size=100').catch(() => null) : Promise.resolve(null),
    ])
    const teamsById = new Map<string, Team>()
    const slots = s.slots.map((x) => {
      const team = teamOf(x.team, x.jury.map((j) => ({ reviewer: j, role: 'JURY' as const })), x)
      teamsById.set(team.id, team)
      const end = wall(x.endsAt)
      return { team, slot: slotOf(x)!, jury: x.jury.map(ref), conflict: x.conflicts.length > 0, done: parseLocal(end) < now() }
    })
    return {
      days: s.defenseDays,
      slots,
      conflicts: s.conflicts.map((c) => ({
        reviewer: ref(c.reviewer),
        teams: c.teams.map((t) => teamsById.get(t.id) ?? teamOf(t)),
        start: wall(c.startsAt),
      })),
      dues: s.dueDates.map((d) => {
        const cells = (overview?.teams ?? []).map((r) => r.cells.find((c) => c.assessment === d.assessment)!).filter(Boolean)
        return {
          assessment: assessmentOf(d.assessment, d.dueAt),
          submitted: cells.reduce((n, c) => n + c.submittedCount, 0),
          expected: cells.reduce((n, c) => n + c.expectedCount, 0),
          overdue: cells.filter((c) => c.overdue).length,
        }
      }),
      scope: admin ? 'all' : v.kind === 'student' ? 'student' : 'reviewer',
      unslotted: (teams?.content ?? []).filter((t) => !teamsById.has(t.id)).map((t) => teamOf(t)),
    }
  },

  async setDue(a: AssessmentKey, isoDate: string): Promise<void> {
    await api.patch<S<'Assessment'>>(`/api/assessments/${a}`, { dueAt: parisToUtc(`${isoDate}T23:59:00`) } satisfies S<'AssessmentPatch'>)
  },

  async moveDefense(teamId: string, start: string, room: string): Promise<void> {
    await api.put<S<'DefenseSlot'>>(`/api/teams/${teamId}/defense-slot`, {
      startsAt: parisToUtc(start),
      room,
      durationMinutes: 40,
    } satisfies S<'DefenseSlotPut'>)
  },

  async notifications(v: Viewer): Promise<NotificationsView> {
    const p = await api.get<S<'NotificationPage'>>('/api/notifications?size=50')
    const items: AppNotification[] = p.content.map((n) => ({
      id: n.id,
      kind: NOTIF_KIND[n.type],
      text: n.text,
      at: wall(n.createdAt),
      href: hrefOf(n.link, v),
      read: n.read,
    }))
    return { items, unread: p.unreadCount }
  },

  async markRead(id: string | 'all'): Promise<void> {
    if (id === 'all') await api.post('/api/notifications/read-all')
    else await api.patch(`/api/notifications/${id}`, { read: true })
  },

  async studentHome(): Promise<StudentHomeView> {
    const h = await api.get<S<'StudentHome'>>('/api/me/team')
    const released = h.timeline.filter((x) => x.released)
    // Only "not released yet" means no details; any other failure is a real error for the screen to show.
    const details = await Promise.all(
      released.map((x) =>
        api.get<S<'ReleasedResults'>>(`/api/me/team/results/${x.assessment}`).catch((e: unknown) => {
          if (e instanceof ApiError && e.status === 404 && e.code === 'results-not-released') return null
          throw e
        }),
      ),
    )
    const team = teamOf(h.team, h.reviewers, h.defenseSlot)
    const reviewersById = new Map(h.reviewers.map((r) => [r.reviewer.id, ref(r.reviewer)]))
    const defended = team.defense ? parseLocal(team.defense.start) <= now() : false
    const results: StudentResult[] = h.timeline.map((x) => {
      const d = details[released.indexOf(x)] ?? null
      const who = (id: string) => reviewersById.get(id) ?? { id, name: 'Reviewer', initials: '?' }
      return {
        assessment: assessmentOf(x.assessment, x.dueAt, x.weight),
        released: x.released,
        release: x.releasedAt ? { assessment: x.assessment, teamId: team.id, at: wall(x.releasedAt) } : null,
        grade: x.released ? (x.grade ?? d?.grade ?? null) : null,
        reviewers: d ? d.reviewers.map((r) => ({ reviewer: ref(r.reviewer), score: r.score })) : [],
        overall: d ? d.reviewers.filter((r) => r.overallComment).map((r) => ({ reviewer: ref(r.reviewer), text: r.overallComment! })) : [],
        criteria: d
          ? d.criteria.map((c) => ({
              criterion: { id: c.criterionId, name: c.name, weight: c.weight, descriptions: ['', '', '', ''] },
              levels: c.levels.map((l) => ({ reviewer: who(l.reviewerId), level: l.level as Level })),
              comments: c.levels.filter((l) => l.comment).map((l) => ({ reviewer: who(l.reviewerId), text: l.comment! })),
            }))
          : [],
        state: x.released ? 'RELEASED' : x.status,
        defended: x.assessment === 'FINAL_PRESENTATION' && defended,
      }
    })
    const latest = results
      .map((r) => r.release)
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.at.localeCompare(a.at))[0]
    const me = studentOf(h.me)
    return {
      me,
      team,
      teammates: [me, ...h.teammates.map(studentOf).filter((s) => s.id !== me.id)],
      advisors: h.reviewers.filter((r) => r.role === 'ADVISOR').map((r) => ref(r.reviewer)),
      jury: h.reviewers.filter((r) => r.role === 'JURY').map((r) => ref(r.reviewer)),
      results,
      releasedCount: released.length,
      final: h.finalGradeVisible ? (h.finalGrade ?? null) : null,
      latestRelease: latest ?? null,
    }
  },

  async teams(): Promise<TeamsListView> {
    const [list, reviewers] = await Promise.all([
      api.get<S<'TeamSummaryPage'>>('/api/teams?size=100'),
      api.get<S<'ReviewerPage'>>('/api/reviewers?size=100'),
    ])
    const details = await Promise.all(list.content.map((t) => api.get<S<'Team'>>(`/api/teams/${t.id}`)))
    return {
      teams: details.map((t) => ({
        team: teamOf(t, t.reviewers, t.defenseSlot),
        students: t.students.map(studentOf),
        reviewers: t.reviewers.map((r) => ({ reviewer: reviewerOf(r.reviewer), role: r.role })),
        composition: compositionOf(t.composition),
        canDelete: !t.assessments.some((x) => x.submittedCount > 0),
      })),
      reviewers: reviewers.content.map((r) => reviewerOf(r, r.coordinator)),
    }
  },

  async createTeam(name: string, projectTitle: string): Promise<string> {
    const t = await api.post<S<'Team'>>('/api/teams', { name, projectTitle } satisfies S<'TeamCreate'>)
    return t.id
  },
  async updateTeam(teamId: string, patch: { name?: string; projectTitle?: string; description?: string }): Promise<void> {
    await api.patch<S<'Team'>>(`/api/teams/${teamId}`, patch satisfies S<'TeamPatch'>)
  },
  async deleteTeam(teamId: string): Promise<void> {
    await api.del(`/api/teams/${teamId}`)
  },
  async addStudent(teamId: string, firstName: string, lastName: string, email: string): Promise<void> {
    await api.post<S<'Student'>>(`/api/teams/${teamId}/students`, { firstName, lastName, email } satisfies S<'StudentCreate'>)
  },
  async removeStudent(teamId: string, studentId: string): Promise<void> {
    await api.del(`/api/teams/${teamId}/students/${studentId}`)
  },
  async assignReviewer(teamId: string, reviewerId: string, role: ReviewerRole): Promise<void> {
    const cur = await api.get<S<'TeamReviewers'>>(`/api/teams/${teamId}/reviewers`)
    const assignments = [...cur.reviewers.map((r) => ({ reviewerId: r.reviewer.id, role: r.role })), { reviewerId, role }]
    await api.put<S<'TeamReviewers'>>(`/api/teams/${teamId}/reviewers`, { assignments } satisfies S<'TeamReviewersPut'>)
  },
  async unassignReviewer(teamId: string, reviewerId: string): Promise<void> {
    const cur = await api.get<S<'TeamReviewers'>>(`/api/teams/${teamId}/reviewers`)
    const assignments = cur.reviewers.filter((r) => r.reviewer.id !== reviewerId).map((r) => ({ reviewerId: r.reviewer.id, role: r.role }))
    await api.put<S<'TeamReviewers'>>(`/api/teams/${teamId}/reviewers`, { assignments } satisfies S<'TeamReviewersPut'>)
  },
}

function draftBody(d: DraftState): S<'EvaluationDraft'> {
  return {
    criteria: Object.keys(d.levels).map((id) => ({ criterionId: id, level: d.levels[id] ?? null, comment: d.comments[id] || null })),
    overallComment: d.overall || null,
  }
}

