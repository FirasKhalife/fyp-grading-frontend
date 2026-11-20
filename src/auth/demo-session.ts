/**
 * The browser's demo session id: a random UUID kept in localStorage, sent as X-Demo-Session on every
 * call. It is not a fingerprint and not personal data. Clearing site data starts a new copy.
 */

const SESSION_KEY = 'assay-demo-session'
const RESET_FLAG = 'assay-demo-reset-overnight'
const HAD_COPY = 'assay-demo-had-copy'

let memoryId: string | null = null

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* private mode: keep it in memory */
  }
}
function safeRemove(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

/**
 * A random v4 UUID. crypto.randomUUID needs a secure context (HTTPS or localhost); getRandomValues
 * does not, so a plain-HTTP origin gets the same strength, with no weaker fallback.
 */
export function uuid(): string {
  if (typeof crypto.randomUUID === 'function' && globalThis.isSecureContext !== false) return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6]! & 0x0f) | 0x40 // version 4
  b[8] = (b[8]! & 0x3f) | 0x80 // RFC 4122 variant
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

/** Forget an unusable id; the next call makes a new one (and so a new copy). */
export function resetBrowserDemoSessionId() {
  safeRemove(SESSION_KEY)
  memoryId = null
}

/** Adopt the id the server handed back (a reset creates the fresh copy under a NEW id, contract 1.3.0). */
export function setBrowserDemoSessionId(id: string) {
  safeSet(SESSION_KEY, id)
  memoryId = id
}

/** True when this browser already has an id (and so possibly a copy); does not create one. */
export function hasBrowserDemoSessionId(): boolean {
  return (safeGet(SESSION_KEY) ?? memoryId) !== null
}

export function browserDemoSessionId(): string {
  let id = safeGet(SESSION_KEY) ?? memoryId
  if (!id) {
    id = uuid()
    safeSet(SESSION_KEY, id)
  }
  memoryId = id
  return id
}

/** Set once the server confirmed a copy exists for this browser's id. */
export function markCopyCreated() {
  safeSet(HAD_COPY, '1')
}

/**
 * A 404 for the demo session means "purged overnight" only if this browser had a copy before;
 * a brand-new browser simply has none yet. Clears the marker either way.
 */
export function wasPurged(): boolean {
  const had = safeGet(HAD_COPY) === '1'
  safeRemove(HAD_COPY)
  return had
}

/** Marks that the server said this copy is gone (purged at midnight), for the landing banner. */
export function markOvernightReset() {
  safeSet(RESET_FLAG, '1')
}

export function consumeOvernightReset(): boolean {
  const v = safeGet(RESET_FLAG) === '1'
  if (v) safeRemove(RESET_FLAG)
  return v
}
