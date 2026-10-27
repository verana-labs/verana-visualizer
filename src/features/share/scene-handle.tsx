'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'
import { create } from 'zustand'
import { type Cam, parseViewState } from '@/lib/view-state'
import { pinCamera } from './camera-pin'

interface SceneHandleApi {
  camera(): Cam
  capture(): HTMLCanvasElement
}

export const useSceneHandle = create<{ handle: SceneHandleApi | null }>()(() => ({ handle: null }))

interface CamControls {
  target: Vector3
  minDistance: number
  maxDistance: number
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
  'dispatchEvent' in value &&
  'minDistance' in value &&
  typeof value.minDistance === 'number' &&
  'maxDistance' in value &&
  typeof value.maxDistance === 'number'

export function SceneHandle() {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const advance = useThree((s) => s.advance)
  const rawControls = useThree((s) => s.controls)
  const controls = isCamControls(rawControls) ? rawControls : null
  const framesWithControls = useRef(0)
  const pin = useRef<ReturnType<typeof pinCamera> | null>(null)

  useEffect(() => {
    if (!controls) return
    const handle: SceneHandleApi = {
      camera: () => {
        const p = camera.position
        const t = controls.target
        return [p.x, p.y, p.z, t.x, t.y, t.z]
      },
      capture: () => {
        advance(performance.now())
        return gl.domElement
      },
    }
    useSceneHandle.setState({ handle })
    return () => {
      if (useSceneHandle.getState().handle === handle) useSceneHandle.setState({ handle: null })
    }
  }, [camera, gl, advance, controls])

  useEffect(() => () => pin.current?.release(), [])

  useFrame(() => {
    if (!controls) return
    if (framesWithControls.current <= RESTORE_AFTER_FRAMES) {
      framesWithControls.current++
      if (framesWithControls.current <= RESTORE_AFTER_FRAMES) return
      const cam = parseViewState(new URLSearchParams(window.location.search)).cam
      if (cam) pin.current = pinCamera(cam)
    }
    pin.current?.enforce(camera, controls)
  })

  return null
}
