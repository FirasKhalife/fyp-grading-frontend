import type {
  CompositionCheck,
  Conflict,
  EvalState,
  GradingView,
  GridRow,
  MyEvalRow,
  MyTeamCard,
  MyTeamsView,
  NotificationsView,
  OverviewView,
  PersonRef,
  ReleaseCandidate,
  ReviewerScore,
  RubricsView,
  ScheduleView,
  StudentHomeView,
  StudentResult,
  TeamAssessmentInfo,
  TeamDetailView,
  TeamsListView,
} from '@/api/views'
import { ASSESSMENTS, assessmentDef } from '@/domain/assessments'
import { auditText } from '@/domain/audit'
import type {
  Assessment,
  AssessmentKey,
  AuditEntry,
  Criterion,
  Evaluation,
  Level,
  NotificationKind,
  Reviewer,
  ReviewerRole,
  Team,
} from '@/domain/types'
import {
  addMinutes,
  daysFromToday,
  fmtDay,
  fmtTime,
  isoDay,
  now,
  parseLocal,
  toIsoDateTime,
} from '@/lib/demo-clock'
import { finalGrade, formatScore, reviewerScore, spread, teamAssessmentGrade, weightsTotal } from '@/lib/scoring'
import { dueOf, nextId, type DemoState } from './db'

/** A business-rule refusal. `code` is the contract's stable problem code. */
export class DemoError extends Error {
  constructor(
    public status: 400 | 403 | 404 | 409 | 422,
    message: string,
    public code: string = status === 404 ? 'not-found' : status === 403 ? 'forbidden' : status === 400 ? 'validation-failed' : 'conflict',
  ) {
    super(message)
  }
}

/* ---------- small helpers ---------- */

export function personRef(p: { id: string; firstName: string; lastName: string }): PersonRef {
  return { id: p.id, name: `${p.firstName} ${p.lastName}`, initials: `${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}` }
}

function reviewer(state: DemoState, id: string): Reviewer {
  const r = state.reviewers.find((x) => x.id === id)
  if (!r) throw new DemoError(404, 'Reviewer not found')
  return r
}

export function team(state: DemoState, id: string): Team {
  const t = state.teams.find((x) => x.id === id)
  if (!t) throw new DemoError(404, 'Team not found')
  return t
}

export function assessment(state: DemoState, key: AssessmentKey): Assessment {
  const d = assessmentDef(key)
  return { key: d.key, name: d.name, shortName: d.shortName, weight: d.weight, role: d.role, due: dueOf(state, key) }
}

function rubric(state: DemoState, key: AssessmentKey) {
  return state.rubrics.find((r) => r.assessment === key)!
}

function holders(state: DemoState, t: Team, role: ReviewerRole): Reviewer[] {
  return t.members.filter((m) => m.role === role).map((m) => reviewer(state, m.reviewerId))
}

function evaluationOf(state: DemoState, teamId: string, key: AssessmentKey, reviewerId: string): Evaluation | null {
  return state.evaluations.find((e) => e.teamId === teamId && e.assessment === key && e.reviewerId === reviewerId) ?? null
}

