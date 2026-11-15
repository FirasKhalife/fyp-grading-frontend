import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/globals.css'

/**
 * The offline demo (and `npm run dev`) answers the API from MSW, built from the OpenAPI contract and
 * seeded with the demo data. Set VITE_API_MOCKING=off to talk to the real gateway instead.
 */
async function enableMocking() {
  if (import.meta.env.VITE_API_MOCKING === 'off') return
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledFrame: 'bypass', quiet: true })
}

void enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
