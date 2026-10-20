import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveNetworkConfig } from '../env'
import { createChainClient } from './chain'
import { createGraphClient } from './graph'
import { createIndexerClient } from './indexer'
import type { QueryInfo } from './query-info'

interface RawFixture {
  request: QueryInfo
  status: number
  body: unknown
}

type Replay = (call: Calls, request: QueryInfo) => Promise<{ query: QueryInfo }>

interface Calls {
  indexer: ReturnType<typeof createIndexerClient>
  graph: ReturnType<typeof createGraphClient>
  chain: ReturnType<typeof createChainClient>
}

function configFor(network: string) {
  return resolveNetworkConfig({
    NEXT_PUBLIC_VERANA_INDEXER_BASE_URL: `https://idx.${network}.verana.network`,
    NEXT_PUBLIC_VERANA_RPC_ENDPOINT: `https://rpc.${network}.verana.network`,
    NEXT_PUBLIC_VERANA_REST_ENDPOINT: `https://api.${network}.verana.network`,
    NEXT_PUBLIC_VERANA_CHAIN_ID: `vna-${network}-1`,
  })
}

const search = (request: QueryInfo) => new URL(request.url).searchParams
const lastId = (request: QueryInfo) => Number(new URL(request.url).pathname.split('/').pop())
const bodyOf = (request: QueryInfo) => request.body as Record<string, unknown>
const historyReplay =
  (kind: Parameters<Calls['indexer']['entityHistory']>[0]): Replay =>
  (c, r) =>
    c.indexer.entityHistory(kind, lastId(r))

const replays: Record<string, Replay> = {
  ecosystems: (c) => c.indexer.ecosystems(),
  schemas: (c) => c.indexer.schemas(),
  participants: (c) => c.indexer.participants(),
  corporations: (c) => c.indexer.corporations(),
  dids: (c) => c.indexer.dids(),
  'trust-deposit': (c, r) => c.indexer.trustDeposit(lastId(r)),
  'trust-deposit-history': (c, r) => c.indexer.trustDepositHistory(lastId(r)),
  'entity-history-corporation': historyReplay('corporation'),
  'entity-history-ecosystem': historyReplay('ecosystem'),
  'entity-history-first-ecosystem': historyReplay('ecosystem'),
  'entity-history-credential-schema': historyReplay('credential-schema'),
  'entity-history-participant': historyReplay('participant'),
  'group-members': (c, r) => c.indexer.groupMembers(lastId(r)),
  'pending-flat': (c, r) => c.indexer.pendingFlat(Number(search(r).get('corporation_id'))),
  'resolve-trusted-root': (c, r) => c.indexer.resolve(bodyOf(r).did as string),
  'resolve-untrusted': (c, r) => c.indexer.resolve(bodyOf(r).did as string),
  'resolve-first-did': (c, r) => c.indexer.resolve(bodyOf(r).did as string),
  'block-height': (c) => c.indexer.blockHeight(),
  events: (c, r) => c.indexer.events(Number(search(r).get('after_block_height')), Number(search(r).get('limit'))),
  'events-page-2': (c, r) =>
    c.indexer.events(Number(search(r).get('after_block_height')), Number(search(r).get('limit'))),
  changes: (c, r) => c.indexer.changes(Number(r.headers['At-Block-Height'])),
  'changes-38000': (c, r) => c.indexer.changes(Number(r.headers['At-Block-Height'])),
  stats: (c, r) => {
    const params = search(r)
    return c.indexer.stats({
      entity_type: params.get('entity_type') as 'GLOBAL',
      granularity: params.get('granularity') as 'DAY',
      timestamp_from: params.get('timestamp_from') as string,
      timestamp_until: params.get('timestamp_until') as string,
    })
  },
  snapshot: (c) => c.indexer.snapshot(),
  'group-proposals': (c) => c.indexer.groupProposals(),
  'group-votes': (c, r) => c.indexer.groupVotes(Number(search(r).get('proposal_id'))),
  'exchange-rates': (c) => c.indexer.exchangeRates(),
  'td-params': (c) => c.indexer.tdParams(),
  'indexer-health': (c) => c.indexer.health(),
  'graph-traverse-g1': (c, r) => c.graph.traverse('G1', (bodyOf(r).input as Record<string, unknown>) ?? {}),
  'graph-traverse-g1-11': (c, r) => c.graph.traverse('G1', (bodyOf(r).input as Record<string, unknown>) ?? {}),
  'graph-traverse-g1-97': (c, r) => c.graph.traverse('G1', (bodyOf(r).input as Record<string, unknown>) ?? {}),
  'graph-search': (c, r) => c.graph.search(r.body as Parameters<Calls['graph']['search']>[0]),
  'graph-health': (c) => c.graph.health(),
  'chain-supply': (c) => c.chain.supply(),
  'chain-inflation': (c) => c.chain.inflation(),
  'chain-staking-pool': (c) => c.chain.stakingPool(),
  'chain-community-pool': (c) => c.chain.communityPool(),
  'chain-validators': (c) => c.chain.validators(),
  'chain-gov-proposals': (c) => c.chain.govProposals(),
  'chain-latest-block': (c) => c.chain.latestBlock(),
  'chain-block': (c, r) => c.chain.block(lastId(r)),
  'chain-status': (c) => c.chain.status(),
}

afterEach(() => vi.unstubAllGlobals())

describe.each(['testnet', 'devnet'])('raw response replay (%s)', (network) => {
  const dir = join(process.cwd(), 'tests', 'fixtures', network, 'raw')
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
  const cfg = configFor(network)

  it('has a replay for every raw fixture', () => {
    const names = files.map((f) => f.replace(/\.json$/, ''))
    expect(names.filter((name) => !(name in replays))).toEqual([])
    expect(names).toContain('graph-traverse-g1')
  })

  it.each(files)('replays %s through the matching client method', async (file) => {
    const name = file.replace(/\.json$/, '')
    const raw = JSON.parse(readFileSync(join(dir, file), 'utf8')) as RawFixture
    const mock = vi.fn(async () => Response.json(raw.body, { status: raw.status }))
    vi.stubGlobal('fetch', mock)
    const calls: Calls = {
      indexer: createIndexerClient(cfg),
      graph: createGraphClient(cfg),
      chain: createChainClient(cfg),
    }
    const replay = replays[name](calls, raw.request)
    if (raw.status !== 200) {
      await expect(replay).rejects.toThrow(`failed with status ${raw.status}`)
      expect(mock).toHaveBeenCalled()
      return
    }
    const result = await replay
    expect(result.query).toEqual(raw.request)
    expect(mock).toHaveBeenCalled()
  })
})
