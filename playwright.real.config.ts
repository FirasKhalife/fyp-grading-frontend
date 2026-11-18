import { defineConfig } from '@playwright/test'
import base from './playwright.config'

/**
 * The same end-to-end checks, plus `e2e/real/`, against a running Assay stack instead of the MSW mocks:
 * the gateway (default http://localhost:9191) and Keycloak (default http://localhost:7080, realm `assay`).
 * Start the stack first (fyp-grading-docker-compose), then: npx playwright test -c playwright.real.config.ts
 *
 * Every test makes its own private copy, and the gateway allows one new copy a minute per IP. Lift that for
 * the run (ASSAY_GATEWAY_HEAVYLIMIT_REPLENISHRATE=600 on the gateway), or run a few tests at a time.
 * The dev server must be on 5173: it's the only origin the local Keycloak client accepts. A dev server
 * already running there is reused only if it talks to the gateway (e2e/real/global-setup.ts checks).
 *
 * ASSAY_BASE_URL=http://localhost:8080 tests a deployed stack instead (the production compose's edge, which serves
 * the published frontend image and proxies /api and /realms/assay on the same origin): no dev server is started,
 * and the gateway and Keycloak default to that origin.
 */
const deployed = process.env.ASSAY_BASE_URL?.replace(/\/$/, '')
const gateway = process.env.ASSAY_GATEWAY ?? deployed ?? 'http://localhost:9191'
const keycloak = process.env.ASSAY_KEYCLOAK ?? deployed ?? 'http://localhost:7080'
const port = 5173
// Specs shared with the offline suite read this to map mock ids (t-beta) to the copy's own (e2e/helpers.ts).
process.env.ASSAY_REAL = '1'
// The specs call the gateway and Keycloak themselves (e2e/real/real.ts): give them the resolved addresses.
process.env.ASSAY_GATEWAY = gateway
process.env.ASSAY_KEYCLOAK = keycloak

export default defineConfig({
  ...base,
  testIgnore: undefined,
  // Real services take longer than the mocks, and runs share one stack: keep the load modest.
  workers: process.env.CI ? 1 : 2,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: { ...base.use, baseURL: deployed ?? `http://localhost:${port}` },
  metadata: { gateway, keycloak, deployed: Boolean(deployed) },
  globalSetup: './e2e/real/global-setup.ts',
  // Desktop runs everything but the 375 px checks; mobile also walks every screen at 375 px.
  projects: (base.projects ?? []).map((p) =>
    p.name === 'desktop' ? { ...p, testIgnore: /mobile\.spec\.ts/ } : { ...p, testMatch: [/mobile\.spec\.ts/, /real[\\/]walk\.spec\.ts/] },
  ),
  webServer: deployed
    ? undefined
    : {
        command: `npm run dev -- --port ${port} --strictPort`,
        url: `http://localhost:${port}`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
        env: {
          VITE_API_MOCKING: 'off',
          VITE_API_BASE_URL: gateway,
          VITE_OIDC_AUTHORITY: `${keycloak}/realms/assay`,
          VITE_OIDC_CLIENT_ID: 'assay-spa',
          VITE_DEMO_PASSWORD: process.env.VITE_DEMO_PASSWORD ?? 'assay-demo',
        },
      },
})
