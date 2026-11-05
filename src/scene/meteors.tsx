'use client'

import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Line, LineBasicMaterial, Vector3 } from 'three'

const FIRST_METEOR_MS = 4000
const MIN_GAP_MS = 7000
const GAP_SPREAD_MS = 9000
const FLIGHT_MS = 1100
const POOL = 2

interface Meteor {
  line: Line<BufferGeometry, LineBasicMaterial>
  from: Vector3
  velocity: Vector3
  startedAt: number
}

function createMeteor(): Meteor {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(6), 3))
  geometry.setAttribute('color', new BufferAttribute(new Float32Array([1, 1, 1, 0, 0, 0]), 3))
  const material = new LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    fog: false,
  })
  const line = new Line(geometry, material)
  line.visible = false
  line.frustumCulled = false
  return { line, from: new Vector3(), velocity: new Vector3(), startedAt: -Infinity }
}

export function Meteors() {
  const pool = useMemo(() => Array.from({ length: POOL }, createMeteor), [])
  const nextAt = useRef(performance.now() + FIRST_METEOR_MS)
  const scratch = useMemo(() => ({ head: new Vector3(), tail: new Vector3() }), [])

  useLayoutEffect(
    () => () => {
      for (const { line } of pool) {
        line.geometry.dispose()
        line.material.dispose()
      }
    },
    [pool]
  )

  useFrame(() => {
    const now = performance.now()
    if (now > nextAt.current) {
      nextAt.current = now + MIN_GAP_MS + Math.random() * GAP_SPREAD_MS
      const meteor = pool.find((m) => now - m.startedAt >= FLIGHT_MS)
      if (meteor) {
        meteor.from.randomDirection().multiplyScalar(650)
        meteor.from.y = Math.abs(meteor.from.y) * 0.6 + 80
        meteor.velocity.randomDirection().cross(meteor.from).normalize().multiplyScalar(520)
        meteor.startedAt = now
      }
    }
    for (const meteor of pool) {
      const t = (now - meteor.startedAt) / FLIGHT_MS
      meteor.line.visible = t >= 0 && t < 1
      if (!meteor.line.visible) continue
      const { head, tail } = scratch
      head.copy(meteor.from).addScaledVector(meteor.velocity, t)
      tail.copy(head).addScaledVector(meteor.velocity, -0.09 * Math.sin(Math.PI * t))
      const position = meteor.line.geometry.attributes.position
      position.setXYZ(0, head.x, head.y, head.z)
      position.setXYZ(1, tail.x, tail.y, tail.z)
      position.needsUpdate = true
      meteor.line.material.opacity = Math.sin(Math.PI * t) * 0.9
    }
  })

  return (
    <>
      {pool.map((meteor) => (
        <primitive key={meteor.line.uuid} object={meteor.line} />
      ))}
    </>
  )
}
