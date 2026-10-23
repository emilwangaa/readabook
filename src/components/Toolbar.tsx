import { useRef } from 'react'
import { SORT_OPTIONS, type SortKey } from '../lib/filterSort.ts'

interface Props {
  query: string
  onQueryChange: (query: string) => void
  sortKey: SortKey
  onSortChange: (key: SortKey) => void
  onExport: () => void
  onImportFile: (file: File) => void
  exportDisabled: boolean
}

export function Toolbar({
  query,
  onQueryChange,
  sortKey,
  onSortChange,
  onExport,
  onImportFile,
  exportDisabled,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null)

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
        Sort by
        <select value={sortKey} onChange={(e) => onSortChange(e.target.value as SortKey)}>
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <button type="button" onClick={onExport} disabled={exportDisabled}>
        Export
      </button>
      <button type="button" onClick={() => fileInput.current?.click()}>
        Import
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onImportFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
