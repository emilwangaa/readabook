import { useMemo, useState } from 'react'
import { BookForm } from './components/BookForm.tsx'
import { BookList } from './components/BookList.tsx'
import { DriveSync } from './components/DriveSync.tsx'
import { MoreMenu } from './components/MoreMenu.tsx'
import { Toolbar } from './components/Toolbar.tsx'
import { driveConfigured } from './drive.ts'
import { filterAndSort, type SortKey } from './lib/filterSort.ts'
import { exportJson, parseBooks } from './storage.ts'
import type { Book, BookInput } from './types.ts'
import { useBooks } from './useBooks.ts'

type FormState = { mode: 'closed' } | { mode: 'add' } | { mode: 'edit'; book: Book }

export default function App() {
  const {
    books,
    addBook,
    updateBook,
    deleteBook,
    importBooks,
    syncStatus,
    syncError,
    connectDrive,
    disconnectDrive,
  } = useBooks()
  const [form, setForm] = useState<FormState>({ mode: 'closed' })
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('finished-desc')
  const [message, setMessage] = useState('')

  const driveState = { status: syncStatus, error: syncError, onConnect: connectDrive }

  const visible = useMemo(() => filterAndSort(books, query, sortKey), [books, query, sortKey])

  const handleSubmit = (input: BookInput) => {
    if (form.mode === 'edit') updateBook(form.book.id, input)
    else addBook(input)
    setForm({ mode: 'closed' })
  }

  const handleDelete = (book: Book) => {
    if (confirm(`Delete "${book.title}"?`)) {
      deleteBook(book.id)
      if (form.mode === 'edit' && form.book.id === book.id) setForm({ mode: 'closed' })
    }
  }

  const handleImport = async (file: File) => {
    try {
      const imported = parseBooks(await file.text())
      importBooks(imported)
      setMessage(`Imported ${imported.length} ${imported.length === 1 ? 'book' : 'books'}.`)
    } catch (err) {
      setMessage(err instanceof Error ? `Import failed: ${err.message}` : 'Import failed.')
    }
  }

  return (
    <main>
      <header>
        <h1>📚 Read a Book</h1>
        <div className="header-actions">
          {driveConfigured && <DriveSync {...driveState} />}
          <MoreMenu
            onExport={() => exportJson(books)}
            exportDisabled={books.length === 0}
            onImportFile={handleImport}
            drive={driveConfigured ? { ...driveState, onDisconnect: disconnectDrive } : undefined}
          />
          {form.mode === 'closed' && (
            <button type="button" className="primary" onClick={() => setForm({ mode: 'add' })}>
              + Add<span className="hide-narrow"> book</span>
            </button>
          )}
        </div>
      </header>

      {form.mode !== 'closed' && (
        <BookForm
          key={form.mode === 'edit' ? form.book.id : 'new'}
          book={form.mode === 'edit' ? form.book : undefined}
          onSubmit={handleSubmit}
          onCancel={() => setForm({ mode: 'closed' })}
        />
      )}

      <Toolbar
        query={query}
        onQueryChange={setQuery}
        sortKey={sortKey}
        onSortChange={setSortKey}
      />
      {message && (
        <p className="message" role="status">
          {message}
        </p>
      )}

      <p className="count">
        {query ? `${visible.length} of ${books.length}` : books.length}{' '}
        {books.length === 1 ? 'book' : 'books'}
      </p>

      {books.length === 0 ? (
        <p className="empty">No books yet. Add the first one you've finished!</p>
      ) : visible.length === 0 ? (
        <p className="empty">No books match "{query}".</p>
      ) : (
        <BookList
          books={visible}
          onEdit={(book) => setForm({ mode: 'edit', book })}
          onDelete={handleDelete}
        />
      )}
    </main>
  )
}
