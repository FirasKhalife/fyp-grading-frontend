import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ApiError, setSessionProblemHandler, setTokenProvider, setUnauthorizedHandler } from '@/api/client'
import { repository, type Viewer } from '@/api/repository'
import { setSessionToday } from '@/lib/demo-clock'
import { hasBrowserDemoSessionId, markCopyCreated, markOvernightReset, resetBrowserDemoSessionId, wasPurged } from './demo-session'
import { accessToken, completeSignIn, currentUser, dropUser, oidcEnabled, signInPersona, signInWithEmail, signOut } from './oidc'
import { identityFrom, personaById, type Persona, type PersonaId } from './personas'

/**
 * The last persona picked in this browser: its key only, never a token (tokens stay in sessionStorage).
 * Offline it is the sign-in itself; with Keycloak it lets a new tab of the same browser sign that persona
 * in again with the same one-click password grant. The personas are public accounts with a public
 * password, so this reveals nothing new. Sign-out, "Reset my demo", an expired session and "Sign in with
 * email" clear it; "Switch role" replaces it.
 */
const PERSONA_KEY = 'assay-persona'

export interface AuthState {
  persona: Persona | null
  viewer: Viewer | null
  /** True while the visitor's private copy of the demo data is being created. */
  creating: boolean
  ready: boolean
  /** The sign-in expired (a 401): the app shows "Session expired". */
  expired: boolean
  enterAs: (id: PersonaId) => Promise<Persona>
  /** "Sign in with username": redirects to Keycloak (code flow with PKCE). */
  signInWithEmail: () => Promise<void>
  /** Finishes the code flow on /auth/callback and returns where to go. */
  completeEmailSignIn: () => Promise<string>
  signOut: () => Promise<void>
  /** The copy was purged at midnight and a fresh one was made: the shell says so until dismissed. */
  freshCopy: boolean
  dismissFreshCopy: () => void
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
    if (p && p.id !== 'account') localStorage.setItem(PERSONA_KEY, p.id)
    else localStorage.removeItem(PERSONA_KEY)
  } catch {
    /* private mode */
  }
}

/**
 * With Keycloak, a new tab has no token (sessionStorage is per tab). If this browser picked a persona
 * before and already has a demo session id, sign that persona in again silently, so the tab continues
 * on the same private copy. Email (code flow) users are never remembered and get the role picker.
 */
async function resumePersona(): Promise<boolean> {
  const p = readPersona()
  if (!p || !hasBrowserDemoSessionId()) return false
  try {
    await signInPersona(p.username)
    signedInAs = p
    return true
  } catch {
    writePersona(null)
    return false
  }
}

/** Make sure this browser's copy exists, and anchor "today" on it. */
async function ensureCopy(): Promise<void> {
  const s = await repository.ensureDemoSession()
  setSessionToday(s.today)
  markCopyCreated()
}

/**
 * With Keycloak: who the token belongs to, as a persona or a plain account. Call it once the copy
 * exists: `/api/me` answers 404 `demo-session-not-found` without one.
 */
async function identityFromToken(): Promise<Persona | null> {
  const u = await currentUser()
  if (!u) return null
  const me = await repository.me()
  return identityFrom(me, u.profile.preferred_username)
}

/**
 * Who is signed in. Offline (MSW) the token is a mock token naming the persona; with Keycloak it is
 * the access token from the persona's password grant or the email code flow. Either way, signing in
 * makes sure the visitor's private demo copy exists (PUT /api/demo/session).
 */
