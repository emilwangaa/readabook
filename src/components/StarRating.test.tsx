import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StarRating } from './StarRating.tsx'

describe('StarRating', () => {
  it('describes a read-only rating for assistive tech', () => {
    render(<StarRating value={3.5} />)
    expect(screen.getByRole('img', { name: 'Rating: 3.5 stars' })).toBeTruthy()
  })

  it('reports half and whole star clicks', () => {
    const onChange = vi.fn()
    render(<StarRating value={0} onChange={onChange} />)
    fireEvent.click(screen.getByTestId('star-2.5'))
    fireEvent.click(screen.getByTestId('star-4'))
    expect(onChange.mock.calls).toEqual([[2.5], [4]])
  })

  it('supports keyboard steps within 0–5', () => {
    const onChange = vi.fn()
    render(<StarRating value={5} onChange={onChange} />)
    const slider = screen.getByRole('slider')
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    expect(onChange.mock.calls).toEqual([[5], [4.5]])
  })

  it('clears the rating', () => {
    const onChange = vi.fn()
    render(<StarRating value={3} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onChange).toHaveBeenCalledWith(0)
  })
})
