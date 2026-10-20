import type { EntityId, NetworkModel } from '@/domain/network-model'
import type { TrustDeposit } from '@/lib/api/schemas'
import { MAX_STAR_SIZE } from '@/scene/scene-data'
import type { EconomicsScene } from '@/store/observatory-store'

export const STAR_DEPOSIT_BASE = 1
export const PARTICIPANT_DEPOSIT_BASE = 0.42
export const PARTICIPANT_DEPOSIT_MAX = 1.1

const positive = (value: unknown) => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

const logShare = (value: number, max: number) => (max > 0 ? Math.log1p(value) / Math.log1p(max) : 0)

export function economicsScene(
  model: NetworkModel,
  deposits: ReadonlyMap<number, TrustDeposit | null>
): EconomicsScene {
  const ecosystemDeposits = new Map<EntityId, number>()
  for (const eco of model.raw.ecosystems) {
    const amount = positive(deposits.get(eco.corporation_id)?.deposit)
    const id: EntityId = `ecosystem:${eco.id}`
    if (amount !== null && model.entities.has(id)) ecosystemDeposits.set(id, amount)
  }
  const participantDeposits = new Map<EntityId, number>()
  for (const p of model.raw.participants) {
    const amount = positive(p.deposit)
    const id: EntityId = `participant:${p.id}`
    if (amount !== null && model.entities.has(id)) participantDeposits.set(id, amount)
  }
  const maxDeposit = Math.max(0, ...ecosystemDeposits.values(), ...participantDeposits.values())

  const sizes = new Map<EntityId, number>()
  for (const eco of model.ecosystems) {
    const amount = ecosystemDeposits.get(eco.id)
    sizes.set(
      eco.id,
      amount === undefined
        ? STAR_DEPOSIT_BASE
        : STAR_DEPOSIT_BASE + (MAX_STAR_SIZE - STAR_DEPOSIT_BASE) * logShare(amount, maxDeposit)
    )
  }
  for (const [id, amount] of participantDeposits) {
    sizes.set(
      id,
      PARTICIPANT_DEPOSIT_BASE + (PARTICIPANT_DEPOSIT_MAX - PARTICIPANT_DEPOSIT_BASE) * logShare(amount, maxDeposit)
    )
  }

  const weights = model.raw.ecosystems.flatMap((eco) => {
    const weight = positive(eco.weight)
    const id: EntityId = `ecosystem:${eco.id}`
    return weight !== null && model.entities.has(id) ? [[id, weight] as const] : []
  })
  const maxWeight = Math.max(0, ...weights.map(([, w]) => w))
  const fills = new Map(weights.map(([id, w]) => [id, logShare(w, maxWeight)]))

  return { sizes, fills }
}
