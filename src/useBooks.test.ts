import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY } from './storage.ts'
import type { Book } from './types.ts'
import { useBooks } from './useBooks.ts'

// An in-memory stand-in for Google Drive and the sign-in state.
const fake = vi.hoisted(() => ({
  token: null as string | null,
  saved: null as unknown,
  remote: null as { id: string; version: number; books: unknown[] } | null,
}))

vi.mock('./drive.ts', () => ({
  DriveError: class extends Error {
    status: number
    constructor(status: number) {
      super(`HTTP ${status}`)
      this.status = status
    }
  },
  cachedToken: () => fake.token,
  requestToken: async () => (fake.token = 'tok'),
  signOut: () => void (fake.token = null),
  loadDriveState: () => fake.saved,
  saveDriveState: (state: unknown) => void (fake.saved = state),
  findFile: async () => fake.remote && { fileId: fake.remote.id, version: String(fake.remote.version) },
  getVersion: async (_: string, id: string) =>
    fake.remote?.id === id ? String(fake.remote.version) : undefined,
  download: async () => structuredClone(fake.remote?.books ?? []),
  upload: async (_: string, books: unknown[], id?: string) => {
    fake.remote = { id: id ?? 'file1', version: (fake.remote?.version ?? 0) + 1, books: structuredClone(books) }
    return { fileId: fake.remote.id, version: String(fake.remote.version) }
  },
}))

const book = (id: string, title = id): Book => ({
  id,
  title,
  author: 'Someone',
  finishedOn: '2026-03-01',
  rating: 3,
  createdAt: '2026-03-01T10:00:00.000Z',
})

const ids = (books: Book[]) => books.map((b) => b.id).sort()
const remoteIds = () => ids((fake.remote?.books ?? []) as Book[])

/** Lets pending promises and timers (the push debounce) run. */
const settle = (ms = 0) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)))
const refocus = () => act(async () => void document.dispatchEvent(new Event('visibilitychange')))

function setup(initial: Book[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
  return renderHook(() => useBooks())
}

beforeEach(() => {
  vi.useFakeTimers()
  fake.token = null
  fake.saved = null
  fake.remote = null
  // Node 25 ships its own (incomplete) global localStorage that shadows jsdom's, so use a stub.
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  })
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useBooks Drive sync', () => {
  it('stays off and offline-only until connected', () => {
    const { result } = setup([book('a')])
    expect(result.current.syncStatus).toBe('off')
    expect(fake.remote).toBeNull()
  })

  it('uploads the local list when connecting for the first time', async () => {
    const { result } = setup([book('a'), book('b')])
    await act(() => result.current.connectDrive())
    expect(result.current.syncStatus).toBe('synced')
    expect(remoteIds()).toEqual(['a', 'b'])
  })

  it('merges an existing Drive file with the local list on first connect', async () => {
    fake.remote = { id: 'file1', version: 1, books: [book('c')] }
    const { result } = setup([book('a')])
    await act(() => result.current.connectDrive())
    expect(ids(result.current.books)).toEqual(['a', 'c'])
    expect(remoteIds()).toEqual(['a', 'c'])
  })

  it('syncs a deletion instead of restoring the book from Drive', async () => {
    const { result } = setup([book('a'), book('b')])
    await act(() => result.current.connectDrive())

    act(() => result.current.deleteBook('b'))
    await settle(2000)

    expect(ids(result.current.books)).toEqual(['a'])
    expect(remoteIds()).toEqual(['a'])
  })

  it('pulls changes made on another device when the tab regains focus', async () => {
    const { result } = setup([book('a')])
    await act(() => result.current.connectDrive())

    fake.remote = { id: 'file1', version: 9, books: [book('a'), book('c')] }
    await refocus()
    await settle()

    expect(ids(result.current.books)).toEqual(['a', 'c'])
  })

  it('stops syncing after disconnect, even on refocus', async () => {
    const { result } = setup([book('a')])
    await act(() => result.current.connectDrive())

    act(() => result.current.disconnectDrive())
    fake.remote = { id: 'file1', version: 9, books: [book('a'), book('c')] }
    await refocus()
    await settle()

    expect(result.current.syncStatus).toBe('off')
    expect(ids(result.current.books)).toEqual(['a'])
    expect(fake.saved).toBeNull()
  })

  it('recreates the file if it was deleted from Drive', async () => {
    const { result } = setup([book('a')])
    await act(() => result.current.connectDrive())

    fake.remote = null
    await refocus()
    await settle()

    expect(result.current.syncStatus).toBe('synced')
    expect(remoteIds()).toEqual(['a'])
  })

  it('asks the user to sign in again once the token has expired', async () => {
    const { result } = setup([book('a')])
    await act(() => result.current.connectDrive())

    fake.token = null
    await refocus()

    expect(result.current.syncStatus).toBe('signin')
  })

  it('starts in the sign-in state when a connection was saved', () => {
    fake.saved = { fileId: 'file1', base: {} }
    const { result } = setup([book('a')])
    expect(result.current.syncStatus).toBe('signin')
  })
})
