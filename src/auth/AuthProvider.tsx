import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Viewer } from '@/api/repository'
import * as store from '@/mocks/store'
import { currentUser, oidcEnabled, signInAs, signOut } from './oidc'
import { personaById, personaByUsername, type Persona, type PersonaId } from './personas'

const PERSONA_KEY = 'assay-persona'

export interface AuthState {
  persona: Persona | null
  viewer: Viewer | null
  /** True while the first copy of the demo data is being created. */
  creating: boolean
  ready: boolean
  enterAs: (id: PersonaId) => Promise<Persona>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

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

export function AuthProvider({ children, initialPersona }: { children: ReactNode; initialPersona?: PersonaId }) {
  const [persona, setPersona] = useState<Persona | null>(() =>
    initialPersona ? personaById(initialPersona) : oidcEnabled ? null : readPersona(),
  )
  const [ready, setReady] = useState(!oidcEnabled || Boolean(initialPersona))
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!oidcEnabled || initialPersona) return
    let live = true
    void currentUser().then((u) => {
      if (!live) return
      setPersona(personaByUsername(u?.profile.preferred_username))
      setReady(true)
    })
    return () => {
      live = false
    }
  }, [initialPersona])

  // In mock mode a missing copy means the nightly reset ran: drop the persona so the app asks again.
  useEffect(() => {
    if (!oidcEnabled && persona && !initialPersona && !store.hasCopy() && store.peekOvernightReset()) {
      setPersona(null)
    }
  }, [persona, initialPersona])

  const enterAs = useCallback(async (id: PersonaId) => {
    const p = personaById(id)
    if (!p) throw new Error('Unknown persona')
    if (!store.hasCopy()) {
      setCreating(true)
      await new Promise((r) => setTimeout(r, import.meta.env.MODE === 'test' ? 0 : 900))
      store.createCopy()
      setCreating(false)
    }
    if (oidcEnabled) {
      await signInAs(p.username, p.home)
      return p
    }
    try {
      localStorage.setItem(PERSONA_KEY, p.id)
    } catch {
      /* private mode */
    }
    setPersona(p)
    return p
  }, [])

  const doSignOut = useCallback(async () => {
    try {
      localStorage.removeItem(PERSONA_KEY)
    } catch {
      /* ignore */
    }
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
