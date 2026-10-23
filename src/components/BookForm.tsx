import { useState, type FormEvent } from 'react'
import type { Book, BookInput } from '../types.ts'
import { StarRating } from './StarRating.tsx'

interface Props {
  /** The book being edited; omit to add a new one. */
  book?: Book
  onSubmit: (input: BookInput) => void
  onCancel: () => void
}

function today(): string {
  return new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local time
}

export function BookForm({ book, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(book?.title ?? '')
  const [author, setAuthor] = useState(book?.author ?? '')
  const [finishedOn, setFinishedOn] = useState(book?.finishedOn ?? today())
  const [rating, setRating] = useState(book?.rating ?? 0)
  const [notes, setNotes] = useState(book?.notes ?? '')
  const [error, setError] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !author.trim()) {
      setError('Title and author are required.')
      return
    }
    if (!finishedOn) {
      setError('Please choose the date you finished the book.')
      return
    }
    if (finishedOn > today()) {
      setError('The finish date cannot be in the future.')
      return
    }
    onSubmit({
      title: title.trim(),
      author: author.trim(),
      finishedOn,
      rating,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <form className="panel book-form" onSubmit={handleSubmit}>
      <h2>{book ? 'Edit book' : 'Add a book'}</h2>
      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </label>
      <label>
        Author
        <input value={author} onChange={(e) => setAuthor(e.target.value)} />
      </label>
      <label>
        Finished reading
        <input
          type="date"
          value={finishedOn}
          max={today()}
          onChange={(e) => setFinishedOn(e.target.value)}
        />
      </label>
      <div className="field">
        <span className="field-label">Score</span>
        <StarRating value={rating} onChange={setRating} label="Score" />
      </div>
      <label>
        Notes (optional)
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        <button type="submit" className="primary">
          {book ? 'Save changes' : 'Add book'}
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
