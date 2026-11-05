import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { buildNetworkModel, type RawNetwork } from '@/domain/network-model'
import type { LoadSink } from '@/lib/api/load-network'
import { resolveNetworkConfig } from '@/lib/env'
import { recordedNetwork } from '../../tests/support/recorded'
import Page from './page'

const raw: RawNetwork = recordedNetwork()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams('sel=participant:999999'),
}))
vi.mock('@/scene/webgl-support', () => ({ hasWebGL: () => false }))
vi.mock('@/features/loader/stardust-loader', () => ({
  StardustLoader: ({ onExited }: { onExited: () => void }) => (
    <button type="button" data-testid="loader" onClick={onExited}>
      loader
    </button>
  ),
}))
vi.mock('@/lib/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/env')>()
  return {
    ...actual,
    useNetworkConfig: () =>
      actual.resolveNetworkConfig({
        NEXT_PUBLIC_VERANA_INDEXER_BASE_URL: 'https://idx.testnet.verana.network',
        NEXT_PUBLIC_VERANA_RPC_ENDPOINT: 'https://rpc.testnet.verana.network',
        NEXT_PUBLIC_VERANA_REST_ENDPOINT: 'https://api.testnet.verana.network',
        NEXT_PUBLIC_VERANA_CHAIN_ID: 'vna-testnet-1',
      }),
  }
})
vi.mock('@/lib/api/load-network', () => ({
  networkLoadSteps: (_cfg: ReturnType<typeof resolveNetworkConfig>, sink: LoadSink) => [
    {
      label: 'Laying out the network…',
      run: async () => {
        sink.model = buildNetworkModel(raw)
        sink.blockHeight = 96_381
      },
    },
  ],
}))

describe('Page with a missing sel', () => {
  it('shows the not-found toast only once the loader has left', async () => {
    render(<Page />)
    await screen.findByTestId('list-fallback')
    expect(screen.getByTestId('loader')).toBeInTheDocument()
    expect(screen.queryByText('Not found on vna-testnet-1')).toBeNull()
    act(() => screen.getByTestId('loader').click())
    expect(await screen.findByText('Not found on vna-testnet-1')).toBeInTheDocument()
  })
})
