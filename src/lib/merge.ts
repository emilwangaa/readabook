import { mergeBooks } from '../storage.ts'
import type { Book } from '../types.ts'

/** Maps each book id to a fingerprint of its content as of the last sync with Drive. */
export type Base = Record<string, string>

/** A short, field-order-independent hash, so the base stays small and devices agree on it. */
function fingerprint(b: Book): string {
  const text = JSON.stringify([b.id, b.title, b.author, b.finishedOn, b.rating, b.notes ?? '', b.createdAt])
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

export function snapshot(books: Book[]): Base {
  return Object.fromEntries(books.map((b) => [b.id, fingerprint(b)]))
}

/** True when the books are exactly the ones the base describes, in any order. */
export function matchesBase(books: Book[], base: Base): boolean {
  return Object.keys(base).length === books.length && books.every((b) => base[b.id] === fingerprint(b))
}

/**
 * Merges two edited copies of the list against the copy they both started from (`base`), so a
 * deletion on one side wins over an unchanged book on the other. When both sides changed the
 * same book, the local one wins. Without a base (first sync) it is a plain union.
 */
export function threeWayMerge(base: Base | null, local: Book[], remote: Book[]): Book[] {
  if (!base) return mergeBooks(remote, local)

  const remoteById = new Map(remote.map((b) => [b.id, b]))
  const localIds = new Set(local.map((b) => b.id))
  const result: Book[] = []

  for (const l of local) {
    const r = remoteById.get(l.id)
    const b = base[l.id]
    if (!r) {
      // Added locally, edited locally after a remote delete, or deleted remotely and untouched.
      if (b === undefined || fingerprint(l) !== b) result.push(l)
    } else if (fingerprint(l) === b && fingerprint(r) !== b) {
      result.push(r)
    } else {
      result.push(l)
    }
  }
  for (const r of remote) {
    if (localIds.has(r.id)) continue
    // Added remotely, or deleted locally but edited remotely; a plain local delete drops it.
    if (base[r.id] === undefined || fingerprint(r) !== base[r.id]) result.push(r)
  }
  return result
}
