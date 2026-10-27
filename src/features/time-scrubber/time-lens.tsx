'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { NetworkModel } from '@/domain/network-model'
import type { IndexerEvent } from '@/lib/api/schemas'
import type { NetworkConfig } from '@/lib/env'
import { logger } from '@/lib/logger'
import { usePrefersReducedMotion } from '@/scene/use-reduced-motion'
import { useObservatory } from '@/store/observatory-store'
import { launchHistoryComets } from './history-comets'
import { type SnapshotView, TimeScrubber } from './time-scrubber'
import { FADE_MS, useTimeStore } from './time-store'
import { absentAt, missingFromLive } from './timeline'
import { useTimeUrl } from './use-time-url'
import { useTimeline } from './use-timeline'

const SNAPSHOT_DEBOUNCE_MS = 150
const PLAY_STEP_MS = 1400

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error))
const clamp = (h: number, head: number) => Math.min(head, Math.max(1, Math.round(h)))

export function TimeLens({ cfg }: { cfg: NetworkConfig }) {
  const active = useObservatory((s) => s.lens === 'time')
  const live = useObservatory((s) => s.model)
  const head = useObservatory((s) => s.blockHeight)
  const restore = useTimeUrl()
  const pending = useRef(restore)

  useEffect(() => {
    const time = useTimeStore.getState()
    if (!active) {
      if (time.height !== null || time.absent !== null || time.playing) {
        time.setPlaying(false)
        time.setHeight(null)
        time.setAbsent(null)
      }
      return
    }
    if (head === null || time.height !== null) return
    time.setHeight(clamp(pending.current ?? head, head))
    pending.current = null
  }, [active, head])

  if (!active || !live || head === null) return null
  return <ActiveTimeLens cfg={cfg} live={live} head={head} />
}

function ActiveTimeLens({ cfg, live, head }: { cfg: NetworkConfig; live: NetworkModel; head: number }) {
  const height = useTimeStore((s) => s.height)
  const playing = useTimeStore((s) => s.playing)
  const timeline = useTimeline(cfg)
  const [snapshot, setSnapshot] = useState<SnapshotView | null>(null)
  const [jumping, setJumping] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const { snapshotAt, blockTimeAt, nextEventAfter, eventsAt } = timeline
  const reduced = usePrefersReducedMotion()
  const pendingComets = useRef<{ height: number; events: IndexerEvent[] } | null>(null)
  const cometTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (height === null) return
    let cancelled = false
    setSnapshot({ status: 'loading', height })
    const timer = setTimeout(() => {
      const time = blockTimeAt(height).catch((error: unknown) => {
        logger.warn(`Could not read the time of block ${height}`, error)
        return null
      })
      Promise.all([snapshotAt(height), time]).then(
        ([past, blockTime]) => {
          if (cancelled) return
          useTimeStore.getState().setAbsent(absentAt(live, past.model))
          const missing = missingFromLive(live, past.model).length
          setSnapshot({ status: 'ready', height, model: past.model, time: blockTime, query: past.query, missing })
          const comets = pendingComets.current
          if (comets?.height !== height) return
          pendingComets.current = null
          clearTimeout(cometTimer.current)
          cometTimer.current = setTimeout(() => launchHistoryComets(comets.events, live), reduced ? 0 : FADE_MS)
        },
        (error: unknown) => {
          if (cancelled) return
          logger.error(`Could not read the network at block ${height}`, error)
          useTimeStore.getState().setPlaying(false)
          setSnapshot({ status: 'error', height, message: messageOf(error) })
        }
      )
    }, SNAPSHOT_DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
      clearTimeout(cometTimer.current)
    }
  }, [height, live, snapshotAt, blockTimeAt, reduced])

  const jumpNext = useCallback(async () => {
    const from = useTimeStore.getState().height
    if (from === null) return
    setJumping(true)
    setNotice(null)
    try {
      const next = await nextEventAfter(from)
      if (next === null || next > head) {
        useTimeStore.getState().setPlaying(false)
        setNotice('No later change on chain')
        return
      }
      pendingComets.current = { height: next, events: eventsAt(next) }
      useTimeStore.getState().setHeight(next)
    } catch (error) {
      logger.error(`Could not find the next change after block ${from}`, error)
      useTimeStore.getState().setPlaying(false)
      setNotice(`Next change unavailable: ${messageOf(error)}`)
    } finally {
      setJumping(false)
    }
  }, [head, nextEventAfter, eventsAt])

  const ready = snapshot?.status === 'ready' && snapshot.height === height
  useEffect(() => {
    if (!playing || !ready || jumping) return
    const timer = setTimeout(() => void jumpNext(), PLAY_STEP_MS)
    return () => clearTimeout(timer)
  }, [playing, ready, jumping, jumpNext])

  if (height === null || !snapshot) return null
  return (
    <TimeScrubber
      head={head}
      height={height}
      density={timeline.density}
      days={timeline.days}
      historyStatus={timeline.status}
      historyError={timeline.error ? messageOf(timeline.error) : null}
      snapshot={snapshot}
      playing={playing}
      jumping={jumping}
      notice={notice}
      onScrub={(h) => {
        useTimeStore.getState().setPlaying(false)
        setNotice(null)
        useTimeStore.getState().setHeight(clamp(h, head))
      }}
      onPlay={() => {
        setNotice(null)
        if (height >= head) useTimeStore.getState().setHeight(1)
        useTimeStore.getState().setPlaying(true)
      }}
      onPause={() => useTimeStore.getState().setPlaying(false)}
      onJump={() => void jumpNext()}
      onLive={() => {
        useTimeStore.getState().setPlaying(false)
        useTimeStore.getState().setHeight(head)
      }}
    />
  )
}
