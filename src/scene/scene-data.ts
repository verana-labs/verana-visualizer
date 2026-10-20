import { Color } from 'three'
import type { Entity, EntityId, NetworkModel } from '@/domain/network-model'
import { AGENT_COLORS, ECOSYSTEM_STAR_COLOR } from '@/domain/roles'

export const AGENT_SIZE = 0.62
export const MAX_STAR_SIZE = 2.4
const PARTICIPANT_SIZE = 0.42
const ECOSYSTEM_ROLE_BONUS = 0.2

export interface SceneNode {
  entity: Entity
  size: number
  color: Color
}

export interface SceneData {
  nodes: SceneNode[]
  stars: SceneNode[]
  agents: Entity[]
  validatorLinks: [EntityId, EntityId][]
  agentLinks: [EntityId, EntityId][]
}

const brightened = (hex: string, k: number) => new Color(hex).multiplyScalar(k)

export function buildSceneData(model: NetworkModel): SceneData {
  const participantCount = new Map<number, number>()
  for (const p of model.participants)
    if (p.ecosystemId !== null) participantCount.set(p.ecosystemId, (participantCount.get(p.ecosystemId) ?? 0) + 1)

  const stars = model.ecosystems.map((entity) => ({
    entity,
    size: Math.min(MAX_STAR_SIZE, 1 + Math.sqrt(participantCount.get(entity.ecosystemId ?? -1) ?? 0) * 0.18),
    color: brightened(ECOSYSTEM_STAR_COLOR, 1.05),
  }))
  const participants = model.participants.map((entity) => ({
    entity,
    size: PARTICIPANT_SIZE + (entity.tier === 0 ? ECOSYSTEM_ROLE_BONUS : 0),
    color: brightened(entity.color, 1.05),
  }))
  const nodes = [...stars, ...participants]
  const rendered = new Set(nodes.map((node) => node.entity.id))

  const validatorLinks = model.participants.flatMap((p): [EntityId, EntityId][] => {
    const parent = model.parentOf(p.id)
    return parent && rendered.has(parent) ? [[p.id, parent]] : []
  })
  const agentLinks = model.agents.flatMap((agent) =>
    model
      .agentAnchors(agent.id)
      .filter((anchor) => rendered.has(anchor))
      .map((anchor): [EntityId, EntityId] => [agent.id, anchor])
  )

  return { nodes, stars, agents: model.agents, validatorLinks, agentLinks }
}

const AGENT_TINTS = {
  trusted: brightened(AGENT_COLORS.trusted, 1.1),
  untrusted: brightened(AGENT_COLORS.untrusted, 0.75),
  resolving: brightened(AGENT_COLORS.resolving, 0.55),
}

export function agentTint(verdict: boolean | undefined): Color {
  if (verdict === undefined) return AGENT_TINTS.resolving
  return verdict ? AGENT_TINTS.trusted : AGENT_TINTS.untrusted
}
