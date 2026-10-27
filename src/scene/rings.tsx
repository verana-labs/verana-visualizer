'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, LineBasicMaterial, type LineSegments } from 'three'
import type { EntityId } from '@/domain/network-model'
import { FADE_MS, useTimeStore } from '@/features/time-scrubber/time-store'
import type { LensId, RingSpec } from '@/layouts/types'
import { useObservatory } from '@/store/observatory-store'
import { ensureLayout, tweenProgress } from './use-lens-tween'
import { usePrefersReducedMotion } from './use-reduced-motion'
import { useTimePresence } from './use-time-presence'

const SEGMENTS = 96
const RING_COLOR = '#b59cff'
const RING_OPACITY = 0.08
const RING_RGB = new Color(RING_COLOR)
const VERTICES_PER_RING = SEGMENTS * 2

function ringGeometry(rings: readonly RingSpec[]): BufferGeometry {
  const points = new Float32Array(rings.length * SEGMENTS * 6)
  let offset = 0
  for (const { center, radius, tilt } of rings) {
    const sin = Math.sin(tilt)
    const cos = Math.cos(tilt)
    for (let s = 0; s < SEGMENTS; s++) {
      for (const step of [s, s + 1]) {
        const angle = (step / SEGMENTS) * Math.PI * 2
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius
        points.set([center[0] + x, center[1] - z * sin, center[2] + z * cos], offset)
        offset += 3
      }
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(points, 3))
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(points.length), 3))
  return geometry
}

interface RingPaint {
  absent: ReadonlySet<EntityId> | null
  settled: boolean
}

const isFading = (changedAt: number, now: number, reduced: boolean) => !reduced && now - changedAt < FADE_MS

export function needsRingRepaint(
  last: RingPaint | null,
  time: { absent: ReadonlySet<EntityId> | null; changedAt: number },
  now: number,
  reduced: boolean
): boolean {
  if (!last || last.absent !== time.absent) return true
  return isFading(time.changedAt, now, reduced) || !last.settled
}

function RingSet({ lens, fadingIn }: { lens: LensId; fadingIn: boolean }) {
  const layout = useObservatory((s) => s.layouts[lens])
  const reduced = usePrefersReducedMotion()
  const line = useRef<LineSegments>(null)
  const presenceOf = useTimePresence()
  const painted = useRef<RingPaint | null>(null)
  const geometry = useMemo(() => (layout?.rings?.length ? ringGeometry(layout.rings) : null), [layout])
  const material = useMemo(
    () =>
      new LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    []
  )

  useEffect(() => {
    if (!layout) ensureLayout(lens)
  }, [layout, lens])
  useLayoutEffect(() => {
    painted.current = null
    return () => geometry?.dispose()
  }, [geometry])
  useLayoutEffect(() => () => material.dispose(), [material])

  useFrame(() => {
    const { lensChangedAt } = useObservatory.getState()
    const t = tweenProgress(performance.now(), lensChangedAt, 0, reduced)
    const fade = fadingIn ? t : Math.max(0, 1 - t * 2)
    material.opacity = RING_OPACITY * fade
    if (line.current) line.current.visible = material.opacity > 0.001
    const colors = geometry?.getAttribute('color')
    if (!colors || !layout?.rings) return
    const time = useTimeStore.getState()
    const now = performance.now()
    if (!needsRingRepaint(painted.current, time, now, reduced)) return
    painted.current = { absent: time.absent, settled: !isFading(time.changedAt, now, reduced) }
    layout.rings.forEach((ring, r) => {
      const k = ring.ecosystem ? presenceOf(ring.ecosystem) : 1
      for (let v = r * VERTICES_PER_RING; v < (r + 1) * VERTICES_PER_RING; v++)
        colors.setXYZ(v, RING_RGB.r * k, RING_RGB.g * k, RING_RGB.b * k)
    })
    colors.needsUpdate = true
  })

  if (!geometry) return null
  return <lineSegments ref={line} geometry={geometry} material={material} frustumCulled={false} />
}

export function Rings() {
  const lens = useObservatory((s) => s.lens)
  const lensFrom = useObservatory((s) => s.lensFrom)
  return (
    <>
      <RingSet key={`in:${lens}`} lens={lens} fadingIn />
      {lensFrom !== lens && <RingSet key={`out:${lensFrom}`} lens={lensFrom} fadingIn={false} />}
    </>
  )
}
