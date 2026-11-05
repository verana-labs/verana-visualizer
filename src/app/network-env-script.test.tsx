import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NetworkEnvScript, publicNetworkEnv } from './network-env-script'

vi.mock('next/cache', () => ({ unstable_noStore: () => undefined }))

describe('publicNetworkEnv', () => {
  it('keeps only the network names the app reads', () => {
    expect(
      publicNetworkEnv({
        NEXT_PUBLIC_VERANA_INDEXER_BASE_URL: 'https://idx.testnet.verana.network',
        NEXT_PUBLIC_IDX_ENDPOINT: 'https://legacy.example',
        NEXT_PUBLIC_GITHUB_TOKEN: 'ghp_secret',
        NEXT_PUBLIC_VERANA_GRAPH_URL: undefined,
        SECRET: 'x',
      })
    ).toEqual({
      NEXT_PUBLIC_VERANA_INDEXER_BASE_URL: 'https://idx.testnet.verana.network',
      NEXT_PUBLIC_IDX_ENDPOINT: 'https://legacy.example',
    })
  })
})

describe('NetworkEnvScript', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('never publishes a NEXT_PUBLIC_GITHUB_TOKEN from process.env', () => {
    vi.stubEnv('NEXT_PUBLIC_GITHUB_TOKEN', 'ghp_leakedpersonaltoken')
    vi.stubEnv('NEXT_PUBLIC_VERANA_INDEXER_BASE_URL', 'https://idx.testnet.verana.network')
    vi.stubEnv('NEXT_PUBLIC_VERANA_CHAIN_ID', 'vna-testnet-1')

    const html = renderToStaticMarkup(<NetworkEnvScript />)

    expect(html).toContain("window['__ENV']")
    expect(html).toContain('https://idx.testnet.verana.network')
    expect(html).toContain('vna-testnet-1')
    expect(html).not.toContain('ghp_leakedpersonaltoken')
    expect(html).not.toContain('NEXT_PUBLIC_GITHUB_TOKEN')
  })
})
