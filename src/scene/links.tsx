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
import { type FocusSets, flashOf } from './scene-focus'
import type { PositionOf } from './use-lens-tween'
import { useTimePresence } from './use-time-presence'

const VALIDATOR_OPACITY = 0.38
const AGENT_IDLE = 0.035
const AGENT_LIT = 0.9
const AGENT_RELATED = 0.25
const FLASH_BOOST = 1.6
const AGENT_FLASH_BOOST = 0.6
const TRACE_VALIDATOR = 2.2

interface LinksProps {
  data: SceneData
  positionOf: PositionOf
  focus: RefObject<FocusSets>
}

const both = (set: Set<EntityId> | null, a: EntityId, b: EntityId) => !!set && set.has(a) && set.has(b)

function validatorStrength({ related, hover, trace }: FocusSets, a: EntityId, b: EntityId): number {
  if (trace) return both(trace, a, b) ? TRACE_VALIDATOR : 0.03
  if (related) return both(related, a, b) ? 0.6 : 0.05
  if (hover) return both(hover, a, b) ? 1.5 : 0.25
  return 0.6
}

export function agentStrength({ related, hover, trace }: FocusSets, a: EntityId, b: EntityId): number {
  if (trace) return both(trace, a, b) ? AGENT_LIT : AGENT_IDLE / 2
  if (related) return both(related, a, b) ? AGENT_RELATED : AGENT_IDLE
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
  const presenceOf = useTimePresence()

  useLayoutEffect(() => () => geometry.dispose(), [geometry])
  useLayoutEffect(() => () => material.dispose(), [material])

  useFrame(() => {
    const now = performance.now()
    const sets = focus.current
    const { agentVerdicts } = useObservatory.getState()
    const write = (i: number, a: EntityId, b: EntityId, ca: Color, cb: Color, ka: number, kb: number) => {
      positions.set(positionOf(a), i * 6)
      positions.set(positionOf(b), i * 6 + 3)
      const o = i * 6
      colors[o] = ca.r * ka
      colors[o + 1] = ca.g * ka
      colors[o + 2] = ca.b * ka
      colors[o + 3] = cb.r * kb
      colors[o + 4] = cb.g * kb
      colors[o + 5] = cb.b * kb
    }
    data.validatorLinks.forEach(([a, b], i) => {
      const ca = colorOf.get(a)
      const cb = colorOf.get(b)
      if (!ca || !cb) throw new Error(`Link ${a} → ${b} joins an unrendered node`)
      const k =
        (validatorStrength(sets, a, b) * VALIDATOR_OPACITY + flashOf(a, now) * FLASH_BOOST) *
        Math.min(presenceOf(a), presenceOf(b))
      write(i, a, b, ca, cb, k, k)
    })
    const offset = data.validatorLinks.length
    data.agentLinks.forEach(([agent, anchor], i) => {
      const tint = agentTint(agentVerdicts.get(agent))
      const k =
        (agentStrength(sets, agent, anchor) + flashOf(agent, now) * AGENT_FLASH_BOOST) *
        Math.min(presenceOf(agent), presenceOf(anchor))
      write(offset + i, agent, anchor, tint, tint, k, k)
    })
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.color.needsUpdate = true
  })

  return <lineSegments geometry={geometry} material={material} frustumCulled={false} />
}
