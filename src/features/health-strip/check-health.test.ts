import { afterEach, describe, expect, it, vi } from 'vitest'
import { failing, HEAD, INDEXER_HEIGHT, stubNetwork } from '../../../tests/support/chain-fixture'
import { testnetCfg } from '../../../tests/support/network'
import { checkHealth, lagTone } from './check-health'

afterEach(() => vi.unstubAllGlobals())

const service = (report: Awaited<ReturnType<typeof checkHealth>>, id: string) => {
  const found = report.services.find((s) => s.id === id)
  if (!found) throw new Error(`no ${id}`)
  return found
}

describe('checkHealth', () => {
  it('reports indexer, graph and chain as up from their health calls', async () => {
    const fetchMock = stubNetwork()
    const report = await checkHealth(testnetCfg)
    expect(report.services.map((s) => [s.id, s.up])).toEqual([
      ['indexer', true],
      ['graph', true],
      ['chain', true],
    ])
    const urls = fetchMock.mock.calls.map(([u]) => String(u))
    expect(urls).toContain('https://idx.testnet.verana.network/v4/indexer/status')
    expect(urls).toContain('https://graph.testnet.verana.network/health')
    expect(urls).toContain('https://rpc.testnet.verana.network/status')
    expect(service(report, 'graph').detail).toMatch(/ok/)
  })

  it('measures indexer lag as chain head minus indexer height', async () => {
    stubNetwork()
    const report = await checkHealth(testnetCfg)
    expect(report.chainHead).toBe(HEAD)
    expect(report.indexerHeight).toBe(INDEXER_HEIGHT)
    expect(report.lag).toBe(HEAD - INDEXER_HEIGHT)
  })

  it('marks a service down when its health call fails, and keeps the others', async () => {
    stubNetwork(failing('/health', 503))
    const report = await checkHealth(testnetCfg)
    expect(service(report, 'graph').up).toBe(false)
    expect(service(report, 'graph').detail).toMatch(/503/)
    expect(service(report, 'indexer').up).toBe(true)
    expect(service(report, 'chain').up).toBe(true)
  })

  it('marks the indexer down when it says it is not running', async () => {
    stubNetwork((url) =>
      url.pathname === '/v4/indexer/status' ? Response.json({ is_running: false, is_crawling: false }) : undefined
    )
    const report = await checkHealth(testnetCfg)
    expect(service(report, 'indexer').up).toBe(false)
  })

  it('has no lag when either height is unknown', async () => {
    stubNetwork(failing('/status'))
    const report = await checkHealth(testnetCfg)
    expect(service(report, 'chain').up).toBe(false)
    expect(report.lag).toBeNull()
  })
})

describe('lagTone', () => {
  it('is green up to 3 blocks and amber beyond', () => {
    expect(lagTone(0)).toBe('green')
    expect(lagTone(3)).toBe('green')
    expect(lagTone(4)).toBe('amber')
  })
})
