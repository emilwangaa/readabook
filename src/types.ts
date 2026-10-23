export interface Book {
  id: string
  title: string
  author: string
  /** ISO date, YYYY-MM-DD */
  finishedOn: string
  /** 0–5 in steps of 0.5 */
  rating: number
  notes?: string
  createdAt: string
}

export type BookInput = Omit<Book, 'id' | 'createdAt'>
