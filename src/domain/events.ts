import type { IndexerEvent } from '@/lib/api/schemas'
import type { EntityId, NetworkModel } from './network-model'

const FIRST_WINDOW = 10_000
const WINDOW_STEP = 20_000

export function replayWindows(head: number): number[] {
  const windows: number[] = []
  for (let back = FIRST_WINDOW; head - back > 0; back += WINDOW_STEP) windows.push(head - back)
  windows.push(0)
  return windows
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function numberList(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((item): item is number => typeof item === 'number') : []
}

export function touchedEntities(ev: IndexerEvent, model: NetworkModel): EntityId[] {
  const dids = [...(ev.did ? [ev.did] : []), ...stringList(ev.payload.related_dids)]
  const touched = new Set<EntityId>(dids.flatMap((did) => model.byDid(did)))
  if (touched.size > 0) return [...touched]

  const corporationIds = [
    ...(typeof ev.payload.corporation_id === 'number' ? [ev.payload.corporation_id] : []),
    ...numberList(ev.payload.related_corporation_ids),
  ]
  for (const id of corporationIds) {
    const entityId: EntityId = `corporation:${id}`
    if (model.entities.has(entityId)) touched.add(entityId)
  }
  return [...touched]
}
