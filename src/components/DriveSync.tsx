import { useEffect } from 'react'
import { preloadGoogle } from '../drive.ts'
import type { SyncStatus } from '../useBooks.ts'

interface Props {
  status: SyncStatus
  error: string
  onConnect: () => void
  onDisconnect: () => void
}

export function DriveSync({ status, error, onConnect, onDisconnect }: Props) {
  // Load Google's script ahead of the click: the sign-in popup has to open right after it.
  useEffect(() => {
    preloadGoogle().catch(() => {
      // Retried when the user clicks; the click then reports the failure.
    })
  }, [])

  if (status === 'off') {
    return (
      <div className="drive-sync">
        <button type="button" onClick={onConnect}>
          Connect Google Drive
        </button>
        <span>Keep your list in your own Drive and share it across devices.</span>
      </div>
    )
  }

  return (
    <div className="drive-sync">
      {status === 'signin' && (
        <button type="button" onClick={onConnect}>
          Sign in to Google Drive
        </button>
      )}
      {status === 'error' && (
        <button type="button" onClick={onConnect}>
          Retry
        </button>
      )}
      <button type="button" onClick={onDisconnect}>
        Disconnect Drive
      </button>
      <span role="status" className={status === 'error' ? 'error' : undefined}>
        {status === 'signin' && 'Sign in to resume syncing with Google Drive.'}
        {status === 'syncing' && 'Syncing with Google Drive…'}
        {status === 'synced' && 'Synced with Google Drive'}
        {status === 'error' && `Sync failed: ${error}`}
      </span>
    </div>
  )
}
