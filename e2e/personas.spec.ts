import { expect, test } from '@playwright/test'
import { enterAs } from './helpers'

test.describe('every persona reaches a meaningful screen in one click', () => {
  test('Rania lands on the coordinator overview', async ({ page }) => {
    await enterAs(page, 'Rania')
    await expect(page).toHaveURL(/\/overview$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Key figures' })).toContainText('62 / 74')
  })

  test('Jane lands on My teams with her draft next up', async ({ page }) => {
    await enterAs(page, 'Jane')
    await expect(page).toHaveURL(/\/my-teams$/)
    await expect(page.getByText('Final report · Team Beta')).toBeVisible()
  })

  test("Karim lands on My teams with Delta's overdue advisor draft", async ({ page }) => {
    await enterAs(page, 'Karim')
    await expect(page.getByRole('region', { name: 'Team Delta' })).toContainText('Overdue')
  })

  test('Nour lands on the student home with the 88.0 final grade', async ({ page }) => {
    await enterAs(page, 'Nour')
    await expect(page).toHaveURL(/\/student$/)
    await expect(page.getByRole('region', { name: 'Final grade', exact: true })).toContainText('88.0')
  })

  test('the key demo moment: Jane submits, Rania sees the grade and releases it', async ({ page }) => {
    await enterAs(page, 'Jane')
    await page.getByRole('link', { name: 'Continue draft', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Final report · Team Beta' })).toBeVisible()
    for (const group of await page.getByRole('radiogroup').all()) {
      if ((await group.getByRole('radio', { checked: true }).count()) === 0) await group.getByRole('radio', { name: /^3, Accomplished/ }).click()
    }
    const panel = page.getByRole('complementary', { name: 'Score and submission' })
    await expect(panel).toContainText('13 of 13 criteria scored')
    await panel.getByRole('button', { name: 'Submit evaluation' }).click()
    await panel.getByRole('button', { name: 'Submit and lock' }).click()
    await expect(page.getByText(/This evaluation is locked/)).toBeVisible()

    await page.getByRole('button', { name: 'Switch role' }).click()
    await page.getByRole('dialog', { name: 'Switch role' }).getByRole('button', { name: /Rania Haddad/ }).click()
    await expect(page.getByRole('link', { name: /^\d+\.\d Final\. Team Beta, Final report/ })).toBeVisible()
    const rel = page.getByRole('region', { name: 'Ready to release' })
    await rel.getByRole('button', { name: 'Release to Beta, Epsilon and Zeta' }).click()
    await rel.getByRole('button', { name: 'Release now' }).click()
    await expect(page.getByRole('link', { name: /^\d+\.\d Released\. Team Beta, Final report/ })).toBeVisible()
  })

  test('Reset my demo confirms in place and returns to the role picker', async ({ page }) => {
    await enterAs(page, 'Jane')
    const banner = page.getByRole('region', { name: 'Demo' })
    await banner.getByRole('button', { name: 'Reset my demo' }).click()
    await expect(banner.getByRole('alert')).toContainText('Reset your demo?')
    await banner.getByRole('button', { name: 'Reset my demo' }).click()
    await expect(page.getByRole('heading', { name: 'Choose a role to enter' })).toBeVisible({ timeout: 10_000 })
  })
})
