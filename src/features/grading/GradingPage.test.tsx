import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import * as store from '@/mocks/store'
import { teamAssessment } from '@/mocks/logic'
import { expectNoAxeViolations, renderApp } from '@/test/render'

const BETA_FR = '/grade/t-beta/final-report'

describe('P4 grading form', () => {
  it("opens Jane's Beta final report draft at 8 of 13 criteria and 53.8", async () => {
    renderApp(BETA_FR, 'jane')
    expect(await screen.findByRole('heading', { level: 1, name: 'Final report · Team Beta' })).toBeInTheDocument()
    const panel = screen.getByRole('complementary', { name: 'Score and submission' })
    expect(within(panel).getByText('53.8')).toBeInTheDocument()
    expect(within(panel).getByText(/of 13 criteria scored/)).toHaveTextContent('8 of 13 criteria scored')
    expect(within(panel).getByText('Developing band')).toBeInTheDocument()
  })

  it('makes each criterion a keyboard radio group: arrow keys move between levels and update the live score', async () => {
    const user = userEvent.setup()
    renderApp(BETA_FR, 'jane')
    const group = await screen.findByRole('radiogroup', { name: /^Project objectives\/Outcomes$/ })
    const radios = within(group).getAllByRole('radio')
    expect(radios.map((r) => r.getAttribute('aria-label')?.split(':')[0])).toEqual([
      '4, Exemplary',
      '3, Accomplished',
      '2, Developing',
      '1, Beginning',
      '0, Not demonstrated',
    ])
    // Level 3 is selected in the seed; moving right in the 4 → 0 order picks level 2.
    radios[1]!.focus()
    await user.keyboard('{ArrowRight}')
    await waitFor(() => expect(radios[2]).toHaveAttribute('data-state', 'checked'))
    expect(document.activeElement).toBe(radios[2])
    // One criterion at 10% moved from 3 to 2: the live score drops by 2.5.
    const panel = screen.getByRole('complementary', { name: 'Score and submission' })
    await waitFor(() => expect(within(panel).getByText('51.3')).toBeInTheDocument())
  })

  it('blocks submit until every criterion is scored, then locks after the in-page confirm', async () => {
    const user = userEvent.setup()
    renderApp(BETA_FR, 'jane')
    const panel = await screen.findByRole('complementary', { name: 'Score and submission' })
    await user.click(within(panel).getByRole('button', { name: 'Submit evaluation' }))
    expect(within(panel).getByText('Score 5 more criteria to submit.')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()

    for (const group of screen.getAllByRole('radiogroup')) {
      if (!within(group).queryByRole('radio', { checked: true })) await user.click(within(group).getByRole('radio', { name: /^3, Accomplished/ }))
    }
    await waitFor(() => expect(within(panel).getByText(/of 13 criteria scored/)).toHaveTextContent('13 of 13'))
    await user.click(within(panel).getByRole('button', { name: 'Submit evaluation' }))
    const confirm = within(panel).getByRole('alertdialog')
    expect(confirm).toHaveTextContent("Submitting locks this evaluation. You won't be able to change it.")
    await user.click(within(confirm).getByRole('button', { name: 'Submit and lock' }))

    expect(await screen.findByText(/This evaluation is locked and can't be changed/)).toBeInTheDocument()
    for (const r of screen.getAllByRole('radio')) expect(r).toBeDisabled()
    // The team grade is now final: the plain average of the three jury scores.
    const info = teamAssessment(store.getState(), 't-beta', 'FINAL_REPORT')
    expect(info.submitted).toBe(3)
    expect(info.grade).not.toBeNull()
  })

  it('autosaves a comment as a draft', async () => {
    const user = userEvent.setup()
    renderApp(BETA_FR, 'jane')
    const add = (await screen.findAllByRole('button', { name: 'Add a comment' }))[0]!
    await user.click(add)
    const box = screen.getAllByRole('textbox', { name: /Comment for the team/ })[0]!
    await user.type(box, 'Clear objectives.')
    await waitFor(
      () => {
        const e = teamAssessment(store.getState(), 't-beta', 'FINAL_REPORT').reviewers.find((r) => r.reviewer.id === 'r-jane')!.evaluation!
        expect(Object.values(e.comments)).toContain('Clear objectives.')
      },
      { timeout: 4000 },
    )
  })

  it("refuses a team the reviewer doesn't grade", async () => {
    renderApp('/grade/t-gamma/final-report', 'jane')
    expect(await screen.findByText('This page is for reviewers.')).toBeInTheDocument()
  })

  it('has no axe violations', async () => {
    const { container } = renderApp(BETA_FR, 'jane')
    await screen.findByRole('heading', { level: 1, name: 'Final report · Team Beta' })
    await expectNoAxeViolations(container)
  })
})
