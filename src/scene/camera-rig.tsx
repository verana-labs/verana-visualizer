'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Box3, Vector3 } from 'three'
import type { EntityId } from '@/domain/network-model'
import type { Layout, LensId } from '@/layouts/types'
import { useObservatory } from '@/store/observatory-store'
import { ensureLayout } from './use-lens-tween'
import { usePrefersReducedMotion } from './use-reduced-motion'

const INTRO_FROM = new Vector3(0, 420, 900)
const INTRO_MS = 3200
const FLIGHT_MS = 1300

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
  addEventListener(type: 'start', listener: () => void): void
  removeEventListener(type: 'start', listener: () => void): void
}

const isRigControls = (value: unknown): value is RigControls =>
  typeof value === 'object' && value !== null && 'target' in value && 'autoRotate' in value

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

function overviewOf(layout: Layout, nodeIds: readonly EntityId[], lens: LensId) {
  const bounds = new Box3()
  const point = new Vector3()
  for (const id of nodeIds) {
    const position = layout.positions.get(id)
    if (position) bounds.expandByPoint(point.set(...position))
  }
  const center = bounds.getCenter(new Vector3())
  const size = bounds.getSize(new Vector3())
  const network = lens === 'network'
  const distance = Math.max(size.x, size.y, size.z, 40) * (network ? 0.95 : 0.85)
  const direction = new Vector3(0, network ? 0.5 : 0.05, 1).normalize()
  return { target: center, position: center.clone().addScaledVector(direction, distance) }
}

export function CameraRig({ nodeIds }: { nodeIds: readonly EntityId[] }) {
  const camera = useThree((s) => s.camera)
  const rawControls = useThree((s) => s.controls)
  const controls = isRigControls(rawControls) ? rawControls : null
  const lens = useObservatory((s) => s.lens)
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
    if (!layout || !controls) return
    const { target, position } = overviewOf(layout, nodeIds, lens)
    const intro = !introduced.current
    introduced.current = true
    if (!flight.current) resumeAutoRotate.current = controls.autoRotate
    controls.autoRotate = false
    flight.current = {
      startedAt: performance.now(),
      duration: reduced ? 1 : intro ? INTRO_MS : FLIGHT_MS,
      fromPosition: intro ? INTRO_FROM.clone() : camera.position.clone(),
      fromTarget: intro ? target.clone() : controls.target.clone(),
      toPosition: position,
      toTarget: target,
    }
  }, [lens, controls, camera, nodeIds, reduced])

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
