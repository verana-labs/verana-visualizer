'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { Footer } from '@/features/footer/footer'
import { Hud } from '@/features/hud/hud'
import { Legend } from '@/features/legend/legend'
import { LensBar } from '@/features/lens-bar/lens-bar'
import { StardustLoader } from '@/features/loader/stardust-loader'
import { useLoadProgress } from '@/features/loader/use-load-progress'
import { accentFor } from '@/lib/accent'
import { type LoadSink, networkLoadSteps } from '@/lib/api/load-network'
import { useNetworkConfig } from '@/lib/env'
import { parseViewState } from '@/lib/view-state'
import { useObservatory } from '@/store/observatory-store'

function Observatory() {
  const cfg = useNetworkConfig()
  const search = useSearchParams()
  const [loaderGone, setLoaderGone] = useState(false)
  const sink = useMemo<LoadSink>(() => ({}), [])
  const steps = useMemo(() => networkLoadSteps(cfg, sink), [cfg, sink])
  const load = useLoadProgress(steps)

  useEffect(() => {
    useObservatory.getState().setLens(parseViewState(search).lens)
  }, [search])

  useEffect(() => {
    if (!load.done || !sink.model || sink.blockHeight === undefined) return
    useObservatory.setState({ model: sink.model, blockHeight: sink.blockHeight })
  }, [load.done, sink])

  return (
    <main data-testid="observatory" style={{ '--accent': accentFor(cfg.chainName) } as React.CSSProperties}>
      <Hud cfg={cfg} />
      <LensBar />
      <Legend />
      <Footer cfg={cfg} />
      {!loaderGone && (
        <StardustLoader
          progress={load.progress}
          label={load.label}
          error={load.error}
          done={load.done}
          onExited={() => setLoaderGone(true)}
          onRetry={load.retry}
        />
      )}
    </main>
  )
}

export default function Page() {
  return (
    <Suspense>
      <Observatory />
    </Suspense>
  )
}
