'use client'

import { useEffect, useState } from 'react'
import { create } from 'zustand'
import {
  type DigestPeriod,
  type GrowthMetric,
  growthOf,
  periodLabel,
  type StatsBucket,
  whatChanged,
} from '@/domain/digest'
import { historyStart } from '@/features/economics-sim/load-economics'
import { createIndexerClient } from '@/lib/api/indexer'
import type { NetworkConfig } from '@/lib/env'
import { logger } from '@/lib/logger'
import { useObservatory } from '@/store/observatory-store'
import { Sparkline } from '@/ui/sparkline'

export type GrowthState =
  | { status: 'loading' }
  | { status: 'ready'; buckets: StatsBucket[] }
  | { status: 'error'; message: string }

export const useGrowth = create<{ state: GrowthState }>()(() => ({ state: { status: 'loading' } }))

export function useGrowthLoader(cfg: NetworkConfig) {
  const raw = useObservatory((s) => s.model?.raw ?? null)
  useEffect(() => {
    const model = useObservatory.getState().model
    if (!raw || !model) return
    let cancelled = false
    const now = new Date()
    useGrowth.setState({ state: { status: 'loading' } })
    createIndexerClient(cfg)
      .stats({
        entity_type: 'GLOBAL',
        granularity: 'DAY',
        result_type: 'BUCKETS',
        timestamp_from: historyStart(model, now),
        timestamp_until: now.toISOString(),
      })
      .then(
        (res) => {
          if (!cancelled) useGrowth.setState({ state: { status: 'ready', buckets: res.data.buckets ?? [] } })
        },
        (error: unknown) => {
          if (cancelled) return
          logger.error('Could not load the growth stats', error)
          useGrowth.setState({
            state: { status: 'error', message: error instanceof Error ? error.message : String(error) },
          })
        }
      )
    return () => {
      cancelled = true
    }
  }, [cfg, raw])
}

export function GrowthLine({ metric, total }: { metric: GrowthMetric; total: number | null }) {
  const state = useGrowth((s) => s.state)
  if (state.status !== 'ready') return null
  const growth = growthOf(state.buckets, metric, 'week')
  if (!growth || total === null) return null
  return (
    <div className="relative text-[10px] text-scene-mut tabular-nums">
      <span data-testid="sparkline" className="absolute right-0 -top-[22px]">
        <Sparkline values={growth.series} width={44} height={14} />
      </span>
      <span data-testid="growth" className="whitespace-nowrap">
        +{growth.delta.toLocaleString('en-US')} {growth.label} · {total.toLocaleString('en-US')} total
      </span>
    </div>
  )
}

export function GrowthUnavailable() {
  const failed = useGrowth((s) => s.state.status === 'error')
  if (!failed) return null
  return <div className="text-[10px] text-scene-mut">Growth unavailable: the indexer stats call failed</div>
}

export function WhatChanged() {
  const state = useGrowth((s) => s.state)
  const [open, setOpen] = useState(false)
  const [period, setPeriod] = useState<DigestPeriod>('day')
  if (state.status !== 'ready') return null
  const now = new Date()
  const changes = whatChanged(state.buckets, period, now)
  const label = periodLabel(state.buckets, period, now)
  const tab = (value: DigestPeriod, text: string) => (
    <button
      type="button"
      aria-pressed={period === value}
      onClick={() => setPeriod(value)}
      className={`cursor-pointer rounded-md px-1.5 py-0.5 ${period === value ? 'bg-[color-mix(in_srgb,var(--accent)_30%,transparent)] text-white' : 'text-scene-mut hover:text-white'}`}
    >
      {text}
    </button>
  )
  return (
    <div className="text-[11px]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="cursor-pointer text-[10px] uppercase tracking-[.09em] text-scene-mut hover:text-white"
      >
        What changed {open ? '▾' : '▸'}
      </button>
      {open && (
        <div className="mt-1">
          <div className="mb-1 flex items-center gap-1 text-[10px]">
            {tab('day', 'Day')}
            {tab('week', 'Week')}
            <span className="ml-1 text-scene-mut">{label}</span>
          </div>
          {changes.length > 0 ? (
            <ul className="m-0 list-none p-0">
              {changes.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-scene-mut">No changes recorded {label}</p>
          )}
        </div>
      )}
    </div>
  )
}
