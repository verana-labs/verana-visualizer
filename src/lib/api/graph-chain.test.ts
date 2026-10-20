import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { resolveNetworkConfig } from '../env'
import { createChainClient } from './chain'
import { createGraphClient } from './graph'
import {
  blockSchema,
  communityPoolSchema,
  govProposalsSchema,
  graphHealthSchema,
  inflationSchema,
  rpcStatusSchema,
  searchResponseSchema,
  stakingPoolSchema,
  supplySchema,
  traverseResponseSchema,
  validatorChainSchema,
  validatorsSchema,
} from './schemas'

const cfg = resolveNetworkConfig({
  NEXT_PUBLIC_VERANA_INDEXER_BASE_URL: 'https://idx.testnet.verana.network',
  NEXT_PUBLIC_VERANA_RPC_ENDPOINT: 'https://rpc.testnet.verana.network',
  NEXT_PUBLIC_VERANA_REST_ENDPOINT: 'https://api.testnet.verana.network',
  NEXT_PUBLIC_VERANA_CHAIN_ID: 'vna-testnet-1',
})

const fixtures: Record<string, z.ZodType> = {
  'graph-traverse-g1': traverseResponseSchema,
  'graph-search': searchResponseSchema,
  'graph-health': graphHealthSchema,
  'chain-supply': supplySchema,
  'chain-inflation': inflationSchema,
  'chain-staking-pool': stakingPoolSchema,
  'chain-community-pool': communityPoolSchema,
  'chain-validators': validatorsSchema,
  'chain-gov-proposals': govProposalsSchema,
  'chain-latest-block': blockSchema,
  'chain-block': blockSchema,
  'chain-status': rpcStatusSchema,
}

afterEach(() => vi.unstubAllGlobals())

describe.each(['testnet', 'devnet'])('graph and chain fixtures (%s)', (network) => {
  const dir = join(process.cwd(), 'tests', 'fixtures', network)
  const files = readdirSync(dir).filter((f) => /^(graph-|chain-).*\.json$/.test(f))

  it('covers every graph and chain method', () => {
    expect(files.map((f) => f.replace(/\.json$/, '')).sort()).toEqual(
      Object.keys(fixtures)
        .filter((name) => name !== 'graph-traverse-g1' || files.includes('graph-traverse-g1.json'))
        .sort()
    )
  })

  it('parses the G1 output as a validator chain', () => {
    if (!files.includes('graph-traverse-g1.json')) return
    const { output } = JSON.parse(readFileSync(join(dir, 'graph-traverse-g1.json'), 'utf8'))
    expect(validatorChainSchema.parse(output).length).toBeGreaterThan(0)
  })

  it.each(files)('parses %s', (file) => {
    const schema = fixtures[file.replace(/\.json$/, '')]
    expect(schema, `no schema registered for ${file}`).toBeDefined()
    const parsed = schema.safeParse(JSON.parse(readFileSync(join(dir, file), 'utf8')))
    expect(parsed.success, parsed.success ? '' : parsed.error.message).toBe(true)
  })
})

describe('createGraphClient', () => {
  it('posts traverse with the integer participant id and records the query', async () => {
    const mock = vi.fn(async () => Response.json({ query: 'G1', evaluatedAtTime: 'now', output: [] }))
    vi.stubGlobal('fetch', mock)
    const { query } = await createGraphClient(cfg).traverse('G1', { participantId: 158 })
    expect(query).toEqual({
      method: 'POST',
      url: 'https://graph.testnet.verana.network/v4/graph/traverse',
      headers: { 'content-type': 'application/json' },
      body: { query: 'G1', input: { participantId: 158 } },
    })
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
    const { data } = await createChainClient(cfg).validators()
    expect(data).toHaveLength(2)
    expect(new URL(mock.mock.calls[1][0] as string).searchParams.get('pagination.key')).toBe('abc=')
  })
})
