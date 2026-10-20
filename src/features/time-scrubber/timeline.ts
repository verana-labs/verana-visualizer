import { buildNetworkModel, type EntityId, type NetworkModel } from '@/domain/network-model'
import { createIndexerClient, type IndexerClient } from '@/lib/api/indexer'
import type { QueryInfo } from '@/lib/api/query-info'
import type { IndexerEvent } from '@/lib/api/schemas'
import type { NetworkConfig } from '@/lib/env'

export const EVENTS_PAGE = 100

export interface DensityPoint {
  height: number
  count: number
}

export interface DayMark {
  date: string
  height: number
}

export type FetchEventsPage = (afterHeight: number, limit: number) => Promise<IndexerEvent[]>

const eventKey = (ev: IndexerEvent) =>
  `${ev.block_height}:${ev.tx_hash ?? ''}:${String(ev.payload.tx_index)}:${String(ev.payload.message_index)}:${ev.event_type}`

export async function loadEvents(fetchPage: FetchEventsPage): Promise<IndexerEvent[]> {
  const seen = new Set<string>()
  const all: IndexerEvent[] = []
  let after = 0
  for (;;) {
    const page = await fetchPage(after, EVENTS_PAGE)
    for (const ev of page) {
      const key = eventKey(ev)
      if (seen.has(key)) continue
      seen.add(key)
      all.push(ev)
    }
    if (page.length < EVENTS_PAGE) break
    const last = page[page.length - 1].block_height
    const next = last - 1 > after ? last - 1 : last
    if (next <= after) throw new Error(`Indexer events did not advance past block ${after}`)
    after = next
  }
  return all.sort((a, b) => a.block_height - b.block_height)
}

export function buildDensity(events: readonly IndexerEvent[]): DensityPoint[] {
  const counts = new Map<number, number>()
  for (const ev of events) counts.set(ev.block_height, (counts.get(ev.block_height) ?? 0) + 1)
  return [...counts].map(([height, count]) => ({ height, count })).sort((a, b) => a.height - b.height)
}

export function buildDays(buckets: readonly { timestamp: string }[], events: readonly IndexerEvent[]): DayMark[] {
  const firstOfDay = new Map<string, number>()
  for (const ev of events) {
    const date = ev.timestamp.slice(0, 10)
    const known = firstOfDay.get(date)
    if (known === undefined || ev.block_height < known) firstOfDay.set(date, ev.block_height)
  }
  return buckets.flatMap((bucket) => {
    const date = bucket.timestamp.slice(0, 10)
    const height = firstOfDay.get(date)
    return height === undefined ? [] : [{ date, height }]
  })
}

export async function nextChangeAfter(indexer: IndexerClient, height: number): Promise<number | null> {
  return (await indexer.changes(height)).data.next_change_at
}

export interface Snapshot {
  model: NetworkModel
  query: QueryInfo
}

export async function loadModelAt(cfg: NetworkConfig, height: number): Promise<Snapshot> {
  const indexer = createIndexerClient(cfg, height)
  const [ecosystems, schemas, participants, corporations, dids] = await Promise.all([
    indexer.ecosystems(),
    indexer.schemas(),
    indexer.participants(),
    indexer.corporations(),
    indexer.dids(),
  ])
  const model = buildNetworkModel({
    ecosystems: ecosystems.data,
    schemas: schemas.data,
    participants: participants.data,
    corporations: corporations.data,
    dids: dids.data.dids,
  })
  return { model, query: ecosystems.query }
}

export function absentAt(live: NetworkModel, past: NetworkModel): Set<EntityId> {
  const absent = new Set<EntityId>()
  for (const id of live.entities.keys()) if (!past.entities.has(id)) absent.add(id)
  return absent
}
