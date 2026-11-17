import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '@/mocks/node'
import { renderApp } from '@/test/render'

// Found in integration testing against the real stack.

describe('P5 overview without notification-service', () => {
  it('still shows the grid when the activity feed is down, and says the feed is unavailable', async () => {
    server.use(http.get('*/api/activity', () => HttpResponse.json({ status: 503, code: 'service-unavailable', detail: 'Down' }, { status: 503 })))
    renderApp('/overview', 'rania')
    expect(await screen.findByRole('table', { name: /Each cell is the team's grade/ }, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByText(/The activity feed isn't available right now/)).toBeInTheDocument()
    expect(screen.queryByText("The grade grid didn't load.")).not.toBeInTheDocument()
  })
})
