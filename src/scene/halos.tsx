'use client'

import { useFrame } from '@react-three/fiber'
import { type RefObject, useRef } from 'react'
import { AdditiveBlending, type Sprite } from 'three'
import { useGlowTexture } from './glow-texture'
import type { SceneNode } from './scene-data'
import { dimOf, type FocusSets, flashOf } from './scene-focus'
import type { PositionOf } from './use-lens-tween'

const HALO_COLOR = '#b59cff'
const HALO_OPACITY = 0.3
const DIMMED_HALO_OPACITY = 0.06
const HALO_SCALE = 4.2

interface HalosProps {
  stars: SceneNode[]
  positionOf: PositionOf
  focus: RefObject<FocusSets>
}

export function Halos({ stars, positionOf, focus }: HalosProps) {
  const texture = useGlowTexture()
  const sprites = useRef<(Sprite | null)[]>([])

  useFrame(() => {
    const now = performance.now()
    const pulse = 0.5 + 0.5 * Math.sin(now / 420)
    stars.forEach((star, i) => {
      const sprite = sprites.current[i]
      if (!sprite) return
      const id = star.entity.id
      const flash = flashOf(id, now)
      const dimmed = dimOf(focus.current, id) < 0.2
      sprite.position.set(...positionOf(id))
      sprite.scale.setScalar(star.size * (HALO_SCALE + flash * 5))
      sprite.material.opacity = (dimmed ? DIMMED_HALO_OPACITY : HALO_OPACITY) * (0.85 + 0.15 * pulse) + flash * 0.6
    })
  })

  return (
    <>
      {stars.map((star, i) => (
        <sprite
          key={star.entity.id}
          ref={(sprite) => {
            sprites.current[i] = sprite
          }}
        >
          <spriteMaterial
            map={texture}
            color={HALO_COLOR}
            blending={AdditiveBlending}
            depthWrite={false}
            transparent
            opacity={HALO_OPACITY}
          />
        </sprite>
      ))}
    </>
  )
}
