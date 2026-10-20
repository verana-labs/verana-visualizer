import type { EntityId } from '@/domain/network-model'
import type { CometLaunch } from '@/features/activity-feed/activity'
import type { LensId, Vec3 } from '@/layouts/types'

export const COMET_CAP = 48
export const COMET_MS = 1800
export const TRAIL_POINTS = 26
export const TRAIL_SPACING = 0.012
export const STAGGER_MS = 140
const LIFT = 40

export interface Comet {
  target: EntityId
  color: string
  startAt: number
}

export function enqueueComets(active: Comet[], launches: CometLaunch[], now: number, reduced: boolean): Comet[] {
  const added = launches.map((launch, i) => ({ ...launch, startAt: reduced ? now : now + i * STAGGER_MS }))
  return [...active, ...added].slice(-COMET_CAP)
}

export function cometProgress(comet: Comet, now: number, reduced: boolean): number {
  if (reduced) return 1
  return Math.min(1, (now - comet.startAt) / COMET_MS)
}

export function cometLift(lens: LensId): Vec3 {
  return lens === 'network' ? [0, LIFT, 0] : [0, 0, LIFT]
}

export function bezierPoint(
  from: Vec3,
  to: Vec3,
  t: number,
  lift: Vec3,
  out: [number, number, number]
): [number, number, number] {
  const u = 1 - t
  for (let axis = 0; axis < 3; axis++) {
    const control = (from[axis] + to[axis]) / 2 + lift[axis]
    out[axis] = u * u * from[axis] + 2 * u * t * control + t * t * to[axis]
  }
  return out
}
