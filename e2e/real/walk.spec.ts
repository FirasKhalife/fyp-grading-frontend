import { expect, test, type Page } from '@playwright/test'
import { setTheme } from '../helpers'
import { enter, settled, watch, type Who } from './real'

/**
 * Every screen each persona can reach, on the real stack: no failed API call, no console error, no crash
 * page. Screenshots in light, dark and at 375 px go to test-results/ for a human look.
 */

async function links(page: Page, pattern: RegExp): Promise<string[]> {
  const hrefs = await page.locator('a[href^="/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''))
  return [...new Set(hrefs.filter((h) => pattern.test(h)))]
}

async function visit(page: Page, path: string, shots: string, theme: 'light' | 'dark') {
  await page.goto(path)
  await setTheme(page, theme)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await settled(page)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText(/unexpected error|There's nothing at this address|This page is for/)).toHaveCount(0)
  await page.screenshot({ path: `test-results/real-walk/${shots}${path.replace(/[/:]/g, '_')}-${theme}.png`, fullPage: true })
}

const PLAN: Record<Who, { start: string; discover: { from: string; pattern: RegExp; max: number }[]; fixed: string[] }> = {
  Rania: {
    start: '/overview',
    discover: [
      { from: '/overview', pattern: /^\/teams\/[^/]+$/, max: 6 },
      { from: '/rubrics', pattern: /^\/rubrics\/[^/]+(\/edit)?$/, max: 10 },
    ],
    fixed: ['/teams', '/rubrics', '/schedule'],
  },
  Jane: {
    start: '/my-teams',
    discover: [{ from: '/my-teams', pattern: /^\/grade\/[^/]+\/[^/]+$/, max: 30 }],
    fixed: ['/rubrics', '/rubrics/final-report', '/schedule'],
  },
  Karim: {
    start: '/my-teams',
    discover: [{ from: '/my-teams', pattern: /^\/grade\/[^/]+\/[^/]+$/, max: 30 }],
    fixed: ['/rubrics', '/schedule'],
  },
  Nour: { start: '/student', discover: [], fixed: [] },
}

for (const who of Object.keys(PLAN) as Who[]) {
  for (const theme of ['light', 'dark'] as const) {
    test(`${who} can open every screen (${theme})`, async ({ page }, info) => {
      test.setTimeout(240_000)
      const problems = watch(page)
      await enter(page, who)
      const plan = PLAN[who]
      const paths = [plan.start, ...plan.fixed]
      for (const d of plan.discover) {
        await page.goto(d.from)
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
        await settled(page)
        await expect.poll(async () => (await links(page, d.pattern)).length, { message: `links on ${d.from}` }).toBeGreaterThan(0)
        paths.push(...(await links(page, d.pattern)).slice(0, d.max))
      }
      const prefix = `${info.project.name}-${who}`
      for (const p of [...new Set(paths)]) await visit(page, p, prefix, theme)
      expect(problems, `${who}: failed calls or console errors`).toEqual([])
    })
  }
}
