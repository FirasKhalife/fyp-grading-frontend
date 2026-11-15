import type { AssessmentKey, Criterion, Evaluation, ReviewerRole } from '@/domain/types'
import * as logic from '@/mocks/logic'
import { DemoError } from '@/mocks/logic'
import * as store from '@/mocks/store'
import type {
  GradingView,
  MyTeamsView,
  NotificationsView,
  OverviewView,
  RubricsView,
  ScheduleView,
  StudentHomeView,
  TeamDetailView,
  TeamsListView,
} from './views'

/**
 * Everything the screens read or write goes through this interface. Today it is backed by the
 * visitor's in-memory demo copy (mock mode). When contract/openapi.yaml lands, an HTTP implementation
 * built on the generated types replaces `localRepository`, and MSW serves the same demo copy over the
 * contract's endpoints for tests and the offline demo.
 */
export interface Viewer {
  userId: string
  kind: 'admin' | 'reviewer' | 'student'
}

export interface Repository {
  myTeams(v: Viewer): Promise<MyTeamsView>
  grading(v: Viewer, teamId: string, a: AssessmentKey): Promise<GradingView>
  saveDraft(v: Viewer, teamId: string, a: AssessmentKey, patch: logic.DraftPatch): Promise<Evaluation>
  submit(v: Viewer, teamId: string, a: AssessmentKey): Promise<Evaluation>
  overview(v: Viewer): Promise<OverviewView>
  release(v: Viewer, a: AssessmentKey): Promise<{ released: string[] }>
  teamDetail(v: Viewer, teamId: string): Promise<TeamDetailView>
  rubrics(v: Viewer): Promise<RubricsView>
  saveRubric(v: Viewer, a: AssessmentKey, criteria: Criterion[]): Promise<void>
  schedule(v: Viewer): Promise<ScheduleView>
  setDue(v: Viewer, a: AssessmentKey, date: string): Promise<void>
  moveDefense(v: Viewer, teamId: string, start: string, room?: string): Promise<void>
  notifications(v: Viewer): Promise<NotificationsView>
  markRead(v: Viewer, id: string | 'all'): Promise<void>
  studentHome(v: Viewer): Promise<StudentHomeView>
  teams(v: Viewer): Promise<TeamsListView>
  createTeam(v: Viewer, name: string, projectTitle: string): Promise<string>
  updateTeam(v: Viewer, teamId: string, patch: { name?: string; projectTitle?: string; description?: string }): Promise<void>
  deleteTeam(v: Viewer, teamId: string): Promise<void>
  addStudent(v: Viewer, teamId: string, first: string, last: string, email: string): Promise<void>
  removeStudent(v: Viewer, studentId: string): Promise<void>
  assignReviewer(v: Viewer, teamId: string, reviewerId: string, role: ReviewerRole): Promise<void>
  unassignReviewer(v: Viewer, teamId: string, reviewerId: string): Promise<void>
  resetDemo(): Promise<void>
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

/** Dev and test switches: `?simulate=error`, `?simulate=empty`, `?simulate=slow`. */
type Simulation = 'none' | 'error' | 'empty' | 'slow'
let simulation: Simulation = 'none'
export function setSimulation(s: Simulation) {
  simulation = s
}
export function getSimulation(): Simulation {
  return simulation
}
if (typeof window !== 'undefined') {
  const q = new URLSearchParams(window.location.search).get('simulate')
  if (q === 'error' || q === 'empty' || q === 'slow') simulation = q
}

let latencyMs = import.meta.env.MODE === 'test' ? 0 : 220
export function setLatency(ms: number) {
  latencyMs = ms
}

const wait = (ms: number) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve())

async function run<T>(fn: () => T, opts: { write?: boolean } = {}): Promise<T> {
  await wait(simulation === 'slow' ? 2500 : latencyMs)
  if (simulation === 'error' && !opts.write) throw new ApiError(503, "The server didn't respond.")
  try {
    return fn()
  } catch (e) {
    if (e instanceof DemoError) throw new ApiError(e.status, e.message)
    throw e
  }
}

