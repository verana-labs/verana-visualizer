import type { EntityId, NetworkModel } from '@/domain/network-model'
import { maxOrbitRadius, networkLayout } from './network'
import { seededRandom } from './seed'
import { ofKind } from './shared'
import type { Layout, Vec3 } from './types'

const CONSTELLATION_GAP = 5
const CONSTELLATION_DROP = 2
const LOOSE_RING = 34
const LOOSE_RISE = 14

function besideStar(star: Vec3, reach: number): Vec3 {
  const flat = Math.hypot(star[0], star[2])
  const [dx, dz] = flat > 0 ? [star[0] / flat, star[2] / flat] : [1, 0]
  return [star[0] + dx * reach, star[1] - CONSTELLATION_DROP, star[2] + dz * reach]
}

export function governanceLayout(model: NetworkModel): Layout {
  const layout = networkLayout(model)
  for (const corporation of ofKind(model, 'corporation')) {
    if (corporation.ecosystemId === null) {
      const angle = seededRandom(corporation.id)() * Math.PI * 2
      const [x, y, z] = layout.corePosition
      layout.positions.set(corporation.id, [
        x + Math.cos(angle) * LOOSE_RING,
        y + LOOSE_RISE,
        z + Math.sin(angle) * LOOSE_RING,
      ])
      continue
    }
    const starId: EntityId = `ecosystem:${corporation.ecosystemId}`
    const star = layout.positions.get(starId)
    if (!star) throw new Error(`Corporation ${corporation.id} has no placed ecosystem ${starId}`)
    layout.positions.set(corporation.id, besideStar(star, maxOrbitRadius(model, starId) + CONSTELLATION_GAP))
  }
  return layout
}
