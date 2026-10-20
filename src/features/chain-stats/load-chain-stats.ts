import { liveTuRate, type TuRate, tuInVna } from '@/domain/economics'
import { ROLES, type Role } from '@/domain/roles'
import { amount, percent, vnaFromUvna } from '@/features/economics-sim/format'
import { ROLE_LABELS } from '@/features/inspector/entity-facts'
import { createChainClient } from '@/lib/api/chain'
import { createIndexerClient } from '@/lib/api/indexer'
import type { Fetched, QueryInfo } from '@/lib/api/query-info'
import type { ChainBlock, Coin, StatsSnapshot } from '@/lib/api/schemas'
import type { NetworkConfig } from '@/lib/env'
import { logger } from '@/lib/logger'

export interface BlockSummary {
  height: number
  time: string
  txs: number
}

export type Settled<T> = { ok: true; value: T; query: QueryInfo } | { ok: false; reason: string }

export interface TuRateStat {
  rate: TuRate | null
  published: number
}

export interface NetworkStats {
  supply: Settled<number>
  inflation: Settled<number>
  bonded: Settled<number>
  communityPool: Settled<number>
  yieldPool: Settled<number>
  snapshot: Settled<StatsSnapshot>
  tuRate: Settled<TuRateStat>
}

export interface BlockWindow {
  blocks: BlockSummary[]
  error: string | null
  query: QueryInfo | null
}

export type StatState = 'loading' | 'ok' | 'unavailable'

export interface StatRow {
  id: string
  label: string
  definition: string
  state: StatState
  value: string | null
  reason?: string
  detail?: string
  query?: QueryInfo
}

export const BLOCK_TIME_WINDOW = 20

const DEFINITIONS = {
  blockHeight: ['Block height', 'Latest block committed by the chain'],
  blockTime: ['Average block time', `Mean gap between the last ${BLOCK_TIME_WINDOW} blocks`],
  supply: ['Total supply', 'All VNA in existence'],
  inflation: ['Inflation', 'Yearly rate at which new VNA is minted'],
  bonded: ['Bonded', 'VNA staked by validators'],
  communityPool: ['Community pool', 'VNA the chain holds for spending approved by governance'],
  tvl: ['Trust deposit TVL', 'VNA locked as trust deposits by participants'],
  yieldPool: ['Yield pool', 'VNA waiting to be paid out as yield on trust deposits'],
  tuRate: ['TU rate', 'Trust Unit (TU), the unit fees are priced in, and its live VNA price'],
  ecosystems: ['Active ecosystems', 'Ecosystems that are not archived'],
  schemas: ['Active schemas', 'Credential schemas that are not archived'],
  participants: ['Participants', 'Participants in every ecosystem, per role'],
} as const

type StatId = keyof typeof DEFINITIONS

const reasonOf = (error: unknown) => (error instanceof Error ? error.message : String(error))
const integer = (n: number) => n.toLocaleString('en-US')

async function settle<T, R>(name: string, call: () => Promise<Fetched<T>>, pick: (data: T) => R): Promise<Settled<R>> {
  try {
    const res = await call()
    return { ok: true, value: pick(res.data), query: res.query }
  } catch (error) {
    logger.error(`Chain stat ${name} is unavailable`, error)
    return { ok: false, reason: reasonOf(error) }
  }
}

function decimal(value: string | number, what: string): number {
  const n = Number(value)
  if (!Number.isFinite(n)) throw new Error(`${what} is not a number: ${JSON.stringify(value)}`)
  return n
}

function uvnaIn(coins: readonly Coin[], what: string, required: boolean): number {
  const coin = coins.find((c) => c.denom === 'uvna')
  if (!coin) {
    if (required) throw new Error(`${what} has no uvna entry`)
    return 0
  }
  return decimal(coin.amount, `${what} uvna amount`)
}

export async function loadNetworkStats(cfg: NetworkConfig, now: Date): Promise<NetworkStats> {
  const chain = createChainClient(cfg)
  const indexer = createIndexerClient(cfg)
  const [supply, inflation, bonded, communityPool, yieldPool, snapshot, tuRate] = await Promise.all([
    settle('supply', chain.supply, (coins) => uvnaIn(coins, 'supply', true)),
    settle('inflation', chain.inflation, (d) => decimal(d.inflation, 'inflation')),
    settle('bonded', chain.stakingPool, (d) => decimal(d.pool.bonded_tokens, 'bonded tokens')),
    settle('communityPool', chain.communityPool, (d) => uvnaIn(d.pool, 'community pool', false)),
    settle('yieldPool', chain.yieldPool, (coins) => uvnaIn(coins, 'yield pool', false)),
    settle(
      'snapshot',
      () => indexer.snapshot(),
      (d) => d
    ),
    settle('tuRate', indexer.exchangeRates, (rates) => ({ rate: liveTuRate(rates, now), published: rates.length })),
  ])
  return { supply, inflation, bonded, communityPool, yieldPool, snapshot, tuRate }
}

export function blockSummary(block: ChainBlock): BlockSummary {
  const height = Number(block.block.header.height)
  if (!Number.isSafeInteger(height)) throw new Error(`Block has a non-integer height ${block.block.header.height}`)
  return { height, time: block.block.header.time, txs: block.block.data.txs.length }
}

