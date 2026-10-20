import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PAPAPO_DID, stubTrustNetwork } from '@/features/trust-check/trust-fixture'
import { logger } from '@/lib/logger'
import VerdictPage from './page'

const ENV = {
  NEXT_PUBLIC_VERANA_INDEXER_BASE_URL: 'https://idx.testnet.verana.network',
  NEXT_PUBLIC_VERANA_RPC_ENDPOINT: 'https://rpc.testnet.verana.network',
  NEXT_PUBLIC_VERANA_REST_ENDPOINT: 'https://api.testnet.verana.network',
  NEXT_PUBLIC_VERANA_CHAIN_ID: 'vna-testnet-1',
  NEXT_PUBLIC_VERANA_CHAIN_NAME: 'testnet',
}

async function renderPage(did: string, search: Record<string, string> = {}) {
  const element = await VerdictPage({
    params: Promise.resolve({ did: encodeURIComponent(did) }),
    searchParams: Promise.resolve(search),
  })
  const html = renderToStaticMarkup(element)
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return { html, doc }
}

beforeEach(() => {
  for (const [name, value] of Object.entries(ENV)) vi.stubEnv(name, value)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('the verdict card page', () => {
  it('server-renders the DID, path, verdict, block, time and raw JSON', async () => {
    stubTrustNetwork()
    const { doc } = await renderPage(PAPAPO_DID)
    const text = doc.body.textContent ?? ''
    expect(text).toContain(PAPAPO_DID)
    expect(doc.querySelector('[data-testid="trust-verdict"]')?.textContent).toBe('Not trusted')
    expect(text).toContain('44,200')
    expect(text).toContain('2026-10-16 21:46:17 UTC')
    expect([...doc.querySelectorAll('[data-testid="chain-hop"]')].map((row) => row.getAttribute('data-id'))).toEqual([
      `agent:${PAPAPO_DID}`,
      'participant:158',
      'participant:5',
      'ecosystem:2',
    ])
    expect(text).toContain('State: ACTIVE · Onboarding: VALIDATED')
    const pre = doc.querySelector('pre[data-testid="raw-json"]')
    expect(pre).not.toBeNull()
    const raw = JSON.parse(pre?.textContent ?? '') as { did: string; verdict: { trusted: boolean } }
    expect(raw.did).toBe(PAPAPO_DID)
    expect(raw.verdict.trusted).toBe(false)
  })

  it('links back to the observatory with the service selected', async () => {
    stubTrustNetwork()
    const { doc } = await renderPage(PAPAPO_DID)
    const back = doc.querySelector('a[data-testid="back-to-scene"]')
    expect(back?.getAttribute('href')).toBe(`/?sel=agent:${encodeURIComponent(PAPAPO_DID)}`)
  })

  it('hides every piece of chrome when printed', async () => {
    stubTrustNetwork()
    const { doc } = await renderPage(PAPAPO_DID)
    const chrome = [...doc.querySelectorAll('[data-chrome]')]
    expect(chrome.length).toBeGreaterThanOrEqual(2)
    for (const element of chrome) expect(element.className).toMatch(/(^|\s)print:hidden(\s|$)/)
    expect(doc.querySelector('[data-testid="verdict-card"]')?.className).toMatch(/print:bg-white/)
  })

  it('evaluates at the requested block height', async () => {
    const calls = stubTrustNetwork()
    await renderPage(PAPAPO_DID, { block: '44200' })
    const resolve = calls.find((c) => c.url.endsWith('/v4/verifiable-trust/resolve'))
    expect(resolve?.headers['At-Block-Height']).toBe('44200')
    expect(calls.some((c) => c.url.endsWith('/v4/graph/traverse'))).toBe(false)
  })

  it('shows a failed resolve as an error, never as trusted', async () => {
    vi.spyOn(logger, 'error').mockImplementation(() => {})
    stubTrustNetwork({ resolveStatus: 500 })
    const { doc } = await renderPage(PAPAPO_DID)
    expect(doc.querySelector('[data-testid="trust-verdict"]')?.textContent).toMatch(/^Could not resolve: HTTP 500 /)
    expect(doc.body.textContent).not.toMatch(/Trusted/)
  })

  it('loads only the subject, its validator chain and the ecosystems, with a timeout on every request', async () => {
    const calls = stubTrustNetwork()
    await renderPage(PAPAPO_DID)
    const paths = calls.map((c) => new URL(c.url).pathname)
    for (const path of ['/v4/credential-schema/list', '/v4/corporation/list', '/v4/verifiable-trust/dids'])
      expect(paths).not.toContain(path)
    const participantCalls = calls.filter((c) => c.url.includes('/v4/participant/list'))
    expect(participantCalls.length).toBeGreaterThan(0)
    for (const call of participantCalls) expect(call.url).toMatch(/[?&](did|participant_id)=/)
    for (const call of calls) expect(call.signal).toBeInstanceOf(AbortSignal)
  })

  it('pins the copied verdict link to the evaluated block', async () => {
    stubTrustNetwork()
    const { doc } = await renderPage(PAPAPO_DID)
    expect(doc.querySelector('[data-verdict-path]')?.getAttribute('data-verdict-path')).toBe(
      `/verdict/${encodeURIComponent(PAPAPO_DID)}?block=44200`
    )
  })

  it('refuses an invalid block parameter visibly instead of showing a live verdict', async () => {
    for (const block of ['abc', '0', '-3', '1.5']) {
      const calls = stubTrustNetwork()
      const { doc } = await renderPage(PAPAPO_DID, { block })
      expect(doc.body.textContent).toContain('Invalid block parameter')
      expect(doc.querySelector('[data-testid="trust-verdict"]')).toBeNull()
      expect(calls).toHaveLength(0)
    }
  })

  it('is not found when the parameter is not a DID', async () => {
    stubTrustNetwork()
    await expect(renderPage('not-a-did')).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/)
  })
})
