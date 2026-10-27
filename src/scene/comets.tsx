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
  cometBrightness,
  cometLift,
  cometProgress,
  enqueueComets,
  TRAIL_POINTS,
  TRAIL_SPACING,
} from './comet-system'
import { useGlowTexture } from './glow-texture'
import { easeInOutCubic, type PositionOf, useCoreTween } from './use-lens-tween'
import { usePrefersReducedMotion } from './use-reduced-motion'

const HEAD_SCALE = 5

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
  const scratch = useRef({ point: [0, 0, 0] as [number, number, number], color: new Color() })
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
    if (active.current.length === 0 && !slots[0].line.visible) return
    const now = performance.now()
    const { lens, flash } = useObservatory.getState()
    const { point, color } = scratch.current
    const flying = active.current.filter((comet) => {
      if (cometProgress(comet, now, reduced) < 1) return true
      flash(comet.target)
      return false
    })
    active.current = flying
    const core = flying.length > 0 ? coreAt() : null
    const lift = cometLift(lens)

    slots.forEach((slot, i) => {
      const comet = flying[i]
      const t = comet ? cometProgress(comet, now, reduced) : -1
      const visible = !!comet && !!core && t >= 0
      slot.line.visible = visible
      slot.head.visible = visible
      if (!visible || !core) return
      const target = positionOf(comet.target)
      const eased = easeInOutCubic(t)
      color.set(comet.color).multiplyScalar(cometBrightness(lens, comet.color))
      const { positions, colors } = slot
      for (let k = 0; k < TRAIL_POINTS; k++) {
        bezierPoint(core, target, Math.max(0, eased - k * TRAIL_SPACING), lift, point)
        const o = k * 3
        positions[o] = point[0]
        positions[o + 1] = point[1]
        positions[o + 2] = point[2]
        const fade = 1 - k / TRAIL_POINTS
        colors[o] = color.r * fade
        colors[o + 1] = color.g * fade
        colors[o + 2] = color.b * fade
      }
      slot.line.geometry.attributes.position.needsUpdate = true
      slot.line.geometry.attributes.color.needsUpdate = true
      bezierPoint(core, target, eased, lift, point)
      slot.head.position.set(point[0], point[1], point[2])
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
