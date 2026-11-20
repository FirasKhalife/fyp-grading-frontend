import { expect, test } from '@playwright/test'
import { GATEWAY, api, credentials, enter, settled } from './real'

/**
 * The live stream outlives the first access token: the token is renewed in the background, a dropped
 * stream reconnects with the new one, and live updates keep arriving.
 *
 * Opt-in (ASSAY_SHORT_TOKENS=1), because it needs short-lived tokens on the local Keycloak, e.g.:
 *   docker exec keycloak-server /opt/keycloak/bin/kcadm.sh update realms/assay -s accessTokenLifespan=120 ...
 * and set it back to 900 afterwards. With ASSAY_DROP_STREAM=<file>, the test writes that file once the first
 * token has expired and waits for the stream to reconnect: restart notification-service when it appears.
 */
test.skip(process.env.ASSAY_SHORT_TOKENS !== '1', 'needs ASSAY_SHORT_TOKENS=1 and short-lived tokens on Keycloak')

const exp = (jwt: string) => (JSON.parse(Buffer.from(jwt.split('.')[1]!, 'base64url').toString()) as { exp: number }).exp * 1000

test('live updates keep arriving after the access token expired and the stream reconnected', async ({ page, browser }) => {
  test.setTimeout(420_000)
  const streams: number[] = []
  const unauthorized: string[] = []
  const t0 = Date.now()
  page.on('response', (r) => {
    if (r.url().includes('/openid-connect/token'))
      console.log(
        `${Math.round((Date.now() - t0) / 1000)}s token ${r.status()} ${
          r
            .request()
            .postData()
            ?.match(/grant_type=\w+/)?.[0]
        }`,
      )
    if (r.url().includes('/api/notifications/stream')) streams.push(r.status())
    if (r.url().startsWith(GATEWAY) && r.status() === 401) unauthorized.push(r.url())
  })
  await enter(page, 'Rania')
  const first = (await credentials(page)).token
  const firstExp = exp(first)
  expect(firstExp - Date.now()).toBeLessThan(10 * 60_000) // short tokens are on

  // The token is renewed before it expires, without a page load.
  await expect.poll(async () => (await credentials(page)).token, { timeout: firstExp - Date.now() + 30_000, intervals: [5_000] }).not.toBe(first)
  // Wait until the first token has really expired.
  await page.waitForTimeout(Math.max(0, firstExp - Date.now() + 5_000))

  // Live updates still arrive on the stream opened with the old token.
  // Then the stream drops (ASSAY_DROP_STREAM names a file; a helper restarts notification-service when it
  // appears) and must reconnect with the renewed token.
  const before = streams.length
  if (process.env.ASSAY_DROP_STREAM) {
    const fs = await import('node:fs')
    fs.writeFileSync(process.env.ASSAY_DROP_STREAM, 'drop')
    await expect.poll(() => streams.length, { timeout: 180_000, intervals: [2_000] }).toBeGreaterThan(before)
    await expect.poll(() => streams.at(-1), { timeout: 60_000, intervals: [2_000] }).toBe(200)
  }

  // Jane, in her own browser but on the same copy, submits; Rania's grid updates live.
  const session = (await credentials(page)).session
  const ctx = await browser.newContext()
  const jane = await ctx.newPage()
  await jane.goto('/')
  await jane.evaluate((id) => localStorage.setItem('assay-demo-session', id), session)
  await jane.getByRole('button', { name: 'Enter as Jane' }).click()
  await expect(jane.getByRole('region', { name: 'Demo' })).toBeVisible()
  await settled(jane)
  expect((await credentials(jane)).session).toBe(session)
  const assignments = await api<{ teams: { team: { id: string; name: string } }[] }>(jane, 'GET', '/api/me/assignments')
  const beta = assignments.body.teams.find((t) => t.team.name === 'Beta')!.team.id
  const draft = await api<{ criteria: { criterionId: string; level: number | null; comment: string | null }[] }>(
    jane,
    'GET',
    `/api/my-evaluations/${beta}/FINAL_REPORT`,
  )
  const body = { criteria: draft.body.criteria.map((c) => ({ criterionId: c.criterionId, level: c.level ?? 3, comment: c.comment })) }
  expect((await api(jane, 'POST', `/api/my-evaluations/${beta}/FINAL_REPORT/submit`, body)).status).toBe(200)
  await ctx.close()

  await expect(page.getByRole('link', { name: /^\d+\.\d Final\. Team Beta, Final report/ })).toBeVisible({ timeout: 20_000 })
  expect(unauthorized).toEqual([])
})
