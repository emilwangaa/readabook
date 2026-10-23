import { afterEach, describe, expect, it, vi } from 'vitest'
import { download, findFile, getVersion, upload } from './drive.ts'
import type { Book } from './types.ts'

const sample: Book = {
  id: 'a',
  title: 'Dune',
  author: 'Frank Herbert',
  finishedOn: '2026-03-01',
  rating: 4.5,
  createdAt: '2026-03-01T10:00:00.000Z',
}

function mockFetch(...responses: Response[]) {
  const fetchMock = vi.fn()
  for (const r of responses) fetchMock.mockResolvedValueOnce(r)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

afterEach(() => vi.unstubAllGlobals())

describe('drive', () => {
  it('finds the oldest reading log by name, or returns undefined', async () => {
    const fetchMock = mockFetch(
      json({ files: [{ id: 'f1', version: '3' }] }),
      json({ files: [] }),
    )
    expect(await findFile('tok')).toEqual({ fileId: 'f1', version: '3' })
    expect(await findFile('tok')).toBeUndefined()
    const [url, init] = fetchMock.mock.calls[0]
    expect(decodeURIComponent(url as string)).toContain("name='readabook.json'")
    expect(url).toContain('orderBy=createdTime')
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer tok' })
  })

  it('downloads and validates books', async () => {
    mockFetch(new Response(JSON.stringify([sample])), new Response('{"not":"a list"}'))
    expect(await download('tok', 'f1')).toEqual([sample])
    await expect(download('tok', 'f1')).rejects.toThrow()
  })

  it('reads the file version, or undefined when it is gone or trashed', async () => {
    mockFetch(json({ version: '7' }), json({}, 404), json({ version: '8', trashed: true }), json({}, 500))
    expect(await getVersion('tok', 'f1')).toBe('7')
    expect(await getVersion('tok', 'f1')).toBeUndefined()
    expect(await getVersion('tok', 'f1')).toBeUndefined()
    await expect(getVersion('tok', 'f1')).rejects.toThrow('500')
  })

  it('creates the file with a multipart upload when there is no file id', async () => {
    const fetchMock = mockFetch(json({ id: 'new', version: '1' }))
    expect(await upload('tok', [sample])).toEqual({ fileId: 'new', version: '1' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('uploadType=multipart')
    expect((init as RequestInit).method).toBe('POST')
    expect((init as RequestInit).body).toContain('"name":"readabook.json"')
    expect((init as RequestInit).body).toContain('"Dune"')
  })

  it('overwrites an existing file with PATCH', async () => {
    const fetchMock = mockFetch(json({ id: 'f1', version: '4' }))
    expect(await upload('tok', [sample], 'f1')).toEqual({ fileId: 'f1', version: '4' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/upload/drive/v3/files/f1')
    expect((init as RequestInit).method).toBe('PATCH')
  })

  it('throws on a failed request', async () => {
    mockFetch(json({}, 403))
    await expect(findFile('tok')).rejects.toThrow('403')
  })
})
