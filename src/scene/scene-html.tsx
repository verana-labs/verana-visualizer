'use client'

import { Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import type { ReactNode } from 'react'

const PASS_THROUGH = { pointerEvents: 'none' } as const

export function SceneHtml({ children }: { children: ReactNode }) {
  const connected = useThree((s) => s.events.connected)
  // drei Html recreates its React root when its target changes and never re-renders into the new one
  if (!(connected instanceof HTMLElement)) return null
  return (
    // drei only applies its pointerEvents prop in transform mode; the wrapper box otherwise covers the star
    <Html center zIndexRange={[1, 0]} style={PASS_THROUGH} portal={{ current: connected }}>
      {children}
    </Html>
  )
}
