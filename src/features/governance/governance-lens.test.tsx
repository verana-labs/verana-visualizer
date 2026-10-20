import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { withProposals } from '@/domain/governance'
import { Inspector } from '@/features/inspector/inspector'
import { testnetModel } from '@/features/search/search-fixture'
import { testnetCfg } from '@/features/trust-check/trust-fixture'
import { useObservatory } from '@/store/observatory-store'
import { GovernanceLens } from './governance-lens'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/',
}))

const raw = (name: string): unknown =>
  (
    JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/testnet/raw', `${name}.json`), 'utf8')) as {
      body: unknown
    }
  ).body

let votesStatus = 200
const fetchMock = vi.fn(async (input: string) => {
  const { pathname } = new URL(input)
  if (pathname === '/v4/group/proposals') return Response.json(raw('group-proposals'))
  if (pathname === '/v4/group/votes')
    return votesStatus === 200 ? Response.json(raw('group-votes')) : new Response('boom', { status: votesStatus })
  if (pathname.startsWith('/v4/group/get/')) return Response.json({ code: 404 }, { status: 404 })
  if (pathname === '/cosmos/gov/v1/proposals') return Response.json({ proposals: [], pagination: { next_key: null } })
  return new Response('unexpected', { status: 500 })
})

const calls = (path: string) => fetchMock.mock.calls.filter(([url]) => new URL(url).pathname === path).length

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  votesStatus = 200
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
  useObservatory.setState({
    model: testnetModel(),
    lens: 'network',
    lensFrom: 'network',
    selected: null,
    governance: null,
    layouts: {},
  })
})

afterEach(() => vi.unstubAllGlobals())

async function openLens() {
  render(<GovernanceLens cfg={testnetCfg} />)
  act(() => useObservatory.getState().setLens('governance'))
  await screen.findByText(/36 total/)
}

describe('GovernanceLens', () => {
  it('loads once and keeps a stable model when the store model is replaced again', async () => {
    await openLens()
    const swapped = useObservatory.getState().model
    if (!swapped) throw new Error('no model')
    const children = swapped.childrenOf('corporation:4')
    const proposals = [...(useObservatory.getState().governance?.proposals.values() ?? [])]
    act(() => useObservatory.setState({ model: withProposals(swapped, proposals) }))
    act(() => useObservatory.getState().setLens('network'))
    act(() => useObservatory.getState().setLens('governance'))
    await screen.findByText(/36 total/)
    expect(calls('/v4/group/proposals')).toBe(1)
    expect(useObservatory.getState().model?.childrenOf('corporation:4')).toEqual(children)
  })

  it('switches to the governance lens when a proposal is selected from another lens', async () => {
    await openLens()
    act(() => useObservatory.getState().setLens('network'))
    act(() => useObservatory.getState().select('proposal:group-36'))
    await waitFor(() => expect(useObservatory.getState().lens).toBe('governance'))
    await waitFor(() => expect(window.location.search).toContain('lens=governance'))
    expect(decodeURIComponent(window.location.search)).toContain('sel=proposal:group-36')
  })

  it('retries votes after a failed call instead of caching the failure', async () => {
    votesStatus = 500
    render(
      <>
        <GovernanceLens cfg={testnetCfg} />
        <Inspector frontendUrl="https://app.testnet.verana.network" chainId="vna-testnet-1" />
      </>
    )
    act(() => useObservatory.getState().setLens('governance'))
    await screen.findByText(/36 total/)
    act(() => useObservatory.getState().select('proposal:group-36'))
    await screen.findByText(/Votes unavailable/)
    votesStatus = 200
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('yes')).toBeInTheDocument()
    expect(calls('/v4/group/votes')).toBe(2)
  })
})