function evalState(e: Evaluation | null): EvalState {
  return e ? (e.status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT') : 'NOT_STARTED'
}

export function scoreOf(state: DemoState, e: Evaluation): number {
  const r = rubric(state, e.assessment)
  return reviewerScore(r.criteria.map((c) => ({ level: e.levels[c.id] ?? null, weight: c.weight })))
}

function scoredCount(state: DemoState, e: Evaluation | null, key: AssessmentKey): number {
  if (!e) return 0
  return rubric(state, key).criteria.filter((c) => e.levels[c.id] !== null && e.levels[c.id] !== undefined).length
}

function isPast(isoDate: string): boolean {
  return daysFromToday(isoDate) < 0
}

function releaseOf(state: DemoState, teamId: string, key: AssessmentKey) {
  return state.releases.find((r) => r.teamId === teamId && r.assessment === key) ?? null
}

/* ---------- grades ---------- */

export function teamAssessment(state: DemoState, teamId: string, key: AssessmentKey): TeamAssessmentInfo {
  const t = team(state, teamId)
  const a = assessment(state, key)
  const people = holders(state, t, a.role)
  const reviewers: ReviewerScore[] = people.map((p) => {
    const e = evaluationOf(state, teamId, key, p.id)
    return { reviewer: personRef(p), state: evalState(e), score: e ? scoreOf(state, e) : null, evaluation: e }
  })
  const submitted = reviewers.filter((r) => r.state === 'SUBMITTED')
  const grade = teamAssessmentGrade(reviewers.map((r) => (r.state === 'SUBMITTED' ? r.score : null)))
  const subScores = submitted.map((r) => r.score as number)
  return {
    assessment: a,
    expected: people.length,
    submitted: submitted.length,
    drafts: reviewers.filter((r) => r.state === 'DRAFT').length,
    grade,
    release: releaseOf(state, teamId, key),
    reviewers,
    overdue: grade === null && isPast(a.due),
    spread: subScores.length >= 2 ? spread(subScores) : null,
  }
}

export function teamFinal(state: DemoState, teamId: string): number | null {
  return finalGrade(ASSESSMENTS.map((a) => ({ grade: teamAssessment(state, teamId, a.key).grade, weight: a.weight })))
}

/* ---------- composition and conflicts ---------- */

export function composition(t: Team): CompositionCheck {
  const total = t.members.length
  const jury = t.members.filter((m) => m.role === 'JURY').length
  const advisors = t.members.filter((m) => m.role === 'ADVISOR').length
  const problems: string[] = []
  if (jury < 1) problems.push('needs at least 1 jury member')
  if (advisors < 1) problems.push('needs at least 1 advisor')
  if (total > 5) problems.push('has more than 5 reviewers')
  const head = `${total} of 5 reviewers · ${jury} jury · ${advisors} advisor${advisors === 1 ? '' : 's'}`
  return {
    ok: problems.length === 0,
    total,
    jury,
    advisors,
    text: problems.length ? `${head} · ${problems.join(', ')}` : `${head}. Meets the team rules.`,
  }
}

function overlaps(aStart: string, aMin: number, bStart: string, bMin: number): boolean {
  const a0 = parseLocal(aStart).getTime()
  const b0 = parseLocal(bStart).getTime()
  return a0 < b0 + bMin * 60_000 && b0 < a0 + aMin * 60_000
}

export function conflicts(state: DemoState): Conflict[] {
  const out: Conflict[] = []
  const slotted = state.teams.filter((t) => t.defense)
  for (let i = 0; i < slotted.length; i++) {
    for (let j = i + 1; j < slotted.length; j++) {
      const a = slotted[i]!
      const b = slotted[j]!
      if (!overlaps(a.defense!.start, a.defense!.minutes, b.defense!.start, b.defense!.minutes)) continue
      const juryA = a.members.filter((m) => m.role === 'JURY').map((m) => m.reviewerId)
      for (const m of b.members) {
        if (m.role === 'JURY' && juryA.includes(m.reviewerId)) {
          out.push({ reviewer: personRef(reviewer(state, m.reviewerId)), teams: [a, b], start: a.defense!.start })
        }
      }
    }
  }
  return out
}

/* ---------- views ---------- */

function myRow(state: DemoState, t: Team, key: AssessmentKey, userId: string): MyEvalRow {
  const a = assessment(state, key)
  const e = evaluationOf(state, t.id, key, userId)
  const st = evalState(e)
  return {
    assessment: a,
    state: st,
    overdue: st !== 'SUBMITTED' && isPast(a.due),
    score: e && st === 'SUBMITTED' ? scoreOf(state, e) : null,
    scored: scoredCount(state, e, key),
    total: rubric(state, key).criteria.length,
  }
}

export function myTeamsView(state: DemoState, userId: string): MyTeamsView {
  const cards: MyTeamCard[] = []
  for (const t of state.teams) {
    for (const m of t.members.filter((x) => x.reviewerId === userId)) {
      cards.push({
        team: t,
        role: m.role,
        advisors: holders(state, t, 'ADVISOR').map(personRef),
        jury: holders(state, t, 'JURY').map(personRef),
        rows: ASSESSMENTS.filter((a) => a.role === m.role).map((a) => myRow(state, t, a.key, userId)),
      })
    }
  }
  // Most work left first, then the earliest defense.
  const todo = (c: MyTeamCard) => c.rows.filter((r) => r.state !== 'SUBMITTED').length
  cards.sort((a, b) => todo(b) - todo(a) || (a.team.defense?.start ?? '').localeCompare(b.team.defense?.start ?? ''))
  const rows = cards.flatMap((c) => c.rows.map((row) => ({ team: c.team, row })))
  const pending = rows.filter((r) => r.row.state !== 'SUBMITTED')
  pending.sort((a, b) => {
    const rank = (x: MyEvalRow) => (x.overdue ? 0 : x.state === 'DRAFT' ? 1 : 2)
    return rank(a.row) - rank(b.row) || a.row.assessment.due.localeCompare(b.row.assessment.due)
  })
  return {
    cards,
    summary: {
      expected: rows.length,
      submitted: rows.filter((r) => r.row.state === 'SUBMITTED').length,
      drafts: rows.filter((r) => r.row.state === 'DRAFT').length,
      notStarted: rows.filter((r) => r.row.state === 'NOT_STARTED').length,
      overdue: rows.filter((r) => r.row.overdue).length,
    },
    nextUp: pending[0] ?? null,
  }
}

function roleOn(t: Team, userId: string, role: ReviewerRole): boolean {
  return t.members.some((m) => m.reviewerId === userId && m.role === role)
}

export function gradingView(state: DemoState, userId: string, teamId: string, key: AssessmentKey): GradingView {
  const t = team(state, teamId)
  const a = assessment(state, key)
  if (!roleOn(t, userId, a.role)) {
    throw new DemoError(403, `You don't grade the ${a.name} for Team ${t.name}.`, 'not-assigned')
  }
  const peers = holders(state, t, a.role).map((p) => {
    const e = evaluationOf(state, teamId, key, p.id)
    return { reviewer: personRef(p), you: p.id === userId, state: evalState(e), at: e?.submittedAt ?? null }
  })
  peers.sort((x, y) => Number(x.you) - Number(y.you))
  return { team: t, assessment: a, rubric: rubric(state, key), evaluation: evaluationOf(state, teamId, key, userId), role: a.role, peers }
}

function needsText(cells: TeamAssessmentInfo[]): string {
  const missing = cells.filter((c) => c.grade === null)
  if (missing.length === 1 && missing[0]!.assessment.role === 'ADVISOR') return 'Needs advisor'
  return `Needs ${missing.length} more`
}

export function overviewView(state: DemoState): OverviewView {
  const confl = conflicts(state)
  const rows: GridRow[] = state.teams.map((t) => {
    const cells = ASSESSMENTS.map((a) => teamAssessment(state, t.id, a.key))
    const final = teamFinal(state, t.id)
    const finalVisible = cells.every((c) => c.release)
    const attention =
      cells.some((c) => c.overdue || (c.spread ?? 0) >= 20) || confl.some((c) => c.teams.some((x) => x.id === t.id))
    return { team: t, cells, final, finalVisible, needs: final === null ? needsText(cells) : '', attention }
  })
  const all = rows.flatMap((r) => r.cells)
  const overdueRows = rows.flatMap((r) => r.cells.filter((c) => c.overdue).map((c) => ({ t: r.team, c })))
  const overdueByAssessment = new Map<string, string[]>()
  for (const o of overdueRows) {
    const k = o.c.assessment.shortName
    overdueByAssessment.set(k, [...(overdueByAssessment.get(k) ?? []), o.t.name])
  }
  const finals = rows.filter((r) => r.final !== null)
  const releases: ReleaseCandidate[] = ASSESSMENTS.map((a, i) => {
    const finalTeams = rows.filter((r) => r.cells[i]!.grade !== null).map((r) => r.team)
    const pendingTeams = rows.filter((r) => r.cells[i]!.grade !== null && !r.cells[i]!.release).map((r) => r.team)
    const releasedCount = rows.filter((r) => r.cells[i]!.release).length
    return { assessment: assessment(state, a.key), finalTeams, pendingTeams, releasedCount }
  })
  const reviewerIds = new Set(state.teams.flatMap((t) => t.members.map((m) => m.reviewerId)))
  return {
    teamCount: state.teams.length,
    reviewerCount: reviewerIds.size,
    kpis: {
      submitted: all.reduce((s, c) => s + c.submitted, 0),
      expected: all.reduce((s, c) => s + c.expected, 0),
      overdue: {
        count: overdueRows.reduce((s, o) => s + (o.c.expected - o.c.submitted), 0),
        label: [...overdueByAssessment.entries()].map(([k, v]) => `${k}: ${v.join(', ')}`).join(' · '),
      },
      finals: { count: finals.length, names: finals.map((r) => r.team.name) },
      released: state.releases.length,
      releasable: rows.length * ASSESSMENTS.length,
      average: finals.length ? finals.reduce((s, r) => s + (r.final as number), 0) / finals.length : null,
    },
    rows,
    releases: releases.filter((r) => r.pendingTeams.length > 0),
    releaseCounts: Object.fromEntries(releases.map((r) => [r.assessment.key, r.releasedCount])),
    activity: [...state.activity].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12),
  }
}

