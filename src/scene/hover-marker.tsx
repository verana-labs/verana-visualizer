'use client'

import { useCursor } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, DoubleSide, type Mesh, MeshBasicMaterial, RingGeometry } from 'three'
import { useObservatory } from '@/store/observatory-store'
import type { SceneMarks } from './scene-data'
import type { PositionOf } from './use-lens-tween'
import { usePrefersReducedMotion } from './use-reduced-motion'

const EASE_PER_60FPS_FRAME = 0.18
const RING_OPACITY = 0.75
const ARC_OPACITY = 0.5

const markerMaterial = () =>
  new MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    side: DoubleSide,
    depthWrite: false,
    blending: AdditiveBlending,
  })

export function HoverMarker({ marks, positionOf }: { marks: SceneMarks; positionOf: PositionOf }) {
  const hovered = useObservatory((s) => s.hovered)
  const reduced = usePrefersReducedMotion()
  const ring = useRef<Mesh>(null)
  const arc = useRef<Mesh>(null)
  const amount = useRef(0)
  const lastSize = useRef(1)
  const assets = useMemo(
    () => ({
      ringGeometry: new RingGeometry(1.32, 1.4, 72),
      arcGeometry: new RingGeometry(1.62, 1.7, 48, 1, 0, Math.PI * 1.25),
      ringMaterial: markerMaterial(),
      arcMaterial: markerMaterial(),
    }),
    []
  )
  useCursor(hovered !== null)

  useLayoutEffect(
    () => () => {
      for (const disposable of Object.values(assets)) disposable.dispose()
    },
    [assets]
  )

  useFrame(({ camera }, delta) => {
    const ringMesh = ring.current
    const arcMesh = arc.current
    if (!ringMesh || !arcMesh) return
    const now = performance.now()
    const id = useObservatory.getState().hovered
    const mark = id && id !== 'rocket' ? marks.get(id) : undefined
    const ease = 1 - (1 - EASE_PER_60FPS_FRAME) ** (delta * 60)
    amount.current += ((mark ? 1 : 0) - amount.current) * ease
    if (mark && id && id !== 'rocket') {
      const position = positionOf(id)
      ringMesh.position.set(...position)
      arcMesh.position.set(...position)
      assets.ringMaterial.color.copy(mark.color)
      assets.arcMaterial.color.copy(mark.color)
      lastSize.current = mark.size
    }
    const breathe = reduced ? 1.15 : 1.15 + 0.06 * Math.sin(now / 260)
    const scale = lastSize.current * breathe * (0.75 + 0.25 * amount.current)
    for (const mesh of [ringMesh, arcMesh]) {
      mesh.quaternion.copy(camera.quaternion)
      mesh.scale.setScalar(scale)
    }
    if (!reduced) arcMesh.rotateZ(now / 700)
    assets.ringMaterial.opacity = RING_OPACITY * amount.current
    assets.arcMaterial.opacity = ARC_OPACITY * amount.current
    ringMesh.visible = arcMesh.visible = amount.current > 0.01
  })

  return (
    <>
      <mesh ref={ring} geometry={assets.ringGeometry} material={assets.ringMaterial} frustumCulled={false} />
      <mesh ref={arc} geometry={assets.arcGeometry} material={assets.arcMaterial} frustumCulled={false} />
    </>
  )
}
