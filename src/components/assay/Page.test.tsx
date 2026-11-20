import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Main } from './Page'

// A screen renders one <main> while loading (its skeleton) and another once loaded. The skip link
// focuses the first; focus must follow to the second instead of dropping to <body>.
function Screen({ loading }: { loading: boolean }) {
  return (
    <>
      <button type="button">Elsewhere</button>
      {loading ? (
        <Main key="skeleton">
          <p>Loading…</p>
        </Main>
      ) : (
        <Main key="content">
          <h1>My teams</h1>
        </Main>
      )}
    </>
  )
}

describe('Main keeps the skip link focus', () => {
  it('moves focus to the new main when the loading state is replaced', () => {
    const { rerender } = render(<Screen loading />)
    const skeleton = screen.getByRole('main')
    skeleton.focus() // what "Skip to content" does
    expect(document.activeElement).toBe(skeleton)

    rerender(<Screen loading={false} />)
    const loaded = screen.getByRole('main')
    expect(loaded).not.toBe(skeleton)
    expect(loaded).toHaveTextContent('My teams')
    expect(document.activeElement).toBe(loaded)
  })

  it('leaves focus alone when the visitor moved on', () => {
    const { rerender } = render(<Screen loading />)
    screen.getByRole('main').focus()
    screen.getByRole('button', { name: 'Elsewhere' }).focus()

    rerender(<Screen loading={false} />)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Elsewhere' }))
  })

  it('does not grab focus when the main never had it', () => {
    const { rerender } = render(<Screen loading />)
    rerender(<Screen loading={false} />)
    expect(document.activeElement).toBe(document.body)
  })
})
