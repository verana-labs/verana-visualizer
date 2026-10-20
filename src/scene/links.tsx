'use client'

import { useFrame } from '@react-three/fiber'
import { type RefObject, useLayoutEffect, useMemo } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  type Color,
  DynamicDrawUsage,
  LineBasicMaterial,
} from 'three'
import type { EntityId } from '@/domain/network-model'
import { useObservatory } from '@/store/observatory-store'
import { agentTint, type SceneData } from './scene-data'
import type { FocusSets } from './scene-focus'
import type { PositionOf } from './use-lens-tween'

const VALIDATOR_OPACITY = 0.38
const AGENT_OPACITY = 0.5
const AGENT_IDLE = 0.035
const AGENT_LIT = 0.9
const AGENT_RELATED = 0.7
const AGENT_UNRELATED = 0.02

interface LinksProps {
  data: SceneData
  positionOf: PositionOf
  focus: RefObject<FocusSets>
}

const both = (set: Set<EntityId> | null, a: EntityId, b: EntityId) => !!set && set.has(a) && set.has(b)

function validatorStrength({ related, hover }: FocusSets, a: EntityId, b: EntityId): number {
  if (related) return both(related, a, b) ? 0.6 : 0.05
  if (hover) return both(hover, a, b) ? 1.5 : 0.25
  return 0.6
}

function agentStrength({ related, hover }: FocusSets, a: EntityId, b: EntityId): number {
  if (related) return both(related, a, b) ? AGENT_RELATED : AGENT_UNRELATED
  return both(hover, a, b) ? AGENT_LIT : AGENT_IDLE
}

export function Links({ data, positionOf, focus }: LinksProps) {
  const total = data.validatorLinks.length + data.agentLinks.length
  const { geometry, positions, colors } = useMemo(() => {
    const positions = new Float32Array(Math.max(1, total) * 6)
    const colors = new Float32Array(Math.max(1, total) * 6)
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(positions, 3).setUsage(DynamicDrawUsage))
    geometry.setAttribute('color', new BufferAttribute(colors, 3).setUsage(DynamicDrawUsage))
    geometry.setDrawRange(0, total * 2)
    return { geometry, positions, colors }
  }, [total])
  const material = useMemo(
    () =>
      new LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending }),
    []
  )
  const colorOf = useMemo(() => new Map(data.nodes.map((node) => [node.entity.id, node.color])), [data.nodes])

  useLayoutEffect(() => () => geometry.dispose(), [geometry])
  useLayoutEffect(() => () => material.dispose(), [material])

  useFrame(() => {
    const sets = focus.current
    const { agentVerdicts } = useObservatory.getState()
    const write = (i: number, a: EntityId, b: EntityId, ca: Color, cb: Color, ka: number, kb: number) => {
      positions.set(positionOf(a), i * 6)
      positions.set(positionOf(b), i * 6 + 3)
      colors.set([ca.r * ka, ca.g * ka, ca.b * ka, cb.r * kb, cb.g * kb, cb.b * kb], i * 6)
    }
    data.validatorLinks.forEach(([a, b], i) => {
      const ca = colorOf.get(a)
      const cb = colorOf.get(b)
      if (!ca || !cb) throw new Error(`Link ${a} → ${b} joins an unrendered node`)
      const k = validatorStrength(sets, a, b) * VALIDATOR_OPACITY
      write(i, a, b, ca, cb, k, k)
    })
    const offset = data.validatorLinks.length
    data.agentLinks.forEach(([agent, anchor], i) => {
      const tint = agentTint(agentVerdicts.get(agent))
      const k = agentStrength(sets, agent, anchor) * AGENT_OPACITY
      write(offset + i, agent, anchor, tint, tint, k, k * 0.3)
    })
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true
  })

  return <lineSegments geometry={geometry} material={material} frustumCulled={false} />
}
