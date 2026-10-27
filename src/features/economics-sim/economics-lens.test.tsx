import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
