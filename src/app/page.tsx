'use client'

import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { Footer } from '@/features/footer/footer'
import { Hud } from '@/features/hud/hud'
import { Legend } from '@/features/legend/legend'
import { LensBar } from '@/features/lens-bar/lens-bar'
import { ListFallback } from '@/features/list-fallback/list-fallback'
import { StardustLoader } from '@/features/loader/stardust-loader'
import { useLoadProgress } from '@/features/loader/use-load-progress'
import { Toast } from '@/features/toast/toast'
import { accentFor } from '@/lib/accent'
import { type LoadSink, networkLoadSteps } from '@/lib/api/load-network'
import { useNetworkConfig } from '@/lib/env'
import { parseViewState } from '@/lib/view-state'
import { hasWebGL } from '@/scene/webgl-support'
import { useObservatory } from '@/store/observatory-store'

const ObservatoryCanvas = dynamic(() => import('@/scene/observatory-canvas').then((m) => m.ObservatoryCanvas), {
  ssr: false,
})

function Observatory() {
  const cfg = useNetworkConfig()
  const search = useSearchParams()
  const [loaderGone, setLoaderGone] = useState(false)
  const sink = useMemo<LoadSink>(() => ({}), [])
  const steps = useMemo(() => networkLoadSteps(cfg, sink), [cfg, sink])
  const load = useLoadProgress(steps)
  const model = useObservatory((s) => s.model)
  const [webgl, setWebgl] = useState<boolean | null>(null)

  useEffect(() => setWebgl(hasWebGL()), [])

  useEffect(() => {
    useObservatory.getState().setLens(parseViewState(search).lens)
  }, [search])

  useEffect(() => {
    if (!load.done || !sink.model || sink.blockHeight === undefined) return
    useObservatory.setState({
      model: sink.model,
      blockHeight: sink.blockHeight,
      layouts: sink.layout ? { network: sink.layout } : {},
    })
  }, [load.done, sink])

  return (
    <main data-testid="observatory" style={{ '--accent': accentFor(cfg.chainName) } as React.CSSProperties}>
      {model && webgl === true && <ObservatoryCanvas model={model} />}
      {model && webgl === false && <ListFallback model={model} />}
      <Hud cfg={cfg} />
      <LensBar />
      <Legend />
      <Footer cfg={cfg} />
      <Toast />
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
