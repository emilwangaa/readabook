import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DriveSync } from './DriveSync.tsx'
import { MoreMenu } from './MoreMenu.tsx'

vi.mock('../drive.ts', () => ({ preloadGoogle: () => Promise.resolve() }))

afterEach(cleanup)

const baseProps = { onExport: vi.fn(), exportDisabled: false, onImportFile: vi.fn() }
const openMenu = () => fireEvent.click(screen.getByRole('button', { name: 'More options' }))

describe('MoreMenu', () => {
  it('opens, and closes on Escape and outside click', () => {
    render(<MoreMenu {...baseProps} />)
    expect(screen.queryByText('Export backup (.json)')).toBeNull()
    openMenu()
    expect(screen.getByText('Export backup (.json)')).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByText('Export backup (.json)')).toBeNull()
    openMenu()
    fireEvent.pointerDown(document.body)
    expect(screen.queryByText('Export backup (.json)')).toBeNull()
  })

  it('exports and closes', () => {
    const onExport = vi.fn()
    render(<MoreMenu {...baseProps} onExport={onExport} />)
    openMenu()
    fireEvent.click(screen.getByText('Export backup (.json)'))
    expect(onExport).toHaveBeenCalledOnce()
    expect(screen.queryByText('Export backup (.json)')).toBeNull()
  })

  it('disables export when there is nothing to export', () => {
    render(<MoreMenu {...baseProps} exportDisabled />)
    openMenu()
    const button = screen.getByText('Export backup (.json)') as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('passes the chosen file to onImportFile', () => {
    const onImportFile = vi.fn()
    const { container } = render(<MoreMenu {...baseProps} onImportFile={onImportFile} />)
    const file = new File(['[]'], 'books.json', { type: 'application/json' })
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } })
    expect(onImportFile).toHaveBeenCalledWith(file)
  })

  it('offers Drive connect or disconnect by status', () => {
    const onConnect = vi.fn()
    const onDisconnect = vi.fn()
    const drive = { status: 'off' as const, error: '', onConnect, onDisconnect }
    const { rerender } = render(<MoreMenu {...baseProps} drive={drive} />)
    openMenu()
    fireEvent.click(screen.getByText('Connect Google Drive'))
    expect(onConnect).toHaveBeenCalledOnce()

    rerender(<MoreMenu {...baseProps} drive={{ ...drive, status: 'synced' }} />)
    openMenu()
    fireEvent.click(screen.getByText('Disconnect Drive'))
    expect(onDisconnect).toHaveBeenCalledOnce()
  })
})

describe('DriveSync chip', () => {
  it('is a button that connects when off, signed out, or failed', () => {
    const onConnect = vi.fn()
    for (const status of ['off', 'signin', 'error'] as const) {
      const { unmount } = render(<DriveSync status={status} error="boom" onConnect={onConnect} />)
      fireEvent.click(screen.getByRole('button'))
      unmount()
    }
    expect(onConnect).toHaveBeenCalledTimes(3)
  })

  it('is plain status text while syncing or synced', () => {
    const { rerender } = render(<DriveSync status="syncing" error="" onConnect={vi.fn()} />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByRole('status').textContent).toContain('Syncing')
    rerender(<DriveSync status="synced" error="" onConnect={vi.fn()} />)
    expect(screen.getByRole('status').textContent).toContain('Synced')
  })
})
