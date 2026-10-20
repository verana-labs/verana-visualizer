'use client'

import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'
import { buildNetworkModel } from '@/domain/network-model'
import { Footer } from '@/features/footer/footer'
import { Hud } from '@/features/hud/hud'
import { Legend } from '@/features/legend/legend'
import { LensBar } from '@/features/lens-bar/lens-bar'
import { accentFor } from '@/lib/accent'
import { loadRawNetwork } from '@/lib/api/load-network'
import { useNetworkConfig } from '@/lib/env'
import { parseViewState } from '@/lib/view-state'
import { useObservatory } from '@/store/observatory-store'

function Observatory() {
  const cfg = useNetworkConfig()
  const search = useSearchParams()
  const model = useObservatory((s) => s.model)
  const query = useQuery({ queryKey: ['network', cfg.indexerUrl], queryFn: () => loadRawNetwork(cfg) })

  useEffect(() => {
    useObservatory.getState().setLens(parseViewState(search).lens)
  }, [search])

  useEffect(() => {
    if (!query.data) return
    useObservatory.setState({ model: buildNetworkModel(query.data.raw), blockHeight: query.data.blockHeight })
  }, [query.data])

  return (
    <main data-testid="observatory" style={{ '--accent': accentFor(cfg.chainName) } as React.CSSProperties}>
      {query.isError && <p className="p-6 text-sm">Could not read the network: {query.error.message}</p>}
      {!query.isError && !model && <p className="p-6 text-sm">Loading the network…</p>}
      <Hud cfg={cfg} />
      <LensBar />
      <Legend />
      <Footer cfg={cfg} />
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
