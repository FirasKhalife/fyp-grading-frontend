import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { setSimulation } from '@/mocks/handlers'
import { expectNoAxeViolations, renderApp } from '@/test/render'

describe('P3 My teams', () => {
  it("shows Jane's three teams, the summary and the next-up draft", async () => {
    renderApp('/my-teams', 'jane')
    expect(await screen.findByText(/evaluations submitted/)).toHaveTextContent('9 of 12 evaluations submitted · 1 draft · 2 not started · none overdue')
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Team Beta', 'Team Epsilon', 'Team Alpha'])
    expect(screen.getByRole('link', { name: 'Continue draft' })).toHaveAttribute('href', '/grade/t-beta/final-report')
  })

  it("shows Karim's overdue advisor draft with a single assessment for Delta", async () => {
    renderApp('/my-teams', 'karim')
    const delta = await screen.findByRole('region', { name: 'Team Delta' })
    expect(within(delta).getAllByRole('listitem')).toHaveLength(1)
    expect(within(delta).getByText(/Overdue · 3 of 5 scored/)).toBeInTheDocument()
  })

  it('shows the error state with a retry when the server fails', async () => {
    setSimulation('error')
    try {
      renderApp('/my-teams', 'jane')
      expect(await screen.findByText("We couldn't load your teams.", {}, { timeout: 6000 })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    } finally {
      setSimulation('none')
    }
  })

  it('shows the empty state', async () => {
    setSimulation('empty')
    try {
      renderApp('/my-teams', 'jane')
      expect(await screen.findByText("You're not assigned to any team yet")).toBeInTheDocument()
    } finally {
      setSimulation('none')
    }
  })

  it('shows the progress report as required, not as 0% of the final grade', async () => {
    renderApp('/my-teams', 'jane')
    await screen.findByText(/evaluations submitted/)
    expect(screen.getAllByText('Required · not counted in the final grade').length).toBeGreaterThan(0)
    expect(screen.queryByText(/(^|[^0-9])0% of/)).not.toBeInTheDocument()
  })

  it('has no axe violations', async () => {
    const { container } = renderApp('/my-teams', 'jane')
    await screen.findByText(/evaluations submitted/)
    await expectNoAxeViolations(container)
  })
})

const GRID = /^Each cell is the team's grade/

describe('P5 Coordinator overview', () => {
  it('shows the KPIs and the grid', async () => {
    renderApp('/overview', 'rania')
    expect(await screen.findByRole('table', { name: GRID }, { timeout: 5000 })).toBeInTheDocument()
    const kpis = screen.getByRole('region', { name: 'Key figures' })
    expect(kpis).toHaveTextContent('62 / 74')
    expect(kpis).toHaveTextContent('90.1')
    expect(screen.getByRole('link', { name: /^74.2 Released · spread 21.3. Team Beta, Proposal presentation, Accomplished band$/ })).toBeInTheDocument()
  })

  it('labels the progress column "Required" instead of 0%', async () => {
    renderApp('/overview', 'rania')
    const grid = await screen.findByRole('table', { name: GRID }, { timeout: 5000 })
    const progress = within(grid).getByRole('columnheader', { name: /^Progress/ })
    expect(progress).toHaveTextContent(/^Progress Required/)
    expect(progress).not.toHaveTextContent('0%')
  })

  it('moves focus through the grid with arrow keys (one tab stop)', async () => {
    const user = userEvent.setup()
    renderApp('/overview', 'rania')
    const table = await screen.findByRole('table', { name: GRID })
    const tabbable = within(table)
      .getAllByRole('link')
      .filter((l) => l.getAttribute('tabindex') === '0')
    expect(tabbable).toHaveLength(1)
    tabbable[0]!.focus()
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toHaveAccessibleName(/Team Alpha, Proposal presentation/)
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toHaveAccessibleName(/Team Beta, Proposal presentation/)
    await user.keyboard('{End}')
    expect(document.activeElement).toHaveAccessibleName(/Team Beta final grade$/)
  })

  it('releases an assessment in place, with a confirm and no modal', async () => {
    const user = userEvent.setup()
    renderApp('/overview', 'rania')
    const panel = await screen.findByRole('region', { name: 'Ready to release' })
    await user.click(within(panel).getByRole('button', { name: 'Release to Beta and Epsilon' }))
    const confirm = within(panel).getByRole('alertdialog')
    expect(confirm).toHaveTextContent('Students on Team Beta and Team Epsilon will see their Advisor assessment grade')
    await user.click(within(confirm).getByRole('button', { name: 'Release now' }))
    await waitFor(() => expect(within(panel).queryByText('Advisor assessment')).not.toBeInTheDocument())
  })

  it('is only for coordinators', async () => {
    renderApp('/overview', 'jane')
    expect(await screen.findByText('This page is for coordinators.')).toBeInTheDocument()
  })

  it('has no axe violations', async () => {
    const { container } = renderApp('/overview', 'rania')
    await screen.findByRole('table', { name: GRID })
    await expectNoAxeViolations(container)
  })
})

describe('P11 Student home', () => {
  it("shows Nour's final grade and how it adds up", async () => {
    renderApp('/student', 'nour')
    const card = await screen.findByRole('region', { name: 'Final grade' })
    expect(within(card).getByText('88.0')).toBeInTheDocument()
    expect(within(card).getByRole('table')).toHaveTextContent('Advisor')
  })

  it('has no axe violations', async () => {
    const { container } = renderApp('/student', 'nour')
    await screen.findByRole('region', { name: 'Final grade' })
    await expectNoAxeViolations(container)
  })
})

describe('Other screens render without axe violations', () => {
  it.each([
    ['/teams/t-beta', 'rania', 'Team Beta'],
    ['/rubrics/proposal-presentation', 'nour', 'Rubrics'],
    ['/rubrics/final-presentation/edit', 'rania', 'Edit rubric · Final presentation'],
    ['/schedule', 'rania', 'Schedule'],
    ['/teams', 'rania', 'Teams and people'],
    ['/nowhere', 'jane', 'Page not found'],
  ] as const)('%s as %s', async (path, persona, heading) => {
    const { container } = renderApp(path, persona)
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    // Let the data regions settle before scanning.
    await waitFor(() => expect(container.querySelector('[aria-busy="true"]')).toBeNull())
    await expectNoAxeViolations(container)
  })

  it('shows the proposal rubric with the seed weights 10/20/20/10/15/10/10/5', async () => {
    renderApp('/rubrics/proposal-presentation', 'jane')
    const table = await screen.findByRole('table', { name: /Proposal presentation rubric/ })
    const weights = within(table)
      .getAllByText(/^Weight \d+%$/)
      .map((w) => w.textContent)
    expect(weights).toEqual(['Weight 10%', 'Weight 20%', 'Weight 20%', 'Weight 10%', 'Weight 15%', 'Weight 10%', 'Weight 10%', 'Weight 5%'])
  })
})
