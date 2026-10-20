import type { Corporation, CredentialSchema, Ecosystem, Participant } from '@/lib/api/schemas'
import { agentName, ecosystemName, schemaTitle } from './names'
import { AGENT_COLORS, isRole, ROLES } from './roles'

export type EntityKind = 'ecosystem' | 'participant' | 'agent' | 'corporation' | 'schema' | 'proposal'
export type EntityId = `${EntityKind}:${string}`

export interface Entity {
  id: EntityId
  kind: EntityKind
  name: string
  ecosystemId: number | null
  color: string
  tier: number
  did: string | null
}

export interface RawNetwork {
  ecosystems: Ecosystem[]
  schemas: CredentialSchema[]
  participants: Participant[]
  corporations: Corporation[]
  dids: string[]
}

export interface NetworkModel {
  entities: Map<EntityId, Entity>
  ecosystems: Entity[]
  participants: Entity[]
  agents: Entity[]
  parentOf(id: EntityId): EntityId | null
  childrenOf(id: EntityId): EntityId[]
  neighbors(id: EntityId): Set<EntityId>
  related(id: EntityId): Set<EntityId>
  chainToRoot(id: EntityId): EntityId[]
  byDid(did: string): EntityId[]
  agentAnchors(id: EntityId): EntityId[]
  raw: RawNetwork
}

const ECOSYSTEM_COLOR = ROLES.ECOSYSTEM.color
const SCHEMA_COLOR = '#c4b5fd'
const CORPORATION_COLOR = '#cbd5e1'
const AGENT_TIER = 4
const SCHEMA_TIER = 1

function pushTo<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key)
  if (list) list.push(value)
  else map.set(key, [value])
}

