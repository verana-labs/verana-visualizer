'use client'

import { Html } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import type { ReactNode } from 'react'

export function SceneHtml({ children }: { children: ReactNode }) {
  const connected = useThree((s) => s.events.connected)
  // drei Html recreates its React root when its target changes and never re-renders into the new one
  if (!(connected instanceof HTMLElement)) return null
  return (
    <Html center zIndexRange={[1, 0]} pointerEvents="none" portal={{ current: connected }}>
      {children}
    </Html>
  )
}
