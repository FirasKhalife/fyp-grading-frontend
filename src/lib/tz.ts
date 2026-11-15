/**
 * The API speaks UTC instants; the demo is displayed in Europe/Paris (the time zone of the nightly reset
 * and of "today"). Inside the app, times are Paris wall-clock strings without a zone
 * ("2026-06-10T09:00:00"), which keeps day arithmetic simple and identical in every browser.
 */
export const DEMO_TZ = 'Europe/Paris'

const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: DEMO_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

function parts(d: Date): Record<string, string> {
  return Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]))
}

/** "2026-06-10T07:00:00Z" → "2026-06-10T09:00:00" (Paris wall clock). */
export function utcToParis(instant: string | Date): string {
  const p = parts(typeof instant === 'string' ? new Date(instant) : instant)
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`
}

/** Paris wall clock as a Date whose *local* fields read like Paris (for naive arithmetic). */
export function parisWall(at: Date = new Date()): Date {
  const p = parts(at)
  return new Date(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second))
}

/** "2026-06-10T09:00:00" (Paris) → "2026-06-10T07:00:00.000Z". Handles DST by re-checking the offset. */
export function parisToUtc(wall: string): string {
  const [d = '', t = '00:00:00'] = wall.split('T')
  const [y, mo, da] = d.split('-').map(Number)
  const [h, mi, s] = t.split(':').map(Number)
  const asUtc = Date.UTC(y ?? 1970, (mo ?? 1) - 1, da ?? 1, h ?? 0, mi ?? 0, s ?? 0)
  const offset = (ms: number) => {
    const w = parisWall(new Date(ms))
    return Date.UTC(w.getFullYear(), w.getMonth(), w.getDate(), w.getHours(), w.getMinutes(), w.getSeconds()) - ms
  }
  let guess = asUtc - offset(asUtc)
  guess = asUtc - offset(guess)
  return new Date(guess).toISOString()
}
