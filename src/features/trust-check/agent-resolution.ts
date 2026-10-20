'use client'

import { useEffect } from 'react'
import type { NetworkModel } from '@/domain/network-model'
import { createIndexerClient } from '@/lib/api/indexer'
import type { NetworkConfig } from '@/lib/env'
import { logger } from '@/lib/logger'
import { useObservatory } from '@/store/observatory-store'
import { describeFailure } from './run-trust-check'

export const RESOLVE_CONCURRENCY = 4

export async function resolveAgents(
  dids: readonly string[],
  resolve: (did: string) => Promise<boolean>,
  onResult: (did: string, trusted: boolean) => void,
  signal?: AbortSignal,
  concurrency = RESOLVE_CONCURRENCY
): Promise<void> {
  let next = 0
  const worker = async () => {
    while (next < dids.length && !signal?.aborted) {
      const did = dids[next++]
      try {
        const trusted = await resolve(did)
        if (!signal?.aborted) onResult(did, trusted)
      } catch (error) {
        if (signal?.aborted) return
        logger.warn(`Could not resolve ${did}; it stays unresolved`, describeFailure(error))
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, dids.length) }, worker))
}

export function useAgentResolution(cfg: NetworkConfig, model: NetworkModel | null) {
  const agents = model?.agents
  useEffect(() => {
    if (!agents) return
    const controller = new AbortController()
    const indexer = createIndexerClient(cfg)
    const dids = agents.flatMap((agent) => agent.did ?? [])
    void resolveAgents(
      dids,
      async (did) => (await indexer.resolve(did, {}, controller.signal)).data.trusted,
      (did, trusted) => useObservatory.getState().setAgentVerdict(`agent:${did}`, trusted),
      controller.signal
    )
    return () => controller.abort()
  }, [cfg, agents])
}