export async function loadBlockWindow(cfg: NetworkConfig, size = BLOCK_TIME_WINDOW): Promise<BlockWindow> {
  const chain = createChainClient(cfg)
  let latest: Fetched<ChainBlock>
  try {
    latest = await chain.latestBlock()
  } catch (error) {
    logger.error('Could not read the latest block', error)
    return { blocks: [], error: reasonOf(error), query: null }
  }
  const head = blockSummary(latest.data)
  const depth = Math.min(size - 1, head.height - 1)
  try {
    const older = await Promise.all(
      Array.from({ length: depth }, (_, i) => chain.block(head.height - depth + i).then((b) => blockSummary(b.data)))
    )
    return { blocks: [...older, head], error: null, query: latest.query }
  } catch (error) {
    logger.error(`Could not read the last ${size} blocks`, error)
    return { blocks: [head], error: reasonOf(error), query: latest.query }
  }
}

export function mergeBlocks(
  window: readonly BlockSummary[],
  incoming: readonly BlockSummary[],
  size: number
): BlockSummary[] {
  const byHeight = new Map<number, BlockSummary>()
  for (const block of [...window, ...incoming]) byHeight.set(block.height, block)
  return [...byHeight.values()].sort((a, b) => a.height - b.height).slice(-size)
}

export function averageBlockSeconds(blocks: readonly BlockSummary[]): number | null {
  if (blocks.length < 2) return null
  const sorted = [...blocks].sort((a, b) => a.height - b.height)
  const first = Date.parse(sorted[0].time)
  const last = Date.parse(sorted[sorted.length - 1].time)
  if (!Number.isFinite(first) || !Number.isFinite(last)) throw new Error('A block has an unreadable timestamp')
  return (last - first) / (sorted.length - 1) / 1000
}

const row = (id: StatId, rest: Omit<StatRow, 'id' | 'label' | 'definition'>): StatRow => ({
  id,
  label: DEFINITIONS[id][0],
  definition: DEFINITIONS[id][1],
  ...rest,
})

const loading = (id: StatId) => row(id, { state: 'loading', value: null })

function fromSettled<T>(id: StatId, settled: Settled<T> | undefined, show: (value: T) => string): StatRow {
  if (!settled) return loading(id)
  if (!settled.ok) return row(id, { state: 'unavailable', value: null, reason: settled.reason })
  return row(id, { state: 'ok', value: show(settled.value), query: settled.query })
}

function participantsByRole(snapshot: StatsSnapshot): string {
  const record: Record<string, unknown> = snapshot
  return (Object.keys(ROLES) as Role[])
    .flatMap((role) => {
      const count = record[`participants_${role.toLowerCase()}`]
      return typeof count === 'number' ? [`${ROLE_LABELS[role]} ${integer(count)}`] : []
    })
    .join(' · ')
}

function blockRows(window: BlockWindow | null): StatRow[] {
  if (!window) return [loading('blockHeight'), loading('blockTime')]
  const newest = window.blocks.at(-1)
  const query = window.query ?? undefined
  const height = newest
    ? row('blockHeight', { state: 'ok', value: integer(newest.height), query })
    : row('blockHeight', { state: 'unavailable', value: null, reason: window.error ?? 'no block' })
  const average = averageBlockSeconds(window.blocks)
  const time =
    window.blocks.length >= BLOCK_TIME_WINDOW && average !== null
      ? row('blockTime', { state: 'ok', value: `${amount(average, 2)} s`, query })
      : row('blockTime', {
          state: 'unavailable',
          value: null,
          reason: `needs the last ${BLOCK_TIME_WINDOW} blocks, got ${window.blocks.length}${window.error ? `: ${window.error}` : ''}`,
        })
  return [height, time]
}

function tuRow(stats: NetworkStats | null): StatRow[] {
  const settled = stats?.tuRate
  if (!settled || (settled.ok && settled.value.published === 0)) return []
  return [
    fromSettled('tuRate', settled, ({ rate }) => (rate ? `1 TU = ${amount(tuInVna(1, rate), 6)} VNA` : 'no live rate')),
  ]
}

export function statRows(stats: NetworkStats | null, window: BlockWindow | null): StatRow[] {
  const snapshot = stats?.snapshot
  const participants = fromSettled('participants', snapshot, (s) => integer(s.participants))
  if (snapshot?.ok) participants.detail = participantsByRole(snapshot.value)
  return [
    ...blockRows(window),
    fromSettled('supply', stats?.supply, vnaFromUvna),
    fromSettled('inflation', stats?.inflation, percent),
    fromSettled('bonded', stats?.bonded, vnaFromUvna),
    fromSettled('communityPool', stats?.communityPool, vnaFromUvna),
    fromSettled('tvl', snapshot, (s) => vnaFromUvna(decimal(s.weight, 'trust deposit weight'))),
    fromSettled('yieldPool', stats?.yieldPool, vnaFromUvna),
    ...tuRow(stats),
    fromSettled('ecosystems', snapshot, (s) => integer(s.active_ecosystems)),
    fromSettled('schemas', snapshot, (s) => integer(s.active_schemas)),
    participants,
  ]
}
