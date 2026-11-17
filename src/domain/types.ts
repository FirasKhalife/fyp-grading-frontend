/**
 * Domain model used by the screens. It mirrors PRODUCT-BRIEF.md section 2. When the OpenAPI
 * contract lands, the repository maps the generated DTOs onto these types, so screens don't change.
 */

export type AssessmentKey =
  | 'PROPOSAL_PRESENTATION'
  | 'PROGRESS_REPORT'
  | 'ADVISOR_ASSESSMENT'
  | 'FINAL_REPORT'
  | 'FINAL_PRESENTATION'

export type ReviewerRole = 'JURY' | 'ADVISOR'

/** The roles the screens know. REVIEWER is a faculty member who isn't one of the four demo personas. */
export type PersonaRole = 'COORDINATOR' | 'JURY' | 'ADVISOR' | 'REVIEWER' | 'STUDENT'

/** 0 = Not demonstrated … 4 = Exemplary. */
export type Level = 0 | 1 | 2 | 3 | 4

/** An ISO date (yyyy-mm-dd) or date-time, already resolved from the demo clock. */
export type IsoDate = string

export interface Assessment {
  key: AssessmentKey
  name: string
  shortName: string
  /** Weight in the team's final grade, in %. */
  weight: number
  role: ReviewerRole
  due: IsoDate
}

export interface Criterion {
  id: string
  name: string
  /** Weight within the assessment, in %. The weights of one rubric total 100. */
  weight: number
  /** Level descriptions for levels 1..4 (index 0 is level 1). Level 0 needs none. */
  descriptions: [string, string, string, string]
}

export interface Rubric {
  assessment: AssessmentKey
  criteria: Criterion[]
  /** Last save (Paris wall clock) and who made it; absent for the seed. */
  updatedAt?: string | null
  updatedById?: string | null
}

export interface Person {
  id: string
  firstName: string
  lastName: string
  email: string
}

export interface Reviewer extends Person {
  isAdmin: boolean
}

export interface Student extends Person {
  teamId: string
}

export interface TeamMember {
  reviewerId: string
  role: ReviewerRole
}

export interface DefenseSlot {
  /** Start, ISO date-time in local time (no zone). */
  start: string
  minutes: number
  room: string
}

export interface Team {
  id: string
  name: string
  projectTitle: string
  description: string
  members: TeamMember[]
  defense: DefenseSlot | null
}

export type EvaluationStatus = 'DRAFT' | 'SUBMITTED'

export type AuditKind = 'CREATED' | 'LEVEL_CHANGED' | 'COMMENT_CHANGED' | 'OVERALL_COMMENT_CHANGED' | 'SUBMITTED'

/** One line of a draft's audit trail ("Jane changed Problem formulation 2 → 3"). */
export interface AuditEntry {
  at: string
  kind: AuditKind
  criterionId?: string | null
  criterionName?: string | null
  from?: Level | null
  to?: Level | null
}

export interface Evaluation {
  id: string
  teamId: string
  assessment: AssessmentKey
  reviewerId: string
  status: EvaluationStatus
  /** Level per criterion id; null while unscored. */
  levels: Record<string, Level | null>
  comments: Record<string, string>
  overallComment: string
  updatedAt: string
  submittedAt: string | null
  history: AuditEntry[]
}

export type NotificationKind = 'due' | 'schedule' | 'final' | 'team' | 'release'

export interface AppNotification {
  id: string
  kind: NotificationKind
  text: string
  at: string
  /** In-app path the item links to. */
  href: string
  read: boolean
}

export type ActivityKind = 'submit' | 'edit' | 'schedule' | 'final' | 'release' | 'assignment'

export interface Activity {
  id: string
  kind: ActivityKind
  who: string
  text: string
  at: string
  /** The team the line is about, for one team's history (contract 1.2.0 `GET /api/activity?teamId=`). */
  teamId?: string | null
}

export interface Release {
  assessment: AssessmentKey
  teamId: string
  at: string
}
