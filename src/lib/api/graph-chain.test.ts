import { afterEach, describe, expect, it, vi } from 'vitest'
import { testnetCfg } from '../../../tests/support/network'
import { FetchError } from '../fetch-json'
import { createChainClient } from './chain'
import { createGraphClient } from './graph'

afterEach(() => vi.unstubAllGlobals())

describe('createGraphClient', () => {
  it('posts traverse with the integer participant id and records the query', async () => {
    const mock = vi.fn(async () => Response.json({ query: 'G1', evaluatedAtTime: 'now', output: [] }))
    vi.stubGlobal('fetch', mock)
    const { query } = await createGraphClient(testnetCfg).traverse('G1', { participantId: 158 })
    expect(query).toEqual({
      method: 'POST',
      url: 'https://graph.testnet.verana.network/v4/graph/traverse',
      headers: { 'content-type': 'application/json' },
      body: { query: 'G1', input: { participantId: 158 } },
    })
  })
})

describe('validatorChain', () => {
  const node = { id: 1, didId: 'did:x', role: 'ECOSYSTEM', state: 'ACTIVE', validatorParticipantId: null }

  it('works when destructured from the client', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ query: 'G1', evaluatedAtTime: 'now', output: [node] }))
    )
    const { validatorChain } = createGraphClient(testnetCfg)
    const { data, query } = await validatorChain(1)
    expect(data).toHaveLength(1)
    expect(query.body).toEqual({ query: 'G1', input: { participantId: 1 } })
  })

  it('throws a FetchError naming the field path and url on malformed output', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ query: 'G1', evaluatedAtTime: 'now', output: [{ ...node, id: 'one' }] }))
    )
    const error = await createGraphClient(testnetCfg)
      .validatorChain(1)
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(FetchError)
    expect((error as FetchError).message).toContain('https://graph.testnet.verana.network/v4/graph/traverse')
    expect((error as FetchError).message).toContain('output.0.id')
  })
})

describe('createChainClient', () => {
  it('follows pagination.next_key for validators', async () => {
    const validator = {
      operator_address: 'veranavaloper1x',
      jailed: false,
      status: 'BOND_STATUS_BONDED',
      tokens: '1',
      delegator_shares: '1',
      description: { moniker: 'a' },
      commission: { commission_rates: { rate: '0.1', max_rate: '0.2' } },
    }
    const mock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ validators: [validator], pagination: { next_key: 'abc=' } }))
      .mockResolvedValueOnce(Response.json({ validators: [validator], pagination: { next_key: null } }))
    vi.stubGlobal('fetch', mock)
    const { data } = await createChainClient(testnetCfg).validators()
    expect(data).toHaveLength(2)
    expect(new URL(mock.mock.calls[1][0] as string).searchParams.get('pagination.key')).toBe('abc=')
  })

  it('reads the yield pool balance from the yield_intermediate_pool module account', async () => {
    const mock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ account: { base_account: { address: 'verana1yield' }, name: 'yield_intermediate_pool' } })
      )
      .mockResolvedValueOnce(Response.json({ balances: [{ denom: 'uvna', amount: '42' }], pagination: null }))
    vi.stubGlobal('fetch', mock)
    const { data, query } = await createChainClient(testnetCfg).yieldPool()
    expect(data).toEqual([{ denom: 'uvna', amount: '42' }])
    expect(mock.mock.calls[0][0]).toBe(
      'https://api.testnet.verana.network/cosmos/auth/v1beta1/module_accounts/yield_intermediate_pool'
    )
    expect(query.url).toBe('https://api.testnet.verana.network/cosmos/bank/v1beta1/balances/verana1yield')
  })
})
