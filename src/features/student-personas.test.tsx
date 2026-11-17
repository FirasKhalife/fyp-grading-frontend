import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createSeedState } from '@/mocks/db'
import { studentHomeView } from '@/mocks/logic'
import { renderApp } from '@/test/render'

// Two student personas (contract 1.4.0): Nour (Team Alpha, every result out) and Ahmad (Team Beta, waiting).

describe('P1 Student card', () => {
  it('keeps four cards and lets the visitor pick which student to enter as', async () => {
    const user = userEvent.setup()
    renderApp('/')
    const roles = await screen.findByRole('region', { name: 'Choose a role to enter' })
    expect(within(roles).getAllByRole('article')).toHaveLength(4)
    const choice = within(roles).getByRole('group', { name: 'Which student' })
    expect(within(choice).getByRole('radio', { name: 'Nour · Alpha · all results out' })).toBeChecked()
    expect(within(roles).getByRole('button', { name: 'Enter as Nour' })).toBeInTheDocument()

    await user.click(within(choice).getByRole('radio', { name: 'Ahmad · Beta · waiting on results' }))
    expect(within(roles).getByRole('button', { name: 'Enter as Ahmad' })).toBeInTheDocument()
    expect(within(roles).queryByRole('button', { name: 'Enter as Nour' })).not.toBeInTheDocument()
  })

  it('enters as Ahmad on his student home', async () => {
    const user = userEvent.setup()
    renderApp('/')
    await user.click(await screen.findByRole('radio', { name: 'Ahmad · Beta · waiting on results' }))
    await user.click(screen.getByRole('button', { name: 'Enter as Ahmad' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Team Beta' }, { timeout: 5000 })).toBeInTheDocument()
  })
})

describe('P11 before release (Ahmad, Team Beta)', () => {
  it('shows two results out and no final grade yet', async () => {
    renderApp('/student', 'ahmad')
    const card = await screen.findByRole('region', { name: 'Final grade' }, { timeout: 5000 })
    expect(card).toHaveTextContent('Your final grade appears once all five results are released.')
    expect(card).toHaveTextContent('2 of 5')
  })

  it('matches the seed: proposal and progress released only', () => {
    const v = studentHomeView(createSeedState(), 's-ahmad')
    expect(v.releasedCount).toBe(2)
    expect(v.final).toBeNull()
  })
})

describe('Role switcher', () => {
  it('lists both students', async () => {
    const user = userEvent.setup()
    renderApp('/student', 'nour')
    await user.click(await screen.findByRole('button', { name: 'Switch role' }))
    const panel = await screen.findByRole('dialog', { name: 'Switch role' })
    expect(within(panel).getByRole('button', { name: /Nour Khoury/ })).toHaveTextContent('all results out')
    expect(within(panel).getByRole('button', { name: /Ahmad Fares/ })).toHaveTextContent('waiting on results')
  })
})

describe('P6 students', () => {
  it('offers no remove button for a student persona, and keeps it for the others', async () => {
    renderApp('/teams/t-alpha', 'rania')
    expect(await screen.findByRole('button', { name: 'Remove Maya Aoun from Team Alpha' }, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove Nour Khoury from Team Alpha' })).not.toBeInTheDocument()
    expect(screen.getByText('Demo persona')).toBeInTheDocument()
  })
})
