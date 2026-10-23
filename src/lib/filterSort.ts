import type { Book } from '../types.ts'

export type SortKey =
  | 'finished-desc'
  | 'finished-asc'
  | 'rating-desc'
  | 'rating-asc'
  | 'title'
  | 'author'

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'finished-desc', label: 'Finished (newest)' },
  { value: 'finished-asc', label: 'Finished (oldest)' },
  { value: 'rating-desc', label: 'Rating (highest)' },
  { value: 'rating-asc', label: 'Rating (lowest)' },
  { value: 'title', label: 'Title (A–Z)' },
  { value: 'author', label: 'Author (A–Z)' },
]

const text = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' })

const comparators: Record<SortKey, (a: Book, b: Book) => number> = {
  'finished-desc': (a, b) => b.finishedOn.localeCompare(a.finishedOn),
  'finished-asc': (a, b) => a.finishedOn.localeCompare(b.finishedOn),
  'rating-desc': (a, b) => b.rating - a.rating,
  'rating-asc': (a, b) => a.rating - b.rating,
  title: (a, b) => text(a.title, b.title),
  author: (a, b) => text(a.author, b.author),
}

export function filterAndSort(books: Book[], query: string, sortKey: SortKey): Book[] {
  const q = query.trim().toLowerCase()
  const filtered = q
    ? books.filter(
        (b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q),
      )
    : books
  return [...filtered].sort(comparators[sortKey])
}
