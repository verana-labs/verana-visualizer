'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { replaceViewState } from '@/lib/replace-view-state'
import { parseViewState } from '@/lib/view-state'
import { useObservatory } from '@/store/observatory-store'

export function useSelectionUrl(chainId: string, ready: boolean) {
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
    replaceViewState({ sel: null })
  }, [model, search])

  useEffect(() => {
    if (!missing || !ready) return
    useObservatory.getState().showToast(`Not found on ${chainId}`)
    setMissing(false)
  }, [missing, ready, chainId])

  useEffect(
    () =>
      useObservatory.subscribe((state, previous) => {
        if (state.selected === previous.selected) return
        replaceViewState({ sel: state.selected })
      }),
    []
  )
}
