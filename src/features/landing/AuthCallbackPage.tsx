import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '@/auth/AuthProvider'
import { oidcEnabled } from '@/auth/oidc'
import { ErrorState } from '@/components/assay/States'
import { Main } from '@/components/assay/Page'
import { Button } from '@/components/ui/button'

/** OIDC redirect target: finishes the PKCE exchange, then goes where the persona card pointed. */
export function AuthCallbackPage() {
  const navigate = useNavigate()
  const { completeEmailSignIn } = useAuth()
  const [failed, setFailed] = useState<string | null>(null)
  const started = useRef(false)
  useEffect(() => {
    if (!oidcEnabled) {
      navigate('/', { replace: true })
      return
    }
    // The code can only be exchanged once (StrictMode runs effects twice in development).
    if (started.current) return
    started.current = true
    completeEmailSignIn()
      .then((to) => navigate(to, { replace: true }))
      .catch((e: unknown) => setFailed(e instanceof Error && e.message ? e.message : 'The demo is starting up, try again in a minute.'))
  }, [navigate, completeEmailSignIn])
  return (
    <Main>
      {failed ? (
        <ErrorState
          title="Sign-in didn't complete."
          actions={
            <Button asChild>
              <Link to="/">Back to roles</Link>
            </Button>
          }
        >
          {failed}
        </ErrorState>
      ) : (
        <p role="status" className="flex items-center gap-3">
          <span className="spin border-line2 border-t-pri" aria-hidden="true" />
          Signing you in…
        </p>
      )}
    </Main>
  )
}
