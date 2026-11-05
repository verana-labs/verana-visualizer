import { afterEach, describe, expect, it, vi } from 'vitest'
import { testnetCfg } from '../../../tests/support/network'
import { createIndexerClient } from './indexer'
import { exchangeRateSchema } from './schemas'

function stubFetch(body: unknown = {}) {
  const mock = vi.fn(async (_url: string, _init?: RequestInit) => Response.json(body))
  vi.stubGlobal('fetch', mock)
  return mock
}

afterEach(() => vi.unstubAllGlobals())

describe('createIndexerClient', () => {
  it('rejects events with a limit above 100 before fetching', async () => {
    const mock = stubFetch()
    await expect(createIndexerClient(testnetCfg).events(0, 101)).rejects.toThrow('events limit must be <= 100')
    expect(mock).not.toHaveBeenCalled()
  })

  it('sends At-Block-Height when an atHeight is given', async () => {
    const mock = stubFetch({ ecosystems: [] })
    const result = await createIndexerClient(testnetCfg, 44200).ecosystems()
    const init = mock.mock.calls[0][1]
    expect(new Headers(init?.headers).get('At-Block-Height')).toBe('44200')
    expect(result.query.headers).toEqual({ 'At-Block-Height': '44200' })
  })

  it('pages by max_id with sort=-id until a short page and reports the first query', async () => {
    const row = (id: number) => ({
      id,
      base_asset_type: 'COIN',
      base_asset: 'uvna',
      quote_asset_type: 'FIAT',
      quote_asset: 'USD',
      rate: '1',
    })
    const full = Array.from({ length: 1000 }, (_, i) => row(2000 - i))
    const rest = Array.from({ length: 3 }, (_, i) => row(1000 - i))
    const mock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ exchange_rates: full }))
      .mockResolvedValueOnce(Response.json({ exchange_rates: rest }))
    vi.stubGlobal('fetch', mock)
    const result = await createIndexerClient(testnetCfg).exchangeRates()
    expect(result.data).toHaveLength(1003)
    expect(mock).toHaveBeenCalledTimes(2)
    const first = new URL(mock.mock.calls[0][0] as string)
    const second = new URL(mock.mock.calls[1][0] as string)
    expect(first.searchParams.get('max_id')).toBeNull()
    expect(second.searchParams.get('max_id')).toBe('1001')
    expect(second.searchParams.get('sort')).toBe('-id')
    expect(result.query.url).toBe(first.toString())
  })

  it('records the exact request of a POST resolve', async () => {
    const mock = stubFetch({ did: 'did:x', trusted: false })
    const { query } = await createIndexerClient(testnetCfg).resolve('did:x')
    expect(query).toEqual({
      method: 'POST',
      url: 'https://idx.testnet.verana.network/v4/verifiable-trust/resolve',
      headers: { 'content-type': 'application/json' },
      body: { did: 'did:x' },
    })
    expect(mock.mock.calls[0][1]?.body).toBe('{"did":"did:x"}')
  })
})

describe('exchangeRateSchema', () => {
  it('parses a rate in the OpenAPI shape, with a boolean state and rate_scale', () => {
    const parsed = exchangeRateSchema.safeParse({
      id: 4,
      base_asset_type: 'TU',
      base_asset: 'tu',
      quote_asset_type: 'COIN',
      quote_asset: 'uvna',
      rate: '2000000',
      rate_scale: 6,
      validity_duration: 86400,
      updated: '2026-10-19T08:00:00Z',
      expires: '2026-10-21T08:00:00Z',
      state: true,
    })
    expect(parsed.success, parsed.success ? '' : parsed.error.message).toBe(true)
  })
})
