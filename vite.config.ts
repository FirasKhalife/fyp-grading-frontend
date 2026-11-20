/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    // Unit tests always run on the MSW mocks, even with a .env.local pointing the dev server at a real stack.
    env: { VITE_API_BASE_URL: 'http://localhost', VITE_API_MOCKING: '', VITE_OIDC_AUTHORITY: '', VITE_DEMO_PASSWORD: '' },
    testTimeout: 20_000,
    // recharts (with its d3 modules) is hundreds of small ES modules: pre-bundled, the overview and its insights
    // load in a fraction of the time, so their first render no longer nears the 5 s findBy limit in a parallel run.
    deps: {
      optimizer: {
        client: {
          enabled: true,
          include: [
            'recharts',
            'radix-ui',
            'react-router',
            '@tanstack/react-query',
            'sonner',
            'oidc-client-ts',
            'react',
            'react-dom',
            'react-dom/client',
            'react/jsx-runtime',
            'react/jsx-dev-runtime',
          ],
        },
      },
    },
  },
})
