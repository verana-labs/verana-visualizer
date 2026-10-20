'use client'

import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, DoubleSide, type Group, MeshBasicMaterial, RingGeometry } from 'three'
import type { EntityId } from '@/domain/network-model'
import { useObservatory } from '@/store/observatory-store'
import { useLensSize } from './lens-size'
import type { SceneNode } from './scene-data'
import { type PositionOf, tweenProgress } from './use-lens-tween'
import { usePrefersReducedMotion } from './use-reduced-motion'

const GOLD = '#fbbf24'
const RING_GAP = 1.55
const FILL_OPACITY = 0.45
const TRACK_OPACITY = 0.14

interface Gauge {
  id: EntityId
  base: number
  fill: RingGeometry
}

export function Reservoirs({ stars, positionOf }: { stars: SceneNode[]; positionOf: PositionOf }) {
  const fills = useObservatory((s) => s.economics?.fills)
  const reduced = usePrefersReducedMotion()
  const sizeOf = useLensSize()
  const groups = useRef<(Group | null)[]>([])
  const track = useMemo(() => new RingGeometry(0.995, 1.035, 96), [])
  const materials = useMemo(
    () => ({
      fill: new MeshBasicMaterial({
        color: GOLD,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
        opacity: FILL_OPACITY,
      }),
      track: new MeshBasicMaterial({
        color: GOLD,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
        opacity: TRACK_OPACITY,
      }),
    }),
    []
  )
  const gauges = useMemo<Gauge[]>(
    () =>
      stars.flatMap((star) => {
        const share = fills?.get(star.entity.id)
        if (share === undefined) return []
        const fill = new RingGeometry(0.98, 1.05, 96, 1, Math.PI / 2, -share * Math.PI * 2)
        return [{ id: star.entity.id, base: star.size, fill }]
      }),
    [stars, fills]
  )

  useLayoutEffect(
    () => () => {
      for (const gauge of gauges) gauge.fill.dispose()
    },
    [gauges]
  )
  useLayoutEffect(
    () => () => {
      track.dispose()
      materials.fill.dispose()
      materials.track.dispose()
    },
    [track, materials]
  )

  useFrame(({ camera }) => {
    const { lens, lensFrom, lensChangedAt } = useObservatory.getState()
    const progress = tweenProgress(performance.now(), lensChangedAt, 0, reduced)
    const from = lensFrom === 'economics' ? 1 : 0
    const shown = from + ((lens === 'economics' ? 1 : 0) - from) * progress
    materials.fill.opacity = FILL_OPACITY * shown
    materials.track.opacity = TRACK_OPACITY * shown
    gauges.forEach((gauge, i) => {
      const group = groups.current[i]
      if (!group) return
      group.visible = shown > 0
      group.position.set(...positionOf(gauge.id))
      group.quaternion.copy(camera.quaternion)
      group.scale.setScalar(sizeOf(gauge.id, gauge.base) * RING_GAP)
    })
  })

  return (
    <>
      {gauges.map((gauge, i) => (
        <group
          key={gauge.id}
          visible={false}
          ref={(group) => {
            groups.current[i] = group
          }}
        >
          <mesh geometry={track} material={materials.track} />
          <mesh geometry={gauge.fill} material={materials.fill} />
        </group>
      ))}
    </>
  )
}
