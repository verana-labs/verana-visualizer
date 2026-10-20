import type { NetworkModel } from '@/domain/network-model'
import type { IndexerClient } from '@/lib/api/indexer'

export interface FirstEcosystem {
  height: number
  name: string
}

export async function firstEcosystemBlock(
  indexer: Pick<IndexerClient, 'entityHistory'>,
  model: NetworkModel
): Promise<FirstEcosystem | null> {
  const first = [...model.raw.ecosystems]
    .filter((e) => Number.isFinite(Date.parse(e.created)))
    .sort((a, b) => Date.parse(a.created) - Date.parse(b.created))[0]
  if (!first) return null
  const history = (await indexer.entityHistory('ecosystem', first.id)).data
  const heights = history.map((h) => Number(h.block_height)).filter((h) => Number.isInteger(h) && h > 0)
  if (heights.length === 0) return null
  return { height: Math.min(...heights), name: model.entities.get(`ecosystem:${first.id}`)?.name ?? `#${first.id}` }
}
