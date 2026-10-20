import { describe, expect, it } from 'vitest'
import { parseViewState, serializeViewState, type ViewState } from './view-state'

const full: ViewState = {
  lens: 'trust',
  sel: 'agent:did:web:example.com',
  cam: [1.25, 2, 3.5, 0, 0.1, -4],
  t: 1700000000,
  panel: 'verdict',
  tour: 2,
}

describe('view state', () => {
  it('round-trips a full state with stable key order', () => {
    const s = serializeViewState(full)
    expect(s).toBe(
      'lens=trust&sel=agent:did%3Aweb%3Aexample.com&t=1700000000&panel=verdict&tour=2&cam=1.25,2,3.5,0,0.1,-4'
    )
    expect(parseViewState(new URLSearchParams(s))).toEqual(full)
  })

  it('omits defaults', () => {
    expect(serializeViewState({ lens: 'network', sel: null, cam: null, t: null, panel: null, tour: null })).toBe('')
    expect(
      serializeViewState({ lens: 'network', sel: 'participant:158', cam: null, t: null, panel: null, tour: null })
    ).toBe('sel=participant:158')
  })

  it('falls back on unknown lens and malformed sel', () => {
    expect(parseViewState(new URLSearchParams('lens=nope')).lens).toBe('network')
    for (const bad of ['sel=participant:abc', 'sel=foo:1', 'sel=agent:x', 'sel=agent:did:', 'sel=7', 'sel=schema:']) {
      expect(parseViewState(new URLSearchParams(bad)).sel).toBeNull()
    }
  })

  it('rounds cam to 2 decimals and rejects malformed cam', () => {
    expect(parseViewState(new URLSearchParams('cam=1.234,2.005,3,4,5,6.999')).cam).toEqual([1.23, 2.01, 3, 4, 5, 7])
    expect(parseViewState(new URLSearchParams('cam=1,2,3')).cam).toBeNull()
    expect(parseViewState(new URLSearchParams('cam=a,b,c,d,e,f')).cam).toBeNull()
  })

  it('rejects bad panel, t and tour', () => {
    const v = parseViewState(new URLSearchParams('panel=x&t=abc&tour=-1'))
    expect([v.panel, v.t, v.tour]).toEqual([null, null, null])
  })
})
