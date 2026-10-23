import { SORT_OPTIONS, type SortKey } from '../lib/filterSort.ts'

interface Props {
  query: string
  onQueryChange: (query: string) => void
  sortKey: SortKey
  onSortChange: (key: SortKey) => void
}

export function Toolbar({ query, onQueryChange, sortKey, onSortChange }: Props) {
  return (
    <div className="toolbar">
      <input
        type="search"
        placeholder="Search title or author…"
        aria-label="Search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />
      <label className="inline">
        <span className="hide-narrow">Sort by</span>
        <select
          aria-label="Sort by"
          value={sortKey}
          onChange={(e) => onSortChange(e.target.value as SortKey)}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
