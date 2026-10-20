import { createChainClient } from '@/lib/api/chain'
import { createGraphClient } from '@/lib/api/graph'
import { createIndexerClient } from '@/lib/api/indexer'
import type { Fetched } from '@/lib/api/query-info'
import type { NetworkConfig } from '@/lib/env'
import { FetchError } from '@/lib/fetch-json'

export type Outcome = 'pass' | 'fail' | 'skip'

export interface ProbeResult {
  method: string
  outcome: Outcome
  status: number | null
  latencyMs: number | null
  url: string | null
  note: string | null
}

export interface SanityReport {
  network: NetworkConfig
  startedAt: string
  finishedAt: string
  ok: boolean
  results: ProbeResult[]
}

type Probed<T> = [ProbeResult, T | undefined]
type Prerequisite<T> = { data: T } | { skip: string }

const STATS_WINDOW_MS = 7 * 86_400_000
const EVENTS_LOOKBACK = 100
const EVENTS_LIMIT = 10
const UNREACHABLE = '(the browser got no response: network error or CORS refusal, it does not say which)'

const reasonOf = (error: unknown) => (error instanceof Error ? error.message : String(error))

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  return input instanceof URL ? input.href : input.url
}

const skipped = (method: string, note: string): ProbeResult => ({
  method,
  outcome: 'skip',
  status: null,
  latencyMs: null,
  url: null,
  note,
})

export async function runSanityChecks(cfg: NetworkConfig, now: () => Date = () => new Date()): Promise<SanityReport> {
  const startedAt = now().toISOString()
  const statuses = new Map<string, number>()
  const original = globalThis.fetch
  globalThis.fetch = async (input, init) => {
    const response = await original(input, init)
    statuses.set(urlOf(input), response.status)
    return response
  }
  try {
    const results = await probeAll(cfg, statuses, now)
    return {
      network: { ...cfg },
      startedAt,
      finishedAt: now().toISOString(),
      ok: results.every((r) => r.outcome !== 'fail'),
      results,
    }
  } finally {
    globalThis.fetch = original
  }
}

