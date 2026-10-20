import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { testnetCfg } from '@/features/trust-check/trust-fixture'
import { createChainClient } from '@/lib/api/chain'
import { createIndexerClient } from '@/lib/api/indexer'
import { loadGovernance, loadVotes } from './load-governance'

const raw = (name: string): { body: unknown } =>
  JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/testnet/raw', `${name}.json`), 'utf8'))

const upgrade = {
  id: '3',
  status: 'PROPOSAL_STATUS_PASSED',
  submit_time: '2026-10-01T10:00:00Z',
  voting_end_time: '2026-10-03T10:00:00Z',
  title: 'Upgrade v0.9',
  summary: 'Upgrade',
  proposer: 'verana1proposer',
  messages: [
    {
      '@type': '/cosmos.upgrade.v1beta1.MsgSoftwareUpgrade',
      authority: 'verana1gov',
      plan: { name: 'v0.9', height: '500', info: '' },
    },
  ],
  final_tally_result: { yes_count: '10', no_count: '0', abstain_count: '0', no_with_veto_count: '0' },
}

interface Stub {
  gov?: () => Response
  group?: (id: number) => Response
  tally?: (id: string) => Response
}

const open = { ...upgrade, id: '4', status: 'PROPOSAL_STATUS_VOTING_PERIOD', final_tally_result: zeros() }

function zeros() {
  return { yes_count: '0', no_count: '0', abstain_count: '0', no_with_veto_count: '0' }
}