export function teamDetailView(state: DemoState, teamId: string): TeamDetailView {
  const t = team(state, teamId)
  const assessments = ASSESSMENTS.map((a) => {
    const info = teamAssessment(state, teamId, a.key)
    const history = info.reviewers
      .filter((r) => r.evaluation && r.evaluation.status === 'DRAFT' && r.evaluation.history.length)
      .map((r) => ({ reviewer: r.reviewer, entries: [...r.evaluation!.history].reverse() }))
    return { ...info, rubric: rubric(state, a.key), history }
  })
  return {
    team: t,
    students: state.students.filter((s) => s.teamId === teamId),
    reviewers: t.members.map((m) => ({
      reviewer: reviewer(state, m.reviewerId),
      role: m.role,
      canRemove: !state.evaluations.some((e) => e.teamId === teamId && e.reviewerId === m.reviewerId && e.status === 'SUBMITTED'),
    })),
    composition: composition(t),
    conflicts: conflicts(state).filter((c) => c.teams.some((x) => x.id === teamId)),
    assessments,
    final: teamFinal(state, teamId),
    finalCount: assessments.filter((a) => a.grade !== null).length,
  }
}

export function rubricsView(state: DemoState): RubricsView {
  const submittedCount: RubricsView['submittedCount'] = {}
  for (const a of ASSESSMENTS) {
    const subs = state.evaluations.filter((e) => e.assessment === a.key && e.status === 'SUBMITTED')
    const byTeam = state.teams
      .map((t) => ({ team: t.name, count: subs.filter((e) => e.teamId === t.id).length }))
      .filter((x) => x.count > 0)
    submittedCount[a.key] = { total: subs.length, byTeam }
  }
  return { assessments: ASSESSMENTS.map((a) => assessment(state, a.key)), rubrics: state.rubrics, submittedCount }
}

