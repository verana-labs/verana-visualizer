import type { Entity, EntityKind, NetworkModel } from '@/domain/network-model'

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

export function searchEntities(model: NetworkModel, query: string): Entity[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return []
  return [...model.entities.values()]
    .flatMap((entity) => {
      if (entity.kind === 'proposal') return []
      const score = scoreOf(entity, needle)
      return score === null ? [] : [{ entity, score }]
    })
    .sort((a, b) => a.score - b.score || KIND_ORDER.indexOf(a.entity.kind) - KIND_ORDER.indexOf(b.entity.kind))
    .slice(0, MAX_RESULTS)
    .map(({ entity }) => entity)
}
