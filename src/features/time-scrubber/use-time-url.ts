'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { replaceViewState } from '@/lib/replace-view-state'
import { parseViewState } from '@/lib/view-state'
import { useTimeStore } from './time-store'

export const T_DEBOUNCE_MS = 250

export function useTimeUrl(): number | null {
  const search = useSearchParams()
  const [restore] = useState(() => parseViewState(search).t)

  useEffect(() => {
    const view = parseViewState(search)
    if (view.t === null || view.lens === 'time' || useTimeStore.getState().height !== null) return
    replaceViewState({ t: null })
  }, [search])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = useTimeStore.subscribe((state, previous) => {
      if (state.height === previous.height) return
      clearTimeout(timer)
      timer = setTimeout(() => {
        replaceViewState({ t: useTimeStore.getState().height })
      }, T_DEBOUNCE_MS)
    })
    return () => {
      clearTimeout(timer)
      unsubscribe()
    }
  }, [])

  return restore
}
