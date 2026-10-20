import { act, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { testnetModel } from '@/features/search/search-fixture'
import { testnetCfg } from '@/features/trust-check/trust-fixture'
import { useObservatory } from '@/store/observatory-store'
import { HEAD, stubNetwork } from './chain-fixture'
import { ChainLens } from './chain-lens'

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
