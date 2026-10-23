import type { Book } from './types.ts'

export const STORAGE_KEY = 'readabook.books.v1'

const isoDate = /^\d{4}-\d{2}-\d{2}$/

function isBook(value: unknown): value is Book {
  if (typeof value !== 'object' || value === null) return false
  const b = value as Record<string, unknown>
  return (
    typeof b.id === 'string' &&
    typeof b.title === 'string' &&
    typeof b.author === 'string' &&
    typeof b.finishedOn === 'string' &&
    isoDate.test(b.finishedOn) &&
    typeof b.rating === 'number' &&
    b.rating >= 0 &&
    b.rating <= 5 &&
    Number.isInteger(b.rating * 2) &&
    (b.notes === undefined || typeof b.notes === 'string') &&
    typeof b.createdAt === 'string'
  )
}

/** Parses JSON text into books; throws if it is not a valid list of books. */
export function parseBooks(json: string): Book[] {
  const data: unknown = JSON.parse(json)
  if (!Array.isArray(data) || !data.every(isBook)) {
    throw new Error('File does not contain a valid list of books.')
  }
  return data
}

export const CORRUPT_KEY = `${STORAGE_KEY}.corrupt`

/**
 * Loads the saved books. Entries that fail validation are dropped, but the original
 * text is first copied to CORRUPT_KEY so the next save can't destroy it.
 */
export function loadBooks(): Book[] {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data)) throw new Error('not a list')
    const valid = data.filter(isBook)
    if (valid.length !== data.length) backUpCorrupt(raw)
    return valid
  } catch {
    if (raw) backUpCorrupt(raw)
    return []
  }
}

function backUpCorrupt(raw: string): void {
  try {
    localStorage.setItem(CORRUPT_KEY, raw)
  } catch {
    // Nothing more we can do if storage is unavailable.
  }
}

export function saveBooks(books: Book[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books))
  } catch {
    // Storage may be full or blocked; the in-memory list keeps working.
  }
}

/** Adds imported books to the existing ones; an imported book replaces one with the same id. */
export function mergeBooks(existing: Book[], imported: Book[]): Book[] {
  const byId = new Map(existing.map((b) => [b.id, b]))
  for (const b of imported) byId.set(b.id, b)
  return [...byId.values()]
}

/** The text form used for export files and for the copy kept in Google Drive. */
export function serializeBooks(books: Book[]): string {
  return JSON.stringify(books, null, 2)
}

export function exportJson(books: Book[]): void {
  const blob = new Blob([serializeBooks(books)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `readabook-${new Date().toISOString().slice(0, 10)}.json`
  document.body.append(a)
  a.click()
  a.remove()
  // Revoke later: some browsers start the download asynchronously.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
