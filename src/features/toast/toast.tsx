'use client'

import { useObservatory } from '@/store/observatory-store'
import { GlassPanel } from '@/ui/glass-panel'

export function Toast() {
  const toast = useObservatory((s) => s.toast)
  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed top-[112px] left-1/2 z-20 -translate-x-1/2 transition-all duration-300 ${toast ? 'opacity-100' : '-translate-y-2 opacity-0'}`}
    >
      {toast && <GlassPanel className="px-3.5 py-2 text-[12.5px]">{toast}</GlassPanel>}
    </div>
  )
}
