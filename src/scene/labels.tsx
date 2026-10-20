'use client'

import { useFrame } from '@react-three/fiber'
import { type RefObject, useRef } from 'react'
import type { Group } from 'three'
import type { SceneNode } from './scene-data'
import { dimOf, type FocusSets } from './scene-focus'
import { SceneHtml } from './scene-html'
import type { PositionOf } from './use-lens-tween'

interface LabelsProps {
  stars: SceneNode[]
  positionOf: PositionOf
  focus: RefObject<FocusSets>
}

export const LABEL_CLASS =
  'pointer-events-none whitespace-nowrap text-[11px] font-medium transition-opacity duration-300 [text-shadow:0_0_8px_#000,0_0_2px_#000]'

const labelOpacity = (dim: number) => (dim >= 1 ? 1 : dim < 0.2 ? 0.15 : 0.4)

export function Labels({ stars, positionOf, focus }: LabelsProps) {
  const anchors = useRef<(Group | null)[]>([])
  const texts = useRef<(HTMLDivElement | null)[]>([])

  useFrame(() => {
    stars.forEach((star, i) => {
      const id = star.entity.id
      anchors.current[i]?.position.set(...positionOf(id))
      const text = texts.current[i]
      if (text) text.style.opacity = String(labelOpacity(dimOf(focus.current, id)))
    })
  })

  return (
    <>
      {stars.map((star, i) => (
        <group
          key={star.entity.id}
          ref={(group) => {
            anchors.current[i] = group
          }}
        >
          <SceneHtml>
            <div
              ref={(div) => {
                texts.current[i] = div
              }}
              className={`${LABEL_CLASS} -translate-y-[18px] text-[rgba(236,232,255,.85)]`}
            >
              {star.entity.name}
            </div>
          </SceneHtml>
        </group>
      ))}
    </>
  )
}
