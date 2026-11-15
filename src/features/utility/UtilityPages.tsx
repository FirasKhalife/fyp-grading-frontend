import { Link, useRouteError } from 'react-router'
import { useAuth } from '@/auth/AuthProvider'
import { ROLE_SHORT } from '@/auth/personas'
import { Glyph } from '@/components/assay/Wordmark'
import { EmptyState, ErrorState } from '@/components/assay/States'
import { Main, PageTitle, useTitle } from '@/components/assay/Page'
import { Button } from '@/components/ui/button'

/** P12 utility pages, built from the P3 and P5 empty and error patterns. */

export function NotFoundPage() {
  useTitle('Page not found')
  const { persona } = useAuth()
  return (
    <Main>
      <PageTitle>Page not found</PageTitle>
      <EmptyState
        glyph={<Glyph size={26} strokeWidth={3} />}
        title="There's nothing at this address"
        actions={
          <>
            <Button asChild>
              <Link to={persona?.home ?? '/'}>{persona ? 'Go to my home' : 'Choose a role'}</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/rubrics">Read the rubrics</Link>
            </Button>
          </>
        }
      >
        The link may be old, or the page was removed. Your demo data is safe.
      </EmptyState>
    </Main>
  )
}

const WHO: Record<string, string> = {
  admin: 'coordinators',
  reviewer: 'reviewers',
  student: 'students',
}

export function NoPermissionPage({ for: audience }: { for: 'admin' | 'reviewer' | 'student' }) {
  useTitle('No permission')
  const { persona } = useAuth()
  const as = persona ? `${ROLE_SHORT[persona.role].toLowerCase()}` : 'not signed in'
  return (
    <Main>
      <PageTitle>No permission</PageTitle>
      <EmptyState
        icon="lock"
        title={`This page is for ${WHO[audience]}.`}
        actions={
          <>
            {persona && (
              <Button asChild>
                <Link to={persona.home}>Go to my home</Link>
              </Button>
            )}
            <Button asChild variant="ghost">
              <Link to="/">Switch role</Link>
            </Button>
          </>
        }
      >
        You're signed in {persona ? `as a ${as}` : ''}. Switch role in the demo banner to see this page; your private copy stays the same.
      </EmptyState>
    </Main>
  )
}

export function SessionExpiredPage() {
  useTitle('Session expired')
  return (
    <Main>
      <PageTitle>Session expired</PageTitle>
      <EmptyState
        icon="clock"
        title="You were signed out"
        actions={
          <Button asChild>
            <Link to="/">Sign in again</Link>
          </Button>
        }
      >
        Sign-ins last a few hours. Your demo copy is still here until midnight, Paris time: pick the same role to carry on.
      </EmptyState>
    </Main>
  )
}

export function ResetInProgressPage() {
  useTitle('Resetting')
  return (
    <Main>
      <PageTitle>Resetting your demo</PageTitle>
      <div role="status" className="flex items-center gap-3 rounded-card border border-line bg-surface p-6">
        <span className="spin border-line2 border-t-pri" aria-hidden="true" />
        <span>
          <strong>Creating a fresh copy of the demo data…</strong> <span className="text-muted">This takes a few seconds.</span>
        </span>
      </div>
    </Main>
  )
}

/** Router error boundary: something threw while rendering. */
export function CrashPage() {
  const err = useRouteError()
  useTitle('Something went wrong')
  if (import.meta.env.DEV) console.error(err)
  return (
    <Main>
      <PageTitle>Something went wrong</PageTitle>
      <ErrorState
        title="This page hit an unexpected error."
        actions={
          <>
            <Button onClick={() => window.location.reload()}>Reload</Button>
            <Button asChild variant="ghost">
              <a href="/">Back to roles</a>
            </Button>
          </>
        }
      >
        Your demo data is safe. Reload the page; if it keeps happening, "Reset my demo" in the banner gives you a fresh copy.
      </ErrorState>
    </Main>
  )
}
