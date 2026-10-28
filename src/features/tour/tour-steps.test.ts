import { describe, expect, it } from 'vitest'
import { buildNetworkModel } from '@/domain/network-model'
import { LENSES } from '@/layouts'
import { testnetModel } from '../../../tests/support/recorded'
import { tourSteps } from './tour-steps'

const model = testnetModel()

describe('tourSteps', () => {
  const steps = tourSteps(model, 'testnet')

  it('has the intro, one step per lens in lens-bar order, the trust check and the live core', () => {
    expect(steps.map((s) => s.id)).toEqual(['intro', ...LENSES, 'trust-check', 'live-core'])
    expect(steps.slice(1, 8).map((s) => s.lens)).toEqual([...LENSES])
    expect(steps[0].lens).toBe('network')
    expect(steps[9].lens).toBe('network')
  })

  it('adapts the prototype copy for non-technical readers', () => {
    expect(steps[0].caption).toMatch(/^This is the Verana testnet, live\. Each glowing star is an ecosystem/)
    expect(steps[2].caption).toMatch(/chain of accreditation/)
    expect(steps[9].caption).toMatch(/Nothing on this screen is simulated/)
    for (const step of steps) expect(step.caption).not.toMatch(/<\/?b>/)
  })

  it('frames the busiest real ecosystem on the network and trust steps', () => {
    const busiest = [...model.raw.ecosystems].sort((a, b) => b.participants - a.participants)[0]
    const id = `ecosystem:${busiest.id}`
    expect(model.entities.has(id as `ecosystem:${string}`)).toBe(true)
    expect(steps[1].select).toBe(id)
    expect(steps[2].select).toBe(id)
    expect(steps[1].caption).toContain(model.entities.get(id as `ecosystem:${string}`)?.name)
  })

  it('runs the trust check on a real DID from the model', () => {
    const check = steps[8]
    expect(check.did).toBeTruthy()
    expect(model.byDid(check.did ?? '').length).toBeGreaterThan(0)
  })

  it('still works on an empty network', () => {
    const empty = buildNetworkModel({ ecosystems: [], schemas: [], participants: [], corporations: [], dids: [] })
    const bare = tourSteps(empty, 'devnet')
    expect(bare).toHaveLength(10)
    expect(bare.every((s) => s.select === null && s.did === null)).toBe(true)
  })
})
