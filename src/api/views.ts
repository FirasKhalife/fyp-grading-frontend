import type {
  Activity,
  AppNotification,
  Assessment,
  AuditEntry,
  Criterion,
  DefenseSlot,
  Evaluation,
  Level,
  Release,
  Reviewer,
  ReviewerRole,
  Rubric,
  Student,
  Team,
} from '@/domain/types'

/** Read models the screens consume. The repository builds them, from the mock db or from the API. */

export type EvalState = 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED'

export interface PersonRef {
  id: string
  name: string
  initials: string
}

export interface MyEvalRow {
  assessment: Assessment
  state: EvalState
  /** Not submitted and past due. */
  overdue: boolean
  /** Submitted after the due date: stays marked (brief 4.4). */
  submittedLate: boolean
  score: number | null
  scored: number
  total: number
}

export interface MyTeamCard {
  team: Team
  role: ReviewerRole
  advisors: PersonRef[]
  jury: PersonRef[]
  rows: MyEvalRow[]
}

export interface MyTeamsView {
  cards: MyTeamCard[]
  summary: { expected: number; submitted: number; drafts: number; notStarted: number; overdue: number }
  nextUp: { team: Team; row: MyEvalRow } | null
}

export interface PeerStatus {
  reviewer: PersonRef
  you: boolean
  state: EvalState
  at: string | null
}

export interface GradingView {
  team: Team
  assessment: Assessment
  rubric: Rubric
  evaluation: Evaluation | null
  role: ReviewerRole
  peers: PeerStatus[]
  /** From the server: not submitted and past due. */
  overdue: boolean
  /** From the server: submitted after the due date. */
  submittedLate: boolean
}

export interface ReviewerScore {
  reviewer: PersonRef
  state: EvalState
  submittedLate?: boolean
  /** Score so far (submitted, or the draft's running score); null when the server hides it. */
  score: number | null
  evaluation: Evaluation | null
}

export interface TeamAssessmentInfo {
  assessment: Assessment
  expected: number
  submitted: number
  drafts: number
  /** Plain average once every reviewer has submitted. */
  grade: number | null
  release: Release | null
  reviewers: ReviewerScore[]
  overdue: boolean
  spread: number | null
  /** Reviewers more than the threshold apart (server flag). Informational only; false while scores are hidden. */
  disagreement: boolean
}

export interface GridRow {
  team: Team
  cells: TeamAssessmentInfo[]
  final: number | null
  /** All five released, so students can see the final grade. */
  finalVisible: boolean
  needs: string
  attention: boolean
}

export interface ReleaseCandidate {
  assessment: Assessment
  finalTeams: Team[]
  pendingTeams: Team[]
  releasedCount: number
}

export interface OverviewView {
  teamCount: number
  reviewerCount: number
  kpis: {
    submitted: number
    expected: number
    overdue: { count: number; label: string }
    finals: { count: number; names: string[] }
    released: number
    /** Every team × assessment result (the denominator of "released"). */
    releasable: number
    /** Final but not released yet: the server's `resultsReleasable`. */
    readyToRelease: number
    teamCount: number
    average: number | null
  }
  rows: GridRow[]
  releases: ReleaseCandidate[]
  releaseCounts: Record<string, number>
  /** null while the feed can't be loaded (notification-service down); the rest of the overview still shows. */
  activity: Activity[] | null
  insights: Insights
}

/** P5 insights (contract 1.2.0 `Overview.insights`). Informational only. */
export interface Insights {
  threshold: number
  /** Ten 10-point bands of final grades, lowest first. */
  distribution: { from: number; to: number; count: number }[]
  /** Largest spread first. */
  disagreements: { team: { id: string; name: string }; assessment: Assessment; spread: number; submitted: number }[]
}

export interface Conflict {
  reviewer: PersonRef
  teams: Team[]
  start: string
}

export interface TeamDetailView {
  team: Team
  students: Student[]
  reviewers: { reviewer: Reviewer; role: ReviewerRole; canRemove: boolean }[]
  composition: CompositionCheck
  conflicts: Conflict[]
  assessments: (TeamAssessmentInfo & { rubric: Rubric; history: { reviewer: PersonRef; entries: AuditEntry[] }[] })[]
  final: number | null
  finalCount: number
}

export interface CompositionCheck {
  ok: boolean
  total: number
  jury: number
  advisors: number
  text: string
}

export interface RubricsView {
  assessments: Assessment[]
  rubrics: Rubric[]
  /** Last save per assessment (Paris wall clock) and who made it; null for the seed. */
  edited: Record<string, { at: string | null; by: string } | null>
  submittedCount: Record<string, { total: number; byTeam: { team: string; count: number }[] }>
}

export interface ScheduleSlot {
  team: Team
  slot: DefenseSlot
  jury: PersonRef[]
  conflict: boolean
  done: boolean
}

export interface ScheduleView {
  days: string[]
  slots: ScheduleSlot[]
  conflicts: Conflict[]
  dues: { assessment: Assessment; submitted: number; expected: number; overdue: number }[]
  /** Visible scope: everything (admin), own defenses (reviewer), own slot (student). */
  scope: 'all' | 'reviewer' | 'student'
  /** Teams without a defense slot yet (admin only). */
  unslotted: Team[]
}

export interface StudentCriterionRow {
  criterion: Criterion
  levels: { reviewer: PersonRef; level: Level | null }[]
  comments: { reviewer: PersonRef; text: string }[]
}

export interface StudentResult {
  assessment: Assessment
  released: boolean
  release: Release | null
  grade: number | null
  reviewers: { reviewer: PersonRef; score: number | null }[]
  overall: { reviewer: PersonRef; text: string }[]
  criteria: StudentCriterionRow[]
  state: 'UPCOMING' | 'BEING_GRADED' | 'GRADED' | 'RELEASED'
  defended: boolean
}

export interface StudentHomeView {
  me: Student
  team: Team
  teammates: Student[]
  advisors: PersonRef[]
  jury: PersonRef[]
  results: StudentResult[]
  releasedCount: number
  final: number | null
  latestRelease: Release | null
}

export interface TeamsListView {
  teams: { team: Team; students: Student[]; reviewers: { reviewer: Reviewer; role: ReviewerRole }[]; composition: CompositionCheck; canDelete: boolean }[]
  reviewers: Reviewer[]
}

export interface NotificationsView {
  items: AppNotification[]
  unread: number
}