export function scheduleView(state: DemoState, user: { id: string; kind: 'admin' | 'reviewer' | 'student' }): ScheduleView {
  const confl = conflicts(state)
  let teams = state.teams.filter((t) => t.defense)
  if (user.kind === 'reviewer') teams = teams.filter((t) => t.members.some((m) => m.reviewerId === user.id))
  if (user.kind === 'student') {
    const s = state.students.find((x) => x.id === user.id)
    teams = teams.filter((t) => t.id === s?.teamId)
  }
  const slots = teams
    .map((t) => ({
      team: t,
      slot: t.defense!,
      jury: holders(state, t, 'JURY').map(personRef),
      conflict: confl.some((c) => c.teams.some((x) => x.id === t.id)),
      done: parseLocal(addMinutes(t.defense!.start, t.defense!.minutes)) < now(),
    }))
    .sort((a, b) => a.slot.start.localeCompare(b.slot.start))
  const days = [-1, 0, 1].map((d) => isoDay(d))
  const dues = ASSESSMENTS.map((a) => {
    const cells = state.teams.map((t) => teamAssessment(state, t.id, a.key))
    return {
      assessment: assessment(state, a.key),
      submitted: cells.reduce((s, c) => s + c.submitted, 0),
      expected: cells.reduce((s, c) => s + c.expected, 0),
      overdue: cells.filter((c) => c.overdue).length,
    }
  })
  return {
    days,
    slots,
    conflicts: user.kind === 'admin' ? confl : confl.filter((c) => c.reviewer.id === user.id),
    dues,
    scope: user.kind === 'admin' ? 'all' : user.kind,
    unslotted: user.kind === 'admin' ? state.teams.filter((t) => !t.defense) : [],
  }
}

