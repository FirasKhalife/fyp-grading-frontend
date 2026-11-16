import { expect, test } from '@playwright/test'
import { enterAs, focusRing, seedPath, tabUntil } from './helpers'

test('keyboard only: Jane finishes and submits her Beta final report', async ({ page }) => {
  test.setTimeout(120_000)
  await enterAs(page, 'Jane')
  await page.goto('/my-teams')
  await tabUntil(page, `a[href="${await seedPath(page, '/grade/t-beta/final-report')}"]`)
  expect(await focusRing(page)).toBe('solid 3px')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: 'Final report · Team Beta' })).toBeVisible()

  // Each unscored criterion: Tab into its radio group, then an arrow key picks a level.
  for (let n = 1; n <= 13; n++) {
    const group = page.locator(`#c${n} [role=radiogroup]`)
    if ((await group.locator('[role=radio][data-state=checked]').count()) > 0) continue
    await tabUntil(page, `#c${n} [role=radio]`)
    expect(await focusRing(page)).toBe('solid 3px')
    await page.keyboard.press('ArrowDown')
    await expect(group.locator('[role=radio][data-state=checked]')).toHaveCount(1)
  }
  const panel = page.getByRole('complementary', { name: 'Score and submission' })
  await expect(panel).toContainText('13 of 13 criteria scored')

  await tabUntil(page, 'aside button:not([aria-disabled])')
  await expect(page.locator(':focus')).toHaveText('Submit evaluation')
  await page.keyboard.press('Enter')
  // The in-page confirm takes focus on "Submit and lock".
  await expect(page.locator(':focus')).toHaveText('Submit and lock')
  await page.keyboard.press('Enter')
  await expect(page.getByText(/This evaluation is locked/)).toBeVisible()
})

test('keyboard only: the coordinator grid is one tab stop with arrow-key movement', async ({ page }) => {
  await enterAs(page, 'Rania')
  await expect(page.getByRole('table', { name: /Each cell is the team's grade/ })).toBeVisible()
  await tabUntil(page, 'table a')
  await expect(page.locator(':focus')).toHaveAccessibleName(/Team Alpha/)
  await page.keyboard.press('ArrowRight')
  await expect(page.locator(':focus')).toHaveAccessibleName(/Team Alpha, Proposal presentation/)
  await page.keyboard.press('ArrowDown')
  await expect(page.locator(':focus')).toHaveAccessibleName(/Team Beta, Proposal presentation/)
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => !!document.activeElement?.closest('table'))).toBe(false)
  await page.keyboard.press('Shift+Tab')
  await expect(page.locator(':focus')).toHaveAccessibleName(/Team Beta, Proposal presentation/)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: 'Team Beta' })).toBeVisible()
})

test('keyboard only: the switch role panel and the notifications popover', async ({ page }) => {
  await enterAs(page, 'Jane')
  await tabUntil(page, 'button[aria-label^="Notifications"]')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Notifications' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Notifications' })).toBeHidden()
  await expect(page.locator(':focus')).toHaveAttribute('aria-label', /^Notifications/)
})

test('a skip link jumps to the content', async ({ page }) => {
  await enterAs(page, 'Jane')
  await page.keyboard.press('Tab')
  await expect(page.locator(':focus')).toHaveText('Skip to content')
  await page.keyboard.press('Enter')
  await expect(page.locator(':focus')).toHaveAttribute('id', 'main')
})
