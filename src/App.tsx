import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { RouterProvider } from 'react-router'
import { Toaster } from 'sonner'
import { ApiError } from '@/api/client'
import { AuthProvider } from '@/auth/AuthProvider'
import { ThemeProvider, useTheme } from '@/components/shell/theme'
import { createRouter } from './router'

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5_000,
        // One retry for server trouble and rate limits (429), none for other 4xx.
        retry: (n, e) => n < 1 && (!(e instanceof ApiError) || e.status >= 500 || e.status === 429),
        // Wait as long as Retry-After says (capped), else the usual back-off.
        retryDelay: (n, e) => (e instanceof ApiError && e.retryAfter !== null ? Math.min(e.retryAfter, 30) * 1000 : Math.min(1000 * 2 ** n, 30_000)),
        refetchOnWindowFocus: true,
      },
    },
  })
}

function ThemedToaster() {
  const { theme } = useTheme()
  return (
    <Toaster
      theme={theme}
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast: '!rounded-[12px] !font-sans !text-[14px] !leading-5',
        },
      }}
    />
  )
}

export function Providers({ children, authOverride }: { children: ReactNode; authOverride?: (children: ReactNode) => ReactNode }) {
  const [qc] = useState(makeQueryClient)
  const inner = (
    <>
      {children}
      <ThemedToaster />
    </>
  )
  return (
    <ThemeProvider>
      <QueryClientProvider client={qc}>{authOverride ? authOverride(inner) : <AuthProvider>{inner}</AuthProvider>}</QueryClientProvider>
    </ThemeProvider>
  )
}

export function App() {
  const [router] = useState(createRouter)
  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  )
}
