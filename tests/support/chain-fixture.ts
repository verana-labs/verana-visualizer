import { vi } from 'vitest'
import { rawBody } from './recorded'

export const HEAD = 1000
export const BLOCK_MS = 6000
export const INDEXER_HEIGHT = 998
const BASE_TIME = Date.parse('2026-10-20T10:00:00Z')
export const YIELD_POOL_ADDRESS = 'verana1wjnrmvjlgxvs098cnu3jaczzjjm4csmqep067h'

export const blockTime = (height: number) => new Date(BASE_TIME + height * BLOCK_MS).toISOString()

export function blockBody(height: number, time = blockTime(height), txs = height % 3) {
  const body = structuredClone(rawBody('chain-block')) as {
    block: { header: { height: string; time: string }; data: { txs: string[] } }
  }
  body.block.header.height = String(height)
  body.block.header.time = time
  body.block.data.txs = Array.from({ length: txs }, (_, i) => `tx${height}-${i}`)
  return body
}

function rpcStatus(head: number) {
  const body = structuredClone(rawBody('chain-status')) as {
    result: { sync_info: { latest_block_height: string; catching_up: boolean } }
  }
  body.result.sync_info.latest_block_height = String(head)
  body.result.sync_info.catching_up = false
  return body
}

const STATIC: Record<string, string> = {
  '/v4/ecosystem/list': 'ecosystems',
  '/v4/credential-schema/list': 'schemas',
  '/v4/participant/list': 'participants',
  '/v4/corporation/list': 'corporations',
  '/v4/verifiable-trust/dids': 'dids',
  '/v4/verifiable-trust/resolve': 'resolve-first-did',
  '/v4/indexer/events': 'events',
  '/v4/indexer/changes': 'changes',
  '/v4/indexer/status': 'indexer-health',
  '/v4/stats/stats': 'stats',
  '/v4/stats/snapshot': 'snapshot',
  '/v4/group/proposals': 'group-proposals',
  '/v4/group/votes': 'group-votes',
  '/v4/exchange-rate/list': 'exchange-rates',
  '/v4/trust-deposit/params': 'td-params',
  '/v4/participant/pending/flat': 'pending-flat',
  '/health': 'graph-health',
  '/v4/graph/search': 'graph-search',
  '/v4/graph/traverse': 'graph-traverse-g1',
  '/cosmos/bank/v1beta1/supply': 'chain-supply',
  '/cosmos/mint/v1beta1/inflation': 'chain-inflation',
  '/cosmos/staking/v1beta1/pool': 'chain-staking-pool',
  '/cosmos/protocolpool/v1/community_pool': 'chain-community-pool',
  '/cosmos/staking/v1beta1/validators': 'chain-validators',
  '/cosmos/gov/v1/proposals': 'chain-gov-proposals',
}

function defaultResponse(url: URL): Response | undefined {
  const path = url.pathname
  if (path === '/v4/indexer/block-height')
    return Response.json({ type: 'block-indexed', height: INDEXER_HEIGHT, timestamp: blockTime(INDEXER_HEIGHT) })
  if (path === '/status') return Response.json(rpcStatus(HEAD))
  if (path === '/cosmos/base/tendermint/v1beta1/blocks/latest') return Response.json(blockBody(HEAD))
  const block = /^\/cosmos\/base\/tendermint\/v1beta1\/blocks\/(\d+)$/.exec(path)
  if (block) return Response.json(blockBody(Number(block[1])))
  if (path === '/cosmos/auth/v1beta1/module_accounts/yield_intermediate_pool')
    return Response.json({
      account: {
        '@type': '/cosmos.auth.v1beta1.ModuleAccount',
        base_account: { address: YIELD_POOL_ADDRESS },
        name: 'yield_intermediate_pool',
      },
    })
  if (path === `/cosmos/bank/v1beta1/balances/${YIELD_POOL_ADDRESS}`)
    return Response.json({ balances: [{ denom: 'uvna', amount: '2500000' }], pagination: { next_key: null } })
  if (/^\/v4\/trust-deposit\/get\/\d+$/.test(path)) return Response.json(rawBody('trust-deposit'))
  if (/^\/v4\/trust-deposit\/history\/\d+$/.test(path)) return Response.json(rawBody('trust-deposit-history'))
  if (/^\/v4\/group\/get\/\d+$/.test(path)) return Response.json(rawBody('group-members'))
  const history = /^\/v4\/(ecosystem|credential-schema|participant|corporation)\/history\/\d+$/.exec(path)
  if (history) return Response.json(rawBody(`entity-history-${history[1]}`))
  const name = STATIC[path]
  return name ? Response.json(rawBody(name)) : undefined
}

export type Override = (url: URL) => Response | Promise<Response> | undefined

const PROXIED = /^\/api\/indexer\/at\/\d+(\/v4\/.*)$/

const unproxied = (url: URL) => {
  const match = PROXIED.exec(url.pathname)
  return match?.[1] ? new URL(`${match[1]}${url.search}`, 'https://idx.testnet.verana.network') : url
}

export function stubNetwork(...overrides: Override[]) {
  const mock = vi.fn(async (input: string | URL | Request) => {
    const url = unproxied(
      new URL(
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
        'http://localhost:3000'
      )
    )
    for (const override of overrides) {
      const response = override(url)
      if (response) return response
    }
    return defaultResponse(url) ?? new Response(`unexpected ${url.href}`, { status: 599 })
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

export const failing =
  (path: string | RegExp, status = 500): Override =>
  (url) =>
    (typeof path === 'string' ? url.pathname === path : path.test(url.pathname))
      ? new Response('boom', { status })
      : undefined

export const withChainProposals: Override = (url) => {
  if (url.pathname === '/cosmos/gov/v1/proposals')
    return Response.json({
      proposals: [
        { id: '1', status: 'PROPOSAL_STATUS_PASSED', final_tally_result: {} },
        { id: '2', status: 'PROPOSAL_STATUS_VOTING_PERIOD', final_tally_result: {} },
      ],
      pagination: { next_key: null },
    })
  if (url.pathname === '/cosmos/gov/v1/proposals/2/tally')
    return Response.json({ tally: { yes_count: '3', no_count: '1', abstain_count: '0', no_with_veto_count: '0' } })
  return undefined
}
