'use client'

import { useFrame } from '@react-three/fiber'
import { type RefObject, useLayoutEffect, useMemo, useRef } from 'react'
import { Color, type InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, SphereGeometry, Vector3 } from 'three'
import type { EntityId } from '@/domain/network-model'
import { useObservatory } from '@/store/observatory-store'
import { useLensSize } from './lens-size'
import { MAX_STAR_SIZE, type SceneNode } from './scene-data'
import { dimOf, type FocusSets, flashOf } from './scene-focus'
import type { PositionOf } from './use-lens-tween'
import { usePicking } from './use-picking'
import { useTimePresence } from './use-time-presence'

interface NodesProps {
  nodes: SceneNode[]
  positionOf: PositionOf
  focus: RefObject<FocusSets>
}

const HOVER_GROWTH = 1.35
const FLASH_GROWTH = 1.4
const FLASH_WHITE = new Color('#ffffff').multiplyScalar(1.5)

export function nodeScale(
  node: SceneNode,
  flash: number,
  hovered: EntityId | 'rocket' | null,
  selected: EntityId | null,
  size = node.size
): number {
  const id = node.entity.id
  const hoverGrowth = id === hovered && id !== selected ? HOVER_GROWTH : 1
  const grown = size * (1 + flash * FLASH_GROWTH) * hoverGrowth
  return node.entity.kind === 'ecosystem' ? Math.min(MAX_STAR_SIZE, grown) : grown
}

export function Nodes({ nodes, positionOf, focus }: NodesProps) {
  const mesh = useRef<InstancedMesh>(null)
  const geometry = useMemo(() => new SphereGeometry(1, 24, 16), [])
  const material = useMemo(() => new MeshBasicMaterial(), [])
  const ids = useMemo(() => nodes.map((node) => node.entity.id), [nodes])
  const picking = usePicking(ids)
  const sizeOf = useLensSize()
  const presenceOf = useTimePresence()
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
    const { m, q, p, s, c } = scratch
    nodes.forEach((node, i) => {
      const id = node.entity.id
      const flash = flashOf(id, now)
      const presence = presenceOf(id)
      const scale = nodeScale(node, flash, hovered, selected, sizeOf(id, node.size)) * presence
      p.set(...positionOf(id))
      m.compose(p, q, s.setScalar(scale))
      instances.setMatrixAt(i, m)
      c.copy(node.color).multiplyScalar(dimOf(focus.current, id) * presence)
      if (flash > 0) c.lerp(FLASH_WHITE, flash * 0.8)
      instances.setColorAt(i, c)
    })
    instances.instanceMatrix.needsUpdate = true
    instances.instanceColor.needsUpdate = true
    instances.computeBoundingSphere()
  })

  return (
    <instancedMesh
      key={nodes.length}
      ref={mesh}
      args={[geometry, material, Math.max(1, nodes.length)]}
      count={nodes.length}
      frustumCulled={false}
      {...picking}
    />
  )
}
