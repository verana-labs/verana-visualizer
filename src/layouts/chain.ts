import type { EntityId, NetworkModel } from '@/domain/network-model'
import { networkLayout } from './network'
import type { Layout, LensExtras, Vec3 } from './types'

export const VALIDATOR_RING_RADIUS = 15
export const STREAM_SIZE = 12
const BLOCK_BASE = 4.5
const BLOCK_STEP = 1.6
const BACKDROP_GAP = 30
const BACKDROP_DROP = 40
const FRAME_SEGMENTS = 12

export const blockRise = (index: number) => BLOCK_BASE + index * BLOCK_STEP

function chainFrame([x, y, z]: Vec3): Vec3[] {
  const ring = Array.from({ length: FRAME_SEGMENTS }, (_, i): Vec3 => {
    const angle = (i / FRAME_SEGMENTS) * Math.PI * 2
    return [x + Math.cos(angle) * VALIDATOR_RING_RADIUS, y, z + Math.sin(angle) * VALIDATOR_RING_RADIUS]
  })
  return [...ring, [x, y + blockRise(STREAM_SIZE - 1) + BLOCK_STEP, z], [x, y - 4, z]]
}

export function chainLayout(model: NetworkModel, _extras: LensExtras = {}): Layout {
  const network = networkLayout(model)
  const core = network.corePosition
  const front = Math.max(core[2], ...[...network.positions.values()].map((p) => p[2]))
  const back = core[2] - VALIDATOR_RING_RADIUS - BACKDROP_GAP - front
  const positions = new Map<EntityId, Vec3>()
  for (const [id, [x, y, z]] of network.positions) positions.set(id, [x, y - BACKDROP_DROP, z + back])
  return { positions, corePosition: core, rings: [], frame: chainFrame(core) }
}
