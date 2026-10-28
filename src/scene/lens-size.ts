import { useCallback } from 'react'
import type { EntityId } from '@/domain/network-model'
import type { LensId } from '@/layouts/types'
import { useObservatory } from '@/store/observatory-store'
import { tweenProgress } from './use-lens-tween'
import { usePrefersReducedMotion } from './use-reduced-motion'

export function lensSize(
  base: number,
  economicsSize: number | undefined,
  lens: LensId,
  lensFrom: LensId,
  progress: number
): number {
  const sizeIn = (l: LensId) => (l === 'economics' ? (economicsSize ?? base) : base)
  const to = sizeIn(lens)
  if (progress >= 1 || lens === lensFrom) return to
  const from = sizeIn(lensFrom)
  return from + (to - from) * progress
}

export function useLensSize(): (id: EntityId, base: number) => number {
  const reduced = usePrefersReducedMotion()
  return useCallback(
    (id: EntityId, base: number) => {
      const { lens, lensFrom, lensChangedAt, economics } = useObservatory.getState()
      const progress = tweenProgress(performance.now(), lensChangedAt, 0, reduced)
      return lensSize(base, economics?.sizes.get(id), lens, lensFrom, progress)
    },
    [reduced]
  )
}
