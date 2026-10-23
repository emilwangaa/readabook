import { useCallback, useEffect, useState } from 'react'
import { newId } from './lib/id.ts'
import { loadBooks, mergeBooks, saveBooks } from './storage.ts'
import type { Book, BookInput } from './types.ts'

export function useBooks() {
  const [books, setBooks] = useState<Book[]>(loadBooks)

  useEffect(() => saveBooks(books), [books])

  const addBook = useCallback((input: BookInput) => {
    const book: Book = { ...input, id: newId(), createdAt: new Date().toISOString() }
    setBooks((prev) => [...prev, book])
  }, [])

  const updateBook = useCallback((id: string, input: BookInput) => {
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, ...input } : b)))
  }, [])

  const deleteBook = useCallback((id: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== id))
  }, [])

  const importBooks = useCallback((imported: Book[]) => {
    setBooks((prev) => mergeBooks(prev, imported))
  }, [])

  return { books, addBook, updateBook, deleteBook, importBooks }
}
