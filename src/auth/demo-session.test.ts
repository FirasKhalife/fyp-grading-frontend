import { afterEach, describe, expect, it, vi } from 'vitest'
import { uuid } from './demo-session'

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

afterEach(() => vi.restoreAllMocks())

describe('demo session id', () => {
  it('is a v4 UUID', () => {
    expect(uuid()).toMatch(V4)
  })

  it('uses getRandomValues, never Math.random, when randomUUID is unavailable (plain HTTP)', () => {
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
      throw new Error('randomUUID needs a secure context')
    })
    vi.stubGlobal('isSecureContext', false)
    const random = vi.spyOn(Math, 'random')
    const values = vi.spyOn(crypto, 'getRandomValues')
    const ids = new Set(Array.from({ length: 50 }, () => uuid()))
    expect(ids.size).toBe(50)
    for (const id of ids) expect(id).toMatch(V4)
    expect(values).toHaveBeenCalled()
    expect(random).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
