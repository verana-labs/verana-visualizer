'use client'

import { type ThreeEvent, useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  type Group,
  type Mesh,
  PointsMaterial,
  Vector3,
} from 'three'
import { useObservatory } from '@/store/observatory-store'

export const ROCKET_TOAST = '🚀 You spotted the v5 rocket. Next stop: the visualizer spec.'

const FIRST_PASS_MS = 14_000
const MIN_GAP_MS = 50_000
const GAP_SPREAD_MS = 30_000
const CROSSING_MS = 26_000
const TRAIL = 70
const UP = new Vector3(0, 1, 0)
const FLAME_COLOR = new Color('#fb923c').multiplyScalar(2)

interface Run {
  startedAt: number
  from: Vector3
  to: Vector3
}

export function Rocket() {
  const body = useRef<Group>(null)
  const flame = useRef<Mesh>(null)
  const run = useRef<Run | null>(null)
  const nextAt = useRef(performance.now() + FIRST_PASS_MS)
  const history = useRef<Vector3[]>([])
  const scratch = useMemo(() => ({ point: new Vector3(), direction: new Vector3() }), [])
  const trail = useMemo(() => {
    const positions = new Float32Array(TRAIL * 3)
    const colors = new Float32Array(TRAIL * 3)
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    geometry.setAttribute('color', new BufferAttribute(colors, 3))
    geometry.setDrawRange(0, 0)
    const material = new PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      fog: false,
    })
    return { geometry, material, positions, colors }
  }, [])

  useLayoutEffect(
    () => () => {
      trail.geometry.dispose()
      trail.material.dispose()
    },
    [trail]
  )

  useFrame(() => {
    const rocket = body.current
    if (!rocket) return
    const now = performance.now()
    if (!run.current && now > nextAt.current) {
      const side = Math.random() > 0.5 ? 1 : -1
      const z = -260 + Math.random() * 120
      run.current = {
        startedAt: now,
        from: new Vector3(-480 * side, 40 + Math.random() * 60, z),
        to: new Vector3(480 * side, 150 + Math.random() * 80, z - 120),
      }
      history.current = []
      rocket.visible = true
    }
    const current = run.current
    if (!current) return
    const t = (now - current.startedAt) / CROSSING_MS
    const { point, direction } = scratch
    point.lerpVectors(current.from, current.to, t)
    point.y += Math.sin(t * Math.PI) * 50
    direction.subVectors(point, rocket.position).normalize()
    if (direction.lengthSq() > 0) rocket.quaternion.setFromUnitVectors(UP, direction)
    rocket.position.copy(point)
    flame.current?.scale.set(1, 0.8 + Math.random() * 0.6, 1)

    history.current.unshift(point.clone().addScaledVector(direction, -4))
    if (history.current.length > TRAIL) history.current.pop()
    history.current.forEach((h, k) => {
      trail.positions.set([h.x + (Math.random() - 0.5), h.y + (Math.random() - 0.5), h.z], k * 3)
      const f = 1 - k / TRAIL
      trail.colors.set([f, 0.55 * f * f, 0.2 * f * f], k * 3)
    })
    trail.geometry.setDrawRange(0, history.current.length)
    trail.geometry.attributes.position.needsUpdate = true
    trail.geometry.attributes.color.needsUpdate = true

    if (t >= 1) {
      run.current = null
      rocket.visible = false
      trail.geometry.setDrawRange(0, 0)
      nextAt.current = now + MIN_GAP_MS + Math.random() * GAP_SPREAD_MS
    }
  })

  const onClick = (event: ThreeEvent<MouseEvent>) => {
    if (!body.current?.visible) return
    event.stopPropagation()
    useObservatory.getState().showToast(ROCKET_TOAST)
  }
  const onOver = (event: ThreeEvent<PointerEvent>) => {
    if (!body.current?.visible) return
    event.stopPropagation()
    document.body.style.cursor = 'pointer'
    useObservatory.getState().hover('rocket')
  }
  const onOut = () => {
    document.body.style.cursor = ''
    if (useObservatory.getState().hovered === 'rocket') useObservatory.getState().hover(null)
  }

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: an r3f group is a 3D object, not a DOM element */}
      <group ref={body} visible={false} scale={2.2} onClick={onClick} onPointerOver={onOver} onPointerOut={onOut}>
        <mesh>
          <cylinderGeometry args={[0.35, 0.45, 2, 14]} />
          <meshBasicMaterial color="#e9e4ff" fog={false} />
        </mesh>
        <mesh position-y={1.45}>
          <coneGeometry args={[0.35, 0.9, 14]} />
          <meshBasicMaterial color="#a78bfa" fog={false} />
        </mesh>
        <mesh position-y={-0.8}>
          <boxGeometry args={[1.4, 0.5, 0.06]} />
          <meshBasicMaterial color="#7c3aed" fog={false} />
        </mesh>
        <mesh ref={flame} position-y={-1.55} rotation-x={Math.PI} raycast={() => null}>
          <coneGeometry args={[0.3, 1.1, 10]} />
          <meshBasicMaterial color={FLAME_COLOR} transparent opacity={0.9} fog={false} blending={AdditiveBlending} />
        </mesh>
      </group>
      <points geometry={trail.geometry} material={trail.material} frustumCulled={false} />
    </>
  )
}
