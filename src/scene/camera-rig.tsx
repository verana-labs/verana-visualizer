'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Box3, PerspectiveCamera, Spherical, Vector3 } from 'three'
import type { EntityId, EntityKind, NetworkModel } from '@/domain/network-model'
import type { Layout, LensId, Vec3 } from '@/layouts/types'
import { useObservatory } from '@/store/observatory-store'
import { MAX_STAR_SIZE } from './scene-data'
import { traceablePath } from './trust-trace'
import { ensureLayout } from './use-lens-tween'
import { usePrefersReducedMotion } from './use-reduced-motion'

const INTRO_FROM = new Vector3(0, 420, 900)
const INTRO_MS = 3200
const FLIGHT_MS = 1300
const REDUCED_FLIGHT_MS = 300
const MIN_OVERVIEW_DISTANCE = 40
const FRAME_MARGIN = 1.12
const FOCUS_ROOM = 1.6
const MAX_STAR_DEGREES = 20
const INSPECTOR_SPAN_PX = 356
const MIN_FOCUS_ASPECT = 0.35
const MAX_ZOOM_FACTOR = 2.5
const NETWORK_DIRECTION = new Vector3(0, 0.5, 1).normalize()
const FLAT_DIRECTION = new Vector3(0, 0.05, 1).normalize()
const Y_AXIS = new Vector3(0, 1, 0)
export const INTRO_ARC = (40 * Math.PI) / 180

