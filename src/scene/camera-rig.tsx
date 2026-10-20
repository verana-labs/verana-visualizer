'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Box3, PerspectiveCamera, Vector3 } from 'three'
import type { EntityId, EntityKind } from '@/domain/network-model'
import type { Layout, LensId, Vec3 } from '@/layouts/types'
import { useObservatory } from '@/store/observatory-store'
import { ensureLayout } from './use-lens-tween'
import { usePrefersReducedMotion } from './use-reduced-motion'

const INTRO_FROM = new Vector3(0, 420, 900)
const INTRO_MS = 3200
const FLIGHT_MS = 1300
const REDUCED_FLIGHT_MS = 300
const MIN_OVERVIEW_DISTANCE = 40
const FRAME_MARGIN = 1.12
const MIN_ZOOM_DISTANCE = 4
const MAX_ZOOM_FACTOR = 2.5
const NETWORK_DIRECTION = new Vector3(0, 0.5, 1).normalize()
const FLAT_DIRECTION = new Vector3(0, 0.05, 1).normalize()

interface Flight {
  startedAt: number
  duration: number
  fromPosition: Vector3
  fromTarget: Vector3
  toPosition: Vector3
  toTarget: Vector3
}

interface RigControls {
  target: Vector3
  autoRotate: boolean
  minDistance: number
  maxDistance: number
  addEventListener(type: 'start', listener: () => void): void
  removeEventListener(type: 'start', listener: () => void): void
}

const isRigControls = (value: unknown): value is RigControls =>
  typeof value === 'object' && value !== null && 'target' in value && 'autoRotate' in value

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

export function focusDistance(kind: EntityKind, lens: LensId): number {
  if (kind === 'ecosystem') return lens === 'trust' ? 60 : 34
  if (kind === 'agent') return 24
  return 30
}

export function overviewOf(points: readonly Vec3[], lens: LensId, fov: number, aspect: number) {
  const bounds = new Box3()
  const point = new Vector3()
  for (const p of points) bounds.expandByPoint(point.set(...p))
  const target = bounds.isEmpty() ? new Vector3() : bounds.getCenter(new Vector3())
  const direction = lens === 'network' ? NETWORK_DIRECTION : FLAT_DIRECTION
  const basis = new PerspectiveCamera(fov, aspect)
  basis.position.copy(direction)
  basis.lookAt(0, 0, 0)
  const right = new Vector3().setFromMatrixColumn(basis.matrixWorld, 0)
  const up = new Vector3().setFromMatrixColumn(basis.matrixWorld, 1)
  const tanV = Math.tan((fov * Math.PI) / 360)
  const tanH = tanV * aspect
  let distance = MIN_OVERVIEW_DISTANCE
  for (const p of points) {
    const offset = point.set(...p).sub(target)
    const depth = offset.dot(direction)
    const needed = Math.max(Math.abs(offset.dot(right)) / tanH, Math.abs(offset.dot(up)) / tanV) * FRAME_MARGIN
    distance = Math.max(distance, needed + depth)
  }
  return { target, position: target.clone().addScaledVector(direction, distance), distance }
}

export function framePoints(layout: Layout, ids: readonly EntityId[]): Vec3[] {
  const placed = ids.flatMap((id): Vec3[] => {
    const position = layout.positions.get(id)
    return position ? [position] : []
  })
  const ringExtents = (layout.rings ?? []).flatMap(({ center: [x, y, z], radius, tilt }): Vec3[] => {
    const lift = radius * Math.sin(tilt)
    const depth = radius * Math.cos(tilt)
    return [
      [x + radius, y, z],
      [x - radius, y, z],
      [x, y - lift, z + depth],
      [x, y + lift, z - depth],
    ]
  })
  return [...placed, ...ringExtents]
}

export function zoomLimits(overviewDistance: number) {
  return { minDistance: MIN_ZOOM_DISTANCE, maxDistance: overviewDistance * MAX_ZOOM_FACTOR }
}

export function CameraRig({ ids }: { ids: readonly EntityId[] }) {
  const camera = useThree((s) => s.camera)
  const rawControls = useThree((s) => s.controls)
  const controls = isRigControls(rawControls) ? rawControls : null
  const lens = useObservatory((s) => s.lens)
  const selected = useObservatory((s) => s.selected)
  const reduced = usePrefersReducedMotion()
  const flight = useRef<Flight | null>(null)
  const resumeAutoRotate = useRef(false)
  const introduced = useRef(false)

  useEffect(() => {
    if (!controls) return
    const yieldToUser = () => {
      flight.current = null
      resumeAutoRotate.current = false
      controls.autoRotate = false
    }
    controls.addEventListener('start', yieldToUser)
    return () => controls.removeEventListener('start', yieldToUser)
  }, [controls])

  useEffect(() => {
    const layout = ensureLayout(lens)
    if (!layout || !controls || !(camera instanceof PerspectiveCamera)) return
    const overview = overviewOf(framePoints(layout, ids), lens, camera.fov, camera.aspect)
    Object.assign(controls, zoomLimits(overview.distance))

    const entity = selected ? useObservatory.getState().model?.entities.get(selected) : undefined
    const focusAt = entity ? layout.positions.get(entity.id) : undefined
    let toTarget = overview.target
    let toPosition = overview.position
    if (entity && focusAt) {
      toTarget = new Vector3(...focusAt)
      const heading =
        lens === 'trust' ? FLAT_DIRECTION.clone() : camera.position.clone().sub(controls.target).normalize()
      toPosition = toTarget.clone().addScaledVector(heading, focusDistance(entity.kind, lens))
    }

    const intro = !introduced.current
    introduced.current = true
    if (!flight.current) resumeAutoRotate.current = controls.autoRotate && !entity
    controls.autoRotate = false
    flight.current = {
      startedAt: performance.now(),
      duration: reduced ? REDUCED_FLIGHT_MS : intro ? INTRO_MS : FLIGHT_MS,
      fromPosition: intro ? INTRO_FROM.clone() : camera.position.clone(),
      fromTarget: intro ? overview.target.clone() : controls.target.clone(),
      toPosition,
      toTarget,
    }
  }, [lens, selected, controls, camera, ids, reduced])

  useFrame(() => {
    const current = flight.current
    if (!current || !controls) return
    const t = easeInOutCubic(Math.min(1, (performance.now() - current.startedAt) / current.duration))
    camera.position.lerpVectors(current.fromPosition, current.toPosition, t)
    controls.target.lerpVectors(current.fromTarget, current.toTarget, t)
    if (t < 1) return
    flight.current = null
    controls.autoRotate = resumeAutoRotate.current
  }, -2)

  return null
}
