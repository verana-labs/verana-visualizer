import type { EntityId, NetworkModel } from '@/domain/network-model'

export type Vec3 = readonly [number, number, number]

export interface RingSpec {
  center: Vec3
  radius: number
  tilt: number
}

export interface Layout {
  positions: Map<EntityId, Vec3>
  corePosition: Vec3
  rings?: RingSpec[]
  frame?: Vec3[]
}

export type LensId = 'network' | 'trust' | 'economics' | 'chain' | 'time' | 'governance' | 'registry'

export type LensExtras = Record<never, never>

export type LayoutFn = (model: NetworkModel, extras: LensExtras) => Layout
