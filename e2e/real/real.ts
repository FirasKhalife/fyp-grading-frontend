import { expect, type Page, type Response } from '@playwright/test'

/** Helpers for the real-stack suite (playwright.real.config.ts): the gateway and Keycloak, no mocks. */

export const GATEWAY = process.env.ASSAY_GATEWAY ?? 'http://localhost:9191'
export const KEYCLOAK = process.env.ASSAY_KEYCLOAK ?? 'http://localhost:7080'

export type Who = 'Rania' | 'Jane' | 'Karim' | 'Nour'

/** One click on the persona card in a fresh browser (its own new copy), then wait for the first screen to load. */
export async function enter(page: Page, who: Who) {
  await page.goto('/')
  await page.getByRole('button', { name: `Enter as ${who}` }).click()
  await expect(page.getByRole('region', { name: 'Demo' })).toBeVisible()
  await settled(page)
}

/** Nothing loading on the page. */
export async function settled(page: Page) {
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: /Loading|Signing you in/ })).toHaveCount(0)
}

/** The browser's demo session id and bearer token, as the app stores them. */
export async function credentials(page: Page): Promise<{ session: string; token: string }> {
  return page.evaluate(() => {
    const session = localStorage.getItem('assay-demo-session') ?? ''
    const key = Object.keys(sessionStorage).find((k) => k.startsWith('oidc.user:'))
    const token = key ? (JSON.parse(sessionStorage.getItem(key) ?? '{}') as { access_token?: string }).access_token ?? '' : ''
    return { session, token }
  })
}

/** A gateway call as the signed-in visitor (same copy, same token). */
export async function api<T = unknown>(page: Page, method: string, path: string, body?: unknown): Promise<{ status: number; body: T; headers: Record<string, string> }> {
  const { session, token } = await credentials(page)
  const res = await page.request.fetch(`${GATEWAY}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'X-Demo-Session': session, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    data: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let parsed: unknown = text
  try {
    parsed = text ? JSON.parse(text) : undefined
  } catch {
    /* CSV and the like */
  }
  return { status: res.status(), body: parsed as T, headers: res.headers() }
}

interface OverviewTeam {
  team: { id: string; name: string }
}
interface Assignment {
  team: { id: string; name: string }
}

/** A team's id in this copy (ids are per copy), by its name, e.g. 'Beta'. */
export async function teamId(page: Page, name: string): Promise<string> {
  const me = await api<{ roles: string[] }>(page, 'GET', '/api/me')
  if (me.body.roles.includes('ADMIN')) {
    const o = await api<{ teams: OverviewTeam[] }>(page, 'GET', '/api/overview')
    const t = o.body.teams.find((x) => x.team.name === name)
    if (t) return t.team.id
  } else {
    const a = await api<Assignment[] | { items?: Assignment[]; teams?: Assignment[] }>(page, 'GET', '/api/me/assignments')
    const list: Assignment[] = Array.isArray(a.body) ? a.body : (a.body.items ?? a.body.teams ?? [])
    const t = list.find((x) => x.team.name === name)
    if (t) return t.team.id
  }
  throw new Error(`No team named ${name}`)
}

/** Records what went wrong on the wire and in the console while a page is used. */
export function watch(page: Page, allow: (r: Response) => boolean = () => false) {
  const problems: string[] = []
  page.on('response', (r) => {
    const u = r.url()
    if ((u.startsWith(GATEWAY) || u.startsWith(KEYCLOAK)) && r.status() >= 400 && !allow(r))
      problems.push(`${r.status()} ${r.request().method()} ${u.replace(GATEWAY, '')}`)
  })
  page.on('requestfailed', (r) => {
    const u = r.url()
    // An SSE stream or a fetch torn down by a navigation is not a failure.
    if ((u.startsWith(GATEWAY) || u.startsWith(KEYCLOAK)) && !u.includes('/stream') && r.failure()?.errorText !== 'net::ERR_ABORTED') problems.push(`failed ${r.method()} ${u.replace(GATEWAY, '')} ${r.failure()?.errorText ?? ''}`)
  })
  page.on('pageerror', (e) => problems.push(`page error: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) problems.push(`console: ${m.text().slice(0, 300)}`)
  })
  return problems
}
