import type { Entity, EntityId, NetworkModel } from '@/domain/network-model'
import { seededRandom } from './seed'
import type { Vec3 } from './types'

export const CORPORATION_DROP = 6
export const LOOSE_CORPORATION_RING = 18
export const LOOSE_AGENT_RING = 24
export const LOOSE_AGENT_RISE = 6
export const PROPOSAL_RING = 1.5
export const PROPOSAL_RING_STEP = 0.35
export const PROPOSALS_PER_RING = 10
export const PROPOSAL_RISE = 1.2
export const CHAIN_PROPOSAL_RING = 8
export const CHAIN_PROPOSAL_RISE = 6

export function ecosystemOrder(model: NetworkModel): Entity[] {
  const counts = new Map<number, number>()
  for (const participant of model.participants)
    if (participant.ecosystemId !== null)
      counts.set(participant.ecosystemId, (counts.get(participant.ecosystemId) ?? 0) + 1)
  return [...model.ecosystems].sort(
    (a, b) => (counts.get(b.ecosystemId ?? 0) ?? 0) - (counts.get(a.ecosystemId ?? 0) ?? 0) || compareIds(a, b)
  )
}

export function compareIds(a: Entity, b: Entity): number {
  return Number(a.id.slice(a.id.indexOf(':') + 1)) - Number(b.id.slice(b.id.indexOf(':') + 1))
}

export function ofKind(model: NetworkModel, kind: Entity['kind']): Entity[] {
  return [...model.entities.values()].filter((entity) => entity.kind === kind)
}

export function placeSchemasAndCorporations(model: NetworkModel, positions: Map<EntityId, Vec3>, core: Vec3) {
  for (const schema of ofKind(model, 'schema')) {
    const star = positions.get(`ecosystem:${schema.ecosystemId}`)
    if (!star) throw new Error(`Schema ${schema.id} has no placed ecosystem ${schema.ecosystemId}`)
    positions.set(schema.id, star)
  }
  for (const corporation of ofKind(model, 'corporation')) {
    if (corporation.ecosystemId !== null) {
      const star = positions.get(`ecosystem:${corporation.ecosystemId}`)
      if (!star) throw new Error(`Corporation ${corporation.id} has no placed ecosystem ${corporation.ecosystemId}`)
      positions.set(corporation.id, [star[0], star[1] - CORPORATION_DROP, star[2]])
      continue
    }
    const angle = seededRandom(corporation.id)() * Math.PI * 2
    positions.set(corporation.id, ringPoint(core, LOOSE_CORPORATION_RING, angle, 0))
  }
}

export function placeAgents(
  model: NetworkModel,
  positions: Map<EntityId, Vec3>,
  core: Vec3,
  anchored: (anchor: Vec3, random: () => number) => Vec3
) {
  for (const agent of model.agents) {
    const random = seededRandom(agent.id)
    const [first] = model.agentAnchors(agent.id)
    const anchor = first ? positions.get(first) : undefined
    if (first && !anchor) throw new Error(`Agent ${agent.id} anchor ${first} is not placed`)
    if (anchor) positions.set(agent.id, anchored(anchor, random))
    else positions.set(agent.id, ringPoint(core, LOOSE_AGENT_RING, random() * Math.PI * 2, LOOSE_AGENT_RISE))
  }
}

export function placeProposals(model: NetworkModel, positions: Map<EntityId, Vec3>, core: Vec3) {
  const placed = new Map<string, number>()
  for (const proposal of ofKind(model, 'proposal').sort(compareProposals)) {
    if (positions.has(proposal.id)) continue
    const parent = model.parentOf(proposal.id)
    const anchor = parent ? positions.get(parent) : undefined
    if (parent && !anchor) throw new Error(`Proposal ${proposal.id} parent ${parent} is not placed`)
    const key = parent ?? 'chain'
    const index = placed.get(key) ?? 0
    placed.set(key, index + 1)
    const angle =
      (index % PROPOSALS_PER_RING) * ((Math.PI * 2) / PROPOSALS_PER_RING) + Math.floor(index / PROPOSALS_PER_RING) * 0.3
    if (anchor) {
      const radius = PROPOSAL_RING + Math.floor(index / PROPOSALS_PER_RING) * PROPOSAL_RING_STEP
      positions.set(proposal.id, ringPoint(anchor, radius, angle, PROPOSAL_RISE))
    } else positions.set(proposal.id, ringPoint(core, CHAIN_PROPOSAL_RING, angle, CHAIN_PROPOSAL_RISE))
  }
}

function compareProposals(a: Entity, b: Entity): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

function ringPoint(center: Vec3, radius: number, angle: number, rise: number): Vec3 {
  return [center[0] + Math.cos(angle) * radius, center[1] + rise, center[2] + Math.sin(angle) * radius]
}
