'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef } from 'react'
import { useTimeStore } from '@/features/time-scrubber/time-store'
import { createIndexerClient } from '@/lib/api/indexer'
import type { NetworkConfig } from '@/lib/env'
import { isTyping } from '@/lib/is-typing'
import { logger } from '@/lib/logger'
import { replaceViewState } from '@/lib/replace-view-state'
import { parseViewState } from '@/lib/view-state'
import { useObservatory } from '@/store/observatory-store'
import { Button } from '@/ui/button'
import { GlassPanel } from '@/ui/glass-panel'
import { firstEcosystemBlock } from './time-step'
import { type TourStep, tourSteps } from './tour-steps'
import { useTour } from './tour-store'

function applyStep(step: TourStep) {
  const observatory = useObservatory.getState()
  observatory.setLens(step.lens)
  if (step.did) observatory.requestTrustCheck(step.did)
  else observatory.select(step.select)
}

export function useTourSteps(chainName: string): TourStep[] | null {
  const raw = useObservatory((s) => s.model?.raw)
  return useMemo(() => {
    const model = useObservatory.getState().model
    return raw && model ? tourSteps(model, chainName) : null
  }, [raw, chainName])
}

function openAtFirstEcosystem(cfg: NetworkConfig, step: number): () => void {
  const model = useObservatory.getState().model
  let cancelled = false
  if (model) {
    firstEcosystemBlock(createIndexerClient(cfg), model).then(
      (first) => {
        if (cancelled || !first || useTour.getState().step !== step) return
        useTimeStore.getState().setHeight(first.height)
        useTour
          .getState()
          .setNote(
            `Block ${first.height.toLocaleString('en-US')}: ${first.name} was created, the first ecosystem on ${cfg.chainName}.`
          )
      },
      (error: unknown) => {
        if (cancelled) return
        logger.warn('Could not find the block of the first ecosystem', error)
        useTour
          .getState()
          .setNote(
            `The first ecosystem’s block is unavailable: ${error instanceof Error ? error.message : String(error)}`
          )
      }
    )
  }
  return () => {
    cancelled = true
  }
}

export function Tour({ ready, cfg }: { ready: boolean; cfg: NetworkConfig }) {
  const search = useSearchParams()
  const step = useTour((s) => s.step)
  const presenting = useTour((s) => s.presenting)
  const note = useTour((s) => s.note)
  const steps = useTourSteps(cfg.chainName)
  const restored = useRef(false)
  const shown = useRef(false)

  useEffect(() => {
    if (!ready || !steps || restored.current) return
    restored.current = true
    const fromUrl = parseViewState(search).tour
    if (fromUrl !== null && fromUrl < steps.length) useTour.getState().start(fromUrl)
  }, [ready, steps, search])

  useEffect(() => {
    if (!restored.current || useTour.getState().step !== null || parseViewState(search).tour === null) return
    replaceViewState({ tour: null })
  }, [search])

  useEffect(() => {
    if (!steps) return
    if (step === null) {
      if (!shown.current) return
      shown.current = false
      replaceViewState({ tour: null })
      return
    }
    const active = steps[step]
    if (!active) return
    shown.current = true
    useTour.getState().setNote(null)
    applyStep(active)
    replaceViewState({ lens: active.lens, sel: useObservatory.getState().selected, tour: step, cam: null })
    if (active.id === 'time') return openAtFirstEcosystem(cfg, step)
  }, [step, steps, cfg])

  useEffect(() => {
    if (step === null || presenting) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isTyping(event.target)) useTour.getState().exit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, presenting])

  if (step === null || !steps?.[step]) return null
  const last = step === steps.length - 1
  const { go, exit } = useTour.getState()

  return (
    <GlassPanel
      role="dialog"
      aria-label="Guided tour"
      className={`fixed ${steps[step].lens === 'time' ? 'top-[120px]' : 'bottom-[80px]'} left-1/2 z-20 w-[min(560px,calc(100vw-32px))] -translate-x-1/2 px-5 py-4 text-center lg:w-[min(560px,calc(100vw-760px))] lg:min-w-[380px]`}
    >
      <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-[.09em] text-scene-mut">
        <span>
          {presenting ? 'presenting · any key or click stops' : 'tour'} · {step + 1} / {steps.length}
        </span>
        {!presenting && (
          <button
            type="button"
            aria-label="Exit tour"
            onClick={exit}
            className="cursor-pointer px-1 text-[14px] leading-none text-scene-mut hover:text-white"
          >
            ×
          </button>
        )}
      </div>
      <p key={step} className="m-0 text-[14.5px] leading-normal motion-safe:animate-[feed-in_.5s_ease-out]">
        {steps[step].caption}
      </p>
      {note && <p className="mt-1.5 mb-0 text-[11px] text-scene-mut">{note}</p>}
      {!presenting && (
        <div className="mt-3 flex justify-center gap-2">
          {step > 0 && (
            <Button className="!bg-transparent" onClick={() => go(step - 1)}>
              Back
            </Button>
          )}
          <Button onClick={() => (last ? exit() : go(step + 1))}>{last ? 'Done' : 'Next'}</Button>
        </div>
      )}
    </GlassPanel>
  )
}
