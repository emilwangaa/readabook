import { useEffect, useRef, useState } from 'react'
import type { DriveState } from './DriveSync.tsx'

interface Props {
  onExport: () => void
  exportDisabled: boolean
  onImportFile: (file: File) => void
  drive?: DriveState & { onDisconnect: () => void }
}

export function MoreMenu({ onExport, exportDisabled, onImportFile, drive }: Props) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggle.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const pick = (action: () => void) => () => {
    setOpen(false)
    toggle.current?.focus()
    action()
  }

  return (
    <div className="menu" ref={root}>
      <button
        ref={toggle}
        type="button"
        className="menu-button"
        aria-label="More options"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        ⋯
      </button>
      {open && (
        <div className="menu-popover">
          <p className="menu-heading">Backup</p>
          <button type="button" onClick={pick(onExport)} disabled={exportDisabled}>
            Export backup (.json)
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              fileInput.current?.click()
            }}
          >
            Import backup…
          </button>
          {drive && (
            <>
              <p className="menu-heading">Google Drive</p>
              {drive.status === 'off' ? (
                <>
                  <button type="button" onClick={pick(drive.onConnect)}>
                    Connect Google Drive
                  </button>
                  <p className="menu-note">
                    Keep your list in your own Drive and share it across devices.
                  </p>
                </>
              ) : (
                <>
                  {drive.status === 'error' && <p className="menu-note error">{drive.error}</p>}
                  <button type="button" onClick={pick(drive.onDisconnect)}>
                    Disconnect Drive
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
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
