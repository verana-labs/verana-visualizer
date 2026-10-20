import type { Entity, EntityId, NetworkModel } from '@/domain/network-model'
import { isCountedParticipant, type ParticipantState } from '@/domain/participant-state'
import type { Role } from '@/domain/roles'
import type { Corporation, CredentialSchema, Ecosystem, Participant } from '@/lib/api/schemas'

export const ROLE_LABELS: Record<Role, string> = {
  ECOSYSTEM: 'Ecosystem',
  ISSUER_GRANTOR: 'Issuer grantor',
  VERIFIER_GRANTOR: 'Verifier grantor',
  ISSUER: 'Issuer',
  VERIFIER: 'Verifier',
  HOLDER: 'Holder',
}

export const STATE_COLORS: Record<ParticipantState, string> = {
  ACTIVE: '#29C68C',
  FUTURE: '#94a3b8',
  EXPIRED: '#fbbf24',
  REVOKED: '#ff8a8a',
  SLASHED: '#ff8a8a',
}

export const formatAmount = (value: number | string) => Number(value).toLocaleString('en-US')

export function numericIdOf(id: EntityId): number {
  const n = Number(id.slice(id.indexOf(':') + 1))
  if (!Number.isInteger(n)) throw new Error(`Entity ${id} has no numeric id`)
  return n
}

const findById = <T extends { id: number }>(rows: readonly T[], id: EntityId): T | null => {
  const n = numericIdOf(id)
  return rows.find((row) => row.id === n) ?? null
}

export const rawEcosystem = (model: NetworkModel, id: EntityId): Ecosystem | null => findById(model.raw.ecosystems, id)
export const rawParticipant = (model: NetworkModel, id: EntityId): Participant | null =>
  findById(model.raw.participants, id)
export const rawSchema = (model: NetworkModel, id: EntityId): CredentialSchema | null => findById(model.raw.schemas, id)
export const rawCorporation = (model: NetworkModel, id: EntityId): Corporation | null =>
  findById(model.raw.corporations, id)

export function ecosystemMembers(
  model: NetworkModel,
  ecosystem: Entity
): { participants: Entity[]; schemas: Entity[] } {
  const ofEcosystem = (entity: Entity) => entity.ecosystemId === ecosystem.ecosystemId
  return {
    participants: model.participants.filter(ofEcosystem),
    schemas: [...model.entities.values()].filter((e) => e.kind === 'schema' && ofEcosystem(e)),
  }
}

export function ecosystemOf(model: NetworkModel, entity: Entity): Entity | null {
  return entity.ecosystemId === null ? null : (model.entities.get(`ecosystem:${entity.ecosystemId}`) ?? null)
}

export function accreditationsOf(model: NetworkModel, agentId: EntityId): Entity[] {
  return model
    .agentAnchors(agentId)
    .flatMap((anchor) => model.entities.get(anchor) ?? [])
    .filter((entity) => entity.kind === 'participant')
}

const participantRows = new WeakMap<NetworkModel, Map<EntityId, Participant>>()

function participantRowsOf(model: NetworkModel): Map<EntityId, Participant> {
  let rows = participantRows.get(model)
  if (!rows) {
    rows = new Map(model.raw.participants.map((p) => [`participant:${p.id}` as EntityId, p]))
    participantRows.set(model, rows)
  }
  return rows
}

export function countedParticipants(model: NetworkModel, participants: readonly Entity[]): number {
  const rows = participantRowsOf(model)
  return participants.filter((p) => {
    const row = rows.get(p.id)
    return row !== undefined && isCountedParticipant(row)
  }).length
}

export function schemaParticipants(model: NetworkModel, schemaId: number): Entity[] {
  const rows = participantRowsOf(model)
  return model.participants.filter((p) => rows.get(p.id)?.schema_id === schemaId)
}
