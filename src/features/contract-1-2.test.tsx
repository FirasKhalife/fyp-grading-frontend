import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '@/mocks/node'
import * as store from '@/mocks/store'
import { renderApp } from '@/test/render'

// Contract 1.2.0: team history, the disagreement flag, overview insights and "last edited by".

describe('P5 insights', () => {
  it('lists the disagreements, largest first, linking to the team', async () => {
    renderApp('/overview', 'rania')
    const panel = await screen.findByRole('region', { name: /^Reviewers disagree/ }, { timeout: 5000 })
    const links = within(panel).getAllByRole('link')
    const spreads = links.map((l) => Number(l.textContent!.match(/([\d.]+) points apart/)![1]))
    expect(spreads).toEqual([...spreads].sort((a, b) => b - a))
    expect(spreads.every((x) => x > 15)).toBe(true)
    const beta = links.find((l) => l.textContent!.includes('Team Beta') && l.textContent!.includes('Proposal presentation'))!
    expect(beta).toHaveTextContent('21.3 points apart')
    expect(beta).toHaveAttribute('href', '/teams/t-beta#proposal_presentation')
  })

  it('gives the grade distribution as a table too, one row per 10-point band', async () => {
    renderApp('/overview', 'rania')
    const table = await screen.findByRole('table', { name: 'Final grades per 10-point band' }, { timeout: 5000 })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(10)
    const total = rows.reduce((s, r) => s + Number(within(r).getByRole('cell').textContent), 0)
    const finals = store.getState().teams.length
    expect(total).toBeGreaterThan(0)
    expect(total).toBeLessThanOrEqual(finals)
  })
})

describe('P6 team history and spread', () => {
  it("shows the team's history from the activity endpoint", async () => {
    renderApp('/teams/t-delta', 'rania')
    const card = await screen.findByRole('region', { name: /^History/ })
    expect(await within(card).findByText(/Team Delta moved to/)).toBeInTheDocument()
    expect(within(card).queryByText(/Team Epsilon/)).not.toBeInTheDocument()
  })

  it('keeps the page usable when the history fails to load', async () => {
    server.use(http.get('*/api/activity', () => HttpResponse.json({ status: 500, code: 'boom', detail: 'Down' }, { status: 500 })))
    renderApp('/teams/t-delta', 'rania')
    // One retry with back-off first, as for every query.
    expect(await screen.findByText("We couldn't load the history.", undefined, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Team Delta' })).toBeInTheDocument()
  })

  it('flags the spread when reviewers disagree, without changing the grade', async () => {
    renderApp('/teams/t-beta#proposal_presentation', 'rania')
    expect(await screen.findByText(/reviewers disagree \(more than 15 points apart\)/)).toBeInTheDocument()
    expect(screen.getByText(/Informational only/)).toBeInTheDocument()
  })

  it('writes one release line per team, so each history shows its own release', async () => {
    const user = userEvent.setup()
    renderApp('/overview', 'rania')
    const panel = await screen.findByRole('region', { name: 'Ready to release' }, { timeout: 5000 })
    await user.click(within(panel).getByRole('button', { name: 'Release to Beta and Epsilon' }))
    await user.click(within(panel).getByRole('button', { name: 'Release now' }))
    await waitFor(() => {
      const lines = store.getState().activity.filter((a) => a.kind === 'release' && a.text.includes('Advisor assessment'))
      expect(lines.map((a) => a.teamId).sort()).toEqual(['t-beta', 't-epsilon'])
    })
  })
})

describe('P7 last edited by', () => {
  it('names who saved the rubric', async () => {
    const user = userEvent.setup()
    renderApp('/rubrics/final-presentation/edit', 'rania')
    expect(await screen.findByText(/this is the seeded rubric/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save rubric' }))
    expect(await screen.findByText(/Last edited by Rania Haddad/)).toBeInTheDocument()
  })
})
