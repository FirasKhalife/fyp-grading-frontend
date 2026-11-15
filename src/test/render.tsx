import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { configureAxe } from 'vitest-axe'
import { Providers } from '@/App'
import { AuthProvider } from '@/auth/AuthProvider'
import type { PersonaId } from '@/auth/personas'
import * as store from '@/mocks/store'
import { routes } from '@/router'
import { expect } from 'vitest'

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
