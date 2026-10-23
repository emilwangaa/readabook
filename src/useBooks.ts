import { useCallback, useEffect, useRef, useState } from 'react'
import {
  cachedToken,
  download,
  DriveError,
  findFile,
  getVersion,
  loadDriveState,
  requestToken,
  saveDriveState,
  signOut,
  upload,
  type DriveState,
} from './drive.ts'
import { newId } from './lib/id.ts'
import { matchesBase, snapshot, threeWayMerge } from './lib/merge.ts'
import { loadBooks, mergeBooks, saveBooks } from './storage.ts'
import type { Book, BookInput } from './types.ts'

/** 'signin' means Drive is connected but the access token expired, so a click is needed. */
export type SyncStatus = 'off' | 'signin' | 'syncing' | 'synced' | 'error'

const UPLOAD_DELAY_MS = 1500

export function useBooks() {
  const [books, setBooks] = useState<Book[]>(loadBooks)
  const [savedDrive] = useState(loadDriveState)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(savedDrive ? 'signin' : 'off')
  const [syncError, setSyncError] = useState('')

  // The latest list, so async sync work never merges against a stale render.
  const booksRef = useRef(books)
  // Set once Drive is connected: the file id and the list as it was at the last sync.
  const drive = useRef<DriveState | null>(savedDrive)
  const statusRef = useRef(syncStatus)
  const busy = useRef(false)
  // Bumped on disconnect so a sync already in flight drops its results instead of reconnecting.
  const generation = useRef(0)

  useEffect(() => {
    booksRef.current = books
    saveBooks(books)
  }, [books])

  const setStatus = useCallback((status: SyncStatus) => {
    statusRef.current = status
    setSyncStatus(status)
  }, [])

  /** Merges Drive's copy with the local list, and writes the result back if Drive differs. */
  const run = useCallback(
    async (getToken: () => Promise<string>) => {
      if (busy.current) return
      busy.current = true
      const epoch = generation.current
      const stale = () => generation.current !== epoch
      setStatus('syncing')
      try {
        const token = await getToken()
        if (stale()) return
        const state = drive.current ?? {}

        let remote: { fileId: string; version: string } | undefined
        if (state.fileId) {
          const version = await getVersion(token, state.fileId)
          if (version) remote = { fileId: state.fileId, version }
        }
        // The remembered file may have been deleted or trashed in Drive; fall back to the oldest one.
        remote ??= await findFile(token)
        if (stale()) return

        const local = booksRef.current
        let remoteBooks: Book[] = []
        let merged = local
        if (remote) {
          remoteBooks = await download(token, remote.fileId)
          if (stale()) return
          const base = remote.fileId === state.fileId ? (state.base ?? null) : null
          merged = threeWayMerge(base, local, remoteBooks)
        }

        let fileId = remote?.fileId
        if (!remote || !matchesBase(merged, snapshot(remoteBooks))) {
          // Re-check the version so a write from another device during our merge isn't clobbered.
          if (remote && (await getVersion(token, remote.fileId)) !== remote.version) {
            throw new Error('Drive changed while syncing. Try again.')
          }
          if (stale()) return
          fileId = (await upload(token, merged, fileId)).fileId
        }
        if (stale()) return

        const next: DriveState = { fileId, base: snapshot(merged) }
        drive.current = next
        saveDriveState(next)
        // Edits made while syncing are merged against what we started from, so they survive.
        setBooks((prev) => (prev === local ? merged : threeWayMerge(snapshot(local), prev, merged)))
        setSyncError('')
        setStatus('synced')
      } catch (err) {
        if (stale()) return
        if (err instanceof DriveError && err.status === 401) {
          setStatus('signin')
        } else {
          setSyncError(err instanceof Error ? err.message : 'Sync failed.')
          setStatus('error')
        }
      } finally {
        if (generation.current === epoch) busy.current = false
      }
    },
    [setStatus],
  )

  /** Syncs with the token we already have; if it expired, asks the user to sign in again. */
  const syncQuietly = useCallback(() => {
    const token = cachedToken()
    if (!token) return setStatus('signin')
    void run(async () => token)
  }, [run, setStatus])

  // A fresh connection lets the user pick an account; a returning one reuses the same account.
  const connectDrive = useCallback(
    () => run(() => requestToken(drive.current?.fileId ? '' : 'select_account')),
    [run],
  )

  const disconnectDrive = useCallback(() => {
    generation.current++
    busy.current = false
    drive.current = null
    saveDriveState(null)
    signOut()
    setSyncError('')
    setStatus('off')
  }, [setStatus])

  // Pull other devices' changes whenever the tab regains focus.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && statusRef.current === 'synced') syncQuietly()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [syncQuietly])

  // Push local edits to Drive shortly after they stop.
  useEffect(() => {
    // After an error the user retries by hand, so a failing sync can't loop.
    if (syncStatus !== 'synced') return
    const base = drive.current?.base
    if (base && matchesBase(books, base)) return
    const timer = setTimeout(syncQuietly, UPLOAD_DELAY_MS)
    return () => clearTimeout(timer)
  }, [books, syncStatus, syncQuietly])

  const addBook = useCallback((input: BookInput) => {
    const book: Book = { ...input, id: newId(), createdAt: new Date().toISOString() }
    setBooks((prev) => [...prev, book])
  }, [])

  const updateBook = useCallback((id: string, input: BookInput) => {
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, ...input } : b)))
  }, [])

  const deleteBook = useCallback((id: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== id))
  }, [])

  const importBooks = useCallback((imported: Book[]) => {
    setBooks((prev) => mergeBooks(prev, imported))
  }, [])

  return {
    books,
    addBook,
    updateBook,
    deleteBook,
    importBooks,
    syncStatus,
    syncError,
    connectDrive,
    disconnectDrive,
  }
}
