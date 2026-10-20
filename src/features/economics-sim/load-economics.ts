import { liveTuRate, type Rates, ratesFromTdParams, type TuRate } from '@/domain/economics'
import type { NetworkModel } from '@/domain/network-model'
import type { IndexerClient } from '@/lib/api/indexer'
import type { QueryInfo } from '@/lib/api/query-info'
import type { Corporation, ExchangeRate, TrustDeposit } from '@/lib/api/schemas'
import { FetchError } from '@/lib/fetch-json'

export interface SeriesPoint {
  timestamp: string
  weight: number
  slashed: number
}

export interface EconomicsData {
  rates: Rates
  exchangeRates: ExchangeRate[]
  tuRate: TuRate | null
  deposits: Map<number, TrustDeposit | null>
  series: SeriesPoint[]
  queries: { tdParams: QueryInfo }
}

const DEPOSIT_CONCURRENCY = 4
const YEAR_MS = 365 * 86_400_000

function bucketNumber(bucket: Record<string, unknown>, key: string): number {
  const value = Number(bucket[key] ?? 0)
  if (!Number.isFinite(value)) throw new Error(`stats bucket ${String(bucket.timestamp)} has a non-numeric ${key}`)
  return value
}

const hasDepositActivity = (c: Corporation) =>
  [c.deposit, c.share, c.slashed_deposit, c.repaid_deposit, c.slash_count].some((value) => Number(value) > 0)

async function depositsOf(
  indexer: IndexerClient,
  corporations: readonly Corporation[]
): Promise<Map<number, TrustDeposit | null>> {
  const deposits = new Map<number, TrustDeposit | null>(corporations.map((c) => [c.id, null]))
  const ids = corporations.filter(hasDepositActivity).map((c) => c.id)
  let next = 0
  const worker = async () => {
    while (next < ids.length) {
      const id = ids[next++]
      try {
        deposits.set(id, (await indexer.trustDeposit(id)).data)
      } catch (error) {
        if (error instanceof FetchError && error.status === 404) deposits.set(id, null)
        else throw error
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(DEPOSIT_CONCURRENCY, ids.length) }, worker))
  return deposits
}

export function historyStart(model: NetworkModel, now: Date): string {
  const created = [...model.raw.ecosystems, ...model.raw.corporations]
    .map((entity) => Date.parse(entity.created))
    .filter(Number.isFinite)
  const start = created.length > 0 ? Math.min(...created) : now.getTime() - YEAR_MS
  return new Date(start).toISOString()
}

export async function loadEconomics(indexer: IndexerClient, model: NetworkModel, now: Date): Promise<EconomicsData> {
  const [params, exchangeRates, stats, deposits] = await Promise.all([
    indexer.tdParams(),
    indexer.exchangeRates(),
    indexer.stats({
      entity_type: 'GLOBAL',
      granularity: 'DAY',
      result_type: 'BUCKETS',
      timestamp_from: historyStart(model, now),
      timestamp_until: now.toISOString(),
    }),
    depositsOf(indexer, model.raw.corporations),
  ])
  const series = (stats.data.buckets ?? []).map((bucket) => ({
    timestamp: bucket.timestamp,
    weight: bucketNumber(bucket, 'cumulative_weight'),
    slashed:
      bucketNumber(bucket, 'cumulative_ecosystem_slashed_amount') +
      bucketNumber(bucket, 'cumulative_network_slashed_amount'),
  }))
  return {
    rates: ratesFromTdParams(params.data.params),
    exchangeRates: exchangeRates.data,
    tuRate: liveTuRate(exchangeRates.data, now),
    deposits,
    series,
    queries: { tdParams: params.query },
  }
}
