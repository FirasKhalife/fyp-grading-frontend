import { Suspense } from 'react'
import { Outlet, ScrollRestoration } from 'react-router'
import { useLiveUpdates } from '@/api/queries'
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
      <AppHeader />
      <Suspense
        fallback={
          <div role="status" aria-label="Loading" className="mx-auto max-w-[1360px] px-4 pt-7 md:px-10">
            <span className="sk block h-10 w-72" />
          </div>
        }
      >
        <Outlet />
      </Suspense>
      <ScrollRestoration />
    </div>
  )
}
