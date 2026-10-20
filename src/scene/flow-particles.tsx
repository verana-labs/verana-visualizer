'use client'

import { useFrame } from '@react-three/fiber'
import { type RefObject, useLayoutEffect, useMemo } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, type Color, DynamicDrawUsage, PointsMaterial } from 'three'
import type { EntityId } from '@/domain/network-model'
import { seededRandom } from '@/layouts/seed'
import { useObservatory } from '@/store/observatory-store'
import { useGlowTexture } from './glow-texture'
import { agentTint, type SceneData } from './scene-data'
import type { FocusSets } from './scene-focus'
import type { PositionOf } from './use-lens-tween'

const PER_LINK = 2
const SPEED = 0.00016
const HOT_SPEED = 2.2

interface FlowParticlesProps {
  data: SceneData
  positionOf: PositionOf
  focus: RefObject<FocusSets>
}

function strength({ related, hover, trace }: FocusSets, a: EntityId, b: EntityId): { k: number; hot: boolean } {
  if (trace) return trace.has(a) && trace.has(b) ? { k: 2.4, hot: true } : { k: 0.03, hot: false }
  const hot = !!hover && hover.has(a) && hover.has(b)
  if (related) return { k: related.has(a) && related.has(b) ? 1 : 0.04, hot }
  if (hover) return { k: hot ? 2.4 : 0.35, hot }
  return { k: 1, hot }
}

export function FlowParticles({ data, positionOf, focus }: FlowParticlesProps) {
  const texture = useGlowTexture()
  const pairs = useMemo(() => [...data.validatorLinks, ...data.agentLinks], [data])
  const colorOf = useMemo(() => new Map(data.nodes.map((node) => [node.entity.id, node.color])), [data.nodes])
  const { geometry, positions, colors, offsets } = useMemo(() => {
    const total = Math.max(1, pairs.length * PER_LINK)
    const positions = new Float32Array(total * 3)
    const colors = new Float32Array(total * 3)
    const offsets = Float32Array.from({ length: total }, (_, j) => seededRandom(`flow:${j}`)())
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(positions, 3).setUsage(DynamicDrawUsage))
    geometry.setAttribute('color', new BufferAttribute(colors, 3).setUsage(DynamicDrawUsage))
    geometry.setDrawRange(0, pairs.length * PER_LINK)
    return { geometry, positions, colors, offsets }
  }, [pairs])
  const material = useMemo(
    () =>
      new PointsMaterial({
        size: 1.1,
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
    const now = performance.now()
    const sets = focus.current
    const { agentVerdicts } = useObservatory.getState()
    pairs.forEach(([child, parent], i) => {
      const from = positionOf(child)
      const to = positionOf(parent)
      const color: Color = colorOf.get(child) ?? agentTint(agentVerdicts.get(child))
      const { k, hot } = strength(sets, child, parent)
      for (let q = 0; q < PER_LINK; q++) {
        const j = i * PER_LINK + q
        const f = (now * SPEED * (0.6 + offsets[j] * 0.8) * (hot ? HOT_SPEED : 1) + offsets[j] + q / PER_LINK) % 1
        positions[j * 3] = from[0] + (to[0] - from[0]) * f
        positions[j * 3 + 1] = from[1] + (to[1] - from[1]) * f
        positions[j * 3 + 2] = from[2] + (to[2] - from[2]) * f
        const fade = Math.sin(Math.PI * f) * 0.5 * k
        colors[j * 3] = color.r * fade
        colors[j * 3 + 1] = color.g * fade
        colors[j * 3 + 2] = color.b * fade
      }
    })
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true
  })

  return <points geometry={geometry} material={material} frustumCulled={false} />
}