interface Flight {
  startedAt: number | null
  arc?: boolean
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

function fitDistance(
  points: readonly Vec3[],
  target: Vector3,
  direction: Vector3,
  fov: number,
  aspect: number,
  floor: number,
  margin: number
): number {
  const basis = new PerspectiveCamera(fov, aspect)
  basis.position.copy(direction)
  basis.lookAt(0, 0, 0)
  basis.updateMatrixWorld()
  const right = new Vector3().setFromMatrixColumn(basis.matrixWorld, 0)
  const up = new Vector3().setFromMatrixColumn(basis.matrixWorld, 1)
  const tanV = Math.tan((fov * Math.PI) / 360)
  const tanH = tanV * aspect
  const offset = new Vector3()
  let distance = floor
  for (const p of points) {
    offset.set(...p).sub(target)
    const needed = Math.max(Math.abs(offset.dot(right)) / tanH, Math.abs(offset.dot(up)) / tanV) * margin
    distance = Math.max(distance, needed + offset.dot(direction))
  }
  return distance
}

export function unoccludedAspect(width: number, height: number): number {
  return Math.max(MIN_FOCUS_ASPECT, (width - 2 * INSPECTOR_SPAN_PX) / Math.max(1, height))
}

export function focusFrameIds(model: NetworkModel, id: EntityId): EntityId[] {
  return [...model.related(id)].filter((member) => member === id || model.entities.get(member)?.kind !== 'agent')
}

export function focusFrameDistance(
  kind: EntityKind,
  lens: LensId,
  target: Vector3,
  related: readonly Vec3[],
  heading: Vector3,
  fov: number,
  aspect: number
): number {
  return Math.max(focusDistance(kind, lens), FOCUS_ROOM * tightFitDistance(target, related, heading, fov, aspect))
}

export function tightFitDistance(
  target: Vector3,
  points: readonly Vec3[],
  heading: Vector3,
  fov: number,
  aspect: number
): number {
  return fitDistance(points, target, heading, fov, aspect, 0, 1)
}

export function overviewOf(points: readonly Vec3[], lens: LensId, fov: number, aspect: number) {
  const bounds = new Box3()
  const point = new Vector3()
  for (const p of points) bounds.expandByPoint(point.set(...p))
  const target = bounds.isEmpty() ? new Vector3() : bounds.getCenter(new Vector3())
  const direction = lens === 'network' ? NETWORK_DIRECTION : FLAT_DIRECTION
  const distance = fitDistance(points, target, direction, fov, aspect, MIN_OVERVIEW_DISTANCE, FRAME_MARGIN)
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

function boundsCenter(points: readonly Vec3[]): Vector3 {
  const bounds = new Box3()
  const point = new Vector3()
  for (const p of points) bounds.expandByPoint(point.set(...p))
  return bounds.isEmpty() ? new Vector3() : bounds.getCenter(new Vector3())
}

export function traceFrame(points: readonly Vec3[], heading: Vector3, fov: number, aspect: number) {
  const target = boundsCenter(points)
  const distance = Math.max(
    focusDistance('agent', 'network'),
    FOCUS_ROOM * tightFitDistance(target, points, heading, fov, aspect)
  )
  return { target, position: target.clone().addScaledVector(heading, distance) }
}

export function introEnd(points: readonly Vec3[], fov: number, aspect: number) {
  const target = boundsCenter(points)
  const direction = NETWORK_DIRECTION.clone().applyAxisAngle(Y_AXIS, INTRO_ARC)
  const distance = fitDistance(points, target, direction, fov, aspect, MIN_OVERVIEW_DISTANCE, FRAME_MARGIN)
  return { target, position: target.clone().addScaledVector(direction, distance) }
}

export function introPosition(from: Vector3, to: Vector3, target: Vector3, t: number): Vector3 {
  const a = new Spherical().setFromVector3(from.clone().sub(target))
  const b = new Spherical().setFromVector3(to.clone().sub(target))
  let turn = b.theta - a.theta
  if (turn > Math.PI) turn -= 2 * Math.PI
  if (turn < -Math.PI) turn += 2 * Math.PI
  const at = new Spherical(a.radius + (b.radius - a.radius) * t, a.phi + (b.phi - a.phi) * t, a.theta + turn * t)
  return new Vector3().setFromSpherical(at).add(target)
}

export function zoomLimits(overviewDistance: number, fov: number) {
  const minDistance = MAX_STAR_SIZE / Math.tan((Math.min(MAX_STAR_DEGREES, fov) * Math.PI) / 360)
  return { minDistance, maxDistance: Math.max(overviewDistance * MAX_ZOOM_FACTOR, minDistance * 2) }
}

export function CameraRig({ ids }: { ids: readonly EntityId[] }) {
  const camera = useThree((s) => s.camera)
  const rawControls = useThree((s) => s.controls)
  const controls = isRigControls(rawControls) ? rawControls : null
  const lens = useObservatory((s) => s.lens)
  const selected = useObservatory((s) => s.selected)
  const tracedAt = useObservatory((s) => s.trustCheck?.tracedAt ?? null)
  const reduced = usePrefersReducedMotion()
  const flight = useRef<Flight | null>(null)
  const resumeAutoRotate = useRef(false)
  const introduced = useRef(false)
  const userMoved = useRef(false)
  const size = useThree((s) => s.size)
  const aspect = size.width / Math.max(1, size.height)
  const aspectRef = useRef(aspect)
  aspectRef.current = aspect
  const sizeRef = useRef(size)
  sizeRef.current = size

  useEffect(() => {
    if (!controls) return
    const yieldToUser = () => {
      userMoved.current = true
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
    const overview = overviewOf(framePoints(layout, ids), lens, camera.fov, aspectRef.current)
    Object.assign(controls, zoomLimits(overview.distance, camera.fov))
    userMoved.current = false

    const entity = selected ? useObservatory.getState().model?.entities.get(selected) : undefined
    const focusAt = entity ? layout.positions.get(entity.id) : undefined
    let toTarget = overview.target
    let toPosition = overview.position
    if (entity && focusAt) {
      toTarget = new Vector3(...focusAt)
      const heading =
        lens === 'trust' ? FLAT_DIRECTION.clone() : camera.position.clone().sub(controls.target).normalize()
      const model = useObservatory.getState().model
      const related = model ? framePoints({ ...layout, rings: [] }, focusFrameIds(model, entity.id)) : []
      const distance = focusFrameDistance(
        entity.kind,
        lens,
        toTarget,
        related,
        heading,
        camera.fov,
        unoccludedAspect(sizeRef.current.width, sizeRef.current.height)
      )
      toPosition = toTarget.clone().addScaledVector(heading, distance)
    }

    const intro = !introduced.current
    introduced.current = true
    if (!flight.current) resumeAutoRotate.current = controls.autoRotate && !entity
    controls.autoRotate = false
    if (intro && reduced) {
      camera.position.copy(toPosition)
      controls.target.copy(toTarget)
      controls.autoRotate = resumeAutoRotate.current
      flight.current = null
      return
    }
    const arc = intro && !entity && lens === 'network'
    if (arc) toPosition = introEnd(framePoints(layout, ids), camera.fov, aspectRef.current).position
    flight.current = {
      startedAt: intro ? null : performance.now(),
      arc,
      duration: reduced ? REDUCED_FLIGHT_MS : intro ? INTRO_MS : FLIGHT_MS,
      fromPosition: intro ? INTRO_FROM.clone() : camera.position.clone(),
      fromTarget: intro ? overview.target.clone() : controls.target.clone(),
      toPosition,
      toTarget,
    }
  }, [lens, selected, controls, camera, ids, reduced])

  useEffect(() => {
    const { model, trustCheck } = useObservatory.getState()
    const layout = ensureLayout(lens)
    const path = model ? traceablePath(trustCheck?.result ?? null, model) : null
    if (tracedAt === null || !path || !layout || !controls || !(camera instanceof PerspectiveCamera)) return
    const heading = lens === 'trust' ? FLAT_DIRECTION.clone() : camera.position.clone().sub(controls.target).normalize()
    const frame = traceFrame(
      framePoints({ ...layout, rings: [] }, path),
      heading,
      camera.fov,
      unoccludedAspect(sizeRef.current.width, sizeRef.current.height)
    )
    controls.autoRotate = false
    resumeAutoRotate.current = false
    flight.current = {
      startedAt: performance.now(),
      duration: reduced ? REDUCED_FLIGHT_MS : FLIGHT_MS,
      fromPosition: camera.position.clone(),
      fromTarget: controls.target.clone(),
      toPosition: frame.position,
      toTarget: frame.target,
    }
  }, [tracedAt, lens, controls, camera, reduced])

  useEffect(() => {
    const layout = ensureLayout(lens)
    if (!layout || !controls || !(camera instanceof PerspectiveCamera) || !introduced.current) return
    const overview = overviewOf(framePoints(layout, ids), lens, camera.fov, aspect)
    Object.assign(controls, zoomLimits(overview.distance, camera.fov))
    if (useObservatory.getState().selected || userMoved.current || flight.current) return
    flight.current = {
      startedAt: performance.now(),
      duration: REDUCED_FLIGHT_MS,
      fromPosition: camera.position.clone(),
      fromTarget: controls.target.clone(),
      toPosition: overview.position,
      toTarget: overview.target,
    }
  }, [aspect, lens, controls, camera, ids])

  useFrame(() => {
    const current = flight.current
    if (!current || !controls) return
    current.startedAt ??= performance.now()
    const t = easeInOutCubic(Math.min(1, (performance.now() - current.startedAt) / current.duration))
    if (current.arc) camera.position.copy(introPosition(current.fromPosition, current.toPosition, current.toTarget, t))
    else camera.position.lerpVectors(current.fromPosition, current.toPosition, t)
    controls.target.lerpVectors(current.fromTarget, current.toTarget, t)
    if (t < 1) return
    flight.current = null
    controls.autoRotate = resumeAutoRotate.current
  }, -2)

  return null
}
