import type { CometLaunch } from '@/domain/activity'
import { proposalEntityId } from '@/domain/governance'
import type { EntityId, NetworkModel } from '@/domain/network-model'
import { MODULE_COLORS } from '@/features/activity-feed/activity'
import type { IndexerEvent } from '@/lib/api/schemas'

export function governanceComets(ev: IndexerEvent, model: NetworkModel): CometLaunch[] {
  const { module, entity_type: entityType, entity_id: entityId, corporation_id: corporationId } = ev.payload
  if (module !== 'group') return []
  const n = Number(entityId)
  const proposal = entityType === 'GroupProposal' && Number.isInteger(n) ? proposalEntityId('group', n) : null
  const corporation: EntityId | null = typeof corporationId === 'number' ? `corporation:${corporationId}` : null
  const target = [proposal, corporation].find((id): id is EntityId => id !== null && model.entities.has(id))
  return target ? [{ target, color: MODULE_COLORS.group }] : []
}
