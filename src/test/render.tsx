import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { configureAxe } from 'vitest-axe'
import { Providers } from '@/App'
import { AuthProvider } from '@/auth/AuthProvider'
import type { PersonaId } from '@/auth/personas'
import * as store from '@/mocks/store'
import { routes } from '@/router'
import { expect } from 'vitest'

// Load every screen (and the overview's charts) with this helper, before any test runs. The app loads them
// lazily on first visit; in a test that cost (a second or more per file when files run in parallel) landed
// inside the first findBy and pushed it toward its time limit.
import.meta.glob(['/src/features/**/*Page.tsx', '/src/features/overview/Insights.tsx'], { eager: true })

/** Renders the real routes at `path`, signed in as a persona, on a fresh demo copy served by MSW. */
export function renderApp(path: string, persona?: PersonaId) {
  store.createCopy()
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const ui = (
    <Providers authOverride={persona ? (children) => <AuthProvider initialPersona={persona}>{children}</AuthProvider> : undefined}>
      <RouterProvider router={router} />
    </Providers>
  )
  return { router, ...render(ui) }
}

// jsdom can't compute colours, so contrast is checked in the Playwright run instead.
const axe = configureAxe({ rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } })

export async function expectNoAxeViolations(el: Element) {
  const res = await axe(el)
  const msg = res.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`).join('\n')
  expect(msg).toBe('')
}
