import type { NetworkModel } from '@/domain/network-model'
import { networkLayout } from './network'
import type { Layout, LensExtras } from './types'

export function chainLayout(model: NetworkModel, _extras: LensExtras = {}): Layout {
  return networkLayout(model)
}
