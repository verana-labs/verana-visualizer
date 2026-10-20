import type { ThreeEvent } from '@react-three/fiber'
import { useMemo } from 'react'
import { InstancedMesh, Matrix4 } from 'three'
import type { EntityId } from '@/domain/network-model'
import { useObservatory } from '@/store/observatory-store'

const CLICK_TOLERANCE_PX = 5
const MIN_HITTABLE_SCALE = 1e-4
const scratch = new Matrix4()

export function isHittableInstance(mesh: InstancedMesh, instanceId: number | undefined): boolean {
  if (instanceId === undefined || instanceId >= mesh.count) return false
  mesh.getMatrixAt(instanceId, scratch)
  return scratch.getMaxScaleOnAxis() > MIN_HITTABLE_SCALE
}

export function usePicking(ids: readonly EntityId[]) {
  return useMemo(() => {
    const own = new Set<string>(ids)
    const idAt = (event: ThreeEvent<PointerEvent | MouseEvent>) => {
      const mesh = event.object
      if (!(mesh instanceof InstancedMesh) || !isHittableInstance(mesh, event.instanceId)) return undefined
      return event.instanceId === undefined ? undefined : ids[event.instanceId]
    }
    return {
      onPointerMove: (event: ThreeEvent<PointerEvent>) => {
        const id = idAt(event)
        if (!id) return
        event.stopPropagation()
        const store = useObservatory.getState()
        if (store.hovered !== id) store.hover(id)
      },
      onPointerOut: () => {
        const store = useObservatory.getState()
        if (store.hovered && own.has(store.hovered)) store.hover(null)
      },
      onClick: (event: ThreeEvent<MouseEvent>) => {
        const id = idAt(event)
        if (!id || event.delta > CLICK_TOLERANCE_PX) return
        event.stopPropagation()
        useObservatory.getState().select(id)
      },
    }
  }, [ids])
}
