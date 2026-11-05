import type { NetworkModel } from '@/domain/network-model'
import { chainLayout } from './chain'
import { governanceLayout } from './governance'
import { networkLayout } from './network'
import { registryLayout } from './registry'
import { placeProposals } from './shared'
import { trustLayout } from './trust'
import type { Layout, LayoutFn, LensId } from './types'

export const LENSES = [
  'network',
  'trust',
  'economics',
  'chain',
  'time',
  'governance',
  'registry',
] as const satisfies readonly LensId[]

const LAYOUTS: Record<LensId, LayoutFn> = {
  network: networkLayout,
  trust: trustLayout,
  economics: networkLayout,
  chain: chainLayout,
  time: networkLayout,
  governance: governanceLayout,
  registry: registryLayout,
}

export function layoutFor(lens: LensId, model: NetworkModel): Layout {
  const layout = LAYOUTS[lens](model)
  placeProposals(model, layout.positions, layout.corePosition)
  return layout
}
