import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { testnetModel } from '@/features/search/search-fixture'
import { testnetCfg } from '@/features/trust-check/trust-fixture'
import { createIndexerClient } from '@/lib/api/indexer'
import { loadEconomics } from './load-economics'

const raw = (network: string, name: string): unknown =>
  (
    JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures', network, 'raw', `${name}.json`), 'utf8')) as {
      body: unknown
    }
  ).body

const NOW = new Date('2026-10-20T12:00:00Z')

function stubIndexer(network: string, depositOf: (id: number) => Response, exchangeRates?: unknown) {
  const mock = vi.fn(async (input: string) => {
    const url = new URL(input)
    const deposit = url.pathname.match(/^\/v4\/trust-deposit\/get\/(\d+)$/)
    if (deposit) return depositOf(Number(deposit[1]))
    if (url.pathname === '/v4/trust-deposit/params') return Response.json(raw(network, 'td-params'))
    if (url.pathname === '/v4/exchange-rate/list') return Response.json(exchangeRates ?? raw(network, 'exchange-rates'))
    if (url.pathname === '/v4/stats/stats') return Response.json(raw(network, 'stats'))
    return new Response('unexpected', { status: 500 })
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

const notFound = (id: number) =>
  Response.json({ error: `No trust deposit found for corporation_id: ${id}`, code: 404 }, { status: 404 })

afterEach(() => vi.unstubAllGlobals())

describe('loadEconomics', () => {
  it('reads live rates, exchange rates, the stats series and one trust deposit per corporation', async () => {
    const model = testnetModel()
    const mock = stubIndexer('testnet', (id) =>
      id === 2 ? Response.json(raw('testnet', 'trust-deposit')) : notFound(id)
    )
    const data = await loadEconomics(createIndexerClient(testnetCfg), model, NOW)
    expect(data.rates).toEqual({ trustDepositRate: 0.05, userAgentRewardRate: 0.1, walletUserAgentRewardRate: 0.1 })
    expect(data.exchangeRates).toEqual([])
    expect(data.tuRate).toBeNull()
    expect(data.deposits.size).toBe(model.raw.corporations.length)
    expect(data.deposits.get(2)?.deposit).toBe(50000)
    expect(data.deposits.get(3)).toBeNull()
    expect(data.series.map((point) => point.weight)).toEqual([100000, 100000, 100000])
    expect(data.series.every((point) => point.slashed === 0)).toBe(true)
    const stats = new URL(mock.mock.calls.find(([url]) => url.includes('/v4/stats/stats'))?.[0] ?? '')
    expect(stats.searchParams.get('entity_type')).toBe('GLOBAL')
    expect(stats.searchParams.get('timestamp_until')).toBe(NOW.toISOString())
    expect(data.queries.tdParams.url).toBe('https://idx.testnet.verana.network/v4/trust-deposit/params')
  })

  it('only asks the trust-deposit endpoint for corporations whose list row shows deposit activity', async () => {
    const mock = stubIndexer('testnet', (id) => Response.json(raw('testnet', 'trust-deposit')))
    const data = await loadEconomics(createIndexerClient(testnetCfg), testnetModel(), NOW)
    const asked = mock.mock.calls.flatMap(([url]) => url.match(/trust-deposit\/get\/(\d+)$/)?.[1] ?? []).sort()
    expect(asked).toEqual(['1', '2'])
    expect(data.deposits.get(34)).toBeNull()
  })

  it('treats a devnet 404 as no deposit record, not as zero', async () => {
    stubIndexer('devnet', notFound)
    const data = await loadEconomics(createIndexerClient(testnetCfg), testnetModel(), NOW)
    expect([...data.deposits.values()].every((d) => d === null)).toBe(true)
  })

  it('fails on any other trust-deposit error', async () => {
    stubIndexer('testnet', () => new Response('boom', { status: 502 }))
    await expect(loadEconomics(createIndexerClient(testnetCfg), testnetModel(), NOW)).rejects.toThrow(/502/)
  })

  it('resolves the live TU rate while loading, so a malformed rate fails the load', async () => {
    const malformed = {
      exchange_rates: [
        {
          id: 9,
          base_asset_type: 'TU',
          base_asset: 'tu',
          quote_asset_type: 'COIN',
          quote_asset: 'uvna',
          rate: '2000000',
          state: true,
          expires: '2026-10-21T00:00:00Z',
        },
      ],
    }
    stubIndexer('testnet', notFound, malformed)
    await expect(loadEconomics(createIndexerClient(testnetCfg), testnetModel(), NOW)).rejects.toThrow(/rate_scale/)
  })
})
