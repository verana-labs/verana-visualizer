import { type LiveBlock, useIndexerBlocks } from '@/lib/api/indexer-socket'
import type { IndexerEvent } from '@/lib/api/schemas'
import type { NetworkConfig } from '@/lib/env'
import { useObservatory } from '@/store/observatory-store'
import { cometsFor, feedItemOf } from './activity'

export function ingestEvent(ev: IndexerEvent): void {
  const { model, pushFeed, launchComets } = useObservatory.getState()
  pushFeed(feedItemOf(ev, model))
  if (!model) return
  const launches = cometsFor(ev, model)
  if (launches.length > 0) launchComets(launches)
}

export function applyBlock(block: LiveBlock): void {
  useObservatory.getState().advanceBlock(block.block)
  for (const ev of block.events) ingestEvent(ev)
}

export function useLiveActivity(cfg: NetworkConfig): void {
  useIndexerBlocks(cfg, applyBlock)
}