async function probeAll(cfg: NetworkConfig, statuses: Map<string, number>, now: () => Date): Promise<ProbeResult[]> {
  const indexer = createIndexerClient(cfg)
  const graph = createGraphClient(cfg)
  const chain = createChainClient(cfg)

  async function probe<T>(method: string, run: () => Promise<Fetched<T>>): Promise<Probed<T>> {
    const started = performance.now()
    const latency = () => Math.round(performance.now() - started)
    try {
      const res = await run()
      const url = res.query.url
      return [
        { method, outcome: 'pass', status: statuses.get(url) ?? null, latencyMs: latency(), url, note: null },
        res.data,
      ]
    } catch (error) {
      const fetchError = error instanceof FetchError ? error : null
      return [
        {
          method,
          outcome: 'fail',
          status: fetchError?.status ?? null,
          latencyMs: latency(),
          url: fetchError?.url ?? null,
          note: fetchError && fetchError.status === null ? `${reasonOf(error)} ${UNREACHABLE}` : reasonOf(error),
        },
        undefined,
      ]
    }
  }

  function needs<T, R>(source: Probed<T>, pick: (data: T) => R | undefined, missing: string): Prerequisite<R> {
    const [result, data] = source
    if (data === undefined) return { skip: `needs ${result.method}, which did not pass` }
    const picked = pick(data)
    return picked === undefined ? { skip: `${missing} on ${cfg.chainId}` } : { data: picked }
  }

  async function dependent<R, T>(
    method: string,
    prerequisite: Prerequisite<R>,
    run: (input: R) => Promise<Fetched<T>>
  ): Promise<ProbeResult> {
    if ('skip' in prerequisite) return skipped(method, prerequisite.skip)
    const [result] = await probe(method, () => run(prerequisite.data))
    return result
  }

  const until = now()
  const [
    ecosystems,
    schemas,
    participants,
    corporations,
    dids,
    stats,
    snapshot,
    blockHeight,
    groupProposals,
    exchangeRates,
    tdParams,
    indexerHealth,
    graphHealth,
    graphSearch,
    supply,
    inflation,
    stakingPool,
    communityPool,
    yieldPool,
    validators,
    govProposals,
    latestBlock,
    status,
  ] = await Promise.all([
    probe('indexer.ecosystems', () => indexer.ecosystems()),
    probe('indexer.schemas', () => indexer.schemas()),
    probe('indexer.participants', () => indexer.participants()),
    probe('indexer.corporations', () => indexer.corporations()),
    probe('indexer.dids', () => indexer.dids()),
    probe('indexer.stats', () =>
      indexer.stats({
        entity_type: 'GLOBAL',
        result_type: 'TOTAL',
        timestamp_from: new Date(until.getTime() - STATS_WINDOW_MS).toISOString(),
        timestamp_until: until.toISOString(),
      })
    ),
    probe('indexer.snapshot', () => indexer.snapshot()),
    probe('indexer.blockHeight', () => indexer.blockHeight()),
    probe('indexer.groupProposals', () => indexer.groupProposals()),
    probe('indexer.exchangeRates', () => indexer.exchangeRates()),
    probe('indexer.tdParams', () => indexer.tdParams()),
    probe('indexer.health', () => indexer.health()),
    probe('graph.health', () => graph.health()),
    probe('graph.search', () => graph.search({ surface: 'Ecosystem', limit: 1 })),
    probe('chain.supply', () => chain.supply()),
    probe('chain.inflation', () => chain.inflation()),
    probe('chain.stakingPool', () => chain.stakingPool()),
    probe('chain.communityPool', () => chain.communityPool()),
    probe('chain.yieldPool', () => chain.yieldPool()),
    probe('chain.validators', () => chain.validators()),
    probe('chain.govProposals', () => chain.govProposals()),
    probe('chain.latestBlock', () => chain.latestBlock()),
    probe('chain.status', () => chain.status()),
  ])

  const depositHolder = needs(
    corporations,
    (rows) => rows.find((c) => Number(c.deposit) > 0)?.id,
    'no corporation holds a trust deposit'
  )
  const anyCorporation = needs(corporations, (rows) => rows[0]?.id, 'no corporation')
  const firstEcosystem = needs(ecosystems, (rows) => rows[0]?.id, 'no ecosystem')
  const firstParticipant = needs(participants, (rows) => rows[0]?.id, 'no participant')
  const firstDid = needs(dids, (data) => data.dids[0], 'no DID')
  const indexed = needs(blockHeight, (data) => data.height, 'no indexed block')
  const firstProposal = needs(groupProposals, (rows) => rows[0], 'no group proposal')
  const head = needs(latestBlock, (data) => Number(data.block.header.height), 'no block')

  const dependents = await Promise.all([
    dependent('indexer.trustDeposit', depositHolder, (id) => indexer.trustDeposit(id)),
    dependent('indexer.trustDepositHistory', anyCorporation, (id) => indexer.trustDepositHistory(id)),
    dependent('indexer.entityHistory', firstEcosystem, (id) => indexer.entityHistory('ecosystem', id)),
    dependent('indexer.resolve', firstDid, (did) => indexer.resolve(did)),
    dependent('indexer.events', indexed, (height) =>
      indexer.events(Math.max(0, height - EVENTS_LOOKBACK), EVENTS_LIMIT)
    ),
    dependent('indexer.changes', indexed, (height) => indexer.changes(height)),
    dependent('indexer.groupVotes', firstProposal, (proposal) => indexer.groupVotes(proposal.id)),
    dependent('indexer.groupMembers', firstProposal, (proposal) => indexer.groupMembers(proposal.corporation_id)),
    dependent('indexer.pendingFlat', anyCorporation, (id) => indexer.pendingFlat(id)),
    dependent('graph.traverse', firstParticipant, (id) => graph.traverse('G1', { participantId: id })),
    dependent('graph.validatorChain', firstParticipant, (id) => graph.validatorChain(id)),
    dependent('chain.block', head, (height) => chain.block(Math.max(1, height - 1))),
  ])

  return [
    ...[
      ecosystems,
      schemas,
      participants,
      corporations,
      dids,
      stats,
      snapshot,
      blockHeight,
      groupProposals,
      exchangeRates,
      tdParams,
      indexerHealth,
      graphHealth,
      graphSearch,
      supply,
      inflation,
      stakingPool,
      communityPool,
      yieldPool,
      validators,
      govProposals,
      latestBlock,
      status,
    ].map(([result]) => result),
    ...dependents,
  ].sort((a, b) => clientRank(a.method) - clientRank(b.method))
}

const CLIENT_ORDER = ['indexer', 'graph', 'chain']
const clientRank = (method: string) => CLIENT_ORDER.indexOf(method.slice(0, method.indexOf('.')))
