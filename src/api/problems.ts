/**
 * Plain-language messages for the problem codes the screens can meet (contract 1.3.0). The server's
 * `detail` is a sentence too, but these are written for this UI, so they win for the codes listed.
 * `Retry-After` (seconds) is folded in where the message says when to try again.
 */

export function problemMessage(code: string, retryAfter: number | null): string | null {
  const wait = retryAfter && retryAfter > 0 ? inSeconds(retryAfter) : 'in a moment'
  switch (code) {
    case 'rate-limited':
      return `That was a lot of requests in a short time. Try again ${wait}.`
    case 'service-unavailable':
      return `Part of the demo is starting up. Try again ${retryAfter ? wait : 'in a minute'}.`
    case 'demo-capacity':
      return 'The demo has handed out all its private copies for today. Try again later, or tomorrow after the midnight reset.'
    case 'demo-copy-in-progress':
      return `Your private copy is still being prepared. Try again ${wait}.`
    case 'too-many-streams':
      return 'Live updates are paused because this demo is open in many tabs. Pages still refresh on their own.'
    case 'evaluation-submitting':
      return 'Your evaluation is being submitted, so this change was not saved.'
    case 'evaluation-submitted':
      return 'This evaluation is already submitted and locked.'
    case 'assessment-final':
      return "This assessment's team grade is already final, so it can't change."
    case 'evaluation-changed':
      return 'Your draft changed while it was being submitted. Check it and submit again.'
    case 'rubric-changed':
      return 'The rubric changed since you opened this form. The page now shows the current criteria: check your levels, then try again.'
    case 'rubric-empty':
      return 'A rubric needs at least one criterion.'
    case 'concurrent-change':
      return 'Someone saved at the same moment. Try again.'
    default:
      return null
  }
}

function inSeconds(s: number): string {
  if (s < 60) return `in ${Math.ceil(s)} second${Math.ceil(s) === 1 ? '' : 's'}`
  const m = Math.ceil(s / 60)
  return `in ${m} minute${m === 1 ? '' : 's'}`
}

/** `Retry-After` as seconds: either a number or an HTTP date. */
export function parseRetryAfter(v: string | null): number | null {
  if (!v) return null
  const n = Number(v)
  if (Number.isFinite(n)) return Math.max(0, n)
  const d = Date.parse(v)
  return Number.isNaN(d) ? null : Math.max(0, (d - Date.now()) / 1000)
}
