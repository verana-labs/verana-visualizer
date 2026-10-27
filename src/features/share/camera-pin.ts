import type { Camera, Vector3 } from 'three'
import type { Cam } from '@/lib/view-state'
import { useObservatory } from '@/store/observatory-store'

interface PinnedControls {
  target: Vector3
  minDistance: number
  maxDistance: number
  update(): void
  dispatchEvent(event: { type: 'start' }): void
}

const USER_INPUT = ['pointerdown', 'wheel', 'keydown', 'touchstart'] as const
const TOLERANCE = 0.01

function clampToZoom(cam: Cam, { minDistance, maxDistance }: PinnedControls): Cam {
  const offset = [cam[0] - cam[3], cam[1] - cam[4], cam[2] - cam[5]]
  const distance = Math.hypot(offset[0], offset[1], offset[2])
  if (distance === 0) return cam
  const clamped = Math.min(maxDistance, Math.max(minDistance, distance))
  if (clamped === distance) return cam
  const k = clamped / distance
  return [cam[3] + offset[0] * k, cam[4] + offset[1] * k, cam[5] + offset[2] * k, cam[3], cam[4], cam[5]]
}

export function pinCamera(shared: Cam) {
  let held = true
  let cam: Cam | null = null
  const release = () => {
    if (!held) return
    held = false
    for (const type of USER_INPUT) window.removeEventListener(type, release, true)
    unsubscribe()
  }
  for (const type of USER_INPUT) window.addEventListener(type, release, true)
  const unsubscribe = useObservatory.subscribe((state, previous) => {
    if (state.lens !== previous.lens || state.selected !== previous.selected) release()
  })

  return {
    release,
    enforce(camera: Camera, controls: PinnedControls) {
      if (!held) return
      cam ??= clampToZoom(shared, controls)
      const p = camera.position
      const t = controls.target
      const off =
        Math.abs(p.x - cam[0]) +
        Math.abs(p.y - cam[1]) +
        Math.abs(p.z - cam[2]) +
        Math.abs(t.x - cam[3]) +
        Math.abs(t.y - cam[4]) +
        Math.abs(t.z - cam[5])
      if (off < TOLERANCE) return
      controls.dispatchEvent({ type: 'start' })
      p.set(cam[0], cam[1], cam[2])
      t.set(cam[3], cam[4], cam[5])
      controls.update()
    },
  }
}
