import { useCallback } from 'react'
import type { EntityId } from '@/domain/network-model'
import { presenceOf, useTimeStore } from '@/features/time-scrubber/time-store'
import { usePrefersReducedMotion } from './use-reduced-motion'

export function useTimePresence(): (id: EntityId) => number {
  const reduced = usePrefersReducedMotion()
  return useCallback((id: EntityId) => presenceOf(id, useTimeStore.getState(), performance.now(), reduced), [reduced])
}
