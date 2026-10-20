import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { buildNetworkModel, type RawNetwork } from '@/domain/network-model'
import type { LoadSink } from '@/lib/api/load-network'
import { resolveNetworkConfig } from '@/lib/env'
import Page from './page'

const fixture = <T,>(name: string): T =>
  JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/testnet', `${name}.json`), 'utf8')) as T

const raw: RawNetwork = {
  ecosystems: fixture('ecosystems'),
  schemas: fixture('schemas'),
  participants: fixture('participants'),
  corporations: fixture('corporations'),
  dids: fixture<{ dids: string[] }>('dids').dids,
}

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/scene/webgl-support', () => ({ hasWebGL: () => false }))
vi.mock('@/features/loader/stardust-loader', () => ({ StardustLoader: () => null }))
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

describe('Page without WebGL', () => {
  it('lists the ecosystems and narrows them with the name filter', async () => {
    render(<Page />)
    const list = await screen.findByTestId('list-fallback')
    expect(within(list).getByRole('heading', { name: 'Caledonian' })).toBeInTheDocument()
    expect(within(list).getByRole('heading', { name: 'Civil Registry' })).toBeInTheDocument()
    expect(within(list).getByText('Playground BHI Caledonian VNA Testnet 1')).toBeInTheDocument()

    await userEvent.type(within(list).getByRole('searchbox', { name: 'Filter by name' }), 'caledon')

    expect(within(list).getByRole('heading', { name: 'Caledonian' })).toBeInTheDocument()
    expect(within(list).queryByRole('heading', { name: 'Civil Registry' })).not.toBeInTheDocument()
  })
})
