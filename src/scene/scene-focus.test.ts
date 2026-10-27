import { describe, expect, it } from 'vitest'
import type { EntityId } from '@/domain/network-model'
import { useObservatory } from '@/store/observatory-store'
import { testnetModel } from '../../tests/support/recorded'
import { dimOf, focusSetsOf } from './scene-focus'

const model = testnetModel()

describe('chain lens backdrop', () => {
  it('dims the whole network in the chain lens, without hiding it', () => {
    const sets = focusSetsOf({ ...useObservatory.getState(), model, lens: 'chain', selected: null, hovered: null })
    expect(sets.backdrop).toBe(true)
    const dim = dimOf(sets, 'ecosystem:1')
    expect(dim).toBeGreaterThan(0.2)
    expect(dim).toBeLessThan(0.5)
  })

  it('still lights a hovered node in the chain lens', () => {
    const sets = focusSetsOf({
      ...useObservatory.getState(),
      model,
      lens: 'chain',
      selected: null,
      hovered: 'ecosystem:1' as EntityId,
    })
    expect(dimOf(sets, 'ecosystem:1')).toBe(1)
  })

  it('leaves the other lenses at full brightness', () => {
    const sets = focusSetsOf({ ...useObservatory.getState(), model, lens: 'network', selected: null, hovered: null })
    expect(dimOf(sets, 'ecosystem:1')).toBe(1)
  })
})
