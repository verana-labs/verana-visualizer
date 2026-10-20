import { create } from 'zustand'
import type { EntityId, NetworkModel } from '@/domain/network-model'
import type { Layout, LensId } from '@/layouts/types'

const TOAST_MS = 4000

export interface ObservatoryState {
  lens: LensId
  lensFrom: LensId
  lensChangedAt: number
  selected: EntityId | null
  hovered: EntityId | 'rocket' | null
  model: NetworkModel | null
  layouts: Partial<Record<LensId, Layout>>
  agentVerdicts: Map<EntityId, boolean>
  flashes: Map<EntityId, number>
  blockHeight: number | null
  toast: string | null
  setLens(l: LensId): void
  setLayout(lens: LensId, layout: Layout): void
  select(id: EntityId | null): void
  hover(id: EntityId | 'rocket' | null): void
  flash(id: EntityId): void
  showToast(message: string): void
}

let toastTimer: ReturnType<typeof setTimeout> | undefined

export const useObservatory = create<ObservatoryState>()((set) => ({
  lens: 'network',
  lensFrom: 'network',
  lensChangedAt: 0,
  selected: null,
  hovered: null,
  model: null,
  layouts: {},
  agentVerdicts: new Map(),
  flashes: new Map(),
  blockHeight: null,
  toast: null,
  setLens: (l) => set((s) => (s.lens === l ? s : { lens: l, lensFrom: s.lens, lensChangedAt: performance.now() })),
  setLayout: (lens, layout) => set((s) => ({ layouts: { ...s.layouts, [lens]: layout } })),
  select: (id) => set({ selected: id }),
  hover: (id) => set({ hovered: id }),
  flash: (id) => set((s) => ({ flashes: new Map(s.flashes).set(id, performance.now()) })),
  showToast: (message) => {
    clearTimeout(toastTimer)
    set({ toast: message })
    toastTimer = setTimeout(() => set({ toast: null }), TOAST_MS)
  },
}))
