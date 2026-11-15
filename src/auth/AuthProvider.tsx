import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, setTokenProvider, setUnauthorizedHandler } from '@/api/client'
import { repository, type Viewer } from '@/api/repository'
import { markOvernightReset } from './demo-session'
import { accessToken, currentUser, oidcEnabled, signInPersona, signOut } from './oidc'
import { personaById, personaByUsername, type Persona, type PersonaId } from './personas'

const PERSONA_KEY = 'assay-persona'

export interface AuthState {
  persona: Persona | null
  viewer: Viewer | null
  /** True while the visitor's private copy of the demo data is being created. */
  creating: boolean
  ready: boolean
  enterAs: (id: PersonaId) => Promise<Persona>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

/** The persona the API client signs requests as (mock tokens); kept outside React so it is set before any child query runs. */
let signedInAs: Persona | null = null
setTokenProvider(() => (oidcEnabled ? accessToken() : signedInAs ? `mock.${signedInAs.username}` : null))

function viewerOf(p: Persona): Viewer {
  return { userId: p.userId, kind: p.role === 'COORDINATOR' ? 'admin' : p.role === 'STUDENT' ? 'student' : 'reviewer' }
}

function readPersona(): Persona | null {
  try {
    return personaById(localStorage.getItem(PERSONA_KEY))
  } catch {
    return null
  }
}
function writePersona(p: Persona | null) {
  try {
    if (p) localStorage.setItem(PERSONA_KEY, p.id)
    else localStorage.removeItem(PERSONA_KEY)
  } catch {
    /* private mode */
  }
}

/**
 * Who is signed in. Offline (MSW) the token is a mock token naming the persona; with Keycloak it is
 * the access token of the persona's account. Either way the persona card signs in and then makes
 * sure the visitor's private demo copy exists (PUT /api/demo/session).
 */
export function AuthProvider({ children, initialPersona }: { children: ReactNode; initialPersona?: PersonaId }) {
  const [persona, setPersona] = useState<Persona | null>(() => (initialPersona ? personaById(initialPersona) : oidcEnabled ? null : readPersona()))
  const [ready, setReady] = useState(false)
  const [creating, setCreating] = useState(false)

  signedInAs = persona

  useEffect(() => {
    setUnauthorizedHandler(() => {
      writePersona(null)
      setPersona(null)
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  // On start: restore the session, and check the demo copy still exists (it's purged at midnight).
  useEffect(() => {
    let live = true
    void (async () => {
      let p = persona
      if (oidcEnabled && !initialPersona) {
        const u = await currentUser()
        p = personaByUsername(u?.profile.preferred_username)
        if (live) setPersona(p)
      }
      if (p && !initialPersona) {
        signedInAs = p
        try {
          await repository.demoSession()
        } catch (e) {
          if (e instanceof ApiError && e.status === 404) {
            markOvernightReset()
            writePersona(null)
            if (live) setPersona(null)
          }
        }
      }
      if (live) setReady(true)
    })()
    return () => {
      live = false
    }
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const enterAs = useCallback(async (id: PersonaId) => {
    const p = personaById(id)
    if (!p) throw new Error('Unknown persona')
    if (oidcEnabled) await signInPersona(p.username)
    signedInAs = p
    setCreating(true)
    try {
      await repository.ensureDemoSession()
    } finally {
      setCreating(false)
    }
    writePersona(p)
    setPersona(p)
    return p
  }, [])

  const doSignOut = useCallback(async () => {
    writePersona(null)
    if (oidcEnabled) await signOut()
    setPersona(null)
  }, [])

  const value = useMemo<AuthState>(
    () => ({ persona, viewer: persona ? viewerOf(persona) : null, creating, ready, enterAs, signOut: doSignOut }),
    [persona, creating, ready, enterAs, doSignOut],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}

/** For signed-in screens: the viewer is guaranteed by the route guard. */
export function useViewer(): { persona: Persona; viewer: Viewer } {
  const { persona, viewer } = useAuth()
  if (!persona || !viewer) throw new Error('Not signed in')
  return { persona, viewer }
}
