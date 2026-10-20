import { create } from 'zustand'
import type { EntityId, NetworkModel } from '@/domain/network-model'
import type { LensId } from '@/layouts/types'

export interface ObservatoryState {
  lens: LensId
  lensFrom: LensId
  lensChangedAt: number
  selected: EntityId | null
  hovered: EntityId | 'rocket' | null
  model: NetworkModel | null
  agentVerdicts: Map<EntityId, boolean>
  flashes: Map<EntityId, number>
  blockHeight: number | null
  setLens(l: LensId): void
  select(id: EntityId | null): void
  hover(id: EntityId | 'rocket' | null): void
  flash(id: EntityId): void
}

export const useObservatory = create<ObservatoryState>()((set) => ({
  lens: 'network',
  lensFrom: 'network',
  lensChangedAt: 0,
  selected: null,
  hovered: null,
  model: null,
  agentVerdicts: new Map(),
  flashes: new Map(),
  blockHeight: null,
  setLens: (l) => set((s) => (s.lens === l ? s : { lens: l, lensFrom: s.lens, lensChangedAt: performance.now() })),
  select: (id) => set({ selected: id }),
  hover: (id) => set({ hovered: id }),
  flash: (id) => set((s) => ({ flashes: new Map(s.flashes).set(id, performance.now()) })),
}))
