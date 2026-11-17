import { expect, test, type Page } from '@playwright/test'
import { GATEWAY, api, credentials, enter, settled, teamId, watch } from './real'

/**
 * The persona flows on the real stack: Keycloak sign-in, private copies, grading, release, schedule,
 * rubrics, reviewers, export, history and insights. Each test starts in a fresh browser with its own copy.
 */

const sessionId = (page: Page) => page.evaluate(() => localStorage.getItem('assay-demo-session'))

/** Scores every unscored criterion at level 3 by clicking, as fast as a person can. */
async function scoreRest(page: Page) {
  for (const group of await page.getByRole('radiogroup').all()) {
    if ((await group.getByRole('radio', { checked: true }).count()) === 0) await group.getByRole('radio', { name: /^3, Accomplished/ }).click()
  }
}

async function openBetaFinalReport(page: Page) {
  await page.getByRole('link', { name: 'Continue draft', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Final report · Team Beta' })).toBeVisible()
  await settled(page)
}

async function submit(page: Page) {
  const panel = page.getByRole('complementary', { name: 'Score and submission' })
  await expect(panel).toContainText('13 of 13 criteria scored')
  await panel.getByRole('button', { name: 'Submit evaluation' }).click()
  await panel.getByRole('button', { name: 'Submit and lock' }).click()
  await expect(page.getByText(/This evaluation is locked/)).toBeVisible()
}

test('Sign in with email: code flow with PKCE, then a private copy (John Doe, not a persona)', async ({ page }) => {
  const problems = watch(page)
  await page.goto('/')
  const auth = page.waitForRequest((r) => r.url().includes('/protocol/openid-connect/auth'))
  await page.getByRole('button', { name: 'Sign in with email' }).click()
  const url = new URL((await auth).url())
  expect(url.searchParams.get('response_type')).toBe('code')
  expect(url.searchParams.get('code_challenge_method')).toBe('S256')
  await page.locator('#username').fill('john.doe')
  await page.locator('#password').fill(process.env.VITE_DEMO_PASSWORD ?? 'assay-demo')
  await page.locator('#kc-login').click()
  await expect(page).toHaveURL(/\/my-teams$/)
  await expect(page.getByRole('heading', { level: 1, name: 'My teams' })).toBeVisible()
  await settled(page)
  expect(await sessionId(page)).toBeTruthy()
  // No token in any URL (the code is exchanged by POST).
  expect(page.url()).not.toContain('access_token')
  expect(problems).toEqual([])
})

test('two browsers keep separate copies; switching role keeps yours; reset swaps it for a new id', async ({ page, browser }) => {
  await enter(page, 'Jane')
  const other = await browser.newContext()
  const page2 = await other.newPage()
  await enter(page2, 'Rania')
  const [a, b] = [await sessionId(page), await sessionId(page2)]
  expect(a).not.toBe(b)

  await openBetaFinalReport(page)
  await scoreRest(page)
  await submit(page)

  // The other browser's Beta final report is still waiting for Jane.
  const beta2 = await teamId(page2, 'Beta')
  const t2 = await api<{ assessments: { assessment: string; state: string }[] }>(page2, 'GET', `/api/teams/${beta2}`)
  expect(t2.body.assessments.find((x) => x.assessment === 'FINAL_REPORT')?.state).toBe('WAITING')
  await page2.reload()
  await expect(page2.getByRole('link', { name: /Team Beta, Final report/ })).not.toHaveAccessibleName(/Final\./)

  // Switch role in the first browser: same copy, and the grade Jane just made is there.
  await page.getByRole('button', { name: 'Switch role' }).click()
  await page.getByRole('dialog', { name: 'Switch role' }).getByRole('button', { name: /Rania Haddad/ }).click()
  await expect(page).toHaveURL(/\/overview$/)
  expect(await sessionId(page)).toBe(a)
  await expect(page.getByRole('link', { name: /^\d+\.\d Final\. Team Beta, Final report/ })).toBeVisible()

  // Reset: a new id, the old one is gone, the seed is back.
  const banner = page.getByRole('region', { name: 'Demo' })
  await banner.getByRole('button', { name: 'Reset my demo' }).click()
  await banner.getByRole('button', { name: 'Reset my demo' }).click()
  await expect(page.getByRole('heading', { name: 'Choose a role to enter' })).toBeVisible({ timeout: 20_000 })
  const c = await sessionId(page)
  expect(c).toBeTruthy()
  expect(c).not.toBe(a)
  const { token } = await credentials(page)
  if (token) {
    const old = await page.request.get(`${GATEWAY}/api/me`, { headers: { Authorization: `Bearer ${token}`, 'X-Demo-Session': a! } })
    expect(old.status()).toBe(404)
  }
  await page.getByRole('button', { name: 'Enter as Rania' }).click()
  await expect(page.getByRole('link', { name: /Team Beta, Final report/ })).not.toHaveAccessibleName(/Final\./)
  expect(await sessionId(page)).toBe(c)
  await other.close()
})

test('a purged copy is replaced on its own when the page loads: still signed in, with a notice', async ({ page }) => {
  await enter(page, 'Jane')
  // As after the midnight purge: this browser had a copy, and the server no longer has it.
  await page.evaluate(() => localStorage.setItem('assay-demo-session', crypto.randomUUID()))
  await page.reload()
  await expect(page.getByText('Your demo was reset overnight.')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'My teams' })).toBeVisible()
  await settled(page)
  await expect(page.getByText('Final report · Team Beta')).toBeVisible()
})

