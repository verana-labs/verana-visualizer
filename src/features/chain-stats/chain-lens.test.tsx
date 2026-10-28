import { act, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useObservatory } from '@/store/observatory-store'
import { HEAD, stubNetwork } from '../../../tests/support/chain-fixture'
import { testnetCfg } from '../../../tests/support/network'
import { rawBody, testnetModel } from '../../../tests/support/recorded'
import { ChainLens, STATS_REFRESH_MS } from './chain-lens'

const model = testnetModel()

beforeEach(() => {
  useObservatory.setState({ model, lens: 'network', blockHeight: HEAD - 2, chainBlocks: [], chainValidators: null })
})

afterEach(() => vi.unstubAllGlobals())

const blockPaths = (mock: ReturnType<typeof stubNetwork>) =>
  mock.mock.calls
    .map(([u]) => new URL(String(u)).pathname)
    .filter((p) => p.startsWith('/cosmos/base/tendermint/v1beta1/blocks/'))

describe('ChainLens', () => {
  it('fetches nothing until the Chain lens is chosen', () => {
    const mock = stubNetwork()
    render(<ChainLens cfg={testnetCfg} />)
    expect(screen.queryByRole('region', { name: 'Chain' })).toBeNull()
    expect(mock).not.toHaveBeenCalled()
  })

  it('loads the stats, the validator ring and the last 12 real blocks', async () => {
    stubNetwork()
    render(<ChainLens cfg={testnetCfg} />)
    act(() => useObservatory.getState().setLens('chain'))
    const panel = await screen.findByRole('region', { name: 'Chain' })
    await within(panel).findByText('prime-node')
    await vi.waitFor(() => expect(useObservatory.getState().chainBlocks).toHaveLength(12))
    expect(useObservatory.getState().chainBlocks[0]).toMatchObject({ height: HEAD, txs: HEAD % 3 })
    expect(useObservatory.getState().chainValidators?.map((v) => v.moniker)).toEqual([
      'prime-node',
      'validator2',
      'validator3',
    ])
    expect(await within(panel).findByText('6 s')).toBeInTheDocument()
  })

  it('adds each new websocket block from the chain, without inventing any', async () => {
    const mock = stubNetwork()
    render(<ChainLens cfg={testnetCfg} />)
    act(() => useObservatory.getState().setLens('chain'))
    await vi.waitFor(() => expect(useObservatory.getState().chainBlocks).toHaveLength(12))
    act(() => useObservatory.getState().advanceBlock(HEAD))
    act(() => useObservatory.getState().advanceBlock(HEAD + 1))
    await vi.waitFor(() => expect(useObservatory.getState().chainBlocks[0]?.height).toBe(HEAD + 1))
    expect(blockPaths(mock).filter((p) => p.endsWith(`/${HEAD + 1}`))).toHaveLength(1)
    expect(blockPaths(mock).filter((p) => p.endsWith(`/${HEAD}`))).toHaveLength(0)
    expect(useObservatory.getState().chainBlocks).toHaveLength(12)
    const panel = screen.getByRole('region', { name: 'Chain' })
    expect(within(panel).getByText('1,001')).toBeInTheDocument()
  })
})

describe('ChainLens resilience', () => {
  it('shows the validators as unavailable when their data is malformed, and still shows the stats', async () => {
    stubNetwork((url) => {
      if (url.pathname !== '/cosmos/staking/v1beta1/validators') return undefined
      const body = structuredClone(rawBody('chain-validators')) as { validators: { tokens: string }[] }
      body.validators[0].tokens = 'many'
      return Response.json(body)
    })
    render(<ChainLens cfg={testnetCfg} />)
    act(() => useObservatory.getState().setLens('chain'))
    const panel = await screen.findByRole('region', { name: 'Chain' })
    expect(await within(panel).findByText(/Validators unavailable: .*invalid tokens/)).toBeInTheDocument()
    expect(await within(panel).findByText('6 s')).toBeInTheDocument()
  })

  it('recovers the height, block time and stream after the first block window fails', async () => {
    let chainDown = true
    stubNetwork((url) =>
      chainDown && url.pathname.startsWith('/cosmos/base/tendermint/')
        ? new Response('down', { status: 503 })
        : undefined
    )
    render(<ChainLens cfg={testnetCfg} />)
    act(() => useObservatory.getState().setLens('chain'))
    const panel = await screen.findByRole('region', { name: 'Chain' })
    await vi.waitFor(() => expect(panel.querySelector('[data-stat="blockHeight"]')).toHaveTextContent('unavailable'))
    chainDown = false
    act(() => useObservatory.getState().advanceBlock(HEAD + 1))
    await vi.waitFor(() => expect(panel.querySelector('[data-stat="blockHeight"]')).toHaveTextContent('1,001'), {
      timeout: 5000,
    })
    await vi.waitFor(() => expect(panel.querySelector('[data-stat="blockTime"]')).toHaveTextContent('6 s'), {
      timeout: 5000,
    })
    expect(useObservatory.getState().chainBlocks).toHaveLength(12)
  })

  it('retries a missed block on the next websocket block instead of leaving a gap', async () => {
    let missed = true
    const mock = stubNetwork((url) =>
      missed && url.pathname === `/cosmos/base/tendermint/v1beta1/blocks/${HEAD + 1}`
        ? new Response('gone', { status: 500 })
        : undefined
    )
    render(<ChainLens cfg={testnetCfg} />)
    act(() => useObservatory.getState().setLens('chain'))
    await vi.waitFor(() => expect(useObservatory.getState().chainBlocks).toHaveLength(12))
    act(() => useObservatory.getState().advanceBlock(HEAD + 1))
    await vi.waitFor(() => expect(blockPaths(mock).filter((p) => p.endsWith(`/${HEAD + 1}`))).toHaveLength(1))
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    missed = false
    act(() => useObservatory.getState().advanceBlock(HEAD + 2))
    await vi.waitFor(() =>
      expect(
        useObservatory
          .getState()
          .chainBlocks.slice(0, 3)
          .map((b) => b.height)
      ).toEqual([HEAD + 2, HEAD + 1, HEAD])
    )
    const panel = screen.getByRole('region', { name: 'Chain' })
    expect(panel.querySelector('[data-stat="blockTime"]')).toHaveTextContent('6 s')
  })

  it('refreshes the stats every 30 seconds', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const mock = stubNetwork()
    render(<ChainLens cfg={testnetCfg} />)
    act(() => useObservatory.getState().setLens('chain'))
    const snapshots = () => mock.mock.calls.filter(([u]) => String(u).includes('/v4/stats/snapshot')).length
    await vi.waitFor(() => expect(snapshots()).toBe(1))
    await act(async () => {
      vi.advanceTimersByTime(STATS_REFRESH_MS)
    })
    await vi.waitFor(() => expect(snapshots()).toBe(2))
    vi.useRealTimers()
  })

  it('clears the chain scene when the network config changes', async () => {
    stubNetwork()
    const { rerender } = render(<ChainLens cfg={testnetCfg} />)
    act(() => useObservatory.getState().setLens('chain'))
    await vi.waitFor(() => expect(useObservatory.getState().chainValidators).not.toBeNull())
    stubNetwork(() => new Promise<Response>(() => {}))
    rerender(<ChainLens cfg={{ ...testnetCfg, chainId: 'vna-other-1' }} />)
    expect(useObservatory.getState().chainBlocks).toEqual([])
    expect(useObservatory.getState().chainValidators).toBeNull()
  })
})
