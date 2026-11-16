import { browserDemoSessionId as demoSessionId } from '@/auth/demo-session'

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

export async function request<T>(method: string, path: string, body?: unknown, opts: { raw?: boolean } = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(apiUrl(path), {
      method,
      headers: {
        ...(await authHeaders()),
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
    const err = new ApiError(res.status, p.detail ?? FALLBACK[res.status] ?? p.title ?? 'Something went wrong.', p.code ?? String(res.status), p.errors ?? [], p)
    if (res.status === 401) onUnauthorized?.()
    // The session endpoints handle their own 404; anywhere else it means the copy vanished mid-visit.
    else if ((err.code === 'demo-session-not-found' && !path.startsWith('/api/demo/session')) || err.code === 'demo-session-required') onSessionProblem?.(err)
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
