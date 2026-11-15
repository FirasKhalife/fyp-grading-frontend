import { expect, test, type Page } from '@playwright/test'
import { enterAs, expectAccessible } from './helpers'

async function noHorizontalScroll(page: Page) {
  const w = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(w).toBeLessThanOrEqual(375)
}

test('landing at 375 px', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Enter as Jane' })).toBeVisible()
  await noHorizontalScroll(page)
  await page.screenshot({ path: 'test-results/mobile-landing.png', fullPage: true })
})

test('My teams at 375 px', async ({ page }) => {
  await enterAs(page, 'Jane')
  await expect(page.getByRole('heading', { level: 1, name: 'My teams' })).toBeVisible()
  await noHorizontalScroll(page)
  await expectAccessible(page, 'my teams mobile')
  await page.screenshot({ path: 'test-results/mobile-my-teams.png', fullPage: true })
})

test('grading at 375 px: stacked levels and a sticky score bar', async ({ page }) => {
  await enterAs(page, 'Jane')
  await page.goto('/grade/t-beta/final-report')
  const bar = page.getByRole('region', { name: 'Score and submission' })
  await expect(bar).toBeVisible()
  await expect(bar).toContainText('53.8')
  await noHorizontalScroll(page)
  // Levels are a vertical list: the cards of one criterion share the same left edge.
  const xs = await page.locator('#c1 [role=radio]').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)))
  expect(new Set(xs).size).toBe(1)
  await page.screenshot({ path: 'test-results/mobile-grading.png' })
  await expectAccessible(page, 'grading mobile')
})

test('student home at 375 px with a vertical timeline', async ({ page }) => {
  await enterAs(page, 'Nour')
  await expect(page.getByRole('heading', { level: 2, name: 'Assessment timeline' })).toBeVisible()
  await noHorizontalScroll(page)
  const xs = await page
    .getByRole('region', { name: 'Assessment timeline' })
    .locator('ol > li')
    .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)))
  expect(new Set(xs).size).toBe(1)
  await page.screenshot({ path: 'test-results/mobile-student.png', fullPage: true })
})

test('the coordinator grid scrolls inside its card at 375 px', async ({ page }) => {
  await enterAs(page, 'Rania')
  await expect(page.getByRole('table')).toBeVisible()
  await noHorizontalScroll(page)
})