export function buildNetworkModel(raw: RawNetwork): NetworkModel {
  const entities = new Map<EntityId, Entity>()
  const parents = new Map<EntityId, EntityId>()
  const children = new Map<EntityId, EntityId[]>()
  const dids = new Map<string, EntityId[]>()
  const anchorsOfAgent = new Map<EntityId, EntityId[]>()
  const agentsOfEntity = new Map<EntityId, EntityId[]>()

  const add = (entity: Entity, parent?: EntityId) => {
    entities.set(entity.id, entity)
    if (parent) {
      parents.set(entity.id, parent)
      pushTo(children, parent, entity.id)
    }
    if (entity.did && entity.kind !== 'agent') pushTo(dids, entity.did, entity.id)
  }

  const liveEcosystems = raw.ecosystems.filter((eco) => !eco.archived)
  const liveEcosystemIds = new Set(liveEcosystems.map((eco) => eco.id))
  const schemaEcosystem = new Map(raw.schemas.map((schema) => [schema.id, schema.ecosystem_id]))

  for (const eco of liveEcosystems) {
    add({
      id: `ecosystem:${eco.id}`,
      kind: 'ecosystem',
      name: ecosystemName(eco.did),
      ecosystemId: eco.id,
      color: ECOSYSTEM_COLOR,
      tier: ROLES.ECOSYSTEM.tier,
      did: eco.did,
    })
  }

  for (const schema of raw.schemas) {
    if (schema.archived || !liveEcosystemIds.has(schema.ecosystem_id)) continue
    add(
      {
        id: `schema:${schema.id}`,
        kind: 'schema',
        name: schema.title || schemaTitle(schema.json_schema, schema.id),
        ecosystemId: schema.ecosystem_id,
        color: SCHEMA_COLOR,
        tier: SCHEMA_TIER,
        did: null,
      },
      `ecosystem:${schema.ecosystem_id}`
    )
  }

  const ecosystemOf = (p: Participant) => p.ecosystem_id ?? schemaEcosystem.get(p.schema_id) ?? null
  const livePeople = raw.participants.flatMap((p) => {
    const ecosystemId = ecosystemOf(p)
    if (ecosystemId === null || !liveEcosystemIds.has(ecosystemId) || !isRole(p.role)) return []
    return [{ p, ecosystemId, role: ROLES[p.role] }]
  })
  const peopleById = new Map(livePeople.map((live) => [live.p.id, live.p]))

  const validatorOf = (p: Participant): number | null => {
    const validatorId = p.validator_participant_id
    if (validatorId === null || validatorId === p.id) return null
    const validator = peopleById.get(validatorId)
    if (!validator || ecosystemOf(validator) !== ecosystemOf(p)) return null
    const seen = new Set([p.id])
    for (let cursor: Participant | undefined = validator; cursor; ) {
      if (seen.has(cursor.id)) return null
      seen.add(cursor.id)
      cursor = cursor.validator_participant_id === null ? undefined : peopleById.get(cursor.validator_participant_id)
    }
    return validatorId
  }

  for (const { p, ecosystemId, role } of livePeople) {
    const validatorId = validatorOf(p)
    add(
      {
        id: `participant:${p.id}`,
        kind: 'participant',
        name: p.did ? agentName(p.did) : `Participant ${p.id}`,
        ecosystemId,
        color: role.color,
        tier: role.tier,
        did: p.did ?? null,
      },
      validatorId === null ? `ecosystem:${ecosystemId}` : `participant:${validatorId}`
    )
  }

  const controlledBy = new Map<number, number>()
  for (const eco of liveEcosystems)
    if (!controlledBy.has(eco.corporation_id)) controlledBy.set(eco.corporation_id, eco.id)
  for (const corp of raw.corporations) {
    const controlled = controlledBy.get(corp.id)
    add(
      {
        id: `corporation:${corp.id}`,
        kind: 'corporation',
        name: corp.did ? agentName(corp.did) : `Corporation ${corp.id}`,
        ecosystemId: controlled ?? null,
        color: CORPORATION_COLOR,
        tier: 0,
        did: corp.did ?? null,
      },
      controlled === undefined ? undefined : `ecosystem:${controlled}`
    )
  }

  for (const did of new Set(raw.dids)) {
    const agentId: EntityId = `agent:${did}`
    const holders = dids.get(did) ?? []
    const byKind = (kind: EntityKind) => holders.filter((id) => entities.get(id)?.kind === kind)
    const participants = byKind('participant')
    const anchors = participants.length > 0 ? participants : [...byKind('ecosystem'), ...byKind('corporation')]
    add({
      id: agentId,
      kind: 'agent',
      name: agentName(did),
      ecosystemId: anchors.length > 0 ? (entities.get(anchors[0])?.ecosystemId ?? null) : null,
      color: AGENT_COLORS.resolving,
      tier: AGENT_TIER,
      did,
    })
    anchorsOfAgent.set(agentId, anchors)
    for (const anchor of anchors) pushTo(agentsOfEntity, anchor, agentId)
  }

  const parentOf = (id: EntityId) => parents.get(id) ?? null
  const childrenOf = (id: EntityId) => children.get(id) ?? []
  const agentAnchors = (id: EntityId) => anchorsOfAgent.get(id) ?? agentsOfEntity.get(id) ?? []

  const chainToRoot = (id: EntityId): EntityId[] => {
    const chain: EntityId[] = []
    for (let cursor: EntityId | null = id; cursor && !chain.includes(cursor); cursor = parentOf(cursor))
      chain.push(cursor)
    return chain
  }

  const descendants = (id: EntityId): EntityId[] => childrenOf(id).flatMap((child) => [child, ...descendants(child)])

  const neighbors = (id: EntityId) => {
    const parent = parentOf(id)
    return new Set<EntityId>([...(parent ? [parent] : []), ...childrenOf(id), ...agentAnchors(id)])
  }

  const related = (id: EntityId) => {
    const anchors = anchorsOfAgent.get(id)
    if (anchors) return new Set<EntityId>([id, ...anchors.flatMap(chainToRoot)])
    const below = descendants(id)
    return new Set<EntityId>([
      ...chainToRoot(id),
      ...below,
      ...[id, ...below].flatMap((member) => agentsOfEntity.get(member) ?? []),
    ])
  }

  const ofKind = (kind: EntityKind) => [...entities.values()].filter((entity) => entity.kind === kind)

  return {
    entities,
    ecosystems: ofKind('ecosystem'),
    participants: ofKind('participant'),
    agents: ofKind('agent'),
    parentOf,
    childrenOf,
    neighbors,
    related,
    chainToRoot,
    byDid: (did) => {
      const agentId: EntityId = `agent:${did}`
      return [...(entities.has(agentId) ? [agentId] : []), ...(dids.get(did) ?? [])]
    },
    agentAnchors,
    raw,
  }
}
