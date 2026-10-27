import { useMemo } from 'react'
import { governanceComets } from '@/features/governance/governance-comets'
import { createIndexerClient } from '@/lib/api/indexer'
import { type LiveBlock, useIndexerBlocks } from '@/lib/api/indexer-socket'
import type { IndexerEvent } from '@/lib/api/schemas'
import type { NetworkConfig } from '@/lib/env'
import { useObservatory } from '@/store/observatory-store'
import { cometsFor, feedItemOf } from './activity'
import { type FetchEvents, useReplay } from './replay'

export function ingestEvent(ev: IndexerEvent): void {
  const { model, lens, pushFeed, launchComets } = useObservatory.getState()
  pushFeed(feedItemOf(ev, model))
  if (!model) return
  const launches = [...cometsFor(ev, model), ...(lens === 'governance' ? governanceComets(ev, model) : [])]
  if (launches.length > 0) launchComets(launches)
}

export function applyBlock(block: LiveBlock): void {
  useObservatory.getState().advanceBlock(block.block)
  for (const ev of block.events) ingestEvent(ev)
}

export function useLiveActivity(cfg: NetworkConfig): void {
  useIndexerBlocks(cfg, applyBlock)
}

const currentHead = () => useObservatory.getState().blockHeight

export function useIndexerReplay(cfg: NetworkConfig) {
  const fetchEvents = useMemo<FetchEvents>(() => {
    const indexer = createIndexerClient(cfg)
    return async (after, limit) => (await indexer.events(after, limit)).data
  }, [cfg])
  return useReplay(fetchEvents, ingestEvent, currentHead)
}
