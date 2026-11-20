import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderApp } from '@/test/render'
import { browserDemoSessionId, resetBrowserDemoSessionId } from './demo-session'
import { signInPersona } from './oidc'

// Keycloak configured, and a NEW tab: sessionStorage (where tokens live) starts empty, but localStorage
// still holds the browser's demo session id and the last persona key. The tab signs that persona in again.
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
  signOut: vi.fn(async () => {
    signedIn.username = null
  }),
  dropUser: vi.fn(async () => {
    signedIn.username = null
  }),
}))

const remembered = () => localStorage.getItem('assay-persona')

beforeEach(() => {
  signedIn.username = null // a new tab: no token yet
  vi.mocked(signInPersona).mockClear()
})

describe('a new tab of the same browser', () => {
  it('continues as the last persona, on the same demo copy', async () => {
    const id = browserDemoSessionId()
    localStorage.setItem('assay-persona', 'jane')
    renderApp('/my-teams')
    expect(await screen.findByRole('heading', { level: 1, name: 'My teams' }, { timeout: 5000 })).toBeInTheDocument()
    expect(signInPersona).toHaveBeenCalledWith('jane.smith')
    expect(browserDemoSessionId()).toBe(id)
    // Only the key is remembered, never a token.
    expect(JSON.stringify({ ...localStorage })).not.toContain('mock.')
  })

  it('shows the role picker when no persona was picked in this browser', async () => {
    browserDemoSessionId()
    renderApp('/my-teams')
    expect(await screen.findByRole('button', { name: 'Enter as Jane' })).toBeInTheDocument()
    expect(signInPersona).not.toHaveBeenCalled()
  })

  it('shows the role picker when the browser has no demo session id', async () => {
    localStorage.setItem('assay-persona', 'jane')
    renderApp('/my-teams')
    resetBrowserDemoSessionId() // the MSW store made one; this browser never had a copy
    expect(await screen.findByRole('button', { name: 'Enter as Jane' })).toBeInTheDocument()
    expect(signInPersona).not.toHaveBeenCalled()
  })

  it('forgets the persona if the silent sign-in fails', async () => {
    browserDemoSessionId()
    localStorage.setItem('assay-persona', 'jane')
    vi.mocked(signInPersona).mockRejectedValueOnce(new Error('invalid_grant'))
    renderApp('/my-teams')
    expect(await screen.findByRole('button', { name: 'Enter as Jane' })).toBeInTheDocument()
    expect(remembered()).toBeNull()
  })
})

describe('the remembered persona', () => {
  it('is replaced by "Switch role" and cleared by sign-out', async () => {
    const user = userEvent.setup()
    renderApp('/')
    await user.click(await screen.findByRole('button', { name: 'Enter as Jane' }))
    await screen.findByRole('heading', { level: 1, name: 'My teams' }, { timeout: 5000 })
    expect(remembered()).toBe('jane')

    await user.click(within(screen.getByRole('region', { name: 'Demo' })).getByRole('button', { name: 'Switch role' }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Switch role' })).getByRole('button', { name: /Karim/ }))
    expect(await screen.findByRole('button', { name: /account menu for Karim/ }, { timeout: 5000 })).toBeInTheDocument()
    expect(remembered()).toBe('karim')

    await user.click(screen.getByRole('button', { name: /account menu for Karim/ }))
    await user.click(await screen.findByRole('menuitem', { name: 'Sign out' }))
    expect(await screen.findByRole('button', { name: 'Enter as Jane' })).toBeInTheDocument()
    expect(remembered()).toBeNull()
  })

  it('is cleared by "Reset my demo"', async () => {
    const user = userEvent.setup()
    renderApp('/')
    await user.click(await screen.findByRole('button', { name: 'Enter as Rania' }))
    const demo = await screen.findByRole('region', { name: 'Demo' }, { timeout: 5000 })
    expect(remembered()).toBe('rania')
    await user.click(within(demo).getByRole('button', { name: 'Reset my demo' }))
    await user.click(within(demo).getByRole('button', { name: 'Reset my demo' }))
    expect(await screen.findByRole('button', { name: 'Enter as Jane' }, { timeout: 5000 })).toBeInTheDocument()
    expect(remembered()).toBeNull()
  })
})
