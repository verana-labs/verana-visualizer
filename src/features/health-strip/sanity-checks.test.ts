import { afterEach, describe, expect, it, vi } from 'vitest'
import { failing, stubNetwork, withChainProposals } from '@/features/chain-stats/chain-fixture'
import { testnetCfg } from '@/features/trust-check/trust-fixture'
import { createChainClient } from '@/lib/api/chain'
import { createGraphClient } from '@/lib/api/graph'
import { createIndexerClient } from '@/lib/api/indexer'
import { isHealthy, runSanityChecks } from './sanity-checks'

afterEach(() => vi.unstubAllGlobals())

const methodsOf = (client: string, api: object) => Object.keys(api).map((name) => `${client}.${name}`)

describe('runSanityChecks', () => {
  it('checks every client method against the configured network', async () => {
    stubNetwork()
    const report = await runSanityChecks(testnetCfg)
    const expected = [
      ...methodsOf('indexer', createIndexerClient(testnetCfg)),
      ...methodsOf('graph', createGraphClient(testnetCfg)),
      ...methodsOf('chain', createChainClient(testnetCfg)),
    ].sort()
    expect(report.results.map((r) => r.method).sort()).toEqual(expected)
  })

  it('passes every method with its HTTP status, URL and latency when the network answers', async () => {
    stubNetwork(withChainProposals)
    const report = await runSanityChecks(testnetCfg)
    for (const result of report.results) {
      expect(result.outcome, `${result.method}: ${result.note}`).toBe('pass')
      expect(result.status, result.method).toBe(200)
      expect(result.latencyMs, result.method).toBeGreaterThanOrEqual(0)
      expect(result.url, result.method).toMatch(/^https:\/\/(idx|graph|api|rpc)\.testnet\.verana\.network\//)
    }
    expect(report.ok).toBe(true)
  })

  it('fails the method whose endpoint errors, with its status, and passes the rest', async () => {
    stubNetwork(failing('/cosmos/mint/v1beta1/inflation', 503))
    const report = await runSanityChecks(testnetCfg)
    const inflation = report.results.find((r) => r.method === 'chain.inflation')
    expect(inflation).toMatchObject({ outcome: 'fail', status: 503 })
    expect(inflation?.note).toMatch(/503/)
    expect(inflation?.url).toBe('https://api.testnet.verana.network/cosmos/mint/v1beta1/inflation')
    expect(report.results.filter((r) => r.outcome === 'fail')).toHaveLength(1)
    expect(report.ok).toBe(false)
  })

  it('fails with no status when the endpoint is unreachable (CORS or network)', async () => {
    stubNetwork((url) => {
      if (url.hostname === 'graph.testnet.verana.network') throw new TypeError('Failed to fetch')
      return undefined
    })
    const report = await runSanityChecks(testnetCfg)
    const health = report.results.find((r) => r.method === 'graph.health')
    expect(health).toMatchObject({ outcome: 'fail', status: null })
    expect(health?.note).toMatch(/Failed to fetch/)
    expect(health?.note).toMatch(/CORS/)
  })

  it('skips a method that needs data an earlier call could not provide, and says why', async () => {
    stubNetwork(failing('/v4/corporation/list'))
    const report = await runSanityChecks(testnetCfg)
    const deposit = report.results.find((r) => r.method === 'indexer.trustDeposit')
    expect(deposit?.outcome).toBe('skip')
    expect(deposit?.note).toMatch(/indexer\.corporations/)
    expect(report.ok).toBe(false)
  })

  it('probes the tally of an open chain proposal', async () => {
    const mock = stubNetwork(withChainProposals)
    await runSanityChecks(testnetCfg)
    const urls = mock.mock.calls.map(([input]) => String(input))
    expect(urls.some((u) => u.endsWith('/cosmos/gov/v1/proposals/2/tally'))).toBe(true)
  })

  it('skips the tally probe when the chain has no proposals', async () => {
    stubNetwork()
    const report = await runSanityChecks(testnetCfg)
    const tally = report.results.find((r) => r.method === 'chain.govTally')
    expect(tally).toMatchObject({ outcome: 'skip', note: 'no chain proposals on vna-testnet-1' })
  })

  it('carries the resolved network config, URLs only', async () => {
    stubNetwork()
    const report = await runSanityChecks(testnetCfg)
    expect(report.network).toEqual({
      chainId: 'vna-testnet-1',
      chainName: 'testnet',
      indexerUrl: 'https://idx.testnet.verana.network',
      indexerWsUrl: 'wss://idx.testnet.verana.network/v4/indexer/subscribe',
      graphUrl: 'https://graph.testnet.verana.network',
      restUrl: 'https://api.testnet.verana.network',
      rpcUrl: 'https://rpc.testnet.verana.network',
      frontendUrl: 'https://app.testnet.verana.network',
      peerVisualizerUrl: 'https://vis.devnet.verana.network',
    })
  })

  it('restores the global fetch when it is done', async () => {
    const mock = stubNetwork()
    await runSanityChecks(testnetCfg)
    expect(globalThis.fetch).toBe(mock)
  })
})

describe('isHealthy', () => {
  const result = (outcome: 'pass' | 'fail' | 'skip') => ({
    method: 'x',
    outcome,
    status: null,
    latencyMs: null,
    url: null,
    note: null,
  })
  it('needs at least one pass and no failure', () => {
    expect(isHealthy([result('pass'), result('skip')])).toBe(true)
    expect(isHealthy([result('skip'), result('skip')])).toBe(false)
    expect(isHealthy([])).toBe(false)
    expect(isHealthy([result('pass'), result('fail')])).toBe(false)
  })
})
