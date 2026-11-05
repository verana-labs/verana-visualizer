import type { Entity, EntityId, EntityKind, NetworkModel } from '@/domain/network-model'

const MAX_RESULTS = 50
const KIND_ORDER: readonly EntityKind[] = ['ecosystem', 'participant', 'agent', 'corporation', 'schema', 'proposal']

const EXACT = 0
const PREFIX = 1
const SUBSTRING = 2

function scoreOf(entity: Entity, needle: string): number | null {
  const id = entity.id.toLowerCase()
  const did = entity.did?.toLowerCase() ?? null
  const name = entity.name.toLowerCase()
  const numeric = needle.replace(/^#/, '')
  if (id === needle || did === needle) return EXACT
  if (entity.kind === 'corporation' && id === `corporation:${numeric}`) return EXACT
  if (name.startsWith(needle)) return PREFIX
  if (name.includes(needle) || did?.includes(needle)) return SUBSTRING
  return null
}

function controlledBy(model: NetworkModel, needle: string): EntityId | null {
  const corporation = model.raw?.corporations.find((c) => c.policy_address.toLowerCase() === needle)
  return corporation ? `corporation:${corporation.id}` : null
}

export function searchEntities(model: NetworkModel, query: string): Entity[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return []
  const controller = controlledBy(model, needle)
  return [...model.entities.values()]
    .flatMap((entity) => {
      const score = entity.id === controller ? EXACT : scoreOf(entity, needle)
      return score === null ? [] : [{ entity, score }]
    })
    .sort((a, b) => a.score - b.score || KIND_ORDER.indexOf(a.entity.kind) - KIND_ORDER.indexOf(b.entity.kind))
    .slice(0, MAX_RESULTS)
    .map(({ entity }) => entity)
}
