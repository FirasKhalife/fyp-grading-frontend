import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

export type PersonaName = 'Rania' | 'Jane' | 'Karim' | 'Nour'

/** Fresh browser storage, then one click on the persona card, as a visitor would. */
export async function enterAs(page: Page, who: PersonaName) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/')
  await page.getByRole('button', { name: `Enter as ${who}` }).click()
  await expect(page.getByRole('region', { name: 'Demo' })).toBeVisible()
}

export async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.evaluate((t) => {
    localStorage.setItem('assay-theme', t)
    document.documentElement.classList.toggle('dark', t === 'dark')
  }, theme)
}

/** axe-core on the live page: WCAG 2.0 to 2.2, A and AA, colour contrast included. */
export async function expectAccessible(page: Page, label: string) {
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
  const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  const msg = res.violations
    .map((v) => `${v.id}: ${v.help}\n  ${v.nodes.slice(0, 4).map((n) => `${n.target.join(' ')} ${n.failureSummary ?? ''}`.slice(0, 300)).join('\n  ')}`)
    .join('\n')
  expect(msg, label).toBe('')
}

/** Presses Tab until the focused element matches the CSS selector, like a keyboard user. */
export async function tabUntil(page: Page, selector: string, max = 400) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab')
    if (await page.evaluate((sel) => !!document.activeElement?.matches(sel), selector)) return
  }
  throw new Error(`Never reached ${selector} with Tab`)
}

export async function focusRing(page: Page): Promise<string> {
  return page.evaluate(() => {
    const s = getComputedStyle(document.activeElement as Element)
    return `${s.outlineStyle} ${s.outlineWidth}`
  })
}
