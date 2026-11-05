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
    const withoutModel = new Set<number>()
    let generation = 0
    const run = async ({ seq, did }: TrustCheckState) => {
      const mine = ++generation
      const model = useObservatory.getState().model
      if (model) withoutModel.delete(seq)
      else withoutModel.add(seq)
      const result = await runTrustCheck(did, model, clients)
      if (mine === generation) useObservatory.getState().finishTrustCheck(seq, result)
    }
    const pending = useObservatory.getState().trustCheck
    if (pending && !pending.result) void run(pending)
    return useObservatory.subscribe((state, previous) => {
      const check = state.trustCheck
      if (!check) return
      if (!check.result && check.seq !== previous.trustCheck?.seq) void run(check)
      else if (state.model && !previous.model && withoutModel.has(check.seq)) void run(check)
    })
  }, [cfg])
}
