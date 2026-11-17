import type { FullConfig } from '@playwright/test'

/**
 * Refuse to run the real-stack suite against a dev server that serves the MSW mocks (one started
 * without the VITE_* settings and reused by Playwright), and check the stack answers.
 */
export default async function globalSetup(config: FullConfig) {
  const base = config.projects[0]?.use.baseURL ?? 'http://localhost:5173'
  const { gateway, keycloak } = config.metadata as { gateway: string; keycloak: string }
  const main = await (await fetch(`${base}/src/main.tsx`)).text()
  const client = await (await fetch(`${base}/src/api/client.ts`)).text()
  if (!main.includes('"VITE_API_MOCKING": "off"') || !client.includes(gateway))
    throw new Error(`The dev server on ${base} isn't pointed at ${gateway} with mocks off. Stop it and run again.`)
  const personas = await fetch(`${gateway}/api/demo/personas`)
  if (!personas.ok) throw new Error(`The gateway at ${gateway} isn't answering (${personas.status}).`)
  const realm = await fetch(`${keycloak}/realms/assay/.well-known/openid-configuration`)
  if (!realm.ok) throw new Error(`Keycloak at ${keycloak} isn't answering (${realm.status}).`)
}
