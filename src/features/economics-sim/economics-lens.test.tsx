import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Inspector } from '@/features/inspector/inspector'
import { SearchPalette } from '@/features/search/search-palette'
import { useObservatory } from '@/store/observatory-store'
import { testnetCfg } from '../../../tests/support/network'
import { rawBody, testnetModel } from '../../../tests/support/recorded'
import { EconomicsLens } from './economics-lens'

const model = testnetModel()

beforeEach(() => {
  useObservatory.setState({ model, lens: 'network', economics: null })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      const { pathname } = new URL(input)
      if (pathname === '/v4/trust-deposit/get/1') return Response.json(rawBody('trust-deposit'))
      if (pathname.startsWith('/v4/trust-deposit/get/')) return Response.json({ code: 404 }, { status: 404 })
      if (pathname === '/v4/trust-deposit/params') return Response.json(rawBody('td-params'))
      if (pathname === '/v4/exchange-rate/list') return Response.json(rawBody('exchange-rates'))
      if (pathname === '/v4/stats/stats') return Response.json(rawBody('stats'))
      return new Response('unexpected', { status: 500 })
    })
  )
})

afterEach(() => vi.unstubAllGlobals())

describe('EconomicsLens', () => {
  it('does not refetch or flash loading when the model is swapped over the same raw data', async () => {
    render(<EconomicsLens cfg={testnetCfg} />)
    act(() => useObservatory.getState().setLens('economics'))
    await screen.findByTestId('deposit-total')
    const before = vi.mocked(fetch).mock.calls.length
    act(() => useObservatory.setState({ model: { ...model } }))
    expect(screen.queryByText(/Reading trust deposits/)).toBeNull()
    expect(screen.getByTestId('deposit-total')).toBeInTheDocument()
    expect(vi.mocked(fetch).mock.calls.length).toBe(before)
  })

  it('stays out of the way and fetches nothing until the Economics lens is chosen', () => {
    render(<EconomicsLens cfg={testnetCfg} />)
    expect(screen.queryByLabelText('Economics')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('loads live data, sizes the scene and opens the simulation panel', async () => {
    render(<EconomicsLens cfg={testnetCfg} />)
    act(() => useObservatory.getState().setLens('economics'))
    expect(await screen.findByTestId('deposit-total')).toHaveTextContent('0.05 VNA')
    expect(useObservatory.getState().economics?.sizes.get('ecosystem:1')).toBeCloseTo(2.4)
    await userEvent.setup().click(screen.getByRole('button', { name: /what-if simulator/i }))
    expect(screen.getByRole('dialog', { name: /simulation/i })).toBeInTheDocument()
  })
})

describe('EconomicsLens Escape', () => {
  async function openSimulation() {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    Element.prototype.scrollIntoView = () => {}
    const user = userEvent.setup()
    render(
      <>
        <Inspector frontendUrl="https://app.testnet.verana.network" chainId="vna-testnet-1" />
        <EconomicsLens cfg={testnetCfg} />
        <SearchPalette cfg={testnetCfg} />
      </>
    )
    act(() => useObservatory.getState().setLens('economics'))
    await screen.findByTestId('deposit-total')
    await user.click(screen.getByRole('button', { name: /what-if simulator/i }))
    return user
  }

  it('closes only the simulation and keeps the selection', async () => {
    useObservatory.setState({ selected: 'ecosystem:14', palette: 'closed' })
    const user = await openSimulation()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: /simulation/i })).toBeNull()
    expect(useObservatory.getState().selected).toBe('ecosystem:14')
  })

  it('lets Escape reach the inspector once the lens has moved away from the open simulation', async () => {
    useObservatory.setState({ selected: null, palette: 'closed' })
    const user = await openSimulation()
    act(() => useObservatory.getState().setLens('network'))
    act(() => useObservatory.setState({ selected: 'ecosystem:14' }))
    await user.keyboard('{Escape}')
    expect(useObservatory.getState().selected).toBeNull()
  })

  it('closes only the palette when it is open over the simulation', async () => {
    useObservatory.setState({ palette: 'closed' })
    const user = await openSimulation()
    act(() => useObservatory.getState().openPalette('search'))
    act(() =>
      within(screen.getByRole('dialog', { name: /search/i }))
        .getByRole('combobox')
        .blur()
    )
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: /search/i })).toBeNull()
    expect(screen.getByRole('dialog', { name: /simulation/i })).toBeInTheDocument()
  })
})
