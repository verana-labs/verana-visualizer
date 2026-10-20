'use client'

import { useEffect, useState } from 'react'
import { createIndexerClient } from '@/lib/api/indexer'
import type { NetworkConfig } from '@/lib/env'
import { isTyping } from '@/lib/is-typing'
import { logger } from '@/lib/logger'
import { useObservatory } from '@/store/observatory-store'
import { EconomicsPanel, type EconomicsState } from './economics-panel'
import { economicsScene } from './economics-scene'
import { loadEconomics } from './load-economics'
import { SimulationPanel } from './simulation-panel'

export function EconomicsLens({ cfg }: { cfg: NetworkConfig }) {
  const active = useObservatory((s) => s.lens === 'economics')
  const model = useObservatory((s) => s.model)
  const simulationOpen = useObservatory((s) => s.simulationOpen)
  const setSimulationOpen = useObservatory((s) => s.setSimulationOpen)
  const [requested, setRequested] = useState(false)
  const [state, setState] = useState<EconomicsState>({ status: 'loading' })

  useEffect(() => {
    if (active) setRequested(true)
  }, [active])

  useEffect(() => {
    if (!requested || !model) return
    let cancelled = false
    setState({ status: 'loading' })
    loadEconomics(createIndexerClient(cfg), model, new Date()).then(
      (data) => {
        if (cancelled) return
        useObservatory.getState().setEconomics(economicsScene(model, data.deposits))
        setState({ status: 'ready', data })
      },
      (error: unknown) => {
        if (cancelled) return
        logger.error('Could not load the economics lens data', error)
        setState({ status: 'error', message: error instanceof Error ? error.message : String(error) })
      }
    )
    return () => {
      cancelled = true
    }
  }, [requested, model, cfg])

  useEffect(() => {
    if (!simulationOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isTyping(event.target)) setSimulationOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [simulationOpen, setSimulationOpen])

  if (!active || !model) return null
  return (
    <>
      <EconomicsPanel
        chainId={cfg.chainId}
        model={model}
        state={state}
        onOpenSimulation={() => setSimulationOpen(true)}
      />
      {simulationOpen && state.status === 'ready' && (
        <SimulationPanel
          chainId={cfg.chainId}
          model={model}
          rates={state.data.rates}
          tuRate={state.data.tuRate}
          onClose={() => setSimulationOpen(false)}
        />
      )}
    </>
  )
}
