import { PerspectiveCamera, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import type { EntityId } from '@/domain/network-model'
import type { Layout, Vec3 } from '@/layouts/types'
import { focusDistance, framePoints, overviewOf, zoomLimits } from './camera-rig'

const FOV = 50

const visibleFrom = (position: Vector3, target: Vector3, aspect: number, points: Vec3[]) => {
  const camera = new PerspectiveCamera(FOV, aspect, 0.1, 5000)
  camera.position.copy(position)
  camera.lookAt(target)
  camera.updateMatrixWorld()
  return points.every((p) => {
    const ndc = new Vector3(...p).project(camera)
    return Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1 && ndc.z < 1
  })
}

const devnetLike: Vec3[] = [
  [-180, 0, -20],
  [-90, 10, 40],
  [0, -5, 0],
  [95, 0, -30],
  [190, 12, 25],
]

describe('overviewOf', () => {
  it.each([
    ['network', 16 / 9],
    ['network', 9 / 16],
    ['trust', 16 / 9],
    ['trust', 1],
  ] as const)('frames every point of a wide layout in the %s lens at aspect %f', (lens, aspect) => {
    const { target, position } = overviewOf(devnetLike, lens, FOV, aspect)
    expect(visibleFrom(position, target, aspect, devnetLike)).toBe(true)
  })

  it('keeps a minimum distance for tiny layouts', () => {
    const { target, position } = overviewOf([[0, 0, 0]], 'network', FOV, 1)
    expect(position.distanceTo(target)).toBeGreaterThan(30)
  })
})

describe('focusDistance', () => {
  it('uses the prototype distances per kind and lens', () => {
    expect(focusDistance('ecosystem', 'network')).toBe(34)
    expect(focusDistance('ecosystem', 'trust')).toBe(60)
    expect(focusDistance('participant', 'network')).toBe(30)
    expect(focusDistance('participant', 'trust')).toBe(30)
    expect(focusDistance('agent', 'network')).toBe(24)
  })

  it('keeps a capped star small at the focus distance', () => {
    const halfAngle = Math.atan(2.4 / focusDistance('ecosystem', 'network'))
    expect((2 * halfAngle * 180) / Math.PI).toBeLessThan(FOV / 5)
  })
})

describe('zoomLimits', () => {
  it('lets the user zoom past the focus distances and well beyond the overview', () => {
    const { minDistance, maxDistance } = zoomLimits(400)
    expect(minDistance).toBeLessThan(24)
    expect(maxDistance).toBeGreaterThanOrEqual(800)
  })
})

describe('framePoints', () => {
  it('includes the placed entities and the full extent of every orbit ring', () => {
    const layout: Layout = {
      positions: new Map<EntityId, Vec3>([
        ['ecosystem:1', [100, 0, 0]],
        ['participant:2', [104, 0, 0]],
      ]),
      corePosition: [0, -40, 0],
      rings: [{ center: [100, 0, 0], radius: 30, tilt: 0.3 }],
    }
    const points = framePoints(layout, ['ecosystem:1', 'participant:2', 'agent:did:x'])
    const xs = points.map((p) => p[0])
    expect(Math.max(...xs)).toBeCloseTo(130)
    expect(Math.min(...xs)).toBeCloseTo(70)
    expect(points).toContainEqual([104, 0, 0])
  })
})
