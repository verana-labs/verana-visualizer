import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { FetchError, fetchJson } from './fetch-json'

const url = 'https://idx.testnet.verana.network/v4/indexer/block-height'

function stubFetch(response: Response | Error) {
  const mock = vi.fn(async () => {
    if (response instanceof Error) throw response
    return response
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

afterEach(() => vi.unstubAllGlobals())

describe('fetchJson', () => {
  it('returns parsed data', async () => {
    stubFetch(Response.json({ height: 7 }))
    await expect(fetchJson(url, undefined, z.object({ height: z.number() }))).resolves.toEqual({ height: 7 })
  })

  it('throws a FetchError carrying status and url on a non-2xx response', async () => {
    stubFetch(new Response('down', { status: 503 }))
    const error = await fetchJson(url, undefined, z.unknown()).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(FetchError)
    const fetchError = error as FetchError
    expect(fetchError.status).toBe(503)
    expect(fetchError.url).toBe(url)
    expect(fetchError.body).toBe('down')
    expect(fetchError.message).toContain(url)
    expect(fetchError.message).toContain('503')
    expect(fetchError.message).toContain('GET')
  })

  it('wraps network failures with the cause', async () => {
    stubFetch(new TypeError('fetch failed'))
    const error = await fetchJson(url, { method: 'POST' }, z.unknown()).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(FetchError)
    expect((error as FetchError).status).toBeNull()
    expect((error as FetchError).message).toContain('POST')
    expect((error as FetchError).message).toContain(url)
    expect((error as FetchError).message).toContain('fetch failed')
  })

  it('reports the parse reason and keeps the raw text when the body is not JSON', async () => {
    stubFetch(new Response('<html>oops</html>', { status: 200 }))
    const error = (await fetchJson(url, undefined, z.unknown()).catch((e: unknown) => e)) as FetchError
    expect(error).toBeInstanceOf(FetchError)
    expect(error.message).toContain('not valid JSON')
    expect(error.body).toBe('<html>oops</html>')
  })

  it('throws on a zod mismatch naming the field path and the url', async () => {
    stubFetch(Response.json({ ecosystems: [{ id: 'one' }] }))
    const schema = z.object({ ecosystems: z.array(z.object({ id: z.number() })) })
    const error = await fetchJson(url, undefined, schema).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(FetchError)
    expect((error as FetchError).message).toContain('ecosystems.0.id')
    expect((error as FetchError).message).toContain(url)
  })
})
