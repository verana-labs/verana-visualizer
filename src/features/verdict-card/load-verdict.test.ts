import { afterEach, describe, expect, it, vi } from 'vitest'
import { PAPAPO_DID, stubTrustNetwork, testnetCfg } from '@/features/trust-check/trust-fixture'
import { logger } from '@/lib/logger'
import { loadVerdict, PINNED_REVALIDATE_S } from './load-verdict'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('loadVerdict', () => {
  it('still returns the indexer verdict when a list call hangs', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {})
    const calls = stubTrustNetwork({ hangLists: true })
    const data = await loadVerdict(testnetCfg, PAPAPO_DID, null, { timeoutMs: 50 })
    expect(data.check.verdict).toMatchObject({ trusted: false, evaluatedAtBlock: 44200 })
    expect(data.networkError).toMatch(/failed/)
    expect(data.check.path).toEqual([])
    expect(warn).toHaveBeenCalledTimes(1)
    const resolveAt = calls.findIndex((c) => c.url.endsWith('/v4/verifiable-trust/resolve'))
    expect(resolveAt).toBe(0)
  })

  it('gives up on the whole card once the overall time budget is spent, even with generous per-request timeouts', async () => {
    vi.spyOn(logger, 'warn').mockImplementation(() => {})
    stubTrustNetwork({ hangLists: true })
    const data = await loadVerdict(testnetCfg, PAPAPO_DID, null, { timeoutMs: 60_000, budgetMs: 50 })
    expect(data.networkError).toMatch(/failed/)
    expect(data.check.verdict).toMatchObject({ trusted: false })
  })

  it('lets the server cache reads pinned to a block, and never caches live reads', async () => {
    const pinned = stubTrustNetwork()
    await loadVerdict(testnetCfg, PAPAPO_DID, 44_000)
    expect(pinned.length).toBeGreaterThan(0)
    expect(pinned.filter((c) => c.method === 'GET').every((c) => c.revalidate === PINNED_REVALIDATE_S)).toBe(true)
    vi.unstubAllGlobals()
    const live = stubTrustNetwork()
    await loadVerdict(testnetCfg, PAPAPO_DID, null)
    expect(live.every((c) => c.revalidate === null)).toBe(true)
  })
})