function requireAdmin(v: Viewer) {
  if (v.kind !== 'admin') throw new ApiError(403, 'This is for coordinators.')
}

const read = <T,>(fn: (s: ReturnType<typeof store.getState>) => T) => run(() => fn(store.getState()))
const write = <T,>(fn: (s: ReturnType<typeof store.getState>) => T) => run(() => store.mutate(fn), { write: true })


export const localRepository: Repository = {
  myTeams: (v) =>
    read((s) => (simulation === 'empty' ? { cards: [], summary: { expected: 0, submitted: 0, drafts: 0, notStarted: 0, overdue: 0 }, nextUp: null } : logic.myTeamsView(s, v.userId))),
  grading: (v, t, a) => read((s) => logic.gradingView(s, v.userId, t, a)),
  saveDraft: (v, t, a, patch) => write((s) => logic.saveDraft(s, v.userId, t, a, patch)),
  submit: (v, t, a) => write((s) => logic.submitEvaluation(s, v.userId, t, a)),
  overview: (v) =>
    read((s) => {
      requireAdmin(v)
      if (simulation === 'empty') return logic.overviewView({ ...s, teams: [], activity: [], releases: [] })
      return logic.overviewView(s)
    }),
  release: (v, a) =>
    write((s) => {
      requireAdmin(v)
      return { released: logic.releaseAssessment(s, a).released.map((t) => t.id) }
    }),
  teamDetail: (v, t) =>
    read((s) => {
      requireAdmin(v)
      return logic.teamDetailView(s, t)
    }),
  rubrics: () => read((s) => logic.rubricsView(s)),
  saveRubric: (v, a, c) =>
    write((s) => {
      requireAdmin(v)
      logic.saveRubric(s, a, c)
    }),
  schedule: (v) => read((s) => logic.scheduleView(s, { id: v.userId, kind: v.kind })),
  setDue: (v, a, d) =>
    write((s) => {
      requireAdmin(v)
      logic.setDue(s, a, d)
    }),
  moveDefense: (v, t, start, room) =>
    write((s) => {
      requireAdmin(v)
      logic.moveDefense(s, t, start, room)
    }),
  notifications: (v) => read((s) => logic.notificationsView(s, v.userId)),
  markRead: (v, id) => write((s) => logic.markRead(s, v.userId, id)),
  studentHome: (v) => read((s) => logic.studentHomeView(s, v.userId)),
  teams: (v) =>
    read((s) => {
      requireAdmin(v)
      return logic.teamsListView(simulation === 'empty' ? { ...s, teams: [] } : s)
    }),
  createTeam: (v, n, p) =>
    write((s) => {
      requireAdmin(v)
      return logic.createTeam(s, n, p).id
    }),
  updateTeam: (v, t, patch) =>
    write((s) => {
      requireAdmin(v)
      logic.updateTeam(s, t, patch)
    }),
  deleteTeam: (v, t) =>
    write((s) => {
      requireAdmin(v)
      logic.deleteTeam(s, t)
    }),
  addStudent: (v, t, f, l, e) =>
    write((s) => {
      requireAdmin(v)
      logic.addStudent(s, t, f, l, e)
    }),
  removeStudent: (v, id) =>
    write((s) => {
      requireAdmin(v)
      logic.removeStudent(s, id)
    }),
  assignReviewer: (v, t, r, role) =>
    write((s) => {
      requireAdmin(v)
      logic.assignReviewer(s, t, r, role)
    }),
  unassignReviewer: (v, t, r) =>
    write((s) => {
      requireAdmin(v)
      logic.unassignReviewer(s, t, r)
    }),
  resetDemo: async () => {
    await wait(latencyMs ? 1400 : 0)
    store.resetCopy()
  },
}

export const repository: Repository = localRepository
