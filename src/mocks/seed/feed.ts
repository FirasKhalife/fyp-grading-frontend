import type { ActivityKind, NotificationKind } from '@/domain/types'

/** Activity feed (coordinator overview) and personal notifications, as offsets from "today". */

export interface FeedSpec {
  kind: ActivityKind
  who: string
  text: string
  /** The team the line is about (team history). */
  team: string
  /** [days from today, "hh:mm"], or minutes ago for items earlier today. */
  at: [number, string] | { minutesAgo: number }
}

export const ACTIVITY: FeedSpec[] = [
  { kind: 'submit', who: 'Lea Mansour', text: 'submitted the Final presentation for Team Epsilon (1 of 3).', team: 't-epsilon', at: { minutesAgo: 25 } },
  { kind: 'edit', who: 'Karim Nassar', text: 'saved a draft of the Advisor assessment for Team Delta, overdue since {due:ADVISOR_ASSESSMENT}.', team: 't-delta', at: { minutesAgo: 70 } },
  { kind: 'edit', who: 'Jane Smith', text: 'changed Problem formulation 2 → 3 in her Team Beta final report draft.', team: 't-beta', at: { minutesAgo: 118 } },
  { kind: 'schedule', who: 'Schedule', text: 'Team Delta moved to {defense:t-delta}, Room B-204. John Doe is now in two defenses at 09:00.', team: 't-delta', at: { minutesAgo: 153 } },
  { kind: 'final', who: 'Team Zeta', text: 'Final presentation grade is final: {grade:t-zeta:FINAL_PRESENTATION}.', team: 't-zeta', at: [-1, '17:15'] },
  { kind: 'final', who: 'Team Gamma', text: 'final grade computed: {final:t-gamma}.', team: 't-gamma', at: [-1, '16:20'] },
  { kind: 'release', who: 'You', text: 'released Final presentation results to Team Alpha.', team: 't-alpha', at: [-1, '12:05'] },
]

export interface NotificationSpec {
  kind: NotificationKind
  text: string
  at: [number, string] | { minutesAgo: number }
  href: string
  read: boolean
}

/** Keyed by user id (reviewer or student). Placeholders are resolved against the seeded data. */
export const NOTIFICATIONS: Record<string, NotificationSpec[]> = {
  'r-jane': [
    {
      kind: 'due',
      text: 'Final report for Team Beta is due {dueday:FINAL_REPORT}, {duerel:FINAL_REPORT}. Your draft has 8 of 13 criteria scored.',
      at: [0, '08:00'],
      href: '/grade/t-beta/final-report',
      read: false,
    },
    { kind: 'schedule', text: 'Defense confirmed: Team Beta, {defense:t-beta}, Amphi A.', at: { minutesAgo: 150 }, href: '/schedule', read: false },
    { kind: 'final', text: 'Final presentation for Team Alpha is final: {grade:t-alpha:FINAL_PRESENTATION}.', at: [-1, '15:10'], href: '/my-teams', read: true },
    { kind: 'final', text: "Team Alpha's final grade is computed: {final:t-alpha}.", at: [-1, '15:10'], href: '/my-teams', read: true },
    { kind: 'final', text: 'Final report for Team Epsilon is final: {grade:t-epsilon:FINAL_REPORT}.', at: [-2, '19:00'], href: '/my-teams', read: true },
    { kind: 'team', text: 'You were assigned to Team Epsilon as a jury member.', at: [-147, '09:00'], href: '/my-teams', read: true },
  ],
  'r-rania': [
    { kind: 'due', text: '2 advisor assessments are overdue: Team Delta (draft) and Team Zeta (not started).', at: [0, '08:00'], href: '/overview', read: false },
    { kind: 'schedule', text: 'Conflict: John Doe is on two juries {defense:t-delta}.', at: { minutesAgo: 152 }, href: '/schedule', read: false },
    { kind: 'final', text: 'Final presentation for Team Zeta is final: {grade:t-zeta:FINAL_PRESENTATION}.', at: [-1, '17:15'], href: '/teams/t-zeta', read: false },
    { kind: 'final', text: "Team Gamma's final grade is computed: {final:t-gamma}.", at: [-1, '16:20'], href: '/teams/t-gamma', read: false },
    { kind: 'final', text: "Team Alpha's final grade is computed: {final:t-alpha}.", at: [-1, '15:10'], href: '/teams/t-alpha', read: true },
  ],
  'r-karim': [
    { kind: 'due', text: 'Advisor assessment for Team Delta is overdue (due {dueday:ADVISOR_ASSESSMENT}). Your draft has 3 of 5 criteria scored.', at: [0, '08:00'], href: '/grade/t-delta/advisor-assessment', read: false },
    { kind: 'due', text: 'Final presentation for Team Epsilon is due {dueday:FINAL_PRESENTATION}, {duerel:FINAL_PRESENTATION}.', at: [0, '08:00'], href: '/grade/t-epsilon/final-presentation', read: false },
    { kind: 'final', text: "Team Gamma's final grade is computed: {final:t-gamma}.", at: [-1, '16:20'], href: '/my-teams', read: true },
  ],
  's-nour': [
    { kind: 'release', text: 'Your Final presentation results are available.', at: [-1, '12:05'], href: '/student', read: false },
    { kind: 'release', text: 'Your Final report results are available.', at: [-2, '09:00'], href: '/student', read: true },
    { kind: 'release', text: 'Your Advisor assessment results are available.', at: [-4, '09:00'], href: '/student', read: true },
    { kind: 'schedule', text: 'Your defense is scheduled: {defense:t-alpha}, Amphi A.', at: [-30, '10:00'], href: '/schedule', read: true },
  ],
  's-ahmad': [
    { kind: 'schedule', text: 'Your defense is confirmed: {defense:t-beta}, Amphi A.', at: [0, '09:40'], href: '/schedule', read: false },
    { kind: 'release', text: 'Your Progress report results are available.', at: [-63, '10:00'], href: '/student', read: true },
    { kind: 'release', text: 'Your Proposal presentation results are available.', at: [-99, '10:00'], href: '/student', read: true },
  ],
}
