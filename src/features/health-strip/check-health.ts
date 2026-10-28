import { createChainClient } from '@/lib/api/chain'
import { createGraphClient } from '@/lib/api/graph'
import { createIndexerClient } from '@/lib/api/indexer'
import type { NetworkConfig } from '@/lib/env'
import { logger } from '@/lib/logger'

type ServiceId = 'indexer' | 'graph' | 'chain'

interface ServiceHealth {
  id: ServiceId
  up: boolean
  detail: string
}

export interface HealthReport {
  services: ServiceHealth[]
  chainHead: number | null
  indexerHeight: number | null
  lag: number | null
  checkedAt: Date
}

export const MAX_GREEN_LAG = 3

export const lagTone = (lag: number): 'green' | 'amber' => (lag <= MAX_GREEN_LAG ? 'green' : 'amber')

const reasonOf = (error: unknown) => (error instanceof Error ? error.message : String(error))
const integer = (n: number) => n.toLocaleString('en-US')

async function attempt<T>(
  what: string,
  call: () => Promise<T>
): Promise<{ ok: true; value: T } | { ok: false; reason: string }> {
  try {
    return { ok: true, value: await call() }
  } catch (error) {
    logger.error(`Health check failed: ${what}`, error)
    return { ok: false, reason: reasonOf(error) }
  }
}

export async function checkHealth(cfg: NetworkConfig, now: () => Date = () => new Date()): Promise<HealthReport> {
  const indexer = createIndexerClient(cfg)
  const graph = createGraphClient(cfg)
  const chain = createChainClient(cfg)
  const [indexerStatus, indexerHeight, graphStatus, chainStatus] = await Promise.all([
    attempt('indexer status', indexer.health),
    attempt('indexer block height', indexer.blockHeight),
    attempt('graph health', graph.health),
    attempt('chain status', chain.status),
  ])

  const height = indexerHeight.ok ? indexerHeight.value.data.height : null
  const sync = chainStatus.ok ? chainStatus.value.data.result.sync_info : null
  const head = sync ? Number(sync.latest_block_height) : null
  const chainHead = head !== null && Number.isSafeInteger(head) ? head : null

  const indexerUp = indexerStatus.ok && indexerStatus.value.data.is_running
  const indexerDetail = indexerStatus.ok
    ? [
        indexerStatus.value.data.is_running ? 'running' : 'not running',
        indexerStatus.value.data.is_crawling ? 'crawling' : 'not crawling',
        height === null ? 'height unknown' : `height ${integer(height)}`,
      ].join(' · ')
    : indexerStatus.reason

  const graphUp = graphStatus.ok && graphStatus.value.data.status === 'ok'
  const graphDetail = graphStatus.ok
    ? `status ${graphStatus.value.data.status} · last applied block ${integer(graphStatus.value.data.lastAppliedBlock)}`
    : graphStatus.reason

  const chainUp = chainStatus.ok && sync !== null && !sync.catching_up
  const chainDetail = chainStatus.ok
    ? [
        chainHead === null ? 'head unknown' : `head ${integer(chainHead)}`,
        `node ${chainStatus.value.data.result.node_info.moniker}`,
        sync?.catching_up ? 'catching up' : 'in sync',
      ].join(' · ')
    : chainStatus.reason

  return {
    services: [
      { id: 'indexer', up: indexerUp, detail: indexerDetail },
      { id: 'graph', up: graphUp, detail: graphDetail },
      { id: 'chain', up: chainUp, detail: chainDetail },
    ],
    chainHead,
    indexerHeight: height,
    lag: chainHead !== null && height !== null ? chainHead - height : null,
    checkedAt: now(),
  }
}
