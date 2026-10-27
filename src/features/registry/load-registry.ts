import { historyStart } from '@/domain/digest'
import type { NetworkModel } from '@/domain/network-model'
import type { IndexerClient } from '@/lib/api/indexer'
import type { QueryInfo } from '@/lib/api/query-info'
import { type PendingTask, pendingCorporations, pendingTasks, type SlashDay, slashEvents } from './registry-data'

export type RegistrySection<T> =
  | { status: 'ready'; data: T; queries: QueryInfo[] }
  | { status: 'error'; message: string }

export interface SlashHistory {
  since: string | null
  events: SlashDay[]
}

export interface RegistryData {
  pending: RegistrySection<PendingTask[]>
  slashes: RegistrySection<SlashHistory>
}

async function section<T>(load: () => Promise<{ data: T; queries: QueryInfo[] }>): Promise<RegistrySection<T>> {
  try {
    return { status: 'ready', ...(await load()) }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : String(error) }
  }
}

export async function loadRegistry(indexer: IndexerClient, model: NetworkModel, now: Date): Promise<RegistryData> {
  const [pending, slashes] = await Promise.all([
    section(async () => {
      const corporations = pendingCorporations(model.raw.participants)
      const responses = await Promise.all(corporations.map((id) => indexer.pendingFlat(id)))
      return {
        data: pendingTasks(responses.map((res, i) => ({ corporationId: corporations[i], flat: res.data }))),
        queries: responses.map((res) => res.query),
      }
    }),
    section(async () => {
      const stats = await indexer.stats({
        entity_type: 'GLOBAL',
        granularity: 'DAY',
        result_type: 'BUCKETS',
        timestamp_from: historyStart(model, now),
        timestamp_until: now.toISOString(),
      })
      const buckets = stats.data.buckets ?? []
      return {
        data: { since: buckets[0]?.timestamp.slice(0, 10) ?? null, events: slashEvents(buckets) },
        queries: [stats.query],
      }
    }),
  ])
  return { pending, slashes }
}
