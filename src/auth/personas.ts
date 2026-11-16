import type { PersonaRole } from '@/domain/types'

export type PersonaId = 'rania' | 'jane' | 'karim' | 'nour'

/** An identity: one of the four personas, or anyone else signed in with email (`id: 'account'`). */

export interface Persona {
  id: PersonaId | 'account'
  /** Reviewer or student id in the demo data (and the Keycloak username). */
  userId: string
  username: string
  firstName: string
  lastName: string
  role: PersonaRole
  roleLabel: string
  /** Where "Enter as …" lands. */
  home: string
  pitch: string
  tries: string[]
  landingNote: string
  switcherNote: string
}

/** The four demo personas (each has a fixed id). */
export type DemoPersona = Persona & { id: PersonaId }

export const PERSONAS: DemoPersona[] = [
  {
    id: 'rania',
    userId: 'r-rania',
    username: 'rania.haddad',
    firstName: 'Rania',
    lastName: 'Haddad',
    role: 'COORDINATOR',
    roleLabel: 'Coordinator',
    home: '/overview',
    pitch: "Runs the session for 6 teams. Also sits on Team Gamma's jury.",
    tries: [
      'Scan 6 teams × 5 assessments on one grid',
      'Release the Advisor assessment to the teams that are final',
      "Open Team Beta and compare its reviewers' scores",
    ],
    landingNote: 'Opens the coordinator overview',
    switcherNote: 'Coordinator · overview',
  },
  {
    id: 'jane',
    userId: 'r-jane',
    username: 'jane.smith',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'JURY',
    roleLabel: 'Jury member',
    home: '/my-teams',
    pitch: 'On the jury for 3 teams: one finished, one draft, one not started.',
    tries: ['Finish the final report draft for Team Beta', 'Watch the score move as you pick levels', 'Submit, then switch to Rania to see it arrive'],
    landingNote: 'Opens My teams, 1 draft waiting',
    switcherNote: 'Jury member · My teams',
  },
  {
    id: 'karim',
    userId: 'r-karim',
    username: 'karim.nassar',
    firstName: 'Karim',
    lastName: 'Nassar',
    role: 'ADVISOR',
    roleLabel: 'Advisor',
    home: '/my-teams',
    pitch: 'Advises Team Delta, whose advisor assessment is a draft and overdue.',
    tries: ["Complete Team Delta's overdue advisor assessment", 'Read the level descriptions in the rubric', 'Check your defense days'],
    landingNote: 'Opens My teams, 1 overdue',
    switcherNote: 'Advisor · My teams',
  },
  {
    id: 'nour',
    userId: 's-nour',
    username: 'nour.khoury',
    firstName: 'Nour',
    lastName: 'Khoury',
    role: 'STUDENT',
    roleLabel: 'Student',
    home: '/student',
    pitch: 'Team Alpha, Smart irrigation controller. All five results are released.',
    tries: ['See how the 88.0 final grade was built', "Read the reviewers' comments per criterion", "Find your team's defense slot"],
    landingNote: 'Opens the student home',
    switcherNote: 'Student, Team Alpha · home',
  },
]

export function personaById(id: string | null | undefined): DemoPersona | null {
  return PERSONAS.find((p) => p.id === id) ?? null
}

export function personaByUsername(username: string | null | undefined): DemoPersona | null {
  return PERSONAS.find((p) => p.username === username) ?? null
}

export const ROLE_SHORT: Record<PersonaRole, string> = {
  COORDINATOR: 'Coordinator',
  JURY: 'Jury',
  ADVISOR: 'Advisor',
  REVIEWER: 'Reviewer',
  STUDENT: 'Student',
}

/** Avatar fill per persona, from the landing board (level ramp as decoration only). */
export const AVATAR_CLASS: Record<PersonaId | 'account', string> = {
  rania: 'bg-l4 text-l4i',
  jane: 'bg-l3 text-l3i',
  karim: 'bg-l2 text-l2i',
  nour: 'bg-l1 text-l1i',
  account: 'bg-raised text-ink',
}

/** Anyone signed in through Keycloak: a persona if the username is one, otherwise built from the token's roles and `/api/me`. */
export function identityFrom(me: { id: string; firstName: string; lastName: string; roles: string[]; email: string }, username?: string | null): Persona {
  const known = personaByUsername(username ?? me.email.split('@')[0])
  if (known) return known
  const role: PersonaRole = me.roles.includes('ADMIN') ? 'COORDINATOR' : me.roles.includes('STUDENT') ? 'STUDENT' : 'REVIEWER'
  return {
    id: 'account',
    userId: me.id,
    username: username ?? me.email,
    firstName: me.firstName,
    lastName: me.lastName,
    role,
    roleLabel: ROLE_SHORT[role],
    home: role === 'COORDINATOR' ? '/overview' : role === 'STUDENT' ? '/student' : '/my-teams',
    pitch: '',
    tries: [],
    landingNote: '',
    switcherNote: '',
  }
}

/** Whether a deep link is worth returning to after sign-in for this persona. */
export function canVisit(p: Persona, path: string): boolean {
  if (path === '/' || path.startsWith('/roles')) return false
  if (path.startsWith('/rubrics') || path.startsWith('/schedule')) return !path.endsWith('/edit') || p.role === 'COORDINATOR'
  switch (p.role) {
    case 'COORDINATOR':
      return !path.startsWith('/student')
    case 'STUDENT':
      return path.startsWith('/student')
    default:
      return path.startsWith('/my-teams') || path.startsWith('/grade')
  }
}
