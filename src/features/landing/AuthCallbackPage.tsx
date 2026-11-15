import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { completeSignIn, oidcEnabled } from '@/auth/oidc'
import { ErrorState } from '@/components/assay/States'
import { Main } from '@/components/assay/Page'
import { Button } from '@/components/ui/button'

/** OIDC redirect target: finishes the PKCE exchange, then goes where the persona card pointed. */
export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!oidcEnabled) {
      navigate('/', { replace: true })
      return
    }
    completeSignIn()
      .then(({ returnTo }) => window.location.replace(returnTo))
      .catch(() => setFailed(true))
  }, [navigate])
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
          The demo is starting up, try again in a minute.
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
