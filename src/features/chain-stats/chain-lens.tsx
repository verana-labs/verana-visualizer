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
} from './load-chain-stats'

export function ChainLens({ cfg }: { cfg: NetworkConfig }) {
  const active = useObservatory((s) => s.lens === 'chain')
  const [requested, setRequested] = useState(false)
  const [stats, setStats] = useState<NetworkStats | null>(null)
  const [blocks, setBlocks] = useState<BlockWindow | null>(null)
  const [validators, setValidators] = useState<ValidatorsState>({ status: 'loading' })
  const newest = useRef<number | null>(null)

  useEffect(() => {
    if (active) setRequested(true)
  }, [active])

  useEffect(() => {
    if (!requested) return
    let cancelled = false
    loadNetworkStats(cfg, new Date()).then((loaded) => {
      if (!cancelled) setStats(loaded)
    })
    loadBlockWindow(cfg).then((loaded) => {
      if (cancelled) return
      newest.current = loaded.blocks.at(-1)?.height ?? null
      setBlocks(loaded)
    })
    createChainClient(cfg)
      .validators()
      .then(
        (res) => {
          if (cancelled) return
          const orbs = validatorOrbs(res.data)
          useObservatory.getState().setChainValidators(orbs)
          setValidators({ status: 'ready', orbs, query: res.query })
        },
        (error: unknown) => {
          if (cancelled) return
          logger.error('Could not load the validators', error)
          setValidators({ status: 'error', message: error instanceof Error ? error.message : String(error) })
        }
      )
    return () => {
      cancelled = true
    }
  }, [requested, cfg])

  useEffect(() => {
    if (blocks) useObservatory.getState().setChainBlocks(streamBlocks(blocks.blocks))
  }, [blocks])

  useEffect(() => {
    if (!requested) return
    const chain = createChainClient(cfg)
    let disposed = false
    const unsubscribe = useObservatory.subscribe((state, previous) => {
      const height = state.blockHeight
      if (state.lens !== 'chain' || height === null || height === previous.blockHeight) return
      if (newest.current === null || height <= newest.current) return
      const from = Math.max(newest.current + 1, height - BLOCK_TIME_WINDOW + 1)
      newest.current = height
      for (let h = from; h <= height; h++) {
        chain
          .block(h)
          .then((res) => blockSummary(res.data))
          .then(
            (block) => {
              if (disposed) return
              setBlocks((current) =>
                current ? { ...current, blocks: mergeBlocks(current.blocks, [block], BLOCK_TIME_WINDOW) } : current
              )
            },
            (error: unknown) => logger.error(`Could not read block ${h} from the chain`, error)
          )
      }
    })
    return () => {
      disposed = true
      unsubscribe()
    }
  }, [requested, cfg])

  if (!active) return null
  return <ChainStatsPanel chainId={cfg.chainId} rows={statRows(stats, blocks)} validators={validators} />
}
