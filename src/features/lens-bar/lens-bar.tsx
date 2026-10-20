'use client'

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

  const choose = (next: LensId) => {
    setLens(next)
    replaceViewState({ lens: next })
  }

  return (
    <GlassPanel className="fixed left-1/2 top-4 z-10 flex -translate-x-1/2 gap-0.5 p-1">
      {LENSES.map((id) => (
        <button
          key={id}
          type="button"
          aria-pressed={lens === id}
          onClick={() => choose(id)}
          className={`cursor-pointer rounded-[10px] px-4 py-2 text-[12.5px] font-medium transition-colors ${
            lens === id ? 'bg-[var(--accent)] text-white' : 'text-scene-mut hover:text-white'
          }`}
        >
          {LABELS[id]}
        </button>
      ))}
    </GlassPanel>
  )
}
