import type { KeyboardEvent } from 'react'

interface Props {
  value: number
  /** Omit for a read-only display. */
  onChange?: (value: number) => void
  label?: string
}

const STARS = [1, 2, 3, 4, 5]

function formatRating(value: number): string {
  return `${value} ${value === 1 ? 'star' : 'stars'}`
}

export function StarRating({ value, onChange, label = 'Rating' }: Props) {
  const stars = STARS.map((n) => {
    const fill = Math.min(Math.max(value - (n - 1), 0), 1) * 100
    return (
      <span className="star" key={n}>
        <span className="star-base">★</span>
        <span className="star-fill" style={{ width: `${fill}%` }}>
          ★
        </span>
        {onChange && (
          <>
            <span
              className="star-half"
              data-testid={`star-${n - 0.5}`}
              onClick={() => onChange(n - 0.5)}
            />
            <span
              className="star-half star-half-right"
              data-testid={`star-${n}`}
              onClick={() => onChange(n)}
            />
          </>
        )}
      </span>
    )
  })

  if (!onChange) {
    return (
      <span className="stars" role="img" aria-label={`${label}: ${formatRating(value)}`}>
        {stars}
      </span>
    )
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      onChange(Math.min(value + 0.5, 5))
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      onChange(Math.max(value - 0.5, 0))
    } else if (e.key === 'Home') {
      onChange(0)
    } else if (e.key === 'End') {
      onChange(5)
    } else {
      return
    }
    e.preventDefault()
  }

  return (
    <span className="rating-input">
      <span
        className="stars stars-editable"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={value}
        aria-valuetext={formatRating(value)}
        onKeyDown={onKeyDown}
      >
        {stars}
      </span>
      <span className="rating-value">{value.toFixed(1)}</span>
      <button type="button" className="link" onClick={() => onChange(0)} disabled={value === 0}>
        Clear
      </button>
    </span>
  )
}
