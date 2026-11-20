import type { Reviewer, Student, Team } from '@/domain/types'
import { isoAt } from '@/lib/demo-clock'

/** Demo people and teams from PRODUCT-BRIEF.md section 7 and the design handoff. */

export const REVIEWERS: Reviewer[] = [
  { id: 'r-rania', firstName: 'Rania', lastName: 'Haddad', email: 'rania.haddad@usj.edu.lb', isAdmin: true },
  { id: 'r-jane', firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@usj.edu.lb', isAdmin: false },
  { id: 'r-john', firstName: 'John', lastName: 'Doe', email: 'john.doe@usj.edu.lb', isAdmin: false },
  { id: 'r-michael', firstName: 'Michael', lastName: 'Johnson', email: 'michael.johnson@usj.edu.lb', isAdmin: false },
  { id: 'r-emily', firstName: 'Emily', lastName: 'Clark', email: 'emily.clark@usj.edu.lb', isAdmin: false },
  { id: 'r-karim', firstName: 'Karim', lastName: 'Nassar', email: 'karim.nassar@usj.edu.lb', isAdmin: false },
  { id: 'r-lea', firstName: 'Lea', lastName: 'Mansour', email: 'lea.mansour@usj.edu.lb', isAdmin: false },
]

const S = (id: string, first: string, last: string, teamId: string): Student => ({
  id,
  firstName: first,
  lastName: last,
  email: `${first}.${last}`.toLowerCase().replace(/\s+/g, '') + '@usj.edu.lb',
  teamId,
})

export const STUDENTS: Student[] = [
  S('s-nour', 'Nour', 'Khoury', 't-alpha'),
  S('s-rami', 'Rami', 'Saade', 't-alpha'),
  S('s-maya', 'Maya', 'Aoun', 't-alpha'),
  S('s-joe', 'Joe', 'Karam', 't-alpha'),
  S('s-ahmad', 'Ahmad', 'Fares', 't-beta'),
  S('s-christelle', 'Christelle', 'Nader', 't-beta'),
  S('s-georges', 'Georges', 'Hanna', 't-beta'),
  S('s-yara', 'Yara', 'Saliba', 't-beta'),
  S('s-hadi', 'Hadi', 'Mrad', 't-gamma'),
  S('s-rita', 'Rita', 'Khalil', 't-gamma'),
  S('s-charbel', 'Charbel', 'Azar', 't-gamma'),
  S('s-lynn', 'Lynn', 'Daher', 't-gamma'),
  S('s-omar', 'Omar', 'Itani', 't-delta'),
  S('s-sara', 'Sara', 'Rizk', 't-delta'),
  S('s-karl', 'Karl', 'Abboud', 't-delta'),
  S('s-tarek', 'Tarek', 'Sleiman', 't-epsilon'),
  S('s-nadine', 'Nadine', 'Bou Khalil', 't-epsilon'),
  S('s-fadi', 'Fadi', 'Akl', 't-epsilon'),
  S('s-celine', 'Celine', 'Matar', 't-epsilon'),
  S('s-marc', 'Marc', 'Tannous', 't-zeta'),
  S('s-jana', 'Jana', 'Hayek', 't-zeta'),
  S('s-ali', 'Ali', 'Zein', 't-zeta'),
]

const jury = (...ids: string[]) => ids.map((reviewerId) => ({ reviewerId, role: 'JURY' as const }))
const advisor = (reviewerId: string) => ({ reviewerId, role: 'ADVISOR' as const })

/** Defense days are -1, 0 (today) and +1. Slots last 40 minutes. */
export function seedTeams(): Team[] {
  return [
    {
      id: 't-alpha',
      name: 'Alpha',
      projectTitle: 'Smart irrigation controller with soil-moisture forecasting',
      description: 'A field node reads soil moisture and weather, forecasts the next 48 hours, and waters only when the forecast says the soil will dry out.',
      members: [advisor('r-emily'), ...jury('r-jane', 'r-john', 'r-lea')],
      defense: { start: isoAt(-1, '09:00'), minutes: 40, room: 'Amphi A' },
    },
    {
      id: 't-beta',
      name: 'Beta',
      projectTitle: 'Clinic queue management with SMS notifications',
      description: 'Patients take a queue number at reception or online, and get an SMS when their turn is close, so the waiting room stays small.',
      members: [advisor('r-emily'), ...jury('r-jane', 'r-john', 'r-michael')],
      defense: { start: isoAt(1, '09:00'), minutes: 40, room: 'Amphi A' },
    },
    {
      id: 't-gamma',
      name: 'Gamma',
      projectTitle: 'Arabic handwriting OCR for archived documents',
      description: 'A recognition pipeline for scanned handwritten Arabic records, with a review screen where archivists correct low-confidence words.',
      members: [advisor('r-lea'), ...jury('r-rania', 'r-karim', 'r-michael')],
      defense: { start: isoAt(-1, '11:00'), minutes: 40, room: 'Amphi A' },
    },
    {
      id: 't-delta',
      name: 'Delta',
      projectTitle: 'Campus carpool matching app',
      description: 'Students and staff offer and find rides to campus. Matching uses home area and timetable, and the app splits fuel costs.',
      members: [advisor('r-karim'), ...jury('r-john', 'r-emily')],
      defense: { start: isoAt(1, '09:00'), minutes: 40, room: 'Room B-204' },
    },
    {
      id: 't-epsilon',
      name: 'Epsilon',
      projectTitle: 'Energy monitoring dashboard for university buildings',
      description: 'Smart meters in three campus buildings feed a dashboard that flags waste, such as lights and air conditioning left on overnight.',
      members: [advisor('r-john'), ...jury('r-jane', 'r-lea', 'r-karim')],
      defense: { start: isoAt(0, '09:00'), minutes: 40, room: 'Amphi A' },
    },
    {
      id: 't-zeta',
      name: 'Zeta',
      projectTitle: 'Sign-language gesture recognition on a microcontroller',
      description: 'A glove with flex and motion sensors recognises 40 signs of Lebanese Sign Language on a microcontroller and speaks them aloud.',
      members: [advisor('r-michael'), ...jury('r-emily', 'r-lea', 'r-john')],
      defense: { start: isoAt(-1, '14:00'), minutes: 40, room: 'Room B-204' },
    },
  ]
}