test('a copy purged mid-visit is replaced in place on the next call', async ({ page }) => {
  await enter(page, 'Jane')
  await page.evaluate(() => localStorage.setItem('assay-demo-session', crypto.randomUUID()))
  await page.getByRole('link', { name: 'Schedule' }).first().click()
  await expect(page.getByText('Your demo was reset overnight.')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'Schedule' })).toBeVisible()
  await settled(page)
})

test('grading: fast clicking never hits a 429, autosave survives a reload, submit locks, a stale tab shows the lock', async ({ page }) => {
  const statuses: number[] = []
  page.on('response', (r) => {
    if (r.url().startsWith(GATEWAY)) statuses.push(r.status())
  })
  await enter(page, 'Jane')
  await openBetaFinalReport(page)
  await scoreRest(page)
  // Change a few levels quickly, as a hesitant reviewer would.
  for (const n of [9, 10, 11]) {
    const g = page.locator(`#c${n} [role=radiogroup]`)
    await g.getByRole('radio', { name: /^2, / }).click()
    await g.getByRole('radio', { name: /^4, / }).click()
  }
  const panel = page.getByRole('complementary', { name: 'Score and submission' })
  await expect(panel).toContainText('13 of 13 criteria scored')
  await expect(page.getByText('Saving…')).toHaveCount(0)
  const scoreBefore = (await panel.textContent())?.match(/\d+\.\d/)?.[0]
  expect(statuses.filter((s) => s === 429)).toEqual([])

  await page.reload()
  await settled(page)
  await expect(panel).toContainText('13 of 13 criteria scored')
  expect((await panel.textContent())?.match(/\d+\.\d/)?.[0]).toBe(scoreBefore)
  const draft = await api<{ criteria: { level: number | null }[]; score: number }>(page, 'GET', `/api/my-evaluations/${await teamId(page, 'Beta')}/FINAL_REPORT`)
  expect(draft.body.criteria.every((c) => c.level !== null)).toBe(true)
  expect(draft.body.score.toFixed(1)).toBe(scoreBefore)

  // Another tab submits; this one still shows the draft. The next change is refused and the page shows the lock.
  const beta = await teamId(page, 'Beta')
  const sub = await api(page, 'POST', `/api/my-evaluations/${beta}/FINAL_REPORT/submit`, {
    criteria: (draft.body as unknown as { criteria: { criterionId: string; level: number; comment: string | null }[] }).criteria.map((c) => ({ criterionId: c.criterionId, level: c.level, comment: c.comment })),
  })
  expect(sub.status).toBe(200)
  await page.locator('#c1 [role=radiogroup]').getByRole('radio', { name: /^1, / }).click()
  await expect(page.getByText(/This evaluation is locked/)).toBeVisible()
  expect(statuses.filter((s) => s === 429)).toEqual([])
})

test('a late submission stays marked: Karim submits the overdue Delta advisor assessment', async ({ page }) => {
  await enter(page, 'Karim')
  const delta = await teamId(page, 'Delta')
  await page.goto(`/grade/${delta}/advisor-assessment`)
  await expect(page.getByRole('heading', { level: 1, name: /Advisor assessment · Team Delta/ })).toBeVisible()
  await settled(page)
  await expect(page.getByText(/overdue/i).first()).toBeVisible()
  await scoreRest(page)
  const panel = page.getByRole('complementary', { name: 'Score and submission' })
  await panel.getByRole('button', { name: 'Submit evaluation' }).click()
  await panel.getByRole('button', { name: 'Submit and lock' }).click()
  await expect(page.getByText(/Submitted late · due/)).toBeVisible()
  await page.goto('/my-teams')
  await settled(page)
  await expect(page.getByRole('region', { name: 'Team Delta' })).toContainText(/late/i)
})

