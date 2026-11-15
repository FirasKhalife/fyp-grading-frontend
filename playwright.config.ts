import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end checks on the offline demo (MSW serves the contract): a smoke test per persona,
 * a keyboard-only walkthrough, axe (WCAG 2.2 AA) in light and dark, and the 375 px layouts.
 * Runs on the installed Chrome by default; PW_CHANNEL=chromium uses Playwright's own build.
 */
const channel = process.env.PW_CHANNEL === 'chromium' ? undefined : (process.env.PW_CHANNEL ?? 'chrome')

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    timezoneId: 'Europe/Paris',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], channel, viewport: { width: 1440, height: 900 } },
      testIgnore: /mobile\.spec\.ts/,
    },
    {
      name: 'mobile',
      use: { channel, viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true },
      testMatch: /mobile\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
