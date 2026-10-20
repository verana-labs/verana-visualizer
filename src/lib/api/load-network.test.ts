import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveNetworkConfig } from '../env'
import { type LoadSink, loadRawNetwork, networkLoadSteps } from './load-network'

const cfg = resolveNetworkConfig({
  NEXT_PUBLIC_VERANA_INDEXER_BASE_URL: 'https://idx.testnet.verana.network',
  NEXT_PUBLIC_VERANA_RPC_ENDPOINT: 'https://rpc.testnet.verana.network',
  NEXT_PUBLIC_VERANA_REST_ENDPOINT: 'https://api.testnet.verana.network',
  NEXT_PUBLIC_VERANA_CHAIN_ID: 'vna-testnet-1',
})

const rawBody = (name: string): unknown =>
  (
    JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/testnet/raw', `${name}.json`), 'utf8')) as {
      body: unknown
    }
  ).body

const routes: Record<string, string> = {
  '/v4/ecosystem/list': 'ecosystems',
  '/v4/credential-schema/list': 'schemas',
  '/v4/participant/list': 'participants',
  '/v4/corporation/list': 'corporations',
  '/v4/verifiable-trust/dids': 'dids',
  '/v4/indexer/block-height': 'block-height',
}

afterEach(() => vi.unstubAllGlobals())

describe('loadRawNetwork', () => {
  it('assembles the raw network and block height from the indexer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const fixture = routes[new URL(String(input)).pathname]
        return fixture ? Response.json(rawBody(fixture)) : new Response('nope', { status: 404 })
      })
    )
    const { raw, blockHeight } = await loadRawNetwork(cfg)
    expect(raw.ecosystems.length).toBeGreaterThan(0)
    expect(raw.participants.length).toBeGreaterThan(0)
    expect(raw.schemas.length).toBeGreaterThan(0)
    expect(raw.dids.length).toBeGreaterThan(0)
    expect(blockHeight).toBe((rawBody('block-height') as { height: number }).height)
  })

  it('throws when any endpoint fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('down', { status: 503 }))
    )
    await expect(loadRawNetwork(cfg)).rejects.toThrow()
  })
})

describe('networkLoadSteps', () => {
  const okFetch = () =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const fixture = routes[new URL(String(input)).pathname]
        return fixture ? Response.json(rawBody(fixture)) : new Response('nope', { status: 404 })
      })
    )

  it('exposes the seven captioned steps in order', () => {
    const steps = networkLoadSteps(cfg, {} as LoadSink)
    expect(steps.map((s) => s.label)).toEqual([
      'Reading ecosystems…',
      'Reading schemas…',
      'Reading participants…',
      'Reading corporations…',
      'Reading block height…',
      'Reading DIDs…',
      'Laying out the network…',
    ])
  })

  it('stores each result in the sink and builds the model and layout in the last step', async () => {
    okFetch()
    const sink = {} as LoadSink
    for (const step of networkLoadSteps(cfg, sink)) await step.run()
    expect(sink.ecosystems?.length).toBeGreaterThan(0)
    expect(sink.blockHeight).toBe((rawBody('block-height') as { height: number }).height)
    expect(sink.model?.ecosystems.length).toBeGreaterThan(0)
    expect(sink.layout?.positions.size).toBeGreaterThan(0)
  })
})
