import { afterEach, describe, expect, it, vi } from 'vitest'
import { testnetCfg } from '@/features/trust-check/trust-fixture'
import { blockBody, blockTime, failing, HEAD, rawBody, stubNetwork } from './chain-fixture'
import {
  averageBlockSeconds,
  BLOCK_TIME_WINDOW,
  type BlockSummary,
  contiguousTail,
  loadBlockWindow,
  loadNetworkStats,
  mergeBlocks,
  type StatRow,
  statRows,
} from './load-chain-stats'

const NOW = new Date('2026-10-20T12:00:00Z')

afterEach(() => vi.unstubAllGlobals())

async function rowsFor(...overrides: Parameters<typeof stubNetwork>) {
  const fetchMock = stubNetwork(...overrides)
  const [stats, window] = await Promise.all([loadNetworkStats(testnetCfg, NOW), loadBlockWindow(testnetCfg)])
  return { rows: statRows(stats, window), fetchMock }
}

const byId = (rows: StatRow[], id: string) => {
  const row = rows.find((r) => r.id === id)
  if (!row) throw new Error(`no ${id} row`)
  return row
}

describe('averageBlockSeconds', () => {
  it('is the mean gap between consecutive block timestamps', () => {
    const blocks: BlockSummary[] = [
      { height: 3, time: '2026-10-20T10:00:13Z', txs: 0 },
      { height: 1, time: '2026-10-20T10:00:00Z', txs: 0 },
      { height: 2, time: '2026-10-20T10:00:05Z', txs: 0 },
    ]
    expect(averageBlockSeconds(blocks)).toBe(6.5)
  })

  it('divides the time span by the height span, not by the block count', () => {
    const blocks: BlockSummary[] = [
      { height: 10, time: '2026-10-20T10:00:00Z', txs: 0 },
      { height: 13, time: '2026-10-20T10:00:18Z', txs: 0 },
    ]
    expect(averageBlockSeconds(blocks)).toBe(6)
  })

  it('throws on an unreadable timestamp', () => {
    expect(() =>
      averageBlockSeconds([
        { height: 1, time: 'not a time', txs: 0 },
        { height: 2, time: '2026-10-20T10:00:00Z', txs: 0 },
      ])
    ).toThrow(/timestamp/)
  })

  it('needs at least two blocks', () => {
    expect(averageBlockSeconds([{ height: 1, time: '2026-10-20T10:00:00Z', txs: 0 }])).toBeNull()
  })
})

describe('contiguousTail', () => {
  it('keeps the newest run of consecutive heights', () => {
    const blocks = [1, 2, 4, 5, 6].map((height) => ({ height, time: blockTime(height), txs: 0 }))
    expect(contiguousTail(blocks).map((b) => b.height)).toEqual([4, 5, 6])
  })
})

describe('loadBlockWindow', () => {
  it('reports a malformed latest block instead of rejecting', async () => {
    stubNetwork((url) =>
      url.pathname === '/cosmos/base/tendermint/v1beta1/blocks/latest'
        ? Response.json(blockBody(Number.NaN, '2026-10-20T10:00:00Z', 0))
        : undefined
    )
    const window = await loadBlockWindow(testnetCfg)
    expect(window.blocks).toEqual([])
    expect(window.error).toMatch(/height/)
  })

  it('reads the last 20 blocks from the chain, newest last', async () => {
    const fetchMock = stubNetwork()
    const window = await loadBlockWindow(testnetCfg)
    expect(BLOCK_TIME_WINDOW).toBe(20)
    expect(window.error).toBeNull()
    expect(window.blocks.map((b) => b.height)).toEqual(Array.from({ length: 20 }, (_, i) => HEAD - 19 + i))
    expect(window.blocks.at(-1)).toEqual({ height: HEAD, time: blockTime(HEAD), txs: HEAD % 3 })
    const urls = fetchMock.mock.calls.map(([u]) => new URL(String(u)).pathname)
    expect(urls).toContain('/cosmos/base/tendermint/v1beta1/blocks/latest')
    expect(urls).toContain(`/cosmos/base/tendermint/v1beta1/blocks/${HEAD - 19}`)
  })

  it('keeps the head when an older block fails, and says why the window is short', async () => {
    stubNetwork(failing(`/cosmos/base/tendermint/v1beta1/blocks/${HEAD - 5}`))
    const window = await loadBlockWindow(testnetCfg)
    expect(window.blocks.map((b) => b.height)).toEqual([HEAD])
    expect(window.error).toMatch(/status 500/)
  })
})

