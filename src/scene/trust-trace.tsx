'use client'

import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, DynamicDrawUsage, PointsMaterial } from 'three'
import type { EntityId, NetworkModel } from '@/domain/network-model'
import { TRUST_HOP_MS, type TrustCheck } from '@/domain/trust-check'
import type { Vec3 } from '@/layouts/types'
import { useObservatory } from '@/store/observatory-store'
import { glowTexture } from './glow-texture'
import type { PositionOf } from './use-lens-tween'
import { usePrefersReducedMotion } from './use-reduced-motion'

const TRAIL = 12
const TRAIL_STEP_MS = 22
const SPARK_COLOR = new Color('#e8fbff').multiplyScalar(1.6)

export function sparkAt(segments: number, elapsedMs: number): { segment: number; t: number } | null {
  if (segments <= 0 || elapsedMs < 0) return null
  const progress = elapsedMs / TRUST_HOP_MS
  if (progress >= segments) return null
  const segment = Math.floor(progress)
  return { segment, t: progress - segment }
}

export function traceablePath(result: TrustCheck | null, model: NetworkModel): EntityId[] | null {
  if (!result) return null
  const path = result.path.filter((id) => model.entities.has(id))
  return path.length >= 2 ? path : null
}

function pointOn(path: EntityId[], positionOf: PositionOf, elapsedMs: number): Vec3 | null {
  const at = sparkAt(path.length - 1, elapsedMs)
  if (!at) return null
  const from = positionOf(path[at.segment])
  const to = positionOf(path[at.segment + 1])
  return [from[0] + (to[0] - from[0]) * at.t, from[1] + (to[1] - from[1]) * at.t, from[2] + (to[2] - from[2]) * at.t]
}

export function TrustTrace({ positionOf }: { positionOf: PositionOf }) {
  const texture = glowTexture()
  const reduced = usePrefersReducedMotion()
  const reached = useRef<{ tracedAt: number | null; hop: number }>({ tracedAt: null, hop: -1 })
  const { geometry, positions, colors } = useMemo(() => {
    const positions = new Float32Array(TRAIL * 3)
    const colors = new Float32Array(TRAIL * 3)
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(positions, 3).setUsage(DynamicDrawUsage))
    geometry.setAttribute('color', new BufferAttribute(colors, 3).setUsage(DynamicDrawUsage))
    geometry.setDrawRange(0, 0)
    return { geometry, positions, colors }
  }, [])
  const material = useMemo(
    () =>
      new PointsMaterial({
        size: 3.4,
        map: texture,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        sizeAttenuation: true,
      }),
    [texture]
  )

  useLayoutEffect(() => () => geometry.dispose(), [geometry])
  useLayoutEffect(() => () => material.dispose(), [material])

  useFrame(() => {
    const { trustCheck, model, flash } = useObservatory.getState()
    const path = model ? traceablePath(trustCheck?.result ?? null, model) : null
    const tracedAt = trustCheck?.tracedAt ?? null
    if (!path || tracedAt === null || reduced) {
      geometry.setDrawRange(0, 0)
      return
    }
    if (reached.current.tracedAt !== tracedAt) reached.current = { tracedAt, hop: -1 }
    const elapsed = performance.now() - tracedAt
    const at = sparkAt(path.length - 1, elapsed)
    const hop = at ? at.segment : path.length - 1
    while (reached.current.hop < hop) {
      reached.current.hop++
      flash(path[reached.current.hop])
    }
    if (!at) {
      geometry.setDrawRange(0, 0)
      return
    }
    let drawn = 0
    for (let k = 0; k < TRAIL; k++) {
      const point = pointOn(path, positionOf, Math.max(0, elapsed - k * TRAIL_STEP_MS))
      if (!point) break
      positions.set(point, drawn * 3)
      const fade = (1 - k / TRAIL) ** 2
      colors[drawn * 3] = SPARK_COLOR.r * fade
      colors[drawn * 3 + 1] = SPARK_COLOR.g * fade
      colors[drawn * 3 + 2] = SPARK_COLOR.b * fade
      drawn++
    }
    geometry.setDrawRange(0, drawn)
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true
  })

  return <points geometry={geometry} material={material} frustumCulled={false} />
}
