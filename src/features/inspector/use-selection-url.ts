'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { parseViewState, serializeViewState } from '@/lib/view-state'
import { useObservatory } from '@/store/observatory-store'

export function useSelectionUrl() {
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()
  const model = useObservatory((s) => s.model)
  const restored = useRef(false)

  useEffect(() => {
    if (!model || restored.current) return
    restored.current = true
    const sel = parseViewState(search).sel
    if (sel && model.entities.has(sel)) useObservatory.getState().select(sel)
  }, [model, search])

  useEffect(
    () =>
      useObservatory.subscribe((state, previous) => {
        if (state.selected === previous.selected) return
        const current = parseViewState(new URLSearchParams(window.location.search))
        if (current.sel === state.selected) return
        const query = serializeViewState({ ...current, sel: state.selected })
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
      }),
    [router, pathname]
  )
}
