import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import * as store from '@/mocks/store'
import { renderApp } from '@/test/render'

// "Sign in with email" on a brand-new browser: Keycloak redirects back to /auth/callback, and this browser
// has no demo copy yet. /api/me answers 404 without one (as on the real gateway), so the copy has to be made
// first. Found in integration testing: the callback asked /api/me first and the sign-in failed.
vi.mock('@/auth/oidc', () => {
  const user = { access_token: 'mock.john.doe', expired: false, profile: { preferred_username: 'john.doe' }, state: { returnTo: '/home' } }
  return {
    oidcEnabled: true,
    signInPersona: vi.fn(),
    signInWithEmail: vi.fn(async () => {}),
    completeSignIn: vi.fn(async () => ({ user, returnTo: '/home' })),
    currentUser: vi.fn(async () => user),
    accessToken: vi.fn(async () => 'mock.john.doe'),
    signOut: vi.fn(async () => {}),
    dropUser: vi.fn(async () => {}),
  }
})

describe('Sign in with email on a new browser', () => {
  it('creates the copy before asking who the user is, then lands on their home', async () => {
    renderApp('/auth/callback')
    store.purgeCopy() // a browser that never had a copy
    expect(await screen.findByRole('heading', { level: 1, name: 'My teams' }, { timeout: 5000 })).toBeInTheDocument()
    expect(store.hasCopy()).toBe(true)
    expect(screen.queryByText("Sign-in didn't complete.")).not.toBeInTheDocument()
  })
})
