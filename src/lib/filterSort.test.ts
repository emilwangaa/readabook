import { describe, expect, it } from 'vitest'
import type { Book } from '../types.ts'
import { filterAndSort } from './filterSort.ts'

const book = (id: string, title: string, author: string, finishedOn: string, rating: number): Book => ({
  id,
  title,
  author,
  finishedOn,
  rating,
  createdAt: '2026-01-01T00:00:00.000Z',
})

const books = [
  book('1', 'Dune', 'Frank Herbert', '2026-03-01', 5),
  book('2', 'Emma', 'Jane Austen', '2025-12-24', 3.5),
  book('3', 'Persuasion', 'Jane Austen', '2026-07-15', 4),
]

const ids = (list: Book[]) => list.map((b) => b.id)

describe('filterAndSort', () => {
  it('matches title or author case-insensitively', () => {
    expect(ids(filterAndSort(books, 'JANE', 'title'))).toEqual(['2', '3'])
    expect(ids(filterAndSort(books, 'dun', 'title'))).toEqual(['1'])
  })

  it('returns everything for a blank query', () => {
    expect(filterAndSort(books, '  ', 'title')).toHaveLength(3)
  })

  it('sorts by finish date', () => {
    expect(ids(filterAndSort(books, '', 'finished-desc'))).toEqual(['3', '1', '2'])
    expect(ids(filterAndSort(books, '', 'finished-asc'))).toEqual(['2', '1', '3'])
  })

  it('sorts by rating', () => {
    expect(ids(filterAndSort(books, '', 'rating-desc'))).toEqual(['1', '3', '2'])
    expect(ids(filterAndSort(books, '', 'rating-asc'))).toEqual(['2', '3', '1'])
  })

  it('sorts alphabetically and does not mutate the input', () => {
    const copy = [...books]
    expect(ids(filterAndSort(books, '', 'title'))).toEqual(['1', '2', '3'])
    expect(ids(filterAndSort(books, '', 'author'))).toEqual(['1', '2', '3'])
    expect(books).toEqual(copy)
  })
})
