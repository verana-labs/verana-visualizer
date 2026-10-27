import type { EntityId, NetworkModel } from '@/domain/network-model'
import { seededRandom } from './seed'
import { ecosystemOrder, ofKind, placeAgents, placeSchemasAndCorporations } from './shared'
import type { Layout, RingSpec, Vec3 } from './types'

const GOLDEN_ANGLE = 2.39996
const CORE: Vec3 = [0, -38, 0]
const BASE_ORBIT = 3.4
const TIER_STEP = 2.7
const SCHEMA_STEP = 0.6

export function orbitRadius(tier: number, schemaIndex: number): number {
  return BASE_ORBIT + tier * TIER_STEP + schemaIndex * SCHEMA_STEP
}

function orbitTilt(schemaIndex: number): number {
  return (schemaIndex % 2 ? -1 : 1) * (0.3 + schemaIndex * 0.28)
}

interface Orbit {
  schemaIndex: number
  tier: number
}

function orbitsOf(model: NetworkModel, ecosystemId: EntityId): Map<EntityId, Orbit> {
  const ecosystem = model.entities.get(ecosystemId)
  const schemaIds = model
    .childrenOf(ecosystemId)
    .filter((id) => model.entities.get(id)?.kind === 'schema')
    .map((id) => Number(id.slice('schema:'.length)))
    .sort((a, b) => a - b)
  const schemaOf = new Map(model.raw.participants.map((p) => [`participant:${p.id}` as EntityId, p.schema_id]))
  const orbits = new Map<EntityId, Orbit>()
  for (const participant of model.participants) {
    if (participant.ecosystemId !== ecosystem?.ecosystemId) continue
    const index = schemaIds.indexOf(schemaOf.get(participant.id) ?? -1)
    orbits.set(participant.id, { schemaIndex: Math.max(0, index), tier: participant.tier })
  }
  return orbits
}

export function maxOrbitRadius(model: NetworkModel, ecosystemId: EntityId): number {
  const radii = [...orbitsOf(model, ecosystemId).values()].map((o) => orbitRadius(o.tier, o.schemaIndex))
  return radii.length > 0 ? Math.max(...radii) : BASE_ORBIT
}

export function spreadCenters(radii: readonly number[]): { centers: Vec3[]; factor: number } {
  const heights = radii.map((_, i) => ((i % 3) - 1) * 4)
  const unit = radii.map((_, i): Vec3 => {
    const reach = 30 * Math.sqrt(i) + 8
    return i === 0 ? [0, 0, 0] : [Math.cos(i * GOLDEN_ANGLE) * reach, 0, Math.sin(i * GOLDEN_ANGLE) * reach]
  })
  let factor = 1
  for (let i = 0; i < radii.length; i++) {
    for (let j = i + 1; j < radii.length; j++) {
      const reach = radii[i] + radii[j]
      const dy = heights[i] - heights[j]
      const flat = Math.hypot(unit[i][0] - unit[j][0], unit[i][2] - unit[j][2])
      if (reach * reach <= dy * dy) continue
      factor = Math.max(factor, Math.sqrt(reach * reach - dy * dy) / flat)
    }
  }
  const scale = factor === 1 ? 1 : Math.ceil(factor * 1000) / 1000 + 0.001
  return {
    centers: unit.map((point, i): Vec3 => [point[0] * scale, heights[i], point[2] * scale]),
    factor: scale,
  }
}

function ecosystemCenters(model: NetworkModel): Map<EntityId, Vec3> {
  const order = ecosystemOrder(model)
  const { centers } = spreadCenters(order.map((eco) => maxOrbitRadius(model, eco.id)))
  return new Map(order.map((eco, i): [EntityId, Vec3] => [eco.id, centers[i]]))
}

export function networkLayout(model: NetworkModel): Layout {
  const positions = new Map<EntityId, Vec3>(ecosystemCenters(model))
  const rings = new Map<string, RingSpec>()

  for (const eco of model.ecosystems) {
    const center = positions.get(eco.id)
    if (!center) throw new Error(`Ecosystem ${eco.id} has no center`)
    for (const [id, { schemaIndex, tier }] of orbitsOf(model, eco.id)) {
      const radius = orbitRadius(tier, schemaIndex)
      const tilt = orbitTilt(schemaIndex)
      const angle = seededRandom(id)() * Math.PI * 2
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      positions.set(id, [center[0] + x, center[1] - z * Math.sin(tilt), center[2] + z * Math.cos(tilt)])
      rings.set(`${eco.id}:${schemaIndex}:${tier}`, { center, radius, tilt, ecosystem: eco.id })
    }
  }

  for (const participant of ofKind(model, 'participant'))
    if (!positions.has(participant.id)) throw new Error(`Participant ${participant.id} has no ecosystem to orbit`)

  placeSchemasAndCorporations(model, positions, CORE)
  placeAgents(model, positions, CORE, (anchor, random) => {
    const jitterX = (random() - 0.5) * 2.2
    const jitterZ = (random() - 0.5) * 2.2
    return [anchor[0] + jitterX, anchor[1] + 3.4 + random() * 1.5, anchor[2] + jitterZ]
  })

  return { positions, corePosition: CORE, rings: [...rings.values()] }
}
