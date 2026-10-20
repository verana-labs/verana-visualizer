'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, Color, DoubleSide, type Mesh, MeshBasicMaterial, RingGeometry } from 'three'
import type { EntityId } from '@/domain/network-model'
import { AGENT_COLORS } from '@/domain/roles'
import { useObservatory } from '@/store/observatory-store'
import type { SceneMarks } from './scene-data'
import type { PositionOf } from './use-lens-tween'
import { usePrefersReducedMotion } from './use-reduced-motion'

const POOL = 12
const RIPPLE_MS = 900
const WHITE = new Color('#ffffff')
const AGENT_RIPPLE = new Color(AGENT_COLORS.trusted)

interface Ripple {
  id: EntityId
  startedAt: number
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3

export function Ripples({ marks, positionOf }: { marks: SceneMarks; positionOf: PositionOf }) {
  const reduced = usePrefersReducedMotion()
  const meshes = useRef<(Mesh | null)[]>([])
  const active = useRef<(Ripple | null)[]>(Array.from({ length: POOL }, () => null))
  const next = useRef(0)
  const assets = useMemo(
    () => ({
      geometry: new RingGeometry(0.92, 1, 64),
      slots: Array.from({ length: POOL }, (_, i) => ({
        key: `ripple-${i}`,
        material: new MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          side: DoubleSide,
          depthWrite: false,
          blending: AdditiveBlending,
        }),
      })),
    }),
    []
  )

  useLayoutEffect(
    () => () => {
      assets.geometry.dispose()
      for (const slot of assets.slots) slot.material.dispose()
    },
    [assets]
  )

  useEffect(() => {
    const start = (id: EntityId, color: Color) => {
      const slot = next.current
      next.current = (slot + 1) % POOL
      active.current[slot] = { id, startedAt: performance.now() }
      assets.slots[slot].material.color.copy(color)
    }
    return useObservatory.subscribe((state, previous) => {
      if (reduced) return
      if (state.selected && state.selected !== previous.selected)
        start(state.selected, state.selected.startsWith('agent:') ? AGENT_RIPPLE : WHITE)
      if (state.flashes === previous.flashes) return
      for (const [id, at] of state.flashes) {
        const mark = marks.get(id)
        if (mark && previous.flashes.get(id) !== at) start(id, mark.color)
      }
    })
  }, [reduced, assets, marks])

  useFrame(({ camera }) => {
    const now = performance.now()
    active.current.forEach((ripple, i) => {
      const mesh = meshes.current[i]
      if (!mesh) return
      const t = ripple ? (now - ripple.startedAt) / RIPPLE_MS : 1
      const mark = ripple ? marks.get(ripple.id) : undefined
      if (!ripple || !mark || t >= 1) {
        active.current[i] = null
        mesh.visible = false
        return
      }
      mesh.visible = true
      mesh.position.set(...positionOf(ripple.id))
      mesh.quaternion.copy(camera.quaternion)
      mesh.scale.setScalar(mark.size * (1.6 + easeOutCubic(t) * 7))
      assets.slots[i].material.opacity = 0.8 * (1 - t)
    })
  })

  return (
    <>
      {assets.slots.map(({ key, material }, i) => (
        <mesh
          key={key}
          ref={(mesh) => {
            meshes.current[i] = mesh
          }}
          geometry={assets.geometry}
          material={material}
          visible={false}
          frustumCulled={false}
        />
      ))}
    </>
  )
}
