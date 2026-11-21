import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderApp } from '@/test/render'

// Keycloak configured: the persona card signs in with the password grant. Tokens are the mock
// tokens MSW understands, so the rest of the app runs as it would against the gateway.
const signedIn = vi.hoisted(() => ({ username: null as string | null }))
vi.mock('@/auth/oidc', () => ({
  oidcEnabled: true,
  signInPersona: vi.fn(async (username: string) => {
    signedIn.username = username
    return { access_token: `mock.${username}`, profile: { preferred_username: username } }
  }),
  signInWithEmail: vi.fn(async () => {}),
  completeSignIn: vi.fn(),
  currentUser: vi.fn(async () =>
    signedIn.username ? { access_token: `mock.${signedIn.username}`, expired: false, profile: { preferred_username: signedIn.username } } : null,
  ),
  accessToken: vi.fn(async () => (signedIn.username ? `mock.${signedIn.username}` : null)),
  signOut: vi.fn(async () => {}),
  dropUser: vi.fn(async () => {}),
}))

describe('sign-in with Keycloak configured (H1)', () => {
  it('a persona click lands on that persona’s home, not back on the landing page', async () => {
    const user = userEvent.setup()
    renderApp('/')
    await user.click(await screen.findByRole('button', { name: 'Enter as Jane' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'My teams' }, { timeout: 5000 })).toBeInTheDocument()
    expect(signedIn.username).toBe('jane.smith')
  })

  it('offers "Sign in with username" (code flow) on the landing page', async () => {
    renderApp('/')
    expect(await screen.findByRole('button', { name: 'Sign in with username' })).toBeInTheDocument()
  })
})
