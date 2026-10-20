'use client'

import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, type Points, ShaderMaterial, Vector3 } from 'three'
import { useGlowTexture } from './glow-texture'
import { Meteors } from './meteors'
import { Rocket } from './rocket'

const STAR_COUNT = 4200
const STAR_DRIFT_PER_S = 0.004
const NEBULA_OPACITY = 0.075
const NEBULAE: readonly { color: string; at: [number, number, number]; size: number }[] = [
  { color: '#5b21b6', at: [-620, 160, -700], size: 900 },
  { color: '#1d4ed8', at: [700, -120, -520], size: 760 },
  { color: '#9d174d', at: [120, 380, -820], size: 680 },
  { color: '#4c1d95', at: [-300, -300, 700], size: 820 },
  { color: '#0e7490', at: [820, 220, 400], size: 600 },
]

const STAR_VERTEX = `attribute float aPhase; attribute float aSize; uniform float uTime; varying vec3 vC; varying float vA;
void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
  vC = color; vA = 0.3 + 0.7 * (0.5 + 0.5 * sin(uTime * (0.4 + aPhase * 1.1) + aPhase * 60.0));
  gl_PointSize = aSize * (1100.0 / -mv.z); }`

const STAR_FRAGMENT = `varying vec3 vC; varying float vA;
void main() { float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vC, smoothstep(0.5, 0.0, d) * vA * 0.85); }`

function starGeometry(): BufferGeometry {
  const positions = new Float32Array(STAR_COUNT * 3)
  const colors = new Float32Array(STAR_COUNT * 3)
  const phases = new Float32Array(STAR_COUNT)
  const sizes = new Float32Array(STAR_COUNT)
  const point = new Vector3()
  const color = new Color()
  for (let i = 0; i < STAR_COUNT; i++) {
    point.randomDirection().multiplyScalar(500 + Math.random() * 900)
    positions.set([point.x, point.y, point.z], i * 3)
    color.setHSL(0.6 + Math.random() * 0.2, 0.45, 0.6 + Math.random() * 0.35)
    colors.set([color.r, color.g, color.b], i * 3)
    phases[i] = Math.random()
    sizes[i] = 1 + Math.random() ** 6 * 3.2
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('color', new BufferAttribute(colors, 3))
  geometry.setAttribute('aPhase', new BufferAttribute(phases, 1))
  geometry.setAttribute('aSize', new BufferAttribute(sizes, 1))
  return geometry
}

function Starfield() {
  const points = useRef<Points>(null)
  const geometry = useMemo(starGeometry, [])
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: STAR_VERTEX,
        fragmentShader: STAR_FRAGMENT,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    []
  )

  useLayoutEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material]
  )

  useFrame((_, delta) => {
    material.uniforms.uTime.value = performance.now() / 1000
    if (points.current) points.current.rotation.y += Math.min(delta, 0.05) * STAR_DRIFT_PER_S
  })

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />
}

function Nebulae() {
  const texture = useGlowTexture()
  return (
    <>
      {NEBULAE.map(({ color, at, size }) => (
        <sprite key={color} position={at} scale={size}>
          <spriteMaterial
            map={texture}
            color={color}
            blending={AdditiveBlending}
            depthWrite={false}
            transparent
            opacity={NEBULA_OPACITY}
            fog={false}
          />
        </sprite>
      ))}
    </>
  )
}

export function Sky() {
  return (
    <>
      <Starfield />
      <Nebulae />
      <Meteors />
      <Rocket />
    </>
  )
}
