import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PerspectiveCamera, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { buildNetworkModel, type EntityId, type RawNetwork } from '@/domain/network-model'
import { layoutFor } from '@/layouts'
import type { Layout, Vec3 } from '@/layouts/types'
import {
  focusDistance,
  focusFrameDistance,
  focusFrameIds,
  framePoints,
  INTRO_ARC,
  introEnd,
  introPosition,
  overviewOf,
  tightFitDistance,
  traceFrame,
  unoccludedAspect,
  zoomLimits,
} from './camera-rig'
import { MAX_STAR_SIZE } from './scene-data'

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
  it.each([50, 35, 70])('keeps a capped star within 20 degrees of a %i degree view at the closest zoom', (fov) => {
    const { minDistance } = zoomLimits(400, fov)
    const starDegrees = (2 * Math.atan(MAX_STAR_SIZE / minDistance) * 180) / Math.PI
    expect(starDegrees).toBeLessThanOrEqual(20 + 1e-9)
    expect(starDegrees).toBeGreaterThan(19)
  })

  it('still reaches every focus distance and zooms well beyond the overview', () => {
    const { minDistance, maxDistance } = zoomLimits(400, FOV)
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

describe('focusFrameDistance', () => {
  const heading = new Vector3(0, 0.5, 1).normalize()
  const target = new Vector3(40, 0, -10)
  const ring = (radius: number, count: number): Vec3[] =>
    Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2
      return [target.x + Math.cos(a) * radius, target.y, target.z + Math.sin(a) * radius]
    })

  it('keeps the brief distance for a small ecosystem', () => {
    expect(focusFrameDistance('ecosystem', 'network', target, ring(4, 6), heading, FOV, 16 / 9)).toBe(34)
  })

  it('backs off to frame a large related set with margin', () => {
    const related = ring(45, 90)
    for (const aspect of [16 / 9, 9 / 16]) {
      const distance = focusFrameDistance('ecosystem', 'network', target, related, heading, FOV, aspect)
      expect(distance).toBeGreaterThan(34)
      const camera = new PerspectiveCamera(FOV, aspect, 0.1, 5000)
      camera.position.copy(target).addScaledVector(heading, distance)
      camera.lookAt(target)
      camera.updateMatrixWorld()
      for (const p of related) {
        const ndc = new Vector3(...p).project(camera)
        expect(Math.abs(ndc.x)).toBeLessThanOrEqual(0.9)
        expect(Math.abs(ndc.y)).toBeLessThanOrEqual(0.9)
      }
    }
  })
})

describe('focusFrameIds', () => {
  const fixture = <T>(name: string): T =>
    JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/testnet', `${name}.json`), 'utf8')) as T
  const raw: RawNetwork = {
    ecosystems: fixture('ecosystems'),
    schemas: fixture('schemas'),
    participants: fixture('participants'),
    corporations: fixture('corporations'),
    dids: fixture<{ dids: string[] }>('dids').dids,
  }
  const model = buildNetworkModel(raw)

  it('gives ECS 1.6 times its tight fit', () => {
    const layout = layoutFor('network', model)
    const center = layout.positions.get('ecosystem:2')
    if (!center) throw new Error('ECS has no position')
    const target = new Vector3(...center)
    const heading = new Vector3(0, 0.5, 1).normalize()
    const points = framePoints({ ...layout, rings: [] }, focusFrameIds(model, 'ecosystem:2'))
    const aspect = unoccludedAspect(1440, 900)
    const tight = tightFitDistance(target, points, heading, FOV, aspect)
    const distance = focusFrameDistance('ecosystem', 'network', target, points, heading, FOV, aspect)
    expect(distance).toBeCloseTo(1.6 * tight)
    expect(distance).toBeGreaterThan(45)
  })

  it('frames an ecosystem orbit system without the agents it shares with other ecosystems', () => {
    const ids = focusFrameIds(model, 'ecosystem:2')
    expect(ids.some((id) => id.startsWith('agent:'))).toBe(false)
    for (const p of model.participants.filter((e) => e.ecosystemId === 2)) expect(ids).toContain(p.id)
  })
})

describe('unoccludedAspect', () => {
  it('narrows the view by the inspector on both sides so a centred focus stays clear of it', () => {
    expect(unoccludedAspect(1440, 900)).toBeCloseTo((1440 - 2 * 356) / 900)
    expect(unoccludedAspect(700, 900)).toBeGreaterThan(0.3)
  })
})

describe('traceFrame', () => {
  const path: Vec3[] = [
    [60, -4, 30],
    [52, 2, 12],
    [40, 0, -2],
    [36, 6, -20],
  ]
  const heading = new Vector3(0, 0.5, 1).normalize()

  it('frames the whole traced path with 1.6 times the tight fit, clear of the side panels', () => {
    const aspect = unoccludedAspect(1440, 900)
    const { target, position } = traceFrame(path, heading, FOV, aspect)
    const distance = position.distanceTo(target)
    expect(distance).toBeCloseTo(1.6 * tightFitDistance(target, path, heading, FOV, aspect))
    expect(visibleFrom(position, target, aspect, path)).toBe(true)
  })

  it('never comes closer than the agent focus distance for a short path', () => {
    const { target, position } = traceFrame([path[2], path[3]], heading, FOV, 16 / 9)
    expect(position.distanceTo(target)).toBeGreaterThanOrEqual(24)
  })
})

describe('the intro flight', () => {
  const from = new Vector3(0, 420, 900)
  const points: Vec3[] = [
    [-100, 0, -60],
    [100, 0, 60],
    [0, 20, 0],
  ]

  it('ends on an overview turned by about 40 degrees that still frames the network', () => {
    const end = introEnd(points, FOV, 16 / 9)
    const offset = end.position.clone().sub(end.target)
    expect((Math.atan2(offset.x, offset.z) * 180) / Math.PI).toBeCloseTo((INTRO_ARC * 180) / Math.PI)
    expect((INTRO_ARC * 180) / Math.PI).toBeCloseTo(40)
    expect(visibleFrom(end.position, end.target, 16 / 9, points)).toBe(true)
  })

  it('starts at the fixed from-point and sweeps its azimuth monotonically to the end', () => {
    const end = introEnd(points, FOV, 16 / 9)
    expect(introPosition(from, end.position, end.target, 0).distanceTo(from)).toBeCloseTo(0)
    expect(introPosition(from, end.position, end.target, 1).distanceTo(end.position)).toBeCloseTo(0)
    const azimuth = (t: number) => {
      const p = introPosition(from, end.position, end.target, t).sub(end.target)
      return Math.atan2(p.x, p.z)
    }
    const samples = [0, 0.25, 0.5, 0.75, 1].map(azimuth)
    for (let i = 1; i < samples.length; i++) expect(samples[i]).toBeGreaterThan(samples[i - 1])
  })
})
