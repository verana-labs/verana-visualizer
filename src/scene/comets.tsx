'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Line,
  LineBasicMaterial,
  Sprite,
  SpriteMaterial,
} from 'three'
import { useObservatory } from '@/store/observatory-store'
import {
  bezierPoint,
  COMET_CAP,
  type Comet,
  cometLift,
  cometProgress,
  enqueueComets,
  TRAIL_POINTS,
  TRAIL_SPACING,
} from './comet-system'
import { useGlowTexture } from './glow-texture'
import { type PositionOf, useCoreTween } from './use-lens-tween'
import { usePrefersReducedMotion } from './use-reduced-motion'

const HEAD_SCALE = 5

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

interface Slot {
  line: Line<BufferGeometry, LineBasicMaterial>
  head: Sprite
  positions: Float32Array
  colors: Float32Array
}

export function Comets({ positionOf }: { positionOf: PositionOf }) {
  const reduced = usePrefersReducedMotion()
  const coreAt = useCoreTween()
  const glow = useGlowTexture()
  const active = useRef<Comet[]>([])
  const slots = useMemo<Slot[]>(
    () =>
      Array.from({ length: COMET_CAP }, () => {
        const positions = new Float32Array(TRAIL_POINTS * 3)
        const colors = new Float32Array(TRAIL_POINTS * 3)
        const geometry = new BufferGeometry()
        geometry.setAttribute('position', new BufferAttribute(positions, 3).setUsage(DynamicDrawUsage))
        geometry.setAttribute('color', new BufferAttribute(colors, 3).setUsage(DynamicDrawUsage))
        const line = new Line(
          geometry,
          new LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            depthWrite: false,
            blending: AdditiveBlending,
          })
        )
        const head = new Sprite(
          new SpriteMaterial({ map: glow, blending: AdditiveBlending, depthWrite: false, transparent: true })
        )
        head.scale.setScalar(HEAD_SCALE)
        line.visible = false
        head.visible = false
        line.frustumCulled = false
        return { line, head, positions, colors }
      }),
    [glow]
  )

  useLayoutEffect(
    () => () => {
      for (const { line, head } of slots) {
        line.geometry.dispose()
        line.material.dispose()
        head.material.dispose()
      }
    },
    [slots]
  )

  useEffect(
    () =>
      useObservatory.subscribe((state, previous) => {
        const { cometLaunch, model } = state
        if (!cometLaunch || !model || cometLaunch === previous.cometLaunch) return
        const launches = cometLaunch.filter((launch) => model.entities.has(launch.target))
        active.current = enqueueComets(active.current, launches, performance.now(), reduced)
      }),
    [reduced]
  )

  useFrame(() => {
    const now = performance.now()
    const { lens, flash } = useObservatory.getState()
    const core = active.current.length > 0 ? coreAt() : null
    const lift = cometLift(lens)
    const point: [number, number, number] = [0, 0, 0]
    const color = new Color()
    const flying: Comet[] = []

    for (const comet of active.current) {
      const t = cometProgress(comet, now, reduced)
      if (t >= 1) flash(comet.target)
      else flying.push(comet)
    }
    active.current = flying

    slots.forEach((slot, i) => {
      const comet = flying[i]
      const t = comet ? cometProgress(comet, now, reduced) : -1
      const visible = !!comet && !!core && t >= 0
      slot.line.visible = visible
      slot.head.visible = visible
      if (!visible || !core) return
      const target = positionOf(comet.target)
      const eased = easeInOutCubic(t)
      color.set(comet.color)
      for (let k = 0; k < TRAIL_POINTS; k++) {
        bezierPoint(core, target, Math.max(0, eased - k * TRAIL_SPACING), lift, point)
        slot.positions.set(point, k * 3)
        const fade = 1 - k / TRAIL_POINTS
        slot.colors.set([color.r * fade, color.g * fade, color.b * fade], k * 3)
      }
      slot.line.geometry.attributes.position.needsUpdate = true
      slot.line.geometry.attributes.color.needsUpdate = true
      slot.head.position.set(...bezierPoint(core, target, eased, lift, point))
      slot.head.material.color.copy(color)
    })
  })

  return (
    <>
      {slots.map((slot) => (
        <group key={slot.line.uuid}>
          <primitive object={slot.line} />
          <primitive object={slot.head} />
        </group>
      ))}
    </>
  )
}
