'use client'

import { useEffect, useState } from 'react'
import { createIndexerClient } from '@/lib/api/indexer'
import type { NetworkConfig } from '@/lib/env'
import { useObservatory } from '@/store/observatory-store'
import { CoveragePanel } from './coverage-panel'
import { loadRegistry } from './load-registry'
import { RegistryPanel, type RegistryState } from './registry-panel'

export function RegistryLens({ cfg }: { cfg: NetworkConfig }) {
  const active = useObservatory((s) => s.lens === 'registry')
  const model = useObservatory((s) => s.model)
  const inspecting = useObservatory((s) => s.selected !== null || s.trustCheck !== null)
  const [requested, setRequested] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [state, setState] = useState<RegistryState>({ status: 'loading' })

  useEffect(() => {
    if (active) setRequested(true)
  }, [active])

  useEffect(() => {
    if (!requested || !model) return
    let cancelled = false
    const at = new Date()
    setNow(at)
    setState({ status: 'loading' })
    loadRegistry(createIndexerClient(cfg), model, at).then((data) => {
      if (!cancelled) setState({ status: 'ready', data })
    })
    return () => {
      cancelled = true
    }
  }, [requested, model, cfg])

  if (!active || !model) return null
  return (
    <>
      <RegistryPanel model={model} now={now} state={state} />
      {!inspecting && <CoveragePanel model={model} />}
    </>
  )
}
