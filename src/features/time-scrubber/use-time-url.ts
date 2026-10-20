'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { parseViewState, serializeViewState } from '@/lib/view-state'
import { useTimeStore } from './time-store'

export const T_DEBOUNCE_MS = 250

export function useTimeUrl(): number | null {
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()
  const [restore] = useState(() => parseViewState(search).t)

  useEffect(() => {
    const view = parseViewState(search)
    if (view.t === null || view.lens === 'time' || useTimeStore.getState().height !== null) return
    const query = serializeViewState({ ...view, t: null })
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [search, router, pathname])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = useTimeStore.subscribe((state, previous) => {
      if (state.height === previous.height) return
      clearTimeout(timer)
      timer = setTimeout(() => {
        const current = parseViewState(new URLSearchParams(window.location.search))
        const t = useTimeStore.getState().height
        if (current.t === t) return
        const query = serializeViewState({ ...current, t })
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
      }, T_DEBOUNCE_MS)
    })
    return () => {
      clearTimeout(timer)
      unsubscribe()
    }
  }, [router, pathname])

  return restore
}
