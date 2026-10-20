import { describe, expect, it } from 'vitest'
import { buildNetworkModel } from '@/domain/network-model'
import { layoutFor } from '@/layouts'
import { syntheticNetwork } from '../perf/synthetic-network'

describe('syntheticNetwork', () => {
  it('builds a 5,000-participant network the model and the network layout accept', () => {
    const raw = syntheticNetwork(5000)
    expect(raw.participants).toHaveLength(5000)
    const model = buildNetworkModel(raw)
    expect(model.participants).toHaveLength(5000)
    expect(model.ecosystems.length).toBeGreaterThan(10)
    expect(model.agents.length).toBeGreaterThan(1000)
    const layout = layoutFor('network', model)
    for (const id of model.entities.keys()) expect(layout.positions.has(id)).toBe(true)
  })

  it('is deterministic', () => {
    expect(syntheticNetwork(300)).toEqual(syntheticNetwork(300))
  })
})
