import type { Camera, Vector3 } from 'three'
import type { Cam } from '@/lib/view-state'
import { useObservatory } from '@/store/observatory-store'

export interface PinnedControls {
  target: Vector3
  update(): void
  dispatchEvent(event: { type: 'start' }): void
}

const USER_INPUT = ['pointerdown', 'wheel', 'keydown', 'touchstart'] as const
const TOLERANCE = 0.01

export function pinCamera(cam: Cam) {
  let held = true
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