test('the coordinator fixes the schedule conflict and the team keeps its room', async ({ page }) => {
  await enter(page, 'Rania')
  await page.goto('/schedule')
  await settled(page)
  const alert = page.getByRole('alert').filter({ hasText: /on two juries/ })
  await expect(alert).toBeVisible()
  const fix = alert.getByRole('button', { name: /^Move Team / })
  const team = (await fix.textContent())!.match(/Move Team (\w+)/)![1]!
  const before = await api<{ slots: { team: { name: string }; room: string; startsAt: string }[] }>(page, 'GET', '/api/schedule')
  const room = before.body.slots.find((s) => s.team.name === team)!.room
  await fix.click()
  await expect(page.getByRole('status').filter({ hasText: 'No conflicts.' })).toContainText(`still in ${room}`)
  const after = await api<{ slots: { team: { name: string }; room: string }[]; conflicts: unknown[] }>(page, 'GET', '/api/schedule')
  expect(after.body.slots.find((s) => s.team.name === team)!.room).toBe(room)
  expect(after.body.conflicts).toEqual([])
})

test('the rubric editor: a total off 100 is held back, a valid one saves', async ({ page }) => {
  await enter(page, 'Rania')
  await page.goto('/rubrics/final-presentation/edit')
  await settled(page)
  const weights = page.getByLabel('Weight', { exact: true })
  const w0 = Number(await weights.nth(0).inputValue())
  const w1 = Number(await weights.nth(1).inputValue())
  const bar = page.getByRole('region', { name: 'Weights total and save' })
  await weights.nth(0).fill(String(w0 + 5))
  await expect(bar).toContainText('105%')
  await expect(bar.getByRole('button', { name: 'Save rubric' })).toHaveAttribute('aria-disabled', 'true')
  await weights.nth(1).fill(String(w1 - 5))
  await expect(bar).toContainText('100%')
  await bar.getByRole('button', { name: 'Save rubric' }).click()
  await expect(bar.getByRole('button', { name: 'Saved' })).toBeVisible()
  const r = await api<{ criteria: { weight: number }[]; updatedBy: { displayName: string } | null }>(page, 'GET', '/api/rubrics/FINAL_PRESENTATION')
  expect(r.body.criteria[0]!.weight).toBe(w0 + 5)
  expect(r.body.updatedBy?.displayName).toBe('Rania Haddad')
})

