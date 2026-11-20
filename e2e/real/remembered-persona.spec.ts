import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { api, credentials, enter, settled } from './real'

/**
 * On the real stack (Keycloak tokens in sessionStorage, one tab each): a new tab of the same browser
 * continues as the last persona on the same private copy; Switch role, sign-out and Reset update or clear
 * what is remembered; an email sign-in is never remembered. Plus the "required, not counted" weight wording
 * and the skip link while a screen is still loading.
 */

const remembered = (page: Page) => page.evaluate(() => localStorage.getItem('assay-persona'))
const sessionId = (page: Page) => page.evaluate(() => localStorage.getItem('assay-demo-session'))

/** A new tab in the same browser: shared localStorage, empty sessionStorage (no token). */
async function newTab(context: BrowserContext, path: string): Promise<Page> {
  const tab = await context.newPage()
  await tab.goto(path)
  return tab
}

async function expectRolePicker(tab: Page) {
  await expect(tab.getByRole('heading', { name: 'Choose a role to enter' })).toBeVisible()
  expect((await credentials(tab)).token).toBe('')
}

test('a new tab continues as the same persona on the same copy, without a token in localStorage', async ({ page, context }) => {
  await enter(page, 'Jane')
  const copy = await sessionId(page)
  expect(await remembered(page)).toBe('jane')

  const tab = await newTab(context, '/my-teams')
  await expect(tab.getByRole('heading', { level: 1, name: 'My teams' })).toBeVisible()
  await settled(tab)
  await expect(tab.getByRole('button', { name: /account menu for Jane Smith/ })).toBeVisible()
  expect(await sessionId(tab)).toBe(copy)
  // Its own fresh token, for Jane, on the same copy.
  const me = await api<{ userId: string; personaKey?: string }>(tab, 'GET', '/api/me')
  expect(me.status).toBe(200)
  expect((await credentials(tab)).token).not.toBe('')
  // Only the persona key is kept across tabs, never a token.
  const shared = await tab.evaluate(() => JSON.stringify({ ...localStorage }))
  expect(shared).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}/)
})

test('Switch role replaces the remembered persona; sign-out clears it', async ({ page, context }) => {
  await enter(page, 'Jane')
  await page.getByRole('button', { name: 'Switch role' }).click()
  await page
    .getByRole('dialog', { name: 'Switch role' })
    .getByRole('button', { name: /Rania Haddad/ })
    .click()
  await expect(page).toHaveURL(/\/overview$/)
  expect(await remembered(page)).toBe('rania')

  const tab = await newTab(context, '/overview')
  await expect(tab.getByRole('button', { name: /account menu for Rania Haddad/ })).toBeVisible()
  await tab.close()

  await page.getByRole('button', { name: /account menu for Rania Haddad/ }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page.getByRole('heading', { name: 'Choose a role to enter' })).toBeVisible()
  expect(await remembered(page)).toBeNull()
  await expectRolePicker(await newTab(context, '/overview'))
})

test('Reset my demo clears the remembered persona', async ({ page, context }) => {
  await enter(page, 'Karim')
  expect(await remembered(page)).toBe('karim')
  const banner = page.getByRole('region', { name: 'Demo' })
  await banner.getByRole('button', { name: 'Reset my demo' }).click()
  await banner.getByRole('button', { name: 'Reset my demo' }).click()
  await expect(page.getByRole('heading', { name: 'Choose a role to enter' })).toBeVisible({ timeout: 20_000 })
  expect(await remembered(page)).toBeNull()
  await expectRolePicker(await newTab(context, '/my-teams'))
})

test('an email sign-in is not remembered: a new tab shows the role picker', async ({ page, context }) => {
  await enter(page, 'Jane') // a persona picked earlier in this browser
  await page.getByRole('button', { name: /account menu for Jane Smith/ }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await page.getByRole('button', { name: 'Sign in with email' }).click()
  await page.locator('#username').fill('john.doe')
  await page.locator('#password').fill(process.env.VITE_DEMO_PASSWORD ?? 'assay-demo')
  await page.locator('#kc-login').click()
  await expect(page.getByRole('heading', { level: 1, name: 'My teams' })).toBeVisible()
  expect(await remembered(page)).toBeNull()
  await expectRolePicker(await newTab(context, '/my-teams'))
})

test('the progress report reads "required, not counted", never "0% of final grade"', async ({ page, browser }) => {
  await enter(page, 'Jane')
  await expect(page.getByText('Required · not counted in the final grade').first()).toBeVisible()
  await expect(page.getByText(/(^|[^0-9])0% of/)).toHaveCount(0)

  const rania = await browser.newContext()
  const r = await rania.newPage()
  await enter(r, 'Rania')
  const progress = r.getByRole('columnheader', { name: /^Progress/ })
  await expect(progress).toContainText('Required')
  await expect(progress).not.toContainText('0%')
  await rania.close()

  const nour = await browser.newContext()
  const n = await nour.newPage()
  await enter(n, 'Nour')
  await expect(n.getByText(/Required · not counted in the final grade/).first()).toBeVisible()
  await expect(n.getByText(/(^|[^0-9])0% of/)).toHaveCount(0)
  await nour.close()
})

test('the skip link keeps focus on the main region while the screen finishes loading', async ({ page }) => {
  await enter(page, 'Jane')
  // Hold My teams' data so the skeleton is on screen when the skip link is used.
  let release!: () => void
  const held = new Promise<void>((done) => (release = done))
  await page.route('**/api/me/assignments*', async (route) => {
    await held
    await route.continue()
  })
  await page.goto('/my-teams')
  await expect(page.locator('main[aria-busy="true"], main [aria-busy="true"]').first()).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(page.locator(':focus')).toHaveText('Skip to content')
  await page.keyboard.press('Enter')
  await expect(page.locator(':focus')).toHaveAttribute('id', 'main')

  release()
  await expect(page.getByRole('heading', { level: 1, name: 'My teams' })).toBeVisible()
  await settled(page)
  await expect(page.locator(':focus')).toHaveAttribute('id', 'main')
  await expect(page.locator('#main')).toContainText('evaluations submitted')
})
