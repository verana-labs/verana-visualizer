'use client'

import { useEffect, useRef, useState } from 'react'
import { type GovernanceScene, withProposals } from '@/domain/governance'
import type { EntityId } from '@/domain/network-model'
import { createChainClient } from '@/lib/api/chain'
import { createIndexerClient } from '@/lib/api/indexer'
import type { NetworkConfig } from '@/lib/env'
import { logger } from '@/lib/logger'
import { replaceViewState } from '@/lib/replace-view-state'
import { parseViewState } from '@/lib/view-state'
import { useObservatory } from '@/store/observatory-store'
import { GovernancePanel, type GovernanceState } from './governance-panel'
import { loadGovernance, loadVotes } from './load-governance'
import { setProposalVotes } from './proposal-votes'

const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

function initialProposalSel(): EntityId | null {
  if (typeof window === 'undefined') return null
  const sel = parseViewState(new URLSearchParams(window.location.search)).sel
  return sel?.startsWith('proposal:') ? sel : null
}

export function GovernanceLens({ cfg }: { cfg: NetworkConfig }) {
  const active = useObservatory((s) => s.lens === 'governance')
  const raw = useObservatory((s) => s.model?.raw ?? null)
  const model = useObservatory((s) => s.model)
  const selected = useObservatory((s) => s.selected)
  const loaded = useObservatory((s) => s.governance !== null)
  const votesStatus = useObservatory((s) => (selected ? s.governance?.votes.get(selected)?.status : undefined))
  const pending = useRef<EntityId | null>(null)
  const started = useRef<object | null>(null)
  const [requested, setRequested] = useState(false)
  const [state, setState] = useState<GovernanceState>({ status: 'loading' })

  useEffect(() => {
    pending.current = initialProposalSel()
    if (pending.current) setRequested(true)
  }, [])

  useEffect(() => {
    if (active) setRequested(true)
  }, [active])

  useEffect(() => {
    if (!requested || !raw || started.current === raw) return
    started.current = raw
    setState({ status: 'loading' })
    loadGovernance(
      createIndexerClient(cfg),
      createChainClient(cfg),
      raw.corporations.map((c) => c.id)
    ).then(
      (data) => {
        const current = useObservatory.getState().model
        if (!current || current.raw !== raw) return
        const scene: GovernanceScene = {
          proposals: new Map(data.proposals.map((p) => [p.id, p])),
          constellations: data.constellations,
          votes: new Map(),
          queries: data.queries,
        }
        useObservatory.setState({ model: withProposals(current, data.proposals), layouts: {}, governance: scene })
        setState({ status: 'ready', data })
        const sel = pending.current
        pending.current = null
        if (!sel) return
        if (scene.proposals.has(sel)) {
          useObservatory.getState().select(sel)
          return
        }
        useObservatory.getState().showToast(`Not found on ${cfg.chainId}`)
        replaceViewState({ sel: null })
      },
      (error: unknown) => {
        if (useObservatory.getState().model?.raw !== raw) return
        logger.error('Could not load the governance lens data', error)
        setState({ status: 'error', message: message(error) })
      }
    )
  }, [requested, raw, cfg])

  useEffect(() => {
    if (!loaded || !selected || (votesStatus !== undefined && votesStatus !== 'idle')) return
    const proposal = useObservatory.getState().governance?.proposals.get(selected)
    if (!proposal || proposal.source !== 'group') return
    setProposalVotes(selected, { status: 'loading' })
    loadVotes(createIndexerClient(cfg), proposal.number).then(
      ({ votes, query }) => setProposalVotes(selected, { status: 'ready', votes, query }),
      (error: unknown) => {
        logger.error(`Could not load the votes of ${selected}`, error)
        setProposalVotes(selected, { status: 'error', message: message(error) })
      }
    )
  }, [loaded, selected, votesStatus, cfg])

  useEffect(
    () =>
      useObservatory.subscribe((now, before) => {
        const sel = now.selected
        if (sel === before.selected || !sel?.startsWith('proposal:') || now.lens === 'governance') return
        setTimeout(() => {
          const latest = useObservatory.getState()
          if (latest.selected !== sel || latest.lens === 'governance') return
          latest.setLens('governance')
          replaceViewState({ lens: 'governance', sel })
        }, 0)
      }),
    []
  )

  if (!active || !model) return null
  return <GovernancePanel chainId={cfg.chainId} model={model} state={state} />
}
