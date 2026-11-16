import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { problemMessage } from '@/api/problems'
import { browserDemoSessionId } from '@/auth/demo-session'
import { server } from '@/mocks/node'
import * as store from '@/mocks/store'
import { renderApp } from '@/test/render'

// Contract 1.3.0: reset swaps the session id, a purged copy is re-created in place, 429 is calm.

describe('Reset my demo (new copy id)', () => {
  it('adopts the id the reset returns; the old id answers 404', async () => {
    const user = userEvent.setup()
    renderApp('/my-teams', 'jane')
    const oldId = browserDemoSessionId()
    const demo = await screen.findByRole('region', { name: 'Demo' })
    await user.click(within(demo).getByRole('button', { name: 'Reset my demo' }))
    await user.click(within(demo).getByRole('button', { name: 'Reset my demo' }))
    await waitFor(() => expect(browserDemoSessionId()).not.toBe(oldId))
    const newId = browserDemoSessionId()

    const call = (id: string) => fetch('http://localhost/api/me', { headers: { 'X-Demo-Session': id, Authorization: 'Bearer mock.jane.smith' } })
    const stale = await call(oldId)
    expect(stale.status).toBe(404)
    expect(((await stale.json()) as { code: string }).code).toBe('demo-session-not-found')
    expect((await call(newId)).status).toBe(200)
  })

  it('says calmly when the reset is rate-limited, with the wait from Retry-After', async () => {
    server.use(
      http.post('*/api/demo/session/reset', () =>
        HttpResponse.json({ status: 429, code: 'rate-limited', detail: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '40' } }),
      ),
    )
    const user = userEvent.setup()
    renderApp('/my-teams', 'jane')
    const oldId = browserDemoSessionId()
    const demo = await screen.findByRole('region', { name: 'Demo' })
    await user.click(within(demo).getByRole('button', { name: 'Reset my demo' }))
    await user.click(within(demo).getByRole('button', { name: 'Reset my demo' }))
    expect(await screen.findByText(/Try again in 40 seconds\./)).toBeInTheDocument()
    expect(browserDemoSessionId()).toBe(oldId)
  })
})

describe('Midnight purge while the app is open', () => {
  it('makes a fresh copy, keeps the user signed in and says so', async () => {
    const { router } = renderApp('/my-teams', 'jane')
    await screen.findByRole('heading', { level: 1, name: 'My teams' })
    store.purgeCopy()
    expect(store.hasCopy()).toBe(false)
    await act(() => router.navigate('/schedule'))
    expect(await screen.findByText('Your demo was reset overnight.', undefined, { timeout: 5000 })).toBeInTheDocument()
    expect(store.hasCopy()).toBe(true)
    // Still signed in as Jane, on the page she asked for, with data from the new copy.
    expect(screen.getByRole('region', { name: 'Demo' })).toHaveTextContent('Jane Smith')
    expect(await screen.findByRole('heading', { level: 1, name: /Schedule|Defense/ })).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByText('Your demo was reset overnight.')).not.toBeInTheDocument()
  })
})

describe('Reviewer changes on a final assessment', () => {
  it('shows the 409 assessment-final inline', async () => {
    const user = userEvent.setup()
    renderApp('/teams/t-beta', 'rania')
    const card = await screen.findByRole('region', { name: /^Reviewers\s*of Team Beta/ }, { timeout: 5000 })
    await user.click(within(card).getByRole('button', { name: 'Assign reviewer' }))
    const form = within(card).getByRole('form', { name: 'Assign a reviewer' })
    await user.selectOptions(within(form).getByRole('combobox', { name: 'Role' }), 'JURY')
    await user.click(within(form).getByRole('button', { name: 'Assign' }))
    expect(await within(form).findByRole('alert')).toHaveTextContent(/already final, so it can't change/)
  })
})

describe('problem messages', () => {
  it('turns codes into plain language and folds in Retry-After', () => {
    expect(problemMessage('rate-limited', 90)).toBe('That was a lot of requests in a short time. Try again in 2 minutes.')
    expect(problemMessage('demo-copy-in-progress', 1)).toMatch(/in 1 second\.$/)
    expect(problemMessage('evaluation-submitting', null)).toMatch(/not saved/)
    expect(problemMessage('something-else', null)).toBeNull()
  })
})
