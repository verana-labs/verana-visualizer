import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hopLabel, verdictPath, verdictText } from '@/domain/trust-check'
import { testnetModel } from '@/features/search/search-fixture'
import { createGraphClient } from '@/lib/api/graph'
import { createIndexerClient } from '@/lib/api/indexer'
import { logger } from '@/lib/logger'
import { runTrustCheck } from './run-trust-check'
import { ECS_DID, PAPAPO_DID, stubTrustNetwork, testnetCfg, UNKNOWN_DID } from './trust-fixture'

const model = testnetModel()
const clients = () => ({ indexer: createIndexerClient(testnetCfg), graph: createGraphClient(testnetCfg) })
const NOW = new Date('2026-10-20T12:00:00Z')

let warn: ReturnType<typeof vi.spyOn>
let error: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  warn = vi.spyOn(logger, 'warn').mockImplementation(() => {})
  error = vi.spyOn(logger, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('runTrustCheck', () => {
  it('gives the ECS root DID a trusted verdict with the path from verana-graph G1', async () => {
    stubTrustNetwork()
    const check = await runTrustCheck(ECS_DID, model, clients(), NOW)
    expect(check.verdict).toEqual({
      trusted: true,
      evaluatedAtBlock: 44161,
      evaluatedAtTime: '2026-10-16T21:42:33.948Z',
      expiresAtTime: null,
    })
    expect(check.pathSource).toBe('verana-graph G1')
    expect(check.path[0]).toBe(`agent:${ECS_DID}`)
    expect(check.path.at(-1)).toBe('ecosystem:2')
  })

  it('gives papapo an untrusted verdict along agent, issuer 158, root 5 and ecosystem 2', async () => {
    stubTrustNetwork()
    const check = await runTrustCheck(PAPAPO_DID, model, clients(), NOW)
    expect(check.verdict).toMatchObject({ trusted: false, evaluatedAtBlock: 44200 })
    expect(check.path).toEqual([`agent:${PAPAPO_DID}`, 'participant:158', 'participant:5', 'ecosystem:2'])
    expect(check.pathSource).toBe('verana-graph G1')
  })

  it('labels each hop with its state and onboarding state, never pass or fail', async () => {
    stubTrustNetwork()
    const check = await runTrustCheck(PAPAPO_DID, model, clients(), NOW)
    expect(check.hops).toEqual([
      { id: 'participant:158', state: 'ACTIVE', opState: 'VALIDATED' },
      { id: 'participant:5', state: 'ACTIVE', opState: 'VALIDATED' },
    ])
    for (const hop of check.hops) {
      expect(Object.keys(hop).sort()).toEqual(['id', 'opState', 'state'])
      expect(hopLabel(hop)).toMatch(/^State: \w+ · Onboarding: \w+$/)
      expect(hopLabel(hop)).not.toMatch(/pass|fail|✓|✗/i)
    }
  })

  it('falls back to the local chain when the graph returns 500 and still takes the verdict from the indexer', async () => {
    stubTrustNetwork({ graphStatus: 500 })
    const check = await runTrustCheck(PAPAPO_DID, model, clients(), NOW)
    expect(check.pathSource).toBe('local')
    expect(check.path).toEqual([`agent:${PAPAPO_DID}`, 'participant:158', 'participant:5', 'ecosystem:2'])
    expect(check.pathError).toMatch(/HTTP 500/)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(check.verdict).toMatchObject({ trusted: false, evaluatedAtBlock: 44200 })
  })

  it('reports a failed /resolve as an error verdict that never reads as trusted', async () => {
    stubTrustNetwork({ resolveStatus: 500 })
    const check = await runTrustCheck(ECS_DID, model, clients(), NOW)
    expect(check.verdict).toEqual({ error: expect.stringMatching(/^HTTP 500 /) })
    expect(check.pathSource).toBe('verana-graph G1')
    expect(verdictText(check.verdict)).toMatch(/^Could not resolve: HTTP 500 /)
    expect(verdictText(check.verdict)).not.toMatch(/Trusted/)
    expect(error).toHaveBeenCalledTimes(1)
  })

  it('draws the deepest chain among the participants sharing a DID, then the lowest id, and counts them', async () => {
    stubTrustNetwork()
    const check = await runTrustCheck(ECS_DID, model, clients(), NOW)
    expect(check.path).toEqual([`agent:${ECS_DID}`, 'participant:11', 'participant:8', 'participant:3', 'ecosystem:2'])
    expect(check.sharedBy).toBe(8)
    const papapo = await runTrustCheck(PAPAPO_DID, model, clients(), NOW)
    expect(papapo.sharedBy).toBe(1)
  })

  it('rejects a verdict the indexer returned for a different DID', async () => {
    stubTrustNetwork({ resolveDid: ECS_DID })
    const check = await runTrustCheck(PAPAPO_DID, model, clients(), NOW)
    expect(check.verdict).toEqual({ error: 'Indexer returned a verdict for a different DID' })
  })

  it('asks the indexer without waiting for the graph', async () => {
    let release = () => {}
    const holdGraph = new Promise<void>((resolve) => {
      release = resolve
    })
    const calls = stubTrustNetwork({ holdGraph })
    const pending = runTrustCheck(PAPAPO_DID, model, clients(), NOW)
    await vi.waitFor(() => expect(calls.map((c) => new URL(c.url).pathname)).toContain('/v4/verifiable-trust/resolve'))
    release()
    expect((await pending).pathSource).toBe('verana-graph G1')
  })

  it('still resolves a DID that is not in the loaded network, with no path', async () => {
    const calls = stubTrustNetwork()
    const check = await runTrustCheck(UNKNOWN_DID, model, clients(), NOW)
    expect(check.verdict).toMatchObject({ trusted: false })
    expect(check.path).toEqual([])
    expect(check.pathSource).toBe('local')
    expect(calls.some((c) => c.url.endsWith('/v4/graph/traverse'))).toBe(false)
  })

  it('uses the local chain when no graph client is given', async () => {
    const calls = stubTrustNetwork()
    const check = await runTrustCheck(PAPAPO_DID, model, { indexer: createIndexerClient(testnetCfg), graph: null }, NOW)
    expect(check.pathSource).toBe('local')
    expect(check.path).toEqual([`agent:${PAPAPO_DID}`, 'participant:158', 'participant:5', 'ecosystem:2'])
    expect(calls.some((c) => c.url.endsWith('/v4/graph/traverse'))).toBe(false)
  })
})

describe('verdict copy', () => {
  it('maps trusted, untrusted and error to their only allowed wording', () => {
    expect(verdictText({ trusted: true, evaluatedAtBlock: 1, evaluatedAtTime: null, expiresAtTime: null })).toBe(
      'Trusted'
    )
    expect(verdictText({ trusted: false, evaluatedAtBlock: 1, evaluatedAtTime: null, expiresAtTime: null })).toBe(
      'Not trusted'
    )
    expect(verdictText({ error: 'HTTP 502 from POST x' })).toBe('Could not resolve: HTTP 502 from POST x')
  })

  it('always shows both parts of a hop label', () => {
    expect(hopLabel({ id: 'participant:1', state: 'ACTIVE', opState: null })).toBe(
      'State: ACTIVE · Onboarding: not reported'
    )
  })

  it('builds a citable verdict path pinned to the evaluated block', () => {
    expect(verdictPath(PAPAPO_DID, 44200)).toBe(`/verdict/${encodeURIComponent(PAPAPO_DID)}?block=44200`)
    expect(verdictPath(PAPAPO_DID, null)).toBe(`/verdict/${encodeURIComponent(PAPAPO_DID)}`)
  })
})
