import { UserManager, WebStorageStateStore, type User } from 'oidc-client-ts'

/**
 * Real sign-in against Keycloak (realm `assay`, public client `assay-spa`), enabled when
 * VITE_OIDC_AUTHORITY is set, e.g. https://demo.example.dev/realms/assay.
 * - Persona cards: a token request with the persona's username and the shared demo password
 *   (VITE_DEMO_PASSWORD). These accounts are public by design; the password is not a secret.
 * - "Sign in with email": Authorization Code + PKCE, with a login_hint.
 */
const authority = import.meta.env.VITE_OIDC_AUTHORITY as string | undefined
const clientId = (import.meta.env.VITE_OIDC_CLIENT_ID as string | undefined) ?? 'assay-spa'
const demoPassword = (import.meta.env.VITE_DEMO_PASSWORD as string | undefined) ?? ''

export const oidcEnabled = Boolean(authority)

let manager: UserManager | null = null

export function userManager(): UserManager {
  if (!authority) throw new Error('OIDC is not configured (VITE_OIDC_AUTHORITY)')
  manager ??= new UserManager({
    authority,
    client_id: clientId,
    redirect_uri: `${window.location.origin}/auth/callback`,
    post_logout_redirect_uri: `${window.location.origin}/`,
    response_type: 'code',
    scope: 'openid profile email',
    automaticSilentRenew: true,
    userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  })
  return manager
}

const METHOD_KEY = 'assay-signin-method'
function setMethod(m: 'password' | 'code' | null) {
  try {
    if (m) sessionStorage.setItem(METHOD_KEY, m)
    else sessionStorage.removeItem(METHOD_KEY)
  } catch {
    /* ignore */
  }
}

/** One-click persona sign-in (password grant on the public demo accounts). */
export async function signInPersona(username: string): Promise<User> {
  const u = await userManager().signinResourceOwnerCredentials({ username, password: demoPassword })
  setMethod('password')
  return u
}

/** "Sign in with email": the code flow with PKCE. */
export async function signInWithEmail(loginHint?: string, returnTo = '/home'): Promise<void> {
  setMethod('code')
  await userManager().signinRedirect({ login_hint: loginHint, state: { returnTo } })
}

export async function completeSignIn(): Promise<{ user: User; returnTo: string }> {
  const user = await userManager().signinRedirectCallback()
  const returnTo = (user.state as { returnTo?: string } | undefined)?.returnTo ?? '/home'
  return { user, returnTo }
}

export async function currentUser(): Promise<User | null> {
  if (!oidcEnabled) return null
  const u = await userManager().getUser()
  return u && !u.expired ? u : null
}

/**
 * Signs out. A code-flow sign-in also ends the Keycloak session, so the next "Sign in with email"
 * asks again; a persona's password grant has no browser session to end.
 */
export async function signOut(): Promise<void> {
  let method: string | null = null
  try {
    method = sessionStorage.getItem(METHOD_KEY)
  } catch {
    /* ignore */
  }
  setMethod(null)
  if (method === 'code') await userManager().signoutRedirect()
  else await userManager().removeUser()
}

/** Forget the local user without a redirect (expired or rejected token). */
export async function dropUser(): Promise<void> {
  setMethod(null)
  await userManager().removeUser()
}

/** Bearer token for API calls; read on every request, never cached at module load. */
export async function accessToken(): Promise<string | null> {
  return (await currentUser())?.access_token ?? null
}
