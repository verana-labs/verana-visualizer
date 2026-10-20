'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { type GovernanceScene, type VotesState, withProposals } from '@/domain/governance'
import type { EntityId } from '@/domain/network-model'
import { createChainClient } from '@/lib/api/chain'
import { createIndexerClient } from '@/lib/api/indexer'
import type { NetworkConfig } from '@/lib/env'
import { logger } from '@/lib/logger'
import { parseViewState, serializeViewState } from '@/lib/view-state'
import { useObservatory } from '@/store/observatory-store'
import { GovernancePanel, type GovernanceState } from './governance-panel'
import { loadGovernance, loadVotes } from './load-governance'

const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

function initialProposalSel(): EntityId | null {
  if (typeof window === 'undefined') return null
  const sel = parseViewState(new URLSearchParams(window.location.search)).sel
  return sel?.startsWith('proposal:') ? sel : null
}

function setVotes(id: EntityId, votes: VotesState) {
  const { governance, setGovernance } = useObservatory.getState()
  if (governance) setGovernance({ ...governance, votes: new Map(governance.votes).set(id, votes) })
}

export function GovernanceLens({ cfg }: { cfg: NetworkConfig }) {
  const router = useRouter()
  const pathname = usePathname()
  const active = useObservatory((s) => s.lens === 'governance')
  const hasModel = useObservatory((s) => s.model !== null)
  const model = useObservatory((s) => s.model)
  const selected = useObservatory((s) => s.selected)
  const loaded = useObservatory((s) => s.governance !== null)
  const pending = useRef<EntityId | null>(initialProposalSel())
  const [requested, setRequested] = useState(pending.current !== null)
  const [state, setState] = useState<GovernanceState>({ status: 'loading' })

  useEffect(() => {
    if (active) setRequested(true)
  }, [active])

  useEffect(() => {
    if (!requested || !hasModel) return
    const base = useObservatory.getState().model
    if (!base) return
    let cancelled = false
    setState({ status: 'loading' })
    loadGovernance(
      createIndexerClient(cfg),
      createChainClient(cfg),
      base.raw.corporations.map((c) => c.id)
    ).then(
      (data) => {
        if (cancelled) return
        const scene: GovernanceScene = {
          proposals: new Map(data.proposals.map((p) => [p.id, p])),
          constellations: data.constellations,
          votes: new Map(),
          queries: data.queries,
        }
        useObservatory.setState({ model: withProposals(base, data.proposals), layouts: {}, governance: scene })
        setState({ status: 'ready', data })
        const sel = pending.current
        pending.current = null
        if (!sel) return
        if (scene.proposals.has(sel)) {
          useObservatory.getState().select(sel)
          return
        }
        useObservatory.getState().showToast(`Not found on ${cfg.chainId}`)
        const query = serializeViewState({
          ...parseViewState(new URLSearchParams(window.location.search)),
          sel: null,
        })
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
      },
      (error: unknown) => {
        if (cancelled) return
        logger.error('Could not load the governance lens data', error)
        setState({ status: 'error', message: message(error) })
      }
    )
    return () => {
      cancelled = true
    }
  }, [requested, hasModel, cfg, router, pathname])

  useEffect(() => {
    if (!loaded || !selected) return
    const proposal = useObservatory.getState().governance?.proposals.get(selected)
    if (!proposal || proposal.source !== 'group') return
    if (useObservatory.getState().governance?.votes.has(selected)) return
    setVotes(selected, { status: 'loading' })
    loadVotes(createIndexerClient(cfg), proposal.number).then(
      ({ votes, query }) => setVotes(selected, { status: 'ready', votes, query }),
      (error: unknown) => {
        logger.error(`Could not load the votes of ${selected}`, error)
        setVotes(selected, { status: 'error', message: message(error) })
      }
    )
  }, [loaded, selected, cfg])

  if (!active || !model) return null
  return <GovernancePanel chainId={cfg.chainId} model={model} state={state} />
}
