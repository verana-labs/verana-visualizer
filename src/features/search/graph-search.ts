import type { EntityId, EntityKind } from '@/domain/network-model'
import type { GraphClient, SearchSurface } from '@/lib/api/graph'

const HITS_PER_SURFACE = 20

const SURFACES: readonly { surface: SearchSurface; kind: EntityKind }[] = [
  { surface: 'Ecosystem', kind: 'ecosystem' },
  { surface: 'Did', kind: 'agent' },
  { surface: 'Corporation', kind: 'corporation' },
  { surface: 'CredentialSchema', kind: 'schema' },
]

export async function searchGraph(
  graph: GraphClient,
  query: string,
  kinds: readonly EntityKind[]
): Promise<EntityId[]> {
  const freeText = query.trim()
  if (!freeText) return []
  const pages = await Promise.all(
    SURFACES.filter(({ kind }) => kinds.includes(kind)).map(async ({ surface, kind }) => {
      const { data } = await graph.search({
        surface,
        freeText,
        limit: HITS_PER_SURFACE,
        ...(surface === 'Did' ? { includeUntrusted: true } : {}),
      })
      return data.hits.map((hit): EntityId => `${kind}:${hit.id}`)
    })
  )
  return pages.flat()
}
