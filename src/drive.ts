import type { Base } from './lib/merge.ts'
import { parseBooks, serializeBooks } from './storage.ts'
import type { Book } from './types.ts'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const SCOPE = 'https://www.googleapis.com/auth/drive.file'
const FILE_NAME = 'readabook.json'
const API = 'https://www.googleapis.com'
const GIS_SRC = 'https://accounts.google.com/gsi/client'

export const DRIVE_STATE_KEY = 'readabook.drive.v1'
const TOKEN_KEY = 'readabook.drive.token.v1'

/** True when the build was given a Google OAuth client ID. */
export const driveConfigured = Boolean(CLIENT_ID)

export interface DriveState {
  fileId?: string
  /** The list as last synced, so the next sync can tell which side added, edited or deleted. */
  base?: Base
}

/** A failed Drive request; `status` is the HTTP status. */
export class DriveError extends Error {
  status: number
  constructor(status: number) {
    super(`Google Drive request failed (${status}).`)
    this.status = status
  }
}

interface TokenResponse {
  access_token?: string
  expires_in?: string | number
  error?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string
            scope: string
            callback: (response: TokenResponse) => void
            error_callback?: (error: { type: string }) => void
          }): { requestAccessToken(overrides?: { prompt?: string }): void }
          revoke(token: string, done: () => void): void
        }
      }
    }
  }
}

export function loadDriveState(): DriveState | null {
  try {
    const raw = localStorage.getItem(DRIVE_STATE_KEY)
    return raw ? (JSON.parse(raw) as DriveState) : null
  } catch {
    return null
  }
}

export function saveDriveState(state: DriveState | null): void {
  try {
    if (state) localStorage.setItem(DRIVE_STATE_KEY, JSON.stringify(state))
    else localStorage.removeItem(DRIVE_STATE_KEY)
  } catch {
    // Without storage we just can't remember the connection between visits.
  }
}

type Google = NonNullable<Window['google']>

let googleLoad: Promise<Google> | null = null

/**
 * Loads Google Identity Services on demand, so visitors who never use Drive don't contact Google.
 * Call it early (it is cheap): the sign-in popup must open right after a click, with no wait.
 */
export function preloadGoogle(): Promise<Google> {
  if (googleLoad) return googleLoad
  const load = new Promise<Google>((resolve, reject) => {
    if (window.google) return resolve(window.google)
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.onload = () => (window.google ? resolve(window.google) : reject(new Error('Google sign-in did not load.')))
    script.onerror = () => reject(new Error('Could not load Google sign-in.'))
    document.head.append(script)
  })
  googleLoad = load
  load.catch(() => {
    googleLoad = null // allow a retry
  })
  return load
}

type Token = { value: string; expiresAt: number }

/** Restores the token saved before a refresh; it is only used while it hasn't expired. */
function loadToken(): Token | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    const saved = raw ? (JSON.parse(raw) as Partial<Token>) : null
    return saved && typeof saved.value === 'string' && typeof saved.expiresAt === 'number'
      ? { value: saved.value, expiresAt: saved.expiresAt }
      : null
  } catch {
    return null
  }
}

let token: Token | null = loadToken()

/** Keeps the in-memory token and its saved copy in step, so a refresh can pick the connection back up. */
function setToken(next: Token | null): void {
  token = next
  try {
    if (next) localStorage.setItem(TOKEN_KEY, JSON.stringify(next))
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Without storage the user just signs in again after a refresh.
  }
}

/** The current access token, or null if there is none or it is about to expire. */
export function cachedToken(): string | null {
  return token && token.expiresAt - Date.now() > 60_000 ? token.value : null
}

/**
 * Asks Google for an access token, which opens a popup and so must follow a user click.
 * Use 'select_account' for a fresh connection so the user can pick which account to use.
 */
export async function requestToken(prompt: '' | 'select_account'): Promise<string> {
  if (!CLIENT_ID) throw new Error('Google Drive is not configured.')
  const google = await preloadGoogle()
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (response) => {
        if (!response.access_token) return reject(new Error('Google sign-in was not completed.'))
        const seconds = Number(response.expires_in ?? 3600)
        const next = { value: response.access_token, expiresAt: Date.now() + seconds * 1000 }
        setToken(next)
        resolve(next.value)
      },
      error_callback: () => reject(new Error('Google sign-in was cancelled or blocked.')),
    })
    client.requestAccessToken({ prompt })
  })
}

/** Forgets the token and revokes it with Google, so the next connection starts fresh. */
export function signOut(): void {
  const old = token?.value
  setToken(null)
  if (old) window.google?.accounts.oauth2.revoke(old, () => {})
}

async function request(path: string, accessToken: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${accessToken}` },
  })
  if (res.status === 401) setToken(null)
  if (!res.ok) throw new DriveError(res.status)
  return res
}

/**
 * Finds the reading log among the files this app created. If two devices created one at the
 * same time, the oldest wins, so every device settles on the same file.
 */
export async function findFile(accessToken: string): Promise<{ fileId: string; version: string } | undefined> {
  const q = encodeURIComponent(`name='${FILE_NAME}' and trashed=false`)
  const res = await request(`/drive/v3/files?q=${q}&orderBy=createdTime&fields=files(id,version)`, accessToken)
  const data = (await res.json()) as { files?: { id: string; version: string }[] }
  const file = data.files?.[0]
  return file && { fileId: file.id, version: file.version }
}

/** The file's current version, or undefined if it was deleted or trashed. */
export async function getVersion(accessToken: string, fileId: string): Promise<string | undefined> {
  try {
    const res = await request(`/drive/v3/files/${fileId}?fields=version,trashed`, accessToken)
    const file = (await res.json()) as { version: string; trashed?: boolean }
    return file.trashed ? undefined : file.version
  } catch (err) {
    if (err instanceof DriveError && err.status === 404) return undefined
    throw err
  }
}

export async function download(accessToken: string, fileId: string): Promise<Book[]> {
  const res = await request(`/drive/v3/files/${fileId}?alt=media`, accessToken)
  return parseBooks(await res.text())
}

/** Creates the file when `fileId` is missing, otherwise overwrites it. */
export async function upload(
  accessToken: string,
  books: Book[],
  fileId?: string,
): Promise<{ fileId: string; version: string }> {
  const body = serializeBooks(books)
  let res: Response
  if (fileId) {
    res = await request(`/upload/drive/v3/files/${fileId}?uploadType=media&fields=id,version`, accessToken, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
  } else {
    const boundary = `readabook-${Math.random().toString(36).slice(2)}`
    const metadata = JSON.stringify({ name: FILE_NAME, mimeType: 'application/json' })
    const multipart =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`
    res = await request('/upload/drive/v3/files?uploadType=multipart&fields=id,version', accessToken, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body: multipart,
    })
  }
  const file = (await res.json()) as { id: string; version: string }
  return { fileId: file.id, version: file.version }
}
