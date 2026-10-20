import { type RefObject, useEffect, useRef } from 'react'
import type { EntityId } from '@/domain/network-model'
import { type ObservatoryState, useObservatory } from '@/store/observatory-store'

export interface FocusSets {
  related: Set<EntityId> | null
  hover: Set<EntityId> | null
}

const UNRELATED_DIM = 0.12
const UNHOVERED_DIM = 0.42
const FLASH_DECAY_PER_MS = 0.0006

function focusSetsOf({ model, selected, hovered }: ObservatoryState): FocusSets {
  if (!model) return { related: null, hover: null }
  const hoveredEntity = hovered && hovered !== 'rocket' && model.entities.has(hovered) ? hovered : null
  return {
    related: selected && model.entities.has(selected) ? model.related(selected) : null,
    hover: hoveredEntity ? new Set([hoveredEntity, ...model.neighbors(hoveredEntity)]) : null,
  }
}

export function useFocusSets(): RefObject<FocusSets> {
  const sets = useRef<FocusSets>(focusSetsOf(useObservatory.getState()))
  useEffect(
    () =>
      useObservatory.subscribe((state, previous) => {
        if (
          state.selected === previous.selected &&
          state.hovered === previous.hovered &&
          state.model === previous.model
        )
          return
        sets.current = focusSetsOf(state)
      }),
    []
  )
  return sets
}

export function dimOf(sets: FocusSets, id: EntityId): number {
  if (sets.related) return sets.related.has(id) ? 1 : UNRELATED_DIM
  if (sets.hover) return sets.hover.has(id) ? 1 : UNHOVERED_DIM
  return 1
}

export function flashOf(id: EntityId, now: number): number {
  const at = useObservatory.getState().flashes.get(id)
  return at === undefined ? 0 : Math.max(0, 1 - (now - at) * FLASH_DECAY_PER_MS)
}