test('team detail: a reviewer with submissions stays, history and disagreement show, and a reviewer sees hidden scores', async ({ page, browser }) => {
  await enter(page, 'Rania')
  const beta = await teamId(page, 'Beta')
  await page.goto(`/teams/${beta}`)
  await settled(page)
  await page.getByRole('button', { name: 'Remove John Doe from Team Beta' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'John Doe stays on the team.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: /^History/ })).toContainText(/\d+/)
  await expect(page.getByText(/reviewers disagree \(more than 15 points apart\)/).first()).toBeVisible()

  // Jane, a jury member on Beta, in her own browser: the final report scores of the others stay hidden.
  const ctx = await browser.newContext()
  const jane = await ctx.newPage()
  await enter(jane, 'Jane')
  const jb = await teamId(jane, 'Beta')
  const t = await api<{ assessments: { assessment: string; reviewers: { reviewer: { displayName: string }; score: number | null }[] }[] }>(jane, 'GET', `/api/teams/${jb}`)
  const fr = t.body.assessments.find((a) => a.assessment === 'FINAL_REPORT')!
  expect(fr.reviewers.filter((r) => r.reviewer.displayName !== 'Jane Smith').every((r) => r.score === null)).toBe(true)
  await ctx.close()
})

test('overview: insights and the disagreement flag, CSV export downloads, release reaches the student', async ({ page, browser }) => {
  await enter(page, 'Rania')
  await expect(page.getByText(/Reviewers disagree/).first()).toBeVisible()
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  const file = await dl
  expect(file.suggestedFilename()).toMatch(/^assay-results-\d{4}-\d{2}-\d{2}\.csv$/)
  const text = await (await file.createReadStream()).toArray().then((c) => Buffer.concat(c).toString('utf8'))
  expect(text.split(/\r?\n/).filter(Boolean).length).toBeGreaterThanOrEqual(7)

  // Release the final report (Epsilon and Zeta are final) and check the release landed.
  const rel = page.getByRole('region', { name: 'Ready to release' })
  await rel.getByRole('button', { name: /^Release to / }).first().click()
  await rel.getByRole('button', { name: 'Release now' }).click()
  await expect(page.getByRole('link', { name: /Released\. Team Zeta/ }).first()).toBeVisible()

  // Nour, in her own browser, reads every released Alpha grade with the criteria.
  const ctx = await browser.newContext()
  const nour = await ctx.newPage()
  await enter(nour, 'Nour')
  await expect(nour.getByRole('region', { name: 'Final grade', exact: true })).toContainText('88.0')
  const res = await api(nour, 'GET', '/api/me/team/results/FINAL_REPORT')
  expect(res.status).toBe(200)
  await ctx.close()
})

test('the student view before and after a release: Ahmad waits, the jury submits, Rania releases, Ahmad sees it', async ({ page }) => {
  // Nour first: every result out and the 88.0 final grade.
  await enter(page, 'Nour')
  await expect(page.getByRole('region', { name: 'Final grade', exact: true })).toContainText('88.0')
  const copy = await sessionId(page)

  // Switch to Ahmad in the same copy: Team Beta, two results out, the final report still waiting.
  await page.getByRole('button', { name: 'Switch role' }).click()
  await page.getByRole('dialog', { name: 'Switch role' }).getByRole('button', { name: /Ahmad Fares/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Team Beta' })).toBeVisible()
  await settled(page)
  expect(await sessionId(page)).toBe(copy)
  const finalCard = page.getByRole('region', { name: 'Final grade', exact: true })
  await expect(finalCard).toContainText('2 of 5')
  await expect(finalCard).not.toContainText(/\d+\.\d/)
  expect((await api<{ code: string }>(page, 'GET', '/api/me/team/results/FINAL_REPORT')).body.code).toBe('results-not-released')

  // Jane submits her Beta final report and Rania releases it, in the same copy.
  await page.getByRole('button', { name: 'Switch role' }).click()
  await page.getByRole('dialog', { name: 'Switch role' }).getByRole('button', { name: /Jane Smith/ }).click()
  await openBetaFinalReport(page)
  await scoreRest(page)
  await submit(page)
  await page.getByRole('button', { name: 'Switch role' }).click()
  await page.getByRole('dialog', { name: 'Switch role' }).getByRole('button', { name: /Rania Haddad/ }).click()
  const rel = page.getByRole('region', { name: 'Ready to release' })
  await rel.getByRole('button', { name: 'Release to Beta, Epsilon and Zeta' }).click()
  await rel.getByRole('button', { name: 'Release now' }).click()
  await expect(page.getByRole('link', { name: /^\d+\.\d Released\. Team Beta, Final report/ })).toBeVisible()

  // Back to Ahmad: three results out, the final report readable, and a notification about it.
  await page.getByRole('button', { name: 'Switch role' }).click()
  await page.getByRole('dialog', { name: 'Switch role' }).getByRole('button', { name: /Ahmad Fares/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Team Beta' })).toBeVisible()
  await settled(page)
  await expect(finalCard).toContainText('3 of 5')
  expect((await api(page, 'GET', '/api/me/team/results/FINAL_REPORT')).status).toBe(200)
  await expect(page.getByRole('button', { name: /^Notifications, [1-9]\d* unread/ })).toBeVisible()
  expect(await sessionId(page)).toBe(copy)
})

test('team detail: the student personas have no remove button', async ({ page }) => {
  await enter(page, 'Rania')
  for (const [team, student, other] of [['Alpha', 'Nour Khoury', 'Maya Aoun'], ['Beta', 'Ahmad Fares', 'Yara Saliba']] as const) {
    await page.goto(`/teams/${await teamId(page, team)}`)
    await settled(page)
    await expect(page.getByRole('button', { name: `Remove ${other} from Team ${team}` })).toBeVisible()
    await expect(page.getByRole('button', { name: `Remove ${student} from Team ${team}` })).toHaveCount(0)
  }
  // The server keeps them on their team too.
  const beta = await teamId(page, 'Beta')
  const t = await api<{ students: { id: string; firstName: string }[] }>(page, 'GET', `/api/teams/${beta}`)
  const ahmad = t.body.students.find((s) => s.firstName === 'Ahmad')!
  const r = await api<{ code: string }>(page, 'DELETE', `/api/teams/${beta}/students/${ahmad.id}`)
  expect([r.status, r.body.code]).toEqual([409, 'student-is-demo-persona'])
})
