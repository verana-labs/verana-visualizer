import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { resolveNetworkConfig } from '../env'
import { createIndexerClient } from './indexer'
import {
  blockHeightSchema,
  changesSchema,
  corporationSchema,
  credentialSchemaSchema,
  didListSchema,
  ecosystemSchema,
  exchangeRateSchema,
  groupProposalSchema,
  groupSchema,
  groupVoteSchema,
  historyActivitySchema,
  indexerEventSchema,
  indexerStatusSchema,
  participantSchema,
  pendingFlatSchema,
  statsSchema,
  statsSnapshotSchema,
  trustDepositParamsSchema,
  trustDepositSchema,
  trustVerdictSchema,
} from './schemas'

const cfg = resolveNetworkConfig({
  NEXT_PUBLIC_VERANA_INDEXER_BASE_URL: 'https://idx.testnet.verana.network',
  NEXT_PUBLIC_VERANA_RPC_ENDPOINT: 'https://rpc.testnet.verana.network',
  NEXT_PUBLIC_VERANA_REST_ENDPOINT: 'https://api.testnet.verana.network',
  NEXT_PUBLIC_VERANA_CHAIN_ID: 'vna-testnet-1',
})

const indexerFixtures: Record<string, z.ZodType> = {
  ecosystems: z.array(ecosystemSchema),
  schemas: z.array(credentialSchemaSchema),
  participants: z.array(participantSchema),
  corporations: z.array(corporationSchema),
  dids: didListSchema,
  'trust-deposit': trustDepositSchema,
  'trust-deposit-history': historyActivitySchema,
  'group-members': groupSchema,
  'pending-flat': pendingFlatSchema,
  'entity-history-corporation': historyActivitySchema,
  'entity-history-ecosystem': historyActivitySchema,
  'entity-history-first-ecosystem': historyActivitySchema,
  'entity-history-credential-schema': historyActivitySchema,
  'entity-history-participant': historyActivitySchema,
  'resolve-trusted-root': trustVerdictSchema,
  'resolve-untrusted': trustVerdictSchema,
  'resolve-first-did': trustVerdictSchema,
  'block-height': blockHeightSchema,
  events: z.array(indexerEventSchema),
  changes: changesSchema,
  'changes-38000': changesSchema,
  stats: statsSchema,
  snapshot: statsSnapshotSchema,
  'group-proposals': z.array(groupProposalSchema),
  'group-votes': z.array(groupVoteSchema),
  'exchange-rates': z.array(exchangeRateSchema),
  'td-params': trustDepositParamsSchema,
  'indexer-health': indexerStatusSchema,
}

const nonIndexerFixtures = /^(graph-|chain-)/

function stubFetch(body: unknown = {}) {
  const mock = vi.fn(async (_url: string, _init?: RequestInit) => Response.json(body))
  vi.stubGlobal('fetch', mock)
  return mock
}

afterEach(() => vi.unstubAllGlobals())

describe.each(['testnet', 'devnet'])('indexer fixtures (%s)', (network) => {
  const dir = join(process.cwd(), 'tests', 'fixtures', network)
  const files = readdirSync(dir).filter((f) => f.endsWith('.json') && !nonIndexerFixtures.test(f))

  it('has a schema for every fixture and a fixture for every schema', () => {
    const names = files.map((f) => f.replace(/\.json$/, ''))
    expect(names.filter((name) => !(name in indexerFixtures))).toEqual([])
    const optional =
      network === 'devnet'
        ? ['group-votes', 'trust-deposit', 'trust-deposit-history', 'resolve-trusted-root', 'resolve-untrusted']
        : []
    expect(Object.keys(indexerFixtures).filter((name) => !optional.includes(name) && !names.includes(name))).toEqual([])
  })

  it.each(files)('parses %s', (file) => {
    const schema = indexerFixtures[file.replace(/\.json$/, '')]
    expect(schema, `no schema registered for ${file}`).toBeDefined()
    const parsed = schema.safeParse(JSON.parse(readFileSync(join(dir, file), 'utf8')))
    expect(parsed.success, parsed.success ? '' : parsed.error.message).toBe(true)
  })
})

describe('createIndexerClient', () => {
  it('rejects events with a limit above 100 before fetching', async () => {
    const mock = stubFetch()
    await expect(createIndexerClient(cfg).events(0, 101)).rejects.toThrow('events limit must be <= 100')
    expect(mock).not.toHaveBeenCalled()
  })

  it('sends At-Block-Height when an atHeight is given', async () => {
    const mock = stubFetch({ ecosystems: [] })
    const result = await createIndexerClient(cfg, 44200).ecosystems()
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
    const result = await createIndexerClient(cfg).exchangeRates()
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
    const { query } = await createIndexerClient(cfg).resolve('did:x')
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
