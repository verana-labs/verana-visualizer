'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'
import { type Cam, parseViewState } from '@/lib/view-state'

export interface SceneHandleApi {
  camera(): Cam | null
  capture(): HTMLCanvasElement
}

export const sceneHandle: { current: SceneHandleApi | null } = { current: null }

interface CamControls {
  target: Vector3
  update(): void
  dispatchEvent(event: { type: 'start' }): void
}

const RESTORE_AFTER_FRAMES = 3

const isCamControls = (value: unknown): value is CamControls =>
  typeof value === 'object' &&
  value !== null &&
  'target' in value &&
  value.target instanceof Vector3 &&
  'update' in value &&
  'dispatchEvent' in value

export function SceneHandle() {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const advance = useThree((s) => s.advance)
  const rawControls = useThree((s) => s.controls)
  const controls = isCamControls(rawControls) ? rawControls : null
  const framesWithControls = useRef(0)

  useEffect(() => {
    sceneHandle.current = {
      camera: () => {
        if (!controls) return null
        const p = camera.position
        const t = controls.target
        return [p.x, p.y, p.z, t.x, t.y, t.z]
      },
      capture: () => {
        advance(performance.now())
        return gl.domElement
      },
    }
    return () => {
      sceneHandle.current = null
    }
  }, [camera, gl, advance, controls])

  useFrame(() => {
    if (!controls || framesWithControls.current > RESTORE_AFTER_FRAMES) return
    framesWithControls.current++
    if (framesWithControls.current <= RESTORE_AFTER_FRAMES) return
    const cam = parseViewState(new URLSearchParams(window.location.search)).cam
    if (!cam) return
    controls.dispatchEvent({ type: 'start' })
    camera.position.set(cam[0], cam[1], cam[2])
    controls.target.set(cam[3], cam[4], cam[5])
    controls.update()
  })

  return null
}
