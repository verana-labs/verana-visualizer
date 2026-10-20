import { create } from 'zustand'
import { appendFeed, type CometLaunch, type FeedItem } from '@/domain/activity'
import type { EntityId, NetworkModel } from '@/domain/network-model'
import { isVerdictError, type TrustCheck } from '@/domain/trust-check'
import type { ValidatorOrb } from '@/features/chain-stats/chain-scene'
import type { BlockSummary } from '@/features/chain-stats/load-chain-stats'
import type { Layout, LensId } from '@/layouts/types'
import type { ListQueryKey } from '@/lib/api/load-network'
import type { QueryInfo } from '@/lib/api/query-info'

const TOAST_MS = 4000

export type PaletteMode = 'closed' | 'search' | 'check'

export interface TrustCheckState {
  seq: number
  did: string
  subject: EntityId | null
  result: TrustCheck | null
  tracedAt: number | null
}

export interface EconomicsScene {
  sizes: Map<EntityId, number>
  fills: Map<EntityId, number>
}

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
  palette: PaletteMode
  trustCheck: TrustCheckState | null
  economics: EconomicsScene | null
  simulationOpen: boolean
  chainBlocks: BlockSummary[]
  chainValidators: ValidatorOrb[] | null
  setLens(l: LensId): void
  setLayout(lens: LensId, layout: Layout): void
  select(id: EntityId | null): void
  hover(id: EntityId | 'rocket' | null): void
  flash(id: EntityId): void
  advanceBlock(height: number): void
  pushFeed(item: FeedItem): void
  launchComets(launches: CometLaunch[]): void
  showToast(message: string): void
  openPalette(mode: Exclude<PaletteMode, 'closed'>): void
  closePalette(): void
  requestTrustCheck(did: string): void
  finishTrustCheck(seq: number, result: TrustCheck): void
  clearTrustCheck(): void
  setAgentVerdict(id: EntityId, trusted: boolean): void
  setEconomics(economics: EconomicsScene): void
  setSimulationOpen(open: boolean): void
  setChainBlocks(blocks: BlockSummary[]): void
  setChainValidators(validators: ValidatorOrb[]): void
}

let toastTimer: ReturnType<typeof setTimeout> | undefined
let trustSeq = 0

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
  palette: 'closed',
  trustCheck: null,
  economics: null,
  simulationOpen: false,
  chainBlocks: [],
  chainValidators: null,
  setLens: (l) => set((s) => (s.lens === l ? s : { lens: l, lensFrom: s.lens, lensChangedAt: performance.now() })),
  setLayout: (lens, layout) => set((s) => ({ layouts: { ...s.layouts, [lens]: layout } })),
  select: (id) =>
    set((s) => ({ selected: id, trustCheck: s.trustCheck && s.trustCheck.subject === id ? s.trustCheck : null })),
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
  openPalette: (mode) => set({ palette: mode }),
  closePalette: () => set({ palette: 'closed' }),
  requestTrustCheck: (did) =>
    set((s) => {
      const subject = s.model?.byDid(did)[0] ?? null
      trustSeq++
      return { selected: subject, trustCheck: { seq: trustSeq, did, subject, result: null, tracedAt: null } }
    }),
  finishTrustCheck: (seq, result) =>
    set((s) => {
      const current = s.trustCheck
      if (!current || current.seq !== seq) return s
      const subject = current.subject ?? s.model?.byDid(current.did)[0] ?? null
      const verdicts =
        subject?.startsWith('agent:') && !isVerdictError(result.verdict)
          ? new Map(s.agentVerdicts).set(subject, result.verdict.trusted)
          : s.agentVerdicts
      return {
        trustCheck: { ...current, subject, result, tracedAt: performance.now() },
        selected: subject === current.subject ? s.selected : subject,
        agentVerdicts: verdicts,
      }
    }),
  clearTrustCheck: () => set({ trustCheck: null }),
  setAgentVerdict: (id, trusted) => set((s) => ({ agentVerdicts: new Map(s.agentVerdicts).set(id, trusted) })),
  setEconomics: (economics) => set({ economics }),
  setSimulationOpen: (open) => set({ simulationOpen: open }),
  setChainBlocks: (blocks) => set({ chainBlocks: blocks }),
  setChainValidators: (validators) => set({ chainValidators: validators }),
}))
