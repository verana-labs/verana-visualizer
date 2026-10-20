'use client'

import { useEffect, useState } from 'react'
import { buildNetworkModel } from '@/domain/network-model'
import { ObservatoryCanvas } from '@/scene/observatory-canvas'
import { useObservatory } from '@/store/observatory-store'
import { syntheticNetwork } from './synthetic-network'

const DEFAULT_PARTICIPANTS = 5000

export function PerfHarness() {
  const [model] = useState(() => {
    const requested = Number(new URLSearchParams(window.location.search).get('participants'))
    return buildNetworkModel(syntheticNetwork(requested > 0 ? requested : DEFAULT_PARTICIPANTS))
  })
  const ready = useObservatory((s) => s.model === model)

  useEffect(() => {
    useObservatory.setState({ model, blockHeight: 1, layouts: {}, lens: 'network', lensFrom: 'network' })
  }, [model])

  return (
    <main data-testid="perf-harness" data-participants={model.participants.length}>
      {ready && <ObservatoryCanvas model={model} />}
    </main>
  )
}
