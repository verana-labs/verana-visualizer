import type { ThreeEvent } from '@react-three/fiber'
import { useMemo } from 'react'
import type { EntityId } from '@/domain/network-model'
import { useObservatory } from '@/store/observatory-store'

const CLICK_TOLERANCE_PX = 5

export function usePicking(ids: readonly EntityId[]) {
  return useMemo(() => {
    const own = new Set<string>(ids)
    const idAt = (event: ThreeEvent<PointerEvent | MouseEvent>) =>
      event.instanceId === undefined ? undefined : ids[event.instanceId]
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