function stub({ gov, group, tally }: Stub = {}) {
  const mock = vi.fn(async (input: string) => {
    const url = new URL(input)
    if (url.pathname === '/v4/group/proposals') return Response.json(raw('group-proposals').body)
    if (url.pathname === '/v4/group/votes') return Response.json(raw('group-votes').body)
    const member = url.pathname.match(/^\/v4\/group\/get\/(\d+)$/)
    if (member) return group ? group(Number(member[1])) : Response.json(raw('group-members').body)
    const live = url.pathname.match(/^\/cosmos\/gov\/v1\/proposals\/(\d+)\/tally$/)
    if (live)
      return tally
        ? tally(live[1])
        : Response.json({ tally: { yes_count: '7', no_count: '1', abstain_count: '0', no_with_veto_count: '0' } })
    if (url.pathname === '/cosmos/gov/v1/proposals')
      return gov ? gov() : Response.json({ proposals: [upgrade], pagination: { next_key: null } })
    return new Response('unexpected', { status: 500 })
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

const clients = () => ({ indexer: createIndexerClient(testnetCfg), chain: createChainClient(testnetCfg) })
const paths = (mock: ReturnType<typeof stub>) => mock.mock.calls.map(([url]) => new URL(url).pathname)

afterEach(() => vi.unstubAllGlobals())

describe('loadGovernance', () => {
  it('reads corporation proposals from groupProposals and chain proposals from govProposals', async () => {
    const mock = stub()
    const { indexer, chain } = clients()
    const data = await loadGovernance(indexer, chain, [2])
    expect(paths(mock)).toEqual(
      expect.arrayContaining(['/v4/group/proposals', '/cosmos/gov/v1/proposals', '/v4/group/get/2'])
    )
    const group = data.proposals.filter((p) => p.source === 'group')
    expect(group).toHaveLength(36)
    expect(group[0].id).toBe('proposal:group-36')
    expect(data.proposals.find((p) => p.source === 'chain')).toMatchObject({ id: 'proposal:3', title: 'Upgrade v0.9' })
    expect(data.chain).toEqual({ status: 'ready' })
    expect(data.queries.groupProposals.url).toContain('/v4/group/proposals')
    expect(data.queries.govProposals?.url).toContain('/cosmos/gov/v1/proposals')
  })

  it('builds constellations of group members with their weights from groupMembers', async () => {
    stub()
    const { indexer, chain } = clients()
    const data = await loadGovernance(indexer, chain, [2])
    expect(data.constellations).toEqual([
      {
        corporation: 'corporation:2',
        totalWeight: '1',
        members: [{ address: 'verana1dnucfytqvaat3a5m2tcc3dan0e3x8826h0fe6c', weight: '1', share: 1, metadata: '' }],
      },
    ])
  })

  it('skips corporations that have no group (404) and asks the indexer once per corporation', async () => {
    const mock = stub({
      group: (id) =>
        id === 2
          ? Response.json(raw('group-members').body)
          : Response.json({ error: `Corporation ${id} group not found`, code: 404 }, { status: 404 }),
    })
    const { indexer, chain } = clients()
    const data = await loadGovernance(indexer, chain, [1, 2, 3])
    expect(data.constellations.map((c) => c.corporation)).toEqual(['corporation:2'])
    expect(
      paths(mock)
        .filter((p) => p.startsWith('/v4/group/get/'))
        .sort()
    ).toEqual(['/v4/group/get/1', '/v4/group/get/2', '/v4/group/get/3'])
  })

  it('fails when the group members call fails with anything but 404', async () => {
    stub({ group: () => new Response('boom', { status: 503 }) })
    const { indexer, chain } = clients()
    await expect(loadGovernance(indexer, chain, [2])).rejects.toThrow()
  })

  it('keeps corporation proposals and marks chain proposals unavailable when the chain REST fails', async () => {
    stub({ gov: () => new Response('down', { status: 502 }) })
    const { indexer, chain } = clients()
    const data = await loadGovernance(indexer, chain, [2])
    expect(data.proposals.every((p) => p.source === 'group')).toBe(true)
    expect(data.chain.status).toBe('error')
    expect(data.queries.govProposals).toBeNull()
  })
})

describe('chain proposal tallies', () => {
  it('reads the live tally of an open chain proposal instead of its zeroed final tally', async () => {
    const mock = stub({ gov: () => Response.json({ proposals: [open, upgrade], pagination: { next_key: null } }) })
    const { indexer, chain } = clients()
    const data = await loadGovernance(indexer, chain, [])
    expect(paths(mock)).toContain('/cosmos/gov/v1/proposals/4/tally')
    expect(paths(mock)).not.toContain('/cosmos/gov/v1/proposals/3/tally')
    expect(data.proposals.find((p) => p.id === 'proposal:4')?.tally).toEqual({
      status: 'ready',
      live: true,
      tally: { yes: '7', no: '1', abstain: '0', veto: '0' },
    })
  })

  it('marks the tally unavailable when the live tally call fails, keeping the proposal', async () => {
    stub({
      gov: () => Response.json({ proposals: [open], pagination: { next_key: null } }),
      tally: () => new Response('down', { status: 500 }),
    })
    const { indexer, chain } = clients()
    const data = await loadGovernance(indexer, chain, [])
    expect(data.proposals.find((p) => p.id === 'proposal:4')?.tally).toEqual({ status: 'unavailable' })
  })

  it('fails only the chain section when a chain row cannot be read', async () => {
    stub({ gov: () => Response.json({ proposals: [{ ...upgrade, id: 'abc' }], pagination: { next_key: null } }) })
    const { indexer, chain } = clients()
    const data = await loadGovernance(indexer, chain, [2])
    expect(data.chain.status).toBe('error')
    expect(data.proposals.filter((p) => p.source === 'group')).toHaveLength(36)
  })
})

describe('loadVotes', () => {
  it('reads the votes of a corporation proposal from groupVotes', async () => {
    const mock = stub()
    const { indexer } = clients()
    const { votes, query } = await loadVotes(indexer, 36)
    expect(votes).toEqual([
      expect.objectContaining({ voter: 'verana1a7lnp2e3pscjxqah6nq6a5nynrzdj5rrztw30t', option: 'YES' }),
    ])
    expect(new URL(mock.mock.calls[0][0]).searchParams.get('proposal_id')).toBe('36')
    expect(query.url).toContain('proposal_id=36')
  })
})
