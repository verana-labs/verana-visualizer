import { afterEach, describe, expect, it, vi } from 'vitest'
import { testnetCfg } from '@/features/trust-check/trust-fixture'
import { createIndexerClient } from './indexer'
import { proxyIndexer } from './indexer-proxy'

const INDEXER = 'https://idx.testnet.verana.network'

const request = (url: string, headers: Record<string, string> = {}) => new Request(url, { headers })

afterEach(() => vi.unstubAllGlobals())

describe('proxyIndexer', () => {
  it('forwards a v4 GET with its query and height to the configured indexer only', async () => {
    const upstream = vi.fn(async (_input: string, _init?: RequestInit) =>
      Response.json({ ecosystems: [] }, { headers: { 'content-type': 'application/json' } })
    )
    const res = await proxyIndexer(
      request('http://localhost:3110/api/indexer/v4/ecosystem/list?limit=1000&sort=-id', {
        'At-Block-Height': '7070',
        host: 'evil.example.com',
      }),
      ['v4', 'ecosystem', 'list'],
      INDEXER,
      upstream
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=60')
    expect(await res.json()).toEqual({ ecosystems: [] })
    const [url, init] = upstream.mock.calls[0]
    expect(url).toBe(`${INDEXER}/v4/ecosystem/list?limit=1000&sort=-id`)
    expect(new Headers(init?.headers).get('At-Block-Height')).toBe('7070')
    expect(init?.signal).toBeInstanceOf(AbortSignal)
  })

  it('passes the upstream status and body through', async () => {
    const upstream = vi.fn(async () => new Response('{"error":"nope"}', { status: 404 }))
    const res = await proxyIndexer(
      request('http://x/api/indexer/v4/corporation/get/9'),
      ['v4', 'corporation', 'get', '9'],
      INDEXER,
      upstream
    )
    expect(res.status).toBe(404)
    expect(await res.text()).toBe('{"error":"nope"}')
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  it.each([
    [['v3', 'ecosystem', 'list']],
    [['v4', '..', '..', 'admin']],
    [['evil.example.com', 'v4']],
    [['v4', 'a%2Fb']],
  ])('rejects %j without contacting anything', async (path) => {
    const upstream = vi.fn()
    const res = await proxyIndexer(request('http://x/api/indexer/x'), path, INDEXER, upstream)
    expect(res.status).toBe(400)
    expect(upstream).not.toHaveBeenCalled()
  })

  it.each(['0', '-5', '12.5', 'abc', '1e3', ''])('rejects At-Block-Height %j', async (height) => {
    const upstream = vi.fn()
    const res = await proxyIndexer(
      request('http://x/api/indexer/v4/indexer/changes', { 'At-Block-Height': height }),
      ['v4', 'indexer', 'changes'],
      INDEXER,
      upstream
    )
    expect(res.status).toBe(400)
    expect(upstream).not.toHaveBeenCalled()
  })
})

describe('indexer client in the browser', () => {
  it('routes height-pinned GETs through the proxy but reports the real indexer query', async () => {
    const mock = vi.fn(async (_input: string, _init?: RequestInit) => Response.json({ ecosystems: [] }))
    vi.stubGlobal('fetch', mock)
    const result = await createIndexerClient(testnetCfg, 7070).ecosystems()
    expect(mock.mock.calls[0][0]).toBe(`${window.location.origin}/api/indexer/v4/ecosystem/list?limit=1000&sort=-id`)
    expect(new Headers(mock.mock.calls[0][1]?.headers).get('At-Block-Height')).toBe('7070')
    expect(result.query.url).toBe(`${INDEXER}/v4/ecosystem/list?limit=1000&sort=-id`)
    expect(result.query.headers).toEqual({ 'At-Block-Height': '7070' })
  })

  it('routes changes(height) through the proxy and keeps unpinned requests direct', async () => {
    const mock = vi.fn(async (input: string) =>
      Response.json(
        input.includes('changes')
          ? { block_height: 38000, next_change_at: 38257, activity: [] }
          : { type: 'block-indexed', height: 1, timestamp: '2026-10-20T00:00:00Z' }
      )
    )
    vi.stubGlobal('fetch', mock)
    const indexer = createIndexerClient(testnetCfg)
    await indexer.changes(38000)
    await indexer.blockHeight()
    expect(mock.mock.calls[0][0]).toBe(`${window.location.origin}/api/indexer/v4/indexer/changes`)
    expect(mock.mock.calls[1][0]).toBe(`${INDEXER}/v4/indexer/block-height`)
  })
})
