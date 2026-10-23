import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CORRUPT_KEY, loadBooks, mergeBooks, parseBooks, saveBooks, STORAGE_KEY } from './storage.ts'
import type { Book } from './types.ts'

const sample: Book = {
  id: 'a',
  title: 'Dune',
  author: 'Frank Herbert',
  finishedOn: '2026-03-01',
  rating: 4.5,
  notes: 'Spice.',
  createdAt: '2026-03-01T10:00:00.000Z',
}

// Node 25 ships its own (incomplete) global localStorage that shadows jsdom's, so use a stub.
beforeEach(() => {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
  })
})

describe('storage', () => {
  it('round-trips books through localStorage', () => {
    saveBooks([sample])
    expect(loadBooks()).toEqual([sample])
  })

  it('returns an empty list when nothing is stored or data is corrupt', () => {
    expect(loadBooks()).toEqual([])
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(loadBooks()).toEqual([])
  })

  it('keeps valid books and backs up the original when some entries are invalid', () => {
    const raw = JSON.stringify([sample, { ...sample, id: 'bad', rating: 3.3 }])
    localStorage.setItem(STORAGE_KEY, raw)
    expect(loadBooks()).toEqual([sample])
    expect(localStorage.getItem(CORRUPT_KEY)).toBe(raw)
  })

  it('backs up unparseable data instead of losing it', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(loadBooks()).toEqual([])
    expect(localStorage.getItem(CORRUPT_KEY)).toBe('{not json')
  })

  it('rejects invalid books on parse', () => {
    expect(() => parseBooks(JSON.stringify([{ ...sample, rating: 6 }]))).toThrow()
    expect(() => parseBooks(JSON.stringify([{ ...sample, rating: 3.3 }]))).toThrow()
    expect(() => parseBooks(JSON.stringify([{ ...sample, finishedOn: 'yesterday' }]))).toThrow()
    expect(() => parseBooks(JSON.stringify({ not: 'a list' }))).toThrow()
  })

  it('merges by id, preferring imported books', () => {
    const other = { ...sample, id: 'b', title: 'Emma' }
    const updated = { ...sample, rating: 1 }
    const merged = mergeBooks([sample], [updated, other])
    expect(merged).toHaveLength(2)
    expect(merged.find((b) => b.id === 'a')?.rating).toBe(1)
  })
})
