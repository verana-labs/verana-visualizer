'use client'

import { useEffect, useRef } from 'react'
import { LENSES } from '@/layouts'
import type { LensId } from '@/layouts/types'
import { replaceViewState } from '@/lib/replace-view-state'
import { useObservatory } from '@/store/observatory-store'
import { GlassPanel } from '@/ui/glass-panel'

const LABELS: Record<LensId, string> = {
  network: 'Network',
  trust: 'Trust',
  economics: 'Economics',
  chain: 'Chain',
  time: 'Time',
  governance: 'Governance',
  registry: 'Registry',
}

export function LensBar() {
  const lens = useObservatory((s) => s.lens)
  const setLens = useObservatory((s) => s.setLens)
  const bar = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bar.current?.querySelector(`[data-lens="${lens}"]`)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [lens])

  const choose = (next: LensId) => {
    setLens(next)
    replaceViewState({ lens: next })
  }

  return (
    <GlassPanel
      ref={bar}
      role="group"
      aria-label="Lenses"
      className="fixed left-1/2 top-4 z-10 flex -translate-x-1/2 gap-0.5 p-1 max-xl:left-[356px] max-xl:right-4 max-xl:w-fit max-xl:max-w-[calc(100vw-372px)] max-xl:translate-x-0 max-xl:overflow-x-auto max-xl:[scrollbar-width:none] max-md:inset-x-4 max-md:top-3 max-md:w-auto max-md:max-w-none"
    >
      {LENSES.filter((id) => id === 'network' || id === 'trust').map((id) => (
        <button
          key={id}
          data-lens={id}
          type="button"
          aria-pressed={lens === id}
          onClick={() => choose(id)}
          className={`shrink-0 cursor-pointer rounded-[10px] px-3 py-2 text-[12.5px] 2xl:px-4 font-medium transition-colors ${
            lens === id ? 'bg-[var(--accent)] text-white' : 'text-scene-mut hover:text-white'
          }`}
        >
          {LABELS[id]}
        </button>
      ))}
    </GlassPanel>
  )
}