export function AuthProvider({ children, initialPersona }: { children: ReactNode; initialPersona?: PersonaId }) {
  const [persona, setPersona] = useState<Persona | null>(() => (initialPersona ? personaById(initialPersona) : oidcEnabled ? null : readPersona()))
  const [ready, setReady] = useState(false)
  const [creating, setCreating] = useState(false)
  const [expired, setExpired] = useState(false)
  const [freshCopy, setFreshCopy] = useState(false)
  const qc = useQueryClient()
  const recovering = useRef<Promise<boolean> | null>(null)
  const lastRecovery = useRef(0)

  // Layout effects run before any child's data effects, so the first query already carries the token.
  useLayoutEffect(() => {
    signedInAs = persona
  }, [persona])

  const forget = useCallback(() => {
    writePersona(null)
    signedInAs = null
    setPersona(null)
  }, [])

  /**
   * The copy is gone (midnight purge): make a new one with PUT /api/demo/session, stay signed in,
   * refetch everything and say so. Many queries fail at once, so one recovery serves them all. If the
   * new copy can't be made, or the copy vanishes again straight away, fall back to the landing page.
   */
  const recover = useCallback((): Promise<boolean> => {
    if (recovering.current) return recovering.current
    recovering.current = (async () => {
      wasPurged()
      const again = Date.now() - lastRecovery.current < 10_000
      try {
        if (again) throw new Error('The copy vanished again')
        await ensureCopy()
        lastRecovery.current = Date.now()
        setFreshCopy(true)
        void qc.invalidateQueries()
        return true
      } catch {
        markOvernightReset()
        forget()
        return false
      } finally {
        recovering.current = null
      }
    })()
    return recovering.current
  }, [forget, qc])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (oidcEnabled) void dropUser()
      forget()
      setExpired(true)
    })
    setSessionProblemHandler((e: ApiError) => {
      if (e.code === 'demo-session-required') {
        // The stored id is unusable: start a fresh one and a fresh copy.
        resetBrowserDemoSessionId()
        void ensureCopy()
        return
      }
      // demo-session-not-found mid-visit: the copy was purged at midnight.
      void recover()
    })
    return () => {
      setUnauthorizedHandler(null)
      setSessionProblemHandler(null)
    }
  }, [forget, recover])

  // On start: restore the sign-in, then check the demo copy.
  useEffect(() => {
    let live = true
    void (async () => {
      if (initialPersona) {
        if (live) setReady(true)
        return
      }
      const p = persona
      try {
        let signedIn = oidcEnabled ? (await currentUser()) !== null : p !== null
        if (oidcEnabled && !signedIn) signedIn = await resumePersona()
        if (signedIn) {
          if (p) signedInAs = p
          // The copy first: every other call, /api/me included, needs it.
          let haveCopy = true
          try {
            const s = await repository.demoSession()
            setSessionToday(s.today)
            markCopyCreated()
          } catch (e) {
            if (!(e instanceof ApiError) || e.status !== 404) throw e
            // A 404 is the nightly purge only if this browser had a copy; a new browser just needs one.
            if (wasPurged()) haveCopy = await recover()
            else await ensureCopy()
          }
          if (oidcEnabled && haveCopy) {
            const who = await identityFromToken()
            if (live) setPersona(who)
          }
        }
      } catch {
        /* the server is unreachable: screens show their own error states */
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
      await ensureCopy()
    } finally {
      setCreating(false)
    }
    writePersona(p)
    setExpired(false)
    setPersona(p)
    return p
  }, [])

  const completeEmailSignIn = useCallback(async () => {
    const { returnTo } = await completeSignIn()
    writePersona(null) // an email sign-in is not a persona: a new tab shows the role picker
    // The copy before /api/me, which answers 404 without one (a brand-new browser has none yet).
    setCreating(true)
    try {
      await ensureCopy()
    } finally {
      setCreating(false)
    }
    const p = await identityFromToken()
    if (!p) throw new Error('No user after sign-in')
    signedInAs = p
    setExpired(false)
    setPersona(p)
    return returnTo === '/home' ? p.home : returnTo
  }, [])

  const doSignOut = useCallback(async () => {
    setFreshCopy(false)
    forget()
    if (oidcEnabled) await signOut()
  }, [forget])

  const value = useMemo<AuthState>(
    () => ({
      persona,
      viewer: persona ? viewerOf(persona) : null,
      creating,
      ready,
      expired,
      enterAs,
      signInWithEmail: () => signInWithEmail(),
      completeEmailSignIn,
      signOut: doSignOut,
      freshCopy,
      dismissFreshCopy: () => setFreshCopy(false),
    }),
    [persona, creating, ready, expired, enterAs, completeEmailSignIn, doSignOut, freshCopy],
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
