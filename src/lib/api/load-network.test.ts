import { afterEach, describe, expect, it, vi } from 'vitest'
import { testnetCfg } from '../../../tests/support/network'
import { rawBody } from '../../../tests/support/recorded'
import { type LoadSink, loadRawNetwork, networkLoadSteps } from './load-network'

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
    const { raw, blockHeight } = await loadRawNetwork(testnetCfg)
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
    await expect(loadRawNetwork(testnetCfg)).rejects.toThrow()
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
    const steps = networkLoadSteps(testnetCfg, {} as LoadSink)
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

  it('bounds every loader request with a timeout so a hanging endpoint fails by name', async () => {
    const signals: (AbortSignal | null | undefined)[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        signals.push(init?.signal)
        const fixture = routes[new URL(String(input)).pathname]
        return fixture ? Response.json(rawBody(fixture)) : new Response('nope', { status: 404 })
      })
    )
    for (const step of networkLoadSteps(testnetCfg, {} as LoadSink)) await step.run()
    expect(signals.length).toBeGreaterThanOrEqual(6)
    expect(signals.every((signal) => signal instanceof AbortSignal)).toBe(true)
  })

  it('marks only the layout step as waiting for the data steps', () => {
    expect(networkLoadSteps(testnetCfg, {} as LoadSink).map((s) => s.barrier === true)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    ])
  })

  it('stores each result in the sink and builds the model and layout in the last step', async () => {
    okFetch()
    const sink = {} as LoadSink
    for (const step of networkLoadSteps(testnetCfg, sink)) await step.run()
    expect(sink.ecosystems?.length).toBeGreaterThan(0)
    expect(sink.blockHeight).toBe((rawBody('block-height') as { height: number }).height)
    expect(sink.model?.ecosystems.length).toBeGreaterThan(0)
    expect(sink.layout?.positions.size).toBeGreaterThan(0)
  })

  it('records the first request behind each list for show-the-query', async () => {
    okFetch()
    const sink = {} as LoadSink
    for (const step of networkLoadSteps(testnetCfg, sink)) await step.run()
    expect(Object.keys(sink.queries ?? {}).sort()).toEqual([
      'corporations',
      'dids',
      'ecosystems',
      'participants',
      'schemas',
    ])
    expect(sink.queries?.ecosystems?.url).toMatch(/^https:\/\/idx\.testnet\.verana\.network\/v4\/ecosystem\/list\?/)
  })
})
