import { describe, expect, it } from 'vitest'
import { buildNetworkModel } from '@/domain/network-model'
import type { TrustDeposit } from '@/lib/api/schemas'
import { recorded, recordedNetwork } from '../../../tests/support/recorded'
import { economicsScene, PARTICIPANT_DEPOSIT_MAX, STAR_DEPOSIT_BASE } from './economics-scene'

const modelOf = (network: string) => buildNetworkModel(recordedNetwork(network))

const deposit = (corporationId: number, amount: number): TrustDeposit => ({
  ...recorded<TrustDeposit>('trust-deposit', 'testnet'),
  corporation_id: corporationId,
  deposit: amount,
})

describe('economicsScene', () => {
  it('grows the ecosystem a depositing corporation controls and the depositing participant', () => {
    const model = modelOf('testnet')
    const deposits = new Map<number, TrustDeposit | null>([
      [1, deposit(1, 50000)],
      [2, deposit(2, 50000)],
      [3, null],
    ])
    const { sizes, fills } = economicsScene(model, deposits)
    expect(sizes.get('ecosystem:1')).toBeCloseTo(2.4)
    expect(sizes.get('participant:2')).toBeCloseTo(PARTICIPANT_DEPOSIT_MAX)
    expect(sizes.get('ecosystem:2')).toBe(STAR_DEPOSIT_BASE)
    expect(sizes.has('participant:3')).toBe(false)
    expect(fills.get('ecosystem:1')).toBeCloseTo(1)
    expect(fills.has('ecosystem:2')).toBe(false)
  })

  it('uses a log scale so a small deposit still shows and stays below a large one', () => {
    const model = modelOf('testnet')
    const { sizes } = economicsScene(
      model,
      new Map([
        [1, deposit(1, 1_000_000)],
        [5, deposit(5, 1000)],
      ])
    )
    const big = sizes.get('ecosystem:1') ?? 0
    const small = sizes.get('ecosystem:3') ?? 0
    expect(small).toBeGreaterThan(STAR_DEPOSIT_BASE + 0.5)
    expect(small).toBeLessThan(big)
  })

  it('leaves every devnet entity at base size when no corporation has a deposit', () => {
    const model = modelOf('devnet')
    const deposits = new Map(model.raw.corporations.map((c) => [c.id, null]))
    const { sizes, fills } = economicsScene(model, deposits)
    for (const eco of model.ecosystems) expect(sizes.get(eco.id)).toBe(STAR_DEPOSIT_BASE)
    expect([...sizes.keys()].some((id) => id.startsWith('participant:'))).toBe(false)
    expect(fills.size).toBe(0)
  })
})