export function studentHomeView(state: DemoState, studentId: string): StudentHomeView {
  const me = state.students.find((s) => s.id === studentId)
  if (!me) throw new DemoError(404, 'Student not found')
  const t = team(state, me.teamId)
  const results: StudentResult[] = ASSESSMENTS.map((a) => {
    const info = teamAssessment(state, t.id, a.key)
    const released = !!info.release
    const r = rubric(state, a.key)
    const subs = info.reviewers.filter((x) => x.state === 'SUBMITTED')
    const st: StudentResult['state'] = released
      ? 'RELEASED'
      : info.grade !== null
        ? 'GRADED'
        : info.submitted > 0 || isPast(info.assessment.due) || (a.key === 'FINAL_PRESENTATION' && !!t.defense && daysFromToday(t.defense.start) <= 0)
          ? 'BEING_GRADED'
          : 'UPCOMING'
    return {
      assessment: info.assessment,
      released,
      release: info.release,
      // Nothing about scores leaves the "server" before release.
      grade: released ? info.grade : null,
      reviewers: released ? subs.map((x) => ({ reviewer: x.reviewer, score: x.score })) : [],
      overall: released
        ? subs.filter((x) => x.evaluation?.overallComment).map((x) => ({ reviewer: x.reviewer, text: x.evaluation!.overallComment }))
        : [],
      criteria: released
        ? r.criteria.map((c: Criterion) => ({
            criterion: c,
            levels: subs.map((x) => ({ reviewer: x.reviewer, level: (x.evaluation!.levels[c.id] ?? null) as Level | null })),
            comments: subs
              .filter((x) => x.evaluation!.comments[c.id])
              .map((x) => ({ reviewer: x.reviewer, text: x.evaluation!.comments[c.id]! })),
          }))
        : [],
      state: st,
      defended: a.key === 'FINAL_PRESENTATION' && !!t.defense && daysFromToday(t.defense.start) <= 0,
    }
  })
  const releasedCount = results.filter((r) => r.released).length
  const latest = [...state.releases.filter((r) => r.teamId === t.id)].sort((a, b) => b.at.localeCompare(a.at))[0] ?? null
  return {
    me,
    team: t,
    teammates: state.students.filter((s) => s.teamId === t.id),
    advisors: holders(state, t, 'ADVISOR').map(personRef),
    jury: holders(state, t, 'JURY').map(personRef),
    results,
    releasedCount,
    final: releasedCount === ASSESSMENTS.length ? teamFinal(state, t.id) : null,
    latestRelease: latest,
  }
}

export function teamsListView(state: DemoState): TeamsListView {
  return {
    teams: state.teams.map((t) => ({
      team: t,
      students: state.students.filter((s) => s.teamId === t.id),
      reviewers: t.members.map((m) => ({ reviewer: reviewer(state, m.reviewerId), role: m.role })),
      composition: composition(t),
      canDelete: !state.evaluations.some((e) => e.teamId === t.id),
    })),
    reviewers: state.reviewers,
  }
}

export function notificationsView(state: DemoState, userId: string): NotificationsView {
  const items = [...(state.notifications[userId] ?? [])].sort((a, b) => b.at.localeCompare(a.at))
  return { items, unread: items.filter((n) => !n.read).length }
}

/* ---------- mutations ---------- */

function stamp(): string {
  return toIsoDateTime(now())
}

function notify(state: DemoState, userIds: string[], kind: NotificationKind, text: string, href: string) {
  for (const u of new Set(userIds)) {
    const list = (state.notifications[u] ??= [])
    list.unshift({ id: nextId(state, 'n'), kind, text, at: stamp(), href, read: false })
  }
}

function activity(state: DemoState, kind: DemoState['activity'][number]['kind'], who: string, text: string) {
  state.activity.unshift({ id: nextId(state, 'a'), kind, who, text, at: stamp() })
}

