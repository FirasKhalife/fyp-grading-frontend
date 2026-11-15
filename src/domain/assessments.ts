import type { AssessmentKey, ReviewerRole } from './types'

export interface AssessmentDef {
  key: AssessmentKey
  name: string
  shortName: string
  /** Weight in the team's final grade, in %. Real weights: 15/0/25/30/30. */
  weight: number
  role: ReviewerRole
  /** Due date as days from "today" (defense day 2). */
  dueOffset: number
}

/** Fixed order of the five checkpoints. */
export const ASSESSMENTS: readonly AssessmentDef[] = [
  { key: 'PROPOSAL_PRESENTATION', name: 'Proposal presentation', shortName: 'Proposal', weight: 15, role: 'JURY', dueOffset: -110 },
  { key: 'PROGRESS_REPORT', name: 'Progress report', shortName: 'Progress', weight: 0, role: 'JURY', dueOffset: -75 },
  { key: 'ADVISOR_ASSESSMENT', name: 'Advisor assessment', shortName: 'Advisor', weight: 25, role: 'ADVISOR', dueOffset: -5 },
  { key: 'FINAL_REPORT', name: 'Final report', shortName: 'Final report', weight: 30, role: 'JURY', dueOffset: 2 },
  { key: 'FINAL_PRESENTATION', name: 'Final presentation', shortName: 'Final pres.', weight: 30, role: 'JURY', dueOffset: 2 },
]

export const ASSESSMENT_KEYS = ASSESSMENTS.map((a) => a.key)

export function assessmentDef(key: AssessmentKey): AssessmentDef {
  const a = ASSESSMENTS.find((x) => x.key === key)
  if (!a) throw new Error(`Unknown assessment ${key}`)
  return a
}

/** URL slug for an assessment, e.g. "final-report". */
export function assessmentSlug(key: AssessmentKey): string {
  return key.toLowerCase().replace(/_/g, '-')
}

export function assessmentFromSlug(slug: string | undefined): AssessmentKey | null {
  if (!slug) return null
  const key = slug.toUpperCase().replace(/-/g, '_')
  return ASSESSMENTS.some((a) => a.key === key) ? (key as AssessmentKey) : null
}

export const ROLE_LABEL: Record<ReviewerRole, string> = { JURY: 'Jury', ADVISOR: 'Advisor' }
