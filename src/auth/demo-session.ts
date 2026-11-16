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

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  // RFC 4122 v4 from Math.random as a last resort (non-secure contexts).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

/** Forget an unusable id; the next call makes a new one (and so a new copy). */
export function resetBrowserDemoSessionId() {
  safeRemove(SESSION_KEY)
  memoryId = null
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
