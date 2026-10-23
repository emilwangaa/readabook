import { afterEach, describe, expect, it, vi } from 'vitest'
import { newId } from './id.ts'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

afterEach(() => vi.unstubAllGlobals())

describe('newId', () => {
  it('returns a v4 UUID', () => {
    expect(newId()).toMatch(uuid)
  })

  it('falls back when randomUUID is unavailable (insecure context)', () => {
    vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) })
    const a = newId()
    expect(a).toMatch(uuid)
    expect(newId()).not.toBe(a)
  })
})