describe('mergeBlocks', () => {
  const block = (height: number): BlockSummary => ({ height, time: blockTime(height), txs: 0 })
  it('adds new heights in order, drops duplicates and keeps the newest window', () => {
    const merged = mergeBlocks([block(1), block(2), block(3)], [block(3), block(5), block(4)], 4)
    expect(merged.map((b) => b.height)).toEqual([2, 3, 4, 5])
  })
})

describe('statRows', () => {
  it('shows every chain and v4 stat with a one-line definition', async () => {
    const { rows } = await rowsFor()
    expect(rows.map((r) => r.id)).toEqual([
      'blockHeight',
      'blockTime',
      'supply',
      'inflation',
      'bonded',
      'communityPool',
      'tvl',
      'yieldPool',
      'ecosystems',
      'schemas',
      'participants',
    ])
    for (const row of rows) {
      expect(row.state, row.id).toBe('ok')
      expect(row.definition.length, row.id).toBeGreaterThan(10)
      expect(row.definition, row.id).not.toMatch(/\n/)
    }
    expect(byId(rows, 'bonded').definition).toBe('VNA staked by validators')
    expect(byId(rows, 'blockHeight').value).toBe('1,000')
    expect(byId(rows, 'blockTime').value).toBe('6 s')
    expect(byId(rows, 'supply').value).toBe('1,007,007.081168 VNA')
    expect(byId(rows, 'inflation').value).toBe('13.1971%')
    expect(byId(rows, 'bonded').value).toBe('2,980 VNA')
    expect(byId(rows, 'communityPool').value).toBe('40.499554 VNA')
    expect(byId(rows, 'tvl').value).toBe('0.1 VNA')
    expect(byId(rows, 'yieldPool').value).toBe('2.5 VNA')
    expect(byId(rows, 'ecosystems').value).toBe('14')
    expect(byId(rows, 'schemas').value).toBe('21')
    expect(byId(rows, 'participants').value).toBe('157')
    expect(byId(rows, 'participants').detail).toBe(
      'Ecosystem 21 · Issuer grantor 2 · Verifier grantor 6 · Issuer 60 · Verifier 16 · Holder 52'
    )
  })

  it('reads the community pool from the protocol pool, not the staking pool', async () => {
    const { rows } = await rowsFor()
    expect(byId(rows, 'communityPool').query?.url).toBe(
      'https://api.testnet.verana.network/cosmos/protocolpool/v1/community_pool'
    )
    expect(byId(rows, 'communityPool').value).not.toBe(byId(rows, 'bonded').value)
  })

  it('hides the TU rate row while no exchange rate exists', async () => {
    const { rows } = await rowsFor()
    expect(rows.some((r) => r.id === 'tuRate')).toBe(false)
  })

  it('shows the TU rate when a live rate is published', async () => {
    const rate = {
      id: 7,
      base_asset_type: 'TU',
      base_asset: 'tu',
      quote_asset_type: 'COIN',
      quote_asset: 'uvna',
      rate: '2500000',
      rate_scale: 0,
      state: true,
      updated: '2026-10-20T11:00:00Z',
      expires: '2026-10-21T11:00:00Z',
    }
    const { rows } = await rowsFor((url) =>
      url.pathname === '/v4/exchange-rate/list' ? Response.json({ exchange_rates: [rate] }) : undefined
    )
    const tu = byId(rows, 'tuRate')
    expect(tu.value).toBe('1 TU = 2.5 VNA')
    expect(tu.definition).toMatch(/Trust Unit/)
  })

  it.each([
    ['supply', '/cosmos/bank/v1beta1/supply'],
    ['inflation', '/cosmos/mint/v1beta1/inflation'],
    ['bonded', '/cosmos/staking/v1beta1/pool'],
    ['communityPool', '/cosmos/protocolpool/v1/community_pool'],
    ['yieldPool', '/cosmos/auth/v1beta1/module_accounts/yield_intermediate_pool'],
    ['blockHeight', '/cosmos/base/tendermint/v1beta1/blocks/latest'],
  ])('shows %s as unavailable, never 0, when its call fails, and leaves the others alone', async (id, path) => {
    const { rows } = await rowsFor(failing(path))
    const row = byId(rows, id)
    expect(row.state).toBe('unavailable')
    expect(row.value).toBeNull()
    expect(row.reason).toMatch(/500/)
    const others = rows.filter((r) => r.id !== id && !(id === 'blockHeight' && r.id === 'blockTime'))
    for (const other of others) expect(other.state, other.id).toBe('ok')
  })

  it('marks every snapshot stat unavailable when the indexer snapshot fails', async () => {
    const { rows } = await rowsFor(failing('/v4/stats/snapshot'))
    for (const id of ['tvl', 'ecosystems', 'schemas', 'participants']) {
      expect(byId(rows, id).state).toBe('unavailable')
      expect(byId(rows, id).value).toBeNull()
    }
    expect(byId(rows, 'supply').state).toBe('ok')
  })

  it('shows the block time as unavailable when the 20-block window is short', async () => {
    const { rows } = await rowsFor(failing(`/cosmos/base/tendermint/v1beta1/blocks/${HEAD - 3}`))
    expect(byId(rows, 'blockHeight').value).toBe('1,000')
    expect(byId(rows, 'blockTime').state).toBe('unavailable')
    expect(byId(rows, 'blockTime').reason).toMatch(/20 consecutive blocks/)
  })

  it('shows the TU rate as unavailable, not hidden, when the exchange-rate call fails', async () => {
    const { rows } = await rowsFor(failing('/v4/exchange-rate/list'))
    expect(byId(rows, 'tuRate').state).toBe('unavailable')
  })

  it('shows the block time as unavailable when the window has a gap, and computes it over consecutive heights only', () => {
    const blocks = Array.from({ length: 21 }, (_, i) => HEAD - 20 + i)
      .filter((h) => h !== HEAD - 5)
      .map((height) => ({ height, time: blockTime(height), txs: 0 }))
    const rows = statRows(null, { blocks, error: null, query: null })
    expect(byId(rows, 'blockTime').state).toBe('unavailable')
    expect(byId(rows, 'blockTime').reason).toMatch(/20 consecutive blocks/)
    const whole = Array.from({ length: 20 }, (_, i) => HEAD - 19 + i).map((height) => ({
      height,
      time: blockTime(height),
      txs: 0,
    }))
    expect(byId(statRows(null, { blocks: whole, error: null, query: null }), 'blockTime').value).toBe('6 s')
  })

  it('shows a malformed field as unavailable for that stat only, without throwing', async () => {
    const { rows } = await rowsFor(
      (url) => {
        if (url.pathname !== '/v4/stats/snapshot') return undefined
        const body = structuredClone(rawBody('snapshot')) as Record<string, unknown>
        body.weight = 'lots'
        return Response.json(body)
      },
      (url) => (url.pathname === '/cosmos/mint/v1beta1/inflation' ? Response.json({ inflation: 'high' }) : undefined)
    )
    expect(byId(rows, 'tvl').state).toBe('unavailable')
    expect(byId(rows, 'tvl').reason).toMatch(/weight/)
    expect(byId(rows, 'inflation').state).toBe('unavailable')
    expect(byId(rows, 'ecosystems').state).toBe('ok')
    expect(byId(rows, 'supply').state).toBe('ok')
  })

  it('shows the block time as unavailable when a timestamp is unreadable', () => {
    const blocks = Array.from({ length: 20 }, (_, i) => HEAD - 19 + i).map((height) => ({
      height,
      time: height === HEAD ? 'garbage' : blockTime(height),
      txs: 0,
    }))
    const rows = statRows(null, { blocks, error: null, query: null })
    expect(byId(rows, 'blockTime').state).toBe('unavailable')
    expect(byId(rows, 'blockHeight').value).toBe('1,000')
  })

  it('reports loading rows before the data arrives', () => {
    const rows = statRows(null, null)
    expect(rows.every((r) => r.state === 'loading' && r.value === null)).toBe(true)
  })
})
