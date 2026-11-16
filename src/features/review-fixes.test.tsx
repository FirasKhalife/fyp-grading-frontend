import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '@/mocks/node'
import * as store from '@/mocks/store'
import { renderApp } from '@/test/render'

describe('schedule conflict fix (M2)', () => {
  it('moves Team Delta to 11:00 and keeps its room', async () => {
    const user = userEvent.setup()
    renderApp('/schedule', 'rania')
    await user.click(await screen.findByRole('button', { name: 'Move Team Delta to 11:00' }))
    expect(await screen.findByText(/still in Room B-204/)).toBeInTheDocument()
    const delta = store.getState().teams.find((t) => t.id === 't-delta')!
    expect(delta.defense?.room).toBe('Room B-204')
    expect(delta.defense?.start.slice(11, 16)).toBe('11:00')
  })
})

describe('autosave ordering (M4)', () => {
  it('never sends two saves at once, and the server ends with the last pick', async () => {
    let inFlight = 0
    let maxInFlight = 0
    let calls = 0
    server.use(
      http.put('*/api/my-evaluations/:teamId/:assessment', async () => {
        calls += 1
        inFlight += 1
        maxInFlight = Math.max(maxInFlight, inFlight)
        // The first save is slow, so a later pick would overtake it if saves weren't serialised.
        await delay(calls === 1 ? 400 : 20)
        inFlight -= 1
        // Fall through to the contract handler, which stores the draft.
      }),
    )
    const user = userEvent.setup()
    renderApp('/grade/t-beta/final-report', 'jane')
    const group = await screen.findByRole('radiogroup', { name: /^Project objectives\/Outcomes$/ })
    await user.click(within(group).getByRole('radio', { name: /^4, Exemplary/ }))
    await user.click(within(group).getByRole('radio', { name: /^1, Beginning/ }))
    await user.click(within(group).getByRole('radio', { name: /^2, Developing/ }))
    await waitFor(
      () => {
        const e = store.getState().evaluations.find((x) => x.teamId === 't-beta' && x.assessment === 'FINAL_REPORT' && x.reviewerId === 'r-jane')!
        expect(e.levels['fr-01']).toBe(2)
      },
      { timeout: 4000 },
    )
    expect(maxInFlight).toBe(1)
  })
})
