'use client'

import { useFrame } from '@react-three/fiber'
import { type RefObject, useLayoutEffect, useMemo, useRef } from 'react'
import { Color, type InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, SphereGeometry, Vector3 } from 'three'
import { useObservatory } from '@/store/observatory-store'
import type { SceneNode } from './scene-data'
import { dimOf, type FocusSets, flashOf } from './scene-focus'
import type { PositionOf } from './use-lens-tween'

interface NodesProps {
  nodes: SceneNode[]
  positionOf: PositionOf
  focus: RefObject<FocusSets>
}

const FLASH_WHITE = new Color('#ffffff').multiplyScalar(1.5)

export function Nodes({ nodes, positionOf, focus }: NodesProps) {
  const mesh = useRef<InstancedMesh>(null)
  const geometry = useMemo(() => new SphereGeometry(1, 24, 16), [])
  const material = useMemo(() => new MeshBasicMaterial(), [])
  const scratch = useMemo(
    () => ({ m: new Matrix4(), q: new Quaternion(), p: new Vector3(), s: new Vector3(), c: new Color() }),
    []
  )

  useLayoutEffect(() => {
    const instances = mesh.current
    if (!instances) return
    nodes.forEach((node, i) => {
      instances.setColorAt(i, node.color)
    })
  }, [nodes])

  useLayoutEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material]
  )

  useFrame(() => {
    const instances = mesh.current
    if (!instances?.instanceColor) return
    const now = performance.now()
    const { hovered, selected } = useObservatory.getState()
    const pulse = 0.5 + 0.5 * Math.sin(now / 420)
    const { m, q, p, s, c } = scratch
    nodes.forEach((node, i) => {
      const id = node.entity.id
      const flash = flashOf(id, now)
      const scale =
        node.size * (1 + flash * 1.4) * (id === hovered ? 1.35 : 1) * (id === selected ? 1.25 + 0.15 * pulse : 1)
      p.set(...positionOf(id))
      m.compose(p, q, s.setScalar(scale))
      instances.setMatrixAt(i, m)
      c.copy(node.color).multiplyScalar(dimOf(focus.current, id))
      if (flash > 0) c.lerp(FLASH_WHITE, flash * 0.8)
      instances.setColorAt(i, c)
    })
    instances.instanceMatrix.needsUpdate = true
    instances.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh
      key={nodes.length}
      ref={mesh}
      args={[geometry, material, Math.max(1, nodes.length)]}
      count={nodes.length}
      frustumCulled={false}
    />
  )
}
