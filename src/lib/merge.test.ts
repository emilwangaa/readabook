import { describe, expect, it } from 'vitest'
import type { Book } from '../types.ts'
import { matchesBase, snapshot, threeWayMerge } from './merge.ts'

const book = (id: string, title = id): Book => ({
  id,
  title,
  author: 'Someone',
  finishedOn: '2026-03-01',
  rating: 3,
  createdAt: '2026-03-01T10:00:00.000Z',
})

const ids = (books: Book[]) => books.map((b) => b.id).sort()

describe('threeWayMerge', () => {
  const a = book('a')
  const b = book('b')
  const base = snapshot([a, b])

  it('takes a union when there is no base', () => {
    expect(ids(threeWayMerge(null, [a], [b]))).toEqual(['a', 'b'])
  })

  it('keeps a local delete instead of restoring the book from the remote copy', () => {
    expect(ids(threeWayMerge(base, [a], [a, b]))).toEqual(['a'])
  })

  it('applies a remote delete to an untouched local book', () => {
    expect(ids(threeWayMerge(base, [a, b], [a]))).toEqual(['a'])
  })

  it('keeps a book that was edited on one side and deleted on the other', () => {
    const edited = book('b', 'Edited')
    expect(threeWayMerge(base, [a, edited], [a])).toContainEqual(edited)
    expect(threeWayMerge(base, [a], [a, edited])).toContainEqual(edited)
  })

  it('keeps books added on either side', () => {
    expect(ids(threeWayMerge(base, [a, b, book('c')], [a, b, book('d')]))).toEqual(['a', 'b', 'c', 'd'])
  })

  it('takes a remote edit when the local copy is unchanged', () => {
    const edited = book('a', 'Remote')
    expect(threeWayMerge(base, [a, b], [edited, b])).toContainEqual(edited)
  })

  it('prefers the local edit when both sides changed the same book', () => {
    const mine = book('a', 'Mine')
    const theirs = book('a', 'Theirs')
    expect(threeWayMerge(base, [mine, b], [theirs, b])).toContainEqual(mine)
  })
})

describe('matchesBase', () => {
  it('compares content regardless of order or key order', () => {
    const a = book('a')
    const b = book('b')
    expect(matchesBase([b, a], snapshot([a, b]))).toBe(true)
    expect(matchesBase([{ ...a, title: 'x' }, b], snapshot([a, b]))).toBe(false)
    expect(matchesBase([a], snapshot([a, b]))).toBe(false)
  })
})
