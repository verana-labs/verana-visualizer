'use client'

import { useEffect, useRef, useState } from 'react'
import { createChainClient } from '@/lib/api/chain'
import type { NetworkConfig } from '@/lib/env'
import { logger } from '@/lib/logger'
import { useObservatory } from '@/store/observatory-store'
import { streamBlocks, validatorOrbs } from './chain-scene'
import { ChainStatsPanel, type ValidatorsState } from './chain-stats-panel'
import {
  BLOCK_TIME_WINDOW,
  type BlockWindow,
  blockSummary,
  loadBlockWindow,
  loadNetworkStats,
  mergeBlocks,
  type NetworkStats,
  statRows,
  unavailableStats,
} from './load-chain-stats'

export const STATS_REFRESH_MS = 30_000

const reasonOf = (error: unknown) => (error instanceof Error ? error.message : String(error))

export function ChainLens({ cfg }: { cfg: NetworkConfig }) {
  const active = useObservatory((s) => s.lens === 'chain')
  const [requested, setRequested] = useState(false)
  const [stats, setStats] = useState<NetworkStats | null>(null)
  const [blocks, setBlocks] = useState<BlockWindow | null>(null)
  const [validators, setValidators] = useState<ValidatorsState>({ status: 'loading' })
  const blocksRef = useRef<BlockWindow | null>(null)
  blocksRef.current = blocks

  useEffect(() => {
    if (active) setRequested(true)
  }, [active])

  useEffect(() => {
    if (!requested) return
    let disposed = false
    let issued = 0
    let applied = 0
    const refresh = (first: boolean) => {
      if (!first && useObservatory.getState().lens !== 'chain') return
      const id = ++issued
      const current = () => !disposed && id > applied
      loadNetworkStats(cfg, new Date()).then(
        (loaded) => {
          if (!current()) return
          applied = id
          setStats(loaded)
        },
        (error: unknown) => {
          logger.error('Could not load the chain stats', error)
          if (current()) setStats(unavailableStats(reasonOf(error)))
        }
      )
      createChainClient(cfg)
        .validators()
        .then((res) => ({ orbs: validatorOrbs(res.data), query: res.query }))
        .then(
          ({ orbs, query }) => {
            if (disposed) return
            useObservatory.getState().setChainValidators(orbs)
            setValidators({ status: 'ready', orbs, query })
          },
          (error: unknown) => {
            logger.error('Could not load the validators', error)
            if (!disposed) setValidators({ status: 'error', message: reasonOf(error) })
          }
        )
    }
    refresh(true)
    const timer = setInterval(() => refresh(false), STATS_REFRESH_MS)
    return () => {
      disposed = true
      clearInterval(timer)
      const store = useObservatory.getState()
      store.setChainBlocks([])
      store.setChainValidators(null)
      setStats(null)
      setBlocks(null)
      setValidators({ status: 'loading' })
    }
  }, [requested, cfg])

  useEffect(() => {
    if (!requested) return
    let disposed = false
    loadBlockWindow(cfg).then(
      (loaded) => {
        if (!disposed) setBlocks(loaded)
      },
      (error: unknown) => {
        logger.error('Could not load the block window', error)
        if (!disposed) setBlocks({ blocks: [], error: reasonOf(error), query: null })
      }
    )
    return () => {
      disposed = true
    }
  }, [requested, cfg])

  useEffect(() => {
    if (blocks) useObservatory.getState().setChainBlocks(streamBlocks(blocks.blocks))
  }, [blocks])

  useEffect(() => {
    if (!requested) return
    const chain = createChainClient(cfg)
    const inFlight = new Set<number>()
    let disposed = false
    const fetchBlock = (height: number) => {
      inFlight.add(height)
      chain
        .block(height)
        .then((res) => blockSummary(res.data))
        .then(
          (block) => {
            if (disposed) return
            setBlocks((current) => ({
              blocks: mergeBlocks(current?.blocks ?? [], [block], BLOCK_TIME_WINDOW),
              error: null,
              query: current?.query ?? null,
            }))
          },
          (error: unknown) => logger.error(`Could not read block ${height} from the chain, will retry`, error)
        )
        .finally(() => inFlight.delete(height))
    }
    const unsubscribe = useObservatory.subscribe((state, previous) => {
      const height = state.blockHeight
      if (state.lens !== 'chain' || height === null || height === previous.blockHeight) return
      const current = blocksRef.current
      if (current === null) return
      const top = Math.max(height, current.blocks.at(-1)?.height ?? 0)
      const known = new Set(current.blocks.map((b) => b.height))
      for (let h = Math.max(1, top - BLOCK_TIME_WINDOW + 1); h <= top; h++)
        if (!known.has(h) && !inFlight.has(h)) fetchBlock(h)
    })
    return () => {
      disposed = true
      unsubscribe()
    }
  }, [requested, cfg])

  if (!active) return null
  return <ChainStatsPanel chainId={cfg.chainId} rows={statRows(stats, blocks)} validators={validators} />
}
