import type { z } from 'zod'
import { effectiveEnd, isExpiringSoon } from '@/domain/expiry'
import type { Entity, EntityId, NetworkModel } from '@/domain/network-model'
import type { Participant, pendingFlatSchema } from '@/lib/api/schemas'

export type PendingFlat = z.infer<typeof pendingFlatSchema>

export const ONBOARDING_STATES = ['PENDING', 'VALIDATED', 'TERMINATED'] as const
export const EXPIRING_COLOR = '#fbbf24'

const ONBOARDING_COLORS: Record<string, string> = {
  PENDING: '#7dd3fc',
  VALIDATED: '#29C68C',
  TERMINATED: '#94a3b8',
}

export const onboardingColor = (state: string) => ONBOARDING_COLORS[state] ?? '#cbd5e1'

export interface PendingTask {
  participantId: number
  role: string
  ecosystemId: number
  schemaId: number
  validatorCorporationId: number
}

export interface OnboardingCount {
  state: string
  count: number
}

export interface CoverageCell {
  schemaId: number
  name: string
  participants: number
  services: number
}

export interface CoverageRow {
  ecosystem: Entity
  cells: CoverageCell[]
}

export interface SlashDay {
  day: string
  ecosystemEvents: number
  networkEvents: number
  amount: number
}

export function pendingCorporations(participants: readonly Participant[]): number[] {
  const byId = new Map(participants.map((p) => [p.id, p]))
  const corporations = new Set<number>()
  for (const p of participants) {
    if (p.op_state !== 'PENDING' || p.validator_participant_id === null) continue
    const validator = byId.get(p.validator_participant_id)
    if (validator) corporations.add(validator.corporation_id)
  }
  return [...corporations].sort((a, b) => a - b)
}

export function pendingTasks(responses: readonly { corporationId: number; flat: PendingFlat }[]): PendingTask[] {
  return responses.flatMap(({ corporationId, flat }) =>
    flat.ecosystems.flatMap((eco) =>
      eco.schemas.flatMap((schema) =>
        schema.pending_participants.map((p) => ({
          participantId: p.id,
          role: p.role,
          ecosystemId: eco.id,
          schemaId: schema.id,
          validatorCorporationId: corporationId,
        }))
      )
    )
  )
}

export function onboardingCounts(
  participants: readonly Participant[],
  tasks: readonly PendingTask[] | null
): OnboardingCount[] {
  const ids = new Map<string, Set<number>>(ONBOARDING_STATES.map((state) => [state, new Set()]))
  for (const p of participants) {
    const set = ids.get(p.op_state) ?? new Set<number>()
    ids.set(p.op_state, set.add(p.id))
  }
  const pending = ids.get('PENDING') ?? new Set<number>()
  for (const task of tasks ?? []) pending.add(task.participantId)
  return [...ids].map(([state, set]) => ({ state, count: set.size }))
}

export function expiringSoon(participants: readonly Participant[], now: Date): Participant[] {
  return participants
    .filter((p) => isExpiringSoon(p, now))
    .sort((a, b) => effectiveEnd(a) - effectiveEnd(b) || a.id - b.id)
}

export function coverageMatrix(model: NetworkModel): CoverageRow[] {
  const participantById = new Map(model.raw.participants.map((p) => [`participant:${p.id}` as EntityId, p]))
  const services = new Map<number, Set<EntityId>>()
  for (const agent of model.agents)
    for (const anchor of model.agentAnchors(agent.id)) {
      const p = participantById.get(anchor)
      if (!p || p.op_state === 'TERMINATED') continue
      services.set(p.schema_id, (services.get(p.schema_id) ?? new Set()).add(agent.id))
    }
  const participants = new Map<number, number>()
  for (const p of model.raw.participants)
    if (p.op_state !== 'TERMINATED') participants.set(p.schema_id, (participants.get(p.schema_id) ?? 0) + 1)

  return model.ecosystems.map((ecosystem) => ({
    ecosystem,
    cells: model.raw.schemas
      .filter((s) => s.ecosystem_id === ecosystem.ecosystemId && model.entities.has(`schema:${s.id}`))
      .sort((a, b) => a.id - b.id)
      .map((s) => ({
        schemaId: s.id,
        name: model.entities.get(`schema:${s.id}`)?.name ?? `Schema ${s.id}`,
        participants: participants.get(s.id) ?? 0,
        services: services.get(s.id)?.size ?? 0,
      })),
  }))
}

function bucketNumber(bucket: Record<string, unknown>, key: string): number {
  const value = Number(bucket[key] ?? 0)
  if (!Number.isFinite(value)) throw new Error(`stats bucket ${String(bucket.timestamp)} has a non-numeric ${key}`)
  return value
}

export function slashEvents(buckets: readonly Record<string, unknown>[]): SlashDay[] {
  return buckets
    .map((bucket) => ({
      day: String(bucket.timestamp).slice(0, 10),
      ecosystemEvents: bucketNumber(bucket, 'delta_ecosystem_slash_events'),
      networkEvents: bucketNumber(bucket, 'delta_network_slash_events'),
      amount:
        bucketNumber(bucket, 'delta_ecosystem_slashed_amount') + bucketNumber(bucket, 'delta_network_slashed_amount'),
    }))
    .filter((day) => day.ecosystemEvents > 0 || day.networkEvents > 0)
    .sort((a, b) => b.day.localeCompare(a.day))
}
