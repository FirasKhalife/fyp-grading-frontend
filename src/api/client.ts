import { browserDemoSessionId as demoSessionId } from '@/auth/demo-session'
import { parseRetryAfter, problemMessage } from './problems'

/**
 * Thin fetch client for the gateway. Every data call carries the bearer token (read fresh on each
 * request, never cached at module load) and the browser's demo session id. Errors are RFC 9457
 * problem details: callers switch on `code` and may show `detail` as is.
 */

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string = 'unknown',
    public errors: { field: string; message: string }[] = [],
    public extra: Record<string, unknown> = {},
    /** Seconds from `Retry-After` (429, 503), when the server sent it. */
    public retryAfter: number | null = null,
  ) {
    super(message)
  }
}

type TokenProvider = () => Promise<string | null> | string | null
let tokenProvider: TokenProvider = () => null
export function setTokenProvider(fn: TokenProvider) {
  tokenProvider = fn
}

let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn
}

/** For callers outside `request` (the live stream) that see a 401. */
export function notifyUnauthorized() {
  onUnauthorized?.()
}

/**
 * App-wide reactions to a few problem codes, kept apart from per-screen errors:
 * 404 `demo-session-not-found` (the copy was purged while the tab was open) and
 * 400 `demo-session-required` (the stored session id is unusable).
 */
type ProblemHandler = (e: ApiError) => void
let onSessionProblem: ProblemHandler | null = null
export function setSessionProblemHandler(fn: ProblemHandler | null) {
  onSessionProblem = fn
}

export async function authHeaders(): Promise<Record<string, string>> {
  const token = await tokenProvider()
  return {
    'X-Demo-Session': demoSessionId(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function apiUrl(path: string): string {
  return `${BASE}${path}`
}

const FALLBACK: Record<number, string> = {
  401: 'You were signed out. Sign in again.',
  403: "You don't have access to this.",
  404: "That doesn't exist anymore.",
  429: 'Too many requests. Wait a few seconds and try again.',
  503: 'The demo is starting up, try again in a minute.',
}

/** 503 `demo-copy-in-progress`: the copy is still being created. Wait as told, a few times, then give up. */
const COPY_IN_PROGRESS_TRIES = 3

export async function request<T>(method: string, path: string, body?: unknown, opts: { raw?: boolean } = {}): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await requestOnce<T>(method, path, body, opts)
    } catch (e) {
      if (!(e instanceof ApiError) || e.code !== 'demo-copy-in-progress' || attempt >= COPY_IN_PROGRESS_TRIES) throw e
      await new Promise((r) => setTimeout(r, Math.min(5, e.retryAfter ?? 1) * 1000))
    }
  }
}

async function requestOnce<T>(method: string, path: string, body: unknown, opts: { raw?: boolean }): Promise<T> {
  let res: Response
  const headers = await authHeaders()
  try {
    res = await fetch(apiUrl(path), {
      method,
      headers: {
        ...headers,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        // Raw calls are the CSV export, which the server only produces as text/csv.
        Accept: opts.raw ? 'text/csv, */*;q=0.1' : 'application/json',
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, "The server didn't respond. Check your connection and try again.", 'network-error')
  }
  if (!res.ok) {
    let p: { code?: string; detail?: string; title?: string; errors?: { field: string; message: string }[] } & Record<string, unknown> = {}
    try {
      p = (await res.json()) as typeof p
    } catch {
      /* not a problem document */
    }
    const code = p.code ?? (res.status === 429 ? 'rate-limited' : String(res.status))
    const retryAfter = parseRetryAfter(res.headers.get('Retry-After'))
    const message = problemMessage(code, retryAfter) ?? p.detail ?? FALLBACK[res.status] ?? p.title ?? 'Something went wrong.'
    const err = new ApiError(res.status, message, code, p.errors ?? [], p, retryAfter)
    // A reply for a session id this browser no longer uses (a reset swapped it mid-request) says nothing about the current copy.
    const stale = headers['X-Demo-Session'] !== demoSessionId()
    if (res.status === 401) onUnauthorized?.()
    // The session endpoints handle their own 404; anywhere else it means the copy vanished mid-visit.
    else if (!stale && ((err.code === 'demo-session-not-found' && !path.startsWith('/api/demo/session')) || err.code === 'demo-session-required')) onSessionProblem?.(err)
    throw err
  }
  if (opts.raw) return (await res.text()) as T
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const api = {
  get: <T,>(path: string) => request<T>('GET', path),
  text: (path: string) => request<string>('GET', path, undefined, { raw: true }),
  post: <T,>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T,>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T,>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del: <T,>(path: string) => request<T>('DELETE', path),
}
