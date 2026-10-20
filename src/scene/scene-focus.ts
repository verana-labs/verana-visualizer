import { type RefObject, useEffect, useRef } from 'react'
import type { EntityId } from '@/domain/network-model'
import { type ObservatoryState, useObservatory } from '@/store/observatory-store'
import { traceablePath } from './trust-trace'

export interface FocusSets {
  related: Set<EntityId> | null
  hover: Set<EntityId> | null
  trace: Set<EntityId> | null
}

const UNRELATED_DIM = 0.12
const UNHOVERED_DIM = 0.42
const FLASH_DECAY_PER_MS = 0.0006

function focusSetsOf({ model, selected, hovered, trustCheck }: ObservatoryState): FocusSets {
  if (!model) return { related: null, hover: null, trace: null }
  const hoveredEntity = hovered && hovered !== 'rocket' && model.entities.has(hovered) ? hovered : null
  const path = traceablePath(trustCheck?.result ?? null, model)
  return {
    trace: path ? new Set(path) : null,
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
          state.model === previous.model &&
          state.trustCheck === previous.trustCheck
        )
          return
        sets.current = focusSetsOf(state)
      }),
    []
  )
  return sets
}

export function dimOf(sets: FocusSets, id: EntityId): number {
  if (sets.trace) return sets.trace.has(id) ? 1 : UNRELATED_DIM
  if (sets.related) return sets.related.has(id) ? 1 : UNRELATED_DIM
  if (sets.hover) return sets.hover.has(id) ? 1 : UNHOVERED_DIM
  return 1
}

export function flashOf(id: EntityId, now: number): number {
  const at = useObservatory.getState().flashes.get(id)
  return at === undefined ? 0 : Math.max(0, 1 - (now - at) * FLASH_DECAY_PER_MS)
}
