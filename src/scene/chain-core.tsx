'use client'

import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, Color, DoubleSide, type Group, type Mesh, MeshBasicMaterial, RingGeometry } from 'three'
import { useObservatory } from '@/store/observatory-store'
import { LABEL_CLASS } from './labels'
import { SceneHtml } from './scene-html'
import { useCoreTween } from './use-lens-tween'

const WAVE_MS = 4200
const WAVE_REACH = 170
const WAVE_START = 8
const WAVE_OPACITY = 0.1
const WAVE_POOL = 4
const PULSE_DECAY_PER_S = 1.2
const CORE_COLOR = new Color('#c4b5fd').multiplyScalar(1.2)

interface Wave {
  mesh: Mesh<RingGeometry, MeshBasicMaterial> | null
  startedAt: number
}

const formatHeight = (height: number) => height.toLocaleString('en-US')

export function ChainCore() {
  const coreAt = useCoreTween()
  const group = useRef<Group>(null)
  const ball = useRef<Mesh>(null)
  const innerRing = useRef<Mesh<RingGeometry, MeshBasicMaterial>>(null)
  const outerRing = useRef<Mesh>(null)
  const label = useRef<HTMLSpanElement>(null)
  const pulse = useRef(0)
  const shownHeight = useRef<number | null>(null)
  const waves = useRef<Wave[]>(Array.from({ length: WAVE_POOL }, () => ({ mesh: null, startedAt: -Infinity })))
  const waveAssets = useMemo(
    () => ({
      geometry: new RingGeometry(0.97, 1, 160),
      materials: Array.from(
        { length: WAVE_POOL },
        () =>
          new MeshBasicMaterial({
            color: '#a98bff',
            transparent: true,
            opacity: 0,
            side: DoubleSide,
            depthWrite: false,
            blending: AdditiveBlending,
          })
      ),
    }),
    []
  )

  useLayoutEffect(
    () => () => {
      waveAssets.geometry.dispose()
      for (const material of waveAssets.materials) material.dispose()
    },
    [waveAssets]
  )

  useFrame((_, delta) => {
    const now = performance.now()
    const { blockHeight, lens } = useObservatory.getState()
    if (blockHeight !== null && blockHeight !== shownHeight.current) {
      shownHeight.current = blockHeight
      if (label.current) label.current.textContent = formatHeight(blockHeight)
      pulse.current = Math.max(pulse.current, 0.5)
      const free = waves.current.reduce((oldest, wave) => (wave.startedAt < oldest.startedAt ? wave : oldest))
      free.startedAt = now
      free.mesh?.rotation.set(lens === 'trust' ? 0 : -Math.PI / 2, 0, 0)
    }
    pulse.current = Math.max(0, pulse.current - Math.min(delta, 0.05) * PULSE_DECAY_PER_S)

    const [x, y, z] = coreAt()
    group.current?.position.set(x, y, z)
    ball.current?.scale.setScalar(1 + pulse.current * 0.45 + Math.sin(now / 900) * 0.04)
    innerRing.current?.rotation.set(Math.PI / 2 + Math.sin(now / 4000) * 0.3, now / 3000, 0)
    outerRing.current?.rotation.set(Math.PI / 2.4, -now / 5200, Math.cos(now / 6000) * 0.2)
    if (innerRing.current) innerRing.current.material.opacity = 0.5 + pulse.current * 0.5

    for (const wave of waves.current) {
      if (!wave.mesh) continue
      const t = (now - wave.startedAt) / WAVE_MS
      wave.mesh.visible = t >= 0 && t < 1
      if (!wave.mesh.visible) continue
      wave.mesh.scale.setScalar(WAVE_START + t * WAVE_REACH)
      wave.mesh.material.opacity = WAVE_OPACITY * (1 - t) * (1 - t)
    }
  })

  return (
    <group ref={group}>
      <mesh ref={ball}>
        <icosahedronGeometry args={[2, 2]} />
        <meshBasicMaterial color={CORE_COLOR} />
      </mesh>
      <mesh ref={innerRing}>
        <torusGeometry args={[5, 0.07, 8, 96]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.8} />
      </mesh>
      <mesh ref={outerRing}>
        <torusGeometry args={[7.6, 0.05, 8, 128]} />
        <meshBasicMaterial color="#7c3aed" transparent opacity={0.55} />
      </mesh>
      {waveAssets.materials.map((material, i) => (
        <mesh
          key={material.uuid}
          visible={false}
          geometry={waveAssets.geometry}
          material={material}
          ref={(mesh: Mesh<RingGeometry, MeshBasicMaterial> | null) => {
            waves.current[i].mesh = mesh
          }}
        />
      ))}
      <SceneHtml>
        <div className={`${LABEL_CLASS} translate-y-[26px] text-[#c4b5fd]`}>
          chain · block <span ref={label} />
        </div>
      </SceneHtml>
    </group>
  )
}
