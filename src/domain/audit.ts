import type { AuditEntry } from './types'

/** Human text for an audit line: "Changed Problem formulation 2 → 3". */
export function auditText(e: Pick<AuditEntry, 'kind' | 'criterionName' | 'from' | 'to'>): string {
  const name = e.criterionName ? (e.criterionName.length > 60 ? `${e.criterionName.slice(0, 58)}…` : e.criterionName) : 'a criterion'
  switch (e.kind) {
    case 'CREATED':
      return 'Started the draft'
    case 'LEVEL_CHANGED':
      return e.from === null || e.from === undefined ? `Set ${name} to ${e.to}` : `Changed ${name} ${e.from} → ${e.to}`
    case 'COMMENT_CHANGED':
      return `Edited the comment on ${name}`
    case 'OVERALL_COMMENT_CHANGED':
      return 'Edited the overall comment'
    case 'SUBMITTED':
      return 'Submitted and locked'
  }
}
