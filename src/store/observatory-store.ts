import { create } from 'zustand'
import { appendFeed, type CometLaunch, type FeedItem } from '@/domain/activity'
import type { EntityId, NetworkModel } from '@/domain/network-model'
import type { Layout, LensId } from '@/layouts/types'
import type { ListQueryKey } from '@/lib/api/load-network'
import type { QueryInfo } from '@/lib/api/query-info'

const TOAST_MS = 4000

export interface ObservatoryState {
  lens: LensId
  lensFrom: LensId
  lensChangedAt: number
  selected: EntityId | null
  hovered: EntityId | 'rocket' | null
  model: NetworkModel | null
  layouts: Partial<Record<LensId, Layout>>
  queries: Partial<Record<ListQueryKey, QueryInfo>>
  agentVerdicts: Map<EntityId, boolean>
  flashes: Map<EntityId, number>
  blockHeight: number | null
  feed: FeedItem[]
  cometLaunch: CometLaunch[] | null
  toast: string | null
  setLens(l: LensId): void
  setLayout(lens: LensId, layout: Layout): void
  select(id: EntityId | null): void
  hover(id: EntityId | 'rocket' | null): void
  flash(id: EntityId): void
  advanceBlock(height: number): void
  pushFeed(item: FeedItem): void
  launchComets(launches: CometLaunch[]): void
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
  queries: {},
  agentVerdicts: new Map(),
  flashes: new Map(),
  blockHeight: null,
  feed: [],
  cometLaunch: null,
  toast: null,
  setLens: (l) => set((s) => (s.lens === l ? s : { lens: l, lensFrom: s.lens, lensChangedAt: performance.now() })),
  setLayout: (lens, layout) => set((s) => ({ layouts: { ...s.layouts, [lens]: layout } })),
  select: (id) => set({ selected: id }),
  hover: (id) => set({ hovered: id }),
  flash: (id) => set((s) => ({ flashes: new Map(s.flashes).set(id, performance.now()) })),
  advanceBlock: (height) =>
    set((s) => (s.blockHeight !== null && height <= s.blockHeight ? s : { blockHeight: height })),
  pushFeed: (item) => set((s) => ({ feed: appendFeed(s.feed, item) })),
  launchComets: (launches) => set({ cometLaunch: launches }),
  showToast: (message) => {
    clearTimeout(toastTimer)
    set({ toast: message })
    toastTimer = setTimeout(() => set({ toast: null }), TOAST_MS)
  },
}))
