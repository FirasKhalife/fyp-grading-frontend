import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { RouterProvider } from 'react-router'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/auth/AuthProvider'
import { ThemeProvider, useTheme } from '@/components/shell/theme'
import { createRouter } from './router'

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 5_000, retry: (n, e) => n < 1 && !(e && 'status' in e && (e as { status: number }).status < 500), refetchOnWindowFocus: true },
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
