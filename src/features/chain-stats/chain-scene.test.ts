import { describe, expect, it } from 'vitest'
import type { Validator } from '@/lib/api/schemas'
import { rawBody } from '../../../tests/support/recorded'
import { streamBlocks, validatorOrbs } from './chain-scene'

const testnetValidators = (rawBody('chain-validators') as { validators: Validator[] }).validators

const validator = (moniker: string, tokens: string, status = 'BOND_STATUS_BONDED', jailed = false): Validator => ({
  ...testnetValidators[0],
  operator_address: `veranavaloper1${moniker}`,
  description: { moniker },
  tokens,
  status,
  jailed,
})

describe('validatorOrbs', () => {
  it('places the 3 testnet validators evenly on the ring, labelled with their moniker', () => {
    const orbs = validatorOrbs(testnetValidators)
    expect(orbs.map((o) => o.moniker)).toEqual(['prime-node', 'validator2', 'validator3'])
    const angles = orbs.map((o) => o.angle)
    expect(angles[1] - angles[0]).toBeCloseTo((2 * Math.PI) / 3)
    expect(angles[2] - angles[1]).toBeCloseTo((2 * Math.PI) / 3)
    expect(orbs[0].share).toBeCloseTo(1_000_000_000 / 2_980_000_000)
  })

  it('sizes each orb by voting power', () => {
    const orbs = validatorOrbs([validator('small', '100'), validator('big', '900')])
    const big = orbs.find((o) => o.moniker === 'big')
    const small = orbs.find((o) => o.moniker === 'small')
    expect(big?.size).toBeGreaterThan(small?.size ?? Infinity)
    expect(orbs[0].moniker).toBe('big')
  })

  it('gives an unbonded or jailed validator no voting power', () => {
    const orbs = validatorOrbs([
      validator('a', '500'),
      validator('b', '500', 'BOND_STATUS_UNBONDED'),
      validator('c', '500', 'BOND_STATUS_BONDED', true),
    ])
    expect(orbs.find((o) => o.moniker === 'a')?.share).toBe(1)
    expect(orbs.find((o) => o.moniker === 'b')?.share).toBe(0)
    expect(orbs.find((o) => o.moniker === 'c')?.active).toBe(false)
  })
})

describe('streamBlocks', () => {
  it('keeps the newest 12 blocks, newest first', () => {
    const blocks = Array.from({ length: 20 }, (_, i) => ({ height: 100 + i, time: '', txs: i }))
    const stream = streamBlocks(blocks)
    expect(stream.map((b) => b.height)).toEqual(Array.from({ length: 12 }, (_, i) => 119 - i))
  })
})
