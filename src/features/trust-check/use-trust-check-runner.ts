'use client'

import { useEffect } from 'react'
import { createGraphClient } from '@/lib/api/graph'
import { createIndexerClient } from '@/lib/api/indexer'
import type { NetworkConfig } from '@/lib/env'
import { type TrustCheckState, useObservatory } from '@/store/observatory-store'
import { runTrustCheck } from './run-trust-check'

export function useTrustCheckRunner(cfg: NetworkConfig) {
  useEffect(() => {
    const clients = { indexer: createIndexerClient(cfg), graph: createGraphClient(cfg) }
    const run = async ({ seq, did }: TrustCheckState) => {
      const result = await runTrustCheck(did, useObservatory.getState().model, clients)
      useObservatory.getState().finishTrustCheck(seq, result)
    }
    const pending = useObservatory.getState().trustCheck
    if (pending && !pending.result) void run(pending)
    return useObservatory.subscribe((state, previous) => {
      const check = state.trustCheck
      if (check && !check.result && check.seq !== previous.trustCheck?.seq) void run(check)
    })
  }, [cfg])
}
