import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildNetworkModel, type RawNetwork } from '@/domain/network-model'
import { layoutFor } from '@/layouts'
import { useObservatory } from '@/store/observatory-store'
import { tweenProgress, useLensTween } from './use-lens-tween'

const fixture = <T>(name: string): T =>
  JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/testnet', `${name}.json`), 'utf8')) as T

const raw: RawNetwork = {
  ecosystems: fixture('ecosystems'),
  schemas: fixture('schemas'),
  participants: fixture('participants'),
  corporations: fixture('corporations'),
  dids: fixture<{ dids: string[] }>('dids').dids,
}
const model = buildNetworkModel(raw)

describe('tweenProgress', () => {
  it('is 0 before the delay', () => {
    expect(tweenProgress(1000 + 199, 1000, 200, false)).toBe(0)
  })

  it('is 1 once 1500 ms have passed after the delay', () => {
    expect(tweenProgress(1000 + 200 + 1500, 1000, 200, false)).toBe(1)
    expect(tweenProgress(1000 + 200 + 750, 1000, 200, false)).toBeGreaterThan(0)
    expect(tweenProgress(1000 + 200 + 750, 1000, 200, false)).toBeLessThan(1)
  })

  it('finishes within 300 ms under reduced motion', () => {
    expect(tweenProgress(1000 + 300, 1000, 200, true)).toBe(1)
  })
})

describe('useLensTween', () => {
  beforeEach(() => {
    useObservatory.setState({ model, layouts: {}, lens: 'trust', lensFrom: 'network', lensChangedAt: -60_000 })
  })

  it('returns the target lens position once settled', () => {
    const { result } = renderHook(() => useLensTween())
    const id = model.participants[0].id
    expect(result.current(id)).toEqual(layoutFor('trust', model).positions.get(id))
    expect(useObservatory.getState().layouts.trust).toBeDefined()
  })

  afterEach(() => vi.restoreAllMocks())

  it('reads the store once per lens change, not once per entity per frame', () => {
    const { result } = renderHook(() => useLensTween())
    const getState = vi.spyOn(useObservatory, 'getState')
    for (const p of model.participants) result.current(p.id)
    for (const p of model.participants) result.current(p.id)
    const settled = getState.mock.calls.length
    expect(settled).toBeLessThanOrEqual(3)
    act(() => useObservatory.setState({ lens: 'network', lensFrom: 'trust', lensChangedAt: performance.now() }))
    getState.mockClear()
    for (const p of model.participants) result.current(p.id)
    expect(getState.mock.calls.length).toBeLessThanOrEqual(3)
  })

  it('reuses one position buffer per entity while tweening', () => {
    useObservatory.setState({ lens: 'trust', lensFrom: 'network', lensChangedAt: performance.now() - 900 })
    const { result } = renderHook(() => useLensTween())
    const id = model.participants[0].id
    const first = result.current(id)
    const again = result.current(id)
    expect(again).toBe(first)
    expect(result.current(model.participants[1].id)).not.toBe(first)
  })
})
