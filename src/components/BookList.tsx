import type { Book } from '../types.ts'
import { StarRating } from './StarRating.tsx'

interface Props {
  books: Book[]
  onEdit: (book: Book) => void
  onDelete: (book: Book) => void
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function BookList({ books, onEdit, onDelete }: Props) {
  return (
    <ul className="book-list">
      {books.map((book) => (
        <li key={book.id} className="book panel">
          <div className="book-main">
            <h3>{book.title}</h3>
            <p className="author">by {book.author}</p>
            <p className="meta">
              <StarRating value={book.rating} />
              <span>Finished {formatDate(book.finishedOn)}</span>
            </p>
            {book.notes && <p className="notes">{book.notes}</p>}
          </div>
          <div className="actions">
            <button type="button" onClick={() => onEdit(book)} aria-label={`Edit ${book.title}`}>
              Edit
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => onDelete(book)}
              aria-label={`Delete ${book.title}`}
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
