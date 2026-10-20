'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { createChainClient } from '@/lib/api/chain'
import { createIndexerClient } from '@/lib/api/indexer'
import type { IndexerEvent } from '@/lib/api/schemas'
import type { NetworkConfig } from '@/lib/env'
import {
  buildDays,
  buildDensity,
  type DayMark,
  type DensityPoint,
  loadEvents,
  loadModelAt,
  nextChangeAfter,
  type Snapshot,
} from './timeline'

const DAY_MS = 86_400_000
const NO_DENSITY: DensityPoint[] = []
const NO_DAYS: DayMark[] = []

export interface TimelineHistory {
  events: IndexerEvent[]
  density: DensityPoint[]
  days: DayMark[]
}

const dayStart = (timestamp: string) => `${timestamp.slice(0, 10)}T00:00:00Z`

export function useTimeline(cfg: NetworkConfig) {
  const client = useQueryClient()
  const indexer = useMemo(() => createIndexerClient(cfg), [cfg])
  const chain = useMemo(() => createChainClient(cfg), [cfg])

  const history = useQuery({
    queryKey: ['time-history', cfg.indexerUrl],
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: async (): Promise<TimelineHistory> => {
      const events = await loadEvents(async (after, limit) => (await indexer.events(after, limit)).data)
      if (events.length === 0) return { events, density: [], days: [] }
      const stats = await indexer.stats({
        timestamp_from: dayStart(events[0].timestamp),
        timestamp_until: dayStart(new Date(Date.now() + DAY_MS).toISOString()),
        entity_type: 'GLOBAL',
        granularity: 'DAY',
        result_type: 'BUCKETS',
      })
      return { events, density: buildDensity(events), days: buildDays(stats.data.buckets ?? [], events) }
    },
  })

  const snapshotAt = useCallback(
    (height: number): Promise<Snapshot> =>
      client.fetchQuery({
        queryKey: ['time-model', cfg.indexerUrl, height],
        queryFn: () => loadModelAt(cfg, height),
        staleTime: Number.POSITIVE_INFINITY,
      }),
    [client, cfg]
  )

  const nextEventAfter = useCallback(
    (height: number): Promise<number | null> =>
      client.fetchQuery({
        queryKey: ['time-next', cfg.indexerUrl, height],
        queryFn: () => nextChangeAfter(indexer, height),
        staleTime: Number.POSITIVE_INFINITY,
      }),
    [client, cfg, indexer]
  )

  const blockTimeAt = useCallback(
    (height: number): Promise<string> =>
      client.fetchQuery({
        queryKey: ['time-block', cfg.restUrl, height],
        queryFn: async () => (await chain.block(height)).data.block.header.time,
        staleTime: Number.POSITIVE_INFINITY,
      }),
    [client, cfg, chain]
  )

  const eventsAt = useCallback(
    (height: number) => (history.data?.events ?? []).filter((ev) => ev.block_height === height),
    [history.data]
  )

  return {
    status: history.status,
    error: history.error,
    density: history.data?.density ?? NO_DENSITY,
    days: history.data?.days ?? NO_DAYS,
    eventsAt,
    nextEventAfter,
    snapshotAt,
    blockTimeAt,
  }
}

export type Timeline = ReturnType<typeof useTimeline>