function admins(state: DemoState): string[] {
  return state.reviewers.filter((r) => r.isAdmin).map((r) => r.id)
}

export interface DraftPatch {
  levels?: Record<string, Level | null>
  comments?: Record<string, string>
  overallComment?: string
}

export function saveDraft(state: DemoState, userId: string, teamId: string, key: AssessmentKey, patch: DraftPatch): Evaluation {
  const view = gradingView(state, userId, teamId, key)
  let e = view.evaluation
  if (e?.status === 'SUBMITTED') throw new DemoError(409, 'This evaluation is submitted and locked.', 'evaluation-submitted')
  const me = reviewer(state, userId)
  if (!e) {
    e = {
      id: nextId(state, 'e'),
      teamId,
      assessment: key,
      reviewerId: userId,
      status: 'DRAFT',
      levels: Object.fromEntries(view.rubric.criteria.map((c) => [c.id, null])),
      comments: {},
      overallComment: '',
      updatedAt: stamp(),
      submittedAt: null,
      history: [{ at: stamp(), kind: 'CREATED' }],
    }
    state.evaluations.push(e)
  }
  const at = stamp()
  const levelChanges: AuditEntry[] = []
  const log = (entry: Omit<AuditEntry, 'at'>) => {
    const last = e!.history[e!.history.length - 1]
    // Typing produces many saves: keep one comment line per criterion, not one per keystroke.
    if (entry.kind !== 'LEVEL_CHANGED' && last && last.kind === entry.kind && last.criterionId === (entry.criterionId ?? null)) last.at = at
    else e!.history.push({ at, criterionId: null, criterionName: null, from: null, to: null, ...entry })
  }
  for (const [cid, lvl] of Object.entries(patch.levels ?? {})) {
    const before = e.levels[cid] ?? null
    if (before === lvl) continue
    const c = view.rubric.criteria.find((x) => x.id === cid)
    if (!c) throw new DemoError(400, 'Unknown criterion')
    e.levels[cid] = lvl
    const entry = { kind: 'LEVEL_CHANGED' as const, criterionId: cid, criterionName: c.name, from: before, to: lvl }
    log(entry)
    levelChanges.push({ at, ...entry })
  }
  for (const [cid, text] of Object.entries(patch.comments ?? {})) {
    if ((e.comments[cid] ?? '') === text) continue
    if (text) e.comments[cid] = text
    else delete e.comments[cid]
    const c = view.rubric.criteria.find((x) => x.id === cid)
    log({ kind: 'COMMENT_CHANGED', criterionId: cid, criterionName: c?.name ?? null })
  }
  if (patch.overallComment !== undefined && patch.overallComment !== e.overallComment) {
    e.overallComment = patch.overallComment
    log({ kind: 'OVERALL_COMMENT_CHANGED' })
  }
  e.updatedAt = at
  const lc = levelChanges[levelChanges.length - 1]
  if (lc) {
    const who = `${me.firstName} ${me.lastName}`
    const where = `Team ${view.team.name} ${view.assessment.name.toLowerCase()} draft`
    const text = `${auditText(lc).replace(/^S/, 's').replace(/^C/, 'c')} in the ${where}.`
    const head = state.activity[0]
    // Coalesce a run of picks into one feed line.
    if (head && head.kind === 'edit' && head.who === who && head.text.includes(where)) {
      head.text = text
      head.at = at
    } else activity(state, 'edit', who, text)
  }
  return e
}

