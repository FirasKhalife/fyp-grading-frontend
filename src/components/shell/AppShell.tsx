import { Suspense } from 'react'
import { Outlet, ScrollRestoration } from 'react-router'
import { useLiveUpdates } from '@/api/queries'
import { useAuth } from '@/auth/AuthProvider'
import { Icon } from '../assay/Icon'
import { Main } from '../assay/Page'
import { AppHeader } from './AppHeader'
import { DemoBanner } from './DemoBanner'

export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only z-[60] rounded-ctl bg-pri px-4 py-3 font-semibold text-on-pri focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:text-on-pri"
    >
      Skip to content
    </a>
  )
}

/** Every signed-in screen: demo banner (P2), then the app header, then the page. */
export function AppShell() {
  useLiveUpdates()
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SkipLink />
      <DemoBanner />
      <FreshCopyNotice />
      <AppHeader />
      <Suspense
        fallback={
          <Main>
            <div role="status" aria-label="Loading">
              <span className="sk block h-10 w-72" />
            </div>
          </Main>
        }
      >
        <Outlet />
      </Suspense>
      <ScrollRestoration />
    </div>
  )
}

/** After the midnight purge the app made a fresh copy on its own: say so, once. */
function FreshCopyNotice() {
  const { freshCopy, dismissFreshCopy } = useAuth()
  if (!freshCopy) return null
  return (
    <div role="status" className="border-b border-line bg-pri-soft text-[14px] text-ink">
      <div className="mx-auto flex min-h-11 max-w-[1360px] flex-wrap items-center justify-between gap-x-4 px-4 md:px-10">
        <p className="m-0 flex flex-wrap items-center gap-2 py-2">
          <Icon name="check" className="text-green" />
          <strong>Your demo was reset overnight.</strong>
          <span>You're on a fresh copy of the demo data, and still signed in.</span>
        </p>
        <button
          type="button"
          onClick={dismissFreshCopy}
          className="min-h-11 cursor-pointer border-0 bg-transparent px-2 text-[14px] font-semibold text-pri underline underline-offset-2"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
