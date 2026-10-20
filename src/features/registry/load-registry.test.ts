import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildNetworkModel, type RawNetwork } from '@/domain/network-model'
import { testnetModel } from '@/features/search/search-fixture'
import { testnetCfg } from '@/features/trust-check/trust-fixture'
import { createIndexerClient } from '@/lib/api/indexer'
import { loadRegistry } from './load-registry'

const fixture = <T>(network: string, name: string): T =>
  JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures', network, `${name}.json`), 'utf8')) as T

const devnetModel = () =>
  buildNetworkModel({
    ecosystems: fixture('devnet', 'ecosystems'),
    schemas: fixture('devnet', 'schemas'),
    participants: fixture('devnet', 'participants'),
    corporations: fixture('devnet', 'corporations'),
    dids: fixture<{ dids: string[] }>('devnet', 'dids').dids,
  } satisfies RawNetwork)

const NOW = new Date('2026-10-20T12:00:00Z')
const flat = {
  ecosystems: [
    {
      id: 1,
      did: 'did:webvh:ecs',
      pending_tasks: 2,
      schemas: [
        {
          id: 1,
          pending_tasks: 2,
          pending_participants: [
            { id: 46, role: 'HOLDER' },
            { id: 32, role: 'HOLDER' },
          ],
        },
      ],
    },
  ],
}

function stub(handlers: { pending?: (corp: number) => Response; stats?: () => Response }) {
  const mock = vi.fn(async (input: string) => {
    const url = new URL(input)
    if (url.pathname === '/v4/participant/pending/flat')
      return (handlers.pending ?? (() => Response.json(flat)))(Number(url.searchParams.get('corporation_id')))
    if (url.pathname === '/v4/stats/stats')
      return handlers.stats ? handlers.stats() : Response.json(fixture('testnet', 'stats'))
    return new Response('unexpected', { status: 500 })
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

const pendingCalls = (mock: ReturnType<typeof stub>) =>
  mock.mock.calls.map(([url]) => url).filter((url) => url.includes('/pending/flat'))

afterEach(() => vi.unstubAllGlobals())

describe('loadRegistry', () => {
  it('calls pending/flat once per corporation with pending participants and flattens the tasks', async () => {
    const mock = stub({})
    const data = await loadRegistry(createIndexerClient(testnetCfg), devnetModel(), NOW)
    expect(pendingCalls(mock)).toEqual([
      'https://idx.testnet.verana.network/v4/participant/pending/flat?corporation_id=2',
    ])
    expect(data.pending.status === 'ready' && data.pending.data.map((t) => t.participantId)).toEqual([46, 32])
    expect(data.pending.status === 'ready' && data.pending.query?.url).toContain('corporation_id=2')
  })

  it('never calls pending/flat when nothing is pending', async () => {
    const mock = stub({})
    const data = await loadRegistry(createIndexerClient(testnetCfg), testnetModel(), NOW)
    expect(pendingCalls(mock)).toEqual([])
    expect(data.pending).toEqual({ status: 'ready', data: [], query: null })
  })

  it('reads the global daily stats series for slashes since the network began', async () => {
    const mock = stub({})
    const data = await loadRegistry(createIndexerClient(testnetCfg), testnetModel(), NOW)
    const stats = new URL(mock.mock.calls.find(([url]) => url.includes('/v4/stats/stats'))?.[0] ?? '')
    expect(stats.searchParams.get('entity_type')).toBe('GLOBAL')
    expect(stats.searchParams.get('granularity')).toBe('DAY')
    expect(stats.searchParams.get('timestamp_until')).toBe(NOW.toISOString())
    expect(data.slashes.status === 'ready' && data.slashes.data).toEqual({ events: [], since: '2026-10-15' })
  })

  it('marks only the failing section unavailable', async () => {
    stub({ pending: () => new Response('boom', { status: 503 }) })
    const data = await loadRegistry(createIndexerClient(testnetCfg), devnetModel(), NOW)
    expect(data.pending.status).toBe('error')
    expect(data.pending.status === 'error' && data.pending.message).toMatch(/503/)
    expect(data.slashes.status).toBe('ready')

    stub({ stats: () => new Response('down', { status: 500 }) })
    const second = await loadRegistry(createIndexerClient(testnetCfg), devnetModel(), NOW)
    expect(second.pending.status).toBe('ready')
    expect(second.slashes.status).toBe('error')
  })
})
