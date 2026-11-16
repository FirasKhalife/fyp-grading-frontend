import { expect, test } from '@playwright/test'
import { enterAs, expectAccessible, seedPath, setTheme, type PersonaName } from './helpers'

const PAGES: [PersonaName, string, string][] = [
  ['Jane', '/my-teams', 'My teams'],
  ['Jane', '/grade/t-beta/final-report', 'Final report · Team Beta'],
  ['Jane', '/rubrics/final-report', 'Rubrics'],
  ['Jane', '/schedule', 'Schedule'],
  ['Karim', '/my-teams', 'My teams'],
  ['Rania', '/overview', 'Overview'],
  ['Rania', '/teams/t-beta', 'Team Beta'],
  ['Rania', '/teams', 'Teams and people'],
  ['Rania', '/rubrics/final-presentation/edit', 'Edit rubric · Final presentation'],
  ['Rania', '/schedule', 'Schedule'],
  ['Nour', '/student', 'Team Alpha'],
]

for (const theme of ['light', 'dark'] as const) {
  test.describe(`axe, ${theme}`, () => {
    test('landing', async ({ page }) => {
      await page.goto('/')
      await setTheme(page, theme)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expectAccessible(page, `landing ${theme}`)
    })

    for (const [who, path, h1] of PAGES) {
      test(`${who} ${path}`, async ({ page }) => {
        await enterAs(page, who)
        await page.goto(await seedPath(page, path))
        await setTheme(page, theme)
        await expect(page.getByRole('heading', { level: 1, name: h1 })).toBeVisible()
        await expectAccessible(page, `${path} ${theme}`)
      })
    }

    test('notifications panel open', async ({ page }) => {
      await enterAs(page, 'Jane')
      await setTheme(page, theme)
      await page.getByRole('button', { name: /^Notifications/ }).click()
      await expect(page.getByRole('dialog', { name: 'Notifications' })).toBeVisible()
      await expectAccessible(page, `notifications ${theme}`)
    })
  })
}
