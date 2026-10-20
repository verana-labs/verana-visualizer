import type { NetworkModel } from '@/domain/network-model'
import { chainLayout } from './chain'
import { economicsLayout } from './economics'
import { governanceLayout } from './governance'
import { networkLayout } from './network'
import { registryLayout } from './registry'
import { timeLayout } from './time'
import { trustLayout } from './trust'
import type { Layout, LayoutFn, LensExtras, LensId } from './types'

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
  economics: economicsLayout,
  chain: chainLayout,
  time: timeLayout,
  governance: governanceLayout,
  registry: registryLayout,
}

export function layoutFor(lens: LensId, model: NetworkModel, extras: LensExtras = {}): Layout {
  return LAYOUTS[lens](model, extras)
}
