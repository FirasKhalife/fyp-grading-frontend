import { UserManager, WebStorageStateStore, type User } from 'oidc-client-ts'

/**
 * Real sign-in: Authorization Code + PKCE against Keycloak, through a public SPA client.
 * Enabled when VITE_OIDC_AUTHORITY is set (e.g. https://demo.example.dev/realms/assay).
 * Persona cards pass a login_hint so the realm's demo flow can sign the persona in without typing.
 */
const authority = import.meta.env.VITE_OIDC_AUTHORITY as string | undefined
const clientId = (import.meta.env.VITE_OIDC_CLIENT_ID as string | undefined) ?? 'assay-spa'

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

export async function signInAs(username: string, returnTo: string): Promise<void> {
  await userManager().signinRedirect({ login_hint: username, state: { returnTo } })
}

export async function completeSignIn(): Promise<{ user: User; returnTo: string }> {
  const user = await userManager().signinRedirectCallback()
  const returnTo = (user.state as { returnTo?: string } | undefined)?.returnTo ?? '/'
  return { user, returnTo }
}

export async function currentUser(): Promise<User | null> {
  if (!oidcEnabled) return null
  const u = await userManager().getUser()
  return u && !u.expired ? u : null
}

export async function signOut(): Promise<void> {
  await userManager().removeUser()
}

/** Bearer token for API calls; read on every request, never cached at module load. */
export async function accessToken(): Promise<string | null> {
  return (await currentUser())?.access_token ?? null
}
