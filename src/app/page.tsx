'use client'

import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { ActivityFeed } from '@/features/activity-feed/activity-feed'
import { Autopilot } from '@/features/autopilot/autopilot'
import { ChainLens } from '@/features/chain-stats/chain-lens'
import { EconomicsLens } from '@/features/economics-sim/economics-lens'
import { Footer } from '@/features/footer/footer'
import { GovernanceLens } from '@/features/governance/governance-lens'
import { HealthStrip } from '@/features/health-strip/health-strip'
import { HoverCard } from '@/features/hover-card/hover-card'
import { useGrowthLoader } from '@/features/hud/growth'
import { Hud } from '@/features/hud/hud'
import { Inspector } from '@/features/inspector/inspector'
import { useSelectionUrl } from '@/features/inspector/use-selection-url'
import { Legend } from '@/features/legend/legend'
import { LensBar } from '@/features/lens-bar/lens-bar'
import { ListFallback } from '@/features/list-fallback/list-fallback'
import { StardustLoader } from '@/features/loader/stardust-loader'
import { useLoadProgress } from '@/features/loader/use-load-progress'
import { RegistryLens } from '@/features/registry/registry-lens'
import { SearchPalette } from '@/features/search/search-palette'
import { TimeLens } from '@/features/time-scrubber/time-lens'
import { Toast } from '@/features/toast/toast'
import { Tour } from '@/features/tour/tour'
import { useAgentResolution } from '@/features/trust-check/agent-resolution'
import { useTrustCheckRunner } from '@/features/trust-check/use-trust-check-runner'
import { accentFor } from '@/lib/accent'
import { type LoadSink, networkLoadSteps } from '@/lib/api/load-network'
import { useNetworkConfig } from '@/lib/env'
import { replaceViewState } from '@/lib/replace-view-state'
import { parseViewState } from '@/lib/view-state'
import { SceneErrorBoundary } from '@/scene/scene-error-boundary'
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
  useSelectionUrl(cfg.chainId, loaderGone)
  useTrustCheckRunner(cfg)
  useAgentResolution(cfg, loaderGone ? model : null)
  useGrowthLoader(cfg)

  useEffect(() => setWebgl(hasWebGL()), [])

  useEffect(() => {
    useObservatory.getState().setLens(parseViewState(search).lens)
  }, [search])

  useEffect(() => {
    if (!loaderGone) return
    const { q } = parseViewState(new URLSearchParams(window.location.search))
    if (!q) return
    replaceViewState({ q: null })
    useObservatory.getState().openPalette('search', q)
  }, [loaderGone])

  useEffect(() => {
    if (!load.done || !sink.model || sink.blockHeight === undefined) return
    useObservatory.setState({
      model: sink.model,
      blockHeight: sink.blockHeight,
      layouts: sink.layout ? { network: sink.layout } : {},
      queries: sink.queries ?? {},
    })
  }, [load.done, sink])

  return (
    <main data-testid="observatory" style={{ '--accent': accentFor(cfg.chainName) } as React.CSSProperties}>
      {model && webgl === true && (
        <SceneErrorBoundary
          fallback={(message) => <ListFallback model={model} notice={`The 3D view stopped working (${message}).`} />}
        >
          <ObservatoryCanvas model={model} />
        </SceneErrorBoundary>
      )}
      {model && webgl === false && <ListFallback model={model} />}
      <Hud cfg={cfg}>
        <HealthStrip cfg={cfg} />
      </Hud>
      <LensBar />
      <SearchPalette cfg={cfg} />
      <Legend />
      {model && <ActivityFeed cfg={cfg} />}
      {model && <EconomicsLens cfg={cfg} />}
      {model && <ChainLens cfg={cfg} />}
      {model && <RegistryLens cfg={cfg} />}
      {model && <TimeLens cfg={cfg} />}
      {model && <GovernanceLens cfg={cfg} />}
      <Footer cfg={cfg} />
      <Inspector frontendUrl={cfg.frontendUrl} chainId={cfg.chainId} />
      {webgl === true && <HoverCard />}
      <Toast />
      <Tour ready={loaderGone} cfg={cfg} />
      <Autopilot cfg={cfg} />
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
