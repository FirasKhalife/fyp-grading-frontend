/**
 * The demo calendar is relative: "today" is always defense day 2, and every other date is an offset
 * from it (proposal due 110 days before, defenses on days -1, 0, +1, and so on). Nothing hard-codes
 * a calendar date, so the demo never goes stale.
 */

import { parisWall } from './tz'

const DAY_MS = 86_400_000

let fixedNow: Date | null = null

/** Tests pin the clock so dates and countdowns are deterministic. */
export function setDemoNow(d: Date | null): void {
  fixedNow = d
}

let sessionToday: string | null = null

/**
 * Anchors "today" on the demo session's `today` (defense day 2 of this copy), so the screens agree
 * with the server even if the browser clock is off or the nightly purge runs late.
 */
export function setSessionToday(isoDate: string | null) {
  sessionToday = isoDate && /^\d{4}-\d{2}-\d{2}$/.test(isoDate) ? isoDate : null
}

/** "Now" on the Paris wall clock (see tz.ts): the session's date, the clock's time. Tests pin it with setDemoNow. */
export function now(): Date {
  if (fixedNow) return new Date(fixedNow)
  const wall = parisWall()
  if (!sessionToday) return wall
  const [y, m, d] = sessionToday.split('-').map(Number)
  return new Date(y!, m! - 1, d!, wall.getHours(), wall.getMinutes(), wall.getSeconds())
}

/** The real instant, for anything computed with Intl in a time zone. */
export function realNow(): Date {
  return new Date()
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Local date `offset` days from today. */
export function dayFromToday(offset: number): Date {
  const t = startOfDay(now())
  return new Date(t.getFullYear(), t.getMonth(), t.getDate() + offset)
}

const pad = (n: number) => String(n).padStart(2, '0')

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function toIsoDateTime(d: Date): string {
  return `${toIsoDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
}

/** ISO date `offset` days from today. */
export function isoDay(offset: number): string {
  return toIsoDate(dayFromToday(offset))
}

/** ISO local date-time `offset` days from today at hh:mm. */
export function isoAt(offset: number, hhmm: string): string {
  return `${isoDay(offset)}T${hhmm}:00`
}

/** ISO local date-time `minutes` before now. */
export function isoMinutesAgo(minutes: number): string {
  return toIsoDateTime(new Date(now().getTime() - minutes * 60_000))
}

export function parseLocal(iso: string): Date {
  const [datePart = '', timePart = '00:00'] = iso.split('T')
  const [y, m, d] = datePart.split('-').map(Number)
  const [hh, mm] = timePart.split(':').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0)
}

/** Whole days from today to the date (negative = past). */
export function daysFromToday(iso: string): number {
  const d = startOfDay(parseLocal(iso))
  return Math.round((d.getTime() - startOfDay(now()).getTime()) / DAY_MS)
}

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WD_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MON_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** "Fri 12 Jun" */
export function fmtDay(iso: string): string {
  const d = parseLocal(iso)
  return `${WD[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`
}

/** "12 Jun" */
export function fmtShort(iso: string): string {
  const d = parseLocal(iso)
  return `${d.getDate()} ${MON[d.getMonth()]}`
}

/** "JUN" */
export function fmtMonthAbbr(iso: string): string {
  return MON[parseLocal(iso).getMonth()]!.toUpperCase()
}

export function dayOfMonth(iso: string): number {
  return parseLocal(iso).getDate()
}

/** "Fri 12 Jun 2026" */
export function fmtDayYear(iso: string): string {
  return `${fmtDay(iso)} ${parseLocal(iso).getFullYear()}`
}

/** "Wednesday 10 June" */
export function fmtLong(iso: string, withYear = false): string {
  const d = parseLocal(iso)
  return `${WD_LONG[d.getDay()]} ${d.getDate()} ${MON_LONG[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ''}`
}

/** "09:00" */
export function fmtTime(iso: string): string {
  const d = parseLocal(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function addMinutes(iso: string, minutes: number): string {
  return toIsoDateTime(new Date(parseLocal(iso).getTime() + minutes * 60_000))
}

/** "today", "tomorrow", "in 2 days", "yesterday", "3 days ago" */
export function fmtRelativeDays(iso: string): string {
  const n = daysFromToday(iso)
  if (n === 0) return 'today'
  if (n === 1) return 'tomorrow'
  if (n === -1) return 'yesterday'
  return n > 0 ? `in ${n} days` : `${-n} days ago`
}

/** Activity and notification stamps: "Today 11:48", "Yesterday 17:15", "Mon 8 Jun", "14 Jan". */
export function fmtStamp(iso: string): string {
  const n = daysFromToday(iso)
  if (n === 0) return `Today ${fmtTime(iso)}`
  if (n === -1) return `Yesterday ${fmtTime(iso)}`
  if (n > -7 && n < 0) return fmtDay(iso)
  return fmtShort(iso)
}

/** "just now", "2 min ago", "1 h ago" for the autosave line. */
export function fmtAgo(iso: string): string {
  const mins = Math.floor((now().getTime() - parseLocal(iso).getTime()) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h} h ago`
  return fmtStamp(iso)
}

/** Time left until the next midnight in Europe/Paris, e.g. "9 h 28 min". */
export function untilParisMidnight(at: Date = realNow()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at)
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  const left = 24 * 60 - (h * 60 + m)
  const lh = Math.floor(left / 60)
  const lm = left % 60
  return lh > 0 ? `${lh} h ${lm} min` : `${lm} min`
}

/** The academic year the demo runs in (the spring semester that holds "today"). */
export function sessionYear(): number {
  return now().getFullYear()
}
