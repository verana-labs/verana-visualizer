'use client'

import { useFrame } from '@react-three/fiber'
import { type RefObject, useLayoutEffect, useMemo, useRef } from 'react'
import {
  Color,
  Euler,
  type InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  OctahedronGeometry,
  Quaternion,
  TorusGeometry,
  Vector3,
} from 'three'
import type { Entity } from '@/domain/network-model'
import { useObservatory } from '@/store/observatory-store'
import { AGENT_SIZE, agentTint } from './scene-data'
import { dimOf, type FocusSets, flashOf } from './scene-focus'
import type { PositionOf } from './use-lens-tween'
import { usePicking } from './use-picking'

const BOB = 0.35
const WHITE = new Color('#ffffff')

interface AgentsProps {
  agents: Entity[]
  positionOf: PositionOf
  focus: RefObject<FocusSets>
}

export function Agents({ agents, positionOf, focus }: AgentsProps) {
  const diamonds = useRef<InstancedMesh>(null)
  const rings = useRef<InstancedMesh>(null)
  const assets = useMemo(
    () => ({
      diamond: new OctahedronGeometry(1, 0),
      ring: new TorusGeometry(1.75, 0.06, 6, 48),
      diamondMaterial: new MeshBasicMaterial(),
      ringMaterial: new MeshBasicMaterial({ transparent: true, opacity: 0.7 }),
    }),
    []
  )
  const scratch = useMemo(
    () => ({
      m: new Matrix4(),
      q: new Quaternion(),
      e: new Euler(),
      p: new Vector3(),
      s: new Vector3(),
      c: new Color(),
    }),
    []
  )
  const count = Math.max(1, agents.length)
  const ids = useMemo(() => agents.map((agent) => agent.id), [agents])
  const picking = usePicking(ids)

  useLayoutEffect(() => {
    for (const mesh of [diamonds.current, rings.current])
      for (let i = 0; mesh && i < agents.length; i++) mesh.setColorAt(i, agentTint(undefined))
  }, [agents])

  useLayoutEffect(
    () => () => {
      for (const disposable of Object.values(assets)) disposable.dispose()
    },
    [assets]
  )

  useFrame(() => {
    const diamondMesh = diamonds.current
    const ringMesh = rings.current
    if (!diamondMesh?.instanceColor || !ringMesh?.instanceColor) return
    const now = performance.now()
    const { hovered, selected, agentVerdicts } = useObservatory.getState()
    const { m, q, e, p, s, c } = scratch
    agents.forEach((agent, i) => {
      const id = agent.id
      const flash = flashOf(id, now)
      const [x, y, z] = positionOf(id)
      p.set(x, y + Math.sin(now / 1100 + i) * BOB, z)
      s.setScalar(AGENT_SIZE * (1 + flash) * (id === hovered && id !== selected ? 1.4 : 1))
      m.compose(p, q.setFromEuler(e.set(0, now * 0.0012 + i, 0)), s)
      diamondMesh.setMatrixAt(i, m)
      m.compose(p, q.setFromEuler(e.set(Math.PI / 2 + Math.sin(now / 1500 + i) * 0.5, now * 0.0008 + i, 0)), s)
      ringMesh.setMatrixAt(i, m)
      c.copy(agentTint(agentVerdicts.get(id))).multiplyScalar(dimOf(focus.current, id))
      if (flash > 0) c.lerp(WHITE, flash * 0.7)
      diamondMesh.setColorAt(i, c)
      ringMesh.setColorAt(i, c.multiplyScalar(0.7))
    })
    for (const mesh of [diamondMesh, ringMesh]) {
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
    diamondMesh.computeBoundingSphere()
  })

  return (
    <group key={agents.length}>
      <instancedMesh
        ref={diamonds}
        args={[assets.diamond, assets.diamondMaterial, count]}
        count={agents.length}
        frustumCulled={false}
        {...picking}
      />
      <instancedMesh
        ref={rings}
        args={[assets.ring, assets.ringMaterial, count]}
        count={agents.length}
        frustumCulled={false}
      />
    </group>
  )
}
