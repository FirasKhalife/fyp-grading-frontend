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
      <Outlet />
      <ScrollRestoration />
    </div>
  )
}