export function submitEvaluation(state: DemoState, userId: string, teamId: string, key: AssessmentKey): Evaluation {
  const view = gradingView(state, userId, teamId, key)
  const e = view.evaluation
  if (!e) throw new DemoError(422, 'Score every criterion before submitting.', 'criteria-unscored')
  if (e.status === 'SUBMITTED') throw new DemoError(409, 'Already submitted.')
  const missing = view.rubric.criteria.filter((c) => e.levels[c.id] === null || e.levels[c.id] === undefined)
  if (missing.length) throw new DemoError(422, `Score ${missing.length} more criteria to submit.`, 'criteria-unscored')
  const wasFinalBefore = teamFinal(state, teamId)
  e.status = 'SUBMITTED'
  e.submittedAt = stamp()
  e.updatedAt = e.submittedAt
  e.history.push({ at: e.submittedAt, kind: 'SUBMITTED', criterionId: null, criterionName: null, from: null, to: null })
  const me = reviewer(state, userId)
  const info = teamAssessment(state, teamId, key)
  activity(
    state,
    'submit',
    `${me.firstName} ${me.lastName}`,
    `submitted the ${view.assessment.name} for Team ${view.team.name} (${info.submitted} of ${info.expected}).`,
  )
  const teamReviewers = view.team.members.map((m) => m.reviewerId)
  if (info.grade !== null) {
    const g = formatScore(info.grade)
    activity(state, 'final', `Team ${view.team.name}`, `${view.assessment.name} grade is final: ${g}.`)
    notify(state, [...admins(state), ...teamReviewers], 'final', `${view.assessment.name} for Team ${view.team.name} is final: ${g}.`, `/teams/${teamId}`)
  }
  const fin = teamFinal(state, teamId)
  if (fin !== null && wasFinalBefore === null) {
    activity(state, 'final', `Team ${view.team.name}`, `final grade computed: ${formatScore(fin)}.`)
    notify(state, [...admins(state), ...teamReviewers], 'final', `Team ${view.team.name}'s final grade is computed: ${formatScore(fin)}.`, `/teams/${teamId}`)
  }
  return e
}

export function releaseAssessment(state: DemoState, key: AssessmentKey): { released: Team[] } {
  const a = assessment(state, key)
  const pending = state.teams.filter((t) => teamAssessment(state, t.id, key).grade !== null && !releaseOf(state, t.id, key))
  if (!pending.length) throw new DemoError(409, `Nothing to release for the ${a.name}.`, 'nothing-to-release')
  for (const t of pending) {
    state.releases.push({ assessment: key, teamId: t.id, at: stamp() })
    const studentIds = state.students.filter((s) => s.teamId === t.id).map((s) => s.id)
    notify(state, studentIds, 'release', `Your ${a.name} results are available.`, '/student')
    if (ASSESSMENTS.every((x) => releaseOf(state, t.id, x.key))) {
      notify(state, studentIds, 'release', 'All five results are released: your final grade is now visible.', '/student')
    }
  }
  const names = pending.map((t) => `Team ${t.name}`)
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]!
  activity(state, 'release', 'You', `released ${a.name} results to ${list}.`)
  return { released: pending }
}

export function markRead(state: DemoState, userId: string, id: string | 'all') {
  for (const n of state.notifications[userId] ?? []) if (id === 'all' || n.id === id) n.read = true
}

export function saveRubric(state: DemoState, key: AssessmentKey, criteria: Criterion[]) {
  if (!criteria.length) throw new DemoError(400, 'A rubric needs at least one criterion.')
  if (weightsTotal(criteria.map((c) => c.weight)) !== 100) throw new DemoError(422, `Weights must add up to 100%. They add up to ${weightsTotal(criteria.map((c) => c.weight))}%.`, 'weights-not-100')
  if (criteria.some((c) => !c.name.trim())) throw new DemoError(400, 'Every criterion needs a name.')
  const r = rubric(state, key)
  r.criteria = criteria.map((c) => ({ ...c, id: c.id || nextId(state, 'c') }))
  // New criteria start unscored on existing drafts.
  for (const e of state.evaluations.filter((x) => x.assessment === key && x.status === 'DRAFT')) {
    for (const c of r.criteria) if (!(c.id in e.levels)) e.levels[c.id] = null
  }
}

export function setDue(state: DemoState, key: AssessmentKey, isoDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) throw new DemoError(400, 'Pick a valid date.')
  state.dues[key] = isoDate
}

export function moveDefense(state: DemoState, teamId: string, start: string, room?: string) {
  const t = team(state, teamId)
  if (!t.defense) t.defense = { start, minutes: 40, room: room ?? 'Amphi A' }
  else {
    t.defense.start = start
    if (room) t.defense.room = room
  }
  const when = `${fmtDay(start)}, ${fmtTime(start)}, ${t.defense.room}`
  activity(state, 'schedule', 'Schedule', `Team ${t.name} moved to ${when}.`)
  const jury = t.members.filter((m) => m.role === 'JURY').map((m) => m.reviewerId)
  const students = state.students.filter((s) => s.teamId === teamId).map((s) => s.id)
  notify(state, [...jury, ...admins(state)], 'schedule', `Defense changed: Team ${t.name}, ${when}.`, '/schedule')
  notify(state, students, 'schedule', `Your defense moved to ${when}.`, '/schedule')
}

