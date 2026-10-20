import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
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
})
