'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { parseViewState, serializeViewState } from '@/lib/view-state'
import { useObservatory } from '@/store/observatory-store'

export function useSelectionUrl(chainId: string, ready: boolean) {
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()
  const model = useObservatory((s) => s.model)
  const restored = useRef(false)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (!model || restored.current) return
    restored.current = true
    const view = parseViewState(search)
    if (!view.sel || view.sel.startsWith('proposal:')) return
    if (model.entities.has(view.sel)) {
      useObservatory.getState().select(view.sel)
      return
    }
    setMissing(true)
    const query = serializeViewState({ ...view, sel: null })
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [model, search, router, pathname])

  useEffect(() => {
    if (!missing || !ready) return
    useObservatory.getState().showToast(`Not found on ${chainId}`)
    setMissing(false)
  }, [missing, ready, chainId])

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
