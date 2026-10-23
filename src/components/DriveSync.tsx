import { useEffect } from 'react'
import { preloadGoogle } from '../drive.ts'
import type { SyncStatus } from '../useBooks.ts'

export interface DriveState {
  status: SyncStatus
  error: string
  onConnect: () => void
}

const LABELS: Record<SyncStatus, string> = {
  off: '☁ Sync with Drive',
  signin: '☁ Sign in',
  syncing: '☁ Syncing…',
  synced: '☁ Synced',
  error: '⚠ Sync failed',
}

export function DriveSync({ status, error, onConnect }: DriveState) {
  // Load Google's script ahead of the click: the sign-in popup has to open right after it.
  useEffect(() => {
    preloadGoogle().catch(() => {
      // Retried when the user clicks; the click then reports the failure.
    })
  }, [])

  const clickable = status === 'off' || status === 'signin' || status === 'error'
  const title =
    status === 'error'
      ? `Sync failed: ${error}. Click to retry.`
      : status === 'signin'
        ? 'Sign in to resume syncing with Google Drive.'
        : status === 'off'
          ? 'Keep your list in your own Drive and share it across devices.'
          : undefined

  const className = `sync-chip sync-${status}`

  return (
    <span role="status">
      {clickable ? (
        <button type="button" className={className} title={title} onClick={onConnect}>
          {LABELS[status]}
        </button>
      ) : (
        <span className={className}>{LABELS[status]}</span>
      )}
    </span>
  )
}
