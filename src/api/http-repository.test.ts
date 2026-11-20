import { fetchEventSource } from '@microsoft/fetch-event-source'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { browserDemoSessionId } from '@/auth/demo-session'
import { server } from '@/mocks/node'
import { api, apiUrl, setTokenProvider } from './client'
import { httpRepository } from './http-repository'
import { streamFetch } from './queries'

// What actually goes on the wire to the gateway. The real-stack Playwright suite covers these end to end;
// these checks catch a regression without a stack.

let seen: Request[] = []
let token: string | null = 'token-1'

beforeEach(() => {
  seen = []
  token = 'token-1'
  setTokenProvider(() => token)
  server.use(
    http.all('*/api/*', ({ request }) => {
      seen.push(request.clone())
      if (request.url.endsWith('/api/overview/export')) return new HttpResponse('team,grade\n', { headers: { 'Content-Type': 'text/csv' } })
      return HttpResponse.json({})
    }),
  )
})
afterEach(() => setTokenProvider(() => null))

const last = () => seen[seen.length - 1]!

describe('HTTP repository request headers', () => {
  it('sends Accept: application/json, the demo session id and the bearer token', async () => {
    await httpRepository.me()
    const h = last().headers
    expect(h.get('Accept')).toBe('application/json')
    expect(h.get('X-Demo-Session')).toBe(browserDemoSessionId())
    expect(h.get('Authorization')).toBe('Bearer token-1')
    expect(h.get('Content-Type')).toBeNull()
  })

  it('asks for text/csv on the export', async () => {
    await httpRepository.exportCsv()
    expect(last().headers.get('Accept')).toBe('text/csv, */*;q=0.1')
    expect(last().headers.get('Authorization')).toBe('Bearer token-1')
  })

  it('sends a JSON body with Content-Type', async () => {
    await api.put('/api/rubrics/PROGRESS_REPORT', { a: 1 })
    expect(last().headers.get('Content-Type')).toBe('application/json')
    expect(await last().json()).toEqual({ a: 1 })
  })

  it('reads the token fresh on every request (a refreshed token is used at once)', async () => {
    await httpRepository.me()
    token = 'token-2'
    await httpRepository.me()
    expect(seen.map((r) => r.headers.get('Authorization'))).toEqual(['Bearer token-1', 'Bearer token-2'])
  })

  it('sends no Authorization header when signed out, but still the demo session id', async () => {
    token = null
    await httpRepository.me()
    expect(last().headers.get('Authorization')).toBeNull()
    expect(last().headers.get('X-Demo-Session')).toBe(browserDemoSessionId())
  })
})

describe('live stream (SSE) headers', () => {
  it('sends the current token and session id on every reconnect', async () => {
    const tokens: (string | null)[] = []
    const sessions: (string | null)[] = []
    server.use(
      http.get('*/api/notifications/stream', ({ request }) => {
        tokens.push(request.headers.get('Authorization'))
        sessions.push(request.headers.get('X-Demo-Session'))
        // The stream ends at once: the client reconnects.
        return new HttpResponse(new ReadableStream({ start: (c) => c.close() }), { headers: { 'Content-Type': 'text/event-stream' } })
      }),
    )
    const ctrl = new AbortController()
    let opens = 0
    await new Promise<void>((done) => {
      void fetchEventSource(apiUrl('/api/notifications/stream'), {
        signal: ctrl.signal,
        openWhenHidden: true,
        fetch: streamFetch,
        async onopen() {
          opens += 1
          // The token is refreshed while the stream is down.
          token = `token-${opens + 1}`
          if (opens === 3) {
            ctrl.abort()
            done()
          }
        },
        onclose() {
          throw new Error('closed')
        },
        onerror() {
          return 1 // reconnect straight away
        },
      })
    })
    expect(tokens).toEqual(['Bearer token-1', 'Bearer token-2', 'Bearer token-3'])
    expect(sessions).toEqual([browserDemoSessionId(), browserDemoSessionId(), browserDemoSessionId()])
  })
})