/* ---------- teams and people (P8) ---------- */

export function createTeam(state: DemoState, name: string, projectTitle: string): Team {
  if (!name.trim()) throw new DemoError(400, 'Give the team a name.')
  if (state.teams.some((t) => t.name.toLowerCase() === name.trim().toLowerCase())) {
    throw new DemoError(409, `There is already a Team ${name.trim()}.`, 'team-name-taken')
  }
  const t: Team = { id: nextId(state, 't'), name: name.trim(), projectTitle: projectTitle.trim(), description: '', members: [], defense: null }
  state.teams.push(t)
  return t
}

export function updateTeam(state: DemoState, teamId: string, patch: { name?: string; projectTitle?: string; description?: string }) {
  const t = team(state, teamId)
  if (patch.name !== undefined) {
    if (!patch.name.trim()) throw new DemoError(400, 'Give the team a name.')
    t.name = patch.name.trim()
  }
  if (patch.projectTitle !== undefined) t.projectTitle = patch.projectTitle.trim()
  if (patch.description !== undefined) t.description = patch.description.trim()
}

export function deleteTeam(state: DemoState, teamId: string) {
  if (state.evaluations.some((e) => e.teamId === teamId)) {
    throw new DemoError(409, 'This team already has evaluations, so it can’t be deleted.', 'team-has-submissions')
  }
  state.teams = state.teams.filter((t) => t.id !== teamId)
  state.students = state.students.filter((s) => s.teamId !== teamId)
}

export function addStudent(state: DemoState, teamId: string, firstName: string, lastName: string, email: string) {
  team(state, teamId)
  if (!firstName.trim() || !lastName.trim()) throw new DemoError(400, 'Enter the student’s first and last name.')
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new DemoError(400, 'Enter a valid email address.')
  state.students.push({ id: nextId(state, 's'), firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), teamId })
}

export function removeStudent(state: DemoState, studentId: string) {
  if (['s-nour'].includes(studentId)) throw new DemoError(409, 'Nour is the student persona of this demo, so she stays on Team Alpha.', 'student-is-demo-persona')
  state.students = state.students.filter((s) => s.id !== studentId)
}

export function assignReviewer(state: DemoState, teamId: string, reviewerId: string, role: ReviewerRole) {
  const t = team(state, teamId)
  reviewer(state, reviewerId)
  if (t.members.some((m) => m.reviewerId === reviewerId)) throw new DemoError(409, 'Already on this team.')
  if (t.members.length >= 5) throw new DemoError(422, 'A team can have at most 5 reviewers.', 'composition-invalid')
  t.members.push({ reviewerId, role })
  notify(state, [reviewerId], 'team', `You were assigned to Team ${t.name} as ${role === 'JURY' ? 'a jury member' : 'the advisor'}.`, '/my-teams')
}

export function unassignReviewer(state: DemoState, teamId: string, reviewerId: string) {
  const t = team(state, teamId)
  if (state.evaluations.some((e) => e.teamId === teamId && e.reviewerId === reviewerId && e.status === 'SUBMITTED')) {
    throw new DemoError(409, 'This reviewer has submitted evaluations for the team, so they stay on it.', 'reviewer-has-submissions')
  }
  const after = t.members.filter((m) => m.reviewerId !== reviewerId)
  const check = composition({ ...t, members: after })
  if (check.jury < 1 || check.advisors < 1) {
    throw new DemoError(422, `Removing them would leave the team with ${check.jury < 1 ? 'no jury member' : 'no advisor'}. Assign a replacement first.`, 'composition-invalid')
  }
  t.members = after
  state.evaluations = state.evaluations.filter((e) => !(e.teamId === teamId && e.reviewerId === reviewerId))
}

export { auditText }

export function nextNotificationId(state: DemoState): string {
  return nextId(state, 'n')
}
