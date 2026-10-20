'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ingestEvent } from '@/features/activity-feed/live-activity'
import { type FetchEvents, useReplay } from '@/features/activity-feed/replay'
import { tourSteps } from '@/features/tour/tour-steps'
import { useTour } from '@/features/tour/tour-store'
import { createIndexerClient } from '@/lib/api/indexer'
import type { NetworkConfig } from '@/lib/env'
import { usePrefersReducedMotion } from '@/scene/use-reduced-motion'
import { useObservatory } from '@/store/observatory-store'

export const STEP_MS = 9000
export const LIVE_STEP_MS = 18_000
const FADE_OUT_MS = 300
const FADE_HOLD_MS = 450
const STOP_EVENTS = ['keydown', 'pointerdown', 'wheel', 'touchstart'] as const

const currentHead = () => useObservatory.getState().blockHeight
const number = (n: number) => n.toLocaleString('en-US')

export function Autopilot({ cfg }: { cfg: NetworkConfig }) {
  const presenting = useTour((s) => s.presenting)
  const step = useTour((s) => s.step)
  const model = useObservatory((s) => s.model)
  const reduced = usePrefersReducedMotion()
  const [fading, setFading] = useState(false)
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const fetchEvents = useMemo<FetchEvents>(() => {
    const indexer = createIndexerClient(cfg)
    return async (after, limit) => (await indexer.events(after, limit)).data
  }, [cfg])
  const replay = useReplay(fetchEvents, ingestEvent, currentHead)
  const steps = useMemo(() => (model ? tourSteps(model, cfg.chainName) : null), [model, cfg.chainName])
  const liveStep = steps?.findIndex((s) => s.id === 'live-core') ?? -1
  const { start: startReplay, cancel: cancelReplay, state: replayState } = replay

  useEffect(() => {
    if (!presenting) return
    const stop = () => useTour.getState().exit()
    for (const type of STOP_EVENTS) window.addEventListener(type, stop, { capture: true, passive: true })
    return () => {
      for (const type of STOP_EVENTS) window.removeEventListener(type, stop, { capture: true })
    }
  }, [presenting])

  useEffect(() => {
    if (!presenting || step === null || !steps) return
    const live = step === liveStep
    if (live) void startReplay()
    const next = (step + 1) % steps.length
    const timer = setTimeout(
      () => {
        if (!reduced) {
          useTour.getState().go(next)
          return
        }
        setFading(true)
        fadeTimer.current = setTimeout(() => {
          useTour.getState().go(next)
          fadeTimer.current = setTimeout(() => setFading(false), FADE_HOLD_MS)
        }, FADE_OUT_MS)
      },
      live ? LIVE_STEP_MS : STEP_MS
    )
    return () => {
      clearTimeout(timer)
      if (live) cancelReplay()
    }
  }, [presenting, step, steps, liveStep, reduced, startReplay, cancelReplay])

  useEffect(() => {
    if (presenting) return
    clearTimeout(fadeTimer.current)
    setFading(false)
  }, [presenting])

  useEffect(() => () => clearTimeout(fadeTimer.current), [])

  useEffect(() => {
    if (!presenting) return
    const state = replayState
    useTour
      .getState()
      .setNote(
        state.status === 'running'
          ? `Replaying recorded transactions from blocks ${number(state.from)}–${number(state.to)}`
          : state.status === 'searching'
            ? 'Looking up the most recent recorded transactions…'
            : null
      )
  }, [presenting, replayState])

  return (
    <div
      data-testid="autopilot-fade"
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[15] bg-[#05040a] transition-opacity duration-300"
      style={{ opacity: fading ? 1 : 0 }}
    />
  )
}
