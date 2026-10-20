import { useCallback, useMemo } from 'react'
import type { EntityId, NetworkModel } from '@/domain/network-model'
import { layoutFor } from '@/layouts'
import { seededRandom } from '@/layouts/seed'
import type { Layout, LensId, Vec3 } from '@/layouts/types'
import { useObservatory } from '@/store/observatory-store'
import { usePrefersReducedMotion } from './use-reduced-motion'

const TWEEN_MS = 1500
const REDUCED_TWEEN_MS = 300
const TIER_STAGGER_MS = 135
const NODE_JITTER_MS = 120
const AGENT_DELAY_MS = 675
const AGENT_JITTER_MS = 150

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

export function tweenProgress(now: number, changedAt: number, delay: number, reduced: boolean): number {
  const elapsed = reduced ? now - changedAt : now - changedAt - delay
  const t = elapsed / (reduced ? REDUCED_TWEEN_MS : TWEEN_MS)
  if (t <= 0) return 0
  if (t >= 1) return 1
  return easeInOutCubic(t)
}

export function ensureLayout(lens: LensId): Layout | null {
  const { model, layouts, setLayout } = useObservatory.getState()
  const cached = layouts[lens]
  if (cached || !model) return cached ?? null
  const layout = layoutFor(lens, model)
  setLayout(lens, layout)
  return layout
}

function entityDelays(model: NetworkModel | null): Map<EntityId, number> {
  const delays = new Map<EntityId, number>()
  if (!model) return delays
  for (const entity of model.entities.values()) {
    const jitter = seededRandom(`delay:${entity.id}`)()
    delays.set(
      entity.id,
      entity.kind === 'agent'
        ? AGENT_DELAY_MS + jitter * AGENT_JITTER_MS
        : (entity.tier + 1) * TIER_STAGGER_MS + jitter * NODE_JITTER_MS
    )
  }
  return delays
}

const lerp3 = (from: Vec3, to: Vec3, t: number): Vec3 =>
  t >= 1 ? to : [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t]

export type PositionOf = (id: EntityId) => Vec3

export function useLensTween(): PositionOf {
  const reduced = usePrefersReducedMotion()
  const model = useObservatory((s) => s.model)
  const delays = useMemo(() => entityDelays(model), [model])

  return useCallback(
    (id: EntityId) => {
      const { lens, lensFrom, lensChangedAt } = useObservatory.getState()
      const to = ensureLayout(lens)?.positions.get(id)
      if (!to) throw new Error(`Entity ${id} has no position in the ${lens} layout`)
      const progress = tweenProgress(performance.now(), lensChangedAt, delays.get(id) ?? 0, reduced)
      if (progress >= 1 || lens === lensFrom) return to
      const from = ensureLayout(lensFrom)?.positions.get(id) ?? to
      return lerp3(from, to, progress)
    },
    [delays, reduced]
  )
}

export function useCoreTween(): () => Vec3 {
  const reduced = usePrefersReducedMotion()
  return useCallback(() => {
    const { lens, lensFrom, lensChangedAt } = useObservatory.getState()
    const to = ensureLayout(lens)?.corePosition
    if (!to) throw new Error(`The ${lens} layout is not available yet`)
    const from = ensureLayout(lensFrom)?.corePosition ?? to
    return lerp3(from, to, tweenProgress(performance.now(), lensChangedAt, 0, reduced))
  }, [reduced])
}
