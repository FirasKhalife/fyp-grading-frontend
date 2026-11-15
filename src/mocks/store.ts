import { browserDemoSessionId, markOvernightReset } from '@/auth/demo-session'
import { realNow } from '@/lib/demo-clock'
import { createSeedState, STATE_VERSION, type DemoState } from './db'

/**
 * Holds the visitor's private demo copy in mock mode. The copy is keyed by the browser's demo
 * session id, saved to localStorage after every write, and dropped when it predates the last
 * midnight in Paris (the nightly reset).
 */

const COPY_PREFIX = 'assay-demo:'

let memory: DemoState | null = null
let memoryId: string | null = null
/** The session id of the request being served (the X-Demo-Session header), when it differs from this browser's. */
let activeId: string | null = null
const listeners = new Set<() => void>()

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

/** The demo session the mock server is serving: the request's X-Demo-Session, else this browser's. */
export function demoSessionId(): string {
  return activeId ?? browserDemoSessionId()
}

/** Start of today in Europe/Paris, as a Date. */
function lastParisMidnight(at: Date): Date {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const p = Object.fromEntries(fmt.formatToParts(at).map((x) => [x.type, x.value]))
  const sinceMidnight = (Number(p.hour) * 3600 + Number(p.minute) * 60 + Number(p.second)) * 1000
  return new Date(at.getTime() - sinceMidnight)
}

function load(): DemoState | null {
  const id = demoSessionId()
  if (memory && memoryId === id) return memory
  const raw = safeGet(COPY_PREFIX + id)
  if (!raw) return null
  try {
    const s = JSON.parse(raw) as DemoState
    if (s.version !== STATE_VERSION) return null
    if (new Date(s.createdAt) < lastParisMidnight(realNow())) {
      safeRemove(COPY_PREFIX + id)
      markOvernightReset()
      return null
    }
    memory = s
    memoryId = id
    return s
  } catch {
    return null
  }
}

function persist(s: DemoState) {
  memory = s
  memoryId = demoSessionId()
  safeSet(COPY_PREFIX + memoryId, JSON.stringify(s))
  for (const l of listeners) l()
}

/** Serve requests for another demo session id (the mock server honours X-Demo-Session). */
export function selectSession(id: string | null) {
  if (id === activeId) return
  activeId = id
  memory = null
}

export function hasCopy(): boolean {
  return load() !== null
}

export function createCopy(): DemoState {
  const s = createSeedState()
  persist(s)
  return s
}

export function getState(): DemoState {
  return load() ?? createCopy()
}

export function mutate<T>(fn: (s: DemoState) => T): T {
  const s = structuredClone(getState())
  const out = fn(s)
  persist(s)
  return out
}

export function resetCopy(): DemoState {
  safeRemove(COPY_PREFIX + demoSessionId())
  memory = null
  return createCopy()
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Other tabs of the same browser share the copy: pick up their writes. */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith(COPY_PREFIX)) {
      memory = null
      for (const l of listeners) l()
    }
  })
}
